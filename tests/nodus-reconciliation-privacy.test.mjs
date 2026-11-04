import test from 'node:test';
import assert from 'node:assert/strict';
import { NodusDataScientistAgent } from '../scripts/nodusDataScientistAgent.mjs';

function fixture(managers) {
  const updates = [];
  const writes = [];
  const db = {
    collection: collection => ({
      get: async () => ({ forEach: fn => managers.forEach(manager => fn({
        id: manager.docId, updateTime: `version:${manager.docId}`, data: () => manager.data
      })) }),
      doc: id => ({ collection, id, set: async data => { writes.push(data); } })
    }),
    batch: () => ({
      update: (ref, data, precondition) => updates.push({ ref, data, precondition }),
      commit: async () => {}
    })
  };
  return { agent: new NodusDataScientistAgent(db), updates, writes };
}

test('hourly reconciliation joins sede + team and writes the actual document with a version precondition', async () => {
  const { agent, updates } = fixture([
    { docId: 'actual-lima', data: { id: 'foreign-id', sede: 'Lima', equipo: 'Equipo 42', coordinador: 'Before' } },
    { docId: 'actual-quito', data: { sede: 'Quito', equipo: '42', coordinador: 'Correct Quito' } },
    { docId: 'unknown', data: { equipo: '42', coordinador: 'Unknown' } }
  ]);
  await agent.reconcileManagers([
    { equipo: '42', sede: 'Lima', coordinador: 'Correct Lima' },
    { equipo: '42', sede: 'Quito', coordinador: 'Correct Quito' }
  ], []);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].ref.id, 'actual-lima');
  assert.equal(updates[0].data.coordinador, 'Correct Lima');
  assert.deepEqual(updates[0].precondition, { lastUpdateTime: 'version:actual-lima' });
});

test('ambiguous, unknown-sede and composite-number teams cannot overwrite a coordinator', async () => {
  const { agent, updates } = fixture([
    { docId: 'ambiguous', data: { sede: 'Lima', numEquipo: 42, coordinador: 'Keep' } },
    { docId: 'composite', data: { sede: 'Quito', equipo: 'C1 42', coordinador: 'Keep' } }
  ]);
  await agent.reconcileManagers([
    { equipo: '42', sede: 'Lima', coordinador: 'First' },
    { equipo: '42', sede: 'Lima', coordinador: 'Second' },
    { equipo: '42', sede: '', coordinador: 'Unscoped' },
    { equipo: '1', sede: 'Quito', coordinador: 'Wrong first number' }
  ], []);
  assert.deepEqual(updates, []);
});
