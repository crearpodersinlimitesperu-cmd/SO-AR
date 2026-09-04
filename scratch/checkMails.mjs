import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';

const CREDENTIALS_PATH = './centro-operativo-cpsl-65ad52160f45.json';

if (!existsSync(CREDENTIALS_PATH)) {
  console.error('No service account found');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function check() {
  const mails = await db.collection('mail').orderBy('createdAt', 'desc').limit(10).get();
  console.log('--- Last 10 mails in queue ---');
  mails.forEach(doc => {
    const data = doc.data();
    console.log(doc.id, '->', data.to, '| State:', data.delivery?.state || 'PENDING', '| Created:', data.createdAt?.toDate?.());
    if (data.delivery?.error) {
       console.log('Error:', data.delivery.error);
    }
  });
}
check().catch(console.error);
