const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../centro-operativo-cpsl-65ad52160f45.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function findKarol() {
  console.log("Buscando a Karol Fernanda...");
  const snap = await db.collection('users').get();
  snap.forEach(doc => {
    const d = doc.data();
    const n = (d.name || d.displayName || d.nombre || '').toLowerCase();
    if(n.includes('karol') || n.includes('villarruel')) {
        console.log(`ID: ${doc.id} | Name: ${d.name || d.displayName} | Emails: ${JSON.stringify(d.emails)} | Email: ${d.email} | Rol: ${d.appRole || d.role}`);
    }
  });

  const dirs = ['managers_directory', 'qt_directory'];
  for (const dir of dirs) {
    const snap2 = await db.collection(dir).get();
    snap2.forEach(doc => {
      const d = doc.data();
      const n = (d.nombre || '').toLowerCase();
      if(n.includes('karol') || n.includes('villarruel')) {
          console.log(`[${dir}] ID: ${doc.id} | Name: ${d.nombre} | Email: ${d.email} | Rol: ${d.rol}`);
      }
    });
  }
}
findKarol();
