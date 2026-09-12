import { useState, useEffect, useRef } from 'react';
import { 
  Target, X, Zap, Calendar, Clock, Search, Users, CheckSquare, 
  Square, UserCheck, ShieldAlert, Award, LayoutGrid, Sliders, 
  ChevronDown, ChevronUp, Plus, Check, Filter, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChecklist } from '../context/ChecklistContext';
import { useUI } from '../context/UIContext';
import { getAssignableRoles } from '../config/permissions';
import { usersData, normalizeRole, normalizeSede, OPERATIONAL_SEDES, getRoleDisplayName } from '../data/usersData';
import { recordAuditEvent } from '../services/auditService';
import { getAllCompanyUsers } from '../services/userService';

export const OPERATIONAL_AREAS = [
  {
    id: 'todas',
    label: 'ðŸŒ Todos los Colaboradores',
    shortLabel: 'Todos',
    icon: 'ðŸ‘¥',
    filter: () => true
  },
  {
    id: 'finanzas',
    label: 'ðŸ“Š Finanzas, Contabilidad y AdministraciÃ³n',
    shortLabel: 'Finanzas / Contab',
    icon: 'ðŸ“Š',
    filter: (u) => {
      const r = normalizeRole(u.role);
      const email = (u.email || '').toLowerCase();
      const name = (u.name || '').toLowerCase();
      return ['cfo', 'finanzas', 'asistente_impuestos_quito'].includes(r) ||
        email.includes('contab') ||
        email.includes('factura') ||
        email.includes('coordinacion.administrativa') ||
        name.includes('karol') ||
        name.includes('gabriela') ||
        name.includes('hector') ||
        name.includes('alexis') ||
        name.includes('diego flores') ||
        name.includes('fernanda');
    }
  },
  {
    id: 'gerentes',
    label: 'ðŸ¢ Gerencia de Sede',
    shortLabel: 'Gerencia',
    icon: 'ðŸ¢',
    filter: (u) => normalizeRole(u.role) === 'gerente'
  },
  {
    id: 'mj',
    label: 'ðŸ† Coordinadores MJ (MaestrÃ­a del Juego)',
    shortLabel: 'Coord. MJ',
    icon: 'ðŸ†',
    filter: (u) => ['coord_maestria', 'coordinador_mj', 'director_maestria'].includes(normalizeRole(u.role))
  },
  {
    id: 'c1',
    label: 'ðŸŒŸ Coordinadores C1 / C2',
    shortLabel: 'Coord. C1/C2',
    icon: 'ðŸŒŸ',
    filter: (u) => normalizeRole(u.role) === 'coord_c1'
  },
  {
    id: 'qt',
    label: 'âš¡ Quantum Team (QT)',
    shortLabel: 'Quantum Team',
    icon: 'âš¡',
    filter: (u) => normalizeRole(u.role) === 'qt'
  },
  {
    id: 'th',
    label: 'ðŸ‘¥ Talento Humano',
    shortLabel: 'Talento Humano',
    icon: 'ðŸ‘¥',
    filter: (u) => ['talento_humano', 'director_th'].includes(normalizeRole(u.role)) || (u.email || '').toLowerCase().includes('talento')
  },
  {
    id: 'direccion',
    label: 'ðŸ‘‘ DirecciÃ³n Ejecutiva (CEO / CCO)',
    shortLabel: 'DirecciÃ³n',
    icon: 'ðŸ‘‘',
    filter: (u) => ['direccion', 'ceo', 'cco'].includes(normalizeRole(u.role))
  },
  {
    id: 'otros',
    label: 'ðŸ› ï¸ Otras Especialidades (SST, Legal, Coaches)',
    shortLabel: 'Otras Ãreas',
    icon: 'ðŸ› ï¸',
    filter: (u) => ['tecnico_sst', 'legal', 'entrenador', 'marketing', 'entrenador_llamadas'].includes(normalizeRole(u.role))
  }
];

export const QUICK_ASSIGN_AREAS = [
  { id: 'gerentes', label: 'Todos los Gerentes', filter: u => normalizeRole(u.role) === 'gerente' },
  { id: 'c1', label: 'Coordinadores C1', filter: u => normalizeRole(u.role) === 'coord_c1' },
  { id: 'mj', label: 'Coordinadores MJ', filter: u => ['coord_maestria', 'coordinador_mj'].includes(normalizeRole(u.role)) },
  { id: 'qt', label: 'Quantum Team', filter: u => normalizeRole(u.role) === 'qt' },
  { 
    id: 'finanzas', 
    label: 'Finanzas / Contabilidad', 
    filter: u => {
      const r = normalizeRole(u.role);
      const email = (u.email || '').toLowerCase();
      const name = (u.name || '').toLowerCase();
      return ['cfo', 'finanzas', 'asistente_impuestos_quito'].includes(r) ||
        email.includes('contab') ||
        email.includes('factura') ||
        name.includes('karol') ||
        name.includes('gabriela') ||
        name.includes('hector');
    }
  },
  { id: 'th', label: 'Talento Humano', filter: u => ['talento_humano', 'director_th'].includes(normalizeRole(u.role)) || (u.email || '').toLowerCase().includes('talento') }
];

export const getSedeFlag = (sede) => {
  if (!sede) return 'ðŸŒ';
  const s = sede.toLowerCase();
  if (s.includes('quito') || s.includes('cuenca') || s.includes('guayaquil') || s.includes('uio') || s.includes('cue') || s.includes('gye')) return 'ðŸ‡ªðŸ‡¨';
  if (s.includes('lima') || s.includes('lim')) return 'ðŸ‡µðŸ‡ª';
  if (s.includes('medell') || s.includes('med')) return 'ðŸ‡¨ðŸ‡´';
  if (s.includes('mex') || s.includes('cdmx')) return 'ðŸ‡²ðŸ‡½';
  return 'ðŸŒ';
};

