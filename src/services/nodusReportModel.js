import { calendarSede } from '../../functions-imo/calendarModel.mjs';
import { explicitTeamFromText, goalStageKey, localDateKey } from './goalsTimeline.js';

export const CALL_METRICS = ['OK', 'XC', 'NC', 'NI', 'SIG', 'OS', 'PENDIENTES'];
export const REPORT_SEDES = ['Lima', 'Quito', 'Cuenca', 'México', 'Guayaquil', 'Medellín'];
const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();

export function reportStages(user = {}) {
  const roles = [user.activeRole || user.appRole || user.role, ...(user.roles || [])];
  if (user.isSuperAdmin || user.isDireccion || roles.some(r => ['superadmin', 'direccion'].includes(r))) return ['C1', 'C2'];
  return ['C1', 'C2'].filter(stage => roles.includes(`coord_${stage.toLowerCase()}`) || roles.includes('coordinador_c1c2') || roles.includes('gerente'));
}

export function currentReportTeams(events, sede, stage, today = localDateKey()) {
  const candidates = events.flatMap(event => {
    if (calendarSede(event.sede || event.sedeTag) !== calendarSede(sede)) return [];
    if (goalStageKey({ title: event.nombre || event.name }) !== stage) return [];
    const rawTeam = String(event.equipo ?? event.team ?? '');
    const team = /^\d+$/.test(rawTeam) ? String(Number(rawTeam)) : explicitTeamFromText(rawTeam);
    const start = String(event.fecha_inicio || event.start || event.date || '').slice(0, 10);
    const end = String(event.fecha_fin || event.end || start).slice(0, 10);
    if (!team || !/^\d{4}-\d{2}-\d{2}$/.test(start) || end < today) return [];
    return [{ team, stage, sede: calendarSede(sede), start, end, label: `${stage} E${team}` }];
  }).sort((a, b) => a.start.localeCompare(b.start));
  if (!candidates.length) return [];
  const active = candidates.filter(e => e.start <= today);
  const selected = active.length ? active : candidates.filter(e => e.start === candidates[0].start);
  return [...new Map(selected.map(e => [e.team, e])).values()];
}

export function nodusTeamScope(team = {}) {
  const name = norm(team.equipoNombre || team.equipo || '');
  const sede = team.sede ? calendarSede(team.sede) : REPORT_SEDES.find(s => name.includes(norm(s)));
  const number = team.team || explicitTeamFromText(name);
  const stage = goalStageKey({ title: name.replace(/CICLO\s*([12])/g, 'C$1') });
  return sede && number && stage ? { sede, team: String(number), stage } : null;
}

const STATUS = new Map([
  ['CONFIRMADO', 'OK'], ['POR CONFIRMAR', 'XC'], ['NO CONTESTA', 'NC'],
  ['NO INTERESA', 'NI'], ['SIGUIENTE', 'SIG'], ['YA ASISTIO', 'OS'],
  ['PENDIENTE', 'PENDIENTES'], ['PENDIENTES', 'PENDIENTES'], ['', 'PENDIENTES'], ['—', 'PENDIENTES'], ['-', 'PENDIENTES']
]);

// A cohort must be declared by Nodus, not inferred from an old team or attendance.
export function countNodusTeam(team) {
  const counts = Object.fromEntries(['nuevos', 'rezagados'].flatMap(group => CALL_METRICS.map(metric => [`${group}_${metric}`, 0])));
  if (!Array.isArray(team.participantes) || team.extractionComplete === false) return { status: 'missing', counts: null, rows: 0, unknown: 0 };
  if (!team.participantes.length && team.extractionComplete !== true) return { status: 'missing', counts: null, rows: 0, unknown: 0 };
  let unknown = 0;
  for (const row of team.participantes) {
    const cohort = norm(row.grupoReporte || row.tipoParticipante);
    const group = /^NUEV[OA]S?$/.test(cohort) ? 'nuevos' : /^REZAGAD[OA]S?$/.test(cohort) ? 'rezagados' : null;
    const status = STATUS.get(norm(row.llamada2 || row.llamada1));
    if (!group || !status) { unknown++; continue; }
    counts[`${group}_${status}`]++;
  }
  return { status: unknown ? 'unclassified' : 'ready', counts: unknown ? null : counts, rows: team.participantes.length, unknown };
}

export function buildReportSources(snapshot = {}) {
  return REPORT_SEDES.flatMap(sede => ['C1', 'C2'].map(stage => {
    const teams = (snapshot.equiposReporte || []).flatMap(team => {
      const scope = nodusTeamScope(team);
      return scope?.sede === sede && scope.stage === stage ? [{ ...scope, ...countNodusTeam(team) }] : [];
    });
    const duplicateTeams = teams.filter((team, index) => teams.findIndex(t => t.team === team.team) !== index).map(t => t.team);
    return {
      sede, stage, source: 'nodus_coordinadores_c1c2/latest', sourceUpdatedAt: snapshot.timestamp || null,
      teams: teams.filter(t => !duplicateTeams.includes(t.team))
    };
  }));
}

export function reportSourceStatus(source, target, now = Date.now()) {
  if (!target) return { ready: false, message: 'Sin equipo vigente o próximo en el calendario para esta sede y etapa.' };
  const missing = `Sin datos de Nodus para ${target.label} aún`;
  if (!source) return { ready: false, message: missing };
  if (source.sede !== target.sede || source.stage !== target.stage) return { ready: false, message: missing };
  const updated = Date.parse(source.sourceUpdatedAt);
  if (!Number.isFinite(updated) || now - updated > 24 * 60 * 60 * 1000 || updated > now + 60000) {
    return { ready: false, message: `Datos de Nodus desactualizados para ${target.label}. Actualiza la sincronización.` };
  }
  const team = source.teams?.find(t => String(t.team) === target.team);
  if (!team || team.status === 'missing') return { ready: false, message: missing };
  if (team.status !== 'ready') return { ready: false, message: `Nodus no distingue Nuevos/Rezagados o estados de ${team.unknown} registros de ${target.label}. No se precargaron conteos.` };
  return { ready: true, counts: team.counts, message: `Nodus: ${target.sede} · ${target.label} · ${team.rows} registros · Sincronizado: ${source.sourceUpdatedAt}` };
}

export function validCallCounts(data) {
  return ['nuevos', 'rezagados'].every(group => CALL_METRICS.every(metric => Number.isInteger(data[`${group}_${metric}`]) && data[`${group}_${metric}`] >= 0));
}

export function callTotal(data, group) {
  const values = CALL_METRICS.map(metric => data[`${group}_${metric}`]);
  return values.every(value => Number.isInteger(value) && value >= 0) ? values.reduce((sum, value) => sum + value, 0) : null;
}
