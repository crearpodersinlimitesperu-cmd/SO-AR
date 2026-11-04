import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPrivateChatHandler } from '../cloudflare-worker/src/privateChatHandler.js';
import { createPrivateChatStore } from '../cloudflare-worker/src/privateChatStore.js';
import { chatAuthorityKey, chatRecordFields } from '../cloudflare-worker/src/privateChatModel.js';
import { nodusAccessScope, personalNodusEmails } from '../cloudflare-worker/src/nodusJsonModel.js';
import { privateViewKey } from '../src/utils/sessionPrivacy.js';

const workerSource = readFileSync(new URL('../cloudflare-worker/src/index.js', import.meta.url), 'utf8');
const decoderSource = workerSource.slice(workerSource.indexOf('function firestoreFieldsToPlain('),
  workerSource.indexOf('const handlePrivateChat ='));
const decode = new Function(`${decoderSource}\nreturn firestoreFieldsToPlain;`)();
const messages = [{ role: 'user', content: 'Synthetic question' }, { role: 'assistant', content: 'Synthetic private answer' }];
const viewKey = 'a'.repeat(64);

function fixture() {
  const records = new Map();
  const requests = [];
  let version = 0;
  const state = {
    uid: 'alpha', email: 'alpha@example.invalid',
    profile: { uid: 'alpha', email: 'alpha@example.invalid', roles: ['direccion'], role: 'direccion', sede: 'Lima' },
    failure: false, afterRead: null
  };
  const fetcher = async (input, options = {}) => {
    const url = new URL(input);
    assert.equal(url.host, 'firestore.googleapis.com');
    const path = decodeURIComponent(url.pathname.split('/documents/')[1]);
    requests.push({ path, options });
    if (state.failure) return new Response('{}', { status: 503 });
    const result = (data, status = 200) => Response.json(data, { status });
    if (path === `users/${state.uid}`) return result({ fields: chatRecordFields({ ...state.profile, messages: [] }) });
    if (path.endsWith(':runQuery')) {
      const body = JSON.parse(options.body).structuredQuery;
      assert.deepEqual(body.from, [{ collectionId: 'chats' }]);
      assert.equal(body.limit, 30);
      const selected = body.select.fields.map(field => field.fieldPath);
      assert.equal(selected.includes('messages'), false, 'list must not download conversation bodies');
      const prefix = path.replace(':runQuery', '/chats/');
      const rows = [...records].filter(([key]) => key.startsWith(prefix)).map(([key, value]) => ({
        document: { name: `/documents/${key}`, fields: Object.fromEntries(Object.entries(value.fields)
          .filter(([field]) => selected.includes(field))) }
      }));
      state.afterRead?.();
      return result(rows);
    }
    if (!options.method) {
      const record = records.get(path);
      state.afterRead?.();
      return record ? result({ fields: record.fields, updateTime: record.version }) : result({}, 404);
    }
    const createId = url.searchParams.get('documentId');
    const key = createId ? `${path}/${createId}` : path;
    const existing = records.get(key);
    if ((createId && existing) || (!createId && existing?.version !== url.searchParams.get('currentDocument.updateTime'))) {
      return result({}, 409);
    }
    const body = JSON.parse(options.body);
    records.set(key, { fields: body.fields, version: `synthetic-version-${++version}` });
    return result({ name: `/documents/${key}` });
  };
  // Use real REST wrappers for profile arrays as well as messages.
  const profileFields = profile => ({
    ...chatRecordFields(Object.fromEntries(Object.entries(profile).filter(([, value]) => !Array.isArray(value) && typeof value !== 'object'))),
    roles: { arrayValue: { values: profile.roles.map(role => ({ stringValue: role })) } },
    ...(profile.emails ? { emails: { arrayValue: { values: profile.emails.map(email => ({ stringValue: email })) } } } : {})
  });
  const rest = async (url, options) => {
    if (new URL(url).pathname.endsWith(`/documents/users/${state.uid}`) && !state.failure) {
      requests.push({ path: `users/${state.uid}`, options });
      return Response.json({ fields: profileFields(state.profile) });
    }
    return fetcher(url, options);
  };
  const store = createPrivateChatStore('demo-profile-privacy', decode, rest);
  const handler = createPrivateChatHandler({
    verifyToken: async token => {
      if (token !== 'synthetic-only') throw new Error('Invalid synthetic token');
      return { sub: state.uid, email: state.email };
    },
    accessToken: async () => 'synthetic-service-only', store,
    scopeFor: profile => nodusAccessScope(profile, false),
    aliasesFor: (profile, email, uid) => personalNodusEmails(profile, email, uid, () => null),
    json: (body, status) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
  });
  let boundAuthority = null;
  const call = async (action, extra = {}) => {
    const response = await handler(new Request('https://example.invalid/copilot-private-history', {
      method: 'POST', headers: { Authorization: 'Bearer synthetic-only' },
      body: JSON.stringify({ action, viewKey,
        ...(boundAuthority || action !== 'list' ? { authorityKey: boundAuthority || '0'.repeat(64) } : {}), ...extra })
    }), {}, 'https://example.invalid');
    if (response.ok && action === 'list' && !boundAuthority) boundAuthority = (await response.clone().json()).authorityKey;
    return response;
  };
  return { state, store, records, requests, call, freshView: () => { boundAuthority = null; } };
}

