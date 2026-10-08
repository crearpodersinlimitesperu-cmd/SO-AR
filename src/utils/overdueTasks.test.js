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

test('task completed by current user via sede/cycle completions or status is not overdue', () => {
  const base = { assignedToEmails: [me, 'x@crearpsl.net'], deadline: at(100), assigneeProgress: { [me]: { completed: false, progress: 0 } } };
  const opts = { sede: 'Lima', cycleId: 'c1' };
  const r = getOverdueAssignedTasks([
    { id: 'a', ...base, completions: { Lima: { completed: true } } },
    { id: 'b', ...base, completions: { Lima__c1: { completed: true } } },
    { id: 'c', ...base, assigneeProgress: { [me]: { status: 'Completada' } } },
    { id: 'd', ...base, assigneeProgress: { [me]: { progressPercentage: 100 } } },
    { id: 'e', ...base, completions: { Lima: { completed: false } } },
    { id: 'f', ...base, completions: { Quito: { completed: true } } }
  ], me, NOW, opts);
  assert.deepEqual(ids(r), ['e', 'f']);
});

test('completion by another user does not hide task for other recipient', () => {
  const t = { id: 'a', assignedToEmails: [me, 'x@crearpsl.net'], deadline: at(100),
    assigneeProgress: { 'x@crearpsl.net': { completed: true }, [me]: { completed: false } } };
  assert.deepEqual(ids(getOverdueAssignedTasks([t], me, NOW)), ['a']);
  assert.deepEqual(ids(getOverdueAssignedTasks([t], 'x@crearpsl.net', NOW)), []);
});

test('user without sede matches completions written under Global', () => {
  const t = { id: 'a', assignedToEmails: [me], deadline: at(100), completed: true,
    assigneeProgress: { [me]: { completed: false } }, completions: { Global: { completed: true } } };
  assert.deepEqual(getOverdueAssignedTasks([t], me, NOW), []);
  assert.deepEqual(getOverdueAssignedTasks([t], me, NOW, { sede: '  ' }), []);
});

test('completion in any active Quito team cycle hides the alert', () => {
  const t = { id: 'a', assignedToEmails: [me], deadline: at(100),
    assigneeProgress: { [me]: { completed: false } }, completions: { Quito__q124: { completed: true } } };
  assert.deepEqual(getOverdueAssignedTasks([t], me, NOW, { sede: 'Quito', cycleId: 'c1' }).length, 1);
  assert.deepEqual(getOverdueAssignedTasks([t], me, NOW, { sede: 'Quito', cycleId: 'c1', cycleIds: ['q122', 'q124'] }), []);
});
