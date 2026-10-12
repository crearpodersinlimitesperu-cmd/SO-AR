const SOURCE_ROLE = {
  role: 'nodus_coordinacion_c1c2',
  tabCategory: 'c1',
  roleName: 'Coordinación C1/C2 según el origen Nodus',
};

export function operationalRole(role) {
  const normalizedRole = (role || '').toLowerCase();
  if (normalizedRole.includes('maestria') || normalizedRole.includes('mj') || normalizedRole.includes('director_maestria')) {
    return { tabCategory: 'mj', roleName: 'Coordinador Maestría del Juego (CMJ)' };
  }
  if (normalizedRole.includes('capitan')) return { tabCategory: 'capitan', roleName: 'Capitán de Sede' };
  if (normalizedRole.includes('qt')) return { tabCategory: 'qt', roleName: 'Quantum Team (QT)' };
  if (normalizedRole.includes('gerente') || normalizedRole.includes('direccion') || normalizedRole.includes('ceo') || normalizedRole.includes('cfo')) {
    return { tabCategory: 'gerencia', roleName: 'Gerencia de Sede' };
  }
  if (normalizedRole === 'coord_c1' || normalizedRole === 'coord_c2') {
    return { tabCategory: 'c1', roleName: 'Coordinador C1 / C2' };
  }
  return null;
}

export function resolveCoordinatorKpiAssignment(coordinator, staffDirectory) {
  const email = String(coordinator?.email || '').trim().toLowerCase();
  if (!email) return SOURCE_ROLE;
  const assignments = staffDirectory.filter(person =>
    String(person?.email || '').trim().toLowerCase() === email
  );
  if (assignments.length !== 1) return SOURCE_ROLE;
  const assignment = assignments[0];
  const mappedRole = operationalRole(assignment.role);
  return {
    role: assignment.role,
    tabCategory: mappedRole?.tabCategory || SOURCE_ROLE.tabCategory,
    roleName: mappedRole?.roleName || SOURCE_ROLE.roleName,
  };
}
