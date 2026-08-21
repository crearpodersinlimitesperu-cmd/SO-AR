import { DIRECCION_ROLES, GERENCIA_ROLES } from '../config/permissions';

export function hasRole(user, targetRole) {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  
  if (user.isConsolidatedView && user.roles) {
    if (targetRole === 'gerente') {
      return user.roles.some(r => GERENCIA_ROLES.includes(r) || r === 'gerente');
    }
    if (targetRole === 'direccion') {
      return user.roles.some(r => DIRECCION_ROLES.includes(r));
    }
    return user.roles.includes(targetRole);
  }
  
  // Single active role check
  return user.appRole === targetRole || user.activeRole === targetRole;
}
