import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
  const users = await db.collection('users').get();
  users.forEach(doc => {
    const data = doc.data();
    if (data.name && data.name.includes('Nancy')) {
      console.log(JSON.stringify({ id: doc.id, ...data }, null, 2));
    }
  });
}
run();
