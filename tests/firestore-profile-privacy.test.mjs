import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where } from 'firebase/firestore';
import { privateDirectoryQuery, privateKpiQuery } from '../src/services/privacyQueries.js';

const local = /^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '');
test('private profiles, directories, notes, calls and KPIs enforce identity/sede in the emulator', { skip: !local }, async t => {
  const env = await initializeTestEnvironment({
    projectId: 'demo-profile-privacy',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') }
  });
  const profiles = {
    local: { uid: 'local', email: 'local@example.invalid', sede: 'Lima', role: 'coord_c1', roles: ['coord_c1'], appRole: 'coord_c1' },
    remote: { uid: 'remote', email: 'remote@example.invalid', sede: 'Quito', role: 'gerente', roles: ['gerente'], appRole: 'gerente' },
    coach: { uid: 'coach', email: 'coach@example.invalid', sede: 'Lima', role: 'entrenador', roles: ['entrenador'], appRole: 'entrenador' },
    director: { uid: 'director', email: 'director@example.invalid', role: 'direccion', roles: ['direccion'] }
  };
  const dbFor = id => env.authenticatedContext(id, { email: profiles[id]?.email || `${id}@example.invalid` }).firestore();
  const seed = async (path, data) => env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), path), data));
  try {
    for (const [id, profile] of Object.entries(profiles)) await seed(`users/${id}`, profile);
    for (const site of ['Lima', 'Quito']) {
      await seed(`managers_directory/${site}`, { sede: site, nombre: 'Same Name', email: `${site}@example.invalid` });
      await seed(`staff_directory/${site}`, { sede: site, email: `${site}@example.invalid` });
      await seed(`qt_directory/${site}`, { sede: site, email: `${site}@example.invalid` });
    }
    await seed('managers_directory/assigned', { sede: 'Quito', entrenadorId: 'coach', entrenadorEmail: profiles.coach.email });
    await seed('user_profiles/remote@example.invalid', { notes: [{ text: 'Private note' }], documents: [{ url: 'https://example.invalid/private' }] });
    await seed('notas_seguimiento/foreign', { autorEmail: profiles.remote.email, sede: 'Quito' });
    await seed('llamadas_grupales_historial/foreign', { registradoPorEmail: profiles.remote.email, sede: 'Quito' });
    await seed('kpi_reports/foreign', { userEmail: profiles.remote.email, userSede: 'Quito', submittedByEmail: profiles.remote.email });
    await seed('kpis_entrenadores_llamadas/_resumen', { managers: [{ sede: 'Quito' }] });
    await seed('user_kpi_targets/foreign', { userEmail: profiles.remote.email, userSede: 'Quito' });

    await t.test('a newly authenticated account cannot mint privileged roles, aliases or another profile', async () => {
      const db = dbFor('new');
      for (const field of ['role', 'roles', 'sede', 'isSuperAdmin', 'trainerNames', 'emails']) {
        await assertFails(setDoc(doc(db, 'users', 'new'), { uid: 'new', email: 'new@example.invalid', [field]: field === 'roles' ? ['direccion'] : 'direccion' }));
      }
      await assertFails(setDoc(doc(db, 'users', 'slug'), { uid: 'new', email: 'new@example.invalid' }));
      await assertSucceeds(setDoc(doc(db, 'users', 'new'), { uid: 'new', email: 'new@example.invalid', name: 'New' }));
      await assertFails(updateDoc(doc(db, 'users', 'new'), { email: profiles.director.email }));
      await assertFails(updateDoc(doc(db, 'users', 'new'), { cargo: 'direccion' }));
      await assertFails(updateDoc(doc(db, 'users', 'new'), { trainerNames: ['Victim'] }));
      await assertFails(updateDoc(doc(db, 'users', 'new'), { activeRoleOverride: 'direccion' }));
      await assertSucceeds(updateDoc(doc(db, 'users', 'new'), { photoURL: 'https://example.invalid/photo' }));
    });

    await t.test('site A cannot get or list site B records, and real scoped client queries succeed', async () => {
      const db = dbFor('local');
      await assertSucceeds(getDocs(query(collection(db, 'users'), where('sede', '==', 'Lima'))))
        .catch(error => { throw new Error(`sede-equality: ${error.message}`); });
      await assertSucceeds(getDocs(query(collection(db, 'users'), where('email', '==', profiles.local.email))))
        .catch(error => { throw new Error(`email-equality: ${error.message}`); });
      for (const [field, operator, value] of [
        ['sede', 'in', ['Lima', 'LIMA', 'lima', 'LIM']],
        ['email', 'in', [profiles.local.email]],
        ['emails', 'array-contains-any', [profiles.local.email]]
      ]) {
        await assertSucceeds(getDocs(query(collection(db, 'users'), where(field, operator, value))))
          .catch(error => { throw new Error(`${field}-${operator}: ${error.message}`); });
      }
      for (const collectionName of ['users', 'staff_directory', 'qt_directory', 'managers_directory']) {
        const foreignId = collectionName === 'users' ? 'remote' : 'Quito';
        await assertFails(getDoc(doc(db, collectionName, foreignId)));
        await assertFails(getDocs(collection(db, collectionName)));
        const scoped = await assertSucceeds(getDocs(privateDirectoryQuery(db, collectionName, profiles.local, { manager: collectionName === 'managers_directory' })))
          .catch(error => { throw new Error(`${collectionName}: ${error.message}`); });
        assert.ok(scoped.docs.every(d => d.data().sede === 'Lima' || d.id === 'local'));
      }
      await assertSucceeds(getDoc(doc(db, 'users', 'local')));
      await assertSucceeds(getDocs(query(collection(db, 'users'), where('email', '==', profiles.local.email))));
      await assertFails(getDocs(query(collection(db, 'users'), where('email', '==', profiles.remote.email))));
      await assertSucceeds(getDocs(privateKpiQuery(db, profiles.local)));
    });

    await t.test('private notes/documents, calls and aggregate trainer KPIs are not public to authenticated peers', async () => {
      const db = dbFor('local');
      for (const path of ['user_profiles/remote@example.invalid', 'notas_seguimiento/foreign', 'llamadas_grupales_historial/foreign', 'kpi_reports/foreign', 'user_kpi_targets/foreign', 'kpis_entrenadores_llamadas/_resumen']) {
        await assertFails(getDoc(doc(db, path))).catch(error => { throw new Error(`${path}: ${error.message}`); });
        await assertSucceeds(getDoc(doc(dbFor('director'), path)));
      }
      await assertSucceeds(getDoc(doc(dbFor('remote'), 'user_profiles', profiles.remote.email)));
      await assertSucceeds(getDoc(doc(dbFor('remote'), 'notas_seguimiento', 'foreign')));
      await assertFails(setDoc(doc(db, 'user_kpi_targets', 'forged'), { userEmail: profiles.remote.email, userSede: 'Quito' }));
      await assertSucceeds(setDoc(doc(db, 'user_kpi_targets', 'own'), { userEmail: profiles.local.email, userSede: 'Lima' }));
      await assertFails(updateDoc(doc(db, 'user_kpi_targets', 'own'), { userEmail: profiles.remote.email }));
    });

    await t.test('approved personal/corporate aliases retain access without allowing alias forgery', async () => {
      await seed('users/alias-owner', {
        email: 'alias@crearpsl.net', emails: ['alias@crearpsl.net', 'approved@example.invalid'],
        sede: 'Lima', role: 'entrenador', roles: ['entrenador']
      });
      await seed('staff_directory/alias-person', { email: 'alias@crearpsl.net' });
      await seed('staff_directory/no-identity', { sede: 'Quito' });
      for (const tokenEmail of ['alias@crearpsl.com', 'approved@example.invalid']) {
        const db = env.authenticatedContext('alias-owner', { email: tokenEmail }).firestore();
        await assertSucceeds(getDoc(doc(db, 'staff_directory', 'alias-person')));
        await assertSucceeds(getDocs(privateDirectoryQuery(db, 'staff_directory', {
          uid: 'alias-owner', email: 'alias@crearpsl.net', authEmail: tokenEmail, sede: 'Lima', roles: ['entrenador']
        })));
        await assertFails(getDoc(doc(db, 'staff_directory', 'no-identity')));
        await assertFails(updateDoc(doc(db, 'users', 'alias-owner'), { emails: [profiles.director.email] }));
      }
    });
    await t.test('travelling trainer retains assigned managers and can record calls but cannot change identities', async () => {
      const db = dbFor('coach');
      await assertSucceeds(getDoc(doc(db, 'managers_directory', 'assigned')));
      await assertFails(getDoc(doc(db, 'managers_directory', 'Quito')));
      await assertSucceeds(updateDoc(doc(db, 'managers_directory', 'assigned'), { llamadaFecha: '2026-11-04' }));
      await assertFails(updateDoc(doc(db, 'managers_directory', 'assigned'), { email: 'forged@example.invalid' }));
      await assertFails(setDoc(doc(db, 'managers_directory', 'forged'), { email: profiles.coach.email, rol: 'direccion' }));
    });

    await t.test('local operators cannot move a visible document into a foreign sede', async () => {
      const db = dbFor('local');
      await assertFails(updateDoc(doc(db, 'managers_directory', 'Lima'), { sede: 'Quito' }));
      await assertFails(updateDoc(doc(db, 'qt_directory', 'Lima'), { sede: 'Quito' }));
      await assertFails(setDoc(doc(db, 'staff_directory', 'fake'), { email: profiles.local.email, role: 'direccion' }));
      await assertSucceeds(getDocs(collection(dbFor('director'), 'managers_directory')));
    });
  } finally {
    await env.cleanup();
  }
});
