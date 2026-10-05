require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, updateDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    const q = query(collection(db, 'users'), where('email', '==', 'jose.sanchez@crearpsl.net'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('No user found');
    } else {
      snapshot.forEach(async (d) => {
        console.log('Found user:', d.id, d.data());
        await updateDoc(doc(db, 'users', d.id), {
          role: 'gerente',
          roles: ['gerente', 'qt', 'superadmin'],
          sede: 'Lima'
        });
        console.log('User updated successfully');
      });
    }
  } catch (err) {
    console.error(err);
  }
}

run();
