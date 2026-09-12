import { useState, useEffect } from 'react';
import { Target, X, Zap, Calendar, Clock, Search, Users, CheckSquare, Square, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChecklist } from '../context/ChecklistContext';
import { getAssignableRoles } from '../config/permissions';
import { usersData, normalizeRole, normalizeSede, OPERATIONAL_SEDES, getRoleDisplayName } from '../data/usersData';
import { recordAuditEvent } from '../services/auditService';

export const OPERATIONAL_AREAS = [
  {
    id: 'todas',
    label: '🌐 Todos los Colaboradores',
    shortLabel: 'Todos',
    icon: '👥',
    filter: () => true
  },
  {
    id: 'finanzas',
    label: '📊 Finanzas, Contabilidad y Administración',
    shortLabel: 'Finanzas / Contab',
    icon: '📊',
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
    label: '🏢 Gerencia de Sede',
    shortLabel: 'Gerencia',
    icon: '🏢',
    filter: (u) => normalizeRole(u.role) === 'gerente'
  },
  {
    id: 'mj',
    label: '🏆 Coordinadores MJ (Maestría del Juego)',
    shortLabel: 'Coord. MJ',
    icon: '🏆',
    filter: (u) => ['coord_maestria', 'coordinador_mj', 'director_maestria'].includes(normalizeRole(u.role))
  },
  {
    id: 'c1',
    label: '🌟 Coordinadores C1 / C2',
    shortLabel: 'Coord. C1/C2',
    icon: '🌟',
    filter: (u) => normalizeRole(u.role) === 'coord_c1'
  },
  {
    id: 'qt',
    label: '⚡ Quantum Team (QT)',
    shortLabel: 'Quantum Team',
    icon: '⚡',
    filter: (u) => normalizeRole(u.role) === 'qt'
  },
  {
    id: 'th',
    label: '👥 Talento Humano',
    shortLabel: 'Talento Humano',
    icon: '👥',
    filter: (u) => ['talento_humano', 'director_th'].includes(normalizeRole(u.role)) || (u.email || '').toLowerCase().includes('talento')
  },
  {
    id: 'direccion',
    label: '👑 Dirección Ejecutiva (CEO / CCO)',
    shortLabel: 'Dirección',
    icon: '👑',
    filter: (u) => ['direccion', 'ceo', 'cco'].includes(normalizeRole(u.role))
  },
  {
    id: 'otros',
    label: '🛠️ Otras Especialidades (SST, Legal, Coaches)',
    shortLabel: 'Otras Áreas',
    icon: '🛠️',
    filter: (u) => ['tecnico_sst', 'legal', 'entrenador', 'marketing', 'entrenador_llamadas'].includes(normalizeRole(u.role))
  }
];

export const getSedeFlag = (sede) => {
  if (!sede) return '🌐';
  const s = sede.toLowerCase();
  if (s.includes('quito') || s.includes('cuenca') || s.includes('guayaquil') || s.includes('uio') || s.includes('cue') || s.includes('gye')) return '🇪🇨';
  if (s.includes('lima') || s.includes('lim')) return '🇵🇪';
  if (s.includes('medell') || s.includes('med')) return '🇨🇴';
  if (s.includes('mex') || s.includes('cdmx')) return '🇲🇽';
  return '🌐';
};

