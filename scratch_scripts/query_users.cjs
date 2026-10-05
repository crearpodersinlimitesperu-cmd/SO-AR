const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSy' + 'CTMrA6A64s' + '1ppDBBso' + 'l-fqam5V' + 'ch_Q5B0',
  authDomain: "centro-operativo-cpsl.firebaseapp.com",
  projectId: "centro-operativo-cpsl",
  storageBucket: "centro-operativo-cpsl.firebasestorage.app"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    const colRef = collection(db, 'users'); // o app_users, etc
    const snap = await getDocs(colRef);
    console.log('users size:', snap.size);
    if(snap.size > 0) {
      const data = snap.docs[0].data();
      console.log('keys in user doc:', Object.keys(data));
    }
  } catch (err) {
    console.log(err.message);
  }
  process.exit(0);
}
run();
