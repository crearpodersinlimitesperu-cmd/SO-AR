import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChecklist } from '../context/ChecklistContext';

import { useCycles } from '../context/CyclesContext';
import { useUI } from '../context/UIContext';

import { roles } from '../data/checklistData';
import { usersData, normalizeRole, normalizeSede, OPERATIONAL_SEDES, isForeignTask, ROLE_COLORS, ROLE_DISPLAY_NAMES, getRoleDisplayName } from '../data/usersData';
import { calculateAutomaticDeadline } from '../utils/soarDates';
import { ArrowLeft, Target, Link as LinkIcon, Edit3, Clock, ShieldAlert, Users, Sparkles, MapPin } from 'lucide-react';
import TaskAssignmentModal from '../components/TaskAssignmentModal';
import TaskCollaborationModal from '../components/TaskCollaborationModal';
import LearningReflectionModal from '../components/LearningReflectionModal';
import TaskCompletionChoiceModal from '../components/TaskCompletionChoiceModal';
import ForeignTaskWarningModal from '../components/ForeignTaskWarningModal';
import NewExcellenceModal from '../components/NewExcellenceModal';
import SyncHistoryModal from '../components/SyncHistoryModal';
import TaskDetailModal from '../components/TaskDetailModal';
import { celebrateVictory } from '../utils/neuroFeedback';

// Fases operativas requeridas para todos los usuarios de oficina:
// PRE-C1, C1, POST-C1, PRE-C2, C2, PRE-MJ, MJ, POST-MJ
const PHASE_ORDER = ['PRE-C1', 'C1', 'POST-C1', 'PRE-C2', 'C2', 'PRE-MJ', 'MJ', 'POST-MJ'];
const PHASE_META = {
  'GATE 1': { emoji: '🚪', label: 'GATE 1', color: '#3b82f6' },
  'PRE-C1': { emoji: '📦', label: 'PRE-C1', color: 'var(--crear-gold)' },
  'C1': { emoji: '🏢', label: 'C1', color: 'var(--color-success)' },
  'POST-C1': { emoji: '🚀', label: 'POST-C1', color: '#8b5cf6' },
  'PRE-C2': { emoji: '⚡', label: 'PRE-C2', color: '#a855f7' },
  'C2': { emoji: '🔥', label: 'C2', color: '#ec4899' },
  'PRE-MJ': { emoji: '🧭', label: 'PRE-MJ', color: '#0ea5e9' },
  'MJ': { emoji: '🏆', label: 'MJ', color: '#f59e0b' },
  'POST-MJ': { emoji: '🌅', label: 'POST-MJ', color: '#22c55e' },
};
// Todos los roles operativos y de oficina tienen habilitadas las pestañas de fase
const COORDINATOR_ROLES_WITH_PHASE_TABS = ['qt', 'coord_c1', 'coord_maestria', 'coordinador', 'gerente', 'capitan', 'cfo', 'finanzas', 'talento_humano', 'director_th', 'direccion'];

const getCountdownInfo = (deadlineIso, now = new Date()) => {
  if (!deadlineIso) return { label: 'Sin fecha límite', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: '#9ca3af', overdue: false };
  const deadline = new Date(deadlineIso).getTime();
  if (isNaN(deadline)) return { label: 'Fecha inválida', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: '#9ca3af', overdue: false };

  const diffMs = deadline - now.getTime();
  const absMs = Math.abs(diffMs);
  const totalHours = Math.floor(absMs / 3600000);
  const days = Math.floor(totalHours / 24);
  const mins = Math.floor((absMs % 3600000) / 60000);
  const timeStr = days > 0 ? `${days}d ${totalHours % 24}h` : (totalHours > 0 ? `${totalHours}h ${mins}m` : `${mins}m`);

  if (diffMs <= 0) return { label: `🚨 VENCIDA hace ${timeStr}`, color: '#ffffff', bg: '#dc2626', border: '#7f1d1d', overdue: true };
  if (diffMs < 3 * 3600000) return { label: `🔥 ${timeStr} restantes`, color: '#ffffff', bg: '#ef4444', border: '#b91c1c', overdue: false };
  if (diffMs < 24 * 3600000) return { label: `⏳ ${timeStr} restantes`, color: '#ffffff', bg: '#f97316', border: '#c2410c', overdue: false };
  if (diffMs < 72 * 3600000) return { label: `⏱️ ${timeStr} restantes`, color: '#1a1300', bg: '#facc15', border: '#a16207', overdue: false };
  return { label: `📅 ${timeStr} restantes`, color: '#047857', bg: '#d1fae5', border: '#059669', overdue: false };
};

