// check_live_rules.mjs
// SOLO LECTURA. No modifica nada. No usa el SDK de Firestore (que ignora las
// reglas por ser Admin) — en su lugar consulta directamente la Firebase Rules
// Management API para traer el CONTENIDO EXACTO del ruleset que está
// actualmente ACTIVO (publicado) en el proyecto, sin depender de lo que
// alguien copió/pegó desde la consola.
//
// Uso: node check_live_rules.mjs

import { initializeApp, cert } from 'firebase-admin/app';
import { readFileSync } from 'fs';
import https from 'https';

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
const projectId = serviceAccount.project_id;

const app = initializeApp({ credential: cert(serviceAccount) });

function httpsGet(url, token) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { Authorization: `Bearer ${token}` } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error(`Respuesta no-JSON (status ${res.statusCode}): ${data}`)); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const tokenInfo = await app.options.credential.getAccessToken();
  const token = tokenInfo.access_token;

  console.log(`Proyecto: ${projectId}`);
  console.log('Consultando release activo de Firestore (cloud.firestore)...\n');

  const releaseUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`;
  const release = await httpsGet(releaseUrl, token);
  console.log('=== METADATA DEL RELEASE ACTIVO ===');
  console.log(JSON.stringify({
    name: release.name,
    rulesetName: release.rulesetName,
    createTime: release.createTime,
    updateTime: release.updateTime
  }, null, 2));

  const rulesetName = release.rulesetName;
  if (!rulesetName) {
    console.log('\nNo se pudo determinar el ruleset activo desde la respuesta.');
    process.exit(1);
  }

  const rulesetUrl = `https://firebaserules.googleapis.com/v1/${rulesetName}`;
  const ruleset = await httpsGet(rulesetUrl, token);

  console.log('\n=== RULESET: metadata ===');
  console.log(JSON.stringify({ name: ruleset.name, createTime: ruleset.createTime }, null, 2));

  const source = ruleset.source?.files?.[0]?.content || '(no se encontró contenido de origen en la respuesta)';
  console.log('\n=== CONTENIDO REAL Y ACTUAL DE firestore.rules EN PRODUCCIÓN ===\n');
  console.log(source);

  process.exit(0);
}

run().catch(err => {
  console.error('\nError consultando el ruleset activo:', err.message);
  console.error('\nSi el error es de permisos (PERMISSION_DENIED), la cuenta de servicio no tiene el rol necesario (Firebase Rules Viewer / Editor de proyecto) para leer rulesets vía API — habría que revisar en Firebase Console manualmente en ese caso.');
  process.exit(1);
});
