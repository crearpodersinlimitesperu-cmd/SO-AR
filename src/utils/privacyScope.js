import { canViewAllManagers, canViewSede, canManageUserStatus, canViewInactiveUsers, hasQTPrivileges, isGlobalQTCoordinator } from '../config/permissions.js';
import { canonicalSede } from './sede.js';
import { identityEmails } from './authIdentity.js';
import { isUserInactive } from './userNormalizer.js';
import { matchesExplicitTrainer } from './trainerCoherence.js';
import { findUserByAnyEmail, usersData } from '../data/usersData.js';
import { normalizeTrainer, TRAINER_NAME_ALIASES } from '../data/trainerIdentity.js';

export function legacyTrainerLabels(user) {
  const official = findUserByAnyEmail(user?.email);
  const roles = [user?.role, user?.appRole, ...(user?.roles || [])];
  if (!official?.name || !roles.some(role => ['entrenador', 'entrenador_llamadas'].includes(role))) return [];
  const canonical = normalizeTrainer(official.name);
  const homonyms = usersData.filter(person => normalizeTrainer(person.name) === canonical);
  if (homonyms.length !== 1) return [];
  return [...new Set([official.name, canonical, ...Object.keys(TRAINER_NAME_ALIASES)
    .filter(label => normalizeTrainer(label) === canonical)])];
}

export function isOwnIdentity(viewer, person) {
  if (!viewer || !person) return false;
  if (viewer.uid && (person.uid === viewer.uid || person.id === viewer.uid)) return true;
  const emails = identityEmails(viewer);
  return identityEmails(person).some(email => emails.includes(email));
}

export function sameOperationalSede(viewer, record) {
  const sede = canonicalSede(viewer?.sede);
  return sede !== 'Global' && sede === canonicalSede(record?.sede || record?.userSede);
}

export const canReadPrivateProfile = (viewer, person) => Boolean(viewer && !isUserInactive(viewer) &&
  (isOwnIdentity(viewer, person) || canViewInactiveUsers(viewer)));

export const canReadDirectoryPerson = (viewer, person) => Boolean(viewer && !isUserInactive(viewer) &&
  (isOwnIdentity(viewer, person) || canViewAllManagers(viewer) || canManageUserStatus(viewer) ||
   isGlobalQTCoordinator(viewer) || ((canViewSede(viewer) || hasQTPrivileges(viewer)) && sameOperationalSede(viewer, person))));

export const canReadKpiReport = (viewer, report) => Boolean(viewer && !isUserInactive(viewer) &&
  (canViewAllManagers(viewer) ||
   identityEmails(viewer).some(email => [report.targetUserEmail, report.userEmail, report.submittedByEmail].includes(email)) ||
   ((viewer.isGerente || [viewer.appRole, ...(viewer.roles || [])].includes('gerente')) &&
    sameOperationalSede(viewer, { sede: report.targetUserSede || report.userSede || report.sede }))));

export function canReadManager(viewer, manager) {
  if (!viewer || isUserInactive(viewer)) return false;
  return canViewAllManagers(viewer) || isGlobalQTCoordinator(viewer) ||
    isOwnIdentity(viewer, manager) || matchesExplicitTrainer(manager, viewer) === true ||
    (matchesExplicitTrainer(manager, viewer) === null && legacyTrainerLabels(viewer).includes(manager.entrenador)) ||
    ((canViewSede(viewer) || hasQTPrivileges(viewer)) && sameOperationalSede(viewer, manager));
}

export const sedeQueryValues = user => {
  const sede = canonicalSede(user?.sede);
  const aliases = {
    Quito: ['Quito', 'QUITO', 'quito', 'UIO', 'Quito Ciclo 1', 'Quito Ciclo 2'],
    Lima: ['Lima', 'LIMA', 'lima', 'LIM'],
    Cuenca: ['Cuenca', 'CUENCA', 'cuenca', 'CUE'],
    Guayaquil: ['Guayaquil', 'GUAYAQUIL', 'guayaquil', 'GYE'],
    'Medellín': ['Medellín', 'Medellin', 'MEDELLIN', 'medellin', 'MED'],
    'México': ['México', 'Mexico', 'MEXICO', 'mexico', 'MEX', 'CDMX']
  };
  return aliases[sede] || [];
};
