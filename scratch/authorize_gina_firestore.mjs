import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./centro-operativo-cpsl-65ad52160f45.json', 'utf8'));

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

async function authorizeGina() {
  const ginaEmails = ['cardenaslopezgina@gmail.com', 'cardenasgina29@gmail.com'];
  
  // 1. Check in 'users' collection
  const userSnap = await db.collection('users').where('email', '==', 'cardenaslopezgina@gmail.com').get();
  if (!userSnap.empty) {
    for (const docSnap of userSnap.docs) {
      await docSnap.ref.update({
        emails: ginaEmails,
        personalEmail: 'cardenasgina29@gmail.com',
        status: 'active',
        appRole: 'qt',
        role: 'qt'
      });
      console.log('Updated user in users collection:', docSnap.id);
    }
  } else {
    // create if not exists
    const newDoc = await db.collection('users').add({
      name: 'Gina Cardenas Lopez',
      displayName: 'Gina Cardenas Lopez',
      email: 'cardenaslopezgina@gmail.com',
      emails: ginaEmails,
      role: 'qt',
      appRole: 'qt',
      roles: ['qt'],
      sede: 'Lima',
      status: 'active',
      createdAt: new Date().toISOString()
    });
    console.log('Created user in users collection:', newDoc.id);
  }

  // 2. Also ensure cardenasgina29 has a user or is found
  const user2Snap = await db.collection('users').where('email', '==', 'cardenasgina29@gmail.com').get();
  if (user2Snap.empty) {
    // Add user alias or doc for cardenasgina29@gmail.com
    await db.collection('users').doc('user_gina_cardenas_alt').set({
      name: 'Gina Cardenas Lopez',
      displayName: 'Gina Cardenas Lopez',
      email: 'cardenasgina29@gmail.com',
      emails: ginaEmails,
      role: 'qt',
      appRole: 'qt',
      roles: ['qt'],
      sede: 'Lima',
      status: 'active',
      createdAt: new Date().toISOString()
    }, { merge: true });
    console.log('Added alias user doc for cardenasgina29@gmail.com');
  }

  // 3. Ensure in qt_directory
  for (const email of ginaEmails) {
    await db.collection('qt_directory').doc(email).set({
      name: 'Gina Cardenas Lopez',
      nombre: 'Gina Cardenas Lopez',
      email: email,
      sede: 'Lima',
      role: 'qt',
      status: 'active',
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('Updated qt_directory for:', email);
  }

  console.log('ALL GINA ACCOUNTS FULLY AUTHORIZED IN FIRESTORE!');
}

authorizeGina().catch(console.error);
