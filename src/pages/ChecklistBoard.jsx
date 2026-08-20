import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChecklist } from '../context/ChecklistContext';
import { useCycles } from '../context/CyclesContext';
import { useUI } from '../context/UIContext';
import { roles } from '../data/checklistData';
import { usersData, normalizeRole, ROLE_COLORS, ROLE_DISPLAY_NAMES, getRoleDisplayName } from '../data/usersData';
import { calculateAutomaticDeadline } from '../utils/soarDates';
import { ArrowLeft, Target, Link as LinkIcon, Edit3, Filter, Clock, Calendar, ShieldAlert, Users, AtSign } from 'lucide-react';
import TaskAssignmentModal from '../components/TaskAssignmentModal';
import TaskCollaborationModal from '../components/TaskCollaborationModal';

export default function ChecklistBoard() {
  const { roleId: rawRoleId } = useParams();
  const roleId = normalizeRole(decodeURIComponent(rawRoleId));
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [selectedTaskForCollab, setSelectedTaskForCollab] = useState(null);
  const [qtPhaseFilter, setQtPhaseFilter] = useState('all'); // 'all', 'PRE-C1', 'C1', 'POST-C1'

  const { currentUser } = useAuth();
  const { tasks, toggleTask, updateTaskDetails, inviteCollaborator } = useChecklist();
  const { currentCycle, currentStage } = useCycles();
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
    if (currentUser?.isSuperAdmin) {
      return t.role === roleId || t.assignedToEmail === currentUser?.email || t.collaborators?.includes(currentUser?.email);
    }

    // Regla de privacidad para Gerentes y Directores:
    // Solo pueden ver sus tareas globales, las que crearon, las asignadas a ellos o compartidas con ellos.
    // No pueden ver las tareas específicas creadas por otro gerente para otro gerente.
    if ((roleId === 'gerente' || roleId === 'director_maestria') && t.role === roleId) {
      if (!t.assignedToEmail) return true; // Tarea base global
      const isMine = t.assignedToEmail.toLowerCase() === currentUser?.email?.toLowerCase();
      const isMyCreation = t.createdBy?.toLowerCase() === currentUser?.email?.toLowerCase();
      const isCollab = t.collaborators?.includes(currentUser?.email);
      return isMine || isMyCreation || isCollab;
    }

    return t.role === roleId || 
           t.assignedToEmail === currentUser?.email ||
           (t.collaborators && t.collaborators.includes(currentUser?.email));
  });

  const filterParam = searchParams.get('filter');

  let activeTasks = myTasks;
  let viewTitle = `Checklist SO-AR Activo: ${currentStage}`;

  if (filterParam === 'completed') {
    activeTasks = myTasks.filter(t => t.completed || t.status === 'Completada');
    viewTitle = "Mostrando: Tareas Completadas";
  } else if (filterParam === 'criticas') {
    activeTasks = myTasks.filter(t => !t.completed && (t.isCritical || t.priority === 'Crítica'));
    viewTitle = "Mostrando: Tareas Críticas (Urgentes)";
  } else if (filterParam === 'importantes') {
    activeTasks = myTasks.filter(t => !t.completed && !t.isCritical && t.priority !== 'Crítica');
    viewTitle = "Mostrando: Tareas Importantes";
  } else if (roleId === 'qt' || roleId === 'coord_c1') {
    // Para QT y Coordinación C1/C2: visualización prolija de sus fases operativas
    if (qtPhaseFilter === 'PRE-C1') {
      activeTasks = myTasks.filter(t => t.cyclePhase === 'PRE-C1');
      viewTitle = `${role?.name || 'Coordinación'}: Fase PRE-C1 (Logística, Grounding & Armado)`;
    } else if (qtPhaseFilter === 'C1') {
      activeTasks = myTasks.filter(t => t.cyclePhase === 'C1');
      viewTitle = `${role?.name || 'Coordinación'}: Fase C1 (Sala, Mesas & Operaciones en Vivo)`;
    } else if (qtPhaseFilter === 'POST-C1') {
      activeTasks = myTasks.filter(t => t.cyclePhase === 'POST-C1');
      viewTitle = `${role?.name || 'Coordinación'}: Fase POST-C1 (Post-Mortem & Re-enrolamiento)`;
    } else if (qtPhaseFilter === 'C2') {
      activeTasks = myTasks.filter(t => t.cyclePhase === 'C2');
      viewTitle = `${role?.name || 'Coordinación'}: Fase C2 (Operación Avanzada & Cierres)`;
    } else {
      activeTasks = myTasks;
      viewTitle = `${role?.name || 'Coordinación'}: Catálogo Operativo Integral (PRE-C1, C1, POST-C1 y C2)`;
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

  const handleStatusChange = (task) => {
    toggleTask(task.id, task.completed);
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

        {/* NAVEGACIÓN PROLIJA DE FASES PARA QUANTUM TEAM Y COORDINACIÓN C1/C2 */}
        {(roleId === 'qt' || roleId === 'coord_c1') && (
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
            <button
              onClick={() => setQtPhaseFilter('PRE-C1')}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                background: qtPhaseFilter === 'PRE-C1' ? 'var(--crear-gold)' : 'rgba(255,255,255,0.05)',
                color: qtPhaseFilter === 'PRE-C1' ? '#000000' : 'var(--text-muted)',
                border: `1px solid ${qtPhaseFilter === 'PRE-C1' ? 'var(--crear-gold)' : 'rgba(255,255,255,0.1)'}`
              }}
            >
              📦 PRE-C1 ({myTasks.filter(t => t.cyclePhase === 'PRE-C1').length})
            </button>
            <button
              onClick={() => setQtPhaseFilter('C1')}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                background: qtPhaseFilter === 'C1' ? 'var(--color-success)' : 'rgba(255,255,255,0.05)',
                color: qtPhaseFilter === 'C1' ? '#000000' : 'var(--text-muted)',
                border: `1px solid ${qtPhaseFilter === 'C1' ? 'var(--color-success)' : 'rgba(255,255,255,0.1)'}`
              }}
            >
              🏢 C1 Sala ({myTasks.filter(t => t.cyclePhase === 'C1').length})
            </button>
            <button
              onClick={() => setQtPhaseFilter('POST-C1')}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                background: qtPhaseFilter === 'POST-C1' ? '#8b5cf6' : 'rgba(255,255,255,0.05)',
                color: qtPhaseFilter === 'POST-C1' ? '#ffffff' : 'var(--text-muted)',
                border: `1px solid ${qtPhaseFilter === 'POST-C1' ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}`
              }}
            >
              🚀 POST-C1 ({myTasks.filter(t => t.cyclePhase === 'POST-C1').length})
            </button>
            <button
              onClick={() => setQtPhaseFilter('C2')}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                background: qtPhaseFilter === 'C2' ? '#ec4899' : 'rgba(255,255,255,0.05)',
                color: qtPhaseFilter === 'C2' ? '#ffffff' : 'var(--text-muted)',
                border: `1px solid ${qtPhaseFilter === 'C2' ? '#ec4899' : 'rgba(255,255,255,0.1)'}`
              }}
            >
              🔥 C2 ({myTasks.filter(t => t.cyclePhase === 'C2').length})
            </button>
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
                    checked={task.completed || task.status === 'Completada'}
                    onChange={() => handleStatusChange(task)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', marginTop: '3px' }}
                  />
                  <div>
                    <h3 className={task.completed ? 'text-muted' : 'text-white'} style={{ margin: '0 0 0.4rem 0', textDecoration: task.completed ? 'line-through' : 'none', fontSize: '1.05rem' }}>
                      {task.task || task.title}
                    </h3>

                    {/* FECHA Y HORA LÍMITE AUTOMÁTICA SO-AR */}
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
                    {task.createdBy && task.assignedToEmail && (() => {
                      const creator = usersData.find(u => u.email.toLowerCase() === task.createdBy.toLowerCase());
                      if (creator && creator.email !== task.assignedToEmail) {
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

      <TaskAssignmentModal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} />
      
      {/* MODAL DE COLABORACIÓN / MENCIÓN */}
      <TaskCollaborationModal
        isOpen={showCollabModal}
        onClose={() => setShowCollabModal(false)}
        task={selectedTaskForCollab}
        onSendInvitation={inviteCollaborator}
      />
    </div>
  );
}
