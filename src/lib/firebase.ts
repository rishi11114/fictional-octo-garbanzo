import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validate Firebase configuration
const requiredConfigKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_DATABASE_URL",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];
const missingKeys = requiredConfigKeys.filter((key) => !import.meta.env[key]);
if (missingKeys.length > 0) {
  console.error("Missing Firebase configuration keys:", missingKeys);
  throw new Error(`Firebase configuration incomplete. Missing keys: ${missingKeys.join(", ")}`);
}

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Analytics
export const analyticsPromise = isSupported()
  .then((s) => (s ? getAnalytics(app) : null))
  .catch(() => null);

// Auth
export const auth = getAuth(app);

// Auth ready promise — ensures persistence is set before usage
export const authReady = new Promise<User | null>((resolve) => {
  setPersistence(auth, browserLocalPersistence)
    .then(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    })
    .catch((err) => {
      console.error("Error setting persistence:", err);
      resolve(null);
    });
});

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// ✅ Universal Google sign-in (works on mobile + desktop + all browsers)
export async function signInWithGoogle() {
  try {
    await authReady;
    try {
      // First try popup
      return await signInWithPopup(auth, googleProvider);
    } catch (popupError) {
      console.warn("Popup failed, falling back to redirect:", popupError);
      // If popup blocked → fallback to redirect
      await signInWithRedirect(auth, googleProvider);
    }
  } catch (error) {
    console.error("Error during Google sign in:", error);
    throw error;
  }
}

// ✅ Handle redirect result (important for mobile + fallback browsers)
export async function handleRedirectResult() {
  try {
    await authReady;
    const result = await getRedirectResult(auth);
    if (result?.user) {
      console.log("Signed in user from redirect:", result.user);
      return result.user;
    }
  } catch (error) {
    console.error("Error handling redirect:", error);
  }
  return null;
}

// Auth state change listener
export function onAuthStateChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Database
export const db = getDatabase(app);

// Storage — for file/image uploads
export const storage = getStorage(app);