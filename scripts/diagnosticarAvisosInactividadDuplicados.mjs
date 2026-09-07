// scripts/diagnosticarAvisosInactividadDuplicados.mjs
//
// CONTEXTO (04/09/2026): José reportó (con 1 captura de su bandeja de Gmail)
// que el correo "⚠️ Aviso de Inactividad en SO-AR" le llegó 3 VECES, a pesar
// de haber ingresado a la plataforma todos los días.
//
// La lógica de checkInactivity() en scripts/mailerDaemon.js es, en teoría,
// un debounce correcto:
//   1. Si (ahora - lastLoginAt) > 72 horas → candidato a alerta.
//   2. Solo se envía si lastInactivityAlertAt < lastLoginAt (o sea: no se
//      ha alertado todavía por ESTE período de inactividad).
//   3. Al enviar, escribe lastInactivityAlertAt = ahora en user_profiles.
//
// Si esa lógica funcionara sin fallas, un usuario que entra a diario NUNCA
// debería recibir esta alerta ni una sola vez, mucho menos 3. Este script
// NO asume ninguna causa — reúne los HECHOS necesarios para distinguir entre
// las hipótesis posibles, sin inventar cuál es la correcta:
//
//   H1) El campo lastLoginAt se "congela" — por ejemplo si el navegador
//       mantiene la misma pestaña/sesión abierta por días sin cerrarse
//       nunca del todo, el guardado de auditoría de LOGIN (que es el que
//       actualiza lastLoginAt) está protegido por un sessionStorage que
//       solo se limpia al cerrar esa sesión del navegador — así que
//       "entrar a diario" dentro de la MISMA pestaña/sesión podría no estar
//       generando un nuevo lastLoginAt cada vez.
//   H2) Existen documentos DUPLICADOS en user_profiles para el mismo correo
//       (con IDs de documento distintos) — cada uno con su propio
//       lastLoginAt/lastInactivityAlertAt independiente, generando alertas
//       repetidas desde "copias" desactualizadas del perfil.
//   H3) El id del documento en user_profiles NO coincide exactamente con el
//       valor guardado en el campo "email" de ese mismo documento — lo cual
//       haría que el .update({lastInactivityAlertAt...}) en mailerDaemon.js
//       falle silenciosamente (o escriba en un documento equivocado),
//       impidiendo que el debounce quede registrado.
//   H4) Hay un SEGUNDO proceso corriendo el daemon en modo continuo (por
//       ejemplo `npm run mailer`, sin --one-shot) en paralelo al workflow de
//       GitHub Actions — esto no se puede confirmar leyendo Firestore, así
//       que este script NO intenta detectarlo; si las demás hipótesis no
//       explican el patrón, hay que preguntárselo directamente a José.
//
// MODO SEGURO: 100% solo lectura. No modifica ni corrige nada.
//
// Uso:
//   node scripts/diagnosticarAvisosInactividadDuplicados.mjs
//   node scripts/diagnosticarAvisosInactividadDuplicados.mjs correo@ejemplo.com   (filtra a un solo correo)

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const filtroCorreo = process.argv[2] ? process.argv[2].toLowerCase().trim() : null;

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

function fechaLegible(v) {
  if (!v) return '(sin fecha)';
  const d = v.toDate ? v.toDate() : new Date(v);
  if (isNaN(d.getTime())) return `(fecha inválida: ${JSON.stringify(v)})`;
  return d.toISOString();
}

console.log('\n========================================================');
console.log('PARTE 1/3 — Avisos de inactividad enviados/pendientes en "mail"');
console.log('========================================================\n');

const mailSnap = await db.collection('mail').get();
const avisosPorCorreo = new Map(); // to (lowercased) -> [ {id, createdAt, state, error} ]

mailSnap.forEach(docSnap => {
  const d = docSnap.data();
  const subject = d.message?.subject || '';
  if (!subject.includes('Aviso de Inactividad')) return;

  const to = Array.isArray(d.to) ? d.to.join(',').toLowerCase().trim() : String(d.to || '').toLowerCase().trim();
  if (filtroCorreo && to !== filtroCorreo) return;

  if (!avisosPorCorreo.has(to)) avisosPorCorreo.set(to, []);
  avisosPorCorreo.get(to).push({
    id: docSnap.id,
    createdAt: d.createdAt,
    state: d.delivery?.state || '(pendiente)',
    error: d.delivery?.error || null
  });
});

