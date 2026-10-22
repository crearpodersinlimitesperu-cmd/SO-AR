export const participantCollectionPath = taskId => `tasks/${taskId}/participant_states`;

export const normalizeParticipantEmail = value => String(value || '').trim().toLowerCase()
  .replace('@crearpls.com', '@crearpsl.net').replace('@crearpsl.com', '@crearpsl.net');

export function participantKeys(task, extraKeys = []) {
  const keys = Object.keys(task?.assigneeProgress || {});
  const candidates = [
    ...(task?.assignedToEmails || []), task?.assignedToEmail, task?.assigned_to,
    ...(task?.collaborators || []), ...extraKeys
  ];
  for (const key of candidates) {
    if (typeof key !== 'string' || !key.trim()) continue;
    if (!keys.some(existing => normalizeParticipantEmail(existing) === normalizeParticipantEmail(key))) keys.push(key);
  }
  if (keys.some(key => key.includes('/'))) throw new Error('La identidad de un participante no es una clave de documento válida.');
  return keys;
}

export function mergeParticipantStates(task, states) {
  if (Object.values(states).some(state => !state || typeof state !== 'object' || Array.isArray(state))) {
    throw new Error('El avance canónico de un participante no es válido; no puede interpretarse como pendiente.');
  }
  return { ...task, assigneeProgress: { ...(task?.assigneeProgress || {}), ...states } };
}

export function applyParticipantChanges(task, changes) {
  const previous = task?.assigneeProgress || {};
  const normalized = Object.fromEntries(Object.entries(changes).map(([key, state]) => [
    Object.keys(previous).find(existing => normalizeParticipantEmail(existing) === normalizeParticipantEmail(key)) || key,
    state
  ]));
  return mergeParticipantStates(task, normalized).assigneeProgress;
}

export async function readParticipantStates(task, readState, extraKeys = []) {
  const entries = await Promise.all(participantKeys(task, extraKeys).map(async key => {
    const snapshot = await readState(key);
    const exists = typeof snapshot.exists === 'function' ? snapshot.exists() : snapshot.exists;
    return [key, { exists, state: exists ? snapshot.data().state : task?.assigneeProgress?.[key] || {} }];
  }));
  const records = new Map(entries);
  return {
    task: mergeParticipantStates(task, Object.fromEntries(entries.map(([key, record]) => [key, record.state]))),
    records
  };
}
