import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  HALF_LIFE_MS, emptyUsage, usageKey, readUsage, recordUsage, resetUsage,
  parseUsage, frequentModules, decayedScore
} from './moduleUsage.js';
import { allowedUsageModules, moduleForVisit } from './moduleNavigation.js';
import { canEnterRoleRoute } from './routeAccess.js';
import { MODULE_REGISTRY } from '../config/moduleRegistry.js';

const now = 1800000000000;
const user = { uid: 'synthetic-a', appRole: 'gerente', roles: ['gerente'] };
const known = MODULE_REGISTRY.filter(mod => mod.route).map(mod => mod.id);
const storage = () => {
  const data = new Map();
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key),
    data
  };
};
const policies = [
  { path: '/gerente', access: { allowedRoles: ['gerente'] } },
  { path: '/portafolio', access: { allowedRoles: ['gerente'] } },
  { path: '/estrategia', access: { allowedRoles: ['gerente'] } },
  { path: '/auditoria-kpis', access: { allowedRoles: ['gerente'] } },
  { path: '/metas', access: { allowedRoles: ['gerente'] } },
  { path: '/manual', access: { allowedRoles: ['gerente'] } },
  { path: '/reportes', access: { allowedRoles: ['gerente'] } },
  { path: '/checklist/:roleId', access: {} },
  { path: '/finance-workspace', access: { allowedRoles: ['finanzas'] } }
];

test('no history or a first visit never invents a habit', () => {
  const store = storage();
  const allowed = allowedUsageModules(user, policies);
  assert.deepEqual(frequentModules(readUsage(store, user, null, known, now), allowed, now), []);
  const usage = recordUsage(store, user, null, 'gerencial', ['gerencial'], known, now);
  assert.deepEqual(frequentModules(usage, allowed, now), []);
});

test('ranks only repeated real modules, caps at six, and decays recent habits', () => {
  const store = storage();
  const allowed = allowedUsageModules(user, policies);
  let usage;
  for (const mod of allowed) {
    for (let i = 0; i < 3; i++) {
      usage = recordUsage(store, user, null, mod.id, allowed.map(mod => mod.id), known, now);
    }
  }
  assert.equal(frequentModules(usage, allowed, now).length, 6);
  assert.deepEqual(frequentModules(usage, allowed, now + HALF_LIFE_MS * 4), []);
  assert.equal(decayedScore({ score: 4, updatedAt: now }, now + HALF_LIFE_MS), 2);
  for (let i = 0; i < 2; i++) {
    usage = recordUsage(store, user, null, 'metas', ['metas'], known, now + HALF_LIFE_MS * 4);
  }
  assert.deepEqual(frequentModules(usage, allowed, now + HALF_LIFE_MS * 4).map(mod => mod.id), ['metas']);
});

test('isolates UID and resets only this usage namespace', () => {
  const store = storage();
  const other = { ...user, uid: 'synthetic-b' };
  recordUsage(store, user, null, 'gerencial', ['gerencial'], known, now);
  recordUsage(store, other, null, 'metas', ['metas'], known, now);
  store.setItem('causa:elizabeth-preferences:v1:synthetic-a', 'unchanged');
  assert.deepEqual(Object.keys(readUsage(store, user, null, known, now).modules), ['gerencial']);
  assert.deepEqual(Object.keys(readUsage(store, other, null, known, now).modules), ['metas']);
  assert.equal(resetUsage(store, user, null), true);
  assert.deepEqual(readUsage(store, user, null, known, now), emptyUsage());
  assert.ok(store.data.has(usageKey(other)));
  assert.equal(store.getItem('causa:elizabeth-preferences:v1:synthetic-a'), 'unchanged');
});

test('simulation, missing UID, no auth and participants never touch storage', () => {
  const forbidden = new Proxy({}, { get() { throw new Error('storage accessed'); } });
  for (const [candidate, original] of [
    [{ ...user, isSimulated: true }, null], [user, { uid: 'admin' }],
    [{ appRole: 'gerente' }, null], [null, null], [{ ...user, isParticipantOnly: true }, null]
  ]) {
    assert.deepEqual(readUsage(forbidden, candidate, original, known, now), emptyUsage());
    assert.equal(recordUsage(forbidden, candidate, original, 'gerencial', ['gerencial'], known, now), null);
    assert.equal(resetUsage(forbidden, candidate, original), false);
  }
});

