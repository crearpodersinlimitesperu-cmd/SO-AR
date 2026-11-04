import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as model from '../cloudflare-worker/src/nodusJsonModel.js';
import * as reportModel from '../cloudflare-worker/src/privateNodusReportModel.js';
import * as pulseModel from '../cloudflare-worker/src/privatePulseModel.js';
import { buildReportSources } from '../src/services/nodusReportModel.js';
import { extractNodusMetrics } from '../src/services/nodusMetricsModel.js';
import { createPrivateChatHandler } from '../cloudflare-worker/src/privateChatHandler.js';
import { createPrivateChatStore } from '../cloudflare-worker/src/privateChatStore.js';

function fixture({ profile, nextProfile = profile, sources = {}, restFetcher, tokenEmail = 'manager@example.invalid', snapshot, responseSede = 'Lima' }) {
  const prompts = [];
  const paths = [];
  const source = readFileSync(new URL('../cloudflare-worker/src/index.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?$/gm, '').replace('export default {', 'const worker = {');
  const createClient = () => ({
    getSedes: async () => ({ data: [
      { nombre: 'Lima', equipos: [{ id: 1, participantes: 2 }] },
      { nombre: 'Quito', equipos: [{ id: 2, participantes: 3 }] }
    ], meta: { generado: 'synthetic-time' } }),
    getParticipantes: async id => ({
      data: { equipo: { id, nombre: 'Equipo 42', sede: responseSede }, participantes: [] },
      meta: { generado: 'synthetic-time' }
    })
  });
  const names = ['createRemoteJWKSet', 'notebookKnowledge', 'createNodusApiClient', 'NodusApiError', 'findUserByAnyEmail',
    'createPrivateChatHandler', 'createPrivateChatStore',
    'fetch', ...Object.keys(model), ...Object.keys(reportModel), ...Object.keys(pulseModel),
    'fixtureProfile', 'fixtureNextProfile', 'fixtureSnapshot', 'fixtureSources', 'fixtureRestReads', 'fixtureEmail', 'fixturePaths'];
  return {
    prompts, paths,
    ...new Function(...names, `${source}
      verifyFirebaseToken = async () => ({sub: 'synthetic-uid', email: fixtureEmail});
      getServiceAccountAccessToken = async () => 'synthetic-token';
      let profileReads = 0;
      if (!fixtureRestReads) firestoreGet = async path => {
        fixturePaths.push(path);
        return path.startsWith('users/') ? (profileReads++ ? fixtureNextProfile : fixtureProfile)
          : path.startsWith('nodus_report_sources/') ? fixtureSources[path.split('/')[1]] || null : fixtureSnapshot;
      };
      firestoreAdd = async () => {};
      return { handleNodusJson, handleNodusDataMap, handlePrivateNodusSnapshot, handlePrivateNodusReportSources, handlePrivatePulseSummary, construirContextoNodus, callerNodusScope };
    `)(() => ({}), '', createClient, class extends Error {},
      email => email === 'local@example.invalid' ? localIdentity : email === 'foreign@example.invalid' ? foreignIdentity : null,
      createPrivateChatHandler, createPrivateChatStore,
      async (_url, options) => {
        if (restFetcher) return restFetcher(_url, options);
        prompts.push(JSON.parse(options.body));
        return { json: async () => ({ choices: [{ message: { content: 'Synthetic response' } }] }) };
      }, ...Object.values(model), ...Object.values(reportModel), ...Object.values(pulseModel), profile, nextProfile, snapshot, sources, Boolean(restFetcher), tokenEmail, paths)
  };
}
const request = body => new Request('https://example.invalid/nodus', {
  method: 'POST', headers: { Authorization: 'Bearer synthetic-token', 'Content-Type': 'application/json' },
  body: JSON.stringify(body || {})
});
const snapshot = {
  timestamp: 'synthetic-time', totales: { asignados: 999 }, secciones: { private: { value: 'FOREIGN_RAW' } },
  coordinadores: [
    { sede: 'Lima', email: 'local@example.invalid', asignados: 2 },
    { sede: 'Quito', email: 'FOREIGN_PERSON', asignados: 9 }
  ]
};
const localIdentity = { email: 'local@example.invalid', emails: ['local@example.invalid', 'approved@example.invalid'] };
const foreignIdentity = { email: 'foreign@example.invalid' };

const reportSources = Object.fromEntries(buildReportSources({
  timestamp: '2026-11-04T20:00:00Z',
  equiposReporte: [
    { equipoNombre: 'EQUIPO 31 LIMA C1', extractionComplete: true, participantes: [
      { grupoReporte: 'Nuevo', llamada1: 'Confirmado', nombre: 'RAW_SECRET_PERSON' }
    ] },
    { equipoNombre: 'EQUIPO 31 QUITO C1', extractionComplete: true, participantes: [
      { grupoReporte: 'Rezagado', llamada1: 'Confirmado', nombre: 'FOREIGN_PERSON' }
    ] }
  ]
}).map(source => [`${source.sede}_${source.stage}`, { ...source, private: 'RAW_SECRET', participantes: ['RAW_SECRET_PERSON'] }]));

test('pulse aggregation validates the real REST result and never converts malformed/missing results into zero', () => {
  const result = raw => [{ result: { aggregateFields: { reportCount: { integerValue: raw } } } }];
  assert.equal(pulseModel.decodePulseCount(result('0')), 0);
  for (const raw of [null, 0, '1.2', '-1', 'Infinity', '9007199254740992']) {
    assert.throws(() => pulseModel.decodePulseCount(result(raw)), /no verificable/);
  }
  assert.throws(() => pulseModel.decodePulseCount([]), /no verificable/);
  assert.throws(() => pulseModel.pulseCountQuery('Foreign'), /no autorizada/);
  assert.deepEqual(pulseModel.privatePulseAccess({ role: 'socio' }, { type: 'global' }).sedes.length, 6);
});

test('Micro-Pulso endpoint requests counts only, restricts assigned managerial sedes and rechecks authorization', async () => {
  const calls = [];
  let profile = { role: 'gerente', sede: 'Lima', roles: ['gerente', 'coord_c1'], roleSedes: { coord_c1: 'Quito' } };
  let reads = 0;
  let revoked = false;
  let malformed = false;
  let outage = false;
  const worker = fixture({ restFetcher: async (url, options) => {
    calls.push({ url, options });
    if (url.includes('/users/')) {
      reads++;
      const current = revoked && reads > 1 ? { ...profile, active: false } : profile;
      return Response.json({ fields: Object.fromEntries(Object.entries(current).map(([key, value]) => [key,
        typeof value === 'string' ? { stringValue: value } : typeof value === 'boolean' ? { booleanValue: value }
          : Array.isArray(value) ? { arrayValue: { values: value.map(stringValue => ({ stringValue })) } }
            : { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([name, stringValue]) => [name, { stringValue }])) } }
      ])) });
    }
    assert.match(url, /documents:runAggregationQuery$/);
    if (outage) return new Response('synthetic unavailable', { status: 503 });
    return Response.json(malformed ? [] : [{ result: { aggregateFields: { reportCount: { integerValue: '7' } } } }]);
  } });
  let response = await worker.handlePrivatePulseSummary(request(), {}, '');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { snapshot: { authorizedSedes: ['Lima'], reportCount: 7 } });
  let aggregations = calls.filter(call => call.options.method === 'POST');
  assert.equal(aggregations.length, 1);
  assert.equal(aggregations[0].options.body, JSON.stringify(pulseModel.pulseCountQuery('Lima')));
  assert.doesNotMatch(aggregations[0].options.body, /Quito|submitted_by|trimAndStack|respuestas/);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const before = calls.length;
  assert.equal((await worker.handlePrivatePulseSummary(request({ sede: 'Quito' }), {}, '')).status, 400);
  assert.equal((await worker.handlePrivatePulseSummary(new Request('https://example.invalid', { method: 'POST', body: '{}' }), {}, '')).status, 401);
  assert.equal(calls.length, before);
  profile = { role: 'gerente', sede: 'Lima', roleSedes: { gerente: 'Quito' } };
  calls.length = 0;
  response = await worker.handlePrivatePulseSummary(request(), {}, '');
  assert.deepEqual((await response.json()).snapshot, { authorizedSedes: ['Lima', 'Quito'], reportCount: 14 });
  for (const denied of [{ role: 'staff', sede: 'Lima' }, { role: 'gerente', sede: 'Lima', active: false },
    { role: 'gerente', sede: 'Lima', uid: 'foreign-uid' }]) {
    profile = denied;
    calls.length = 0;
    assert.equal((await worker.handlePrivatePulseSummary(request(), {}, '')).status, 403);
    assert.equal(calls.some(call => call.options.method === 'POST'), false);
  }
  profile = { role: 'gerente', sede: 'Lima' };
  revoked = true; reads = 0;
  assert.equal((await worker.handlePrivatePulseSummary(request(), {}, '')).status, 403);
  revoked = false; malformed = true;
  assert.equal((await worker.handlePrivatePulseSummary(request(), {}, '')).status, 503);
  malformed = false;
  outage = true;
  response = await worker.handlePrivatePulseSummary(request(), {}, '');
  assert.equal(response.status, 503);
  assert.equal((await response.json()).snapshot, undefined);
  outage = false;
  profile = { role: 'direccion' };
  calls.length = 0;
  assert.equal((await worker.handlePrivatePulseSummary(request(), {}, '')).status, 200);
  aggregations = calls.filter(call => call.options.method === 'POST');
  assert.equal(aggregations.length, 6);
});

