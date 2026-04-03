const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

/**
 * 🔑 YOUR BACKEND API KEY
 * (Ensure this is the key from your NEW AI Studio project)
 */
const genAI = new GoogleGenerativeAI("AIzaSyB80OS8Lh0xDHhWl95PphjN1B1WiOoK33M");

// ============================================================================
// SHARED SCHEMAS
// ============================================================================
const tripSchema = {
  type: "OBJECT",
  properties: {
    overview: { 
      type: "OBJECT", properties: { title: { type: "STRING" }, dates: { type: "STRING" }, pax: { type: "STRING" } } 
    },
    budget: { 
      type: "ARRAY", items: { type: "OBJECT", properties: { item: { type: "STRING" }, amount: { type: "NUMBER" }, icon: { type: "STRING" } } } 
    },
    locations: { 
      type: "ARRAY", items: { type: "OBJECT", properties: { id: { type: "STRING" }, name: { type: "STRING" }, color: { type: "STRING" }, image: { type: "STRING" } } } 
    },
    itinerary: {
      type: "ARRAY", items: {
        type: "OBJECT", properties: {
          day: { type: "NUMBER" }, date: { type: "STRING" }, location: { type: "STRING" }, title: { type: "STRING" },
          events: {
            type: "ARRAY", items: {
              type: "OBJECT", properties: {
                time: { type: "STRING" }, desc: { type: "STRING" }, icon: { type: "STRING" }, link: { type: "STRING" },
                latlng: { type: "ARRAY", items: { type: "NUMBER" } }, expense: { type: "NUMBER" }
              }
            }
          }
        }
      }
    }
  }
};

// ============================================================================
// APP 1: TEN THOUSAND SCROLLS
// ============================================================================

exports.summonQuest = onCall({ enforceAppCheck: true, cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
  const { topic, objective, numChapters, modelId } = request.data;

  const model = genAI.getGenerativeModel({ model: modelId || "gemini-2.5-flash" });
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
    console.error("Scrolls Error:", error);
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
      console.error("Commune Error:", error);
      throw new HttpsError('internal', error.message);
  }
});

// ============================================================================
// APP 2: JOURNEYS & LEDGERS
// ============================================================================

exports.generateTrip = onCall({ enforceAppCheck: true, cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
  const { prompt, dates, pax, modelId } = request.data;

  const model = genAI.getGenerativeModel({ model: modelId || "gemini-2.5-flash" });
  
  const systemInstruction = `You are an expert travel planner. Create a highly detailed travel itinerary.
  Dates: ${dates}, Pax: ${pax}. 
  Output ONLY valid JSON.
  Colors must be one of: (amber, teal, rose, violet, sky, emerald, pink, orange, purple).
  Use valid Lucide icon names. latlng must be an array of two numbers: [lat, lng].
  
  The JSON MUST exactly match this structure:
  {
    "overview": { "title": "", "dates": "", "pax": "", "totalBudget": "" },
    "budget": [ { "item": "", "amount": 0, "icon": "" } ],
    "locations": [ { "id": "lowercase_nospaces", "name": "", "color": "", "image": "url" } ],
    "itinerary": [
      {
        "day": 1, "date": "", "location": "id_matching_locations", "title": "",
        "events": [
          { "time": "", "desc": "", "icon": "", "link": "", "latlng": [0,0], "expense": 0 }
        ]
      }
    ]
  }`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { 
        responseMimeType: "application/json"
      },
      systemInstruction: systemInstruction
    });
    return { result: result.response.text() };
  } catch (error) {
    console.error("Trip Gen Error:", error);
    throw new HttpsError('internal', 'The travel grimoires are sealed.');
  }
});

exports.editTrip = onCall({ enforceAppCheck: true, cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
  const { prompt, currentTripData, modelId } = request.data;

  const model = genAI.getGenerativeModel({ model: modelId || "gemini-2.5-flash" });
  const systemInstruction = `You are an expert travel planner. Modify the existing JSON itinerary based on user instructions. 
  Maintain the exact same JSON structure as provided. Output ONLY valid JSON.`;

  try {
    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: `Current Itinerary JSON: ${JSON.stringify(currentTripData)}` }] },
        { role: 'user', parts: [{ text: `Modification Request: ${prompt}` }] }
      ],
      generationConfig: { 
        responseMimeType: "application/json"
      },
      systemInstruction: systemInstruction
    });
    return { result: result.response.text() };
  } catch (error) {
    console.error("Edit Trip Error:", error);
    throw new HttpsError('internal', 'The revision failed.');
  }
});