import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getManagersPipeline, getDualTasks, signoffDualTask } from '../services/callCoachService';
import ChecklistBoard from './ChecklistBoard';
import { toast } from 'react-hot-toast';
import { 
  PhoneCall, Users, AlertOctagon, CheckCircle, Clock, 
  ChevronRight, ChevronDown, Activity, ChevronLeft, Lock,
  Video, Mic, Calendar, ShieldCheck, CheckSquare, Square, X,
  ExternalLink, Sparkles
} from 'lucide-react';
import { 
  MAX_TRAINER_LOAD, 
  STANDARD_CALL_CONTACT_TYPE, 
  STANDARD_CALL_DURATION,
  generateAutomatedCallSchedule 
} from '../utils/callScheduleAutomation';

export default function CallCoachCRM() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [pipeline, setPipeline] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showLegacy, setShowLegacy] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [reload, setReload] = useState(0);

  // Modal para ver historial de llamadas del manager
  const [selectedManagerForHistory, setSelectedManagerForHistory] = useState(null);

  // Checklist semanal obligatorio del entrenador
  const [weeklyChecklist, setWeeklyChecklist] = useState({
    meetCallDone: false,
    voiceNoteReportSent: false
  });

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      setLoadError('');
      try {
        const [p, t] = await Promise.all([
          getManagersPipeline(currentUser?.sede),
          getDualTasks(currentUser?.sede),
        ]);
        if (active) {
          setPipeline(p);
          setTasks(t);
        }
      } catch (error) {
        if (active) {
          setPipeline([]);
          setTasks([]);
          setLoadError('No se pudieron cargar los datos del CRM. Reintenta la conexión.');
          console.error('Error cargando CRM de llamadas:', error);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, [currentUser, reload]);

  const handleSignoff = async (id) => {
    const success = await signoffDualTask(id, 'coach');
    if (success) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, coachSigned: true } : t));
      toast.success('Tu parte de la tarea ha sido firmada. Esperando al Coordinador.', { icon: '✅' });
    }
  };

  // Cálculo de carga actual del entrenador (Límite Directiva: Máximo 5)
  const myAssignedManagers = useMemo(() => {
    const currentName = String(currentUser?.name || '').toLowerCase().trim();
    if (!currentName) return [];
    return pipeline.filter(m => {
      const ent = String(m.entrenador || '').toLowerCase().trim();
      return ent && (ent.includes(currentName) || currentName.includes(ent));
    });
  }, [pipeline, currentUser]);

  const coachLoadCount = myAssignedManagers.length > 0 ? myAssignedManagers.length : pipeline.length;
  const isLoadMaxed = coachLoadCount >= MAX_TRAINER_LOAD;

  // Cronograma automatizado de referencia
  const sampleSchedule = useMemo(() => {
    return generateAutomatedCallSchedule({
      c1StartDate: new Date().toISOString().slice(0, 10),
      mjStartDate: '',
      totalCalls: 7,
      equipo: myAssignedManagers[0]?.equipo || 'Equipo Maestría',
      capitanName: myAssignedManagers[0]?.name || 'Capitán Asignado'
    });
  }, [myAssignedManagers]);

  const toggleChecklistItem = (key) => {
    setWeeklyChecklist(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (!prev[key]) {
        toast.success(
          key === 'meetCallDone'
            ? 'Videollamada de Google Meet (20-30 min) confirmada.'
            : 'Envío de Nota de Voz al Coordinador de Maestría confirmado.',
          { icon: '🎙️' }
        );
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-heading)', background: 'var(--bg-dark)', minHeight: '100vh' }}>
        <PhoneCall size={36} color="var(--crear-gold)" style={{ animation: 'bounce 1s infinite', marginBottom: '1rem' }} />
        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>Cargando Speed CRM de Seguimiento...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div role="alert" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-heading)', background: 'var(--bg-dark)', minHeight: '100vh' }}>
        <p>{loadError}</p>
        <button type="button" onClick={() => setReload(value => value + 1)}>Reintentar</button>
      </div>
    );
  }

  const redManagers = pipeline.filter(m => m.status === 'RED');
  const otherManagers = pipeline.filter(m => m.status !== 'RED');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-main)', fontFamily: 'var(--font-body)', paddingBottom: '4rem' }}>
      
      {/* HEADER CRM */}
      <div style={{ background: 'var(--bg-card)', padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => navigate('/home')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PhoneCall size={26} color="var(--color-primary, #3b82f6)" /> CRM de Seguimiento 
                <span style={{ fontSize: '0.8rem', background: 'var(--bg-dark-alt)', color: 'var(--crear-gold)', padding: '4px 10px', borderRadius: '12px', letterSpacing: '1px', textTransform: 'uppercase', border: '1px solid var(--border-strong)' }}>Centro de Managers</span>
              </h1>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Entrenador: {currentUser?.name || 'Coach'}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* BADGE DE CAPACIDAD DE CARGA (LÍMITE 5) */}
            <div style={{ 
              background: isLoadMaxed ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.12)', 
              border: `1px solid ${isLoadMaxed ? '#ef4444' : '#3b82f6'}`, 
              padding: '0.45rem 0.9rem', 
              borderRadius: '8px', 
              fontSize: '0.82rem', 
              fontWeight: 700,
              color: isLoadMaxed ? '#ef4444' : '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Users size={16} /> Carga Asignada: {coachLoadCount}/{MAX_TRAINER_LOAD} {isLoadMaxed ? '⚠️ Máximo Alcanzado' : '✅ Capacidad Óptima'}
            </div>

            {/* BADGE FORMATO DE LLAMADA OBLIGATORIO */}
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.45rem 0.9rem', borderRadius: '8px', color: '#10b981', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Video size={16} /> {STANDARD_CALL_CONTACT_TYPE} ({STANDARD_CALL_DURATION})
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.45rem 0.9rem', borderRadius: '8px', color: '#10b981', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={16} /> Nodus Sync: Activo
            </div>
          </div>
        </div>
      </div>

      {/* BANNER INFORMATIVO: DIRECTIVAS DE OPERACIÓN APROBADAS */}
      <div style={{ maxWidth: '1400px', margin: '1rem auto 0 auto', padding: '0 2rem' }}>
        <div style={{ 
          background: 'linear-gradient(90deg, rgba(30, 58, 138, 0.35) 0%, rgba(15, 23, 42, 0.8) 100%)', 
          border: '1px solid rgba(59, 130, 246, 0.3)', 
          borderRadius: '10px', 
          padding: '0.85rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.8rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={20} color="#38bdf8" />
            <div style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
              <strong>Directivas de Dirección General:</strong> Formato obligatorio en <strong>Videollamada de Google Meet (20-30 min)</strong> &bull; Límite estricto de <strong>5 mánagers por entrenador</strong> &bull; Liquidación <strong>fija por llamada efectiva ($25 USD)</strong> &bull; Requisito de <strong>3 Resultados Imposibles</strong>.
            </div>
          </div>

          <button 
            onClick={() => setShowSchedule(!showSchedule)}
            style={{ 
              background: 'rgba(56, 189, 248, 0.15)', 
              border: '1px solid #38bdf8', 
              color: '#38bdf8', 
              padding: '0.35rem 0.75rem', 
              borderRadius: '6px', 
              fontSize: '0.75rem', 
              fontWeight: 700, 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Calendar size={14} /> {showSchedule ? 'Ocultar Cronograma Oficial' : 'Ver Cronograma Oficial de Llamadas'}
          </button>
        </div>

        {/* VISUALIZADOR DEL CRONOGRAMA AUTOMATIZADO */}
        {showSchedule && (
          <div style={{ marginTop: '0.8rem', background: 'var(--bg-card)', borderRadius: '10px', padding: '1.2rem', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-heading)', margin: '0 0 0.8rem 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={18} color="#38bdf8" /> Cronograma Automatizado Oficial (Orden de Ejecución)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.8rem' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '8px', padding: '0.8rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>Fase 1: Pre-Capítulo 1</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-heading)', marginTop: '2px' }}>1 Llamada Obligatoria con el Capitán</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Antes de iniciar C1. Duración: 20-30 min vía Google Meet.</div>
              </div>
              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', padding: '0.8rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>Fase 2: Pausa Operativa</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-heading)', marginTop: '2px' }}>Inmersión de Sala (C1 & C2)</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Pausa en llamadas de seguimiento durante el desarrollo vivencial de los fines de semana.</div>
              </div>
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '0.8rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>Fase 3: Maestría del Juego</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-heading)', marginTop: '2px' }}>Retoma Semanal Post-1er FDS</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Llamadas semanales cada 7 días. Continuidad garantizada en fin de año (sin bloqueos).</div>
              </div>
              <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '8px', padding: '0.8rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c084fc', textTransform: 'uppercase' }}>Regla de Continuidad Grupal</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-heading)', marginTop: '2px' }}>Hasta el Último Grupo Asignado</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Las llamadas grupales continuarán activas hasta que el último grupo asignado las tenga.</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ maxWidth: '1400px', margin: '1.5rem auto', padding: '0 2rem', display: 'grid', gridTemplateColumns: '1fr 2.3fr 1.4fr', gap: '1.5rem' }}>
        
        {/* COLUMNA 1: URGENCIAS Y CHECKLIST SEMANAL OBLIGATORIO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* TAREA SEMANAL OBLIGATORIA DEL ENTRENADOR */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-strong)', padding: '1.3rem', boxShadow: 'var(--shadow-sm)' }}>
            <h2 style={{ fontSize: '1rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.4rem 0', fontWeight: 800 }}>
              <Mic size={18} /> Checklist Semanal del Coach
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
              Confirmación obligatoria por cada ciclo semanal antes de liberar la liquidación:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <button 
                type="button"
                onClick={() => toggleChecklistItem('meetCallDone')}
                style={{ 
                  background: weeklyChecklist.meetCallDone ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-dark-alt)', 
                  border: `1px solid ${weeklyChecklist.meetCallDone ? '#10b981' : 'var(--border-subtle)'}`,
                  borderRadius: '8px',
                  padding: '0.7rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--text-main)'
                }}
              >
                {weeklyChecklist.meetCallDone ? <CheckSquare size={18} color="#10b981" /> : <Square size={18} color="var(--text-muted)" />}
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: weeklyChecklist.meetCallDone ? '#10b981' : 'var(--text-heading)' }}>
                    Videollamada Google Meet (20-30 min)
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Realizada con cámara y agenda de 3 metas.
                  </div>
                </div>
              </button>

              <button 
                type="button"
                onClick={() => toggleChecklistItem('voiceNoteReportSent')}
                style={{ 
                  background: weeklyChecklist.voiceNoteReportSent ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-dark-alt)', 
                  border: `1px solid ${weeklyChecklist.voiceNoteReportSent ? '#10b981' : 'var(--border-subtle)'}`,
                  borderRadius: '8px',
                  padding: '0.7rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--text-main)'
                }}
              >
                {weeklyChecklist.voiceNoteReportSent ? <CheckSquare size={18} color="#10b981" /> : <Square size={18} color="var(--text-muted)" />}
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: weeklyChecklist.voiceNoteReportSent ? '#10b981' : 'var(--text-heading)' }}>
                    Envío de Nota de Voz al Coordinador
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Reporte semanal enviado al Coordinador de Maestría.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* URGENCIAS DE HOY */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-strong)', padding: '1.3rem', boxShadow: 'var(--shadow-sm)' }}>
            <h2 style={{ fontSize: '1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', fontWeight: 800 }}>
              <AlertOctagon size={18} /> Urgencias de Hoy (En Rojo)
            </h2>
            {redManagers.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hay Managers en rojo.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {redManagers.map(m => (
                  <div 
                    key={m.id} 
                    onClick={() => setSelectedManagerForHistory(m)}
                    style={{ 
                      background: 'rgba(239, 68, 68, 0.08)', 
                      borderLeft: '4px solid #ef4444', 
                      padding: '0.9rem', 
                      borderRadius: '6px', 
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease'
                    }}
                    title="Haz clic para ver el historial completo de llamadas"
                  >
                    <div style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '0.92rem' }}>{m.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '3px' }}>Sentados: {m.sentados}/{m.meta} &bull; {m.equipo}</div>
                    <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <PhoneCall size={12} /> Último contacto: {m.nodusLastCall}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA 2: PIPELINE DE MANAGERS CON VISTA DE HISTORIAL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-strong)', padding: '1.5rem', flex: 1, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontWeight: 800 }}>
                <Users size={20} color="var(--color-primary, #3b82f6)" /> Pipeline de Managers ({pipeline.length})
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Haz clic en cualquier tarjeta para auditar su <strong>Historial de Llamadas</strong>
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
              {pipeline.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay managers registrados para esta sede.</p>
              )}
              {otherManagers.map(m => (
                <div 
                  key={m.id} 
                  onClick={() => setSelectedManagerForHistory(m)}
                  style={{ 
                    background: 'var(--bg-dark-alt)', 
                    border: '1px solid var(--border-subtle)', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    position: 'relative', 
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease, transform 0.15s ease'
                  }}
                  title="Haz clic para ver el historial completo de llamadas"
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, height: '4px', width: `${(m.sentados/m.meta)*100}%`, background: m.status === 'GREEN' ? '#10b981' : '#f59e0b', transition: 'width 0.5s ease' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.95rem' }}>{m.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{m.equipo} · {m.rol || 'Manager'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: '3px 8px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 800, color: m.status === 'GREEN' ? '#10b981' : '#f59e0b', border: '1px solid var(--border-subtle)' }}>
                      {m.sentados}/{m.meta}
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '0.8rem', paddingTop: '0.6rem', borderTop: '1px dashed var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Video size={13} color="#10b981" /> Meet: 20-30m
                    </div>
                    <div style={{ color: '#38bdf8', fontWeight: 600 }}>
                      Ver Historial ➔
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WRAPPER LEGACY */}
          <div>
            <button 
              onClick={() => setShowLegacy(!showLegacy)}
              style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Clock size={20} color="var(--color-primary, #3b82f6)" /> Histórico de Tareas y Checklists (Legacy)
              </div>
              {showLegacy ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            {showLegacy && (
              <div style={{ marginTop: '1rem', background: 'var(--bg-card)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--border-subtle)' }}>
                <ChecklistBoard />
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA 3: TAREAS DUALES CON EL COORDINADOR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-strong)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
              <Lock size={20} color="#10b981" /> Corresponsabilidad
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Tareas cruzadas con el Coordinador de Maestría de Sede. Ambas partes deben firmar para cerrar la gestión.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {tasks.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay tareas duales pendientes en esta sede.</p>
              )}
              {tasks.map(t => (
                <div key={t.id} style={{ background: 'var(--bg-dark-alt)', borderRadius: '8px', padding: '1rem', border: '1px solid var(--border-subtle)' }}>
                  <h3 style={{ fontSize: '0.95rem', margin: '0 0 4px 0', color: 'var(--text-heading)' }}>{t.title}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>{t.description}</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {/* Firma Coach */}
                    <button 
                      disabled={t.coachSigned}
                      onClick={() => handleSignoff(t.id)}
                      style={{ background: t.coachSigned ? 'rgba(16, 185, 129, 0.1)' : 'var(--crear-navy)', color: t.coachSigned ? '#10b981' : '#fff', border: t.coachSigned ? '1px solid #10b981' : 'none', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', cursor: t.coachSigned ? 'default' : 'pointer' }}
                    >
                      {t.coachSigned ? <><CheckCircle size={14}/> Yo (Coach): Confirmado</> : 'Firmar mi Gestión'}
                    </button>

                    {/* Firma Coordinador */}
                    <div style={{ background: t.coordSigned ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-card)', color: t.coordSigned ? '#10b981' : 'var(--text-muted)', border: '1px dashed var(--border-strong)', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', opacity: t.coordSigned ? 1 : 0.7 }}>
                      {t.coordSigned ? <><CheckCircle size={14}/> Coordinador: Confirmado</> : <><Clock size={14}/> Coordinador: Pendiente</>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* MODAL DE HISTORIAL COMPLETO DE LLAMADAS DEL MANAGER */}
      {selectedManagerForHistory && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setSelectedManagerForHistory(null)}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto', borderRadius: '12px', padding: '1.8rem', border: '1px solid var(--border-strong)', borderTop: '4px solid #3b82f6', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
              <div>
                <h2 style={{ margin: 0, color: 'var(--text-heading)', fontSize: '1.2rem', fontWeight: 800 }}>
                  {selectedManagerForHistory.name}
                </h2>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {selectedManagerForHistory.rol || 'Manager'} &bull; {selectedManagerForHistory.equipo} &bull; Sede: {selectedManagerForHistory.sede}
                </div>
              </div>
              <button 
                onClick={() => setSelectedManagerForHistory(null)}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', padding: '0.4rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* BADGES DE FORMATO Y ESTADO */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Video size={13} /> {STANDARD_CALL_CONTACT_TYPE}
              </span>
              <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                ⏱️ {STANDARD_CALL_DURATION}
              </span>
              <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                🎯 Sentados: {selectedManagerForHistory.sentados}/{selectedManagerForHistory.meta}
              </span>
            </div>

            {/* LISTA DE HISTORIAL */}
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-heading)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem', marginBottom: '0.8rem', fontWeight: 700 }}>
              📞 Historial de Llamadas Registradas
            </h3>

            {(() => {
              const rawCalls = Array.isArray(selectedManagerForHistory.llamadasHistorial)
                ? [...selectedManagerForHistory.llamadasHistorial]
                : [];
              if (rawCalls.length === 0 && selectedManagerForHistory.llamadaFecha && selectedManagerForHistory.llamadaFecha !== 'Sin registro') {
                rawCalls.push({
                  id: `legacy_${selectedManagerForHistory.id}`,
                  tipo: 'individual',
                  fecha: selectedManagerForHistory.llamadaFecha,
                  asistio: selectedManagerForHistory.llamadaAsistio === 'SI',
                  tipoContacto: STANDARD_CALL_CONTACT_TYPE,
                  duracionMinutos: STANDARD_CALL_DURATION
                });
              }
              const displayCalls = rawCalls.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

              if (displayCalls.length === 0) {
                return (
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    No hay historial de llamadas previas registradas para este manager en la base de datos de Causa OS.
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {displayCalls.map((call, idx) => (
                    <div 
                      key={call.id || idx} 
                      style={{ 
                        background: 'var(--bg-dark-alt)', 
                        padding: '0.8rem', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border-subtle)' 
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                          {call.fecha || 'Sin fecha'} &bull; {call.tipo === 'grupal' ? 'Llamada Grupal' : 'Llamada Individual'}
                        </span>
                        <span style={{ 
                          fontSize: '0.72rem', 
                          fontWeight: 700, 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px',
                          background: call.asistio ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: call.asistio ? '#10b981' : '#ef4444'
                        }}>
                          {call.asistio ? '✅ Asistió (Efectiva)' : '❌ Ausente'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Formato: {call.tipoContacto || STANDARD_CALL_CONTACT_TYPE} ({call.duracionMinutos || STANDARD_CALL_DURATION})
                      </div>
                      {call.notaVozEnviada && (
                        <div style={{ fontSize: '0.7rem', color: '#38bdf8', marginTop: '2px' }}>
                          🎙️ Nota de voz al Coordinador confirmada
                        </div>
                      )}
                      {call.registradoPorNombre && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Registrado por: {call.registradoPorNombre} {call.registradoPorEmail ? `(${call.registradoPorEmail})` : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}

            <div style={{ marginTop: '1.4rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setSelectedManagerForHistory(null)}
                style={{ background: 'var(--crear-navy, #1e3a8a)', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