test('report endpoint reads only authorized source documents and sends aggregate counts without rosters or extra fields', async () => {
  const worker = fixture({ profile: { role: 'coord_c1', sede: 'Lima' }, sources: reportSources });
  const response = await worker.handlePrivateNodusReportSources(request(), {}, 'https://example.invalid');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const result = await response.json();
  assert.deepEqual(result.snapshot.authorizedSedes, ['Lima']);
  assert.deepEqual(result.snapshot.authorizedStages, ['C1']);
  assert.equal(result.snapshot.reportSources[0].teams[0].counts.nuevos_OK, 1);
  assert.deepEqual(worker.paths.filter(path => !path.startsWith('users/')), ['nodus_report_sources/Lima_C1']);
  assert.doesNotMatch(JSON.stringify(result), /RAW_SECRET|FOREIGN|Quito|participantes/);
  const manager = fixture({ profile: { role: 'gerente', sede: 'Lima', roles: ['gerente'], roleSedes: { gerente: 'Quito' } }, sources: reportSources });
  const dual = await (await manager.handlePrivateNodusReportSources(request(), {}, 'https://example.invalid')).json();
  assert.deepEqual(dual.snapshot.authorizedSedes, ['Lima', 'Quito']);
  assert.equal(dual.snapshot.reportSources.length, 4);
  const director = fixture({ profile: { role: 'direccion' }, sources: reportSources });
  const global = await (await director.handlePrivateNodusReportSources(request(), {}, 'https://example.invalid')).json();
  assert.equal(global.snapshot.reportSources.length, 12);
  assert.doesNotMatch(JSON.stringify(global), /RAW_SECRET|FOREIGN_PERSON|participantes/);
});

