/**
 * DIAGNÓSTICO — SOLO LECTURA. No borra ni modifica nada.
 *
 * Objetivo: verificar la hipótesis de por qué el selector de "cambiar rol"
 * (Home.jsx -> switchRole) no aparece para más usuarios y por qué los roles
 * detectados automáticamente (roleAgentDaemon.js -> enforceUserRolesAgent)
 * no siempre "pegan".
 *
 * Hipótesis (basada en lectura de código, NO confirmada con datos reales):
 *   1. bootstrapSync.js / qtSyncDaemon.js crean documentos en la colección
 *      "users" usando como ID un slug derivado del correo o un ID de hoja de
 *      cálculo (ej. "jose_sanchez_crearpsl"), NO el UID real de Firebase Auth.
 *   2. AuthContext.jsx (login) y roleAgentDaemon.js (enforceUserRolesAgent)
 *      escriben roles nuevos en users/{uid real de Firebase Auth} — un
 *      documento DISTINTO al de arriba, si nunca coinciden los IDs.
 *   3. firestore.rules valida permisos leyendo users/{request.auth.uid}.role
 *      — es decir, exactamente el documento que sí recibe las escrituras del
 *      login, pero no necesariamente el que la búsqueda por correo
 *      (findUserInFirestore) devuelve primero en logins futuros.
 *
 * Este script NO decide cuál doc es el "correcto" — solo reporta los casos
 * donde un mismo correo tiene más de un documento en "users", para que se
 * pueda confirmar o descartar la hipótesis con datos reales antes de tocar
 * código de autenticación o firestore.rules.
 *
 * Uso:
 *   node scripts/diagnosticarDuplicadosColeccionUsers.mjs
 *
 * Requiere el archivo de credenciales de servicio de Firebase en la raíz del
 * proyecto (el mismo que usan los demás scripts de este repo:
 * centro-operativo-cpsl-65ad52160f45.json), en tu máquina local. Este
 * script está diseñado para que TÚ lo ejecutes localmente — nunca debe
 * correr con credenciales que no sean las tuyas.
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const CREDENTIAL_CANDIDATES = [
  join(projectRoot, 'centro-operativo-cpsl-65ad52160f45.json'),
  join(projectRoot, 'firebase-service-account.json'),
];

const credentialPath = CREDENTIAL_CANDIDATES.find((p) => existsSync(p));

if (credentialPath) {
  const serviceAccount = JSON.parse(readFileSync(credentialPath, 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
  console.log(`Usando credenciales de servicio: ${credentialPath}`);
} else {
  initializeApp({ credential: applicationDefault() });
  console.log('No se encontró un archivo de credenciales conocido en la raíz del proyecto; usando credenciales por defecto del entorno (application default credentials).');
}

const db = getFirestore();

// Reproduce el mismo criterio de "es esto un UID de Firebase Auth" que se
// puede usar para distinguir documentos creados por bootstrapSync/qtSyncDaemon
// (slugs legibles) de documentos creados por el propio login (UID real:
// caracteres alfanuméricos, sin guiones bajos).
function pareceUidFirebase(docId) {
  return /^[A-Za-z0-9]{20,36}$/.test(docId) && !docId.includes('_');
}

function normalizeString(str) {
  if (!str) return '';
  return String(str).toLowerCase().trim();
}

async function main() {
  console.log('Leyendo colección "users" completa (solo lectura)...\n');
  const snap = await db.collection('users').get();
  console.log(`Total de documentos en "users": ${snap.size}\n`);

  // email normalizado -> lista de { id, role, roles, emails, name }
  const porCorreo = new Map();

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const correosDelDoc = new Set();

    if (data.email) correosDelDoc.add(normalizeString(data.email));
    if (data.corporateEmail) correosDelDoc.add(normalizeString(data.corporateEmail));
    if (data.personalEmail) correosDelDoc.add(normalizeString(data.personalEmail));
    if (Array.isArray(data.emails)) {
      data.emails.forEach((e) => correosDelDoc.add(normalizeString(e)));
    }

    correosDelDoc.forEach((correo) => {
      if (!correo) return;
      if (!porCorreo.has(correo)) porCorreo.set(correo, []);
      porCorreo.get(correo).push({
        docId: docSnap.id,
        pareceUid: pareceUidFirebase(docSnap.id),
        role: data.role ?? null,
        roles: data.roles ?? null,
        name: data.name ?? data.nombre ?? null,
        sede: data.sede ?? null,
      });
    });
  });

  const duplicados = [...porCorreo.entries()].filter(([, docs]) => docs.length > 1);

  console.log('='.repeat(70));
  console.log(`Correos con MÁS DE UN documento en "users": ${duplicados.length}`);
  console.log('='.repeat(70));

  if (duplicados.length === 0) {
    console.log('\nNo se encontraron correos con documentos duplicados en "users".');
    console.log('Esto descartaría la hipótesis del doc-ID mismatch como causa principal.');
  } else {
    duplicados.forEach(([correo, docs]) => {
      console.log(`\nCorreo: ${correo}`);
      docs.forEach((d) => {
        console.log(
          `  - docId="${d.docId}" ${d.pareceUid ? '(parece UID de Firebase Auth)' : '(parece slug/ID manual)'} | role=${d.role} | roles=${JSON.stringify(d.roles)} | nombre=${d.name} | sede=${d.sede}`
        );
      });
    });
  }

  // Resumen adicional: cuántos documentos totales "parecen slug" vs "parecen UID"
  let totalSlug = 0;
  let totalUid = 0;
  snap.forEach((docSnap) => {
    if (pareceUidFirebase(docSnap.id)) totalUid++;
    else totalSlug++;
  });

  console.log('\n' + '='.repeat(70));
  console.log('RESUMEN GENERAL (todos los documentos de "users", no solo duplicados)');
  console.log('='.repeat(70));
  console.log(`Documentos cuyo ID parece un UID de Firebase Auth: ${totalUid}`);
  console.log(`Documentos cuyo ID parece un slug/ID manual (bootstrap/sync): ${totalSlug}`);
  console.log('\nEste script no modificó ni borró nada. Es solo lectura.');
}

main().catch((err) => {
  console.error('Error ejecutando el diagnóstico:', err);
  process.exit(1);
});
