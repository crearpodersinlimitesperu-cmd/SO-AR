import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = { coordinadores: [], sedes: [], equiposSummary: [] };
function fixture(fetchResult = async () => ({ ok: true, json: async () => ({ snapshot: data }) })) {
  const requests = [];
  const auth = { currentUser: { uid: 'first', getIdToken: async () => 'synthetic-only' } };
  const source = readFileSync(new URL('../src/services/privateNodusSnapshot.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?$/gm, '').replace(/^export /gm, '').replace('import.meta.env', '{}');
  const readers = new Function('auth', 'fetch', `${source}\nreturn {read:readPrivateNodusSnapshot,readReports:readPrivateNodusReportSources,readPulse:readPrivatePulseSummary};`)(auth, async (...args) => {
    requests.push(args);
    return fetchResult(...args);
  });
  return { auth, requests, ...readers };
}
test('pulse client validates aggregates and rejects account/scope changes without raw-report fallback', async () => {
  const snapshot = { authorizedSedes: ['Lima'], reportCount: 7 };
  const client = fixture(async () => ({ ok: true, json: async () => ({ snapshot }) }));
  assert.deepEqual(await client.readPulse({ expectedUid: 'first' }), snapshot);
  assert.match(client.requests[0][0], /\/private-pulse-summary$/);
  assert.equal(client.requests[0][1].body, '{}');
  await assert.rejects(client.readPulse({ expectedUid: 'second' }), /cuenta cambió/);
  const changed = fixture(async () => ({ ok: true, json: async () => {
    changed.auth.currentUser = { uid: 'second' };
    return { snapshot };
  } }));
  await assert.rejects(changed.readPulse(), /cuenta cambió/);
  for (const reportCount of [null, -1, 0.1, '7', Number.MAX_SAFE_INTEGER + 1]) {
    const invalid = fixture(async () => ({ ok: true, json: async () => ({ snapshot: { authorizedSedes: [], reportCount } }) }));
    await assert.rejects(invalid.readPulse(), /no verificable/);
  }
});
test('private metrics client sends only Firebase identity, never role/sede and never queries aggregate Firestore', async () => {
  const { read, requests } = fixture();
  assert.deepEqual(await read(), data);
  assert.match(requests[0][0], /\/nodus-private-snapshot$/);
  assert.equal(requests[0][1].headers.Authorization, 'Bearer synthetic-only');
  assert.equal(requests[0][1].body, '{}');
  assert.equal(requests[0][1].cache, 'no-store');
  for (const path of ['../src/pages/MisKPIs.jsx', '../src/components/AICopilot.jsx',
    '../src/pages/EmbudoConversionBoard.jsx', '../src/pages/AsignadorEntrenadores.jsx',
    '../src/components/NodusCoordinadoresC1C2Dashboard.jsx']) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.match(source, /(?:read|use)PrivateNodusSnapshot\(/);
    assert.doesNotMatch(source, /doc\(db, 'nodus_(?:coordinadores_c1c2|kpis_sincronizados)'/);
    assert.doesNotMatch(source, /nodusFallbackData/);
  }
});
test('private metrics rejects missing sessions, authorization failures and malformed projection without raw fallback', async () => {
  const noAuth = fixture();
  noAuth.auth.currentUser = null;
  await assert.rejects(noAuth.read(), /iniciar sesión/);
  assert.equal(noAuth.requests.length, 0);
  const denied = fixture(async () => ({ ok: false, status: 403, json: async () => ({ message: 'denied' }) }));
  await assert.rejects(denied.read(), /denied/);
  assert.equal(denied.requests.length, 1);
  const malformed = fixture(async () => ({ ok: true, json: async () => ({ snapshot: {} }) }));
  await assert.rejects(malformed.read(), /proyección privada/);
});
test('account changes during token, fetch or JSON resolution reject old-account metrics', async () => {
  const first = fixture();
  first.auth.currentUser.getIdToken = async () => { first.auth.currentUser = { uid: 'second' }; return 'old-token'; };
  await assert.rejects(first.read(), /cuenta cambió/);
  assert.equal(first.requests.length, 0);
  const second = fixture(async () => {
    second.auth.currentUser = { uid: 'second' };
    return { ok: true, json: async () => ({ snapshot: data }) };
  });
  await assert.rejects(second.read(), /cuenta cambió/);
  const third = fixture(async () => ({ ok: true, json: async () => {
    third.auth.currentUser = { uid: 'second' };
    return { snapshot: data };
  } }));
  await assert.rejects(third.read(), /cuenta cambió/);
});
test('effective viewer must match Auth and remain current even when the Auth UID does not change', async () => {
  const different = fixture();
  await assert.rejects(different.read({ expectedUid: 'other' }), /cuenta cambió/);
  assert.equal(different.requests.length, 0);
  const stale = fixture();
  let active = true;
  stale.auth.currentUser.getIdToken = async () => { active = false; return 'synthetic-only'; };
  await assert.rejects(stale.read({ expectedUid: 'first', isCurrent: () => active }), /cuenta cambió/);
  assert.equal(stale.requests.length, 0);
});
test('private report client keeps the same account boundary and never requests arbitrary documents, roles or sites', async () => {
  const snapshot = { reportSources: [], authorizedSedes: ['Lima'], authorizedStages: ['C1'], missingSources: ['Lima_C1'] };
  const client = fixture(async () => ({ ok: true, json: async () => ({ snapshot }) }));
  assert.deepEqual(await client.readReports({ expectedUid: 'first' }), snapshot);
  assert.match(client.requests[0][0], /\/nodus-private-report-sources$/);
  assert.equal(client.requests[0][1].body, '{}');
  assert.equal(client.requests[0][1].cache, 'no-store');
  await assert.rejects(client.readReports({ expectedUid: 'other' }), /cuenta cambió/);
  const malformed = fixture();
  await assert.rejects(malformed.readReports(), /reportes sin una proyección/);
  for (const path of ['../src/components/OperationalReview.jsx', '../src/pages/ReportesBoard.jsx']) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.match(source, /(?:use|read)PrivateNodusReportSources\(/);
    assert.doesNotMatch(source, /doc\(db, 'nodus_(?:coordinadores_c1c2|report_sources)'/);
  }
});
test('Copilot explicitly reports unavailable private metrics instead of inventing zero discrepancies', () => {
  const source = readFileSync(new URL('../src/components/AICopilot.jsx', import.meta.url), 'utf8');
  const start = source.indexOf('function generateAssertiveResponse(');
  const end = source.indexOf('function renderInlineMarkdown');
  const generate = new Function(`${source.slice(start, end)}\nreturn generateAssertiveResponse;`)();
  assert.match(generate('pendientes', null, {}), /No se pudieron verificar/);
  assert.match(generate('pendientes', data, {}), /no contiene el reporte/);
  assert.doesNotMatch(generate('pendientes', data, {}), /\*\*0\*\*/);
});
