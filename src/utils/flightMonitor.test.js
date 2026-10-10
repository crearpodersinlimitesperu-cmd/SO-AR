import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { FLIGHT_DISCLAIMER, normalizeFlightTracker, flightTimeWindow, matchesFlightTimeFilter, loadFlightTracker, flightDepartureCountdown } from './flightMonitor.js';

const now = Date.parse('2026-10-10T17:00:00Z');
const flight = (departure, arrival) => ({
  schedule: { scheduledDeparture: departure, scheduledArrival: arrival },
});
const upcoming = flight('2026-10-11T12:00:00-05:00', '2026-10-11T14:00:00-05:00');
const payload = { updatedAt: '2026-10-10T16:00:00Z', flights: { test: upcoming } };

test('departure countdown converts seconds through days with readable singular/plural units', () => {
  for (const [seconds, text] of [
    [1, '1 segundo'],
    [59, '59 segundos'],
    [60, '1 minuto · 0 segundos'],
    [61, '1 minuto · 1 segundo'],
    [3600, '1 hora · 0 minutos · 0 segundos'],
    [3661, '1 hora · 1 minuto · 1 segundo'],
    [86399, '23 horas · 59 minutos · 59 segundos'],
    [86400, '1 día · 0 horas · 0 minutos · 0 segundos'],
    [183845, '2 días · 3 horas · 4 minutos · 5 segundos'],
  ]) {
    const scheduled = flight(new Date(now + seconds * 1000).toISOString());
    assert.deepEqual(flightDepartureCountdown(scheduled, now), { state: 'upcoming', text });
  }
});

test('departure countdown respects offsets and rolls over honestly at scheduled departure', () => {
  const scheduled = flight('2026-10-10T12:00:00-05:00');
  assert.equal(flightDepartureCountdown(scheduled, now - 1001).text, '2 segundos');
  assert.equal(flightDepartureCountdown(scheduled, now - 1).text, '1 segundo');
  for (const time of [now, now + 1, now + 86400000]) {
    assert.deepEqual(flightDepartureCountdown(scheduled, time),
      { state: 'past', text: 'La hora programada ya pasó' });
  }
  assert.deepEqual(flightDepartureCountdown(upcoming, now),
    flightDepartureCountdown(flight('2026-10-11T17:00:00Z'), now));
});

test('departure countdown never falls back to estimated, actual, arrival or live status', () => {
  for (const departure of [undefined, null, '', 'invalid', 0, NaN]) {
    const scheduled = { ...flight(departure, '2999-01-01T00:00:00Z'), status: 'AIRBORNE' };
    scheduled.schedule.estimatedDeparture = '2999-01-01T00:00:00Z';
    scheduled.schedule.actualDeparture = '2999-01-01T00:00:00Z';
    assert.deepEqual(flightDepartureCountdown(scheduled, now),
      { state: 'unknown', text: 'Hora programada no disponible' });
  }
  for (const missing of [null, undefined, {}]) {
    assert.equal(flightDepartureCountdown(missing, now).state, 'unknown');
  }
  for (const invalidNow of [NaN, Infinity]) {
    assert.equal(flightDepartureCountdown(upcoming, invalidNow).state, 'unknown');
  }
  assert.deepEqual(flightDepartureCountdown({ ...upcoming, status: 'LANDED',
    schedule: { ...upcoming.schedule, estimatedDeparture: '2000-01-01T00:00:00Z' } }, now),
    flightDepartureCountdown(upcoming, now));
});

test('all filtered cards use the shared clock, independent of optional data refresh', () => {
  const source = readFileSync(new URL('../pages/MonitorVuelosCartas.jsx', import.meta.url), 'utf8');
  assert.match(source, /filteredFlights\.map[\s\S]*flightDepartureCountdown\(flight, now\)[\s\S]*\{countdown\.text\}/);
  assert.match(source, /role="timer" aria-live="off" aria-label=/);
  assert.match(source, /const tick = \(\) => setNow\(Date\.now\(\)\);[\s\S]*setInterval\(tick, 1000\)/);
  assert.match(source, /removeEventListener\('visibilitychange', tick\)/);
  assert.match(source, /if \(!puedeVerRadar \|\| !autoRefresh\) return;[\s\S]*\}, 300000\)/);
});

