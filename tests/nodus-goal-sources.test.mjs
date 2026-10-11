import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { parseNodusTeamRows, parseAllyHeadings, collectNodusGoalSources, nodusAllyScopes, nodusAttendanceScopes } from '../scripts/publishNodusGoalSources.mjs';
import { nodusDate, nodusGoalSourceStatus, findNodusTeam, findNodusAllyEvidence, findNodusAttendanceEvidence, nextNodusC1Team, NODUS_GOAL_SOURCE } from '../src/services/nodusGoalSources.js';
import { buildTeamGoalPlan, buildGoalEdit } from '../src/services/goalsSetup.js';
import { readFileSync } from 'node:fs';

test('authorized automatic source workflow is bounded and never writes goals', () => {
  const workflow = readFileSync(new URL('../.github/workflows/nodus-goal-sources.yml', import.meta.url), 'utf8');
  assert.match(workflow, /cron: '17 \*\/6 \* \* \*'/);
  assert.match(workflow, /github\.event_name == 'schedule' \|\| inputs\.publish/);
  assert.match(workflow, /timeout-minutes: 10/);
  const publisher = readFileSync(new URL('../scripts/publishNodusGoalSources.mjs', import.meta.url), 'utf8');
  assert.match(publisher, /db\.doc\('nodus_coordinadores_c1c2\/goal_sources'\)\.set/);
  assert.doesNotMatch(publisher, /db\.collection\('goals'\)\.(add|set|update)|updateDoc|writeBatch/);
});

test('publisher scopes cover multiple sedes without cross-team or stage inheritance', () => {
  assert.deepEqual(nodusAllyScopes([
    { title: 'Aliados C1E32', sede: 'Lima' },
    { title: 'Aliados C1E32', sede: 'Guayaquil' },
    { title: 'Aliados C2E126', sede: 'Quito' }
  ]), [
    { sede: 'Lima', team: '32', stage: 'C1' },
    { sede: 'Guayaquil', team: '32', stage: 'C1' },
    { sede: 'Quito', team: '126', stage: 'C2' }
  ]);
});

test('goal editing preserves identity, assignments and achievements across every sede', () => {
  for (const sede of ['Lima', 'Quito', 'Guayaquil', 'Cuenca', 'Medellin', 'CDMX']) {
    const goal = { title: 'Aliados C1E32', sede, targetValue: 10, currentValue: 11, scope: 'ENTRENAMIENTO', assignedCoordinators: [{ targetQuota: 10 }] };
    const patch = buildGoalEdit({ appRole: 'gerente', sede }, goal,
      { title: 'Aliados C1E32 revisados', kpi: 'Cantidad de Aliados', targetValue: 6 }, '2026-10-11T22:00:00Z');
    assert.equal(patch.progress, 183);
    assert.equal(patch.targetValue, 6);
    assert.equal('assignedCoordinators' in patch, false);
    assert.equal('currentValue' in patch, false);
    assert.throws(() => buildGoalEdit({ appRole: 'coord_c1', sede }, goal, patch));
    assert.throws(() => buildGoalEdit({ appRole: 'gerente', sede: 'Otra sede' }, goal, patch));
    assert.throws(() => buildGoalEdit({ appRole: 'gerente', sede }, goal, { ...patch, title: 'Aliados C1E31' }));
    assert.throws(() => buildGoalEdit({ appRole: 'gerente', sede }, goal, { ...patch, title: 'Aliados C2E32' }));
  }
});

const team = { sede: 'Lima', team: '31', teamId: '141', stage: 'C1', path: '/equipos/detalle/141' };
const now = Date.parse('2026-10-11T17:00:00Z');
const snapshot = { source: NODUS_GOAL_SOURCE, schemaVersion: 1, queriedAt: new Date(now).toISOString(), sourceUpdatedAt: null, teams: [team],
  allies: parseAllyHeadings(['Aliados Asignados (17)\nExportar a Excel', 'Aliados Confirmados para C2 (1)', 'Pagaron C2 / C2+MJ (40)'], team) };

test('team dates preserve Nodus meaning, sede, stage and unique source identity', () => {
  const parsed = parseNodusTeamRows([{ equipo: 'EQUIPO 31', sede: 'LIMA CICLO 1', start: '01/09/2026', end: '20/09/2026', path: '/equipos/detalle/141' }]);
  assert.deepEqual(parsed, [{ ...team, start: '2026-09-01', end: '2026-09-20' }]);
  assert.equal(nodusDate('31/02/2026'), null);
  assert.equal(nodusDate('2026-09-01'), null);
  assert.deepEqual(parseNodusTeamRows([{ equipo: 'Sin equipo', sede: 'Lima', path: '/equipos/edit/141' }]), []);
});

