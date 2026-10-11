import { canonicalSede } from '../utils/sede.js';

// Presentation scope only; Firestore remains the authority for permissions.
export function goalsAccess(user) {
  const role = String(user?.activeRole || user?.appRole || user?.role || '').toLowerCase();
  const roles = (user?.roles || []).map(r => String(r).toLowerCase());
  const managers = ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'director_maestria', 'superadmin', 'consolidado'];
  const viewers = [...managers, 'coord_c1', 'coordinador_c1c2', 'coord_c2', 'coord_maestria', 'coordinador_mj'];
  return {
    canView: Boolean(user?.isSuperAdmin || user?.isDireccion || user?.isGerente ||
      viewers.includes(role) || roles.some(r => viewers.includes(r))),
    canManage: Boolean(user?.isSuperAdmin || user?.isDireccion ||
      managers.includes(user?.appRole) || (user?.roles || []).some(r => managers.includes(r))),
    isGlobal: Boolean(user?.isSuperAdmin || user?.isDireccion ||
      user?.appRole === 'direccion' || user?.appRole === 'consolidado')
  };
}

export function visibleGoalsForUser(goals, user) {
  if (!goalsAccess(user).canView) return [];
  if (goalsAccess(user).isGlobal || !user?.sede) return goals;
  const sede = canonicalSede(user.sede);
  return goals.filter(goal => {
    const goalSede = canonicalSede(goal.sede);
    if (goalSede !== 'Global') return goalSede === sede;
    // Preserve the legacy scope until records have an explicit sede.
    const title = String(goal.title || '').toLowerCase();
    if (['lima', 'e30', 'e31', 'equipo 30', 'equipo 31'].some(s => title.includes(s))) return sede === 'Lima';
    if (title.includes('guayaquil') || title.includes('gye')) return sede === 'Guayaquil';
    if (['quito', 'uio', '119', '118'].some(s => title.includes(s))) return sede === 'Quito';
    if (title.includes('cuenca')) return sede === 'Cuenca';
    return sede === 'Lima';
  });
}
