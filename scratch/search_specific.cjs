const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../centro-operativo-cpsl-65ad52160f45.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

function normalize(str) {
  if(!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ');
}

async function searchSpecific() {
  const usersRef = db.collection('users');
  const snap = await usersRef.get();
  
  console.log("Buscando a Katherine Aguirre, Marce Aguirre, Gabriela Altuna y usuarios sin nombre:");
  snap.forEach(doc => {
    const u = doc.data();
    const n = normalize(u.name || u.displayName || '');
    if (n.includes('aguirre') || n.includes('altuna') || n === '' || n.includes('quantum team')) {
      console.log(`ID: ${doc.id} | Nombre: ${u.name} | Email: ${u.email} | Roles: ${JSON.stringify(u.roles)} | appRole: ${u.appRole}`);
    }
  });
}

searchSpecific();
