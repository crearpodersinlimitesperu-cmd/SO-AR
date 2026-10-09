import assert from 'node:assert/strict';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'node:module';

const scopePolicy = createRequire(import.meta.url)('../functions/directoryScope.js');
const projectId = 'centro-operativo-cpsl';
initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();
const auth = getAuth();
const stage = process.argv[2] || 'profiles';
assert.ok(['profiles', 'backend', 'rules'].includes(stage), 'Unknown verification stage');
assert.ok(process.env.VITE_FIREBASE_API_KEY, 'VITE_FIREBASE_API_KEY is required');

// Logs contain counts only. Never print profiles, emails, tokens or credentials.
const profiles = await db.collection('users').limit(scopePolicy.MAX_DIRECTORY_DOCS + 1).get();
assert.ok(profiles.size <= scopePolicy.MAX_DIRECTORY_DOCS, 'Directory exceeds supported size');
const byId = new Map(profiles.docs.map(doc => [doc.id, doc.data()]));
const callers = [];
let pageToken;
let registered = 0;
let unconfigured = 0;
let unverified = 0;
do {
  const page = await auth.listUsers(1000, pageToken);
  for (const user of page.users) {
    const profile = byId.get(user.uid);
    if (user.disabled || !profile || scopePolicy.isInactive(profile)) continue;
    registered++;
    if (!user.emailVerified) { unverified++; continue; }
    const scope = scopePolicy.resolveScope(profile, user.email);
    const roles = [profile.role, profile.appRole, ...(Array.isArray(profile.roles) ? profile.roles : [])].filter(Boolean);
    if (!roles.length || (scope.level !== 'global' && !scope.sede)) {
      unconfigured++;
      continue;
    }
    if (!callers.some(caller => caller.scope.level === scope.level &&
        caller.scope.crossSedeRoster === scope.crossSedeRoster &&
        scopePolicy.canonicalSede(caller.scope.sede) === scopePolicy.canonicalSede(scope.sede))) {
      callers.push({ user, profile, scope });
    }
  }
  pageToken = page.pageToken;
} while (pageToken);
console.log(JSON.stringify({ stage, documents: profiles.size, registered, unconfigured, unverified, cohorts: callers.length }));
assert.equal(unconfigured, 0, 'C-02 blocked: active UID profiles lack administered roles/sede; login only writes metadata. No rules deployed.');
assert.equal(unverified, 0, 'C-02 blocked: active registered accounts have unverified emails. No rules deployed.');
assert.ok(callers.some(c => c.scope.level === 'global'), 'No verified global cohort available');
assert.ok(callers.some(c => c.scope.level === 'sede' && !c.scope.crossSedeRoster), 'No verified ordinary sede cohort available');
if (stage === 'profiles') process.exit(0);

async function request(url, body, token) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000)
  });
  const data = await response.json();
  return { status: response.status, data };
}

const endpoint = name => `https://us-central1-${projectId}.cloudfunctions.net/${name}`;
for (const name of ['getCompanyDirectory', 'getRoleRecipients']) {
  const response = await request(endpoint(name), { data: { roles: ['gerente'] } });
  assert.equal(response.status, 401, `${name}: anonymous caller was not rejected`);
}
for (const { user, scope } of callers) {
  const customToken = await auth.createCustomToken(user.uid);
  const login = await request(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.VITE_FIREBASE_API_KEY}`,
    { token: customToken, returnSecureToken: true });
  assert.equal(login.status, 200, 'Unable to authenticate verification cohort');
  const token = login.data.idToken;
  const directory = await request(endpoint('getCompanyDirectory'), { data: {} }, token);
  assert.equal(directory.status, 200, 'Authenticated directory callable failed');
  assert.equal(directory.data.result.scope, scope.level, 'Unexpected directory scope');
  assert.equal(directory.data.result.canSeeCrossSede, scope.level === 'global' || scope.crossSedeRoster);
  for (const record of directory.data.result.users) {
    assert.ok(!('phone' in record) && !('cumpleanos' in record) && !('statusHistory' in record), 'Private fields escaped minimal roster');
    if (!scope.crossSedeRoster) assert.ok(scopePolicy.sameSede(record.sede, scope.sede), 'Foreign sede escaped caller scope');
  }
  const recipients = await request(endpoint('getRoleRecipients'), { data: { roles: ['gerente', 'direccion'] } }, token);
  assert.equal(recipients.status, 200, 'Legitimate excellence leadership lookup failed');
  const arbitrary = await request(endpoint('getRoleRecipients'), { data: { roles: ['unsupported'] } }, token);
  assert.equal(arbitrary.status, 400, 'Unsupported roles were not rejected');
  if (stage === 'rules') {
    const runQuery = structuredQuery => request(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
      { structuredQuery }, token);
    const ownQuery = await runQuery({
      from: [{ collectionId: 'users' }],
      where: { fieldFilter: { field: { fieldPath: 'email' }, op: 'EQUAL', value: { stringValue: user.email } } }
    });
    assert.equal(ownQuery.status, 200, 'Own-email login query failed');
    if (scope.level === 'sede') {
      const sedeQuery = await runQuery({
        from: [{ collectionId: 'users' }],
        where: { fieldFilter: { field: { fieldPath: 'sede' }, op: 'IN',
          value: { arrayValue: { values: scopePolicy.sedeAliasList(scope.sede).map(stringValue => ({ stringValue })) } } } }
      });
      assert.equal(sedeQuery.status, 200, 'Legitimate sede alias IN query failed');
    }
    const globalQuery = await runQuery({ from: [{ collectionId: 'users' }], limit: 1 });
    assert.equal(globalQuery.status, scope.level === 'global' ? 200 : 403, 'Global listing policy mismatch');
  }
}
console.log(JSON.stringify({ stage, verifiedCohorts: callers.length, result: 'passed' }));
