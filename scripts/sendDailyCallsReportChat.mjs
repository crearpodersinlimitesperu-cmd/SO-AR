#!/usr/bin/env node
/**
 * scripts/sendDailyCallsReportChat.mjs
 * 
 * AGENTE AUTOMÁTICO DE REPORTE DIARIO DE LLAMADAS DE COORDINADORES (12:30 PM)
 * 
 * Misión:
 * 1. Ejecutarse automáticamente todos los días a las 12:30 PM (17:30 UTC - Hora Lima/Quito/Guayaquil/Cuenca/Medellín).
 * 2. Extraer el estado real y verificado de llamadas de los coordinadores desde Nodus (`nodus_coordinadores_c1c2/latest`).
 * 3. Enviar el reporte formateado al espacio de Google Chat correspondiente a cada sede (según webhooks configurados).
 * 4. Cumplir estrictamente la regla directiva:
 *    - SEPARAR CLARAMENTE PX (personas únicas en sala) de GESTIONES (llamadas/intentos realizados).
 *      "A un PX se le llama el número de veces que sea necesario; los PX son números claros de personas."
 *    - CERO DATOS INVENTADOS: si Nodus no tiene datos para un equipo o sede, se reporta como no disponible / pendiente.
 * 
 * Uso:
 *   node scripts/sendDailyCallsReportChat.mjs [--dry-run] [--sede=Lima] [--snapshot-file=nodus_latest_snapshot.json]
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const REPORT_SEDES = ['Lima', 'Quito', 'Cuenca', 'Guayaquil', 'Medellín'];
const KEY_FILE = './centro-operativo-cpsl-65ad52160f45.json';

// --- INICIALIZACIÓN DE FIRESTORE ---
let db = null;
let dbAttempted = false;

function getDbInstance() {
  if (dbAttempted) return db;
  dbAttempted = true;
  try {
    const rawEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    let credential = null;
    if (rawEnv && rawEnv.trim().startsWith('{')) {
      credential = cert(JSON.parse(rawEnv));
    } else if (fs.existsSync(KEY_FILE)) {
      credential = cert(JSON.parse(fs.readFileSync(KEY_FILE, 'utf8')));
    } else {
      // Si no hay variables de servicio ni archivo, omitir Firestore local sin lanzar excepción no capturada
      return null;
    }
    const app = getApps()[0] || initializeApp({
      credential,
      projectId: 'centro-operativo-cpsl'
    });
    db = getFirestore(app);
    return db;
  } catch (err) {
    console.warn(`[sendDailyCallsReport] No se pudo inicializar Firestore Admin: ${err.message}`);
    return null;
  }
}

// --- CARGA DE SNAPSHOT DE NODUS ---
export async function loadNodusSnapshot(customPath = null) {
  const firestore = getDbInstance();
  if (firestore && !customPath) {
    try {
      const snapDoc = await firestore.doc('nodus_coordinadores_c1c2/latest').get();
      if (snapDoc.exists) {
        const data = snapDoc.data();
        if (data && (data.coordinadores || data.sedes)) {
          return { source: 'firestore:nodus_coordinadores_c1c2/latest', data };
        }
      }
    } catch (e) {
      console.warn(`[sendDailyCallsReport] Error leyendo nodus_coordinadores_c1c2/latest: ${e.message}`);
    }
  }

  // Fallback a archivo de snapshot local verificado (para pruebas / dry-run)
  const candidateFiles = [
    customPath,
    'nodus_latest_snapshot.json',
    path.resolve(process.cwd(), 'nodus_latest_snapshot.json'),
    path.resolve(process.cwd(), '../nodus_latest_snapshot.json')
  ].filter(Boolean);

  for (const f of candidateFiles) {
    if (fs.existsSync(f)) {
      try {
        const raw = fs.readFileSync(f, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.coordinadores || parsed.sedes)) {
          return { source: `file:${f}`, data: parsed };
        }
      } catch (err) {
        console.warn(`[sendDailyCallsReport] Error leyendo snapshot local ${f}: ${err.message}`);
      }
    }
  }

  throw new Error('No se encontró ningún snapshot válido de Nodus (Firestore o nodus_latest_snapshot.json).');
}

// --- CARGA DE CONFIGURACIÓN DE GOOGLE CHAT ---
export async function loadGoogleChatConfig() {
  let firestoreConfig = {};
  const firestore = getDbInstance();
  if (firestore) {
    try {
      const snap = await firestore.doc('settings/google_chat').get();
      if (snap.exists) {
        firestoreConfig = snap.data() || {};
      }
    } catch (e) {
      console.warn(`[sendDailyCallsReport] No se pudo leer settings/google_chat: ${e.message}`);
    }
  }

  const envWebhooks = {
    'Lima': process.env.GOOGLE_CHAT_WEBHOOK_LIMA || '',
    'Quito': process.env.GOOGLE_CHAT_WEBHOOK_QUITO || '',
    'Cuenca': process.env.GOOGLE_CHAT_WEBHOOK_CUENCA || '',
    'Guayaquil': process.env.GOOGLE_CHAT_WEBHOOK_GUAYAQUIL || '',
    'Medellín': process.env.GOOGLE_CHAT_WEBHOOK_MEDELLIN || '',
    'Global': process.env.GOOGLE_CHAT_WEBHOOK_GLOBAL || process.env.GOOGLE_CHAT_WEBHOOK_URL || ''
  };

  const sedesWebhooks = {
    ...(firestoreConfig.sedesWebhooks || {}),
    ...Object.fromEntries(Object.entries(envWebhooks).filter(([_, v]) => Boolean(v)))
  };

  return {
    enabled: firestoreConfig.enabled !== false,
    defaultWebhookUrl: firestoreConfig.webhookUrl || process.env.GOOGLE_CHAT_WEBHOOK_URL || '',
    sedesWebhooks
  };
}

// --- CONSTRUCCIÓN DEL REPORTE POR SEDE ---
export function buildSedeDailyReport(sedeName, snapshotData) {
  const normSede = (sedeName || '').toLowerCase().trim();
  const rawSedes = snapshotData.sedes || [];
  const sedesList = Array.isArray(rawSedes) ? rawSedes : Object.values(rawSedes);
  
  const sedeSummary = sedesList.find(s => 
    (s.sede || '').toLowerCase().trim() === normSede ||
    normSede.includes((s.sede || '').toLowerCase().trim())
  ) || null;

  const coordinadores = (snapshotData.coordinadores || []).filter(c => 
    (c.sede || '').toLowerCase().trim() === normSede ||
    normSede.includes((c.sede || '').toLowerCase().trim())
  );

  // Fecha y corte
  const timestamp = snapshotData.timestamp || new Date().toISOString();
  const fechaCorte = new Date(timestamp).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  // Si no hay información de la sede en Nodus
  if (!sedeSummary && coordinadores.length === 0) {
    return {
      sede: sedeName,
      available: false,
      timestamp,
      fechaCorte,
      reason: 'Sin datos registrados en Nodus para esta sede en el corte actual.'
    };
  }

  // PX (Participantes únicos) vs Gestiones (Llamadas realizadas)
  const pxAsignados = Number(sedeSummary?.asignadosTotal ?? coordinadores.reduce((acc, c) => acc + (c.asignados || 0), 0));
  const pxConfirmados = Number(sedeSummary?.confirmadosTotal ?? coordinadores.reduce((acc, c) => acc + (c.estados?.confirmado || 0), 0));
  const pxPorConfirmar = Number(sedeSummary?.porConfirmarTotal ?? coordinadores.reduce((acc, c) => acc + (c.estados?.porConfirmar || 0), 0));
  const pxNoContesta = Number(sedeSummary?.noContestaTotal ?? coordinadores.reduce((acc, c) => acc + (c.estados?.noContesta || 0), 0));
  
  // Gestiones de llamadas (esfuerzos acumulados)
  const gestionesTotales = Number(sedeSummary?.gestionesTotal ?? coordinadores.reduce((acc, c) => acc + (c.gestiones || 0), 0));
  const llamadasC1 = Number(sedeSummary?.c1Total ?? coordinadores.reduce((acc, c) => acc + (c.c1 || 0), 0));
  const llamadasC2 = Number(sedeSummary?.c2Total ?? coordinadores.reduce((acc, c) => acc + (c.c2 || 0), 0));

  const tasaConversion = pxAsignados > 0 ? Math.round((pxConfirmados / pxAsignados) * 100) : 0;

  // Desglose de coordinadores
  const detalleCoordinadores = coordinadores.map(c => {
    const equiposList = Array.isArray(c.equipos)
      ? c.equipos.map(e => (typeof e === 'string' ? e : e.nombre || e.equipo || 'Equipo')).filter(Boolean)
      : [];
    const equiposDisplay = equiposList.slice(0, 3).join(', ') + (equiposList.length > 3 ? ` (+${equiposList.length - 3})` : '');

    return {
      nombre: c.nombre || c.nombreCompleto || 'Coordinador',
      rol: c.rol || 'Coordinación',
      pxAsignados: c.asignados || 0,
      pxConfirmados: c.estados?.confirmado || 0,
      pxPorConfirmar: c.estados?.porConfirmar || 0,
      pxNoContesta: c.estados?.noContesta || 0,
      gestionesTotales: c.gestiones || 0,
      c1: c.c1 || 0,
      c2: c.c2 || 0,
      coberturaPct: c.coberturaPct || 0,
      equipos: equiposDisplay || 'Ciclo Activo'
    };
  });

  return {
    sede: sedeName,
    available: true,
    timestamp,
    fechaCorte,
    pxAsignados,
    pxConfirmados,
    pxPorConfirmar,
    pxNoContesta,
    gestionesTotales,
    llamadasC1,
    llamadasC2,
    tasaConversion,
    coordinadoresCount: coordinadores.length,
    coordinadores: detalleCoordinadores
  };
}

// --- FORMATEADOR DE TARJETA GOOGLE CHAT (CARDS V2) ---
export function formatGoogleChatCard(report) {
  const {
    sede,
    available,
    fechaCorte,
    pxAsignados,
    pxConfirmados,
    pxPorConfirmar,
    pxNoContesta,
    gestionesTotales,
    llamadasC1,
    llamadasC2,
    tasaConversion,
    coordinadores,
    reason
  } = report;

  if (!available) {
    const textFallback = `⚠️ *CREAR PODER SIN LÍMITES — Reporte 12:30 PM: Sede ${sede}*\n` +
      `📅 *Corte:* ${fechaCorte}\n\n` +
      `Estado Nodus: ${reason}\n` +
      `_Regla Causa OS: Cero datos inventados. Se enviará actualización tan pronto Nodus sincronice el ciclo activo._`;

    return {
      text: textFallback,
      cardsV2: [{
        cardId: `rep_calls_${sede}_${Date.now()}`,
        card: {
          header: {
            title: `CREAR PODER SIN LÍMITES — Sede ${sede}`,
            subtitle: `📞 Reporte Diario de Llamadas (Corte 12:30 PM)`,
            imageUrl: 'https://crearglobal.com/favicon.ico',
            imageType: 'CIRCLE'
          },
          sections: [{
            widgets: [
              {
                decoratedText: {
                  topLabel: '⚠️ Estado Nodus',
                  text: `<font color="#f59e0b"><b>${reason}</b></font>`
                }
              },
              {
                decoratedText: {
                  topLabel: '🔒 Política de Integridad',
                  text: 'Cero datos inventados o simulados. En espera de la sincronización activa de Nodus.'
                }
              }
            ]
          }]
        }
      }]
    };
  }

  // Texto fallback para clientes de chat simples o terminal
  let textFallback = `📢 *CREAR PODER SIN LÍMITES — Reporte Diario de Llamadas (12:30 PM)*\n` +
    `📍 *Sede:* ${sede} | ⏰ *Corte:* ${fechaCorte}\n\n` +
    `👥 *PX ASIGNADOS EN SALA (Personas únicas):* ${pxAsignados}\n` +
    `🟢 *Confirmados a Sala:* ${pxConfirmados} (${tasaConversion}% de la sala)\n` +
    `🟡 *Por Confirmar (XC):* ${pxPorConfirmar}\n` +
    `🔴 *No Contesta (NC):* ${pxNoContesta}\n\n` +
    `📞 *GESTIONES REALIZADAS (Total llamadas/intentos):* ${gestionesTotales} (C1: ${llamadasC1} · C2: ${llamadasC2})\n` +
    `_Nota directiva: Un PX puede recibir múltiples llamadas; los PX son participantes únicos en sala._\n\n` +
    `👤 *Detalle por Coordinación:*\n`;

  for (const c of coordinadores) {
    textFallback += `• *${c.nombre}*: ${c.pxConfirmados} confirmados de ${c.pxAsignados} PX (${c.gestionesTotales} llamadas realizadas) [${c.equipos}]\n`;
  }

  // Widgets para Google Chat CardsV2
  const widgets = [
    {
      decoratedText: {
        topLabel: '📍 Sede & Fecha de Corte',
        text: `<b>${sede}</b> • Corte oficial 12:30 PM • <i>${fechaCorte}</i>`
      }
    },
    {
      decoratedText: {
        topLabel: '👥 PARTICIPANTES ASIGNADOS (PX ÚNICOS EN SALA)',
        text: `<font color="#38bdf8"><b>${pxAsignados} participantes</b></font> asignados al ciclo`
      }
    },
    {
      columns: {
        columnItems: [
          {
            widgets: [{
              decoratedText: {
                topLabel: '🟢 CONFIRMADOS',
                text: `<font color="#10b981"><b>${pxConfirmados}</b></font> (${tasaConversion}%)`
              }
            }]
          },
          {
            widgets: [{
              decoratedText: {
                topLabel: '🟡 POR CONFIRMAR',
                text: `<font color="#f59e0b"><b>${pxPorConfirmar}</b></font>`
              }
            }]
          },
          {
            widgets: [{
              decoratedText: {
                topLabel: '🔴 NO CONTESTA',
                text: `<font color="#ef4444"><b>${pxNoContesta}</b></font>`
              }
            }]
          }
        ]
      }
    },
    {
      decoratedText: {
        topLabel: '📞 GESTIONES EFECTUADAS (Total de llamadas e intentos)',
        text: `<b>${gestionesTotales} llamadas</b> (C1: ${llamadasC1} · C2: ${llamadasC2})<br><i>*A un PX se le contacta cuantas veces sea necesario para asegurar sala.</i>`
      }
    }
  ];

  // Sección de Coordinadores
  const coordWidgets = coordinadores.map(c => ({
    decoratedText: {
      topLabel: `👤 ${c.nombre} (${c.rol}) • ${c.equipos}`,
      text: `🟢 <b>${c.pxConfirmados}</b> conf. de <b>${c.pxAsignados}</b> PX | 📞 <b>${c.gestionesTotales}</b> llamadas | 📈 Cobertura: <b>${c.coberturaPct}%</b>`
    }
  }));

  // Diagnóstico directivo de cierre
  let directivaText = '🚀 Mantener el ritmo de llamadas para garantizar el lleno total de sala.';
  if (pxPorConfirmar > 0) {
    directivaText = `🎯 <b>Foco Operativo:</b> Acelerar la remarcación de los <b>${pxPorConfirmar} PX 'Por Confirmar'</b> para cerrar la sala antes del fin de semana.`;
  } else if (pxNoContesta > 0) {
    directivaText = `🔄 <b>Foco Operativo:</b> Activar re-contacto vía mensaje/WhatsApp para los <b>${pxNoContesta} PX 'No Contesta'</b>.`;
  }

  const sections = [
    {
      header: '📊 Resumen Directivo de Sala (Nodus Live)',
      widgets
    },
    {
      header: `👥 Coordinadores de Sede ${sede} (${coordinadores.length})`,
      widgets: coordWidgets.length ? coordWidgets : [{
        decoratedText: { topLabel: 'Coordinación', text: 'Sin coordinadores asignados en este corte' }
      }]
    },
    {
      header: '🎯 Directriz de Gestión',
      widgets: [
        {
          decoratedText: {
            topLabel: '💡 Diagnóstico Asertivo Causa OS',
            text: directivaText
          }
        },
        {
          buttonList: {
            buttons: [
              {
                text: '🚀 Abrir Monitor Nodus en Causa OS',
                onClick: {
                  openLink: {
                    url: 'https://so-ar-crearpsl.web.app/reportes'
                  }
                }
              }
            ]
          }
        }
      ]
    }
  ];

  return {
    text: textFallback,
    cardsV2: [{
      cardId: `rep_calls_1230_${sede}_${Date.now()}`,
      card: {
        header: {
          title: `CREAR PODER SIN LÍMITES — Sede ${sede}`,
          subtitle: `📞 Reporte Diario de Llamadas (Corte 12:30 PM)`,
          imageUrl: 'https://crearglobal.com/favicon.ico',
          imageType: 'CIRCLE'
        },
        sections
      }
    }]
  };
}

// --- ENVÍO DE MENSAJE A GOOGLE CHAT ---
export async function sendPayloadToGoogleChat(webhookUrl, payload) {
  if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('http')) {
    return { success: false, reason: 'invalid_or_missing_webhook' };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      return { success: false, status: res.status, error: errorText };
    }

    return { success: true, status: res.status };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// --- EJECUCIÓN PRINCIPAL ---
export async function runDailyCallsReportAgent(options = {}) {
  const {
    dryRun = false,
    targetSede = null,
    snapshotFile = null
  } = options;

  console.log(`================================================================`);
  console.log(`🤖 AGENTE DE REPORTE DIARIO DE LLAMADAS (CORTE 12:30 PM)`);
  console.log(`Modo: ${dryRun ? '🔍 DRY RUN (Simulación sin envío real)' : '🚀 LIVE (Envío activo a Google Chat)'}`);
  console.log(`================================================================`);

  // 1. Cargar Snapshot de Nodus
  const { source, data: snapshotData } = await loadNodusSnapshot(snapshotFile);
  console.log(`[1/4] Snapshot cargado exitosamente desde: ${source}`);
  console.log(`      Timestamp Nodus: ${snapshotData.timestamp || 'N/D'}`);

  // 2. Cargar configuración de Webhooks
  const chatConfig = await loadGoogleChatConfig();
  console.log(`[2/4] Configuración de Google Chat cargada:`);
  console.log(`      Habilitado: ${chatConfig.enabled}`);
  console.log(`      Sedes con webhook: ${Object.keys(chatConfig.sedesWebhooks).join(', ') || 'Ninguna registrada'}`);

  // 3. Determinar sedes a procesar
  const sedesToProcess = targetSede 
    ? [targetSede] 
    : REPORT_SEDES;

  const results = [];

  // 4. Procesar y enviar por cada sede
  for (const sede of sedesToProcess) {
    console.log(`\n------------------------------------------------------------`);
    console.log(`📍 Procesando Sede: ${sede}`);

    const report = buildSedeDailyReport(sede, snapshotData);
    const cardPayload = formatGoogleChatCard(report);

    // Obtener webhook específico de la sede
    const webhookUrl = chatConfig.sedesWebhooks[sede] || 
                       (sede === 'Lima' ? chatConfig.defaultWebhookUrl : null);

    if (dryRun) {
      console.log(`[DRY-RUN] Webhook destino: ${webhookUrl ? '(Configurado)' : '(Sin configurar)'}`);
      console.log(`[DRY-RUN] Resumen Texto:\n${cardPayload.text}`);
      results.push({ sede, success: true, dryRun: true, report });
      continue;
    }

    if (!webhookUrl) {
      console.warn(`[OMITIDO] Sede "${sede}" no tiene webhook de Google Chat configurado. Se omite para no mezclar canales.`);
      results.push({ sede, success: false, reason: 'missing_sede_webhook', report });
      continue;
    }

    console.log(`[ENVIANDO] Transmitiendo reporte de ${sede} a Google Chat...`);
    const sendResult = await sendPayloadToGoogleChat(webhookUrl, cardPayload);

    if (sendResult.success) {
      console.log(`✅ [ÉXITO] Reporte de ${sede} entregado satisfactoriamente al chat.`);
      results.push({ sede, success: true, status: sendResult.status, report });
    } else {
      console.error(`❌ [FALLO] Error enviando reporte de ${sede}:`, sendResult.error || sendResult.reason);
      results.push({ sede, success: false, error: sendResult.error || sendResult.reason, report });
    }
  }

  // Guardar bitácora en Firestore si está conectado
  const firestore = getDbInstance();
  if (firestore && !dryRun) {
    try {
      await firestore.collection('audit_logs').add({
        action: 'DAILY_CALLS_REPORT_1230_DISPATCH',
        timestamp: new Date().toISOString(),
        results: results.map(r => ({ sede: r.sede, success: r.success, reason: r.reason || null })),
        agent: 'sendDailyCallsReportChat.mjs'
      });
      console.log(`\n[4/4] Bitácora guardada en Firestore audit_logs.`);
    } catch (e) {
      console.warn(`[4/4] No se pudo guardar bitácora en audit_logs: ${e.message}`);
    }
  }

  console.log(`\n================================================================`);
  console.log(`🎯 Ejecución finalizada. Sedes procesadas: ${results.length}`);
  return results;
}

// Si se ejecuta directamente desde CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const sedeArg = args.find(a => a.startsWith('--sede='));
  const targetSede = sedeArg ? sedeArg.split('=')[1] : null;
  const snapshotArg = args.find(a => a.startsWith('--snapshot-file='));
  const snapshotFile = snapshotArg ? snapshotArg.split('=')[1] : null;

  runDailyCallsReportAgent({ dryRun, targetSede, snapshotFile })
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal error running agent:', err);
      process.exit(1);
    });
}
