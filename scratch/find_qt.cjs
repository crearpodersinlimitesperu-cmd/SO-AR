const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../centro-operativo-cpsl-65ad52160f45.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function findQuantumTeam() {
  const qtRef = db.collection('users');
  const snap = await qtRef.get();
  snap.forEach(doc => {
      const d = doc.data();
      if ((d.name || d.nombre || '').toLowerCase() === 'quantum team') {
          console.log(`[USERS] ID: ${doc.id} - Nombre: ${d.name} - Email: ${d.email}`);
      }
  });
}
findQuantumTeam();
