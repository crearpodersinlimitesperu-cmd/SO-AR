import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import sanitizeHtml from 'sanitize-html';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';

dotenv.config();

// --- 1. CONFIGURACIÓN DE FIREBASE ADMIN ---
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

let limaTransporter = null;
if (process.env.LIMA_GMAIL_USER && process.env.LIMA_GMAIL_PASS) {
  limaTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.LIMA_GMAIL_USER,
      pass: process.env.LIMA_GMAIL_PASS
    }
  });
}

const isOneShot = process.argv.includes('--one-shot');

// --- 2.1 GENERACIÓN DE INVITACIÓN DE CALENDARIO (.ics) ---
const DEFAULT_EVENT_DURATION_MIN = 30;

function toIcsUtcDate(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

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
  const uid = `${calendarEvent.taskId || 'causa-os'}-${Date.now()}@crearpsl.net`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Causa OS//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(calendarEvent.title)}`,
    `DESCRIPTION:${escapeIcsText(calendarEvent.description || 'Compromiso de Causa OS — CREAR PODER SIN LÍMITES.')}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  return {
    filename: 'compromiso-causa-os.ics',
    content: lines.join('\r\n'),
    contentType: 'text/calendar; charset=utf-8; method=PUBLISH'
  };
}

// --- 3. PROCESAMIENTO DE CORREOS EN COLA ---
async function processMailDoc(docSnap) {
  const data = docSnap.data();
  if (data.delivery && data.delivery.state) return;

  const rawRecipients = (Array.isArray(data.to) ? data.to : [data.to]).filter(Boolean);

  if (rawRecipients.length === 0) {
    console.warn(`⚠️ Documento de correo sin destinatario válido (doc ${docSnap.id})`);
    await db.collection('mail').doc(docSnap.id).update({
      'delivery.state': 'REJECTED',
      reason: 'Documento de correo sin campo "to" válido'
    });
    return;
  }

  const isImoWelcome = data.type === 'imo_welcome';

  const validRecipients = [];
  for (const rawTo of rawRecipients) {
    let to = String(rawTo).toLowerCase().trim()
      .replace('@crearpls.com', '@crearpsl.net')
      .replace(/ketherine\.aguirre@/g, 'katherine.aguirre@')
      .replace(/coodinacion\.administrativa@/g, 'coordinacion.administrativa@');
    
    if (isImoWelcome) {
      validRecipients.push(to);
      continue;
    }

    const isCorporate = ['@crearpsl.net', '@crearpsl.com'].some(d => to.endsWith(d));
    if (isCorporate) {
      validRecipients.push(to);
      continue;
    }
    try {
      const snap = await db.collection('users').where('emails', 'array-contains', to).get();
      if (snap.empty) {
        console.warn(`⚠️ Intento de envío a correo no registrado: ${to}`);
      } else {
        validRecipients.push(to);
      }
    } catch (error) {
      console.error("Error validando correo contra la base de datos:", error.message);
      validRecipients.push(to);
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

  const rawHtml = data.message?.html || '<p>Tienes una notificación del sistema Causa OS.</p>';
  const cleanHtml = sanitizeHtml(rawHtml, {
    allowedTags: [
      'p', 'b', 'i', 'em', 'strong', 'a', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'br', 'hr',
      'div', 'span', 'img', 'audio', 'source', 'iframe', 'table', 'tbody', 'thead', 'tr', 'td', 'th'
    ],
    allowedAttributes: {
      'a': ['href', 'target', 'style', 'class'],
      'p': ['style', 'class'],
      'div': ['style', 'class'],
      'span': ['style', 'class'],
      'h1': ['style', 'class'],
      'h2': ['style', 'class'],
      'h3': ['style', 'class'],
      'h4': ['style', 'class'],
      'ul': ['style', 'class'],
      'ol': ['style', 'class'],
      'li': ['style', 'class'],
      'table': ['style', 'class', 'cellpadding', 'cellspacing', 'border', 'width'],
      'tbody': ['style', 'class'],
      'thead': ['style', 'class'],
      'tr': ['style', 'class'],
      'td': ['style', 'class', 'width', 'align', 'valign'],
      'th': ['style', 'class', 'width', 'align', 'valign'],
      'img': ['src', 'alt', 'style', 'width', 'height'],
      'audio': ['controls', 'style', 'src'],
      'source': ['src', 'type'],
      'iframe': ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen']
    }
  });

  const mailSender = (isImoWelcome && limaTransporter) ? process.env.LIMA_GMAIL_USER : process.env.GMAIL_SERVER_EMAIL;
  const currentTransporter = (isImoWelcome && limaTransporter) ? limaTransporter : transporter;

  const mailOptions = {
    from: `"CREAR PODER SIN LÍMITES" <${mailSender}>`,
    to: validRecipients,
    subject: data.message?.subject || 'Notificación Causa OS — CREAR PODER SIN LÍMITES',
    html: cleanHtml
  };

  const icsAttachment = buildIcsAttachment(data.calendarEvent);
  if (icsAttachment) {
    mailOptions.icalEvent = { method: 'PUBLISH', filename: icsAttachment.filename, content: icsAttachment.content };
  }

  try {
    await currentTransporter.sendMail(mailOptions);
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

// --- 4. VERIFICACIÓN DE INACTIVIDAD (ENFOQUE DE LIDERAZGO Y CAUSA) ---
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
          console.log(`⚠️ Usuario ${email} inactivo por más de ${INACTIVITY_LIMIT_HOURS} horas. Programando llamado de liderazgo.`);

          const userName = data.name || data.displayName || 'Líder';

          await db.collection('mail').add({
            to: email,
            message: {
              subject: '⚡ Causa OS | Tu presencia y liderazgo son clave — CREAR Poder Sin Límites',
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; max-width: 620px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);">
                  
                  <!-- Cabecera Institucional Premium -->
                  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 26px 24px; text-align: center; border-bottom: 3px solid #f59e0b;">
                    <span style="display: inline-block; font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: #fbbf24; font-weight: 700; margin-bottom: 6px;">
                      CREAR PODER SIN LÍMITES · TRANSFORMACIÓN GLOBAL
                    </span>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      🌟 TU LIDERAZGO MARCA LA DIFERENCIA
                    </h1>
                    <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8; font-weight: 500;">
                      Sistema Operativo Causa OS · Presencia y Compromiso Activo
                    </p>
                  </div>

                  <div style="padding: 28px 30px; background-color: #ffffff;">
                    <p style="font-size: 15.5px; margin-top: 0; line-height: 1.5; color: #0f172a;">
                      Hola <strong>${userName}</strong>,
                    </p>

                    <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 18px;">
                      En la cultura de transformación de <strong>CREAR Poder Sin Límites</strong>, la constancia, la visibilidad y el seguimiento diario marcan la diferencia entre un equipo ordinario y un equipo de alto rendimiento.
                    </p>

                    <div style="background-color: #eff6ff; border: 1px solid #dbeafe; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 14px 16px; margin-bottom: 22px;">
                      <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #1d4ed8; letter-spacing: 0.5px; margin-bottom: 4px;">
                        💡 Actualización de Presencia en Plataforma
                      </div>
                      <p style="margin: 0; font-size: 13.5px; color: #1e40af; line-height: 1.5;">
                        Hemos registrado que no has ingresado a <strong>Causa OS</strong> en más de 72 horas. Ingresar regularmente asegura que tus acuerdos estén sincronizados y que tu equipo cuente con tu claridad operativa.
                      </p>
                    </div>

                    <div style="text-align: center; margin: 26px 0 28px 0;">
                      <a href="https://centro-operativo-cpsl.web.app" style="background-color: #2563eb; color: #ffffff; padding: 14px 34px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35); letter-spacing: 0.3px;">
                        🚀 Activar mi Presencia en Causa OS
                      </a>
                    </div>

                    <p style="font-size: 13px; color: #334155; margin: 20px 0 0 0; line-height: 1.5;">
                      Gracias por tu entrega y compromiso incondicional con la visión.<br/>
                      <strong>Equipo de Dirección y Coordinación Operativa</strong><br/>
                      <span style="font-size: 12px; color: #64748b;">CREAR Poder Sin Límites</span>
                    </p>
                  </div>

                  <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 20px; text-align: center; font-size: 11.5px; color: #64748b; line-height: 1.5;">
                    <em>"Vivir en Causa es ser la fuente incondicional de los resultados."</em><br/>
                    CREAR Poder Sin Límites · Causa OS · Transformación Global
                  </div>
                </div>
              `
            },
            createdAt: FieldValue.serverTimestamp()
          });

          await docSnap.ref.update({
            lastInactivityAlertAt: FieldValue.serverTimestamp()
          });

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

