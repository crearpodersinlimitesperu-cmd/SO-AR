import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNodusTeamRows, parseAllyHeadings, collectNodusGoalSources, nodusAllyScopes } from '../scripts/publishNodusGoalSources.mjs';
import { nodusDate, nodusGoalSourceStatus, findNodusTeam, findNodusAllyEvidence, NODUS_GOAL_SOURCE } from '../src/services/nodusGoalSources.js';

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
