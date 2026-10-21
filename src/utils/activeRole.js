export function addConsolidatedRole(assignedRoles) {
  const roles = [...new Set(assignedRoles.filter(Boolean))];
  if (roles.length > 1 && !roles.includes('consolidado')) {
    roles.push('consolidado');
  }
  return roles;
}

export function resolveActiveRole({
  assignedRoles,
  defaultRole,
  isSuperAdmin = false,
  sessionRole,
  persistedRole,
  enforceDefaultRole = false
}) {
  if (enforceDefaultRole) return defaultRole;

  const isAllowed = role => Boolean(role) && (
    isSuperAdmin || assignedRoles.includes(role)
  );

  if (isAllowed(sessionRole)) return sessionRole;
  if (isAllowed(persistedRole)) return persistedRole;
  if (isSuperAdmin) return 'consolidado';
  return assignedRoles[0] || defaultRole;
}
