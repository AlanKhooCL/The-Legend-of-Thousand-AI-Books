const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { GoogleGenAI } = require("@google/genai");

admin.initializeApp();

// Initialize the Gemini AI client.
const ai = new GoogleGenAI({ apiKey: "AIzaSyB80OS8Lh0xDHhWl95PphjN1B1WiOoK33M" }); 

// ============================================================================
// APP 1: TEN THOUSAND SCROLLS ENDPOINTS
// ============================================================================

exports.summonQuest = onCall({ 
    enforceAppCheck: true,
    cors: true 
}, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'You must be logged in to summon quests.');
    const { topic, objective, numChapters, modelId } = request.data;
    if (!topic || !numChapters) throw new HttpsError('invalid-argument', 'Topic and chapter count are required.');

    const systemInstruction = `You are the Loremaster of Ten Thousand Scrolls, an ancient Chinese fantasy realm. You generate structured learning quests. ALWAYS respond with ONLY valid JSON, no markdown.`;
    const prompt = `Create a learning quest for topic: "${topic}". ${objective ? `Objective: ${objective}` : ''}\nNumber of chapters: ${numChapters}\nReturn this exact JSON:\n{"questTitle":"dramatic wuxia-themed quest title in English","questNarrative":"2-3 sentence wuxia lore intro","bossName":"Chinese demon name (2-3 chars transliterated + translation)","bossTitle":"demon epithet","bossLore":"2 sentence demon background","chapters":[{"title":"clear modern educational title","tag":"SUBTOPIC TAG","summary":"one sentence chapter description"}]}\nMake exactly ${numChapters} chapters.`;

    try {
        const response = await ai.models.generateContent({
            model: modelId || 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction, responseMimeType: "application/json" }
        });
        if (!response.text) throw new HttpsError('internal', 'The scrolls returned empty.');
        return { result: response.text };
    } catch (error) {
        console.error("AI Generation Error:", error);
        throw new HttpsError('internal', 'Failed to commune with the scrolls.', error.message);
    }
});

exports.communeWithScrolls = onCall({ 
    enforceAppCheck: true, 
    cors: true 
}, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'You must be logged in.');
    const { action, payload, modelId } = request.data;
    if (!action || !payload) throw new HttpsError('invalid-argument', 'Action and payload are required.');

    let systemInstruction = '';
    let prompt = '';
    let isJSON = false;

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
            config: { systemInstruction, responseMimeType: isJSON ? "application/json" : "text/plain" }
        });
        if (!response.text) throw new HttpsError('internal', 'The scrolls returned empty.');
        return { result: response.text };
    } catch (error) {
        console.error("AI Generation Error:", error);
        throw new HttpsError('internal', 'Failed to commune with the scrolls.', error.message);
    }
});

// ============================================================================
// APP 2: JOURNEYS & LEDGERS ENDPOINTS
// ============================================================================

// The strict JSON schema for the travel app
const tripSchema = {
  type: "OBJECT",
  properties: {
    overview: { type: "OBJECT", properties: { title: {type:"STRING"}, dates: {type:"STRING"}, pax: {type:"STRING"}, totalBudget: {type:"STRING"} } },
    budget: { type: "ARRAY", items: { type: "OBJECT", properties: { item: {type:"STRING"}, cost: {type:"STRING"}, amount: {type:"NUMBER"}, icon: {type:"STRING"} } } },
    locations: { type: "ARRAY", items: { type: "OBJECT", properties: { id: {type:"STRING"}, name: {type:"STRING"}, color: {type:"STRING"}, image: {type:"STRING"} } } },
    itinerary: {
      type: "ARRAY", items: {
        type: "OBJECT", properties: {
          day: {type:"NUMBER"}, date: {type:"STRING"}, location: {type:"STRING"}, title: {type:"STRING"},
          events: {
            type: "ARRAY", items: {
              type: "OBJECT", properties: {
                time: {type:"STRING"}, desc: {type:"STRING"}, icon: {type:"STRING"}, link: {type:"STRING"},
                latlng: {type:"ARRAY", items: {type:"NUMBER"}}, expense: {type:"NUMBER"}
              }
            }
          }
        }
      }
    }
  }
};

exports.generateTrip = onCall({ 
    enforceAppCheck: true, 
    cors: true 
}, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'You must be logged in.');
    const { prompt, dates, pax, modelId } = request.data;
    if (!prompt) throw new HttpsError('invalid-argument', 'Trip prompt is required.');

    const systemInstruction = `You are an expert travel planner. Create a highly detailed travel itinerary. 
        The trip dates are: ${dates}. Number of pax: ${pax}.
        Rules:
        - "color" must be one of: amber, teal, rose, violet, sky, emerald, pink, orange, purple.
        - "id" inside locations must be lowercase letters with no spaces.
        - "location" in itinerary MUST precisely match an "id" from locations.
        - "icon" must be a valid Lucide icon name.
        - "latlng" must be a 2-element array [latitude, longitude]. Use [] if unknown.`;

    try {
        const response = await ai.models.generateContent({
            model: modelId || 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: tripSchema
            }
        });
        if (!response.text) throw new HttpsError('internal', 'The grimoires returned empty.');
        return { result: response.text };
    } catch (error) {
        console.error("Trip Gen Error:", error);
        throw new HttpsError('internal', 'Magic interrupted.', error.message);
    }
});

exports.editTrip = onCall({ 
    enforceAppCheck: true, 
    cors: true 
}, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'You must be logged in.');
    const { prompt, currentTripData, modelId } = request.data;
    if (!prompt || !currentTripData) throw new HttpsError('invalid-argument', 'Missing prompt or trip data.');

    const systemInstruction = `You are an expert travel planner. Modify this existing itinerary based on the user's request. Return the identical JSON structure.
        Current JSON: ${JSON.stringify(currentTripData)}`;

    try {
        const response = await ai.models.generateContent({
            model: modelId || 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: tripSchema
            }
        });
        if (!response.text) throw new HttpsError('internal', 'The grimoires returned empty.');
        return { result: response.text };
    } catch (error) {
        console.error("Trip Edit Error:", error);
        throw new HttpsError('internal', 'Magic interrupted.', error.message);
    }
});