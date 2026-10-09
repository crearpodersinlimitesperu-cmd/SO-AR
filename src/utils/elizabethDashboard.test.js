import test from 'node:test';
import assert from 'node:assert/strict';
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
