import test from 'node:test';
import assert from 'node:assert/strict';
import { visibleMJCalendars } from './mjCalendarVisibility.js';

test('calendar readback matches accents, aliases, whitespace and Quito cycle labels', () => {
  for (const [stored, profile] of [
    ['Medellín', ' MEDELLIN '], ['Mexico', 'México'], ['México', 'CDMX'],
    ['Guayaquil', 'GYE'], ['UIO C2', 'Quito'], ['lima', 'LIM']
  ]) {
    const rows = JSON.parse(JSON.stringify([{ id: 'saved', sede: stored }, { id: 'other', sede: 'Cuenca' }]));
    assert.deepEqual(visibleMJCalendars(rows, { appRole: 'coordinador_mj', sede: profile }).map(row => row.id), ['saved']);
  }
});

test('calendar filtering preserves global visibility and excludes absent or different sedes', () => {
  const rows = [{ sede: 'Lima' }, { sede: 'Quito' }, {}];
  for (const appRole of ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'consolidado', 'director_maestria']) {
    assert.deepEqual(visibleMJCalendars(rows, { appRole }), rows);
  }
  assert.deepEqual(visibleMJCalendars(rows, { isSuperAdmin: true }), rows);
  assert.deepEqual(visibleMJCalendars(rows, null), []);
  assert.deepEqual(visibleMJCalendars(rows, { appRole: 'coordinador_mj' }), []);
  assert.deepEqual(visibleMJCalendars(rows, { appRole: 'coordinador_mj', sede: 'Cuenca' }), []);
});
