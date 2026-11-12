import { spawn } from 'node:child_process';
import { GoogleAuth } from 'google-auth-library';

const child = spawn(
  'npx',
  [
    '--yes',
    'firebase-tools@latest',
    'deploy',
    '--config',
    'firebase.mailer.json',
    '--only',
    'functions:mailer',
    '--project',
    'centro-operativo-cpsl',
    '--non-interactive'
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] }
);

let output = '';
for (const stream of [child.stdout, child.stderr]) {
  stream.on('data', (chunk) => {
    output += chunk.toString();
    process.stdout.write(chunk);
  });
}

const code = await new Promise((resolve, reject) => {
  child.on('error', reject);
  child.on('close', resolve);
});

const clean = output.replace(/\u001b\[[0-9;]*m/g, '');
const cleanupOnly =
  code !== 0 &&
  clean.includes('Functions successfully deployed but could not set up cleanup policy') &&
  !clean.includes('Functions deploy had errors') &&
  /functions\[mailer:deliverContractMail\(us-central1\)\].*(Successful|Skipped)/.test(clean);

if (code !== 0 && !cleanupOnly) {
  process.exit(code || 1);
}

const client = await new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] }).getClient();
const fnUrl =
  'https://cloudfunctions.googleapis.com/v2/projects/centro-operativo-cpsl/locations/us-central1/functions/deliverContractMail';
const fn = (await client.request({ url: fnUrl })).data;

if (
  fn.state !== 'ACTIVE' ||
  fn.labels?.['firebase-functions-codebase'] !== 'mailer' ||
  fn.buildConfig?.entryPoint !== 'deliverContractMail' ||
  fn.eventTrigger?.eventType !== 'google.cloud.firestore.document.v1.created'
) {
  throw new Error('deliverContractMail is not ACTIVE with expected Firestore onDocumentCreated trigger');
}

console.log(
  JSON.stringify({
    function: 'deliverContractMail',
    state: fn.state,
    hasEventTrigger: Boolean(fn.eventTrigger)
  })
);
