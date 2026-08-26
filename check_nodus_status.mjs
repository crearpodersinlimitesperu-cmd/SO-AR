import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

(async () => {
  try {
    const doc = await db.collection('nodus_kpis_sincronizados').doc('latest_snapshot').get();
    if (doc.exists) {
      const data = doc.data();
      console.log('✅ Documento existe en Firestore.');
      console.log('Tamaño:', JSON.stringify(data).length, 'bytes');
      console.log('Timestamp:', data.timestamp || 'NO SET');
      console.log('Fuente:', data.fuente || 'NO SET');
      console.log('Tiene robot_token:', data.robot_token ? 'SÍ' : 'NO');
      const keys = data.secciones ? Object.keys(data.secciones) : [];
      console.log('Secciones (' + keys.length + '):', keys.slice(0, 5).join(', ') + (keys.length > 5 ? '...' : ''));
    } else {
      console.log('❌ Documento NO existe en Firestore.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
