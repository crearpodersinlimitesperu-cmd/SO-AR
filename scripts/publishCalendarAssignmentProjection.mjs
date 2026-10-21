import 'dotenv/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import {
  computeCalendarProjectionPlan,
  TRAINER_CALENDAR_SYNC_AGENT_ID,
  TRAINER_CALENDAR_SYNC_AGENT_NAME,
} from '../public/trainerCalendarProjection.js';

const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
if (!rawServiceAccount) {
  throw new Error('Falta FIREBASE_SERVICE_ACCOUNT_KEY/GOOGLE_SERVICE_ACCOUNT_JSON. No se publicó nada.');
}

const serviceAccount = JSON.parse(rawServiceAccount);
const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);
const [assignments, overrides, customEvents, publicAssignments, publicOperational] = await Promise.all(
  [
    'asignaciones_entrenadores',
    'calendario_operativo_overrides',
    'calendario_operativo_custom',
    'calendario_asignaciones_publicas',
    'calendario_operativo_publico',
  ].map(async name => {
    const snapshot = await db.collection(name).get();
    return snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
  })
);
const plan = computeCalendarProjectionPlan({
  assignments, overrides, customEvents, publicAssignments, publicOperational,
});
const writes = [
  ...plan.assignmentsToPublish.map(item => ({ ...item, collection: 'calendario_asignaciones_publicas' })),
  ...plan.operationalToPublish.map(item => ({ ...item, collection: 'calendario_operativo_publico' })),
];
for (let offset = 0; offset < writes.length; offset += 450) {
  const batch = db.batch();
  for (const item of writes.slice(offset, offset + 450)) {
    batch.set(db.collection(item.collection).doc(item.id), {
      ...item.payload,
      actualizadoEn: FieldValue.serverTimestamp(),
      publicadoPor: TRAINER_CALENDAR_SYNC_AGENT_ID,
    });
  }
  await batch.commit();
}
console.log(`[${TRAINER_CALENDAR_SYNC_AGENT_NAME}] Proyección publicada: ${plan.assignmentsToPublish.length} asignaciones y ${plan.operationalToPublish.length} ajustes operativos.`);
