import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

// Avoid re-initializing during Vite HMR
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Optional: connect to emulator in local dev if env is set
if (import.meta.env.DEV && import.meta.env.VITE_FIRESTORE_EMULATOR_HOST) {
  const [host, port] = String(import.meta.env.VITE_FIRESTORE_EMULATOR_HOST).split(":");
  if (host && port) {
    try {
      connectFirestoreEmulator(db, host, Number(port));
    } catch {
      // no-op if already connected
    }
  }
}
