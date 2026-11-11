import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { canonicalSede } from '../src/utils/sede.js';

const source = readFileSync(new URL('../src/pages/CentroManagers.jsx', import.meta.url), 'utf8');
const userData = readFileSync(new URL('../src/data/usersData.js', import.meta.url), 'utf8');

const normalizeSede = runInNewContext(
  `(${userData.match(/export const normalizeSede = ([\s\S]+?\n\});/)[1]})`,
  { canonicalSede }
);

const sandbox = {
  normalizeSede,
  console
};

const getTeamNumericValueCode = source.match(/export const getTeamNumericValue = ([\s\S]+?\n\};)/)[1];
const activeThresholdsCode = source.match(/export const ACTIVE_COHORTE_THRESHOLDS = (\{[\s\S]+?\n\};)/)[1];
const resolveManagerEstadoCode = source.match(/export const resolveManagerEstado = ([\s\S]+?\n\};)/)[1];

runInNewContext(`
  const getTeamNumericValue = ${getTeamNumericValueCode}
  const ACTIVE_COHORTE_THRESHOLDS = ${activeThresholdsCode}
  const resolveManagerEstado = ${resolveManagerEstadoCode}
  sandbox.resolveManagerEstado = resolveManagerEstado;
  sandbox.ACTIVE_COHORTE_THRESHOLDS = ACTIVE_COHORTE_THRESHOLDS;
`, { sandbox, normalizeSede, Date });

const { resolveManagerEstado } = sandbox;

test('resolveManagerEstado: managers con cierre de liquidacion se resuelven como Graduado', () => {
  const m = {
    id: 'm1',
    nombre: 'Anita Esperanza Flores Tipismana',
    equipo: 'PROMETHEUS IGNIS',
    numEquipo: '26',
    sede: 'Lima',
    estado: 'Activo',
    cierreLiquidacionActivo: true
  };
  assert.equal(resolveManagerEstado(m), 'Graduado');
});

test('resolveManagerEstado: managers de cohortes anteriores cerradas se resuelven como Graduado', () => {
  const mE26 = {
    id: 'm2',
    nombre: 'Brian Steve Sangay Salvatierra',
    equipo: 'PROMETHEUS IGNIS',
    numEquipo: '26',
    sede: 'Lima',
    estado: 'Activo'
  };
  assert.equal(resolveManagerEstado(mE26), 'Graduado');

  const mE31 = {
    id: 'm3',
    nombre: 'EVELYN FLIRES RIVERA',
    equipo: 'EQUIPO 31',
    numEquipo: '31',
    sede: 'Lima',
    estado: 'Activo'
  };
  assert.equal(resolveManagerEstado(mE31), 'Graduado');
});

test('resolveManagerEstado: managers de cohorte activa vigente permanecen como Activo', () => {
  const mE32 = {
    id: 'm4',
    nombre: 'Manager Activo E32',
    equipo: 'EQUIPO 32',
    numEquipo: '32',
    sede: 'Lima',
    estado: 'Activo'
  };
  assert.equal(resolveManagerEstado(mE32), 'Activo');

  const mGye37 = {
    id: 'm5',
    nombre: 'Manager Activo GYE',
    equipo: 'EQUIPO 37',
    numEquipo: '37',
    sede: 'Guayaquil',
    estado: 'Activo'
  };
  assert.equal(resolveManagerEstado(mGye37), 'Activo');
});

test('resolveManagerEstado: preserva estados de Desertor y Archivado sin alterarlos', () => {
  const mDesertor = {
    id: 'm6',
    nombre: 'Desertor',
    equipo: 'EQUIPO 32',
    numEquipo: '32',
    sede: 'Lima',
    estado: 'Desertor'
  };
  assert.equal(resolveManagerEstado(mDesertor), 'Desertor');
});
