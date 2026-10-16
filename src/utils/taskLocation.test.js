import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTaskLocation, taskLocationLabel, taskPath, taskUrl, taskReminderMessage, escapeTaskHtml } from './taskLocation.js';
import { resolveTaskLink } from '../services/taskNavigation.js';

const user = { uid: 'synthetic-owner', email: 'owner@example.test', appRole: 'gerente' };
const task = { id: 'custom_test', isCustom: true, createdBy: user.email, location: ' Sala A, dirección declarada ' };

test('declared task location preserves input and supports clearing, never inferring sede', () => {
  assert.equal(normalizeTaskLocation(task.location), 'Sala A, dirección declarada');
  assert.equal(normalizeTaskLocation(undefined), '');
  assert.equal(normalizeTaskLocation('  '), '');
  assert.equal(taskLocationLabel({ assignedSede: 'Lima' }), 'Ubicación no declarada');
  assert.equal(taskLocationLabel({ location: '' }), 'Ubicación no declarada');
  assert.equal(normalizeTaskLocation('a'.repeat(300)).length, 300);
  for (const value of [12, {}, ['Quito'], 'a'.repeat(301)]) {
    assert.throws(() => normalizeTaskLocation(value), /300/);
  }
});

test('reminders include literal declared location and an encoded internal task link', () => {
  const id = 'custom_a&b /?';
  assert.equal(taskPath(id), '/home?taskId=custom_a%26b%20%2F%3F');
  assert.equal(taskUrl(id), `https://centro-operativo-cpsl.web.app${taskPath(id)}`);
  assert.match(taskReminderMessage(task, 'Revisa hoy'), /Sala A, dirección declarada/);
  assert.match(taskReminderMessage(task, 'Revisa hoy'), /\/home\?taskId=custom_test/);
  assert.equal(escapeTaskHtml('<img src=x onerror="bad"> &'), '&lt;img src=x onerror=&quot;bad&quot;&gt; &amp;');
});

test('task links read canonical stored task and enforce existing identity isolation', async () => {
  let reads = 0;
  const readTask = async id => { reads++; assert.equal(id, task.id); return task; };
  assert.deepEqual(await resolveTaskLink(task.id, [], user, readTask), task);
  assert.deepEqual(await resolveTaskLink(task.id, [task], user, readTask), task);
  assert.equal(reads, 1);
  await assert.rejects(resolveTaskLink(task.id, [task], { ...user, email: 'stranger@example.test' }, readTask), /acceso/);
  await assert.rejects(resolveTaskLink('missing', [], user, async () => null), /acceso/);
  await assert.rejects(resolveTaskLink('', [], user, readTask), /identificar/);
  await assert.rejects(resolveTaskLink(task.id, [], user, async () => { throw new Error('permission-denied'); }), /permission-denied/);
});
