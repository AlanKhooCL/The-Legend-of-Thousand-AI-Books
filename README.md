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
