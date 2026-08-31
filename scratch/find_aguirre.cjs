const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../centro-operativo-cpsl-65ad52160f45.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function findAguirre() {
  const usersRef = db.collection('users');
  const qtRef = db.collection('qt_directory');
  const manRef = db.collection('managers_directory');

  const printDocs = async (ref, name) => {
      const snap = await ref.get();
      snap.forEach(doc => {
          const d = doc.data();
          const str = JSON.stringify(d).toLowerCase();
          if (str.includes('aguirre')) {
              console.log(`[${name}] ID: ${doc.id} - Nombre: ${d.nombre || d.name || d.displayName} - Role: ${d.role || d.rol} - Email: ${d.email}`);
          }
      });
  };

  await printDocs(usersRef, 'USERS');
  await printDocs(qtRef, 'QT');
  await printDocs(manRef, 'MANAGERS');
}
findAguirre();
