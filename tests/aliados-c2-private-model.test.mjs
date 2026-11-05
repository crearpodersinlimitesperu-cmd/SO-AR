import test from 'node:test';
import assert from 'node:assert/strict';
import { nextRecord, preparationIds } from '../prototypes/aliados-c2/private/recordModel.js';

test('explicit actions preserve unrelated agreements and advance revisions', () => {
  let state = nextRecord(null, { kind: 'check', target: 'tecnica' });
  assert.deepEqual(state, { completed: ['tecnica'], revision: 1, previousRevision: 0 });
  state = nextRecord(state, { kind: 'check', target: 'espacio' });
  state = nextRecord(state, { kind: 'check', target: 'tecnica' });
  assert.deepEqual(state.completed, ['tecnica', 'espacio']);
  state = nextRecord(state, { kind: 'uncheck', target: 'tecnica' });
  assert.deepEqual(state.completed, ['espacio']);
  state = nextRecord(state, { kind: 'phase', target: 'entrenamiento' });
  assert.equal(state.revision, 5);
  assert.deepEqual(state.completed, ['espacio']);
  state = nextRecord(state, { kind: 'reset', target: 'preparation' });
  assert.deepEqual(state.completed, []);
});

test('invalid state and input cannot become success-shaped records', () => {
  for (const previous of [
    { completed: ['foreign'], revision: 2 },
    { completed: ['tecnica', 'tecnica'], revision: 2 },
    { completed: [], revision: -1 },
  ]) assert.throws(() => nextRecord(previous, { kind: 'reset', target: 'preparation' }));
  for (const action of [
    { kind: 'check', target: 'other-user' },
    { kind: 'phase', target: 'secret' },
    { kind: 'reference', target: '100' },
    { kind: 'reset', target: 'someone-else' },
    { kind: 'delete', target: 'preparation' },
  ]) assert.throws(() => nextRecord(null, action));
  assert.deepEqual(nextRecord({ completed: preparationIds, revision: 9 }, {
    kind: 'reference', target: '0',
  }).completed, preparationIds);
});
