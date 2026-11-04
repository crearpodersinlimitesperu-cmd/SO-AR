import { collection, or, query, where } from 'firebase/firestore';
import { canManageUserStatus, canViewAllManagers, canViewSede, hasQTPrivileges, isGlobalQTCoordinator } from '../config/permissions.js';
import { identityEmails } from '../utils/authIdentity.js';
import { sedeQueryValues, legacyTrainerLabels } from '../utils/privacyScope.js';

export function privateDirectoryQuery(db, path, user, { manager = false } = {}) {
  if (!user?.email) throw new Error('No se puede consultar el directorio sin identidad verificada.');
  const ref = collection(db, path);
  if (canViewAllManagers(user) || isGlobalQTCoordinator(user) || (!manager && canManageUserStatus(user))) return ref;
  const constraints = [];
  const sedes = sedeQueryValues(user);
  if ((canViewSede(user) || hasQTPrivileges(user)) && sedes.length) {
    constraints.push(where('sede', 'in', sedes));
  }
  const emails = identityEmails(user);
  constraints.push(where('email', 'in', emails));
  if (!manager) constraints.push(where('emails', 'array-contains-any', emails));
  if (manager) {
    constraints.push(where('entrenadorEmail', 'in', emails));
    if (user.uid) constraints.push(where('entrenadorId', '==', user.uid));
    if (user.dbId && user.dbId !== user.uid) constraints.push(where('entrenadorId', '==', user.dbId));
    const labels = legacyTrainerLabels(user);
    if (labels.length) constraints.push(where('entrenador', 'in', labels));
  }
  return query(ref, or(...constraints));
}

export function privateKpiQuery(db, user) {
  if (!user?.email) throw new Error('No se puede consultar KPIs sin identidad verificada.');
  const ref = collection(db, 'kpi_reports');
  if (canViewAllManagers(user)) return ref;
  const emails = identityEmails(user);
  const constraints = [
    where('targetUserEmail', 'in', emails),
    where('userEmail', 'in', emails),
    where('submittedByEmail', 'in', emails)
  ];
  const sedes = sedeQueryValues(user);
  if ((user.isGerente || [user.appRole, ...(user.roles || [])].includes('gerente')) && sedes.length) {
    constraints.push(where('userSede', 'in', sedes));
  }
  return query(ref, or(...constraints));
}
