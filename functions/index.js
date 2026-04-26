const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { defineSecret } = require("firebase-functions/params");

admin.initializeApp();
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

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

function safeParseJSON(text) {
  const clean = (text || "").replace(/```json|```/gi, "").trim();
  try { return JSON.parse(clean); } catch (e) {
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
    return null;
  }
}

exports.summonQuest = onCall(
  { enforceAppCheck: true, cors: true, secrets: [GEMINI_API_KEY], timeoutSeconds: 180 },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");

    const { topic, objective, chapterCount: rawChapterCount, numChapters, priorKnowledge, modelId } = request.data;
    const chapterCount = 5; // Fixed 5-chapter structure
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
    const model = getModel(genAI, modelId);

    // STEP 0 — Disambiguate topic
    let resolvedTopic = topic;
    let topicDomain = "";

    // Only call AI for short acronyms (2-6 caps). Everything else passes through unchanged.
    const looksLikeAcronym = /^[A-Z]{2,6}$/.test(topic.trim());

    if (looksLikeAcronym) {
      try {
        const dText = await generate(model,
          `You resolve acronyms to their full educational meaning. Respond ONLY with valid JSON.`,
          `Acronym to resolve: "${topic}"
${objective ? `Goal context: "${objective}"` : ""}

Return the most likely educational expansion. If unsure, return it unchanged.
Return JSON: {"resolvedTopic":"","domain":""}`,
          "application/json"
        );
        const d = safeParseJSON(dText);
        if (d && d.resolvedTopic && d.resolvedTopic.toLowerCase() !== 'undefined' && d.resolvedTopic.trim() !== '') {
          resolvedTopic = d.resolvedTopic;
          topicDomain = d.domain || "";
        }
      } catch (err) { console.warn("Disambiguation skipped:", err.message); }
    } else {
      // Plain English — infer domain from keywords without any AI call
      const t = topic.toLowerCase();
      if (/sales|market|customer|revenue|pipeline|crm|negotiat|pitch|prospect|close|b2b|b2c/.test(t)) topicDomain = "Business & Sales";
      else if (/leader|manag|strateg|execut|operat|supply chain|logistic|hr|hiring|team/.test(t)) topicDomain = "Business & Leadership";
      else if (/financ|invest|stock|portfolio|accounting|budget|tax|valuat|trading/.test(t)) topicDomain = "Finance & Investing";
      else if (/code|program|software|react|javascript|python|data struc|algorithm|api|database|backend|frontend|devops|cloud/.test(t)) topicDomain = "Software Engineering";
      else if (/ai|machine learn|deep learn|neural|llm|nlp|prompt|model/.test(t)) topicDomain = "Artificial Intelligence";
      else if (/design|ux|ui|user experience|figma|product|wireframe/.test(t)) topicDomain = "Design & Product";
      else if (/history|war|civiliz|empire|revolution|ancient|medieval|renaissance/.test(t)) topicDomain = "History & Culture";
      else if (/math|calculus|algebra|statistic|probability|geometry|linear/.test(t)) topicDomain = "Mathematics";
      else if (/physic|chemist|biology|scienc|quantum|molecule|cell|gene/.test(t)) topicDomain = "Natural Sciences";
      else if (/cook|culinar|bak|recipe|food|wine|coffee|nutrition/.test(t)) topicDomain = "Culinary Arts";
      else if (/music|guitar|piano|composition|theory|chord|rhythm/.test(t)) topicDomain = "Music";
      else if (/law|legal|contract|intellectual property|regulation|compliance/.test(t)) topicDomain = "Law & Compliance";
      else topicDomain = "General Education";
    }

    // STEP 1 — Curriculum design with retry until exact chapter count
    const priorLevel = priorKnowledge || 'some';
    const priorInstructions = {
      none: 'The student has ZERO prior knowledge. Chapter 1 must start from absolute first principles using simple analogies. Build up gradually — never assume familiarity with any concept.',
      some: 'The student knows the basics but lacks depth. Skip trivial definitions. Focus on the mechanics, nuances, and practical application they are missing.',
      strong: 'The student is already experienced. SKIP all introductory content. Start immediately with advanced mechanics, subtle edge cases, and expert-level insights that even experienced practitioners miss.',
    }[priorLevel];

    const curriculumSys = `You are a senior instructional designer and expert in ${topicDomain || "the relevant field"}. Respond ONLY with valid JSON.
Prior knowledge level: ${priorLevel.toUpperCase()} — ${priorInstructions}`;

    const buildPrompt = (n) => `Design EXACTLY 5 chapters for: "${resolvedTopic}"
${objective ? `Goal: ${objective}` : ""}
Prior knowledge: ${priorLevel.toUpperCase()}

MANDATORY 5-CHAPTER STRUCTURE — follow this exactly:
Chapter 1 — THE FOUNDATION: Core concept, vocabulary, and mental model. ${priorLevel === 'none' ? 'Start from absolute zero. Use simple analogies.' : priorLevel === 'strong' ? 'Skip the basics — establish the expert mental model and key abstractions.' : 'Cover core vocabulary and the foundational mental model clearly.'}
Chapter 2 — THE MECHANICS: How it actually works under the hood. Internal logic, key components, and their interactions.
Chapter 3 — THE APPLICATION: Real-world use cases. Translating theory into practice with concrete examples.
Chapter 4 — THE TRAPS: Common misconceptions, edge cases, and pitfalls. Crucial for avoiding expert-level mistakes.
Chapter 5 — THE SYNTHESIS: Tying it all together. High-level patterns, advanced insights, and what mastery looks like.

Use domain-specific terminology for ${topicDomain || resolvedTopic}.
Each chapter needs concrete learning outcomes and specific concepts — no vague generalities.

JSON with EXACTLY 5 chapters:
{
  "targetAudience": "...",
  "overallObjective": "...",
  "prerequisiteKnowledge": [],
  "chapters": [
    {"chapterNumber":1,"title":"","tag":"FOUNDATIONS","summary":"","learningOutcomes":[],"keyConceptsToTeach":[],"commonMisconceptions":[]}
  ]
}`;

    let curriculum = null;
    for (let attempt = 1; attempt <= 3 && !curriculum; attempt++) {
      try {
        const txt = await generate(model, curriculumSys, buildPrompt(chapterCount), "application/json");
        const p = safeParseJSON(txt);
        if (p && Array.isArray(p.chapters) && p.chapters.length === chapterCount) {
          curriculum = p;
        } else {
          console.warn(`Attempt ${attempt}: got ${p?.chapters?.length} chapters, need ${chapterCount}`);
        }
      } catch (e) { console.warn(`Attempt ${attempt} failed:`, e.message); }
    }

    // Fallback curriculum
    if (!curriculum) {
      curriculum = {
        targetAudience: "adult learner with no prior knowledge",
        overallObjective: `Understand and apply ${resolvedTopic}`,
        prerequisiteKnowledge: [],
        chapters: Array.from({ length: chapterCount }, (_, i) => ({
          chapterNumber: i + 1,
          title: i === 0 ? `Introduction to ${resolvedTopic}` : i === chapterCount - 1 ? `Advanced ${resolvedTopic}` : `${resolvedTopic} — Part ${i + 1}`,
          tag: i === 0 ? "FOUNDATIONS" : i === chapterCount - 1 ? "ADVANCED" : "CORE",
          summary: `Chapter ${i + 1} of ${chapterCount}.`,
          learningOutcomes: [],
          keyConceptsToTeach: [],
          commonMisconceptions: [],
        })),
      };
    }

    // STEP 2 — Quest wrapper
    let questWrapper = null;
    try {
      const qTxt = await generate(model,
        `You are a creative game writer for an educational fantasy RPG. Respond ONLY with valid JSON.`,
        `Generate a quest wrapper for a learning mission on "${resolvedTopic}" (domain: ${topicDomain}).
Chapters: ${curriculum.chapters.map((c,i)=>`${i+1}. ${c.title}`).join(", ")}
Prior knowledge level: ${priorLevel}

Requirements:
- questTitle: A punchy, memorable mission title (e.g. "The Redux Reckoning", "Mastering the Shadow DOM")
- questNarrative: 2-3 sentences. A COURSE SYNOPSIS — factual and concrete. Describe WHAT the student will learn and WHY it matters. No fantasy fluff. Example: "This mission covers the core mechanics of React state management, from useState fundamentals to complex reducer patterns. By the end, you will confidently architect stateful applications and debug state-related bugs in production."
- bossName: A domain-specific metaphor boss (e.g. ML→"The Overfitting Specter", SQL→"The N+1 Query Demon", React→"The Stale Closure Wraith")
- bossTitle: A short menacing subtitle
- bossLore: 1-2 sentences of lore about the boss as a metaphor for the hardest concept in this subject

JSON: {"questTitle":"","questNarrative":"","bossName":"","bossTitle":"","bossLore":""}`,
        "application/json"
      );
      questWrapper = safeParseJSON(qTxt);
    } catch (e) { console.warn("Quest wrapper failed:", e.message); }

    if (!questWrapper) {
      questWrapper = {
        questTitle: `Mastery of ${resolvedTopic}`,
        questNarrative: `${chapterCount} scrolls of knowledge await. Study them to defeat the guardian demon.`,
        bossName: `The ${resolvedTopic} Specter`,
        bossTitle: "Guardian of Ignorance",
        bossLore: `Only by mastering ${resolvedTopic} can this demon of confusion be banished.`,
      };
    }

    const finalChapters = curriculum.chapters.map(c => ({
      title: c.title, tag: c.tag || "CHAPTER", summary: c.summary,
      learningOutcomes: c.learningOutcomes || [],
      keyConceptsToTeach: c.keyConceptsToTeach || [],
      commonMisconceptions: c.commonMisconceptions || [],
    }));

    // Generate prerequisite topics and recommended next topics
    let prereqTopics = curriculum.prerequisiteKnowledge || [];
    let nextTopics = [];
    try {
      const nextTxt = await generate(model,
        `You are a curriculum advisor. Respond ONLY with valid JSON.`,
        `For someone who just completed a course on: "${resolvedTopic}" (${chapterCount} chapters covering: ${finalChapters.map(c=>c.title).join(', ')})\n\nProvide:\n1. prerequisiteTopics: 3-5 short topic names someone should know BEFORE this course (if any; leave empty if truly beginner-level)\n2. nextTopics: 4-6 specific topic names to study AFTER completing this course, ordered by relevance\n\nReturn JSON: {"prerequisiteTopics": [], "nextTopics": []}`,
        "application/json"
      );
      const nextParsed = safeParseJSON(nextTxt);
      if (nextParsed) {
        if (Array.isArray(nextParsed.prerequisiteTopics)) prereqTopics = nextParsed.prerequisiteTopics;
        if (Array.isArray(nextParsed.nextTopics)) nextTopics = nextParsed.nextTopics;
      }
    } catch (e) { console.warn("Next topics generation failed:", e.message); }

    return {
      result: JSON.stringify({
        ...questWrapper,
        resolvedTopic, originalTopic: topic,
        chapters: finalChapters,
        prereqTopics,
        nextTopics,
        curriculumMeta: {
          targetAudience: curriculum.targetAudience,
          overallObjective: curriculum.overallObjective,
          prerequisiteKnowledge: prereqTopics,
          domain: topicDomain,
        },
      })
    };
  }
);

