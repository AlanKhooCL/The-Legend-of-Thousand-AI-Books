const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

/**
 * 🔑 YOUR BACKEND API KEY
 * Use the API Key from Google AI Studio. 
 * This key is secure because it never leaves Google's servers.
 */
const genAI = new GoogleGenerativeAI("AIzaSyB80OS8Lh0xDHhWl95PphjN1B1WiOoK33M");

// ============================================================================
// SHARED SCHEMAS
// ============================================================================

const tripSchema = {
  type: "object",
  properties: {
    overview: { 
      type: "object", 
      properties: { 
        title: { type: "string" }, 
        dates: { type: "string" }, 
        pax: { type: "string" } 
      } 
    },
    budget: { 
      type: "array", 
      items: { 
        type: "object", 
        properties: { 
          item: { type: "string" }, 
          amount: { type: "number" }, 
          icon: { type: "string" } 
        } 
      } 
    },
    locations: { 
      type: "array", 
      items: { 
        type: "object", 
        properties: { 
          id: { type: "string" }, 
          name: { type: "string" }, 
          color: { type: "string" }, 
          image: { type: "string" } 
        } 
      } 
    },
    itinerary: {
      type: "array", 
      items: {
        type: "object", 
        properties: {
          day: { type: "number" }, 
          date: { type: "string" }, 
          location: { type: "string" }, 
          title: { type: "string" },
          events: {
            type: "array", 
            items: {
              type: "object", 
              properties: {
                time: { type: "string" }, 
                desc: { type: "string" }, 
                icon: { type: "string" },
                latlng: { type: "array", items: { type: "number" } }, 
                expense: { type: "number" }
              }
            }
          }
        }
      }
    }
  }
};

// ============================================================================
// APP 1: TEN THOUSAND SCROLLS (SUMMON QUEST)
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

// ============================================================================
// APP 2: JOURNEYS & LEDGERS (GENERATE TRIP)
// ============================================================================

exports.generateTrip = onCall({ enforceAppCheck: true, cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
  const { prompt, dates, pax, modelId } = request.data;

  const model = genAI.getGenerativeModel({ model: modelId || "gemini-2.5-flash" });
  
  const systemInstruction = `You are an expert travel planner. Create a detailed itinerary. 
  Dates: ${dates}, Pax: ${pax}. Output ONLY valid JSON. 
  Colors: (amber, teal, rose, violet, sky, emerald, pink, orange, purple).
  Use Lucide icon names. latlng must be [lat, lng].`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { 
        responseMimeType: "application/json",
        responseSchema: tripSchema 
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
  Maintain the exact same JSON structure.`;

  try {
    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: `Current Itinerary: ${JSON.stringify(currentTripData)}` }] },
        { role: 'user', parts: [{ text: `Modification Request: ${prompt}` }] }
      ],
      generationConfig: { 
        responseMimeType: "application/json",
        responseSchema: tripSchema 
      },
      systemInstruction: systemInstruction
    });
    return { result: result.response.text() };
  } catch (error) {
    console.error("Edit Trip Error:", error);
    throw new HttpsError('internal', 'The revision failed.');
  }
});