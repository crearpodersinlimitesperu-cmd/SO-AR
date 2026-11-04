import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function fixture() {
  const listeners = [];
  const warnings = [];
  const source = readFileSync(new URL('../src/services/nodusVerificationService.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?$/gm, '')
    .replace(/^export /gm, '');
  const service = new Function('db', 'doc', 'collection', 'onSnapshot', 'confirmedStatus', 'console',
    `${source}\nreturn { initNodusRealtimeListener, findParticipantInNodus };`)(
    {}, (_db, ...path) => path.join('/'), (_db, ...path) => path.join('/'),
    (ref, next, error) => {
      const listener = { ref, next, error, stopped: false };
      listeners.push(listener);
      return () => { listener.stopped = true; };
    }, () => false, { warn: (...args) => warnings.push(args) }
  );
  const team = email => ({ equipoNombre: 'Equipo 42', participantes: [{ n: 'Synthetic Person', email }] });
  const emit = (index, email) => {
    const data = team(email);
    listeners[index].next(listeners[index].ref.endsWith('/equipos')
      ? { docs: [{ data: () => data }] }
      : { exists: () => true, data: () => ({ equiposReporte: [data] }) });
  };
  return { ...service, listeners, warnings, emit };
}

test('Nodus singleton clears private rows after the last subscriber leaves and ignores old-session callbacks', () => {
  const service = fixture();
  const firstEmail = 'first@example.invalid', secondEmail = 'second@example.invalid';
  const stopFirst = service.initNodusRealtimeListener(() => {});
  const stopPeer = service.initNodusRealtimeListener(() => {});
  assert.equal(service.listeners.length, 2, 'same mounted session shares the two listeners');
  service.emit(0, firstEmail);
  assert.ok(service.findParticipantInNodus({ email: firstEmail }));
  stopFirst();
  assert.ok(service.findParticipantInNodus({ email: firstEmail }), 'another live subscriber retains its data');
  stopPeer();
  assert.ok(service.listeners.every(listener => listener.stopped));
  assert.equal(service.findParticipantInNodus({ email: firstEmail }), null);

  const stopSecond = service.initNodusRealtimeListener(() => {});
  assert.equal(service.findParticipantInNodus({ email: firstEmail }), null, 'no previous-account fallback before a fresh snapshot');
  service.emit(0, firstEmail);
  service.emit(1, firstEmail);
  assert.equal(service.findParticipantInNodus({ email: firstEmail }), null, 'queued callbacks cannot repopulate the new session');
  service.emit(2, secondEmail);
  assert.ok(service.findParticipantInNodus({ email: secondEmail }));
  stopPeer();
  assert.ok(service.findParticipantInNodus({ email: secondEmail }), 'old cleanup is idempotent');
  stopSecond();
  assert.equal(service.findParticipantInNodus({ email: secondEmail }), null);
});

test('a failed Nodus source clears its rows and notifies consumers instead of serving stale private data', () => {
  const service = fixture();
  const updates = [];
  const stop = service.initNodusRealtimeListener(size => updates.push(size));
  service.emit(0, 'root@example.invalid');
  service.emit(1, 'teams@example.invalid');
  service.listeners[0].error(new Error('permission-denied'));
  assert.equal(service.findParticipantInNodus({ email: 'root@example.invalid' }), null);
  assert.ok(service.findParticipantInNodus({ email: 'teams@example.invalid' }));
  service.listeners[1].error(new Error('permission-denied'));
  assert.equal(service.findParticipantInNodus({ email: 'teams@example.invalid' }), null);
  assert.equal(updates.at(-1), 0);
  assert.equal(service.warnings.length, 2);
  stop();
});
