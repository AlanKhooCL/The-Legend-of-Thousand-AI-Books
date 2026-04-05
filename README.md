# 📜 LearNow

**LearNow** is an AI-native, gamified learning platform that transforms any academic or professional subject into an immersive quest. By orchestrating Google’s Gemini models, the application turns static study material into a multi-chapter journey where knowledge is the only weapon capable of defeating "Demon Guardians".

---

## 🚀 Core Functionalities

* **AI Curriculum Engine:** Dynamically generates a structured syllabus from a simple topic input, ensuring logical progression from foundations to advanced concepts.
* **Narrative Wrapping:** Every course is wrapped in a unique fantasy narrative, featuring domain-specific boss lore and metaphors (e.g., "The Overfitting Specter" for Machine Learning).
* **Beast Evolution:** Players nurture a companion spirit that evolves through 10 distinct stages (from "Tiny Sprout" to "Eternal Legend") as they gain XP through learning.
* **Celestial Gambit:** A high-stakes "Risk & Reward" system where players can wager their XP before a boss fight to double their gains—or lose it all.
* **Boss Battle Quizzes:** AI-generated multiple-choice questions designed to test application and genuine understanding rather than surface-level recall.

---

## 🧠 Deep Dive: The AI Generation Engine

The heart of LearNow is a sophisticated multi-stage orchestration pipeline designed to produce consistent, high-quality educational output while minimizing the "narrative drift" common in LLM-generated content.

### 1. The Multi-Stage Orchestration Pipeline
Instead of generating a course in a single step, the system breaks the process into four distinct phases to ensure precision and structural integrity:

1.  **Topic Disambiguation:** The system first resolves the user's input (e.g., "ML") into a precise educational meaning ("Machine Learning") and assigns it a domain to set the context for the entire quest.
2.  **Curriculum Design:** A "Senior Instructional Designer" persona builds a progression (Foundations → Core → Applied → Advanced). The system enforces strict JSON schemas and exact chapter counts through a **retry loop** (up to 3 attempts).
3.  **Narrative Wrapping:** A "Creative Game Writer" persona takes the syllabus and creates a quest title, boss name, and lore using domain-specific metaphors.
4.  **Just-in-Time Chapter Generation:** Chapters are generated on-demand as the player progresses, allowing the engine to focus its token window on depth rather than breadth.

### 2. Prompts for High-Quality Output
The system uses "persona-driven" system instructions to enforce specific writing styles:
* **The Feynman-Gladwell Hybrid:** The chapter generator is instructed to act as a world-class educator with "Feynman clarity, Gladwell narrative, and textbook precision".
* **Application Over Recall:** The quiz generator is prompted to test genuine understanding, ensuring that all distractors (wrong answers) are "plausible to a partial-knower" to prevent easy guessing.

### 3. Reducing Narrative & Instructional Drift
A major challenge in AI-generated courses is "drift"—where later chapters repeat earlier concepts or lose the initial goal. LearNow solves this via:

* **Context Threading:** When generating a new chapter, the engine is fed a `previousChaptersSummary`. The prompt explicitly forbids re-explaining concepts: *"Already covered (do NOT re-explain): [previousChaptersSummary]"*.
* **Outcome Guardrails:** Each chapter generation is guided by specific `learningOutcomes`, `keyConceptsToTeach`, and `commonMisconceptions` predefined during the Curriculum Design phase.

### 4. Technical Reliability & Consistency
* **JSON Enforcement:** All structural data is requested in strict JSON format. The system uses a `safeParseJSON` utility to strip markdown fences and repair minor AI formatting errors.
* **Hard Mode Logic:** For advanced learners, a "Hard Mode" is available where the AI is instructed to generate a "sophisticated distractor" that sounds expert but is subtly incorrect.

---

## 🛠️ Tech Stack

* **Frontend:** Pure HTML5, Tailwind CSS, and Vanilla JavaScript (ES Modules) for a lightweight, "zero-build" mobile-first experience.
* **Backend:** Firebase Functions (Node.js) for AI orchestration and secure API handling.
* **Database:** Cloud Firestore for real-time progress syncing and the Public Realm Library.
* **AI Engine:** Google Vertex AI (Gemini 2.5 Flash/Pro) for curriculum, content, and quiz generation.