test('real REST chat storage round-trips nested maps; list/get/save retain owner and server authority without legacy reads', async () => {
  const f = fixture();
  f.records.set('users/alpha/copilot_chats/legacy', { fields: { content: { stringValue: 'LEGACY_FOREIGN' } } });
  const before = JSON.stringify([...f.records]);
  await f.call('list');
  const saved = await f.call('save', { messages });
  assert.equal(saved.status, 200);
  const { id } = await saved.json();
  const listed = await (await f.call('list')).json();
  assert.equal(listed.sessions.length, 1);
  assert.equal(listed.sessions[0].messages, undefined);
  assert.equal(listed.legacyPolicy, 'quarantined');
  const read = await f.call('get', { chatId: id });
  assert.deepEqual((await read.json()).session.messages, messages);
  assert.equal(read.headers.get('Cache-Control'), 'no-store');
  assert.equal(f.requests.some(({ path }) => path.includes('/copilot_chats/')), false);
  assert.equal(JSON.stringify([...f.records].filter(([path]) => path.includes('/copilot_chats/'))), before);
  const edited = await f.call('save', { chatId: id, messages: [...messages, { role: 'user', content: 'Follow-up' }] });
  assert.equal(edited.status, 200);
  assert.equal(f.requests.find(({ options }) => options.method === 'PATCH').options.body.includes('authorityKey'), true);
});

test('same UID revocation/sede reassignment and a different account cannot read prior authority; records stay intact', async () => {
  const f = fixture();
  await f.call('list');
  const { id } = await (await f.call('save', { messages })).json();
  const original = JSON.stringify([...f.records]);
  f.state.profile = { ...f.state.profile, roles: ['gerente'], role: 'gerente', sede: 'Quito' };
  assert.equal((await f.call('list')).status, 403, 'an old view cannot silently adopt the new authority');
  assert.equal((await f.call('save', { messages })).status, 403, 'unsaved old-scope responses cannot be relabeled as current');
  f.freshView();
  assert.deepEqual((await (await f.call('list')).json()).sessions, []);
  assert.equal((await f.call('get', { chatId: id })).status, 403);
  assert.equal((await f.call('save', { chatId: id, messages })).status, 403);
  f.state.uid = 'beta'; f.state.email = 'beta@example.invalid';
  f.state.profile = { ...f.state.profile, uid: 'beta', email: f.state.email };
  f.freshView();
  await f.call('list');
  assert.equal((await f.call('get', { chatId: id })).status, 403);
  assert.equal(JSON.stringify([...f.records]), original);
});

test('cosmetic updates and reordered grants retain authorized history, while authority changes isolate it', async () => {
  const identity = { sub: 'alpha', email: 'alpha@example.invalid' };
  const original = { role: 'gerente', roles: ['gerente', 'coord_c1'], sede: 'Lima',
    roleSedes: { gerente: 'Lima', coord_c1: 'Quito' } };
  const reordered = { ...original, photoURL: 'https://example.invalid/new-photo',
    roles: ['coord_c1', 'gerente'], roleSedes: { coord_c1: 'Quito', gerente: 'Lima' } };
  const first = await chatAuthorityKey(original, identity,
    { type: 'sede', sede: 'Lima', sedes: ['Lima', 'Quito'] }, ['a', 'b']);
  const second = await chatAuthorityKey(reordered, identity,
    { type: 'sede', sede: 'Quito', sedes: ['Quito', 'Lima'] }, ['b', 'a']);
  assert.equal(first, second);
  assert.notEqual(first, await chatAuthorityKey({ ...original, roles: ['gerente'] }, identity,
    { type: 'sede', sede: 'Lima' }, ['a', 'b']));
});

