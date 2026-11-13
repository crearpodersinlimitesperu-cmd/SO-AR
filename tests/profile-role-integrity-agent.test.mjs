import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateUserProfileIntegrity } from '../scripts/profileRoleIntegrityAgent.mjs';

test('restores degraded operativo role for CMJ while preserving all trainer roles and sede', () => {
  const res = evaluateUserProfileIntegrity('uid_mauricio', {
    email: 'mauricio.ramirez@crearpsl.net',
    name: 'Mauricio Ramirez Silva',
    role: 'operativo',
    activeRole: 'coord_maestria',
    roles: ['operativo', 'consolidado', 'coord_maestria', 'entrenador_llamadas', 'entrenador'],
    sede: 'Medellin',
    roleSedes: { coord_maestria: 'Medellin', entrenador_llamadas: 'Sede Global' },
    lastLoginAt: '2026-11-13T00:00:00Z'
  });

  assert.ok(res);
  assert.equal(res.patch.role, 'coord_maestria');
  assert.equal(res.patch.sede, 'Medellín');
  assert.equal(res.patch.roleSedes.coord_maestria, 'Medellín');
  assert.equal(res.patch.roleSedes.entrenador_llamadas, 'Sede Global');
  assert.equal(res.patch.lastLoginAt, undefined);
});

test('adds coord_maestria to executive CMJ (e.g. gerente) without overwriting primary executive role', () => {
  const res = evaluateUserProfileIntegrity('uid_josue', {
    email: 'josue.vera@crearpsl.net',
    name: 'Josue Vera',
    role: 'gerente',
    activeRole: 'gerente',
    roles: ['gerente', 'entrenador', 'entrenador_llamadas', 'consolidado'],
    sede: 'Guayaquil'
  });

  assert.ok(res);
  assert.equal(res.patch.role, undefined);
  assert.ok(res.patch.roles.includes('gerente'));
  assert.ok(res.patch.roles.includes('coord_maestria'));
  assert.ok(res.patch.roles.includes('entrenador'));
});

test('restores degraded role from official catalog (legal, marketing, tecnico_sst) and aligns activeRole', () => {
  const inputRoles = ['consolidado', 'colaborador', 'legal'];
  const res = evaluateUserProfileIntegrity('legal', {
    email: 'legal@crearpsl.net',
    name: 'Pablo Francisco Mendieta',
    role: 'operativo',
    activeRole: 'operativo',
    roles: inputRoles,
    sede: 'global'
  });

  assert.ok(res);
  assert.equal(res.patch.role, 'legal');
  assert.equal(res.patch.activeRole, 'legal');
  assert.equal(res.patch.sede, 'Global');
  const finalRoles = res.patch.roles || inputRoles;
  assert.ok(finalRoles.includes('legal'));
  assert.ok(finalRoles.includes('consolidado'));
});

test('skips inactive or archived_merged profiles without modifying anything', () => {
  const archived = evaluateUserProfileIntegrity('legacy_id', {
    email: 'mauricio.ramirez@crearpsl.net',
    role: 'operativo',
    status: 'archived_merged'
  });
  const inactive = evaluateUserProfileIntegrity('inactive_id', {
    email: 'erika.gavilanez@crearpsl.net',
    role: 'operativo',
    isActive: false
  });

  assert.equal(archived, null);
  assert.equal(inactive, null);
});

test('returns null when profile is 100% healthy and idempotent', () => {
  const healthy = evaluateUserProfileIntegrity('uid_ok', {
    email: 'mauricio.ramirez@crearpsl.net',
    role: 'coord_maestria',
    activeRole: 'coord_maestria',
    activeRoleOverride: 'coord_maestria',
    roles: ['coord_maestria', 'entrenador_llamadas', 'entrenador', 'operativo', 'consolidado'],
    sede: 'Medellín',
    roleSedes: { coord_maestria: 'Medellín', entrenador_llamadas: 'Sede Global' }
  });

  assert.equal(healthy, null);
});
