import test from 'node:test';
import assert from 'node:assert/strict';
import { flyerEventType, flyerEventTeam, flyerEventDates, flyerCalendarEvents, synchronizeFlyerRows, FLYER_VENUES } from './flyerPrograms.js';
import { selectFlyerSedes, flyerFileName, FLYER_MODE_ALL, FLYER_MODE_SINGLE } from './flyerSedes.js';

const today = '2026-10-10';
const venue = FLYER_VENUES.find(item => item.id === 'uio');
const event = (nombre, start, equipo = '7', sede = 'UIO') =>
  ({ nombre, fecha_inicio: start, equipo, sede });

test('explicit programs support accents, spacing, numeral and team variants', () => {
  for (const [name, type] of [
    ['CAPÍTULO UNO', 'C1'], [' capítulo 1 ', 'C1'], ['C1 Equipo130', 'C1'],
    ['C1E7', 'C1'], ['CAPITULO DOS', 'C2'], ['Capítulo 2 - Equipo #8', 'C2'],
    ['C2', 'C2'], ['CREACIO\u0301N', 'CREACION'], ['MJ · Creación', 'CREACION'],
    ['PRIMER  FDS:  CREACIÓN.', 'CREACION'], ['Maestría del Juego: Relación', 'RELACION'],
    ['SEGUNDO FDS: RELACIÓN', 'RELACION'], ['TERCER FDS: GRATITUD', 'GRATITUD'],
    ['Gratitud Equipo 9', 'GRATITUD']
  ]) {
    assert.equal(flyerEventType({ nombre: name }), type, name);
    assert.equal(flyerEventType({ name }), type, name);
  }
});

test('ambiguous and non-program names never infer a phase', () => {
  for (const nombre of ['MAESTRIA DEL JUEGO', 'MJ', 'PRIMER FDS', 'gratid',
    'IMPACTO RELACION', 'IMPACTO GRATITUD', 'Reunión de Creación',
    'Creación y Relación', 'CAPÍTULO UNO Creación', 'C10', 'CREACIONISTA', 'Capítulo Dosificación']) {
    assert.equal(flyerEventType({ nombre }), null, nombre);
  }
});

test('filter selects real future events for the exact venue and program without mutation', () => {
  const events = Object.freeze([
    Object.freeze(event('C2', '2026-10-20', '8')),
    Object.freeze(event('C2', '2026-10-12', '7', 'Quito')),
    Object.freeze(event('C2', '2026-10-09')),
    Object.freeze(event('C1', '2026-10-11')),
    Object.freeze(event('C2', '2026-10-11', '9', 'UIO2')),
    Object.freeze(event('C2', '2026-02-30'))
  ]);
  const result = flyerCalendarEvents(events, 'C2', venue, today);
  assert.deepEqual(result.map(item => item.equipo), ['7', '8']);
  assert.equal(result[0], events[1]);
  assert.equal(events[0].fecha_inicio, '2026-10-20');
  for (const sede of ['México', 'MEX', 'CDMX']) {
    assert.equal(flyerCalendarEvents([event('Relación', today, '3', sede)], 'RELACION', FLYER_VENUES[0], today).length, 1);
  }
  assert.equal(flyerCalendarEvents([event('Creación', today, '3', 'Medelli\u0301n')], 'CREACION', FLYER_VENUES[5], today).length, 1);
});

test('team comes from explicit fields or explicit name, never a guessed cohort', () => {
  assert.equal(flyerEventTeam({ equipo: 0 }), 'Equipo 0');
  assert.equal(flyerEventTeam({ team: 7 }), 'Equipo 7');
  assert.equal(flyerEventTeam({ equipo: 'Equipo 7' }), 'Equipo 7');
  assert.equal(flyerEventTeam({ name: 'C2E7' }), 'Equipo 7');
  assert.equal(flyerEventTeam({ nombre: 'Creación Equipo 9' }), 'Equipo 9');
  assert.equal(flyerEventTeam({ nombre: 'Gratitud' }), '');
  assert.equal(flyerEventTeam({ equipo: '7/8/9' }), '7/8/9');
});

test('dates respect civil days and explicit duration; only C1 retains legacy inference', () => {
  const dated = { start: '2026-10-30T23:00:00-05:00', end: '2026-11-01T00:00:00Z' };
  for (const type of ['C1', 'C2', 'CREACION', 'RELACION', 'GRATITUD']) {
    assert.equal(flyerEventDates(dated, type), '30 de octubre al 1 de noviembre');
  }
  assert.equal(flyerEventDates({ start: today }, 'C1'), '10, 11 y 12 de octubre');
  for (const type of ['C2', 'CREACION', 'RELACION', 'GRATITUD']) {
    assert.equal(flyerEventDates({ start: today }, type), '10 de octubre (fin por confirmar)');
    assert.equal(flyerEventDates({ start: today, end: 'invalid' }, type), 'Fecha por confirmar');
  }
});

test('zero results leave no dates or stale teams and cannot export', () => {
  for (const type of ['C1', 'C2', 'CREACION', 'RELACION', 'GRATITUD']) {
    const rows = synchronizeFlyerRows([event('MJ', today)], type, today);
    assert.ok(rows.every(row => !row.activo && row.fechas === '' && row.equipo === '' && row.notice.startsWith('Sin fechas de ')));
    assert.ok(selectFlyerSedes(rows, FLYER_MODE_ALL).error);
    assert.ok(selectFlyerSedes(rows.map(row => ({ ...row, activo: true })), FLYER_MODE_ALL).error);
  }
  assert.equal(flyerCalendarEvents(undefined, 'C1', venue, today).length, 0);
});

test('synced row associates next date and team; single filename sanitizes all components', () => {
  const rows = synchronizeFlyerRows([event('C2', '2026-10-12', 'Equipo 7')], 'C2', today);
  const row = rows.find(item => item.id === 'uio');
  assert.equal(row.equipo, 'Equipo 7');
  assert.equal(row.fechas, '12 de octubre (fin por confirmar)');
  assert.equal(row.source, 'calendario');
  assert.deepEqual(selectFlyerSedes(rows, FLYER_MODE_SINGLE, 'uio').sedes, [row]);
  assert.equal(flyerFileName('RELACIÓN/../../', FLYER_MODE_SINGLE, { ciudad: 'México/..', equipo: 'Equipo #7/8' }),
    'Flyer_Oficial_CPSL_RELACIÓN_Mexico_Equipo_7_8_1080x1920.png');
});

test('manual empty dates and more than six venues block export to preserve 9:16', () => {
  const row = { id: 'uio', ciudad: 'Quito', fechas: '', activo: true, source: 'manual' };
  assert.match(selectFlyerSedes([row], FLYER_MODE_ALL).error, /Completa las fechas/);
  const rows = Array.from({ length: 7 }, (_, id) => ({ ...row, id, fechas: '10 de octubre' }));
  assert.match(selectFlyerSedes(rows, FLYER_MODE_ALL).error, /hasta seis sedes/);
  assert.equal(selectFlyerSedes(rows, FLYER_MODE_SINGLE, 0).error, null);
});