test('storage failures and corrupted histories surface rather than silently defaulting', () => {
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('blocked'); } };
  assert.throws(() => readUsage(broken, user, null, known), /blocked/);
  assert.throws(() => resetUsage(broken, user, null), /blocked/);
  assert.throws(() => recordUsage({ ...broken, getItem: () => null }, user, null, 'metas', ['metas'], known), /quota/);
  for (const value of [
    { version: 2, modules: {} }, { version: 1, modules: [] },
    { version: 1, modules: { '/private/person': { score: 2, visits: 2, updatedAt: now } } },
    { version: 1, modules: { metas: { score: Infinity, visits: 2, updatedAt: now } } },
    { version: 1, modules: { metas: { score: 2, visits: -1, updatedAt: now } } },
    { version: 1, modules: { metas: { score: 2, visits: 2, updatedAt: now + 1 } } }
  ]) assert.throws(() => parseUsage(value, known, now));
  const store = storage();
  store.setItem(usageKey(user), '{broken');
  assert.throws(() => readUsage(store, user, null, known, now));
  resetUsage(store, user, null);
  assert.deepEqual(readUsage(store, user, null, known, now), emptyUsage());
});

test('denied modules, unknown routes and custom tools cannot be recorded', () => {
  const store = storage();
  const allowed = allowedUsageModules(user, policies);
  assert.equal(allowed.some(mod => mod.id === 'finance-workspace'), false);
  for (const pathname of ['/login', '/home', '/home-completo', '/unknown', '/metas/private', '/checklist/otra-persona', '/finance-workspace', '/metas?persona=privada']) {
    assert.equal(moduleForVisit(allowed, user, pathname), undefined);
  }
  assert.equal(moduleForVisit(allowed, user, '/checklist/gerente').id, 'checklist');
  assert.equal(recordUsage(store, user, null, 'finance-workspace', allowed.map(mod => mod.id), known, now), null);
  assert.equal(recordUsage(store, user, null, 'custom', ['custom'], known, now), null);
  assert.equal(store.data.size, 0);
});

test('manipulated permitted-shape history never extends permissions after role change', () => {
  const usage = parseUsage({ version: 1, modules: { portafolio: { score: 999, visits: 999, updatedAt: now } } }, known, now);
  const changedRole = { ...user, appRole: 'capitan', roles: ['capitan'] };
  assert.deepEqual(frequentModules(usage, allowedUsageModules(changedRole, policies), now), []);
  assert.deepEqual(allowedUsageModules({ ...changedRole, appRole: 'consolidado' }, policies).map(mod => mod.id), ['checklist']);
  assert.deepEqual(allowedUsageModules({ ...user, canAccessRole: () => false }, policies).filter(mod => mod.id === 'checklist'), []);
});

test('shared route predicate preserves email, observer, bypass and exclusions', () => {
  const access = { allowedRoles: ['coord_c1'], excludeDireccionBypass: true };
  assert.equal(canEnterRoleRoute({ ...user, isDireccion: true }, access), false);
  assert.equal(canEnterRoleRoute({ ...user, isDireccion: true }, { ...access, excludeDireccionBypass: false }), true);
  assert.equal(canEnterRoleRoute({ ...user, isSuperAdmin: true }, access), true);
  assert.equal(canEnterRoleRoute({ ...user, email: 'review@example.invalid' }, { ...access, allowedEmails: ['review@example.invalid'] }), true);
  assert.equal(canEnterRoleRoute({ ...user, appRole: 'consolidado', roles: ['coord_c1'] }, access), true);
  assert.equal(canEnterRoleRoute({ ...user, isParticipantOnly: true }, {}), false);
  assert.equal(canEnterRoleRoute(user, { requireSuperAdmin: true }), false);
});

test('wiring derives the route matrix and records only inside committed authorized guards', () => {
  const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
  const provider = readFileSync(new URL('../context/ModuleUsageContext.jsx', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../pages/Home.jsx', import.meta.url), 'utf8');
  const shortcuts = readFileSync(new URL('../components/ModuleQuickAccess.jsx', import.meta.url), 'utf8');
  assert.match(app, /access: element.type === RoleRoute \? element.props : \{\}/);
  assert.match(app, /<ModuleUsageProvider[\s\S]*<Suspense[\s\S]*<Routes>/);
  assert.match(app, /return currentUser \? <ModuleVisit>/);
  assert.match(app, /const hasRole = canEnterRoleRoute/);
  assert.match(provider, /lastVisit.current === token/);
  assert.match(provider, /location.pathname/);
  assert.doesNotMatch(provider, /location.search|firebase|fetch\(/);
  assert.match(home, /<ModuleQuickAccess \/>/);
  assert.match(shortcuts, /frequent.length >= 4/);
  assert.match(shortcuts, /Restablecer mi espacio/);
  assert.match(app, /no aplican al simular/);
});
