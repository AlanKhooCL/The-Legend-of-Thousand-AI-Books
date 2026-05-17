# ☢️ LearNow: Wasteland Edition (Vault-Tec Knowledge Archive)

**LearNow** is an AI-powered, gamified learning platform wrapped in an immersive, retro-futuristic Vault-Tec/Fallout CRT terminal interface. Turn any subject into a 5-chapter RPG quest, study the AI-generated "scrolls," and defeat the "Demon Guardian" (a dynamic, application-based quiz) to level up your Wastelander.

## ✨ Features

* **🧠 AI-Powered Curriculum (Google Gemini 2.5):** Submit any topic, and the AI generates a structured 5-chapter course using "Feynman-Gladwell" instructional design (clear analogies, storytelling, and high-retention formatting).
* **🎮 Gamified Interrogations (Boss Battles):** After reading the chapters, face the topic's "Guardian" in an interrogation. The AI generates multiple-choice questions that test *application*, not just recall. 
* **📺 Retro CRT Terminal Interface:** A single-view "Command Center" UI featuring phosphor glow, scanlines, boot-up flickers, and blinking cursors. 
* **📱 Progressive Web App (PWA):** Fully installable on iOS, Android, and Desktop. Operates as a standalone, full-screen native application.
* **📈 RPG Progression System:** Earn XP, level up your operative (from *Tiny Sprout* to *Eternal Legend*), maintain answer streaks, and use the "Tactical Gambit" to wager XP before a boss fight.
* **⏱️ Dynamic Deadlines:** Set mission deadlines. Miss them, and the boss goes into "Hard Mode" (quizzes gain a 5th, highly sophisticated decoy option).
* **🗂️ Curriculum Management:** Organize quests into custom folders/curricula to track long-term learning goals.

## 🛠 Tech Stack & Architecture

* **Frontend:** Vanilla JavaScript (ES Modules), HTML5, CSS3 animations, and Tailwind CSS.
* **Backend:** Firebase Serverless Architecture.
  * **Firebase Hosting:** Serves the PWA and static assets securely over HTTPS.
  * **Firebase Auth:** Google Sign-In and Anonymous secure session management.
  * **Firestore:** Real-time database for saving player progression, active quests, and curriculum folders.
  * **Cloud Functions (Node.js):** Secure backend handlers (`summonQuest`, `communeWithScrolls`) that interface with the AI.
* **AI Integration:** `@google/generative-ai` (Defaults to `gemini-2.5-flash` with an option for `gemini-2.5-pro`).
* **Security:** Firebase App Check (reCAPTCHA v3) enforced on Cloud Functions to prevent unauthorized API abuse.

## 🚀 Getting Started

### Prerequisites
* Node.js installed locally.
* Firebase CLI installed (`npm install -g firebase-tools`).
* A Google Gemini API Key.

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/the-legend-of-thousand-ai-books.git](https://github.com/your-username/the-legend-of-thousand-ai-books.git)
   cd the-legend-of-thousand-ai-books
Install Cloud Function Dependencies:

Bash
cd functions
npm install
cd ..
Initialize Firebase:

Bash
firebase login
firebase use --add  # Select your Firebase project
Set up the Gemini API Secret:
Store your Gemini API key securely in Google Cloud Secret Manager via Firebase:

Bash
firebase functions:secrets:set GEMINI_API_KEY
Test Locally:
Run the Firebase emulators to test the app locally.

Bash
firebase serve
(Note: PWAs require a secure context. localhost works for testing the PWA install prompt).

Deploy to Wasteland (Production):

Bash
firebase deploy
🧠 Core Prompt Engineering Rules
The backend Cloud Functions utilize strict prompt constraints to ensure high-quality educational outputs:

JSON Enforcement: The AI is strictly prompted to return parsed JSON for seamless UI integration.

Feynman Clarity & Gladwell Narrative: Chapter generation strictly requires 2-3 concept blocks with real-world examples, avoiding abstract hand-waving.

Application Over Recall: Quiz generation is explicitly instructed to create plausible distractors and test the user's ability to apply knowledge, rejecting simple "which is NOT" formats.

📱 PWA Information
This app includes a robust Service Worker (sw.js) and Web App Manifest (manifest.json) using zero-network inline SVG data URIs for its icons, ensuring 100% installability offline without external image dependencies.

iOS: Open in Safari -> Share -> "Add to Home Screen".

Android/Desktop: Tap the standard "Install App" browser prompt.
