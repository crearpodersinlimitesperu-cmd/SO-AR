import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalSede, explicitGoalTeam, goalStageKey, mjStageForTeam,
  buildTeamSchedule, scheduleStatus, organizeGoalsByTeam
} from './goalsTimeline.js';

const ev = (sede, nombre, equipo, start, end) => ({ sede, nombre, equipo, fecha_inicio: `${start}T00:00:00`, fecha_fin: `${end}T00:00:00` });
const EVENTS = [
  ev('LIM', 'CAPITULO UNO', '30', '2026-08-14', '2026-08-16'),
  ev('LIM', 'CAPITULO DOS', '30', '2026-08-27', '2026-08-29'),
  ev('LIM', 'MAESTRIA DEL JUEGO', '282930', '2026-09-04', '2026-09-06'),
  ev('LIM', 'CAPITULO UNO', '31', '2026-09-18', '2026-09-20'),
  ev('LIM', 'CAPITULO DOS', '31', '2026-10-01', '2026-10-03'),
  ev('LIM', 'MAESTRIA DEL JUEGO', '293031', '2026-10-09', '2026-10-11'),
  ev('LIM', 'MAESTRIA DEL JUEGO', '303132', '2026-11-13', '2026-11-15'),
  ev('LIM', 'MAESTRIA DEL JUEGO', '313233', '2026-12-18', '2026-12-20'),
  ev('CUE', 'MAESTRIA DEL JUEGO', '232221', '2026-10-02', '2026-10-04'),
  ev('UIO C1', 'MAESTRIA DEL JUEGO', '128126124', '2026-10-16', '2026-10-18'),
  ev('CDMX', 'MAESTRIA DEL JUEGO', '1098', '2026-12-01', '2026-12-03')
];

test('normaliza códigos de sede del calendario', () => {
  assert.equal(canonicalSede('LIM'), 'Lima');
  assert.equal(canonicalSede('UIO C2'), 'Quito');
  assert.equal(canonicalSede('CUE'), 'Cuenca');
  assert.equal(canonicalSede('México'), 'CDMX');
});

test('solo reconoce equipos declarados explícitamente', () => {
  assert.equal(explicitGoalTeam({ title: 'Aliados C1E31 Lima (Oficial Sheet)' }), '31');
  assert.equal(explicitGoalTeam({ title: 'Meta Global del Ciclo Equipo 30' }), '30');
  assert.equal(explicitGoalTeam({ title: 'Sentados (Px) - Capítulo 1' }), null);
  assert.equal(explicitGoalTeam({ title: 'Managers - MJ - Relación' }), null);
});

test('identifica la etapa de la meta', () => {
  assert.equal(goalStageKey({ title: 'Aliados C1E31 Lima' }), 'C1');
  assert.equal(goalStageKey({ title: 'Sentados (Px) - Capítulo 2' }), 'C2');
  assert.equal(goalStageKey({ title: 'Managers - MJ - Relación' }), 'MJ_RELACION');
  assert.equal(goalStageKey({ title: 'Sentados (Px) - MJ - El Viaje' }), 'MJ');
});

test('la etapa MJ no depende del orden del texto de la cohorte', () => {
  assert.equal(mjStageForTeam('293031', '31'), 'MJ_CREACION');
  assert.equal(mjStageForTeam('293031', '30'), 'MJ_RELACION');
  assert.equal(mjStageForTeam('293031', '29'), 'MJ_GRATITUD');
  assert.equal(mjStageForTeam('232221', '23'), 'MJ_CREACION');
  assert.equal(mjStageForTeam('232221', '21'), 'MJ_GRATITUD');
  assert.equal(mjStageForTeam('128126124', '124'), 'MJ_GRATITUD');
  assert.equal(mjStageForTeam('1098', '10'), 'MJ_CREACION');
  assert.equal(mjStageForTeam('293031', '3'), null);
});

