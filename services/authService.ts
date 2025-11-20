
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDXJLTFmCIj8A_cwcyVIjnAToAp45VvbJQ",
  authDomain: "aistylia.firebaseapp.com",
  projectId: "aistylia",
  storageBucket: "aistylia.firebasestorage.app",
  messagingSenderId: "11852300884",
  appId: "1:11852300884:web:8bbcb629d0dff28dcda3c1",
  measurementId: "G-PGS1BS67Q4"
};

let authInstance: any = null;

export const initializeAuth = () => {
  if (authInstance) return authInstance;

  try {
    // Check if app is already initialized to avoid errors
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    authInstance = getAuth(app);
    return authInstance;
  } catch (error) {
    console.error("Failed to initialize Firebase", error);
    return null;
  }
};

// Initialize immediately
initializeAuth();

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  if (!authInstance) return () => {};
  return onAuthStateChanged(authInstance, callback);
};

export const loginWithGoogle = async () => {
  if (!authInstance) throw new Error("Auth not initialized");
  const provider = new GoogleAuthProvider();
  return signInWithPopup(authInstance, provider);
};

export const registerWithEmail = async (email: string, pass: string) => {
  if (!authInstance) throw new Error("Auth not initialized");
  return createUserWithEmailAndPassword(authInstance, email, pass);
};

export const loginWithEmail = async (email: string, pass: string) => {
  if (!authInstance) throw new Error("Auth not initialized");
  return signInWithEmailAndPassword(authInstance, email, pass);
};

export const logoutUser = async () => {
  if (!authInstance) return;
  return signOut(authInstance);
};
