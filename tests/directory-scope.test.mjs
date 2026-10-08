import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import {
  NODUS_REPORT_ADMIN_EMAILS,
  OPERATIONAL_COMMUNICATION_EMAILS,
  ASIGNADOR_ENTRENADORES_EMAILS,
  SUPER_ADMIN_EMAILS
} from '../src/config/permissions.js';
import { canonicalSede } from '../src/utils/sede.js';
import { SEDE_ALIASES, sedeAliasList } from '../src/utils/sedeAliases.js';

const require = createRequire(import.meta.url);
const d = require('../functions/directoryScope.js');

const docs = [
  { id: 'lima-1', data: { name: 'Ana', email: 'ana@x.com', role: 'entrenador', roles: ['entrenador'], sede: 'Lima', phone: '111', cumpleanos: '1990-01-01' } },
  { id: 'quito-1', data: { name: 'Beto', email: 'beto@x.com', role: 'entrenador', roles: ['entrenador'], sede: 'Quito', phone: '222', cumpleanos: '1991-02-02', statusHistory: [{ x: 1 }] } },
  { id: 'quito-gerente', data: { name: 'Gina', email: 'gina@x.com', role: 'gerente', roles: ['gerente'], sede: 'Quito' } },
  { id: 'quito-off', data: { name: 'Off', email: 'off@x.com', role: 'entrenador', sede: 'Quito', isActive: false } },
  { id: 'cuenca-1', data: { name: 'Caro', email: 'caro@x.com', role: 'qt', roles: ['qt'], sede: 'Cuenca' } }
];

test('global roles and fixed global emails resolve to global scope', () => {
  assert.equal(d.resolveScope({ role: 'Dirección', sede: 'Sede Global' }, 'x@x.com').level, 'global');
  assert.equal(d.resolveScope({ roles: ['director_maestria'] }, 'x@x.com').level, 'global');
  assert.equal(d.resolveScope({ role: 'talento_humano', sede: 'Lima' }, 'x@x.com').level, 'global');
  assert.equal(d.resolveScope({ role: 'colaborador' }, 'jose.sanchez@crearpsl.com').level, 'global');
  assert.equal(d.resolveScope({ role: 'colaborador' }, 'fer.aragon@crearpsl.net').level, 'global');
});

test('scope comes from the stored profile; a gerente is sede-level, not global', () => {
  const s = d.resolveScope({ role: 'gerente', sede: 'Lima' }, 'g@x.com');
  assert.deepEqual([s.level, s.sede, s.crossSedeRoster], ['sede', 'Lima', true]);
  assert.equal(d.resolveScope({ role: 'colaborador', sede: 'Sede Global' }, 'c@x.com').level, 'self');
  assert.equal(d.resolveScope(null, 'c@x.com').level, 'none');
});

test('ordinary roles get no cross-sede roster', () => {
  const s = d.resolveScope({ role: 'entrenador', sede: 'Lima' }, 'e@x.com');
  assert.equal(s.crossSedeRoster, false);
  assert.deepEqual(d.buildDirectory(s, docs), []);
  assert.deepEqual(d.buildDirectory(d.resolveScope(null, 'n@x.com'), docs), []);
});

test('coordination roles get other sedes with minimal fields only', () => {
  const s = d.resolveScope({ role: 'coord_c1', sede: 'Lima' }, 'c@x.com');
  const out = d.buildDirectory(s, docs);
  assert.deepEqual(out.map(u => u.id).sort(), ['cuenca-1', 'quito-1', 'quito-gerente']);
  for (const u of out) {
    for (const f of ['phone', 'cumpleanos', 'statusHistory']) assert.equal(f in u, false);
  }
  assert.equal(out.find(u => u.id === 'quito-1').email, 'beto@x.com');
});

test('inactive users are hidden from non-global callers and shown to global ones', () => {
  const coord = d.buildDirectory(d.resolveScope({ role: 'coord_c1', sede: 'Lima' }, 'c@x.com'), docs);
  assert.equal(coord.some(u => u.id === 'quito-off'), false);
  const global = d.buildDirectory(d.resolveScope({ role: 'direccion' }, 'x@x.com'), docs);
  assert.equal(global.some(u => u.id === 'quito-off'), true);
});

test('same-sede accents/case do not leak the caller sede into the cross-sede list', () => {
  const s = d.resolveScope({ role: 'gerente', sede: 'Medellín' }, 'g@x.com');
  const out = d.buildDirectory(s, [{ id: 'm', data: { email: 'm@x.com', sede: 'Medellin' } }]);
  assert.deepEqual(out, []);
});

