import { canonicalSede } from './sede';

// Decide si un usuario autenticado puede editar la ficha institucional de una sede.
// Debe coincidir con canEditSedeInstitucional() en firestore.rules.
export function canEditSedeDatos(user, sedeNombre) {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  const roles = [user.role, user.appRole, ...(Array.isArray(user.roles) ? user.roles : [])];
  if (!roles.includes('gerente')) return false;
  const target = canonicalSede(sedeNombre);
  if (!target || target === 'Global') return false;
  const sedes = [user.sede, user.roleSedes?.gerente].filter(Boolean).map(canonicalSede);
  return sedes.includes(target);
}
