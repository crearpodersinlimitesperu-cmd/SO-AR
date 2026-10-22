import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCycleCompletion, createCycleCompletion, getEffectiveCompletion, getNextCompletionState, getTaskProgress, hasAmbiguousCycleCompletionScope, isCompletionTransition, isTaskClosedForDelivery, preserveClosedAssigneeProgress, resolveTaskCycleScope } from './taskLifecycle.js';

test('catalog writes require a non-empty cycle ID and sede, including omitted scope', () => {
  for (const cycle of [undefined, null, {}, { name: 'Sin Equipo Activo' }, { id: '' }, { id: '  ' }, { id: 7 }]) {
    assert.throws(() => resolveTaskCycleScope({}, { catalogTask: true, sede: 'Lima', cycle }), /Espera a que cargue el ciclo/);
  }
  assert.throws(() => resolveTaskCycleScope({}, { catalogTask: true }), /Espera a que cargue el ciclo/);
  const cycle = { id: 'synthetic-cycle', name: 'Fixture' };
  assert.throws(() => resolveTaskCycleScope({}, { catalogTask: true, sede: ' ', cycle }), /Espera a que cargue el ciclo/);
  assert.deepEqual(resolveTaskCycleScope({}, { catalogTask: true, sede: 'Lima', cycle }), { sede: 'Lima', cycle });
});

test('personal and directly assigned tasks do not require a cycle even with catalog IDs', () => {
  assert.equal(resolveTaskCycleScope({}), null);
  for (const task of [{ isCustom: true }, { assignedToEmail: 'fixture@example.test' }, { assignedToEmails: ['fixture@example.test'] }]) {
    assert.equal(resolveTaskCycleScope(task, { catalogTask: true }), null);
    assert.equal(resolveTaskCycleScope(task, {
      catalogTask: true, sede: 'Lima', cycle: { id: 'unused' }
    }), null);
  }
  assert.throws(() => resolveTaskCycleScope({ assignedToEmails: [] }, { catalogTask: true }), /ciclo/);
});

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

test('delivery suppression respects cycle, assignee, and global completion scopes', () => {
  const task = {
    completed: false,
    completions: {
      'Lima__cycle-1': { completed: true },
      'Lima__cycle-2': { completed: false }
    },
    assigneeProgress: {
      'one@crearpsl.net': { completed: true },
      'two@crearpsl.net': { completed: false }
    }
  };
  assert.equal(isTaskClosedForDelivery(task, { completionScope: { sede: 'Lima', cycleId: 'cycle-1' } }), true);
  assert.equal(isTaskClosedForDelivery(task, { completionScope: { sede: 'Lima', cycleId: 'cycle-2' } }), false);
  assert.equal(isTaskClosedForDelivery(task, {
    completionScope: { sede: 'Lima', cycleId: 'cycle-2' }, recipientEmail: 'one@crearpsl.net'
  }), true, 'a recipient completion also suppresses mail for that recipient');
  assert.equal(isTaskClosedForDelivery(task, {
    completionScope: { sede: 'Lima', cycleId: 'cycle-2' }, recipientEmail: 'two@crearpsl.net'
  }), false);
  assert.equal(isTaskClosedForDelivery(task, { recipientEmail: 'one@crearpls.com' }), true);
  assert.equal(isTaskClosedForDelivery(task, { recipientEmail: 'two@crearpsl.net' }), false);
  assert.equal(isTaskClosedForDelivery(task), false, 'another cycle completion does not close the global task');
  assert.equal(isTaskClosedForDelivery({ completed: true }, { completionScope: { sede: 'Lima', cycleId: 'cycle-2' } }), false);
});

test('delivery requires explicit scope when a task has cycle completions', () => {
  const task = { completed: true, completions: { 'Lima__cycle-1': { completed: true } } };
  assert.equal(hasAmbiguousCycleCompletionScope(task), true);
  assert.equal(hasAmbiguousCycleCompletionScope(task, {
    completionScope: { sede: 'Lima', cycleId: 'cycle-2' }
  }), false);
  assert.equal(hasAmbiguousCycleCompletionScope({ completions: { Lima: { completed: true } } }), false);
});

test('stale assignee updates preserve only still-assigned closed entries and their recorded closure', () => {
  const merged = preserveClosedAssigneeProgress({
    'owner@crearpsl.net': {
      completed: true, status: 'Completada', progress: 100,
      completedAt: 'recorded-close', completionId: 'event-1'
    },
    'open@crearpsl.net': { completed: false, progress: 20 },
    'former@crearpsl.net': { completed: true, status: 'Completada', progress: 100 },
    'legacy-closed@crearpsl.net': { completed: true, status: 'Completada', progress: 100 }
  }, {
    'owner@crearpsl.com': { completed: false, status: 'Pendiente', progress: 25, completedAt: null },
    'open@crearpsl.net': { completed: false, progress: 50 },
    'removed@crearpsl.net': { completed: false, progress: 0 },
    'legacy-closed@crearpsl.net': { completed: false, status: 'Pendiente', progress: 0, completedAt: 'unverified-new-date' }
  });

  assert.deepEqual(merged['owner@crearpsl.com'], {
    completed: true, status: 'Completada', progress: 100,
    completedAt: 'recorded-close', completionId: 'event-1'
  });
  assert.deepEqual(merged['open@crearpsl.net'], { completed: false, progress: 50 });
  assert.equal('removed@crearpsl.net' in merged, true);
  assert.equal('former@crearpsl.net' in merged, false);
  assert.equal(merged['legacy-closed@crearpsl.net'].completed, true);
  assert.equal('completedAt' in merged['legacy-closed@crearpsl.net'], false,
    'missing historical close time is not inferred from a later save');
});

