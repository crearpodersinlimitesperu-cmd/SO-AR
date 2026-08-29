import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChecklist } from '../context/ChecklistContext';

import { useCycles } from '../context/CyclesContext';
import { useUI } from '../context/UIContext';

import { roles } from '../data/checklistData';
import { usersData, normalizeRole, ROLE_COLORS, ROLE_DISPLAY_NAMES, getRoleDisplayName } from '../data/usersData';
import { calculateAutomaticDeadline } from '../utils/soarDates';
import { ArrowLeft, Target, Link as LinkIcon, Edit3, Clock, ShieldAlert, Users, Sparkles } from 'lucide-react';
import TaskAssignmentModal from '../components/TaskAssignmentModal';
import TaskCollaborationModal from '../components/TaskCollaborationModal';
import LearningReflectionModal from '../components/LearningReflectionModal';
import NewExcellenceModal from '../components/NewExcellenceModal';
import SyncHistoryModal from '../components/SyncHistoryModal';

// Fases operativas reales existentes en src/data/checklistData.js (cyclePhase).
// No existen 'PRE-C2' ni 'POST-C2' como fases propias: todo lo de C2 usa la fase única 'C2'.
const PHASE_ORDER = ['GATE 1', 'PRE-C1', 'C1', 'POST-C1', 'C2', 'PRE-MJ', 'MJ', 'POST-MJ'];
const PHASE_META = {
  'GATE 1': { emoji: '🚪', label: 'GATE 1', color: '#3b82f6' },
  'PRE-C1': { emoji: '📦', label: 'PRE-C1', color: 'var(--crear-gold)' },
  'C1': { emoji: '🏢', label: 'C1 Sala', color: 'var(--color-success)' },
  'POST-C1': { emoji: '🚀', label: 'POST-C1', color: '#8b5cf6' },
  'C2': { emoji: '🔥', label: 'C2', color: '#ec4899' },
  'PRE-MJ': { emoji: '🧭', label: 'PRE-MJ', color: '#0ea5e9' },
  'MJ': { emoji: '🏆', label: 'MJ', color: '#f59e0b' },
  'POST-MJ': { emoji: '🌅', label: 'POST-MJ', color: '#22c55e' },
};
// Roles de coordinación que navegan su checklist por pestañas de fase (catálogo completo),
// en vez de ver solo la fase activa del ciclo como el resto de roles.
const COORDINATOR_ROLES_WITH_PHASE_TABS = ['qt', 'coord_c1', 'coord_maestria', 'coordinador'];

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
  const [taskForExcellence, setTaskForExcellence] = useState(null);
  const [qtPhaseFilter, setQtPhaseFilter] = useState('all'); // 'all' o una de las fases reales del rol (ver PHASE_ORDER)

  const { currentUser } = useAuth();
  const { tasks, toggleTask, updateTaskDetails, inviteCollaborator, syncTasksToGoogle } = useChecklist();
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

    if (currentUser?.isSuperAdmin) {
      return t.role === roleId || isAssigned || isCollaborator;
    }

    if ((roleId === 'gerente' || roleId === 'director_maestria') && t.role === roleId) {
      if (!t.assignedToEmail && !(t.assignedToEmails && t.assignedToEmails.length > 0)) return true;
      const isMyCreation = t.createdBy?.toLowerCase() === userEmailCom || t.createdBy?.toLowerCase() === userEmailNet;
      return isAssigned || isMyCreation || isCollaborator;
    }

    return t.role === roleId || isAssigned || isCollaborator;
  });


  const filterParam = searchParams.get('filter');

  // Fases que este rol realmente tiene en su catálogo de tareas (según los datos, no inventadas).
  const isCoordinatorRoleWithTabs = COORDINATOR_ROLES_WITH_PHASE_TABS.includes(roleId);
  const phasesPresent = isCoordinatorRoleWithTabs
    ? PHASE_ORDER.filter(p => myTasks.some(t => t.cyclePhase === p))
    : [];
  // Solo mostramos pestañas si el rol realmente abarca más de una fase (si tuviera solo una, no aporta navegar por pestañas)
  const showPhaseTabs = phasesPresent.length > 1;

  let activeTasks = myTasks;
  let viewTitle = `Checklist Causa OS Activo: ${currentStage}`;

  if (filterParam === 'completed') {
    activeTasks = myTasks.filter(t => t.completed || t.status === 'Completada');
    viewTitle = "Mostrando: Tareas Completadas";
  } else if (filterParam === 'criticas') {
    activeTasks = myTasks.filter(t => !t.completed && (t.isCritical || t.priority === 'Crítica'));
    viewTitle = "Mostrando: Tareas Críticas (Urgentes)";
  } else if (filterParam === 'importantes') {
    activeTasks = myTasks.filter(t => !t.completed && !t.isCritical && t.priority !== 'Crítica');
    viewTitle = "Mostrando: Tareas Importantes";
  } else if (showPhaseTabs) {
    // Para roles de coordinación (QT, Coordinación C1/C2, Coordinación Maestría, Coordinación Administrativa):
    // visualización prolija por pestañas de sus fases operativas reales.
    if (qtPhaseFilter !== 'all' && phasesPresent.includes(qtPhaseFilter)) {
      const meta = PHASE_META[qtPhaseFilter] || { label: qtPhaseFilter };
      activeTasks = myTasks.filter(t => t.cyclePhase === qtPhaseFilter);
      viewTitle = `${role?.name || 'Coordinación'}: Fase ${meta.label}`;
    } else {
      activeTasks = myTasks;
      viewTitle = `${role?.name || 'Coordinación'}: Catálogo Operativo Integral (${phasesPresent.join(', ')})`;
    }
  } else {
    // Vista Normal del Checklist Activo para otros roles
    if (currentStage && currentStage !== 'GLOBAL' && currentStage !== 'INACTIVO') {
      activeTasks = myTasks.filter(t => 
        (t.cyclePhase === currentStage) || (t.associatedGoal && !t.completed) || (t.isCritical && !t.completed)
      );
    } else {
      activeTasks = myTasks;
    }
  }

  // El progreso siempre es de mis tareas totales de la fase, no de la vista filtrada
  const stageTasks = (currentStage && currentStage !== 'GLOBAL' && currentStage !== 'INACTIVO') 
    ? myTasks.filter(t => t.cyclePhase === currentStage || t.associatedGoal)
    : myTasks;
  const completedActive = stageTasks.filter(t => t.completed || t.status === 'Completada').length;
  const progress = stageTasks.length > 0 ? Math.round((completedActive / stageTasks.length) * 100) : 100;

  const handleStatusChange = async (task) => {
    if (processingTasks.has(task.id)) return;
    
    // Si la tarea se está marcando como completada y es crítica/alta prioridad, proponer reflexión
    if (!task.completed && (task.isCritical || task.priority === 'Crítica' || task.priority === 'Alta')) {
      setTaskForReflection(task);
      return;
    }
    
    try {
      setProcessingTasks(prev => new Set(prev).add(task.id));
      await toggleTask(task.id, task.completed);
    } catch (err) {
      console.error("Error toggling task status:", err);
    } finally {
      setProcessingTasks(prev => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  const handleAddEvidence = async (task) => {
    const url = await showPrompt("Introduce el link de la evidencia (Google Drive, Docs, etc):", task.evidenceUrl || "");
    if (url !== null) {
      updateTaskDetails(task.id, { evidenceUrl: url });
    }
  };

  const handleAddComment = async (task) => {
    const comment = await showPrompt("Añadir comentario u observación:", task.comments || "");
    if (comment !== null) {
      updateTaskDetails(task.id, { comments: comment });
    }
  };

  const handleProgressChange = async (task) => {
    const p = await showPrompt("Actualizar porcentaje de avance (0-100):", task.progressPercentage || 0);
    if (p !== null && !isNaN(p)) {
      updateTaskDetails(task.id, { progressPercentage: Math.min(100, Math.max(0, parseInt(p))) });
    }
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <p className={filterParam ? "text-blue" : "text-muted"} style={{ margin: 0, fontWeight: filterParam ? 'bold' : 'normal' }}>
            {viewTitle}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
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

        {/* NAVEGACIÓN PROLIJA DE FASES PARA ROLES DE COORDINACIÓN (QT, C1/C2, Maestría, Administrativa) */}
        {showPhaseTabs && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
            <button
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
              📋 Todas las Tareas ({myTasks.length})
            </button>
            {phasesPresent.map(phase => {
              const meta = PHASE_META[phase] || { emoji: '📌', label: phase, color: 'var(--crear-gold)' };
              const active = qtPhaseFilter === phase;
              return (
                <button
                  key={phase}
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
                  {meta.emoji} {meta.label} ({myTasks.filter(t => t.cyclePhase === phase).length})
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {activeTasks.length === 0 ? (
          <p className="text-muted text-center" style={{ margin: '2rem 0' }}>No hay tareas para esta fase del ciclo operativo.</p>
        ) : (
          activeTasks.map(task => (
            <div key={task.id} className="glass-panel hover-glow" style={{ padding: '1.5rem', borderLeft: `4px solid ${getPriorityColor(task.priority)}`, opacity: task.completed ? 0.6 : 1, transition: 'all 0.3s' }}>
              
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
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                      <h3 className={task.completed ? 'text-muted' : 'text-white'} style={{ margin: '0 0 0.4rem 0', textDecoration: task.completed ? 'line-through' : 'none', fontSize: '1.05rem' }}>
                        {task.task || task.title}
                      </h3>
                      {canEditTask(task) && !task.completed && (
                        <button 
                          onClick={() => handleEditClick(task)}
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
                      return (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.6rem', borderRadius: '6px', background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.3)', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                          <Clock size={13} color="var(--crear-gold)" />
                          <span style={{ color: 'var(--crear-gold)', fontWeight: 'bold' }}>
                            ⏰ Límite: {effectiveDeadline}
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
                    {task.collaboratorDetails && task.collaboratorDetails.length > 0 && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🤝 Colaborando:</span>
                        {task.collaboratorDetails.map(c => (
                          <span key={c.email} style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', background: 'rgba(0, 210, 255, 0.15)', color: 'var(--crear-blue)', border: '1px solid rgba(0, 210, 255, 0.3)' }}>
                            @{c.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* MOSTRAR QUIÉN ASIGNÓ LA TAREA (COLOR POR ROL) */}
                    {task.createdBy && (task.assignedToEmail || (task.assignedToEmails && task.assignedToEmails.length > 0)) && (() => {
                      const creator = usersData.find(u => u.email === task.createdBy);
                      // Solo mostramos 'Delegado por' si el creador no es uno de los asignados
                      const isCreatorAssigned = task.assignedToEmails ? task.assignedToEmails.includes(creator?.email) : creator?.email === task.assignedToEmail;
                      if (creator && !isCreatorAssigned) {
                        const cRole = normalizeRole(creator.role);
                        const roleColor = ROLE_COLORS[cRole] || '#6b7280';
                        const roleName = ROLE_DISPLAY_NAMES[cRole] || creator.role;
                        return (
                          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Asignado por:</span>
                            <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', background: `${roleColor}15`, color: roleColor, border: `1px solid ${roleColor}40`, fontWeight: 'bold' }}>
                              {roleName} ({creator.name.split(' ')[0]})
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {(task.comments || task.evidenceUrl) && (
                      <div style={{ marginTop: '0.8rem', padding: '0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.85rem' }}>
                        {task.comments && <p className="text-muted" style={{ margin: '0 0 0.5rem 0' }}>💬 {task.comments}</p>}
                        {task.evidenceUrl && <a href={task.evidenceUrl} target="_blank" rel="noreferrer" className="text-gold" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}><LinkIcon size={12}/> Evidencia Adjunta</a>}
                      </div>
                    )}
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
                  <button onClick={() => handleAddEvidence(task)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-muted)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                    <LinkIcon size={14} /> Evidencia
                  </button>
                  <button onClick={() => handleProgressChange(task)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-muted)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                    % Avance
                  </button>
                </div>
              )}
            </div>
          ))
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
    </div>
  );
}
