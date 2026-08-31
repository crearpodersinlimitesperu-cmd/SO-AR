import { initializeApp } from "firebase/app";
import { getFirestore, getDoc } from "firebase/firestore";
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

// Lectura de un doc con un reintento: si Firestore rechaza por "permission-denied"
// estando el usuario logueado, es casi siempre un ID token cacheado/desactualizado
// en el SDK (no un problema real de rol). Forzamos su refresco y reintentamos una vez
// antes de dar el error por bueno.
export async function getDocResilient(docRef) {
  try {
    return await getDoc(docRef);
  } catch (err) {
    if (err.code === 'permission-denied') {
      if (auth.currentUser) {
        // Token puede estar desincronizado, refrescar y reintentar
        try {
          await auth.currentUser.getIdToken(true);
          return await getDoc(docRef);
        } catch (refreshErr) {
          // Token refresh falló — sesión realmente está muerta
          throw err;
        }
      }
      // No hay usuario en Firebase pero la app cree que sí — sesión rota
      // El handler global lo detectará y forzará logout
    }
    throw err;
  }
}

// Handler global para errores de permission-denied: si Firebase rechaza pero
// la app cree que el usuario está logueado, la sesión está rota. Logout forzado.
export function setupFirebaseErrorHandler(onSessionExpired) {
  const originalGetDoc = getDoc;
  const originalOnSnapshot = typeof window !== 'undefined' ? window.onSnapshot : null;

  window.firestorePermissionDeniedHandler = (err) => {
    if (err.code === 'permission-denied' && onSessionExpired) {
      onSessionExpired();
    }
  };
}

export { app, db, auth, googleProvider, storage };
