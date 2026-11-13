import test from 'node:test';
import assert from 'node:assert/strict';
import { getLimaMaestriaCheckinInfo } from '../src/utils/maestriaLimaCheckin.js';

test('getLimaMaestriaCheckinInfo devuelve los enlaces exactos para Equipos 30, 31 y 32 de Lima', () => {
  const e30 = getLimaMaestriaCheckinInfo('Equipo 30 — Tinkuy Ruray');
  assert.equal(e30?.teamNumber, '30');
  assert.equal(e30?.url, 'https://imo.crearpslglobal.com/maestria/checkin/134/TFD');

  const e31 = getLimaMaestriaCheckinInfo('Equipo 31 — Imperio del Éxito');
  assert.equal(e31?.teamNumber, '31');
  assert.equal(e31?.url, 'https://imo.crearpslglobal.com/maestria/checkin/141/SFD');

  const e32 = getLimaMaestriaCheckinInfo('Equipo 32 — Sede Lima (Cohorte Actual)');
  assert.equal(e32?.teamNumber, '32');
  assert.equal(e32?.url, 'https://imo.crearpslglobal.com/maestria/checkin/149/PFD');
});

test('getLimaMaestriaCheckinInfo retorna null para cohortes sin enlace mapeado', () => {
  assert.equal(getLimaMaestriaCheckinInfo('Equipo 29 — Quantum Phoenix'), null);
  assert.equal(getLimaMaestriaCheckinInfo('Otra Cohorte / Rezagado Autorizado'), null);
  assert.equal(getLimaMaestriaCheckinInfo(''), null);
});
