import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import sanitizeHtml from 'sanitize-html';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, updateDoc, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

dotenv.config();

// --- 1. CONFIGURACIÓN DE FIREBASE CLIENT ---
// NOTA: Para ejecutar esto necesitas "npm install nodemailer firebase dotenv"
// Reemplaza esto con los datos de tu src/services/firebase.js
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

async function processMailDoc(docSnap) {
  const data = docSnap.data();
  if (data.delivery && data.delivery.state) return;

  // 'to' puede venir como string único o como array de strings (p.ej. tareas asignadas a varias
  // personas). Normalizamos siempre a un array para no romper en .toLowerCase() sobre un array.
  const rawRecipients = (Array.isArray(data.to) ? data.to : [data.to]).filter(Boolean);

  if (rawRecipients.length === 0) {
    console.warn(`⚠️ Documento de correo sin destinatario válido (doc ${docSnap.id})`);
    await updateDoc(doc(db, 'mail', docSnap.id), {
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
      const q = query(collection(db, "users"), where("emails", "array-contains", to));
      const snap = await getDocs(q);
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
    await updateDoc(doc(db, 'mail', docSnap.id), {
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

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Correo enviado con éxito a ${validRecipients.join(', ')}`);
    await updateDoc(doc(db, 'mail', docSnap.id), {
      'delivery.state': 'SUCCESS',
      'delivery.endTime': new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Error enviando a ${validRecipients.join(', ')}:`, error.message);
    await updateDoc(doc(db, 'mail', docSnap.id), {
      'delivery.state': 'ERROR',
      'delivery.error': error.message
    });
  }
}

async function processPendingMails() {
  console.log("📬 Buscando correos pendientes en Firestore...");
  try {
    const snap = await getDocs(collection(db, 'mail'));
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
    const profilesSnap = await getDocs(collection(db, 'user_profiles'));
    const now = new Date();
    
    for (const docSnap of profilesSnap.docs) {
      const data = docSnap.data();
      const email = data.email || docSnap.id;

      if (!data.lastLoginAt) continue;

      const lastLoginDate = data.lastLoginAt.toDate ? data.lastLoginAt.toDate() : new Date(data.lastLoginAt);
      const hoursSinceLogin = (now - lastLoginDate) / (1000 * 60 * 60);

      if (hoursSinceLogin > INACTIVITY_LIMIT_HOURS) {
        const lastAlertDate = data.lastInactivityAlertAt?.toDate ? data.lastInactivityAlertAt.toDate() : (data.lastInactivityAlertAt ? new Date(data.lastInactivityAlertAt) : new Date(0));
        
        if (lastAlertDate < lastLoginDate) {
          console.log(`⚠️ Usuario ${email} inactivo por más de ${INACTIVITY_LIMIT_HOURS} horas. Programando alerta.`);
          
          await addDoc(collection(db, 'mail'), {
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
            createdAt: serverTimestamp()
          });

          await updateDoc(doc(db, 'user_profiles', email), {
            lastInactivityAlertAt: serverTimestamp()
          });
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
    const tasksSnap = await getDocs(collection(db, 'tasks'));
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
        await addDoc(collection(db, 'mail'), {
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
          createdAt: serverTimestamp()
        });
      }

      await updateDoc(doc(db, 'tasks', docSnap.id), {
        lastReminderAt: serverTimestamp()
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
  onSnapshot(collection(db, 'mail'), (snapshot) => {
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

