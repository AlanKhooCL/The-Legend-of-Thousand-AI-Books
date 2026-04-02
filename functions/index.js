const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { GoogleGenAI } = require("@google/genai");

admin.initializeApp();

// Initialize the Gemini AI client.
// Note: For a quick test, you can paste your API key directly below replacing the placeholder. 
// For production, it's best practice to use Firebase Secret Manager or environment variables.
const ai = new GoogleGenAI({ apiKey: "AIzaSyB80OS8Lh0xDHhWl95PphjN1B1WiOoK33M" }); 

exports.summonQuest = onCall({ 
    enforceAppCheck: true, // Blocks requests that don't pass your frontend reCAPTCHA
    cors: true 
}, async (request) => {
    
    // 1. Verify the user is logged in
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to summon quests.');
    }

    // 2. Extract data sent from your HTML frontend
    const { topic, objective, numChapters, modelId } = request.data;

    if (!topic || !numChapters) {
        throw new HttpsError('invalid-argument', 'Topic and chapter count are required.');
    }

    // 3. Construct the prompt securely on the server
    const systemInstruction = `You are the Loremaster of Ten Thousand Scrolls, an ancient Chinese fantasy realm. You generate structured learning quests. ALWAYS respond with ONLY valid JSON, no markdown.`;
    
    const prompt = `Create a learning quest for topic: "${topic}". ${objective ? `Objective: ${objective}` : ''}
Number of chapters: ${numChapters}
Return this exact JSON:
{"questTitle":"dramatic wuxia-themed quest title in English","questNarrative":"2-3 sentence wuxia lore intro","bossName":"Chinese demon name (2-3 chars transliterated + translation)","bossTitle":"demon epithet","bossLore":"2 sentence demon background","chapters":[{"title":"clear modern educational title","tag":"SUBTOPIC TAG","summary":"one sentence chapter description"}]}
Make exactly ${numChapters} chapters.`;

    try {
        // 4. Call Gemini
        const response = await ai.models.generateContent({
            model: modelId || 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
            }
        });

        const text = response.text;
        
        if (!text) {
             throw new HttpsError('internal', 'The scrolls returned empty.');
        }

        // Return the raw text string back to the frontend to be parsed
        return { result: text };

    } catch (error) {
        console.error("AI Generation Error:", error);
        throw new HttpsError('internal', 'Failed to commune with the scrolls.', error.message);
    }
});

exports.communeWithScrolls = onCall({ 
    enforceAppCheck: true, 
    cors: true 
}, async (request) => {
    
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    const { action, payload, modelId } = request.data;

    if (!action || !payload) {
        throw new HttpsError('invalid-argument', 'Action and payload are required.');
    }

    let systemInstruction = '';
    let prompt = '';
    let isJSON = false;

    // 🛡️ THE VAULT: Hardcoded prompts live securely on the server!
    if (action === 'generateChapter') {
        const { topic, chapterTitle, chapterTag, chapterSummary } = payload;
        systemInstruction = `You are an expert educator. Write clear, modern, engaging HTML learning material. RESPOND WITH ONLY AN HTML FRAGMENT. Use <h3>,<p>,<ul>,<li>,<strong>,<em>,<code>,<pre>.`;
        prompt = `Topic: ${topic}\nChapter: ${chapterTitle} (${chapterTag})\nSummary: ${chapterSummary}\n\nWrite a comprehensive educational chapter (400-600 words). Include practical examples. End with a "Scroll Mastery" summary <h3>.`;
        isJSON = false;

    } else if (action === 'generateQuiz') {
        const { topic, chapterTitles } = payload;
        systemInstruction = `You are an expert educator generating quiz questions. ALWAYS respond with ONLY valid JSON. Use clear modern language.`;
        prompt = `Topic: ${topic}\nChapters: ${chapterTitles}\n\nCreate exactly 5 multiple-choice questions.\nReturn JSON: {"questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":0,"explanation":"..."}]}\ncorrect is 0-indexed.`;
        isJSON = true;

    } else {
        throw new HttpsError('invalid-argument', 'Unknown action requested.');
    }

    try {
        const response = await ai.models.generateContent({
            model: modelId || 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: isJSON ? "application/json" : "text/plain",
            }
        });

        const text = response.text;
        
        if (!text) {
             throw new HttpsError('internal', 'The scrolls returned empty.');
        }

        return { result: text };

    } catch (error) {
        console.error("AI Generation Error:", error);
        throw new HttpsError('internal', 'Failed to commune with the scrolls.', error.message);
    }
});