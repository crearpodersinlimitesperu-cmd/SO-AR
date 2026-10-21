import test, { before, after } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-trainer-coherence',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});
after(async () => { await env?.cleanup(); });
const entry = actorEmail => ({
  action: 'repair_trainer_label', managerDocId: 'm1', trainerDocId: 'u1',
  before: 'Old', after: 'Canonical', actorEmail, occurredAt: serverTimestamp(),
});
test('coherence log requires explicit administrator, correct actor and timestamp; remains immutable', async () => {
  const admin = env.authenticatedContext('admin', { email: 'paul.sosa@crearpsl.net' }).firestore();
  const trainer = env.authenticatedContext('coach', { email: 'coach@example.test' }).firestore();
  await assertFails(setDoc(doc(trainer, 'trainer_coherence_log', 'denied'), entry('coach@example.test')));
  await assertFails(getDoc(doc(trainer, 'trainer_coherence_log', 'allowed')));
  await assertFails(setDoc(doc(admin, 'trainer_coherence_log', 'spoofed'), entry('coach@example.test')));
  await assertFails(setDoc(doc(admin, 'trainer_coherence_log', 'extra'), { ...entry('paul.sosa@crearpsl.net'), extra: true }));
  await assertSucceeds(setDoc(doc(admin, 'trainer_coherence_log', 'allowed'), entry('paul.sosa@crearpsl.net')));
  await assertSucceeds(getDoc(doc(admin, 'trainer_coherence_log', 'allowed')));
  await assertFails(updateDoc(doc(admin, 'trainer_coherence_log', 'allowed'), { after: 'Changed' }));
  await assertFails(deleteDoc(doc(admin, 'trainer_coherence_log', 'allowed')));
});
