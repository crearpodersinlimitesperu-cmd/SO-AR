import { useState, useEffect } from 'react';
import { Target, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChecklist } from '../context/ChecklistContext';
import { getAssignableRoles } from '../config/permissions';
import { normalizeRole } from '../data/usersData';

export default function TaskAssignmentModal({ isOpen, onClose, prefilledUser = null }) {
  const { currentUser } = useAuth();
  const { addCustomTask } = useChecklist();

  const [newTask, setNewTask] = useState({
    title: '',
    role: currentUser?.appRole || 'capitan',
    deadlineDate: '',
    deadlineTime: '18:00',
    assignedToEmail: '',
    assignedSede: '',
    priority: '🟡 AMARILLO'
  });

  useEffect(() => {
    if (isOpen && prefilledUser) {
      setNewTask(prev => ({
        ...prev,
        role: normalizeRole(prefilledUser.role) || prefilledUser.role || prev.role,
        assignedToEmail: prefilledUser.email || '',
        assignedSede: prefilledUser.sede || '',
      }));
    }
  }, [isOpen, prefilledUser]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const assignableRoles = getAssignableRoles(currentUser);
  const canAssignSpecific = currentUser?.isSuperAdmin || 
                            currentUser?.appRole === 'gerente' || 
                            currentUser?.appRole === 'direccion' || 
                            currentUser?.appRole === 'director_maestria';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const finalRole = newTask.role;
    const deadlineISO = new Date(`${newTask.deadlineDate}T${newTask.deadlineTime}:00`).toISOString();
    
    const taskData = {
      task: newTask.title,
      role: finalRole,
      deadline: deadlineISO,
      priority: newTask.priority,
      isCritical: newTask.priority === '🔴 ROJO',
      createdBy: currentUser.email,
      assignedToEmail: canAssignSpecific ? newTask.assignedToEmail : (prefilledUser?.email || ''),
      assignedSede: canAssignSpecific ? newTask.assignedSede : (prefilledUser?.sede || '')
    };

    const success = await addCustomTask(taskData);
    setIsSubmitting(false);
    
    if (success) {
      onClose();
      setNewTask({
        title: '',
        role: currentUser?.appRole || 'capitan',
        deadlineDate: '',
        deadlineTime: '18:00',
        assignedToEmail: '',
        assignedSede: '',
        priority: '🟡 AMARILLO'
      });
    }
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
          <input 
            type="text" 
            placeholder="Título de la tarea (Ej. Revisar métricas)" 
            value={newTask.title} 
            onChange={e => setNewTask({...newTask, title: e.target.value})} 
            className="input-field" 
            required 
            disabled={isSubmitting}
          />
          
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
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--crear-cyan)', marginBottom: '0.3rem' }}>[Admin/Gerente] Email Específico:</label>
                  <input type="email" placeholder="email@crearpsl.net" value={newTask.assignedToEmail || ''} onChange={e => setNewTask({...newTask, assignedToEmail: e.target.value})} className="input-field" style={{ width: '100%', borderColor: 'var(--crear-cyan)' }} disabled={isSubmitting} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--crear-cyan)', marginBottom: '0.3rem' }}>[Admin/Gerente] Sede:</label>
                  <input type="text" placeholder="Ej. Lima, Cuenca" value={newTask.assignedSede || ''} onChange={e => setNewTask({...newTask, assignedSede: e.target.value})} className="input-field" style={{ width: '100%', borderColor: 'var(--crear-cyan)' }} disabled={isSubmitting} />
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--crear-gold)', marginBottom: '0.3rem', fontWeight: 'bold' }}>📅 Fecha Límite:</label>
              <input type="date" value={newTask.deadlineDate} onChange={e => setNewTask({...newTask, deadlineDate: e.target.value})} className="input-field" style={{ width: '100%' }} required disabled={isSubmitting} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--crear-gold)', marginBottom: '0.3rem', fontWeight: 'bold' }}>⏰ Hora Límite:</label>
              <input type="time" value={newTask.deadlineTime} onChange={e => setNewTask({...newTask, deadlineTime: e.target.value})} className="input-field" style={{ width: '100%' }} required disabled={isSubmitting} />
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Asignar Tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
