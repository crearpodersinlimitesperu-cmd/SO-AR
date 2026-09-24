/**
 * scripts/assignInsuranceTaskAndMail.mjs
 * ========================================
 * Asigna la tarea crítica en Causa OS y envía notificación por correo institucional
 * con invitación de calendario (.ics) a todos los entrenadores de:
 * - Capítulo Uno (C1)
 * - Capítulo Dos (C2)
 * - Maestría del Juego (MJ)
 * - Dinámicas de alto impacto: Caída de Confianza, Tanque, Rompimiento de Tablas, Caminata sobre Fuego.
 *
 * Solicitud: "SOLICITUD DE SEGUROS DE SALUD VIGENTES DE LOS ENTRENADORES"
 * Fecha límite: Martes 15 de Septiembre de 2026 a las 12:00 m (mediodía)
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
import { readFileSync, existsSync } from 'fs';

// 1. INICIALIZAR FIREBASE ADMIN
const CREDENTIALS_PATH = './centro-operativo-cpsl-65ad52160f45.json';

if (!existsSync(CREDENTIALS_PATH)) {
  console.error(`❌ No se encontró el archivo de credenciales (${CREDENTIALS_PATH}).`);
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'));
if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// 2. CONFIGURAR TRANSPORTE DE CORREO (NODEMAILER)
const mailSender = process.env.GMAIL_SERVER_EMAIL || process.env.LIMA_GMAIL_USER || 'direccion@crearpsl.net';
const mailPass = process.env.GMAIL_SERVER_APP_PASSWORD || process.env.LIMA_GMAIL_PASS;

let transporter = null;
if (mailPass) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: mailSender,
      pass: mailPass
    }
  });
  console.log(`✅ Nodemailer configurado con el remitente: ${mailSender}`);
} else {
  console.warn(`⚠️ No se configuraron contraseñas de Gmail. Los correos se registrarán en la colección 'mail' para el daemon.`);
}

// 3. GENERADOR DE ADJUNTO .ICS (CALENDARIO)
function buildIcsAttachment(taskId, deadlineIso) {
  const dtStart = '20260915T170000Z'; // Martes 15 Sept 12:00 m (UTC -5 = 17:00 UTC)
  const dtEnd = '20260915T173000Z';
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `${taskId}-${Date.now()}@crearpsl.net`;

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
    'SUMMARY:🚨 PLAZO MÁXIMO: Entrega de Seguros de Salud Vigentes (Entrenadores CPSL)',
    'DESCRIPTION:Plazo límite improrrogable (12:00 m) para remitir la póliza o constancia de Seguro de Salud Vigente para entrenadores de C1, C2, MJ y dinámicas físicas (Caída de confianza, Tanque, Rompimiento, Caminata sobre fuego). Causa OS — CREAR PODER SIN LÍMITES.',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  return {
    filename: 'compromiso-seguro-salud-entrenador.ics',
    content: lines.join('\r\n'),
    contentType: 'text/calendar; charset=utf-8; method=PUBLISH'
  };
}

// 4. PLANTILLA HTML DE CORREO INSTITUCIONAL
function buildCoachInsuranceEmailHtml({ coachName, coachEmail, deadlineFormatted }) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; max-width: 650px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
      
      <!-- Cabecera Institucional -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 26px; text-align: center; border-bottom: 4px solid #ef4444;">
        <span style="display: inline-block; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #fbbf24; font-weight: 700; margin-bottom: 6px;">CREAR PODER SIN LÍMITES</span>
        <h1 style="margin: 0; font-size: 21px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">🛡️ SOLICITUD DE SEGUROS DE SALUD VIGENTES</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">Cuerpo de Entrenadores — C1, C2, MJ & Dinámicas de Alto Impacto</p>
      </div>

      <div style="padding: 26px 28px; background-color: #ffffff;">
        <p style="font-size: 15px; margin-top: 0; line-height: 1.5;">Estimado(a) <strong>${coachName}</strong>,</p>
        
        <p style="font-size: 14.5px; color: #334155; line-height: 1.6;">
          Por disposición de la <strong>Dirección General y Gerencia de Sede</strong>, y en estricto cumplimiento de los estándares de <strong>Seguridad y Salud en el Trabajo (SST)</strong> y los protocolos de resguardo físico y legal de la organización:
        </p>

        <!-- Bloque Destacado de Requerimiento -->
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 5px solid #ef4444; border-radius: 8px; padding: 18px 20px; margin: 18px 0;">
          <h2 style="margin: 0 0 8px 0; color: #991b1b; font-size: 15px; font-weight: 700;">
            ⚠️ REQUERIMIENTO OBLIGATORIO PARA ENTRENADORES DE SALA
          </h2>
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #7f1d1d; line-height: 1.5;">
            Se solicita la presentación inmediata de la <strong>copia o constancia de su SEGURO DE SALUD VIGENTE</strong> (póliza de seguro médico, seguro contra accidentes personales o EPS/IESS/EsSalud activo con cobertura médica vigente).
          </p>
          <div style="font-size: 13.5px; color: #450a0a;">
            <strong>Aplica a facilitadores de:</strong>
            <ul style="margin: 6px 0 0 0; padding-left: 20px; line-height: 1.5;">
              <li><strong>Capítulo Uno (C1)</strong></li>
              <li><strong>Capítulo Dos (C2)</strong></li>
              <li><strong>Maestría del Juego (MJ)</strong></li>
              <li><strong>Dinámicas Físicas y Vivenciales:</strong> Caída de Confianza (altura), Tanque, Rompimiento de Tablas y Caminata sobre Fuego.</li>
            </ul>
          </div>
        </div>

        <!-- Tabla de Datos Clave -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 22px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
            <tbody>
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 140px; font-weight: 600;">📅 Plazo Máximo:</td>
                <td style="padding: 6px 0; color: #dc2626; font-weight: 800; font-size: 14.5px;">${deadlineFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">👤 Solicitado por:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">José Sánchez (Dirección / Gerencia)</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">🚨 Prioridad:</td>
                <td style="padding: 6px 0; color: #ef4444; font-weight: 700;">🔴 ROJO (Urgente / Crítica)</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">📋 Tarea en Causa OS:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">SOLICITUD DE SEGUROS DE SALUD VIGENTES DE LOS ENTRENADORES</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pasos para la entrega -->
        <h3 style="color: #0f172a; font-size: 14.5px; font-weight: 700; margin: 20px 0 10px 0;">
          📥 ¿Cómo enviar tu constancia de seguro?
        </h3>
        <ol style="margin: 0; padding-left: 20px; color: #334155; font-size: 13.5px; line-height: 1.6;">
          <li style="margin-bottom: 8px;">
            <strong>Opción 1 (Directa por Correo):</strong> Responde directamente a este correo adjuntando el documento de tu póliza, carnet de asegurado o certificado de vigencia en formato PDF o imagen legible.
          </li>
          <li style="margin-bottom: 8px;">
            <strong>Opción 2 (Plataforma Causa OS):</strong> Ingresa a la plataforma operativa, ubica la tarea en tu checklist y adjunta el enlace o confirmación en las notas de avance.
          </li>
        </ol>

        <!-- Botón de Acción -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="https://centro-operativo-cpsl.web.app" style="background-color: #dc2626; color: #ffffff; padding: 14px 34px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.35);">
            🛡️ Ver Tarea en Causa OS
          </a>
        </div>

        <p style="font-size: 12.5px; color: #64748b; line-height: 1.5; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
          📅 <em>Se adjuntó la invitación de calendario (.ics) correspondiente para registrar el vencimiento del <strong>Martes 15 de Septiembre a las 12:00 m</strong> en tu Google Calendar o aplicación de agenda.</em>
        </p>

        <p style="font-size: 13px; color: #334155; margin: 18px 0 0 0;">
          Atentamente,<br/>
          <strong>José Sánchez</strong><br/>
          <span style="font-size: 12px; color: #64748b;">Dirección y Gerencia de Sede — CREAR PODER SIN LÍMITES</span>
        </p>
      </div>

      <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 20px; text-align: center; font-size: 11px; color: #94a3b8;">
        Este es un comunicado oficial y urgente del sistema Causa OS para el cuerpo de facilitadores y entrenadores de CREAR Poder Sin Límites.
      </div>
    </div>
  `;
}

// 5. LISTADO AUTORIZADO DE ENTRENADORES (C1, C2, MJ, DINÁMICAS FÍSICAS)
const KNOWN_COACHES = [
  { name: 'Alejandro Díaz', email: 'emalejodiaz@gmail.com', sede: 'Global', role: 'entrenador' },
  { name: 'Alonso Solares Salazar', email: 'solaresalonso@gmail.com', sede: 'Global', role: 'entrenador' },
  { name: 'Ana Elena Monroy', email: 'anamonroyt@gmail.com', sede: 'Global', role: 'entrenador' },
  { name: 'Andrés Idrobo', email: 'e.andresid@gmail.com', sede: 'Global', role: 'entrenador' },
  { name: 'Cirilo Agustín Martínez', email: 'ciriloagustin21@gmail.com', sede: 'Global', role: 'entrenador' },
  { name: 'Diego Bravo', email: 'dibrafi@gmail.com', sede: 'Global', role: 'entrenador' },
  { name: 'Haydin Fernando Mendoza Clavijo', email: 'fernandomendozaclavijo22@gmail.com', sede: 'Global', role: 'entrenador' },
  { name: 'Jesús Adrián Acosta', email: 'chuyacostar88@gmail.com', sede: 'Global', role: 'entrenador' },
  { name: 'Juan Angel', email: 'jarreolamorales@gmail.com', sede: 'Global', role: 'entrenador' },
  { name: 'Julio César Narváez', email: 'coor.operaciones2023@gmail.com', sede: 'Global', role: 'entrenador' },
  { name: 'María De Lourdes Patiño Galarraga', email: 'marylourdespat@gmail.com', sede: 'Global', role: 'entrenador' },
  { name: 'Mauricio Pérez', email: 'mperez.ttw@gmail.com', sede: 'Global', role: 'entrenador' },
  { name: 'Mike Boada', email: 'direccion@bmbgbrokers.com', sede: 'Global', role: 'entrenador' },
  { name: 'Mildred Muñoz Vasquez', email: 'mildredmunozv@gmail.com', sede: 'Global', role: 'entrenador' },
  { name: 'Kerlie Carrillo', email: 'kerly.carrillo@crearpsl.net', sede: 'Cuenca', role: 'entrenador' },
  { name: 'Emily Campuzano', email: 'emily.campuzano@crearpsl.net', sede: 'Quito', role: 'entrenador' },
  { name: 'José Sánchez', email: 'jose.sanchez@crearpsl.net', sede: 'Lima', role: 'entrenador' }
];

async function main() {
  console.log('🚀 Iniciando proceso de asignación y notificación de seguros de salud para entrenadores...');

  const masterTaskId = 'custom_seguros_salud_entrenadores_20260915';

  // Verificación de idempotencia
  const existingMasterDoc = await db.collection('tasks').doc(masterTaskId).get();
  if (existingMasterDoc.exists && existingMasterDoc.data()?.emailsSent === true && !process.env.FORCE_RESEND) {
    console.log('✅ La tarea y los correos para la solicitud de seguros de salud ya fueron emitidos exitosamente. Omitiendo reenvío para evitar spam.');
    return;
  }

  // A. Obtener entrenadores adicionales de Firestore si existen
  const coachesMap = new Map();
  for (const c of KNOWN_COACHES) {
    coachesMap.set(c.email.toLowerCase().trim(), c);
  }

  try {
    const usersSnap = await db.collection('users').get();
    usersSnap.forEach(docSnap => {
      const u = docSnap.data();
      const email = (u.email || docSnap.id || '').toLowerCase().trim();
      if (!email || !email.includes('@')) return;

      const roles = Array.isArray(u.roles) ? u.roles.join(' ') : (u.role || '');
      const isCoach = /entrenador|coach/i.test(roles);

      if (isCoach && u.isActive !== false && u.status !== 'inactive') {
        if (!coachesMap.has(email)) {
          coachesMap.set(email, {
            name: u.name || u.displayName || email,
            email: email,
            sede: u.sede || 'Global',
            role: 'entrenador'
          });
          console.log(`➕ Entrenador adicional detectado en Firestore: ${u.name || email} (${email})`);
        }
      }
    });
  } catch (err) {
    console.warn('⚠️ Advertencia leyendo colección users:', err.message);
  }

  const detectedCoaches = Array.from(coachesMap.values());
  console.log(`📋 Total de entrenadores identificados: ${detectedCoaches.length}`);
  detectedCoaches.forEach((c, idx) => {
    console.log(`   ${idx + 1}. ${c.name} <${c.email}> (${c.sede})`);
  });

  // Exclusión segura de recordatorios: únicamente una verificación humana con
  // fecha de vigencia futura habilita la exclusión. Un archivo hallado en
  // Drive, su fecha de modificación o una coincidencia probable NO bastan.
  const today = new Date().toISOString().slice(0, 10);
  const validPolicyEmails = new Set();
  try {
    const policySnap = await db.collection('trainer_policy_reviews')
      .where('verificationStatus', '==', 'vigente').get();
    policySnap.forEach(policyDoc => {
      const policy = policyDoc.data();
      const email = String(policy.coachEmail || '').toLowerCase().trim();
      if (email && policy.validUntil >= today && policy.verifiedFileId) validPolicyEmails.add(email);
    });
  } catch (err) {
    // Fallo cerrado: si no se puede leer el control, no se excluye a nadie.
    console.warn('⚠️ No se pudo consultar pólizas vigentes; no se aplicará exclusión automática:', err.message);
  }
  const allCoaches = detectedCoaches.filter(coach => !validPolicyEmails.has(coach.email.toLowerCase().trim()));
  const excludedCoaches = detectedCoaches.filter(coach => validPolicyEmails.has(coach.email.toLowerCase().trim()));
  console.log(`🛡️ ${excludedCoaches.length} entrenadores con póliza vigente confirmada no recibirán solicitud ni recordatorio.`);

  // B. Parámetros de la Tarea
  const DEADLINE_ISO = '2026-09-15T12:00:00-05:00';
  const DEADLINE_FORMATTED = 'Martes, 15 de Septiembre de 2026 — 12:00 m (Mediodía)';
  const TASK_TITLE = 'SOLICITUD DE SEGUROS DE SALUD VIGENTES DE LOS ENTRENADORES';
  const TASK_NOTES = `SOLICITUD INSTITUCIONAL URGENTE — SEGUROS DE SALUD VIGENTES

Estimados Entrenadores de Sala (Capítulo 1, C2, Maestría del Juego y Dinámicas Físicas):

Por disposición de la Dirección General y en estricto cumplimiento de los estándares de Seguridad y Salud en el Trabajo (SST) para la facilitación de procesos transformacionales presenciales (Capítulo Uno, Capítulo Dos, Maestría del Juego) y dinámicas vivenciales de alto impacto físico (Caída de confianza, Tanque, Rompimiento de tablas, Caminata sobre fuego):

Se solicita a todos los entrenadores remitir de forma obligatoria la constancia o póliza de su SEGURO DE SALUD VIGENTE (póliza activa que cubra atención médica/accidentes).

PLAZO MÁXIMO DE ENTREGA: Martes 15 de Septiembre de 2026 a las 12:00 m (mediodía).

CÓMO ENVIAR LA CONSTANCIA:
1. Responder al correo institucional adjuntando la póliza/carnet/certificado de vigencia en PDF o imagen legible.
2. O ingresar a Causa OS (https://centro-operativo-cpsl.web.app), abrir esta tarea en tu Matriz y adjuntar el enlace/evidencia en las notas de avance.`;

  const coachEmails = allCoaches.map(c => c.email.toLowerCase().trim());

  // Asegurar que cada entrenador esté registrado en Firestore 'users' para habilitar permisos y validación de correo
  for (const coach of allCoaches) {
    try {
      await db.collection('users').doc(coach.email).set({
        name: coach.name,
        email: coach.email,
        sede: coach.sede || 'Global',
        role: 'entrenador',
        roles: ['entrenador'],
        emails: [coach.email],
        isActive: true
      }, { merge: true });
    } catch (e) {
      // Ignorar si ya existe
    }
  }

  // Mapa de progreso individual por entrenador
  const assigneeProgress = {};
  allCoaches.forEach(c => {
    assigneeProgress[c.email.toLowerCase().trim()] = {
      name: c.name,
      role: 'entrenador',
      sede: c.sede || 'Global',
      completed: false,
      completedAt: null,
      progress: 0
    };
  });

  // C. Guardar o actualizar la Tarea Maestra en Firestore
  const taskData = {
    id: masterTaskId,
    task: TASK_TITLE,
    title: TASK_TITLE,
    notes: TASK_NOTES,
    description: TASK_NOTES,
    comments: TASK_NOTES,
    deadline: DEADLINE_ISO,
    priority: '🔴 ROJO',
    isCritical: true,
    isOptional: false,
    periodicity: 'UNICA',
    role: 'entrenador',
    assignedSede: 'Global',
    createdBy: 'jose.sanchez@crearpsl.net',
    assignedByName: 'José Sánchez — Dirección y Gerencia de Sede',
    assignedByEmail: 'jose.sanchez@crearpsl.net',
    assignedToEmails: coachEmails,
    assignedRoles: ['entrenador'],
    status: 'Pendiente',
    completed: false,
    created_at: new Date().toISOString(),
    progressNotes: [
      {
        id: 'note_initial_sst',
        text: TASK_NOTES,
        createdAt: new Date().toISOString(),
        authorName: 'José Sánchez',
        authorEmail: 'jose.sanchez@crearpsl.net',
        isInitialNote: true
      }
    ],
    assigneeProgress: assigneeProgress
  };

  await db.collection('tasks').doc(masterTaskId).set(taskData, { merge: true });
  console.log(`✅ Tarea Maestra asignada en Firestore [tasks/${masterTaskId}] con ${coachEmails.length} entrenadores.`);

  // D. Guardar también tareas individuales directas por entrenador para garantizar visibilidad al 100% en todas las vistas de Causa OS
  for (const coach of allCoaches) {
    const emailClean = coach.email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    const individualTaskId = `task_seguro_salud_${emailClean}`;
    await db.collection('tasks').doc(individualTaskId).set({
      id: individualTaskId,
      parentTaskId: masterTaskId,
      task: TASK_TITLE,
      title: TASK_TITLE,
      notes: TASK_NOTES,
      description: TASK_NOTES,
      comments: TASK_NOTES,
      deadline: DEADLINE_ISO,
      priority: '🔴 ROJO',
      isCritical: true,
      isOptional: false,
      periodicity: 'UNICA',
      role: 'entrenador',
      assignedSede: coach.sede || 'Global',
      createdBy: 'jose.sanchez@crearpsl.net',
      assignedByName: 'José Sánchez — Dirección y Gerencia de Sede',
      assignedByEmail: 'jose.sanchez@crearpsl.net',
      assignedToEmail: coach.email.toLowerCase().trim(),
      assignedToEmails: [coach.email.toLowerCase().trim()],
      status: 'Pendiente',
      completed: false,
      created_at: new Date().toISOString()
    }, { merge: true });
  }
  console.log(`✅ Tareas individuales directas registradas para cada uno de los ${allCoaches.length} entrenadores.`);

  // E. Crear Notificaciones In-App para cada entrenador
  const notifBatch = db.batch();
  for (const coach of allCoaches) {
    const notifRef = db.collection('notifications').doc();
    notifBatch.set(notifRef, {
      userId: coach.email.toLowerCase().trim(),
      title: `🚨 ${TASK_TITLE}`,
      message: `Requerimiento obligatorio: Presentar Seguro de Salud Vigente para entrenadores de C1, C2, MJ y dinámicas físicas. Plazo máximo: ${DEADLINE_FORMATTED}.`,
      read: false,
      taskId: masterTaskId,
      created_at: new Date().toISOString()
    });
  }
  await notifBatch.commit();
  console.log(`✅ ${allCoaches.length} Notificaciones In-App creadas en Firestore.`);

  // F. Enviar Correos Institucionales y registrar en cola de correo
  console.log('\n📧 Iniciando envío y registro de correos electrónicos...');
  let sentCount = 0;
  let queuedCount = 0;

  for (const coach of allCoaches) {
    const emailClean = coach.email.toLowerCase().trim();
    const emailHtml = buildCoachInsuranceEmailHtml({
      coachName: coach.name,
      coachEmail: emailClean,
      deadlineFormatted: DEADLINE_FORMATTED
    });
    const icsAttachment = buildIcsAttachment(masterTaskId, DEADLINE_ISO);

    const mailDocRef = db.collection('mail').doc();
    const mailDocData = {
      to: [emailClean],
      message: {
        subject: `🚨 SOLICITUD DE SEGUROS DE SALUD VIGENTES DE LOS ENTRENADORES — Causa OS`,
        html: emailHtml
      },
      calendarEvent: {
        taskId: masterTaskId,
        title: '🚨 PLAZO MÁXIMO: Entrega de Seguros de Salud Vigentes (Entrenadores CPSL)',
        deadline: DEADLINE_ISO,
        description: 'Plazo límite improrrogable (12:00 m) para remitir la póliza de Seguro de Salud Vigente. CREAR PODER SIN LÍMITES.'
      },
      createdAt: FieldValue.serverTimestamp(),
      type: 'seguro_salud_entrenadores'
    };

    // Si transporter está activo, enviar directamente
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"CREAR PODER SIN LÍMITES" <${mailSender}>`,
          to: emailClean,
          replyTo: 'jose.sanchez@crearpsl.net',
          subject: `🚨 SOLICITUD DE SEGUROS DE SALUD VIGENTES DE LOS ENTRENADORES — Causa OS`,
          html: emailHtml,
          attachments: [icsAttachment]
        });
        mailDocData.delivery = {
          state: 'SUCCESS',
          deliveredAt: new Date().toISOString(),
          sentVia: 'direct_nodemailer'
        };
        sentCount++;
        console.log(`   ✉️ Correo enviado exitosamente a: ${coach.name} <${emailClean}>`);
      } catch (mailErr) {
        console.error(`   ⚠️ Fallo envío directo a ${emailClean}: ${mailErr.message}. Queda en cola.`);
        mailDocData.delivery = {
          state: 'PENDING_RETRY',
          error: mailErr.message
        };
        queuedCount++;
      }
    } else {
      queuedCount++;
    }

    await mailDocRef.set(mailDocData);
  }

  // Marcar en la tarea maestra que los correos ya fueron emitidos
  await db.collection('tasks').doc(masterTaskId).set({
    emailsSent: true,
    emailsSentAt: new Date().toISOString(),
    emailsSentCount: sentCount,
    emailsQueuedCount: queuedCount
  }, { merge: true });

  console.log(`\n======================================================`);
  console.log(`🎉 PROCESO COMPLETADO EXITOSAMENTE`);
  console.log(`   - Tareas Asignadas en Causa OS: 1 Maestra + ${allCoaches.length} Individuales`);
  console.log(`   - Notificaciones In-App Creadas: ${allCoaches.length}`);
  console.log(`   - Correos Enviados Directamente: ${sentCount}`);
  console.log(`   - Correos en Cola / Auditados: ${allCoaches.length}`);
  console.log(`   - Fecha Límite: ${DEADLINE_FORMATTED}`);
  console.log(`======================================================\n`);
}

main().catch(err => {
  console.error('❌ Error fatal ejecutando script:', err);
  process.exit(1);
});
