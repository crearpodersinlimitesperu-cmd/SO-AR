import { auth } from './firebase';

export async function readPrivateNodusSnapshot() {
  const owner = auth.currentUser;
  if (!owner?.uid) throw new Error('Debes iniciar sesión para verificar tus métricas.');
  const token = await owner.getIdToken();
  if (auth.currentUser?.uid !== owner.uid) throw new Error('La cuenta cambió durante la consulta de métricas.');
  const base = import.meta.env.VITE_COPILOTO_WORKER_URL || 'https://so-ar-copiloto.crearpsl-cpsl.workers.dev';
  const response = await fetch(`${base.replace(/\/$/, '')}/nodus-private-snapshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: '{}', cache: 'no-store', signal: AbortSignal.timeout(15000)
  });
  if (auth.currentUser?.uid !== owner.uid) throw new Error('La cuenta cambió durante la consulta de métricas.');
  const result = await response.json();
  if (auth.currentUser?.uid !== owner.uid) throw new Error('La cuenta cambió durante la consulta de métricas.');
  if (!response.ok) throw new Error(result.message || `No se pudieron verificar las métricas (${response.status}).`);
  if (!result.snapshot || !Array.isArray(result.snapshot.coordinadores) ||
      !Array.isArray(result.snapshot.sedes) || !Array.isArray(result.snapshot.equiposSummary)) {
    throw new Error('El servidor devolvió métricas sin una proyección privada válida.');
  }
  return result.snapshot;
}
