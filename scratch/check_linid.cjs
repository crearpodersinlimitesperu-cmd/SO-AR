const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../centro-operativo-cpsl-65ad52160f45.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkLinid() {
  const snap = await db.collection('users').get();
  snap.forEach(doc => {
    const d = doc.data();
    const n = (d.name || d.displayName || d.nombre || '').toLowerCase();
    if(n.includes('linid') || n.includes('valencia')) {
        console.log(`ID: ${doc.id} | Nombre: ${d.name || d.displayName} | Emails: ${JSON.stringify(d.emails)} | Email Principal: ${d.email} | appRole: ${d.appRole}`);
    }
  });
}
checkLinid();
