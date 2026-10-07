import assert from 'node:assert/strict';
import test from 'node:test';
import {
  chunkRows,
  classifyNodusLoginFeedback,
  isNodusVerificationUrl,
  isSafeNodusUrl
} from '../scripts/nodusArchiveAgent.mjs';

test('only allows HTTPS links inside NODUS and blocks mutation-like routes', () => {
  assert.equal(isSafeNodusUrl('/dashboard'), true);
  assert.equal(isSafeNodusUrl('/participantes?id=123'), true);
  assert.equal(isSafeNodusUrl('https://example.com/dashboard'), false);
  assert.equal(isSafeNodusUrl('/participantes/eliminar/123'), false);
  assert.equal(isSafeNodusUrl('/participantes/123?action=delete'), false);
  assert.equal(isSafeNodusUrl('/participantes/123?method=GET'), false);
  assert.equal(isSafeNodusUrl('/logout'), false);
  assert.equal(isSafeNodusUrl('/reporte?token=secret'), false);
});

test('recognizes only Cloudflare verification routes for NODUS authentication', () => {
  assert.equal(isNodusVerificationUrl('https://challenges.cloudflare.com/cdn-cgi/challenge-platform/h/g/turnstile/test'), true);
  assert.equal(isNodusVerificationUrl('https://challenges.cloudflare.com/ordinary-page'), false);
  assert.equal(isNodusVerificationUrl('https://example.com/captcha'), false);
});

test('classifies visible NODUS login feedback without retaining its text', () => {
  assert.equal(classifyNodusLoginFeedback('Usuario o contraseña incorrectos', true), 'credentials_rejected');
  assert.equal(classifyNodusLoginFeedback('Verificación Turnstile requerida', true), 'verification_required');
  assert.equal(classifyNodusLoginFeedback('Acceso denegado', true), 'access_restricted');
  assert.equal(classifyNodusLoginFeedback('', true), 'login_form_returned');
  assert.equal(classifyNodusLoginFeedback('', false), 'login_not_confirmed');
});

test('splits Firestore payloads without dropping rows', () => {
  const rows = Array.from({ length: 20 }, (_, index) => ({ id: index, value: 'x'.repeat(20) }));
  const chunks = chunkRows(rows, 220);
  assert.ok(chunks.length > 1);
  assert.deepEqual(chunks.flat(), rows);
  assert.ok(chunks.every((chunk) => Buffer.byteLength(JSON.stringify(chunk), 'utf8') <= 220));
});

test('fails explicitly rather than dropping a row that cannot fit in Firestore', () => {
  assert.throws(
    () => chunkRows([{ value: 'x'.repeat(100) }], 20),
    /supera el límite seguro/
  );
});
