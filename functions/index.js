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