import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { canonicalSede } from '../src/utils/sede.js';
import { buildTeamKeyResolver } from '../src/utils/teamGrouping.js';

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

test('resolveManagerEstado: managers de cohortes anteriores cuyo EL VIAJE ya concluyó se resuelven como Graduado', () => {
  const closedSamples = [
    { id: 'lim26', nombre: 'Brian Steve Sangay Salvatierra', equipo: 'PROMETHEUS IGNIS', numEquipo: '26', sede: 'Lima', estado: 'Activo' },
    { id: 'lim29', nombre: 'Manager E29 Lima', equipo: 'EQUIPO 29', numEquipo: '29', sede: 'Lima', estado: 'Activo' },
    { id: 'gye35', nombre: 'Manager E35 GYE', equipo: 'KUNTUR SHINSEI', numEquipo: '35', sede: 'Guayaquil', estado: 'Activo' },
    { id: 'cue21', nombre: 'Manager E21 Cuenca', equipo: 'LOTUS IKIGAI', numEquipo: '21', sede: 'Cuenca', estado: 'Activo' },
    { id: 'med17', nombre: 'Manager E17 Medellín', equipo: 'EQUIPO 17', numEquipo: '17', sede: 'Medellín', estado: 'Activo' },
    { id: 'mex6', nombre: 'Manager E6 México', equipo: 'EQUIPO 6', numEquipo: '6', sede: 'México', estado: 'Activo' },
    { id: 'uio125', nombre: 'Ruben Cadena', equipo: 'HATUN PUSHAK', numEquipo: '125', sede: 'Quito', estado: 'Activo' },
    { id: 'glob125', nombre: 'Carolina Santamaria', equipo: 'HATUN PUSHAK', numEquipo: '125', sede: 'Global', estado: 'Activo' }
  ];
  for (const sample of closedSamples) {
    assert.equal(resolveManagerEstado(sample), 'Graduado', `Se esperaba Graduado para ${sample.id}`);
  }
});

