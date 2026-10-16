import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeAuthenticatedRoleProfile, normalizeUserRecord } from './userNormalizer.js';
import { addConsolidatedRole, resolveActiveRole } from './activeRole.js';

test('multi-role selector keeps explicitly assigned roles and adds consolidated view', () => {
  assert.deepEqual(
    addConsolidatedRole(['coord_maestria', 'entrenador']),
    ['coord_maestria', 'entrenador', 'consolidado']
  );
});

test('single assigned role does not invent another role or consolidated access', () => {
  assert.deepEqual(addConsolidatedRole(['coord_maestria']), ['coord_maestria']);
  assert.equal(resolveActiveRole({
    assignedRoles: ['coord_maestria'],
    defaultRole: 'coord_maestria',
    persistedRole: 'gerente'
  }), 'coord_maestria');
});

test('authorized session selection wins, then a persisted override is restored', () => {
  const roles = addConsolidatedRole(['coord_maestria', 'entrenador']);
  assert.equal(resolveActiveRole({
    assignedRoles: roles,
    defaultRole: 'coord_maestria',
    sessionRole: 'entrenador',
    persistedRole: 'coord_maestria'
  }), 'entrenador');
  assert.equal(resolveActiveRole({
    assignedRoles: roles,
    defaultRole: 'coord_maestria',
    persistedRole: 'entrenador'
  }), 'entrenador');
});

test('unauthorized persisted roles are ignored and a required institutional default is preserved', () => {
  assert.equal(resolveActiveRole({
    assignedRoles: ['coord_maestria'],
    defaultRole: 'coord_maestria',
    persistedRole: 'gerente'
  }), 'coord_maestria');
  assert.equal(resolveActiveRole({
    assignedRoles: ['coord_maestria', 'director_maestria', 'consolidado'],
    defaultRole: 'director_maestria',
    sessionRole: 'coord_maestria',
    enforceDefaultRole: true
  }), 'director_maestria');
});

test('user normalization retains role authorization metadata and active-role override', () => {
  const user = normalizeUserRecord({
    email: 'daniela@example.test',
    role: 'coord_maestria',
    roles: ['coord_maestria'],
    activeRoleOverride: 'coord_maestria',
    rolesUpdatedAt: '2026-10-01T00:00:00.000Z',
    rolesUpdatedBy: 'admin@example.test'
  });

  assert.deepEqual(user.roles, ['coord_maestria']);
  assert.equal(user.activeRoleOverride, 'coord_maestria');
  assert.equal(user.rolesUpdatedAt, '2026-10-01T00:00:00.000Z');
  assert.equal(user.rolesUpdatedBy, 'admin@example.test');
});

test('authenticated profile roles override stale lookup roles without adding inferred roles', () => {
  const user = normalizeUserRecord({
    email: 'daniela@example.test',
    role: 'coord_maestria',
    roles: ['coord_maestria', 'gerente']
  });
  const merged = mergeAuthenticatedRoleProfile(user, {
    role: 'coord_maestria',
    roles: ['coord_maestria'],
    rolesUpdatedBy: 'authorized-admin'
  }, ['coord_maestria', 'gerente', 'consolidado']);

  assert.deepEqual(merged.roles, ['coord_maestria']);
  assert.equal(merged.rolesUpdatedBy, 'authorized-admin');
});

test('authenticated profile replaces an old primary role when roles are explicitly configured', () => {
  const user = normalizeUserRecord({
    email: 'someone@example.test',
    role: 'gerente',
    roles: ['gerente']
  });
  const merged = mergeAuthenticatedRoleProfile(user, {
    roles: ['coord_maestria'],
    rolesUpdatedBy: 'authorized-admin'
  }, ['gerente']);

  assert.deepEqual(merged.roles, ['coord_maestria']);
  assert.equal(merged.role, 'coord_maestria');
});

test('authenticated profile active-role selection survives reload only for an assigned role', () => {
  const user = normalizeUserRecord({
    email: 'daniela@example.test',
    role: 'coord_maestria',
    roles: ['coord_maestria', 'entrenador']
  });
  const merged = mergeAuthenticatedRoleProfile(user, {
    role: 'coord_maestria',
    roles: ['coord_maestria', 'entrenador'],
    activeRoleOverride: 'entrenador',
    rolesUpdatedBy: 'authorized-admin'
  }, ['coord_maestria']);
  const assignedRoles = addConsolidatedRole(merged.roles);

  assert.equal(resolveActiveRole({
    assignedRoles,
    defaultRole: merged.role,
    persistedRole: merged.activeRoleOverride
  }), 'entrenador');
  assert.equal(resolveActiveRole({
    assignedRoles: ['coord_maestria'],
    defaultRole: 'coord_maestria',
    persistedRole: 'gerente'
  }), 'coord_maestria');
});

test('admin-configured empty profile does not inherit lookup roles', () => {
  const user = normalizeUserRecord({
    email: 'someone@example.test',
    role: 'gerente',
    roles: ['gerente']
  });
  const merged = mergeAuthenticatedRoleProfile(user, {
    rolesUpdatedBy: 'authorized-admin'
  }, ['gerente', 'consolidado']);

  assert.deepEqual(merged.roles, ['miembro']);
});

test('metadata-only UID profile keeps normalized lookup identity and roles intact', () => {
  const lookup = normalizeUserRecord({
    id: 'directory-key',
    uid: 'firebase-uid',
    email: 'ana@example.test',
    name: 'Ana',
    role: 'coord_maestria',
    roles: ['coord_maestria'],
    activeRoleOverride: 'coord_maestria'
  });
  const merged = mergeAuthenticatedRoleProfile(lookup, {
    uid: 'firebase-uid',
    email: 'ana@example.test',
    name: 'Ana'
  }, lookup.roles);

  assert.equal(merged.id, lookup.id);
  assert.equal(merged.uid, lookup.uid);
  assert.equal(merged.email, lookup.email);
  assert.equal(merged.name, lookup.name);
  assert.deepEqual(merged.roles, lookup.roles);
  assert.equal(merged.activeRoleOverride, null);
});

test('explicit profile role array is not merged with an unlisted lookup primary role', () => {
  const user = normalizeUserRecord({
    email: 'someone@example.test',
    role: 'coord_maestria',
    roles: ['coord_maestria']
  });
  const merged = mergeAuthenticatedRoleProfile(user, {
    roles: ['entrenador'],
    rolesUpdatedBy: 'authorized-admin'
  }, ['coord_maestria']);

  assert.deepEqual(merged.roles, ['entrenador']);
  assert.equal(merged.role, 'entrenador');
});