test('arma el cronograma oficial de cada equipo', () => {
  const s31 = buildTeamSchedule(EVENTS, 'Lima', '31');
  assert.deepEqual(s31.stages.map(s => `${s.key}:${s.start}`), [
    'C1:2026-09-18', 'C2:2026-10-01', 'MJ_CREACION:2026-10-09', 'MJ_RELACION:2026-11-13', 'MJ_GRATITUD:2026-12-18'
  ]);
  const s30 = buildTeamSchedule(EVENTS, 'Lima', '30');
  assert.equal(s30.stages.find(s => s.key === 'MJ_RELACION').start, '2026-10-09');
  assert.equal(scheduleStatus(s31, '2026-10-08').next.key, 'MJ_CREACION');
  assert.equal(scheduleStatus(s31, '2026-10-10').current.key, 'MJ_CREACION');
  assert.equal(scheduleStatus(s30, '2026-12-01').status, 'finalizado');
  assert.equal(scheduleStatus(s31, '2026-09-01').status, 'proximo');
  assert.equal(scheduleStatus(null, '2026-09-01').status, 'sin_calendario');
});

test('agrupa metas por equipo y detecta las que aportan a otro ciclo', () => {
  const goals = [
    { id: 'c31', title: 'Meta Global del Ciclo Equipo 31 (Lima)', scope: 'CICLO', sede: 'Lima', createdAt: '2026-09-17' },
    { id: 'c30', title: 'Meta Global del Ciclo Equipo 30', scope: 'CICLO', sede: 'Lima', createdAt: '2026-09-08' },
    { id: 'a31', title: 'Aliados C1E31 Lima (Oficial Sheet)', scope: 'ENTRENAMIENTO', sede: 'Lima', parentId: 'c30', progress: 96 },
    { id: 'rel', title: 'Managers - MJ - Relación', scope: 'ENTRENAMIENTO', sede: 'Lima', parentId: 'c30', progress: 100 },
    { id: 'c1', title: 'Sentados (Px) - Capítulo 1', scope: 'ENTRENAMIENTO', sede: 'Lima', parentId: 'c30', progress: 4 },
    { id: 'old', title: 'Meta Global del Ciclo Equipo 30', scope: 'CICLO', createdAt: '2026-08-17' },
    { id: 'oldc', title: 'Aliados - Capítulo 1', scope: 'ENTRENAMIENTO', parentId: 'old' }
  ];
  const groups = organizeGoalsByTeam(goals, { events: EVENTS, today: '2026-10-08' });
  assert.deepEqual(groups.map(g => g.key), ['Lima|31', 'Lima|30', 'legado']);
  const g31 = groups[0];
  assert.deepEqual(g31.children.map(g => g.id), ['a31']);
  assert.deepEqual(g31.misaligned.map(g => g.id), ['a31']);
  assert.equal(g31.next.key, 'MJ_CREACION');
  const g30 = groups[1];
  assert.deepEqual(g30.children.map(g => g.id), ['c1', 'rel']);
  assert.equal(g30.childProgress, 52);
  assert.equal(groups[2].status, 'legado');
});
import { findOfficialMJEvent } from './mjCalendarSource.js';
import { parseOfficialCalendarSheet } from './officialCalendarSheet.js';
import { summarizeSheetStructure, summarizeWorkbookStructure } from '../../scripts/inspectMJSheetSource.mjs';

test('service-account sheet inspection never returns private cells or document titles', () => {
  const summary = summarizeSheetStructure([{ properties: { sheetId: 1960233176, title: 'Private fixture', gridProperties: { rowCount: 100, columnCount: 10 } },
    data: [{ rowData: [{ values: [{ formattedValue: 'PRIMER FDS' }, { formattedValue: 'Private fixture' }] }] }] }]);
  assert.deepEqual(summary[0].markers, [{ row: 1, column: 1, label: 'PRIMER FDS' }]);
  assert.equal(JSON.stringify(summary).includes('Private fixture'), false);
});

