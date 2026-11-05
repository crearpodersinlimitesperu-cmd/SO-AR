import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';

test('candidate private rules: UID isolation, approval, revocation and atomic immutable history', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST && 'Requires a local Firestore emulator and Java runtime; does not contact production.',
}, async t => {
  const env = await initializeTestEnvironment({
    projectId: 'demo-aliados-c2',
    firestore: { rules: readFileSync('prototypes/aliados-c2/private/firestore.rules', 'utf8') },
  });
  try {
    await env.clearFirestore();
    const user = (uid, email, verified = true) => env.authenticatedContext(uid, {
      email, email_verified: verified,
    }).firestore();
    const admin = user('admin', 'sistemas@crearpsl.net');
    const alice = user('alice', 'alice@example.test');
    const bob = user('bob', 'bob@example.test');
    const approve = (uid, email) => setDoc(doc(admin, 'members', uid), {
      email, enabled: true, updatedAt: serverTimestamp(),
    });
    await assertSucceeds(approve('alice', 'alice@example.test'));
    await assertSucceeds(approve('bob', 'bob@example.test'));
    await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'content', 'c2-v1'), {
      title: 'Synthetic private guide, not operational content',
    }));

    const commit = (db, uid, id, completed, previousRevision, kind = 'check', target = 'tecnica') => {
      const batch = writeBatch(db);
      batch.set(doc(db, 'records', uid), {
        uid, completed, revision: previousRevision + 1, lastEventId: id, updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'records', uid, 'events', id), {
        uid, completed, revision: previousRevision + 1, previousRevision, kind, target, createdAt: serverTimestamp(),
      });
      return batch.commit();
    };

    await t.test('only designated verified administrator can approve; self-approval denied', async () => {
      await assertFails(setDoc(doc(user('other-admin', 'other@crearpsl.net'), 'members', 'outsider'), {
        email: 'outsider@example.test', enabled: true, updatedAt: serverTimestamp(),
      }));
      await assertSucceeds(getDoc(doc(admin, 'members', 'alice')));
    });
    await t.test('unverified, unapproved and mismatched identities cannot read private content', async () => {
      for (const db of [
        env.unauthenticatedContext().firestore(),
        user('alice', 'alice@example.test', false),
        user('outsider', 'outsider@example.test'),
        user('alice', 'bob@example.test'),
      ]) await assertFails(getDoc(doc(db, 'content', 'c2-v1')));
      await assertSucceeds(getDoc(doc(alice, 'content', 'c2-v1')));
      await assertFails(setDoc(doc(alice, 'members', 'alice'), {
        email: 'alice@example.test', enabled: true, updatedAt: serverTimestamp(),
      }));
      await assertFails(setDoc(doc(user('fake-admin', 'sistemas@crearpsl.net', false), 'members', 'outsider'), {
        email: 'outsider@example.test', enabled: true, updatedAt: serverTimestamp(),
      }));
    });
    await t.test('state and event must commit together; history cannot be edited or deleted', async () => {
      const eventId = 'event00000000000000001';
      await assertFails(setDoc(doc(alice, 'records', 'alice'), {
        uid: 'alice', completed: ['tecnica'], revision: 1, lastEventId: eventId, updatedAt: serverTimestamp(),
      }));
      await assertSucceeds(commit(alice, 'alice', eventId, ['tecnica'], 0));
      await assertFails(updateDoc(doc(alice, 'records', 'alice', 'events', eventId), { target: 'espacio' }));
      await assertFails(deleteDoc(doc(alice, 'records', 'alice', 'events', eventId)));
      assert.equal((await getDoc(doc(alice, 'records', 'alice'))).data().revision, 1);
      await assertFails(commit(alice, 'alice', 'event00000000000000002', ['espacio'], 1, 'check', 'espacio'));
      await assertSucceeds(commit(alice, 'alice', 'event00000000000000003', ['tecnica', 'espacio'], 1, 'check', 'espacio'));
      await assertFails(commit(alice, 'alice', 'event00000000000000004', [], 1, 'reset', 'preparation'));
    });
    await t.test('switching to another UID does not grant access to prior account state/history', async () => {
      await assertFails(getDoc(doc(bob, 'records', 'alice')));
      await assertFails(getDoc(doc(bob, 'records', 'alice', 'events', 'event00000000000000001')));
      await assertFails(commit(bob, 'alice', 'event00000000000000005', [], 2, 'reset', 'preparation'));
      await assertSucceeds(commit(bob, 'bob', 'event00000000000000006', ['tecnica'], 0));
      await assertFails(getDoc(doc(alice, 'records', 'bob')));
    });
    await t.test('revocation stops future content reads and writes', async () => {
      await assertSucceeds(updateDoc(doc(admin, 'members', 'alice'), {
        enabled: false, updatedAt: serverTimestamp(),
      }));
      await assertFails(getDoc(doc(alice, 'content', 'c2-v1')));
      await assertFails(getDoc(doc(alice, 'records', 'alice')));
      await assertFails(commit(alice, 'alice', 'event00000000000000007', [], 2, 'reset', 'preparation'));
    });
  } finally {
    await env.cleanup();
  }
});