test('report endpoint denies client permissions, personal/inactive roles, scope revocation, absent and contradictory sources explicitly', async () => {
  const worker = fixture({ profile: { role: 'gerente', sede: 'Lima' }, sources: reportSources });
  assert.equal((await worker.handlePrivateNodusReportSources(request({ sede: 'Quito', role: 'direccion' }), {}, '')).status, 400);
  assert.equal(worker.paths.length, 0);
  for (const profile of [{ role: 'entrenador', sede: 'Lima' }, { role: 'gerente', sede: 'Lima', active: false }]) {
    const denied = fixture({ profile, sources: reportSources });
    assert.equal((await denied.handlePrivateNodusReportSources(request(), {}, '')).status, 403);
    assert.equal(denied.paths.some(path => path.startsWith('nodus_')), false);
  }
  const revoked = fixture({ profile: { role: 'direccion' }, nextProfile: { role: 'gerente', sede: 'Lima' }, sources: reportSources });
  assert.equal((await revoked.handlePrivateNodusReportSources(request(), {}, '')).status, 403);
  const missing = fixture({ profile: { role: 'gerente', sede: 'Lima' } });
  assert.equal((await missing.handlePrivateNodusReportSources(request(), {}, '')).status, 404);
  const contradictory = fixture({ profile: { role: 'coord_c1', sede: 'Lima' },
    sources: { Lima_C1: { ...reportSources.Lima_C1, sede: 'Quito' } } });
  assert.equal((await contradictory.handlePrivateNodusReportSources(request(), {}, '')).status, 503);
});

