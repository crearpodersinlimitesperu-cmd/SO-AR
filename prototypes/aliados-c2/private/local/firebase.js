import { initializeApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, connectFirestoreEmulator } from 'firebase/firestore';
import { assertLocalDemo, demoProject, emulatorPorts } from './environment.js';

export function localFirebase() {
  assertLocalDemo(import.meta.env.VITE_C2_PROJECT_ID ?? demoProject, window.location.hostname);
  const app = initializeApp({
    projectId: demoProject,
    apiKey: 'demo-only-no-real-key',
    authDomain: 'localhost',
  }, 'c2-local-private');
  const auth = initializeAuth(app, { persistence: inMemoryPersistence });
  connectAuthEmulator(auth, `http://127.0.0.1:${emulatorPorts.auth}`, { disableWarnings: true });
  const db = initializeFirestore(app, { localCache: memoryLocalCache() });
  connectFirestoreEmulator(db, '127.0.0.1', emulatorPorts.firestore);
  return { auth, db };
}
