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
            const mySedeData = data.completions[userSede] || { completed: false, status: 'Pendiente' };
            sedeCompleted = mySedeData.completed;
            sedeStatus = mySedeData.status;
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
      if (EXECUTIVE_ROLES_NO_CHECKLIST.includes(userRoleForFallback) || 
          userEmailLower === 'fer.aragon@crearpsl.net' || 
          userEmailLower === 'paul.sosa@crearpsl.net') {
        setTasks([]);
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
      setTasks(localTasks);
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

      // Update both legacy and map formats just in case it's a custom task
      await writeTaskDoc(taskId, {
        completed: !currentStatus,
        status: !currentStatus ? 'Completada' : 'Pendiente',
        [`completions.${userSede}.completed`]: !currentStatus,
        [`completions.${userSede}.status`]: !currentStatus ? 'Completada' : 'Pendiente'
      });
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
      
      // Sanitizar correos para prevenir errores de dominio y ortografía (ej: crearpls.com -> crearpsl.net, ketherine -> katherine)
      const sanitizeEmail = (e) => (typeof e === 'string' ? e.trim().toLowerCase()
        .replace('@crearpls.com', '@crearpsl.net')
        .replace(/ketherine\.aguirre@/gi, 'katherine.aguirre@') : '');
      const cleanData = { ...taskData };
      if (Array.isArray(cleanData.assignedToEmails)) {
        cleanData.assignedToEmails = [...new Set(cleanData.assignedToEmails.map(sanitizeEmail).filter(Boolean))];
      }
      if (cleanData.assignedToEmail) {
        cleanData.assignedToEmail = sanitizeEmail(cleanData.assignedToEmail);
      }

      batch.set(taskRef, {
        id: customId,
        ...cleanData,
        completed: false,
        status: 'Pendiente',
        created_at: new Date().toISOString()
      });

      // Asegurarse de tener un arreglo unificado de correos (legacy o nuevo)
      const emailsToNotify = [];
      if (cleanData.assignedToEmails && Array.isArray(cleanData.assignedToEmails)) {
        emailsToNotify.push(...cleanData.assignedToEmails);
      } else if (cleanData.assignedToEmail) {
        emailsToNotify.push(cleanData.assignedToEmail);
      }

      // Si la tarea tiene asignaciones directas a uno o más usuarios
      if (emailsToNotify.length > 0) {
        emailsToNotify.forEach(email => {
          const cleanEmail = sanitizeEmail(email);
          // 1. Notificación In-App
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            userId: cleanEmail,
            title: cleanData.task || cleanData.title,
            message: `Se te ha asignado una nueva tarea urgente en la sede ${cleanData.assignedSede || 'Global'}.`,
            read: false,
            taskId: customId,
            created_at: new Date().toISOString()
          });

          // 2. Notificación por Correo (Vía Firebase Trigger Email Extension)
          const mailRef = doc(collection(db, 'mail'));
          batch.set(mailRef, {
            to: [cleanEmail],
            message: {
              subject: `NUEVA TAREA ASIGNADA CAUSA OS: ${cleanData.task || cleanData.title}`,
              html: `
                <h2>Hola, se te ha asignado una nueva tarea en Causa OS</h2>
                <p><strong>Tarea:</strong> ${cleanData.task || cleanData.title}</p>
                <p><strong>⏰ Fecha límite:</strong> ${formatDeadlineEs(cleanData.deadline)}</p>
                <p><strong>Sede:</strong> ${cleanData.assignedSede || 'Global'}</p>
                <p><strong>Prioridad:</strong> ${cleanData.priority || 'Normal'}</p>
                <p>Por favor, ingresa a la plataforma para revisarla y marcarla como completada cuando esté lista.</p>
                <br/>
                <p><em>Equipo CREAR PODER SIN LÍMITES</em></p>
              `
            },
            // (04/09/2026) José pidió que estos correos incluyan el botón de
            // "Añadir al calendario" de Gmail/Outlook — mailerDaemon.js arma
            // el adjunto .ics a partir de este campo (si no hay "deadline",
            // simplemente no adjunta nada, no rompe el envío del correo).
            calendarEvent: {
              taskId: customId,
              title: cleanData.task || cleanData.title,
              deadline: cleanData.deadline || null,
              description: `Tarea Causa OS — Sede: ${cleanData.assignedSede || 'Global'}. Prioridad: ${cleanData.priority || 'Normal'}.`
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
        .replace(/ketherine\.aguirre@/gi, 'katherine.aguirre@') : '');
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
      const relevantFieldChanged = ['deadline', 'task', 'title', 'priority', 'assignedSede'].some(
        field => field in cleanUpdatedData && cleanUpdatedData[field] !== currentTask[field]
      );

      newlyAddedEmails.forEach(email => {
        const cleanEmail = sanitizeEmail(email);
        // 1. Notificación In-App
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          userId: cleanEmail,
          title: cleanUpdatedData.task || currentTask.task,
          message: `Se te ha asignado una tarea en la sede ${cleanUpdatedData.assignedSede || currentTask.assignedSede || 'Global'}.`,
          read: false,
          taskId: taskId,
          created_at: new Date().toISOString()
        });

        // 2. Notificación por Correo
        const mailRef = doc(collection(db, 'mail'));
        batch.set(mailRef, {
          to: [cleanEmail],
          message: {
            subject: `NUEVA TAREA ASIGNADA CAUSA OS: ${cleanUpdatedData.task || currentTask.task}`,
            html: `
                <h2>Hola, se te ha asignado una tarea en Causa OS</h2>
                <p><strong>Tarea:</strong> ${cleanUpdatedData.task || currentTask.task}</p>
                <p><strong>⏰ Fecha límite:</strong> ${formatDeadlineEs(cleanUpdatedData.deadline || currentTask.deadline)}</p>
                <p><strong>Sede:</strong> ${cleanUpdatedData.assignedSede || currentTask.assignedSede || 'Global'}</p>
                <p><strong>Prioridad:</strong> ${cleanUpdatedData.priority || currentTask.priority || 'Normal'}</p>
                <p>Por favor, ingresa a la plataforma para revisarla.</p>
                <br/>
                <p><em>Equipo CREAR PODER SIN LÍMITES</em></p>
              `
          },
          calendarEvent: {
            taskId: taskId,
            title: cleanUpdatedData.task || currentTask.task,
            deadline: cleanUpdatedData.deadline || currentTask.deadline || null,
            description: `Tarea Causa OS — Sede: ${cleanUpdatedData.assignedSede || currentTask.assignedSede || 'Global'}. Prioridad: ${cleanUpdatedData.priority || currentTask.priority || 'Normal'}.`
          }
        });
      });

      if (relevantFieldChanged) {
        stillAssignedEmails.forEach(email => {
          const cleanEmail = sanitizeEmail(email);
          // 1. Notificación In-App
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            userId: cleanEmail,
            title: cleanUpdatedData.task || currentTask.task,
            message: `Se actualizó una tarea que tenías asignada en la sede ${cleanUpdatedData.assignedSede || currentTask.assignedSede || 'Global'}.`,
            read: false,
            taskId: taskId,
            created_at: new Date().toISOString()
          });

          // 2. Notificación por Correo
          const mailRef = doc(collection(db, 'mail'));
          batch.set(mailRef, {
            to: [cleanEmail],
            message: {
              subject: `TAREA ACTUALIZADA CAUSA OS: ${cleanUpdatedData.task || currentTask.task}`,
              html: `
                <h2>Hola, se actualizó una tarea que tienes asignada en Causa OS</h2>
                <p><strong>Tarea:</strong> ${cleanUpdatedData.task || currentTask.task}</p>
                <p><strong>⏰ Fecha límite:</strong> ${formatDeadlineEs(cleanUpdatedData.deadline || currentTask.deadline)}</p>
                <p><strong>Sede:</strong> ${cleanUpdatedData.assignedSede || currentTask.assignedSede || 'Global'}</p>
                <p><strong>Prioridad:</strong> ${cleanUpdatedData.priority || currentTask.priority || 'Normal'}</p>
                <p>Revisa los cambios en la plataforma.</p>
                <br/>
                <p><em>Equipo CREAR PODER SIN LÍMITES</em></p>
              `
            },
            calendarEvent: {
              taskId: taskId,
              title: cleanUpdatedData.task || currentTask.task,
              deadline: cleanUpdatedData.deadline || currentTask.deadline || null,
              description: `Tarea Causa OS — Sede: ${cleanUpdatedData.assignedSede || currentTask.assignedSede || 'Global'}. Prioridad: ${cleanUpdatedData.priority || currentTask.priority || 'Normal'}.`
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

    const completed = roleTasks.filter(t => {
      // Si usamos forceSede, revisamos el mapa de completions. Si no, usamos el completed mapeado.
      if (forceSede && t.completions) {
        return t.completions[forceSede]?.completed === true;
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

      // 3. Notificación por Correo (Vía Firebase Trigger Email Extension)
      const mailRef = doc(collection(db, 'mail'));
      batch.set(mailRef, {
        to: [targetUser.email],
        message: {
          subject: `INVITACIÓN A COLABORAR SO-AR: ${task.task || task.title}`,
          html: `
            <h2>¡Hola, ${targetUser.name}!</h2>
            <p><strong>@${currentUser.displayName || currentUser.email}</strong> te ha invitado a colaborar en la siguiente tarea:</p>
            <p><strong>Tarea:</strong> ${task.task || task.title}</p>
            ${message ? `<p><strong>Mensaje:</strong> "${message}"</p>` : ''}
            <p>Por favor, ingresa al panel operativo SO-AR para <strong>Aceptar</strong> o <strong>Rechazar</strong> esta invitación.</p>
            <br/>
            <p><em>Equipo CREAR Poder Sin Límites</em></p>
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
      rejectCollaboration
    }}>
      {children}
    </ChecklistContext.Provider>
  );
}

export function useChecklist() {
  return useContext(ChecklistContext);
}
