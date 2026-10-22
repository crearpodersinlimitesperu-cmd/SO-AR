import { createHash } from 'node:crypto';
import { SUPER_ADMIN_EMAILS } from '../src/config/permissions.js';
import {
  hasAmbiguousCycleCompletionScope,
  isTaskClosedForDelivery
} from '../src/utils/taskLifecycle.js';

export const MAX_MAIL_ATTEMPTS = 3;
export const DAILY_TASK_MAIL_ATTEMPTS = 30;
export const DAILY_USER_MAIL_ATTEMPTS = 20;
export const DAILY_TASK_USER_MAIL_ATTEMPTS = 6;
export const MAIL_CLAIM_LEASE_MS = 10 * 60 * 1000;
export const MAIL_RETRY_DELAY_MS = 5 * 60 * 1000;
const STALE_ALERT_TYPES = new Set(['task_overdue_assigner_alert', 'task_completed_alert']);
const STALE_AFTER_MS = 48 * 60 * 60 * 1000;
const OVERDUE_DEBOUNCE_MS = 24 * 60 * 60 * 1000;
const TASK_BOUND_MAIL_TYPES = new Set([
  'task_completed_alert',
  'task_overdue_assigner_alert',
  'task_reminder',
  'task_assignment',
  'task_update',
  'task_collaboration_invite'
]);

export const STALE_REASON = 'Alerta de tarea creada hace mas de 48 horas; descartada sin enviar.';

