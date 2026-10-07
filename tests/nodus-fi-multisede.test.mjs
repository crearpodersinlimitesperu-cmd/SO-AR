import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessFiCompleteness,
  buildEquipoSedeIndex,
  canonicalSede,
  mergeParticipants,
  parseDataTablesInfo,
  rowsToFiParticipants,
  summarizeSedeEquipoDiscrepancies
} from '../scripts/nodusFuturosImposiblesParser.mjs';
import { ejecutarDiagnosticoFIs, etiquetaEquipo } from '../src/services/nodusFIAgent.js';
import { opcionesEquipo, resolveFISource } from '../src/services/nodusFISnapshot.js';

const row = (nombre, dni, sede, equipo, total = 0, extra = {}) => ({
  participante: nombre, identificacion: dni, sede, equipo,
  'total fi': String(total), pendientes: '0', devueltos: '0', aprobados: String(total), acciones: 'Revisar', ...extra
});

test('sede names/aliases normalize and never default to Lima', () => {
  assert.equal(canonicalSede('LIMA CICLO 1'), 'Lima');
  assert.equal(canonicalSede('MEDELLIN CICLO 2'), 'Medellín');
  assert.equal(canonicalSede('', 'GYE EQUIPO 3'), 'Guayaquil');
  assert.equal(canonicalSede('Tegucigalpa'), 'Tegucigalpa');
  assert.equal(canonicalSede('', 'EQUIPO 99'), 'Sin sede');
});

test('parses multi-sede rows, keeps NODUS team codes and real extra fields', () => {
  const ps = rowsToFiParticipants([
    row('ANA LIMA', '72038883', 'LIMA CICLO 1', 'LIMA CICLO 1 — EQUIPO 16', 2),
    row('BEA MED', '1037000111', 'MEDELLÍN CICLO 1', 'MEDELLÍN CICLO 1 — EQUIPO 16', 3, { 'ultimo fi': 'Meta X' })
  ]);
  assert.deepEqual(ps.map((p) => [p.sede, p.equipo, p.totalFi]), [['Lima', 'EQUIPO 16', 2], ['Medellín', 'EQUIPO 16', 3]]);
  assert.notEqual(ps[0].equipoKey, ps[1].equipoKey);
  assert.equal(ps[1].camposNodus['ultimo fi'], 'Meta X');
  assert.equal(ps[1].camposNodus.acciones, undefined);
});

test('page without attendance column is PFD-scoped; explicit "no" is excluded', () => {
  const ps = rowsToFiParticipants([
    row('A', '11111111', 'Lima', 'EQUIPO 1'),
    row('B', '22222222', 'Lima', 'EQUIPO 1', 0, { 'asistencia pfd': 'No' }),
    row('C', '33333333', 'Lima', 'EQUIPO 1', 0, { 'asistencia pfd': 'Sí' })
  ]);
  assert.deepEqual(ps.map((p) => p.nombre), ['A', 'C']);
});

test('merge dedupes by DNI across passes and keeps the richer record', () => {
  const acc = new Map();
  mergeParticipants(acc, rowsToFiParticipants([row('ANA', '72038883', 'Lima', 'EQUIPO 1', 0)]));
  const added = mergeParticipants(acc, rowsToFiParticipants([
    row('ANA', '72.038.883', 'Lima', 'EQUIPO 1', 4), row('LUIS', '', 'Quito', 'EQUIPO 2')
  ]));
  assert.equal(added, 1);
  assert.equal(acc.size, 2);
  assert.equal(acc.get('dni:72038883').totalFi, 4);
});

test('reads declared total from DataTables info', () => {
  assert.equal(parseDataTablesInfo('Mostrando 1 a 25 de 1.415 registros'), 1415);
  assert.equal(parseDataTablesInfo(''), null);
});

test('completeness: only full coverage is "complete"; Lima-only or truncated is partial', () => {
  const lima = rowsToFiParticipants([row('A', '11111111', 'Lima', 'EQUIPO 1')]);
  const full = assessFiCompleteness({ participantes: lima, expectedTotal: 1, expectedSedes: ['Lima'] });
  assert.equal(full.status, 'complete');
  const truncated = assessFiCompleteness({ participantes: lima, expectedTotal: 415, expectedSedes: ['Lima'] });
  assert.equal(truncated.status, 'partial');
  const limaOnly = assessFiCompleteness({ participantes: lima, expectedTotal: 1, expectedSedes: ['Lima', 'Medellín'] });
  assert.equal(limaOnly.status, 'partial');
  assert.deepEqual(limaOnly.coverage.map((c) => [c.sede, c.status]), [['Lima', 'ok'], ['Medellín', 'sin_datos']]);
  assert.equal(assessFiCompleteness({ participantes: lima, expectedTotal: 1, blocked: ['filtro X'] }).status, 'partial');
  assert.equal(assessFiCompleteness({ participantes: lima, expectedTotal: null }).status, 'partial');
});

