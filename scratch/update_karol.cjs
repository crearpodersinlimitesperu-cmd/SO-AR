const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const serviceAccount = require('../centro-operativo-cpsl-65ad52160f45.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function updateKarol() {
  const docRef = db.collection('users').doc('coodinacion_administrativa');
  
  await docRef.update({
      emails: FieldValue.arrayUnion('coordinacion.administrativa@crearpsl.net')
  });
  
  console.log("Correo coordinacion.administrativa@crearpsl.net agregado exitosamente.");
}
updateKarol();
