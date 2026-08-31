import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCycles } from '../../context/CyclesContext';
import { useChecklist } from '../../context/ChecklistContext';
import { AlertCircle, Circle, CheckCircle2, MapPin, Activity, ListTodo } from 'lucide-react';
import { calculateAutomaticDeadline } from '../../utils/soarDates';

export default function HomeCampo() {
  const { currentUser } = useAuth();
  const { currentCycle, currentStage } = useCycles();
  const { tasks: allTasks, loading: loadingTasks } = useChecklist();
  const navigate = useNavigate();

  const myTasks = allTasks.filter(t => t.role === currentUser?.appRole);
  const pendingTasks = myTasks.filter(t => !t.completed && t.status !== 'Completada' && t.status !== 'Pendiente de validación');
  
  // Ordenar por prioridad (rojos primero)
  pendingTasks.sort((a, b) => {
    const valA = (a.isCritical || a.priority === '🔴 ROJO') ? 3 : (a.priority === '🟡 AMARILLO' ? 2 : 1);
    const valB = (b.isCritical || b.priority === '🔴 ROJO') ? 3 : (b.priority === '🟡 AMARILLO' ? 2 : 1);
    return valB - valA;
  });

  const topTasks = pendingTasks.slice(0, 3);
  const completed = myTasks.filter(t => t.completed || t.status === 'Completada').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
      {/* Saludo y Contexto */}
      <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid var(--crear-gold)' }}>
        <h2 className="text-white" style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>
          👋 Hola, {currentUser?.displayName?.split(' ')[0] || 'Equipo'}
        </h2>
        <p className="text-gold" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} /> MODO CAMPO ACTIVO
        </p>
        <p className="text-muted" style={{ margin: '0.5rem 0 0 0' }}>
          Fase Actual: <strong>{currentStage}</strong> | Sede: <strong>{currentUser?.sede}</strong>
        </p>
      </div>

      {/* LO QUE TOCA HOY */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 className="text-blue" style={{ marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.5rem' }}>
          <ListTodo size={20} /> QUÉ TOCA AHORA (Top 3)
        </h3>
        
        {loadingTasks ? (
          <p className="text-muted text-center" style={{ margin: '2rem 0' }}>Sincronizando tareas...</p>
        ) : topTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <CheckCircle2 size={48} color="var(--color-success)" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
            <p className="text-white" style={{ margin: '0 0 0.5rem', fontWeight: 'bold' }}>¡Estás al día!</p>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>No hay tareas urgentes pendientes para esta fase.</p>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {topTasks.map(task => {
              const isCrit = task.isCritical || task.priority === '🔴 ROJO';
              const color = isCrit ? 'var(--color-error)' : 'var(--crear-blue)';
              const bg = isCrit ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 212, 255, 0.1)';
              
              return (
                <li 
                  key={task.id}
                  onClick={() => navigate(`/checklist/${currentUser?.appRole}`)}
                  style={{ 
                    padding: '1.2rem', 
                    background: bg, 
                    borderRadius: '12px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    border: `1px solid ${color}33`,
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {isCrit ? <AlertCircle size={24} color={color} style={{ flexShrink: 0 }} /> : <Circle size={24} color={color} style={{ flexShrink: 0 }} />}
                  <div style={{ flex: 1 }}>
                    <span className="text-white" style={{ fontSize: '1.05rem', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>
                      {task.task || task.title}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--crear-gold)' }}>
                      ⏰ Límite: {task.deadline || calculateAutomaticDeadline(task, currentCycle)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* BOTÓN PRINCIPAL */}
      <button 
        className="btn-primary" 
        onClick={() => navigate(`/checklist/${currentUser?.appRole}`)} 
        style={{ padding: '1.2rem', fontSize: '1.2rem', borderRadius: '12px', boxShadow: '0 8px 16px rgba(0,0,0,0.3)' }}
      >
        IR A MI CHECKLIST OPERATIVO
      </button>

      {/* ESTADÍSTICA RÁPIDA */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, textAlign: 'center' }}>
          <p className="text-muted" style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Tareas Pendientes</p>
          <p className="text-white" style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{pendingTasks.length}</p>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, textAlign: 'center' }}>
          <p className="text-muted" style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Tareas Completadas</p>
          <p className="text-success" style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{completed}</p>
        </div>
      </div>
    </div>
  );
}
