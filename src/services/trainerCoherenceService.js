import { collection, doc, getDocs, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { auditTrainerCoherence, flattenSessionAssignments, isCoherenceAdmin } from '../utils/trainerCoherence';
import { getAllEquipos } from './cmjDataService';

const readCollection = async name => (await getDocs(collection(db, name))).docs.map(snapshot => ({
  ...snapshot.data(), docId: snapshot.id,
}));

export async function loadTrainerCoherence(currentUser) {
  if (!isCoherenceAdmin(currentUser)) throw new Error('Acceso restringido a administración.');
  const canReadSessions = ['jose.sanchez@crearpsl.net', 'paul.sosa@crearpsl.net'].includes(currentUser.email.toLowerCase());
  const [managers, users, trainerDetails, assignments] = await Promise.all([
    readCollection('managers_directory'), readCollection('users'),
    readCollection('kpis_entrenadores_llamadas'), canReadSessions ? readCollection('asignaciones_entrenadores') : Promise.resolve([]),
  ]);
  const calls = trainerDetails.filter(row => row.docId !== '_resumen').flatMap(row => row.managersList || []);
  return { ...auditTrainerCoherence({ managers, users, calls, cmj: getAllEquipos(), sessions: flattenSessionAssignments(assignments) }),
    sessionsAvailable: canReadSessions };
}

export async function repairTrainerLabel(currentUser, repair) {
  if (!isCoherenceAdmin(currentUser)) throw new Error('Acceso restringido a administración.');
  const managerRef = doc(db, 'managers_directory', repair.managerDocId);
  const trainerRef = doc(db, 'users', repair.trainerDocId);
  const auditRef = doc(collection(db, 'trainer_coherence_log'));
  await runTransaction(db, async transaction => {
    const [managerSnap, trainerSnap] = await Promise.all([transaction.get(managerRef), transaction.get(trainerRef)]);
    if (!managerSnap.exists() || !trainerSnap.exists()) throw new Error('El registro ya no existe. Actualiza el diagnóstico.');
    const result = auditTrainerCoherence({
      managers: [{ ...managerSnap.data(), docId: managerSnap.id }],
      users: [{ ...trainerSnap.data(), docId: trainerSnap.id }],
    });
    const currentRepair = result.findings.find(finding => finding.repair)?.repair;
    if (!currentRepair || JSON.stringify(currentRepair) !== JSON.stringify(repair)) {
      throw new Error('La asignación cambió o dejó de ser inequívoca. Actualiza el diagnóstico.');
    }
    transaction.update(managerRef, { entrenador: repair.after });
    transaction.set(auditRef, {
      action: 'repair_trainer_label', managerDocId: managerRef.id, trainerDocId: trainerRef.id,
      before: repair.before, after: repair.after, actorEmail: currentUser.email.toLowerCase(),
      occurredAt: serverTimestamp(),
    });
  });
}
