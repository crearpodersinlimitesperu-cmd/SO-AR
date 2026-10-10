import test from 'node:test';
import assert from 'node:assert/strict';
import {
  flyerTeamIds, flyerTeamType, flyerTeamVenue, flyerTeamsForVenue,
  flyerTeamEvents, selectTeamFlyer, teamFlyerPages, flyerMJNumber, flyerMJPhases
} from './flyerTeams.js';

const event = (nombre, equipo = '32', sede = 'LIM', start = '2026-10-23') =>
  ({ nombre, equipo, sede, fecha_inicio: start });

test('team identity recognizes explicit variants, not partial numbers or invented links', () => {
  for (const equipo of [32, '032', 'Equipo 32', 'E32', 'EQ. #32', ' equipo # 32 ']) {
    assert.deepEqual(flyerTeamIds({ equipo }), ['E32']);
  }
  assert.deepEqual(flyerTeamIds({ equipoNombre: 'Equipo 32' }), ['E32']);
  assert.deepEqual(flyerTeamIds({ equipoId: 'E32' }), ['E32']);
  assert.deepEqual(flyerTeamIds({ equipoId: 'opaque-32' }), ['id:opaque-32']);
  for (const nombre of ['C1E32', 'C2 - Equipo #32', 'MJ EQ.32', 'Gratitud E32']) {
    assert.deepEqual(flyerTeamIds({ nombre }), ['E32'], nombre);
  }
  for (const nombre of ['Grupo 32', 'C1 32', 'Equipo 32 y 132', 'C1E32extra']) {
    assert.deepEqual(flyerTeamIds({ nombre }), [], nombre);
  }
  assert.deepEqual(flyerTeamIds({ equipo: '32', nombre: 'C2 Equipo 132' }), []);
  assert.deepEqual(flyerTeamIds({ equipo: '32', equipoId: '132' }), []);
  assert.deepEqual(flyerTeamIds({ equipo: '343536' }), ['E343536']);
  assert.deepEqual(flyerTeamIds({ equipo: '32*132' }), ['E132', 'E32']);
  assert.deepEqual(flyerTeamIds({ equipo: '32/132' }), []);
});

test('classification distinguishes generic MJ from its explicit FDS phases', () => {
  for (const [nombre, type] of [
    ['CAPÍTULO UNO', 'C1'], [' capítulo 2 - Equipo 32 ', 'C2'],
    ['MAESTRÍA DEL JUEGO', 'MJ'], ['MJ E32', 'MJ'], ['C1E32', 'C1'],
    ['MJ · Creación', 'CREACION'], ['SEGUNDO FDS: RELACIÓN', 'RELACION'],
    ['TERCER FDS: GRATITUD', 'GRATITUD']
  ]) assert.equal(flyerTeamType({ nombre }), type);
  for (const nombre of ['Impacto Creación', 'C10', 'MAESTRIA DEL JUEGO y C2', 'Reunión MJ', 'PRIMER FDS']) {
    assert.equal(flyerTeamType({ nombre }), null);
  }
});

test('exact sede and identity isolate Lima E32 from E132 and parallel Quito E32', () => {
  const fixture = Object.freeze([
    Object.freeze(event('C1', 'Equipo 32', 'Lima')),
    Object.freeze(event('C2', 'E32', 'LIM', '2026-11-13')),
    Object.freeze(event('MAESTRIA DEL JUEGO', '32', 'LIMA', '2026-12-04')),
    Object.freeze(event('C1', '132')),
    Object.freeze(event('C2', '32', 'UIO')),
    Object.freeze(event('MJ', '', 'LIM')),
    Object.freeze(event('MJ', '32', 'LIM2')),
    Object.freeze(event('MJ', '32', 'LIMA QUITO')),
    Object.freeze({ ...event('C2'), sedeTag: 'UIO' })
  ]);
  assert.deepEqual(flyerTeamsForVenue(fixture, 'lim'), ['E32', 'E132']);
  assert.deepEqual(flyerTeamEvents(fixture, 'lim', 'E32'), fixture.slice(0, 3));
  assert.equal(flyerTeamEvents(fixture, 'lim', 'E132').length, 1);
  assert.equal(flyerTeamVenue(fixture[8]), null);
  const rows = selectTeamFlyer(fixture, 'lim', 'E32').sedes;
  assert.deepEqual(rows.map(row => row.programType), ['C1', 'C2', 'MJ']);
  assert.ok(rows.every(row => row.equipo === 'Lima — Equipo 32'));
  assert.ok(rows[0].fechas.includes('23 de octubre'));
  assert.ok(!rows[0].fechas.includes('24'));
  assert.ok(rows[0].fechas.includes('fin por confirmar'));
});

test('missing links, dates and distinct IDs never fabricate phases or durations', () => {
  const fixture = [
    event('C1'), event('C2', '132'), event('MJ', ''),
    event('MJ', '32', 'UIO'), event('CREACION', '132')
  ];
  const rows = selectTeamFlyer(fixture, 'lim', 'E32').sedes;
  assert.deepEqual(rows.map(row => row.source), ['calendario', 'sin-fechas', 'sin-fechas']);
  assert.ok(rows.slice(1).every(row => row.fechas.includes('sin vínculo explícito')));
  assert.match(selectTeamFlyer([event('C1', '32', 'LIM', 'invalid')], 'lim', 'E32').sedes[0].fechas, /no disponible/);
  assert.ok(selectTeamFlyer(fixture, 'uio', 'E132').error);
  assert.ok(selectTeamFlyer(undefined, 'lim', 'E32').error);
  assert.deepEqual(flyerTeamEvents(fixture, '', ''), []);
});

