// scripts/exportarNodusSnapshot.mjs
//
// CONTEXTO (02/09/2026): antes de diseñar la agrupación por Ciclo (C1/C2/MJ)
// x Sede en la vista de Nodus en vivo, necesito ver la ESTRUCTURA REAL de lo
// que el robot ya extrajo — cómo Nodus nombra/separa cada coordinador por
// ciclo y sede. Copiar esto a mano desde la consola de Firebase es propenso
// a error (el documento tiene arreglos anidados largos: secciones.
// actividadCoordinadores.kpis, tablas, etc.). Este script lo descarga
// completo y fiel, tal cual está en Firestore, a un archivo local.
//
// MODO SEGURO: solo lectura. No escribe, no actualiza, no borra nada en
// Firestore. Solo lee UN documento y lo guarda en un archivo local.
//
// Uso:
//   node scripts/exportarNodusSnapshot.mjs
//   node scripts/exportarNodusSnapshot.mjs live_filtered   (para exportar
//     el resultado de una extracción filtrada por fechas, si ya corriste
//     una desde GitHub Actions o desde el botón "Filtrar")

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { writeFileSync, readFileSync } from 'fs';

const docId = process.argv[2] || 'latest_snapshot';

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

console.log(`📡 Leyendo nodus_kpis_sincronizados/${docId} (solo lectura)...`);
const snap = await db.collection('nodus_kpis_sincronizados').doc(docId).get();

if (!snap.exists) {
  console.error(`❌ No existe el documento "${docId}" en nodus_kpis_sincronizados. ¿Ya corrió el robot de Nodus al menos una vez?`);
  process.exit(1);
}

const data = snap.data();
const outFile = `nodus_${docId}.json`;
writeFileSync(outFile, JSON.stringify(data, null, 2), 'utf8');

console.log(`✅ Guardado en: ${outFile}`);
console.log(`\nResumen rápido de lo que trae:`);
if (data.secciones) {
  Object.keys(data.secciones).forEach(seccionKey => {
    const seccion = data.secciones[seccionKey];
    const numTablas = seccion?.tablas?.length || 0;
    const numKpis = seccion?.kpis?.length || 0;
    console.log(`   - ${seccionKey}: ${numTablas} tabla(s), ${numKpis} tarjeta(s)/KPI(s)`);
  });
}
console.log(`\nEste script NO modificó nada en Firestore. Adjunta el archivo "${outFile}" en el chat para que lo revise.`);