test('backend canonicalSede mirrors src/utils/sede.js for every known and tricky value', () => {
  const values = ['Quito', 'Quito Ciclo 1', 'Quito C1', 'Quito C2', 'UIO', 'uio', 'Ciclo 2', 'Medellin', 'Medellín', 'MEDELLIN',
    'MED', 'Lima', 'LIM', 'Cuenca', 'CUE', 'Guayaquil', 'GYE', 'Mexico', 'México', 'CDMX', 'Internacional', 'INT',
    'Global', 'Sede Global', 'Sin Sede', '', null, undefined, 'Medelln', '  Lima  ', 'Otra'];
  for (const v of values) assert.equal(d.canonicalSede(v), canonicalSede(v), String(v));
});

test('sede aliases: same canonical sede is the same scope, "Sin Sede"/Global never is', () => {
  assert.equal(d.sameSede('Quito Ciclo 1', 'Quito'), true);
  assert.equal(d.sameSede('Quito C2', 'UIO'), true);
  assert.equal(d.sameSede('Medellin', 'Medellín'), true);
  assert.equal(d.sameSede('Lima', 'Quito'), false);
  assert.equal(d.sameSede('Sin Sede', 'Sin Sede'), false);
  assert.equal(d.sameSede('Global', 'Global'), false);
  assert.equal(d.resolveScope({ role: 'colaborador', sede: 'Sin Sede' }, 'c@x.com').level, 'self');
});

test('client alias helper agrees with the backend and only yields canonical aliases', () => {
  for (const sede of ['Quito Ciclo 1', 'Quito', 'Medellin', 'Medellín', 'Lima']) {
    assert.deepEqual(sedeAliasList(sede), d.sedeAliasList(sede), sede);
    assert.ok(sedeAliasList(sede).length <= 30);
  }
  assert.deepEqual(sedeAliasList('Quito Ciclo 1'), SEDE_ALIASES.Quito);
  assert.deepEqual(sedeAliasList('Medellin'), SEDE_ALIASES['Medellín']);
  assert.deepEqual(sedeAliasList('Sin Sede'), []);
  assert.deepEqual(sedeAliasList('Global'), []);
  assert.deepEqual(sedeAliasList('Sede Rara'), ['Sede Rara']);
});

test('same-sede residuals outside the alias set are served by the backend, even to non-roster roles', () => {
  const residual = { id: 'q-res', data: { email: 'r@x.com', sede: 'quito  ciclo 1', role: 'colaborador' } };
  const direct = { id: 'q-dir', data: { email: 'd@x.com', sede: 'Quito C1', role: 'colaborador' } };
  const lima = { id: 'l', data: { email: 'l@x.com', sede: 'Lima', role: 'colaborador' } };
  const trainer = d.resolveScope({ role: 'entrenador', sede: 'Quito Ciclo 1' }, 't@x.com');
  assert.deepEqual(d.buildDirectory(trainer, [residual, direct, lima]).map(u => u.id), ['q-res']);
  const coord = d.resolveScope({ role: 'coord_c1', sede: 'Quito' }, 'c@x.com');
  assert.deepEqual(d.buildDirectory(coord, [residual, direct, lima]).map(u => u.id), ['q-res', 'l']);
});

test('getRoleRecipients authz: trainers, collaborators and callers without profile are denied', () => {
  const ask = ['gerente', 'direccion'];
  assert.equal(d.checkRecipientRequest(d.resolveScope({ role: 'entrenador', sede: 'Lima' }, 't@x.com'), ask).error, 'permission-denied');
  assert.equal(d.checkRecipientRequest(d.resolveScope({ role: 'colaborador', sede: 'Lima' }, 'c@x.com'), ask).error, 'permission-denied');
  assert.equal(d.checkRecipientRequest(d.resolveScope(null, 'n@x.com'), ask).error, 'permission-denied');
});

test('getRoleRecipients authz: global and coordination callers pass, but only with allowlisted roles', () => {
  const global = d.resolveScope({ role: 'direccion' }, 'x@x.com');
  const coord = d.resolveScope({ role: 'coord_c1', sede: 'Lima' }, 'c@x.com');
  for (const scope of [global, coord]) {
    assert.deepEqual(d.checkRecipientRequest(scope, ['Gerente', 'gerente', 'Dirección']).roles, ['gerente', 'direccion']);
    for (const bad of ['sheriff', 'colaborador', 'student', '', '  ']) {
      assert.equal(d.checkRecipientRequest(scope, ['gerente', bad]).error, 'invalid-argument', bad);
    }
    assert.equal(d.checkRecipientRequest(scope, 'gerente').error, 'invalid-argument');
    assert.equal(d.checkRecipientRequest(scope, []).error, 'invalid-argument');
    assert.equal(d.checkRecipientRequest(scope, ['gerente', 5]).error, 'invalid-argument');
    assert.equal(d.checkRecipientRequest(scope, Array.from({ length: 21 }, () => 'gerente')).error, 'invalid-argument');
  }
});

