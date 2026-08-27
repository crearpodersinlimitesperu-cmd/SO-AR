import { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, onSnapshot, doc, updateDoc, writeBatch, addDoc, query, where, orderBy, limit, getDocs, getDoc } from 'firebase/firestore';
import { checklistData } from '../data/checklistData';
import { usersData, normalizeRole } from '../data/usersData';
import { isSuperAdminEmail, isGerenciaRole } from '../config/permissions';
import { calculateAutomaticDeadline } from '../utils/soarDates';
import { createGoogleTask } from '../services/googleSync';
import { useUI } from './UIContext';
import { useAuth } from './AuthContext';

const ChecklistContext = createContext();

export function ChecklistProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast, showPrompt } = useUI();
  const { currentUser } = useAuth();

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
      const EXECUTIVE_ROLES_NO_CHECKLIST = ['ceo', 'cco', 'socio', 'super_admin'];
      const userRoleForMerge = currentUser?.appRole || currentUser?.role || '';
      const skipCatalogMerge = EXECUTIVE_ROLES_NO_CHECKLIST.includes(userRoleForMerge);

      // Merge de seguridad: Asegurar que todas las tareas del catálogo base (incluidas las nuevas de QT) existan
      // Solo se aplica a roles operativos — no a roles ejecutivos sin checklist propio.
      const existingIds = new Set(loadedTasks.map(t => t.id));
      const missingBaseTasks = skipCatalogMerge ? [] : checklistData.filter(t => !existingIds.has(t.id)).map(task => {
        const autoDeadline = calculateAutomaticDeadline(task);
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
      const EXECUTIVE_ROLES_NO_CHECKLIST = ['ceo', 'cco', 'socio', 'super_admin'];
      const userRoleForFallback = currentUser?.appRole || currentUser?.role || '';
      if (EXECUTIVE_ROLES_NO_CHECKLIST.includes(userRoleForFallback)) {
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
        deadline: calculateAutomaticDeadline(task)
      }));
      setTasks(localTasks);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.sede, currentUser?.email, currentUser?.appRole]);

  const toggleTask = async (taskId, currentStatus) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const userSede = currentUser?.sede?.trim() || 'Global';
      
      // Update both legacy and map formats just in case it's a custom task
      await updateDoc(taskRef, {
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
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, updates);
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
      
      batch.set(taskRef, {
        id: customId,
        ...taskData,
        completed: false,
        status: 'Pendiente',
        created_at: new Date().toISOString()
      });

      // Asegurarse de tener un arreglo unificado de correos (legacy o nuevo)
      const emailsToNotify = [];
      if (taskData.assignedToEmails && Array.isArray(taskData.assignedToEmails)) {
        emailsToNotify.push(...taskData.assignedToEmails);
      } else if (taskData.assignedToEmail) {
        emailsToNotify.push(taskData.assignedToEmail);
      }

      // Si la tarea tiene asignaciones directas a uno o más usuarios
      if (emailsToNotify.length > 0) {
        emailsToNotify.forEach(email => {
          // 1. Notificación In-App
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            userId: email,
            title: taskData.task || taskData.title,
            message: `Se te ha asignado una nueva tarea urgente en la sede ${taskData.assignedSede || 'Global'}.`,
            read: false,
            taskId: customId,
            created_at: new Date().toISOString()
          });

          // 2. Notificación por Correo (Vía Firebase Trigger Email Extension)
          const mailRef = doc(collection(db, 'mail'));
          batch.set(mailRef, {
            to: [email],
            message: {
              subject: `NUEVA TAREA ASIGNADA SO-AR: ${taskData.task || taskData.title}`,
              html: `
                <h2>Hola, se te ha asignado una nueva tarea en el SO-AR</h2>
                <p><strong>Tarea:</strong> ${taskData.task || taskData.title}</p>
                <p><strong>Sede:</strong> ${taskData.assignedSede || 'Global'}</p>
                <p><strong>Prioridad:</strong> ${taskData.priority || 'Normal'}</p>
                <p>Por favor, ingresa a la plataforma para revisarla y marcarla como completada cuando esté lista.</p>
                <br/>
                <p><em>Equipo CREAR Poder Sin Límites</em></p>
              `
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

      const batch = writeBatch(db);
      batch.update(taskRef, updatedData);

      // Calcular nuevos asignados (anti-spam)
      const oldEmails = currentTask.assignedToEmails || (currentTask.assignedToEmail ? [currentTask.assignedToEmail] : []);
      const newEmails = updatedData.assignedToEmails || (updatedData.assignedToEmail ? [updatedData.assignedToEmail] : []);
      
      const newlyAddedEmails = newEmails.filter(email => !oldEmails.includes(email));

      if (newlyAddedEmails.length > 0) {
        newlyAddedEmails.forEach(email => {
          // 1. Notificación In-App
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            userId: email,
            title: updatedData.task || currentTask.task,
            message: `Se te ha asignado una tarea en la sede ${updatedData.assignedSede || currentTask.assignedSede || 'Global'}.`,
            read: false,
            taskId: taskId,
            created_at: new Date().toISOString()
          });

          // 2. Notificación por Correo
          const mailRef = doc(collection(db, 'mail'));
          batch.set(mailRef, {
            to: [email],
            message: {
              subject: `NUEVA TAREA ASIGNADA SO-AR: ${updatedData.task || currentTask.task}`,
              html: `
                <h2>Hola, se te ha asignado una tarea en el SO-AR</h2>
                <p><strong>Tarea:</strong> ${updatedData.task || currentTask.task}</p>
                <p><strong>Sede:</strong> ${updatedData.assignedSede || currentTask.assignedSede || 'Global'}</p>
                <p><strong>Prioridad:</strong> ${updatedData.priority || currentTask.priority || 'Normal'}</p>
                <p>Por favor, ingresa a la plataforma para revisarla.</p>
                <br/>
                <p><em>Equipo CREAR Poder Sin Límites</em></p>
              `
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
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
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
        const autoDeadline = calculateAutomaticDeadline(task);
        
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
          deadline: autoDeadline,
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
    const token = sessionStorage.getItem('googleAccessToken');
    if (!token) {
      showToast("No se encontró sesión con permisos de Google. Por favor, cierra sesión y vuelve a entrar.", "error");
      return;
    }

    // Buscamos tareas para este rol que NO estén completadas ni sincronizadas
    const myUnsyncedTasks = tasks.filter(t => t.role === roleId && !t.completed && !t.googleSynced);
    if (myUnsyncedTasks.length === 0) {
      showToast("No tienes tareas pendientes por sincronizar a Google.", "error");
      return;
    }

    let successCount = 0;
    for (let task of myUnsyncedTasks) {
      const result = await createGoogleTask({
        title: task.title,
        description: task.description || '',
        dueDate: task.dueDate || undefined
      }, token);

      if (result.success) {
        // Actualizamos en Firestore para no volverla a sincronizar
        try {
          const taskRef = doc(db, 'tasks', task.id);
          await updateDoc(taskRef, { googleSynced: true });
          successCount++;
        } catch (e) {
          console.error("Error marcando tarea como sincronizada:", e);
        }
      }
    }

    showToast(`¡Se sincronizaron ${successCount} tareas a tu cuenta de Google Tasks exitosamente!`, "success");
    
    // Guardar en el historial de sincronización
    try {
      await addDoc(collection(db, 'sync_history'), {
        userEmail: currentUser?.email || 'Desconocido',
        timestamp: new Date().toISOString(),
        status: successCount > 0 ? 'Éxito' : 'Info',
        details: successCount > 0 ? `Sincronizadas ${successCount} tareas.` : 'No hubo tareas nuevas por sincronizar.',
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
