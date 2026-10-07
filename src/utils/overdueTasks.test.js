import test from 'node:test';
import assert from 'node:assert/strict';
import { getOverdueAssignedTasks } from './overdueTasks.js';

const NOW = Date.parse('2026-10-10T12:00:00Z');
const H = 3600 * 1000;
const at = (hoursAgo) => new Date(NOW - hoursAgo * H).toISOString();
const me = 'ana@crearpsl.net';
const ids = (r) => r.map(t => t.id);

test('exactly 72h is not overdue, just over is', () => {
  const r = getOverdueAssignedTasks([
    { id: 'a', assignedToEmail: me, deadline: at(72) },
    { id: 'b', assignedToEmail: me, deadline: at(72.01) }
  ], me, NOW);
  assert.deepEqual(ids(r), ['b']);
});

test('only assigned or collaborative tasks count', () => {
  const r = getOverdueAssignedTasks([
    { id: 'a', assignedToEmails: [me], deadline: at(100) },
    { id: 'b', collaborators: [me], deadline: at(100) },
    { id: 'c', assignedToEmail: 'otro@crearpsl.net', deadline: at(100) },
    { id: 'd', deadline: at(100) }
  ], me, NOW);
  assert.deepEqual(ids(r), ['a', 'b']);
});

test('respects per-assignee progress', () => {
  const r = getOverdueAssignedTasks([
    { id: 'a', assignedToEmails: [me, 'x@crearpsl.net'], deadline: at(100), completed: false,
      assigneeProgress: { [me]: { completed: true }, 'x@crearpsl.net': { completed: false } } },
    { id: 'b', assignedToEmails: [me, 'x@crearpsl.net'], deadline: at(100), completed: true,
      assigneeProgress: { [me]: { completed: false, progress: 20 } } },
    { id: 'c', assignedToEmails: [me], deadline: at(100), assigneeProgress: { [me]: { progress: 100 } } }
  ], me, NOW);
  assert.deepEqual(ids(r), ['b']);
});

test('falls back to task-level completion', () => {
  const r = getOverdueAssignedTasks([
    { id: 'a', assignedToEmail: me, deadline: at(100), status: 'Completada' },
    { id: 'b', assignedToEmail: me, deadline: at(100), completed: true },
    { id: 'c', assignedToEmail: me, deadline: at(100), status: 'Pendiente' }
  ], me, NOW);
  assert.deepEqual(ids(r), ['c']);
});

test('normalizes legacy emails', () => {
  const r = getOverdueAssignedTasks([
    { id: 'a', assignedToEmail: ' Ana@CREARPLS.com ', deadline: at(100) },
    { id: 'b', assignedToEmails: ['ana@crearpsl.com'], deadline: at(100),
      assigneeProgress: { 'ana@crearpsl.com': { completed: true } } }
  ], 'ANA@crearpsl.net', NOW);
  assert.deepEqual(ids(r), ['a']);
});

test('ignores invalid or missing deadlines and bad input', () => {
  const r = getOverdueAssignedTasks([
    { id: 'a', assignedToEmail: me },
    { id: 'b', assignedToEmail: me, deadline: 'no es fecha' },
    { id: 'c', assignedToEmail: me, deadline: '' },
    null
  ], me, NOW);
  assert.deepEqual(r, []);
  assert.deepEqual(getOverdueAssignedTasks(null, me, NOW), []);
  assert.deepEqual(getOverdueAssignedTasks([{ assignedToEmail: me, deadline: at(100) }], '', NOW), []);
});
