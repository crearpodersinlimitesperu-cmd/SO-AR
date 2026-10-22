import test from 'node:test';
import assert from 'node:assert/strict';
import {
  claimPendingMail,
  createTaskMailId,
  enqueueOverdueTaskMails,
  MAIL_CLAIM_LEASE_MS,
  MAX_MAIL_ATTEMPTS,
  recordMailFailure,
  recordMailSuccess,
  recordMailUnknown,
  selectMailAction,
  skipTaskMailIfClosed,
  STALE_REASON
} from '../scripts/mailQueue.js';

const now = Date.parse('2026-10-09T15:00:00Z');
const cutoff = now - 48 * 60 * 60 * 1000;

function fakeFirestore(initial = {}) {
  const docs = new Map(Object.entries(initial));
  let tail = Promise.resolve();
  const updates = [];
  const applyUpdate = (path, fields) => {
    const current = structuredClone(docs.get(path) || {});
    for (const [fieldPath, value] of Object.entries(fields)) {
      const parts = fieldPath.split('.');
      let cursor = current;
      for (const part of parts.slice(0, -1)) cursor = cursor[part] ??= {};
      cursor[parts.at(-1)] = value;
    }
    docs.set(path, current);
  };
  const ref = path => ({
    path,
    async get() {
      const data = docs.get(path);
      return { exists: data !== undefined, data: () => structuredClone(data) };
    },
    async update(fields) {
      updates.push({ path, fields });
      applyUpdate(path, fields);
    }
  });
  const db = {
    collection(name) {
      return { doc: id => ref(`${name}/${id}`) };
    },
    runTransaction(callback) {
      const result = tail.then(() => callback({
        async get(actualRef) {
          const data = docs.get(actualRef.path);
          return { exists: data !== undefined, data: () => structuredClone(data) };
        },
        update(actualRef, fields) {
          updates.push({ path: actualRef.path, fields });
          applyUpdate(actualRef.path, fields);
        },
        set(actualRef, data) {
          docs.set(actualRef.path, structuredClone(data));
        }
      }));
      tail = result;
      return result;
    }
  };
  return { db, docs, updates, ref };
}

test('selects pending and legacy documents, but never terminal or active leases', () => {
  for (const delivery of [undefined, {}, { state: '' }, { state: null }, { state: 'PENDING' }]) {
    assert.equal(selectMailAction({ delivery }, now), 'SENDING');
  }
  for (const state of ['SUCCESS', 'REJECTED', 'SKIPPED_STALE', 'SKIPPED_CLOSED', 'DELIVERY_UNKNOWN']) {
    assert.equal(selectMailAction({ delivery: { state } }, now), null);
  }
  assert.equal(selectMailAction({
    delivery: { state: 'SENDING', leaseExpiresAt: new Date(now + 1).toISOString() }
  }, now), null);
  assert.equal(selectMailAction({
    delivery: { state: 'SENDING', leaseExpiresAt: new Date(now - 1).toISOString() }
  }, now), 'LEASE_EXPIRED');
});

test('skips stale alerts without applying the stale policy to unrelated mail', () => {
  for (const type of ['task_overdue_assigner_alert', 'task_completed_alert']) {
    for (const createdAt of [
      new Date(cutoff - 1).toISOString(),
      { toDate: () => new Date(cutoff - 1) }
    ]) {
      assert.equal(selectMailAction({ type, createdAt, delivery: { state: 'PENDING' } }, now), 'SKIPPED_STALE');
    }
    for (const timestamp of [cutoff, cutoff + 1, now + 1]) {
      assert.equal(selectMailAction({
        type, createdAt: new Date(timestamp).toISOString(), delivery: { state: 'PENDING' }
      }, now), 'SENDING');
    }
  }
  assert.equal(selectMailAction({
    type: 'operational_broadcast',
    createdAt: new Date(cutoff - 1).toISOString(),
    delivery: { state: 'PENDING' }
  }, now), 'SENDING');
});

test('does not infer staleness from invalid dates or reselect terminal states', () => {
  for (const createdAt of [undefined, null, '', 'invalid']) {
    assert.equal(selectMailAction({
      type: 'task_completed_alert', createdAt, delivery: { state: 'PENDING' }
    }, now), 'SENDING');
  }
  assert.equal(selectMailAction({
    type: 'task_completed_alert',
    createdAt: new Date(cutoff - 1).toISOString(),
    delivery: { state: 'SUCCESS' }
  }, now), null);
});