test('legacy status and delay claims are normalized without losing links or schedules', () => {
  for (const status of ['ON_TIME', 'SCHEDULED', 'DELAYED', 'AIRBORNE', 'LANDED']) {
    const data = normalizeFlightTracker({
      ...payload,
      flights: { test: { ...upcoming, status, delayMinutes: 0, radarUrl: 'https://example.com',
        schedule: { ...upcoming.schedule, estimatedArrival: upcoming.schedule.scheduledArrival } } },
    });
    assert.equal(data.flights.test.status, 'SCHEDULED');
    assert.equal(data.flights.test.statusLabel, 'Programado según itinerario');
    assert.equal(data.flights.test.statusDescription, FLIGHT_DISCLAIMER);
    assert.equal(data.flights.test.delayMinutes, null);
    assert.equal(data.flights.test.schedule.estimatedArrival, null);
    assert.equal(data.flights.test.radarUrl, 'https://example.com');
    assert.equal(data.flights.test.schedule.scheduledDeparture, upcoming.schedule.scheduledDeparture);
  }
});

test('unknown dates never claim scheduled or active; empty source remains valid', () => {
  assert.equal(normalizeFlightTracker({ ...payload, flights: { test: flight(null, null) } }).flights.test.status, 'STATUS_UNAVAILABLE');
  assert.deepEqual(normalizeFlightTracker({ ...payload, flights: {} }).flights, {});
  for (const invalid of [null, {}, { ...payload, flights: [] }, { ...payload, updatedAt: 'invalid' },
    { ...payload, flights: { test: null } }, { ...payload, flights: { test: { ...upcoming, passengers: 'invalid' } } }]) {
    assert.throws(() => normalizeFlightTracker(invalid), /Formato/);
  }
});

test('date boundaries, timezones, overnight and missing arrivals exclude past flights', () => {
  const estimated = flight('2026-10-10T11:00:00-05:00', '2026-10-10T13:00:00-05:00');
  assert.equal(flightTimeWindow(upcoming, now), 'upcoming');
  assert.equal(flightTimeWindow(estimated, now), 'estimated');
  assert.equal(flightTimeWindow(estimated, Date.parse(estimated.schedule.scheduledDeparture)), 'estimated');
  assert.equal(flightTimeWindow(estimated, Date.parse(estimated.schedule.scheduledArrival)), 'past');
  assert.equal(flightTimeWindow(flight('2026-10-10T16:00:00Z', null), now), 'past');
  assert.equal(flightTimeWindow(flight('2026-10-10T16:00:00Z', '2026-10-10T15:00:00Z'), now), 'past');
  assert.equal(flightTimeWindow(flight('invalid', 'invalid'), now), 'unknown');
  assert.equal(flightTimeWindow(flight('2026-10-09T23:00:00-05:00', '2026-10-10T13:00:00-05:00'), now), 'estimated');
  assert.equal(matchesFlightTimeFilter(upcoming, 'activos', now), true);
  assert.equal(matchesFlightTimeFilter(estimated, 'pasados', now), false);
  assert.equal(matchesFlightTimeFilter(estimated, 'activos', Date.parse(estimated.schedule.scheduledArrival)), false);
  assert.equal(matchesFlightTimeFilter(flight(null, null), 'activos', now), false);
  assert.equal(matchesFlightTimeFilter(flight(null, null), 'todos', now), true);
});

