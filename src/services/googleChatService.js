// Servicio de integración con Google Chat API (búsqueda/creación de DMs 1 a 1)
//
// Cómo funciona (documentado y verificado contra la referencia oficial de Google
// antes de escribir este archivo — no se inventó ningún formato de URL):
//
// 1. Pide el scope 'chat.spaces' de forma INCREMENTAL: solo se solicita la primera
//    vez que alguien hace clic en "Chat" en el Panel Super Admin, no en el login
//    general de la app. Esto es intencional: la app está en modo "Externo / En
//    producción" sin verificar ante Google, con un tope de por vida de 100 personas
//    que pueden otorgar un permiso sensible sin aprobación. Pedirlo solo a quien
//    realmente usa el botón (roles gerenciales/dirección, que ya es la única
//    audiencia del Panel Super Admin) evita agotar ese cupo con gente que nunca
//    toca esta función.
// 2. Con ese token, llama a GET /v1/spaces:findDirectMessage?name=users/{email}
//    (Google permite usar el correo directo como alias de {user} cuando se
//    autentica como usuario — confirmado en la referencia oficial).
// 3. Si no existe todavía (404), llama a POST /v1/spaces:setup para crearlo.
// 4. En ambos casos, la respuesta trae el campo "spaceUri": la URL real de Google
//    para abrir esa conversación en el navegador. Se usa esa URL tal cual — no se
//    construye ningún enlace propio.
//
// Lo que NO está garantizado (ver reporte a José, 27/08/2026): que esto funcione
// igual para cuentas @gmail.com externas a la organización (armando.pilacuan@gmail.com,
// gomeznueve@gmail.com). Por eso todo el flujo tiene un fallback explícito: si algo
// falla, la función devuelve { success:false } y quien llama debe ofrecer el botón
// de "Correo" como respaldo, en vez de romper la experiencia.

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

const CHAT_SCOPE = 'https://www.googleapis.com/auth/chat.spaces';
const TOKEN_KEY = 'googleChatToken';

/**
 * Devuelve un access token con el scope de Chat, pidiéndolo con un popup de
 * Google SOLO si todavía no lo tenemos guardado en esta sesión de navegador.
 */
export async function getChatAccessToken() {
  const cached = sessionStorage.getItem(TOKEN_KEY);
  if (cached) return cached;

  const provider = new GoogleAuthProvider();
  provider.addScope(CHAT_SCOPE);
  // Reutiliza la cuenta ya logueada cuando es posible, en vez de forzar elegir cuenta de nuevo
  provider.setCustomParameters({ login_hint: auth.currentUser?.email || '' });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('Google no devolvió un token de acceso con el permiso de Chat.');
  }
  sessionStorage.setItem(TOKEN_KEY, credential.accessToken);
  return credential.accessToken;
}

