import { canonicalSede } from './sede.js';

export function visibleMJCalendars(calendars, currentUser) {
  if (!currentUser) return [];
  const userEmail = String(currentUser.email || '').toLowerCase().trim();
  const userRoles = [
    currentUser.appRole,
    currentUser.role,
    currentUser.activeRoleOverride,
    ...(Array.isArray(currentUser.roles) ? currentUser.roles : [])
  ].filter(Boolean);
  const isGlobalRole = currentUser.isSuperAdmin ||
    userRoles.some(r => ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'consolidado', 'director_maestria', 'coord_maestria', 'coordinador_mj'].includes(r)) ||
    ['daniela.monroy@crearpsl.net', 'daniela.monroy@crearpsl.com', 'jose.sanchez@crearpsl.net', 'jose.sanchez@crearpsl.com'].includes(userEmail);

  if (isGlobalRole) {
    return calendars;
  }
  if (!String(currentUser.sede || '').trim()) return [];
  const sede = canonicalSede(currentUser.sede).toLowerCase();
  return calendars.filter(calendar => String(calendar.sede || '').trim() &&
    canonicalSede(calendar.sede).toLowerCase() === sede);
}
