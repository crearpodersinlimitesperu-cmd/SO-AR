import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { pathToFileURL } from 'node:url';
import { assertEmulatorEnvironment, demoProject } from './local/environment.js';
import { preparationIds } from './recordModel.js';
import { phaseIds } from './local/guideContract.js';

// This module is never imported by the frontend; it contains synthetic emulator fixtures only.
export const fixturePassword = 'Synthetic-C2-only-2026!';
export const fixtureUsers = [
  { uid: 'fixture-x', email: 'x@example.test', emailVerified: true, approved: true },
  { uid: 'fixture-y', email: 'y@example.test', emailVerified: true, approved: true },
  { uid: 'fixture-unverified', email: 'unverified@example.test', emailVerified: false, approved: true },
  { uid: 'fixture-unapproved', email: 'unapproved@example.test', emailVerified: true, approved: false },
  { uid: 'fixture-mismatch', email: 'mismatch@example.test', emailVerified: true, approved: true },
  { uid: 'fixture-admin', email: 'sistemas@crearpsl.net', emailVerified: true, approved: false },
];
export const syntheticGuide = {
  version: 'c2-v1',
  title: 'Guía sintética C2 — NO es material operativo',
  notice: 'Fixture exclusivamente del emulador. No contiene la guía real ni horarios, misiones o datos de personas.',
  phases: phaseIds.map((id, index) => ({
    id, title: `Fase sintética ${index + 1}`, body: `Texto de prueba ${index + 1} obtenido del servidor tras aprobación.`,
  })),
  preparation: preparationIds.map((id, index) => ({ id, label: `Acuerdo sintético ${index + 1}` })),
  references: Array.from({ length: 4 }, (_, index) => ({
    id: String(index), title: `Consulta sintética ${index + 1}`, body: `Respuesta ficticia ${index + 1}.`,
  })),
};

export function fixtureRuntime() {
  assertEmulatorEnvironment(process.env);
  process.env.METADATA_SERVER_DETECTION = 'none';
  const app = initializeApp({ projectId: demoProject }, `c2-fixtures-${Date.now()}`);
  const auth = getAuth(app);
  const db = getFirestore(app);
  return { auth, db, close: async () => { await db.terminate(); await deleteApp(app); } };
}

export async function seedFixtures(runtime) {
  for (const fixture of fixtureUsers) {
    const { uid, approved, ...user } = fixture;
    try {
      await runtime.auth.getUser(uid);
      await runtime.auth.updateUser(uid, { ...user, password: fixturePassword, disabled: false });
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
      await runtime.auth.createUser({ uid, ...user, password: fixturePassword });
    }
    await runtime.db.doc(`members/${uid}`).set({
      email: uid === 'fixture-mismatch' ? 'different@example.test' : user.email,
      enabled: approved, updatedAt: FieldValue.serverTimestamp(),
    });
    await runtime.db.recursiveDelete(runtime.db.doc(`records/${uid}`));
  }
  await runtime.db.doc('content/c2-v1').set(syntheticGuide);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const runtime = fixtureRuntime();
  try {
    await seedFixtures(runtime);
    console.log(`Seeded ${fixtureUsers.length} synthetic Auth accounts and synthetic content/c2-v1 in ${demoProject} ONLY.`);
  } finally { await runtime.close(); }
}
