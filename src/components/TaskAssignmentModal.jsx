import { useState, useEffect } from 'react';
import { Target, X, Zap, Calendar, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChecklist } from '../context/ChecklistContext';
import { getAssignableRoles } from '../config/permissions';
import { usersData, normalizeRole, normalizeSede, OPERATIONAL_SEDES, getRoleDisplayName } from '../data/usersData';
import { recordAuditEvent } from '../services/auditService';

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
    role: currentUser?.appRole || 'gerente',
    deadlineDate: getTodayStr(),
    deadlineTime: '18:00',
    assignedToEmails: [],
    assignedRoles: [],
    assignedSede: currentUser?.sede || '',
    priority: '🟡 AMARILLO'
  });

  useEffect(() => {
    if (isOpen) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!newTask.title.trim()) return;
    setIsSubmitting(true);
    
    const finalRole = newTask.role || currentUser?.appRole || 'general';
    const finalDate = newTask.deadlineDate || getTodayStr();
    const finalTime = newTask.deadlineTime || '18:00';
    const deadlineISO = new Date(`${finalDate}T${finalTime}:00`).toISOString();
    
    const assignedEmails = canAssignSpecific ? (newTask.assignedToEmails?.length > 0 ? newTask.assignedToEmails : [currentUser?.email]) : (prefilledUser?.email ? [prefilledUser.email] : [currentUser?.email]);

    // Inicializar mapa de seguimiento individual en una sola tarjeta:
    const assigneeProgress = {};
    assignedEmails.forEach(email => {
      const u = usersData.find(usr => usr.email?.toLowerCase() === email.toLowerCase());
      assigneeProgress[email] = {
        name: u?.name || email,
        role: u?.role || finalRole || 'colaborador',
        sede: u?.sede || newTask.assignedSede || currentUser?.sede || 'Global',
        completed: false,
        completedAt: null,
        progress: 0
      };
    });

    const taskData = {
      task: newTask.title.trim(),
      role: finalRole,
      deadline: deadlineISO,
      priority: newTask.priority,
      isCritical: newTask.priority === '🔴 ROJO',
      isOptional: isOptional,
      periodicity: periodicity,
      createdBy: currentUser.email,
      assignedToEmails: assignedEmails,
      assignedRoles: newTask.assignedRoles || [],
      assignedSede: canAssignSpecific ? (newTask.assignedSede || currentUser?.sede || 'Global') : (prefilledUser?.sede || currentUser?.sede || 'Global'),
      assigneeProgress: assigneeProgress
    };

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
        role: currentUser?.appRole || 'gerente',
        deadlineDate: getTodayStr(),
        deadlineTime: '18:00',
        assignedToEmails: [],
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
        width: '100%', maxWidth: '600px', padding: '2rem', 
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
          
          {/* ASIGNACIÓN A VARIAS ÁREAS DE UNA SOLA VEZ */}
          <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--crear-gold)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              ⚡ Asignar a Varias Áreas de una sola vez:
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {[
                { id: 'gerentes', label: '🏢 Todos los Gerentes', filter: u => normalizeRole(u.role) === 'gerente' },
                { id: 'c1', label: '🌟 Coordinadores C1', filter: u => normalizeRole(u.role) === 'coord_c1' },
                { id: 'mj', label: '🏆 Coordinadores MJ', filter: u => ['coord_maestria', 'coordinador_mj'].includes(normalizeRole(u.role)) },
                { id: 'qt', label: '⚡ Quantum Team', filter: u => normalizeRole(u.role) === 'qt' },
                { id: 'finanzas', label: '📊 Finanzas / Contabilidad', filter: u => ['cfo', 'finanzas', 'asistente_impuestos_quito'].includes(normalizeRole(u.role)) },
                { id: 'th', label: '👥 Talento Humano', filter: u => ['talento_humano', 'director_th'].includes(normalizeRole(u.role)) }
              ].map(area => {
                const matchingEmails = usersData.filter(area.filter).map(u => u.email);
                const isAllSelected = matchingEmails.length > 0 && matchingEmails.every(em => newTask.assignedToEmails?.includes(em));
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => {
                      if (isAllSelected) {
                        setNewTask(prev => ({
                          ...prev,
                          assignedToEmails: prev.assignedToEmails.filter(em => !matchingEmails.includes(em))
                        }));
                      } else {
                        setNewTask(prev => ({
                          ...prev,
                          assignedToEmails: [...new Set([...(prev.assignedToEmails || []), ...matchingEmails])]
                        }));
                      }
                    }}
                    style={{
                      padding: '0.3rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      background: isAllSelected ? 'var(--crear-gold)' : 'rgba(255,255,255,0.06)',
                      color: isAllSelected ? '#000000' : 'var(--text-heading)',
                      border: `1px solid ${isAllSelected ? 'var(--crear-gold)' : 'rgba(255,255,255,0.15)'}`
                    }}
                  >
                    {isAllSelected ? '✓ ' : '+ '} {area.label} ({matchingEmails.length})
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Asignar a Rol:</label>
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

            {canAssignSpecific && (
              <>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--crear-cyan)', margin: 0 }}>Asignar a Colaborador(es) (Ctrl/Cmd + Click para varios):</label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewTask(prev => ({
                          ...prev,
                          role: currentUser?.appRole || 'gerente',
                          assignedToEmails: [currentUser?.email],
                          assignedSede: currentUser?.sede || ''
                        }));
                      }}
                      style={{
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid var(--crear-cyan)',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        fontSize: '0.7rem',
                        color: 'var(--crear-cyan)',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      🙋‍♂️ Asignarme a mí
                    </button>
                  </div>
                  <select 
                    multiple
                    value={newTask.assignedToEmails || []} 
                    onChange={e => {
                      const options = [...e.target.selectedOptions];
                      const values = options.map(opt => opt.value).filter(val => val !== "");
                      setNewTask({...newTask, assignedToEmails: values});
                    }} 
                    className="input-field" 
                    style={{ width: '100%', borderColor: 'var(--crear-cyan)', minHeight: '80px' }} 
                    disabled={isSubmitting}
                  >
                    <option value="">Cualquiera en este Rol (No específico)</option>
                    {usersData
                      .filter(u => newTask.role === 'todos' || normalizeRole(u.role) === newTask.role || u.role === newTask.role)
                      // (02/09/2026) FIX: este filtro solo miraba el rol e ignoraba
                      // "Sede Específica" por completo — seleccionar Lima seguía
                      // mostrando colaboradores de todas las sedes. Ahora, si hay
                      // una sede elegida, solo se listan los de esa sede (con
                      // "Cualquier Sede / Global" no se filtra, se ve el rol completo).
                      .filter(u => !newTask.assignedSede || normalizeSede(u.sede) === newTask.assignedSede)
                      .map(u => (
                        <option key={u.email} value={u.email}>{u.name} ({u.email})</option>
                      ))
                    }
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--crear-cyan)', marginBottom: '0.3rem' }}>Sede Específica:</label>
                  <select 
                    value={newTask.assignedSede || ''} 
                    onChange={e => setNewTask({...newTask, assignedSede: e.target.value})} 
                    className="input-field" 
                    style={{ width: '100%', borderColor: 'var(--crear-cyan)' }} 
                    disabled={isSubmitting}
                  >
                    <option value="">Cualquier Sede / Global</option>
                    {OPERATIONAL_SEDES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

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
