import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isSingleDayTrainingName,
  updateDraftStartDate,
  toggleSingleDayMode
} from '../src/utils/trainingDateEditor.js';

describe('trainingDateEditor: entrenamientos de 1 día y sincronización de fecha final', () => {
  it('detecta entrenamientos de 1 día como CAMINATA SOBRE FUEGO', () => {
    assert.equal(isSingleDayTrainingName('CAMINATA SOBRE FUEGO'), true);
    assert.equal(isSingleDayTrainingName('Caminata sobre fuego Lima'), true);
    assert.equal(isSingleDayTrainingName('CAPITULO UNO'), false);
  });

  it('updateDraftStartDate sincroniza fechaFin automáticamente cuando soloUnDia es true', () => {
    const prev = { nombre: 'CAMINATA SOBRE FUEGO', fechaInicio: '2027-01-28', fechaFin: '2027-01-28', soloUnDia: true };
    const next = updateDraftStartDate(prev, '2027-03-04');
    assert.equal(next.fechaInicio, '2027-03-04');
    assert.equal(next.fechaFin, '2027-03-04');
  });

  it('updateDraftStartDate evita fechaFin anterior en entrenamientos multi-día preservando la duración', () => {
    const prev = { nombre: 'CAPITULO UNO', fechaInicio: '2027-01-15', fechaFin: '2027-01-17', soloUnDia: false };
    const next = updateDraftStartDate(prev, '2027-03-05');
    assert.equal(next.fechaInicio, '2027-03-05');
    assert.equal(next.fechaFin, '2027-03-07');
  });

  it('toggleSingleDayMode al activarse iguala fechaFin a fechaInicio', () => {
    const prev = { fechaInicio: '2027-03-04', fechaFin: '2027-01-28', soloUnDia: false };
    const next = toggleSingleDayMode(prev, true);
    assert.equal(next.soloUnDia, true);
    assert.equal(next.fechaFin, '2027-03-04');
  });
});
