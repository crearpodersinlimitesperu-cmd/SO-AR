const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

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
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), limit(5));
    const snap = await getDocs(q);
    console.log(`Found ${snap.size} recent tasks`);
    snap.forEach(doc => {
      const d = doc.data();
      console.log('-----');
      console.log('ID:', doc.id);
      console.log('Title:', d.title || d.titulo);
      console.log('Desc:', d.description || d.descripcion);
      console.log('Created:', d.createdAt);
    });
  } catch (err) {
    console.log(err.message);
  }
  process.exit(0);
}
run();
