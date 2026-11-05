import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  connectAuthEmulator,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
} from 'firebase/firestore';

export const FIREBASE_CONFIG = {
  projectId: import.meta.env.VITE_C2_PROJECT_ID || 'aliados-crear-global',
  appId: '1:803494420111:web:bb2fd8fcb92bfce9b31afa',
  storageBucket: 'aliados-crear-global.firebasestorage.app',
  apiKey: import.meta.env.VITE_C2_API_KEY || 'AIzaSyAu7Oa19PYgLQJYRb5HAsYgWw2KRqyqcM4',
  authDomain: import.meta.env.VITE_C2_AUTH_DOMAIN || 'aliados-crear-global.firebaseapp.com',
  messagingSenderId: '803494420111',
};

export const ADMIN_EMAILS = [
  'sistemas@crearpsl.net',
  'jose.sanchez@crearpsl.net',
  'armando.pilacuan@gmail.com',
  'paul.sosa@crearpsl.net',
];

export function isAdminEmail(email) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(String(email).trim().toLowerCase());
}

export function getPortalFirebase() {
  const existing = getApps().find(a => a.name === 'aliados-c2-portal');
  const app = existing || initializeApp(FIREBASE_CONFIG, 'aliados-c2-portal');
  const auth = getAuth(app);
  const db = getFirestore(app);

  if (import.meta.env.VITE_USE_EMULATORS === 'true' && !window.__C2_EMULATORS_CONNECTED__) {
    window.__C2_EMULATORS_CONNECTED__ = true;
    connectAuthEmulator(auth, 'http://127.0.0.1:9198', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8198);
  }

  return { app, auth, db, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged };
}
