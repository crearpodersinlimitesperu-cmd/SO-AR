import 'dotenv/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
if (!rawServiceAccount) {
  throw new Error('Falta FIREBASE_SERVICE_ACCOUNT_KEY/GOOGLE_SERVICE_ACCOUNT_JSON. No se publicó nada.');
}

const serviceAccount = JSON.parse(rawServiceAccount);
const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);
const source = await db.collection('asignaciones_entrenadores').get();
const slotNames = ['unico', 'Creación', 'Relación', 'Gratitud'];
let batch = db.batch();
let pending = 0;
let published = 0;

async function commitPending() {
  if (!pending) return;
  await batch.commit();
  batch = db.batch();
  pending = 0;
}

for (const snapshot of source.docs) {
  const assignment = snapshot.data();
  const slots = Object.fromEntries(slotNames.map(slot => {
    const value = assignment[slot];
    return [slot, value?.entrenador
      ? { entrenador: String(value.entrenador), fechaIso: String(value.fechaIso || '') }
      : null];
  }));

  // No eliminamos documentos ni campos. Es una proyección recuperable de la
  // fuente canónica, limitada a lo que el calendario necesita mostrar.
  batch.set(db.collection('calendario_asignaciones_publicas').doc(snapshot.id), {
    entrenamiento: String(assignment.entrenamiento || ''),
    sede: String(assignment.sede || ''),
    fechaInicio: String(assignment.fechaInicio || ''),
    fechaFin: assignment.fechaFin || null,
    equipo: assignment.equipo || null,
    ...slots,
    source: 'causa_os_asignador',
    actualizadoEn: FieldValue.serverTimestamp(),
    publicadoPor: 'backfill_controlado',
  }, { merge: true });
  pending += 1;
  published += 1;
  if (pending === 450) await commitPending();
}

await commitPending();
let operationalPublished = 0;
for (const [kind, collectionName] of [['override', 'calendario_operativo_overrides'], ['custom', 'calendario_operativo_custom']]) {
  const operational = await db.collection(collectionName).get();
  for (const snapshot of operational.docs) {
    const value = snapshot.data();
    batch.set(db.collection('calendario_operativo_publico').doc(snapshot.id), {
      kind,
      sourceEventKey: value.sourceEventKey || null,
      nombre: String(value.nombre || ''), sede: String(value.sede || ''),
      equipo: value.equipo || '', lugar: value.lugar || '',
      fechaInicio: String(value.fechaInicio || ''), fechaFin: String(value.fechaFin || ''),
      source: 'causa_os_asignador', actualizadoEn: FieldValue.serverTimestamp(),
      publicadoPor: 'backfill_controlado',
    }, { merge: true });
    pending += 1;
    operationalPublished += 1;
    if (pending === 450) await commitPending();
  }
}
await commitPending();
console.log(`Proyección de calendario publicada: ${published} asignaciones y ${operationalPublished} ajustes operativos. Fuente canónica intacta.`);
