import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertAuthenticatedIdentity, selectAuthenticatedProfile } from '../src/utils/authIdentity.js';
import { bindPrivateSession, clearPrivateSession, privateViewKey } from '../src/utils/sessionPrivacy.js';
import { canReadDirectoryPerson, canReadPrivateProfile, canReadManager, canReadKpiReport } from '../src/utils/privacyScope.js';
import { isGlobalQTCoordinator, isMaestriaCoordinator, canAssignTrainer } from '../src/config/permissions.js';

const user = (id, sede = 'Lima', role = 'coord_c1') => ({
  uid: id, email: `${id}@example.invalid`, name: 'Same Name',
  sede, appRole: role, roles: [role]
});
const row = (id, data) => ({ id, data: () => data });
const storage = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
};

test('UID matching is exact, never a UID-shaped document belonging to someone else', () => {
  const mine = user('me');
  const foreign = row('A'.repeat(28), { email: mine.email, uid: 'other' });
  assert.throws(() => selectAuthenticatedProfile([foreign], mine, mine.email), /Identidad ambigua/);
  const own = row(mine.uid, { email: mine.email });
  assert.equal(selectAuthenticatedProfile([foreign, own], mine, mine.email), own);
  assert.throws(() => selectAuthenticatedProfile([
    row(mine.uid, { email: mine.email, uid: 'other' })
  ], mine, mine.email), /UID del perfil/);
  assert.throws(() => selectAuthenticatedProfile([
    row('slug1', { email: mine.email }), row('slug2', { emails: [mine.email] })
  ], mine, mine.email), /Identidad ambigua/);
});

test('an imported email array cannot promote X into the official profile of Y', () => {
  const owner = { email: 'owner@example.invalid' };
  const ordinary = { email: 'ordinary@example.invalid' };
  const find = email => email === owner.email ? owner : email === ordinary.email ? ordinary : null;
  assert.throws(() => assertAuthenticatedIdentity({ email: ordinary.email, emails: [owner.email] }, ordinary.email, find), /otra identidad/);
  assert.throws(() => assertAuthenticatedIdentity({ email: owner.email }, 'unknown@example.invalid', find), /otra identidad/);
  assert.doesNotThrow(() => assertAuthenticatedIdentity({ email: ordinary.email }, ordinary.email, find));
  assert.throws(() => assertAuthenticatedIdentity({ uid: 'foreign' }, ordinary.email, find, 'me'), /UID del perfil/);
});

test('sede A cannot see sede B, even when the target is a gerente or has the same name', () => {
  const viewer = user('local');
  const foreign = { ...user('remote', 'Quito', 'gerente'), rol: 'Gerente' };
  assert.equal(canReadDirectoryPerson(viewer, foreign), false);
  assert.equal(canReadManager(viewer, foreign), false);
  assert.equal(canReadPrivateProfile(viewer, foreign), false);
  assert.equal(canReadDirectoryPerson(viewer, user('colleague')), true);
  assert.equal(canReadManager(viewer, { sede: 'LIM' }), true);
  assert.equal(canReadDirectoryPerson(user('unscoped', 'Global'), user('other', 'Global')), false);
});

test('ordinary accounts see their own identity, not every person sharing a sede', () => {
  const viewer = user('me', 'Lima', 'miembro');
  assert.equal(canReadDirectoryPerson(viewer, user('other')), false);
  assert.equal(canReadManager(viewer, user('other')), false);
  assert.equal(canReadPrivateProfile(viewer, { email: viewer.email }), true);
  assert.equal(canReadKpiReport(viewer, { userEmail: 'other@example.invalid', userSede: 'Lima' }), false);
  assert.equal(canReadKpiReport(viewer, { userEmail: viewer.email }), true);
});

test('explicit travelling trainer assignments remain visible and conflicting identities fail closed', () => {
  const trainer = { ...user('coach', 'Lima', 'entrenador'), dbId: 'approved-directory-id' };
  assert.equal(canReadManager(trainer, { sede: 'Quito', entrenadorId: trainer.uid, entrenadorEmail: trainer.email }), true);
  assert.equal(canReadManager(trainer, { sede: 'Quito', entrenadorId: trainer.dbId, entrenadorEmail: trainer.email }), true);
  assert.equal(canReadManager(trainer, { sede: 'Quito', entrenadorId: 'foreign', entrenadorEmail: trainer.email }), false);
  assert.equal(canReadManager(trainer, { sede: 'Quito', entrenador: trainer.name }), false);
});

test('authorized directors, HR and local managers retain their actual scopes', () => {
  const target = user('foreign', 'Quito');
  const director = user('director', 'Global', 'direccion');
  assert.equal(canReadDirectoryPerson(director, target), true);
  assert.equal(canReadManager(director, target), true);
  assert.equal(canReadPrivateProfile(director, target), true);
  const hr = user('hr', 'Lima', 'talento_humano');
  assert.equal(canReadPrivateProfile(hr, target), true);
  const manager = user('manager', 'Lima', 'gerente');
  assert.equal(canReadKpiReport(manager, { userSede: 'Lima' }), true);
  assert.equal(canReadKpiReport(manager, { userSede: 'Quito' }), false);
});

