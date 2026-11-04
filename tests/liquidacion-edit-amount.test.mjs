import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { parsePaymentAmount, updatePaidAmountInTransaction } from '../src/utils/liquidacionPayment.js';

const source = readFileSync(new URL('../src/pages/CentroManagers.jsx', import.meta.url), 'utf8');
const start = source.indexOf('  const handleEditarMontoPago = ');
const end = source.indexOf('\n  // Revertir en pantalla', start);
assert.ok(start > 0 && end > start);
const handlerSource = source.slice(start, end);

function fixture({ input = '125,50', allowed = true, state = 'pagado', audit = 'ok', transactionFails = false } = {}) {
  const toasts = [];
  const audits = [];
  const writes = [];
  const errors = [];
  const before = { estado: state, montoUSD: 450, monto: 450, fechaPago: '2026-10-01', pagadoPorEmail: 'original@example.test', sede: 'Lima' };
  const handle = runInNewContext(`(() => { ${handlerSource}; return handleEditarMontoPago; })()`, {
    canReversarPago: allowed,
    currentUser: { email: 'andres.gomez@crearpsl.net', name: 'Director', appRole: 'director_maestria' },
    window: { prompt: () => input },
    showToast: (...args) => toasts.push(args),
    console: { error: (...args) => errors.push(args) },
    db: {},
    doc: (_db, collection, id) => {
      assert.equal(collection, 'liquidaciones_pagos');
      assert.equal(id, 'actual-legacy-doc-id');
      return { id };
    },
    serverTimestamp: () => 'server-time',
    runTransaction: async (_db, callback) => {
      if (transactionFails) throw new Error('transaction rejected');
      return callback({
        get: async () => ({ exists: () => true, data: () => before }),
        update: (ref, patch) => writes.push({ ref, patch })
      });
    },
    parsePaymentAmount,
    updatePaidAmountInTransaction,
    recordAuditEvent: async event => {
      audits.push(event);
      if (audit === 'throw') throw new Error('audit unavailable');
      return { ok: audit === 'ok', error: audit === 'ok' ? undefined : new Error('audit denied') };
    }
  });
  return {
    run: () => handle({ pagoDocId: 'actual-legacy-doc-id', equipoKey: 'not-the-doc-id', montoUSD: 400, sede: 'Lima' }),
    toasts, audits, writes, errors, before
  };
}

test('editor uses the actual document ID and audits committed before/after, not stale UI values', async () => {
  const f = fixture();
  await f.run();
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].patch.montoUSD, 125.5);
  assert.equal(f.writes[0].patch.monto, 125.5);
  assert.equal(f.audits.length, 1);
  assert.equal(f.audits[0].action, 'LIQUIDACION_ENTRENADOR_MONTO_EDITADO');
  assert.equal(f.audits[0].email, 'andres.gomez@crearpsl.net');
  assert.match(f.audits[0].details, /Antes: montoUSD=450, monto=450\. Después: montoUSD=125.5, monto=125.5/);
  assert.match(f.audits[0].details, /estado=pagado, fechaPago=2026-10-01, pagadoPor=original@example.test/);
  assert.equal(f.toasts.at(-1)[1], 'success');
});

for (const audit of ['false', 'throw']) {
  test(`audit failure (${audit}) clearly reports that the amount was saved`, async () => {
    const f = fixture({ audit });
    await f.run();
    assert.equal(f.writes.length, 1);
    assert.match(f.toasts.at(-1)[0], /sí se guardó.*falló la auditoría/);
    assert.equal(f.toasts.at(-1)[1], 'warning');
    assert.equal(f.errors.length, 1);
  });
}

test('cancellation, denied access, invalid amount and changed state do not write or audit', async () => {
  for (const options of [{ input: null }, { allowed: false }, { input: '-5' }, { state: 'pendiente' }, { transactionFails: true }]) {
    const f = fixture(options);
    await f.run();
    assert.equal(f.writes.length, 0);
    assert.equal(f.audits.length, 0);
    assert.ok(!f.toasts.some(([, type]) => type === 'success'));
  }
});

test('history and consolidated totals share real-amount sums; editing is gated with reversal permission', () => {
  assert.match(source, /const totalPagadoUSD = sumPaymentAmounts\(pagados\)/);
  assert.match(source, /return sumPaymentAmounts\(filteredPagados\)/);
  assert.match(source, /canReversarPago && \(\s*<td[^>]*>\s*<HelpButton helpKey="editarMontoPago"/);
  assert.match(source, /map\[doc.id\] = \{ \.\.\.doc.data\(\), id: doc.id \}/);
});
