import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAxYg9g2hn7fIGyaI1sjLgVzf9XMQ2B0HI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "campus-crear.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "campus-crear",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "campus-crear.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "899912053762",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:899912053762:web:1b78d6d9fc5471861e231b",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-FL7Q5KHNJN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider };

