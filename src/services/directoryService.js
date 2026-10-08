import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth } from './firebase';

// C-02: el directorio entre sedes ya no se lee desde el cliente; lo sirve el
// backend con proyección mínima según el rol/sede del perfil autenticado.
const functions = getFunctions(app, 'us-central1');

// Caché corta + deduplicación de llamadas en vuelo: getAllCompanyUsers se invoca
// desde muchas pantallas y cada llamada al backend lee el directorio.
const DIRECTORY_CLIENT_TTL_MS = 60 * 1000;
let directoryCache = { at: 0, uid: null, promise: null };

export async function fetchCrossSedeDirectory() {
  const now = Date.now();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Debes iniciar sesión para consultar el directorio.');
  if (directoryCache.uid === uid && directoryCache.promise && now - directoryCache.at < DIRECTORY_CLIENT_TTL_MS) {
    return directoryCache.promise;
  }
  const promise = httpsCallable(functions, 'getCompanyDirectory')()
    .then(res => {
      if (auth.currentUser?.uid !== uid) throw new Error('La sesión cambió durante la consulta del directorio.');
      if (!Array.isArray(res?.data?.users) || typeof res.data.canSeeCrossSede !== 'boolean') {
        throw new Error('Respuesta de directorio inválida.');
      }
      return { users: res.data.users, canSeeCrossSede: res.data.canSeeCrossSede };
    });
  directoryCache = { at: now, uid, promise };
  promise.catch(() => { if (directoryCache.promise === promise) directoryCache = { at: 0, uid: null, promise: null }; });
  return promise;
}

export async function fetchRoleRecipients(roles) {
  const res = await httpsCallable(functions, 'getRoleRecipients')({ roles });
  if (!Array.isArray(res?.data?.recipients)) throw new Error('Respuesta de destinatarios inválida.');
  return res.data.recipients;
}
