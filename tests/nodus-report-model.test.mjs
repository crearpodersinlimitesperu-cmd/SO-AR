import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReportSources, countNodusTeam, currentReportTeams, nodusTeamScope, reportSourceStatus, reportStages, validCallCounts, REPORT_SEDES, CALL_METRICS } from '../src/services/nodusReportModel.js';

const timestamp = '2026-10-10T14:00:00Z';
const now = Date.parse(timestamp);
const target = { team: '32', stage: 'C1', sede: 'Lima', label: 'C1 E32' };
test('every sede and stage selects the next official team, never an old confirmed team', () => {
  for (const sede of REPORT_SEDES) for (const stage of ['C1', 'C2']) {
    const events = [
      { sede, equipo: 31, nombre: stage, fecha_inicio: '2026-09-18', fecha_fin: '2026-09-20' },
      { sede, equipo: 32, nombre: stage, fecha_inicio: '2026-10-23', fecha_fin: '2026-10-25' },
      { sede, equipo: 33, nombre: stage, fecha_inicio: '2026-11-20' }
    ];
    assert.deepEqual(currentReportTeams(events, sede, stage, '2026-10-10').map(t => t.team), ['32']);
  }
});
test('active FDS takes precedence; parallel teams need explicit selection; no historical fallback', () => {
  const events = [32, 33].map(team => ({ sede: 'UIO C1', equipo: team, nombre: 'CAPÍTULO UNO', fecha_inicio: '2026-10-09', fecha_fin: '2026-10-11' }));
  assert.equal(currentReportTeams(events, 'Quito', 'C1', '2026-10-10').length, 2);
  assert.deepEqual(currentReportTeams(events, 'Lima', 'C1', '2026-10-10'), []);
  assert.equal(reportSourceStatus(null, null, now).ready, false);
});
test('scope comes from explicit team/sede/stage, never numeric guesses or coordinator names', () => {
  assert.deepEqual(nodusTeamScope({ equipoNombre: 'EQUIPO 32 - LIMA CICLO 1 ✓' }), { sede: 'Lima', team: '32', stage: 'C1' });
  assert.equal(nodusTeamScope({ equipoNombre: 'EQUIPO 32' }), null);
  assert.equal(nodusTeamScope({ equipoNombre: 'EQUIPO 32 - LIMA' }), null);
});
test('all 14 counts are exact, cohorts explicit, latest nonempty call takes precedence', () => {
  const states = ['Confirmado', 'Por Confirmar', 'No Contesta', 'No Interesa', 'Siguiente', 'Ya Asistió', ''];
  const participantes = ['Nuevos', 'Rezagados'].flatMap(grupoReporte => states.map(llamada2 => ({ grupoReporte, llamada2 })));
  const result = countNodusTeam({ participantes });
  assert.equal(result.status, 'ready');
  assert.equal(result.rows, 14);
  assert.equal(validCallCounts(result.counts), true);
  assert.deepEqual(Object.values(result.counts), Array(14).fill(1));
  assert.equal(countNodusTeam({ participantes: [{ grupoReporte: 'Nuevo', llamada1: 'Confirmado', llamada2: 'No Interesa' }] }).counts.nuevos_NI, 1);
});
test('missing/partial/ambiguous data is unavailable, not zero or historic precarga', () => {
  for (const team of [{}, { participantes: [{ llamada1: 'Confirmado' }] }, { participantes: [{ grupoReporte: 'Nuevo', llamada1: 'Cambio Cupo' }] }]) assert.equal(countNodusTeam(team).counts, null);
  assert.equal(countNodusTeam({ participantes: [] }).status, 'missing');
  assert.equal(countNodusTeam({ participantes: [], extractionComplete: true }).status, 'ready');
  assert.equal(reportSourceStatus(null, target, now).message, 'Sin datos de Nodus para C1 E32 aún');
  const source = { sourceUpdatedAt: timestamp, teams: [{ team: '31', status: 'ready', counts: { nuevos_OK: 53 } }] };
  assert.equal(reportSourceStatus(source, target, now).ready, false);
  assert.equal(reportSourceStatus({ ...source, sourceUpdatedAt: '2026-09-16T12:00:00Z' }, target, now).ready, false);
});
test('published sources have no personal data; duplicate team IDs fail closed', () => {
  const team = { equipoNombre: 'EQUIPO 32 - LIMA CICLO 1', participantes: [{ grupoReporte: 'Nuevo', llamada1: 'Confirmado', nombres: 'PRIVATE', telefono: 'PRIVATE' }] };
  const sources = buildReportSources({ timestamp, equiposReporte: [team] });
  assert.equal(sources.length, 12);
  assert.equal(JSON.stringify(sources).includes('PRIVATE'), false);
  assert.equal(reportSourceStatus(sources[0], target, now).counts.nuevos_OK, 1);
  assert.deepEqual(buildReportSources({ timestamp, equiposReporte: [team, team] })[0].teams, []);
});
test('role stage access is exact and complete numeric counts are required', () => {
  assert.deepEqual(reportStages({ role: 'coord_c1' }), ['C1']);
  assert.deepEqual(reportStages({ role: 'coord_c2' }), ['C2']);
  assert.deepEqual(reportStages({ role: 'coordinador_c1c2' }), ['C1', 'C2']);
  assert.deepEqual(reportStages({ role: 'manager' }), []);
  const counts = Object.fromEntries(['nuevos', 'rezagados'].flatMap(group => CALL_METRICS.map(metric => [`${group}_${metric}`, 0])));
  assert.equal(validCallCounts(counts), true);
  for (const value of [-1, 1.5, '', NaN, undefined]) assert.equal(validCallCounts({ ...counts, nuevos_OK: value }), false);
});
