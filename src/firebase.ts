import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Import the Firebase configuration directly from the JSON file
import firebaseConfig from '../firebase-applet-config.json';

// Check if critical configuration is missing
const isConfigValid = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.apiKey !== 'PLACEHOLDER' && firebaseConfig.apiKey !== 'MISSING');

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

if (isConfigValid) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    // Use the named database if provided in the config
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  console.warn("Firebase configuration is missing or invalid in firebase-applet-config.json.");
}

export { db, auth, isConfigValid };
export default app;
