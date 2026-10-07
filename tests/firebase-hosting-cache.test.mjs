import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { minimatch as mm } from 'minimatch';

const NO_CACHE = 'no-cache, no-store, must-revalidate';
const IMMUTABLE = 'max-age=31536000, immutable';
const { headers, rewrites } = JSON.parse(readFileSync(new URL('../firebase.json', import.meta.url), 'utf8')).hosting;

const cacheValues = (path) => headers
  .filter((h) => mm(path, h.source))
  .flatMap((h) => h.headers.filter((x) => x.key === 'Cache-Control').map((x) => x.value));

test('SPA rewrite serves index.html', () => {
  assert.deepEqual(rewrites, [{ source: '**', destination: '/index.html' }]);
});

for (const path of ['/', '/index.html', '/home', '/monitor-vuelos', '/admin/usuarios', '/manifest.json']) {
  test(`document route ${path} is no-store`, () => {
    assert.deepEqual(cacheValues(path), [NO_CACHE]);
  });
}

for (const path of ['/assets/index-abc123.js', '/assets/index-abc123.css']) {
  test(`hashed asset ${path} is immutable`, () => {
    assert.deepEqual(cacheValues(path), [IMMUTABLE]);
  });
}