export default function TaskAssignmentModal({ isOpen, onClose, prefilledUser = null, taskToEdit = null }) {
  const { currentUser } = useAuth();
  const { addCustomTask, editCustomTask } = useChecklist();

  // Soporte de modos: 'lite' | 'compact' | 'pro'
  let globalUI = null;
  try {
    globalUI = useUI();
  } catch(e) {}
  const globalViewMode = globalUI?.viewMode || 'compact';

  const [modalViewMode, setModalViewMode] = useState(() => {
    return localStorage.getItem('soar_task_modal_view_mode') || globalViewMode || 'compact';
  });

  const handleSetModalViewMode = (mode) => {
    setModalViewMode(mode);
    try {
      localStorage.setItem('soar_task_modal_view_mode', mode);
    } catch(e) {}
  };

  // Estado adicional para Modo Lite
  const [liteSearch, setLiteSearch] = useState('');
  const [isLiteDropdownOpen, setIsLiteDropdownOpen] = useState(false);
  const [showAdvancedLite, setShowAdvancedLite] = useState(false);
  const liteDropdownRef = useRef(null);

  const [activeUsersList, setActiveUsersList] = useState(usersData);

  useEffect(() => {
    let isMounted = true;
    getAllCompanyUsers().then(users => {
      if (isMounted && Array.isArray(users) && users.length > 0) {
        setActiveUsersList(users);
      }
    }).catch(err => {
      console.warn("Error cargando usuarios en TaskAssignmentModal:", err);
    });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (liteDropdownRef.current && !liteDropdownRef.current.contains(e.target)) {
        setIsLiteDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };
  const getInDaysStr = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const [isRecurring, setIsRecurring] = useState(false);
  const [isOptional, setIsOptional] = useState(false);
  const [periodicity, setPeriodicity] = useState('UNICA'); // UNICA, DIARIA, SEMANAL, POR_CICLO
  const [recurrence, setRecurrence] = useState({
    cycle: 'TODOS',
    phase: 'PRE',
    daysBefore: 3
  });

  const [newTask, setNewTask] = useState({
    title: '',
    notes: '',
    role: currentUser?.appRole || 'gerente',
    deadlineDate: getTodayStr(),
    deadlineTime: '18:00',
    assignedToEmails: [],
    assignedRoles: [],
    assignedSede: currentUser?.sede || '',
    priority: 'ðŸŸ¡ AMARILLO'
  });

  const [selectedAreaId, setSelectedAreaId] = useState('todas');
  const [selectedSedeFilter, setSelectedSedeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setIsOptional(taskToEdit.isOptional || false);
        setPeriodicity(taskToEdit.periodicity || 'UNICA');
        setIsRecurring(taskToEdit.isRecurringTemplate || false);
        if (taskToEdit.recurrence) setRecurrence(taskToEdit.recurrence);
        
        let dDate = getTodayStr();
        let dTime = '18:00';
        if (taskToEdit.deadline) {
          try {
            const dt = new Date(taskToEdit.deadline);
            if (!isNaN(dt.getTime())) {
              dDate = dt.toISOString().split('T')[0];
              dTime = dt.toTimeString().substring(0, 5);
            }
          } catch(e){}
        }
        setNewTask({
          title: taskToEdit.task || taskToEdit.title || '',
          notes: taskToEdit.notes || taskToEdit.description || taskToEdit.comments || (Array.isArray(taskToEdit.progressNotes) && taskToEdit.progressNotes[0]?.text) || '',
          role: normalizeRole(taskToEdit.role) || taskToEdit.role || currentUser?.appRole || 'gerente',
          deadlineDate: dDate,
          deadlineTime: dTime,
          assignedToEmails: taskToEdit.assignedToEmails || (taskToEdit.assignedToEmail ? [taskToEdit.assignedToEmail] : []),
          assignedSede: taskToEdit.assignedSede || taskToEdit.sede || '',
          priority: taskToEdit.priority || 'ðŸŸ¡ AMARILLO'
        });
      } else if (prefilledUser) {
        setNewTask({
          title: '',
          notes: '',
          role: normalizeRole(prefilledUser.role) || prefilledUser.role || currentUser?.appRole || 'gerente',
          deadlineDate: getTodayStr(),
          deadlineTime: '18:00',
          assignedToEmails: prefilledUser.email ? [prefilledUser.email] : [],
          assignedSede: prefilledUser.sede || currentUser?.sede || '',
          priority: 'ðŸŸ¡ AMARILLO'
        });
      } else {
        setNewTask(prev => ({
          ...prev,
          role: currentUser?.appRole || prev.role || 'gerente',
          deadlineDate: prev.deadlineDate || getTodayStr(),
          assignedSede: currentUser?.sede || prev.assignedSede || '',
        }));
      }
    }
  }, [isOpen, prefilledUser, taskToEdit, currentUser]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const assignableRoles = getAssignableRoles(currentUser);
  const canAssignSpecific = true; // Habilitado para todos por solicitud institucional

  const stripAccents = (str) => {
    return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  };

  const isSearching = searchQuery.trim().length > 0;

  // Filtrado de usuarios segÃºn Ã¡rea, sede y buscador de texto
  const activeArea = OPERATIONAL_AREAS.find(a => a.id === selectedAreaId) || OPERATIONAL_AREAS[0];

  const visibleUsers = activeUsersList.filter(u => {
    // Excluir colaboradores dados de baja / inactivos
    if (u.isActive === false || u.status === 'inactive' || u.active === false) return false;

    // 1. Si hay texto en el buscador: Búsqueda global en toda la organización
    if (isSearching) {
      const q = stripAccents(searchQuery);
      const name = stripAccents(u.name);
      const email = stripAccents(u.email);
      const roleName = stripAccents(getRoleDisplayName(u.role));
      const sede = stripAccents(normalizeSede(u.sede));
      const rawRole = stripAccents(u.role);

      const match = name.includes(q) || email.includes(q) || roleName.includes(q) || sede.includes(q) || rawRole.includes(q);
      if (!match) return false;

      if (selectedSedeFilter && normalizeSede(u.sede) !== selectedSedeFilter) {
        if (!name.includes(q) && !email.includes(q)) {
          return false;
        }
      }
      return true;
    }

    // 2. Si no hay texto en el buscador: aplicar pestañas de área y sede
    if (!activeArea.filter(u)) return false;
    
    if (selectedSedeFilter && normalizeSede(u.sede) !== selectedSedeFilter) {
      return false;
    }

    return true;
  });

  const filteredLiteUsers = activeUsersList.filter(u => {
    // Excluir colaboradores dados de baja / inactivos
    if (u.isActive === false || u.status === 'inactive' || u.active === false) return false;

    if (!liteSearch.trim()) return true;
    const q = stripAccents(liteSearch);
    const name = stripAccents(u.name);
    const role = stripAccents(getRoleDisplayName(u.role));
    const sede = stripAccents(normalizeSede(u.sede));
    const email = stripAccents(u.email);
    return name.includes(q) || role.includes(q) || sede.includes(q) || email.includes(q);
  });

  const toggleUserSelection = (email) => {
    if (!email) return;
    const cleanEmail = email.toLowerCase().trim();
    setNewTask(prev => {
      const currentList = prev.assignedToEmails || [];
      const exists = currentList.some(e => e.toLowerCase() === cleanEmail);
      if (exists) {
        return {
          ...prev,
          assignedToEmails: currentList.filter(e => e.toLowerCase() !== cleanEmail)
        };
      } else {
        return {
          ...prev,
          assignedToEmails: [...currentList, email]
        };
      }
    });
  };

  const removeAssignee = (emailToRemove) => {
    setNewTask(prev => ({
      ...prev,
      assignedToEmails: (prev.assignedToEmails || []).filter(e => e.toLowerCase() !== emailToRemove.toLowerCase())
    }));
  };

  const clearAllAssignees = () => {
    setNewTask(prev => ({
      ...prev,
      assignedToEmails: []
    }));
  };

  const selectAllVisible = () => {
    const visibleEmails = visibleUsers.map(u => u.email).filter(Boolean);
    setNewTask(prev => ({
      ...prev,
      assignedToEmails: [...new Set([...(prev.assignedToEmails || []), ...visibleEmails])]
    }));
  };

  const deselectAllVisible = () => {
    const visibleEmails = visibleUsers.map(u => u.email?.toLowerCase()).filter(Boolean);
    setNewTask(prev => ({
      ...prev,
      assignedToEmails: (prev.assignedToEmails || []).filter(em => !visibleEmails.includes(em.toLowerCase()))
    }));
  };

  const assignToMe = () => {
    if (!currentUser?.email) return;
    setNewTask(prev => ({
      ...prev,
      assignedToEmails: [currentUser.email],
      assignedSede: currentUser.sede || prev.assignedSede || '',
      role: currentUser.appRole || prev.role || 'gerente'
    }));
  };

  const isAssignedOnlyToMe = Boolean(
    currentUser?.email && 
    newTask.assignedToEmails?.length === 1 && 
    newTask.assignedToEmails[0]?.toLowerCase() === currentUser.email?.toLowerCase()
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!newTask.title.trim()) return;
    setIsSubmitting(true);
    
    const finalRole = newTask.role || currentUser?.appRole || 'gerente';
    const finalDate = newTask.deadlineDate || getTodayStr();
    const finalTime = newTask.deadlineTime || '18:00';
    const deadlineISO = new Date(`${finalDate}T${finalTime}:00`).toISOString();
    
    const assignedEmails = canAssignSpecific ? (newTask.assignedToEmails?.length > 0 ? newTask.assignedToEmails : [currentUser?.email]) : (prefilledUser?.email ? [prefilledUser.email] : [currentUser?.email]);

    // Obtener sedes y roles automÃ¡ticos a partir de los colaboradores seleccionados:
    const assignedUsers = assignedEmails.map(email => usersData.find(usr => usr.email?.toLowerCase() === email.toLowerCase())).filter(Boolean);
    const assignedRolesList = [...new Set(assignedUsers.map(u => normalizeRole(u.role)).filter(Boolean))];
    const assignedSedesList = [...new Set(assignedUsers.map(u => normalizeSede(u.sede)).filter(Boolean))];

    const computedSede = assignedSedesList.length === 1 
      ? assignedSedesList[0] 
      : (assignedSedesList.length > 1 ? 'Multi-Sede' : (newTask.assignedSede || currentUser?.sede || 'Global'));
    
    const computedRole = assignedRolesList.length === 1 
      ? assignedRolesList[0] 
      : (assignedRolesList.length > 1 ? 'varios' : finalRole);

    // Inicializar mapa de seguimiento individual en una sola tarjeta:
    const assigneeProgress = {};
    assignedEmails.forEach(email => {
      const u = usersData.find(usr => usr.email?.toLowerCase() === email.toLowerCase());
      assigneeProgress[email] = {
        name: u?.name || email,
        role: u?.role || finalRole || 'colaborador',
        sede: u?.sede || computedSede || 'Global',
        completed: false,
        completedAt: null,
        progress: 0
      };
    });

    const trimmedNotes = (newTask.notes || '').trim();

    const taskData = {
      task: newTask.title.trim(),
      notes: trimmedNotes,
      description: trimmedNotes,
      comments: trimmedNotes,
      role: computedRole,
      deadline: deadlineISO,
      priority: newTask.priority,
      isCritical: newTask.priority === 'ðŸ”´ ROJO',
      isOptional: isOptional,
      periodicity: periodicity,
      createdBy: currentUser.email,
      assignedByName: currentUser?.name || currentUser?.displayName || currentUser?.email || 'Dirección',
      assignedByEmail: currentUser?.email || '',
      assignedToEmails: assignedEmails,
      assignedRoles: assignedRolesList.length > 0 ? assignedRolesList : (newTask.assignedRoles || []),
      assignedSede: computedSede,
      assigneeProgress: assigneeProgress
    };

    if (trimmedNotes) {
      if (taskToEdit && Array.isArray(taskToEdit.progressNotes) && taskToEdit.progressNotes.length > 0) {
        const existingNotes = [...taskToEdit.progressNotes];
        const initialNoteIndex = existingNotes.findIndex(n => n.isInitialNote || n.id === 'note_initial');
        if (initialNoteIndex >= 0) {
          existingNotes[initialNoteIndex] = {
            ...existingNotes[initialNoteIndex],
            text: trimmedNotes,
            updatedAt: new Date().toISOString()
          };
          taskData.progressNotes = existingNotes;
        } else {
          taskData.progressNotes = [{
            id: `note_${Date.now()}`,
            text: trimmedNotes,
            createdAt: new Date().toISOString(),
            authorName: currentUser?.name || currentUser?.displayName || currentUser?.email || 'Asignador',
            authorEmail: currentUser?.email || '',
            isInitialNote: true
          }, ...existingNotes];
        }
      } else {
        taskData.progressNotes = [{
          id: `note_${Date.now()}`,
          text: trimmedNotes,
          createdAt: new Date().toISOString(),
          authorName: currentUser?.name || currentUser?.displayName || currentUser?.email || 'Asignador',
          authorEmail: currentUser?.email || '',
          isInitialNote: true
        }];
      }
    }

    if (isRecurring) {
      taskData.isRecurringTemplate = true;
      taskData.recurrence = recurrence;
    }

    let success = false;
    if (taskToEdit) {
      success = await editCustomTask(taskToEdit.id, taskData);
    } else {
      success = await addCustomTask(taskData);
    }
    
    if (success) {
      try {
        await recordAuditEvent({
          action: taskToEdit ? 'TAREA_EDITADA' : 'NUEVA_TAREA_CREADA',
          user: currentUser,
          details: {
            taskId: taskToEdit ? taskToEdit.id : null,
            taskTitle: newTask.title.trim(),
            hasNotes: !!trimmedNotes,
            notesSnippet: trimmedNotes ? trimmedNotes.substring(0, 100) : '',
            assignedRole: finalRole,
            assignedEmails: taskData.assignedToEmails,
            priority: newTask.priority,
            deadline: deadlineISO
          }
        });
      } catch (err) {
        console.warn("Audit log notice:", err);
      }

      onClose();
      setNewTask({
        title: '',
        notes: '',
        role: currentUser?.appRole || 'gerente',
        deadlineDate: getTodayStr(),
        deadlineTime: '18:00',
        assignedToEmails: [],
        assignedRoles: [],
        assignedSede: currentUser?.sede || '',
        priority: 'ðŸŸ¡ AMARILLO'
      });
    }
    setIsSubmitting(false);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 10050, // Siempre por encima del simulador (9999) y cualquier navbar
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'clamp(0.4rem, 2vw, 1.25rem)',
      overflowY: 'auto'
    }}>
      <div 
        className="glass-panel" 
        style={{ 
          width: '100%', 
          maxWidth: modalViewMode === 'lite' ? '640px' : (modalViewMode === 'compact' ? '760px' : '840px'), 
          maxHeight: 'min(92vh, calc(100dvh - 1.5rem))', 
          display: 'flex',
          flexDirection: 'column',
          position: 'relative', 
          border: '1px solid var(--crear-gold)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 25px rgba(255, 215, 0, 0.2)',
          background: 'rgba(12, 21, 39, 0.98)',
          overflow: 'hidden',
          padding: 0,
          transition: 'max-width 0.3s ease'
        }}
      >
        {/* =========================================================================
            CABECERA FIJA (PINNED HEADER) CON SELECTOR DE MODOS LITE / COMPACTO / PRO
            ========================================================================= */}
        <div style={{
          padding: '0.8rem 1.2rem',
          borderBottom: '1px solid rgba(255, 215, 0, 0.25)',
          background: 'rgba(10, 16, 29, 0.98)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          gap: '0.75rem',
          flexWrap: 'wrap',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              background: 'rgba(255, 215, 0, 0.12)',
              border: '1px solid var(--crear-gold)',
              borderRadius: '8px',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--crear-gold)'
            }}>
              <Target size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: 'var(--crear-gold)', lineHeight: 1.2 }}>
                  {taskToEdit ? 'Editar Tarea' : (prefilledUser ? `Asignar Tarea a ${prefilledUser.name}` : 'Crear / Asignar Tarea')}
                </h3>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: modalViewMode === 'lite' 
                    ? 'rgba(34, 197, 94, 0.2)' 
                    : modalViewMode === 'compact' 
                      ? 'rgba(41, 171, 226, 0.2)' 
                      : 'rgba(245, 158, 11, 0.2)',
                  color: modalViewMode === 'lite' 
                    ? '#22c55e' 
                    : modalViewMode === 'compact' 
                      ? '#38bdf8' 
                      : 'var(--crear-gold)',
                  border: `1px solid ${modalViewMode === 'lite' ? '#22c55e' : modalViewMode === 'compact' ? '#38bdf8' : 'var(--crear-gold)'}`
                }}>
                  {modalViewMode === 'lite' ? 'âš¡ Lite' : modalViewMode === 'compact' ? 'ðŸ”² Compacto' : 'ðŸŽ›ï¸ Pro'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {modalViewMode === 'lite' 
                  ? 'Vista ultra limpia y directa: solo lo esencial sin sobrecarga' 
                  : modalViewMode === 'compact'
                    ? 'Vista equilibrada con densidad optimizada'
                    : 'AsignaciÃ³n institucional avanzada con control multi-Ã¡rea'}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* SELECTOR INTERACTIVO DE MODOS */}
            <div 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '2px',
                gap: '2px'
              }}
            >
              <button
                type="button"
                onClick={() => handleSetModalViewMode('lite')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.74rem',
                  fontWeight: modalViewMode === 'lite' ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: modalViewMode === 'lite' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'transparent',
                  color: modalViewMode === 'lite' ? '#ffffff' : 'var(--text-muted)'
                }}
                title="Modo Lite: Vista ultra limpia, rÃ¡pida y sin saturaciÃ³n"
              >
                <Zap size={13} />
                <span>Lite</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetModalViewMode('compact')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.74rem',
                  fontWeight: modalViewMode === 'compact' ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: modalViewMode === 'compact' ? 'linear-gradient(135deg, #29abe2, #0284c7)' : 'transparent',
                  color: modalViewMode === 'compact' ? '#ffffff' : 'var(--text-muted)'
                }}
                title="Modo Compacto: Vista equilibrada con densidad optimizada"
              >
                <LayoutGrid size={13} />
                <span>Compacto</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetModalViewMode('pro')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.74rem',
                  fontWeight: modalViewMode === 'pro' ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: modalViewMode === 'pro' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
                  color: modalViewMode === 'pro' ? '#ffffff' : 'var(--text-muted)'
                }}
                title="Modo Pro: Todas las herramientas multi-Ã¡rea y opciones avanzadas"
              >
                <Sliders size={13} />
                <span>Pro</span>
              </button>
            </div>

            <button 
              type="button"
              onClick={onClose} 
              style={{ 
                background: 'rgba(255, 255, 255, 0.08)', 
                border: '1px solid rgba(255, 255, 255, 0.15)', 
                borderRadius: '8px', 
                color: '#ffffff', 
                cursor: 'pointer',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
                flexShrink: 0
              }}
              title="Cerrar modal (Esc)"
              aria-label="Cerrar modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* =========================================================================
            CUERPO SCROLLEABLE Y PIE FIJO (FORMULARIO PRINCIPAL)
            ========================================================================= */}
        <form 
          onSubmit={handleSubmit} 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            flex: 1, 
            minHeight: 0, 
            overflow: 'hidden' 
          }}
        >
          {/* CUERPO SCROLLEABLE SEGÃšN EL MODO ACTIVO */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: modalViewMode === 'lite' ? '1rem 1.2rem' : '1.15rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: modalViewMode === 'lite' ? '0.85rem' : '1rem',
            overscrollBehavior: 'contain',
            scrollbarWidth: 'thin'
          }}>

            {/* -------------------------------------------------------------
                CASO 1: MODO LITE (ULTRA-LIMPIO, RÃPIDO, SIN SATURACIÃ“N)
                ------------------------------------------------------------- */}
            {modalViewMode === 'lite' && (
              <>
                {/* 1. TÃTULO DE LA TAREA */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--crear-gold)', marginBottom: '0.35rem', fontWeight: 700 }}>
                    ðŸ“Œ TÃ­tulo de la Tarea:
                  </label>
                  <input 
                    type="text" 
                    placeholder="TÃ­tulo de la tarea (Ej. Revisar mÃ©tricas, Auditar sala...)" 
                    value={newTask.title} 
                    onChange={e => setNewTask({...newTask, title: e.target.value})} 
                    className="input-field" 
                    style={{ width: '100%', marginBottom: '0.4rem', fontSize: '0.9rem', padding: '0.55rem 0.75rem' }}
                    required 
                    disabled={isSubmitting}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>âš¡ RÃ¡pidas:</span>
                    {['Llamar a seguimiento', 'Revisar mÃ©tricas', 'Auditar salÃ³n', 'Feedback de Staff', 'Verificar asistencia'].map(qt => (
                      <button
                        key={qt}
                        type="button"
                        onClick={() => setNewTask(prev => ({ ...prev, title: qt }))}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '4px',
                          padding: '2px 7px',
                          fontSize: '0.7rem',
                          color: 'var(--crear-cyan)',
                          cursor: 'pointer'
                        }}
                      >
                        {qt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. RESPONSABLE / ASIGNACIÃ“N SIMPLE */}
                <div style={{
                  background: 'rgba(255, 215, 0, 0.03)',
                  border: '1px solid rgba(255, 215, 0, 0.22)',
                  borderRadius: '10px',
                  padding: '0.75rem 0.9rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--crear-gold)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <UserCheck size={16} />
                      <span>ðŸ‘¤ Responsable de la Tarea:</span>
                    </label>
                    <button
                      type="button"
                      onClick={assignToMe}
                      style={{
                        background: isAssignedOnlyToMe ? 'rgba(34, 197, 94, 0.18)' : 'rgba(56, 189, 248, 0.12)',
                        border: isAssignedOnlyToMe ? '1px solid #22c55e' : '1px solid var(--crear-cyan)',
                        color: isAssignedOnlyToMe ? '#4ade80' : 'var(--crear-cyan)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      {isAssignedOnlyToMe ? 'âœ“ Asignado a mÃ­' : 'ðŸ™‹â€â™‚ï¸ Asignarme a mÃ­'}
                    </button>
                  </div>

                  {/* Combobox flotante de bÃºsqueda */}
                  <div ref={liteDropdownRef} style={{ position: 'relative', marginBottom: '0.45rem' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Buscar colaborador para asignar (nombre, cargo, sede)..."
                        value={liteSearch}
                        onChange={e => {
                          setLiteSearch(e.target.value);
                          setIsLiteDropdownOpen(true);
                        }}
                        onFocus={() => setIsLiteDropdownOpen(true)}
                        className="input-field"
                        style={{
                          width: '100%',
                          paddingLeft: '32px',
                          paddingRight: liteSearch ? '28px' : '10px',
                          paddingTop: '0.45rem',
                          paddingBottom: '0.45rem',
                          fontSize: '0.78rem',
                          borderRadius: '8px'
                        }}
                      />
                      {liteSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setLiteSearch('');
                            setIsLiteDropdownOpen(false);
                          }}
                          style={{
                            position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(255,255,255,0.15)', border: 'none', color: '#ffffff', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                          title="Limpiar"
                        >
                          âœ•
                        </button>
                      )}
                    </div>

                    {/* MenÃº de resultados */}
                    {isLiteDropdownOpen && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        background: 'rgba(15, 23, 42, 0.98)',
                        border: '1px solid var(--crear-gold)',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
                        zIndex: 100,
                        padding: '4px'
                      }}>
                        {filteredLiteUsers.slice(0, 15).map(u => {
                          const isSelected = newTask.assignedToEmails?.some(em => em.toLowerCase() === u.email?.toLowerCase());
                          const roleDisplay = getRoleDisplayName(u.role);
                          const sedeDisplay = normalizeSede(u.sede);
                          const flag = getSedeFlag(sedeDisplay);
                          return (
                            <div
                              key={u.email}
                              onClick={() => {
                                toggleUserSelection(u.email);
                                setLiteSearch('');
                                setIsLiteDropdownOpen(false);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.35rem 0.6rem',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                background: isSelected ? 'rgba(255, 215, 0, 0.12)' : 'transparent',
                                color: isSelected ? 'var(--crear-gold)' : '#ffffff',
                                fontSize: '0.75rem',
                                transition: 'background 0.15s'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                                <span style={{ fontWeight: isSelected ? 700 : 500 }}>{u.name}</span>
                                <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>â€¢ {roleDisplay}</span>
                                <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>({flag} {sedeDisplay})</span>
                              </div>
                              <span style={{ fontSize: '0.7rem', color: isSelected ? 'var(--crear-gold)' : 'var(--crear-cyan)', fontWeight: 700, flexShrink: 0 }}>
                                {isSelected ? 'âœ“ Asignado' : '+ Asignar'}
                              </span>
                            </div>
                          );
                        })}
                        {filteredLiteUsers.length === 0 && (
                          <div style={{ padding: '0.6rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                            No se encontraron colaboradores.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Chips de Asignados */}
                  {(!newTask.assignedToEmails || newTask.assignedToEmails.length === 0) ? (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.1rem 0' }}>
                      ðŸ’¡ Sin colaboradores especÃ­ficos: la tarea se asignarÃ¡ a tu usuario automÃ¡ticamente.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', paddingTop: '2px' }}>
                      {newTask.assignedToEmails.map(email => {
                        const u = usersData.find(usr => usr.email?.toLowerCase() === email.toLowerCase());
                        const roleLabel = u ? getRoleDisplayName(u.role) : '';
                        const sedeLabel = u ? normalizeSede(u.sede) : '';
                        const flag = getSedeFlag(sedeLabel);
                        return (
                          <span
                            key={email}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: 'rgba(0, 0, 0, 0.65)',
                              border: '1px solid var(--crear-gold)',
                              borderRadius: '14px',
                              padding: '2px 8px',
                              fontSize: '0.72rem',
                              color: '#ffffff'
                            }}
                          >
                            <span style={{ color: 'var(--crear-gold)', fontWeight: 700 }}>ðŸ‘¤ {u?.name || email}</span>
                            {roleLabel && <span style={{ color: 'var(--crear-cyan)', fontSize: '0.66rem' }}>â€¢ {roleLabel}</span>}
                            {sedeLabel && <span style={{ color: 'var(--text-muted)', fontSize: '0.66rem' }}>({flag} {sedeLabel})</span>}
                            <button
                              type="button"
                              onClick={() => removeAssignee(email)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '0 2px',
                                fontWeight: 'bold',
                                fontSize: '0.82rem',
                                lineHeight: 1
                              }}
                              title="Quitar"
                            >
                              âœ•
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. FECHA LÃMITE Y PRIORIDAD EN 1 FILA */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--crear-gold)', marginBottom: '0.35rem', fontWeight: 700 }}>
                      ðŸ“… Plazo / Fecha LÃ­mite:
                    </label>
                    <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => setNewTask(prev => ({ ...prev, deadlineDate: getTodayStr(), deadlineTime: '18:00' }))}
                        style={{
                          flex: 1,
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          border: '1px solid var(--crear-gold)',
                          background: newTask.deadlineDate === getTodayStr() ? 'var(--crear-gold)' : 'rgba(255,183,3,0.1)',
                          color: newTask.deadlineDate === getTodayStr() ? '#000000' : 'var(--text-heading)',
                          cursor: 'pointer'
                        }}
                      >
                        âš¡ Hoy 18:00
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewTask(prev => ({ ...prev, deadlineDate: getTomorrowStr(), deadlineTime: '12:00' }))}
                        style={{
                          flex: 1,
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          border: '1px solid var(--crear-cyan)',
                          background: newTask.deadlineDate === getTomorrowStr() ? 'var(--crear-cyan)' : 'rgba(0,212,255,0.1)',
                          color: newTask.deadlineDate === getTomorrowStr() ? '#000000' : 'var(--text-heading)',
                          cursor: 'pointer'
                        }}
                      >
                        ðŸŒ… MaÃ±ana 12:00
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input type="date" value={newTask.deadlineDate} onChange={e => setNewTask({...newTask, deadlineDate: e.target.value})} className="input-field" style={{ flex: 1, fontSize: '0.78rem', padding: '0.35rem 0.5rem' }} required disabled={isSubmitting} />
                      <input type="time" value={newTask.deadlineTime} onChange={e => setNewTask({...newTask, deadlineTime: e.target.value})} className="input-field" style={{ width: '90px', fontSize: '0.78rem', padding: '0.35rem 0.5rem' }} required disabled={isSubmitting} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Prioridad:
                    </label>
                    <select 
                      value={newTask.priority} 
                      onChange={e => setNewTask({...newTask, priority: e.target.value})} 
                      className="input-field" 
                      style={{ width: '100%', fontSize: '0.8rem', padding: '0.42rem 0.6rem' }}
                      disabled={isSubmitting}
                    >
                      <option value="ðŸŸ¡ AMARILLO">Normal (Amarillo)</option>
                      <option value="ðŸ”´ ROJO">Urgente/CrÃ­tica (Rojo)</option>
                    </select>
                  </div>
                </div>

                {/* 4. NOTAS */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--crear-gold)', fontWeight: 700, marginBottom: '0.25rem' }}>
                    ðŸ“ Instrucciones o Notas (Opcional):
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Instrucciones especÃ­ficas para quien realice la tarea..."
                    value={newTask.notes}
                    onChange={e => setNewTask({ ...newTask, notes: e.target.value })}
                    className="input-field"
                    style={{
                      width: '100%',
                      minHeight: '50px',
                      resize: 'vertical',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      lineHeight: '1.4',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 215, 0, 0.35)',
                      color: '#ffffff'
                    }}
                    disabled={isSubmitting}
                  />
                </div>

                {/* 5. ACORDEÃ“N DESPLEGABLE DE MÃS OPCIONES */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedLite(!showAdvancedLite)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--crear-cyan)',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.15rem 0'
                    }}
                  >
                    <span>{showAdvancedLite ? 'â–²' : 'â–¼'}</span>
                    <span>{showAdvancedLite ? 'Ocultar opciones avanzadas' : 'MÃ¡s opciones avanzadas (Sede, periodicidad)...'}</span>
                  </button>

                  {showAdvancedLite && (
                    <div style={{ marginTop: '0.45rem', display: 'flex', flexDirection: 'column', gap: '0.55rem', padding: '0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.6rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Sede EspecÃ­fica:</label>
                          <select
                            value={newTask.assignedSede || ''}
                            onChange={e => setNewTask({...newTask, assignedSede: e.target.value})}
                            className="input-field"
                            style={{ width: '100%', fontSize: '0.76rem' }}
                          >
                            <option value="">-- AutomÃ¡tica / Global --</option>
                            {OPERATIONAL_SEDES.map(s => (
                              <option key={s} value={s}>{getSedeFlag(s)} {s}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Rol General:</label>
                          <select 
                            value={newTask.role} 
                            onChange={e => setNewTask({...newTask, role: e.target.value})} 
                            className="input-field" 
                            style={{ width: '100%', fontSize: '0.76rem' }}
                          >
                            {assignableRoles.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-heading)', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={isOptional} 
                            onChange={e => setIsOptional(e.target.checked)} 
                            style={{ accentColor: 'var(--crear-gold)' }}
                          />
                          <span>Tarea Opcional (No bloqueante)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-heading)', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={periodicity !== 'UNICA'} 
                            onChange={e => setPeriodicity(e.target.checked ? 'DIARIA' : 'UNICA')} 
                            style={{ accentColor: 'var(--crear-cyan)' }}
                          />
                          <span>Tarea PeriÃ³dica / Recurrente</span>
                        </label>
                        {periodicity !== 'UNICA' && (
                          <select
                            value={periodicity}
                            onChange={e => setPeriodicity(e.target.value)}
                            className="input-field"
                            style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem' }}
                          >
                            <option value="DIARIA">Diaria</option>
                            <option value="SEMANAL">Semanal</option>
                            <option value="POR_CICLO">Por Ciclo</option>
                          </select>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* -------------------------------------------------------------
                CASO 2 Y 3: MODOS COMPACTO Y PRO
                ------------------------------------------------------------- */}
            {modalViewMode !== 'lite' && (
              <>
                {/* 1. TÃTULO DE LA TAREA */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--crear-gold)', marginBottom: '0.35rem', fontWeight: 700 }}>
                    ðŸ“Œ TÃ­tulo de la Tarea:
                  </label>
                  <input 
                    type="text" 
                    placeholder="TÃ­tulo de la tarea (Ej. Revisar mÃ©tricas, Auditar sala...)" 
                    value={newTask.title} 
                    onChange={e => setNewTask({...newTask, title: e.target.value})} 
                    className="input-field" 
                    style={{ width: '100%', marginBottom: '0.45rem', fontSize: '0.9rem' }}
                    required 
                    disabled={isSubmitting}
                  />
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>âš¡ RÃ¡pidas:</span>
                    {['Llamar a seguimiento', 'Revisar mÃ©tricas', 'Auditar salÃ³n', 'Feedback de Staff', 'Verificar asistencia'].map(qt => (
                      <button
                        key={qt}
                        type="button"
                        onClick={() => setNewTask(prev => ({ ...prev, title: qt }))}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontSize: '0.72rem',
                          color: 'var(--crear-cyan)',
                          cursor: 'pointer'
                        }}
                      >
                        {qt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. ASIGNACIÃ“N RÃPIDA A VARIAS ÃREAS DE UNA SOLA VEZ */}
                <div style={{
                  background: 'rgba(255, 215, 0, 0.03)',
                  border: '1px solid rgba(255, 215, 0, 0.22)',
                  borderRadius: '10px',
                  padding: modalViewMode === 'compact' ? '0.55rem 0.8rem' : '0.75rem 0.9rem'
                }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--crear-gold)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    âš¡ Asignar a Varias Ãreas de una sola vez:
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {QUICK_ASSIGN_AREAS.map(area => {
                      const matchingEmails = usersData.filter(area.filter).map(u => u.email).filter(Boolean);
                      const isAllSelected = matchingEmails.length > 0 && matchingEmails.every(em => newTask.assignedToEmails?.some(e => e.toLowerCase() === em.toLowerCase()));
                      return (
                        <button
                          key={area.id}
                          type="button"
                          onClick={() => {
                            if (isAllSelected) {
                              setNewTask(prev => ({
                                ...prev,
                                assignedToEmails: (prev.assignedToEmails || []).filter(em => !matchingEmails.some(m => m.toLowerCase() === em.toLowerCase()))
                              }));
                            } else {
                              setNewTask(prev => ({
                                ...prev,
                                assignedToEmails: [...new Set([...(prev.assignedToEmails || []), ...matchingEmails])]
                              }));
                            }
                          }}
                          style={{
                            padding: modalViewMode === 'compact' ? '0.25rem 0.55rem' : '0.35rem 0.65rem',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            background: isAllSelected ? 'var(--crear-gold)' : 'rgba(255,255,255,0.06)',
                            color: isAllSelected ? '#000000' : 'var(--text-heading)',
                            border: `1px solid ${isAllSelected ? 'var(--crear-gold)' : 'rgba(255,255,255,0.15)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span>{isAllSelected ? 'âœ“' : '+'}</span>
                          <span>{area.label}</span>
                          <span style={{
                            background: isAllSelected ? '#000000' : 'rgba(255,255,255,0.12)',
                            color: isAllSelected ? 'var(--crear-gold)' : 'var(--text-muted)',
                            padding: '1px 5px',
                            borderRadius: '8px',
                            fontSize: '0.64rem'
                          }}>
                            {matchingEmails.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. BANDEJA DE COLABORADORES ASIGNADOS */}
                <div style={{
                  background: 'rgba(255, 215, 0, 0.04)',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  borderRadius: '10px',
                  padding: modalViewMode === 'compact' ? '0.6rem 0.8rem' : '0.75rem 0.9rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: (newTask.assignedToEmails?.length > 0 ? '0.45rem' : 0), flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--crear-gold)' }}>
                      <UserCheck size={16} />
                      <span>ðŸŽ¯ Colaboradores Asignados ({newTask.assignedToEmails?.length || 0}):</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={assignToMe}
                        style={{
                          background: isAssignedOnlyToMe ? 'rgba(34, 197, 94, 0.18)' : 'rgba(56, 189, 248, 0.12)',
                          border: isAssignedOnlyToMe ? '1px solid #22c55e' : '1px solid var(--crear-cyan)',
                          color: isAssignedOnlyToMe ? '#4ade80' : 'var(--crear-cyan)',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        {isAssignedOnlyToMe ? 'âœ“ Asignado a mÃ­' : 'ðŸ™‹â€â™‚ï¸ Asignarme a mÃ­'}
                      </button>
                      {newTask.assignedToEmails?.length > 0 && (
                        <button
                          type="button"
                          onClick={clearAllAssignees}
                          style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#f87171',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          âœ• Limpiar selecciÃ³n
                        </button>
                      )}
                    </div>
                  </div>

                  {(!newTask.assignedToEmails || newTask.assignedToEmails.length === 0) ? (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.2rem 0' }}>
                      âš ï¸ No has seleccionado colaboradores especÃ­ficos. Si lo dejas vacÃ­o, la tarea se asignarÃ¡ a tu usuario.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxHeight: modalViewMode === 'compact' ? '85px' : '110px', overflowY: 'auto', paddingTop: '2px' }}>
                      {newTask.assignedToEmails.map(email => {
                        const u = usersData.find(usr => usr.email?.toLowerCase() === email.toLowerCase());
                        const roleLabel = u ? getRoleDisplayName(u.role) : '';
                        const sedeLabel = u ? normalizeSede(u.sede) : '';
                        const flag = getSedeFlag(sedeLabel);
                        return (
                          <span
                            key={email}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: 'rgba(0, 0, 0, 0.65)',
                              border: '1px solid var(--crear-gold)',
                              borderRadius: '14px',
                              padding: '2px 8px',
                              fontSize: '0.72rem',
                              color: '#ffffff'
                            }}
                          >
                            <span style={{ color: 'var(--crear-gold)', fontWeight: 700 }}>ðŸ‘¤ {u?.name || email}</span>
                            {roleLabel && <span style={{ color: 'var(--crear-cyan)', fontSize: '0.66rem' }}>â€¢ {roleLabel}</span>}
                            {sedeLabel && <span style={{ color: 'var(--text-muted)', fontSize: '0.66rem' }}>({flag} {sedeLabel})</span>}
                            <button
                              type="button"
                              onClick={() => removeAssignee(email)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '0 2px',
                                fontWeight: 'bold',
                                fontSize: '0.82rem',
                                lineHeight: 1
                              }}
                              title="Quitar de la tarea"
                            >
                              âœ•
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 4. SELECTOR INTERACTIVO POR ÃREAS, SEDES Y COLABORADORES */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: modalViewMode === 'compact' ? '0.7rem' : '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.55rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--crear-gold)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Search size={15} />
                      <span>ðŸ” Buscador RÃ¡pido (escribe y haz clic para ir agregando):</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: isSearching ? 'var(--crear-cyan)' : 'var(--text-muted)' }}>
                      {isSearching 
                        ? `Encontrados: ${visibleUsers.length} en toda la organizaciÃ³n` 
                        : `Total disponibles: ${visibleUsers.length}`}
                    </div>
                  </div>

                  {/* BARRA DE BÃšSQUEDA */}
                  <div style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: isSearching ? 'var(--crear-gold)' : 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, cargo o sede (ej. Karol, Alex, Erika, Finanzas, Quito)..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="input-field"
                      style={{
                        width: '100%',
                        paddingLeft: '32px',
                        paddingRight: '28px',
                        paddingTop: '0.45rem',
                        paddingBottom: '0.45rem',
                        fontSize: '0.8rem',
                        borderRadius: '8px',
                        border: isSearching ? '1.5px solid var(--crear-gold)' : '1px solid rgba(255, 255, 255, 0.15)',
                        background: isSearching ? 'rgba(255, 215, 0, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                        color: '#ffffff'
                      }}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        style={{
                          position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                          background: 'rgba(255,255,255,0.15)', border: 'none', color: '#ffffff', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        title="Limpiar bÃºsqueda"
                      >
                        âœ•
                      </button>
                    )}
                  </div>

                  {/* FILTROS POR ÃREAS Y SEDE */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '0.3rem', overflowX: 'auto', flex: 1, minWidth: '240px', paddingBottom: '2px' }}>
                      {OPERATIONAL_AREAS.map(area => {
                        const isAreaActive = !isSearching && selectedAreaId === area.id;
                        const areaUsers = usersData.filter(area.filter);
                        const selectedCountInArea = areaUsers.filter(u => newTask.assignedToEmails?.some(em => em.toLowerCase() === u.email?.toLowerCase())).length;

                        return (
                          <button
                            key={area.id}
                            type="button"
                            onClick={() => {
                              setSelectedAreaId(area.id);
                              if (searchQuery) setSearchQuery('');
                            }}
                            style={{
                              flexShrink: 0,
                              padding: '0.22rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.68rem',
                              fontWeight: isAreaActive ? 700 : 500,
                              cursor: 'pointer',
                              background: isAreaActive ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.25) 0%, rgba(255, 215, 0, 0.08) 100%)' : 'rgba(255, 255, 255, 0.04)',
                              border: `1px solid ${isAreaActive ? 'var(--crear-gold)' : 'rgba(255, 255, 255, 0.1)'}`,
                              color: isAreaActive ? 'var(--crear-gold)' : 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <span>{area.icon}</span>
                            <span>{area.shortLabel || area.label}</span>
                            {selectedCountInArea > 0 && (
                              <span style={{
                                background: 'var(--crear-gold)',
                                color: '#000000',
                                borderRadius: '10px',
                                padding: '0 4px',
                                fontSize: '0.58rem',
                                fontWeight: 900
                              }}>
                                {selectedCountInArea}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>ðŸ“ Sede:</span>
                      <select
                        value={selectedSedeFilter}
                        onChange={e => setSelectedSedeFilter(e.target.value)}
                        className="input-field"
                        style={{ padding: '0.22rem 0.4rem', fontSize: '0.7rem', minWidth: '115px' }}
                      >
                        <option value="">Todas las Sedes</option>
                        {OPERATIONAL_SEDES.map(s => (
                          <option key={s} value={s}>{getSedeFlag(s)} {s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* ACCIONES DE SELECCIÃ“N VISIBLE */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {isSearching ? `ðŸ” BÃºsqueda: "${searchQuery}"` : activeArea.label} {selectedSedeFilter ? `â€¢ Sede ${selectedSedeFilter}` : ''}
                    </span>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={selectAllVisible}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--crear-cyan)',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          textDecoration: 'underline'
                        }}
                      >
                        + Marcar visibles ({visibleUsers.length})
                      </button>
                      <span style={{ color: 'var(--border-subtle)' }}>|</span>
                      <button
                        type="button"
                        onClick={deselectAllVisible}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          textDecoration: 'underline'
                        }}
                      >
                        Desmarcar visibles
                      </button>
                    </div>
                  </div>

                  {/* GRILLA DE COLABORADORES: COMPACTA EN 'COMPACT', EXPANDIDA EN 'PRO' */}
                  <div style={{
                    maxHeight: modalViewMode === 'compact' ? '135px' : '175px',
                    overflowY: 'auto',
                    display: 'grid',
                    gridTemplateColumns: modalViewMode === 'compact' 
                      ? 'repeat(auto-fill, minmax(200px, 1fr))' 
                      : 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: modalViewMode === 'compact' ? '0.3rem' : '0.4rem',
                    paddingRight: '4px'
                  }}>
                    {visibleUsers.length === 0 ? (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '0.8rem', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                        No se encontraron colaboradores con los filtros seleccionados.
                      </div>
                    ) : (
                      visibleUsers.map(u => {
                        const isSelected = newTask.assignedToEmails?.some(em => em.toLowerCase() === u.email?.toLowerCase());
                        const roleDisplay = getRoleDisplayName(u.role);
                        const sedeDisplay = normalizeSede(u.sede);
                        const flag = getSedeFlag(sedeDisplay);

                        // Formato de fila densa para Modo Compacto
                        if (modalViewMode === 'compact') {
                          return (
                            <div
                              key={u.email}
                              onClick={() => toggleUserSelection(u.email)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.28rem 0.5rem',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                background: isSelected
                                  ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.18) 0%, rgba(0, 0, 0, 0.5) 100%)'
                                  : 'rgba(255, 255, 255, 0.03)',
                                border: isSelected ? '1px solid var(--crear-gold)' : '1px solid rgba(255, 255, 255, 0.06)',
                                transition: 'all 0.15s ease',
                                userSelect: 'none'
                              }}
                            >
                              <div style={{ color: isSelected ? 'var(--crear-gold)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                                {isSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                              </div>
                              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: isSelected ? 700 : 500,
                                  color: isSelected ? '#ffffff' : 'var(--text-heading)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {u.name}
                                </span>
                                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                  ({flag})
                                </span>
                              </div>
                            </div>
                          );
                        }

                        // Formato tarjeta rica para Modo Pro
                        return (
                          <div
                            key={u.email}
                            onClick={() => toggleUserSelection(u.email)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              padding: '0.4rem 0.6rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              background: isSelected
                                ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.18) 0%, rgba(0, 0, 0, 0.5) 100%)'
                                : 'rgba(255, 255, 255, 0.03)',
                              border: isSelected ? '1px solid var(--crear-gold)' : '1px solid rgba(255, 255, 255, 0.06)',
                              boxShadow: isSelected ? '0 0 8px rgba(255, 215, 0, 0.2)' : 'none',
                              transition: 'all 0.15s ease',
                              userSelect: 'none'
                            }}
                          >
                            <div style={{ color: isSelected ? 'var(--crear-gold)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                              {isSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: '0.74rem',
                                fontWeight: isSelected ? 700 : 500,
                                color: isSelected ? '#ffffff' : 'var(--text-heading)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {u.name}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                                <span style={{ color: isSelected ? 'var(--crear-cyan)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {roleDisplay}
                                </span>
                                <span>â€¢</span>
                                <span style={{ whiteSpace: 'nowrap' }}>{flag} {sedeDisplay}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 5. PRIORIDAD, ROL Y SEDE ESPECÃFICA */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.7rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Prioridad:</label>
                    <select 
                      value={newTask.priority} 
                      onChange={e => setNewTask({...newTask, priority: e.target.value})} 
                      className="input-field" 
                      style={{ width: '100%', fontSize: '0.8rem' }}
                      disabled={isSubmitting}
                    >
                      <option value="ðŸŸ¡ AMARILLO">Normal (Amarillo)</option>
                      <option value="ðŸ”´ ROJO">Urgente/CrÃ­tica (Rojo)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Rol General (opcional):</label>
                    <select 
                      value={newTask.role} 
                      onChange={e => setNewTask({...newTask, role: e.target.value})} 
                      className="input-field" 
                      style={{ width: '100%', fontSize: '0.8rem' }}
                      disabled={isSubmitting}
                    >
                      {assignableRoles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Sede EspecÃ­fica:</label>
                    <select
                      value={newTask.assignedSede || ''}
                      onChange={e => setNewTask({...newTask, assignedSede: e.target.value})}
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.8rem' }}
                      disabled={isSubmitting}
                    >
                      <option value="">-- Detectar AutomÃ¡tica / Global --</option>
                      {OPERATIONAL_SEDES.map(s => (
                        <option key={s} value={s}>{getSedeFlag(s)} {s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 6. PLAZO / FECHA LÃMITE RÃPIDA */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--crear-gold)', marginBottom: '0.35rem', fontWeight: 700 }}>
                    ðŸ“… Plazo / Fecha LÃ­mite RÃ¡pida:
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.45rem' }}>
                    <button
                      type="button"
                      onClick={() => setNewTask(prev => ({ ...prev, deadlineDate: getTodayStr(), deadlineTime: '18:00' }))}
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '14px',
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        border: '1px solid var(--crear-gold)',
                        background: newTask.deadlineDate === getTodayStr() ? 'var(--crear-gold)' : 'rgba(255,183,3,0.1)',
                        color: newTask.deadlineDate === getTodayStr() ? '#000000' : 'var(--text-heading)',
                        cursor: 'pointer'
                      }}
                    >
                      âš¡ Hoy (18:00)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTask(prev => ({ ...prev, deadlineDate: getTomorrowStr(), deadlineTime: '12:00' }))}
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '14px',
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        border: '1px solid var(--crear-cyan)',
                        background: newTask.deadlineDate === getTomorrowStr() ? 'var(--crear-cyan)' : 'rgba(0,212,255,0.1)',
                        color: newTask.deadlineDate === getTomorrowStr() ? '#000000' : 'var(--text-heading)',
                        cursor: 'pointer'
                      }}
                    >
                      ðŸŒ… MaÃ±ana (12:00)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTask(prev => ({ ...prev, deadlineDate: getInDaysStr(3), deadlineTime: '18:00' }))}
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '14px',
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        border: '1px solid rgba(255,255,255,0.3)',
                        background: newTask.deadlineDate === getInDaysStr(3) ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.05)',
                        color: 'var(--text-heading)',
                        cursor: 'pointer'
                      }}
                    >
                      ðŸ—“ï¸ En 3 dÃ­as
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
                    <div>
                      <input type="date" value={newTask.deadlineDate} onChange={e => setNewTask({...newTask, deadlineDate: e.target.value})} className="input-field" style={{ width: '100%', fontSize: '0.8rem' }} required disabled={isSubmitting} />
                    </div>
                    <div>
                      <input type="time" value={newTask.deadlineTime} onChange={e => setNewTask({...newTask, deadlineTime: e.target.value})} className="input-field" style={{ width: '100%', fontSize: '0.8rem' }} required disabled={isSubmitting} />
                    </div>
                  </div>
                </div>

                {/* 7. NOTAS / INSTRUCCIONES DE LA TAREA */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.76rem', color: 'var(--crear-gold)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      ðŸ“ Notas / Instrucciones de la Tarea:
                    </label>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      Opcional â€¢ Se notificarÃ¡ al colaborador
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Escribe aquÃ­ las instrucciones especÃ­ficas, acuerdos, contexto o detalles..."
                    value={newTask.notes}
                    onChange={e => setNewTask({ ...newTask, notes: e.target.value })}
                    className="input-field"
                    style={{
                      width: '100%',
                      minHeight: modalViewMode === 'compact' ? '54px' : '64px',
                      resize: 'vertical',
                      padding: '0.5rem 0.7rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      lineHeight: '1.4',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 215, 0, 0.35)',
                      color: '#ffffff',
                      fontFamily: 'inherit'
                    }}
                    disabled={isSubmitting}
                  />
                  {/* Sugerencias RÃ¡pidas para Notas */}
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                    {[
                      'âš¡ Prioritario para este ciclo',
                      'ðŸ“ž Coordinar llamada con el equipo',
                      'ðŸ“Ž Adjuntar comprobante / link de Drive',
                      'âš ï¸ Validar antes de cierre operativo'
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          setNewTask(prev => {
                            const current = (prev.notes || '').trim();
                            const addition = chip.replace(/^[^\w\s]+/, '').trim();
                            const newText = current ? `${current}\nâ€¢ ${addition}` : `â€¢ ${addition}`;
                            return { ...prev, notes: newText };
                          });
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px dashed rgba(255, 215, 0, 0.35)',
                          color: 'var(--crear-gold)',
                          borderRadius: '10px',
                          padding: '0.15rem 0.5rem',
                          fontSize: '0.68rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title="Haz clic para agregar a las notas"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 8. OPCIONES ADICIONALES: OPCIONALES Y PERIÃ“DICAS */}
                <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.74rem', color: 'var(--text-heading)', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={isOptional} 
                      onChange={e => setIsOptional(e.target.checked)} 
                      style={{ accentColor: 'var(--crear-gold)' }}
                    />
                    <span>âœ¨ Tarea Opcional (No bloqueante)</span>
                  </label>
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.74rem', color: 'var(--text-heading)', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={periodicity !== 'UNICA'} 
                      onChange={e => setPeriodicity(e.target.checked ? 'DIARIA' : 'UNICA')} 
                      style={{ accentColor: 'var(--crear-cyan)' }}
                    />
                    <span>ðŸ”„ Tarea PeriÃ³dica / Recurrente</span>
                  </label>

                  {periodicity !== 'UNICA' && (
                    <select
                      value={periodicity}
                      onChange={e => setPeriodicity(e.target.value)}
                      className="input-field"
                      style={{ padding: '0.18rem 0.55rem', fontSize: '0.72rem', borderColor: 'var(--crear-cyan)' }}
                    >
                      <option value="DIARIA">Frecuencia: Diaria</option>
                      <option value="SEMANAL">Frecuencia: Semanal</option>
                      <option value="POR_CICLO">Frecuencia: Por Cada Ciclo Operativo</option>
                    </select>
                  )}
                </div>
              </>
            )}

          </div>

          {/* =========================================================================
              PIE FIJO (PINNED FOOTER)
              ========================================================================= */}
          <div style={{
            padding: '0.8rem 1.25rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(10, 16, 29, 0.98)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.65rem',
            flexShrink: 0,
            zIndex: 10
          }}>
            {/* RESUMEN DINÃMICO */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.76rem' }}>
              <span style={{ 
                color: 'var(--crear-gold)', 
                fontWeight: 700,
                background: 'rgba(255, 215, 0, 0.1)',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 215, 0, 0.25)'
              }}>
                ðŸŽ¯ {newTask.assignedToEmails?.length || 0} asignado(s)
              </span>
              <span style={{ 
                color: newTask.priority === 'ðŸ”´ ROJO' ? '#ef4444' : '#f59e0b', 
                fontWeight: 600,
                background: newTask.priority === 'ðŸ”´ ROJO' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                padding: '3px 8px',
                borderRadius: '6px'
              }}>
                {newTask.priority || 'ðŸŸ¡ AMARILLO'}
              </span>
            </div>

            {/* BOTONES DE ACCIÃ“N */}
            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={onClose} 
                disabled={isSubmitting}
                style={{ padding: '0.5rem 1rem', fontSize: '0.84rem' }}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={isSubmitting}
                style={{ 
                  padding: '0.5rem 1.3rem', 
                  fontSize: '0.84rem', 
                  fontWeight: 800,
                  boxShadow: '0 4px 14px rgba(255, 215, 0, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                {isSubmitting ? 'Guardando...' : (taskToEdit ? 'ðŸ’¾ Guardar Cambios' : 'âš¡ Guardar Tarea')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}