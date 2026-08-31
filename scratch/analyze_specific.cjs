const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../centro-operativo-cpsl-65ad52160f45.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function findUser(queries) {
  console.log(`\nBuscando queries: ${queries.join(', ')}`);
  
  const collections = ['users', 'managers_directory', 'qt_directory'];
  for (const col of collections) {
    const snap = await db.collection(col).get();
    snap.forEach(doc => {
      const data = doc.data();
      const name = (data.nombre || data.name || data.displayName || '').toLowerCase();
      
      let match = false;
      for (const q of queries) {
        if (name.includes(q.toLowerCase())) match = true;
      }
      
      if (match) {
        console.log(`[${col}] ID: ${doc.id} | Nombre: ${data.nombre || data.name || data.displayName} | Correo: ${data.email || 'N/A'} | Rol: ${data.appRole || data.rol || 'N/A'}`);
      }
    });
  }
}

async function main() {
  await findUser(['Leyla']);
  await findUser(['Marcos']);
  await findUser(['Josue']);
}
main();
