import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCTMrA6A64s1ppDBBsol-fqam5Vch_Q5B0",
  authDomain: "centro-operativo-cpsl.firebaseapp.com",
  projectId: "centro-operativo-cpsl",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  try {
    const qs = await getDocs(collection(db, "managers_directory"));
    console.log("Managers in Firestore: ", qs.size);
  } catch (e) {
    console.error("Error reading Firestore:", e);
  }
  process.exit(0);
}
check();
