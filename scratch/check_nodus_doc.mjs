import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  const serviceAccount = JSON.parse(readFileSync(join(__dirname, '..', 'firebase-service-account.json'), 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {
  process.exit(1);
}

const db = admin.firestore();
async function run() {
  const docSnap = await db.collection('nodus_coordinadores_c1c2').doc('latest').get();
  console.log(JSON.stringify(docSnap.data(), null, 2));
}
run().then(() => process.exit(0));
