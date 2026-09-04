const admin = require("firebase-admin");
try {
  const serviceAccount = require("C:/Users/josem/Downloads/serviceAccountKey.json");
  console.log("Found in downloads");
} catch(e) {
  console.log("Not in downloads");
}