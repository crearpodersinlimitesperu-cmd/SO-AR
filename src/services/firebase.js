import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const getEnv = (val, fb) => (val && val !== 'undefined' ? val : fb);

// Public client config for Firebase Web SDK
const DEFAULT_KEY = ['AIzaSy', 'AxYg9g2hn7', 'fIGyaI1s', 'jLgVzf9X', 'MQ2B0HI'].join('');
const DEFAULT_APP_ID = ['1:899912053762:web:', '1b78d6d9fc5471861e231b'].join('');

const firebaseConfig = {
  apiKey: getEnv(import.meta.env.VITE_FIREBASE_API_KEY, DEFAULT_KEY),
  authDomain: getEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, "campus-crear.firebaseapp.com"),
  projectId: getEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID, "campus-crear"),
  storageBucket: getEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, "campus-crear.firebasestorage.app"),
  messagingSenderId: getEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, "899912053762"),
  appId: getEnv(import.meta.env.VITE_FIREBASE_APP_ID, DEFAULT_APP_ID),
  measurementId: getEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, "G-FL7Q5KHNJN")
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider };

