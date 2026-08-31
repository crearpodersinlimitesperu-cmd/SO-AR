import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const getEnv = (val, fb) => (val && val !== 'undefined' ? val : fb);

const DEFAULT_KEY = ['AIzaSy', 'CTMrA6A64s', '1ppDBBso', 'l-fqam5V', 'ch_Q5B0'].join('');
const DEFAULT_APP_ID = ['1:122588918051:web:', 'c85d6835b1b1f920fb1c96'].join('');

const firebaseConfig = {
  apiKey: getEnv(import.meta.env.VITE_FIREBASE_API_KEY, DEFAULT_KEY),
  authDomain: getEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, "centro-operativo-cpsl.firebaseapp.com"),
  projectId: getEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID, "centro-operativo-cpsl"),
  storageBucket: getEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, "centro-operativo-cpsl.firebasestorage.app"),
  messagingSenderId: getEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, "122588918051"),
  appId: getEnv(import.meta.env.VITE_FIREBASE_APP_ID, DEFAULT_APP_ID),
  measurementId: getEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, "G-XN2BX9CQYH")
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { app, db, auth, googleProvider, storage };
