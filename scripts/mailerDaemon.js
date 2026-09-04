import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import sanitizeHtml from 'sanitize-html';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';

dotenv.config();

// --- 1. CONFIGURACIÓN DE FIREBASE ADMIN ---
// (03/09/2026) FIX — José: "me preocupa no estar usando las notificaciones por
// correo". Causa confirmada corriendo esto en local: "Missing or insufficient
// permissions" en las 3 colecciones que usa (mail, user_profiles, tasks).
// Este script usaba el SDK de CLIENTE de Firebase (firebase/firestore) sin
// nunca iniciar sesión (ningún signIn en todo el archivo) — así que
// request.auth siempre era null. Desde el endurecimiento de firestore.rules
// del 26/08/2026 (que exige isAuthenticated() en esas 3 colecciones), cada
// corrida de este daemon fallaba en silencio. Último envío exitoso real,
// confirmado leyendo Firestore: 18/08/2026 — coincide con la fecha.
//
// Fix: usar firebase-admin (como todos los scripts de diagnóstico de este
// repo), que se autentica con una Service Account y NO pasa por
// firestore.rules — es el patrón correcto para un proceso de fondo de
// confianza como este, y es EXACTAMENTE el mismo patrón que ya usa
// .github/workflows/managers-llamados-sync.yml (Secret GOOGLE_SERVICE_ACCOUNT_JSON
// → archivo centro-operativo-cpsl-65ad52160f45.json en el runner → borrado al
// final). mail-dispatch.yml se actualizó para escribir ese mismo archivo.
//
// Localmente (fuera de GitHub Actions) sigue funcionando igual que los demás
// scripts de este repo: coloca el archivo de credenciales de servicio
// "centro-operativo-cpsl-65ad52160f45.json" en la raíz del proyecto y corre
// el script — NUNCA lo corras en un entorno que no sea tuyo ni lo subas a git
// (ya está en .gitignore).
const CREDENTIALS_PATH = './centro-operativo-cpsl-65ad52160f45.json';

if (!existsSync(CREDENTIALS_PATH)) {
  console.error(`❌ No se encontró el archivo de credenciales de servicio (${CREDENTIALS_PATH}).`);
  console.error('   Este script ahora usa firebase-admin y necesita ese archivo (local) o');
  console.error('   correr dentro del GitHub Action, que lo genera desde el Secret GOOGLE_SERVICE_ACCOUNT_JSON.');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// --- 2. CONFIGURACIÓN DE GMAIL (NODEMAILER) ---
if (!process.env.GMAIL_SERVER_EMAIL || !process.env.GMAIL_SERVER_APP_PASSWORD) {
  console.error("❌ Faltan credenciales de Gmail (GMAIL_SERVER_EMAIL o GMAIL_SERVER_APP_PASSWORD). El daemon no puede iniciar.");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_SERVER_EMAIL,
    pass: process.env.GMAIL_SERVER_APP_PASSWORD
  }
});

const isOneShot = process.argv.includes('--one-shot');

// --- 2.1 GENERACIÓN DE INVITACIÓN DE CALENDARIO (.ics) — (04/09/2026) ---
// José pidió que los correos de tarea asignada incluyan el mismo tipo de
// botón "Añadir al calendario" que Gmail muestra automáticamente en correos
// de aerolíneas/reservas. ACLARACIÓN dada a José: esa tarjeta especial de
// Gmail requiere que Google apruebe al remitente en su programa de "Schema.org
// Markup for Gmail" — un proceso externo que no se puede activar desde código.
// Lo que SÍ es 100% controlable desde aquí, y logra el mismo resultado
// práctico (botón de "Añadir al calendario" en Gmail/Outlook), es adjuntar un
// archivo .ics estándar (RFC 5545) al correo — el mecanismo que usan las
// invitaciones de reuniones. No requiere ninguna librería nueva: se arma el
// texto del archivo a mano, que es sencillo para un solo evento.
//
// Se usa METHOD:PUBLISH (no REQUEST) porque esto es una fecha límite propia
// del destinatario, no una reunión que requiera confirmar asistencia (no hay
// ORGANIZER/ATTENDEE ni RSVP). Duración por defecto: 30 minutos a partir de
// la fecha límite de la tarea — un recordatorio puntual, no un bloque de
// trabajo (RECOMENDACIÓN de José aceptada implícitamente; si se prefiere otra
// duración, es un solo número que cambiar aquí: DEFAULT_EVENT_DURATION_MIN).
const DEFAULT_EVENT_DURATION_MIN = 30;

