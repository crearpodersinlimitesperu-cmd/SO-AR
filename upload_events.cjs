const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin with the service account
const serviceAccount = require('./centro-operativo-cpsl-65ad52160f45.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function uploadEvents() {
  console.log('Reading events.json...');
  const eventsRaw = fs.readFileSync('events.json', 'utf8');
  const events = JSON.parse(eventsRaw);
  
  console.log(`Found ${events.length} events to upload.`);
  
  const batches = [];
  let currentBatch = db.batch();
  let operationCount = 0;
  
  events.forEach((event) => {
    // If event has no id, skip or generate one
    const docRef = event.id ? db.collection('events').doc(event.id) : db.collection('events').doc();
    
    currentBatch.set(docRef, event, { merge: true });
    operationCount++;
    
    if (operationCount === 490) { // Firestore batch limit is 500
      batches.push(currentBatch.commit());
      currentBatch = db.batch();
      operationCount = 0;
    }
  });
  
  // Commit any remaining operations
  if (operationCount > 0) {
    batches.push(currentBatch.commit());
  }
  
  try {
    console.log(`Executing ${batches.length} batches...`);
    await Promise.all(batches);
    console.log('Successfully uploaded all events to Firestore!');
  } catch (error) {
    console.error('Error uploading events:', error);
  }
}

uploadEvents();
