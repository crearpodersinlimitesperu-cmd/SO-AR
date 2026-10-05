import fs from 'fs';
import admin from 'firebase-admin';

async function deploy() {
  const serviceAccountPath = 'centro-operativo-cpsl-3d05655c949c.json';
  
  if (!fs.existsSync(serviceAccountPath)) {
    console.error("No service account key found! Cannot deploy.");
    return;
  }
  
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  
  const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  const securityRules = app.securityRules();
  
  try {
    // The admin SDK does not support updating firestore rules directly like realtime db does natively without googleapis,
    // so we'd have to use googleapis for v1 firestore rules API. Let's see if googleapis is installed.
    console.log("Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.error("Error:", error);
  }
}
deploy();
