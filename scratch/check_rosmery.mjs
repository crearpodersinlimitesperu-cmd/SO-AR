import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./centro-operativo-cpsl-65ad52160f45.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
  const q = await db.collection('users').where('email', '==', 'rouz1414@gmail.com').get();
  q.forEach(d => console.log(d.data()));
  process.exit(0);
}
run();