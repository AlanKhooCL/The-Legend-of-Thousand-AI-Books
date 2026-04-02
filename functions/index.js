const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

// Initialize the Gemini AI client with your API Key
const genAI = new GoogleGenerativeAI("AIzaSyB80OS8Lh0xDHhWl95PphjN1B1WiOoK33M");

// ============================================================================
// SHARED UTILS
// ============================================================================
const tripSchema = {
    type: "object",
    properties: {
        overview: { type: "object", properties: { title: { type: "string" }, dates: { type: "string" }, pax: { type: "string" }, totalBudget: { type: "string" } } },
        budget: { type: "array", items: { type: "object", properties: { item: { type: "string" }, cost: { type: "string" }, amount: { type: "number" }, icon: { type: "string" } } } },
        locations: { type: "array", items: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, color: { type: "string" }, image: { type: "string" } } } },
        itinerary: {
            type: "array", items: {
                type: "object", properties: {
                    day: { type: "number" }, date: { type: "string" }, location: { type: "string" }, title: { type: "string" },
                    events: {
                        type: "array", items: {
                            type: "object", properties: {
                                time: { type: "string" }, desc: { type: "string" }, icon: { type: "string" }, link: { type: "string" },
                                latlng: { type: "array", items: { type: "number" } }, expense: { type: "number" }
                            }
                        }
                    }
                }
            }
        }
    }
};

// ============================================================================
// APP 1: TEN THOUSAND SCROLLS ENDPOINTS
// ============================================================================

exports.summonQuest = onCall({ enforceAppCheck: true, cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
    const { topic, objective, numChapters, modelId } = request.data;

    const model = genAI.getGenerativeModel({ model: modelId || "gemini-1.5-flash" });
    const systemInstruction = `You are the Loremaster of Ten Thousand Scrolls. Ancient Chinese fantasy realm. Respond ONLY with valid JSON.`;
    const prompt = `Create a ${numChapters}-chapter learning quest for topic: "${topic}". ${objective ? `Objective: ${objective}` : ''}
    Return JSON: {"questTitle":"","questNarrative":"","bossName":"","bossTitle":"","bossLore":"","chapters":[{"title":"","tag":"","summary":""}]}`;

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
            systemInstruction: systemInstruction
        });
        return { result: result.response.text() };
    } catch (error) {
        throw new HttpsError('internal', error.message);
    }
});

exports.communeWithScrolls = onCall({ enforceAppCheck: true, cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
    const { action, payload, modelId } = request.data;

    let sys = ""; let prompt = ""; let mime = "text/plain";

    if (action === 'generateChapter') {
        sys = `You are an expert educator. Write HTML fragments using <h3>,<p>,<ul>,<li>,<strong>,<em>,<code>,<pre>.`;
        prompt = `Topic: ${payload.topic}. Write chapter: ${payload.chapterTitle}. 400-600 words.`;
    } else if (action === 'generateQuiz') {
        sys = `Expert educator. Return ONLY valid JSON.`;
        prompt = `Create 5 MCQs for topic: ${payload.topic}. JSON format: {"questions":[{"question":"","options":[],"correct":0,"explanation":""}]}`;
        mime = "application/json";
    }

    try {
        const model = genAI.getGenerativeModel({ model: modelId || "gemini-2.5-flash" });
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: mime },
            systemInstruction: sys
        });
        return { result: result.response.text() };
    } catch (error) {
        throw new HttpsError('internal', error.message);
    }
});

// ============================================================================
// APP 2: JOURNEYS & LEDGERS ENDPOINTS
// ============================================================================

exports.generateTrip = onCall({ enforceAppCheck: true, cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
    const { prompt, dates, pax, modelId } = request.data;

    const sys = `Expert travel planner. Return highly detailed travel itinerary. Dates: ${dates}, Pax: ${pax}. 
    Strict Rules: color must be (amber, teal, rose, violet, sky, emerald, pink, orange, purple). 
    id must be lowercase no spaces.`;

    try {
        const model = genAI.getGenerativeModel({ model: modelId || "gemini-2.5-flash" });
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { 
                responseMimeType: "application/json",
                responseSchema: tripSchema 
            },
            systemInstruction: sys
        });
        return { result: result.response.text() };
    } catch (error) {
        console.error("Gen Error:", error);
        throw new HttpsError('internal', 'Magic interrupted.');
    }
});

exports.editTrip = onCall({ enforceAppCheck: true, cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
    const { prompt, currentTripData, modelId } = request.data;

    const sys = `Expert travel planner. Modify the existing JSON itinerary based on user request. Maintain identical structure.
    Current JSON: ${JSON.stringify(currentTripData)}`;

    try {
        const model = genAI.getGenerativeModel({ model: modelId || "gemini-2.5-flash" });
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { 
                responseMimeType: "application/json",
                responseSchema: tripSchema 
            },
            systemInstruction: sys
        });
        return { result: result.response.text() };
    } catch (error) {
        console.error("Edit Error:", error);
        throw new HttpsError('internal', 'Magic interrupted.');
    }
});