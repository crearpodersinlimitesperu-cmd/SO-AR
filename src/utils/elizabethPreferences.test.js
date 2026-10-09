import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canLearnPreferences, defaultPreferences, preferenceKey, readPreferences, savePreferences,
  resetPreferences, recordPreference, orderSections, orderPeople, filterDashboardTasks, getReviewSuggestion
} from './elizabethPreferences.js';

const user = { uid: 'synthetic-account' };
const now = new Date(2026, 9, 9, 12);
const storage = () => {
  const values = new Map();
  return {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
};

test('preferences persist under the account UID and reset independently', () => {
  const store = storage();
  const other = { uid: 'other-account' };
  const preferences = recordPreference(defaultPreferences(), 'filter', 'overdue');
  savePreferences(store, user, preferences);
  assert.equal(readPreferences(store, user).filter, 'overdue');
  assert.equal(readPreferences(store, other).filter, 'all');
  resetPreferences(store, user);
  assert.equal(readPreferences(store, user).filter, 'all');
});

test('simulation never reads or writes storage, including reset', () => {
  const forbidden = {
    getItem: () => assert.fail('simulation read'),
    setItem: () => assert.fail('simulation write'),
    removeItem: () => assert.fail('simulation reset')
  };
  const simulated = { ...user, isSimulated: true };
  assert.equal(canLearnPreferences(simulated), false);
  assert.equal(canLearnPreferences({}), false);
  assert.deepEqual(readPreferences(forbidden, simulated), defaultPreferences());
  assert.equal(savePreferences(forbidden, simulated, defaultPreferences()), false);
  assert.equal(resetPreferences(forbidden, simulated), false);
});

test('section and person order follows only recorded actions, with stable defaults', () => {
  let preferences = defaultPreferences();
  assert.deepEqual(orderSections(preferences), ['timing', 'assigned', 'own', 'team']);
  preferences = recordPreference(preferences, 'sections', 'team');
  preferences = recordPreference(preferences, 'people', 'b@example.com');
  assert.equal(orderSections(preferences)[0], 'team');
  assert.deepEqual(orderPeople([{ email: 'a@example.com' }, { email: 'b@example.com' }], preferences).map(person => person.email),
    ['b@example.com', 'a@example.com']);
});

test('suggestions need repeated reviews and count only real, incomplete imminent tasks', () => {
  const person = {
    name: 'Persona de prueba', email: 'person@example.com',
    tasks: [
      { deadline: '2026-10-09' },
      { deadline: '2026-10-10' },
      { deadline: '2026-10-09', completed: true },
      { deadline: '2026-10-09', assigneeProgress: { 'person@example.com': { completed: true } } },
      { deadline: null }
    ]
  };
  let preferences = defaultPreferences();
  assert.equal(getReviewSuggestion([person], preferences, now), null);
  preferences = recordPreference(preferences, 'people', person.email);
  assert.equal(getReviewSuggestion([person], preferences, now), null);
  preferences = recordPreference(preferences, 'people', person.email);
  assert.deepEqual(getReviewSuggestion([person], preferences, now), { email: person.email, name: person.name, dueSoon: 2 });
  assert.equal(getReviewSuggestion([], preferences, now), null);
});

test('filters handle incomplete records and individual completion without changing source data', () => {
  const tasks = [
    { id: 'today', deadline: '2026-10-09' },
    { id: 'late', deadline: '2026-10-07' },
    { id: 'unknown' },
    { id: 'done', completed: true },
    { id: 'individual', assigneeProgress: { 'person@example.com': { completed: true } } }
  ];
  const ids = filter => filterDashboardTasks(tasks, filter, now, 'person@example.com').map(task => task.id);
  assert.deepEqual(ids('today'), ['today']);
  assert.deepEqual(ids('overdue'), ['late']);
  assert.deepEqual(ids('completed'), ['done', 'individual']);
  assert.deepEqual(ids('pending'), ['today', 'late', 'unknown']);
  assert.equal(ids('all').length, 5);
  assert.equal(tasks[4].completed, undefined);
});

test('invalid storage and unavailable browser storage surface errors rather than silent success', () => {
  const store = storage();
  store.setItem(preferenceKey(user), '{broken');
  assert.throws(() => readPreferences(store, user));
  store.setItem(preferenceKey(user), JSON.stringify({ version: 1, filter: 'all', sections: { team: -1 }, people: {} }));
  assert.throws(() => readPreferences(store, user));
  assert.throws(() => savePreferences({ setItem: () => { throw new Error('blocked'); } }, user, defaultPreferences()), /blocked/);
  assert.throws(() => recordPreference(defaultPreferences(), 'filter', 'invented'));
});
