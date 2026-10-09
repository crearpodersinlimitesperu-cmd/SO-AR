// Fixed notification policy, mirrored by functions/directoryScope.js.
export const RECIPIENT_ROLES = [
  'direccion', 'cfo', 'cco', 'ceo', 'director_maestria', 'talento_humano',
  'gerente', 'coord_c1', 'coord_maestria', 'coordinador_mj', 'coordinador',
  'capitan', 'manager', 'qt', 'finanzas', 'admin', 'superadmin', 'entrenador',
  'entrenador_llamadas', 'observador', 'colaborador', 'legal',
  'asistente_impuestos_quito', 'tecnico_sst', 'student', 'participante', 'marketing'
];

export function validateRecipientRoles(input) {
  if (!Array.isArray(input) || input.length === 0 || input.length > 20 ||
      input.some(role => typeof role !== 'string')) {
    throw new Error('Selecciona entre 1 y 20 roles destinatarios.');
  }
  const roles = [...new Set(input.map(role =>
    role.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
      .replace(/^super_admin$/, 'superadmin')))];
  const unsupported = roles.filter(role => !RECIPIENT_ROLES.includes(role));
  if (unsupported.length) throw new Error(`Roles destinatarios no soportados: ${unsupported.join(', ')}`);
  return roles;
}
