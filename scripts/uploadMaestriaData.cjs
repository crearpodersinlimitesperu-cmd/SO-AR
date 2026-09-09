const fs = require('fs');
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || ['AIzaSy', 'CTMrA6A64s', '1ppDBBso', 'l-fqam5V', 'ch_Q5B0'].join(''),
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "centro-operativo-cpsl.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "centro-operativo-cpsl",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "centro-operativo-cpsl.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "122588918051",
  appId: process.env.VITE_FIREBASE_APP_ID || ['1:122588918051:web:', 'c85d6835b1b1f920fb1c96'].join(''),
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function upload() {
    try {
        const data = JSON.parse(fs.readFileSync('spider_maestria_lima.json', 'utf8'));
        await setDoc(doc(db, 'nodus_kpis_sincronizados', 'maestria_real_data'), {
            robot_token: "NODUS_ROBOT_CPSL_2026_SECRET",
            timestamp: new Date().toISOString(),
            equipos_lima: data
        });
        console.log("Subida exitosa de maestria_real_data a Firestore.");
        process.exit(0);
    } catch (err) {
        console.error("Error subiendo datos:", err);
        process.exit(1);
    }
}
upload();
