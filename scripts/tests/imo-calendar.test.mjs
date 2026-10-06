import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOfficialCalendar, applyCalendarChanges, findC1Dates } from '../../src/features/imo/missionCalendar.js';
const response = rows => `google.visualization.Query.setResponse(${JSON.stringify({ table: { rows: rows.map(values => ({ c: values.map(v => ({ v })) })) } })});`;
test('official C1 date is scoped by sede and team, never inferred from adjacent teams', () => {
  const events = parseOfficialCalendar(response([
    ['Date(2026,9,16)', 'LIM', 32, 'CAPITULO UNO'],
    ['Date(2026,9,17)', 'UIO C1', 32, 'CAPITULO UNO'],
    ['Date(2026,9,23)', 'LIM', 32, 'CAPITULO DOS'],
    ['Date(2026,8,11)', 'LIM', 30, 'CAPITULO UNO'],
  ]));
  assert.deepEqual(findC1Dates(events, 'Lima', 32).map(e => e.date), ['2026-10-16']);
  assert.deepEqual(findC1Dates(events, 'Quito', 32).map(e => e.date), ['2026-10-17']);
  assert.equal(findC1Dates(events, 'Lima', 31).length, 0);
});
test('Causa date changes supersede official date without retaining stale option', () => {
  const events = parseOfficialCalendar(response([['Date(2026,9,16)', 'LIM', 32, 'CAPITULO UNO']]));
  const changed = applyCalendarChanges(events, [{ kind: 'override', sourceEventKey: events[0].key, fechaInicio: '2026-10-23T09:00:00' }]);
  assert.equal(findC1Dates(changed, 'Lima', 32)[0].date, '2026-10-23');
  assert.equal(events[0].date, '2026-10-16');
});
test('multiple official dates remain explicit choices, unreadable calendars fail closed', () => {
  const events = parseOfficialCalendar(response([['Date(2026,9,16)', 'UIO C1', 32, 'CAPITULO UNO'], ['Date(2026,9,17)', 'UIO C2', 32, 'CAPITULO UNO']]));
  assert.equal(findC1Dates(events, 'Quito', 32).length, 2);
  assert.throws(() => parseOfficialCalendar('<html>Unavailable</html>'));
  assert.throws(() => parseOfficialCalendar('{}'));
});
