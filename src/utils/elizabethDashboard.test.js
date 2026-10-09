import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getTasksAssignedBy,
  getTaskAssigneeEmails,
  getTaskTiming,
  getTeamMembers,
  getTeamTimingSummary,
  isTaskCompleteForAssignee,
  isTaskCompleteForTeam,
  normalizeTaskEmail
} from './elizabethDashboard.js';

const NOW = new Date(2026, 9, 9, 12);
const assignedByElizabeth = {
  assignedByEmail: 'contabilidad.global@crearpsl.net',
  assignedToEmails: ['ana@crearpsl.net', 'luis@crearpsl.net']
};

test('Elizabeth enters her dashboard when simulated or consolidated and retains the full home', () => {
  const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
  const entry = app.slice(app.indexOf('function HomeEntry()'), app.indexOf('// Componente para proteger autenticación básica'));
  assert.match(entry, /if \(isElizabethEscobar\(currentUser\)\)/);
  assert.doesNotMatch(entry, /isSimulated|appRole/);
  assert.match(entry, /Navigate to="\/elizabeth-dashboard"/);
  assert.match(app, /path="\/home-completo"/);
  const home = readFileSync(new URL('../pages/Home.jsx', import.meta.url), 'utf8');
  assert.match(home, /isElizabethEscobar\(currentUser\) && \(/);
  assert.match(home, /Mi panel sencillo/);
  assert.match(home, /navigate\('\/elizabeth-dashboard'\)/);
});

test('Hosting revalidates SPA routes and only caches fingerprinted build assets long-term', () => {
  const config = JSON.parse(readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8'));
  const headers = config.hosting.headers;
  assert.ok(headers.some(rule => rule.source === '**' &&
    rule.headers.some(header => header.key === 'Cache-Control' && header.value.includes('no-store'))));
  const immutableRules = headers.filter(rule =>
    rule.headers.some(header => header.key === 'Cache-Control' && header.value.includes('immutable')));
  assert.deepEqual(immutableRules.map(rule => rule.source), ['/assets/**']);
  const vite = readFileSync(new URL('../../vite.config.js', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../main.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(vite, /VitePWA/);
  assert.doesNotMatch(main, /serviceWorker\.register|registerSW/);
});

test('report visibility follows the target profile equally in real and simulated sessions', () => {
  const reports = readFileSync(new URL('../pages/ReportesBoard.jsx', import.meta.url), 'utf8');
  const selector = reports.match(/const canSwitchAnyCoord = Boolean\(([\s\S]*?)\);/)?.[1];
  assert.ok(selector);
  assert.doesNotMatch(selector, /isSimulated/);
  assert.match(selector, /currentUser\?\.isSuperAdmin \|\| isDireccion/);
  const fallback = reports.match(/const hasGlobalReportView = Boolean\((.*?)\);/)?.[1];
  assert.ok(fallback);
  assert.doesNotMatch(fallback, /isSimulated/);
  assert.match(fallback, /currentUser\?\.isSuperAdmin \|\| isDireccion/);
});

test('exiting simulation restores the original admin and returns to their own home', () => {
  const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
  assert.match(app, /stopSimulation\(\);\s*navigate\('\/home', \{ replace: true \}\);/);
  const auth = readFileSync(new URL('../context/AuthContext.jsx', import.meta.url), 'utf8');
  assert.match(auth, /setOriginalAdminUser\(originalAdminUser \|\| currentUser\)/);
  assert.match(auth, /setCurrentUser\(originalAdminUser\)/);
  assert.match(auth, /setOriginalAdminUser\(null\)/);
});

test('only returns tasks assigned or created by the signed-in assigner', () => {
  const tasks = [
    { id: 'assigned', ...assignedByElizabeth },
    { id: 'legacy', created_by: 'CONTABILIDAD.GLOBAL@CREARPSL.COM', assigned_to: 'ana@crearpsl.net' },
    { id: 'not-assigned', createdBy: 'contabilidad.global@crearpsl.net' },
    { id: 'other', assignedByEmail: 'other@example.com', assignedToEmail: 'contabilidad.global@crearpsl.net' }
  ];
  assert.deepEqual(getTasksAssignedBy(tasks, 'contabilidad.global@crearpsl.com').map(task => task.id), ['assigned', 'legacy']);
  assert.deepEqual(getTasksAssignedBy(tasks, ''), []);
});

test('reads the real single, multiple, and legacy assignee fields without duplicates', () => {
  assert.equal(normalizeTaskEmail(' Ana@CREARPLS.com '), 'ana@crearpsl.net');
  assert.deepEqual(getTaskAssigneeEmails({
    assignedToEmail: 'Ana@crearpsl.com',
    assignedToEmails: ['ana@crearpsl.net', 'luis@crearpsl.net'],
    assigned_to: 'luis@crearpsl.com'
  }), ['ana@crearpsl.net', 'luis@crearpsl.net']);
});

test('labels due dates in human language and keeps date-only deadlines local', () => {
  assert.deepEqual(getTaskTiming({ deadline: '2026-10-09' }, NOW), { key: 'today', label: 'Vence hoy', days: 0 });
  assert.deepEqual(getTaskTiming({ deadline: '2026-10-10' }, NOW), { key: 'tomorrow', label: 'Vence mañana', days: 1 });
  assert.equal(getTaskTiming({ deadline: '2026-10-07' }, NOW).label, 'Atrasada 2 días');
  assert.equal(getTaskTiming({ deadline: '2026-10-12' }, NOW).label, 'Vence en 3 días');
  assert.equal(getTaskTiming({ deadline: 'invalid' }, NOW).key, 'noDeadline');
});

test('Firestore timestamps, completed tasks, and multi-assignee progress are classified correctly', () => {
  const timestamp = { toDate: () => new Date(2026, 9, 10, 9) };
  assert.equal(getTaskTiming({ deadline: timestamp }, NOW).key, 'tomorrow');
  assert.equal(isTaskCompleteForTeam({ completed: true }), true);
  assert.equal(isTaskCompleteForTeam({
    ...assignedByElizabeth,
    assigneeProgress: {
      'ana@crearpsl.net': { completed: true },
      'luis@crearpsl.net': { progress: 100 }
    }
  }), true);
  assert.equal(isTaskCompleteForTeam({
    ...assignedByElizabeth,
    assigneeProgress: { 'ana@crearpsl.net': { completed: true } }
  }), false);
  assert.equal(isTaskCompleteForAssignee({
    ...assignedByElizabeth,
    assigneeProgress: { 'ana@crearpsl.net': { completed: true } }
  }, 'ana@crearpsl.net'), true);
  assert.equal(isTaskCompleteForAssignee({
    ...assignedByElizabeth,
    assigneeProgress: { 'ana@crearpsl.net': { completed: true } }
  }, 'luis@crearpsl.net'), false);
});

test('summary counts task timing once and keeps tasks without deadlines separate', () => {
  const summary = getTeamTimingSummary([
    { ...assignedByElizabeth, deadline: '2026-10-08' },
    { ...assignedByElizabeth, deadline: '2026-10-09' },
    { ...assignedByElizabeth, deadline: '2026-10-10' },
    { ...assignedByElizabeth, deadline: '2026-10-12' },
    { ...assignedByElizabeth },
    { ...assignedByElizabeth, completed: true, deadline: '2026-10-08' }
  ], NOW);
  assert.deepEqual(summary, { today: 1, overdue: 1, onTime: 2, completed: 1, noDeadline: 1 });
});

test('team membership and progress come only from real assignees on assigned tasks', () => {
  const tasks = [
    {
      id: 'one',
      ...assignedByElizabeth,
      assigneeProgress: {
        'ana@crearpsl.net': { name: 'Ana', completed: true },
        'luis@crearpsl.net': { name: 'Luis', completed: false }
      }
    },
    { id: 'two', assignedToEmail: 'ana@crearpsl.net', assignedByEmail: 'contabilidad.global@crearpsl.net' }
  ];
  const team = getTeamMembers(tasks);
  assert.deepEqual(team.map(person => [person.name, person.taskCount, person.completedCount]), [
    ['Ana', 2, 1],
    ['Luis', 1, 0]
  ]);
});
