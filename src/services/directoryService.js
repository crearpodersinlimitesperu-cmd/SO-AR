import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

// C-02: el directorio entre sedes ya no se lee desde el cliente; lo sirve el
// backend con proyección mínima según el rol/sede del perfil autenticado.
const functions = getFunctions(app, 'us-central1');

// Caché corta + deduplicación de llamadas en vuelo: getAllCompanyUsers se invoca
// desde muchas pantallas y cada llamada al backend lee el directorio.
const DIRECTORY_CLIENT_TTL_MS = 60 * 1000;
let directoryCache = { at: 0, promise: null };

export async function fetchCrossSedeDirectory() {
  const now = Date.now();
  if (directoryCache.promise && now - directoryCache.at < DIRECTORY_CLIENT_TTL_MS) {
    return directoryCache.promise;
  }
  const promise = httpsCallable(functions, 'getCompanyDirectory')()
    .then(res => (Array.isArray(res?.data?.users) ? res.data.users : []));
  directoryCache = { at: now, promise };
  promise.catch(() => { if (directoryCache.promise === promise) directoryCache = { at: 0, promise: null }; });
  return promise;
}

export async function fetchRoleRecipients(roles) {
  const res = await httpsCallable(functions, 'getRoleRecipients')({ roles });
  return Array.isArray(res?.data?.recipients) ? res.data.recipients : [];
}
