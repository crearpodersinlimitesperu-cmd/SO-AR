import { hasUsableSede, sameCanonicalSede } from './sedeAliases.js';

export const isInDirectoryScope = (user, scope, ownEmails) => {
  if (scope.global || scope.crossSede === true) return true;
  const emails = [user.email, ...(Array.isArray(user.emails) ? user.emails : [])]
    .filter(Boolean).map(e => String(e).trim().toLowerCase());
  if (emails.some(e => ownEmails.has(e))) return true;
  return hasUsableSede(scope.sede) && sameCanonicalSede(user.sede, scope.sede);
};

export const projectDirectoryUser = (user, scope, ownEmails = new Set()) => {
  if (isInDirectoryScope(user, { ...scope, crossSede: false }, ownEmails)) return user;
  const out = {};
  for (const field of [
    'id', 'name', 'displayName', 'email', 'emails', 'role', 'roles', 'sede',
    'roleSedes', 'status', 'isActive', 'active', 'photoURL'
  ]) {
    if (user[field] !== undefined) out[field] = user[field];
  }
  return out;
};
