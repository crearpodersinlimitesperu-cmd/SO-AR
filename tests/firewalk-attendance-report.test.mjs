import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEnrichedFirewalkRoster,
  computeFirewalkAttendanceSummary,
  formatWhatsAppFirewalkReport,
  buildFirewalkAttendanceCsv,
  TEAM_MAPPING_PRESETS
} from '../src/utils/firewalkAttendanceReport.js';

test('Auto-detects active student teams from Nodus/Padron while keeping graduated Managers unassigned until manually assigned', () => {
  const nodusIndex = {
    byDoc: new Map([
      ['70000001', { equipo: 'EQUIPO 31', tipo: 'px' }],
      ['70000002', { equipo: 'EQUIPO 18', tipo: 'manager' }]
    ]),
    byName: new Map()
  };

  const contracts = [
    { id: 'doc_70000001', nombre: 'Alumno Uno', numeroDocumento: '70000001', rol: 'Participante' },
    { id: 'doc_70000002', nombre: 'Manager Graduado', numeroDocumento: '70000002', rol: 'Manager' },
    { id: 'doc_70000003', nombre: 'Aliada Lima', numeroDocumento: '70000003', rol: 'Aliados' },
    { id: 'doc_70000004', nombre: 'Staff Fuego', numeroDocumento: '70000004', rol: 'Staff de Caminata' }
  ];

  const roster = buildEnrichedFirewalkRoster({
    signedContracts: contracts,
    attendanceMap: {},
    padronList: [],
    nodusIndex
  });

  assert.equal(roster[0].equipoAsignado, 'Equipo 31');
  assert.equal(roster[0].bloqueReporte, '1er FDS');
  assert.equal(roster[0].categoriaReporte, 'Px');

  // Manager graduado en E18 debe quedar sin equipo actual para que coordinación elija a qué FDS apoya hoy
  assert.equal(roster[1].equipoAsignado, '');
  assert.equal(roster[1].graduadoRef, 'Equipo 18');
  assert.equal(roster[1].categoriaReporte, 'MG');

  assert.equal(roster[2].equipoAsignado, 'Aliados');
  assert.equal(roster[2].categoriaReporte, 'Aliados');

  assert.equal(roster[3].equipoAsignado, 'Staff');
  assert.equal(roster[3].categoriaReporte, 'Staff');
});

test('Generates exact WhatsApp template format with exact arithmetic', () => {
  const contracts = [
    // 1er FDS (Equipo 31): 2 Px, 1 MG
    { id: '1', nombre: 'Px A', numeroDocumento: '10000001', rol: 'Participante' },
    { id: '2', nombre: 'Px B', numeroDocumento: '10000002', rol: 'Participante' },
    { id: '3', nombre: 'Mg A', numeroDocumento: '10000003', rol: 'Manager' },
    // 2do FDS (Equipo 30): 1 Px, 1 MG
    { id: '4', nombre: 'Px C', numeroDocumento: '10000004', rol: 'Participante' },
    { id: '5', nombre: 'Mg B', numeroDocumento: '10000005', rol: 'Capitán' },
    // 3er. FDS (Equipo 29): 3 Px, 0 MG
    { id: '6', nombre: 'Px D', numeroDocumento: '10000006', rol: 'Participante' },
    { id: '7', nombre: 'Px E', numeroDocumento: '10000007', rol: 'Participante' },
    { id: '8', nombre: 'Px F', numeroDocumento: '10000008', rol: 'Participante' },
    // Aliados: 2
    { id: '9', nombre: 'Aliado 1', numeroDocumento: '10000009', rol: 'Aliados' },
    { id: '10', nombre: 'Aliado 2', numeroDocumento: '10000010', rol: 'Aliados' }
  ];

  const attendanceMap = {
    doc_10000001: { equipoAsignado: 'Equipo 31', asistio: true },
    doc_10000002: { equipoAsignado: 'Equipo 31', asistio: true },
    doc_10000003: { equipoAsignado: 'Equipo 31', asistio: false },
    doc_10000004: { equipoAsignado: 'Equipo 30', asistio: true },
    doc_10000005: { equipoAsignado: 'Equipo 30', asistio: true },
    doc_10000006: { equipoAsignado: 'Equipo 29', asistio: true },
    doc_10000007: { equipoAsignado: 'Equipo 29', asistio: false },
    doc_10000008: { equipoAsignado: 'Equipo 29', asistio: true },
    doc_10000009: { equipoAsignado: 'Aliados', asistio: true },
    doc_10000010: { equipoAsignado: 'Aliados', asistio: false }
  };

  const roster = buildEnrichedFirewalkRoster({
    signedContracts: contracts,
    attendanceMap
  });

  // Modo REGISTRADOS
  const sumReg = computeFirewalkAttendanceSummary(roster, { countMode: 'REGISTRADOS' });
  const textReg = formatWhatsAppFirewalkReport(sumReg, { tituloSufijo: 'C2' });

  const expectedReg = [
    '*Asistencia Caminata sobre fuego* C2',
    '1er FDS\nPx 2\nMG 1',
    '2do FDS\nPx 1\nMG 1',
    '3er. FDS\nPx 3\nMG 0',
    '*Total*\nPx 6\nMG 2\n*Total 8*',
    'Aliados: 2'
  ].join('\n\n');

  assert.equal(textReg, expectedReg);

  // Modo ASISTIERON (solo check-in true)
  const sumAsist = computeFirewalkAttendanceSummary(roster, { countMode: 'ASISTIERON' });
  const textAsist = formatWhatsAppFirewalkReport(sumAsist, { tituloSufijo: 'C2' });

  const expectedAsist = [
    '*Asistencia Caminata sobre fuego* C2',
    '1er FDS\nPx 2\nMG 0',
    '2do FDS\nPx 1\nMG 1',
    '3er. FDS\nPx 2\nMG 0',
    '*Total*\nPx 5\nMG 1\n*Total 6*',
    'Aliados: 1'
  ].join('\n\n');

  assert.equal(textAsist, expectedAsist);

  // CSV export check
  const csv = buildFirewalkAttendanceCsv(roster);
  assert.ok(csv.includes('"Px A"'));
  assert.ok(csv.includes('"Equipo 31"'));
  assert.ok(TEAM_MAPPING_PRESETS.length >= 3);
});