test('Office structure inspection uses existing JSON safely without exporting private cells', () => {
  const result = summarizeWorkbookStructure({
    SheetNames: ['Private fixture'],
    Sheets: { 'Private fixture': { '!ref': 'A1:B1', A1: { t: 's', v: 'PRIMER FDS' }, B1: { t: 's', v: 'Private fixture' } } }
  });
  assert.equal(result[0].markers[0].label, 'PRIMER FDS');
  assert.equal(JSON.stringify(result).includes('Private fixture'), false);
});
test('official CSV keeps past records and mixed cohort text for E31 and E32 creation dates', () => {
  const csv = 'Fecha,Fecha,Equipo,Entrenamiento,Entrenador,Lugar,Direccion \r\n' +
    '2026-09-04,LIM,"28, 29 y 30",MAESTRIA DEL JUEGO,,,\r\n' +
    '2026-10-09,LIM,"29, 30 y 31",MAESTRIA DEL JUEGO,,,\r\n' +
    '2026-11-13,LIM,"30, 31 y 32",MAESTRIA DEL JUEGO,,,\r\n' +
    '2026-10-23,LIM,32,CAPITULO UNO,,,\r\n';
  const events = parseOfficialCalendarSheet(csv);
  assert.equal(events.length, 4);
  assert.equal(findOfficialMJEvent(events, 'Lima', '31').fecha_inicio, '2026-10-09T00:00:00');
  assert.equal(findOfficialMJEvent(events, 'Lima', '32').fecha_inicio, '2026-11-13T00:00:00');
  assert.equal(events[1].equipo, '29, 30 y 31');
  assert.equal(events[1].fecha_fin, '');
});

test('official CSV preserves escaped multiline cells and rejects invalid or truncated sources', () => {
  const header = '\uFEFFFecha,Fecha,Equipo,Entrenamiento,Entrenador,Lugar,Direccion \n';
  const [event] = parseOfficialCalendarSheet(header + '2026-10-09,LIM,31,MAESTRIA DEL JUEGO,,"Sala ""A""\nPiso 2",');
  assert.equal(event.lugar, 'Sala "A"\nPiso 2');
  for (const value of ['<html>login</html>', header + '"incompleto', header + '2026-02-31,LIM,31,MJ,,,']) {
    assert.throws(() => parseOfficialCalendarSheet(value));
  }
});

test('MJ preload identifies Creación exactly, never a substring or another cohort stage', () => {
  const event = { nombre: 'Maestría del Juego', sede: 'LIM', equipo: '293031', fecha_inicio: '2026-10-23' };
  assert.equal(findOfficialMJEvent([event], 'Lima', '31'), event);
  assert.equal(findOfficialMJEvent([event], 'Lima', '30'), null);
  assert.equal(findOfficialMJEvent([event], 'Lima', '29'), null);
  assert.equal(findOfficialMJEvent([event], 'Quito', '31'), null);
  assert.equal(findOfficialMJEvent([{ ...event, equipo: '131' }], 'Lima', '31'), null);
  assert.equal(findOfficialMJEvent([{ ...event, equipo: '' }], 'Lima', '31'), null);
  assert.equal(findOfficialMJEvent([{ ...event, nombre: 'CAPITULO UNO', equipo: '31' }], 'Lima', '31'), null);
});

test('MJ preload rejects conflicting dates, invalid dates and missing source', () => {
  const event = { name: 'MAESTRIA DEL JUEGO', sedeTag: 'Lima', team: 31, start: '2026-10-23' };
  assert.equal(findOfficialMJEvent([event], 'Lima', 31), event);
  assert.equal(findOfficialMJEvent([event, { ...event, start: '2026-11-27' }], 'Lima', '31'), null);
  assert.equal(findOfficialMJEvent([{ ...event, start: '2026-02-31' }], 'Lima', '31'), null);
  assert.equal(findOfficialMJEvent([], 'Lima', '31'), null);
});