// --- 5. RECORDATORIOS DE COMPROMISOS FUERA DE TIEMPO (LLAMADO A LA CAUSA) ---
// En la ontología de CREAR Poder Sin Límites, un acuerdo no atendido no es un trámite vencido,
// sino una oportunidad de liderazgo para honrar la palabra, actualizar el estado o renegociar con Causa.
const REMINDER_DEBOUNCE_HOURS = 24;

async function checkOverdueTaskReminders() {
  console.log("🔍 Iniciando chequeo de compromisos fuera de fecha límite (Llamado a la Causa)...");
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
      if (emails.length === 0) continue; // tarea sin asignación directa

      const lastReminderDate = data.lastReminderAt?.toDate
        ? data.lastReminderAt.toDate()
        : (data.lastReminderAt ? new Date(data.lastReminderAt) : null);
      const hoursSinceLastReminder = lastReminderDate ? (now - lastReminderDate) / (1000 * 60 * 60) : Infinity;
      const hoursSinceLastReminderOrDeadline = lastReminderDate
        ? hoursSinceLastReminder
        : (now - deadlineDate) / (1000 * 60 * 60);

      if (hoursSinceLastReminderOrDeadline < REMINDER_DEBOUNCE_HOURS) continue; // ya se envió recientemente

      const taskTitle = data.task || data.title || 'Compromiso sin título';
      const sede = data.sede || data.assignedSede || 'Sede Operativa';
      const assigner = data.assignerName || data.assignedByName || data.assignedBy || 'Dirección / Coordinación';
      const priority = data.priority || 'Normal';
      const notes = data.notes || '';
      const deadlineFormatted = formatDeadlineEsLocal(data.deadline);

      console.log(`⚡ Llamado a la Causa por compromiso fuera de tiempo: "${taskTitle}" (${docSnap.id}). Notificando a: ${emails.join(', ')}`);

      for (const email of emails) {
        // Intentar obtener el nombre del líder desde user_profiles si no viene en la tarea
        let recipientName = data.assignedToName || '';
        if (!recipientName) {
          try {
            const userSnap = await db.collection('user_profiles').doc(email.toLowerCase().trim()).get();
            if (userSnap.exists) {
              const uData = userSnap.data();
              recipientName = uData.name || uData.displayName || '';
            }
          } catch (_) {}
        }
        const cleanName = recipientName ? recipientName.trim() : 'Líder';

        await db.collection('mail').add({
          to: [email],
          message: {
            subject: `⚡ LLAMADO A LA CAUSA: Compromiso pendiente por honrar — ${taskTitle}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; max-width: 620px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);">
                
                <!-- Cabecera Institucional Premium Causa OS -->
                <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 26px 24px; text-align: center; border-bottom: 3px solid #f59e0b;">
                  <span style="display: inline-block; font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: #fbbf24; font-weight: 700; margin-bottom: 6px;">
                    CREAR PODER SIN LÍMITES · TRANSFORMACIÓN GLOBAL
                  </span>
                  <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                    ⚡ LLAMADO A LA CAUSA
                  </h1>
                  <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8; font-weight: 500;">
                    Sistema Operativo Causa OS · Gestión Impecable de Acuerdos
                  </p>
                </div>

                <div style="padding: 28px 30px; background-color: #ffffff;">
                  
                  <!-- Saludo Personalizado -->
                  <p style="font-size: 15.5px; margin-top: 0; line-height: 1.5; color: #0f172a;">
                    Hola <strong>${cleanName}</strong>,
                  </p>

                  <!-- Postura Ontológica de Causa -->
                  <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 18px;">
                    En la cultura de <strong>CREAR Poder Sin Límites</strong> no gestionamos tareas mecánicas ni listas burocráticas: <strong>asumimos acuerdos de honor con la visión, con el equipo y con los participantes</strong>. Vivir en <strong>Causa</strong> es ser la fuente incondicional de los resultados, honrando nuestra palabra con total impecabilidad.
                  </p>

                  <!-- Alerta de Compromiso Fuera de Plazo -->
                  <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px 16px; margin-bottom: 22px;">
                    <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #b45309; letter-spacing: 0.5px; margin-bottom: 4px;">
                      ⚠️ Acuerdo fuera del plazo establecido
                    </div>
                    <p style="margin: 0; font-size: 13.5px; color: #78350f; line-height: 1.5;">
                      La fecha límite pactada para la siguiente acción ha vencido. Tu equipo y la operación dependen de este resultado para mantener el ciclo en sincronía:
                    </p>
                  </div>

                  <!-- Ficha del Compromiso -->
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; margin-bottom: 22px;">
                    <div style="margin-bottom: 12px;">
                      <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">
                        Compromiso asumido:
                      </span>
                      <div style="font-size: 17px; font-weight: 700; color: #0f172a; margin-top: 4px; line-height: 1.35;">
                        ${taskTitle}
                      </div>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; margin-top: 10px;">
                      <tbody>
                        <tr>
                          <td style="padding: 6px 0; color: #64748b; width: 140px; font-weight: 600;">⏰ Fecha acordada:</td>
                          <td style="padding: 6px 0; color: #dc2626; font-weight: 700;">${deadlineFormatted}</td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">📍 Sede / Proyecto:</td>
                          <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${sede}</td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">👤 Asignado por:</td>
                          <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${assigner}</td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">🚨 Prioridad:</td>
                          <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${priority}</td>
                        </tr>
                      </tbody>
                    </table>

                    ${notes ? `
                    <div style="background-color: #0f172a; color: #f8fafc; border-left: 4px solid #f59e0b; padding: 12px 14px; margin-top: 14px; border-radius: 6px;">
                      <strong style="color: #fbbf24; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">📝 Instrucciones / Contexto:</strong>
                      <span style="font-size: 13px; line-height: 1.5; color: #f1f5f9; white-space: pre-wrap;">${notes}</span>
                    </div>
                    ` : ''}
                  </div>

                  <!-- Botón de Acción Principal -->
                  <div style="text-align: center; margin: 26px 0 28px 0;">
                    <a href="https://centro-operativo-cpsl.web.app/checklist" style="background-color: #2563eb; color: #ffffff; padding: 14px 34px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35); letter-spacing: 0.3px;">
                      🚀 Honrar Compromiso en Causa OS
                    </a>
                  </div>

                  <!-- Guía Ontológica de Acción desde Causa -->
                  <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px 18px; margin-bottom: 22px;">
                    <h3 style="margin: 0 0 8px 0; color: #15803d; font-size: 13.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                      🎯 Ejerce tu Liderazgo en Causa:
                    </h3>
                    <ol style="margin: 0; padding-left: 18px; color: #166534; font-size: 13px; line-height: 1.6;">
                      <li style="margin-bottom: 5px;">
                        <strong>Si ya lo ejecutaste:</strong> Ingresa a Causa OS, adjunta tus evidencias y márcala como completada para liberar la sincronía de tu equipo.
                      </li>
                      <li style="margin-bottom: 5px;">
                        <strong>Si está en desarrollo:</strong> Actualiza tu porcentaje de avance y registra un comentario para mantener informado a tu equipo con transparencia.
                      </li>
                      <li>
                        <strong>Si enfrentas un quiebre imprevisto:</strong> No te quedes en silencio; comunícate proactivamente con tu líder de sede o asignador para renegociar el acuerdo con excelencia.
                      </li>
                    </ol>
                  </div>

                  <p style="font-size: 13px; color: #334155; margin: 20px 0 0 0; line-height: 1.5;">
                    Tu impecabilidad crea el espacio para que cosas extraordinarias sucedan.<br/>
                    <strong>Equipo de Dirección y Coordinación Operativa</strong><br/>
                    <span style="font-size: 12px; color: #64748b;">CREAR Poder Sin Límites</span>
                  </p>

                </div>

                <!-- Pie de página institucional -->
                <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 20px; text-align: center; font-size: 11.5px; color: #64748b; line-height: 1.5;">
                  <em>"Vivir en Causa es ser la fuente incondicional de los resultados."</em><br/>
                  CREAR Poder Sin Límites · Causa OS · Transformación Global
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
