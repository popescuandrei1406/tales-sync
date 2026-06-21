# Tales Sync

**Tales Sync** is a collaborative, AI-powered multiplayer storytelling game. Players can create or join lobbies, co-write stories in real-time, and leverage the power of Google's Gemini AI to dynamically generate story paths, choices, and thematic elements. This project was created during the Google AI Hackathon '26.

---

## 🚀 Features

- **Multiplayer Lobbies**: Create public or private lobbies and invite friends to co-write stories. Real-time synchronization is powered by **Firebase Firestore**.
- **AI-Powered Storytelling**: Google's **Gemini AI** acts as the narrator/game master, generating story continuations, context-aware choices, and analyzing player inputs.
- **Dynamic Turn-Based Gameplay**: Players take turns contributing to the unfolding narrative, shaping the story world together.
- **Beautiful UI/UX**: Built with **React** and styled using **Tailwind CSS**, featuring dark mode aesthetics, clean transitions, and responsive design.
- **Robust Verification**: Fully configured with **Vitest** and **React Testing Library** to ensure reliability of game logic and AI services.

---

## 🛠️ Tech Stack

- **Frontend Framework**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Routing**: [React Router DOM v6](https://reactrouter.com/)
- **Database & Auth**: [Firebase v10](https://firebase.google.com/) (Firestore & Authentication)
- **AI Integration**: [Google Generative AI SDK](https://ai.google.dev/) (Gemini AI API)
- **Testing**: [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 📦 Setup & Installation

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn
- A Firebase project (with Firestore database enabled)
- A Gemini API key (from Google AI Studio)

### 1. Clone the repository
```bash
git clone git@github.com:popescuandrei1406/tales-sync.git
cd tales-sync
```

### 2. Configure Environment Variables
Copy the template `.env.example` file to create a local `.env` file:
```bash
cp .env.example .env
```
Open the `.env` file and populate it with your credentials:
```env
VITE_FIREBASE_API_KEY="your-firebase-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project-id.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
VITE_GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Locally
Start the local development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## 🧪 Testing

We use **Vitest** for unit and integration testing.

To run tests in watch mode:
```bash
npm run test
```

To run tests with coverage reporting:
```bash
npx vitest run --coverage
```

---

## 🚀 Deployment

The project is configured for deployment on **Vercel**. 

### Auto-Configuring Vercel Environment Variables
If you are deploying this project to Vercel, you can quickly upload your environment variables from your local `.env` file to Vercel's console by running:
```bash
chmod +x set_env_vars.sh
./set_env_vars.sh
```
*Note: Make sure you have the [Vercel CLI](https://vercel.com/cli) installed and are logged in via `npx vercel login` before executing the script.*
