import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { goalProgress, assignedQuotaTotals, isCallConfirmationGoal } from './goalProgress.js';
import { goalsAccess, visibleGoalsForUser } from './goalsVisibility.js';
import { auditSingleGoal, auditAllGoals, extractTeamNumber } from './goalsSentinelAgent.js';
import { organizeGoalsByTeam } from './goalsTimeline.js';

const goal = { id: 'synthetic', title: 'Sentados Equipo 31', sede: 'Lima', stage: 'C1', targetValue: 10, currentValue: 0 };
const board = readFileSync(new URL('../pages/GoalsBoard.jsx', import.meta.url), 'utf8');

test('11 / 6 displays 183%, only the visual bar is capped', () => {
  assert.deepEqual(goalProgress(11, 6), { current: 11, target: 6, percent: 183, barPercent: 100, label: 'Meta superada' });
  assert.equal(goalProgress(8, 8).label, 'Meta alcanzada');
  assert.equal(goalProgress(1, 2).percent, 50);
  assert.equal(goalProgress(24, 25).percent, 96);
});

test('missing, zero, negative and non-finite quotas do not invent an objective or zero achievement', () => {
  for (const target of [undefined, null, '', 0, -1, Infinity, 'not a number']) {
    assert.equal(goalProgress(1, target).percent, null);
  }
  for (const current of [undefined, null, '', -1, Infinity, 'not a number']) {
    assert.equal(goalProgress(current, 10).current, null);
    assert.equal(goalProgress(current, 10).percent, null);
  }
  assert.equal(goalProgress(0, 10).percent, 0);
  assert.equal(goalProgress('1.5', '3').percent, 50);
});

test('quota sums retain overachievement and remain separate from the global objective', () => {
  const quotas = [[11, 6], [8, 8], [3, 3], [1, 2], [1, 2]].map(([currentQuota, targetQuota]) => ({ currentQuota, targetQuota }));
  assert.deepEqual(assignedQuotaTotals(quotas), { current: 24, target: 21 });
  assert.deepEqual(assignedQuotaTotals([{ currentQuota: undefined, targetQuota: 3 }]), { current: null, target: 3 });
  assert.deepEqual(assignedQuotaTotals(null), { current: null, target: null });
});

test('assignment labels use the existing canonical formatter, including management and unknown roles', () => {
  // Execute only the public formatting functions: no roster, Firebase or real profiles.
  const source = readFileSync(new URL('../data/usersData.js', import.meta.url), 'utf8');
  const normalize = source.slice(source.indexOf('export const normalizeRole'), source.indexOf('export const normalizeSede'));
  const display = source.slice(source.indexOf('export const ROLE_DISPLAY_NAMES'), source.indexOf('export const ROLE_COLORS'));
  const formatter = runInNewContext(`${normalize.replaceAll('export ', '')}\n${display.replaceAll('export ', '')}\ngetRoleDisplayName`);
  assert.equal(formatter('gerente'), 'Gerente de Sede');
  assert.equal(formatter('coord_c1'), 'Coordinador Capítulo 1 y 2 (C1 / C2)');
  assert.equal(formatter('coordinador_mj'), 'Coordinador Maestría del Juego (MJ)');
  assert.equal(formatter('director_maestria'), 'Director Maestría del Juego (MJ)');
  assert.equal(formatter('rol_sintetico'), 'Rol Sintetico');
  assert.match(board, /coord\.role \? getRoleDisplayName\(coord\.role\) : 'Rol no registrado'/);
  assert.doesNotMatch(board, /isC1 \? 'Coordinadora C1\/C2' : 'Coordinadora CMJ'/);
});

test('view and management role matrices are preserved', () => {
  for (const appRole of ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'director_maestria', 'superadmin', 'consolidado']) {
    assert.equal(goalsAccess({ appRole }).canView, true, appRole);
    assert.equal(goalsAccess({ appRole }).canManage, true, appRole);
  }
  for (const appRole of ['coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj']) {
    assert.equal(goalsAccess({ appRole }).canView, true, appRole);
    assert.equal(goalsAccess({ appRole }).canManage, false, appRole);
  }
  for (const appRole of ['manager', 'qt', 'capitan', 'student', 'unknown']) {
    assert.equal(goalsAccess({ appRole }).canView, false, appRole);
  }
  assert.equal(goalsAccess({ roles: ['gerente'] }).canManage, true);
  assert.equal(goalsAccess({ activeRole: 'coord_c2' }).canView, true);
  assert.equal(goalsAccess({ isGerente: true }).canView, true);
  assert.equal(goalsAccess({ isSuperAdmin: true }).isGlobal, true);
});