test('ally categories never substitute assigned, C2 confirmed or paid for one another', () => {
  assert.deepEqual(snapshot.allies.map(a => [a.metric, a.stage, a.value]), [['assignedAllies', 'C1', 17], ['confirmedC2Allies', 'C2', 1]]);
  assert.deepEqual(parseAllyHeadings(['Pagaron C2 / C2+MJ (40)'], team), []);
  assert.deepEqual(parseAllyHeadings(['Aliados Asignados (17)', 'Aliados Asignados (18)'], team).filter(a => a.metric === 'assignedAllies'), []);
});

test('evidence requires fresh trusted source, exact sede, team, stage and path', () => {
  const goal = { title: 'Aliados C1E31 Lima', sede: 'Lima', currentValue: 24, targetValue: 25 };
  assert.equal(findNodusAllyEvidence(snapshot, goal, null, now).value, 17);
  assert.equal(goal.currentValue, 24);
  for (const changed of [{ sede: 'Quito' }, { title: 'Aliados C1E310 Lima' }, { title: 'Sentados C1E31 Lima' }]) {
    assert.equal(findNodusAllyEvidence(snapshot, { ...goal, ...changed }, null, now), null);
  }
  assert.equal(findNodusAllyEvidence(snapshot, { ...goal, title: 'Aliados C2E31 Lima' }, null, now).value, 1);
  for (const queriedAt of ['invalid', '2026-10-09T00:00:00Z', '2026-10-12T00:00:00Z']) {
    assert.equal(nodusGoalSourceStatus({ ...snapshot, queriedAt }, now).ready, false);
  }
  assert.equal(findNodusAllyEvidence({ ...snapshot, allies: [...snapshot.allies, snapshot.allies[0]] }, goal, null, now), null);
  assert.equal(findNodusAllyEvidence({ ...snapshot, allies: [{ ...snapshot.allies[0], path: '/aliados?id_equipo=999' }] }, goal, null, now), null);
});

test('team grouping distinguishes stages and rejects duplicated or mismatched identities', () => {
  const c2 = { ...team, stage: 'C2', teamId: '142', path: '/equipos/detalle/142' };
  assert.deepEqual(findNodusTeam({ ...snapshot, teams: [team, c2] }, 'Lima', '31', 'C2'), [c2]);
  assert.deepEqual(findNodusTeam({ ...snapshot, teams: [team, { ...team, teamId: '999', path: '/equipos/detalle/999' }, c2] }, 'Lima', '31'), [c2]);
  assert.deepEqual(findNodusTeam({ ...snapshot, teams: [{ ...team, path: '/equipos/detalle/999' }] }, 'Lima', '31'), []);
  assert.deepEqual(findNodusTeam(snapshot, 'Quito', '31'), []);
});

test('upcoming E32 Lima never inherits E31 ally counts or equipment period as stage calendar', () => {
  const [upcoming] = parseNodusTeamRows([
    { equipo: 'EQUIPO 32', sede: 'LIMA CICLO 1', start: '23/10/2026', end: '05/11/2026', path: '/equipos/detalle/149' }
  ]);
  const source = { ...snapshot, teams: [team, upcoming] };
  assert.deepEqual(findNodusTeam(source, 'Lima', '32', 'C1'), [upcoming]);
  assert.equal(upcoming.start, '2026-10-23');
  assert.equal(upcoming.end, '2026-11-05');
  assert.equal('calendar' in upcoming, false);
  assert.equal(findNodusAllyEvidence(source, { title: 'Aliados C1E32', sede: 'Lima' }, null, now), null);
  assert.deepEqual(findNodusTeam(source, 'Lima', '32', 'C2'), []);
  assert.deepEqual(findNodusTeam(source, 'Guayaquil', '32', 'C1'), []);
});

test('collector stops when E32 exists in teams but not in the ally selector', async () => {
  const paths = [];
  let url;
  const page = {
    goto: async next => { paths.push(next); url = next; return { status: () => 200 }; },
    url: () => url,
    waitForNetworkIdle: async () => {},
    evaluate: async (fn, teamId) => teamId
      ? runInNewContext(`(${fn.toString()})(teamId)`, {
        teamId, document: { querySelector: () => ({ value: '' }) }
      })
      : [{ equipo: 'EQUIPO 32', sede: 'LIMA CICLO 1', start: '23/10/2026', end: '05/11/2026', path: '/equipos/detalle/149' }]
  };
  await assert.rejects(collectNodusGoalSources(page, [{ sede: 'Lima', team: '32', stage: 'C1' }]),
    /El filtro de aliados no corresponde al equipo solicitado/);
  assert.deepEqual(paths, [`${NODUS_GOAL_SOURCE}/equipos`, `${NODUS_GOAL_SOURCE}/aliados?id_equipo=149`]);
});

