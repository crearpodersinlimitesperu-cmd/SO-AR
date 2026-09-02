import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// (02/09/2026) NO se importa desde ./src/data/usersData.js porque ese archivo,
// a su vez, hace `import ... from './usersToImport'` SIN extensión — Vite lo
// resuelve solo (así compila la app normalmente), pero el runtime plano de
// Node ESM (node script.mjs, sin bundler) exige extensión explícita y falla
// con ERR_MODULE_NOT_FOUND. Para no arriesgarnos a tocar ese archivo de la app
// (fuera del alcance de este diagnóstico), se copian aquí, IDÉNTICAS, las dos
// funciones que este script necesita de src/data/usersData.js.
const OPERATIONAL_SEDES = [
  'Lima',
  'Quito',       // Ciclo 1 + Ciclo 2 fusionados (operan juntos)
  'Cuenca',
  'Guayaquil',
  'Medellín',
  'México'
];

const normalizeSede = (sede) => {
  if (!sede) return 'Sede Global';
  const s = sede.trim();
  if (s === 'MED' || s.toLowerCase().includes('medell')) return 'Medellín';
  if (s === 'LIM' || s.toLowerCase().includes('lima')) return 'Lima';
  if (s === 'CUE' || s.toLowerCase().includes('cuenca')) return 'Cuenca';
  if (s === 'GYE' || s.toLowerCase().includes('guayaquil')) return 'Guayaquil';
  if (s === 'MEX' || s.toUpperCase() === 'CDMX' || s.toLowerCase().includes('mex') || s.toLowerCase().includes('méxico') || s.toLowerCase().includes('cdmx')) return 'México';
  if (s === 'UIO-C1' || s === 'UIO-C2' || s === 'UIO' ||
      s.toLowerCase().includes('ciclo 1') || s.toLowerCase().includes('ciclo1') ||
      s.toLowerCase().includes('ciclo 2') || s.toLowerCase().includes('ciclo2') ||
      s.toLowerCase().includes('quito')) return 'Quito';
  if (s === 'INT' || s.toLowerCase().includes('intern')) return 'Internacional';
  if (s.toLowerCase().includes('global')) return 'Sede Global';
  return s;
};

// ============================================================================
// DIAGNÓSTICO DE TRAZABILIDAD (02/09/2026) — SOLO LECTURA, NO ESCRIBE NADA.
// Pedido de José: "recuperar la trazabilidad del perfil de Erika, esto no
// puede volver a ocurrir jamás con ningún perfil, revisar todos los perfiles
// y su coherencia".
//
// Hipótesis a verificar (basada en lectura del código, NO confirmada todavía):
// El progreso del checklist (ChecklistContext.jsx) se guarda en un mapa
// "completions" DENTRO de cada documento de /tasks, indexado por
// currentUser.sede.trim() SIN normalizar (no pasa por normalizeSede()).
// Si el valor real de "sede" en el perfil de una persona no coincide byte a
// byte con la clave bajo la que se guardó su progreso antes, su % se ve en 0
// aunque el progreso real siga existiendo en Firestore bajo otra clave.
// ============================================================================

const KEY_FILE = './centro-operativo-cpsl-65ad52160f45.json';
const serviceAccount = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const ERIKA_EMAILS = ['erika.gavilanez@crearpsl.net'];