test('cache and snapshot share sede filtering, without inventing an assigned-team gate', () => {
  const goals = [
    { id: 'lim31', sede: 'Lima', title: 'Equipo 31' },
    { id: 'lim30', sede: 'Lima', title: 'Equipo 30' },
    { id: 'uio', sede: 'UIO C2', title: 'Equipo 119' },
    { id: 'legacy', title: 'Equipo 118' }
  ];
  assert.deepEqual(visibleGoalsForUser(goals, { appRole: 'coord_c1', sede: 'Lima', teamNumber: '31' }).map(g => g.id), ['lim31', 'lim30']);
  assert.deepEqual(visibleGoalsForUser(goals, { appRole: 'gerente', sede: 'Quito' }).map(g => g.id), ['uio', 'legacy']);
  assert.deepEqual(visibleGoalsForUser(goals, { appRole: 'direccion' }), goals);
  assert.deepEqual(visibleGoalsForUser(goals, { appRole: 'student', sede: 'Lima' }), []);
  assert.equal((board.match(/visibleGoalsForUser\(/g) || []).length, 2);
  assert.match(board, /cpsl_goals_cache:\$\{currentUser\.uid \|\| currentUser\.email\}/);
});

test('teams are explicit and never default to a current cycle for a sede', () => {
  assert.equal(extractTeamNumber({ title: 'Sin equipo', sede: 'Lima' }), null);
  assert.equal(extractTeamNumber({ title: 'Aliados C1E31' }), '31');
  assert.equal(extractTeamNumber({ title: 'Sin equipo' }, { title: 'Ciclo Equipo 119' }), '119');
});

test('no daemon or evidence is not a verified zero or a completed goal', () => {
  for (const title of ['Sentados Equipo 31', 'Aliados Equipo 31', 'Managers - Creación Equipo 31', 'Meta Global Equipo 31']) {
    const audit = auditSingleGoal({ ...goal, title }, null);
    assert.equal(audit.detectedRealValue, null);
    assert.equal(audit.newProgress, null);
    assert.equal(audit.syncStatus, 'SIN_VERIFICAR');
    assert.equal(audit.requiresUpdate, false);
    assert.equal(audit.confidenceScore, null);
  }
  const audit = auditAllGoals([goal]);
  assert.equal(audit.unverifiedCount, 1);
  assert.equal(audit.matchingCount, 0);
  assert.equal(audit.overallHealthPct, null);
  assert.equal(auditAllGoals([]).overallHealthPct, null);
});

test('confirmed calls never count as people seated, and E31 never matches E310', () => {
  const nodusData = { coordinadores: [{ sede: 'Lima', equipos: [
    { equipo: 'EQUIPO 310', llamadas: 90, confirmado: 80 },
    { equipo: 'EQUIPO 31', llamadas: 5, confirmado: 4 }
  ] }] };
  const audit = auditSingleGoal(goal, null, { nodusData });
  assert.equal(audit.callsDetails.totalLlamadas, 5);
  assert.equal(audit.callsDetails.totalConfirmados, 4);
  assert.equal(audit.detectedRealValue, null);
});

test('room evidence must match sede, team and stage; use latest report, not highest', () => {
  const report = { type: 'ReporteSentadosSala', sede: 'Lima', equipo: '31', etapa: 'C1', created_at: '2026-10-11', data: { sentados: 11 } };
  const reports = [
    { ...report, sede: 'Quito', data: { sentados: 99 } },
    { ...report, equipo: '310', data: { sentados: 99 } },
    { ...report, etapa: 'C2', data: { sentados: 99 } },
    { ...report, equipo: '', data: { sentados: 99 } },
    { ...report, created_at: '2026-10-10', data: { sentados: 20 } },
    report
  ];
  const audit = auditSingleGoal(goal, null, { coordinatorReports: reports });
  assert.equal(audit.detectedRealValue, 11);
  assert.equal(audit.newProgress, 110);
  assert.equal(audit.requiresUpdate, true);
  assert.equal(auditSingleGoal(goal, null, { coordinatorReports: reports.slice(0, 4) }).detectedRealValue, null);
  assert.equal(auditSingleGoal({ ...goal, sede: undefined }, null, { coordinatorReports: reports }).requiresUpdate, false);
  assert.equal(auditSingleGoal(goal, null, { coordinatorReports: [{
    ...report, goal_id: goal.id, equipo: undefined, etapa: undefined
  }] }).detectedRealValue, 11);
  assert.equal(auditSingleGoal(goal, null, { coordinatorReports: [{
    ...report, goal_id: goal.id, equipo: '310'
  }] }).detectedRealValue, null);
});

test('telephone sync is only offered for an explicit confirmation KPI', () => {
  assert.equal(isCallConfirmationGoal({ title: 'Confirmados Equipo 31' }), true);
  for (const title of ['Sentados confirmados', 'Aliados confirmados', 'Managers confirmados', 'Participantes', 'Meta general']) {
    assert.equal(isCallConfirmationGoal({ title }), false, title);
  }
  assert.match(board, /canManageGoals && isCallConfirmationGoal\(selectedGoalForTeamCalls\)/);
});

test('generic manager counts require a loaded directory and exact sede/team', () => {
  const managerGoal = { ...goal, title: 'Managers Equipo 31' };
  const liveManagers = [
    { id: 'synthetic-1', nombre: 'Fixture One', sede: 'Lima', numEquipo: '31', estado: 'Activo' },
    { id: 'synthetic-2', nombre: 'Fixture Two', sede: 'Lima', numEquipo: '310', estado: 'Activo' },
    { id: 'synthetic-3', nombre: 'Fixture Three', sede: 'Quito', numEquipo: '31', estado: 'Activo' }
  ];
  assert.equal(auditSingleGoal(managerGoal, null).detectedRealValue, null);
  assert.equal(auditSingleGoal(managerGoal, null, { liveManagers }).detectedRealValue, 1);
  assert.equal(auditSingleGoal(managerGoal, null, { liveManagers: [] }).detectedRealValue, 0);
  assert.equal(auditSingleGoal({ ...managerGoal, title: 'Managers Creación Equipo 31' }, null, { liveManagers }).detectedRealValue, null);
});

test('a zero that matches available evidence is not advertised as daemon healthy', () => {
  const audit = auditSingleGoal({ ...goal, title: 'Managers Equipo 31' }, null, { liveManagers: [] });
  assert.equal(audit.syncStatus, 'COINCIDE');
  assert.match(audit.statusMessage, /no confirma la vigencia del daemon/);
});

test('missing calendar is not active and grouping never merges teams', () => {
  const groups = organizeGoalsByTeam([
    { ...goal, id: 'g31', progress: 96 },
    { ...goal, id: 'g30', title: 'Aliados Equipo 30', progress: 100 }
  ], { events: [], today: '2026-10-11' });
  assert.equal(groups.length, 2);
  assert.ok(groups.every(g => g.status === 'sin_calendario' && g.current === null));
  assert.deepEqual(groups.map(g => g.team), ['31', '30']);
});

test('listener lifecycle and honest UI contracts remain wired', () => {
  const effect = board.slice(board.indexOf('// Escuchar calendarios oficiales'), board.indexOf('// Helper: Formato'));
  assert.ok(effect.indexOf('unsubNodus = onSnapshot') < effect.indexOf('} catch (e)'));
  assert.ok(effect.indexOf('unsubManagers = onSnapshot') < effect.indexOf('} catch (e)'));
  assert.match(effect, /\[currentUser, canViewGoals\]/);
  assert.match(effect, /setManagersList\(snap\.metadata\.fromCache \|\| snap\.size >= 300 \? null/);
  assert.match(effect, /unsubNodus\(\)/);
  assert.match(effect, /unsubManagers\(\)/);
  assert.doesNotMatch(board, /import nodusFallbackData|100% Confiable|% verificado|Avance en Tiempo Real/);
  assert.match(board, /goalsStatus !== 'loaded'\) return null/);
  assert.match(board, /canManageGoals && audit\.requiresUpdate/);
});