const timestampMs = value => {
  if (value?.toDate && typeof value.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Date.parse(value);
  return NaN;
};

export function createTaskMailId(taskId, type, recipient, bucket) {
  return `task_${createHash('sha256')
    .update(`${taskId}|${type}|${String(recipient).trim().toLowerCase()}|${bucket}`)
    .digest('hex')}`;
}

export function selectMailAction(data, now = Date.now()) {
  const state = data.delivery?.state;
  const attempts = Number.isInteger(data.delivery?.attemptCount) ? data.delivery.attemptCount : 0;

  if (state === 'SENDING') {
    const leaseExpiresAt = timestampMs(data.delivery?.leaseExpiresAt);
    return Number.isFinite(leaseExpiresAt) && leaseExpiresAt <= now ? 'LEASE_EXPIRED' : null;
  }
  if (attempts >= MAX_MAIL_ATTEMPTS) return null;
  if (state && state !== 'PENDING' && state !== 'ERROR') return null;

  const nextAttemptAt = timestampMs(data.delivery?.nextAttemptAt);
  if (state === 'ERROR' && Number.isFinite(nextAttemptAt) && nextAttemptAt > now) return null;

  const createdAt = timestampMs(data.createdAt);
  if (STALE_ALERT_TYPES.has(data.type) && Number.isFinite(createdAt) && now - createdAt > STALE_AFTER_MS) {
    return 'SKIPPED_STALE';
  }
  return 'SENDING';
}

export async function claimPendingMail(db, ref, now = Date.now()) {
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return null;
    const data = snapshot.data();
    const taskId = data.taskId || data.calendarEvent?.taskId;
    const taskBound = TASK_BOUND_MAIL_TYPES.has(data.type) || Boolean(taskId);
    const action = selectMailAction(data, now);
    if (!action) return null;

    if (action === 'LEASE_EXPIRED') {
      transaction.update(ref, {
        'delivery.state': 'DELIVERY_UNKNOWN',
        'delivery.endTime': new Date(now).toISOString(),
        'delivery.reason': 'La concesion vencio sin confirmacion persistida; requiere conciliacion manual.'
      });
      return { data, state: 'DELIVERY_UNKNOWN' };
    }
    if (action === 'SKIPPED_STALE' && !taskId) {
      transaction.update(ref, {
        'delivery.state': action,
        'delivery.endTime': new Date(now).toISOString(),
        'delivery.reason': STALE_REASON
      });
      return { data, state: action };
    }
    if (taskBound && !taskId) {
      transaction.update(ref, {
        'delivery.state': 'SKIPPED_UNLINKED_TASK',
        'delivery.endTime': new Date(now).toISOString(),
        'delivery.reason': 'El correo de tarea no tiene taskId para verificar su ciclo de vida.'
      });
      return { data, state: 'SKIPPED_UNLINKED_TASK' };
    }

    if (typeof taskId === 'string' && taskId.trim()) {
      const taskRef = db.collection('tasks').doc(taskId);
      const taskSnapshot = await transaction.get(taskRef);
      if (!taskSnapshot.exists) {
        transaction.update(ref, {
          'delivery.state': 'SKIPPED_TASK_MISSING',
          'delivery.endTime': new Date(now).toISOString(),
          'delivery.reason': 'La tarea vinculada ya no existe.'
        });
        return { data, state: 'SKIPPED_TASK_MISSING' };
      }
      const taskData = taskSnapshot.data();
      if (hasAmbiguousCycleCompletionScope(taskData, data)) {
        transaction.update(ref, {
          'delivery.state': 'SKIPPED_SCOPE_UNKNOWN',
          'delivery.endTime': new Date(now).toISOString(),
          'delivery.reason': 'El correo no identifica el ciclo de la tarea y no puede comprobarse su cierre.'
        });
        return { data, state: 'SKIPPED_SCOPE_UNKNOWN' };
      }
      if (isTaskClosedForDelivery(taskData, {
        ...data,
        taskId
      })) {
        transaction.update(ref, {
          'delivery.state': 'SKIPPED_CLOSED',
          'delivery.endTime': new Date(now).toISOString(),
          'delivery.skippedAt': new Date(now).toISOString(),
          'delivery.reason': 'La tarea ya esta cerrada en el alcance asociado.',
          'delivery.taskStateObserved': 'closed'
        });
        return { data, state: 'SKIPPED_CLOSED' };
      }
      if (action === 'SKIPPED_STALE') {
        transaction.update(ref, {
          'delivery.state': action,
          'delivery.endTime': new Date(now).toISOString(),
          'delivery.reason': STALE_REASON
        });
        return { data, state: action };
      }
      if (data.type === 'task_completed_alert') {
        transaction.update(ref, {
          'delivery.state': 'SKIPPED_POLICY',
          'delivery.endTime': new Date(now).toISOString(),
          'delivery.reason': 'Las alertas automaticas de cierre estan deshabilitadas.'
        });
        return { data, state: 'SKIPPED_POLICY' };
      }
    }
    if (action === 'SKIPPED_STALE') {
      transaction.update(ref, {
        'delivery.state': action,
        'delivery.endTime': new Date(now).toISOString(),
        'delivery.reason': STALE_REASON
      });
      return { data, state: action };
    }

    if (taskBound) {
      const recipients = [...new Set([
        ...(Array.isArray(data.to) ? data.to : typeof data.to === 'string' ? [data.to] : []),
        ...(Array.isArray(data.cc) ? data.cc : typeof data.cc === 'string' ? [data.cc] : []),
        ...(Array.isArray(data.bcc) ? data.bcc : typeof data.bcc === 'string' ? [data.bcc] : []),
        ...(data.recipientEmail ? [data.recipientEmail] : [])
      ].map(value => String(value).trim().toLowerCase()).filter(Boolean))];
      const day = new Date(now).toISOString().slice(0, 10);
      const budgets = [
        { kind: 'task', subject: taskId, limit: DAILY_TASK_MAIL_ATTEMPTS },
        ...recipients.flatMap(recipient => [
          { kind: 'user', subject: recipient, limit: DAILY_USER_MAIL_ATTEMPTS },
          { kind: 'task_user', subject: `${taskId}|${recipient}`, limit: DAILY_TASK_USER_MAIL_ATTEMPTS }
        ])
      ].map(budget => {
        const id = createTaskMailId(budget.subject, budget.kind, '', day);
        return { ...budget, id, ref: db.collection('mail_delivery_budgets').doc(id) };
      });
      const snapshots = await Promise.all(budgets.map(budget => transaction.get(budget.ref)));
      const counts = snapshots.map(snapshot => snapshot.exists ? snapshot.data().attemptCount || 0 : 0);
      const exceeded = budgets.findIndex((budget, index) => counts[index] >= budget.limit);
      if (exceeded !== -1) {
        const budget = budgets[exceeded];
        const alreadyAlerted = snapshots[exceeded].data()?.alerted === true;
        if (!alreadyAlerted) {
          for (const adminEmail of SUPER_ADMIN_EMAILS) {
            const alertId = createTaskMailId(budget.id, 'mail_anomaly', adminEmail, day);
            transaction.set(db.collection('notifications').doc(alertId), {
              userId: adminEmail,
              type: 'MAIL_DELIVERY_ANOMALY',
              title: 'Control de correo: limite diario alcanzado',
              message: `Se detuvieron intentos por presupuesto ${budget.kind}. Referencia: ${budget.id}. Revision manual requerida.`,
              read: false,
              created_at: new Date(now).toISOString()
            });
          }
          transaction.set(budget.ref, {
            attemptCount: counts[exceeded], kind: budget.kind, day,
            alerted: true, alertedAt: new Date(now).toISOString()
          });
        }
        transaction.update(ref, {
          'delivery.state': 'SKIPPED_RATE_LIMIT',
          'delivery.endTime': new Date(now).toISOString(),
          'delivery.budgetId': budget.id,
          'delivery.reason': 'Limite diario de intentos alcanzado; alerta interna registrada para administradores.'
        });
        return { data, state: 'SKIPPED_RATE_LIMIT' };
      }
      budgets.forEach((budget, index) => transaction.set(budget.ref, {
        attemptCount: counts[index] + 1, kind: budget.kind, day,
        updatedAt: new Date(now).toISOString()
      }));
    }

    const attempts = Number.isInteger(data.delivery?.attemptCount) ? data.delivery.attemptCount : 0;
    const nextAttempt = attempts + 1;
    transaction.update(ref, {
      'delivery.state': 'SENDING',
      'delivery.attemptCount': nextAttempt,
      'delivery.startTime': new Date(now).toISOString(),
      'delivery.leaseExpiresAt': new Date(now + MAIL_CLAIM_LEASE_MS).toISOString(),
      'delivery.nextAttemptAt': null
    });
    return { data, state: 'SENDING', attemptCount: nextAttempt };
  });
}

