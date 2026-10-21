import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { computeCalendarProjectionPlan, TRAINER_CALENDAR_SYNC_AGENT_ID } from './trainerCalendarProjection.js';

export * from './trainerCalendarProjection.js';

export async function syncTrainerCalendarProjections(dbInstance, state) {
  const plan = computeCalendarProjectionPlan(state);
  const writes = [
    ...plan.assignmentsToPublish.map(item => ({ ...item, collection: 'calendario_asignaciones_publicas' })),
    ...plan.operationalToPublish.map(item => ({ ...item, collection: 'calendario_operativo_publico' })),
  ];
  for (let offset = 0; offset < writes.length; offset += 450) {
    const batch = writeBatch(dbInstance);
    for (const item of writes.slice(offset, offset + 450)) {
      batch.set(doc(dbInstance, item.collection, item.id), {
        ...item.payload,
        publicadoPor: TRAINER_CALENDAR_SYNC_AGENT_ID,
        actualizadoEn: serverTimestamp(),
      });
    }
    await batch.commit();
  }
  return {
    ...plan,
    inSync: true,
    repairedAssignments: plan.assignmentsToPublish.length,
    repairedOperational: plan.operationalToPublish.length,
    syncedAt: new Date().toISOString(),
  };
}
