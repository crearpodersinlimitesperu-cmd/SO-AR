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
