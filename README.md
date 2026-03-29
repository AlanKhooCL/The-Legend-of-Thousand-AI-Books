# 📜 萬卷書 — Ten Thousand Scrolls

**Ten Thousand Scrolls** is an AI-powered, gamified learning application set in an ancient Chinese fantasy (Wuxia) realm. Transform any subject—from Python programming to Ancient Roman history—into an epic quest where knowledge is your weapon against ancient demons.

## ✨ Features

* **🤖 AI-Generated Curriculums:** Powered by Google's Vertex AI (Gemini 2.5 Flash/Pro). Enter a topic, and the "Loremaster" generates a multi-chapter learning scroll and a unique Demon Guardian.
* **⚔️ Choose Your Destiny:** Play as a hot-blooded **Warrior** or a calculating **Scholar**. Your choice dictates your visual evolution, rank titles, and personality quotes as you level up.
* **👹 Boss Battles (Quiz Mechanics):** Reading the chapters unlocks the boss. Defeat the demon by passing a dynamically generated multiple-choice quiz based on the material you just read.
* **🎰 Risk & Reward Systems:** * **Celestial Gambit:** Wager your hard-earned XP before a boss fight for a chance to double your rewards—or lose it all.
  * **Fate Scrolls:** Defeating a boss grants random gacha-style drops, including rare Celestial Sigils.
* **☁️ Cloud Saves & Realm Library:** Firebase integration ensures your characters and progress sync across devices. Publish your best quests to the Public Realm Library for other scholars to play.

## 🛠️ Tech Stack

* **Frontend:** Pure HTML, CSS, and Vanilla JavaScript (ES Modules). No build steps or heavy frameworks required.
* **Backend / BaaS:** Firebase Auth (Google Sign-In & Anonymous), Cloud Firestore (NoSQL Database).
* **AI Engine:** Firebase AI Logic routing to Google Cloud Vertex AI (Gemini models).

## 📱 Mobile-First Development Environment

This project is built as a single-file architecture (`index.html`), making it incredibly lightweight and perfectly optimized for mobile development. 

To develop and test on the go:
1. Open this repository in **GitHub Codespaces** directly from your mobile browser.
2. Edit the `index.html` file.
3. Use the Codespaces port-forwarding feature to preview your changes live on your device.

## 🚀 Setup & Deployment

### 1. Firebase Configuration
To run this project, you will need your own Firebase project configured:
1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** (Google Sign-In & Anonymous).
3. Enable **Firestore Database**.
4. Enable **Vertex AI in Firebase** (requires upgrading to the pay-as-you-go Blaze plan).
5. Copy your Firebase config object and replace the `firebaseConfig` variable in the `<script type="module">` section of `index.html`.

### 2. Firestore Security Rules
Ensure your Firestore rules allow for private user saves and a public library:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /public_quests/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
