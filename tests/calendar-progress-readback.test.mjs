import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const calendar = read('src/pages/CalendarioMJ.jsx');
const context = read('src/context/ChecklistContext.jsx');
const modal = read('src/components/TaskDetailModal.jsx');

test('calendar load failures cannot be rendered as an empty collection', () => {
  assert.match(calendar, /setLoadError\('No se pudieron cargar los calendarios/);
  assert.match(calendar, /setLoadError\(null\)/);
  assert.ok(calendar.indexOf(') : loadError ? (') < calendar.indexOf(') : visibleCalendars.length === 0 ? ('));
  assert.match(calendar, /role="alert"/);
  assert.match(calendar, /visibleMJCalendars\(calendars, currentUser\)/);
});

test('task modal and snapshots share scoped progress persistence', () => {
  assert.match(modal, /const initialProgress = getTaskProgress\(task\)/);
  assert.match(modal, /const cycleScope = checklistData\.some\(base => base\.id === task\.id\)/);
  assert.match(context, /return applyCycleCompletion\(data,/);
  assert.match(context, /const effectiveTask = applyCycleCompletion\(task,/);
  assert.match(context, /completionId: completionTransition[\s\S]*?,\s*updates\s*\}\)/);
  assert.match(context, /throw new Error\('Espera a que cargue el ciclo/);
});
