import { getWhatsAppUrl } from '../utils/phoneUtils';
import { useState, useEffect, useMemo } from 'react';
import { calculateAutomaticDeadline } from '../utils/soarDates';
import { useCycles } from '../context/CyclesContext';
import { cyclesData } from '../data/cyclesData';
import { 
  X, User, Users, CheckCircle2, Clock, AlertTriangle, 
  FileText, Link2, Plus, Trash2, ExternalLink, Calendar, 
  Building2, Mail, Shield, PlusCircle, CheckSquare, Eye,
  UserX, UserCheck, ShieldAlert
} from 'lucide-react';
import { db } from '../services/firebase';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useChecklist } from '../context/ChecklistContext';
import { normalizeRole, normalizeSede, getRoleDisplayName, OPERATIONAL_SEDES } from '../data/usersData';
import { useUI } from '../context/UIContext';
import { useNavigate } from 'react-router-dom';
import { isSuperAdminEmail, canSimulate, canManageUserStatus } from '../config/permissions';
import { getFlagForSede } from '../utils/flags';
import TaskAssignmentModal from './TaskAssignmentModal';
import UserStatusModal from './UserStatusModal';

// Roles editables desde este modal (Super Admin) — lista curada de roles
// canónicos para evitar mostrar sinónimos duplicados (ej. "coordinador_c1c2"
// y "coord_c1" son el mismo rol, solo se ofrece el segundo).
const ROLE_EDIT_OPTIONS = [
  'direccion', 'cfo', 'gerente', 'director_maestria', 'coord_c1', 'coord_maestria',
  'capitan', 'manager', 'qt', 'coordinador', 'finanzas', 'asistente_impuestos_quito',
  'talento_humano', 'legal', 'tecnico_sst', 'entrenador', 'entrenador_llamadas'
];
const SEDE_EDIT_OPTIONS = [...OPERATIONAL_SEDES, 'Sede Global'];

const ROLE_LABELS = {
  gerente: 'Gerente de Sede',
  coordinador_c1c2: 'Coordinador Capítulo 1 y 2 (C1 / C2)',
  coord_c1: 'Coordinador Capítulo 1 y 2 (C1 / C2)',
  coordinador_mj: 'Coordinador Maestría del Juego (MJ)',
  coord_maestria: 'Coordinador Maestría del Juego (MJ)',
  director_maestria: 'Director Maestría del Juego (MJ)',
  capitan: 'Capitán',
  manager: 'Manager',
  talento_humano: 'Talento Humano',
  legal: 'Legal / Finanzas',
  entrenador: 'Entrenador',
  entrenador_llamadas: 'Entrenador de Llamadas',
  qt: 'Quantum Team',
  corporativo: 'Dirección Corporativa',
  direccion: 'Dirección Global',
  cfo: 'CFO',
  cco: 'CCO',
  ceo: 'CEO',
  admin: 'Administración'
};

const ROLE_COLORS = {
  direccion: '#ef4444',
  director_maestria: '#f97316',
  gerente: '#22c55e',
  coord_maestria: '#a855f7',
  coordinador_mj: '#a855f7',
  coord_c1: '#3b82f6',
  coordinador_c1c2: '#3b82f6',
  capitan: '#eab308',
  manager: '#ec4899',
  qt: '#14b8a6',
  talento_humano: '#06b6d4',
  legal: '#a855f7',
  entrenador: '#fbbf24',
  entrenador_llamadas: '#38bdf8'
};

// Formatea "YYYY-MM-DD" a "17 de marzo" — sin año, por privacidad (no se debe
// exponer la edad de nadie). Si el valor no tiene ese formato, se muestra tal
// cual en vez de asumir un formato distinto.
const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function formatBirthdayNoYear(cumpleanos) {
  if (!cumpleanos) return '';
  const m = String(cumpleanos).match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!m) return cumpleanos;
  const mesIdx = parseInt(m[1], 10) - 1;
  const dia = parseInt(m[2], 10);
  if (mesIdx < 0 || mesIdx > 11) return cumpleanos;
  return `${dia} de ${MESES_ES[mesIdx]}`;
}

