import test from 'node:test';
import assert from 'node:assert/strict';
import { createNodusApiClient, NodusApiError } from '../nodusApiClient.mjs';

const now = Date.parse('2026-10-12T17:00:00Z');
const envelope = data => ({ ok: true, data, meta: { generado: '2026-10-12T11:45:31-05:00', total: 1 } });
function mock(body, status = 200, record = {}) {
  return async (url, init) => {
    record.url = new URL(url);
    record.init = init;
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
}

test('uses documented GET, X-Api-Key header, envelope and generation timestamp without putting credentials in URL', async () => {
  const record = {};
  const client = createNodusApiClient({ apiKey: 'test-key', fetchImpl: mock(envelope([{ id: 149, id_sede: 7, nombre: 'EQUIPO 32', sede: 'Lima' }]), 200, record), now: () => now });
  const result = await client.getEquipos({ sedeId: 7, activeOnly: true });
  assert.equal(result.data[0].id, 149);
  assert.equal(result.source, 'NODUS_API');
  assert.equal(result.meta.generado, '2026-10-12T11:45:31-05:00');
  assert.equal(record.init.method, 'GET');
  assert.equal(record.init.headers['X-Api-Key'], 'test-key');
  assert.equal(record.url.searchParams.get('id_sede'), '7');
  assert.equal(record.url.searchParams.get('en_actividad'), '1');
  assert.equal(record.url.searchParams.has('X-Api-Key'), false);
});

test('missing credentials, undocumented hosts and unsupported protocol fail closed', () => {
  assert.throws(() => createNodusApiClient({ apiKey: '' }), { code: 'missing_api_key' });
  assert.throws(() => createNodusApiClient({ apiKey: 'x', baseUrl: 'http://imo.crearpslglobal.com/api' }), { code: 'invalid_base_url' });
  assert.throws(() => createNodusApiClient({ apiKey: 'x', baseUrl: 'https://attacker.example/api' }), { code: 'invalid_base_url' });
});

test('HTTP errors, API error envelopes and malformed success payloads never become empty data', async () => {
  for (const [body, status, expected] of [
    [{ ok: false, error: { codigo: 'no_autorizado', mensaje: 'private message' } }, 401, 'no_autorizado'],
    [{ ok: false, error: { codigo: 'api_deshabilitada' } }, 503, 'api_deshabilitada'],
    [{ ok: true, data: [] }, 200, 'invalid_envelope'],
  ]) {
    const client = createNodusApiClient({ apiKey: 'test-key', fetchImpl: mock(body, status), now: () => now });
    await assert.rejects(client.getSedes(), err => err instanceof NodusApiError && err.code === expected && !err.message.includes('private message'));
  }
  const badJson = createNodusApiClient({ apiKey: 'test-key', fetchImpl: async () => ({ ok: true, status: 200, json: async () => { throw Error('bad'); } }) });
  await assert.rejects(badJson.getSedes(), { code: 'invalid_json' });
});

test('missing, stale, future and timezone-free source timestamps are errors', async () => {
  for (const timestamp of [undefined, '2026-10-11T10:00:00-05:00', '2026-10-13T11:00:00-05:00', '2026-10-12 11:45:31']) {
    const client = createNodusApiClient({ apiKey: 'test-key', fetchImpl: mock({ ok: true, data: [], meta: { ...(timestamp ? { generado: timestamp } : {}) } }), now: () => now });
    await assert.rejects(client.getSedes(), NodusApiError);
  }
});

test('documented identifiers and payment date range are validated before network access', async () => {
  let calls = 0;
  const client = createNodusApiClient({ apiKey: 'test-key', fetchImpl: async () => { calls++; throw Error('should not call'); } });
  await assert.rejects(async () => client.getParticipantes(0), { code: 'invalid_equipo_id' });
  await assert.rejects(async () => client.getParticipante(''), { code: 'invalid_identificacion' });
  await assert.rejects(client.getPagos({ desde: '2026-01-01', hasta: '2026-04-05' }), { code: 'date_range_exceeded' });
  await assert.rejects(client.getPagos({ desde: '2026-01-02', hasta: '2026-01-01' }), { code: 'invalid_date_range' });
  assert.equal(calls, 0);
});

test('payment endpoint follows API precedence: equipo scope supersedes sede scope', async () => {
  const record = {};
  const payment = { id_factura: 1, fecha: '2026-10-08 06:07:28' };
  const client = createNodusApiClient({ apiKey: 'test-key', fetchImpl: mock({
    ok: true, data: [payment], meta: { ...envelope([]).meta, total_registros: 1 },
  }, 200, record), now: () => now });
  await client.getPagos({ desde: '2026-10-01', hasta: '2026-10-10', sedeId: 7, equipoId: 149 });
  assert.equal(record.url.searchParams.get('id_equipo'), '149');
  assert.equal(record.url.searchParams.has('id_sede'), false);
});

test('documented JSON response shapes are validated for team enrolments and person records', async () => {
  const bodies = [
    envelope([{ id: 7, nombre: 'LIMA CICLO 1', equipos: [{ id: 149 }] }]),
    envelope({ equipo: { id: 149 }, participantes: [{ id: 1, nombres: 'SYNTHETIC', apellidos: 'PERSON',
      capitulo1: { asistio: false }, capitulo2: { pagado: false } }] }),
    envelope({ estado: 'prospecto', id: 1, identificacion: 'synthetic-id' }),
  ];
  const client = createNodusApiClient({ apiKey: 'test-key',
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => bodies.shift() }), now: () => now });
  assert.equal((await client.getSedes()).data.length, 1);
  assert.equal((await client.getParticipantes(149)).meta.total, 1);
  assert.equal((await client.getParticipante('synthetic-id')).data.estado, 'prospecto');
});

test('schema and count mismatches are not accepted as successful empty responses', async () => {
  const malformed = [
    envelope([{ id: 7, nombre: 'LIMA' }]),
    { ...envelope({ equipo: { id: 149 }, participantes: [] }), meta: { ...envelope([]).meta, total: 1 } },
  ];
  const client = createNodusApiClient({ apiKey: 'test-key',
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => malformed.shift() }), now: () => now });
  await assert.rejects(client.getSedes(), { code: 'invalid_sedes_schema' });
  await assert.rejects(client.getParticipantes(149), { code: 'invalid_participantes_schema' });
});
