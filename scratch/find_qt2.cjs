const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../centro-operativo-cpsl-65ad52160f45.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function findQuantumTeam2() {
  const qtRef = db.collection('qt_directory');
  const snap = await qtRef.get();
  snap.forEach(doc => {
      const d = doc.data();
      if ((d.nombre || '').toLowerCase() === 'quantum team' || (d.nombre || '') === '') {
          console.log(`[QT] ID: ${doc.id} - Nombre: ${d.nombre} - Email: ${d.email}`);
      }
  });
}
findQuantumTeam2();
