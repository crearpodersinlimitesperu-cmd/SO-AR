import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

test('dedicated hosting publishes only a closed entry, not the internal guide', () => {
  const root = 'prototypes/aliados-c2/hosting/';
  const config = JSON.parse(readFileSync(`${root}firebase.json`, 'utf8'));
  assert.equal(config.hosting.site, 'aliados-crear-global');
  assert.equal(config.hosting.public, 'entry');
  assert.equal(config.firestore, undefined);
  assert.equal(config.functions, undefined);
  const page = readFileSync(`${root}entry/index.html`, 'utf8');
  assert.match(page, /Acceso cerrado por protección de datos/);
  assert.doesNotMatch(page, /<script|<form|<input|Ticket Verde|14:01|10 graduados/);
  assert.deepEqual(readdirSync(`${root}entry`).sort(), ['index.html', 'logo-crear.png', 'style.css']);
  const headers = config.hosting.headers[0].headers;
  assert.ok(headers.some(header => header.key === 'Content-Security-Policy' && header.value.includes("default-src 'none'")));
  assert.ok(headers.some(header => header.key === 'Cache-Control' && header.value === 'no-store'));
});