export default function ChecklistBoard() {
  const { roleId: rawRoleId } = useParams();
  const roleId = normalizeRole(decodeURIComponent(rawRoleId));
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [processingTasks, setProcessingTasks] = useState(new Set());
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [showSyncHistoryModal, setShowSyncHistoryModal] = useState(false);
  const [selectedTaskForCollab, setSelectedTaskForCollab] = useState(null);
  const [taskForReflection, setTaskForReflection] = useState(null);
  const [taskForCompletionChoice, setTaskForCompletionChoice] = useState(null);
  const [taskForExcellence, setTaskForExcellence] = useState(null);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState(null);
  const [qtPhaseFilter, setQtPhaseFilter] = useState('active'); // 'active' (fase actual del ciclo) | 'all' | fase específica
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState(() => {
    return searchParams.get('filter') === 'completed' ? 'completed' : 'pending';
  });

  useEffect(() => {
    const f = searchParams.get('filter');
    if (f === 'completed') {
      setStatusFilter('completed');
    }
  }, [searchParams]);

  const { currentUser } = useAuth();
  const [foreignTaskForWarning, setForeignTaskForWarning] = useState(null);
  const userSedeNorm = currentUser?.sede ? normalizeSede(currentUser.sede) : null;
  const [selectedSedeFilter, setSelectedSedeFilter] = useState(() => {
    // Si el usuario tiene una sede operativa (ej. Lima), filtramos por su sede por defecto
    if (userSedeNorm && userSedeNorm !== 'Sede Global') {
      return userSedeNorm;
    }
    return 'all';
  });

  const { tasks, toggleTask, updateTaskDetails, inviteCollaborator, syncTasksToGoogle, updateIndividualProgress, acceptCollaboration, rejectCollaboration } = useChecklist();
  const { currentCycle, currentStage } = useCycles();
  const { showPrompt } = useUI();
  const role = roles.find(r => r.id === roleId) || {
    id: roleId,
    name: getRoleDisplayName(roleId)
  };

  // Verificación de Autorización por Rol (N7)
  const isAuthorized = currentUser?.canAccessRole ? currentUser.canAccessRole(roleId) : true;
  if (!isAuthorized) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', textAlign: 'center' }} className="glass-panel">
        <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
        <h2 style={{ color: '#fff', margin: '0 0 0.5rem' }}>Acceso Restringido</h2>
        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
          Tu rol asignado ({currentUser?.appRole}) no tiene autorización para acceder al checklist de <strong>{role?.name || roleId}</strong>.
        </p>
        <button className="btn-secondary" onClick={() => navigate('/home')}>Volver a Mi Inicio</button>
      </div>
    );
  }

  // Las tareas mías incluyen: rol directo, asignadas a mi correo O donde soy colaborador aceptado
  const myTasks = tasks.filter(t => {
    if (roleId === 'consolidado') return true;

    const userEmailCom = currentUser?.email?.replace('@crearpsl.net', '@crearpsl.com')?.toLowerCase();
    const userEmailNet = currentUser?.email?.replace('@crearpsl.com', '@crearpsl.net')?.toLowerCase();
    
    const isAssigned = (t.assignedToEmails && t.assignedToEmails.some(e => e.toLowerCase() === userEmailCom || e.toLowerCase() === userEmailNet)) || t.assignedToEmail?.toLowerCase() === userEmailCom || t.assignedToEmail?.toLowerCase() === userEmailNet;
    const isCollaborator = t.collaborators?.some(c => c.toLowerCase() === userEmailCom || c.toLowerCase() === userEmailNet);
    const isMyCreation = t.createdBy?.toLowerCase() === userEmailCom || t.createdBy?.toLowerCase() === userEmailNet;

    // SuperAdmin o Dirección tienen visibilidad de supervisión pero respetando el filtro de sede seleccionado
    if (currentUser?.isSuperAdmin || currentUser?.isDireccion || currentUser?.appRole === 'direccion') {
      const matchesRole = normalizeRole(t.role) === roleId || isAssigned || isCollaborator || isMyCreation;
      if (!matchesRole) return false;

      // Si tiene seleccionado un filtro de sede específico (ej. 'Lima')
      if (selectedSedeFilter && selectedSedeFilter !== 'all') {
        const taskSede = t.assignedSede || t.sede;
        // Si la tarea tiene sede específica que no coincide con la sede seleccionada,
        // no se muestra en este tablero A MENOS que esté explícitamente asignada al usuario o creada por él
        if (taskSede && taskSede !== 'Global' && taskSede !== 'Sede Global') {
          const normTaskSede = normalizeSede(taskSede);
          if (normTaskSede !== selectedSedeFilter && !isAssigned && !isMyCreation && !isCollaborator) {
            return false;
          }
        }
      }
      return true;
    }

    // 1. GOBERNANZA DE DELEGACIÓN NOMINAL:
    // Si la tarea tiene destinatarios específicos, solo la ven los asignados, colaboradores o creador.
    const hasSpecificAssignees = (Array.isArray(t.assignedToEmails) && t.assignedToEmails.length > 0) || Boolean(t.assignedToEmail);
    if (hasSpecificAssignees) {
      return isAssigned || isCollaborator || isMyCreation;
    }

    // 2. GOBERNANZA DE ROL:
    const tRoleNorm = normalizeRole(t.role);
    if (tRoleNorm !== roleId) {
      return isAssigned || isCollaborator || isMyCreation;
    }

    // 3. GOBERNANZA DE SEDE:
    const taskSede = t.assignedSede || t.sede;
    if (taskSede && taskSede !== 'Global' && taskSede !== 'Sede Global') {
      const userSede = normalizeSede(currentUser?.sede);
      const normTaskSede = normalizeSede(taskSede);
      if (userSede && userSede !== 'Sede Global' && normTaskSede !== userSede) {
        return false;
      }
    }

    return true;
  });

  const filterParam = searchParams.get('filter');

  // Pestañas de fases operativas: permanentemente activas para todos los usuarios de oficina (PRE-C1, C1, POST-C1, PRE-C2, C2, PRE-MJ, MJ, POST-MJ)
  const showPhaseTabs = true;
  const isCurrentStageInRole = currentStage && PHASE_ORDER.includes(currentStage);

  const sortByDeadline = (tasksArray) => {
    return tasksArray.sort((a, b) => {
      const dA = a.deadline || calculateAutomaticDeadline(a, currentCycle);
      const dB = b.deadline || calculateAutomaticDeadline(b, currentCycle);
      const timeA = dA ? new Date(dA).getTime() : Infinity;
      const timeB = dB ? new Date(dB).getTime() : Infinity;
      return timeA - timeB;
    });
  };

  let scopedTasks = myTasks;
  let viewTitle = `Checklist Causa OS Activo: ${currentStage}`;

  if (filterParam === 'criticas') {
    scopedTasks = myTasks.filter(t => t.isCritical || t.priority === 'Crítica');
    viewTitle = "Mostrando: Tareas Críticas (Urgentes)";
  } else if (filterParam === 'importantes') {
    scopedTasks = myTasks.filter(t => !t.isCritical && t.priority !== 'Crítica');
    viewTitle = "Mostrando: Tareas Importantes";
  } else if (showPhaseTabs) {
    if (qtPhaseFilter === 'active') {
      if (isCurrentStageInRole) {
        const meta = PHASE_META[currentStage] || { label: currentStage };
        scopedTasks = myTasks.filter(t => t.cyclePhase === currentStage);
        viewTitle = `${role?.name || 'Checklist'}: Fase Activa ${meta.label}`;
      } else {
        scopedTasks = myTasks;
        viewTitle = `${role?.name || 'Checklist'}: Catálogo Operativo Integral`;
      }
    } else if (qtPhaseFilter !== 'all') {
      const meta = PHASE_META[qtPhaseFilter] || { label: qtPhaseFilter };
      scopedTasks = myTasks.filter(t => {
        if (t.cyclePhase === qtPhaseFilter) return true;
        if (qtPhaseFilter === 'PRE-C2') {
          return t.cyclePhase === 'PRE-C2' || (t.cyclePhase === 'C2' && (t.task || '').toLowerCase().includes('pre'));
        }
        return false;
      });
      viewTitle = `${role?.name || 'Checklist'}: Fase ${meta.label}`;
    } else {
      scopedTasks = myTasks;
      viewTitle = `${role?.name || 'Checklist'}: Catálogo Operativo Integral`;
    }
  } else {
    // Vista Normal del Checklist Activo para roles de fase única
    if (currentStage && currentStage !== 'GLOBAL' && currentStage !== 'INACTIVO') {
      scopedTasks = myTasks.filter(t => t.cyclePhase === currentStage);
    } else {
      scopedTasks = myTasks;
    }
  }

  // Conteos precisos de estado dentro de la fase / ámbito seleccionado
  const pendingCount = scopedTasks.filter(t => !t.completed && t.status !== 'Completada').length;
  const completedCount = scopedTasks.filter(t => t.completed || t.status === 'Completada').length;
  const totalCount = scopedTasks.length;

  // Filtrado de tareas activas según la pestaña de estado seleccionada
  let activeTasks = scopedTasks;
  if (statusFilter === 'pending') {
    activeTasks = scopedTasks.filter(t => !t.completed && t.status !== 'Completada');
  } else if (statusFilter === 'completed') {
    activeTasks = scopedTasks.filter(t => t.completed || t.status === 'Completada');
  }
  activeTasks = sortByDeadline([...activeTasks]);

  // El progreso siempre refleja el completamiento de la fase / ámbito actual
  const completedActive = scopedTasks.filter(t => t.completed || t.status === 'Completada').length;
  const progress = scopedTasks.length > 0 ? Math.round((completedActive / scopedTasks.length) * 100) : 100;

  const handleStatusChange = async (task) => {
    if (processingTasks.has(task.id)) return;
    
    // Si la tarea ya estaba completada, desmarcarla inmediatamente
    if (task.completed || task.status === 'Completada') {
      try {
        setProcessingTasks(prev => new Set(prev).add(task.id));
        await toggleTask(task.id, true);
      } catch (err) {
        console.error("Error toggling task status:", err);
      } finally {
        setProcessingTasks(prev => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
      }
      return;
    }

    // GOBERNANZA: Si la tarea pertenece a otra sede y no la asignó ni se la asignaron a él:
    // Mostrar advertencia obligatoria y no permitir completarla de manera directa
    if (isForeignTask(task, currentUser)) {
      setForeignTaskForWarning(task);
      return;
    }

    // Si la tarea se está completando: permitir elegir en 1 clic
    // si desea solo completarla a máxima velocidad o compartir su experiencia
    setTaskForCompletionChoice(task);
  };

  const handleForceCompleteForeignTask = async (task) => {
    if (!task) return;
    try {
      setProcessingTasks(prev => new Set(prev).add(task.id));
      await toggleTask(task.id, false);
      celebrateVictory();
    } catch (err) {
      console.error("Error al forzar completado de tarea ajena:", err);
    } finally {
      setProcessingTasks(prev => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  const handleExecuteCompleteOnly = async (task) => {
    if (!task) return;
    setTaskForCompletionChoice(null);
    try {
      setProcessingTasks(prev => new Set(prev).add(task.id));
      await toggleTask(task.id, false);
      celebrateVictory();
    } catch (err) {
      console.error("Error al completar tarea:", err);
    } finally {
      setProcessingTasks(prev => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  const handleExecuteShareExperience = (task) => {
    setTaskForCompletionChoice(null);
    setTaskForReflection(task);
  };

  const handleOpenTaskDetail = (task) => {
    setSelectedTaskForDetail(task);
    setShowTaskDetailModal(true);
  };

  const handleAddEvidence = (task) => {
    handleOpenTaskDetail(task);
  };

  const handleAddComment = (task) => {
    handleOpenTaskDetail(task);
  };

  const handleProgressChange = (task) => {
    handleOpenTaskDetail(task);
  };

  const handleSetDeadline = async (task) => {
    const current = task.deadline || "";
    const newDeadline = await showPrompt("⏰ Establecer Fecha y Hora Límite obligatoria:\n(Ejemplo: 2026-08-22 18:00 o Lunes 09:00)", current);
    if (newDeadline !== null && newDeadline.trim() !== "") {
      updateTaskDetails(task.id, { deadline: newDeadline.trim() });
    }
  };

  const getPriorityColor = (priorityStr) => {
    if (!priorityStr) return 'var(--text-muted)';
    if (priorityStr === 'Crítica') return '#ef4444';
    if (priorityStr === 'Alta') return '#f59e0b';
    if (priorityStr === 'Media') return '#29abe2';
    if (priorityStr === 'Baja') return '#22c55e';
    return 'var(--text-muted)';
  };

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

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      <button onClick={() => navigate(-1)} className="btn-secondary" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
        <ArrowLeft size={18} /> Volver
      </button>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h1 className="text-gold uppercase" style={{ fontSize: '1.8rem', margin: '0 0 0.5rem 0' }}>{role.name}</h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <p className={filterParam ? "text-blue" : "text-muted"} style={{ margin: 0, fontWeight: filterParam ? 'bold' : 'normal' }}>
              {viewTitle}
            </p>
            {/* SELECTOR DE SEDE PARA SUPERADMIN / DIRECCIÓN */}
            {(currentUser?.isSuperAdmin || currentUser?.isDireccion || currentUser?.appRole === 'direccion') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 Filtrar por Sede:</span>
                <select
                  value={selectedSedeFilter}
                  onChange={(e) => setSelectedSedeFilter(e.target.value)}
                  style={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255, 183, 3, 0.45)',
                    color: '#f8fafc',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {userSedeNorm && userSedeNorm !== 'Sede Global' && (
                    <option value={userSedeNorm}>📍 Mi Sede ({userSedeNorm})</option>
                  )}
                  <option value="all">🌐 Todas las Sedes (SuperAdmin)</option>
                  {OPERATIONAL_SEDES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="Global">Sede Global / Institucional</option>
                </select>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {filterParam && (
              <button onClick={() => setSearchParams({})} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-muted)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>
                Limpiar Filtro
              </button>
            )}
            <button 
              type="button"
              onClick={() => syncTasksToGoogle(roleId)} 
              style={{ background: 'rgba(66, 133, 244, 0.1)', border: '1px solid rgba(66, 133, 244, 0.4)', color: '#4285F4', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold' }}
              title="Sincronizar tareas pendientes con Google Tasks"
            >
              <img src="https://www.gstatic.com/images/branding/product/1x/tasks_48dp.png" alt="Google Tasks" style={{ width: '14px', height: '14px' }} />
              Sincronizar
            </button>
            <button
              type="button"
              onClick={() => setShowSyncHistoryModal(true)}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-muted)', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer' }}
              title="Ver Historial de Sincronizaciones"
            >
              <Clock size={16} />
            </button>
            <button 
              type="button"
              onClick={() => setShowTaskModal(true)} 
              className="btn-neon-action"
            >
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span>
              <span>TAREA</span>
            </button>
          </div>
        </div>
        
        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'var(--color-success)' : 'var(--crear-gold)', transition: 'width 0.4s ease' }} />
        </div>
        <p className="text-gold" style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>{progress}% Completado en esta Fase</p>

        {/* NAVEGACIÓN PROLIJA DE FASES OPERATIVAS */}
        {showPhaseTabs && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
            {/* Botón Fase Activa Actual */}
            {isCurrentStageInRole && (
              <button
                type="button"
                onClick={() => setQtPhaseFilter('active')}
                style={{
                  padding: '0.35rem 0.8rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  background: qtPhaseFilter === 'active' ? 'var(--color-success)' : 'rgba(255,255,255,0.05)',
                  color: qtPhaseFilter === 'active' ? '#000000' : 'var(--text-muted)',
                  border: `1px solid ${qtPhaseFilter === 'active' ? 'var(--color-success)' : 'rgba(255,255,255,0.1)'}`
                }}
              >
                ⚡ Fase Activa: {currentStage} ({myTasks.filter(t => t.cyclePhase === currentStage).length})
              </button>
            )}

            {PHASE_ORDER.map(phase => {
              const meta = PHASE_META[phase] || { emoji: '📌', label: phase, color: 'var(--crear-gold)' };
              const count = myTasks.filter(t => {
                if (t.cyclePhase === phase) return true;
                if (phase === 'PRE-C2') return t.cyclePhase === 'PRE-C2' || (t.cyclePhase === 'C2' && (t.task || '').toLowerCase().includes('pre'));
                return false;
              }).length;
              const active = qtPhaseFilter === phase;
              return (
                <button
                  key={phase}
                  type="button"
                  onClick={() => setQtPhaseFilter(phase)}
                  style={{
                    padding: '0.35rem 0.8rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    background: active ? meta.color : 'rgba(255,255,255,0.05)',
                    color: active ? '#000000' : 'var(--text-muted)',
                    border: `1px solid ${active ? meta.color : 'rgba(255,255,255,0.1)'}`
                  }}
                >
                  {meta.emoji} {meta.label} ({count})
                </button>
              );
            })}

            {/* Botón Todas las Tareas del Catálogo */}
            <button
              type="button"
              onClick={() => setQtPhaseFilter('all')}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                background: qtPhaseFilter === 'all' ? 'var(--crear-blue)' : 'rgba(255,255,255,0.05)',
                color: qtPhaseFilter === 'all' ? '#000000' : 'var(--text-muted)',
                border: `1px solid ${qtPhaseFilter === 'all' ? 'var(--crear-blue)' : 'rgba(255,255,255,0.1)'}`
              }}
            >
              📋 Todo el Catálogo ({myTasks.length})
            </button>
          </div>
        )}

        {/* PESTAÑAS DE ESTADO: PENDIENTES VS COMPLETADAS */}
        <div style={{ 
          display: 'flex', 
          gap: '0.6rem', 
          alignItems: 'center', 
          marginTop: '1.25rem', 
          paddingTop: '1rem', 
          borderTop: '1px solid rgba(255,255,255,0.08)',
          flexWrap: 'wrap'
        }}>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: statusFilter === 'pending' ? 'var(--crear-gold, #f59e0b)' : 'rgba(255,255,255,0.05)',
              color: statusFilter === 'pending' ? '#000000' : 'var(--text-muted)',
              border: `1px solid ${statusFilter === 'pending' ? 'var(--crear-gold, #f59e0b)' : 'rgba(255,255,255,0.1)'}`,
              transition: 'all 0.2s ease',
              boxShadow: statusFilter === 'pending' ? '0 0 12px rgba(245,158,11,0.25)' : 'none'
            }}
          >
            <span>⏳ Pendientes</span>
            <span style={{
              background: statusFilter === 'pending' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.1)',
              padding: '2px 7px',
              borderRadius: '10px',
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: statusFilter === 'completed' ? 'var(--color-success, #22c55e)' : 'rgba(255,255,255,0.05)',
              color: statusFilter === 'completed' ? '#000000' : 'var(--text-muted)',
              border: `1px solid ${statusFilter === 'completed' ? 'var(--color-success, #22c55e)' : 'rgba(255,255,255,0.1)'}`,
              transition: 'all 0.2s ease',
              boxShadow: statusFilter === 'completed' ? '0 0 12px rgba(34,197,94,0.25)' : 'none'
            }}
          >
            <span>✅ Completadas</span>
            <span style={{
              background: statusFilter === 'completed' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.1)',
              padding: '2px 7px',
              borderRadius: '10px',
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              {completedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: statusFilter === 'all' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)',
              color: statusFilter === 'all' ? '#ffffff' : 'var(--text-muted)',
              border: `1px solid ${statusFilter === 'all' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
              transition: 'all 0.2s ease'
            }}
          >
            <span>📋 Todas</span>
            <span style={{
              background: statusFilter === 'all' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.1)',
              padding: '2px 7px',
              borderRadius: '10px',
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              {totalCount}
            </span>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {activeTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            {statusFilter === 'pending' && completedCount > 0 ? (
              <>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
                <h3 style={{ color: '#fff', margin: '0 0 0.5rem' }}>¡Todas las tareas pendientes de esta fase están completadas!</h3>
                <p className="text-muted" style={{ margin: '0 0 1rem', fontSize: '0.9rem' }}>
                  Has completado las {completedCount} tareas de esta fase con éxito y excelencia operativa.
                </p>
                <button
                  type="button"
                  onClick={() => setStatusFilter('completed')}
                  className="btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                >
                  Ver Tareas Completadas ({completedCount}) →
                </button>
              </>
            ) : statusFilter === 'completed' ? (
              <p className="text-muted" style={{ margin: 0 }}>
                No hay tareas completadas aún en esta fase.
              </p>
            ) : (
              <p className="text-muted" style={{ margin: 0 }}>
                No hay tareas para esta fase del ciclo operativo.
              </p>
            )}
          </div>
        ) : (
          activeTasks.map(task => {
            const isForeign = isForeignTask(task, currentUser);
            const taskSede = task.assignedSede || task.sede;
            return (
            <div key={task.id} className="glass-panel hover-glow" style={{ padding: '1.5rem', borderLeft: `4px solid ${isForeign ? '#ef4444' : getPriorityColor(task.priority)}`, opacity: task.completed ? 0.6 : 1, transition: 'all 0.3s' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', gap: '1rem' }}>
                  <input 
                    type="checkbox" 
                    disabled={processingTasks.has(task.id)}
                    checked={task.completed || task.status === 'Completada'}
                    onChange={() => handleStatusChange(task)}
                    style={{ width: '20px', height: '20px', cursor: processingTasks.has(task.id) ? 'wait' : 'pointer', marginTop: '3px', opacity: processingTasks.has(task.id) ? 0.5 : 1 }}
                  />
                  <div>
                    {isForeign && (
                      <div style={{ marginBottom: '0.45rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: '#f87171',
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          📍 Sede {taskSede || 'Externa'} • Tarea de Otra Sede
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: '#f59e0b',
                          background: 'rgba(245, 158, 11, 0.12)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          padding: '2px 7px',
                          borderRadius: '6px'
                        }}>
                          ⚠️ No asignada a ti
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                      <h3 
                        className={task.completed ? 'text-muted' : 'text-white'} 
                        onClick={() => handleOpenTaskDetail(task)}
                        style={{ 
                          margin: '0 0 0.4rem 0', 
                          textDecoration: task.completed ? 'line-through' : 'none', 
                          fontSize: '1.05rem',
                          cursor: 'pointer',
                          transition: 'color 0.15s ease'
                        }}
                        title="Haz clic para ver detalles, registrar avances o adjuntar evidencias a Google Drive"
                      >
                        {task.task || task.title}
                      </h3>
                      {canEditTask(task) && !task.completed && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEditClick(task); }}
                          style={{ background: 'none', border: 'none', color: 'var(--crear-cyan)', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center' }}
                          title="Editar Tarea"
                        >
                          <Edit3 size={16} />
                        </button>
                      )}
                    </div>

                      {/* FECHA Y HORA LÍMITE AUTOMÁTICA Causa OS */}
                      {(() => {
                        const effectiveDeadline = task.deadline || calculateAutomaticDeadline(task, currentCycle);
                        const countdown = getCountdownInfo(effectiveDeadline);
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.6rem', borderRadius: '6px', background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.3)', fontSize: '0.8rem' }}>
                              <Clock size={13} color="var(--crear-gold)" />
                              <span style={{ color: 'var(--crear-gold)', fontWeight: 'bold' }}>
                                ⏱ Límite: {effectiveDeadline}
                              </span>
                              {!task.completed && (
                                <button 
                                  onClick={() => handleSetDeadline(task)}
                                  style={{ background: 'none', border: 'none', color: '#29abe2', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline', padding: '0 0.2rem', marginLeft: '0.3rem' }}
                                >
                                  {task.deadline ? 'Modificar' : 'Ajustar'}
                                </button>
                              )}
                            </div>
                            
                            {!task.completed && countdown && (
                              <div style={{ 
                                padding: '0.25rem 0.6rem', 
                                borderRadius: '6px', 
                                fontSize: '0.75rem', 
                                fontWeight: 'bold',
                                color: countdown.color, 
                                background: countdown.bg, 
                                border: `1px solid ${countdown.border}` 
                              }}>
                                {countdown.label}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    
                    {task.associatedGoal && (
                      <div style={{ background: 'rgba(41, 171, 226, 0.1)', border: '1px solid rgba(41, 171, 226, 0.3)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <Target size={14} className="text-blue" />
                        <span className="text-blue"><strong>Meta Asociada:</strong> {task.associatedGoal}</span>
                      </div>
                    )}

                    {(task.dependency && task.dependency !== 'Ninguna') && (
                      <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.3rem' }}>
                        ⚠ Dependencia: <strong>{task.dependency}</strong>
                      </div>
                    )}
                    {task.escalation && (
                      <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.2rem' }}>
                        ⇡ Escalamiento: <strong>{task.escalation}</strong>
                      </div>
                    )}

                    {/* COLABORADORES ACTIVOS DE LA TAREA */}
                    {task.collaboratorDetails && task.collaboratorDetails.length > 0 && (() => {
                      const filteredCollabs = (currentUser?.isSuperAdmin || currentUser?.isDireccion || currentUser?.appRole === 'direccion')
                        ? task.collaboratorDetails
                        : task.collaboratorDetails.filter(c => {
                            const cSede = c.sede?.toLowerCase();
                            const uSede = currentUser?.sede?.toLowerCase();
                            return !cSede || cSede === 'global' || cSede === 'sede global' || cSede === uSede;
                          });
                      if (filteredCollabs.length === 0) return null;
                      return (
                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🤝 Colaborando:</span>
                          {filteredCollabs.map(c => (
                            <span key={c.email} style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', background: 'rgba(0, 210, 255, 0.15)', color: 'var(--crear-blue)', border: '1px solid rgba(0, 210, 255, 0.3)' }}>
                              @{c.name}
                            </span>
                          ))}
                        </div>
                      );
                    })()}

                    {/* MOSTRAR QUIÉN ASIGNÓ LA TAREA (COLOR POR ROL Y SEDE) */}
                    {task.createdBy && (task.assignedToEmail || (task.assignedToEmails && task.assignedToEmails.length > 0)) && (() => {
                      const creator = usersData.find(u => u.email === task.createdBy);
                      // Solo mostramos 'Delegado por' si el creador no es uno de los asignados
                      const isCreatorAssigned = task.assignedToEmails ? task.assignedToEmails.includes(creator?.email) : creator?.email === task.assignedToEmail;
                      if (creator && !isCreatorAssigned) {
                        const cRole = normalizeRole(creator.role);
                        const roleColor = ROLE_COLORS[cRole] || '#6b7280';
                        const roleName = ROLE_DISPLAY_NAMES[cRole] || creator.role;
                        const creatorSede = creator.sede ? normalizeSede(creator.sede) : (task.assignedSede || task.sede);
                        return (
                          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Asignado por:</span>
                            <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', background: `${roleColor}15`, color: roleColor, border: `1px solid ${roleColor}40`, fontWeight: 'bold' }}>
                              {roleName} ({creator.name.split(' ')[0]})
                            </span>
                            {creatorSede && creatorSede !== 'Sede Global' && (
                              <span style={{ color: '#f59e0b', fontSize: '0.72rem', fontWeight: 600 }}>
                                • Sede {creatorSede}
                              </span>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {task.assignedByName && !task.createdBy && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Asignado por:</span>
                        <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 'bold' }}>
                          {task.assignedByName}
                        </span>
                        {(task.assignedSede || task.sede) && (
                          <span style={{ color: '#f59e0b', fontSize: '0.72rem', fontWeight: 600 }}>
                            • Sede {task.assignedSede || task.sede}
                          </span>
                        )}
                      </div>
                    )}

                    {(task.notes || task.description || task.comments || task.evidenceUrl) && (
                      <div style={{ marginTop: '0.8rem', padding: '0.75rem 0.85rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '0.82rem', borderLeft: '3px solid var(--crear-gold)' }}>
                        {(task.notes || task.description || task.comments) && (
                          <div style={{ margin: '0 0 0.4rem 0', color: 'rgba(255,255,255,0.9)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                            <strong style={{ color: 'var(--crear-gold)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                              📝 Nota / Instrucciones:
                            </strong>
                            {task.notes || task.description || task.comments}
                          </div>
                        )}
                        {task.evidenceUrl && <a href={task.evidenceUrl} target="_blank" rel="noreferrer" className="text-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none', fontSize: '0.75rem', marginTop: '0.2rem' }}><LinkIcon size={12}/> Evidencia Adjunta</a>}
                      </div>
                    )}

                    {/* ETIQUETAS DE TAREA OPCIONAL O PERIÓDICA */}
                    {(task.isOptional || (task.periodicity && task.periodicity !== 'UNICA')) && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {task.isOptional && (
                          <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', fontWeight: 'bold' }}>
                            ✨ Opcional / Recomendada
                          </span>
                        )}
                        {task.periodicity && task.periodicity !== 'UNICA' && (
                          <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(14,165,233,0.15)', color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.3)', fontWeight: 'bold' }}>
                            🔄 Periódica ({task.periodicity})
                          </span>
                        )}
                      </div>
                    )}

                    {/* SEGUIMIENTO INDIVIDUAL EN UNA SOLA TARJETA (MULTI-ÁREA) */}
                    {task.assigneeProgress && Object.keys(task.assigneeProgress).length > 0 && (() => {
                      const entries = Object.entries(task.assigneeProgress);
                      const total = entries.length;
                      const completedCount = entries.filter(([_, v]) => v.completed === true || v.progress === 100).length;
                      const sumProgress = entries.reduce((acc, [_, v]) => acc + (typeof v.progress === 'number' ? v.progress : (v.completed ? 100 : 0)), 0);
                      const percent = total > 0 ? Math.round(sumProgress / total) : 0;
                      const myEmail = currentUser?.email?.toLowerCase();
                      const myEntry = entries.find(([email]) => email.toLowerCase() === myEmail || email.toLowerCase().replace('@crearpsl.com','@crearpsl.net') === myEmail?.replace('@crearpsl.com','@crearpsl.net'));
                      const myProgress = myEntry ? myEntry[1] : null;

                      return (
                        <div style={{ marginTop: '0.9rem', padding: '0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--crear-gold)' }}>
                                👥 Seguimiento Individual ({completedCount}/{total} completaron):
                              </span>
                              <span style={{ fontSize: '0.75rem', color: percent === 100 ? '#22c55e' : 'var(--text-muted)', fontWeight: 'bold' }}>
                                {percent}%
                              </span>
                            </div>
                            
                            {/* Botón rápido para que el usuario actual complete o reabra su parte individual */}
                            {myProgress && (
                              <button
                                type="button"
                                onClick={() => updateIndividualProgress(task.id, myEntry[0], !myProgress.completed)}
                                style={{
                                  padding: '0.25rem 0.7rem',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  background: myProgress.completed ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.2)',
                                  color: myProgress.completed ? '#22c55e' : 'var(--crear-gold)',
                                  border: `1px solid ${myProgress.completed ? '#22c55e' : 'var(--crear-gold)'}`
                                }}
                              >
                                {myProgress.completed ? '✓ Mi parte completada' : '⚡ Marcar mi parte como completada'}
                              </button>
                            )}
                          </div>

                          {/* Barra de progreso colectiva */}
                          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.7rem' }}>
                            <div style={{ width: `${percent}%`, height: '100%', background: percent === 100 ? '#22c55e' : 'var(--crear-gold)', transition: 'width 0.3s ease' }} />
                          </div>

                          {/* Chips individuales de avance */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                            {entries.map(([email, prog]) => {
                              const isMe = email.toLowerCase() === myEmail || email.toLowerCase().replace('@crearpsl.com','@crearpsl.net') === myEmail?.replace('@crearpsl.com','@crearpsl.net');
                              return (
                                <div 
                                  key={email}
                                  style={{
                                    padding: '0.4rem 0.6rem',
                                    borderRadius: '6px',
                                    background: prog.completed ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${prog.completed ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '0.4rem'
                                  }}
                                >
                                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: isMe ? 'bold' : 'normal', color: isMe ? 'var(--crear-cyan)' : 'var(--text-heading)' }}>
                                      {isMe ? '👉 Tú (' + (prog.name || email.split('@')[0]) + ')' : (prog.name || email.split('@')[0])}
                                    </div>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                      {prog.sede || 'Global'} • {prog.role || 'colaborador'}
                                    </div>
                                  </div>
                                  <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold',
                                    padding: '0.15rem 0.4rem',
                                    borderRadius: '4px',
                                    background: (prog.completed || prog.progress === 100) ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.15)',
                                    color: (prog.completed || prog.progress === 100) ? '#22c55e' : (typeof prog.progress === 'number' && prog.progress > 0 ? 'var(--crear-cyan)' : '#f59e0b'),
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {prog.completed || prog.progress === 100 ? '✓ Listo' : (typeof prog.progress === 'number' && prog.progress > 0 ? `${prog.progress}%` : '⏳ Pendiente')}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', minWidth: '120px' }}>
                  {task.priority && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.2rem 0.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: getPriorityColor(task.priority) }}>
                      {task.priority}
                    </span>
                  )}
                  {task.progressPercentage !== undefined && (
                    <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                      Avance: {task.progressPercentage}%
                    </span>
                  )}
                </div>
              </div>

              {/* Botones de Acción */}
              {!task.completed && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', marginLeft: '36px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => { setSelectedTaskForCollab(task); setShowCollabModal(true); }}
                    style={{ background: 'rgba(0, 210, 255, 0.08)', border: '1px solid rgba(0, 210, 255, 0.35)', color: 'var(--crear-blue)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}
                    title="Mencionar e invitar a un compañero para colaborar en esta tarea"
                  >
                    <Users size={14} /> @Invitar Colaborador
                  </button>
                  <button onClick={() => handleSetDeadline(task)} style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)', color: 'var(--crear-gold)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                    <Clock size={14} /> Fecha/Hora Límite
                  </button>
                  <button onClick={() => setTaskForReflection(task)} style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid var(--crear-gold)', color: 'var(--crear-gold)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontWeight: 'bold' }}>
                    <Sparkles size={14} /> Aprendizaje
                  </button>
                  <button onClick={() => setTaskForExcellence(task)} style={{ background: 'linear-gradient(135deg, rgba(255,183,3,0.15), rgba(245,158,11,0.15))', border: '1px solid #f59e0b', color: '#f59e0b', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontWeight: 'bold' }}>
                    👑 Nueva Excelencia
                  </button>
                  <button onClick={() => handleAddComment(task)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-muted)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                    <Edit3 size={14} /> Notas
                  </button>
                  <button 
                    onClick={() => handleAddEvidence(task)} 
                    style={{ 
                      background: 'rgba(212, 175, 55, 0.12)', 
                      border: '1px solid rgba(212, 175, 55, 0.4)', 
                      color: 'var(--crear-gold)', 
                      padding: '0.3rem 0.8rem', 
                      borderRadius: '4px', 
                      fontSize: '0.8rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.3rem', 
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                    title="Adjuntar documentos en Google Drive o registrar evidencias"
                  >
                    <LinkIcon size={14} /> 📎 Evidencia (Drive)
                  </button>
                  <button onClick={() => handleProgressChange(task)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-muted)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                    % Avance
                  </button>
                </div>
              )}
            </div>
            );
          })
        )}
      </div>

      <TaskAssignmentModal 
        isOpen={showTaskModal} 
        onClose={() => {
          setShowTaskModal(false);
          setTaskToEdit(null);
        }} 
        taskToEdit={taskToEdit}
      />
      
      {/* MODAL DE COLABORACIÓN / MENCIÓN */}
      <TaskCollaborationModal
        isOpen={showCollabModal}
        onClose={() => setShowCollabModal(false)}
        task={selectedTaskForCollab}
        onSendInvitation={inviteCollaborator}
      />

      {/* MODAL DE ADVERTENCIA PARA TAREAS DE OTRA SEDE / NO ASIGNADAS */}
      <ForeignTaskWarningModal
        isOpen={Boolean(foreignTaskForWarning)}
        task={foreignTaskForWarning}
        currentUser={currentUser}
        onClose={() => setForeignTaskForWarning(null)}
        onForceComplete={handleForceCompleteForeignTask}
      />

      {/* MODAL DE ELECCIÓN RÁPIDA: COMPLETAR TAREA VS COMPARTIR EXPERIENCIA */}
      <TaskCompletionChoiceModal
        isOpen={!!taskForCompletionChoice}
        task={taskForCompletionChoice}
        onCompleteOnly={() => handleExecuteCompleteOnly(taskForCompletionChoice)}
        onShareExperience={() => handleExecuteShareExperience(taskForCompletionChoice)}
        onClose={() => setTaskForCompletionChoice(null)}
      />

      {/* MODAL DE REFLEXIÓN Y APRENDIZAJE */}
      <LearningReflectionModal
        isOpen={!!taskForReflection}
        onClose={() => setTaskForReflection(null)}
        task={taskForReflection}
        onComplete={async (taskId) => {
          await toggleTask(taskId, false); // false porque antes no estaba completada
          setTaskForReflection(null);
        }}
      />

      {/* MODAL DE NUEVA EXCELENCIA */}
      <NewExcellenceModal
        isOpen={!!taskForExcellence}
        onClose={() => setTaskForExcellence(null)}
        task={taskForExcellence}
      />

      <SyncHistoryModal isOpen={showSyncHistoryModal} onClose={() => setShowSyncHistoryModal(false)} />

      {/* MODAL DE DETALLE DE TAREA, AVANCE Y EVIDENCIAS CON GOOGLE DRIVE */}
      <TaskDetailModal
        isOpen={showTaskDetailModal}
        onClose={() => {
          setShowTaskDetailModal(false);
          setSelectedTaskForDetail(null);
        }}
        task={selectedTaskForDetail}
        onEditTaskParams={(t) => {
          setShowTaskDetailModal(false);
          handleEditClick(t);
        }}
        resolveAssigneeName={(email) => {
          const u = usersData.find(usr => usr.email?.toLowerCase() === email?.toLowerCase());
          return u ? u.name : email;
        }}
      />
    </div>
  );
}

