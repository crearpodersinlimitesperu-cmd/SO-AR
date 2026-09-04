const admin = require("firebase-admin");
const serviceAccount = require("C:/Users/josem/Downloads/SO-AR/serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkGinaStaff() {
  const ginaQuery = await db.collection("qt_members").where("email", "==", "cardenaslopezgina@gmail.com").get();
  
  if (ginaQuery.empty) {
    console.log("Gina NOT FOUND in qt_members collection!");
  } else {
    console.log("Gina found in qt_members");
    console.log(ginaQuery.docs[0].data());
  }
}

checkGinaStaff();