test('real REST transport decodes report counters and fails explicitly instead of treating a Firestore outage as missing data', async () => {
  const encode = value => value === null ? { nullValue: null }
    : Array.isArray(value) ? { arrayValue: { values: value.map(encode) } }
    : typeof value === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } }
    : typeof value === 'number' ? { integerValue: String(value) }
    : typeof value === 'boolean' ? { booleanValue: value } : { stringValue: value };
  const documents = {
    'users/synthetic-uid': { role: 'coord_c1', sede: 'Lima' },
    'nodus_report_sources/Lima_C1': reportSources.Lima_C1
  };
  const paths = [];
  let unavailable = false;
  const worker = fixture({ restFetcher: async (url, options) => {
    assert.equal(options.method, undefined, 'this endpoint must never write operational documents');
    const path = decodeURIComponent(new URL(url).pathname.split('/documents/')[1]);
    paths.push(path);
    if (unavailable) return Response.json({ error: 'synthetic unavailable' }, { status: 503 });
    const document = documents[path];
    return document ? Response.json({ fields: encode(document).mapValue.fields })
      : Response.json({}, { status: 404 });
  } });
  const response = await worker.handlePrivateNodusReportSources(request(), {}, '');
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.snapshot.reportSources[0].teams[0].counts.nuevos_OK, 1);
  assert.doesNotMatch(JSON.stringify(result), /RAW_SECRET|FOREIGN|participantes/);
  assert.deepEqual(paths, ['users/synthetic-uid', 'nodus_report_sources/Lima_C1', 'users/synthetic-uid']);
  unavailable = true;
  assert.equal((await worker.handlePrivateNodusReportSources(request(), {}, '')).status, 503);
  assert.equal((await worker.handlePrivateNodusSnapshot(request(), {}, '')).status, 503);
});

test('private snapshot reauthorizes before response when a profile is revoked or moved during a source read', async () => {
  for (const nextProfile of [null, { role: 'gerente', sede: 'Quito' }, { role: 'gerente', sede: 'Lima', active: false }]) {
    const worker = fixture({ profile: { role: 'gerente', sede: 'Lima' }, nextProfile, snapshot });
    const response = await worker.handlePrivateNodusSnapshot(request(), {}, 'https://example.invalid');
    assert.equal(response.status, 403);
    assert.doesNotMatch(JSON.stringify(await response.json()), /local@example.invalid|FOREIGN_PERSON/);
  }
});