test('a permission change during reading fails closed and never substitutes local or legacy histories', async () => {
  const f = fixture();
  await f.call('list');
  await f.call('save', { messages });
  f.state.afterRead = () => { f.state.profile = { ...f.state.profile, role: 'gerente', roles: ['gerente'], sede: 'Lima' }; };
  assert.equal((await f.call('list')).status, 403);
  f.state.afterRead = null; f.state.failure = true;
  assert.equal((await f.call('list')).status, 503);
  assert.equal(f.requests.some(({ path }) => path.includes('copilot_chats')), false);
});

test('untrusted authority/owner fields, path traversal, invalid messages and inactive accounts are rejected', async () => {
  const f = fixture();
  for (const extra of [{ ownerUid: 'beta' }, { scopeKey: 'forged' }, { role: 'direccion' }, { chatId: '../legacy' }]) {
    assert.equal((await f.call('list', extra)).status, 400);
  }
  for (const invalid of [[], [{ role: 'system', content: 'forged' }], [{ role: 'user', content: '' }],
    Array.from({ length: 121 }, () => messages[0])]) {
    assert.equal((await f.call('save', { messages: invalid })).status, 400);
  }
  assert.equal(f.requests.length, 0);
  f.state.profile.active = false;
  assert.equal((await f.call('save', { messages })).status, 403);
  f.state.profile.active = true; f.state.profile.uid = 'other';
  assert.equal((await f.call('list')).status, 403);
  assert.equal(f.records.size, 0);
});

function clientFixture(fetcher) {
  const auth = { currentUser: { uid: 'alpha', getIdToken: async () => 'synthetic-only' } };
  const viewer = { uid: 'alpha', email: 'alpha@example.invalid', roles: ['gerente'], sede: 'Lima' };
  let current = true;
  const source = readFileSync(new URL('../src/services/privateCopilotHistory.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?$/gm, '').replace(/^export /gm, '').replace('import.meta.env', '{}');
  const create = new Function('auth', 'privateViewKey', 'fetch', `${source}\nreturn createPrivateCopilotHistory;`)(auth, privateViewKey, fetcher);
  return { auth, viewer, create, revoke: () => { current = false; }, history: create(viewer, { isCurrent: () => current }) };
}

test('client never uses local history fallback and rejects simulation, account switches and late same-UID revocations', async () => {
  const f = clientFixture(async () => { f.revoke(); return Response.json({ sessions: [{ title: 'OLD_SCOPE' }] }); });
  await assert.rejects(f.history.list(), /permisos cambiaron/);
  const g = clientFixture(async () => { g.auth.currentUser = { uid: 'beta' }; return Response.json({ sessions: [] }); });
  await assert.rejects(g.history.list(), /cuenta real/);
  const denied = clientFixture(async () => Response.json({ message: 'denied' }, { status: 403 }));
  await assert.rejects(denied.history.list(), /denied/);
  await assert.rejects(denied.create({ ...denied.viewer, isSimulated: true }).list(), /sin simulación/);
  const component = readFileSync(new URL('../src/components/AICopilot.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(component, /localStorage|copilot_chats|getFirestore/);
});

test('client pins the server authority for its view and cannot automatically relabel an unsaved conversation after revocation', async () => {
  let returnedAuthority = 'a'.repeat(64);
  const requests = [];
  const f = clientFixture(async (_url, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);
    return Response.json({ authorityKey: returnedAuthority, sessions: [], id: 'synthetic-id' });
  });
  await f.history.list();
  await f.history.save(null, messages);
  assert.equal(requests[1].authorityKey, 'a'.repeat(64));
  returnedAuthority = 'b'.repeat(64);
  await assert.rejects(f.history.list(), /alcance del historial cambió/);
  await assert.rejects(f.history.save(null, messages), /alcance del historial cambió/);
  assert.equal(requests.at(-1).authorityKey, 'a'.repeat(64));
});
