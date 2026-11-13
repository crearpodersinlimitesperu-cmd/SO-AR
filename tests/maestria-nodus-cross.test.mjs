import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  selectActiveLimaMaestriaTeams,
  buildMaestriaNodusCross
} from '../src/utils/maestriaNodusCross.js';

const MOCK_EQUIPOS = [
  { id: 134, nombre: 'EQUIPO 30', id_sede: 7, sede: 'LIMA CICLO 1', en_actividad: true, etapa_vigente: 'TFD' },
  { id: 141, nombre: 'EQUIPO 31', id_sede: 7, sede: 'LIMA CICLO 1', en_actividad: true, etapa_vigente: 'SFD' },
  { id: 149, nombre: 'EQUIPO 32', id_sede: 7, sede: 'LIMA CICLO 1', en_actividad: true, etapa_vigente: 'PFD' },
  { id: 155, nombre: 'EQUIPO 33', id_sede: 7, sede: 'LIMA CICLO 1', en_actividad: true, etapa_vigente: null },
  { id: 200, nombre: 'EQUIPO 10', id_sede: 3, sede: 'BOGOTA', en_actividad: true, etapa_vigente: 'PFD' }
];

test('selectActiveLimaMaestriaTeams filtra solo equipos activos de Lima en PFD/SFD/TFD', () => {
  const active = selectActiveLimaMaestriaTeams(MOCK_EQUIPOS);
  assert.deepEqual(
    active.map((e) => [e.id, e.etapa_vigente]),
    [
      [134, 'TFD'],
      [141, 'SFD'],
      [149, 'PFD']
    ]
  );
});

test('buildMaestriaNodusCross cruza contratos firmados con Nodus para participantes y managers por FDS', () => {
  const rosterByTeam = {
    134: [
      {
        id: 1,
        identificacion: '11111111',
        nombres: 'ANA',
        apellidos: 'PEREZ',
        email: 'ana@test.com',
        tipo_persona: 'participante',
        coordinador: 'DIANA',
        capitulo1: { asistio: true, desertor: false },
        capitulo2: { pagado: true, maestria: true }
      }
    ],
    141: [
      {
        id: 2,
        identificacion: '22222222',
        nombres: 'CARLOS',
        apellidos: 'GOMEZ',
        email: 'carlos@test.com',
        tipo_persona: 'manager',
        coordinador: 'JOYCE',
        capitulo1: { asistio: true, desertor: false },
        capitulo2: { pagado: false, maestria: false }
      }
    ],
    149: [
      {
        id: 3,
        identificacion: '33333333',
        nombres: 'MARIA',
        apellidos: 'LOPEZ',
        email: 'maria@test.com',
        tipo_persona: 'manager',
        coordinador: 'JOYCE',
        capitulo1: { asistio: true, desertor: false },
        capitulo2: { pagado: false, maestria: true }
      }
    ]
  };

  const signedContracts = [
    {
      id: 'c1',
      nombre: 'ANA PEREZ',
      numeroDocumento: '11111111',
      email: 'ana@test.com',
      rol: 'Participante',
      equipo: 'Equipo 30 — Tinkuy Ruray'
    },
    {
      id: 'c2',
      nombre: 'CARLOS GOMEZ',
      numeroDocumento: '22222222',
      email: 'carlos@test.com',
      rol: 'Manager',
      equipo: 'Equipo 31 — Imperio del Éxito'
    },
    {
      id: 'c3',
      nombre: 'PEDRO EXTRA',
      numeroDocumento: '99999999',
      email: 'pedro@test.com',
      rol: 'Participante',
      equipo: 'Equipo 32 — Sede Lima (Cohorte Actual)'
    }
  ];

  const result = buildMaestriaNodusCross({
    signedContracts,
    nodusEquipos: MOCK_EQUIPOS,
    nodusRosterByTeam: rosterByTeam
  });

  // Ana: firmó + maestriaNodus=true -> COMPLETO en TFD
  assert.equal(result.enrichedContracts[0].nodusCross.estadoCruce, 'COMPLETO');
  assert.equal(result.enrichedContracts[0].nodusCross.fdsVigente, 'TFD');
  assert.equal(result.enrichedContracts[0].nodusCross.checkinUrl, 'https://imo.crearpslglobal.com/maestria/checkin/134/TFD');

  // Carlos (Manager): firmó pero maestriaNodus=false -> FALTA_CHECKIN_NODUS en SFD
  assert.equal(result.enrichedContracts[1].nodusCross.estadoCruce, 'FALTA_CHECKIN_NODUS');
  assert.equal(result.enrichedContracts[1].nodusCross.fdsVigente, 'SFD');
  assert.equal(result.enrichedContracts[1].nodusCross.nodusRole, 'Manager');

  // Pedro: no está en Nodus
  assert.equal(result.enrichedContracts[2].nodusCross.estadoCruce, 'NO_ENCONTRADO_NODUS');

  // María (Manager en Equipo 32 PFD): está en Nodus maestria=true pero no firmó contrato
  const maria = result.nodusPadronCross.find((p) => p.identificacion === '33333333');
  assert.equal(maria.estadoOperativo, 'FALTA_FIRMA_CONTRATO');
  assert.equal(maria.fdsVigente, 'PFD');

  assert.equal(result.summary.totalCompletos, 1);
  assert.equal(result.summary.totalFaltaCheckinNodus, 1);
  assert.equal(result.summary.totalFaltaFirmaContrato, 1);
  assert.equal(result.summary.totalNoEncontradoNodus, 1);
});

