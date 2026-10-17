import { canonicalSede } from './sede.js';

export function visibleMJCalendars(calendars, currentUser) {
  if (!currentUser) return [];
  if (currentUser.isSuperAdmin || ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'consolidado', 'director_maestria'].includes(currentUser.appRole)) {
    return calendars;
  }
  if (!String(currentUser.sede || '').trim()) return [];
  const sede = canonicalSede(currentUser.sede).toLowerCase();
  return calendars.filter(calendar => String(calendar.sede || '').trim() &&
    canonicalSede(calendar.sede).toLowerCase() === sede);
}