test('historical, concurrent and explicit MJ phase dates all persist, with six rows per PNG', () => {
  const fixture = [
    event('C1', '32', 'LIM', '2025-01-01'),
    event('C1', '32', 'LIM', '2025-01-01'),
    event('C2'),
    event('MJ'),
    event('MJ · Creación'),
    event('Relación'),
    event('Gratitud'),
    event('C2', '32', 'LIM', '2026-11-01')
  ];
  const rows = selectTeamFlyer(fixture, 'lim', 'E32').sedes;
  assert.equal(rows.length, 7);
  assert.ok(rows[0].fechas.includes('2025'));
  assert.deepEqual(rows.map(row => row.programType), ['C1', 'C2', 'C2', 'MJ', 'CREACION', 'RELACION', 'GRATITUD']);
  const pages = teamFlyerPages(rows);
  assert.deepEqual(pages.map(page => page.length), [6, 1]);
  assert.deepEqual(pages.flat(), rows);
  assert.deepEqual(teamFlyerPages([]), []);
});

test('MJ 3/2/1, 4/3/2 and 5/4/3 derive owner-defined phases using only the exact event date', () => {
  for (const n of [3, 4, 5]) {
    for (const nombre of [`MJ ${n}`, `MJ${n}`, `MJ ${n},${n - 1},${n - 2}`, `MAESTRÍA DEL JUEGO ${n} Equipo 32`]) {
      const source = Object.freeze({ ...event(nombre), fecha_fin: '2026-10-25' });
      assert.equal(flyerMJNumber(source), n);
      assert.deepEqual(flyerMJPhases(source), [
        { type: 'CREACION', number: n }, { type: 'RELACION', number: n - 1 }, { type: 'GRATITUD', number: n - 2 }
      ]);
      const fixture = [source, event('MJ 99', '132'), event('MJ 98', '32', 'UIO')];
      const rows = selectTeamFlyer(fixture, 'lim', 'E32').sedes.filter(row => row.derivedFrom);
      assert.deepEqual(rows.map(row => row.phaseNumber), [n, n - 1, n - 2]);
      assert.ok(rows.every(row => row.mjNumber === n && row.equipo === 'Lima — Equipo 32'
        && row.fechas === '23, 24 y 25 de octubre (2026)'));
    }
  }
});

test('MJ 1 and MJ 2 have no zero/negative phases and missing phases are explicitly labelled', () => {
  for (const n of [1, 2]) {
    const rows = selectTeamFlyer([event(`MJ${n}`)], 'lim', 'E32').sedes.filter(row => row.derivedFrom);
    assert.equal(rows.length, 3);
    assert.deepEqual(rows.map(row => row.phaseNumber), n === 1 ? [1, null, null] : [2, 1, null]);
    assert.ok(rows.filter(row => row.phaseNumber === null).every(row =>
      row.source === 'sin-fechas' && row.fechas === `Sin fase derivable para MJ ${n}`));
  }
});

test('MJ number is never inferred from team or unrelated numbers; explicit field conflicts fail closed', () => {
  for (const source of [
    event('MJ'), event('MAESTRIA DEL JUEGO'), event('MJ Equipo 32'),
    event('MJ 0'), event('MJ 3,1,2'), event('MJ -3'),
    { ...event('MJ 3'), mjNumber: 4 }, { ...event('MJ'), mjNumero: '3x' },
    { ...event('MJ'), mjNumber: 0 }, { ...event('MJ'), mjNumber: 9007199254740992 }
  ]) assert.equal(flyerMJNumber(source), null);
  for (const field of ['mjNumero', 'numeroMJ', 'mjNumber']) {
    assert.equal(flyerMJNumber({ ...event('MJ'), [field]: 3 }), 3);
  }
  assert.equal(flyerMJNumber({ ...event('C1'), mjNumero: 3 }), null);
  const rows = selectTeamFlyer([event('MAESTRIA DEL JUEGO')], 'lim', 'E32').sedes;
  assert.match(rows[2].fechas, /sin número MJ explícito; sin fases derivables/);
  assert.equal(rows[2].derivedFrom, undefined);
});

test('simultaneous numbered MJ events preserve both phase sets without mutation or date fabrication', () => {
  const fixture = Object.freeze([Object.freeze(event('MJ3')), Object.freeze(event('MJ4')), Object.freeze(event('MJ4'))]);
  const rows = selectTeamFlyer(fixture, 'lim', 'E32').sedes.filter(row => row.derivedFrom);
  assert.deepEqual(rows.map(row => row.phaseNumber), [3, 2, 1, 4, 3, 2]);
  assert.ok(rows.every(row => row.fechas.includes('fin por confirmar') && !row.fechas.includes('24')));
});
