const STALE_ALERT_TYPES = new Set(['task_overdue_assigner_alert', 'task_completed_alert']);
const STALE_AFTER_MS = 48 * 60 * 60 * 1000;

export const STALE_REASON = 'Alerta de tarea creada hace mas de 48 horas; descartada sin enviar.';

export function selectMailAction(data, now = Date.now()) {
  const state = data.delivery?.state;
  if (state && state !== 'PENDING') return null;

  const createdAt = data.createdAt?.toDate
    ? data.createdAt.toDate().getTime()
    : typeof data.createdAt === 'string' ? Date.parse(data.createdAt) : NaN;
  if (STALE_ALERT_TYPES.has(data.type) && now - createdAt > STALE_AFTER_MS) {
    return 'SKIPPED_STALE';
  }
  return 'SENDING';
}

export async function claimPendingMail(db, ref, now = Date.now()) {
  // Re-read inside the transaction: overlapping runners may share an old snapshot.
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return null;
    const data = snapshot.data();
    const state = selectMailAction(data, now);
    if (!state) return null;
    transaction.update(ref, state === 'SKIPPED_STALE' ? {
      'delivery.state': state,
      'delivery.endTime': new Date(now).toISOString(),
      'delivery.reason': STALE_REASON
    } : {
      'delivery.state': state,
      'delivery.startTime': new Date(now).toISOString()
    });
    return { data, state };
  });
}
