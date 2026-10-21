import { isGlobalObserver } from '../config/permissions.js';

// Shared by RoleRoute and local recommendations; recommendations never grant access.
export function canEnterRoleRoute(user, {
  allowedRoles = [], allowedEmails = [], requireSuperAdmin = false,
  excludeDireccionBypass = false
} = {}) {
  if (!user || user.isParticipantOnly) return false;
  if (user.isSuperAdmin && !user.isSimulated) return true;
  if (requireSuperAdmin) return Boolean(user.isSuperAdmin);
  if (!allowedRoles.length) return true;
  return Boolean(
    (user.appRole !== 'consolidado' && allowedRoles.includes(user.appRole)) ||
    user.isSuperAdmin || isGlobalObserver(user) ||
    (!excludeDireccionBypass && user.isDireccion) ||
    (user.roles || []).some(role => allowedRoles.includes(role)) ||
    allowedEmails.includes((user.email || '').trim().toLowerCase())
  );
}
