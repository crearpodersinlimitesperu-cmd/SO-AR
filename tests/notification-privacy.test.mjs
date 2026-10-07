import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getNotificationToast, isOwnNotification, normalizeEmail } from '../src/utils/notificationMessages.js';

test('toast depende del tipo de notificación', () => {
  assert.equal(getNotificationToast({ type: 'task_message', title: 'X' }), 'Nuevo mensaje en tarea: X');
  assert.equal(getNotificationToast({ type: 'task_email_reminder', title: 'R' }), 'Recordatorio de tarea: R');
  assert.equal(getNotificationToast({ type: 'task_assigned', title: 'T' }), 'Nueva tarea asignada: T');
  assert.equal(getNotificationToast({ type: 'task_completed', title: 'T' }), 'Tarea completada: T');
  assert.equal(getNotificationToast({ type: 'desconocido', title: 'Z' }), 'Nueva notificación: Z');
  assert.equal(getNotificationToast({}), 'Nueva notificación');
});

test('propiedad por correo ignora mayúsculas', () => {
  assert.equal(normalizeEmail(' A@B.com '), 'a@b.com');
  assert.ok(isOwnNotification({ userId: 'A@b.com' }, 'a@B.com'));
  assert.ok(!isOwnNotification({ userId: 'x@b.com' }, 'a@b.com'));
  assert.ok(!isOwnNotification(null, 'a@b.com'));
});

test('reglas: lectura de notificaciones solo del dueño', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const block = rules.slice(rules.indexOf('match /notifications/{notifId}'));
  const end = block.indexOf('\n    }');
  const body = block.slice(0, end);
  assert.match(body, /allow read: if isAuthenticated\(\) && resource\.data\.userId == email\(\);/);
  assert.doesNotMatch(body, /allow read: if isAuthenticated\(\);/);
  assert.match(body, /request\.resource\.data\.read == false/);
  assert.match(body, /hasOnly\(/);
  assert.match(body, /userId\.matches\(/);
});