test('resolveManagerEstado: cohortes en curso de 90 días (MJ vigente) permanecen como Activo para entrenadores', () => {
  const activeSamples = [
    // Equipos activos de Alejandro Díaz y demás entrenadores en noviembre 2026
    { id: 'lim30', nombre: 'Karin Portocarrero Perea', equipo: 'TINKUY RURAY', numEquipo: '30', sede: 'Lima', estado: 'Activo' },
    { id: 'lim31', nombre: 'Manager E31 Lima', equipo: 'EQUIPO 31', numEquipo: '31', sede: 'Lima', estado: 'Activo' },
    { id: 'lim32', nombre: 'Manager E32 Lima', equipo: 'EQUIPO 32', numEquipo: '32', sede: 'Lima', estado: 'Activo' },
    { id: 'gye36', nombre: 'MANUEL ALCIVAR', equipo: 'UBUNTU ÁGAPE', numEquipo: '36', sede: 'Guayaquil', estado: 'Activo' },
    { id: 'gye37', nombre: 'Manager E37 GYE', equipo: 'QUANTUM AMARU', numEquipo: '37', sede: 'Guayaquil', estado: 'Activo' },
    { id: 'cue22', nombre: 'Manager E22 Cuenca', equipo: 'JAGUARUNDIS KAWSAY', numEquipo: '22', sede: 'Cuenca', estado: 'Activo' },
    { id: 'cue23', nombre: 'LUIS DAVID REGALADO VEGA', equipo: 'KRATOS', numEquipo: '23', sede: 'Cuenca', estado: 'Activo' },
    { id: 'med18', nombre: 'Manager E18 Medellín', equipo: 'ATARAXIA', numEquipo: '18', sede: 'Medellín', estado: 'Activo' },
    { id: 'mex7', nombre: 'Normal Leal Pérez', equipo: 'MAYEUTICA PACHAMAMA', numEquipo: '7', sede: 'México', estado: 'Activo' },
    { id: 'uio126', nombre: 'Manager E126 Quito', equipo: 'AGUILAS DE FUEGO', numEquipo: '126', sede: 'Quito', estado: 'Activo' },
    { id: 'uio127', nombre: 'Manager E127 Quito', equipo: 'KUNTUR IDAI', numEquipo: '127', sede: 'Quito', estado: 'Activo' }
  ];
  for (const sample of activeSamples) {
    assert.equal(resolveManagerEstado(sample), 'Activo', `Se esperaba Activo para ${sample.id}`);
  }
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

test('buildTeamKeyResolver: unifica capitán con nombre placeholder "-" en el equipo real de la misma sede y número', () => {
  const rows = [
    { id: '1793812240240', sede: 'Lima', numEquipo: 30, equipo: '-', nombre: 'Fernando Lopez Lopez', rol: 'CAPITAN' },
    { id: '1789155161207', sede: 'Lima', numEquipo: 30, equipo: 'TINKUY RURAY', nombre: 'Karin Portocarrero Perea', rol: 'Manager' }
  ];
  const resolveKey = buildTeamKeyResolver(rows, normalizeSede);
  assert.equal(resolveKey(rows[0]), 'Lima_TINKUY RURAY#30');
  assert.equal(resolveKey(rows[1]), 'Lima_TINKUY RURAY#30');
});

test('resolveManagerEstado: Cuenca #22 JAGUARUNDIS KAWSAY (Bryan Montero) con EL VIAJE el 2026-11-20 permanece Activo', () => {
  const bryan = {
    id: '1788360620000',
    nombre: 'Bryan Montero',
    rol: 'Capitan',
    equipo: 'JAGUARUNDIS KAWSAY',
    numEquipo: 22,
    sede: 'Cuenca',
    entrenador: 'Lourdes Patiño',
    estado: 'Activo',
    cierreLiquidacionActivo: false
  };
  const cuencaEvents = [
    {
      nombre: 'EL VIAJE',
      sede: 'CUE',
      equipo: '22',
      fecha_inicio: '2026-11-20T00:00:00',
      fecha_fin: '2026-11-22T00:00:00'
    }
  ];
  assert.equal(resolveManagerEstado(bryan, cuencaEvents), 'Activo');
});

test('resolveManagerEstado: respeta estadoReactivadoManual cuando Coordinación reactiva a un integrante por llamada pendiente o graduación reprogramada', () => {
  const reactivado = {
    id: 'm-reactivado',
    nombre: 'Integrante Reprogramado',
    equipo: 'LOTUS IKIGAI',
    numEquipo: 21,
    sede: 'Cuenca',
    estado: 'Activo',
    cierreLiquidacionActivo: false,
    isGraduado: false,
    estadoReactivadoManual: true
  };
  const pastEvents = [
    {
      nombre: 'EL VIAJE',
      sede: 'CUE',
      equipo: '21',
      fecha_inicio: '2026-10-30T00:00:00',
      fecha_fin: '2026-11-01T00:00:00'
    }
  ];
  assert.equal(resolveManagerEstado(reactivado, pastEvents), 'Activo');

  // Al cerrar liquidación o marcar Graduado explícitamente, vuelve a ser Graduado
  assert.equal(resolveManagerEstado({ ...reactivado, cierreLiquidacionActivo: true }, pastEvents), 'Graduado');
  assert.equal(resolveManagerEstado({ ...reactivado, estado: 'Graduado' }, pastEvents), 'Graduado');
});

test('CentroManagers UI: handleOpenEditIndividual y handleOpenEditTeam inicializan estado con resolveManagerEstado(m, events)', () => {
  const editIndMatch = source.match(/const handleOpenEditIndividual = \(m\) => \{[\s\S]+?\n  \};/);
  assert.ok(editIndMatch, 'handleOpenEditIndividual debe existir');
  assert.match(editIndMatch[0], /estado:\s*resolveManagerEstado\(m,\s*events\)/);

  const editTeamMatch = source.match(/const handleOpenEditTeam = \(team\) => \{[\s\S]+?\n  \};/);
  assert.ok(editTeamMatch, 'handleOpenEditTeam debe existir');
  assert.match(editTeamMatch[0], /estado:\s*resolveManagerEstado\(m,\s*events\)/);
});
