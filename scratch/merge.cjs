const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const serviceAccount = require('../centro-operativo-cpsl-65ad52160f45.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const auth = getAuth();

async function mergeLeyla() {
  console.log("Analyzing Leyla...");
  try {
    const doc1 = await db.collection('users').doc('leyla_pasquel').get();
    const doc2 = await db.collection('users').doc('qt_leylakellypasquelalfaro').get();
    console.log("leyla_pasquel exists?", doc1.exists, doc1.data());
    console.log("qt_leylakellypasquelalfaro exists?", doc2.exists, doc2.data());
  } catch(e) { console.error(e); }
}

async function checkVera() {
  console.log("Analyzing Josue Vera...");
  try {
    const snap = await db.collection('users').get();
    snap.forEach(doc => {
      const data = doc.data();
      const n = (data.name || data.nombre || data.displayName || '').toLowerCase();
      if(n.includes('josu') || n.includes('vera')) {
        console.log(`- ID: ${doc.id}, Name: ${data.name || data.nombre || data.displayName}, Email: ${data.email}`);
      }
    });
  } catch(e) {}
}

async function main() {
  await mergeLeyla();
  await checkVera();
}
main();