test('actual Worker API handlers restrict managers by server profile, not request scope or historical email allowlists', async () => {
  const worker = fixture({ profile: { role: 'gerente', sede: 'Lima' }, tokenEmail: 'leandro.brunis@crearpsl.net', snapshot });
  const env = { NODUS_API_KEY: 'synthetic-only' };
  const catalog = await worker.handleNodusJson(request({ sede: 'Quito', role: 'direccion' }), env, 'https://example.invalid', '/nodus-json/catalog');
  assert.equal(catalog.status, 200);
  const body = await catalog.json();
  assert.deepEqual(body.sedes.map(sede => sede.nombre), ['Lima']);
  assert.equal(body.totals.participantes, 2);
  const denied = await worker.handleNodusJson(request({ teamId: 2 }), env, 'https://example.invalid', '/nodus-json/team-metrics');
  assert.equal(denied.status, 403);
  const allowed = await worker.handleNodusJson(request({ teamId: 1 }), env, 'https://example.invalid', '/nodus-json/team-metrics');
  assert.equal(allowed.status, 200);
  const wrongSource = fixture({ profile: { role: 'gerente', sede: 'Lima' }, snapshot, responseSede: 'Quito' });
  assert.equal((await wrongSource.handleNodusJson(request({ teamId: 1 }), env, 'https://example.invalid', '/nodus-json/team-metrics')).status, 502);
});

test('actual Worker chat and Data Map use local projection before building prompts', async () => {
  const worker = fixture({ profile: { role: 'gerente', sede: 'Lima' }, snapshot });
  const context = await worker.construirContextoNodus({ role: 'gerente', sede: 'Lima' }, 'synthetic-token', 'manager@example.invalid');
  assert.match(context, /local@example.invalid/);
  assert.doesNotMatch(context, /FOREIGN|999/);
  const response = await worker.handleNodusDataMap(request(), { GROQ_API_KEY: 'synthetic-only' }, 'https://example.invalid');
  assert.equal(response.status, 200);
  assert.ok(worker.prompts.length > 0);
  assert.doesNotMatch(JSON.stringify(worker.prompts), /FOREIGN|999/);
  assert.match(JSON.stringify(worker.prompts), /local@example.invalid/);
});

test('management roles retain global access, but imported profile email cannot impersonate the authenticated owner', async () => {
  const worker = fixture({ profile: { role: 'gerente', sede: 'Lima', email: 'jose.sanchez@crearpsl.net' }, snapshot });
  assert.equal(worker.callerNodusScope({ role: 'gerente', sede: 'Lima', email: 'jose.sanchez@crearpsl.net' }, 'ordinary@example.invalid').type, 'sede');
  assert.equal(worker.callerNodusScope({ role: 'direccion' }, 'director@example.invalid').type, 'global');
  assert.equal(worker.callerNodusScope({ role: 'gerente', sede: 'Lima' }, 'jose.sanchez@crearpsl.net').type, 'global');
  const director = fixture({ profile: { role: 'direccion' }, snapshot });
  const response = await director.handleNodusJson(request(), { NODUS_API_KEY: 'synthetic-only' }, 'https://example.invalid', '/nodus-json/catalog');
  assert.deepEqual((await response.json()).sedes.map(sede => sede.nombre), ['Lima', 'Quito']);
});

