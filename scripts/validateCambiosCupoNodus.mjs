#!/usr/bin/env node
/**
 * scripts/validateCambiosCupoNodus.mjs
 * 
 * AUDITOR DE SOLICITUDES DE CAMBIO DE CUPO vs NODUS (LIMA C1 E32)
 * 
 * Misión:
 * 1. Leer las solicitudes de Cambio de Cupo del Google Sheet (C1 - Equipo 32 Lima).
 * 2. Cruzar a cada persona que sale contra el padrón y estado de Nodus:
 *    - ¿Está inscrita en Nodus? (DNI / Nombre coincidente)
 *    - ¿Se sentó en sala? (Si ya tiene asistencia registrada en C1, NO ESTÁ APTA; si no se sentó, ESTÁ APTA).
 * 3. Enviar tarjeta de resolución al espacio de Google Chat de Sede Lima.
 * 4. Notificar en Causa OS a las coordinadoras de Lima: Joyce Marín y Diana Moscoso.
 * 
 * Uso:
 *   node scripts/validateCambiosCupoNodus.mjs [--sheet-url=<url>] [--csv-file=<path>] [--dry-run]
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { sendPayloadToGoogleChat } from './sendDailyCallsReportChat.mjs';

const SPREADSHEET_ID = '1T6-kJuvIhUkqKWZ6WdZ4J1SzxAsShYgvoq9FqaL6xtA';
const KEY_FILE = './centro-operativo-cpsl-65ad52160f45.json';

// --- INICIALIZACIÓN FIRESTORE ---
let db = null;
function getDb() {
  if (db) return db;
  try {
    const rawEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    let credential = null;
    if (rawEnv && rawEnv.trim().startsWith('{')) {
      credential = cert(JSON.parse(rawEnv));
    } else if (fs.existsSync(KEY_FILE)) {
      credential = cert(JSON.parse(fs.readFileSync(KEY_FILE, 'utf8')));
    } else {
      return null;
    }
    const app = getApps()[0] || initializeApp({ credential, projectId: 'centro-operativo-cpsl' });
    db = getFirestore(app);
    return db;
  } catch (e) {
    return null;
  }
}

// --- PARSER DE CSV SIMPLE Y ROBUSTO ---
export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
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

// --- CARGA DE DATOS DE NODUS LIMA ---
export function loadNodusLimaDirectory() {
  // 1. Cargar snapshot local
  const snapshotPath = path.resolve(process.cwd(), 'nodus_latest_snapshot.json');
  let participantsList = [];

  if (fs.existsSync(snapshotPath)) {
    try {
      const snap = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
      if (snap.coordinadores) {
        const limaCoords = snap.coordinadores.filter(c => (c.sede || '').toLowerCase().includes('lima'));
        // Si hay listas de participantes en equipos
        for (const c of limaCoords) {
          if (Array.isArray(c.equipos)) {
            for (const eq of c.equipos) {
              if (Array.isArray(eq.participantes)) {
                participantsList.push(...eq.participantes);
              }
            }
          }
        }
      }
      if (snap.equiposReporte) {
        for (const eq of snap.equiposReporte) {
          if ((eq.sede || eq.equipoNombre || '').toLowerCase().includes('lima') && Array.isArray(eq.participantes)) {
            participantsList.push(...eq.participantes);
          }
        }
      }
    } catch (e) {
      console.warn('Error leyendo nodus_latest_snapshot:', e.message);
    }
  }

  // Mapa indexado por DNI / Documento y Nombre normalizado
  const byDni = new Map();
  const byName = new Map();

  const norm = str => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const p of participantsList) {
    const dni = String(p.documento || p.dni || p.identificacion || '').trim();
    const name = norm(p.nombres || p.nombre || p.nombreCompleto);
    const info = {
      dni,
      nombre: p.nombres || p.nombre || p.nombreCompleto || '',
      equipo: p.equipo || p.equipoNombre || '',
      asistio: p.asistio === true || p.asistencia === 'ASISTIO' || p.asistioCapitulo1 === true,
      estadoLlamada: p.llamada2 || p.llamada1 || p.estado || 'PENDIENTE',
      raw: p
    };
    if (dni) byDni.set(dni, info);
    if (name) byName.set(name, info);
  }

  return { byDni, byName, totalIndexed: participantsList.length };
}

// --- EVALUACIÓN DE SOLICITUD DE CAMBIO DE CUPO ---
export function evaluateCambioCupo(solicitud, nodusDirectory) {
  // Extraer campos de la solicitud
  // Los formularios de cambio de cupo típicamente preguntan:
  // "DNI de la persona que cede el cupo", "Nombres completos de quien sale", "Equipo", "Persona que recibe", etc.
  const keys = Object.keys(solicitud);
  
  const findVal = (keywords) => {
    const k = keys.find(key => keywords.some(kw => key.toLowerCase().includes(kw.toLowerCase())));
    return k ? solicitud[k] : '';
  };

  const timestamp = findVal(['marca temporal', 'timestamp', 'fecha']) || new Date().toISOString();
  const solicitanteEmail = findVal(['dirección de correo', 'email', 'correo']) || '';
  
  // Datos de quien sale (cede)
  const dniSale = findVal(['dni de la persona que cede', 'dni del participante que sale', 'dni titular', 'dni saliente', 'identificación']) ||
                  findVal(['dni']) || '';
  const nombreSale = findVal(['nombre de la persona que cede', 'nombres de quien sale', 'participante saliente', 'nombre titular', 'titular']) ||
                     findVal(['nombre']) || '';
  const equipoOrigen = findVal(['equipo al que pertenece', 'equipo actual', 'equipo origen', 'equipo']) || 'Equipo 32';

  // Datos de quien entra (recibe)
  const dniEntra = findVal(['dni de quien recibe', 'dni del nuevo participante', 'dni entrante', 'dni nuevo']) || '';
  const nombreEntra = findVal(['nombre de la persona que recibe', 'nombres del nuevo participante', 'nuevo participante', 'receptor']) || '';
  const motivo = findVal(['motivo', 'razón', 'observaciones']) || 'Solicitud de cambio de cupo regular';

  const cleanDni = String(dniSale).trim().replace(/[^0-9]/g, '');
  const cleanName = String(nombreSale).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

  let nodusRecord = cleanDni ? nodusDirectory.byDni.get(cleanDni) : null;
  if (!nodusRecord && cleanName) {
    nodusRecord = nodusDirectory.byName.get(cleanName);
  }

  // Reglas de Aptitud Canónicas de Nodus & Causa OS:
  // 1. Inscrito: debe existir en Nodus
  // 2. No haberse sentado: no debe tener asistencia a sala consumida (asistio / capitulo1 === 0)
  // 3. No haber tenido cambio de cupo previo: un cupo solo se puede cambiar una sola vez (cambioCupoPrevio === false)
  let apto = false;
  let dictamen = '';
  let severidad = 'INFO';
  let observaciones = '';

  const yaTuvoCambio = Boolean(
    nodusRecord?.cambioCupoPrevio === true ||
    nodusRecord?.cambio_cupo ||
    nodusRecord?.identificacioncambio ||
    (nodusRecord?.raw && (nodusRecord.raw.cambiocupo || nodusRecord.raw.cambio_cupo || nodusRecord.raw.identificacioncambio))
  );

  if (!nodusRecord) {
    // Si no está en el índice local de Lima
    apto = false;
    dictamen = 'OBSERVADO — NO ENCONTRADO EN PADRÓN ACTIVO NODUS';
    severidad = 'WARNING';
    observaciones = `No figura en el padrón activo de Nodus para Lima (${equipoOrigen}). Verificar si está inscrito con otro documento o si el pago aún no fue asentado en Nodus.`;
  } else if (nodusRecord.asistio) {
    apto = false;
    dictamen = 'NO APTO — CUPO YA CONSUMIDO (SE SENTÓ EN SALA)';
    severidad = 'CRITICAL';
    observaciones = `La persona ${nodusRecord.nombre} (DNI ${nodusRecord.dni}) ya figura con ASISTENCIA a sala registrada en Capítulo 1 de Nodus. No se puede transferir un cupo ya sentado.`;
  } else if (yaTuvoCambio) {
    apto = false;
    dictamen = 'NO APTO — YA SE LE HIZO CAMBIO DE CUPO PREVIO';
    severidad = 'CRITICAL';
    observaciones = `La persona ${nodusRecord.nombre} (DNI ${nodusRecord.dni}) ya registra un CAMBIO DE CUPO PREVIO en Nodus. Política estricta: límite máximo de 1 solo cambio de cupo por participante.`;
  } else {
    apto = true;
    dictamen = 'APTO PARA CAMBIO DE CUPO';
    severidad = 'SUCCESS';
    observaciones = `Inscrito en Nodus (${nodusRecord.equipo || equipoOrigen}), SIN asistencia a sala registrada y SIN cambio de cupo previo. Procede la asignación a ${nombreEntra || 'nuevo participante'}.`;
  }

  return {
    timestamp,
    solicitanteEmail,
    dniSale: cleanDni || dniSale,
    nombreSale: nodusRecord?.nombre || nombreSale,
    equipoOrigen,
    dniEntra,
    nombreEntra,
    motivo,
    apto,
    dictamen,
    severidad,
    observaciones,
    nodusRecord: nodusRecord || null
  };
}

// --- CREACIÓN DE NOTIFICACIONES EN CAUSA OS Y GOOGLE CHAT ---
export async function notifyLimaCambiosCupo(evaluaciones, { dryRun = false } = {}) {
  const aptos = evaluaciones.filter(e => e.apto && e.severidad === 'SUCCESS');
  const enRevision = evaluaciones.filter(e => e.severidad === 'WARNING');
  const noAptos = evaluaciones.filter(e => !e.apto);

  console.log(`\n============================================================`);
  console.log(`📊 RESULTADO DE EVALUACIÓN DE CAMBIOS DE CUPO (LIMA C1 E32)`);
  console.log(`============================================================`);
  console.log(`Total solicitudes:    ${evaluaciones.length}`);
  console.log(`🟢 Aptos confirmados: ${aptos.length}`);
  console.log(`🟡 En revisión:       ${enRevision.length}`);
  console.log(`🔴 No aptos / Bloq.:  ${noAptos.length}`);
  console.log(`------------------------------------------------------------`);

  for (const e of evaluaciones) {
    const icon = e.apto && e.severidad === 'SUCCESS' ? '🟢' : e.severidad === 'WARNING' ? '🟡' : '🔴';
    console.log(`${icon} [${e.dictamen}]`);
    console.log(`   👤 Sale: ${e.nombreSale} (DNI: ${e.dniSale}) [${e.equipoOrigen}]`);
    if (e.nombreEntra) console.log(`   📥 Entra: ${e.nombreEntra} (DNI: ${e.dniEntra})`);
    console.log(`   💬 Detalle: ${e.observaciones}`);
  }

  // 1. Notificación en Google Chat (Espacio Lima)
  let textChat = `📋 *SOLICITUDES DE CAMBIO DE CUPO — LIMA C1 EQUIPO 32*\n` +
    `📅 *Corte:* ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}\n\n` +
    `📊 *Resumen:* ${evaluaciones.length} solicitudes procesadas | 🟢 ${aptos.length} Aptos | 🟡 ${enRevision.length} En Revisión | 🔴 ${noAptos.length} No Aptos\n\n`;

  for (const e of evaluaciones) {
    const icon = e.apto && e.severidad === 'SUCCESS' ? '🟢' : e.severidad === 'WARNING' ? '🟡' : '🔴';
    textChat += `${icon} *${e.nombreSale}* (DNI: ${e.dniSale} · ${e.equipoOrigen}) ➔ *${e.nombreEntra || 'Por asignar'}* (${e.dniEntra || 'S/D'})\n` +
                `   • *Dictamen:* ${e.dictamen}\n` +
                `   • *Nota:* ${e.observaciones}\n\n`;
  }
  textChat += `_Validado con reglas Causa OS & Nodus Live._`;

  const chatPayload = {
    text: textChat,
    cardsV2: [{
      cardId: `cambios_cupo_lima_${Date.now()}`,
      card: {
        header: {
          title: 'CREAR PODER SIN LÍMITES — Sede Lima',
          subtitle: '📋 Auditoría de Solicitudes de Cambio de Cupo (C1 E32)',
          imageUrl: 'https://crearglobal.com/favicon.ico',
          imageType: 'CIRCLE'
        },
        sections: [
          {
            header: `Resumen de Solicitudes (${evaluaciones.length})`,
            widgets: [
              {
                decoratedText: {
                  topLabel: '🟢 APTOS PARA CAMBIO',
                  text: `<b>${aptos.length} solicitudes</b> cumplen regla: inscritos y NO se sentaron en sala.`
                }
              },
              {
                decoratedText: {
                  topLabel: '🔴 NO APTOS / OBSERVADOS',
                  text: `<b>${noAptos.length + enRevision.length} solicitudes</b> requieren validación manual o cupo ya consumido.`
                }
              }
            ]
          },
          {
            header: 'Detalle de Participantes',
            widgets: evaluaciones.map(e => ({
              decoratedText: {
                topLabel: `${e.apto && e.severidad === 'SUCCESS' ? '🟢 APTO' : e.severidad === 'WARNING' ? '🟡 EN REVISIÓN' : '🔴 BLOQUEADO'} • ${e.equipoOrigen}`,
                text: `<b>${e.nombreSale}</b> (DNI: ${e.dniSale}) ➔ <b>${e.nombreEntra || 'Nuevo Px'}</b><br><i>${e.observaciones}</i>`
              }
            }))
          }
        ]
      }
    }]
  };

  const firestore = getDb();

  // Obtener Webhook de Lima
  let limaWebhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_LIMA || process.env.GOOGLE_CHAT_WEBHOOK_URL || '';
  if (firestore) {
    try {
      const chatSnap = await firestore.doc('settings/google_chat').get();
      if (chatSnap.exists) {
        const conf = chatSnap.data();
        limaWebhookUrl = conf.sedesWebhooks?.['Lima'] || conf.sedesWebhooks?.['LIM'] || conf.webhookUrl || limaWebhookUrl;
      }
    } catch (e) {}
  }

  if (!dryRun && limaWebhookUrl) {
    console.log('\n🚀 Transmitiendo informe al espacio de Google Chat de Lima...');
    const chatRes = await sendPayloadToGoogleChat(limaWebhookUrl, chatPayload);
    if (chatRes.success) {
      console.log('✅ Notificación entregada satisfactoriamente en Google Chat Lima.');
    } else {
      console.warn('⚠️ Google Chat respondió con error:', chatRes.error || chatRes.reason);
    }
  } else {
    console.log(`[DRY-RUN] Omitiendo envío de red a Google Chat (Webhook disponible: ${Boolean(limaWebhookUrl)})`);
  }

  // 2. Notificaciones en Causa OS para Coordinadoras de Lima
  const LIMA_COORDS = [
    { name: 'Diana Moscoso', email: 'diana.moscoso@crearpsl.net' },
    { name: 'Joyce Marín', email: 'joyce.marin@crearpsl.net' },
    { name: 'José Sánchez', email: 'jose.sanchez@crearpsl.net' }
  ];

  if (!dryRun && firestore) {
    console.log('\n📲 Creando notificaciones internas en Causa OS...');
    for (const coord of LIMA_COORDS) {
      try {
        await firestore.collection('notifications').add({
          userId: coord.email,
          title: '📋 Solicitudes de Cambio de Cupo (C1 E32 Lima)',
          message: `Se auditaron ${evaluaciones.length} solicitudes de cambio de cupo contra Nodus: ${aptos.length} aptas, ${noAptos.length} no aptas, ${enRevision.length} en revisión. Revisa el detalle para autorizar en Nodus.`,
          read: false,
          created_at: new Date().toISOString(),
          type: 'CAMBIO_CUPO_AUDIT',
          sede: 'Lima',
          priority: 'high'
        });
        console.log(`   ✓ Notificación creada para ${coord.name} (${coord.email})`);
      } catch (e) {
        console.warn(`   ✗ Error notificando a ${coord.email}:`, e.message);
      }
    }
  }

  return { evaluaciones, aptos, enRevision, noAptos };
}

// CLI Direct Runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const csvArg = args.find(a => a.startsWith('--csv-file='));
  const csvFile = csvArg ? csvArg.split('=')[1] : null;

  console.log('🔍 Cargando directorio y padrón Nodus...');
  const nodusDir = loadNodusLimaDirectory();
  console.log(`Indexados ${nodusDir.byDni.size} registros por DNI y ${nodusDir.byName.size} por Nombre.`);

  if (csvFile && fs.existsSync(csvFile)) {
    const csvContent = fs.readFileSync(csvFile, 'utf8');
    const rows = parseCSV(csvContent);
    const evals = rows.map(r => evaluateCambioCupo(r, nodusDir));
    notifyLimaCambiosCupo(evals, { dryRun }).then(() => process.exit(0));
  } else {
    console.log('ℹ️ No se especificó --csv-file. Ejecutando con fila de muestra identificada en captura...');
    const muestra = [
      {
        'Marca temporal': '22/10/2026 18:30:00',
        'Dirección de correo': 'coordinacion.lima@crearpsl.net',
        'DNI de la persona que cede': '60666318',
        'Nombres de quien sale': 'Rosita Adriana Marquina Daza',
        'Equipo': 'Equipo 27',
        'Nuevo participante': 'Por confirmar datos',
        'DNI de quien recibe': 'Pendiente',
        'Motivo': 'Reprogramación a C1 Equipo 32'
      }
    ];
    const evals = muestra.map(r => evaluateCambioCupo(r, nodusDir));
    notifyLimaCambiosCupo(evals, { dryRun }).then(() => process.exit(0));
  }
}
