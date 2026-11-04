import { auth } from './firebase';

async function readPrivateNodusProjection(path, { expectedUid, isCurrent = () => true } = {}) {
  const owner = auth.currentUser;
  if (!owner?.uid) throw new Error('Debes iniciar sesión para verificar tus métricas.');
  const assertCurrent = () => {
    if (auth.currentUser?.uid !== owner.uid || (expectedUid && expectedUid !== owner.uid) || !isCurrent()) {
      throw new Error('La cuenta cambió durante la consulta de métricas.');
    }
  };
  assertCurrent();
  const token = await owner.getIdToken();
  assertCurrent();
  const base = import.meta.env.VITE_COPILOTO_WORKER_URL || 'https://so-ar-copiloto.crearpsl-cpsl.workers.dev';
  const response = await fetch(`${base.replace(/\/$/, '')}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: '{}', cache: 'no-store', signal: AbortSignal.timeout(15000)
  });
  assertCurrent();
  const result = await response.json();
  assertCurrent();
  if (!response.ok) throw new Error(result.message || `No se pudieron verificar las métricas (${response.status}).`);
  return result.snapshot;
}

export async function readPrivateNodusSnapshot(options) {
  const snapshot = await readPrivateNodusProjection('nodus-private-snapshot', options);
  if (!snapshot || !Array.isArray(snapshot.coordinadores) ||
      !Array.isArray(snapshot.sedes) || !Array.isArray(snapshot.equiposSummary)) {
    throw new Error('El servidor devolvió métricas sin una proyección privada válida.');
  }
  return snapshot;
}

export async function readPrivateNodusReportSources(options) {
  const snapshot = await readPrivateNodusProjection('nodus-private-report-sources', options);
  if (!snapshot || !Array.isArray(snapshot.reportSources) || !Array.isArray(snapshot.authorizedSedes) ||
      !Array.isArray(snapshot.authorizedStages) || !Array.isArray(snapshot.missingSources)) {
    throw new Error('El servidor devolvió reportes sin una proyección privada válida.');
  }
  return snapshot;
}

export async function readPrivatePulseSummary(options) {
  const snapshot = await readPrivateNodusProjection('private-pulse-summary', options);
  if (!snapshot || !Array.isArray(snapshot.authorizedSedes) ||
      !Number.isSafeInteger(snapshot.reportCount) || snapshot.reportCount < 0) {
    throw new Error('El servidor devolvió un agregado de Micro-Pulso no verificable.');
  }
  return snapshot;
}
