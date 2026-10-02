import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getQTCronogramaActual, getQTChecklists, getQTQuickTasks, toggleQTTask } from '../services/qtService';
import ChecklistBoard from './ChecklistBoard';
import { qtKpis, qtKpisTotals } from '../data/qtKpis';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { toast } from 'react-hot-toast';
import { 
  Zap, Clock, CheckSquare, AlertTriangle, 
  ChevronLeft, MessageCircle, ChevronDown, ChevronRight, Speaker, ListTodo,
  Mail, Users, ExternalLink, BarChart3, Award
} from 'lucide-react';

export default function QuantumTeamHub() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [schedule, setSchedule] = useState(null);
  const [checklists, setChecklists] = useState([]);
  const [quickTasks, setQuickTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLegacy, setShowLegacy] = useState(false);
  const [selectedKpiPerson, setSelectedKpiPerson] = useState('ALL');
  const [sendingEmail, setSendingEmail] = useState(false);

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
    } else {
      toast.success(task.isCompleted ? 'Tarea desmarcada' : '¡Excelente! Tarea completada.');
    }

    setChecklists(prev => prev.map(t => t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t));
  };

  const handlePanicButton = () => {
    toast('Alerta enviada a Gerencia. Espere soporte en sala.', { 
      icon: '🆘', 
      style: { background: 'var(--color-danger, #ef4444)', color: '#fff', fontWeight: 'bold' }
    });
  };

  const handleSendKpiEmail = async (person) => {
    setSendingEmail(true);
    try {
      await addDoc(collection(db, 'mail'), {
        to: person.email,
        message: {
          subject: `[Oficial CREAR PSL] Reporte de Métricas y Feedback QT — ${person.evento} — ${person.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
              <h2 style="color: #002060;">CREAR Poder Sin Límites — Reporte Operativo QT</h2>
              <p>Hola <strong>${person.name}</strong>,</p>
              <p>Te compartimos los resultados consolidados de tu gestión en piso para el entrenamiento <strong>${person.evento}</strong>:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background: #f1f5f9;"><th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Métrica</th><th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">Resultado</th></tr>
                <tr><td style="padding: 8px; border: 1px solid #cbd5e1;">Participantes (PX Inicial):</td><td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;"><strong>${person.metrics.PX}</strong></td></tr>
                <tr><td style="padding: 8px; border: 1px solid #cbd5e1;">Desertores:</td><td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">${person.metrics.DESERTOR}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #cbd5e1;">PX Final:</td><td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;"><strong>${person.metrics.PX_FIN}</strong></td></tr>
                <tr><td style="padding: 8px; border: 1px solid #cbd5e1;">Declaración:</td><td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">${person.metrics.DECLARACION}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #cbd5e1;">Cierre C2:</td><td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">${person.metrics.C2}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #cbd5e1;">C2 + MJ:</td><td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">${person.metrics.C2_MJ}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #cbd5e1;">Fichas:</td><td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">${person.metrics.FICHA}</td></tr>
                <tr style="background: #e0f2fe;"><td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>Pagos Registrados:</strong></td><td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: #0284c7;"><strong>${person.metrics.PAGOS}</strong></td></tr>
                <tr style="background: #dcfce7;"><td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>Conversión (PP):</strong></td><td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: #15803d; font-size: 1.1em;"><strong>${person.metrics.PP}</strong></td></tr>
              </table>
              <p>Por favor revisa estos indicadores en el <strong>Hub Operativo de Causa OS</strong> y coordina con tu gerencia de sede cualquier observación.</p>
              <p style="font-size: 0.85em; color: #64748b;">Notificación automática emitida por Dirección Operativa CREAR PSL.</p>
            </div>
          `
        },
        createdAt: serverTimestamp()
      });
      toast.success(`Correo encolado exitosamente para ${person.name}`);
    } catch (e) {
      console.error(e);
      toast.error('No se pudo encolar el correo automático. Abriendo cliente local...');
    } finally {
      setSendingEmail(false);
    }

    // Direct mailto fallback
    const subject = encodeURIComponent(`[CREAR PSL] Reporte KPIs ${person.evento} - ${person.name}`);
    const body = encodeURIComponent(
      `Hola ${person.name},\n\nTe compartimos los KPIs oficiales de tu gestión en piso para ${person.evento}:\n` +
      `- PX: ${person.metrics.PX}\n- Desertores: ${person.metrics.DESERTOR}\n- PX Fin: ${person.metrics.PX_FIN}\n` +
      `- Declaración: ${person.metrics.DECLARACION}\n- C2: ${person.metrics.C2}\n- C2+MJ: ${person.metrics.C2_MJ}\n` +
      `- Fichas: ${person.metrics.FICHA}\n- Pagos: ${person.metrics.PAGOS}\n- Conversión (PP): ${person.metrics.PP}\n\n` +
      `Por favor revisa tu perfil en el Hub Operativo de Causa OS.\n\nAtentamente,\nDirección Operativa CREAR PSL`
    );
    window.open(`mailto:${person.email}?subject=${subject}&body=${body}`, '_blank');
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-heading)', background: 'var(--bg-dark)', minHeight: '100vh' }}>
        <Zap size={36} color="var(--crear-gold)" style={{ animation: 'spin 1.5s linear infinite', marginBottom: '1rem' }} />
        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>Cargando Panel de Boxes QT Pit-Stop...</div>
      </div>
    );
  }

  const pendingQuickTasks = quickTasks.filter(q => q.status === 'PENDING');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-main)', fontFamily: 'var(--font-body)', paddingBottom: '5rem' }}>
      
      {/* HEADER MOBILE-FIRST (Alto contraste adaptativo) */}
      <div style={{ background: 'var(--bg-card)', padding: '1.2rem', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, zIndex: 50, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <button onClick={() => navigate('/home')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px' }}>
              <ChevronLeft size={28} />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.5px' }}>
                <Zap size={22} color="var(--crear-gold)" fill="var(--crear-gold)" /> QT PIT-STOP
              </h1>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>En Operación: {schedule?.evento}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={() => navigate('/directorio-qt')}
              style={{ background: 'var(--bg-dark-alt)', border: '1px solid var(--border-strong)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Users size={14} /> Directorio
            </button>
            <button onClick={handlePanicButton} title="Botón de Pánico a Gerencia" style={{ background: '#ef4444', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)', cursor: 'pointer' }}>
              <AlertTriangle size={22} color="#fff" />
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', maxWidth: '800px', margin: '0 auto' }}>
        
        {/* BLOQUE DE KPIS OFICIALES DE SALA (C1E31 LIMA) */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-strong)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '1.2rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--crear-gold)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={16} /> Auditoría Oficial de Cierre
              </div>
              <h2 style={{ margin: '4px 0 0', fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-heading)' }}>
                KPIs Quantum Team — C1E31 Lima
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-dark-alt)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <button 
                onClick={() => setSelectedKpiPerson('ALL')}
                style={{ background: selectedKpiPerson === 'ALL' ? 'var(--crear-navy)' : 'transparent', color: selectedKpiPerson === 'ALL' ? '#fff' : 'var(--text-main)', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
              >
                Totales
              </button>
              <button 
                onClick={() => setSelectedKpiPerson('rouz1414@gmail.com')}
                style={{ background: selectedKpiPerson === 'rouz1414@gmail.com' ? 'var(--crear-navy)' : 'transparent', color: selectedKpiPerson === 'rouz1414@gmail.com' ? '#fff' : 'var(--text-main)', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
              >
                Rossmery Ochoa
              </button>
              <button 
                onClick={() => setSelectedKpiPerson('cardenaslopezgina@gmail.com')}
                style={{ background: selectedKpiPerson === 'cardenaslopezgina@gmail.com' ? 'var(--crear-navy)' : 'transparent', color: selectedKpiPerson === 'cardenaslopezgina@gmail.com' ? '#fff' : 'var(--text-main)', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
              >
                Gina Cárdenas
              </button>
            </div>
          </div>

          {/* TARJETAS DE MÉTRICAS */}
          {selectedKpiPerson === 'ALL' ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.8rem', marginBottom: '1.2rem' }}>
                <div style={{ background: 'var(--bg-dark-alt)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800 }}>PX INICIAL</div>
                  <div style={{ color: 'var(--text-heading)', fontSize: '1.6rem', fontWeight: 900, marginTop: '4px' }}>{qtKpisTotals.metrics.PX}</div>
                </div>
                <div style={{ background: 'var(--bg-dark-alt)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 800 }}>DESERTORES</div>
                  <div style={{ color: '#ef4444', fontSize: '1.6rem', fontWeight: 900, marginTop: '4px' }}>{qtKpisTotals.metrics.DESERTOR}</div>
                </div>
                <div style={{ background: 'var(--bg-dark-alt)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800 }}>PX FINAL</div>
                  <div style={{ color: 'var(--text-heading)', fontSize: '1.6rem', fontWeight: 900, marginTop: '4px' }}>{qtKpisTotals.metrics.PX_FIN}</div>
                </div>
                <div style={{ background: 'var(--bg-dark-alt)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ color: 'var(--color-primary, #3b82f6)', fontSize: '0.75rem', fontWeight: 800 }}>PAGOS (C2)</div>
                  <div style={{ color: 'var(--color-primary, #3b82f6)', fontSize: '1.6rem', fontWeight: 900, marginTop: '4px' }}>{qtKpisTotals.metrics.PAGOS}</div>
                </div>
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(34, 197, 94, 0.3)', textAlign: 'center' }}>
                  <div style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 800 }}>CONVERSIÓN (PP)</div>
                  <div style={{ color: '#10b981', fontSize: '1.6rem', fontWeight: 900, marginTop: '4px' }}>{qtKpisTotals.metrics.PP}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => handleSendKpiEmail(qtKpis['rouz1414@gmail.com'])}
                  style={{ flex: 1, minWidth: '220px', background: 'var(--crear-navy)', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Mail size={16} /> Notificar a Rossmery Ochoa
                </button>
                <button 
                  onClick={() => handleSendKpiEmail(qtKpis['cardenaslopezgina@gmail.com'])}
                  style={{ flex: 1, minWidth: '220px', background: 'var(--crear-navy)', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Mail size={16} /> Notificar a Gina Cárdenas
                </button>
              </div>
            </div>
          ) : (
            <div>
              {qtKpis[selectedKpiPerson] && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: 'var(--bg-dark-alt)', padding: '0.8rem 1rem', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--text-heading)' }}>{qtKpis[selectedKpiPerson].name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{qtKpis[selectedKpiPerson].email} • {qtKpis[selectedKpiPerson].evento}</div>
                    </div>
                    <button 
                      onClick={() => handleSendKpiEmail(qtKpis[selectedKpiPerson])}
                      style={{ background: 'var(--crear-gold)', color: '#000', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Mail size={14} /> Enviar Reporte por Correo
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem' }}>
                    {Object.entries(qtKpis[selectedKpiPerson].metrics).map(([key, val]) => (
                      <div key={key} style={{ background: 'var(--bg-dark-alt)', padding: '0.8rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800 }}>{key}</div>
                        <div style={{ color: key === 'PP' ? '#10b981' : key === 'DESERTOR' ? '#ef4444' : 'var(--text-heading)', fontSize: '1.3rem', fontWeight: 900, marginTop: '4px' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BLOQUE 1: CRONOGRAMA ACTUAL (Zen Mode) */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '1.5rem', border: '2px solid var(--border-strong)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Speaker size={16} /> Ahora en Salón
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-heading)', lineHeight: '1.2', marginBottom: '8px' }}>
            {schedule?.actividadActual}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <Clock size={16} /> Fin est.: {schedule?.horaFin}
            </div>
            <div style={{ color: 'var(--crear-gold)', fontSize: '0.9rem', fontWeight: 700 }}>
              Temp Obj: {schedule?.temperaturaSala}
            </div>
          </div>
        </div>

        {/* BLOQUE 2: ÓRDENES RÁPIDAS (Quick Tasks) */}
        {pendingQuickTasks.length > 0 && (
          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: '16px', border: '1px solid var(--crear-gold)', overflow: 'hidden' }}>
            <div style={{ background: 'var(--crear-gold)', color: '#000', padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageCircle size={18} /> Órdenes Entrantes ({pendingQuickTasks.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {pendingQuickTasks.map(qt => (
                <div key={qt.id} style={{ padding: '1rem', borderBottom: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--crear-gold)', marginBottom: '4px', fontWeight: 700 }}>De: {qt.from}</div>
                  <div style={{ fontSize: '1rem', color: 'var(--text-heading)', fontWeight: 600, lineHeight: '1.4' }}>{qt.message}</div>
                  <button style={{ marginTop: '12px', width: '100%', background: 'var(--crear-gold)', color: '#000', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '1rem', fontWeight: 800, minHeight: '48px', cursor: 'pointer' }}>
                    Aceptar y Ejecutar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BLOQUE 3: CHECKLISTS DINÁMICOS DE PISO */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '1.2rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={20} color="var(--color-primary, #3b82f6)" />
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-heading)' }}>Logística de Sala</h2>
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
                  borderBottom: idx === checklists.length - 1 ? 'none' : '1px solid var(--border-subtle)',
                  background: task.isCompleted ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                  cursor: 'pointer'
                }}
              >
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '6px', 
                  border: task.isCompleted ? '2px solid #10b981' : '2px solid var(--border-strong)',
                  background: task.isCompleted ? '#10b981' : 'transparent',
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  {task.isCompleted && <CheckSquare size={18} color="#fff" />}
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '4px' }}>{task.category}</div>
                  <div style={{ 
                    fontSize: '1rem', 
                    color: task.isCompleted ? 'var(--text-muted)' : 'var(--text-main)', 
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

        {/* BLOQUE 4: LEGACY WRAPPER */}
        <div style={{ marginTop: '0.5rem' }}>
          <button 
            onClick={() => setShowLegacy(!showLegacy)}
            style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', padding: '1.2rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', minHeight: '60px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ListTodo size={20} /> Tareas Históricas (Legacy)
            </div>
            {showLegacy ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
          {showLegacy && (
            <div style={{ marginTop: '1rem', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-subtle)', padding: '1rem' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1rem' }}>Mostrando tareas históricas del colaborador.</p>
              <ChecklistBoard />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
