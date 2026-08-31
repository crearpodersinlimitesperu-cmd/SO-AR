const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../centro-operativo-cpsl-65ad52160f45.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkManagers() {
  console.log("Analyzing Vera in managers and qt...");
  const cols = ['managers_directory', 'qt_directory'];
  for(let c of cols) {
      console.log(`-- ${c} --`);
      const snap = await db.collection(c).get();
      snap.forEach(doc => {
          const d = doc.data();
          const n = (d.nombre || '').toLowerCase();
          if(n.includes('vera') || n.includes('josue') || n.includes('marcos')) {
              console.log(`ID: ${doc.id}, Name: ${d.nombre}, Email: ${d.email}, Equipo: ${d.equipo}`);
          }
      });
  }
}

checkManagers();