export async function skipTaskMailIfClosed(db, ref, data, recipients, now = Date.now()) {
  const taskId = data.taskId || data.calendarEvent?.taskId;
  if (typeof taskId !== 'string' || !taskId.trim()) return false;

  const taskSnapshot = await db.collection('tasks').doc(taskId).get();
  const taskData = taskSnapshot.exists ? taskSnapshot.data() : null;
  const closedFor = recipientEmail => isTaskClosedForDelivery(taskData, {
    completionScope: data.completionScope,
    recipientEmail
  });
  let suppressed = 0;
  let state = !taskSnapshot.exists
    ? 'SKIPPED_TASK_MISSING'
    : hasAmbiguousCycleCompletionScope(taskData, data)
      ? 'SKIPPED_SCOPE_UNKNOWN'
      : null;
  if (!state) {
    const explicit = data.recipientEmail ? String(data.recipientEmail) : undefined;
    if (!recipients.length || (explicit && closedFor(explicit))) {
      state = closedFor(explicit) ? 'SKIPPED_CLOSED' : null;
    } else {
      const open = recipients.filter(recipient => !closedFor(recipient));
      if (!open.length) state = 'SKIPPED_CLOSED';
      else if (open.length < recipients.length) {
        suppressed = recipients.length - open.length;
        // Se filtra en el mismo arreglo que usa el remitente SMTP: los destinatarios cerrados no reciben el envio.
        recipients.splice(0, recipients.length, ...open);
      }
    }
  }
  if (!state && suppressed) {
    await ref.update({ 'delivery.suppressedClosedRecipients': suppressed });
  }
  if (!state) return false;

  await ref.update({
    'delivery.state': state,
    'delivery.endTime': new Date(now).toISOString(),
    ...(state === 'SKIPPED_CLOSED' ? {
      'delivery.skippedAt': new Date(now).toISOString(),
      'delivery.reason': 'La tarea se cerro antes de la entrega SMTP.',
      'delivery.taskStateObserved': 'closed'
    } : state === 'SKIPPED_SCOPE_UNKNOWN' ? {
      'delivery.reason': 'El correo no identifica el ciclo de la tarea y no puede comprobarse su cierre.'
    } : {
      'delivery.reason': 'La tarea vinculada ya no existe.'
    })
  });
  return state;
}

