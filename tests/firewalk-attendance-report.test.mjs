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

test('Forensic safeguards: Nodus DNI precedence over surname homonyms, MG auto-correction from etapas, 1-digit DNI typo recovery by exact phone+name, and zero false MG<-Participante padron cross-assignment', () => {
  const padronList = [
    { equipo: 'Equipo 31', nombre: 'Ruth Sandra Quispe Quispe', rol: 'Participante' },
    { equipo: 'Equipo 32', nombre: 'Charo Aponte', rol: 'Participante' },
    { equipo: 'Equipo 30', nombre: 'Ruth Yesly Pilco Laura', rol: 'Manager' }
  ];
  const capitanesList = [
    { sede: 'Lima', numEquipo: 30, nombre: 'Fernando Lopez Lopez', rol: 'Capitán' },
    { sede: 'Lima', numEquipo: 32, nombre: 'Anita Esperanza Flores Tipismana', rol: 'Capitán' }
  ];

  const nodusIndex = {
    byDoc: new Map([
      ['45141505', { docNorm: '45141505', equipo: 'EQUIPO 29', tipo: 'participante' }],
      ['40864137', { docNorm: '40864137', equipo: 'EQUIPO 32', tipo: 'manager' }],
      ['73132527', { docNorm: '73132527', equipo: 'EQUIPO 30', tipo: 'manager' }]
    ]),
    byName: new Map(),
    rosterList: [
      {
        docNorm: '40900526',
        equipo: 'EQUIPO 31',
        tipo: 'manager',
        telefonoNorm: '987165681',
        tokens: ['edith', 'pillaca', 'huamani']
      }
    ],
    profileByDoc: new Map([
      [
        '73132527',
        {
          equipoActual: 'EQUIPO 30',
          etapas: [
            { equipo: 'EQUIPO 23', etapa: 'PFD', tipo: 'px' },
            { equipo: 'EQUIPO 30', etapa: 'PFD', tipo: 'manager' }
          ]
        }
      ],
      [
        '99918858',
        {
          equipoActual: 'GRADUADOS',
          etapas: []
        }
      ],
      [
        '45289012',
        {
          equipoActual: 'EQUIPO 22',
          etapas: [
            { equipo: 'EQUIPO 17', etapa: 'PFD', tipo: 'px' },
            { equipo: 'EQUIPO 22', etapa: 'PFD', tipo: 'manager' }
          ]
        }
      ]
    ])
  };

  const contracts = [
    // 1. Homónimo de apellidos: Ruth Mery Quispe Quispe (E29 en Nodus) no debe caer en E31 por Ruth Sandra Quispe Quispe
    { id: '1', nombre: 'Ruth Mery Quispe Quispe', numeroDocumento: '45141505', rol: 'Participante' },
    // 2. Apellido repetido en capitanes: Guisella Zoraida Medina López (E32 en Nodus) no debe caer en E30 por Fernando Lopez Lopez
    { id: '2', nombre: 'Guisella Zoraida Medina López', numeroDocumento: '40864137', rol: 'Participante' },
    // 3. Firmó Participante por defecto pero es Manager de E30 en Nodus etapas
    { id: '3', nombre: 'Pilco Laura', firma: 'Ruth yesly pilco Laura', numeroDocumento: '73132527', rol: 'Participante' },
    // 4. Graduado histórico que firmó Participante: no debe inflar Px
    { id: '4', nombre: 'Graduado Historico Ejemplo', numeroDocumento: '99918858', rol: 'Participante' },
    // 5. Error de 1 dígito en DNI, recuperado por celular exacto + nombre
    { id: '5', nombre: 'Edith Pillaca Huamani', numeroDocumento: '99900527', telefono: '987165681', rol: 'Participante' },
    // 6. Manager graduada E22 (Charo Aponte) no debe auto-asignarse a E32 por fila errónea "Participante" del padrón
    { id: '6', nombre: 'Charo Yaneth Aponte Pérez', numeroDocumento: '45289012', rol: 'Manager' },
    // 7. Capitana oficial Lima E32 (Anita Flores) sí se asigna por capitanía oficial
    { id: '7', nombre: 'Anita Flores', numeroDocumento: '21866212', rol: 'Capitán' },
    // 8. Confirmación de Dirección en sala: Edith Ruth Pillaca Huamani (40900527) -> MG Equipo 30 y Manuel Vivanco (10618858) -> Staff de Caminata
    { id: '8', nombre: 'Edith Ruth pillaca huamani', numeroDocumento: '40900527', rol: 'Participante' },
    { id: '9', nombre: 'Manuel Francisco Vivanco Saavedra', numeroDocumento: '10618858', rol: 'Participante' }
  ];

  const roster = buildEnrichedFirewalkRoster({
    signedContracts: contracts,
    attendanceMap: {},
    padronList,
    capitanesList,
    nodusIndex
  });

  assert.equal(roster[0].equipoAsignado, 'Equipo 29');
  assert.equal(roster[0].categoriaReporte, 'Px');

  assert.equal(roster[1].equipoAsignado, 'Equipo 32');
  assert.equal(roster[1].categoriaReporte, 'Px');

  assert.equal(roster[2].equipoAsignado, 'Equipo 30');
  assert.equal(roster[2].categoriaReporte, 'MG');
  assert.equal(roster[2].equipoSource, 'AUTO_NODUS_MG');

  assert.equal(roster[3].equipoAsignado, '');
  assert.equal(roster[3].categoriaReporte, 'MG');
  assert.equal(roster[3].graduadoRef, 'GRADUADOS');

  assert.equal(roster[4].equipoAsignado, 'Equipo 31');
  assert.equal(roster[4].categoriaReporte, 'Px');
  assert.equal(roster[4].equipoSource, 'AUTO_NODUS_TEL');

  assert.equal(roster[5].equipoAsignado, '');
  assert.equal(roster[5].categoriaReporte, 'MG');
  assert.equal(roster[5].graduadoRef, 'Equipo 22');

  assert.equal(roster[6].equipoAsignado, 'Equipo 32');
  assert.equal(roster[6].categoriaReporte, 'MG');

  assert.equal(roster[7].equipoAsignado, 'Equipo 30');
  assert.equal(roster[7].categoriaReporte, 'MG');
  assert.equal(roster[7].equipoSource, 'CONFIRMADO_SALA');

  assert.equal(roster[8].equipoAsignado, 'Staff');
  assert.equal(roster[8].categoriaReporte, 'Staff');
  assert.equal(roster[8].rolSubgrupo, 'Staff de Caminata');

  // Verificar que computeFirewalkAttendanceSummary recalcule bloques al cambiar teamBlockMap
  const customSummary = computeFirewalkAttendanceSummary(roster, {
    countMode: 'REGISTRADOS',
    teamBlockMap: TEAM_MAPPING_PRESETS[2].map // Por Número de Equipo
  });
  const e32Block = customSummary.blocks.find((b) => b.bloque === 'Equipo 32');
  assert.equal(e32Block.pxActive, 1);
  assert.equal(e32Block.mgActive, 1);
  assert.equal(customSummary.staffBySubRole['Staff de Caminata'].reg, 1);
});
