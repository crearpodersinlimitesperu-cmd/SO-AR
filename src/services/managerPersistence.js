import { doc } from 'firebase/firestore';

export function managerDocumentRef(db, manager) {
  const id = manager?.docId;
  if (id === undefined || id === null || String(id).trim() === '') {
    throw new Error('Cannot persist a manager without a Firestore document id.');
  }

  return doc(db, 'managers_directory', String(id));
}

export function managerNoteMatches(note, manager, managers) {
  if (note.tipo !== 'individual') return false;
  if (note.managerDocId) return String(note.managerDocId) === manager.docId;
  if (note.managerId === undefined || note.managerId === null) return false;
  const id = String(note.managerId);
  const legacyMatches = managers.filter(row =>
    row._legacyDirectoryId !== null && row._legacyDirectoryId !== undefined &&
    String(row._legacyDirectoryId) === id
  );
  if (legacyMatches.length > 0) return legacyMatches.length === 1 && legacyMatches[0].docId === manager.docId;
  return id === manager.docId;
}
