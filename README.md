# 🚀 LearNow (formerly Ten Thousand Scrolls)

**LearNow** is an AI-native, gamified learning engine that transforms any complex academic or professional subject into a structured, narrative-driven adventure. By orchestrating Google’s Gemini models through a multi-stage pipeline, LearNow turns static study material into a progression-based "Quest" where knowledge is the primary weapon used to defeat "Demon Guardians" (subject-matter bosses).

---

## 🧠 Core Functionalities & AI Orchestration

The platform's power lies in how it handles the "Instructional-to-Narrative" bridge, ensuring that the gamification never comes at the expense of pedagogical rigor.

### 1. The Multi-Stage Generation Pipeline
Rather than using a single prompt to generate a whole course, LearNow uses a sequential chain of specialized AI personas to ensure structural integrity:

* **Step 0: The Disambiguator:** Before a course is built, the AI resolves the user’s input to its precise educational meaning (e.g., resolving "MCP" to "Model Context Protocol") and assigns it a "Domain" (e.g., Computer Science) to set the context for all subsequent steps.
* **Step 1: Senior Instructional Designer:** A specialized prompt builds a curriculum of exactly 3–10 chapters with a logical progression (Foundations → Core → Applied → Advanced). The system includes a **triple-retry loop** to ensure the AI adheres to the exact chapter count and JSON schema.
* **Step 2: Creative Game Writer:** This persona wraps the syllabus in a narrative. It is specifically prompted to create "Boss Names" using domain-specific metaphors (e.g., a Networking boss named "The Packet Loss Wraith") to maintain thematic consistency.
* **Step 3: Curriculum Advisor:** Generates a list of prerequisite topics and "next-step" recommendations to place the current quest within a larger learning path.

---

## 🛠️ Deep Dive: Quality & Drift Control

To produce high-quality output consistently and prevent the "model drift" typical in long-form AI generation, LearNow employs several advanced prompting strategies:

### 🎭 Persona-Driven Prompting
LearNow utilizes a **"Feynman-Gladwell Hybrid"** persona for chapter generation. The system instruction mandates:
* **Feynman Clarity:** Breaking down complex ideas into simple, intuitive analogies.
* **Gladwell Narrative:** Engaging, story-driven explanations.
* **Textbook Precision:** Using real-world tools, protocols, and events instead of placeholder examples.

### 🛡️ Eliminating Instructional Drift
"Drift" occurs when an AI loses track of what it has already taught. LearNow solves this through **Context Threading**:
* **State Awareness:** Each time a new chapter is generated, the prompt is injected with a `previousChaptersSummary`.
* **Negative Constraints:** The AI is explicitly told: *"Already covered (do NOT re-explain): [Summary of previous content]"*. This forces the model to build upon prior knowledge rather than repeating introductory concepts in later stages.

### 🎯 Application-First Assessment
The quiz engine is prompted as an **"Expert Assessment Designer"**. Key rules include:
* **No Surface Recall:** Prompts explicitly forbid "Which of the following is NOT..." questions, focusing instead on analytical and applied scenarios.
* **Plausible Distractors:** All wrong answers must be "plausible to a partial-knower".
* **Hard Mode Logic:** In "Harder Mode," the AI is instructed to generate a 5th option—a "sophisticated distractor" that sounds expert-level but is subtly incorrect.

---

## 🎮 Gamification Mechanics

* **Boss Battles:** Players must pass a dynamically generated quiz based on the chapter content to "defeat" the boss and progress.
* **Celestial Gambit:** A high-stakes feature allowing players to wager their earned XP before a boss fight. Success doubles the reward; failure results in total loss.
* **Evolution System:** Players choose between a **Warrior** or **Scholar** path, which dictates their visual evolution, rank titles, and personality quotes as they level up.

---

## 💻 Tech Stack

* **AI Engine:** Google Vertex AI (Gemini 2.5 Flash/Pro models).
* **Frontend:** Pure HTML5, Tailwind CSS, and Vanilla JavaScript (ES Modules)—optimized for a "zero-build" mobile development experience.
* **Backend:** Firebase Functions (Node.js) for AI orchestration and Firebase Auth/Firestore for progress persistence.