test('overlapping claims increment the attempt count once and use one lease', async () => {
  const { db, ref, docs } = fakeFirestore({ 'mail/a': { delivery: { state: 'PENDING' } } });
  const mailRef = ref('mail/a');
  const results = await Promise.all([
    claimPendingMail(db, mailRef, now), claimPendingMail(db, mailRef, now)
  ]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(results.find(Boolean).state, 'SENDING');
  assert.equal(docs.get('mail/a').delivery.attemptCount, 1);
  assert.equal(
    Date.parse(docs.get('mail/a').delivery.leaseExpiresAt),
    now + MAIL_CLAIM_LEASE_MS
  );
});

test('a closed cycle suppresses only mail for that cycle and records the observed closure', async () => {
  const { db, ref, docs } = fakeFirestore({
    'mail/cycle-one': {
      type: 'task_reminder', taskId: 'catalog', completionScope: { sede: 'Lima', cycleId: 'one' },
      delivery: { state: 'PENDING' }
    },
    'mail/cycle-two': {
      type: 'task_reminder', taskId: 'catalog', completionScope: { sede: 'Lima', cycleId: 'two' },
      delivery: { state: 'PENDING' }
    },
    'tasks/catalog': {
      completed: false, status: 'Pendiente',
      completions: {
        'Lima__one': { completed: true, completedAt: 'recorded' },
        'Lima__two': { completed: false }
      }
    }
  });
  const closed = await claimPendingMail(db, ref('mail/cycle-one'), now);
  const open = await claimPendingMail(db, ref('mail/cycle-two'), now);
  assert.equal(closed.state, 'SKIPPED_CLOSED');
  assert.equal(docs.get('mail/cycle-one').delivery.taskStateObserved, 'closed');
  assert.equal(docs.get('mail/cycle-one').delivery.skippedAt, new Date(now).toISOString());
  assert.equal(open.state, 'SENDING');
});

test('the pre-SMTP recheck suppresses a task closed after claim and leaves unrelated mail alone', async () => {
  const { db, ref, docs } = fakeFirestore({
    'mail/race': {
      type: 'task_reminder',
      taskId: 'task',
      recipientEmail: 'owner@example.test',
      delivery: { state: 'PENDING' }
    },
    'mail/broadcast': {
      type: 'operational_broadcast',
      delivery: { state: 'SENDING', attemptCount: 1 }
    },
    'tasks/task': { completed: false, status: 'Pendiente' }
  });
  const claim = await claimPendingMail(db, ref('mail/race'), now);
  assert.equal(claim.state, 'SENDING');

  docs.set('tasks/task', { completed: true, status: 'Completada' });
  assert.equal(
    await skipTaskMailIfClosed(db, ref('mail/race'), claim.data, ['owner@example.test'], now + 1),
    'SKIPPED_CLOSED'
  );
  assert.equal(docs.get('mail/race').delivery.state, 'SKIPPED_CLOSED');
  assert.equal(docs.get('mail/race').delivery.taskStateObserved, 'closed');
  assert.equal(
    await skipTaskMailIfClosed(db, ref('mail/broadcast'), docs.get('mail/broadcast'), ['ops@example.test'], now + 2),
    false,
    'non-task-bound mail bypasses task lifecycle suppression'
  );
  assert.equal(docs.get('mail/broadcast').delivery.state, 'SENDING');
});

test('global closure suppresses task-bound mail, and completion alerts never send', async () => {
  const { db, ref, docs } = fakeFirestore({
    'mail/closed': { type: 'task_assignment', taskId: 'task', delivery: { state: 'PENDING' } },
    'mail/completion': { type: 'task_completed_alert', taskId: 'open', delivery: { state: 'PENDING' } },
    'tasks/task': { completed: true, status: 'Completada' },
    'tasks/open': { completed: false, status: 'Pendiente' }
  });
  assert.equal((await claimPendingMail(db, ref('mail/closed'), now)).state, 'SKIPPED_CLOSED');
  assert.equal((await claimPendingMail(db, ref('mail/completion'), now)).state, 'SKIPPED_POLICY');
  assert.equal(docs.get('mail/completion').delivery.state, 'SKIPPED_POLICY');
});

test('unlinked task mail is terminally skipped instead of bypassing lifecycle checks', async () => {
  const { db, ref, docs } = fakeFirestore({
    'mail/legacy': { type: 'task_reminder', delivery: { state: 'PENDING' } }
  });
  assert.equal((await claimPendingMail(db, ref('mail/legacy'), now)).state, 'SKIPPED_UNLINKED_TASK');
  assert.equal(docs.get('mail/legacy').delivery.state, 'SKIPPED_UNLINKED_TASK');
});

test('cycle-bound task mail without a cycle scope is skipped instead of assuming global closure', async () => {
  const { db, ref, docs } = fakeFirestore({
    'mail/unscoped-cycle': {
      type: 'task_reminder', taskId: 'catalog', delivery: { state: 'PENDING' }
    },
    'tasks/catalog': {
      completed: false, status: 'Pendiente',
      completions: { 'Lima__cycle-1': { completed: true } }
    }
  });
  assert.equal((await claimPendingMail(db, ref('mail/unscoped-cycle'), now)).state, 'SKIPPED_SCOPE_UNKNOWN');
  assert.equal(docs.get('mail/unscoped-cycle').delivery.state, 'SKIPPED_SCOPE_UNKNOWN');
});

test('stale claims persist reason and terminal state', async () => {
  const { db, ref, docs } = fakeFirestore({
    'mail/stale': {
      delivery: { state: 'PENDING' },
      type: 'task_overdue_assigner_alert',
      createdAt: new Date(cutoff - 1).toISOString()
    }
  });
  assert.equal((await claimPendingMail(db, ref('mail/stale'), now)).state, 'SKIPPED_STALE');
  assert.equal(await claimPendingMail(db, ref('mail/stale'), now), null);
  assert.equal(docs.get('mail/stale').delivery.reason, STALE_REASON);
});

test('transport failures retry with a persistent cap and terminal exhaustion state', async () => {
  const { db, ref, docs } = fakeFirestore({ 'mail/retry': { delivery: { state: 'PENDING' } } });
  for (let attempt = 1; attempt <= MAX_MAIL_ATTEMPTS; attempt += 1) {
    const claim = await claimPendingMail(db, ref('mail/retry'), now + attempt * 10 * 60 * 1000);
    assert.equal(claim.attemptCount, attempt);
    const result = await recordMailFailure(db, ref('mail/retry'), { code: 'ECONNRESET' }, now + attempt * 10 * 60 * 1000);
    assert.equal(result.attempts, attempt);
    assert.equal(result.exhausted, attempt === MAX_MAIL_ATTEMPTS);
  }
  assert.equal(docs.get('mail/retry').delivery.attemptCount, MAX_MAIL_ATTEMPTS);
  assert.ok(docs.get('mail/retry').delivery.exhaustedAt);
  assert.equal(selectMailAction(docs.get('mail/retry'), now + 10 * 60 * 60 * 1000), null);
});

test('an expired claim becomes DELIVERY_UNKNOWN and cannot be blindly resent', async () => {
  const { db, ref, docs } = fakeFirestore({
    'mail/ambiguous': {
      delivery: { state: 'SENDING', attemptCount: 1, leaseExpiresAt: new Date(now - 1).toISOString() }
    }
  });
  assert.equal((await claimPendingMail(db, ref('mail/ambiguous'), now)).state, 'DELIVERY_UNKNOWN');
  assert.equal(await claimPendingMail(db, ref('mail/ambiguous'), now + MAIL_CLAIM_LEASE_MS), null);
});

test('ambiguous SMTP acceptance is terminal even when the provider error lacks a response', async () => {
  const { db, ref, docs } = fakeFirestore({
    'mail/unknown': { delivery: { state: 'SENDING', attemptCount: 1 } }
  });
  assert.equal(await recordMailUnknown(db, ref('mail/unknown'), { code: 'ETIMEDOUT' }, now), true);
  assert.equal(docs.get('mail/unknown').delivery.state, 'DELIVERY_UNKNOWN');
  assert.equal(selectMailAction(docs.get('mail/unknown'), now + 100 * MAIL_CLAIM_LEASE_MS), null);
});

test('confirmed SMTP delivery persists SUCCESS transactionally; failed confirmation stays leased', async () => {
  const { db, ref, docs } = fakeFirestore({
    'mail/success': { delivery: { state: 'SENDING', attemptCount: 1 } }
  });
  assert.equal(await recordMailSuccess(db, ref('mail/success'), now), true);
  assert.equal(docs.get('mail/success').delivery.state, 'SUCCESS');

  const { db: failingDb, ref: failingRef } = fakeFirestore({
    'mail/ambiguous-success': {
      delivery: { state: 'SENDING', attemptCount: 1, leaseExpiresAt: new Date(now + MAIL_CLAIM_LEASE_MS).toISOString() }
    }
  });
  await assert.rejects(recordMailSuccess({
    runTransaction: async () => { throw new Error('confirmation write failed'); }
  }, failingRef('mail/ambiguous-success'), now), /confirmation write failed/);
  assert.equal(await claimPendingMail(failingDb, failingRef('mail/ambiguous-success'), now), null);
  assert.equal((await claimPendingMail(
    failingDb, failingRef('mail/ambiguous-success'), now + MAIL_CLAIM_LEASE_MS
  )).state, 'DELIVERY_UNKNOWN');
});

test('deterministic task mail IDs include normalized recipient and debounce bucket', () => {
  assert.equal(createTaskMailId('task-1', 'task_reminder', 'USER@example.test', 4),
    createTaskMailId('task-1', 'task_reminder', 'user@example.test', 4));
  assert.notEqual(createTaskMailId('task-1', 'task_reminder', 'user@example.test', 4),
    createTaskMailId('task-1', 'task_reminder', 'user@example.test', 5));
});

test('overdue enqueue is transactionally deduplicated and updates debounce only when queued', async () => {
  const { db, ref, docs } = fakeFirestore({
    'tasks/overdue': {
      deadline: new Date(now - 25 * 60 * 60 * 1000).toISOString(),
      completed: false,
      lastReminderAt: null
    }
  });
  const taskRef = ref('tasks/overdue');
  const entry = {
    id: createTaskMailId('overdue', 'task_reminder', 'owner@example.test', 1),
    data: { taskId: 'overdue', recipientEmail: 'owner@example.test', type: 'task_reminder' }
  };
  const results = await Promise.all([
    enqueueOverdueTaskMails(db, taskRef, [entry], now, new Date(now).toISOString()),
    enqueueOverdueTaskMails(db, taskRef, [entry], now, new Date(now).toISOString())
  ]);
  assert.equal(results.reduce((sum, item) => sum + item.queued, 0), 1);
  assert.ok(docs.get('tasks/overdue').lastReminderAt);
  assert.ok(docs.has(`mail/${entry.id}`));
});

test('overdue enqueue respects cycle completion without globally suppressing another cycle', async () => {
  const { db, ref, docs } = fakeFirestore({
    'tasks/catalog': {
      deadline: new Date(now - 25 * 60 * 60 * 1000).toISOString(),
      completed: true,
      completions: {
        'Lima__one': { completed: true },
        'Lima__two': { completed: false }
      }
    }
  });
  const taskRef = ref('tasks/catalog');
  const entries = [
    {
      id: 'cycle-one',
      data: { taskId: 'catalog', type: 'task_reminder', recipientEmail: 'one@example.test',
        completionScope: { sede: 'Lima', cycleId: 'one' } }
    },
    {
      id: 'cycle-two',
      data: { taskId: 'catalog', type: 'task_reminder', recipientEmail: 'two@example.test',
        completionScope: { sede: 'Lima', cycleId: 'two' } }
    }
  ];
  const result = await enqueueOverdueTaskMails(db, taskRef, entries, now, new Date(now).toISOString());
  assert.deepEqual(result, { queued: 1, reason: 'queued' });
  assert.equal(docs.has('mail/cycle-one'), false);
  assert.equal(docs.has('mail/cycle-two'), true);
});

test('overdue enqueue leaves debounce untouched when the cycle scope is ambiguous', async () => {
  const { db, ref, docs } = fakeFirestore({
    'tasks/catalog-unknown': {
      deadline: new Date(now - 25 * 60 * 60 * 1000).toISOString(),
      completed: false,
      completions: { 'Lima__cycle-1': { completed: true } }
    }
  });
  const result = await enqueueOverdueTaskMails(
    db,
    ref('tasks/catalog-unknown'),
    [{ id: 'unscoped', data: { taskId: 'catalog-unknown', type: 'task_reminder' } }],
    now,
    new Date(now).toISOString()
  );
  assert.deepEqual(result, { queued: 0, reason: 'scope_unknown' });
  assert.equal(docs.get('tasks/catalog-unknown').lastReminderAt, undefined);
});

test('missing documents and transaction failures never produce a send claim', async () => {
  const { db, ref } = fakeFirestore();
  assert.equal(await claimPendingMail(db, ref('mail/missing'), now), null);
  await assert.rejects(claimPendingMail({
    runTransaction: async () => { throw new Error('transaction failed'); }
  }, ref('mail/failure'), now), /transaction failed/);
});