exports.communeWithScrolls = onCall(
  { enforceAppCheck: true, cors: true, secrets: [GEMINI_API_KEY], timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");

    const { action, payload, modelId } = request.data;
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
    const model = getModel(genAI, modelId);

    if (action === "generateChapter") {
      const {
        topic, chapterTitle, chapterTag, chapterSummary,
        chapterNumber, totalChapters,
        learningOutcomes, keyConceptsToTeach, commonMisconceptions,
        curriculumMeta, previousChaptersSummary,
      } = payload;

      const domain = curriculumMeta?.domain || "the relevant field";

      const sys = `You are a world-class educator and expert in ${domain}. Write engaging, structured educational content that is easy to read and learn from.

STRUCTURE RULES — every chapter must include ALL of these in order:
1. A <div class="chapter-intro"> with 2-3 sentences setting context and why this matters
2. At least 2-3 <div class="concept-block"> sections, each with:
   - An <h3> heading naming the concept
   - <p> paragraphs explaining with concrete examples
   - Real names, tools, events — never say "for example, X" where X is placeholder
3. At least one <div class="key-insight"> callout with a 💡 emoji and a sharp, memorable insight
4. At least one <div class="common-mistake"> callout with a ⚠️ emoji addressing a misconception
5. Where relevant, a <div class="code-example"><pre><code> block with real, working code or commands
6. A <div class="chapter-summary"> with 3-5 bullet points summarising what was covered
7. A <blockquote class="chapter-takeaway"> with ONE sharp, memorable takeaway sentence

CONTENT RULES:
- Feynman clarity: explain as if to a smart person encountering this for the first time
- Gladwell narrative: open with a story, analogy, or surprising fact
- Every concept needs a concrete real-world example — no abstract hand-waving
- Address the "why should I care?" for every major point
- Build on prior chapters, never re-explain already-covered concepts

OUTPUT: HTML only using these tags and classes. No markdown. No wrapper div. No inline styles.`;


      const prompt = `Write Chapter ${chapterNumber || 1} of ${totalChapters || "?"} on: "${topic}"

Title: "${chapterTitle}"
Tag: ${chapterTag || ""}
Purpose: ${chapterSummary}
${(learningOutcomes||[]).length ? `\nLearning outcomes:\n${learningOutcomes.map(o=>`- ${o}`).join("\n")}` : ""}
${(keyConceptsToTeach||[]).length ? `\nConcepts to cover (all required):\n${keyConceptsToTeach.map(c=>`- ${c}`).join("\n")}` : ""}
${(commonMisconceptions||[]).length ? `\nMisconceptions to address:\n${commonMisconceptions.map(m=>`- ${m}`).join("\n")}` : ""}
${curriculumMeta ? `\nAudience: ${curriculumMeta.targetAudience||"adult learner"}\nCourse goal: ${curriculumMeta.overallObjective||""}` : ""}
${previousChaptersSummary ? `\nAlready covered (do NOT re-explain):\n${previousChaptersSummary}` : chapterNumber > 1 ? `\nChapter ${chapterNumber} of ${totalChapters}: assume foundations from earlier chapters.` : `\nChapter 1: start from scratch, assume no prior knowledge of ${topic}.`}

Length: 550–800 words. Start directly — no preamble. End with <blockquote> takeaway.`;

      try {
        const content = await generate(model, sys, prompt, "text/plain");
        return { result: content };
      } catch (err) {
        console.error("Chapter error:", err);
        throw new HttpsError("internal", err.message);
      }
    }

    if (action === "generateQuiz") {
      const { topic, chapterTitles, chapterContents, curriculumMeta, harderMode } = payload;
      const optionCount = harderMode ? 5 : 4;

      const sys = `You are an expert assessment designer for ${curriculumMeta?.domain || "the relevant field"}.
Test genuine understanding — application, not recall. All distractors must be plausible to a partial-knower.
Respond ONLY with valid JSON. No markdown fences.`;

      const contentContext = chapterContents && chapterContents.length > 100
        ? `Based on this chapter content:\n\n${chapterContents.slice(0, 7000)}`
        : `Based on a course covering: ${chapterTitles}`;

      const prompt = `Create 5 multiple-choice questions for: "${topic}"
${curriculumMeta?.targetAudience ? `Learner: ${curriculumMeta.targetAudience}` : ""}
${harderMode ? `\nHARD MODE: Generate ${optionCount} options per question. Option E must be a sophisticated distractor — expert-sounding but subtly incorrect.` : `\nGenerate exactly 4 options per question.`}

${contentContext}

Rules:
1. Test application/understanding — not surface recall
2. All ${optionCount} options plausible to a partial-knower
3. Explanation: why correct is right + why the most tempting wrong answer fails
4. Mix: 2 foundational, 2 applied, 1 analytical
5. No "which is NOT" format

JSON:
{
  "questions": [
    {
      "question": "",
      "options": [],
      "correct": 0,
      "explanation": "",
      "difficulty": "foundational|applied|analytical"
    }
  ]
}`;

      try {
        const quizText = await generate(model, sys, prompt, "application/json");
        const parsed = safeParseJSON(quizText);
        if (parsed) parsed._mode = harderMode ? 'hard' : 'normal';
        return { result: JSON.stringify(parsed) };
      } catch (err) {
        console.error("Quiz error:", err);
        throw new HttpsError("internal", err.message);
      }
    }

    throw new HttpsError("invalid-argument", `Unknown action: ${action}`);
  }
);
