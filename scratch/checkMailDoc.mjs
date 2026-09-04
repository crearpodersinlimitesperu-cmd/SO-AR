import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';

const CREDENTIALS_PATH = './centro-operativo-cpsl-65ad52160f45.json';

const serviceAccount = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function check() {
  const doc = await db.collection('mail').doc('kpzSWPHgVenA5JlB5R12').get();
  console.log(JSON.stringify(doc.data(), null, 2));
}
check().catch(console.error);