test('network, HTTP, HTML/invalid JSON and schema failures try the alternate source with no-store', async () => {
  for (const first of [
    async () => { throw new Error('network'); },
    async () => ({ ok: false }),
    async () => ({ ok: true, json: async () => { throw new Error('HTML'); } }),
    async () => ({ ok: true, json: async () => ({}) }),
  ]) {
    const urls = [];
    const data = await loadFlightTracker(async (url, options) => {
      urls.push(url);
      assert.equal(options.cache, 'no-store');
      assert.ok(options.signal);
      return urls.length === 1 ? first() : { ok: true, json: async () => payload };
    });
    assert.equal(data.flights.test.status, 'SCHEDULED');
    assert.deepEqual(urls, ['/vuelos_tracker.json', '/cartas/vuelos_tracker.json']);
  }
  await assert.rejects(loadFlightTracker(async () => ({ ok: false })), /No se pudieron cargar/);
});

function cartaTracker() {
  const elements = new Map();
  const context = { window: {}, document: { getElementById(id) {
    if (!elements.has(id)) elements.set(id, { style: {}, setAttribute() {} });
    return elements.get(id);
  } }, Date, AbortSignal, setTimeout, clearInterval, setInterval };
  vm.runInNewContext(readFileSync(new URL('../../public/flight-tracker.js', import.meta.url), 'utf8'), context);
  return { tracker: context.window.FlightTracker, elements };
}

test('cartas never infer actual airborne or landed status from the clock or legacy status', () => {
  const { tracker, elements } = cartaTracker();
  tracker.data = payload;
  tracker.render({ ...flight('2000-01-01T00:00:00Z', '2000-01-01T01:00:00Z'), status: 'ON_TIME' });
  assert.equal(elements.get('flight-live-badge').textContent, 'Programado según itinerario');
  assert.match(elements.get('flight-live-label').textContent, /no confirma aterrizaje/);
  assert.match(elements.get('flight-live-label').textContent, /Estado real del vuelo no disponible/);
  assert.match(elements.get('flight-live-sync').textContent, /Itinerarios sincronizados desde Drive/);
  assert.equal(tracker.calculateProgress(null, null).state, 'UNKNOWN');
  assert.equal(tracker.calculateProgress(null, '2999-01-01T01:00:00Z').state, 'UNKNOWN');
  assert.match(tracker.calculateProgress('2999-01-01T00:00:00Z', '2999-01-01T01:00:00Z').text, /Salida programada/);
  tracker.render(null);
  assert.match(elements.get('flight-live-badge').textContent, /no disponible/);
  assert.equal(elements.get('flight-live-bar').style.width, '0%');
  assert.equal(readFileSync(new URL('../../public/flight-tracker.js', import.meta.url), 'utf8'),
    readFileSync(new URL('../../public/cartas/flight-tracker.js', import.meta.url), 'utf8'));
});

test('all three PDF parsers emit itinerary status and unknown delay/observed times', () => {
  const script = readFileSync(new URL('../../scripts/sync_drive_vuelos_7xdia.py', import.meta.url), 'utf8');
  assert.equal((script.match(/"status": "SCHEDULED"/g) || []).length, 3);
  assert.equal((script.match(/"delayMinutes": None/g) || []).length, 3);
  assert.equal((script.match(/"estimatedDeparture": None/g) || []).length, 3);
  assert.equal((script.match(/"estimatedArrival": None/g) || []).length, 3);
  assert.doesNotMatch(script, /"status": "ON_TIME"|Confirmado \/ A tiempo/);
});

test('monitor has explicit loading/error/retry and does not block on assignment loading', () => {
  const source = readFileSync(new URL('../pages/MonitorVuelosCartas.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /FALLBACK_TRACKER|en tiempo real|Radar de Vuelos en Vivo/);
  assert.match(source, /trackerData, setTrackerData\] = useState\(null\)/);
  assert.match(source, /loading, setLoading\] = useState\(true\)/);
  assert.match(source, /role="alert"/);
  assert.match(source, /Reintentar asignaciones/);
  assert.match(source, /: trackerError \?/);
});