test('buildMaestriaNodusCross resuelve rezagados vía nodusByDni exhaustivo y etapas', () => {
  const result = buildMaestriaNodusCross({
    signedContracts: [
      {
        id: 'c-rezagado',
        nombre: 'JULIA CESARIA ROMERO ALARCON',
        numeroDocumento: '09519791',
        email: 'julia@test.com',
        rol: 'Participante',
        equipo: 'Equipo 30 — Tinkuy Ruray'
      }
    ],
    nodusEquipos: MOCK_EQUIPOS,
    nodusRosterByTeam: { 134: [], 141: [], 149: [] },
    nodusByDni: {
      '09519791': {
        id: 888,
        identificacion: '09519791',
        nombres: 'JULIA CESARIA',
        apellidos: 'ROMERO ALARCON',
        email: 'julia@test.com',
        tipo_persona: 'participante',
        sede: { id: 7, nombre: 'LIMA CICLO 1' },
        equipo_actual: { id: 134, nombre: 'EQUIPO 30' },
        capitulo1: true,
        capitulo2: true,
        maestria: true,
        etapas: [
          { equipo: 'EQUIPO 21', etapa: 'PFD', tipo: 'px', asistio: true, desertor: false, fecha_registro: '2026-08-01' },
          { equipo: 'EQUIPO 30', etapa: 'TFD', tipo: 'px', asistio: true, desertor: false, fecha_registro: '2026-11-13' }
        ]
      }
    }
  });

  const c = result.enrichedContracts[0];
  assert.equal(c.nodusCross.matched, true);
  assert.equal(c.nodusCross.matchBy, 'DNI');
  assert.equal(c.nodusCross.estadoCruce, 'COMPLETO');
  assert.equal(c.nodusCross.fdsVigente, 'TFD');
  assert.equal(c.nodusCross.nodusTeamId, 134);
  assert.equal(c.nodusCross.exhaustiveLookup, true);
  assert.equal(c.nodusCross.etapas.length, 2);
  assert.equal(result.summary.totalCompletos, 1);
  assert.equal(result.summary.totalNoEncontradoNodus, 0);
});