test('next team preparation uses only unique future C1 periods, never stale or past teams', () => {
  const upcoming = { ...team, team: '32', teamId: '149', path: '/equipos/detalle/149', start: '2026-10-23', end: '2026-11-05' };
  const source = { ...snapshot, teams: [{ ...team, start: '2026-09-01', end: '2026-09-20' }, upcoming] };
  assert.deepEqual(nextNodusC1Team(source, 'Lima', '2026-10-11', now), upcoming);
  assert.equal(nextNodusC1Team(source, 'Quito', '2026-10-11', now), null);
  assert.equal(nextNodusC1Team(source, 'Lima', '2026-11-06', now), null);
  assert.equal(nextNodusC1Team({ ...source, queriedAt: '2026-10-09T00:00:00Z' }, 'Lima', '2026-10-11', now), null);
  for (const changed of [{ stage: 'C2' }, { start: '2026-13-23' }, { end: '2026-10-01' }]) {
    assert.equal(nextNodusC1Team({ ...source, teams: [{ ...upcoming, ...changed }] }, 'Lima', '2026-10-11', now), null);
  }
  assert.equal(nextNodusC1Team({ ...source, teams: [upcoming, { ...upcoming, team: '33', teamId: '150', path: '/equipos/detalle/150' }] }, 'Lima', '2026-10-11', now), null);
});

test('new team setup requires approved objectives and preserves all older goals and assignments', () => {
  const oldGoal = { id: 'old', title: 'Equipo 31', scope: 'CICLO', sede: 'Lima', currentValue: 24, assignedCoordinators: [] };
  const options = { user: { uid: 'fixture-manager', appRole: 'gerente', sede: 'Lima' }, sede: 'Lima', team: '32',
    goals: [oldGoal], stages: [{ id: 'C1', name: 'Capítulo 1' }], targets: { C1: { aliados: '25' } }, createdAt: snapshot.queriedAt };
  const before = structuredClone(oldGoal);
  const plan = buildTeamGoalPlan(options);
  assert.equal(plan.cycle.teamNumber, '32');
  assert.equal(plan.children[0].teamNumber, '32');
  assert.equal(plan.children[0].stage, 'C1');
  assert.equal(plan.children[0].targetValue, 25);
  assert.equal(plan.children[0].currentValue, 0);
  assert.deepEqual(plan.children[0].assignedCoordinators, []);
  assert.deepEqual(oldGoal, before);
  for (const changed of [
    { team: '' }, { team: '31' }, { targets: {} }, { targets: { C1: { aliados: '-1' } } },
    { targets: { C1: { aliados: '1.5' } } }, { sede: 'Quito' },
    { user: { uid: 'fixture-coordinator', appRole: 'coord_c1', sede: 'Lima' } }
  ]) assert.throws(() => buildTeamGoalPlan({ ...options, ...changed }));
});

test('historical attendance is a separate scoped measure, not confirmed allies or unmarked absences', () => {
  const record = { sede: 'Lima', team: '31', teamId: '141', stage: 'C1', metric: 'markedAttendance',
    value: 7, unmarked: 3, complete: true, path: '/reporte?id_equipo=141' };
  const source = { ...snapshot, teams: [{ ...team, end: '2026-09-20' }], attendance: [record] };
  const goal = { title: 'Sentados C1E31', sede: 'Lima', currentValue: 9 };
  assert.equal(findNodusAttendanceEvidence(source, goal, null, now).value, 7);
  assert.equal(findNodusAttendanceEvidence(source, goal, null, now).unmarked, 3);
  assert.equal(goal.currentValue, 9);
  for (const changed of [{ title: 'Aliados C1E31' }, { title: 'Sentados C2E31' }, { title: 'Sentados C1E32' }, { sede: 'Quito' }]) {
    assert.equal(findNodusAttendanceEvidence(source, { ...goal, ...changed }, null, now), null);
  }
  assert.equal(findNodusAttendanceEvidence({ ...source, attendance: [record, record] }, goal, null, now), null);
  assert.equal(findNodusAttendanceEvidence({ ...source, teams: [{ ...team, end: '2026-11-05' }] }, goal, null, now), null);
  assert.deepEqual(nodusAttendanceScopes([{ id: 'parent', title: 'Equipo 31', sede: 'Lima' },
    { title: 'Sentados - Capítulo 2', parentId: 'parent' }]), [{ sede: 'Lima', team: '31', stage: 'C2' }]);
});

