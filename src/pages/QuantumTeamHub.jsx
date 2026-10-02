import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getQTCronogramaActual, getQTChecklists, getQTQuickTasks, toggleQTTask } from '../services/qtService';
import ChecklistBoard from './ChecklistBoard';
import { qtKpis } from '../data/qtKpis';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { toast } from 'react-hot-toast';
import { 
  Zap, Clock, CheckSquare, AlertTriangle, 
  ChevronLeft, MessageCircle, ChevronDown, ChevronRight, Speaker, ListTodo
} from 'lucide-react';

export default function QuantumTeamHub() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [schedule, setSchedule] = useState(null);
  const [checklists, setChecklists] = useState([]);
  const [quickTasks, setQuickTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLegacy, setShowLegacy] = useState(false);

  useEffect(() => {
    async function loadData() {
      const s = await getQTCronogramaActual(currentUser?.sede);
      const c = await getQTChecklists();
      const q = await getQTQuickTasks();
      setSchedule(s);
      setChecklists(c);
      setQuickTasks(q);
      setLoading(false);
    }
    loadData();
  }, [currentUser]);

  const handleToggleChecklist = async (task) => {
    const result = await toggleQTTask(task.id, task.isCompleted, task.isTrap);
    
    if (result.trapTriggered) {
      toast.error('¡Fallo de Atención! Has marcado una tarea trampa. Se ha reportado a Gerencia.', { icon: '🚨', duration: 4000 });
      // Se marca pero genera reporte.
    } else {
      toast.success(task.isCompleted ? 'Tarea desmarcada' : '¡Excelente! Tarea completada.');
    }

    setChecklists(prev => prev.map(t => t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t));
  };

  const handlePanicButton = () => {
    toast('Alerta enviada a Gerencia. Espere soporte en sala.', { icon: '🆘', style: { background: '#ef4444', color: '#fff', fontWeight: 'bold' }});
  };

  if (loading) return <div style={{ padding: '2rem', color: '#fff' }}>Cargando Panel de Boxes QT...</div>;

  const pendingQuickTasks = quickTasks.filter(q => q.status === 'PENDING');

  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: '#f8fafc', fontFamily: 'var(--font-body)', paddingBottom: '5rem' }}>
      
      {/* HEADER MOBILE-FIRST (Alto contraste) */}
      <div style={{ background: '#111827', padding: '1.2rem', borderBottom: '1px solid #374151', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <button onClick={() => navigate('/home')} style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '8px' }}>
              <ChevronLeft size={28} />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.5px' }}>
                <Zap size={22} color="#f59e0b" fill="#f59e0b" /> QT PIT-STOP
              </h1>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>En Operación: {schedule?.evento}</p>
            </div>
          </div>
          <button onClick={handlePanicButton} style={{ background: '#ef4444', border: 'none', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)', cursor: 'pointer' }}>
            <AlertTriangle size={24} color="#fff" />
          </button>
        </div>
      </div>

      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px', margin: '0 auto' }}>
        
        {/* BLOQUE 1: CRONOGRAMA ACTUAL (Zen Mode) */}
        <div style={{ background: '#1e293b', borderRadius: '16px', padding: '1.5rem', border: '2px solid #334155' }}>
          <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Speaker size={16} /> Ahora en Salón
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', lineHeight: '1.2', marginBottom: '8px' }}>
            {schedule?.actividadActual}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid #374151', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.9rem' }}>
              <Clock size={16} /> Fin est.: {schedule?.horaFin}
            </div>
            <div style={{ color: '#f59e0b', fontSize: '0.9rem', fontWeight: 700 }}>
              Temp Obj: {schedule?.temperaturaSala}
            </div>
          </div>
        </div>

        {/* BLOQUE 2: ÓRDENES RÁPIDAS (Quick Tasks) */}
        {pendingQuickTasks.length > 0 && (
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', borderRadius: '16px', border: '1px solid #f59e0b', overflow: 'hidden' }}>
            <div style={{ background: '#f59e0b', color: '#000', padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageCircle size={18} /> Órdenes Entrantes ({pendingQuickTasks.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {pendingQuickTasks.map(qt => (
                <div key={qt.id} style={{ padding: '1rem', borderBottom: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <div style={{ fontSize: '0.8rem', color: '#fcd34d', marginBottom: '4px', fontWeight: 700 }}>De: {qt.from}</div>
                  <div style={{ fontSize: '1rem', color: '#fff', fontWeight: 600, lineHeight: '1.4' }}>{qt.message}</div>
                  <button style={{ marginTop: '12px', width: '100%', background: '#f59e0b', color: '#000', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '1rem', fontWeight: 800, minHeight: '48px', cursor: 'pointer' }}>
                    Aceptar y Ejecutar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BLOQUE 3: CHECKLISTS DINÁMICOS DE PISO */}
        <div style={{ background: '#111827', borderRadius: '16px', border: '1px solid #1f2937' }}>
          <div style={{ padding: '1.2rem', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={20} color="#3b82f6" />
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Logística de Sala</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {checklists.map((task, idx) => (
              <div 
                key={task.id} 
                onClick={() => handleToggleChecklist(task)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '12px', 
                  padding: '1.2rem', 
                  borderBottom: idx === checklists.length - 1 ? 'none' : '1px solid #1f2937',
                  background: task.isCompleted ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                  cursor: 'pointer',
                  minHeight: '64px' // High mobility tap target
                }}
              >
                <div style={{ 
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '6px', 
                  border: task.isCompleted ? 'none' : '2px solid #475569', 
                  background: task.isCompleted ? '#10b981' : 'transparent',
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  {task.isCompleted && <CheckSquare size={18} color="#000" />}
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '4px' }}>{task.category}</div>
                  <div style={{ 
                    fontSize: '1rem', 
                    color: task.isCompleted ? '#64748b' : '#fff', 
                    textDecoration: task.isCompleted ? 'line-through' : 'none',
                    lineHeight: '1.4',
                    fontWeight: task.isCompleted ? 400 : 600
                  }}>
                    {task.task}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        
        {/* BLOQUE KPI (Oculto a menos que haya KPIs para este correo) */}
        {qtKpis[currentUser?.email] && (
          <div style={{ background: '#1e1b4b', borderRadius: '16px', border: '1px solid #4f46e5', padding: '1.5rem', marginTop: '1rem' }}>
            <h2 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '1.2rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>📊 Mis KPIs de Piso</span>
              <span style={{ fontSize: '0.85rem', background: '#3730a3', padding: '4px 10px', borderRadius: '12px' }}>{qtKpis[currentUser?.email].evento}</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem' }}>
              {Object.entries(qtKpis[currentUser?.email].metrics).map(([key, val]) => (
                <div key={key} style={{ background: '#111827', padding: '0.8rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ color: '#818cf8', fontSize: '0.75rem', fontWeight: 800 }}>{key}</div>
                  <div style={{ color: key === 'PP' ? '#10b981' : '#fff', fontSize: '1.2rem', fontWeight: 900, marginTop: '4px' }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADMIN OVERRIDE PARA ENVIAR MAILS */}
        {currentUser?.isSuperAdmin && (
          <button 
            onClick={async () => {
              for (const [email, person] of Object.entries(qtKpis)) {
                await addDoc(collection(db, 'mail'), {
                  to: email,
                  message: {
                    subject: `[Feedback QT] Reporte Oficial ${person.evento} - ${person.name}`,
                    html: `<p>Hola <strong>${person.name}</strong>,</p><p>Te compartimos los KPIs oficiales de tu gestion en piso para el entrenamiento <strong>${person.evento}</strong>. Entra a Causa OS (Hub Operativo QT) para revisarlos a detalle.</p><p>Tu conversion (PP): <strong>${person.metrics.PP}</strong></p>`
                  },
                  createdAt: serverTimestamp()
                });
                toast.success(`Correo encolado para ${person.name}`);
              }
            }}
            style={{ marginTop: '1rem', background: '#ef4444', color: '#fff', padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Administrador: Disparar Correos QT a Cola (Nodemailer)
          </button>
        )}

        {/* BLOQUE 4: LEGACY WRAPPER */}
        <div style={{ marginTop: '1rem' }}>
          <button 
            onClick={() => setShowLegacy(!showLegacy)}
            style={{ width: '100%', background: '#0f172a', border: '1px solid #1e293b', color: '#94a3b8', padding: '1.2rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', minHeight: '60px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ListTodo size={20} /> Tareas Históricas (Legacy)
            </div>
            {showLegacy ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
          {showLegacy && (
            <div style={{ marginTop: '1rem', background: '#000', borderRadius: '16px', border: '1px solid #1e293b', padding: '1rem' }}>
              <p style={{ fontSize: '0.8rem', color: '#ef4444', textAlign: 'center', marginBottom: '1rem' }}>Identidad fusionada correctamente. Mostrando histórico.</p>
              <ChecklistBoard />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