export default function UserProfileModal({ isOpen, onClose, user, allTasks = [], onStatusUpdated }) {
  const { currentUser, originalAdminUser, simulateUser, updateCurrentUserFields } = useAuth();
  const navigate = useNavigate();
  const { toggleTask } = useChecklist();
  const { showToast } = useUI();
  let currentCycle = null;
  // (14/09/2026) quitoTeamOptions: lista dinamica de numeros de equipo de Quito,
  // provista por CyclesContext.jsx a partir del calendario oficial en vivo -- se usa
  // mas abajo para el selector de "Equipo(s) en Quito" (equiposQuito).
  let quitoTeamOptions = [];
  try {
    const cyclesCtx = useCycles();
    currentCycle = cyclesCtx?.currentCycle || cyclesData[0];
    quitoTeamOptions = cyclesCtx?.quitoTeamOptions || [];
  } catch (e) {
    currentCycle = cyclesData[0];
  }

  // Orden y filtro de tareas en la Matriz Operativa
  const [taskSortOrder, setTaskSortOrder] = useState('asc'); // 'asc' (Próximas primero / Cronológico) | 'desc'
  const [taskFilterStatus, setTaskFilterStatus] = useState('all'); // 'all' | 'pending' | 'completed' | 'critical'

  const parseDateToMs = (val) => {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val.getTime();
    if (typeof val === 'object' && typeof val.toDate === 'function') {
      const d = val.toDate();
      return isNaN(d.getTime()) ? null : d.getTime();
    }
    if (typeof val === 'number') return isNaN(val) ? null : val;
    if (typeof val === 'string') {
      const clean = val.trim();
      if (!clean) return null;
      let ms = Date.parse(clean);
      if (!isNaN(ms)) return ms;
      ms = Date.parse(clean.replace(' ', 'T'));
      if (!isNaN(ms)) return ms;
    }
    return null;
  };

  const getTaskDeadlineInfo = (task, activeCycle) => {
    if (task.deadline) {
      const ms = parseDateToMs(task.deadline);
      if (ms !== null) {
        return { deadlineStr: task.deadline, dateObj: new Date(ms), timestamp: ms, isAutomatic: false };
      }
    }
    if (task.dueDate || task.date) {
      const raw = task.dueDate || task.date;
      const ms = parseDateToMs(raw);
      if (ms !== null) {
        return { deadlineStr: raw, dateObj: new Date(ms), timestamp: ms, isAutomatic: false };
      }
    }
    try {
      const auto = calculateAutomaticDeadline(task, activeCycle || cyclesData[0]);
      if (auto) {
        const ms = parseDateToMs(auto);
        if (ms !== null) {
          return { deadlineStr: auto, dateObj: new Date(ms), timestamp: ms, isAutomatic: true };
        }
      }
    } catch (e) {}

    if (task.createdAt || task.created_at) {
      const ms = parseDateToMs(task.createdAt || task.created_at);
      if (ms !== null) {
        return { deadlineStr: null, dateObj: new Date(ms), timestamp: ms, isAutomatic: false };
      }
    }

    return { deadlineStr: null, dateObj: null, timestamp: Infinity, isAutomatic: false };
  };

  const isTaskCompleted = (t, userSede) => {
    if (t.completions && userSede && t.completions[userSede]) {
      return !!t.completions[userSede].completed;
    }
    return !!(t.completed || t.status === 'Completada');
  };

  const [targetUser, setTargetUser] = useState(user);
  useEffect(() => {
    setTargetUser(user);
  }, [user]);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const u = targetUser || user;
  const isInactive = u?.isActive === false || u?.status === 'inactive' || u?.active === false;
  const canManageStatus = canManageUserStatus(currentUser);

  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'notes' | 'documents'
  const [profileData, setProfileData] = useState({ notes: [], documents: [] });
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Form states for Notes & Documents
  const [newNoteText, setNewNoteText] = useState('');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isSavingDoc, setIsSavingDoc] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [showNotifyMessageBox, setShowNotifyMessageBox] = useState(false);
  const [notifyCustomMessage, setNotifyCustomMessage] = useState('');

  // Task assignment submodal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);

  // Cumpleaños (editable solo por Super Admin) — se guarda en users/{id}.cumpleanos
  // para que quede en el mismo lugar que lee getAllCompanyUsers() y donde escribe
  // el script de importación desde el Directorio Global.
  const [editingBirthday, setEditingBirthday] = useState(false);
  const [birthdayDraft, setBirthdayDraft] = useState(user?.cumpleanos || '');
  const [isSavingBirthday, setIsSavingBirthday] = useState(false);

  // Rol y Sede (editable solo por Super Admin) — mismo patrón/mismo destino
  // (users/{user.id}) que el cumpleaños arriba. Se agregó (16/09/2026) porque
  // se detectó un caso real (Marce Aguirre, CC1Y2 de Quito/UIO) mostrado en el
  // Panel Super Admin con el rol genérico "Coordinación Administrativa" en vez
  // de su rol real de coordinadora de Capítulo 1 y 2 — sin esta pantalla, la
  // única forma de corregirlo era escribir directamente en la consola de
  // Firestore. (20/09/2026) Mismo caso con la sede de Daniela Esposito (Quito
  // según el Directorio Global, "global" en Firestore).
  const [editingRole, setEditingRole] = useState(false);
  const [roleDraft, setRoleDraft] = useState(normalizeRole(user?.role) || '');
  const [rolesDraft, setRolesDraft] = useState(() => Array.from(new Set([
    normalizeRole(user?.role), ...(Array.isArray(user?.roles) ? user.roles.map(normalizeRole) : [])
  ].filter(Boolean))));
  const [sedeDraft, setSedeDraft] = useState(normalizeSede(user?.sede) || '');
  const [isSavingRole, setIsSavingRole] = useState(false);

  // (14/09/2026) Equipo(s) de Quito (editable por la propia persona, o por Super
  // Admin) -- se guarda en users/{id}.equiposQuito. Ver CyclesContext.jsx para el
  // porque: Quito, a diferencia de las demas sedes, corre varios equipos en
  // paralelo, asi que hace falta que cada quien indique a cual pertenece.
  const [editingQuitoTeams, setEditingQuitoTeams] = useState(false);
  const [quitoTeamsDraft, setQuitoTeamsDraft] = useState(Array.isArray(user?.equiposQuito) ? user.equiposQuito : []);
  const [isSavingQuitoTeams, setIsSavingQuitoTeams] = useState(false);

  // Firestore sync for user meta
  useEffect(() => {
    if (!isOpen || !user?.email) return;

    const userDocId = user.email.toLowerCase().trim();
    const userDocRef = doc(db, 'user_profiles', userDocId);

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      let localConns = {};
      try {
        localConns = JSON.parse(localStorage.getItem('cpsl_user_connections') || '{}');
      } catch(e) {}
      const localUserConn = localConns[userDocId];

      if (docSnap.exists()) {
        const data = docSnap.data();
        let lastLoginFormatted = null;
        if (data.lastLoginAt?.toDate) {
          lastLoginFormatted = data.lastLoginAt.toDate().toLocaleString('es-ES');
        } else if (data.lastLoginAtIso) {
          lastLoginFormatted = new Date(data.lastLoginAtIso).toLocaleString('es-ES');
        } else if (localUserConn?.lastLoginAt) {
          lastLoginFormatted = new Date(localUserConn.lastLoginAt).toLocaleString('es-ES');
        }

        setProfileData({
          notes: data.notes || [],
          documents: data.documents || [],
          lastLoginAt: lastLoginFormatted,
          lastIp: data.lastIp || localUserConn?.ip || null,
          lastLocation: data.lastLocation || localUserConn?.location || null,
          lastUserAgent: data.lastUserAgent || localUserConn?.userAgent || null,
          hasConnected: !!(lastLoginFormatted || data.lastLoginAt || localUserConn?.lastLoginAt)
        });
      } else {
        const lastLoginFormatted = localUserConn?.lastLoginAt ? new Date(localUserConn.lastLoginAt).toLocaleString('es-ES') : null;
        setProfileData({
          notes: [],
          documents: [],
          lastLoginAt: lastLoginFormatted,
          lastIp: localUserConn?.ip || null,
          lastLocation: localUserConn?.location || null,
          lastUserAgent: localUserConn?.userAgent || null,
          hasConnected: !!lastLoginFormatted
        });
      }
      setLoadingMeta(false);
    }, (err) => {
      console.error("Error fetching user profile meta:", err);
      setLoadingMeta(false);
    });

    return () => unsubscribe();
  }, [isOpen, user]);

  // (15/09/2026) BUG CRITICO CORREGIDO: este "return null" vivia AQUI, antes de
  // los 4 useMemo de mas abajo (userTasks/completedTasks/criticalPending/
  // displayedTasks). Home.jsx renderiza <UserProfileModal isOpen={...} .../>
  // SIEMPRE montado (no con "{showModal && <UserProfileModal/>}"), asi que
  // cuando isOpen pasaba de true a false (cerrar el modal), React ejecutaba
  // MENOS hooks que en el render anterior -- viola las Reglas de los Hooks y
  // causaba el crash real de la app: "Minified React error #300: Rendered
  // fewer hooks than expected" (pantalla "Ocurrio una interrupcion
  // inesperada"), reportado por Liliana Cubillo. El check se movio a despues
  // del ultimo useMemo (linea ~360) para que los hooks siempre se llamen en
  // el mismo orden y cantidad, sin importar isOpen/user. Los useMemo de abajo
  // se hicieron seguros ante user=null/undefined para que puedan ejecutarse
  // incondicionalmente sin romperse.
  const canonicalRole = normalizeRole(user?.role);
  const roleColor = ROLE_COLORS[canonicalRole] || ROLE_COLORS[user?.role] || '#29abe2';
  const roleLabel = ROLE_LABELS[canonicalRole] || ROLE_LABELS[user?.role] || user?.role;

  const canEditTask = (task) => {
    if (!currentUser) return false;
    if (currentUser.isSuperAdmin) return true;
    const taskCreator = task.createdBy ? String(task.createdBy).toLowerCase().trim() : '';
    const userEmail = currentUser.email ? String(currentUser.email).toLowerCase().trim() : '';
    return taskCreator !== '' && taskCreator === userEmail;
  };

  const handleEditClick = (task) => {
    setTaskToEdit(task);
    setShowTaskModal(true);
  };

  // Filter tasks belonging to this user and sort them chronologically:
  // 1. Base tasks of this user's role and sede
  // 2. Direct assigned custom tasks (assignedToEmail)
  const userTasks = useMemo(() => {
    if (!user) return [];
    const raw = allTasks.filter(t => {
      const isAssigned = (t.assignedToEmails && t.assignedToEmails.some(e => e.toLowerCase() === user.email?.toLowerCase())) || (t.assignedToEmail && t.assignedToEmail.toLowerCase() === user.email?.toLowerCase());
      const isCollab = t.collaborators && t.collaborators.includes(user.email);
      
      if (isAssigned || isCollab) {
        // Regla de Privacidad: Si yo (currentUser) soy gerente/director y estoy viendo el perfil de otro gerente/director
        if (!currentUser?.isSuperAdmin) {
          const myRole = currentUser?.appRole;
          const targetRole = normalizeRole(user.role);
          const isManagerRole = r => r === 'gerente' || r === 'director_maestria' || r === 'direccion';
          
          if (isManagerRole(myRole) && isManagerRole(targetRole) && currentUser.email?.toLowerCase() !== user.email?.toLowerCase()) {
            const iAmCreator = t.createdBy?.toLowerCase() === currentUser?.email?.toLowerCase();
            const iAmCollaborator = t.collaborators?.includes(currentUser?.email);
            if (!iAmCreator && !iAmCollaborator) return false;
          }
        }
        return true;
      }

      if (t.assignedToEmail || (t.assignedToEmails && t.assignedToEmails.length > 0)) return false; // Is a specific task for someone else

      const tRoleNorm = normalizeRole(t.role);
      const roleMatches = tRoleNorm === canonicalRole || t.role === user.role;
      if (!roleMatches) return false;

      // Check sede match
      // FIX (20/09/2026): las tareas ad-hoc guardan la sede en "assignedSede",
      // no en "sede" (ver ChecklistContext.jsx addCustomTask). Leer solo
      // "t.sede" dejaba pasar sin filtro tareas de otras sedes — mismo bug
      // corregido en GerenteDashboard.jsx y SuperAdminPanel.jsx.
      const tSede = t.assignedSede || t.sede;
      if (tSede) {
        return tSede === user.sede || tSede === 'Global' || user.sede === 'Global';
      }
      return true;
    });

    // Ordenamiento cronológico garantizado de la Matriz Operativa
    return raw.sort((a, b) => {
      const dInfoA = getTaskDeadlineInfo(a, currentCycle);
      const dInfoB = getTaskDeadlineInfo(b, currentCycle);

      const timeA = dInfoA.timestamp;
      const timeB = dInfoB.timestamp;

      if (timeA !== timeB) {
        return taskSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }

      // Tie-breakers:
      // 1. Tareas pendientes antes que completadas en la misma fecha
      const compA = isTaskCompleted(a, user.sede) ? 1 : 0;
      const compB = isTaskCompleted(b, user.sede) ? 1 : 0;
      if (compA !== compB) return compA - compB;

      // 2. Tareas críticas primero
      const critA = a.isCritical || a.priority?.includes('ROJO') ? 1 : 0;
      const critB = b.isCritical || b.priority?.includes('ROJO') ? 1 : 0;
      if (critA !== critB) return critB - critA;

      return (a.task || a.title || '').localeCompare(b.task || b.title || '');
    });
  }, [allTasks, user, currentUser, canonicalRole, currentCycle, taskSortOrder]);

  const completedTasks = useMemo(() => {
    if (!user) return [];
    return userTasks.filter(t => isTaskCompleted(t, user.sede));
  }, [userTasks, user?.sede]);

  const criticalPending = useMemo(() => {
    if (!user) return [];
    return userTasks.filter(t => !isTaskCompleted(t, user.sede) && (t.isCritical || t.priority?.includes('ROJO')));
  }, [userTasks, user?.sede]);

  const displayedTasks = useMemo(() => {
    if (!user) return [];
    if (taskFilterStatus === 'pending') {
      return userTasks.filter(t => !isTaskCompleted(t, user.sede));
    }
    if (taskFilterStatus === 'completed') {
      return userTasks.filter(t => isTaskCompleted(t, user.sede));
    }
    if (taskFilterStatus === 'critical') {
      return userTasks.filter(t => t.isCritical || t.priority?.includes('ROJO'));
    }
    return userTasks;
  }, [userTasks, taskFilterStatus, user?.sede]);

  // Este es el punto correcto para el early-return: TODOS los hooks del
  // componente (useState/useEffect/useMemo) ya se llamaron arriba, en el
  // mismo orden en cada render, sin importar isOpen/user. Todo lo que sigue
  // de aqui en adelante (handlers, y el JSX del modal) es seguro de saltar.
  if (!isOpen || !user) return null;

  const pct = userTasks.length > 0 ? Math.round((completedTasks.length / userTasks.length) * 100) : 0;

  // Handler: Guardar Cumpleaños (escribe en la colección "users", no en "user_profiles",
  // para que quede consistente con userService.getAllCompanyUsers() y con el import
  // desde el Directorio Global). Solo aplica cuando el usuario tiene un id real de
  // Firestore (user.id) — un registro que solo viene del registro local (usersData.js,
  // source: 'local_registry') no tiene doc propio en "users" y no se puede editar aquí.
  const handleSaveBirthday = async () => {
    if (!user?.id) {
      showToast('Este perfil no tiene un documento en Firestore para editar (registro local).', 'error');
      return;
    }
    setIsSavingBirthday(true);
    try {
      await updateDoc(doc(db, 'users', user.id), { cumpleanos: birthdayDraft || null });
      showToast('Cumpleaños guardado.', 'success');
      setEditingBirthday(false);
    } catch (error) {
      console.error('Error guardando cumpleaños:', error);
      showToast('No se pudo guardar el cumpleaños: ' + error.message, 'error');
    } finally {
      setIsSavingBirthday(false);
    }
  };

  // Handler: Guardar Rol y Sede — mismo patrón que handleSaveBirthday (mismo
  // doc, mismo guard de user.id). Requiere que ambos campos estén elegidos y
  // muestra confirmación inline (no hay "deshacer": el rol cambia qué tareas
  // ve esta persona en toda la plataforma).
  const handleSaveRole = async () => {
    if (!user?.id) {
      showToast('Este perfil no tiene un documento en Firestore para editar (registro local).', 'error');
      return;
    }
    if (!roleDraft || !sedeDraft) {
      showToast('Selecciona un rol y una sede antes de guardar.', 'error');
      return;
    }
    setIsSavingRole(true);
    const selectedRoles = Array.from(new Set([roleDraft, ...rolesDraft].map(normalizeRole).filter(Boolean)));
    try {
      await updateDoc(doc(db, 'users', user.id), {
        role: roleDraft,
        roles: selectedRoles,
        sede: sedeDraft,
        roleSedes: { ...(user.roleSedes || {}), [roleDraft]: sedeDraft },
        rolesUpdatedAt: serverTimestamp(),
        rolesUpdatedBy: currentUser?.email || ''
      });
      await recordAuditEvent({
        email: currentUser?.email,
        name: currentUser?.name,
        role: currentUser?.appRole || currentUser?.role,
        sede: currentUser?.sede,
        action: 'USER_ROLES_UPDATED',
        details: `${user.name || user.email}: rol principal ${roleDraft}; roles [${selectedRoles.join(', ')}]; sede ${sedeDraft}.`
      });
      showToast(`Roles actualizados: ${selectedRoles.map(getRoleDisplayName).join(', ')} — sede principal ${sedeDraft}.`, 'success');
      setEditingRole(false);
    } catch (error) {
      console.error('Error guardando rol/sede:', error);
      showToast('No se pudo guardar el rol/sede: ' + error.message, 'error');
    } finally {
      setIsSavingRole(false);
    }
  };

  // (14/09/2026) Equipo(s) de Quito -- editable por la propia persona (self-service,
  // confirmado por Jose) o por Super Admin (para poder ayudar/corregir). Igual que
  // el cumpleanos, requiere un id real de Firestore.
  const isViewingOwnProfile = Boolean(currentUser?.email && user?.email && currentUser.email.toLowerCase().trim() === user.email.toLowerCase().trim());
  const canEditQuitoTeams = isViewingOwnProfile || Boolean(currentUser?.isSuperAdmin);
  const isQuitoUser = normalizeSede(user?.sede || '').startsWith('Quito');

  const toggleQuitoTeamDraft = (team) => {
    setQuitoTeamsDraft(prev => {
      if (prev.includes(team)) return prev.filter(t => t !== team);
      if (prev.length >= 2) {
        showToast('Solo puedes elegir hasta 2 equipos a la vez.', 'error');
        return prev;
      }
      return [...prev, team];
    });
  };

  const handleSaveQuitoTeams = async () => {
    if (!user?.id) {
      showToast('Este perfil no tiene un documento en Firestore para editar (registro local).', 'error');
      return;
    }
    setIsSavingQuitoTeams(true);
    try {
      await updateDoc(doc(db, 'users', user.id), { equiposQuito: quitoTeamsDraft });
      // Si la persona esta editando su PROPIO perfil, reflejamos el cambio de
      // inmediato en el currentUser de la sesion -- si no, CyclesContext.jsx no se
      // entera del equipo elegido hasta que cierre sesion y vuelva a entrar.
      if (isViewingOwnProfile && typeof updateCurrentUserFields === 'function') {
        updateCurrentUserFields({ equiposQuito: quitoTeamsDraft });
      }
      showToast('Equipo(s) de Quito actualizados.', 'success');
      setEditingQuitoTeams(false);
    } catch (error) {
      console.error('Error guardando equiposQuito:', error);
      showToast('No se pudo guardar tu seleccion de equipo(s): ' + error.message, 'error');
    } finally {
      setIsSavingQuitoTeams(false);
    }
  };

  // Handler: Notificar por correo -- encola un correo en la coleccion 'mail' de Firestore,
  // que ya es procesada automaticamente por el sistema de correo de la plataforma
  // (mail-dispatch.yml + mailerDaemon.js), igual que HelpModal.jsx y MonitorImos.jsx.
  // (15/09/2026) Se agrego un cuadro de mensaje personalizado -- a peticion de Jose,
  // para poder avisarle a cada colaborador (ej. Liliana, Erika, Andres) puntualmente
  // que su situacion especifica ya fue resuelta, en vez de mandar siempre el mismo
  // texto generico fijo. El boton de mas abajo ahora abre este cuadro en vez de
  // enviar directo; el envio real ocurre desde el boton "Enviar correo" del cuadro.
  const handleNotifyByEmail = async () => {
    if (!user?.email) {
      showToast('Este perfil no tiene un correo registrado para notificar.', 'error');
      return;
    }
    if (!notifyCustomMessage.trim()) {
      showToast('Escribe un mensaje antes de enviar.', 'error');
      return;
    }
    setIsSendingNotification(true);
    try {
      const primerNombre = user.name ? user.name.split(' ')[0] : '';
      const escapeHtml = (str) => str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const cuerpoHtml = escapeHtml(notifyCustomMessage.trim()).replace(/\n/g, '<br/>');
      await addDoc(collection(db, 'mail'), {
        to: [user.email],
        message: {
          subject: 'Causa OS: novedades sobre tu situación',
          html: `<p>Hola ${primerNombre},</p><p>${cuerpoHtml}</p><p>Si tienes alguna situación o consulta al respecto, por favor comunícala respondiendo a este correo o contactando a tu coordinador/a.</p><p>Gracias,<br/>Causa OS</p>`
        },
        createdAt: serverTimestamp()
      });
      showToast('Correo de notificacion enviado a la cola para ' + (user.name || user.email) + '.', 'success');
      setShowNotifyMessageBox(false);
      setNotifyCustomMessage('');
    } catch (error) {
      console.error('Error enviando notificacion por correo:', error);
      showToast('No se pudo poner en cola el correo: ' + error.message, 'error');
    } finally {
      setIsSendingNotification(false);
    }
  };

  // Handler: Add Note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    setIsSavingNote(true);
    try {
      const userDocId = user.email.toLowerCase().trim();
      const userDocRef = doc(db, 'user_profiles', userDocId);

      const noteItem = {
        id: 'note_' + Date.now(),
        text: newNoteText.trim(),
        authorName: currentUser?.name || currentUser?.email || 'SuperAdmin',
        authorEmail: currentUser?.email || '',
        createdAt: new Date().toISOString()
      };

      await setDoc(userDocRef, {
        notes: arrayUnion(noteItem),
        userId: user.id || user.email,
        name: user.name,
        email: user.email,
        role: user.role,
        sede: user.sede,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setNewNoteText('');
      showToast("Nota guardada con éxito", "success");
    } catch (err) {
      console.error("Error saving note:", err);
      showToast("Error al guardar la nota", "error");
    } finally {
      setIsSavingNote(false);
    }
  };

  // Handler: Delete Note
  const handleDeleteNote = async (noteItem) => {
    try {
      const userDocId = user.email.toLowerCase().trim();
      const userDocRef = doc(db, 'user_profiles', userDocId);
      await updateDoc(userDocRef, {
        notes: arrayRemove(noteItem)
      });
      showToast("Nota eliminada", "info");
    } catch (err) {
      console.error("Error deleting note:", err);
      showToast("Error al eliminar la nota", "error");
    }
  };

  // Handler: Add Document Link
  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !newDocUrl.trim()) return;

    let formattedUrl = newDocUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    setIsSavingDoc(true);
    try {
      const userDocId = user.email.toLowerCase().trim();
      const userDocRef = doc(db, 'user_profiles', userDocId);

      const docItem = {
        id: 'doc_' + Date.now(),
        title: newDocTitle.trim(),
        url: formattedUrl,
        addedBy: currentUser?.name || currentUser?.email || 'SuperAdmin',
        createdAt: new Date().toISOString()
      };

      await setDoc(userDocRef, {
        documents: arrayUnion(docItem),
        userId: user.id || user.email,
        name: user.name,
        email: user.email,
        role: user.role,
        sede: user.sede,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setNewDocTitle('');
      setNewDocUrl('');
      showToast("Documento enlazado con éxito", "success");
    } catch (err) {
      console.error("Error saving document:", err);
      showToast("Error al guardar el enlace del documento", "error");
    } finally {
      setIsSavingDoc(false);
    }
  };

  // Handler: Delete Document
  const handleDeleteDocument = async (docItem) => {
    try {
      const userDocId = user.email.toLowerCase().trim();
      const userDocRef = doc(db, 'user_profiles', userDocId);
      await updateDoc(userDocRef, {
        documents: arrayRemove(docItem)
      });
      showToast("Enlace de documento eliminado", "info");
    } catch (err) {
      console.error("Error deleting document:", err);
      showToast("Error al eliminar documento", "error");
    }
  };

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(5, 10, 25, 0.85)', backdropFilter: 'blur(8px)',
        zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
      }}>
        <div className="glass-panel" style={{
          width: '100%', maxWidth: '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          position: 'relative', border: `1px solid ${roleColor}40`, boxShadow: `0 10px 40px rgba(0,0,0,0.8), 0 0 20px ${roleColor}20`,
          borderRadius: '16px', overflow: 'hidden'
        }}>
          {/* Close button */}
          <button 
            onClick={onClose}
            style={{
              position: 'absolute', top: '1.2rem', right: '1.2rem', background: 'rgba(255,255,255,0.08)',
              border: 'none', color: '#fff', borderRadius: '50%', width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10,
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            <X size={20} />
          </button>

          {/* User Header Profile Card */}
          <div style={{
            padding: '1.8rem 2rem 1.2rem 2rem',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: `linear-gradient(135deg, ${roleColor}40, ${roleColor}10)`,
                border: `2px solid ${roleColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', boxShadow: `0 0 15px ${roleColor}40`
              }}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>

              <div style={{ flex: 1, minWidth: '240px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, color: 'var(--text-heading)', fontSize: '1.5rem', fontWeight: 'bold' }}>{user.name}</h2>
                  {(user.roles && user.roles.length > 0 ? user.roles : [user.role]).map(r => {
                    const rNorm = normalizeRole(r);
                    const rCol = ROLE_COLORS[rNorm] || roleColor;
                    const rLab = getRoleDisplayName(r);
                    return (
                      <span key={r} style={{
                        padding: '0.3rem 0.8rem',
                        borderRadius: '9999px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-heading)',
                        letterSpacing: '0.3px',
                        background: `${rCol}25`,
                        color: rCol,
                        border: `1px solid ${rCol}60`,
                        boxShadow: `0 2px 8px ${rCol}15`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        {rLab}
                      </span>
                    );
                  })}
                  {isInactive ? (
                    <span style={{
                      padding: '0.3rem 0.8rem',
                      borderRadius: '9999px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.6)',
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}>
                      🔴 INACTIVO / BAJA
                    </span>
                  ) : (
                    <span style={{
                      padding: '0.3rem 0.8rem',
                      borderRadius: '9999px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: 'rgba(34, 197, 94, 0.15)',
                      color: '#22c55e',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}>
                      🟢 ACTIVO
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1.2rem', marginTop: '0.6rem', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Building2 size={15} color="var(--crear-gold)" /> Sede: <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{getFlagForSede(user.sede)} <strong style={{ color: 'var(--text-heading)' }}>{normalizeSede(user.sede)}</strong></span>
                  </span>
                  {currentUser?.isSuperAdmin && !editingRole && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRoleDraft(normalizeRole(user.role) || '');
                        setRolesDraft(Array.from(new Set([
                          normalizeRole(user.role), ...(Array.isArray(user.roles) ? user.roles.map(normalizeRole) : [])
                        ].filter(Boolean))));
                        setSedeDraft(normalizeSede(user.sede) || '');
                        setEditingRole(true);
                      }}
                      title="Editar rol y sede"
                      style={{
                        background: 'transparent', border: '1px dashed rgba(255,255,255,0.25)', borderRadius: '9999px',
                        color: 'var(--text-muted)', fontSize: '0.72rem', padding: '0.25rem 0.7rem', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                      }}
                    >
                      ✏️ Editar rol/sede
                    </button>
                  )}
                  {editingRole && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', width: '100%',
                        padding: '0.6rem 0.8rem', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)'
                      }}
                    >
                      <select
                        value={roleDraft}
                        onChange={(e) => setRoleDraft(e.target.value)}
                        style={{
                          padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid var(--crear-gold)',
                          background: 'var(--bg-input, #1a1a1a)', color: 'var(--text-heading)', fontSize: '0.82rem'
                        }}
                      >
                        <option value="" disabled>Rol…</option>
                        {ROLE_EDIT_OPTIONS.map(r => (
                          <option key={r} value={r}>{getRoleDisplayName(r)}</option>
                        ))}
                      </select>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', width: '100%' }}>
                        {ROLE_EDIT_OPTIONS.map(r => {
                          const selected = rolesDraft.includes(r);
                          return <label key={r} style={{ fontSize: '0.72rem', color: selected ? 'var(--crear-gold)' : 'var(--text-muted)', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => setRolesDraft(prev => selected ? prev.filter(item => item !== r) : [...prev, r])}
                            /> {getRoleDisplayName(r)}
                          </label>;
                        })}
                      </div>
                      <select
                        value={sedeDraft}
                        onChange={(e) => setSedeDraft(e.target.value)}
                        style={{
                          padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid var(--crear-gold)',
                          background: 'var(--bg-input, #1a1a1a)', color: 'var(--text-heading)', fontSize: '0.82rem'
                        }}
                      >
                        <option value="" disabled>Sede…</option>
                        {SEDE_EDIT_OPTIONS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleSaveRole}
                        disabled={isSavingRole}
                        style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', border: 'none', background: 'var(--crear-gold)', color: '#000', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {isSavingRole ? '...' : 'Guardar'}
                      </button>
                      <button
                        onClick={() => setEditingRole(false)}
                        style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--text-muted)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: '100%' }}>
                        El primer selector define el rol de inicio. Las casillas conservan roles adicionales; el cambio se registra en la trazabilidad. Verifica la sede correspondiente antes de guardar.
                      </span>
                    </div>
                  )}
                  {user.corporateEmail && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }} title="Correo Corporativo Oficial">
                      <Mail size={14} color="var(--crear-gold)" /> Corp: {user.corporateEmail}
                    </span>
                  )}
                  {user.personalEmail && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }} title="Gmail Personal">
                      <Mail size={14} color="var(--crear-cyan)" /> Personal: {user.personalEmail}
                    </span>
                  )}
                  {!user.corporateEmail && !user.personalEmail && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Mail size={14} color="var(--crear-cyan)" /> {user.email}
                    </span>
                  )}
                  {user.phone && (
                    <a
                      href={getWhatsAppUrl(user.phone, user.sede)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: '#25D366',
                        background: 'rgba(37, 211, 102, 0.12)',
                        border: '1px solid rgba(37, 211, 102, 0.35)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      title="Abrir chat directo en WhatsApp"
                    >
                      <span style={{ fontSize: '0.95rem' }}>💬</span>
                      <span>{user.phone}</span>
                      <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.2)', padding: '1px 4px', borderRadius: '4px' }}>WhatsApp</span>
                    </a>
                  )}

                  {/* Cumpleaños — visible para todos si ya está cargado; editable solo por Super Admin */}
                  {editingBirthday ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }} onClick={(e) => e.stopPropagation()}>
                      <Calendar size={14} color="var(--crear-gold)" />
                      <input
                        type="date"
                        value={birthdayDraft || ''}
                        onChange={(e) => setBirthdayDraft(e.target.value)}
                        style={{
                          padding: '2px 6px',
                          borderRadius: '6px',
                          border: '1px solid var(--crear-gold)',
                          background: 'var(--bg-input, #1a1a1a)',
                          color: 'var(--text-heading)',
                          fontSize: '0.82rem'
                        }}
                      />
                      <button
                        onClick={handleSaveBirthday}
                        disabled={isSavingBirthday}
                        style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', border: 'none', background: 'var(--crear-gold)', color: '#000', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {isSavingBirthday ? '...' : 'Guardar'}
                      </button>
                      <button
                        onClick={() => { setEditingBirthday(false); setBirthdayDraft(user?.cumpleanos || ''); }}
                        style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--text-muted)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <span
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', cursor: currentUser?.isSuperAdmin ? 'pointer' : 'default' }}
                      title={currentUser?.isSuperAdmin ? 'Clic para editar el cumpleaños' : undefined}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (currentUser?.isSuperAdmin) {
                          setBirthdayDraft(user?.cumpleanos || '');
                          setEditingBirthday(true);
                        }
                      }}
                    >
                      <Calendar size={14} color="var(--crear-gold)" />
                      {user?.cumpleanos ? (
                        <span>Cumpleaños: <strong style={{ color: 'var(--text-heading)' }}>{formatBirthdayNoYear(user.cumpleanos)}</strong></span>
                      ) : currentUser?.isSuperAdmin ? (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin cumpleaños — clic para agregar</span>
                      ) : null}
                    </span>
                  )}

                  {/* (14/09/2026) Equipo(s) de Quito -- solo aparece para perfiles de Quito.
                      Quito corre varios equipos en paralelo (a diferencia de las demas sedes),
                      asi que cada persona indica aqui a cual(es) pertenece: 1 o 2 equipos,
                      elegidos de la lista real y viva del calendario (nunca inventados).
                      Editable por la propia persona (self-service) o por Super Admin. */}
                  {isQuitoUser && (
                    editingQuitoTeams ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                        <Users size={14} color="var(--crear-gold)" />
                        <span style={{ display: 'inline-flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {quitoTeamOptions.length === 0 ? (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Sin equipos detectados aun en el calendario de Quito.
                            </span>
                          ) : quitoTeamOptions.map(team => {
                            const selected = quitoTeamsDraft.includes(team);
                            return (
                              <button
                                key={team}
                                type="button"
                                onClick={() => toggleQuitoTeamDraft(team)}
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '3px 9px',
                                  borderRadius: '9999px',
                                  cursor: 'pointer',
                                  fontWeight: 700,
                                  border: `1px solid ${selected ? 'var(--crear-gold)' : 'rgba(255,255,255,0.2)'}`,
                                  background: selected ? 'var(--crear-gold)' : 'transparent',
                                  color: selected ? '#000' : 'var(--text-muted)'
                                }}
                              >
                                Equipo {team}
                              </button>
                            );
                          })}
                        </span>
                        <button
                          onClick={handleSaveQuitoTeams}
                          disabled={isSavingQuitoTeams}
                          style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', border: 'none', background: 'var(--crear-gold)', color: '#000', fontWeight: 700, cursor: 'pointer' }}
                        >
                          {isSavingQuitoTeams ? '...' : 'Guardar'}
                        </button>
                        <button
                          onClick={() => { setEditingQuitoTeams(false); setQuitoTeamsDraft(Array.isArray(user?.equiposQuito) ? user.equiposQuito : []); }}
                          style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--text-muted)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <span
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', cursor: canEditQuitoTeams ? 'pointer' : 'default' }}
                        title={canEditQuitoTeams ? 'Clic para elegir tu(s) equipo(s) de Quito' : 'Equipo(s) de Quito (elegido por la propia persona)'}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canEditQuitoTeams) {
                            setQuitoTeamsDraft(Array.isArray(user?.equiposQuito) ? user.equiposQuito : []);
                            setEditingQuitoTeams(true);
                          }
                        }}
                      >
                        <Users size={14} color="var(--crear-gold)" />
                        {Array.isArray(user?.equiposQuito) && user.equiposQuito.length > 0 ? (
                          <span>Equipo(s) Quito: <strong style={{ color: 'var(--text-heading)' }}>{user.equiposQuito.map(t => `Equipo ${t}`).join(' + ')}</strong></span>
                        ) : canEditQuitoTeams ? (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin equipo elegido -- clic para asignar (usa auto-deteccion mientras tanto)</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin equipo elegido (auto-deteccion)</span>
                        )}
                      </span>
                    )
                  )}

                  {/* Última Conexión Visible para Directorio y Super Admin */}
                  <span 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '2px 10px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      background: profileData.hasConnected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: profileData.hasConnected ? '#22c55e' : 'var(--text-muted)',
                      border: profileData.hasConnected ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: profileData.hasConnected ? '0 0 10px rgba(34, 197, 94, 0.2)' : 'none'
                    }}
                    title={profileData.hasConnected ? `IP: ${profileData.lastIp || 'N/A'} • ${profileData.lastLocation || ''}` : 'Sin inicios de sesión registrados'}
                  >
                    <span style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: profileData.hasConnected ? '#22c55e' : '#94a3b8',
                      boxShadow: profileData.hasConnected ? '0 0 6px #22c55e' : 'none'
                    }} />
                    <span>{profileData.hasConnected ? `🟢 Último acceso: ${profileData.lastLoginAt}` : '⚪ Sin conexión'}</span>
                    {profileData.lastLocation && (
                      <span style={{ fontSize: '0.75rem', opacity: 0.85, color: '#e2e8f0' }}>({profileData.lastLocation})</span>
                    )}
                  </span>
                </div>
              </div>

              {/* KPI metrics */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: pct === 100 ? '#22c55e' : 'var(--crear-gold)' }}>{pct}%</span>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Progreso</p>
                </div>
                <div style={{ height: '28px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' }}>{completedTasks.length}/{userTasks.length}</span>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tareas</p>
                </div>
                {criticalPending.length > 0 && (
                  <>
                    <div style={{ height: '28px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ef4444' }}>{criticalPending.length}</span>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: '#ef4444' }}>Críticas</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Estado de Conexión del Usuario */}
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              background: profileData.hasConnected ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.03)',
              border: profileData.hasConnected ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.8rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  width: '12px', height: '12px', borderRadius: '50%',
                  background: profileData.hasConnected ? '#22c55e' : '#94a3b8',
                  boxShadow: profileData.hasConnected ? '0 0 10px #22c55e' : 'none',
                  display: 'inline-block'
                }} />
                <div>
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    color: profileData.hasConnected ? '#22c55e' : 'var(--text-muted)'
                  }}>
                    {profileData.hasConnected ? '✅ Usuario Conectado a Causa OS' : '⚪ Sin Conexión Registrada'}
                  </span>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {profileData.hasConnected 
                      ? `Último acceso: ${profileData.lastLoginAt} ${profileData.lastLocation ? `• ${profileData.lastLocation}` : ''} ${profileData.lastIp ? `(${profileData.lastIp})` : ''}`
                      : 'Este colaborador aún no ha iniciado sesión en la plataforma'}
                  </p>
                </div>
              </div>
              {profileData.hasConnected && profileData.lastUserAgent && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={profileData.lastUserAgent}>
                  🖥️ {profileData.lastUserAgent}
                </span>
              )}
            </div>

            {/* Banner de Estado y Trazabilidad de Colaborador */}
            {isInactive ? (
              <div style={{
                marginTop: '0.8rem',
                padding: '0.9rem 1.1rem',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.45)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.8rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem' }}>
                  <UserX size={24} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fca5a5' }}>
                        🔴 Colaborador Inactivo / Dado de Baja
                      </span>
                      {u.deactivationReason && (
                        <span style={{
                          fontSize: '0.75rem',
                          background: 'rgba(239, 68, 68, 0.25)',
                          color: '#fca5a5',
                          padding: '1px 7px',
                          borderRadius: '4px',
                          fontWeight: 600
                        }}>
                          {u.deactivationReason}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#fca5a5' }}>
                      {u.deactivatedAt && `Fecha: ${u.deactivatedAt.slice(0, 10)}`}
                      {u.deactivatedBy?.name && ` • Registrado por: ${u.deactivatedBy.name}`}
                    </p>
                    {u.deactivationNotes && (
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem', color: '#e2e8f0', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px' }}>
                        "{u.deactivationNotes}"
                      </p>
                    )}
                  </div>
                </div>

                {canManageStatus && (
                  <button
                    onClick={() => setShowStatusModal(true)}
                    style={{
                      padding: '0.45rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                      color: '#ffffff',
                      fontWeight: 'bold',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
                    }}
                  >
                    <UserCheck size={16} /> Reactivar Colaborador
                  </button>
                )}
              </div>
            ) : canManageStatus ? (
              <div style={{
                marginTop: '0.8rem',
                padding: '0.6rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.6rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={16} color="#38bdf8" />
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    Estado laboral: <strong style={{ color: '#22c55e' }}>🟢 Activo en Operaciones</strong>
                  </span>
                </div>
                <button
                  onClick={() => setShowStatusModal(true)}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    background: 'rgba(239, 68, 68, 0.08)',
                    color: '#f87171',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                  title="Dar de baja, registrar renuncia o salida de este colaborador"
                >
                  <UserX size={14} /> Desactivar Colaborador (Baja)
                </button>
              </div>
            ) : null}

            {/* Botón de Simulación — SOLO Super Administradores */}
            {canSimulate(currentUser, originalAdminUser) && (
              <div style={{ marginTop: '0.8rem' }}>
                <button
                  onClick={() => {
                    simulateUser(user);
                    onClose();
                    navigate('/home');
                  }}
                  style={{
                    width: '100%',
                    padding: '0.6rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                    background: 'rgba(251, 191, 36, 0.08)',
                    color: 'var(--crear-gold)',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(251, 191, 36, 0.2)';
                    e.currentTarget.style.borderColor = 'var(--crear-gold)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(251, 191, 36, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.4)';
                  }}
                >
                  <Eye size={16} /> Simular como {user.name.split(' ')[0]}
                </button>
              </div>
            )}

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
              <button 
                onClick={() => setActiveTab('tasks')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: activeTab === 'tasks' ? 'var(--crear-gold)' : 'rgba(255,255,255,0.05)',
                  color: activeTab === 'tasks' ? '#000' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                <CheckSquare size={16} /> Tareas ({userTasks.length})
              </button>

              <button 
                onClick={() => setActiveTab('notes')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: activeTab === 'notes' ? 'var(--crear-gold)' : 'rgba(255,255,255,0.05)',
                  color: activeTab === 'notes' ? '#000' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                <FileText size={16} /> Notas y Bitácora ({profileData.notes.length})
              </button>

              <button 
                onClick={() => setActiveTab('documents')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: activeTab === 'documents' ? 'var(--crear-gold)' : 'rgba(255,255,255,0.05)',
                  color: activeTab === 'documents' ? '#000' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                <Link2 size={16} /> Documentos y Enlaces ({profileData.documents.length})
              </button>
            </div>
          </div>

          {/* Modal Body with scroll */}
          <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: 1 }}>

            {/* TAB 1: TASKS */}
            {activeTab === 'tasks' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                  <h4 style={{ margin: 0, color: '#fff', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckSquare size={18} color="var(--crear-cyan)" /> Matriz Operativa de {user.name}
                  </h4>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    {canSimulate(currentUser, originalAdminUser) && (
                      <button 
                        onClick={() => {
                          onClose();
                          navigate('/home');
                          setTimeout(() => {
                            simulateUser(user);
                          }, 50);
                        }}
                        className="btn-secondary"
                        style={{
                          padding: '0.4rem 0.9rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                          background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 'bold', borderRadius: '8px'
                        }}
                      >
                        <Eye size={16} /> Simular Vista
                      </button>
                    )}
                    {canSimulate(currentUser, originalAdminUser) && (
                      <button 
                        onClick={() => {
                          setShowNotifyMessageBox(prev => {
                            const next = !prev;
                            if (next && !notifyCustomMessage.trim()) {
                              setNotifyCustomMessage('Te confirmamos que tu perfil en Causa OS ya está actualizado. Si tienes alguna situación o consulta al respecto, por favor comunícala respondiendo a este correo o contactando a tu coordinador/a.');
                            }
                            return next;
                          });
                        }}
                        disabled={isSendingNotification || !user?.email}
                        className="btn-secondary"
                        style={{
                          padding: '0.4rem 0.9rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                          background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 'bold', borderRadius: '8px',
                          cursor: (isSendingNotification || !user?.email) ? 'not-allowed' : 'pointer',
                          opacity: (isSendingNotification || !user?.email) ? 0.6 : 1
                        }}
                        title="Escribe y envia un mensaje personalizado a este colaborador via el sistema de correo de la plataforma"
                      >
                        <Mail size={16} /> Notificar por correo
                      </button>
                    )}
                    <button 
                      onClick={() => setShowTaskModal(true)}
                      className="btn-primary"
                      style={{
                        padding: '0.4rem 0.9rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                        background: 'var(--crear-cyan)', color: '#000', border: 'none', fontWeight: 'bold', borderRadius: '8px'
                      }}
                    >
                      <PlusCircle size={16} /> Asignar Nueva Tarea
                    </button>
                  </div>
                </div>

                {showNotifyMessageBox && (
                  <div style={{
                    marginBottom: '1rem',
                    padding: '0.9rem 1rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px'
                  }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                      Mensaje para {user?.name || 'este colaborador'} (se enviará por correo a {user?.email}):
                    </label>
                    <textarea
                      value={notifyCustomMessage}
                      onChange={(e) => setNotifyCustomMessage(e.target.value)}
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.7rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(0,0,0,0.25)',
                        color: '#fff',
                        fontSize: '0.85rem',
                        fontFamily: 'inherit',
                        resize: 'vertical'
                      }}
                      placeholder="Escribe aquí el mensaje específico para este colaborador..."
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.6rem' }}>
                      <button
                        onClick={() => { setShowNotifyMessageBox(false); setNotifyCustomMessage(''); }}
                        disabled={isSendingNotification}
                        className="btn-secondary"
                        style={{
                          padding: '0.4rem 0.9rem', fontSize: '0.82rem',
                          background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 'bold', borderRadius: '8px',
                          cursor: isSendingNotification ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleNotifyByEmail}
                        disabled={isSendingNotification || !notifyCustomMessage.trim() || !user?.email}
                        className="btn-primary"
                        style={{
                          padding: '0.4rem 0.9rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                          background: 'var(--crear-cyan)', color: '#000', border: 'none', fontWeight: 'bold', borderRadius: '8px',
                          cursor: (isSendingNotification || !notifyCustomMessage.trim() || !user?.email) ? 'not-allowed' : 'pointer',
                          opacity: (isSendingNotification || !notifyCustomMessage.trim() || !user?.email) ? 0.6 : 1
                        }}
                      >
                        <Mail size={16} /> {isSendingNotification ? 'Enviando...' : 'Enviar correo'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Barra de Filtros y Orden Cronológico */}
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  gap: '0.6rem', 
                  marginBottom: '1rem',
                  padding: '0.55rem 0.8rem',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  {/* Filtros de estado */}
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {[
                      { key: 'all', label: `Todas (${userTasks.length})` },
                      { key: 'pending', label: `Pendientes (${userTasks.length - completedTasks.length})` },
                      { key: 'completed', label: `Completadas (${completedTasks.length})` },
                      { key: 'critical', label: `Críticas (${criticalPending.length})` },
                    ].map(f => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setTaskFilterStatus(f.key)}
                        style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.74rem',
                          fontWeight: taskFilterStatus === f.key ? 'bold' : 'normal',
                          background: taskFilterStatus === f.key ? 'rgba(41, 171, 226, 0.2)' : 'rgba(255,255,255,0.05)',
                          color: taskFilterStatus === f.key ? 'var(--crear-cyan)' : 'var(--text-muted)',
                          border: taskFilterStatus === f.key ? '1px solid rgba(41, 171, 226, 0.4)' : '1px solid transparent',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Selector / Indicador de Orden Cronológico */}
                  <button
                    type="button"
                    onClick={() => setTaskSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    title="Alternar dirección cronológica"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      background: 'rgba(255,215,0,0.1)',
                      color: 'var(--crear-gold)',
                      border: '1px solid rgba(255,215,0,0.25)',
                      fontSize: '0.74rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Clock size={13} />
                    <span>Orden: {taskSortOrder === 'asc' ? 'Cronológico (Próximas ↑)' : 'Cronológico (Futuras ↓)'}</span>
                  </button>
                </div>

                {displayedTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <CheckCircle2 size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p style={{ margin: 0 }}>
                      {taskFilterStatus === 'completed'
                        ? 'No hay tareas completadas para este perfil.'
                        : taskFilterStatus === 'pending'
                        ? '¡Excelente! Todas las tareas asignadas están completadas.'
                        : `No hay tareas asignadas para este usuario o rol en la sede ${user.sede}.`}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {displayedTasks.map(task => {
                      const isCompleted = isTaskCompleted(task, user.sede);
                      const isCrit = task.isCritical || task.priority?.includes('ROJO');
                      const dInfo = getTaskDeadlineInfo(task, currentCycle);
                      const isOverdue = !isCompleted && dInfo.dateObj && dInfo.timestamp < Date.now();

                      return (
                        <div 
                          key={task.id}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.8rem 1rem', borderRadius: '10px',
                            background: isCompleted ? 'rgba(34, 197, 94, 0.05)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isCompleted ? 'rgba(34, 197, 94, 0.3)' : isCrit ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.06)'}`,
                            gap: '0.8rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flex: 1 }}>
                            <input 
                              type="checkbox"
                              checked={isCompleted}
                              onChange={() => toggleTask(task.id, isCompleted)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--crear-gold)' }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                                <p style={{
                                  margin: 0, fontSize: '0.9rem', color: isCompleted ? 'var(--text-muted)' : '#fff',
                                  textDecoration: isCompleted ? 'line-through' : 'none', fontWeight: isCrit ? '600' : 'normal'
                                }}>
                                  {task.task || task.title}
                                </p>
                                {canEditTask(task) && !isCompleted && (
                                  <button 
                                    onClick={() => handleEditClick(task)}
                                    style={{ background: 'none', border: 'none', color: 'var(--crear-cyan)', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center' }}
                                    title="Editar Tarea"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                  </button>
                                )}
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', marginTop: '0.25rem', fontSize: '0.72rem', color: 'var(--text-muted)', alignItems: 'center' }}>
                                {task.cyclePhase && <span>Fase: <strong style={{ color: '#29abe2' }}>{task.cyclePhase}</strong></span>}
                                {dInfo.dateObj ? (
                                  <span style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.25rem', 
                                    color: isCompleted ? 'var(--text-muted)' : isOverdue ? '#f87171' : 'var(--crear-gold)' 
                                  }}>
                                    <Clock size={11} /> Límite: {dInfo.dateObj.toLocaleDateString()} {dInfo.dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {isOverdue && (
                                      <span style={{ 
                                        background: 'rgba(239, 68, 68, 0.2)', 
                                        color: '#ef4444', 
                                        border: '1px solid rgba(239, 68, 68, 0.35)', 
                                        padding: '0.05rem 0.35rem', 
                                        borderRadius: '4px', 
                                        fontSize: '0.65rem', 
                                        fontWeight: 'bold', 
                                        marginLeft: '0.2rem' 
                                      }}>
                                        Vencida
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                                    Sin fecha límite
                                  </span>
                                )}
                                {(task.assignedToEmail || (task.assignedToEmails && task.assignedToEmails.length > 0)) && (
                                  <span style={{ color: 'var(--crear-cyan)' }}>Personalizada (Directa)</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold',
                              background: isCompleted ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: isCompleted ? '#22c55e' : '#f59e0b',
                              border: `1px solid ${isCompleted ? '#22c55e40' : '#f59e0b40'}`
                            }}>
                              {isCompleted ? 'Completada' : 'Pendiente'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {/* TAB 2: NOTES & BITÁCORA */}
            {activeTab === 'notes' && (
              <div>
                <form onSubmit={handleAddNote} style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--crear-gold)', fontWeight: 'bold', marginBottom: '0.4rem' }}>
                    📝 Añadir Nota / Feedback para {user.name}:
                  </label>
                  <textarea 
                    value={newNoteText}
                    onChange={e => setNewNoteText(e.target.value)}
                    placeholder="Escribe observaciones de desempeño, compromisos de reunión, acuerdos o puntos a auditar..."
                    rows={3}
                    className="input-field"
                    style={{ width: '100%', marginBottom: '0.6rem', resize: 'vertical' }}
                    disabled={isSavingNote}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      type="submit" 
                      className="btn-primary" 
                      disabled={isSavingNote || !newNoteText.trim()}
                      style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Plus size={16} /> {isSavingNote ? 'Guardando...' : 'Guardar Nota'}
                    </button>
                  </div>
                </form>

                <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.8rem' }}>Historial de Notas ({profileData.notes.length})</h4>

                {profileData.notes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    <FileText size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p>Aún no hay notas registradas para este usuario.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {profileData.notes.slice().reverse().map((note) => (
                      <div 
                        key={note.id || note.createdAt}
                        style={{
                          padding: '1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)', position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--crear-cyan)' }}>
                            <Shield size={13} />
                            <strong>{note.authorName || 'SuperAdmin'}</strong>
                            <span style={{ color: 'var(--text-muted)' }}>• {new Date(note.createdAt).toLocaleString()}</span>
                          </div>
                          <button 
                            onClick={() => handleDeleteNote(note)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7, padding: '2px' }}
                            title="Eliminar nota"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.88rem', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                          {note.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DOCUMENTS & LINKS */}
            {activeTab === 'documents' && (
              <div>
                <form onSubmit={handleAddDocument} style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--crear-cyan)', fontWeight: 'bold', marginBottom: '0.6rem' }}>
                    🔗 Enlazar Documento / Enlace Externo (Google Drive, Docs, Reportes):
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '0.6rem', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Título del Documento:</label>
                      <input 
                        type="text"
                        placeholder="Ej. Plan Operativo Q3"
                        value={newDocTitle}
                        onChange={e => setNewDocTitle(e.target.value)}
                        className="input-field"
                        style={{ width: '100%' }}
                        disabled={isSavingDoc}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Enlace URL (Drive, Dropbox, Notion, Web):</label>
                      <input 
                        type="url"
                        placeholder="https://drive.google.com/..."
                        value={newDocUrl}
                        onChange={e => setNewDocUrl(e.target.value)}
                        className="input-field"
                        style={{ width: '100%' }}
                        disabled={isSavingDoc}
                        required
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="btn-primary" 
                      disabled={isSavingDoc || !newDocTitle.trim() || !newDocUrl.trim()}
                      style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', height: '40px' }}
                    >
                      <Plus size={16} /> {isSavingDoc ? '...' : 'Enlazar'}
                    </button>
                  </div>
                </form>

                <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.8rem' }}>Documentos y Enlaces Guardados ({profileData.documents.length})</h4>

                {profileData.documents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    <Link2 size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p>No hay documentos ni enlaces guardados para este usuario.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.8rem' }}>
                    {profileData.documents.map((docItem) => (
                      <div 
                        key={docItem.id || docItem.createdAt}
                        style={{
                          padding: '1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column',
                          justifyContent: 'space-between', gap: '0.8rem'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h5 style={{ margin: 0, color: '#fff', fontSize: '0.95rem', fontWeight: 'bold' }}>{docItem.title}</h5>
                            <button 
                              onClick={() => handleDeleteDocument(docItem)}
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7 }}
                              title="Eliminar documento"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                          <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Subido por: {docItem.addedBy || 'Admin'} • {new Date(docItem.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        <a 
                          href={docItem.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                            padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--crear-cyan)', textDecoration: 'none',
                            borderRadius: '6px', border: '1px solid var(--crear-cyan)40'
                          }}
                        >
                          <ExternalLink size={14} /> Abrir Documento
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Embedded Task Assignment Modal for this specific user */}
      {showTaskModal && (
        <TaskAssignmentModal 
          isOpen={showTaskModal} 
          onClose={() => {
            setShowTaskModal(false);
            setTaskToEdit(null);
          }} 
          prefilledUser={user}
          taskToEdit={taskToEdit}
        />
      )}

      {/* Modal de Cambio de Estado y Trazabilidad (Baja / Reactivación) */}
      {showStatusModal && (
        <UserStatusModal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          user={u}
          onStatusUpdated={(updated) => {
            setTargetUser(updated);
            if (onStatusUpdated) {
              onStatusUpdated(updated);
            }
            showToast(`Estado de colaborador actualizado: ${updated.isActive ? 'Activo' : 'Inactivo'}`, 'success');
          }}
        />
      )}
    </>
  );
}