export async function recordMailFailure(db, ref, error, now = Date.now()) {
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return false;
    const delivery = snapshot.data().delivery || {};
    if (delivery.state !== 'SENDING') return false;
    const attempts = Number.isInteger(delivery.attemptCount) ? delivery.attemptCount : 0;
    const exhausted = attempts >= MAX_MAIL_ATTEMPTS;
    const rawCode = typeof error?.code === 'string' ? error.code : '';
    const errorCode = /^[A-Z0-9_-]{1,64}$/i.test(rawCode) ? rawCode : 'TRANSPORT_ERROR';
    transaction.update(ref, {
      'delivery.state': 'ERROR',
      'delivery.errorCode': errorCode,
      'delivery.endTime': new Date(now).toISOString(),
      'delivery.leaseExpiresAt': null,
      ...(exhausted
        ? { 'delivery.exhaustedAt': new Date(now).toISOString(), 'delivery.nextAttemptAt': null }
        : { 'delivery.nextAttemptAt': new Date(now + MAIL_RETRY_DELAY_MS * (2 ** (attempts - 1))).toISOString() })
    });
    return { attempts, exhausted, errorCode };
  });
}

export async function recordMailUnknown(db, ref, error, now = Date.now()) {
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return false;
    if (snapshot.data().delivery?.state !== 'SENDING') return false;
    const rawCode = typeof error?.code === 'string' ? error.code : '';
    const errorCode = /^[A-Z0-9_-]{1,64}$/i.test(rawCode) ? rawCode : 'SMTP_RESULT_UNKNOWN';
    transaction.update(ref, {
      'delivery.state': 'DELIVERY_UNKNOWN',
      'delivery.errorCode': errorCode,
      'delivery.endTime': new Date(now).toISOString(),
      'delivery.leaseExpiresAt': null,
      'delivery.reason': 'No se pudo confirmar si el proveedor acepto el correo; requiere conciliacion manual.'
    });
    return true;
  });
}

export async function recordMailSuccess(db, ref, now = Date.now()) {
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists || snapshot.data().delivery?.state !== 'SENDING') return false;
    transaction.update(ref, {
      'delivery.state': 'SUCCESS',
      'delivery.endTime': new Date(now).toISOString(),
      'delivery.leaseExpiresAt': null,
      'delivery.nextAttemptAt': null
    });
    return true;
  });
}

export async function enqueueOverdueTaskMails(db, taskRef, entries, now, serverTimestamp) {
  if (!entries.length) return { queued: 0, reason: 'no_recipients' };
  return db.runTransaction(async transaction => {
    const taskSnapshot = await transaction.get(taskRef);
    if (!taskSnapshot.exists) return { queued: 0, reason: 'task_missing' };
    const task = taskSnapshot.data();
    const scopedEntries = entries.filter(entry => !hasAmbiguousCycleCompletionScope(task, entry.data));
    if (!scopedEntries.length) return { queued: 0, reason: 'scope_unknown' };
    const openEntries = scopedEntries.filter(entry =>
      !isTaskClosedForDelivery(task, {
        completionScope: entry.data.completionScope,
        recipientEmail: entry.data.recipientEmail
      })
    );
    if (!openEntries.length) return { queued: 0, reason: 'closed' };

    const deadline = timestampMs(task.deadline);
    if (!Number.isFinite(deadline) || deadline >= now || now - deadline < OVERDUE_DEBOUNCE_MS) {
      return { queued: 0, reason: 'not_due' };
    }
    const lastReminderAt = timestampMs(task.lastReminderAt);
    if (Number.isFinite(lastReminderAt) && now - lastReminderAt < OVERDUE_DEBOUNCE_MS) {
      return { queued: 0, reason: 'debounced' };
    }

    const refs = openEntries.map(entry => db.collection('mail').doc(entry.id));
    const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)));
    const missing = openEntries
      .map((entry, index) => ({ entry, ref: refs[index], snapshot: snapshots[index] }))
      .filter(item => !item.snapshot.exists);
    if (!missing.length) return { queued: 0, reason: 'deduplicated' };

    missing.forEach(({ entry, ref }) => transaction.set(ref, entry.data));
    transaction.update(taskRef, { lastReminderAt: serverTimestamp });
    return { queued: missing.length, reason: 'queued' };
  });
}
