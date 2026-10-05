// Run ONLY against the local Firestore emulator. No production SDK credentials.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(process.env.IMO_TEST_DEPENDENCIES || import.meta.url);
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, runTransaction, serverTimestamp, query, collectionGroup } = require('firebase/firestore');
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
  const state = doc(anon, `${profilePath}/imo_confirmations`, eid);
  const sessionId = '00000000-0000-4000-8000-000000000000';
  await assertFails(setDoc(state, { contacto: true, asistencia: true, reportedName: 'IMO SINTETICO', sessionId, updatedAt: serverTimestamp(), eventId: 'missing' }));
  async function save(field, value, eventId) {
    return runTransaction(anon, async tx => {
      const old = await tx.get(state);
      const before = old.exists() ? { contacto: old.data().contacto, asistencia: old.data().asistencia } : { contacto: false, asistencia: false };
      const after = { ...before, [field]: value };
      tx.set(state, { ...after, reportedName: 'IMO SINTETICO', sessionId, updatedAt: serverTimestamp(), eventId });
      tx.set(doc(anon, `${profilePath}/imo_events`, eventId), { enroladoId: eid, before, after, reportedName: 'IMO SINTETICO', sessionId, identity: 'self-selected', at: serverTimestamp(), source: 'mision-imo-v2' });
    });
  }
  await assertSucceeds(save('contacto', true, 'event-1'));
  await assertSucceeds(save('asistencia', true, 'event-2'));
  const restored = (await getDoc(state)).data();
  assert.equal(restored.contacto, true); assert.equal(restored.asistencia, true);
  assert.equal((await getDocs(collection(staff, `${profilePath}/imo_events`))).size, 2);
  await assertSucceeds(getDocs(query(collectionGroup(staff, 'imo_confirmations'))));
  await assertFails(getDocs(query(collectionGroup(anon, 'imo_confirmations'))));
  await assertFails(deleteDoc(doc(staff, `${profilePath}/imo_events/event-1`)));
  await assertFails(updateDoc(doc(anon, `${profilePath}/imo_events/event-1`), { source: 'changed' }));
  await assertSucceeds(updateDoc(doc(staff, 'imo_campaigns', cid), { status: 'closed' }));
  await assertFails(save('contacto', false, 'event-3'));
  await assertFails(getDoc(doc(anon, profilePath)));
  if (process.env.IMO_UI_PREVIEW === '1') await updateDoc(doc(staff, 'imo_campaigns', cid), { status: 'active' });
  console.log('PASS: generated campaign, shared access, restore, atomic history, forbidden reads/writes, closed campaign.');
} finally { await env.cleanup(); }