if (avisosPorCorreo.size === 0) {
  console.log(filtroCorreo
    ? `No se encontró ningún "Aviso de Inactividad" para ${filtroCorreo} en la colección "mail".`
    : 'No se encontró ningún "Aviso de Inactividad" en la colección "mail".');
} else {
  for (const [to, avisos] of avisosPorCorreo.entries()) {
    avisos.sort((a, b) => {
      const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const db_ = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return da - db_;
    });
    const marca = avisos.length > 1 ? '🔴' : '  ';
    console.log(`${marca} ${to}  →  ${avisos.length} aviso(s) de inactividad encontrados:`);
    avisos.forEach((a, i) => {
      console.log(`      [${i + 1}] mail/${a.id}  creado: ${fechaLegible(a.createdAt)}  estado: ${a.state}${a.error ? `  error: ${a.error}` : ''}`);
    });
    if (avisos.length > 1) {
      for (let i = 1; i < avisos.length; i++) {
        const t0 = avisos[i - 1].createdAt?.toDate ? avisos[i - 1].createdAt.toDate() : new Date(avisos[i - 1].createdAt || 0);
        const t1 = avisos[i].createdAt?.toDate ? avisos[i].createdAt.toDate() : new Date(avisos[i].createdAt || 0);
        const horas = ((t1 - t0) / (1000 * 60 * 60)).toFixed(1);
        console.log(`          ⏱️  entre aviso [${i}] y [${i + 1}]: ${horas} horas`);
      }
    }
    console.log('');
  }
}

console.log('\n========================================================');
console.log('PARTE 2/3 — Documentos en "user_profiles" (buscando duplicados o IDs que no calzan con el email)');
console.log('========================================================\n');

const profilesSnap = await db.collection('user_profiles').get();
const perfilesPorCorreo = new Map(); // email normalizado del CAMPO -> [ {docId, data} ]

profilesSnap.forEach(docSnap => {
  const data = docSnap.data();
  const emailCampo = (data.email || '').toLowerCase().trim();
  const claveAgrupacion = emailCampo || docSnap.id.toLowerCase().trim();

  if (filtroCorreo && claveAgrupacion !== filtroCorreo && docSnap.id.toLowerCase().trim() !== filtroCorreo) return;

  if (!perfilesPorCorreo.has(claveAgrupacion)) perfilesPorCorreo.set(claveAgrupacion, []);
  perfilesPorCorreo.get(claveAgrupacion).push({ docId: docSnap.id, data });
});

if (perfilesPorCorreo.size === 0) {
  console.log(filtroCorreo ? `No se encontró ningún user_profiles para ${filtroCorreo}.` : 'No hay documentos en user_profiles.');
} else {
  for (const [correo, perfiles] of perfilesPorCorreo.entries()) {
    const duplicado = perfiles.length > 1;
    const marca = duplicado ? '🔴' : '  ';
    console.log(`${marca} ${correo}:`);
    perfiles.forEach(p => {
      const emailCampo = (p.data.email || '').toLowerCase().trim();
      const idCalzaConEmail = p.docId.toLowerCase().trim() === emailCampo;
      const avisoIdCalza = idCalzaConEmail ? '' : '   ⚠️ el ID del documento NO coincide con el campo "email"';
      console.log(`      doc user_profiles/${p.docId}${avisoIdCalza}`);
      console.log(`        email (campo): "${p.data.email ?? '(sin campo email)'}"`);
      console.log(`        lastLoginAt: ${fechaLegible(p.data.lastLoginAt)}`);
      console.log(`        lastInactivityAlertAt: ${fechaLegible(p.data.lastInactivityAlertAt)}`);
    });
    if (duplicado) {
      console.log(`      🔴 ${perfiles.length} documentos DISTINTOS de user_profiles corresponden al mismo correo.`);
      console.log('         Cada uno tiene su propio lastLoginAt/lastInactivityAlertAt independiente,');
      console.log('         lo cual puede generar alertas de inactividad repetidas para la misma persona.');
    }
    console.log('');
  }
}

console.log('\n========================================================');
console.log('PARTE 3/3 — Resumen (solo hechos, sin conclusiones)');
console.log('========================================================\n');

let totalConMultiplesAvisos = 0;
for (const avisos of avisosPorCorreo.values()) if (avisos.length > 1) totalConMultiplesAvisos++;

let totalConPerfilesDuplicados = 0;
let totalConIdDesalineado = 0;
for (const perfiles of perfilesPorCorreo.values()) {
  if (perfiles.length > 1) totalConPerfilesDuplicados++;
  perfiles.forEach(p => {
    const emailCampo = (p.data.email || '').toLowerCase().trim();
    if (p.docId.toLowerCase().trim() !== emailCampo) totalConIdDesalineado++;
  });
}

console.log(`Correos con más de 1 "Aviso de Inactividad" en "mail": ${totalConMultiplesAvisos}`);
console.log(`Correos con más de 1 documento en user_profiles (perfiles duplicados): ${totalConPerfilesDuplicados}`);
console.log(`Documentos de user_profiles cuyo ID no coincide con su propio campo "email": ${totalConIdDesalineado}`);
console.log('\n➡️  Solo lectura. Nada fue modificado. Estos hechos no incluyen ninguna hipótesis sobre si hay un');
console.log('   segundo proceso del daemon corriendo en modo continuo (npm run mailer) en paralelo al workflow');
console.log('   de GitHub Actions — eso no se puede confirmar leyendo Firestore, hay que confirmarlo directamente.');
