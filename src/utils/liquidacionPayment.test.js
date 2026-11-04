import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePaymentAmount, sumPaymentAmounts, updatePaidAmountInTransaction } from './liquidacionPayment.js';

const user = { email: 'andres.gomez@crearpsl.net', name: 'Director', appRole: 'director_maestria' };

test('amounts accept comma or point and at most two decimal places', () => {
  for (const [input, expected] of [[' 125,50 ', 125.5], ['0.01', 0.01], ['400', 400], ['25.5', 25.5], [12.34, 12.34]]) {
    assert.equal(parsePaymentAmount(input), expected);
  }
  for (const input of ['', ' ', null, undefined, '0', '0,00', '-5', '+5', '12.345', '12,345', '1,200.00', '1.200,00', '1e3', 'NaN', 'Infinity', '12USD', '12.', '.50', '9007199254740991']) {
    assert.throws(() => parsePaymentAmount(input), Error, String(input));
  }
});

function fixture(data) {
  const updates = [];
  const ref = { id: 'legacy-payment-id' };
  const tx = {
    async get(actualRef) {
      assert.equal(actualRef, ref);
      return { exists: () => data !== null, data: () => data };
    },
    update(actualRef, patch) {
      assert.equal(actualRef, ref);
      updates.push(patch);
    }
  };
  return { tx, ref, updates };
}

test('transaction updates only amount and editor metadata, preserving the original payment', async () => {
  const before = {
    estado: 'pagado', montoUSD: 400, fechaPago: '2026-10-01',
    pagadoPorEmail: 'original@example.test', pagadoPorNombre: 'Original',
    equipoKey: 'team', sede: 'Lima', extra: { retained: true }
  };
  const original = structuredClone(before);
  const { tx, ref, updates } = fixture(before);
  const timestamp = { serverTimestamp: true };
  const result = await updatePaidAmountInTransaction(tx, ref, '125,50', user, timestamp);
  assert.equal(result.before, before);
  assert.equal(result.montoUSD, 125.5);
  assert.deepEqual(updates, [{
    montoUSD: 125.5, montoEditadoAt: timestamp, montoEditadoPorEmail: user.email,
    montoEditadoPorNombre: user.name, montoEditadoPorRole: user.appRole
  }]);
  assert.deepEqual(before, original);
});

test('missing, reversed or deleted payments cannot be edited on transaction read/retry', async () => {
  for (const data of [null, { estado: 'pendiente' }, { estado: 'eliminado' }, {}]) {
    const { tx, ref, updates } = fixture(data);
    await assert.rejects(updatePaidAmountInTransaction(tx, ref, '25', user, 'now'), /ya no está pagado/);
    assert.equal(updates.length, 0);
  }
});

test('unauthorized users and invalid amounts never read or write a payment', async () => {
  const tx = { get() { assert.fail('must not read'); }, update() { assert.fail('must not write'); } };
  for (const actor of [null, { email: 'local@example.test', appRole: 'gerente' }, { email: 'otro@example.test', appRole: 'director_maestria' }]) {
    await assert.rejects(updatePaidAmountInTransaction(tx, {}, '25', actor, 'now'), /permiso/);
  }
  await assert.rejects(updatePaidAmountInTransaction(tx, {}, '25.001', user, 'now'), /decimales/);
});

test('transaction read/write failures propagate without a success result', async () => {
  const readError = new Error('read failed');
  await assert.rejects(updatePaidAmountInTransaction({ get: async () => { throw readError; } }, {}, '25', user, 'now'), readError);
  const { tx, ref } = fixture({ estado: 'pagado', montoUSD: 400 });
  const writeError = new Error('write failed');
  tx.update = () => { throw writeError; };
  await assert.rejects(updatePaidAmountInTransaction(tx, ref, '25', user, 'now'), writeError);
});

test('historical totals sum real amounts in cents, not payment count times a fixed fee', () => {
  assert.equal(sumPaymentAmounts([{ montoUSD: 125.5 }, { montoUSD: '25.25' }, { montoUSD: 400 }]), 550.75);
  assert.equal(sumPaymentAmounts([{ montoUSD: 0.1 }, { montoUSD: 0.2 }]), 0.3);
  assert.equal(sumPaymentAmounts([]), 0);
});
