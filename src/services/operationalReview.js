import { REPORT_SEDES, nodusTeamScope, countNodusTeam } from './nodusReportModel.js';
import { explicitTeamFromText, goalStageKey } from './goalsTimeline.js';
import { canonicalSede } from '../utils/sede.js';
import { snapshotFreshness } from '../utils/nodusIntegrity.js';
import { timeZoneForSede, zonedDateInputParts } from '../utils/timezones.js';

export const REVIEW_SOURCE = 'nodus_coordinadores_c1c2/latest';
const dateKey = value => {
  const text = String(value ?? '').slice(0, 10);
  const date = new Date(`${text}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === text ? text : null;
};
const teamKey = value => {
  const raw = String(value ?? '').trim();
  const number = /^\d+$/.test(raw) ? String(Number(raw)) : explicitTeamFromText(raw);
  return number && number !== '0' && number !== '1000' ? number : null;
};

// Cohort identity is sede + explicit team number; chronology is the first C1
// date in the official calendar, never a global ranking of numeric IDs.
export function latestTeamsBySede(events = [], now = Date.now()) {
  return REPORT_SEDES.map(sede => {
    const today = zonedDateInputParts(new Date(now).toISOString(), timeZoneForSede(sede).zone).date;
    const teams = new Map();
    let invalidEvents = 0;
    for (const event of events) {
      if (canonicalSede(event.sede || event.sedeTag) !== sede ||
          goalStageKey({ title: event.nombre || event.name }) !== 'C1') continue;
      const team = teamKey(event.equipo ?? event.team);
      const start = dateKey(event.fecha_inicio || event.start || event.date);
      if (!team || !start) { invalidEvents++; continue; }
      if (start > today) continue;
      const prior = teams.get(team);
      if (!prior || start < prior.start) teams.set(team, { sede, team, start });
    }
    const selected = [...teams.values()]
      .sort((a, b) => b.start.localeCompare(a.start) || a.team.localeCompare(b.team, 'en'))
      .slice(0, 6);
    return { sede, teams: selected, missingCalendarTeams: 6 - selected.length, invalidEvents };
  });
}

function stageEvidence(snapshot, sede, team, stage, stale, now) {
  if (Array.isArray(snapshot?.reportSources)) {
    const sources = snapshot.reportSources.filter(source => source.sede === sede && source.stage === stage);
    if (sources.length > 1) return { status: 'duplicate', label: 'Fuente duplicada; no se sumó', rows: null, confirmed: null };
    const source = sources[0];
    if (!source) return { status: 'missing', label: 'Sin reporte publicado', rows: null, confirmed: null };
    if (snapshotFreshness(source.sourceUpdatedAt, now).stale) {
      return { status: 'stale', label: 'Reporte antiguo o sin fecha verificable', rows: null, confirmed: null };
    }
    const rows = source.teams.filter(row => row.sede === sede && row.stage === stage && row.team === team);
    if (rows.length > 1) return { status: 'duplicate', label: 'Fuente duplicada; no se sumó', rows: null, confirmed: null };
    const record = rows[0];
    if (!record || record.status === 'missing') return {
      status: 'missing', label: 'Solo resumen o extracción incompleta', rows: null, confirmed: null
    };
    if (record.status !== 'ready') return { status: 'unclassified',
      label: `${record.unknown} registros sin cohorte/estado verificable`, rows: null, confirmed: null };
    return { status: 'ready', label: 'Conteos del reporte publicado; no certifica asistencia',
      rows: record.rows, confirmed: record.counts.nuevos_OK + record.counts.rezagados_OK };
  }
  const matches = (Array.isArray(snapshot?.equiposReporte) ? snapshot.equiposReporte : []).filter(row => {
    const name = String(row.equipoNombre || row.equipo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const namedSedes = REPORT_SEDES.filter(candidate =>
      name.includes(candidate.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()));
    if (namedSedes.length > 1 || (row.sede && namedSedes.length === 1 && canonicalSede(row.sede) !== namedSedes[0])) return false;
    const scope = nodusTeamScope(row);
    return scope && canonicalSede(scope.sede) === sede && scope.team === team && scope.stage === stage;
  });
  if (matches.length > 1) return { status: 'duplicate', label: 'Fuente duplicada; no se sumó', rows: null, confirmed: null };
  if (!matches.length) return { status: 'missing', label: 'Sin reporte publicado', rows: null, confirmed: null };
  if (stale) return { status: 'stale', label: 'Snapshot antiguo o sin fecha verificable', rows: null, confirmed: null };
  if (matches[0].totalParticipantes != null &&
      (!Number.isSafeInteger(matches[0].totalParticipantes) ||
       matches[0].totalParticipantes !== matches[0].participantes?.length)) {
    return { status: 'missing', label: 'Solo resumen o extracción incompleta', rows: null, confirmed: null };
  }
  const result = countNodusTeam(matches[0]);
  if (result.status !== 'ready') {
    return { status: result.status, label: result.status === 'unclassified'
      ? `${result.unknown} registros sin cohorte/estado verificable` : 'Solo resumen o extracción incompleta',
    rows: null, confirmed: null };
  }
  return { status: 'ready', label: 'Conteos del reporte publicado; no certifica asistencia',
    rows: result.rows, confirmed: result.counts.nuevos_OK + result.counts.rezagados_OK };
}

export function buildOperationalReview(events, snapshot, now = Date.now()) {
  const timestamp = snapshot?.timestamp || null;
  const freshness = snapshotFreshness(timestamp, now);
  const sedes = latestTeamsBySede(events, now)
    .filter(group => !Array.isArray(snapshot?.authorizedSedes) || snapshot.authorizedSedes.includes(group.sede)).map(group => ({
    ...group,
    teams: group.teams.map(team => ({
      ...team,
      stages: ['C1', 'C2'].filter(stage => !Array.isArray(snapshot?.authorizedStages) || snapshot.authorizedStages.includes(stage))
        .map(stage => ({ stage, ...stageEvidence(snapshot, group.sede, team.team, stage, freshness.stale, now) }))
    }))
  }));
  return { source: REVIEW_SOURCE, timestamp, freshness, sedes };
}
