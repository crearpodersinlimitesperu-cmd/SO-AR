import test from 'node:test';
import assert from 'node:assert/strict';
import { createCycleCompletion, getEffectiveCompletion, getNextCompletionState, isCompletionTransition } from './taskLifecycle.js';

test('catalog tasks use the active cycle and never inherit legacy completion', () => {
  const task = {
    completed: true,
    status: 'Completada',
    completions: {
      Lima: { completed: true, status: 'Completada' },
      'Lima__cycle-1': { completed: true, status: 'Completada' }
    }
  };

  assert.deepEqual(
    getEffectiveCompletion(task, { sede: 'Lima', cycleId: 'cycle-2', cycleScoped: true }),
    { completed: false, status: 'Pendiente', completion: null }
  );
  assert.equal(
    getEffectiveCompletion(task, { sede: 'Lima', cycleId: 'cycle-1', cycleScoped: true }).completed,
    true
  );
});

test('unscoped custom tasks retain sede and legacy completion behavior', () => {
  assert.equal(
    getEffectiveCompletion({ completions: { Lima: { completed: true } } }, { sede: 'Lima' }).completed,
    true
  );
  assert.equal(
    getEffectiveCompletion({ completed: true }, { sede: 'Quito' }).completed,
    true
  );
});

test('completion notifications are reserved for pending-to-complete transitions', () => {
  assert.equal(isCompletionTransition(false, true), true);
  assert.equal(isCompletionTransition(undefined, true), true);
  assert.equal(isCompletionTransition(true, true), false);
  assert.equal(isCompletionTransition(true, false), false);
});

test('progress-only updates to 100% complete the task', () => {
  assert.equal(getNextCompletionState({ progressPercentage: 100 }), true);
  assert.equal(getNextCompletionState({ progress: 100 }), true);
  assert.equal(getNextCompletionState({ completed: true, progress: 30 }), true);
  assert.equal(getNextCompletionState({ completed: false, progressPercentage: 100 }), false);
  assert.equal(getNextCompletionState({ progressPercentage: 99 }), false);
});

test('cycle completion entries retain cycle identity and audit metadata', () => {
  const completed = createCycleCompletion(
    { completed: false, cycleName: 'Old cycle' },
    { cycle: { id: 'cycle-9', name: 'Cycle 9' }, completed: true, updatedAt: '2026-10-07T00:00:00Z', completionId: 'event-1' }
  );
  assert.deepEqual(completed, {
    completed: true,
    status: 'Completada',
    cycleId: 'cycle-9',
    cycleName: 'Cycle 9',
    updatedAt: '2026-10-07T00:00:00Z',
    completedAt: '2026-10-07T00:00:00Z',
    completionId: 'event-1'
  });
});