function toIcsUtcDate(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// Escapa texto para campos de una sola línea del formato ICS (RFC 5545 §3.3.11).
function escapeIcsText(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function buildIcsAttachment(calendarEvent) {
  if (!calendarEvent || !calendarEvent.deadline) return null;
  const dtStart = toIcsUtcDate(calendarEvent.deadline);
  if (!dtStart) return null;
  const dtEnd = toIcsUtcDate(new Date(new Date(calendarEvent.deadline).getTime() + DEFAULT_EVENT_DURATION_MIN * 60000));
  const dtStamp = toIcsUtcDate(new Date());
  const uid = `${calendarEvent.taskId || 'so-ar'}-${Date.now()}@crearpsl.net`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SO-AR//Causa OS//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(calendarEvent.title)}`,
    `DESCRIPTION:${escapeIcsText(calendarEvent.description || 'Tarea de SO-AR — CREAR Poder Sin Límites.')}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  return {
    filename: 'tarea-so-ar.ics',
    content: lines.join('\r\n'),
    contentType: 'text/calendar; charset=utf-8; method=PUBLISH'
  };
}

async function processMailDoc(docSnap) {
  const data = docSnap.data();
  if (data.delivery && data.delivery.state) return;

  // 'to' puede venir como string único o como array de strings (p.ej. tareas asignadas a varias
  // personas). Normalizamos siempre a un array para no romper en .toLowerCase() sobre un array.
  const rawRecipients = (Array.isArray(data.to) ? data.to : [data.to]).filter(Boolean);

  if (rawRecipients.length === 0) {
    console.warn(`⚠️ Documento de correo sin destinatario válido (doc ${docSnap.id})`);
    await db.collection('mail').doc(docSnap.id).update({
      'delivery.state': 'REJECTED',
      reason: 'Documento de correo sin campo "to" válido'
    });
    return;
  }

  const validRecipients = [];
  for (const rawTo of rawRecipients) {
    const to = String(rawTo).toLowerCase().trim();
    const isCorporate = ['@crearpsl.net', '@crearpsl.com'].some(d => to.endsWith(d));
    if (isCorporate) {
      validRecipients.push(rawTo);
      continue;
    }
    try {
      const snap = await db.collection('users').where('emails', 'array-contains', to).get();
      if (snap.empty) {
        console.warn(`⚠️ Intento de envío a correo no registrado: ${rawTo}`);
      } else {
        validRecipients.push(rawTo);
      }
    } catch (error) {
      console.error("Error validando correo contra la base de datos:", error.message);
      // No bloqueamos el envío por un error de validación (p.ej. Firestore momentáneamente inaccesible).
      validRecipients.push(rawTo);
    }
  }

  if (validRecipients.length === 0) {
    await db.collection('mail').doc(docSnap.id).update({
      'delivery.state': 'REJECTED',
      reason: 'Ningún destinatario pertenece a un usuario registrado'
    });
    return;
  }

  console.log(`📧 Procesando correo para: ${validRecipients.join(', ')}`);

  const rawHtml = data.message?.html || '<p>Tienes una notificación del sistema SO-AR.</p>';
  const cleanHtml = sanitizeHtml(rawHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'div', 'span', 'hr']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      'a': ['href', 'name', 'target', 'style'],
      'img': ['src', 'alt', 'style'],
      'div': ['style', 'class'],
      'span': ['style', 'class'],
      'table': ['style', 'class', 'border', 'cellpadding', 'cellspacing'],
      'td': ['style', 'class'],
      'th': ['style', 'class'],
      'tr': ['style', 'class'],
      'p': ['style', 'class'],
      'h1': ['style', 'class'],
      'h2': ['style', 'class'],
      'h3': ['style', 'class']
    }
  });

  const mailOptions = {
    from: `"CREAR Poder Sin Límites" <${process.env.GMAIL_SERVER_EMAIL}>`,
    to: validRecipients,
    subject: data.message?.subject || 'Notificación SO-AR — CREAR Poder Sin Límites',
    html: cleanHtml
  };

  // nodemailer arma el adjunto .ics correctamente por sí solo a partir de
  // "icalEvent" (no hace falta también agregarlo a mano en "attachments" —
  // eso duplicaría el archivo en el correo).
  const icsAttachment = buildIcsAttachment(data.calendarEvent);
  if (icsAttachment) {
    mailOptions.icalEvent = { method: 'PUBLISH', filename: icsAttachment.filename, content: icsAttachment.content };
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Correo enviado con éxito a ${validRecipients.join(', ')}`);
    await db.collection('mail').doc(docSnap.id).update({
      'delivery.state': 'SUCCESS',
      'delivery.endTime': new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Error enviando a ${validRecipients.join(', ')}:`, error.message);
    await db.collection('mail').doc(docSnap.id).update({
      'delivery.state': 'ERROR',
      'delivery.error': error.message
    });
  }
}

async function processPendingMails() {
  console.log("📬 Buscando correos pendientes en Firestore...");
  try {
    const snap = await db.collection('mail').get();
    let pendingCount = 0;
    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      if (!d.delivery || !d.delivery.state) {
        pendingCount++;
        await processMailDoc(docSnap);
      }
    }
    console.log(`📊 Correos procesados: ${pendingCount}`);
  } catch (e) {
    console.error("Error al procesar lote de correos:", e.message);
  }
}

// --- 4. VERIFICACIÓN DE INACTIVIDAD ---
const INACTIVITY_LIMIT_HOURS = 72;
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

async function checkInactivity() {
  console.log("🔍 Iniciando chequeo de inactividad de usuarios...");
  try {
    const profilesSnap = await db.collection('user_profiles').get();
    const now = new Date();

    for (const docSnap of profilesSnap.docs) {
      const data = docSnap.data();
      const email = (data.email || docSnap.id || '').toLowerCase().trim();

      if (!email || !data.lastLoginAt) continue;

      // Si el id del doc no es el email, verificar si existe un documento canónico (id == email).
      // Si existe el canónico, ignorar este documento no canónico para evitar alertas fantasmas.
      if (docSnap.id !== email) {
        const canonicalDoc = await db.collection('user_profiles').doc(email).get();
        if (canonicalDoc.exists) {
          continue;
        }
      }

      const lastLoginDate = data.lastLoginAt.toDate ? data.lastLoginAt.toDate() : new Date(data.lastLoginAt);
      const hoursSinceLogin = (now - lastLoginDate) / (1000 * 60 * 60);

      if (hoursSinceLogin > INACTIVITY_LIMIT_HOURS) {
        const lastAlertDate = data.lastInactivityAlertAt?.toDate ? data.lastInactivityAlertAt.toDate() : (data.lastInactivityAlertAt ? new Date(data.lastInactivityAlertAt) : new Date(0));

        if (lastAlertDate < lastLoginDate) {
          console.log(`⚠️ Usuario ${email} inactivo por más de ${INACTIVITY_LIMIT_HOURS} horas. Programando alerta.`);

          await db.collection('mail').add({
            to: email,
            message: {
              subject: '⚠️ Aviso de Inactividad en SO-AR — CREAR Poder Sin Límites',
              html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                  <div style="background-color: #ef4444; color: #fff; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">Aviso de Inactividad</h1>
                  </div>
                  <div style="padding: 30px; background-color: #f9fafb;">
                    <p style="font-size: 16px;">Hola <strong>${data.name || 'Colaborador'}</strong>,</p>
                    <p style="font-size: 16px;">Hemos notado que no has ingresado a la plataforma <strong>SO-AR</strong> en más de 72 horas.</p>
                    <p style="font-size: 16px;">Recuerda que es vital mantener tu matriz operativa actualizada para el cumplimiento de las metas globales.</p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://centro-operativo-cpsl.web.app" style="background-color: #ef4444; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Ingresar ahora a SO-AR</a>
                    </div>
                    <p style="font-size: 14px; color: #666; text-align: center; margin-top: 20px;">CREAR Poder Sin Límites - Sistema SO-AR</p>
                  </div>
                </div>
              `
            },
            createdAt: FieldValue.serverTimestamp()
          });

          // Actualizar el documento exacto que disparó la alerta
          await docSnap.ref.update({
            lastInactivityAlertAt: FieldValue.serverTimestamp()
          });

          // Si el ID del documento era diferente al correo, actualizar también el canónico
          if (email !== docSnap.id) {
            try {
              await db.collection('user_profiles').doc(email).set({
                lastInactivityAlertAt: FieldValue.serverTimestamp()
              }, { merge: true });
            } catch (_) {}
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ Error verificando inactividad:", error.message);
  }
}

