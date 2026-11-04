import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { USERS_TO_IMPORT } from '../src/data/usersToImport.js';

function fixture(authorized = true) {
  const callbacks = [];
  const listeners = [];
  const source = readFileSync(new URL('../src/services/privateNodusAccessService.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?$/gm, '').replace(/^export /gm, '');
  const subscribe = new Function('doc', 'onSnapshot', 'db', 'canReadPrivateProfile', 'console',
    `${source}\nreturn subscribeToPrivateNodusCredentials;`)(
    (_db, ...path) => path.join('/'),
    (ref, options, next, error) => {
      const listener = { ref, options, next, error, stopped: false };
      listeners.push(listener);
      return () => { listener.stopped = true; };
    }, {}, () => authorized, { error: () => {} }
  );
  const start = () => subscribe({ email: 'owner@example.invalid' }, { email: 'owner@example.invalid' },
    (data, state) => callbacks.push({ data, state }));
  const emit = (data, fromCache = false) => listeners[0].next({
    exists: () => data !== null, data: () => data, metadata: { fromCache }
  });
  return { start, emit, callbacks, listeners };
}

test('public catalogue and auth/profile sources have no password literal or public fallback', () => {
  assert.ok(USERS_TO_IMPORT.every(person => !Object.hasOwn(person, 'nodusPassword')));
  for (const file of ['../src/context/AuthContext.jsx', '../src/components/UserProfileModal.jsx']) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\.nodusPassword\b/);
  }
  const modal = readFileSync(new URL('../src/components/UserProfileModal.jsx', import.meta.url), 'utf8');
  assert.match(modal, /hasNodusAssignment && mayReadPrivateProfile/);
  assert.match(modal, /subscribeToPrivateNodusCredentials\(currentUser, user/);
  assert.match(modal, /nodusCredentials\.password/);
});

test('unauthorized viewers cannot initialize a credential listener', () => {
  const fixtureData = fixture(false);
  assert.throws(fixtureData.start, /autorización/);
  assert.equal(fixtureData.listeners.length, 0);
});

test('credentials require a fresh authorized snapshot and are cleared on errors and teardown', () => {
  const { start, emit, callbacks, listeners } = fixture();
  const stop = start();
  assert.equal(listeners[0].ref, 'user_private_credentials/owner@example.invalid');
  const data = { username: 'synthetic', password: 'synthetic-fixture-only', sede: 'Lima', extra: 'private-extra' };
  emit(data, true);
  assert.equal(callbacks.at(-1).data, null, 'cached credentials are never displayed');
  emit(data);
  assert.deepEqual(callbacks.at(-1).data, { username: data.username, password: data.password, sede: data.sede });
  listeners[0].error({ code: 'permission-denied' });
  assert.equal(callbacks.at(-1).data, null);
  assert.equal(callbacks.at(-1).state.status, 'error');
  emit(null);
  assert.equal(callbacks.at(-1).state.status, 'empty');
  emit({ username: data.username });
  assert.equal(callbacks.at(-1).data, null);
  assert.equal(callbacks.at(-1).state.status, 'error');
  stop();
  const count = callbacks.length;
  emit(data);
  listeners[0].error({ code: 'permission-denied' });
  assert.equal(callbacks.length, count, 'an old profile callback cannot expose its credentials to the next view');
  assert.equal(listeners[0].stopped, true);
});
