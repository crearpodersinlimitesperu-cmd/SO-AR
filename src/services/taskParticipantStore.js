import { doc, getDoc } from 'firebase/firestore';
import { participantCollectionPath, readParticipantStates } from '../utils/taskParticipants.js';

export const participantStateRef = (db, taskId, key) => doc(db, participantCollectionPath(taskId), key);

export function readTaskParticipants(transaction, db, taskId, task, extraKeys = []) {
  return readParticipantStates(task, key => transaction.get(participantStateRef(db, taskId, key)), extraKeys);
}

export async function loadTaskParticipants(db, taskId, task) {
  return (await readTaskParticipants({ get: getDoc }, db, taskId, task)).task;
}

export function stageTaskParticipants(transaction, db, taskId, previous, nextMap, eventIds) {
  for (const [key, record] of previous.records) {
    const state = nextMap[key] || record.state;
    if (record.exists && JSON.stringify(state) === JSON.stringify(record.state)) continue;
    transaction.set(participantStateRef(db, taskId, key), {
      taskId, assigneeEmail: key, state,
      lifecycleMutation: { eventId: eventIds[key] || '' }
    });
  }
}