export default function TaskAssignmentModal({ isOpen, onClose, prefilledUser = null, taskToEdit = null }) {
  const { currentUser } = useAuth();
  const { addCustomTask, editCustomTask } = useChecklist();

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
    priority: '🟡 AMARILLO'
  });

  const [selectedAreaId, setSelectedAreaId] = useState('todas');
  const [selectedSedeFilter, setSelectedSedeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedAreaId('todas');
      setSelectedSedeFilter('');
      setSearchQuery('');
      if (taskToEdit) {
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
          priority: taskToEdit.priority || '🟡 AMARILLO'
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
          priority: '🟡 AMARILLO'
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
  const canAssignSpecific = true; // Habilitado para todos por solicitud

  // Filtrado de usuarios según área, sede y buscador de texto
  const activeArea = OPERATIONAL_AREAS.find(a => a.id === selectedAreaId) || OPERATIONAL_AREAS[0];

  const visibleUsers = usersData.filter(u => {
    // 1. Filtro por Área
    if (!activeArea.filter(u)) return false;
    
    // 2. Filtro por Sede
    if (selectedSedeFilter && normalizeSede(u.sede) !== selectedSedeFilter) {
      return false;
    }

    // 3. Filtro por Búsqueda de Texto
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const roleName = (getRoleDisplayName(u.role) || '').toLowerCase();
      const sede = (normalizeSede(u.sede) || '').toLowerCase();
      return name.includes(q) || email.includes(q) || roleName.includes(q) || sede.includes(q);
    }

    return true;
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

    // Obtener sedes y roles automáticos a partir de los colaboradores seleccionados:
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
      isCritical: newTask.priority === '🔴 ROJO',
      isOptional: isOptional,
      periodicity: periodicity,
      createdBy: currentUser.email,
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
        priority: '🟡 AMARILLO'
      });
    }
    setIsSubmitting(false);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div className="glass-panel" style={{ 
        width: '100%', maxWidth: '780px', maxHeight: '92vh', overflowY: 'auto', padding: '1.8rem', 
        position: 'relative', border: '1px solid var(--crear-gold)' 
      }}>
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>

        <h3 className="text-gold" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Target size={20} /> {taskToEdit ? 'Editar Tarea' : (prefilledUser ? `Asignar Tarea a ${prefilledUser.name}` : 'Crear / Asignar Tarea')}
        </h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <input 
              type="text" 
              placeholder="Título de la tarea (Ej. Revisar métricas)" 
              value={newTask.title} 
              onChange={e => setNewTask({...newTask, title: e.target.value})} 
              className="input-field" 
              style={{ width: '100%', marginBottom: '0.5rem' }}
              required 
              disabled={isSubmitting}
            />
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>⚡ Rápidas:</span>
              {['Llamar a seguimiento', 'Revisar métricas', 'Auditar salón', 'Feedback de Staff', 'Verificar asistencia'].map(qt => (
                <button
                  key={qt}
                  type="button"
                  onClick={() => setNewTask(prev => ({ ...prev, title: qt }))}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    color: 'var(--crear-cyan)',
                    cursor: 'pointer'
                  }}
                >
                  {qt}
                </button>
              ))}
            </div>
          </div>
          
          {/* BANDEJA DE COLABORADORES ASIGNADOS */}
          <div style={{
            gridColumn: '1 / -1',
            background: 'rgba(255, 215, 0, 0.04)',
            border: '1px solid rgba(255, 215, 0, 0.3)',
            borderRadius: '10px',
            padding: '0.85rem 1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: (newTask.assignedToEmails?.length > 0 ? '0.6rem' : 0), flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--crear-gold)' }}>
                <UserCheck size={16} />
                <span>🎯 Colaboradores Asignados ({newTask.assignedToEmails?.length || 0}):</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={assignToMe}
                  style={{
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid var(--crear-cyan)',
                    color: 'var(--crear-cyan)',
                    borderRadius: '6px',
                    padding: '3px 9px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  🙋‍♂️ Asignarme a mí
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
                      padding: '3px 9px',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    ✕ Limpiar selección
                  </button>
                )}
              </div>
            </div>

            {(!newTask.assignedToEmails || newTask.assignedToEmails.length === 0) ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.2rem 0' }}>
                ⚠️ No has seleccionado colaboradores individuales. Haz clic abajo en cualquier área para seleccionar los nombres específicos (ej. Karol de Contabilidad, CMJ de Quito, Gerente de Quito). Si no seleccionas a nadie, se asignará a tu usuario.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '120px', overflowY: 'auto', paddingTop: '2px' }}>
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
                        gap: '0.4rem',
                        background: 'rgba(0, 0, 0, 0.65)',
                        border: '1px solid var(--crear-gold)',
                        borderRadius: '16px',
                        padding: '3px 10px',
                        fontSize: '0.74rem',
                        color: '#ffffff'
                      }}
                    >
                      <span style={{ color: 'var(--crear-gold)', fontWeight: 700 }}>👤 {u?.name || email}</span>
                      {roleLabel && <span style={{ color: 'var(--crear-cyan)', fontSize: '0.68rem' }}>• {roleLabel}</span>}
                      {sedeLabel && <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>({flag} {sedeLabel})</span>}
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
                          fontSize: '0.85rem',
                          lineHeight: 1
                        }}
                        title="Quitar de la tarea"
                      >
                        ✕
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* SELECTOR INTERACTIVO POR ÁREAS, SEDES Y COLABORADORES */}
          <div style={{
            gridColumn: '1 / -1',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '0.9rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.7rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--crear-cyan)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Users size={16} />
                <span>Explorar Áreas y Seleccionar Colaboradores Individuales:</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Mostrando <strong style={{ color: '#ffffff' }}>{visibleUsers.length}</strong> colaboradores
              </div>
            </div>

            {/* 1. PESTAÑAS DE ÁREAS */}
            <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '4px' }}>
              {OPERATIONAL_AREAS.map(area => {
                const isAreaActive = selectedAreaId === area.id;
                const areaUsers = usersData.filter(area.filter);
                const selectedCountInArea = areaUsers.filter(u => newTask.assignedToEmails?.some(em => em.toLowerCase() === u.email?.toLowerCase())).length;

                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => setSelectedAreaId(area.id)}
                    style={{
                      flexShrink: 0,
                      padding: '0.35rem 0.65rem',
                      borderRadius: '8px',
                      fontSize: '0.73rem',
                      fontWeight: isAreaActive ? 700 : 500,
                      cursor: 'pointer',
                      background: isAreaActive ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.25) 0%, rgba(255, 215, 0, 0.08) 100%)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${isAreaActive ? 'var(--crear-gold)' : 'rgba(255, 255, 255, 0.1)'}`,
                      color: isAreaActive ? 'var(--crear-gold)' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span>{area.icon}</span>
                    <span>{area.shortLabel || area.label}</span>
                    {selectedCountInArea > 0 && (
                      <span style={{
                        background: 'var(--crear-gold)',
                        color: '#000000',
                        borderRadius: '10px',
                        padding: '0 5px',
                        fontSize: '0.65rem',
                        fontWeight: 900
                      }}>
                        {selectedCountInArea}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 2. FILTRO DE SEDE Y BUSCADOR */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) minmax(200px, 1.4fr)', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>📍 Sede:</span>
                <select
                  value={selectedSedeFilter}
                  onChange={e => setSelectedSedeFilter(e.target.value)}
                  className="input-field"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', width: '100%' }}
                >
                  <option value="">Todas las Sedes</option>
                  {OPERATIONAL_SEDES.map(s => (
                    <option key={s} value={s}>{getSedeFlag(s)} {s}</option>
                  ))}
                </select>
              </div>

              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Buscar persona (ej. Karol, Erika, Emily)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', paddingLeft: '26px', paddingRight: '20px', fontSize: '0.72rem' }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                      background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* ACCIONES DE SELECCIÓN VISIBLE */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.35rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>
                {activeArea.label} {selectedSedeFilter ? `• Sede ${selectedSedeFilter}` : ''}
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

            {/* 3. GRILLA DE COLABORADORES CLICABLES */}
            <div style={{
              maxHeight: '190px',
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
              gap: '0.4rem',
              paddingRight: '4px'
            }}>
              {visibleUsers.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  No se encontraron colaboradores con los filtros seleccionados.
                </div>
              ) : (
                visibleUsers.map(u => {
                  const isSelected = newTask.assignedToEmails?.some(em => em.toLowerCase() === u.email?.toLowerCase());
                  const roleDisplay = getRoleDisplayName(u.role);
                  const sedeDisplay = normalizeSede(u.sede);
                  const flag = getSedeFlag(sedeDisplay);

                  return (
                    <div
                      key={u.email}
                      onClick={() => toggleUserSelection(u.email)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '8px',
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
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.76rem',
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? '#ffffff' : 'var(--text-heading)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {u.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                          <span style={{ color: isSelected ? 'var(--crear-cyan)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {roleDisplay}
                          </span>
                          <span>•</span>
                          <span style={{ whiteSpace: 'nowrap' }}>{flag} {sedeDisplay}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Prioridad:</label>
              <select 
                value={newTask.priority} 
                onChange={e => setNewTask({...newTask, priority: e.target.value})} 
                className="input-field" 
                style={{ width: '100%' }}
                disabled={isSubmitting}
              >
                <option value="🟡 AMARILLO">Normal (Amarillo)</option>
                <option value="🔴 ROJO">Urgente/Crítica (Rojo)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Rol General (opcional si no hay asignados):</label>
              <select 
                value={newTask.role} 
                onChange={e => setNewTask({...newTask, role: e.target.value})} 
                className="input-field" 
                style={{ width: '100%' }}
                disabled={isSubmitting}
              >
                {assignableRoles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--crear-gold)', marginBottom: '0.4rem', fontWeight: 'bold' }}>
                📅 Plazo / Fecha Límite Rápida:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setNewTask(prev => ({ ...prev, deadlineDate: getTodayStr(), deadlineTime: '18:00' }))}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    border: '1px solid var(--crear-gold)',
                    background: newTask.deadlineDate === getTodayStr() ? 'var(--crear-gold)' : 'rgba(255,183,3,0.1)',
                    color: newTask.deadlineDate === getTodayStr() ? '#000' : 'var(--text-heading)',
                    cursor: 'pointer'
                  }}
                >
                  ⚡ Hoy (18:00)
                </button>
                <button
                  type="button"
                  onClick={() => setNewTask(prev => ({ ...prev, deadlineDate: getTomorrowStr(), deadlineTime: '12:00' }))}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    border: '1px solid var(--crear-cyan)',
                    background: newTask.deadlineDate === getTomorrowStr() ? 'var(--crear-cyan)' : 'rgba(0,212,255,0.1)',
                    color: newTask.deadlineDate === getTomorrowStr() ? '#000' : 'var(--text-heading)',
                    cursor: 'pointer'
                  }}
                >
                  🌅 Mañana (12:00)
                </button>
                <button
                  type="button"
                  onClick={() => setNewTask(prev => ({ ...prev, deadlineDate: getInDaysStr(3), deadlineTime: '18:00' }))}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: newTask.deadlineDate === getInDaysStr(3) ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.05)',
                    color: 'var(--text-heading)',
                    cursor: 'pointer'
                  }}
                >
                  🗓️ En 3 días
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <input type="date" value={newTask.deadlineDate} onChange={e => setNewTask({...newTask, deadlineDate: e.target.value})} className="input-field" style={{ width: '100%' }} required disabled={isSubmitting} />
                </div>
                <div>
                  <input type="time" value={newTask.deadlineTime} onChange={e => setNewTask({...newTask, deadlineTime: e.target.value})} className="input-field" style={{ width: '100%' }} required disabled={isSubmitting} />
                </div>
              </div>
            </div>

            {/* 📝 NOTAS / INSTRUCCIONES DE LA TAREA */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--crear-gold)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  📝 Notas / Instrucciones de la Tarea:
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Opcional • Se notificará al colaborador
                </span>
              </div>
              <textarea
                rows={3}
                placeholder="Escribe aquí las instrucciones específicas, acuerdos, contexto o detalles para quien realice la tarea..."
                value={newTask.notes}
                onChange={e => setNewTask({ ...newTask, notes: e.target.value })}
                className="input-field"
                style={{
                  width: '100%',
                  minHeight: '76px',
                  resize: 'vertical',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  lineHeight: '1.45',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 215, 0, 0.35)',
                  color: '#ffffff',
                  fontFamily: 'inherit'
                }}
                disabled={isSubmitting}
              />
              {/* Sugerencias Rápidas para Notas */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                {[
                  '⚡ Prioritario para este ciclo',
                  '📞 Coordinar llamada con el equipo',
                  '📎 Adjuntar comprobante / link de Drive',
                  '⚠️ Validar antes de cierre operativo'
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setNewTask(prev => {
                        const current = (prev.notes || '').trim();
                        const addition = chip.replace(/^[^\w\s]+/, '').trim();
                        const newText = current ? `${current}\n• ${addition}` : `• ${addition}`;
                        return { ...prev, notes: newText };
                      });
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px dashed rgba(255, 215, 0, 0.35)',
                      color: 'var(--crear-gold)',
                      borderRadius: '12px',
                      padding: '0.2rem 0.55rem',
                      fontSize: '0.7rem',
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

            {/* OPCIONES ADICIONALES: OPCIONALES Y PERIÓDICAS */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-heading)', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={isOptional} 
                  onChange={e => setIsOptional(e.target.checked)} 
                  style={{ accentColor: 'var(--crear-gold)' }}
                />
                <span>✨ Tarea Opcional / Recomendada (No bloqueante)</span>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-heading)', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={periodicity !== 'UNICA'} 
                  onChange={e => setPeriodicity(e.target.checked ? 'DIARIA' : 'UNICA')} 
                  style={{ accentColor: 'var(--crear-cyan)' }}
                />
                <span>🔄 Tarea Periódica / Recurrente</span>
              </label>

              {periodicity !== 'UNICA' && (
                <select
                  value={periodicity}
                  onChange={e => setPeriodicity(e.target.value)}
                  className="input-field"
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderColor: 'var(--crear-cyan)' }}
                >
                  <option value="DIARIA">Frecuencia: Diaria</option>
                  <option value="SEMANAL">Frecuencia: Semanal</option>
                  <option value="POR_CICLO">Frecuencia: Por Cada Ciclo Operativo</option>
                </select>
              )}
            </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : (taskToEdit ? '💾 Guardar Cambios' : '⚡ Guardar Tarea')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
