import { CALL_METRICS, REPORT_SEDES, validCallCounts } from '../../src/services/nodusReportModel.js';
import { filterNodusSedes } from './nodusJsonModel.js';

export function privateMetricAuthority(scope) {
  const sedes = scope.type === 'global' ? REPORT_SEDES : scope.type === 'sede'
    ? filterNodusSedes(REPORT_SEDES.map(nombre => ({ nombre })), scope).map(sede => sede.nombre) : [];
  return { type: scope.type, sedes };
}

export function privateReportAccess(profile, scope) {
  if (scope.type === 'global') return { sedes: REPORT_SEDES, stages: ['C1', 'C2'] };
  if (scope.type !== 'sede') return null;
  const roles = [profile.role, profile.appRole, profile.rol, ...(Array.isArray(profile.roles) ? profile.roles : [])]
    .filter(role => typeof role === 'string').map(role => role.trim().toLowerCase());
  const stages = ['C1', 'C2'].filter(stage => roles.some(role =>
    ['gerente', 'coordinador', 'coordinador_c1c2', 'coord_c1c2', `coord_${stage.toLowerCase()}`,
      `coordinador_${stage.toLowerCase()}`].includes(role)));
  const sedes = filterNodusSedes(REPORT_SEDES.map(nombre => ({ nombre })), scope).map(sede => sede.nombre);
  return stages.length && sedes.length ? { sedes, stages } : null;
}

export function projectPrivateReportSource(source, sede, stage) {
  if (!source || source.sede !== sede || source.stage !== stage ||
      typeof source.sourceUpdatedAt !== 'string' || !Array.isArray(source.teams)) {
    throw new TypeError('El reporte publicado no acredita su sede, etapa o fecha.');
  }
  const teams = source.teams.map(team => {
    if (!team || team.sede !== sede || team.stage !== stage || typeof team.team !== 'string' || !/^[1-9]\d*$/.test(team.team) ||
        !['missing', 'unclassified', 'ready'].includes(team.status) ||
        !Number.isSafeInteger(team.rows) || team.rows < 0 ||
        !Number.isSafeInteger(team.unknown) || team.unknown < 0) {
      throw new TypeError('El reporte contiene un equipo o conteo no verificable.');
    }
    let counts = null;
    if (team.status === 'ready') {
      if (!validCallCounts(team.counts) || team.unknown !== 0) {
        throw new TypeError('El reporte completo no contiene conteos verificables.');
      }
      counts = Object.fromEntries(['nuevos', 'rezagados'].flatMap(group => CALL_METRICS
        .map(metric => [`${group}_${metric}`, team.counts[`${group}_${metric}`]])));
      if (Object.values(counts).some(count => !Number.isSafeInteger(count)) ||
          Object.values(counts).reduce((total, count) => total + count, 0) !== team.rows) {
        throw new TypeError('El total de filas no coincide con los estados del reporte.');
      }
    }
    return { sede, stage, team: team.team, status: team.status, rows: team.rows, unknown: team.unknown, counts };
  });
  return { sede, stage, source: 'nodus_coordinadores_c1c2/latest', sourceUpdatedAt: source.sourceUpdatedAt, teams };
}
