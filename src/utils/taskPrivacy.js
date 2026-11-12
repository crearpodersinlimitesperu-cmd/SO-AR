import { checklistData } from '../data/checklistData.js';

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizeTaskRole = (value) => String(value || '').trim().toLowerCase();
const catalogRoleById = new Map(checklistData.map(task => [task.id, normalizeTaskRole(task.role)]));
const catalogRoles = new Set(catalogRoleById.values());

const MULTI_EMAIL_GROUPS = [
  ['milacampuzano21@gmail.com', 'emily.campuzano@crearpsl.net', 'emily.campuzano@crearpsl.com', 'emily.campuzano@crearpls.com'],
  ['ricardogavilanez1021@gmail.com', 'ricardo.gavilanez@crearpsl.net', 'ricardo.gavilanez@crearpsl.com', 'ricardo.gavilanez@crearpls.com'],
  ['brunische66@gmail.com', 'carlos.brunis@crearpsl.net', 'carlos.brunis@crearpsl.com', 'leandro.brunis@crearpsl.net', 'leandro.brunis@crearpsl.com', 'leandro.brunis@crearpls.com'],
  ['gomeznueve@gmail.com', 'andres.gomez@crearpsl.net', 'andres.gomez@crearpsl.com'],
  ['jorgeramirezmorejon@gmail.com', 'jorge.ramirez@crearpsl.net', 'jorge.ramirez@crearpsl.com'],
  ['cardenasgina29@gmail.com', 'cardenaslopezgina@gmail.com', 'gina.cardenas@crearpsl.net', 'gina.cardenas@crearpsl.com'],
  ['santiago.proao527@gmail.com', 'sso@crearpsl.net', 'sso@crearpsl.com'],
  ['maboadar@gmail.com', 'direccion@bmbgbrokers.com']
];

const emailAliases = (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];
  const matchedGroup = MULTI_EMAIL_GROUPS.find(group => group.includes(normalized)) || [];
  return [...new Set([
    normalized,
    normalized.replace('@crearpls.com', '@crearpsl.net'),
    normalized.replace('@crearpsl.com', '@crearpsl.net'),
    normalized.replace('@crearpsl.net', '@crearpsl.com'),
    ...matchedGroup
  ])];
};

const normalizeChecklistRoleAlias = (value) => {
  const r = normalizeTaskRole(value);
  if (!r) return '';
  if (r === 'coordinador_c1c2' || r === 'coordinador_c1' || r === 'coord_c1_c2' || r === 'coord_jr') return 'coord_c1';
  if (r === 'coordinador_mj' || r === 'coordinador_maestria') return 'coord_maestria';
  if (r === 'quantum_team' || r === 'coord_qt' || r === 'coordinador_qt') return 'qt';
  if (r === 'coach') return 'entrenador';
  return r;
};

export const getChecklistRolesForUser = (user) => {
  const roles = [
    ...(Array.isArray(user?.roles) ? user.roles : []),
    user?.appRole,
    user?.role
  ].map(normalizeChecklistRoleAlias).filter(Boolean);

  return [...new Set(roles)].filter(role => catalogRoles.has(role));
};

const hasNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const hasEmailIn = (values, emails) => {
  const entries = Array.isArray(values) ? values : (values ? [values] : []);
  return entries.some(value => {
    const email = typeof value === 'string' ? value : value?.email;
    return emailAliases(email).some(alias => emails.has(alias));
  });
};

export const isTaskVisibleForUser = (task, user) => {
  if (!task || !user) return false;

  const userEmails = new Set(emailAliases(user.email));
  const roles = getChecklistRolesForUser(user);
  const taskRole = normalizeChecklistRoleAlias(task.role);
  const hasRole = Boolean(taskRole && roles.includes(taskRole));

  const isPersonallyRelated = Boolean(
    hasEmailIn(task.assignedToEmail, userEmails) ||
    hasEmailIn(task.assignedToEmails, userEmails) ||
    hasEmailIn(task.assigned_to, userEmails) ||
    hasEmailIn(task.assignedByEmail, userEmails) ||
    hasEmailIn([task.createdBy, task.createdByEmail, task.created_by], userEmails) ||
    (hasNonEmptyString(task.ownerId) && task.ownerId === user.uid)
  );

  const hasPersonalMetadata = Boolean(
    task.isCustom === true ||
    (typeof task.id === 'string' && task.id.startsWith('custom_')) ||
    hasNonEmptyString(task.assignedToEmail) ||
    (Array.isArray(task.assignedToEmails) && task.assignedToEmails.some(hasNonEmptyString)) ||
    hasNonEmptyString(task.assignedByEmail) ||
    hasNonEmptyString(task.assigned_to) ||
    hasNonEmptyString(task.ownerId) ||
    hasNonEmptyString(task.createdBy) ||
    hasNonEmptyString(task.createdByEmail) ||
    hasNonEmptyString(task.created_by)
  );

  if (hasPersonalMetadata) return isPersonallyRelated;
  if (task.isValidation === true) return hasRole;

  const isCatalogTask = catalogRoleById.get(task.id) === taskRole;
  const isInvitedCollaborator = Array.isArray(task.collaborators) &&
    task.collaborators.length > 0 &&
    hasEmailIn(task.collaborators, userEmails);
  return isCatalogTask && (hasRole || isInvitedCollaborator);
};

export const filterTasksForUser = (tasks, user) =>
  (Array.isArray(tasks) ? tasks : []).filter(task => isTaskVisibleForUser(task, user));

export const hasSimulatedTaskIdentityMismatch = (user, authenticatedEmail) =>
  Boolean(user?.isSimulated && (
    !authenticatedEmail ||
    !emailAliases(user.email).includes(normalizeEmail(authenticatedEmail))
  ));

export const getTaskReadIdentity = (user) =>
  JSON.stringify([user?.uid || '', normalizeEmail(user?.email), Boolean(user?.isSimulated)]);

export const canCreateTaskAsUser = (user, authenticatedEmail) =>
  Boolean(user?.email && authenticatedEmail && !user.isSimulated &&
    emailAliases(user.email).includes(normalizeEmail(authenticatedEmail)));
