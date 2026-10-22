import { participantCollectionPath, readParticipantStates } from '../src/utils/taskParticipants.js';

export async function canonicalTaskSnapshot(db, taskId, snapshot, transaction, recipients = []) {
  if (!snapshot.exists) return snapshot;
  const { task } = await readParticipantStates(snapshot.data(), key => {
    const ref = db.collection(participantCollectionPath(taskId)).doc(key);
    return transaction ? transaction.get(ref) : ref.get();
  }, recipients);
  return { exists: true, data: () => task };
}
