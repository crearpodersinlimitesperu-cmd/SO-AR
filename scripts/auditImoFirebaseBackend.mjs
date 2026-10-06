// Read-only deployment readiness audit. Never prints credentials or participant data.
import { GoogleAuth } from 'google-auth-library';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');
const project = 'centro-operativo-cpsl';
if (credentials.project_id !== project) throw new Error('Unexpected Firebase project');
const auth = new GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
const client = await auth.getClient();
async function inspect(label, url, data, projectResult) {
  try {
    const response = await client.request({ url, method: data ? 'POST' : 'GET', ...(data ? { data } : {}) });
    console.log(JSON.stringify({ check: label, result: projectResult(response.data) }));
  } catch (error) {
    console.log(JSON.stringify({ check: label, errorCode: error.response?.status || 'unavailable', reason: error.response?.data?.error?.status || 'request_failed' }));
  }
}
await inspect('functions', `https://cloudfunctions.googleapis.com/v2/projects/${project}/locations/-/functions`, null,
  value => (value.functions || []).map(f => ({ name: f.name.split('/').pop(), state: f.state, runtime: f.buildConfig?.runtime, codebase: f.labels?.['firebase-functions-codebase'], stateMessages: (f.stateMessages || []).map(m => ({severity: m.severity, type: m.type})) })));
await inspect('deploymentPermissions', `https://cloudresourcemanager.googleapis.com/v1/projects/${project}:testIamPermissions`, { permissions: ['cloudfunctions.functions.create','cloudfunctions.functions.update','cloudfunctions.functions.get','cloudfunctions.functions.list','cloudbuild.builds.create','serviceusage.services.use','serviceusage.services.enable','secretmanager.secrets.create','secretmanager.versions.add'] }, value => value.permissions || []);
await inspect('runtimeActAs', `https://iam.googleapis.com/v1/projects/${project}/serviceAccounts/122588918051-compute@developer.gserviceaccount.com:testIamPermissions`, { permissions: ['iam.serviceAccounts.actAs'] }, value => value.permissions || []);
await inspect('secretNames', `https://secretmanager.googleapis.com/v1/projects/${project}/secrets`, null,
  value => (value.secrets || []).map(s => s.name.split('/').pop()));
const db = getFirestore(initializeApp({ credential: cert(credentials) }));
for (const name of ['imo_campaigns', 'imo_identities_private', 'imo_enrollees_private']) {
  try { console.log(JSON.stringify({ check: name, count: (await db.collection(name).count().get()).data().count })); }
  catch { console.log(JSON.stringify({check:name,error:'count_unavailable'})); }
}
for (const name of ['nodus_coordinadores_c1c2', 'nodus_futuros_imposibles']) {
  try {
    const snap = await db.collection(name).doc('latest').get();
    const value = snap.data() || {};
    console.log(JSON.stringify({check:name,exists:snap.exists,fields:Object.keys(value), arrays:Object.fromEntries(Object.entries(value).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,{count:v.length,firstRowFields:v[0] && typeof v[0]==='object'?Object.keys(v[0]):[]}]))}));
  } catch { console.log(JSON.stringify({check:name,error:'schema_unavailable'})); }
}
