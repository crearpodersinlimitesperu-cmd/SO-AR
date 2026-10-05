import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
  const users = await db.collection('users').where('appRole', '==', 'coord_c1').get();
  users.forEach(u => console.log(u.data().name, u.data().sede, u.data().appRole));
}
run();
