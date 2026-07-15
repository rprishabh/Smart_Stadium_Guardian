import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Defensive checks for missing configuration
const missingKeys = Object.entries(firebaseConfig)
  .filter(([_, value]) => !value || value.includes("here") || value.startsWith("your_"))
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.warn(
    `[Firebase Config Warning]: The following keys are unconfigured or placeholder values: ${missingKeys.join(
      ", "
    )}. Make sure to configure them in your .env file.`
  );
}

let app;
try {
  // Prevent duplicate initialization in hot-reload scenarios
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (error) {
  console.error("Failed to initialize Firebase application:", error);
  throw error;
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);

export default app;
