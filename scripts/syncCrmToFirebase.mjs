/**
 * syncCrmToFirebase.mjs
 * =====================
 * Puente CRM -> Firebase - CREAR PODER SIN LIMITES
 *
 * Lee el Google Sheet central del CRM CREAR LIMA y sincroniza los participantes
 * hacia la coleccion `participants` en Firebase (Causa OS).
 *
 * SEGURO: usa merge:true, NUNCA borra datos existentes
 * INTELIGENTE: aplica la misma logica de clasificacion del CRM original
 * SIN REDUNDANCIA: la clave primaria es el DNI normalizado
 * CON RESPALDO: ejecuta backup automatico al inicio
 *
 * Uso:
 *   node scripts/syncCrmToFirebase.mjs
 *   node scripts/syncCrmToFirebase.mjs --dry-run   (solo muestra, no escribe)
 */

import { google } from 'googleapis';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const KEY_FILE = './centro-operativo-cpsl-65ad52160f45.json';
const DRY_RUN = process.argv.includes('--dry-run');

const SHEET_ID_MASTER = '1IoCYs1qfOTdn3XWyeK64jsUfAXOFgv3Wa6uJBM-lR2Y';
const COLLECTION_PARTICIPANTS = 'participants';

if (!fs.existsSync(KEY_FILE)) {
  console.error('No se encontro el archivo de credenciales: ' + KEY_FILE);
  process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const auth = new google.auth.GoogleAuth({
  keyFile: KEY_FILE,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheetsApi = google.sheets({ version: 'v4', auth });

// ---- Helpers de normalizacion (espejo del CRM Python) ----

const normStr = (s) =>
  String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const normDni = (s) => String(s || '').replace(/\.0$/, '').trim();

const normPhone = (s) => {
  const clean = String(s || '').replace(/\D/g, '');
  if (clean.length === 9 && clean.startsWith('9')) return '51' + clean;
  if (clean.length === 11 && clean.startsWith('51')) return clean;
  return clean;
};

const clasificarEstado = (asistencia, resultadoGestion) => {
  const a = normStr(asistencia);
  const r = normStr(resultadoGestion || '');
  if (a.includes('desertor')) return 'DESERTOR';
  const confirmadoKeys = ['confirmado', 'sentado', 'asistio', 'presente', 'asistira'];
  if (a === 'si' || a === 'si' || confirmadoKeys.some(k => a.includes(k))) return 'SENTADO';
  if (a.includes('rezag')) return 'REZAGADO';
  const noContactoKeys = ['pendiente', 'no contesta', 'apagado', 'numero equivocado', 'buzon'];
  if (noContactoKeys.some(k => r.includes(k) || a.includes(k))) return 'NO_CONTACTADO';
  if (r.includes('no le interesa')) return 'NO_INTERESA';
  if (r.includes('por confirmar') || r.includes('siguiente')) return 'POR_CONFIRMAR';
  return 'PENDIENTE';
};

const normCoordinadora = (s) => {
  const n = normStr(s);
  if (n.includes('diana') || n.includes('moscoso'))  return 'Diana Moscoso';
  if (n.includes('joyce') || n.includes('marin'))    return 'Joyce Marin';
  if (n.includes('jasmin') || n.includes('sanchez')) return 'Jasmin Sanchez';
  if (n.includes('linid'))                           return 'Linid';
  if (n.includes('leyla'))                           return 'Leyla';
  return s || 'Sin Asignar';
};

const getCol = (obj, aliases) => {
  for (const alias of aliases) {
    const key = Object.keys(obj).find(k => normStr(k) === normStr(alias));
    if (key && obj[key]) return obj[key];
  }
  return '';
};

const rowsToObjects = (rows) => {
  if (!rows || rows.length < 2) return [];
  const header = rows[0].map(h => String(h || '').trim());
  return rows.slice(1).map(row => {
    const obj = {};
    header.forEach((h, i) => { obj[h] = String(row[i] || '').trim(); });
    return obj;
  });
};

async function readSheet(sheetId, range) {
  try {
    const res = await sheetsApi.spreadsheets.values.get({ spreadsheetId: sheetId, range });
    return res.data.values || [];
  } catch (e) {
    console.warn('No se pudo leer ' + range + ': ' + e.message);
    return [];
  }
}

async function syncCrmToFirebase() {
  const startTime = Date.now();
  console.log('\n=== Sincronizacion CRM -> Firebase (Causa OS) ===');
  if (DRY_RUN) console.log('   MODO DRY-RUN: No se escribira nada en Firebase.\n');

  if (!DRY_RUN) {
    console.log('Ejecutando backup de seguridad antes de sincronizar...');
    try {
      execSync('node scripts/backupBeforeCrmSync.mjs', { stdio: 'inherit' });
    } catch (e) {
      console.warn('Backup fallo, pero continuamos:', e.message);
    }
  }

  console.log('\nLeyendo Google Sheet maestro del CRM...');
  const masterRows = await readSheet(SHEET_ID_MASTER, "'Hoja 1'!A1:Z3000");
  const masterData = rowsToObjects(masterRows);
  console.log('   Hoja 1: ' + masterData.length + ' registros leidos.');

  const prodRows = await readSheet(SHEET_ID_MASTER, "'PRODUCTIVIDAD'!A1:Z3000");
  const prodData = rowsToObjects(prodRows);
  console.log('   PRODUCTIVIDAD: ' + prodData.length + ' registros leidos.');

  const prodByDni = {};
  for (const p of prodData) {
    const dni = normDni(getCol(p, ['ClienteId', 'DNI', 'Identificacion', 'Cedula']));
    if (dni) prodByDni[dni] = p;
  }

  console.log('\nProcesando y clasificando participantes...');
  const participantesMap = new Map();
  let stats = { total: 0, sentados: 0, desertores: 0, pendientes: 0, sinDni: 0, rezagados: 0 };

  for (const row of masterData) {
    const dni = normDni(getCol(row, ['DNI', 'Identificacion', 'Cedula', 'Identificacin', 'Identificacion']));
    const nombres = getCol(row, ['Nombres', 'Nombre', 'NombreCompleto']);
    const apellidos = getCol(row, ['Apellidos', 'Apellido', 'ApellidoCompleto']);

    if (!dni && !nombres) { stats.sinDni++; continue; }

    const docId = dni || normStr(nombres + ' ' + apellidos).replace(/\s+/g, '_');

    const prod = dni ? prodByDni[dni] : null;
    const resultadoGestion = prod ? getCol(prod, ['Resultado Gestion', 'Resultado']) : '';
    const fechaGestion     = prod ? getCol(prod, ['Fecha Gestion', 'Fecha'])         : '';
    const asistencia       = getCol(row, ['Asistencia', 'Estatus C1', 'C1', 'Estado']);
    const estadoFinal      = clasificarEstado(asistencia, resultadoGestion);

    const participante = {
      dni,
      nombres,
      apellidos,
      nombreCompleto: (nombres + ' ' + apellidos).trim(),
      telefono:    normPhone(getCol(row, ['Telefono', 'Celular', 'Tel'])),
      email:       getCol(row, ['Email', 'Correo']),
      asistenciaC1:      asistencia,
      estadoC1:          estadoFinal,
      asistenciaC2:      getCol(row, ['C2', 'Estatus C2']),
      maestria:          getCol(row, ['Maestria', 'Maestra']),
      resultadoUltimaGestion: resultadoGestion,
      fechaUltimaGestion:     fechaGestion,
      coordinadora:  normCoordinadora(getCol(row, ['Coordinador', 'Coordinadora', 'CC_Reportada'])),
      imoEnrolador:  getCol(row, ['IMO', 'IMO Enrolador']),
      equipo:        getCol(row, ['Equipo', 'Origen/Equipo']),
      tipo:          getCol(row, ['Tipo']),
      rango:         getCol(row, ['Max Rango Historico', 'Rango']),
      historialTrayectoria: getCol(row, ['Historial Trayectoria']),
      fuente:           'crm_lima',
      campania:         'C1E30',
      sincronizadoEl:   new Date().toISOString(),
    };

    participantesMap.set(docId, participante);
    stats.total++;
    if (estadoFinal === 'SENTADO')       stats.sentados++;
    else if (estadoFinal === 'DESERTOR') stats.desertores++;
    else if (estadoFinal === 'REZAGADO') stats.rezagados++;
    else                                  stats.pendientes++;
  }

  console.log('\nSincronizando ' + participantesMap.size + ' participantes hacia Firebase...');

  if (!DRY_RUN) {
    const entries = Array.from(participantesMap.entries());
    const BATCH_SIZE = 490;
    let written = 0;
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const chunk = entries.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      chunk.forEach(([docId, data]) => {
        const ref = db.collection(COLLECTION_PARTICIPANTS).doc(docId);
        batch.set(ref, data, { merge: true });
      });
      await batch.commit();
      written += chunk.length;
      process.stdout.write('   Escritos: ' + written + '/' + entries.length + ' documentos...\r');
    }
    console.log('');
  } else {
    console.log('   (DRY-RUN) Se escribirian ' + participantesMap.size + ' documentos.');
    let i = 0;
    for (const [id, p] of participantesMap) {
      if (i++ >= 5) { console.log('   ...'); break; }
      console.log('   -> ' + id + ': ' + p.nombreCompleto + ' | ' + p.estadoC1 + ' | ' + p.coordinadora);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=== Sincronizacion completada en ' + elapsed + 's ===');
  console.log('   Total procesados : ' + stats.total);
  console.log('   SENTADOS         : ' + stats.sentados);
  console.log('   DESERTORES       : ' + stats.desertores);
  console.log('   REZAGADOS        : ' + stats.rezagados);
  console.log('   PENDIENTES       : ' + stats.pendientes);
  console.log('   Sin DNI (skip)   : ' + stats.sinDni);
  console.log('\n   Coleccion destino: ' + COLLECTION_PARTICIPANTS);
  console.log('   Para restaurar: node scripts/restoreCrmSync.mjs\n');
}

syncCrmToFirebase().catch((err) => {
  console.error('Error en syncCrmToFirebase:', err);
  process.exit(1);
});
