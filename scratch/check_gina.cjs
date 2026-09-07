const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.join(__dirname, '..', 'centro-operativo-cpsl-65ad52160f45.json'));

admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function check() {
  const users = await db.collection('users').where('email', '==', 'cardenaslopezgina@gmail.com').get();
  console.log('users matches:', users.size);
  users.forEach(d => console.log('User:', d.id, JSON.stringify(d.data(), null, 2)));

  const qt = await db.collection('qt_directory').where('email', '==', 'cardenaslopezgina@gmail.com').get();
  console.log('qt_directory matches:', qt.size);
  qt.forEach(d => console.log('QT:', d.id, JSON.stringify(d.data(), null, 2)));

  const staff = await db.collection('staff_directory').where('email', '==', 'cardenaslopezgina@gmail.com').get();
  console.log('staff_directory matches:', staff.size);
  staff.forEach(d => console.log('Staff:', d.id, JSON.stringify(d.data(), null, 2)));

  // Check if there is any user with gina
  const allUsersSnap = await db.collection('users').get();
  const ginas = [];
  allUsersSnap.forEach(d => {
    const data = d.data();
    if ((data.name && data.name.toLowerCase().includes('gina')) || (data.email && data.email.toLowerCase().includes('gina'))) {
      ginas.push({ id: d.id, ...data });
    }
  });
  console.log('Users with Gina in name or email:', ginas);
}

check().catch(console.error);
