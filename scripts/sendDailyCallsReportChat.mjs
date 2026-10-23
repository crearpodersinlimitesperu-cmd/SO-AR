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
import { OFFICIAL_SEDES_TEAMS } from '../src/data/officialSedesTeams.js';

const REPORT_SEDES = ['Lima', 'Quito', 'Cuenca', 'Guayaquil', 'Medellín', 'México'];
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

// --- CALENDARIO Y VENTANA OPERATIVA DE LLAMADAS ---
/**
 * Determina si una sede está en ventana de llamadas activas para su entrenamiento próximo.
 * 
 * Regla de Oro Operativa CPSL:
 * 1. Durante el entrenamiento (Viernes a Domingo) y post-entrenamiento inmediato (Lunes a Martes):
 *    - El entrenamiento está en curso en sala o recién culminado.
 *    - Las llamadas están CERRADAS.
 *    - NO se envía reporte de llamadas de Nodus hasta el miércoles con los nuevos pagos.
 * 2. Ventana activa de llamadas: Miércoles y Jueves.
 *    - Nodus reporta los nuevos pagos y enrolados del siguiente ciclo.
 *    - Las coordinadoras llaman y confirman participantes para la sala.
 *    - Se envía el reporte oficial a las 12:30 PM.
 */
export function getSedeCallingSchedule(sedeName, now = new Date()) {
  const normSede = (sedeName || '').trim();
  const config = OFFICIAL_SEDES_TEAMS[normSede];
  if (!config) return { isCallingOpen: false, shouldSendReport: false, reason: `Sede "${normSede}" no configurada en calendario maestro.` };

  const localStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);

  const localDayOfWeek = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    weekday: 'short'
  }).format(now); // 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'

  const allEvents = config.upcomingC1 || [];
  const sorted = [...allEvents].sort((a, b) => a.date.localeCompare(b.date));

  // 1. Verificar si hay un entrenamiento en curso en sala o recién culminado (Viernes a Martes = inicio + 4 días)
  const ongoing = sorted.find(e => {
    const start = e.date;
    const end = new Date(new Date(start).getTime() + 4 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    return localStr >= start && localStr <= end;
  });

  if (ongoing) {
    return {
      sede: normSede,
      isCallingOpen: false,
      status: 'IN_TRAINING_OR_POST',
      currentTeam: ongoing.team,
      eventDate: ongoing.date,
      shouldSendReport: false,
      reason: `El entrenamiento C1 E${ongoing.team} de ${normSede} está en curso en sala o en cierre (${ongoing.date}). Las llamadas están cerradas. No se envía reporte de Nodus hasta el miércoles con el registro de nuevos pagos.`
    };
  }

  // 2. Buscar próximo evento en calendario
  const nextEvent = sorted.find(e => e.date > localStr);
  if (!nextEvent) {
    return {
      sede: normSede,
      isCallingOpen: false,
      status: 'NO_UPCOMING_EVENT',
      shouldSendReport: false,
      reason: `Sin entrenamientos próximos programados en calendario para ${normSede}.`
    };
  }

  // 3. Regla directiva de días de llamada: Miércoles (Wed) y Jueves (Thu)
  const isWednesdayOrThursday = (localDayOfWeek === 'Wed' || localDayOfWeek === 'Thu');
  const diffDays = Math.round((new Date(nextEvent.date).getTime() - new Date(localStr).getTime()) / (24 * 3600 * 1000));

  // Ventana activa: semana del evento (hasta 9 días antes pero estrictamente en Miércoles o Jueves)
  if (isWednesdayOrThursday && diffDays <= 9 && diffDays >= 1) {
    return {
      sede: normSede,
      isCallingOpen: true,
      status: 'CALLING_ACTIVE',
      targetTeam: nextEvent.team,
      eventDate: nextEvent.date,
      daysToEvent: diffDays,
      shouldSendReport: true,
      reason: `Ventana activa de llamadas para C1 E${nextEvent.team} (${nextEvent.date}). Reporte de nuevos pagos disponible.`
    };
  }

  return {
    sede: normSede,
    isCallingOpen: false,
    status: 'CALLING_INACTIVE',
    targetTeam: nextEvent.team,
    eventDate: nextEvent.date,
    daysToEvent: diffDays,
    shouldSendReport: false,
    reason: `Fuera de ventana de llamadas activas para ${normSede} (próximo C1 E${nextEvent.team} el ${nextEvent.date}). Las llamadas y reportes se reanudan el miércoles con los nuevos pagos registrados en Nodus.`
  };
}