test('collector reads complete attendance cells only and rejects schema drift', async () => {
  const table = {
    querySelectorAll: () => [{ textContent: 'ASISTENCIA' }]
  };
  const makeRow = checked => ({ cells: [{ textContent: checked ? 'Asistió' : '—',
    querySelectorAll: () => [{ checked }] }] });
  let rows = [makeRow(true), makeRow(false)];
  const jQuery = () => ({ DataTable: () => ({
    settings: () => [{ oFeatures: { bServerSide: false } }],
    rows: () => ({ nodes: () => ({ toArray: () => rows }) })
  }) });
  jQuery.fn = { dataTable: { isDataTable: () => true } };
  let url;
  const page = {
    goto: async next => { url = next; return { status: () => 200 }; },
    url: () => url, waitForNetworkIdle: async () => {},
    evaluate: async (fn, args) => args
      ? runInNewContext(`(${fn.toString()})(args)`, { args, window: { jQuery },
        document: { querySelector: () => ({ value: '141' }), getElementById: () => table } })
      : [{ equipo: 'EQUIPO 31', sede: 'LIMA CICLO 1', start: '01/09/2026', end: '20/09/2026', path: '/equipos/detalle/141' }]
  };
  const result = await collectNodusGoalSources(page, [], [{ sede: 'Lima', team: '31', stage: 'C1' }]);
  assert.equal(result.attendance[0].value, 1);
  assert.equal(result.attendance[0].unmarked, 1);
  assert.deepEqual(Object.keys(result.attendance[0]).sort(),
    ['sede', 'team', 'teamId', 'stage', 'metric', 'value', 'unmarked', 'complete', 'path'].sort());
  rows = [{ cells: [{ textContent: 'Confirmado', querySelectorAll: () => [{ checked: true }] }] }];
  await assert.rejects(collectNodusGoalSources(page, [], [{ sede: 'Lima', team: '31', stage: 'C1' }]), /Cambió el estado de asistencia/);
});

test('publisher scopes inherit explicit parent identity only and deduplicate child stages', () => {
  const goals = [
    { id: 'parent', title: 'Ciclo Equipo 31', sede: 'Lima' },
    { id: 'child', title: 'Aliados - Capítulo 1', parentId: 'parent' },
    { id: 'duplicate-scope', title: 'Aliados C1E31', sede: 'Lima' },
    { id: 'own-scope', title: 'Aliados C2E30', sede: 'Quito', parentId: 'parent' },
    { id: 'missing-parent', title: 'Aliados - Capítulo 1', parentId: 'missing' },
    { id: 'missing-stage', title: 'Aliados Equipo 31', sede: 'Lima' }
  ];
  assert.deepEqual(nodusAllyScopes(goals), [
    { sede: 'Lima', team: '31', stage: 'C1' }, { sede: 'Quito', team: '30', stage: 'C2' }
  ]);
  assert.deepEqual(nodusAllyScopes([
    { id: 'ambiguous', title: 'Equipo 31', sede: 'Lima' },
    { id: 'ambiguous', title: 'Equipo 30', sede: 'Quito' },
    { id: 'child', title: 'Aliados - Capítulo 1', parentId: 'ambiguous' }
  ]), []);
});

test('collector publishes no personal data and reads only known source paths', async () => {
  const paths = [];
  let url;
  const page = {
    goto: async next => { paths.push(next); url = next; return { status: () => 200 }; },
    url: () => url,
    waitForNetworkIdle: async () => {},
    evaluate: async (_fn, teamId) => teamId ? ['Aliados Asignados (17)', 'Aliados Confirmados para C2 (1)'] :
      [{ equipo: 'EQUIPO 31', sede: 'LIMA CICLO 1', start: '01/09/2026', end: '20/09/2026', path: '/equipos/detalle/141' }]
  };
  const result = await collectNodusGoalSources(page, [{ sede: 'Lima', team: '31', stage: 'C1' }]);
  assert.deepEqual(paths, [`${NODUS_GOAL_SOURCE}/equipos`, `${NODUS_GOAL_SOURCE}/aliados?id_equipo=141`]);
  assert.equal(result.allies.length, 1);
  assert.equal(result.allies[0].value, 17);
  assert.ok(result.teams.every(t => Object.keys(t).every(k => ['sede', 'team', 'teamId', 'stage', 'start', 'end', 'path'].includes(k))));
});

test('collector rejects 403 and never publishes a fake empty success', async () => {
  const page = { goto: async () => ({ status: () => 403 }), url: () => `${NODUS_GOAL_SOURCE}/equipos` };
  await assert.rejects(collectNodusGoalSources(page, []), /HTTP 403/);
});
