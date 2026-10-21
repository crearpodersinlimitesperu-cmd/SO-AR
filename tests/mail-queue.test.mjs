import test from 'node:test';
import assert from 'node:assert/strict';
import { claimPendingMail, selectMailAction, STALE_REASON } from '../scripts/mailQueue.js';

const now = Date.parse('2026-10-09T15:00:00Z');
const cutoff = now - 48 * 60 * 60 * 1000;

test('selects PENDING and legacy documents without a state', () => {
  for (const delivery of [undefined, {}, { state: '' }, { state: null }, { state: 'PENDING' }]) {
    assert.equal(selectMailAction({ delivery }, now), 'SENDING');
  }
  for (const state of ['SENDING', 'SUCCESS', 'ERROR', 'REJECTED', 'SKIPPED_STALE']) {
    assert.equal(selectMailAction({ delivery: { state } }, now), null);
  }
});

test('skips only the two stale task alert types, for ISO and Timestamp dates', () => {
  for (const type of ['task_overdue_assigner_alert', 'task_completed_alert']) {
    for (const delivery of [undefined, { state: 'PENDING' }]) {
      for (const createdAt of [
        new Date(cutoff - 1).toISOString(),
        { toDate: () => new Date(cutoff - 1) }
      ]) {
        assert.equal(selectMailAction({ type, delivery, createdAt }, now), 'SKIPPED_STALE');
      }
      for (const timestamp of [cutoff, cutoff + 1, now + 1]) {
        assert.equal(selectMailAction({
          type, delivery, createdAt: new Date(timestamp).toISOString()
        }, now), 'SENDING');
      }
    }
  }
  for (const type of ['operational_broadcast', 'task_reminder', 'imo_welcome', undefined]) {
    assert.equal(selectMailAction({
      type, delivery: { state: 'PENDING' }, createdAt: new Date(cutoff - 1).toISOString()
    }, now), 'SENDING');
  }
});

test('does not infer staleness from missing or invalid dates or reselect terminal states', () => {
  for (const createdAt of [undefined, null, '', 'invalid']) {
    assert.equal(selectMailAction({
      type: 'task_completed_alert', createdAt, delivery: { state: 'PENDING' }
    }, now), 'SENDING');
  }
  assert.equal(selectMailAction({
    type: 'task_completed_alert', createdAt: new Date(cutoff - 1).toISOString(),
    delivery: { state: 'SUCCESS' }
  }, now), null);
});

function fakeFirestore(initialData) {
  let data = initialData;
  let tail = Promise.resolve();
  const updates = [];
  const ref = {};
  return {
    ref, updates,
    db: {
      runTransaction(callback) {
        const result = tail.then(() => callback({
          async get(actualRef) {
            assert.equal(actualRef, ref);
            return { exists: data !== null, data: () => data };
          },
          update(actualRef, update) {
            assert.equal(actualRef, ref);
            updates.push(update);
            data = { ...data, delivery: { ...data.delivery, state: update['delivery.state'] } };
          }
        }));
        tail = result;
        return result;
      }
    }
  };
}

test('overlapping claims reserve a pending mail exactly once before sending', async () => {
  const { db, ref, updates } = fakeFirestore({ delivery: { state: 'PENDING' } });
  const results = await Promise.all([
    claimPendingMail(db, ref, now), claimPendingMail(db, ref, now)
  ]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(results[0].state, 'SENDING');
  assert.deepEqual(updates, [{
    'delivery.state': 'SENDING', 'delivery.startTime': new Date(now).toISOString()
  }]);
});

test('stale claims persist the reason without entering SENDING', async () => {
  const { db, ref, updates } = fakeFirestore({
    delivery: { state: 'PENDING' }, type: 'task_completed_alert',
    createdAt: new Date(cutoff - 1).toISOString()
  });
  assert.equal((await claimPendingMail(db, ref, now)).state, 'SKIPPED_STALE');
  assert.equal(await claimPendingMail(db, ref, now), null);
  assert.deepEqual(updates, [{
    'delivery.state': 'SKIPPED_STALE',
    'delivery.endTime': new Date(now).toISOString(),
    'delivery.reason': STALE_REASON
  }]);
});

test('deleted documents and transaction failures never produce a send claim', async () => {
  const { db, ref } = fakeFirestore(null);
  assert.equal(await claimPendingMail(db, ref, now), null);
  await assert.rejects(claimPendingMail({
    runTransaction: async () => { throw new Error('transaction failed'); }
  }, ref, now), /transaction failed/);
});
