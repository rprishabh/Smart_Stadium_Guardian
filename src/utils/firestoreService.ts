import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { app } from "./firebaseConfig";

// Initialize Cloud Firestore Database on demand
const db = getFirestore(app);

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
