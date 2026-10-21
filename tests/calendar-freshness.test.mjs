import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CALENDAR_CACHE_KEY, loadOfficialCalendar, readCalendarCache, calendarFreshnessText,
} from '../public/officialCalendarSource.js';
import { parseOfficialCalendarSheet } from '../public/officialCalendarSheet.js';
import { applyAsignadorAuthoritativeProjection, buildAsignadorEventKey } from '../public/trainerCalendarProjection.js';

const event = {
  nombre: 'TANQUE', sede: 'GYE', equipo: 'fixture*parallel',
  fecha_inicio: '2030-11-02T00:00:00', fecha_fin: '2030-11-02T00:00:00',
};
const csv = 'fecha,sede,equipo,entrenamiento,trainer,lugar,direccion\n2030-11-02,GYE,fixture*parallel,TANQUE,Sugerencia,Salón de prueba,Dirección de prueba';
const response = body => ({
  ok: true, status: 200, text: async () => body, json: async () => body,
});
const fetchSources = (api, sheet) => (url, options) => {
  assert.equal(options.cache, 'no-store');
  return url.includes('script.google.com') ? api() : sheet();
};

test('reads independent sources in parallel, accepting a sheet even when API fails', async () => {
  let called = 0;
  const result = await loadOfficialCalendar({
    fetchImpl: fetchSources(async () => { called++; throw new Error('API down'); },
      async () => { called++; return response(csv); }),
  });
  assert.equal(called, 2);
  assert.deepEqual(result.sources, { api: false, sheet: true });
  assert.equal(result.events[0].equipo, 'fixture*parallel');
  assert.match(calendarFreshnessText(result), /historial.*no disponible/);
});

test('CSV preserves quoted text, numeric and mixed cohorts, with no inferred date', () => {
  const text = `${csv}\n2030-11-03,UIO,122,TANQUE,,"Sala, norte",\n2030-11-03,UIO,122*128,TANQUE,,,\n,GYE,unknown,TANQUE,,,`;
  const events = parseOfficialCalendarSheet(text);
  assert.deepEqual(events.map(item => item.equipo), ['fixture*parallel', '122', '122*128']);
  assert.equal(events[1].lugar, 'Sala, norte');
});

test('invalid CSV is isolated from valid API; never discards API due to parse errors', async () => {
  for (const invalid of ['<html>403</html>', 'fecha,sede,equipo,entrenamiento,trainer,lugar,direccion\n2030-02-30,GYE,1,TANQUE,,,']) {
    const result = await loadOfficialCalendar({
      fetchImpl: fetchSources(async () => response({ data: [event] }), async () => response(invalid)),
    });
    assert.equal(result.events.length, 1);
    assert.deepEqual(result.sources, { api: true, sheet: false });
    assert.match(calendarFreshnessText(result), /no se pudo contrastar/);
  }
});

test('timeouts cover hung requests and hung bodies, including transports ignoring abort', async () => {
  for (const sheet of [async () => new Promise(() => {}),
    async () => ({ ok: true, text: () => new Promise(() => {}) })]) {
    const start = Date.now();
    const result = await loadOfficialCalendar({
      fetchImpl: fetchSources(async () => response([event]), sheet), timeoutMs: 25,
    });
    assert.equal(result.sources.sheet, false);
    assert.match(result.errors[0], /Tiempo de espera/);
    assert.ok(Date.now() - start < 1000);
  }
});

test('rejects total network failure, empty or malformed responses instead of returning success', async () => {
  for (const api of [async () => { throw new Error('offline'); },
    async () => response([]), async () => response([{ nombre: 'No date' }]),
    async () => ({ ok: false, status: 503 })]) {
    await assert.rejects(loadOfficialCalendar({
      fetchImpl: fetchSources(api, async () => { throw new Error('sheet offline'); }),
    }), /Apps Script.*Hoja oficial/);
  }
});

test('cache migration preserves old data without manufacturing freshness; malformed storage is explicit', () => {
  const storage = value => ({ getItem: key => { assert.equal(key, CALENDAR_CACHE_KEY); return value; } });
  assert.equal(readCalendarCache(storage(null)), null);
  const legacy = readCalendarCache(storage(JSON.stringify([event])));
  assert.equal(legacy.checkedAt, null);
  assert.deepEqual(legacy.events, [event]);
  assert.match(calendarFreshnessText(legacy), /actualidad no verificada.*desconocida/);
  const timestamp = '2030-10-01T00:00:00Z';
  assert.equal(readCalendarCache(storage(JSON.stringify({ events: [event], checkedAt: timestamp }))).checkedAt, timestamp);
  assert.throws(() => readCalendarCache(storage('{bad')));
  assert.throws(() => readCalendarCache(storage('{"events":[{}]}')), /inválida/);
});

test('refresh reconciles sources without losing historical events, end dates or operational authority', async () => {
  const historical = { ...event, fecha_inicio: '2020-01-01T00:00:00', equipo: 'history' };
  const result = await loadOfficialCalendar({
    fetchImpl: fetchSources(async () => response([historical, { ...event, ticket: 'confirmed' }]),
      async () => response(csv)),
  });
  assert.equal(result.events.length, 2);
  assert.equal(result.events[1].fecha_fin, event.fecha_fin);
  assert.equal(result.events[1].ticket, 'confirmed');
  const key = buildAsignadorEventKey(event);
  const assignments = [{ id: key, unico: { entrenador: 'Entrenador sintético' } }];
  const changes = [{
    id: key, sourceEventKey: key, kind: 'override', nombre: 'TANQUE', sede: 'GYE',
    equipo: event.equipo, fechaInicio: '2030-12-01T00:00:00', fechaFin: '2030-12-01T00:00:00',
  }];
  const projected = applyAsignadorAuthoritativeProjection(result.events, assignments, changes);
  assert.equal(projected.length, 2);
  assert.ok(projected.some(item => item.fecha_inicio.startsWith('2020-01-01')));
  const moved = projected.find(item => item.__sourceEventKey === key);
  assert.equal(moved.fecha_inicio, changes[0].fechaInicio);
  assert.equal(moved.trainer, 'Entrenador sintético');
  assert.match(calendarFreshnessText({ ...result, error: 'offline', cached: true }), /Copia local.*no verificada/);
});
