import test from 'node:test';
import assert from 'node:assert/strict';
import { createCallOperationGate } from './callOperationGate.js';

test('concurrent submissions share one call ID and a later action gets a new one', async () => {
  const gate = createCallOperationGate();
  const ids = ['call-1', 'call-2'];
  const createCallId = () => ids.shift();
  let resolveWrite;
  const operation = callId => new Promise(resolve => {
    resolveWrite = () => resolve(callId);
  });

  const first = gate.run('manager-1', createCallId, operation);
  const duplicate = gate.run('manager-1', createCallId, operation);
  assert.equal(first, duplicate);
  await Promise.resolve();
  resolveWrite();
  assert.equal(await first, 'call-1');
  assert.equal(await gate.run('manager-1', createCallId, async callId => callId), 'call-2');
});

test('a failed write retains its call ID for retry', async () => {
  const gate = createCallOperationGate();
  const ids = ['retry-stable-id', 'later-action-id'];
  const createCallId = () => ids.shift();
  const seenIds = [];

  await assert.rejects(gate.run('manager-1', createCallId, async callId => {
    seenIds.push(callId);
    throw new Error('synthetic write failure');
  }), /synthetic write failure/);

  assert.equal(await gate.run('manager-1', createCallId, async callId => {
    seenIds.push(callId);
    return callId;
  }), 'retry-stable-id');
  assert.deepEqual(seenIds, ['retry-stable-id', 'retry-stable-id']);
  assert.equal(await gate.run('manager-1', createCallId, async callId => callId), 'later-action-id');
});
