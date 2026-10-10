import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { auditTrainerCoherence, flattenSessionAssignments } from '../src/utils/trainerCoherence.js';

const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
if (!credentials) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON requerido para lectura autorizada.');
initializeApp({ credential: cert(JSON.parse(credentials)) });
const db = getFirestore();
const read = async name => (await db.collection(name).get()).docs.map(snapshot => ({ ...snapshot.data(), docId: snapshot.id }));
const [managers, users, details, assignments] = await Promise.all([
  read('managers_directory'), read('users'), read('kpis_entrenadores_llamadas'), read('asignaciones_entrenadores'),
]);
const calls = details.filter(row => row.docId !== '_resumen').flatMap(row => row.managersList || []);
const historical = JSON.parse(readFileSync(new URL('../src/data/SEGUIMIENTO_EQUIPOS.json', import.meta.url), 'utf8'));
const cmj = (historical.Hoja1 || []).slice(2).filter(row => row['MAESTRIA DEL JUEGO '] && row.__EMPTY !== undefined)
  .map(row => ({ sede: row['MAESTRIA DEL JUEGO '], equipoNum: row.__EMPTY, entrenador: row.ENTRENADOR || '' }));
const report = auditTrainerCoherence({ managers, users, calls, cmj, sessions: flattenSessionAssignments(assignments) });
console.log(JSON.stringify({
  generatedAt: new Date().toISOString(), mode: 'read-only', records: report.records, counts: report.counts,
  repairableLabels: report.findings.filter(finding => finding.repair).length,
  cmjSource: 'repository historical SEGUIMIENTO_EQUIPOS; not live assignments',
  writes: 0,
}, null, 2));
