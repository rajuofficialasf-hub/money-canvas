import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with Google provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
// Use standard non-sensitive scopes (email, profile, openid) - requires no Google verification

// Initialize Firestore
export const db = getFirestore(app, firebaseConfigJson.firestoreDatabaseId || '(default)');

export default app;
