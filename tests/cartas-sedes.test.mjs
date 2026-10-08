import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('las cartas públicas usan el mismo directorio de sedes que /datos-sedes-cartas', () => {
  assert.deepEqual(JSON.parse(read('public/cartas/sedes-institucionales.json')), JSON.parse(read('src/data/sedesInstitucionales.json')));
});

test('los enlaces a la carta migratoria indican la sede y no exponen números de documento', () => {
  const dir = new URL('../public/cartas/', import.meta.url);
  const links = readdirSync(dir).filter(file => file.endsWith('.html')).flatMap(file =>
    [...readFileSync(new URL(file, dir), 'utf8').matchAll(/carta_invitacion_migraciones\.html\?([^"]*)/g)].map(match => ({ file, params: new URLSearchParams(match[1].replaceAll('&amp;', '&')) })));
  assert.ok(links.length > 0);
  for (const { file, params } of links) {
    assert.equal(params.get('sede'), 'lima', file);
    assert.doesNotMatch(params.get('doc') || '', /\d/, file);
    assert.doesNotMatch(params.get('nombre') || '', /aragon/i.test(file) ? /^$/ : /aragon/i, file);
  }
});

test('el registro de entrenadores (pasaportes en Drive) no guarda números y resuelve cada enlace de carta', async () => {
  const { runInNewContext } = await import('node:vm');
  const sandbox = {};
  runInNewContext(read('public/cartas/entrenadores-match.js'), { window: sandbox });
  const { findTrainerIdentity } = sandbox;
  const { entrenadores } = JSON.parse(read('public/cartas/entrenadores-documentos.json'));
  assert.ok(entrenadores.length >= 20);
  for (const trainer of entrenadores) {
    assert.ok(trainer.nombre && trainer.nacionalidad && trainer.documento, trainer.nombre);
    assert.doesNotMatch(`${trainer.nombre} ${trainer.nacionalidad} ${trainer.documento}`, /\d/);
  }
  const dir = new URL('../public/cartas/', import.meta.url);
  const names = readdirSync(dir).filter(file => file.endsWith('.html')).flatMap(file =>
    [...readFileSync(new URL(file, dir), 'utf8').matchAll(/carta_invitacion_migraciones\.html\?([^"]*)/g)].map(match => new URLSearchParams(match[1].replaceAll('&amp;', '&')).get('nombre')));
  for (const name of names) assert.ok(findTrainerIdentity(entrenadores, name), name);
  assert.equal(findTrainerIdentity(entrenadores, 'Mike Boada').nacionalidad, 'COLOMBIANA');
  assert.equal(findTrainerIdentity(entrenadores, 'Julio Narváez').nombre, 'JULIO CESAR NARVAEZ MORA');
  assert.equal(findTrainerIdentity(entrenadores, 'Brunis'), null);
});
