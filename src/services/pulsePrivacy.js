// Provisional incident policy: individual answers are not a managerial feed.
export const NON_PULSE_REPORT_TYPES = [
  'Llamadas', 'FDS', 'C2', 'MJ', 'QT_Contexto', 'ReporteRelampagoFDS', 'ReporteSentadosSala'
];

export function canReadIndividualPulse(user) {
  if (!user || isUserInactive(user) || user.isSimulated || user.isRoleSimulationActive) return false;
  const roles = [user?.role, user?.appRole, ...(Array.isArray(user?.roles) ? user.roles : [])]
    .map(role => String(role || '').toLowerCase());
  return Boolean(user?.isSuperAdmin || roles.some(role =>
    ['superadmin', 'direccion', 'cfo', 'cco', 'ceo', 'director_maestria', 'socio'].includes(role)));
}
import { isUserInactive } from '../utils/userNormalizer.js';
