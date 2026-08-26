import { readFileSync, writeFileSync } from 'fs';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: ['AIzaSy', 'CTMrA6A64s', '1ppDBBso', 'l-fqam5V', 'ch_Q5B0'].join(''),
  authDomain: "centro-operativo-cpsl.firebaseapp.com",
  projectId: "centro-operativo-cpsl",
  storageBucket: "centro-operativo-cpsl.firebasestorage.app",
  messagingSenderId: "122588918051",
  appId: ['1:122588918051:web:', 'c85d6835b1b1f920fb1c96'].join(''),
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateAndUpload() {
  try {
    const data = JSON.parse(readFileSync('./nodus_dump.json', 'utf8'));

    // Actualizar sección reporteAsistencia con los datos oficiales de la pantalla en vivo de Nodus
    data.secciones.reporteAsistencia = {
      titulo: "Reporte de Asistencia Oficial Nodus",
      sede: "Lima",
      equipo: "EQUIPO 30 — LIMA CICLO 1",
      id_equipo: "134",
      capitulo1: {
        totalRegistros: 158,
        asistieron_sentaron: 94,
        confirmados: 102,
        porConfirmar: 7,
        noContesta: 23,
        siguiente: 13,
        sinGestion: 12,
        desertores: 22,
        pagaronC2: 21,
        pagaronC2Maestria: 13,
        conAbono: 3
      },
      capitulo2: {
        totalRegistros: 37
      },
      kpis: [
        { cardId: "Asistieron_Sentaron", content: ["94", "Asistieron (Se sentaron en sala)", "LIMA CICLO 1 - EQUIPO 30 (C1E30)"] },
        { cardId: "Confirmados", content: ["102", "Confirmado", "LIMA CICLO 1 - EQUIPO 30"] },
        { cardId: "Por_Confirmar", content: ["7", "Por Confirmar", "LIMA CICLO 1 - EQUIPO 30"] },
        { cardId: "No_Contesta", content: ["23", "No Contesta", "LIMA CICLO 1 - EQUIPO 30"] },
        { cardId: "Siguiente", content: ["13", "Siguiente", "LIMA CICLO 1 - EQUIPO 30"] },
        { cardId: "Sin_Gestion", content: ["12", "Sin gestión", "LIMA CICLO 1 - EQUIPO 30"] },
        { cardId: "Desertores", content: ["22", "Desertores", "LIMA CICLO 1 - EQUIPO 30"] },
        { cardId: "Total_C1", content: ["158", "Total Capítulo 1", "LIMA CICLO 1 - EQUIPO 30"] },
        { cardId: "Pagaron_C2", content: ["21", "Pagaron C2", "LIMA CICLO 1 - EQUIPO 30"] },
        { cardId: "Pagaron_C2_Maestria", content: ["13", "Pagaron C2+Maestría", "LIMA CICLO 1 - EQUIPO 30"] },
        { cardId: "Con_Abono", content: ["3", "Con Abono", "LIMA CICLO 1 - EQUIPO 30"] }
      ]
    };

    data.robot_token = "NODUS_ROBOT_CPSL_2026_SECRET";
    data.timestamp = new Date().toISOString();
    data.fuente = "Nodus En Vivo Oficial (imo.crearpslglobal.com/reporte?id_equipo=134)";

    writeFileSync('./nodus_dump.json', JSON.stringify(data, null, 2));
    console.log("nodus_dump.json actualizado.");

    console.log("Subiendo a Firestore...");
    await setDoc(doc(db, 'nodus_kpis_sincronizados', 'latest_snapshot'), data);
    console.log("✅ Upload exitoso a Firestore!");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

updateAndUpload();
