import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/services/auditService.js', import.meta.url), 'utf8');

test('auditService no consulta servicios externos de IP ni persiste IP, ubicación o userAgent', () => {
  assert.doesNotMatch(source, /fetchNetworkInfo|ipapi\.co|ipify|navigator\.userAgent/);
  assert.doesNotMatch(source, /\bip:|location:|userAgent:|lastIp|lastLocation|lastUserAgent/);
});
