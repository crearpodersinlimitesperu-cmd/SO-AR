import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractTeamNumber,
  selectNodusEquipoForSede,
  summarizeNodusParticipants
} from '../src/services/nodusReportSync.js';

test('selectNodusEquipoForSede resuelve todas las sedes de Nodus correctamente', () => {
  const equipos = [
    { id: 153, nombre: 'EQUIPO 25', sede: 'CUENCA CICLO 1', fecha_inicio: '2026-11-02', participantes: 208 },
    { id: 152, nombre: 'EQUIPO 39', sede: 'GUAYAQUIL CICLO 1', fecha_inicio: '2026-10-27', participantes: 205 },
    { id: 149, nombre: 'EQUIPO 32', sede: 'LIMA CICLO 1', fecha_inicio: '2026-10-23', participantes: 152 },
    { id: 155, nombre: 'EQUIPO 33', sede: 'LIMA CICLO 1', fecha_inicio: '2026-11-27', participantes: 0 },
    { id: 154, nombre: 'EQUIPO 21', sede: 'MEDELLIN CICLO 1', fecha_inicio: '2026-11-20', participantes: 99 },
    { id: 146, nombre: 'EQUIPO 9', sede: 'MÉXICO CICLO 1', fecha_inicio: '2026-10-23', participantes: 41 },
    { id: 151, nombre: 'EQUIPO 131', sede: 'QUITO CICLO 1', fecha_inicio: '2026-11-06', participantes: 335 }
  ];

  assert.equal(selectNodusEquipoForSede(equipos, 'Cuenca')?.id, 153);
  assert.equal(selectNodusEquipoForSede(equipos, 'Guayaquil')?.id, 152);
  // Prioriza equipo con participantes > 0 cuando hay uno futuro vacío
  assert.equal(selectNodusEquipoForSede(equipos, 'Lima')?.id, 149);
  assert.equal(selectNodusEquipoForSede(equipos, 'Lima', '33')?.id, 155);
  assert.equal(selectNodusEquipoForSede(equipos, 'Medellín')?.id, 154);
  assert.equal(selectNodusEquipoForSede(equipos, 'México')?.id, 146);
  assert.equal(selectNodusEquipoForSede(equipos, 'Quito')?.id, 151);
});

test('summarizeNodusParticipants calcula conteos reales sin inventar valores', () => {
  const equipo = {
    id: 149,
    nombre: 'EQUIPO 32',
    sede: 'LIMA CICLO 1',
    etapa_vigente: 'PFD',
    fecha_inicio: '2026-10-23',
    fecha_fin: '2026-11-05'
  };
  const participantes = [
    { coordinador: 'ANA', capitulo1: { pagado: true, asistio: true, desertor: false }, capitulo2: { pagado: true, maestria: true } },
    { coordinador: 'ANA', capitulo1: { pagado: true, asistio: true, desertor: false }, capitulo2: { pagado: false, maestria: false } },
    { coordinador: 'LUIS', capitulo1: { pagado: false, asistio: false, desertor: true }, capitulo2: { pagado: false, maestria: false } }
  ];

  const summary = summarizeNodusParticipants(equipo, participantes);
  assert.equal(extractTeamNumber('EQUIPO 32'), '32');
  assert.equal(summary.totalPx, 3);
  assert.equal(summary.pagadosC1, 2);
  assert.equal(summary.sinPagarC1, 1);
  assert.equal(summary.asistieronC1, 2);
  assert.equal(summary.desertoresC1, 1);
  assert.equal(summary.pagadosC2, 1);
  assert.equal(summary.maestriaC2, 1);
  assert.deepEqual(summary.coordinadores, [
    { nombre: 'ANA', total: 2 },
    { nombre: 'LUIS', total: 1 }
  ]);
});
