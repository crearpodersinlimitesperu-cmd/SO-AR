const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkGina() {
  const ginaSnapshot = await db.collection("users").where("email", "==", "cardenaslopezgina@gmail.com").get();
  
  if (ginaSnapshot.empty) {
    console.log("Gina not found in DB");
    return;
  }
  
  const gina = ginaSnapshot.docs[0].data();
  console.log("Gina found:", gina.email);
  console.log("Rol:", gina.role, "Sede:", gina.sede, "Status:", gina.status);
  
  const staffSnapshot = await db.collection("staff_applications").where("email", "==", "cardenaslopezgina@gmail.com").get();
  if (staffSnapshot.empty) {
     console.log("Gina NOT FOUND in staff_applications!");
  } else {
     console.log("Gina found in staff_applications");
     console.log(staffSnapshot.docs[0].data());
  }
}

checkGina();