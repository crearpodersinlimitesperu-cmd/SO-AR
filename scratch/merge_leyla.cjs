const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const serviceAccount = require('../centro-operativo-cpsl-65ad52160f45.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function mergeLeyla() {
  console.log("Merging Leyla...");
  const ref1 = db.collection('users').doc('leyla_pasquel'); // coord
  const ref2 = db.collection('users').doc('qt_leylakellypasquelalfaro'); // qt
  
  const doc1 = await ref1.get();
  const doc2 = await ref2.get();
  
  if (doc1.exists && doc2.exists) {
      const data1 = doc1.data();
      const data2 = doc2.data();
      
      const combinedRoles = new Set(data1.roles || []);
      if (data1.appRole) combinedRoles.add(data1.appRole);
      if (data2.appRole) combinedRoles.add(data2.appRole);
      if (data1.role) combinedRoles.add(data1.role);
      if (data2.role) combinedRoles.add(data2.role);
      
      const combinedEmails = new Set(data1.emails || []);
      if (data1.email) combinedEmails.add(data1.email);
      if (data2.email) combinedEmails.add(data2.email);
      (data2.emails || []).forEach(e => combinedEmails.add(e));
      
      await ref1.update({
          roles: Array.from(combinedRoles),
          emails: Array.from(combinedEmails),
          name: 'Leyla Kelly Pasquel Alfaro',
          appRole: 'coord_maestria', // keeping higher role as primary
          updatedAt: FieldValue.serverTimestamp()
      });
      
      await ref2.delete();
      console.log("Leyla merged successfully into leyla_pasquel");
  } else {
      console.log("One or both Leyla documents do not exist.");
  }
}

mergeLeyla();
