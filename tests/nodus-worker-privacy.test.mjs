import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as model from '../cloudflare-worker/src/nodusJsonModel.js';
import { extractNodusMetrics } from '../src/services/nodusMetricsModel.js';

function fixture({ profile, tokenEmail = 'manager@example.invalid', snapshot, responseSede = 'Lima' }) {
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
    'fetch', ...Object.keys(model), 'fixtureProfile', 'fixtureSnapshot', 'fixtureEmail', 'fixturePaths'];
  return {
    prompts, paths,
    ...new Function(...names, `${source}
      verifyFirebaseToken = async () => ({sub: 'synthetic-uid', email: fixtureEmail});
      getServiceAccountAccessToken = async () => 'synthetic-token';
      firestoreGet = async path => {
        fixturePaths.push(path);
        return path.startsWith('users/') ? fixtureProfile : fixtureSnapshot;
      };
      firestoreAdd = async () => {};
      return { handleNodusJson, handleNodusDataMap, handlePrivateNodusSnapshot, construirContextoNodus, callerNodusScope };
    `)(() => ({}), '', createClient, class extends Error {},
      email => email === 'local@example.invalid' ? localIdentity : email === 'foreign@example.invalid' ? foreignIdentity : null,
      async (_url, options) => {
        prompts.push(JSON.parse(options.body));
        return { json: async () => ({ choices: [{ message: { content: 'Synthetic response' } }] }) };
      }, ...Object.values(model), profile, snapshot, tokenEmail, paths)
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
  assert.equal(body.snapshot.coordinadores.length, 1);
  assert.equal(body.snapshot.coordinadores[0].email, 'local@example.invalid');
  assert.doesNotMatch(JSON.stringify(body), /FOREIGN|999/);

  const manager = fixture({ profile: { role: 'gerente', sede: 'Lima' }, snapshot });
  const siteResponse = await manager.handlePrivateNodusSnapshot(request(), {}, 'https://example.invalid');
  assert.doesNotMatch(JSON.stringify(await siteResponse.json()), /FOREIGN|999/);

  const director = fixture({ profile: { role: 'direccion' }, snapshot });
  const global = await (await director.handlePrivateNodusSnapshot(request(), {}, 'https://example.invalid')).json();
  assert.equal(global.snapshot.coordinadores.length, 2);
  assert.equal(global.snapshot.totales.asignados, 999);
  assert.equal(global.snapshot.secciones, undefined, 'even global metric consumers do not download raw source sections');
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
