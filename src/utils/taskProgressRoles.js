export const getTaskProgressRoles = (activeRole, userRoles = []) => {
  if (activeRole !== 'consolidado') return [activeRole];
  if (!Array.isArray(userRoles)) return [];
  return userRoles.filter(role => role !== 'consolidado');
};
