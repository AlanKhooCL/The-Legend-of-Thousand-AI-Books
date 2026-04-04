const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { defineSecret } = require("firebase-functions/params");

admin.initializeApp();

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getModel(genAI, modelId) {
  return genAI.getGenerativeModel({ model: modelId || "gemini-2.5-flash" });
}

async function generate(model, systemInstruction, prompt, mimeType = "text/plain") {
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: mimeType },
    systemInstruction: { parts: [{ text: systemInstruction }] },
  });
  return result.response.text();
}

// ─────────────────────────────────────────────────────────────────────────────
//  SUMMON QUEST
//  Phase 1: Generate a pedagogically-sound curriculum plan first,
//  then derive the gamified quest wrapper from it.
// ─────────────────────────────────────────────────────────────────────────────

exports.summonQuest = onCall(
  {
    enforceAppCheck: true,
    cors: true,
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 120,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");

    const { topic, objective, numChapters, modelId } = request.data;
    const chapterCount = Math.max(3, Math.min(10, parseInt(numChapters) || 5));

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
    const model = getModel(genAI, modelId);

    // ── STEP 1: Build a curriculum plan ─────────────────────────────────────
    // Ask the model to think like an instructional designer first.
    // This plan is NOT returned to the user — it's used to generate better chapters.

    const curriculumSys = `You are a senior instructional designer and subject-matter expert. 
Your task is to design a rigorous, pedagogically sound learning curriculum.
Respond ONLY with valid JSON. No markdown, no explanation.`;

    const curriculumPrompt = `Design a ${chapterCount}-chapter learning curriculum for: "${topic}"
${objective ? `Learning goal: ${objective}` : ""}

Requirements:
- Chapters must follow a clear logical progression (foundational → applied → advanced)
- Each chapter must have concrete, testable learning outcomes
- Identify prerequisite knowledge a learner needs before each chapter
- Flag common misconceptions or pitfalls for each chapter
- Calibrate depth: assume an intelligent adult with no prior knowledge of this specific topic

Return this JSON structure:
{
  "topic": "${topic}",
  "targetAudience": "brief description of assumed learner",
  "overallObjective": "what the learner will be able to do after all chapters",
  "prerequisiteKnowledge": ["list of general background knowledge assumed"],
  "chapters": [
    {
      "chapterNumber": 1,
      "title": "precise descriptive title",
      "tag": "SHORT TAG (e.g. FOUNDATIONS, CORE CONCEPT, APPLIED)",
      "summary": "1-2 sentence description for the learner",
      "learningOutcomes": ["by end of chapter, learner can..."],
      "keyConceptsToTeach": ["concept1", "concept2"],
      "commonMisconceptions": ["misconception to address"],
      "buildsOn": [],
      "leadsTo": ["concept that next chapter depends on this for"]
    }
  ]
}`;

    let curriculum;
    try {
      const curriculumText = await generate(model, curriculumSys, curriculumPrompt, "application/json");
      curriculum = JSON.parse(curriculumText.replace(/```json|```/gi, "").trim());
    } catch (err) {
      console.error("Curriculum generation failed:", err);
      throw new HttpsError("internal", "Failed to design curriculum: " + err.message);
    }

    // ── STEP 2: Generate the gamified quest wrapper ──────────────────────────
    // Use the curriculum to create accurate boss names, lore, and quest narrative
    // that actually reflects the topic domain.

    const questSys = `You are a creative game writer designing an educational fantasy RPG. 
The quest must be thematically tied to the actual academic topic.
The "demon" represents the challenge of mastering this subject.
Respond ONLY with valid JSON.`;

    const chapterListForPrompt = curriculum.chapters
      .map((c, i) => `Chapter ${i + 1}: ${c.title}`)
      .join("\n");

    const questPrompt = `Create a fantasy quest wrapper for this learning curriculum:
Topic: "${topic}"
Overall objective: "${curriculum.overallObjective}"
Chapters:
${chapterListForPrompt}

Rules:
- Quest title should be evocative but clearly reference the actual topic
- Boss name and lore should use metaphors FROM the topic domain (e.g. for Machine Learning: "The Overfitting Specter", for History: "The Amnesia Wraith")
- Narrative should frame the learning journey as a heroic quest
- Boss lore should hint at WHY mastering this topic defeats the "demon" of ignorance

Return JSON:
{
  "questTitle": "",
  "questNarrative": "",
  "bossName": "",
  "bossTitle": "",
  "bossLore": ""
}`;

    let questWrapper;
    try {
      const questText = await generate(model, questSys, questPrompt, "application/json");
      questWrapper = JSON.parse(questText.replace(/```json|```/gi, "").trim());
    } catch (err) {
      console.error("Quest wrapper generation failed:", err);
      // Fallback — don't fail the whole request over the creative wrapper
      questWrapper = {
        questTitle: `Mastery of ${topic}`,
        questNarrative: `A great scroll of knowledge awaits. Study its chapters to defeat the guardian demon.`,
        bossName: `The ${topic} Demon`,
        bossTitle: "Guardian of Ignorance",
        bossLore: `Only by mastering ${topic} can the demon be defeated.`,
      };
    }

    // ── STEP 3: Assemble final response ─────────────────────────────────────
    // Strip internal planning fields before sending to frontend,
    // but keep learningOutcomes and keyConceptsToTeach for use in chapter generation.

    const finalChapters = curriculum.chapters.map((c) => ({
      title: c.title,
      tag: c.tag,
      summary: c.summary,
      // These are stored on the quest and used when generating chapter content:
      learningOutcomes: c.learningOutcomes || [],
      keyConceptsToTeach: c.keyConceptsToTeach || [],
      commonMisconceptions: c.commonMisconceptions || [],
    }));

    const response = {
      ...questWrapper,
      chapters: finalChapters,
      // Store full curriculum metadata so chapter generation can use it:
      curriculumMeta: {
        targetAudience: curriculum.targetAudience,
        overallObjective: curriculum.overallObjective,
        prerequisiteKnowledge: curriculum.prerequisiteKnowledge || [],
      },
    };

    return { result: JSON.stringify(response) };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
//  COMMUNE WITH SCROLLS
//  generateChapter: context-aware, curriculum-driven chapter content
//  generateQuiz:    generated from actual chapter content, not just topic name
// ─────────────────────────────────────────────────────────────────────────────

exports.communeWithScrolls = onCall(
  {
    enforceAppCheck: true,
    cors: true,
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 120,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");

    const { action, payload, modelId } = request.data;
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
    const model = getModel(genAI, modelId);

    // ── GENERATE CHAPTER ─────────────────────────────────────────────────────
    if (action === "generateChapter") {
      const {
        topic,
        chapterTitle,
        chapterTag,
        chapterSummary,
        chapterNumber,
        totalChapters,
        learningOutcomes,
        keyConceptsToTeach,
        commonMisconceptions,
        curriculumMeta,
        previousChaptersSummary,
      } = payload;

      const sys = `You are a world-class educator and science communicator — think the clarity of Richard Feynman, 
the narrative pull of Malcolm Gladwell, and the precision of a textbook author.

Your writing rules:
- NEVER be vague. Every claim must be concrete and specific.
- Use real examples, analogies, and comparisons — not abstract placeholders.
- If teaching a concept, show it working with a real scenario.
- Address common misconceptions directly — say "A common mistake is..." when relevant.
- Write for an intelligent adult who is new to THIS topic but not to learning.
- Build on what earlier chapters established. Do not re-explain concepts already covered.
- End with a clear "takeaway" sentence that ties back to the learning outcome.

Output format: HTML fragments only. 
Use: <h3> for sub-headings, <p> for paragraphs, <ul>/<li> for lists, 
<strong> for key terms (first use only), <em> for emphasis, 
<code> for technical terms/formulas, <blockquote> for important callouts.
No <html>, <body>, <head> tags. No inline styles.`;

      const outcomesText = (learningOutcomes || []).length > 0
        ? `\nBy the end of this chapter, the learner must be able to:\n${(learningOutcomes).map(o => `- ${o}`).join("\n")}`
        : "";

      const conceptsText = (keyConceptsToTeach || []).length > 0
        ? `\nKey concepts to cover (all must be explained):\n${(keyConceptsToTeach).map(c => `- ${c}`).join("\n")}`
        : "";

      const misconceptionsText = (commonMisconceptions || []).length > 0
        ? `\nCommon misconceptions to address in this chapter:\n${(commonMisconceptions).map(m => `- ${m}`).join("\n")}`
        : "";

      const contextText = curriculumMeta
        ? `\nCourse context:\n- Target audience: ${curriculumMeta.targetAudience || "general adult learner"}\n- Overall course goal: ${curriculumMeta.overallObjective || ""}`
        : "";

      const previousText = previousChaptersSummary
        ? `\nWhat has already been covered in previous chapters (do NOT re-explain these):\n${previousChaptersSummary}`
        : chapterNumber > 1
        ? `\nThis is chapter ${chapterNumber} of ${totalChapters}. Assume the learner has covered the foundational concepts from earlier chapters.`
        : `\nThis is the first chapter — start from first principles, assume no prior knowledge of ${topic}.`;

      const chapterPrompt = `Write Chapter ${chapterNumber || ""} of a ${totalChapters || ""}-chapter course on: "${topic}"

Chapter title: "${chapterTitle}"
Chapter purpose: ${chapterSummary}
${outcomesText}
${conceptsText}
${misconceptionsText}
${contextText}
${previousText}

Length: 550–750 words of actual educational content (not counting HTML tags).
Start directly with content — no "In this chapter we will..." preamble.
End with a <blockquote> containing a single sharp takeaway sentence.`;

      try {
        const content = await generate(model, sys, chapterPrompt, "text/plain");
        return { result: content };
      } catch (err) {
        console.error("Chapter generation error:", err);
        throw new HttpsError("internal", err.message);
      }
    }

    // ── GENERATE QUIZ ────────────────────────────────────────────────────────
    if (action === "generateQuiz") {
      const {
        topic,
        chapterTitles,
        chapterContents,   // NEW: actual chapter text, sanitised plain text
        curriculumMeta,
      } = payload;

      const sys = `You are an expert assessment designer. 
Your job is to write quiz questions that genuinely test understanding — not just recall of surface facts.
Good questions: test application of concepts, reveal common misconceptions, require reasoning.
Bad questions: test trivia, are ambiguous, have "all of the above" options, or give away the answer.
Respond ONLY with valid JSON. No markdown fences.`;

      // If we have actual content, use it. Otherwise fall back to chapter titles.
      const contentContext = chapterContents && chapterContents.length > 0
        ? `Based on the following chapter content that the learner has studied:\n\n${chapterContents.slice(0, 6000)}`
        : `Based on a course covering these chapters:\n${chapterTitles}`;

      const audienceNote = curriculumMeta?.targetAudience
        ? `\nTarget learner: ${curriculumMeta.targetAudience}`
        : "";

      const quizPrompt = `Create 5 multiple-choice quiz questions to test mastery of: "${topic}"
${audienceNote}

${contentContext}

Requirements for each question:
1. Test understanding or application — not just memorisation
2. All 4 options must be plausible (avoid obviously wrong distractors)
3. The explanation must clarify WHY the correct answer is right AND why common wrong answers are wrong
4. Questions should vary in difficulty: 2 foundational, 2 applied, 1 analytical
5. No trick questions. No "which of the following is NOT..." format.

Return JSON:
{
  "questions": [
    {
      "question": "clear, specific question",
      "options": ["option A", "option B", "option C", "option D"],
      "correct": 0,
      "explanation": "explanation of correct answer and why distractors are wrong",
      "difficulty": "foundational|applied|analytical"
    }
  ]
}`;

      try {
        const quizText = await generate(model, sys, quizPrompt, "application/json");
        return { result: quizText };
      } catch (err) {
        console.error("Quiz generation error:", err);
        throw new HttpsError("internal", err.message);
      }
    }

    throw new HttpsError("invalid-argument", `Unknown action: ${action}`);
  }
);