// --- CONSTRUCCIÓN DEL REPORTE POR SEDE ---
export function buildSedeDailyReport(sedeName, snapshotData, options = {}) {
  const { force = false, referenceDate = new Date(), checkSchedule = false } = options;
  const scheduleInfo = getSedeCallingSchedule(sedeName, referenceDate);

  // Fecha y corte
  const timestamp = snapshotData?.timestamp || new Date().toISOString();
  const fechaCorte = new Date(timestamp).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  // Si se solicitó chequeo de calendario y las llamadas están cerradas / fuera de ventana
  if (checkSchedule && !scheduleInfo.shouldSendReport && !force) {
    return {
      sede: sedeName,
      available: false,
      suppressed: true,
      scheduleInfo,
      timestamp,
      fechaCorte,
      reason: scheduleInfo.reason
    };
  }

  const targetTeamNum = scheduleInfo.targetTeam || scheduleInfo.currentTeam;
  const targetTeamStr = targetTeamNum ? `EQUIPO ${targetTeamNum}` : null;

  const allEquiposReporte = snapshotData?.equiposReporte || snapshotData?.equiposSummary || [];
  const officialTeam = targetTeamStr
    ? allEquiposReporte.find(e => (e.equipoNombre || '').toUpperCase().startsWith(targetTeamStr))
    : null;

  const normSede = (sedeName || '').toLowerCase().trim();
  const rawSedes = snapshotData?.sedes || [];
  const sedesList = Array.isArray(rawSedes) ? rawSedes : Object.values(rawSedes);
  
  const sedeSummary = sedesList.find(s => 
    (s.sede || '').toLowerCase().trim() === normSede ||
    normSede.includes((s.sede || '').toLowerCase().trim())
  ) || null;

  const coordinadores = (snapshotData?.coordinadores || []).filter(c => 
    (c.sede || '').toLowerCase().trim() === normSede ||
    normSede.includes((c.sede || '').toLowerCase().trim())
  );

  // Si no hay información de la sede en Nodus ni equipo oficial
  if (!sedeSummary && coordinadores.length === 0 && !officialTeam) {
    return {
      sede: sedeName,
      available: false,
      suppressed: false,
      scheduleInfo,
      timestamp,
      fechaCorte,
      reason: 'Sin datos registrados en Nodus para esta sede en el corte actual.'
    };
  }

  // Cómputo de participantes reales y llamadas para el entrenamiento próximo
  let pxAsignados = officialTeam?.totalParticipantes || 0;
  let pxConfirmados = officialTeam?.confirmadosLlamada || 0;
  let pxPorConfirmar = 0;
  let pxNoContesta = 0;
  let gestionesTotales = 0;
  let llamadasC1 = 0;
  let llamadasC2 = 0;

  // Desglose por coordinadores específico para el equipo objetivo
  const detalleCoordinadores = coordinadores.map(c => {
    let coordLlamadas = 0;
    let coordConfirmados = 0;
    let coordPorConfirmar = 0;
    let coordNoContesta = 0;

    if (targetTeamStr) {
      const matchEq = (c.equipos || []).find(e => (e.equipo || '').toUpperCase().startsWith(targetTeamStr));
      if (matchEq) {
        coordLlamadas = matchEq.llamadas || 0;
        coordConfirmados = matchEq.confirmado || 0;
        coordPorConfirmar = matchEq.porConfirmar || 0;
        coordNoContesta = matchEq.noContesta || 0;
      }
    } else {
      coordLlamadas = c.gestiones || 0;
      coordConfirmados = c.estados?.confirmado || 0;
      coordPorConfirmar = c.estados?.porConfirmar || 0;
      coordNoContesta = c.estados?.noContesta || 0;
    }

    gestionesTotales += coordLlamadas;
    if (!officialTeam || !officialTeam.confirmadosLlamada) {
      pxConfirmados += coordConfirmados;
    }
    pxPorConfirmar += coordPorConfirmar;
    pxNoContesta += coordNoContesta;
    llamadasC1 += coordLlamadas;

    return {
      nombre: c.nombre || c.nombreCompleto || 'Coordinador',
      rol: c.rol || 'Coordinación',
      pxConfirmados: coordConfirmados,
      pxPorConfirmar: coordPorConfirmar,
      pxNoContesta: coordNoContesta,
      gestionesTotales: coordLlamadas,
      pxAsignados: officialTeam?.totalParticipantes || c.asignados || 0,
      targetTeam: targetTeamStr || 'Ciclo Activo'
    };
  });

  // Fallback si no había equipo en equiposReporte ni en c.equipos con llamadas (ej. snapshots históricos sin equiposReporte):
  if (pxAsignados === 0) {
    pxAsignados = Number(sedeSummary?.asignadosTotal ?? coordinadores.reduce((acc, c) => acc + (c.asignados || 0), 0));
  }
  if (pxConfirmados === 0 && sedeSummary?.confirmadosTotal) {
    pxConfirmados = Number(sedeSummary.confirmadosTotal);
  }
  if (gestionesTotales === 0 && sedeSummary?.gestionesTotal) {
    gestionesTotales = Number(sedeSummary.gestionesTotal);
    llamadasC1 = Number(sedeSummary.c1Total || gestionesTotales);
    llamadasC2 = Number(sedeSummary.c2Total || 0);
  }
  if (pxPorConfirmar === 0 && sedeSummary?.porConfirmarTotal) {
    pxPorConfirmar = Number(sedeSummary.porConfirmarTotal);
  }
  if (pxNoContesta === 0 && sedeSummary?.noContestaTotal) {
    pxNoContesta = Number(sedeSummary.noContestaTotal);
  }

  const tasaConversion = pxAsignados > 0 ? Math.round((pxConfirmados / pxAsignados) * 100) : 0;

  return {
    sede: sedeName,
    available: true,
    suppressed: false,
    scheduleInfo,
    targetTeamLabel: targetTeamStr ? `C1 — ${targetTeamStr}` : 'Ciclo Activo',
    eventDate: scheduleInfo.eventDate || null,
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
    suppressed,
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
    reason,
    targetTeamLabel,
    eventDate
  } = report;

  if (suppressed) {
    return {
      text: `⏸️ *CREAR PODER SIN LÍMITES — Sede ${sede}*\n` +
        `📅 *Corte:* ${fechaCorte}\n\n` +
        `Estado: ${reason}\n` +
        `_Regla Operativa: Las llamadas de confirmación están cerradas durante el entrenamiento en sala. Los reportes se reanudan el miércoles con los nuevos pagos registrados en Nodus._`
    };
  }

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

  const targetLabel = targetTeamLabel || (report.scheduleInfo?.targetTeam ? `C1 — EQUIPO ${report.scheduleInfo.targetTeam}` : null);
  const eventDateText = eventDate ? `(${eventDate})` : '';

  // Texto fallback para clientes de chat simples o terminal
  let textFallback = `📢 *CREAR PODER SIN LÍMITES — Reporte Diario de Llamadas (12:30 PM)*\n` +
    `📍 *Sede:* ${sede}` + (targetLabel ? ` | 🎯 *Objetivo:* ${targetLabel} ${eventDateText}` : '') + ` | ⏰ *Corte:* ${fechaCorte}\n\n` +
    `👥 *PX ASIGNADOS EN SALA (Personas únicas):* ${pxAsignados}\n` +
    `🟢 *Confirmados a Sala:* ${pxConfirmados} (${tasaConversion}% de la sala)\n` +
    `🟡 *Por Confirmar (XC):* ${pxPorConfirmar}\n` +
    `🔴 *No Contesta (NC):* ${pxNoContesta}\n\n` +
    `📞 *GESTIONES REALIZADAS (Total llamadas/intentos):* ${gestionesTotales} (C1: ${llamadasC1} · C2: ${llamadasC2})\n` +
    `_Nota directiva: Un PX puede recibir múltiples llamadas; los PX son participantes únicos en sala._\n\n` +
    `👤 *Detalle por Coordinación${targetLabel ? ` (${targetLabel})` : ''}:*\n`;

  for (const c of coordinadores) {
    textFallback += `• *${c.nombre}*: ${c.pxConfirmados} confirmados` + (c.targetTeam ? ` para ${c.targetTeam}` : ` de ${c.pxAsignados} PX`) + ` (${c.gestionesTotales} llamadas realizadas)\n`;
  }

  // Widgets para Google Chat CardsV2
  const widgets = [
    {
      decoratedText: {
        topLabel: '📍 Sede & Fecha de Corte',
        text: `<b>${sede}</b> • Corte oficial 12:30 PM • <i>${fechaCorte}</i>`
      }
    }
  ];

  if (targetLabel) {
    widgets.push({
      decoratedText: {
        topLabel: '🎯 ENTRENAMIENTO OBJETIVO',
        text: `<b>${targetLabel}</b> ${eventDateText ? `• Inicio: <i>${eventDateText}</i>` : ''}`
      }
    });
  }

  widgets.push(
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
  );

  // Sección de Coordinadores
  const coordWidgets = coordinadores.map(c => ({
    decoratedText: {
      topLabel: `👤 ${c.nombre} (${c.rol}) • ${c.targetTeam || 'Ciclo'}`,
      text: `🟢 <b>${c.pxConfirmados}</b> conf. | 📞 <b>${c.gestionesTotales}</b> llamadas para ${c.targetTeam || 'Ciclo'}`
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
      header: `📊 Resumen Directivo de Sala — ${targetLabel || 'Nodus Live'}`,
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
          subtitle: `📞 Reporte Diario de Llamadas (Corte 12:30 PM)` + (targetLabel ? ` • ${targetLabel}` : ''),
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
    force = false,
    targetSede = null,
    snapshotFile = null,
    referenceDate = new Date()
  } = options;

  console.log(`================================================================`);
  console.log(`🤖 AGENTE DE REPORTE DIARIO DE LLAMADAS (CORTE 12:30 PM)`);
  console.log(`Modo: ${dryRun ? '🔍 DRY RUN (Simulación sin envío real)' : '🚀 LIVE (Envío activo a Google Chat)'}`);
  console.log(`Fuerza de envío (--force): ${force ? 'Activado (ignora ventana)' : 'Desactivado (respeta calendario de sala)'}`);
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

    const report = buildSedeDailyReport(sede, snapshotData, { checkSchedule: !force, force, referenceDate });

    // Si el reporte está suprimido (entrenamiento en curso o fuera de ventana miércoles/jueves)
    if (report.suppressed) {
      console.log(`⏸️ [SUPRIMIDO] Sede "${sede}": ${report.reason}`);
      results.push({ sede, success: true, suppressed: true, reason: report.reason, report });
      continue;
    }

    if (!report.available) {
      console.log(`⚠️ [NO DISPONIBLE] Sede "${sede}": ${report.reason}`);
      results.push({ sede, success: false, suppressed: false, reason: report.reason, report });
      continue;
    }

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

    console.log(`[ENVIANDO] Transmitiendo reporte de ${sede} (${report.targetTeamLabel || 'Ciclo'}) a Google Chat...`);
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
        results: results.map(r => ({ sede: r.sede, success: r.success, suppressed: r.suppressed || false, reason: r.reason || null })),
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
  const force = args.includes('--force');
  const sedeArg = args.find(a => a.startsWith('--sede='));
  const targetSede = sedeArg ? sedeArg.split('=')[1] : null;
  const snapshotArg = args.find(a => a.startsWith('--snapshot-file='));
  const snapshotFile = snapshotArg ? snapshotArg.split('=')[1] : null;

  runDailyCallsReportAgent({ dryRun, force, targetSede, snapshotFile })
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal error running agent:', err);
      process.exit(1);
    });
}
