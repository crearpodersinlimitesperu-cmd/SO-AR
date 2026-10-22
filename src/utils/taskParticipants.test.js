import test from 'node:test';
import assert from 'node:assert/strict';
import { applyParticipantChanges, mergeParticipantStates, participantKeys, readParticipantStates } from './taskParticipants.js';

test('participant identity keeps the original legacy key across email aliases', () => {
  assert.deepEqual(participantKeys({
    assignedToEmails: ['a@crearpsl.net', 'b@example.test'],
    assigneeProgress: { 'A@crearpsl.com': { completed: true } }
  }, ['a@crearpsl.net']), ['A@crearpsl.com', 'b@example.test']);
  assert.throws(() => participantKeys({ assigneeProgress: { 'invalid/key': {} } }), /documento/);
});

test('legacy materialization preserves exact closure data and never invents actor or date', async () => {
  const legacy = { completed: true, progress: 100 };
  const result = await readParticipantStates({
    assignedToEmails: ['a@example.test', 'b@example.test'], assigneeProgress: { 'a@example.test': legacy }
  }, async () => ({ exists: false }));
  assert.deepEqual(result.records.get('a@example.test'), { exists: false, state: legacy });
  assert.deepEqual(result.task.assigneeProgress['a@example.test'], legacy);
  assert.deepEqual(result.task.assigneeProgress['b@example.test'], {});
});

test('canonical state overrides the immutable baseline without touching other participants', async () => {
  const task = { assigneeProgress: { 'a@example.test': { progress: 0 }, 'b@example.test': { progress: 30 } } };
  const result = await readParticipantStates(task, async key => ({
    exists: () => key === 'a@example.test',
    data: () => ({ state: { completed: true, progress: 100, completedAt: 'recorded-close' } })
  }));
  assert.equal(result.task.assigneeProgress['a@example.test'].completed, true);
  assert.deepEqual(result.task.assigneeProgress['b@example.test'], { progress: 30 });
  assert.deepEqual(task.assigneeProgress['a@example.test'], { progress: 0 });
});

test('canonical read errors and malformed documents never fall back to open legacy state', async () => {
  await assert.rejects(readParticipantStates({ assignedToEmails: ['a@example.test'] }, async () => {
    throw new Error('permission-denied');
  }), /permission-denied/);
  await assert.rejects(readParticipantStates({ assignedToEmails: ['a@example.test'] }, async () => ({
    exists: true, data: () => ({})
  })), /no es válido/);
  assert.throws(() => mergeParticipantStates({}, { 'a@example.test': null }), /no es válido/);
});

test('partial participant updates retain other states and resolve aliases to the existing document key', () => {
  const task = { assigneeProgress: {
    'Owner@crearpls.com': { progress: 20 }, 'other@example.test': { completed: true, progress: 100 }
  } };
  assert.deepEqual(applyParticipantChanges(task, { 'owner@crearpsl.net': { progress: 40 } }), {
    'Owner@crearpls.com': { progress: 40 }, 'other@example.test': { completed: true, progress: 100 }
  });
});

test('manual progress changes update every legacy terminal signal instead of leaving a closed status behind', () => {
  assert.deepEqual(applyParticipantChanges({ assigneeProgress: { 'a@example.test': {
    status: 'Completada', progressPercentage: 100
  } } }, { 'a@example.test': { completed: false, progress: 0 } }), {
    'a@example.test': { completed: false, progress: 0, progressPercentage: 0, status: 'Pendiente' }
  });
});