test('progress-only updates to 100% complete the task', () => {
  assert.equal(getNextCompletionState({ progressPercentage: 100 }), true);
  assert.equal(getNextCompletionState({ progress: 100 }), true);
  assert.equal(getNextCompletionState({ completed: true, progress: 30 }), true);
  assert.equal(getNextCompletionState({ completed: false, progressPercentage: 100 }), false);
  assert.equal(getNextCompletionState({ progressPercentage: 99 }), false);
  assert.equal(getNextCompletionState({ status: 'Pendiente de validación' }), null);
  assert.equal(getNextCompletionState({ comments: 'Evidence saved' }), null);
});

test('cycle completion entries retain cycle identity and audit metadata', () => {
  const completed = createCycleCompletion(
    { completed: false, cycleName: 'Old cycle' },
    { cycle: { id: 'cycle-9', name: 'Cycle 9' }, completed: true, updatedAt: '2026-10-07T00:00:00Z', completionId: 'event-1' }
  );
  assert.deepEqual(completed, {
    completed: true,
    status: 'Completada',
    progressPercentage: 100,
    progress: 100,
    cycleId: 'cycle-9',
    cycleName: 'Cycle 9',
    updatedAt: '2026-10-07T00:00:00Z',
    completedAt: '2026-10-07T00:00:00Z',
    completionId: 'event-1'
  });
});

test('partial progress survives serialization and reopening in the same cycle', () => {
  for (const progressPercentage of [0, 25, 50, 75, 100]) {
    const completion = createCycleCompletion({}, {
      cycle: { id: 'cycle-1', name: 'First' },
      completed: progressPercentage === 100,
      updatedAt: '2026-10-14T00:00:00Z',
      completionId: 'event-1',
      updates: { progressPercentage }
    });
    const stored = JSON.parse(JSON.stringify({
      progressPercentage: 0,
      completions: { 'Lima__cycle-1': completion }
    }));
    const reopened = applyCycleCompletion(stored, { sede: 'Lima', cycleId: 'cycle-1' });
    assert.equal(getTaskProgress(reopened), progressPercentage);
    assert.equal(reopened.completed, progressPercentage === 100);
    assert.equal(reopened.status, progressPercentage === 100 ? 'Completada' : (progressPercentage > 0 ? 'En progreso' : 'Pendiente'));
    assert.equal(getTaskProgress(applyCycleCompletion(stored, { sede: 'Lima', cycleId: 'cycle-2' })), 0);
    assert.equal(getTaskProgress(applyCycleCompletion(stored, { sede: 'Quito', cycleId: 'cycle-1' })), 0);
  }
});

test('Quito teams keep independent progress and custom/global tasks retain root progress', () => {
  const task = { progressPercentage: 90, completions: {
    'Quito__team-1': { completed: false, progressPercentage: 25 },
    'Quito__team-2': { completed: false, progress: 75 }
  } };
  assert.equal(getTaskProgress(applyCycleCompletion(task, { sede: 'Quito', cycleId: 'team-1' })), 25);
  assert.equal(getTaskProgress(applyCycleCompletion(task, { sede: 'Quito', cycleId: 'team-2' })), 75);
  assert.equal(getTaskProgress({ isCustom: true, progress: 50 }), 50);
  assert.equal(getTaskProgress({ assignedToEmail: 'synthetic@example.test', progressPercentage: 75 }), 75);
});

test('legacy single-cycle root progress is retained but ambiguous multi-cycle progress is not inherited', () => {
  const task = { progressPercentage: 50, completions: { 'Lima__one': { completed: false } } };
  assert.equal(getTaskProgress(applyCycleCompletion(task, { sede: 'Lima', cycleId: 'one' })), 50);
  task.completions['Lima__two'] = { completed: false };
  assert.equal(getTaskProgress(applyCycleCompletion(task, { sede: 'Lima', cycleId: 'two' })), 0);
});

test('editing a completed cycle retains its original completion timestamp', () => {
  const entry = createCycleCompletion({ completedAt: 'original' }, {
    completed: true, updatedAt: 'later', updates: { progressPercentage: 100 }
  });
  assert.equal(entry.completedAt, 'original');
});
