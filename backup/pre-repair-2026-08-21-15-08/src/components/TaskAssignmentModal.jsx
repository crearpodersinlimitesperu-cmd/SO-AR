import { useState, useEffect } from 'react';
import { Target, X, Zap, Calendar, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChecklist } from '../context/ChecklistContext';
import { getAssignableRoles } from '../config/permissions';
import { usersData, normalizeRole, OPERATIONAL_SEDES, getRoleDisplayName } from '../data/usersData';
import { recordAuditEvent } from '../services/auditService';

export default function TaskAssignmentModal({ isOpen, onClose, prefilledUser = null }) {
  const { currentUser } = useAuth();
  const { addCustomTask } = useChecklist();

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

  const [newTask, setNewTask] = useState({
    title: '',
    role: currentUser?.appRole || 'gerente',
    deadlineDate: getTodayStr(),
    deadlineTime: '18:00',
    assignedToEmail: '',
    assignedSede: currentUser?.sede || '',
    priority: '🟡 AMARILLO'
  });

  useEffect(() => {
    if (isOpen) {
      if (prefilledUser) {
        setNewTask({
          title: '',
          role: normalizeRole(prefilledUser.role) || prefilledUser.role || currentUser?.appRole || 'gerente',
          deadlineDate: getTodayStr(),
          deadlineTime: '18:00',
          assignedToEmail: prefilledUser.email || '',
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
  }, [isOpen, prefilledUser, currentUser]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const assignableRoles = getAssignableRoles(currentUser);
  const canAssignSpecific = true; // Habilitado para todos por solicitud

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    setIsSubmitting(true);
    
    const finalRole = newTask.role || currentUser?.appRole || 'general';
    const finalDate = newTask.deadlineDate || getTodayStr();
    const finalTime = newTask.deadlineTime || '18:00';
    const deadlineISO = new Date(`${finalDate}T${finalTime}:00`).toISOString();
    
    const taskData = {
      task: newTask.title.trim(),
      role: finalRole,
      deadline: deadlineISO,
      priority: newTask.priority,
      isCritical: newTask.priority === '🔴 ROJO',
      createdBy: currentUser.email,
      assignedToEmail: canAssignSpecific ? (newTask.assignedToEmail || currentUser?.email) : (prefilledUser?.email || currentUser?.email || ''),
      assignedSede: canAssignSpecific ? (newTask.assignedSede || currentUser?.sede || 'Global') : (prefilledUser?.sede || currentUser?.sede || 'Global')
    };

    const success = await addCustomTask(taskData);
    
    if (success) {
      try {
        await recordAuditEvent({
          action: 'NUEVA_TAREA_CREADA',
          user: currentUser,
          details: {
            taskTitle: newTask.title.trim(),
            assignedRole: finalRole,
            assignedEmail: taskData.assignedToEmail,
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
        assignedToEmail: '',
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
          <Target size={20} /> {prefilledUser ? `Asignar Tarea a ${prefilledUser.name}` : 'Crear / Asignar Tarea'}
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
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--crear-cyan)', marginBottom: '0.3rem' }}>Asignar a Colaborador Específico (Opcional):</label>
                  <select 
                    value={newTask.assignedToEmail || ''} 
                    onChange={e => setNewTask({...newTask, assignedToEmail: e.target.value})} 
                    className="input-field" 
                    style={{ width: '100%', borderColor: 'var(--crear-cyan)' }} 
                    disabled={isSubmitting}
                  >
                    <option value="">Cualquiera en este Rol (No específico)</option>
                    {usersData
                      .filter(u => normalizeRole(u.role) === newTask.role || u.role === newTask.role)
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
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : '⚡ Guardar Tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
