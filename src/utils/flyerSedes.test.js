import test from 'node:test';
import assert from 'node:assert/strict';
import { FLYER_MODE_ALL, FLYER_MODE_SINGLE, flyerFileName, selectFlyerSedes } from './flyerSedes.js';

const sedes = [
  { id: 'uio', ciudad: 'Quito', fechas: 'A', activo: true },
  { id: 'lim', ciudad: 'Lima', fechas: 'B', activo: true },
  { id: 'med', ciudad: 'Medellín', fechas: 'C', activo: false },
  { id: 'sede_1', ciudad: 'Nueva Sede', fechas: 'D', activo: true }
];

test('all-sedes mode keeps every active venue in order', () => {
  const result = selectFlyerSedes(sedes, FLYER_MODE_ALL, 'lim');
  assert.deepEqual(result.sedes.map(s => s.id), ['uio', 'lim', 'sede_1']);
  assert.equal(result.error, null);
});

test('single mode returns only the selected active venue, including new venues', () => {
  assert.deepEqual(selectFlyerSedes(sedes, FLYER_MODE_SINGLE, 'lim').sedes, [sedes[1]]);
  assert.deepEqual(selectFlyerSedes(sedes, FLYER_MODE_SINGLE, 'sede_1').sedes, [sedes[3]]);
});

test('single mode blocks inactive, missing or empty selections with feedback', () => {
  for (const id of ['med', 'nope', '', undefined]) {
    const result = selectFlyerSedes(sedes, FLYER_MODE_SINGLE, id);
    assert.deepEqual(result.sedes, []);
    assert.match(result.error, /Selecciona una sede activa/);
  }
  const none = selectFlyerSedes(sedes.map(s => ({ ...s, activo: false })), FLYER_MODE_SINGLE, 'lim');
  assert.match(none.error, /No hay sedes activas/);
  assert.match(selectFlyerSedes([], FLYER_MODE_ALL).error, /al menos una sede/);
});

test('file name includes the venue only in single mode', () => {
  assert.equal(flyerFileName('CAPÍTULO UNO', FLYER_MODE_ALL, sedes[1]), 'Flyer_Oficial_CPSL_CAPÍTULO_UNO_1080x1920.png');
  assert.equal(flyerFileName('CAPÍTULO UNO', FLYER_MODE_SINGLE, sedes[1]), 'Flyer_Oficial_CPSL_CAPÍTULO_UNO_Lima_1080x1920.png');
  assert.equal(flyerFileName('CAPÍTULO UNO', FLYER_MODE_SINGLE, { id: 'med', ciudad: 'Medellín' }), 'Flyer_Oficial_CPSL_CAPÍTULO_UNO_Medellin_1080x1920.png');
});