test('sede-equipo coherence: RRHH index, ambiguity and recorded discrepancies', () => {
  const index = buildEquipoSedeIndex([
    { sede: 'Medellín', equipos: [{ equipo: 'EQUIPO 20' }, 'EQUIPO 16'] },
    { sede: 'Lima', equipos: [{ equipo: 'EQUIPO 16' }, { equipo: 'EQUIPO 15' }] }
  ]);
  // EQUIPO 16 existe en dos sedes: ambiguo, no se infiere; EQUIPO 20 sí es único.
  assert.equal(canonicalSede('', 'EQUIPO 16', index), 'Sin sede');
  assert.equal(canonicalSede('', 'EQUIPO 20', index), 'Medellín');
  const ps = rowsToFiParticipants([
    row('MED 20', '1111111111', 'Medellín', 'EQUIPO 20'),
    row('MED 16', '2222222222', 'Medellín', 'EQUIPO 16'),
    row('RARO', '3333333333', 'Quito', 'EQUIPO 15')
  ], { equipoSedeIndex: index });
  assert.equal(ps[0].discrepancias.length, 0);
  assert.equal(ps[1].discrepancias.length, 0);
  assert.equal(ps[2].sede, 'Quito');
  assert.equal(ps[2].equipo, 'EQUIPO 15');
  const resumen = summarizeSedeEquipoDiscrepancies(ps);
  assert.equal(resumen.total, 1);
  assert.match(resumen.detalle[0].resolucion, /sede declarada por la fila de NODUS/);
});

const universo = [
  ...rowsToFiParticipants([row('L16', '11111111', 'Lima', 'EQUIPO 16', 1), row('L15', '11111112', 'Lima', 'EQUIPO 15', 0)]),
  ...rowsToFiParticipants([row('M16', '22222221', 'Medellín', 'EQUIPO 16', 0), row('M20', '22222222', 'Medellín', 'EQUIPO 20', 2)])
];

test('team selector lists only teams of the chosen sede; GLOBAL labels team with sede', () => {
  const med = opcionesEquipo(universo, 'Medellín').map((o) => o.label);
  assert.deepEqual(med, ['Todos', 'EQUIPO 16', 'EQUIPO 20']);
  assert.deepEqual(opcionesEquipo(universo, 'Lima').map((o) => o.label), ['Todos', 'EQUIPO 15', 'EQUIPO 16']);
  const global = opcionesEquipo(universo, 'GLOBAL');
  assert.deepEqual(global.map((o) => o.label), ['Todos', 'Lima · EQUIPO 15', 'Lima · EQUIPO 16', 'Medellín · EQUIPO 16', 'Medellín · EQUIPO 20']);
});

test('diagnosis filters by sede+equipo and does not mix same team code across sedes', () => {
  const medKey = opcionesEquipo(universo, 'GLOBAL').find((o) => o.label === 'Medellín · EQUIPO 16').value;
  const diag = ejecutarDiagnosticoFIs(universo, 'GLOBAL', medKey);
  assert.deepEqual(diag.participantes.map((p) => p.nombre), ['M16']);
  const global = ejecutarDiagnosticoFIs(universo, 'GLOBAL');
  assert.equal(global.metricas.totalParticipantes, 4);
  assert.equal(global.metricas.equiposList.length, 4);
});

test('source resolution: live, partial and clearly-labelled static fallback', () => {
  assert.equal(resolveFISource({ participantes: universo }, []).sourceState.status, 'live');
  assert.equal(resolveFISource({ participantes: universo, completeness: 'partial', completenessReasons: ['x'] }, []).sourceState.status, 'partial');
  const fb = resolveFISource(null, universo);
  assert.equal(fb.sourceState.status, 'fallback');
  assert.match(fb.sourceState.label, /RESPALDO ESTÁTICO PARCIAL/);
});

test('team number stays visible: selector, semaphore data and dictamen label keep "EQUIPO 22" with sede', () => {
  const extra = [...universo, ...rowsToFiParticipants([row('M22', '22222223', 'Medellín', 'MEDELLÍN CICLO 1 — EQUIPO 22', 1)])];
  const key = opcionesEquipo(extra, 'Medellín').find((o) => o.label === 'EQUIPO 22').value;
  assert.equal(opcionesEquipo(extra, 'GLOBAL').some((o) => o.label === 'Medellín · EQUIPO 22'), true);
  const diag = ejecutarDiagnosticoFIs(extra, 'Medellín', key);
  assert.deepEqual(diag.participantes.map((p) => [p.sede, p.equipo]), [['Medellín', 'EQUIPO 22']]);
  assert.equal(etiquetaEquipo(key, extra), 'Medellín · EQUIPO 22');
  assert.match(diag.dictamenIA.resumen, /Medellín · EQUIPO 22/);
  assert.ok(diag.metricas.equiposList.every((e) => /EQUIPO \d+/.test(e.equipo) && e.sede));
});
