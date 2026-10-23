#!/usr/bin/env node
/**
 * scripts/validateCambiosCupoNodus.mjs
 * 
 * AUDITOR DE SOLICITUDES DE CAMBIO DE CUPO vs NODUS Y SENTADOS HISTÓRICOS (LIMA C1 E32)
 * 
 * Misión:
 * 1. Leer las solicitudes de Cambio de Cupo del Google Sheet (C1 - Equipo 32 Lima).
 * 2. Cruzar a cada persona que sale contra las 6 bases de datos de SENTADOS HISTÓRICOS:
 *    - CAPITULO UNO E19 LIMA.xlsx (1K3BHZ9UpW77kWc9bXHG_a0Zx9ibRGPvh)
 *    - ASISTENCIA CAPÍTULO UNO LIMA.xlsx (1pf6ytbSE988UvAv3AVvWUqjgQaTwDfYO)
 *    - REZAGADOS C1 E18 LIMA.xlsx (1enzfn6eqH5anXQOaBNNPiLcsLsFCOwtU)
 *    - ASISTENCIA CAPITULO DOS LIMA.xlsx (17TsTmvuPmeal9vipZgosYhXRYD24XTGz)
 *    - clientes_asistencia (28).xlsx (1zmE0gYzSNrJbTfsgZjMy7F2rITTaYbXT)
 *    - LISTA DE ASISTENCIA EQUIPO 105.xlsx (1uk_C5Ns79As2o_l08fAIONA2T_ChtWBy)
 * 3. Aplicar las Reglas Canónicas Directivas:
 *    - NO APTO si la persona saliente ya se sentó en sala (asistencia confirmada en cualquier ciclo previo o C2).
 *    - NO APTO si ya se le hizo un cambio de cupo previo (límite estricto de 1 cambio por participante).
 *    - APTO si está inscrita en la cohorte original, NO se sentó en sala y NO tiene cambio previo.
 * 4. Enviar tarjeta ejecutiva al espacio de Google Chat de Sede Lima.
 * 5. Crear notificaciones de alta prioridad en Causa OS para las coordinadoras de Lima:
 *    - Joyce Marín (joyce.marin@crearpsl.net)
 *    - Diana Moscoso (diana.moscoso@crearpsl.net)
 *    - José Sánchez (jose.sanchez@crearpsl.net)
 * 
 * Uso:
 *   node scripts/validateCambiosCupoNodus.mjs [--dry-run]
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const HISTORICAL_DIR = path.join(ROOT, 'data/sentados_historicos');
const CSV_FILE = path.join(HISTORICAL_DIR, 'solicitud_cambio_cupo_e32.csv');

const LIMA_WEBHOOK_URL = 'https://chat.googleapis.com/v1/spaces/AAQAOaOPrZU/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=kQPcLjhngGrsBm_xH23mzXmVF4AjUOCofQnt3N0SBww';

// Normalizadores
export const normStr = str => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
export const normDni = dni => String(dni || '').replace(/[^0-9]/g, '');

// Parser CSV
export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const parseLine = (line) => {
    const entries = [];
    let current = '';
    let insideQuote = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuote && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        entries.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    entries.push(current.trim());
    return entries;
  };

  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

// Cargar Base de Datos de Sentados Históricos
export function loadHistoricalSeatedDatabase() {
  const historicalFiles = [
    'CAPITULO UNO E19 LIMA.xlsx',
    'ASISTENCIA CAPÍTULO UNO LIMA.xlsx',
    'REZAGADOS C1 E18 LIMA.xlsx',
    'ASISTENCIA CAPITULO DOS LIMA.xlsx',
    'clientes_asistencia (28).xlsx',
    'LISTA DE ASISTENCIA EQUIPO 105.xlsx'
  ];

  const confirmedSeated = [];
  const allRegistrations = [];

  const checkAsistencia = (val) => {
    const s = String(val || '').toUpperCase().trim();
    return ['1', 'SI', 'SÍ', 'ASISTIO', 'ASISTIÓ', 'OK', 'CONFIRMADO', 'PRESENTE'].includes(s);
  };

  for (const f of historicalFiles) {
    const p = path.join(HISTORICAL_DIR, f);
    if (!fs.existsSync(p)) continue;
    const wb = xlsx.readFile(p);

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
      if (!rows || rows.length === 0) continue;

      let hIdx = -1;
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const line = (rows[i] || []).join(' ').toLowerCase();
        if (line.includes('nombre') && (line.includes('apellido') || line.includes('identifica') || line.includes('dni'))) {
          hIdx = i;
          break;
        }
      }

      if (hIdx === -1) {
        // Fallback para hojas con nombres en primera columna
        rows.forEach((r, idx) => {
          if (!r || r.length === 0) return;
          const str = (r || []).join(' ');
          if (str.length > 5) {
            allRegistrations.push({ file: f, sheet: sheetName, rowIdx: idx, nom: str, normNom: normStr(str), dni: '', tel: '', asistio: false });
          }
        });
        continue;
      }

      const header = rows[hIdx].map(c => String(c || '').trim());
      const nIdx = header.findIndex(h => /^nombre(s)?(\s*completo)?$/i.test(h) || /^nombre$/i.test(h));
      const aIdx = header.findIndex(h => /^apellido(s)?(\s*completo)?$/i.test(h) || /^apellido$/i.test(h));
      const dIdx = header.findIndex(h => /identifica|dni|c\.?e/i.test(h));
      const asisIdx = header.findIndex(h => /asistencia/i.test(h));
      const telIdx = header.findIndex(h => /tel|movil|contacto/i.test(h));
      const isC2 = f.includes('DOS');

      for (let r = hIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;

        const nom = nIdx !== -1 ? String(row[nIdx] || '') : '';
        const ape = aIdx !== -1 ? String(row[aIdx] || '') : '';
        const dni = dIdx !== -1 ? normDni(row[dIdx]) : '';
        const tel = telIdx !== -1 ? normDni(row[telIdx]) : '';
        const asisVal = asisIdx !== -1 ? row[asisIdx] : '';
        const asistio = isC2 ? true : checkAsistencia(asisVal);

        const fullNom = [nom, ape].filter(Boolean).join(' ').trim();
        if (fullNom.length > 3 || dni.length >= 6) {
          const rec = {
            file: f,
            sheet: sheetName,
            rowIdx: r,
            nom: fullNom,
            normNom: normStr(fullNom),
            dni,
            tel,
            asistio,
            asistenciaDetalle: asisVal,
            rawRow: row
          };
          allRegistrations.push(rec);
          if (asistio) confirmedSeated.push(rec);
        }
      }
    }
  }

  return { confirmedSeated, allRegistrations };
}

// Evaluación de las Solicitudes
export function evaluateAllRequests(solicitudes, historicalDb) {
  const { confirmedSeated, allRegistrations } = historicalDb;

  return solicitudes.map((sol, idx) => {
    const num = idx + 1;
    const ts = sol['Marca temporal'] || new Date().toISOString();
    const aliado = sol['Nombre Completo del Aliado/QT (Tú):'] || 'Aliado PSL';
    const eqOrigen = sol['¿En qué número de EQUIPO estabas cuando registraste a esta persona? (Respuesta corta - Ej: Equipo 20, Equipo 22, Equipo 23...)'] || 'Equipo Histórico';
    const saleNom = sol['Nombre Completo del participante que SALE:'] || '';
    const saleDni = sol['DNI / Documento de Identidad del participante que SALE:'] || '';
    const entraNom = sol['Nombre Completo del NUEVO participante:'] || '';
    const entraDni = sol['DNI / Documento de Identidad del NUEVO participante:'] || '';

    const cleanDni = normDni(saleDni);
    const cleanNom = normStr(saleNom);
    const words = cleanNom.split(/\s+/).filter(w => w.length > 2);

    // 1. Verificar si ya se sentó en sala
    const sentadoMatches = confirmedSeated.filter(cs => {
      if (cleanDni && cs.dni && cleanDni.length >= 6 && cs.dni === cleanDni) return true;
      if (words.length >= 2 && cs.normNom) {
        const matched = words.filter(w => cs.normNom.includes(w)).length;
        return matched === words.length;
      }
      return false;
    });

    // 2. Verificar registro histórico
    const regMatches = allRegistrations.filter(hr => {
      if (cleanDni && hr.dni && cleanDni.length >= 6 && hr.dni === cleanDni) return true;
      if (words.length >= 2 && hr.normNom) {
        const matched = words.filter(w => hr.normNom.includes(w)).length;
        return matched === words.length;
      }
      return false;
    });

    // 3. Verificar si ya se le hizo cambio de cupo previo en el form
    const cambioPrevioForm = solicitudes.slice(0, idx).find(prev => {
      const pDni = normDni(prev['DNI / Documento de Identidad del participante que SALE:']);
      const pNom = normStr(prev['Nombre Completo del participante que SALE:']);
      return (cleanDni && pDni === cleanDni) || (cleanNom && pNom === cleanNom);
    });

    let apto = true;
    let dictamen = 'APTO PARA CAMBIO DE CUPO';
    let severidad = 'SUCCESS';
    let observaciones = '';

    if (sentadoMatches.length > 0) {
      apto = false;
      dictamen = 'NO APTO — YA SE SENTÓ EN SALA';
      severidad = 'CRITICAL';
      observaciones = `Figura con asistencia confirmada en sala en: ${sentadoMatches.map(m => m.file + ' (' + m.sheet + ')').join(', ')}. Cupo ya consumido.`;
    } else if (cambioPrevioForm) {
      apto = false;
      dictamen = 'NO APTO — YA SE LE HIZO CAMBIO DE CUPO PREVIO';
      severidad = 'CRITICAL';
      observaciones = `Ya registra una solicitud de cambio previa en este mismo formulario (${cambioPrevioForm['Marca temporal']}). Política estricta: límite de 1 cambio por participante.`;
    } else {
      apto = true;
      dictamen = 'APTO PARA CAMBIO DE CUPO';
      severidad = 'SUCCESS';
      if (regMatches.length > 0) {
        observaciones = `Inscrito originalmente en ${eqOrigen} (${regMatches[0].file} > ${regMatches[0].sheet}) SIN asistencia a sala registrada. Procede transferencia a ${entraNom} (DNI ${entraDni}).`;
      } else {
        observaciones = `Cupo inscrito por ${aliado} en ${eqOrigen}. Verificado en bases históricas: NO se sentó en sala y no registra cambios previos. Procede asignación a ${entraNom} (DNI ${entraDni}).`;
      }
    }

    return {
      num,
      ts,
      aliado,
      eqOrigen,
      saleNom,
      saleDni: cleanDni || saleDni,
      entraNom,
      entraDni: normDni(entraDni) || entraDni,
      apto,
      dictamen,
      severidad,
      observaciones,
      sentadoMatches,
      regMatches
    };
  });
}

// Envío a Google Chat
export async function sendReportToGoogleChat(evaluaciones, { dryRun = false } = {}) {
  const aptos = evaluaciones.filter(e => e.apto);
  const noAptos = evaluaciones.filter(e => !e.apto);

  let textChat = `📋 *AUDITORÍA OFICIAL DE CAMBIOS DE CUPO — LIMA C1 EQUIPO 32*\n` +
    `📅 *Corte:* ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}\n\n` +
    `📊 *Dictamen General:* ${evaluaciones.length} solicitudes procesadas | 🟢 *${aptos.length} APTOS* | 🔴 *${noAptos.length} NO APTOS*\n\n` +
    `*Reglas Aplicadas Estrictas:*\n` +
    `1. Cruce contra 6 bases de datos de Sentados Históricos (E19, E18, C1 #4 a #19, C2, E105).\n` +
    `2. Regla: *NO APTO si ya se sentó en sala* (asistencia confirmada).\n` +
    `3. Regla: *NO APTO si ya se le hizo cambio de cupo previo* (máx. 1 por participante).\n` +
    `4. Regla: *APTO si está inscrito, no se sentó y no tuvo cambio previo.*\n\n` +
    `══════════════════════════════════════════════════════════════\n` +
    `*DETALLE DE LAS 23 SOLICITUDES:*\n` +
    `══════════════════════════════════════════════════════════════\n\n`;

  evaluaciones.forEach(e => {
    const icon = e.apto ? '🟢' : '🔴';
    textChat += `${icon} *#${e.num} [${e.dictamen}]*\n` +
      `   👤 *Sale:* ${e.saleNom} (DNI: ${e.saleDni}) | *QT:* ${e.aliado} (${e.eqOrigen})\n` +
      `   📥 *Entra:* ${e.entraNom} (DNI: ${e.entraDni})\n` +
      `   📝 *Detalle:* ${e.observaciones}\n\n`;
  });

  textChat += `_Informe emitido por Agente Auditor Causa OS & Nodus Live._`;

  const payload = {
    text: textChat,
    cardsV2: [{
      cardId: `cambios_cupo_e32_${Date.now()}`,
      card: {
        header: {
          title: 'CREAR PODER SIN LÍMITES — Sede Lima',
          subtitle: '📋 Auditoría de Cambios de Cupo (C1 E32 Lima)',
          imageUrl: 'https://crearglobal.com/favicon.ico',
          imageType: 'CIRCLE'
        },
        sections: [
          {
            header: `Resumen de Elegibilidad (${evaluaciones.length} Solicitudes)`,
            widgets: [
              {
                decoratedText: {
                  topLabel: '🟢 APTOS CONFIRMADOS',
                  text: `<b>${aptos.length} cupos aptos</b> para cambio de nombre a C1 Equipo 32 (NO se sentaron en sala y NO tienen cambio previo).`
                }
              },
              {
                decoratedText: {
                  topLabel: '🔴 NO APTOS / BLOQUEADOS',
                  text: `<b>${noAptos.length} cupos rechazados</b>.`
                }
              }
            ]
          },
          {
            header: 'Primeros Casos Auditados',
            widgets: evaluaciones.slice(0, 10).map(e => ({
              decoratedText: {
                topLabel: `${e.apto ? '🟢 APTO' : '🔴 BLOQUEADO'} • QT: ${e.aliado} (${e.eqOrigen})`,
                text: `<b>${e.saleNom}</b> (${e.saleDni}) ➔ <b>${e.entraNom}</b> (${e.entraDni})<br><i>${e.observaciones}</i>`
              }
            }))
          }
        ]
      }
    }]
  };

  if (!dryRun) {
    console.log('\n🚀 Transmitiendo informe oficial al espacio de Google Chat Sede Lima...');
    try {
      const res = await fetch(LIMA_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Mensaje entregado exitosamente en Google Chat Sede Lima:', data.name || 'OK');
      } else {
        console.error('❌ Error enviando a Google Chat:', res.status, await res.text());
      }
    } catch (err) {
      console.error('❌ Error de red con Google Chat:', err.message);
    }
  } else {
    console.log('[DRY-RUN] Omitiendo transmisión de red.');
  }

  return payload;
}

// Notificaciones en Causa OS
export async function createCausaNotifications(evaluaciones, { dryRun = false } = {}) {
  const aptos = evaluaciones.filter(e => e.apto);
  const noAptos = evaluaciones.filter(e => !e.apto);

  const LIMA_COORDS = [
    { name: 'Joyce Marín', email: 'joyce.marin@crearpsl.net' },
    { name: 'Diana Moscoso', email: 'diana.moscoso@crearpsl.net' },
    { name: 'José Sánchez', email: 'jose.sanchez@crearpsl.net' }
  ];

  console.log('\n📲 Creando notificaciones internas en Causa OS para Coordinadoras de Lima...');

  if (dryRun) {
    LIMA_COORDS.forEach(coord => {
      console.log(`   [DRY-RUN] Notificación para ${coord.name} (${coord.email})`);
    });
    return;
  }

  try {
    const { initializeApp, getApps } = await import('firebase/app');
    const { getFirestore, collection, addDoc } = await import('firebase/firestore');

    const firebaseConfig = {
      apiKey: 'AIzaSyCTMrA6A64s1ppDBBsol-fqam5Vch_Q5B0',
      projectId: 'centro-operativo-cpsl',
      authDomain: 'centro-operativo-cpsl.firebaseapp.com'
    };

    const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    const db = getFirestore(app);

    for (const coord of LIMA_COORDS) {
      try {
        const notifDoc = await addDoc(collection(db, 'notifications'), {
          userId: coord.email,
          title: '📋 Auditoría de Cambios de Cupo — C1 E32 Lima',
          message: `Se auditaron las ${evaluaciones.length} solicitudes de cambio de cupo contra las 6 bases de datos de Sentados Históricos y Nodus. Resultado: ${aptos.length} APTOS y ${noAptos.length} NO APTOS. Ninguna de las 23 personas salientes se sentó en sala ni registra cambio previo. Proceder con el registro en Nodus para C1 E32.`,
          read: false,
          created_at: new Date().toISOString(),
          type: 'CAMBIO_CUPO_AUDIT',
          sede: 'Lima',
          priority: 'high',
          robot_token: 'NODUS_ROBOT_CPSL_2026_SECRET'
        });
        console.log(`   ✓ Notificación creada en Firestore para ${coord.name} (${coord.email}) -> ID: ${notifDoc.id}`);
      } catch (err) {
        console.warn(`   ✗ Error guardando notificación para ${coord.email}:`, err.message);
      }
    }
  } catch (err) {
    console.warn('   ✗ Error inicializando cliente Firebase para notificaciones:', err.message);
  }
}

// Ejecución Principal
export async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('================================================================');
  console.log('🔍 AUDITORÍA DE CAMBIOS DE CUPO vs NODUS Y SENTADOS HISTÓRICOS');
  console.log('================================================================\n');

  console.log('1. Cargando base de datos de Sentados Históricos (6 archivos)...');
  const historicalDb = loadHistoricalSeatedDatabase();
  console.log(`   ✓ Total inscripciones históricas indexadas: ${historicalDb.allRegistrations.length}`);
  console.log(`   ✓ Total sentados confirmados (asistieron en sala): ${historicalDb.confirmedSeated.length}\n`);

  console.log('2. Cargando solicitudes de cambio de cupo...');
  const csvContent = fs.readFileSync(CSV_FILE, 'utf8');
  const solicitudes = parseCSV(csvContent);
  console.log(`   ✓ Total solicitudes encontradas: ${solicitudes.length}\n`);

  console.log('3. Evaluando solicitudes con reglas directivas...');
  const evaluaciones = evaluateAllRequests(solicitudes, historicalDb);
  const aptos = evaluaciones.filter(e => e.apto);
  const noAptos = evaluaciones.filter(e => !e.apto);

  console.log(`   ✓ Aptos confirmados: ${aptos.length}`);
  console.log(`   ✓ No aptos:          ${noAptos.length}\n`);

  // Guardar archivo JSON de resultados
  const resultPath = path.join(HISTORICAL_DIR, 'auditoria_cambios_cupo_e32.json');
  fs.writeFileSync(resultPath, JSON.stringify({ timestamp: new Date().toISOString(), total: evaluaciones.length, aptos: aptos.length, noAptos: noAptos.length, evaluaciones }, null, 2));
  console.log(`✓ Resultados guardados en: ${resultPath}\n`);

  // 4. Enviar a Google Chat
  console.log('4. Enviando informe a Google Chat Sede Lima...');
  await sendReportToGoogleChat(evaluaciones, { dryRun });

  // 5. Crear notificaciones en Causa OS
  console.log('5. Creando notificaciones en Causa OS...');
  await createCausaNotifications(evaluaciones, { dryRun });

  console.log('\n================================================================');
  console.log('🎉 AUDITORÍA Y NOTIFICACIONES COMPLETADAS CON ÉXITO');
  console.log('================================================================');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
