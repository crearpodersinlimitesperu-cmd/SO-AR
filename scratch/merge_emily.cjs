const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../centro-operativo-cpsl-65ad52160f45.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function mergeEmily() {
  const usersRef = db.collection('users');
  const emilyIds = ['emily_campuzano'];
  
  // As Emily is the only account in users based on my search (id: emily_campuzano, name: Emily Gabriela Campuzano Rodríguez),
  // we just need to ensure her arrays include any mila aliases if she's used them, though since no duplicate users exist,
  // we just update her name slightly or leave it. Actually she doesn't have a duplicated user account.
  
  console.log("Chequeando si existen otras cuentas...");
  const snap = await usersRef.get();
  snap.forEach(doc => {
    const n = (doc.data().name || '').toLowerCase();
    if(n.includes('mila ') && n.includes('campuzano')) {
        console.log("Encontramos otra: ", doc.id, doc.data());
    }
  });
  console.log("Listo.");
}
mergeEmily();
