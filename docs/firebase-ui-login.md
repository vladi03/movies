# Firebase Setup for UI Login (React + Vite)

This guide walks you through configuring Firebase Authentication for the React UI in `web/` so users can sign in and read data from Firestore.

## Prerequisites

- Node.js 18+ and npm
- A Firebase project (create one at https://console.firebase.google.com)
- Firebase CLI installed: `npm i -g firebase-tools` (optional, for hosting/emulators)

## 1) Create a Web App in Firebase

1. Open Firebase Console → Your Project → Build → Authentication → Get started.
2. Go to Project settings → General → Your apps → Web → Register app.
3. Copy the Firebase client config (apiKey, authDomain, etc.). You’ll paste these into `.env.local` below.

## 2) Enable a Sign‑in Provider

1. In Firebase Console → Build → Authentication → Sign‑in method.
2. Enable Google (recommended for this project). Optionally add Email/Password.
3. Under Authorized domains, ensure:
   - `localhost` (for local dev)
   - Your Firebase Hosting domain (e.g. `your-app.web.app`, `your-app.firebaseapp.com`)

## 3) Add Env Vars for the React App

Create or update `web/.env.local` with the values from step 1. Do not commit this file.

```
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
```

These map directly to the Firebase config used by the client initializer in `web/src/firebase.js`.

## 4) Verify Client Initialization

The app reads the env vars and initializes Auth and Firestore here:

- `web/src/firebase.js`

Expected shape:

```js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
```

Auth wiring is handled in:

- `web/src/auth/AuthGate.jsx`

It uses `signInWithPopup(auth, provider)` for Google sign‑in and shows a simple sign‑in/sign‑out control.

## 5) Firestore Security Rules (Read‑only UI)

Ensure your rules allow reads for authenticated users and block writes from the UI. The repo includes `firestore.rules` at the root:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /items/{id} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

Deploy rules if needed:

```
firebase deploy --only firestore:rules
```

## 6) Run the App Locally

```
cd web
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). Click “Sign in with Google” and complete the popup flow.

## 7) Optional: Firebase Hosting

With `firebase.json` already present at the repo root:

```
cd web
npm run build
cd ..
firebase deploy --only hosting
```

## Troubleshooting

- auth/unauthorized-domain: Add your local/hosting domain under Authentication → Settings → Authorized domains.
- Popup blocked: Allow popups for your dev/hosting URL.
- Missing env vars: Ensure `web/.env.local` keys match those referenced in `web/src/firebase.js`.
- Permission denied (reads): Confirm you are signed in and rules allow `read` for `request.auth != null`.

## Notes

- Never commit secrets: `.env.local`, service accounts, or API keys in code.
- For local development with emulators, configure Auth + Firestore emulators and point the app accordingly if needed.

