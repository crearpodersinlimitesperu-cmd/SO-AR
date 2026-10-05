import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCTMrA6A64s1ppDBBsol-fqam5Vch_Q5B0",
  authDomain: "centro-operativo-cpsl.firebaseapp.com",
  projectId: "centro-operativo-cpsl",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  try {
    const snap = await getDocs(collection(db, 'px_legal_signatures'));
    console.log("Documents in px_legal_signatures:", snap.size);
    snap.forEach(d => {
      const data = d.data();
      // Omit huge base64 signature for readability
      if (data.signature_data_url) data.signature_data_url = data.signature_data_url.substring(0, 30) + '...';
      if (data.signatureDataUrl) data.signatureDataUrl = data.signatureDataUrl.substring(0, 30) + '...';
      console.log("Doc ID:", d.id, JSON.stringify(data, null, 2));
    });
  } catch (e) {
    console.error("Error:", e.message, e.code);
  }
}
check();