async function findDirectMessageSpace(token, email) {
  const res = await fetch(
    `https://chat.googleapis.com/v1/spaces:findDirectMessage?name=users/${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (res.status === 404) return null; // no existe todavía, hay que crearlo
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`findDirectMessage falló (HTTP ${res.status}): ${body}`);
  }
  return res.json();
}

async function createDirectMessageSpace(token, email) {
  const res = await fetch('https://chat.googleapis.com/v1/spaces:setup', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      space: { spaceType: 'DIRECT_MESSAGE', singleUserBotDm: false },
      memberships: [{ member: { name: `users/${email}`, type: 'HUMAN' } }]
    })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`spaces:setup falló (HTTP ${res.status}): ${body}`);
  }
  return res.json();
}

/**
 * Busca (o crea si no existe) la conversación 1 a 1 de Google Chat con `email`,
 * y devuelve { success: true, spaceUri } con la URL real de Google para abrirla.
 * Si algo falla (token, red, permisos, o el usuario destino no puede recibir DMs
 * por API), devuelve { success: false, error } sin lanzar excepción, para que
 * quien llama pueda ofrecer un respaldo (ej. el botón de Correo).
 */
export async function openOrCreateDirectMessage(email) {
  if (!email) return { success: false, error: 'Sin correo' };
  try {
    const token = await getChatAccessToken();
    let space = await findDirectMessageSpace(token, email);
    if (!space) {
      space = await createDirectMessageSpace(token, email);
    }
    if (!space?.spaceUri) {
      return { success: false, error: 'La API no devolvió una URL de espacio (spaceUri).' };
    }
    return { success: true, spaceUri: space.spaceUri };
  } catch (error) {
    console.error('Error abriendo Google Chat:', error);
    return { success: false, error: error.message || String(error) };
  }
}

// ============================================================================
// INTEGRACIÓN INCOMING WEBHOOK GOOGLE CHAT (ESPACIOS DE EQUIPO / CANALES)
// Permite enviar notificaciones automáticas y tarjetas de reportes a cualquier
// espacio de Google Chat sin requerir login o permisos manuales del coordinador.
// ============================================================================

const WEBHOOK_STORAGE_KEY = 'causaos_google_chat_webhook';

/**
 * Lee la configuración de Google Chat Webhook desde Firestore o fallback local/env.
 */
export async function getGoogleChatWebhookConfig() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'google_chat'));
    if (snap.exists()) {
      return snap.data();
    }
  } catch (e) {
    console.warn('Error leyendo settings/google_chat de Firestore:', e);
  }
  const localUrl = localStorage.getItem(WEBHOOK_STORAGE_KEY) || '';
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CHAT_WEBHOOK_URL) || '';
  return {
    webhookUrl: localUrl || envUrl || '',
    sedesWebhooks: {},
    enabled: true
  };
}

/**
 * Guarda la URL del Webhook de Google Chat en Firestore y localStorage.
 */
export async function saveGoogleChatWebhookConfig(config) {
  try {
    if (config.webhookUrl) {
      localStorage.setItem(WEBHOOK_STORAGE_KEY, config.webhookUrl.trim());
    }
    await setDoc(doc(db, 'settings', 'google_chat'), {
      ...config,
      updated_at: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.error('Error guardando settings/google_chat:', e);
    return false;
  }
}

/**
 * Envía automáticamente un reporte a un espacio de Google Chat vía Incoming Webhook.
 * @param {Object} report - Objeto del reporte recién creado
 */
export async function sendReportToGoogleChat(report) {
  if (!report) return { success: false, reason: 'no_report' };

  try {
    const config = await getGoogleChatWebhookConfig();
    if (config.enabled === false) {
      return { success: false, reason: 'disabled' };
    }

    // Buscar webhook específico para la sede o el general
    const sedeNorm = (report.sede || '').trim();
    const webhookUrl = (config.sedesWebhooks && config.sedesWebhooks[sedeNorm]) ||
                       config.webhookUrl ||
                       localStorage.getItem(WEBHOOK_STORAGE_KEY) ||
                       (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CHAT_WEBHOOK_URL) ||
                       '';

    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      console.info('Google Chat Webhook no configurado aún en Causa OS.');
      return { success: false, reason: 'no_webhook_url' };
    }

    const { type, submitted_by, sede, cycle_id, stage, created_at, data } = report;
    const fechaLegible = new Date(created_at || Date.now()).toLocaleString('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    let headerTitle = 'CREAR PODER SIN LÍMITES';
    let headerSubtitle = 'Nuevo Reporte Operativo';
    let widgets = [];
    let textSummary = '';

    if (type === 'Llamadas') {
      headerSubtitle = '📞 Reporte Diario de Llamadas';
      const okNuevos = Number(data?.nuevos_OK) || 0;
      const okRez = Number(data?.rezagados_OK) || 0;
      const totalOk = okNuevos + okRez;

      const xcNuevos = Number(data?.nuevos_XC) || 0;
      const xcRez = Number(data?.rezagados_XC) || 0;
      const totalXc = xcNuevos + xcRez;

      const ncNuevos = Number(data?.nuevos_NC) || 0;
      const ncRez = Number(data?.rezagados_NC) || 0;
      const totalNc = ncNuevos + ncRez;

      const pendNuevos = Number(data?.nuevos_PENDIENTES) || 0;
      const pendRez = Number(data?.rezagados_PENDIENTES) || 0;
      const totalPend = pendNuevos + pendRez;

      textSummary = `📢 *CREAR PODER SIN LÍMITES — Reporte de Llamadas*\n` +
        `👤 *Coordinador(a):* ${submitted_by}\n` +
        `📍 *Sede:* ${sede} | *Equipo:* ${cycle_id || 'N/A'} | *Etapa:* ${stage || 'N/A'}\n` +
        `⏰ *Fecha:* ${fechaLegible}\n\n` +
        `🟢 *CONFIRMADOS (OK):* ${totalOk} (${okNuevos} nuevos · ${okRez} rez.)\n` +
        `🟡 *POR CONFIRMAR (XC):* ${totalXc} (${xcNuevos} nuevos · ${xcRez} rez.)\n` +
        `🔴 *NO CONTESTA (NC):* ${totalNc} (${ncNuevos} nuevos · ${ncRez} rez.)\n` +
        `🔵 *PENDIENTES:* ${totalPend} (${pendNuevos} nuevos · ${pendRez} rez.)`;

      widgets = [
        {
          decoratedText: {
            topLabel: '👤 Coordinador(a)',
            text: `<b>${submitted_by}</b>`
          }
        },
        {
          decoratedText: {
            topLabel: '📍 Sede & Equipo',
            text: `<b>${sede}</b> • ${cycle_id || 'Global'} • <i>${stage || ''}</i>`
          }
        },
        {
          decoratedText: {
            topLabel: '⏰ Fecha y Hora',
            text: fechaLegible
          }
        },
        {
          decoratedText: {
            topLabel: '🟢 CONFIRMADOS (OK)',
            text: `<font color="#10b981"><b>${totalOk}</b></font> (${okNuevos} nuevos · ${okRez} rez.)`
          }
        },
        {
          decoratedText: {
            topLabel: '🟡 POR CONFIRMAR (XC)',
            text: `<font color="#f59e0b"><b>${totalXc}</b></font> (${xcNuevos} nuevos · ${xcRez} rez.)`
          }
        },
        {
          decoratedText: {
            topLabel: '🔴 NO CONTESTA (NC)',
            text: `<font color="#ef4444"><b>${totalNc}</b></font> (${ncNuevos} nuevos · ${ncRez} rez.)`
          }
        },
        {
          decoratedText: {
            topLabel: '🔵 PENDIENTES',
            text: `<font color="#38bdf8"><b>${totalPend}</b></font> (${pendNuevos} nuevos · ${pendRez} rez.)`
          }
        }
      ];
    } else if (type === 'ReporteRelampagoFDS') {
      headerSubtitle = '⚡ Reporte Relámpago Post-FDS (Gerencia)';
      textSummary = `⚡ *CREAR PODER SIN LÍMITES — Reporte Relámpago Post-FDS*\n` +
        `👤 *Gerente / Emisor:* ${submitted_by}\n` +
        `📍 *Sede:* ${sede} | *FDS:* ${data?.fds_tipo || 'N/A'}\n` +
        `🏆 *Sentados:* ${data?.sentados_inicio || 0} ➔ *Graduados:* ${data?.graduados_cierre || 0}\n` +
        `📈 *Tasa TRO:* ${data?.tasa_retencion_automatica || 0}%`;

      widgets = [
        { decoratedText: { topLabel: '👤 Gerente / Emisor', text: `<b>${submitted_by}</b>` } },
        { decoratedText: { topLabel: '📍 Sede & Tipo', text: `<b>${sede}</b> • ${data?.fds_tipo || 'FDS'}` } },
        { decoratedText: { topLabel: '🏆 Sentados ➔ Graduados', text: `<b>${data?.sentados_inicio || 0}</b> sentados ➔ <b>${data?.graduados_cierre || 0}</b> graduados` } },
        { decoratedText: { topLabel: '📈 Tasa Retención Operativa (TRO)', text: `<b>${data?.tasa_retencion_automatica || 0}%</b>` } }
      ];
    } else {
      headerSubtitle = `📋 Reporte: ${type}`;
      textSummary = `📋 *CREAR PODER SIN LÍMITES — Nuevo Reporte*\n` +
        `👤 *Emisor:* ${submitted_by}\n` +
        `📍 *Sede:* ${sede} | *Tipo:* ${type}\n` +
        `⏰ *Fecha:* ${fechaLegible}`;

      widgets = [
        { decoratedText: { topLabel: '👤 Emisor', text: `<b>${submitted_by}</b>` } },
        { decoratedText: { topLabel: '📍 Sede', text: `<b>${sede}</b>` } },
        { decoratedText: { topLabel: '⏰ Fecha', text: fechaLegible } }
      ];
    }

    const payload = {
      text: textSummary,
      cardsV2: [
        {
          cardId: `rep_${report.id || Date.now()}`,
          card: {
            header: {
              title: headerTitle,
              subtitle: headerSubtitle,
              imageUrl: 'https://crearglobal.com/favicon.ico',
              imageType: 'CIRCLE'
            },
            sections: [
              {
                widgets: widgets
              },
              {
                widgets: [
                  {
                    buttonList: {
                      buttons: [
                        {
                          text: '🚀 Abrir Causa OS',
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
            ]
          }
        }
      ]
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`Google Chat webhook falló (HTTP ${res.status}):`, errText);
      return { success: false, error: errText };
    }

    return { success: true };
  } catch (error) {
    console.error('Error enviando reporte a Google Chat:', error);
    return { success: false, error: error.message || String(error) };
  }
}
