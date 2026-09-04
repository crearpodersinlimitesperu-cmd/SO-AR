import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./centro-operativo-cpsl-65ad52160f45.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function check() {
  const qtSnap = await db.collection('qt_directory').get();
  console.log('Total in qt_directory:', qtSnap.size);

  const docs = [];
  qtSnap.forEach(doc => {
    const data = doc.data();
    docs.push({ id: doc.id, name: data.nombre, email: data.email, sede: data.sede });
  });

  console.log('Sample docs:', docs.slice(0, 5));

  const ginaMatches = docs.filter(d => 
    (d.name && d.name.toLowerCase().includes('gina')) || 
    (d.email && d.email.toLowerCase().includes('gina'))
  );
  console.log('Gina in qt_directory:', ginaMatches);

  const rouseMatches = docs.filter(d => 
    (d.name && d.name.toLowerCase().includes('rosmery')) || 
    (d.name && d.name.toLowerCase().includes('rouse')) ||
    (d.email && d.email.toLowerCase().includes('rouz'))
  );
  console.log('Rouse in qt_directory:', rouseMatches);

  // Also check users collection
  const userGina = await db.collection('users').where('email', '==', 'cardenaslopezgina@gmail.com').get();
  console.log('Gina in users collection:', userGina.size);
  if (!userGina.empty) {
    console.log('Gina user data:', userGina.docs[0].data());
  }

  const userRouse = await db.collection('users').where('email', '==', 'rouz1414@gmail.com').get();
  console.log('Rouse in users collection:', userRouse.size);
  if (!userRouse.empty) {
    console.log('Rouse user data:', userRouse.docs[0].data());
  }
}

check().catch(console.error);