test('private snapshot endpoint returns only the authenticated personal/site projection with no raw-roster fallback', async () => {
  const personal = fixture({ profile: { role: 'entrenador', email: 'local@example.invalid' },
    tokenEmail: 'local@example.invalid', snapshot });
  const response = await personal.handlePrivateNodusSnapshot(request({ role: 'direccion', email: 'FOREIGN_PERSON' }), {}, 'https://example.invalid');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const body = await response.json();
  assert.equal(body.scope, 'personal');
  assert.deepEqual(body.snapshot.authorization, { type: 'personal', sedes: [] });
  assert.equal(body.snapshot.coordinadores.length, 1);
  assert.equal(body.snapshot.coordinadores[0].email, 'local@example.invalid');
  assert.doesNotMatch(JSON.stringify(body), /FOREIGN|999/);

  const manager = fixture({ profile: { role: 'gerente', sede: 'Lima' }, snapshot });
  const siteResponse = await manager.handlePrivateNodusSnapshot(request(), {}, 'https://example.invalid');
  const site = await siteResponse.json();
  assert.doesNotMatch(JSON.stringify(site), /FOREIGN|999/);
  assert.deepEqual(site.snapshot.authorization, { type: 'sede', sedes: ['Lima'] });
  const dual = fixture({ profile: { role: 'gerente', sede: 'Lima', roles: ['gerente'], roleSedes: { gerente: 'Quito' } }, snapshot });
  const dualBody = await (await dual.handlePrivateNodusSnapshot(request({ sede: 'México', scope: 'global' }), {}, '')).json();
  assert.deepEqual(dualBody.snapshot.authorization, { type: 'sede', sedes: ['Lima', 'Quito'] });

  const director = fixture({ profile: { role: 'direccion' }, snapshot });
  const global = await (await director.handlePrivateNodusSnapshot(request(), {}, 'https://example.invalid')).json();
  assert.equal(global.snapshot.coordinadores.length, 2);
  assert.equal(global.snapshot.totales.asignados, 999);
  assert.equal(global.snapshot.secciones, undefined, 'even global metric consumers do not download raw source sections');
  assert.equal(global.snapshot.authorization.type, 'global');
  assert.equal(global.snapshot.authorization.sedes.length, 6);
  const inactive = fixture({ profile: { role: 'gerente', sede: 'Lima', active: false }, snapshot });
  assert.equal((await inactive.handlePrivateNodusSnapshot(request(), {}, 'https://example.invalid')).status, 403);
  const importedBridge = fixture({ profile: { role: 'entrenador', email: 'local@example.invalid',
    emails: ['local@example.invalid', 'foreign@example.invalid'] }, tokenEmail: 'local@example.invalid', snapshot });
  assert.equal((await importedBridge.handlePrivateNodusSnapshot(request(), {}, 'https://example.invalid')).status, 403);
  assert.equal(importedBridge.paths.some(path => path.startsWith('nodus_')), false, 'deny identity bridge before downloading source data');
});

test('personal projection identity preserves approved aliases but rejects contradictory UID and known foreign aliases', () => {
  const find = email => email === 'local@example.invalid' ? localIdentity
    : email === 'foreign@example.invalid' ? foreignIdentity : null;
  assert.ok(model.personalNodusEmails({ uid: 'own', email: 'local@example.invalid' },
    'local@example.invalid', 'own', find).includes('approved@example.invalid'));
  assert.throws(() => model.personalNodusEmails({ uid: 'foreign' }, 'local@example.invalid', 'own', find), /UID/);
  assert.throws(() => model.personalNodusEmails({ email: 'foreign@example.invalid' },
    'local@example.invalid', 'own', find), /otra identidad/);
  assert.ok(model.personalNodusEmails({ email: 'synthetic@crearpsl.net' },
    'synthetic@crearpsl.com', 'own', () => null).includes('synthetic@crearpsl.net'));
});

test('projection preserves the published coordinator KPI contract and cycle while stripping nested personal data', () => {
  const coordinator = {
    id: 'synthetic-coord', nombre: 'Synthetic Person', email: 'local@example.invalid',
    sede: 'Lima', rol: 'Coordinador C2', ciclo: 'Ciclo 2', asignados: 10,
    gestiones: 8, coberturaPct: 80, tasaEfectividad: 25,
    estados: { confirmado: 2, porConfirmar: 5, noContesta: 2, noInteresa: 1 },
    equipos: [{ equipo: 'Synthetic team', llamadas: 8, asistieron: 1,
      participantes: [{ email: 'FOREIGN_PARTICIPANT' }], secret: 'FOREIGN_SECRET' }]
  };
  const [projected] = model.scopedNodusContext({ coordinadores: [coordinator] },
    { type: 'sede', sede: 'Lima' }).coordinadores;
  assert.equal(projected.rol, coordinator.rol);
  assert.equal(projected.ciclo, coordinator.ciclo);
  const originalMetrics = extractNodusMetrics(coordinator);
  assert.deepEqual(extractNodusMetrics(projected), { ...originalMetrics,
    equipos: [{ equipo: 'Synthetic team', llamadas: 8, asistieron: 1 }] });
  assert.doesNotMatch(JSON.stringify(projected), /FOREIGN/);
});
