const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc } = require("firebase/firestore");
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || ['AIzaSy', 'CTMrA6A64s', '1ppDBBso', 'l-fqam5V', 'ch_Q5B0'].join(''),
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "centro-operativo-cpsl.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "centro-operativo-cpsl",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  try {
    const snap = await getDoc(doc(db, 'nodus_kpis_sincronizados', 'latest'));
    if (snap.exists()) {
      const data = snap.data();
      const keys = Object.keys(data.secciones?.reporteAsistenciaPorEquipo || {});
      console.log("Keys found in nodus_kpis_sincronizados/latest:", keys);
    } else {
      console.log("No document found!");
    }
  } catch (e) {
    console.error(e.message);
  }
  process.exit(0);
}
check();
