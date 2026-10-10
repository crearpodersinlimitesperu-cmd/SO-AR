import test from 'node:test';
import assert from 'node:assert/strict';
import { formatFlyerC1Dates, localCalendarDay, nextFlyerC1Event, parseCalendarDay } from './flyerDates.js';

test('Quito team 130 preserves the explicit October/November range', () => {
  assert.equal(formatFlyerC1Dates('2026-10-30T00:00:00', '2026-11-01T00:00:00'),
    '30 de octubre al 1 de noviembre');
});

test('missing C1 end uses three inclusive days without an uncertainty label', () => {
  for (const end of [undefined, null, '']) {
    assert.equal(formatFlyerC1Dates('2026-10-30', end),
      '30 de octubre al 1 de noviembre');
    assert.equal(formatFlyerC1Dates('2026-10-23', end),
      '23, 24 y 25 de octubre');
  }
});

test('explicit durations, single days and year boundaries are respected', () => {
  assert.equal(formatFlyerC1Dates('2026-10-23', '2026-10-23'), '23 de octubre');
  assert.equal(formatFlyerC1Dates('2026-10-23', '2026-10-24'), '23 al 24 de octubre');
  assert.equal(formatFlyerC1Dates('2026-10-23', '2026-10-27'), '23 al 27 de octubre');
  assert.equal(formatFlyerC1Dates('2026-12-31', '2027-01-02'),
    '31 de diciembre de 2026 al 2 de enero de 2027');
  assert.equal(formatFlyerC1Dates('2028-02-28'), '28 de febrero al 1 de marzo');
});

test('invalid dates and reversed ranges visibly require confirmation', () => {
  for (const start of ['', undefined, 123, 'invalid', '2026-02-30', '2026-13-01', '2026-10-30Tinvalid']) {
    assert.equal(formatFlyerC1Dates(start), 'Fecha por confirmar');
    assert.equal(parseCalendarDay(start), null);
  }
  for (const end of ['invalid', '2026-02-30', '2026-10-29']) {
    assert.equal(formatFlyerC1Dates('2026-10-30', end), 'Fecha por confirmar');
  }
});

test('calendar civil days never shift for timestamp offsets or browser time zones', () => {
  const originalTZ = process.env.TZ;
  try {
    for (const tz of ['America/Lima', 'America/Mexico_City', 'Pacific/Kiritimati', 'UTC']) {
      process.env.TZ = tz;
      assert.equal(formatFlyerC1Dates('2026-10-30T23:00:00-05:00', '2026-11-01T00:00:00+14:00'),
        '30 de octubre al 1 de noviembre');
      const local = new Date(2026, 9, 30, 23, 59);
      assert.equal(localCalendarDay(local), '2026-10-30');
      const event = { nombre: 'C1 Equipo130', sede: 'UIO', start: '2026-10-30T00:00:00Z' };
      assert.equal(nextFlyerC1Event([event], ['UIO'], localCalendarDay(local)), event);
    }
  } finally {
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
  }
});

test('all six flyer venues select the next official C1 without mutating source data', () => {
  const fixtures = [
    ['MEX', 9, '2026-10-23', '23, 24 y 25 de octubre'],
    ['LIM', 32, '2026-10-23', '23, 24 y 25 de octubre'],
    ['UIO', 130, '2026-10-30', '30 de octubre al 1 de noviembre'],
    ['GYE', 39, '2026-11-13', '13, 14 y 15 de noviembre'],
    ['CUE', 24, '2026-10-16', '16, 17 y 18 de octubre'],
    ['MED', 20, '2026-10-16', '16, 17 y 18 de octubre']
  ];
  const events = fixtures.map(([sede, equipo, start]) =>
    Object.freeze({ nombre: 'CAPÍTULO UNO', sede, equipo, fecha_inicio: start }));
  const before = JSON.stringify(events);
  for (const [sede, equipo, start, expected] of fixtures) {
    const selected = nextFlyerC1Event([
      { nombre: 'C1 anterior', sede, start: '2026-10-02' },
      { name: 'CAPITULO UNO', place: sede, start: '2027-01-01' },
      { nombre: 'CAPÍTULO DOS', sede, start: '2026-10-10' },
      { nombre: 'C1 inválido', sede, start: '2026-13-01' },
      ...events
    ], [sede], '2026-10-10');
    assert.equal(selected.equipo, equipo);
    assert.equal(selected.fecha_inicio, start);
    assert.equal(formatFlyerC1Dates(start), expected);
  }
  assert.equal(JSON.stringify(events), before);
  assert.equal(nextFlyerC1Event(events, ['UNKNOWN'], '2026-10-10'), undefined);
});
