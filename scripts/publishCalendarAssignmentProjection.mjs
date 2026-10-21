import 'dotenv/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const AGENT_ID = 'agente-sincronizador-asignador-calendario';
const AGENT_NAME = 'Agente Guardián de Sincronización Asignador ↔ Calendario Global';

const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
if (!rawServiceAccount) {
  throw new Error('Falta FIREBASE_SERVICE_ACCOUNT_KEY/GOOGLE_SERVICE_ACCOUNT_JSON. No se publicó nada.');
}

const serviceAccount = JSON.parse(rawServiceAccount);
const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);
const source = await db.collection('asignaciones_entrenadores').get();
const existingPublic = await db.collection('calendario_asignaciones_publicas').get();
const slotNames = ['unico', 'Creación', 'Relación', 'Gratitud'];
let batch = db.batch();
let pending = 0;
let published = 0;
let clearedOrphans = 0;

async function commitPending() {
  if (!pending) return;
  await batch.commit();
  batch = db.batch();
  pending = 0;
}

const canonicalIds = new Set();

for (const snapshot of source.docs) {
  canonicalIds.add(snapshot.id);
  const assignment = snapshot.data();
  const slots = Object.fromEntries(slotNames.map(slot => {
    const value = assignment[slot];
    return [slot, value?.entrenador
      ? { entrenador: String(value.entrenador), fechaIso: String(value.fechaIso || '') }
      : null];
  }));

  batch.set(db.collection('calendario_asignaciones_publicas').doc(snapshot.id), {
    entrenamiento: String(assignment.entrenamiento || ''),
    sede: String(assignment.sede || ''),
    fechaInicio: String(assignment.fechaInicio || ''),
    fechaFin: assignment.fechaFin || null,
    equipo: assignment.equipo || null,
    ...slots,
    source: 'causa_os_asignador',
    syncedByAgent: AGENT_ID,
    actualizadoEn: FieldValue.serverTimestamp(),
    publicadoPor: AGENT_ID,
  }, { merge: true });
  pending += 1;
  published += 1;
  if (pending === 450) await commitPending();
}

// Limpiar asignaciones huérfanas en calendario_asignaciones_publicas que ya no
// existan en asignaciones_entrenadores para que nunca quede un entrenador fantasma.
for (const pubDoc of existingPublic.docs) {
  if (canonicalIds.has(pubDoc.id)) continue;
  const data = pubDoc.data() || {};
  const hasAnyActiveSlot = slotNames.some(slot => data[slot]?.entrenador);
  if (!hasAnyActiveSlot) continue;
  const emptySlots = Object.fromEntries(slotNames.map(slot => [slot, null]));
  batch.set(db.collection('calendario_asignaciones_publicas').doc(pubDoc.id), {
    ...emptySlots,
    source: 'causa_os_asignador',
    syncedByAgent: AGENT_ID,
    actualizadoEn: FieldValue.serverTimestamp(),
    publicadoPor: AGENT_ID,
  }, { merge: true });
  pending += 1;
  clearedOrphans += 1;
  if (pending === 450) await commitPending();
}

await commitPending();
let operationalPublished = 0;
for (const [kind, collectionName] of [['override', 'calendario_operativo_overrides'], ['custom', 'calendario_operativo_custom']]) {
  const operational = await db.collection(collectionName).get();
  for (const snapshot of operational.docs) {
    const value = snapshot.data();
    const docId = kind === 'override' ? `override__${snapshot.id}` : `custom__${snapshot.id}`;
    batch.set(db.collection('calendario_operativo_publico').doc(docId), {
      kind,
      sourceEventKey: value.sourceEventKey || snapshot.id || null,
      nombre: String(value.nombre || ''), sede: String(value.sede || ''),
      equipo: value.equipo || '', lugar: value.lugar || '',
      fechaInicio: String(value.fechaInicio || ''), fechaFin: String(value.fechaFin || ''),
      source: 'causa_os_asignador',
      syncedByAgent: AGENT_ID,
      actualizadoEn: FieldValue.serverTimestamp(),
      publicadoPor: AGENT_ID,
    }, { merge: true });
    pending += 1;
    operationalPublished += 1;
    if (pending === 450) await commitPending();
  }
}
await commitPending();
console.log(`[${AGENT_NAME}] Proyección publicada: ${published} asignaciones, ${clearedOrphans} huérfanas limpiadas y ${operationalPublished} ajustes operativos.`);
