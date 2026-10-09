// Run ONLY against the local Firestore emulator. No production SDK credentials.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(process.env.IMO_TEST_DEPENDENCIES || import.meta.url);
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, runTransaction, serverTimestamp, Timestamp, query, collectionGroup } = require('firebase/firestore');
if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Emulator required; refusing production.');
const env = await initializeTestEnvironment({ projectId: 'demo-imo', firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') } });
const staff = env.authenticatedContext('manager', { email: 'jose.sanchez@crearpsl.net', email_verified: true }).firestore();
const anon = env.unauthenticatedContext().firestore();
const other = env.authenticatedContext('stranger', { email: 'stranger@example.test' }).firestore();
const cid = 'AbCdEf0123456789GhIj', mid = 'mission-test', eid = 'enrollee-test';
const profilePath = `imo_campaigns/${cid}/profiles/${mid}`;
try {
  const batch = writeBatch(staff);
  batch.set(doc(staff, 'imo_campaign_keys', 'lima_31_2026-10-16'), { campaignId: cid, createdBy: 'manager', createdAt: serverTimestamp() });
  batch.set(doc(staff, 'imo_campaigns', cid), { schemaVersion: 2, sede: 'Lima', targetTeam: 31, c1Date: '2026-10-16', status: 'active', createdAt: serverTimestamp(), createdBy: 'manager', count: 1 });
  const enrolados = [{ id: eid, nombre: 'ENROLADO SINTETICO', coordinadora_nombre: 'COORDINACION' }];
  const data = { schemaVersion: 2, campaignId: cid, imoNombre: 'IMO SINTETICO', originTeam: 30, targetTeam: 31, sede: 'Lima', c1Date: '2026-10-16', enroladoIds: [eid], enrolados };
  batch.set(doc(staff, 'imo_missions', mid), { ...data, createdBy: 'manager', createdAt: serverTimestamp() });
  batch.set(doc(staff, profilePath), data);
  await assertSucceeds(batch.commit());
  await assertSucceeds(getDoc(doc(anon, 'imo_campaigns', cid)));
  await assertSucceeds(getDocs(collection(anon, `imo_campaigns/${cid}/profiles`)));
  await assertFails(getDocs(collection(anon, 'imo_campaigns')));
  await assertFails(getDocs(collection(anon, 'imo_missions')));
  await assertFails(getDoc(doc(other, 'imo_missions', mid)));
  await assertFails(updateDoc(doc(anon, profilePath), { imoNombre: 'IMPOSTOR' }));
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'imo_campaigns', cid, 'profiles', 'timer-forged'), { ...data, imoNombre: 'IMO TIMER TEST' });
  });
  const forgedWindow = doc(anon, `imo_campaigns/${cid}/profiles/timer-forged/imo_progress/window`);
  await assertFails(setDoc(forgedWindow, { campaignId: cid, openedAt: Timestamp.fromMillis(Date.now() + 7 * 60 * 60 * 1000) }));
  const windowState = doc(anon, `${profilePath}/imo_progress/window`);
  await assertSucceeds(setDoc(windowState, { campaignId: cid, openedAt: serverTimestamp() }));
  assert.equal((await getDoc(windowState)).data().openedAt instanceof Timestamp, true);
  await assertSucceeds(getDoc(doc(staff, `${profilePath}/imo_progress/window`)));
  await assertFails(updateDoc(windowState, { openedAt: serverTimestamp() }));
  await assertFails(deleteDoc(windowState));
  const state = doc(anon, `${profilePath}/imo_confirmations`, eid);
  const sessionId = '00000000-0000-4000-8000-000000000000';
  console.log('IMO rules: rejecting a confirmation without its paired event');
  await assertFails(setDoc(state, { contacto: true, asistencia: true, reportedName: 'IMO SINTETICO', sessionId, updatedAt: serverTimestamp(), eventId: 'missing' }));
  async function save(field, value, eventId, eventBeforeOverride) {
    console.log(`IMO rules: transaction read ${eventId}`);
    return runTransaction(anon, async tx => {
      const old = await tx.get(state);
      console.log(`IMO rules: transaction writes ${eventId}`);
      const before = old.exists() ? { contacto: old.data().contacto, asistencia: old.data().asistencia } : { contacto: false, asistencia: false };
      const after = { ...before, [field]: value };
      tx.set(state, { ...after, campaignId: cid, reportedName: 'IMO SINTETICO', sessionId, updatedAt: serverTimestamp(), eventId });
      tx.set(doc(anon, `${profilePath}/imo_events`, eventId), { campaignId: cid, enroladoId: eid, before: eventBeforeOverride || before, after, reportedName: 'IMO SINTETICO', sessionId, identity: 'self-selected', at: serverTimestamp(), source: 'mision-imo-v2' });
    });
  }
  console.log('IMO rules: accepting the first atomic confirmation and event');
  await assertSucceeds(save('contacto', true, 'event-1'));
  await assertSucceeds(save('asistencia', true, 'event-2', { contacto: true, asistencia: true }));
  const restored = (await getDoc(state)).data();
  assert.equal(restored.contacto, true); assert.equal(restored.asistencia, true);
  assert.equal((await getDocs(collection(staff, `${profilePath}/imo_events`))).size, 2);
  await assertSucceeds(getDocs(query(collectionGroup(staff, 'imo_confirmations'))));
  await assertSucceeds(getDocs(query(collectionGroup(staff, 'imo_progress'))));
  await assertFails(getDocs(query(collectionGroup(anon, 'imo_confirmations'))));
  await assertFails(getDocs(query(collectionGroup(anon, 'imo_progress'))));
  await assertFails(deleteDoc(doc(staff, `${profilePath}/imo_events/event-1`)));
  await assertFails(updateDoc(doc(anon, `${profilePath}/imo_events/event-1`), { source: 'changed' }));
  await env.withSecurityRulesDisabled(async ctx => {
    await updateDoc(doc(ctx.firestore(), `${profilePath}/imo_progress/window`), { openedAt: Timestamp.fromMillis(Date.now() - (8 * 60 * 60 + 30 * 60 + 1) * 1000) });
  });
  await assertFails(save('contacto', false, 'event-3'));
  await assertSucceeds(updateDoc(doc(staff, 'imo_campaigns', cid), { status: 'closed' }));
  await assertFails(save('contacto', false, 'event-3'));
  await assertFails(getDoc(doc(anon, profilePath)));
  // Roles de la ruta /monitor-imos: coordinadores leen y generan; otros roles no.
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'users', 'coord'), { role: 'coord_c1', sede: 'Quito' });
    await setDoc(doc(ctx.firestore(), 'users', 'capitan'), { role: 'capitan', sede: 'Quito' });
    await setDoc(doc(ctx.firestore(), 'imo_missions', 'legacy-v1'), { imoNombre: 'IMO V1', equipo: 'EQUIPO 130', sede: 'Quito', enrolados: [] });
  });
  const coord = env.authenticatedContext('coord', { email: 'coord@crearpsl.net' }).firestore();
  const capitan = env.authenticatedContext('capitan', { email: 'capitan@crearpsl.net' }).firestore();
  await assertSucceeds(getDocs(collection(coord, 'imo_missions')));
  await assertSucceeds(getDocs(query(collectionGroup(coord, 'imo_confirmations'))));
  await assertFails(getDocs(collection(capitan, 'imo_missions')));
  await assertFails(updateDoc(doc(coord, 'imo_missions', 'legacy-v1'), { imoNombre: 'CAMBIO' }));
  async function generate(db, uid, size) {
    const ref = doc(collection(db, 'imo_campaigns'));
    await runTransaction(db, async tx => {
      const registry = doc(db, 'imo_campaign_keys', `quito_130_2026-10-30_${uid}_${size}`);
      await tx.get(registry);
      tx.set(registry, { campaignId: ref.id, createdBy: uid, createdAt: serverTimestamp() });
      tx.set(ref, { schemaVersion: 2, sede: 'Quito', targetTeam: 130, c1Date: '2026-10-30', status: 'active', createdAt: serverTimestamp(), createdBy: uid, count: size });
      for (let i = 0; i < size; i++) {
        const mission = doc(collection(db, 'imo_missions'));
        const enrolados = [{ id: `e${i}`, nombre: `ENROLADO ${i}`, coordinadora_nombre: 'C1', coordinadora_telefono: '' }];
        const data = { schemaVersion: 2, campaignId: ref.id, imoNombre: `IMO ${i}`, originTeam: i % 2 ? 0 : 129, targetTeam: 130, sede: 'Quito', c1Date: '2026-10-30', enroladoIds: [`e${i}`], enrolados };
        tx.set(mission, { ...data, equipo: 'EQUIPO 130 - QUITO C1', sourceMissionId: `src${i}`, createdBy: uid, createdByEmail: 'x@crearpsl.net', createdAt: serverTimestamp(), lastUpdated: serverTimestamp(), checks: {} });
        tx.set(doc(db, 'imo_campaigns', ref.id, 'profiles', mission.id), data);
      }
    });
    return ref.id;
  }
  const big = await assertSucceeds(generate(coord, 'coord', 200));
  assert.equal((await getDocs(collection(anon, `imo_campaigns/${big}/profiles`))).size, 200);
  await assertFails(generate(capitan, 'capitan', 1));
  await assertFails(generate(coord, 'coord', 201));
  console.log('PASS: coordinadores del Monitor generan campañas de hasta 200 IMOs; otros roles denegados.');
  if (process.env.IMO_UI_PREVIEW === '1') await updateDoc(doc(staff, 'imo_campaigns', cid), { status: 'active' });
  for (const path of ['imo_system/control', 'imo_private_challenges/test', 'imo_private_deliveries/test', 'imo_private_sessions/test', 'imo_private_limits/test', 'imo_private_snapshots/test/identities/test', 'imo_private_snapshots/test/enrollees/test']) {
    for (const client of [anon, other, staff]) {
      await assertFails(getDoc(doc(client, path)));
      await assertFails(setDoc(doc(client, path), { injected: true }));
    }
  }
  const privateWindowPath = `imo_private_mission_windows/${cid}/profiles/window-test`;
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), privateWindowPath), { campaignId: cid, imoId: 'private-id', imoNombre: 'IMO SINTETICO', openedAt: Timestamp.fromMillis(Date.now()) });
  });
  await assertSucceeds(getDoc(doc(staff, privateWindowPath)));
  await assertFails(getDoc(doc(anon, privateWindowPath)));
  await assertSucceeds(getDocs(collection(staff, `imo_private_mission_windows/${cid}/profiles`)));
  await assertFails(getDocs(collection(anon, `imo_private_mission_windows/${cid}/profiles`)));
  await assertFails(setDoc(doc(staff, `imo_private_mission_windows/${cid}/profiles/forged`), { campaignId: cid, openedAt: serverTimestamp() }));
  console.log('PASS: private verification documents denied to all browser clients.');
  console.log('PASS: generated campaign, shared access, restore, atomic history, forbidden reads/writes, closed campaign.');
} finally { await env.cleanup(); }
