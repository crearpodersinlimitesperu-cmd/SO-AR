import { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc, writeBatch, addDoc, query, where, orderBy, limit, getDocs, getDoc } from 'firebase/firestore';
import { checklistData } from '../data/checklistData';
import { usersData, normalizeRole } from '../data/usersData';
import { isSuperAdminEmail, isGerenciaRole } from '../config/permissions';
import { calculateAutomaticDeadline } from '../utils/soarDates';
import { createGoogleTask } from '../services/googleSync';
import { useUI } from './UIContext';
import { useAuth } from './AuthContext';
import { useCycles } from './CyclesContext';

const ChecklistContext = createContext();

// Formatea una fecha límite ISO a texto legible en español, para los correos
// de asignación de tarea (agregado 28/08/2026 a pedido de José, para que el
// correo indique la fecha/hora límite y no solo que "se asignó una tarea").
const formatDeadlineEs = (iso) => {
  if (!iso) return 'Sin fecha límite definida';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('es-PE', { dateStyle: 'full', timeStyle: 'short' });
  } catch (e) {
    return iso;
  }
};

// Genera una plantilla de correo HTML institucional, moderna y responsiva
// con detalles completos de la tarea, botón de acceso directo e indicaciones
// paso a paso de inicio de sesión en Causa OS (clave para colaboradores nuevos o sin conexión).
const buildTaskEmailHtml = ({
  taskTitle,
  notes,
  deadline,
  assignedSede,
  priority,
  assignedByName,
  recipientName,
  recipientEmail,
  isUpdate = false
}) => {
  const greetingName = recipientName || 'Colaborador';
  const cleanNotes = (notes || '').trim();
  const safeAssigner = assignedByName || 'Dirección / Supervisión';
  const headerTitle = isUpdate ? 'Tarea Actualizada' : 'Nueva Tarea Asignada';
  const subtitle = isUpdate 
    ? `Se ha modificado una tarea que tienes asignada en la plataforma operativa <strong>Causa OS</strong>.`
    : `Se te ha asignado una responsabilidad operativa en la plataforma <strong>Causa OS</strong>.`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; max-width: 620px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
      <!-- Cabecera Institucional -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 24px; text-align: center; border-bottom: 3px solid #f59e0b;">
        <span style="display: inline-block; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #fbbf24; font-weight: 700; margin-bottom: 6px;">CREAR PODER SIN LÍMITES</span>
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">📋 ${headerTitle}</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">Sistema Operativo Causa OS</p>
      </div>

      <div style="padding: 26px 28px; background-color: #ffffff;">
        <p style="font-size: 15px; margin-top: 0; line-height: 1.5;">Hola <strong>${greetingName}</strong>,</p>
        <p style="font-size: 14.5px; color: #475569; line-height: 1.5; margin-bottom: 20px;">${subtitle}</p>

        <!-- Tarjeta de Detalle de la Tarea -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; margin-bottom: 22px;">
          <div style="margin-bottom: 12px;">
            <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Tarea asignada:</span>
            <div style="font-size: 17px; font-weight: 700; color: #0f172a; margin-top: 4px; line-height: 1.35;">${taskTitle}</div>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; margin-top: 10px;">
            <tbody>
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 130px; font-weight: 600;">👤 Asignado por:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${safeAssigner}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">⏰ Fecha límite:</td>
                <td style="padding: 6px 0; color: #dc2626; font-weight: 700;">${formatDeadlineEs(deadline)}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">📍 Sede / Área:</td>
                <td style="padding: 6px 0; color: #0f172a;">${assignedSede || 'Global'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">🚨 Prioridad:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${priority || 'Normal'}</td>
              </tr>
            </tbody>
          </table>

          ${cleanNotes ? `
          <div style="background-color: #0f172a; color: #f8fafc; border-left: 4px solid #f59e0b; padding: 14px 16px; margin-top: 14px; border-radius: 6px;">
            <strong style="color: #fbbf24; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">📝 Notas e Instrucciones Específicas:</strong>
            <span style="white-space: pre-wrap; font-size: 13.5px; line-height: 1.5; color: #f1f5f9;">${cleanNotes}</span>
          </div>
          ` : ''}
        </div>

        <!-- Botón de Acción Principal -->
        <div style="text-align: center; margin: 26px 0 28px 0;">
          <a href="https://centro-operativo-cpsl.web.app" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.35);">
            🚀 Ingresar a Causa OS
          </a>
        </div>

        <!-- Bloque de Indicaciones de Acceso Paso a Paso (Para colaboradores nuevos o sin conexión) -->
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px 18px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #15803d; font-size: 14px; font-weight: 700;">
            📌 Indicaciones para ingresar a la plataforma:
          </h3>
          <ol style="margin: 0; padding-left: 18px; color: #166534; font-size: 13px; line-height: 1.6;">
            <li style="margin-bottom: 5px;">
              <strong>Acceso al enlace:</strong> Haz clic en el botón superior o ingresa directamente a <a href="https://centro-operativo-cpsl.web.app" style="color: #1d4ed8; font-weight: 600; text-decoration: underline;">https://centro-operativo-cpsl.web.app</a> (disponible desde PC o celular).
            </li>
            <li style="margin-bottom: 5px;">
              <strong>Inicio de sesión:</strong> Haz clic en el botón <strong>"Continuar con Google"</strong> y selecciona tu cuenta corporativa institucional (<strong>${recipientEmail}</strong>).
            </li>
            <li style="margin-bottom: 5px;">
              <strong>Matriz de tareas:</strong> En tu pantalla principal verás tu checklist con esta tarea lista para revisión.
            </li>
            <li>
              <strong>Seguimiento y cierre:</strong> Podrás registrar comentarios, reportar porcentaje de avance y adjuntar evidencias para marcarla como completada.
            </li>
          </ol>
        </div>

        <p style="font-size: 12.5px; color: #64748b; line-height: 1.5; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
          📅 <em>Se adjuntó una invitación de calendario (.ics) a este correo para que puedas agendar el vencimiento de esta tarea directamente en tu Google Calendar o aplicación de agenda.</em>
        </p>

        <p style="font-size: 13px; color: #334155; margin: 16px 0 0 0;">
          Atentamente,<br/>
          <strong>Equipo de Coordinación y Dirección</strong><br/>
          <span style="font-size: 12px; color: #64748b;">CREAR Poder Sin Límites</span>
        </p>
      </div>

      <!-- Pie de página -->
      <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 20px; text-align: center; font-size: 11px; color: #94a3b8;">
        Este es un mensaje automático del Sistema Operativo Causa OS. Si tienes dudas con tus credenciales o acceso, contacta a Soporte / Dirección de CREAR.
      </div>
    </div>
  `;
};

export function ChecklistProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast, showPrompt } = useUI();
  const { currentUser, reauthenticateGoogle } = useAuth();
  // (28/08/2026, restaurado 29/08/2026) CORRECCIÓN: antes calculateAutomaticDeadline()
  // se llamaba SIN el ciclo activo real, así que siempre usaba el único ciclo de
  // ejemplo hardcodeado en src/data/cyclesData.js ("Equipo 30", fechas fijas) para
  // TODOS los usuarios, sin importar su sede o equipo real. Eso hacía que los
  // "Límite" mostrados en los checklists no correspondieran a las fechas reales del
  // ciclo de cada sede — José lo reportó como "los horarios en los checklist no son
  // coherentes con la tarea". Ahora se usa el ciclo real (currentCycle, calculado en
  // CyclesContext.jsx a partir del calendario oficial en vivo) para que cada sede vea
  // sus propias fechas.
  const cyclesCtx = useCycles();
  const currentCycle = cyclesCtx?.currentCycle || null;

  // Escribe cambios en un documento de "tasks", creándolo primero si todavía no existe.
  //
  // CONTEXTO (29/08/2026): las tareas del catálogo base (checklistData.js) se muestran
  // en pantalla y son clicables aunque nunca se haya creado su documento propio en
  // Firestore — se fusionan del lado del cliente en el onSnapshot de arriba
  // ("missingBaseTasks"), y solo quedan escritas de verdad si alguien corre
  // initializeFirestore() o si esta función las crea al primer toque. updateDoc()
  // exige que el documento YA exista; si no existe, las reglas de seguridad no pueden
  // evaluar "resource" (es null) y Firestore lo rechaza como "permission-denied" —
  // el mismo error que se ve como "revisa los permisos de Firestore", aunque la causa
  // real no es un permiso mal configurado sino que el documento nunca se creó. Por eso
  // se verifica primero si existe: si no, se crea con los datos base del catálogo (para
  // que quede completo para cualquier otro que lo lea) + el cambio pedido; si ya existe,
  // se actualiza normalmente sin tocar el resto de sus campos.
  const writeTaskDoc = async (taskId, updates) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const snap = await getDoc(taskRef);
      if (!snap.exists()) {
        const baseTask = checklistData.find(t => t.id === taskId);
        await setDoc(taskRef, {
          ...(baseTask || {}),
          id: taskId,
          completed: false,
          status: 'Pendiente',
          priority: baseTask?.isCritical ? '🔴 ROJO' : '🟡 AMARILLO',
          progressPercentage: 0,
          deadline: baseTask ? calculateAutomaticDeadline(baseTask, currentCycle) : null,
          created_at: new Date().toISOString(),
          ...updates
        });
      } else {
        await updateDoc(taskRef, updates);
      }
    } catch (err) {
      console.warn("writeTaskDoc local update fallback:", err);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    }
  };

  useEffect(() => {
    // Escuchar cambios en la colección "tasks" en tiempo real
    const tasksRef = collection(db, 'tasks');
    const unsubscribe = onSnapshot(tasksRef, (snapshot) => {
      const userSede = currentUser?.sede?.trim() || 'Global';
      let loadedTasks = [];

      if (!snapshot.empty) {
        loadedTasks = snapshot.docs.map(doc => {
          const data = doc.data();
          let sedeCompleted = data.completed;
          let sedeStatus = data.status;
          
          if (data.completions) {
            const cycleKey = currentCycle?.id ? `${userSede}__${currentCycle.id}` : null;
            const myCycleData = cycleKey ? data.completions[cycleKey] : null;
            const mySedeData = data.completions[userSede];
            const effective = (myCycleData && myCycleData.completed !== undefined)
              ? myCycleData
              : (mySedeData || { completed: false, status: 'Pendiente' });
            sedeCompleted = effective.completed;
            sedeStatus = effective.status;
          }

          return {
            id: doc.id,
            ...data,
            completed: sedeCompleted,
            status: sedeStatus
          };
        });
      }

      // Roles ejecutivos que NO deben recibir tareas del catálogo base automáticamente.
      // Fer Aragón (ceo), Paul Sosa (cco) y similares no operan el checklist operativo.
      const EXECUTIVE_ROLES_NO_CHECKLIST = ['ceo', 'cco', 'socio', 'super_admin', 'direccion'];
      const userRoleForMerge = currentUser?.appRole || currentUser?.role || '';
      const userEmailLower = (currentUser?.email || '').toLowerCase().trim();
      const skipCatalogMerge = EXECUTIVE_ROLES_NO_CHECKLIST.includes(userRoleForMerge) || 
                                userEmailLower === 'fer.aragon@crearpsl.net' || 
                                userEmailLower === 'paul.sosa@crearpsl.net';

      // Merge de seguridad: Asegurar que todas las tareas del catálogo base (incluidas las nuevas de QT) existan
      // Solo se aplica a roles operativos — no a roles ejecutivos sin checklist propio.
      const existingIds = new Set(loadedTasks.map(t => t.id));
      const missingBaseTasks = skipCatalogMerge ? [] : checklistData.filter(t => !existingIds.has(t.id)).map(task => {
        const autoDeadline = calculateAutomaticDeadline(task, currentCycle);
        return {
          ...task,
          id: task.id,
          completed: false,
          status: 'Pendiente',
          priority: task.isCritical ? '🔴 ROJO' : '🟡 AMARILLO',
          progressPercentage: 0,
          deadline: autoDeadline,
          created_at: new Date().toISOString()
        };
      });

      const allTasks = [...loadedTasks, ...missingBaseTasks];
      setTasks(allTasks);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching tasks from Firestore:", error);
      // Fallback a checklistData local si Firestore falla
      const EXECUTIVE_ROLES_NO_CHECKLIST = ['ceo', 'cco', 'socio', 'super_admin', 'direccion'];
      const userRoleForFallback = currentUser?.appRole || currentUser?.role || '';
      const userEmailLower = (currentUser?.email || '').toLowerCase().trim();
      let devCustom = [];
      try {
        devCustom = JSON.parse(localStorage.getItem('cpsl_dev_tasks') || '[]');
      } catch(e) {}

      if (EXECUTIVE_ROLES_NO_CHECKLIST.includes(userRoleForFallback) || 
          userEmailLower === 'fer.aragon@crearpsl.net' || 
          userEmailLower === 'paul.sosa@crearpsl.net') {
        setTasks(devCustom);
        setLoading(false);
        return;
      }
      const localTasks = checklistData.map(task => ({
        ...task,
        completed: false,
        status: 'Pendiente',
        priority: task.isCritical ? '🔴 ROJO' : '🟡 AMARILLO',
        progressPercentage: 0,
        deadline: calculateAutomaticDeadline(task, currentCycle)
      }));
      setTasks([...localTasks, ...devCustom]);
      setLoading(false);
    });

    return () => unsubscribe();
    // currentCycle?.id se agrega para que, en cuanto CyclesContext termine de cargar
    // el ciclo real (llega después del primer render, vía la API del calendario),
    // este listener se vuelva a suscribir y recalcule los "deadline" faltantes con
    // las fechas reales — antes se quedaban calculados con el ciclo de ejemplo.
  }, [currentUser?.sede, currentUser?.email, currentUser?.appRole, currentCycle?.id, currentCycle?.name]);

  const toggleTask = async (taskId, currentStatus) => {
    try {
      const userSede = currentUser?.sede?.trim() || 'Global';
      const cycleKey = currentCycle?.id ? `${userSede}__${currentCycle.id}` : null;

      const updates = {
        completed: !currentStatus,
        status: !currentStatus ? 'Completada' : 'Pendiente',
        [`completions.${userSede}.completed`]: !currentStatus,
        [`completions.${userSede}.status`]: !currentStatus ? 'Completada' : 'Pendiente',
        [`completions.${userSede}.updatedAt`]: new Date().toISOString()
      };

      if (cycleKey) {
        updates[`completions.${cycleKey}.completed`] = !currentStatus;
        updates[`completions.${cycleKey}.status`] = !currentStatus ? 'Completada' : 'Pendiente';
        updates[`completions.${cycleKey}.cycleId`] = currentCycle.id;
        updates[`completions.${cycleKey}.cycleName`] = currentCycle.name || '';
        updates[`completions.${cycleKey}.updatedAt`] = new Date().toISOString();
      }

      // Update both legacy and map formats just in case it's a custom task
      await writeTaskDoc(taskId, updates);
    } catch (error) {
      console.error("Error updating task:", error);
      showToast("No se pudo actualizar la tarea. Revisa los permisos de Firestore.", "error");
    }
  };

  const updateTaskDetails = async (taskId, updates) => {
    try {
      await writeTaskDoc(taskId, updates);
    } catch (error) {
      console.error("Error updating task details:", error);
      showToast("No se pudo actualizar la tarea.", "error");
    }
  };

  const addCustomTask = async (taskData) => {
    try {
      const batch = writeBatch(db);
      // Creamos un ID único usando timestamp
      const customId = `custom_${Date.now()}`;
      const taskRef = doc(db, 'tasks', customId);
      
      // Sanitizar correos para prevenir errores de dominio y ortografía (ej: crearpls.com -> crearpsl.net, ketherine -> katherine, coodinacion -> coordinacion)
      const sanitizeEmail = (e) => (typeof e === 'string' ? e.trim().toLowerCase()
        .replace('@crearpls.com', '@crearpsl.net')
        .replace(/ketherine\.aguirre@/gi, 'katherine.aguirre@')
        .replace(/coodinacion\.administrativa@/gi, 'coordinacion.administrativa@') : '');
      const cleanData = { ...taskData };
      if (Array.isArray(cleanData.assignedToEmails)) {
        cleanData.assignedToEmails = [...new Set(cleanData.assignedToEmails.map(sanitizeEmail).filter(Boolean))];
      }
      if (cleanData.assignedToEmail) {
        cleanData.assignedToEmail = sanitizeEmail(cleanData.assignedToEmail);
      }

      // Asegurarse de tener un arreglo unificado de correos (legacy o nuevo)
      const emailsToNotify = [];
      if (cleanData.assignedToEmails && Array.isArray(cleanData.assignedToEmails)) {
        emailsToNotify.push(...cleanData.assignedToEmails);
      } else if (cleanData.assignedToEmail) {
        emailsToNotify.push(cleanData.assignedToEmail);
      }

      // Inicializar seguimiento individual para tareas asignadas a varias personas / áreas
      const assigneeProgress = cleanData.assigneeProgress || {};
      if (emailsToNotify.length > 0) {
        emailsToNotify.forEach(email => {
          const cleanEmail = sanitizeEmail(email);
          if (cleanEmail && !assigneeProgress[cleanEmail]) {
            const u = usersData.find(usr => usr.email?.toLowerCase() === cleanEmail);
            assigneeProgress[cleanEmail] = {
              name: u?.name || cleanEmail,
              role: u?.role || cleanData.role || 'colaborador',
              sede: u?.sede || cleanData.assignedSede || 'Global',
              completed: false,
              completedAt: null,
              progress: 0
            };
          }
        });
      }

      if (cleanData.isRecurringTemplate) {
        const templateRef = doc(db, 'recurring_tasks_templates', customId);
        batch.set(templateRef, {
          id: customId,
          ...cleanData,
          assigneeProgress,
          created_at: new Date().toISOString(),
          active: true
        });
      } else {
        batch.set(taskRef, {
          id: customId,
          ...cleanData,
          assigneeProgress,
          completed: false,
          status: 'Pendiente',
          created_at: new Date().toISOString()
        });
      }

      // Si la tarea tiene asignaciones directas a uno o más usuarios y no es una plantilla
      if (emailsToNotify.length > 0 && !cleanData.isRecurringTemplate) {
        emailsToNotify.forEach(email => {
          const cleanEmail = sanitizeEmail(email);
          const noteSnippet = cleanData.notes ? cleanData.notes.trim() : '';
          const notifMsg = noteSnippet
            ? `Se te asignó en ${cleanData.assignedSede || 'Global'}: "${cleanData.task || cleanData.title}". Nota: ${noteSnippet.substring(0, 80)}${noteSnippet.length > 80 ? '...' : ''}`
            : `Se te ha asignado una nueva tarea urgente en la sede ${cleanData.assignedSede || 'Global'}.`;

          // 1. Notificación In-App
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            userId: cleanEmail,
            title: cleanData.task || cleanData.title,
            message: notifMsg,
            read: false,
            taskId: customId,
            created_at: new Date().toISOString()
          });

          // 2. Notificación por Correo (Vía Firebase Trigger Email Extension / mailerDaemon)
          const u = usersData.find(usr => usr.email?.toLowerCase() === cleanEmail);
          const recipientName = u?.name || cleanEmail;
          const assignerName = cleanData.assignedByName || currentUser?.displayName || currentUser?.name || currentUser?.email || 'Dirección CREAR';

          const mailRef = doc(collection(db, 'mail'));
          batch.set(mailRef, {
            to: [cleanEmail],
            message: {
              subject: `📋 NUEVA TAREA ASIGNADA: ${cleanData.task || cleanData.title} — Causa OS`,
              html: buildTaskEmailHtml({
                taskTitle: cleanData.task || cleanData.title,
                notes: noteSnippet,
                deadline: cleanData.deadline,
                assignedSede: cleanData.assignedSede || 'Global',
                priority: cleanData.priority || 'Normal',
                assignedByName: assignerName,
                recipientName,
                recipientEmail: cleanEmail,
                isUpdate: false
              })
            },
            // (04/09/2026) José pidió que estos correos incluyan el botón de
            // "Añadir al calendario" de Gmail/Outlook — mailerDaemon.js arma
            // el adjunto .ics a partir de este campo (si no hay "deadline",
            // simplemente no adjunta nada, no rompe el envío del correo).
            calendarEvent: {
              taskId: customId,
              title: cleanData.task || cleanData.title,
              deadline: cleanData.deadline || null,
              description: `Tarea Causa OS — Sede: ${cleanData.assignedSede || 'Global'}. Asignado por: ${assignerName}. Prioridad: ${cleanData.priority || 'Normal'}.${noteSnippet ? ' \nNotas: ' + noteSnippet : ''}`
            }
          });
        });
      }

      await batch.commit();
      return true;
    } catch (error) {
      console.error("Error creating custom task:", error);
      showToast("No se pudo crear la tarea. Revisa los permisos de Firestore.", "error");
      return false;
    }
  };

  const editCustomTask = async (taskId, updatedData) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const taskSnap = await getDoc(taskRef);
      if (!taskSnap.exists()) return false;
      const currentTask = taskSnap.data();

      const sanitizeEmail = (e) => (typeof e === 'string' ? e.trim().toLowerCase()
        .replace('@crearpls.com', '@crearpsl.net')
        .replace(/ketherine\.aguirre@/gi, 'katherine.aguirre@')
        .replace(/coodinacion\.administrativa@/gi, 'coordinacion.administrativa@') : '');
      const cleanUpdatedData = { ...updatedData };
      if (Array.isArray(cleanUpdatedData.assignedToEmails)) {
        cleanUpdatedData.assignedToEmails = [...new Set(cleanUpdatedData.assignedToEmails.map(sanitizeEmail).filter(Boolean))];
      }
      if (cleanUpdatedData.assignedToEmail) {
        cleanUpdatedData.assignedToEmail = sanitizeEmail(cleanUpdatedData.assignedToEmail);
      }

      const batch = writeBatch(db);
      batch.update(taskRef, cleanUpdatedData);

      // Calcular asignados: nuevos (recién agregados) vs los que ya estaban.
      const oldEmails = (currentTask.assignedToEmails || (currentTask.assignedToEmail ? [currentTask.assignedToEmail] : [])).map(sanitizeEmail).filter(Boolean);
      const newEmails = (cleanUpdatedData.assignedToEmails || (cleanUpdatedData.assignedToEmail ? [cleanUpdatedData.assignedToEmail] : [])).map(sanitizeEmail).filter(Boolean);

      const newlyAddedEmails = newEmails.filter(email => !oldEmails.includes(email));
      const stillAssignedEmails = newEmails.filter(email => oldEmails.includes(email));

      // "si o si notifique" (28/08/2026): antes, si editabas una tarea que
      // YA tenía asignados (ej. le cambiabas la fecha límite o el título) sin
      // agregar a nadie nuevo, esos asignados no se enteraban del cambio.
      // Ahora, cualquier edición de un campo relevante (fecha límite, título,
      // prioridad, sede) también notifica a quienes ya estaban asignados —
      // no solo a los que se agregan de nuevo.
      const relevantFieldChanged = ['deadline', 'task', 'title', 'priority', 'assignedSede', 'notes', 'description', 'comments'].some(
        field => field in cleanUpdatedData && cleanUpdatedData[field] !== currentTask[field]
      );

      const activeNote = (cleanUpdatedData.notes || currentTask.notes || '').trim();

      newlyAddedEmails.forEach(email => {
        const cleanEmail = sanitizeEmail(email);
        const notifMsg = activeNote
          ? `Se te asignó en ${cleanUpdatedData.assignedSede || currentTask.assignedSede || 'Global'}: "${cleanUpdatedData.task || currentTask.task}". Nota: ${activeNote.substring(0, 80)}${activeNote.length > 80 ? '...' : ''}`
          : `Se te ha asignado una tarea en la sede ${cleanUpdatedData.assignedSede || currentTask.assignedSede || 'Global'}.`;

        // 1. Notificación In-App
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          userId: cleanEmail,
          title: cleanUpdatedData.task || currentTask.task,
          message: notifMsg,
          read: false,
          taskId: taskId,
          created_at: new Date().toISOString()
        });

        // 2. Notificación por Correo
        const u = usersData.find(usr => usr.email?.toLowerCase() === cleanEmail);
        const recipientName = u?.name || cleanEmail;
        const assignerName = cleanUpdatedData.assignedByName || currentUser?.displayName || currentUser?.name || currentUser?.email || 'Dirección CREAR';

        const mailRef = doc(collection(db, 'mail'));
        batch.set(mailRef, {
          to: [cleanEmail],
          message: {
            subject: `📋 NUEVA TAREA ASIGNADA: ${cleanUpdatedData.task || currentTask.task} — Causa OS`,
            html: buildTaskEmailHtml({
              taskTitle: cleanUpdatedData.task || currentTask.task,
              notes: activeNote,
              deadline: cleanUpdatedData.deadline || currentTask.deadline,
              assignedSede: cleanUpdatedData.assignedSede || currentTask.assignedSede || 'Global',
              priority: cleanUpdatedData.priority || currentTask.priority || 'Normal',
              assignedByName: assignerName,
              recipientName,
              recipientEmail: cleanEmail,
              isUpdate: false
            })
          },
          calendarEvent: {
            taskId: taskId,
            title: cleanUpdatedData.task || currentTask.task,
            deadline: cleanUpdatedData.deadline || currentTask.deadline || null,
            description: `Tarea Causa OS — Sede: ${cleanUpdatedData.assignedSede || currentTask.assignedSede || 'Global'}. Asignado por: ${assignerName}. Prioridad: ${cleanUpdatedData.priority || currentTask.priority || 'Normal'}.${activeNote ? ' \nNotas: ' + activeNote : ''}`
          }
        });
      });

      if (relevantFieldChanged) {
        stillAssignedEmails.forEach(email => {
          const cleanEmail = sanitizeEmail(email);
          const notifMsg = activeNote
            ? `Se actualizó la tarea "${cleanUpdatedData.task || currentTask.task}". Nota: ${activeNote.substring(0, 80)}${activeNote.length > 80 ? '...' : ''}`
            : `Se actualizó una tarea que tenías asignada en la sede ${cleanUpdatedData.assignedSede || currentTask.assignedSede || 'Global'}.`;

          // 1. Notificación In-App
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            userId: cleanEmail,
            title: cleanUpdatedData.task || currentTask.task,
            message: notifMsg,
            read: false,
            taskId: taskId,
            created_at: new Date().toISOString()
          });

          // 2. Notificación por Correo
          const u = usersData.find(usr => usr.email?.toLowerCase() === cleanEmail);
          const recipientName = u?.name || cleanEmail;
          const assignerName = cleanUpdatedData.assignedByName || currentUser?.displayName || currentUser?.name || currentUser?.email || 'Dirección CREAR';

          const mailRef = doc(collection(db, 'mail'));
          batch.set(mailRef, {
            to: [cleanEmail],
            message: {
              subject: `📋 TAREA ACTUALIZADA: ${cleanUpdatedData.task || currentTask.task} — Causa OS`,
              html: buildTaskEmailHtml({
                taskTitle: cleanUpdatedData.task || currentTask.task,
                notes: activeNote,
                deadline: cleanUpdatedData.deadline || currentTask.deadline,
                assignedSede: cleanUpdatedData.assignedSede || currentTask.assignedSede || 'Global',
                priority: cleanUpdatedData.priority || currentTask.priority || 'Normal',
                assignedByName: assignerName,
                recipientName,
                recipientEmail: cleanEmail,
                isUpdate: true
              })
            },
            calendarEvent: {
              taskId: taskId,
              title: cleanUpdatedData.task || currentTask.task,
              deadline: cleanUpdatedData.deadline || currentTask.deadline || null,
              description: `Tarea Causa OS — Sede: ${cleanUpdatedData.assignedSede || currentTask.assignedSede || 'Global'}. Actualizado por: ${assignerName}. Prioridad: ${cleanUpdatedData.priority || currentTask.priority || 'Normal'}.${activeNote ? ' \nNotas: ' + activeNote : ''}`
            }
          });
        });
      }

      await batch.commit();
      return true;
    } catch (error) {
      console.error("Error editing custom task:", error);
      showToast("No se pudo editar la tarea.", "error");
      return false;
    }
  };

  const submitEvidence = async (taskId, evidenceUrl) => {
    try {
      await writeTaskDoc(taskId, {
        status: 'Pendiente de validación',
        evidence_url: evidenceUrl,
        date: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error submitting evidence:", error);
      showToast("No se pudo enviar la evidencia.", "error");
    }
  };

  const getProgressByRole = (roleId, forceSede = null) => {
    if (!roleId) return 0;
    const targetNorm = normalizeRole(roleId);
    const targetSede = forceSede || currentUser?.sede?.trim() || 'Global';

    const roleTasks = tasks.filter(t => {
      const taskNorm = normalizeRole(t.role);
      return taskNorm === targetNorm || t.role === roleId;
    });
    if (roleTasks.length === 0) return 0;

    const cycleKey = currentCycle?.id ? `${targetSede}__${currentCycle.id}` : null;

    const completed = roleTasks.filter(t => {
      if (t.completions) {
        if (cycleKey && t.completions[cycleKey] !== undefined) {
          return t.completions[cycleKey].completed === true;
        }
        if (t.completions[targetSede] !== undefined) {
          return t.completions[targetSede].completed === true;
        }
      }
      return t.completed || t.status === 'Completada';
    }).length;
    return Math.round((completed / roleTasks.length) * 100);
  };

  // Función de utilidad para cargar las tareas iniciales a Firestore (Protegido estrictamente)
  const initializeFirestore = async (user = null) => {
    const activeAuthUser = user || auth.currentUser;
    if (!activeAuthUser) {
      showToast("ACCESO DENEGADO: Debes estar autenticado con permisos de Gerencia.", "error");
      return false;
    }

    const norm = normalizeRole(user?.appRole || user?.role);
    const isAuthorized = user?.isSuperAdmin || isGerenciaRole(norm) || isSuperAdminEmail(activeAuthUser.email);
    
    if (!isAuthorized) {
      showToast("ACCESO DENEGADO: Solo la Gerencia o Dirección pueden reiniciar el ciclo operativo.", "error");
      return false;
    }

    const confirmText = await showPrompt("🚨 ¡ADVERTENCIA CRÍTICA!\n\nEsto reiniciará y sobreescribirá la matriz operativa del SO-AR en Firestore para un nuevo ciclo en blanco.\n\nEscribe CONFIRMAR para continuar:");
    if (!confirmText || confirmText.toUpperCase() !== 'CONFIRMAR') {
      showToast("Operación cancelada.", "info");
      return false;
    }
    
    try {
      const allSedes = [...new Set(usersData.map(u => u.sede?.trim()).filter(Boolean)), 'Global'];
      const batch = writeBatch(db);
      
      checklistData.forEach(task => {
        const taskRef = doc(db, 'tasks', task.id);

        // Inicializar el mapa de completitud en falso para todas las sedes
        const initialCompletions = {};
        allSedes.forEach(s => {
          initialCompletions[s] = { completed: false, status: 'Pendiente' };
        });

        batch.set(taskRef, {
          ...task,
          completed: false, // Legacy fallback
          status: 'Pendiente', // Legacy fallback
          completions: initialCompletions,
          priority: task.isCritical ? '🔴 ROJO' : '🟡 AMARILLO',
          progressPercentage: 0,
          // (28/08/2026) CORRECCIÓN: ya NO se calcula ni se guarda un "deadline" fijo
          // aquí. Este doc de "tasks" es GLOBAL (compartido por todas las sedes vía
          // el mapa "completions"), así que no existe un único ciclo/fecha correcto
          // para calcularlo en el momento del reinicio. Antes se guardaba un deadline
          // calculado con el ciclo de ejemplo hardcodeado (mismo bug que en el merge
          // de tareas faltantes), que quedaba INCORRECTO y CONGELADO para todas las
          // sedes para siempre. Al dejarlo sin guardar, cada usuario lo calcula al
          // vuelo con SU ciclo real.
          created_at: new Date().toISOString()
        });
      });
      await batch.commit();
      showToast("¡Base de datos SO-AR inicializada y sincronizada con éxito!", "success");
      return true;
    } catch (error) {
      console.error("Error initializing DB:", error);
      showToast("Error al inicializar la base de datos de Firestore. Revisa las reglas de seguridad.", "error");
      return false;
    }
  };

  const syncTasksToGoogle = async (roleId) => {
    let token = sessionStorage.getItem('googleAccessToken');
    if (!token) {
      // (04/09/2026) Antes esto obligaba a cerrar sesión completa — ahora se
      // intenta primero un popup corto de reautenticación con Google.
      token = await reauthenticateGoogle();
    }
    if (!token) {
      showToast("No se pudo conectar con Google. Intenta el popup de nuevo o cierra sesión y vuelve a entrar.", "error");
      return;
    }

    // Buscamos tareas para este rol que NO estén completadas ni sincronizadas
    const myUnsyncedTasks = tasks.filter(t => t.role === roleId && !t.completed && !t.googleSynced);
    if (myUnsyncedTasks.length === 0) {
      showToast("No tienes tareas pendientes por sincronizar a Google.", "error");
      return;
    }

    let successCount = 0;
    let lastError = null;
    for (let task of myUnsyncedTasks) {
      const result = await createGoogleTask({
        title: task.title,
        description: task.description || '',
        dueDate: task.dueDate || undefined
      }, token);

      if (result.success) {
        // Actualizamos en Firestore para no volverla a sincronizar
        try {
          await writeTaskDoc(task.id, { googleSynced: true });
          successCount++;
        } catch (e) {
          console.error("Error marcando tarea como sincronizada:", e);
        }
      } else {
        lastError = result.error || 'Error desconocido';
      }
    }

    // CONTEXTO (28/08/2026): antes este toast SIEMPRE decía "exitosamente" aunque
    // successCount fuera 0 — el usuario reportó que "no sincroniza en la vida real"
    // porque el botón parecía funcionar (mostraba éxito) pero nada llegaba a Google
    // Tasks. Causa real más probable: el accessToken de Google se guarda una sola vez
    // al iniciar sesión (sessionStorage) y NO se refresca — expira típicamente en ~1h,
    // así que en sesiones largas createGoogleTask empieza a fallar en silencio.
    // Ahora el mensaje refleja el resultado real de cada intento.
    if (successCount === myUnsyncedTasks.length) {
      showToast(`¡Se sincronizaron ${successCount} tareas a tu cuenta de Google Tasks exitosamente!`, "success");
    } else if (successCount > 0) {
      showToast(`Se sincronizaron ${successCount} de ${myUnsyncedTasks.length} tareas. Las demás fallaron${lastError ? `: ${lastError}` : ''}. Si persiste, cierra sesión y vuelve a entrar.`, "error");
    } else {
      showToast(`No se pudo sincronizar ninguna tarea a Google Tasks${lastError ? `: ${lastError}` : ''}. Tu permiso de Google probablemente expiró — cierra sesión y vuelve a entrar para renovarlo.`, "error");
    }

    // Guardar en el historial de sincronización
    try {
      await addDoc(collection(db, 'sync_history'), {
        userEmail: currentUser?.email || 'Desconocido',
        timestamp: new Date().toISOString(),
        status: successCount === myUnsyncedTasks.length ? 'Éxito' : (successCount > 0 ? 'Parcial' : 'Error'),
        details: successCount > 0 ? `Sincronizadas ${successCount} de ${myUnsyncedTasks.length} tareas.` : `Fallaron las ${myUnsyncedTasks.length} tareas intentadas.${lastError ? ` Último error: ${lastError}` : ''}`,
        roleId: roleId
      });
    } catch (e) {
      console.error("Error guardando historial de sync:", e);
    }
  };

  const fetchSyncHistory = async (userEmail) => {
    try {
      const q = query(
        collection(db, 'sync_history'),
        where("userEmail", "==", userEmail),
        orderBy("timestamp", "desc"),
        limit(20)
      );
      const snap = await getDocs(q);
      return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    } catch (e) {
      console.error("Error fetching sync history:", e);
      return [];
    }
  };

  // 1. Enviar invitación de colaboración / mención
  const inviteCollaborator = async (task, targetUser, message) => {
    try {
      const batch = writeBatch(db);
      const taskRef = doc(db, 'tasks', task.id);
      
      const newPending = {
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        sede: targetUser.sede || 'Global',
        invitedBy: currentUser.email,
        inviterName: currentUser.displayName || currentUser.email,
        message: message || '',
        status: 'PENDIENTE',
        createdAt: new Date().toISOString()
      };

      const currentPending = task.pendingCollaborations || [];
      batch.update(taskRef, {
        pendingCollaborations: [...currentPending.filter(p => p.email !== targetUser.email), newPending]
      });

      // Notificación interactiva al invitado
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        userId: targetUser.email,
        type: 'COLLABORATION_INVITE',
        title: `🤝 @${currentUser.displayName || 'Compañero'} te invitó a colaborar`,
        message: message ? `"${message}" en la tarea: ${task.task || task.title}` : `Te ha invitado a colaborar en la tarea: ${task.task || task.title}`,
        taskId: task.id,
        taskTitle: task.task || task.title,
        inviterEmail: currentUser.email,
        inviterName: currentUser.displayName || 'Compañero',
        read: false,
        created_at: new Date().toISOString()
      });

      // 3. NotificaciÃ³n por Correo Institucional Causa OS (VÃ­a Firebase Trigger Email / Mailer Daemon)
      const mailRef = doc(collection(db, 'mail'));
      const collaboratorName = targetUser.name || 'LÃ­der';
      const inviterLabel = currentUser.displayName || currentUser.email || 'CompaÃ±ero';
      const inviteTaskTitle = task.task || task.title || 'Compromiso sin tÃ­tulo';
      batch.set(mailRef, {
        to: [targetUser.email],
        message: {
          subject: `ðŸ¤ Causa OS | InvitaciÃ³n de ColaboraciÃ³n â€” ${inviteTaskTitle}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; max-width: 620px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);">
              <!-- Cabecera Institucional Premium Causa OS -->
              <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 26px 24px; text-align: center; border-bottom: 3px solid #f59e0b;">
                <span style="display: inline-block; font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: #fbbf24; font-weight: 700; margin-bottom: 6px;">
                  CREAR PODER SIN LÃMITES Â· TRANSFORMACIÃ“N GLOBAL
                </span>
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                  ðŸ¤ INVITACIÃ“N A COLABORAR
                </h1>
                <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8; font-weight: 500;">
                  Sistema Operativo Causa OS Â· Sinergia y Compromiso de Equipo
                </p>
              </div>

              <div style="padding: 28px 30px; background-color: #ffffff;">
                <p style="font-size: 15.5px; margin-top: 0; line-height: 1.5; color: #0f172a;">
                  Hola <strong>${collaboratorName}</strong>,
                </p>

                <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 18px;">
                  <strong>${inviterLabel}</strong> te ha extendido una invitaciÃ³n formal para sumar tu visiÃ³n y colaborar en el cumplimiento del siguiente compromiso:
                </p>

                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; margin-bottom: 22px;">
                  <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Compromiso:</span>
                  <div style="font-size: 17px; font-weight: 700; color: #0f172a; margin-top: 4px; line-height: 1.35;">${inviteTaskTitle}</div>

                  ${message ? `
                  <div style="background-color: #0f172a; color: #f8fafc; border-left: 4px solid #f59e0b; padding: 12px 14px; margin-top: 14px; border-radius: 6px;">
                    <strong style="color: #fbbf24; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">ðŸ’¬ Mensaje de ${inviterLabel}:</strong>
                    <span style="font-size: 13px; line-height: 1.5; color: #f1f5f9; white-space: pre-wrap;">"${message}"</span>
                  </div>
                  ` : ''}
                </div>

                <div style="text-align: center; margin: 26px 0 28px 0;">
                  <a href="https://centro-operativo-cpsl.web.app/checklist" style="background-color: #2563eb; color: #ffffff; padding: 14px 34px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35); letter-spacing: 0.3px;">
                    ðŸš€ Responder InvitaciÃ³n en Causa OS
                  </a>
                </div>

                <p style="font-size: 13px; color: #334155; margin: 20px 0 0 0; line-height: 1.5;">
                  Tu liderazgo multiplica la capacidad de respuesta de todo el equipo.<br/>
                  <strong>Equipo de DirecciÃ³n y CoordinaciÃ³n Operativa</strong><br/>
                  <span style="font-size: 12px; color: #64748b;">CREAR Poder Sin LÃ­mites</span>
                </p>
              </div>

              <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 20px; text-align: center; font-size: 11.5px; color: #64748b; line-height: 1.5;">
                <em>"Vivir en Causa es ser la fuente incondicional de los resultados."</em><br/>
                CREAR Poder Sin LÃ­mites Â· Causa OS Â· TransformaciÃ³n Global
              </div>
            </div>
          `
        }
      });

      await batch.commit();
      showToast(`¡Invitación enviada con éxito a @${targetUser.name}!`, 'success');
      return true;
    } catch (err) {
      console.error("Error al invitar colaborador:", err);
      showToast("Error al enviar la invitación.", "error");
      return false;
    }
  };

  // 2. Aceptar invitación de colaboración
  const acceptCollaboration = async (notification) => {
    try {
      const batch = writeBatch(db);
      const taskRef = doc(db, 'tasks', notification.taskId);

      const task = tasks.find(t => t.id === notification.taskId);
      const currentCollabs = task?.collaborators ? [...task.collaborators] : [];
      const currentCollabDetails = task?.collaboratorDetails ? [...task.collaboratorDetails] : [];

      if (!currentCollabs.includes(currentUser.email)) {
        currentCollabs.push(currentUser.email);
        currentCollabDetails.push({
          email: currentUser.email,
          name: currentUser.displayName || currentUser.email,
          role: currentUser.appRole || 'colaborador',
          sede: currentUser.sede || 'Global',
          acceptedAt: new Date().toISOString()
        });
      }

      batch.update(taskRef, {
        collaborators: currentCollabs,
        collaboratorDetails: currentCollabDetails,
        updatedAt: new Date().toISOString()
      });

      // Marcar notificación como leída
      const notifRef = doc(db, 'notifications', notification.id);
      batch.update(notifRef, { read: true, status: 'ACEPTADA' });

      // Notificar al invitador de vuelta
      if (notification.inviterEmail) {
        const replyNotifRef = doc(collection(db, 'notifications'));
        batch.set(replyNotifRef, {
          userId: notification.inviterEmail,
          title: `🎉 @${currentUser.displayName} aceptó colaborar contigo`,
          message: `Ahora comparten y dan seguimiento conjunto a la tarea: "${notification.taskTitle || 'Tarea Compartida'}"`,
          read: false,
          created_at: new Date().toISOString()
        });
      }

      await batch.commit();
      showToast(`¡Colaboración aceptada! La tarea ahora está en tu panel compartido.`, 'success');
      return true;
    } catch (err) {
      console.error("Error al aceptar colaboración:", err);
      showToast("No se pudo aceptar la colaboración.", "error");
      return false;
    }
  };

  // 3. Rechazar invitación
  const rejectCollaboration = async (notification) => {
    try {
      const docRef = doc(db, 'notifications', notification.id);
      await updateDoc(docRef, { read: true, status: 'RECHAZADA' });
      showToast("Invitación declinada.", "info");
      return true;
    } catch (err) {
      console.error("Error al declinar:", err);
      return false;
    }
  };

  // 4. Actualización de progreso individual en tarjetas compartidas / multi-área
  const updateIndividualProgress = async (taskId, userEmail, isCompleted, progressPercentage = null) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const snap = await getDoc(taskRef);
      if (!snap.exists()) return false;
      const data = snap.data();
      const currentProgress = { ...(data.assigneeProgress || {}) };
      const em = (userEmail || currentUser?.email || '').toLowerCase().trim();
      if (!em) return false;

      const userObj = usersData.find(u => u.email?.toLowerCase() === em);
      const prevEntry = currentProgress[em] || {
        name: currentUser?.displayName || userObj?.name || em,
        role: currentUser?.appRole || userObj?.role || 'colaborador',
        sede: currentUser?.sede || userObj?.sede || 'Global'
      };

      currentProgress[em] = {
        ...prevEntry,
        completed: isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : null,
        progress: progressPercentage !== null ? progressPercentage : (isCompleted ? 100 : 0)
      };

      // Si todos los asignados completaron, marcar la tarjeta general como completada
      const allKeys = Object.keys(currentProgress);
      const allCompleted = allKeys.length > 0 && allKeys.every(k => currentProgress[k].completed === true || currentProgress[k].progress === 100);
      const anyCompleted = allKeys.some(k => currentProgress[k].completed === true || currentProgress[k].progress > 0);

      const totalItems = allKeys.length;
      const sumProgress = allKeys.reduce((acc, k) => {
        const item = currentProgress[k];
        const val = typeof item.progress === 'number' ? item.progress : (item.completed ? 100 : 0);
        return acc + val;
      }, 0);
      const overallPercent = totalItems > 0 ? Math.round(sumProgress / totalItems) : (isCompleted ? 100 : 0);

      await updateDoc(taskRef, {
        assigneeProgress: currentProgress,
        completed: allCompleted,
        status: allCompleted ? 'Completada' : (anyCompleted ? 'En Progreso' : 'Pendiente'),
        progressPercentage: overallPercent,
        updatedAt: new Date().toISOString()
      });
      showToast(isCompleted ? "¡Completaste tu parte de la tarea!" : "Marcaste tu parte como pendiente.", "success");
      return true;
    } catch (err) {
      console.error("Error updating individual progress:", err);
      showToast("No se pudo actualizar tu avance individual.", "error");
      return false;
    }
  };

  return (
    <ChecklistContext.Provider value={{ 
      tasks, 
      toggleTask, 
      updateTaskDetails,
      editCustomTask, 
      submitEvidence, 
      getProgressByRole, 
      loading, 
      initializeFirestore, 
      addCustomTask, 
      syncTasksToGoogle,
      fetchSyncHistory,
      inviteCollaborator,
      acceptCollaboration,
      rejectCollaboration,
      updateIndividualProgress
    }}>
      {children}
    </ChecklistContext.Provider>
  );
}

export function useChecklist() {
  return useContext(ChecklistContext);
}
