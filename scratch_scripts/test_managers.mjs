import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
  const mSnap = await db.collection('managers_directory').get();
  console.log('Managers count:', mSnap.size);
  if (mSnap.size > 0) {
    console.log('Sample manager:', mSnap.docs[0].data());
  }
}
run();
