import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCycles } from '../../context/CyclesContext';
import { useChecklist } from '../../context/ChecklistContext';
import { AlertCircle, Circle, CheckCircle2, Target, Send, Users, Activity } from 'lucide-react';
import { calculateAutomaticDeadline } from '../../utils/soarDates';

export default function HomeOficina() {
  const { currentUser } = useAuth();
  const { currentCycle, currentStage } = useCycles();
  const { tasks: allTasks, loading: loadingTasks } = useChecklist();
  const navigate = useNavigate();

  const myTasks = allTasks.filter(t => t.role === currentUser?.appRole);
  
  // Contadores
  const completed = myTasks.filter(t => t.completed || t.status === 'Completada').length;
  const criticas = myTasks.filter(t => !t.completed && (t.isCritical || t.priority === '🔴 ROJO')).length;
  const importantes = myTasks.filter(t => !t.completed && t.status !== 'Completada' && !t.isCritical && t.priority !== '🔴 ROJO').length;

  // Tareas top
  const pendingTasks = myTasks.filter(t => !t.completed && t.status !== 'Completada' && t.status !== 'Pendiente de validación');
  pendingTasks.sort((a, b) => {
    const valA = (a.isCritical || a.priority === '🔴 ROJO') ? 3 : (a.priority === '🟡 AMARILLO' ? 2 : 1);
    const valB = (b.isCritical || b.priority === '🔴 ROJO') ? 3 : (b.priority === '🟡 AMARILLO' ? 2 : 1);
    return valB - valA;
  });
  const topTasks = pendingTasks.slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Saludo y Contexto */}
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="text-white" style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>
            Hola, {currentUser?.displayName?.split(' ')[0] || 'Coordinador'}
          </h2>
          <p className="text-muted" style={{ margin: 0 }}>
            Fase Actual: <strong className="text-white">{currentStage}</strong> | Sede: <strong className="text-white">{currentUser?.sede}</strong>
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,215,0,0.1)', color: 'var(--crear-gold)', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 'bold' }}>
            <Activity size={18} /> MODO OFICINA
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* RESUMEN DE CHECKLIST */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 className="text-blue" style={{ marginTop: 0, borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} /> Resumen de Checklist
          </h3>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li 
              onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=criticas`)}
              style={{ padding: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: 'var(--color-error)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}
            >
              <AlertCircle size={18} /> <strong>{criticas}</strong> críticas (Requieren acción hoy)
            </li>
            <li 
              onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=importantes`)}
              style={{ padding: '0.8rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', color: '#ffb347', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}
            >
              <Circle size={18} /> <strong>{importantes}</strong> importantes
            </li>
            <li 
              onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=completed`)}
              style={{ padding: '0.8rem', background: 'rgba(52, 168, 83, 0.1)', borderRadius: '8px', color: 'var(--color-success)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(52, 168, 83, 0.2)' }}
            >
              <CheckCircle2 size={18} /> <strong>{completed}</strong> completadas
            </li>
          </ul>

          <button onClick={() => navigate(`/checklist/${currentUser?.appRole}`)} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            IR A MI CHECKLIST OPERATIVO
          </button>
        </div>

        {/* TU PRIORIDAD */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 className="text-gold" style={{ marginTop: 0, borderBottom: '1px solid rgba(255,215,0,0.2)', paddingBottom: '0.5rem' }}>
            Tu Prioridad (Top 3)
          </h3>
          
          {loadingTasks ? (
            <p className="text-muted">Buscando tareas urgentes...</p>
          ) : topTasks.length === 0 ? (
             <p className="text-muted" style={{ padding: '1rem 0' }}>No tienes tareas urgentes pendientes. ¡Buen trabajo!</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {topTasks.map(task => {
                const isCrit = task.isCritical || task.priority === '🔴 ROJO';
                const color = isCrit ? 'var(--color-error)' : 'var(--crear-blue)';
                
                return (
                  <li 
                    key={task.id}
                    onClick={() => navigate(`/checklist/${currentUser?.appRole}`)}
                    style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.8rem', border: `1px solid ${color}33` }}
                  >
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }}></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="text-white" style={{ fontSize: '0.9rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.task || task.title}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--crear-gold)', fontWeight: 'bold' }}>
                        ⏰ Límite: {task.deadline || calculateAutomaticDeadline(task, currentCycle)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

      </div>

      {/* ACCESOS DIRECTOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel hover-glow" onClick={() => navigate('/metas')} style={{ padding: '1.5rem', textAlign: 'center', cursor: 'pointer' }}>
          <Target size={32} color="var(--crear-gold)" style={{ margin: '0 auto 0.5rem' }} />
          <h4 className="text-white" style={{ margin: '0 0 0.5rem' }}>Mis Metas</h4>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Revisa avance Px y Aliados</p>
        </div>
        <div className="glass-panel hover-glow" onClick={() => navigate('/reportes')} style={{ padding: '1.5rem', textAlign: 'center', cursor: 'pointer' }}>
          <Send size={32} color="var(--crear-blue)" style={{ margin: '0 auto 0.5rem' }} />
          <h4 className="text-white" style={{ margin: '0 0 0.5rem' }}>Reportes</h4>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Evidencias y estado general</p>
        </div>
      </div>
    </div>
  );
}