// --- 5. RECORDATORIOS DE TAREAS VENCIDAS SIN ATENDER ---
// Si una tarea asignada pasa su fecha límite y sigue sin completarse, se reenvía un correo de
// recordatorio cada REMINDER_DEBOUNCE_HOURS hasta que la persona la marque como completada.
const REMINDER_DEBOUNCE_HOURS = 24;

async function checkOverdueTaskReminders() {
  console.log("🔍 Iniciando chequeo de tareas vencidas sin atender...");
  try {
    const tasksSnap = await db.collection('tasks').get();
    const now = new Date();

    for (const docSnap of tasksSnap.docs) {
      const data = docSnap.data();
      const isDone = data.completed === true || data.status === 'Completada';
      if (isDone) continue;
      if (!data.deadline) continue;

      const deadlineDate = new Date(data.deadline);
      if (isNaN(deadlineDate.getTime())) continue;
      if (deadlineDate >= now) continue; // aún no vence

      const emails = Array.isArray(data.assignedToEmails) && data.assignedToEmails.length > 0
        ? data.assignedToEmails
        : (data.assignedToEmail ? [data.assignedToEmail] : []);
      if (emails.length === 0) continue; // tarea sin asignación directa: nadie a quien recordar

      const lastReminderDate = data.lastReminderAt?.toDate
        ? data.lastReminderAt.toDate()
        : (data.lastReminderAt ? new Date(data.lastReminderAt) : null);
      const hoursSinceLastReminder = lastReminderDate ? (now - lastReminderDate) / (1000 * 60 * 60) : Infinity;
      const hoursSinceLastReminderOrDeadline = lastReminderDate
        ? hoursSinceLastReminder
        : (now - deadlineDate) / (1000 * 60 * 60);

      if (hoursSinceLastReminderOrDeadline < REMINDER_DEBOUNCE_HOURS) continue; // ya se recordó recientemente

      const taskTitle = data.task || data.title || 'Tarea sin título';
      console.log(`⏰ Tarea vencida sin completar: "${taskTitle}" (${docSnap.id}). Enviando recordatorio a: ${emails.join(', ')}`);

      for (const email of emails) {
        await db.collection('mail').add({
          to: [email],
          message: {
            subject: `⏰ RECORDATORIO: Tarea pendiente vencida — ${taskTitle}`,
            html: `
              <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #ef4444; color: #fff; padding: 20px; text-align: center;">
                  <h1 style="margin: 0; font-size: 22px;">⏰ Tarea Vencida Sin Completar</h1>
                </div>
                <div style="padding: 30px; background-color: #f9fafb;">
                  <p style="font-size: 16px;">Hola,</p>
                  <p style="font-size: 16px;">Tienes una tarea asignada en <strong>SO-AR</strong> que superó su fecha límite y aún no ha sido marcada como completada:</p>
                  <p style="font-size: 16px;"><strong>Tarea:</strong> ${taskTitle}</p>
                  <p style="font-size: 16px;"><strong>Fecha límite:</strong> ${formatDeadlineEsLocal(data.deadline)}</p>
                  <p style="font-size: 16px;">Por favor ingresa a la plataforma y complétala o actualiza su estado a la brevedad. Recibirás recordatorios periódicos hasta que sea atendida.</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://centro-operativo-cpsl.web.app" style="background-color: #ef4444; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Ingresar ahora a SO-AR</a>
                  </div>
                  <p style="font-size: 14px; color: #666; text-align: center; margin-top: 20px;">CREAR Poder Sin Límites - Sistema SO-AR</p>
                </div>
              </div>
            `
          },
          createdAt: FieldValue.serverTimestamp()
        });
      }

      await db.collection('tasks').doc(docSnap.id).update({
        lastReminderAt: FieldValue.serverTimestamp()
      });
    }
  } catch (error) {
    console.error("❌ Error verificando tareas vencidas:", error.message);
  }
}

function formatDeadlineEsLocal(iso) {
  if (!iso) return 'Sin fecha límite definida';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('es-PE', { dateStyle: 'full', timeStyle: 'short' });
  } catch (e) {
    return iso;
  }
}

// Ejecución
if (isOneShot) {
  console.log("⚡ Ejecución en modo One-Shot (GitHub Actions / Tarea programada)...");
  await processPendingMails();
  await checkInactivity();
  await checkOverdueTaskReminders();
  console.log("✅ Tarea de envío y verificación completada.");
  process.exit(0);
} else {
  console.log("🚀 Mailer Daemon Iniciado en modo persistente. Escuchando en tiempo real...");
  db.collection('mail').onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        processMailDoc(change.doc);
      }
    });
  });
  checkInactivity();
  setInterval(checkInactivity, CHECK_INTERVAL_MS);
  checkOverdueTaskReminders();
  setInterval(checkOverdueTaskReminders, CHECK_INTERVAL_MS);
}
