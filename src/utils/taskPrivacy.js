import { checklistData } from '../data/checklistData.js';

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizeTaskRole = (value) => String(value || '').trim().toLowerCase();
const catalogRoleById = new Map(checklistData.map(task => [task.id, normalizeTaskRole(task.role)]));
const catalogRoles = new Set(catalogRoleById.values());

const emailAliases = (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];
  return [...new Set([
    normalized,
    normalized.replace('@crearpsl.com', '@crearpsl.net'),
    normalized.replace('@crearpsl.net', '@crearpsl.com')
  ])];
};

export const getChecklistRolesForUser = (user) => {
  const roles = [
    ...(Array.isArray(user?.roles) ? user.roles : []),
    user?.appRole,
    user?.role
  ].map(normalizeTaskRole).filter(Boolean);

  return [...new Set(roles)].filter(role => catalogRoles.has(role));
};

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
  const taskRole = normalizeTaskRole(task.role);
  const hasRole = Boolean(taskRole && roles.includes(taskRole));

  const isPersonallyRelated = Boolean(
    hasEmailIn(task.assignedToEmail, userEmails) ||
    hasEmailIn(task.assignedToEmails, userEmails) ||
    hasEmailIn(task.assigned_to, userEmails) ||
    hasEmailIn(task.assignedByEmail, userEmails) ||
    hasEmailIn([task.createdBy, task.createdByEmail, task.created_by], userEmails) ||
    (task.ownerId && task.ownerId === user.uid)
  );

  const hasPersonalMetadata = Boolean(
    task.isCustom ||
    (typeof task.id === 'string' && task.id.startsWith('custom_')) ||
    task.assignedToEmail ||
    (Array.isArray(task.assignedToEmails) && task.assignedToEmails.length > 0) ||
    task.assignedByEmail ||
    task.assigned_to ||
    task.ownerId ||
    task.createdBy ||
    task.createdByEmail ||
    task.created_by ||
    task.collaborators
  );

  if (hasPersonalMetadata) return isPersonallyRelated;
  if (task.isValidation === true) return hasRole;

  const isCatalogTask = catalogRoleById.get(task.id) === taskRole;
  return isCatalogTask && hasRole;
};

export const filterTasksForUser = (tasks, user) =>
  (Array.isArray(tasks) ? tasks : []).filter(task => isTaskVisibleForUser(task, user));

export const hasSimulatedTaskIdentityMismatch = (user, authenticatedEmail) =>
  Boolean(user?.isSimulated && (
    !authenticatedEmail ||
    !emailAliases(user.email).includes(normalizeEmail(authenticatedEmail))
  ));
