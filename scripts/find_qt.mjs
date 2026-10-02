import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';

const CREDENTIALS_PATH = './centro-operativo-cpsl-65ad52160f45.json';
const serviceAccount = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  snapshot.forEach(doc => {
    const data = doc.data();
    const name = (data.name || data.displayName || '').toUpperCase();
    if (name.includes('ROSSMERY') || name.includes('OCHOA') || name.includes('GINA') || name.includes('CARDENAS')) {
      console.log(`FOUND: ${doc.id} - ${name} - ${data.email} - Role: ${data.appRole || data.role}`);
    }
  });
}

run().catch(console.error);
