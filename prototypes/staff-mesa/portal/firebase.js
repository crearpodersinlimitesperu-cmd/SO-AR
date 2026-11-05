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
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'centro-operativo-cpsl',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:122588918051:web:c85d6835b1b1f920fb1c96',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'centro-operativo-cpsl.firebasestorage.app',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCTMrA6A64s1ppDBBsol-fqam5Vch_Q5B0',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'centro-operativo-cpsl.firebaseapp.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '122588918051',
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
  const existing = getApps().find(a => a.name === 'staff-mesa-portal');
  const app = existing || initializeApp(FIREBASE_CONFIG, 'staff-mesa-portal');
  const auth = getAuth(app);
  const db = getFirestore(app);

  if (import.meta.env.VITE_USE_EMULATORS === 'true' && !window.__MESA_EMULATORS_CONNECTED__) {
    window.__MESA_EMULATORS_CONNECTED__ = true;
    connectAuthEmulator(auth, 'http://127.0.0.1:9198', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8198);
  }

  return { app, auth, db, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged };
}