test('buildMaestriaNodusCross exige asistencia en el FDS vigente exacto cuando hay etapas', () => {
  const result = buildMaestriaNodusCross({
    signedContracts: [
      {
        id: 'c-prev-fds',
        nombre: 'LUIS TORRES',
        numeroDocumento: '77778888',
        email: 'luis@test.com',
        rol: 'Participante',
        equipo: 'Equipo 30 — Tinkuy Ruray'
      }
    ],
    nodusEquipos: MOCK_EQUIPOS,
    nodusRosterByTeam: {
      134: [
        {
          id: 901,
          identificacion: '77778888',
          nombres: 'LUIS',
          apellidos: 'TORRES',
          email: 'luis@test.com',
          tipo_persona: 'participante',
          capitulo1: { asistio: true, desertor: false },
          capitulo2: { pagado: true, maestria: true }
        }
      ],
      141: [],
      149: []
    },
    nodusByDni: {
      '77778888': {
        id: 901,
        identificacion: '77778888',
        nombres: 'LUIS',
        apellidos: 'TORRES',
        email: 'luis@test.com',
        tipo_persona: 'participante',
        sede: { id: 7, nombre: 'LIMA CICLO 1' },
        equipo_actual: { id: 134, nombre: 'EQUIPO 30' },
        maestria: true,
        etapas: [
          { equipo: 'EQUIPO 30', etapa: 'PFD', tipo: 'px', asistio: true, desertor: false, fecha_registro: '2026-09-05' },
          { equipo: 'EQUIPO 30', etapa: 'SFD', tipo: 'px', asistio: true, desertor: false, fecha_registro: '2026-10-10' }
        ]
      }
    }
  });

  // Equipo 30 está en TFD y Luis solo tiene PFD y SFD en etapas -> falta check-in de TFD
  assert.equal(result.enrichedContracts[0].nodusCross.fdsVigente, 'TFD');
  assert.equal(result.enrichedContracts[0].nodusCross.maestriaNodus, false);
  assert.equal(result.enrichedContracts[0].nodusCross.estadoCruce, 'FALTA_CHECKIN_NODUS');
});

test('buildMaestriaNodusCross cruza por teléfono/nombre cuando hay error de tipeo en DNI y usa etapas de SFD', () => {
  const result = buildMaestriaNodusCross({
    signedContracts: [
      {
        id: 'c-edith',
        nombre: 'Edith ruth pillaca huamani',
        numeroDocumento: '40900626',
        email: 'edith ruth pillacae22@gmail.com',
        telefono: '987165681',
        rol: 'Participante',
        equipo: 'Equipo 31 — Imperio del Éxito'
      }
    ],
    nodusEquipos: MOCK_EQUIPOS,
    nodusRosterByTeam: {
      134: [],
      141: [
        {
          id: 901619,
          identificacion: '40900526',
          nombres: 'EDITH',
          apellidos: 'PILLACA HUAMANI',
          email: 'edithpillcahuamani@hormail.com',
          telefono: '987165681',
          tipo_persona: 'manager',
          coordinador: 'DIANA',
          capitulo1: { asistio: true, desertor: false },
          capitulo2: { pagado: true, maestria: false }
        }
      ],
      149: []
    },
    nodusByDni: {
      '40900526': {
        id: 901619,
        identificacion: '40900526',
        nombres: 'EDITH',
        apellidos: 'PILLACA HUAMANI',
        email: 'edithpillcahuamani@hormail.com',
        telefono: '987165681',
        tipo_persona: 'manager',
        sede: { id: 7, nombre: 'LIMA CICLO 1' },
        equipo_actual: { id: 141, nombre: 'EQUIPO 31' },
        maestria: false,
        etapas: [
          { equipo: 'EQUIPO 31', etapa: 'PFD', tipo: 'px', asistio: true, desertor: false, fecha_registro: '2026-10-09' },
          { equipo: 'EQUIPO 31', etapa: 'SFD', tipo: 'px', asistio: true, desertor: false, fecha_registro: '2026-11-13' }
        ]
      }
    }
  });

  const c = result.enrichedContracts[0];
  assert.equal(c.nodusCross.matched, true);
  assert.equal(c.nodusCross.matchBy, 'TELEFONO');
  assert.equal(c.nodusCross.nodusDoc, '40900526');
  assert.equal(c.nodusCross.dniMismatch, true);
  assert.equal(c.nodusCross.maestriaNodus, true);
  assert.equal(c.nodusCross.estadoCruce, 'COMPLETO');
});
