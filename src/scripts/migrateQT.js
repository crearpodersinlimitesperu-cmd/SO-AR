import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase.js';

const migrateGina = async () => {
   const qtRef = doc(db, 'qt_directory', 'cardenaslopezgina@gmail.com');
   await setDoc(qtRef, {
      index: 100, // put her at the end for now
      name: "Gina Cardenas Lopez",
      email: "cardenaslopezgina@gmail.com",
      phone: "+51999999999",
      sede: "Lima",
      experience: "Lider Senior",
      instagram: "@ginacardenas",
      bio: "Comprometida a servir desde la participación total",
      dni: "00000000",
      talla: "M",
      isLeader: true,
      lastUpdated: new Date().toISOString()
   });
   console.log("Migrated Gina");
   process.exit(0);
};

migrateGina();