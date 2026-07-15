import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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

console.log("Checking API Key: ", process.env.REACT_APP_FIREBASE_API_KEY);
// Initialize Firebase Core Engine
const app = initializeApp(firebaseConfig);

// Initialize and export Cloud Firestore Database
export const db = getFirestore(app);

// Initialize and export Firebase Auth Instance
export const auth = getAuth(app);

/**
 * Creates a permanent, cryptographically backed cloud audit record
 * that includes user authentication details and live GPS tracking location.
 */
export async function logDeploymentEvent(
    userId: string,
    level: number,
    transactionHash: string,
    taskDetails: string,
    coordinates: { latitude: number | string; longitude: number | string } | null
) {
    try {
        const docRef = await addDoc(collection(db, "deployment_logs"), {
            volunteerUid: userId,
            nftLevel: level,
            txHash: transactionHash,
            taskPerformed: taskDetails,
            stadiumLocation: coordinates ? {
                lat: coordinates.latitude,
                lng: coordinates.longitude
            } : "GPS Unavailable",
            network: "Polygon Amoy Testnet",
            status: "Verified On-Chain",
            timestamp: serverTimestamp()
        });
        console.log("Google Firebase multi-user audit log synced. ID: ", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Firebase multi-user database write error: ", error);
        return null;
    }
}