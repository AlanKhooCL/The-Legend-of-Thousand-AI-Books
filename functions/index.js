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