async function diagnosticarErika() {
  console.log('\n========== 1) PERFIL DE ERIKA (users + staff_directory) ==========');

  const usersSnap = await db.collection('users').get();
  const matches = [];
  usersSnap.forEach(doc => {
    const d = doc.data();
    const emails = [d.email, ...(Array.isArray(d.emails) ? d.emails : [])].filter(Boolean).map(e => String(e).toLowerCase());
    if (emails.some(e => ERIKA_EMAILS.includes(e)) || (d.name || '').toLowerCase().includes('gavilanez') || (d.name || '').toLowerCase().includes('gavilánez')) {
      matches.push({ collection: 'users', docId: doc.id, ...d });
    }
  });

  const staffSnap = await db.collection('staff_directory').get();
  staffSnap.forEach(doc => {
    const d = doc.data();
    const emails = [d.email, ...(Array.isArray(d.emails) ? d.emails : [])].filter(Boolean).map(e => String(e).toLowerCase());
    if (emails.some(e => ERIKA_EMAILS.includes(e)) || (d.name || '').toLowerCase().includes('gavilanez') || (d.name || '').toLowerCase().includes('gavilánez')) {
      matches.push({ collection: 'staff_directory', docId: doc.id, ...d });
    }
  });

  if (matches.length === 0) {
    console.log('No se encontró ningún documento en users/ ni staff_directory/ que coincida con Erika. (DATO FALTANTE)');
  }
  matches.forEach(m => {
    console.log(`\n-- [${m.collection}] docId="${m.docId}" --`);
    console.log('  name:', m.name);
    console.log('  email:', m.email, ' emails:', JSON.stringify(m.emails));
    console.log('  role:', m.role, ' roles:', JSON.stringify(m.roles));
    console.log('  sede (VALOR CRUDO, sin normalizar):', JSON.stringify(m.sede));
    console.log('  sede normalizada (normalizeSede):', JSON.stringify(normalizeSede(m.sede)));
  });

  console.log('\n========== 2) BUSCAR SU PROGRESO REAL EN /tasks (mapa completions) ==========');
  const tasksSnap = await db.collection('tasks').get();
  console.log(`Total de documentos en /tasks: ${tasksSnap.size}`);

  const sedeKeysEncontradas = new Set();
  let tasksConCompletionsRelevantes = 0;
  const erikaSedeCruda = matches[0]?.sede ? String(matches[0].sede).trim() : null;

  tasksSnap.forEach(doc => {
    const d = doc.data();
    if (d.role !== 'coord_maestria' && d.role !== 'coordinador_mj') return;
    if (d.completions && typeof d.completions === 'object') {
      Object.keys(d.completions).forEach(k => sedeKeysEncontradas.add(k));
      if (erikaSedeCruda && Object.prototype.hasOwnProperty.call(d.completions, erikaSedeCruda)) {
        tasksConCompletionsRelevantes++;
      }
    }
  });

  console.log('\nClaves de "sede" encontradas en TODOS los completions de tareas coord_maestria/coordinador_mj:');
  console.log(JSON.stringify(Array.from(sedeKeysEncontradas).sort(), null, 2));
  console.log(`\nSede cruda actual de Erika: ${JSON.stringify(erikaSedeCruda)}`);
  console.log(`¿Coincide EXACTAMENTE con alguna clave de completions?`, sedeKeysEncontradas.has(erikaSedeCruda));
  console.log(`Tareas coord_maestria con progreso guardado bajo su clave exacta: ${tasksConCompletionsRelevantes}`);

  // Buscar variantes cercanas (mismo texto normalizado, distinta clave cruda)
  if (erikaSedeCruda) {
    const erikaNorm = normalizeSede(erikaSedeCruda).toLowerCase();
    const variantesCercanas = Array.from(sedeKeysEncontradas).filter(k => k !== erikaSedeCruda && normalizeSede(k).toLowerCase() === erikaNorm);
    console.log(`\nClaves DISTINTAS a la suya pero que normalizan al mismo lugar (posible causa raíz):`, JSON.stringify(variantesCercanas));
  }

  console.log('\n========== 3) DETALLE de cada tarea base coord_maestria/coordinador_mj para Erika ==========');
  tasksSnap.forEach(doc => {
    const d = doc.data();
    if (d.role !== 'coord_maestria' && d.role !== 'coordinador_mj') return;
    console.log(`\n[${doc.id}] "${(d.task || '').slice(0, 70)}..."`);
    console.log('  completions:', JSON.stringify(d.completions || {}));
  });
}

async function auditarCoherenciaTodosLosPerfiles() {
  console.log('\n\n========== 4) AUDITORÍA DE COHERENCIA — TODOS LOS PERFILES (users + staff_directory) ==========');
  console.log('Busca cualquier perfil cuyo campo "sede" crudo NO coincida exactamente con una de las');
  console.log('sedes oficiales, o cuya versión normalizada difiera de la cruda (riesgo del mismo bug).');
  console.log('Sedes oficiales (OPERATIONAL_SEDES):', JSON.stringify(OPERATIONAL_SEDES));

  const reportar = async (collectionName) => {
    const snap = await db.collection(collectionName).get();
    const sospechosos = [];
    snap.forEach(doc => {
      const d = doc.data();
      if (!d.sede) return;
      const cruda = String(d.sede).trim();
      const normalizada = normalizeSede(cruda);
      const esOficialExacta = OPERATIONAL_SEDES.includes(cruda);
      if (!esOficialExacta) {
        sospechosos.push({ docId: doc.id, name: d.name, email: d.email, sedeCruda: cruda, sedeNormalizada: normalizada, coincideNormalizada: OPERATIONAL_SEDES.includes(normalizada) });
      }
    });
    console.log(`\n-- ${collectionName}: ${sospechosos.length} perfil(es) con "sede" cruda distinta a las oficiales --`);
    sospechosos.forEach(s => {
      const riesgo = s.coincideNormalizada ? 'RIESGO: normaliza bien pero la clave cruda de completions puede no coincidir' : 'SIN MAPEO: normalizeSede tampoco la reconoce';
      console.log(`  [${s.docId}] ${s.name} (${s.email}) — sede cruda: ${JSON.stringify(s.sedeCruda)} → normalizada: ${JSON.stringify(s.sedeNormalizada)} — ${riesgo}`);
    });
  };

  await reportar('users');
  await reportar('staff_directory');
}

async function main() {
  await diagnosticarErika();
  await auditarCoherenciaTodosLosPerfiles();
  console.log('\n\n========== FIN DEL DIAGNÓSTICO (solo lectura, no se modificó nada) ==========');
}

main().catch(e => { console.error('ERROR FATAL:', e); process.exit(1); });