test('email substrings and display names never grant coordination or global QT authority', () => {
  for (const email of ['linid.evil@example.invalid', 'xmaestria@example.invalid', 'cubillo@example.invalid', 'carlos.brunis@example.invalid', 'brunische66@evil.invalid']) {
    const viewer = { ...user('test', 'Lima', 'miembro'), email, name: 'Paul Sosa' };
    assert.equal(isGlobalQTCoordinator(viewer), false);
    assert.equal(isMaestriaCoordinator(viewer), false);
    assert.equal(canAssignTrainer(viewer), false);
  }
  assert.equal(isGlobalQTCoordinator({ email: 'carlos.brunis@crearpsl.net' }), true);
  assert.equal(isMaestriaCoordinator({ email: 'liliana.cubillo@crearpsl.net' }), true);
});

test('switching accounts clears tokens, simulation and legacy shared data but preserves harmless preferences', () => {
  const local = storage(), session = storage();
  bindPrivateSession('first', local, session);
  local.setItem('cpsl_llamados_data_v3', 'private-data');
  local.setItem('cpsl_qt_members_cache_v4', 'private-directory');
  local.setItem('cpsl_theme_mode', 'dark');
  local.setItem('cpsl_timeboxing_blocks_v3:first:email', 'first-account-only');
  for (const key of ['googleAccessToken', 'googleChatToken', 'cpsl_active_role', 'cpsl_simulated_target_email', 'cpsl_original_admin_email']) session.setItem(key, 'old');
  bindPrivateSession('second', local, session);
  assert.equal(local.getItem('cpsl_llamados_data_v3'), null);
  assert.equal(local.getItem('cpsl_qt_members_cache_v4'), null);
  assert.equal(local.getItem('cpsl_theme_mode'), 'dark');
  assert.equal(local.getItem('cpsl_timeboxing_blocks_v3:first:email'), 'first-account-only');
  for (const key of ['googleAccessToken', 'googleChatToken', 'cpsl_active_role', 'cpsl_simulated_target_email', 'cpsl_original_admin_email']) assert.equal(session.getItem(key), null);
  session.setItem('cpsl_active_role', 'gerente');
  bindPrivateSession('second', local, session);
  assert.equal(session.getItem('cpsl_active_role'), 'gerente', 'same-account reload preserves the valid preference');
  clearPrivateSession(local, session);
  assert.equal(session.getItem('cpsl_active_role'), null);
});

test('effective identity, role, sede and simulation each invalidate the mounted private view', () => {
  const viewer = user('me');
  for (const delta of [
    { uid: 'other' }, { email: 'other@example.invalid' }, { appRole: 'gerente' },
    { sede: 'Quito' }, { isSimulated: true }, { isRoleSimulationActive: true }, { roles: ['coord_c1', 'direccion'] },
    { roleSedes: { qt: 'Quito' } }, { emails: ['approved@example.invalid'] },
    { trainerDirectoryIds: ['assigned-id'] }, { trainerNames: ['Assigned Trainer'] },
    { isSuperAdmin: true }, { isDireccion: true }, { isGerente: true },
    { active: false }, { isActive: false }, { esActivo: false }, { rol: 'inactivo' }, { estado: 'inactivo' }
  ]) {
    assert.notEqual(privateViewKey(viewer), privateViewKey({ ...viewer, ...delta }));
  }
  const auth = readFileSync(new URL('../src/context/AuthContext.jsx', import.meta.url), 'utf8');
  assert.match(auth, /<Fragment key=\{privateViewKey\(currentUser\)\}>/);
  assert.doesNotMatch(auth, /setCurrentUser\(parsed\)/);
});

test('permission list ordering and cosmetic profile updates do not reset private drafts', () => {
  const viewer = {
    ...user('me'), roles: ['coord_c1', 'qt'],
    emails: ['one@example.invalid', 'two@example.invalid'],
    roleSedes: { coord_c1: 'Lima', qt: 'Quito' },
    trainerDirectoryIds: ['first-id', 'second-id']
  };
  assert.equal(privateViewKey(viewer), privateViewKey({
    ...viewer, roles: ['qt', 'coord_c1', 'qt'],
    emails: [...viewer.emails].reverse(),
    roleSedes: { qt: 'Quito', coord_c1: 'Lima' },
    trainerDirectoryIds: [...viewer.trainerDirectoryIds].reverse(),
    photoURL: 'https://example.invalid/new-photo', lastLoginAt: 'updated'
  }));
});

test('explicit participant signing survives session binding, but logout removes the flow', () => {
  const local = storage(), session = storage();
  session.setItem('cpsl_participant_flow', '1');
  bindPrivateSession('participant', local, session);
  assert.equal(session.getItem('cpsl_participant_flow'), '1');
  clearPrivateSession(local, session);
  assert.equal(session.getItem('cpsl_participant_flow'), null);
});
