// scripts/diagnosticarColaMail.mjs
//
// CONTEXTO (03/09/2026): José preguntó si el envío automático de correos
// (notificaciones) está funcionando. La plataforma usa un patrón de "cola
// de correo": distintas partes de la app (HelpModal.jsx, ChecklistContext.jsx,
// el propio mailerDaemon.js para alertas de inactividad) escriben documentos
// en la colección Firestore "mail" con to/message/html. Un GitHub Action
// (.github/workflows/mail-dispatch.yml) corre cada 30 minutos y ejecuta
// "node scripts/mailerDaemon.js --one-shot", que:
//   1. Busca en "mail" los documentos SIN delivery.state (pendientes).
//   2. Intenta enviarlos por Gmail (nodemailer, con GMAIL_USER/GMAIL_PASS
//      como GitHub Secrets).
//   3. Marca cada documento como delivery.state = "SUCCESS" o "ERROR".
//
// Yo no tengo acceso a gh CLI ni a la API de GitHub Actions desde este
// entorno (confirmado en sesiones anteriores), así que no puedo ver
// directamente el historial de corridas de ese workflow ni si los Secrets
// GMAIL_USER/GMAIL_PASS existen. Pero SÍ puedo leer la colección "mail" en
// Firestore directamente — si el envío automático estuviera funcionando,
// los documentos deberían pasar de "sin delivery.state" a "SUCCESS" (o
// "ERROR", si Gmail rechaza algo) en minutos, nunca quedarse pendientes por
// horas.
//
// Qué hace este script (SOLO LECTURA, no envía ni modifica nada):
//   - Cuenta cuántos documentos de "mail" están: pendientes (sin
//     delivery.state), en SUCCESS, en ERROR o en REJECTED.
//   - Si hay pendientes, muestra hace cuánto se crearon — si hay alguno de
//     más de 1 hora, es evidencia fuerte de que el GitHub Action no está
//     corriendo o está fallando antes de llegar a procesarlos.
//   - Muestra el último envío exitoso (delivery.endTime más reciente) y el
//     último error, si los hay, con su mensaje real de Gmail/nodemailer.
//
// Uso:
//   node scripts/diagnosticarColaMail.mjs

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

console.log('\n🔎 Leyendo la colección "mail" (cola de notificaciones por correo)...\n');

const snap = await db.collection('mail').get();
console.log(`Total de documentos en "mail": ${snap.size}\n`);

const pendientes = [];
const success = [];
const errores = [];
const rechazados = [];

snap.forEach(docSnap => {
  const d = docSnap.data();
  const estado = d.delivery?.state;
  if (!estado) {
    pendientes.push({ id: docSnap.id, to: d.to, subject: d.message?.subject, createdAt: d.createdAt });
  } else if (estado === 'SUCCESS') {
    success.push({ id: docSnap.id, to: d.to, endTime: d.delivery.endTime });
  } else if (estado === 'ERROR') {
    errores.push({ id: docSnap.id, to: d.to, error: d.delivery.error });
  } else if (estado === 'REJECTED') {
    rechazados.push({ id: docSnap.id, to: d.to, reason: d.reason });
  }
});

console.log(`✅ Enviados con éxito (SUCCESS): ${success.length}`);
console.log(`❌ Con error de envío (ERROR): ${errores.length}`);
console.log(`🚫 Rechazados (REJECTED — sin destinatario válido): ${rechazados.length}`);
console.log(`⏳ Pendientes (sin delivery.state todavía): ${pendientes.length}\n`);

if (success.length > 0) {
  const ultimosExitosos = success
    .filter(s => s.endTime)
    .sort((a, b) => new Date(b.endTime) - new Date(a.endTime))
    .slice(0, 3);
  console.log('Últimos envíos exitosos:');
  ultimosExitosos.forEach(s => console.log(`   ${s.endTime}  →  ${Array.isArray(s.to) ? s.to.join(', ') : s.to}`));
  console.log('');
}

if (errores.length > 0) {
  console.log('Errores de envío más recientes (mensaje real de Gmail/nodemailer):');
  errores.slice(0, 5).forEach(e => console.log(`   [${e.id}] → ${Array.isArray(e.to) ? e.to.join(', ') : e.to}: ${e.error}`));
  console.log('');
}

if (pendientes.length > 0) {
  console.log('⚠️  Documentos PENDIENTES (todavía sin procesar):');
  pendientes.slice(0, 10).forEach(p => {
    console.log(`   [${p.id}] → ${Array.isArray(p.to) ? p.to.join(', ') : p.to}  "${p.subject || '(sin asunto)'}"  creado: ${p.createdAt || '(sin fecha registrada)'}`);
  });
  console.log('\n   ⚠️  Si alguno de estos tiene más de ~1 hora de creado, es evidencia fuerte de');
  console.log('   que el GitHub Action "mail-dispatch.yml" (cada 30 min) NO está corriendo o está');
  console.log('   fallando antes de procesar la cola — probablemente por los Secrets GMAIL_USER /');
  console.log('   GMAIL_PASS faltantes o inválidos en GitHub (Settings → Secrets and variables →');
  console.log('   Actions del repo). Eso solo se puede revisar y corregir desde GitHub directamente');
  console.log('   (yo no tengo acceso a esos Secrets ni al historial de corridas del Action).');
} else {
  console.log('✅ No hay ningún documento pendiente ahora mismo — todo lo que se puso en la cola');
  console.log('   ya fue procesado (SUCCESS, ERROR o REJECTED). Si el último SUCCESS es reciente,');
  console.log('   es buena señal de que el envío automático SÍ está corriendo.');
}

console.log('\n➡️  Solo lectura. Nada fue modificado ni enviado.');
