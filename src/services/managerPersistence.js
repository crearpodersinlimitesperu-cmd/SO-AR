import { doc } from 'firebase/firestore';

export function managerDocumentRef(db, manager) {
  const id = manager?.docId || manager?.id;
  if (id === undefined || id === null || String(id).trim() === '') {
    throw new Error('Cannot persist a manager without a Firestore document id.');
  }
  return doc(db, 'managers_directory', String(id));
}
