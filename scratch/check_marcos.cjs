const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../centro-operativo-cpsl-65ad52160f45.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkMarcos() {
  const snap = await db.collection('users').get();
  snap.forEach(doc => {
    const d = doc.data();
    const n = (d.name || d.displayName || d.nombre || '').toLowerCase();
    if(n.includes('marcos') || n.includes('vera')) {
        console.log(doc.id, n, d.emails, d.email);
    }
  });
}
checkMarcos();
