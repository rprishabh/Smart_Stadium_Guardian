import { initializeApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";

// Your secure environment configuration for Create React App
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize and export Firebase Core Engine
export const app = initializeApp(firebaseConfig);

let authInstance: Auth | null = null;

// Initialize and export Firebase Auth Instance lazily on demand
export const getAuthInstance = (): Auth => {
    if (!authInstance) {
        authInstance = getAuth(app);
    }
    return authInstance;
};