test('the roles ExcellenceService asks for are allowlisted', () => {
  for (const r of ['gerente', 'direccion', 'director_maestria', 'superadmin']) {
    assert.ok(d.RECIPIENT_ROLE_ALLOWLIST.includes(r), r);
  }
});

test('scale safety: bounded reads are declared and callables fail loudly instead of returning partial data', () => {
  assert.ok(d.MAX_DIRECTORY_DOCS > 0 && d.MAX_DIRECTORY_DOCS <= 10000);
  const fn = readFileSync(new URL('../functions/index.js', import.meta.url), 'utf8');
  assert.match(fn, /\.limit\(max \+ 1\)/);
  assert.match(fn, /snap\.size > max/);
  assert.match(fn, /failed-precondition/);
  assert.match(fn, /maxInstances: 5/);
  assert.doesNotMatch(fn, /collection\("users"\)\.select\([^)]*\)\.get\(\)/);
});

test('recipient roles are sanitized and capped', () => {
  assert.deepEqual(d.sanitizeRecipientRoles('gerente'), []);
  assert.deepEqual(d.sanitizeRecipientRoles(['Gerente', 'gerente', 5, null, 'Dirección']), ['gerente', 'direccion']);
  assert.equal(d.sanitizeRecipientRoles(Array.from({ length: 50 }, (_, i) => `r${i}`)).length, 20);
});

test('recipients expose only email and role, skip inactive and duplicates', () => {
  const out = d.buildRecipients(['gerente', 'qt'], [
    ...docs,
    { id: 'dup', data: { email: 'GINA@x.com', role: 'gerente' } }
  ]);
  assert.deepEqual(out, [
    { email: 'gina@x.com', role: 'gerente' },
    { email: 'caro@x.com', role: 'qt' }
  ]);
  assert.deepEqual(d.buildRecipients([], docs), []);
});

test('global roles stay aligned across rules, backend and client', async () => {
  const { readFileSync } = await import('node:fs');
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const client = readFileSync(new URL('../src/services/userService.js', import.meta.url), 'utf8');
  for (const r of d.GLOBAL_ROLES) {
    assert.ok(rules.includes(`'${r}'`), `rules missing ${r}`);
    assert.ok(client.includes(`'${r}'`), `client missing ${r}`);
  }
});

const rulesText = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const emailsInRuleFunction = (name) => {
  const start = rulesText.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const block = rulesText.slice(start, rulesText.indexOf('\n    }\n', start));
  return [...block.matchAll(/'([^']+@[^']+)'/g)].map(m => m[1]);
};
const toNet = (e) => e.toLowerCase().replace(/@crearpsl\.com$/, '@crearpsl.net');

test('rules whitelist, client NODUS_REPORT_ADMIN_EMAILS and backend GLOBAL_EMAILS list the same people', () => {
  const rulesList = new Set([...SUPER_ADMIN_EMAILS, ...emailsInRuleFunction('isGerenteODireccion')]
    .map(toNet));
  const directoryRule = new Set(emailsInRuleFunction('isDirectoryWhitelistedEmail'));
  const nonSuper = [...rulesList].filter(e => !SUPER_ADMIN_EMAILS.includes(e));
  assert.deepEqual([...directoryRule].sort(), nonSuper.sort());
  assert.deepEqual([...new Set(NODUS_REPORT_ADMIN_EMAILS.map(toNet))].sort(), [...rulesList].sort());
  assert.deepEqual([...new Set(d.GLOBAL_EMAILS.map(toNet))].sort(), [...rulesList].sort());
});

test('everyone allowed to send communications or assign trainers keeps the global directory', () => {
  const global = new Set(d.GLOBAL_EMAILS.map(toNet));
  for (const e of [...OPERATIONAL_COMMUNICATION_EMAILS, ...ASIGNADOR_ENTRENADORES_EMAILS]) {
    assert.ok(global.has(toNet(e)), `${e} would lose the cross-sede directory`);
    assert.equal(d.resolveScope({ role: 'colaborador', sede: 'Lima' }, e).level, 'global', e);
  }
});

test('the client global check uses the same whitelist and aliases', () => {
  const client = readFileSync(new URL('../src/services/userService.js', import.meta.url), 'utf8');
  assert.match(client, /NODUS_REPORT_ADMIN_EMAILS\.includes\(emailToNetAlias\(currentUser\.email\)\)/);
});
