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

test('reglas: lectura de notificaciones para dueño o superadmin', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const helper = rules.slice(rules.indexOf('function isValidNotificationData()'));
  const notifSection = helper.slice(0, helper.indexOf('// VENUES'));
  assert.match(notifSection, /allow read: if isAuthenticated\(\) && \(resource\.data\.userId == email\(\) \|\| isSuperAdmin\(\)\);/);
  assert.doesNotMatch(notifSection, /allow read: if isAuthenticated\(\);/);
  assert.match(notifSection, /data\.read == false/);
  assert.match(notifSection, /hasOnly\(/);
  assert.match(notifSection, /userId\.matches\(/);
});
