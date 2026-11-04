import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { canReadPrivateProfile } from '../utils/privacyScope.js';

export function subscribeToPrivateNodusCredentials(viewer, person, callback) {
  const email = String(person?.email || '').trim().toLowerCase();
  if (!email || !canReadPrivateProfile(viewer, person)) {
    throw new Error('No tienes autorización para consultar estas credenciales.');
  }
  let active = true;
  callback(null, { status: 'loading' });
  const stop = onSnapshot(doc(db, 'user_private_credentials', email), { includeMetadataChanges: true }, snapshot => {
    if (!active) return;
    if (snapshot.metadata.fromCache) {
      callback(null, { status: 'loading' });
      return;
    }
    if (!snapshot.exists()) {
      callback(null, { status: 'empty' });
      return;
    }
    const data = snapshot.data();
    if (typeof data.username !== 'string' || !data.username.trim() ||
        typeof data.password !== 'string' || !data.password ||
        typeof data.sede !== 'string' || !data.sede.trim()) {
      const error = new Error('La configuración privada de Nodus está incompleta. Contacta a un administrador.');
      console.error('Credenciales privadas de Nodus incompletas.');
      callback(null, { status: 'error', error });
      return;
    }
    callback({ username: data.username, password: data.password, sede: data.sede }, { status: 'ready' });
  }, error => {
    if (!active) return;
    console.error('No se pudieron consultar las credenciales privadas de Nodus:', error.code);
    callback(null, { status: 'error', error });
  });
  return () => { active = false; stop(); };
}
