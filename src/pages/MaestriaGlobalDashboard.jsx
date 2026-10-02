import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Globe, AlertTriangle, Target, Users, PhoneMissed, 
  ShieldAlert, UserX, Clock, ChevronDown, ChevronRight, CheckCircle, ChevronLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMaestriaMissions, getMaestriaCoordinatorsStatus, getCleanMaestriaKPIs } from '../services/maestriaService';
import ChecklistBoard from './ChecklistBoard'; // El contenedor Legacy

export default function MaestriaGlobalDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [showLegacy, setShowLegacy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const m = await getMaestriaMissions();
      const c = await getMaestriaCoordinatorsStatus();
      const k = await getCleanMaestriaKPIs();
      setMissions(m);
      setCoordinators(c);
      setKpis(k);
      setLoading(false);
    }
    loadData();
  }, []);

  const calculateDaysLeft = (deadlineStr) => {
    const diff = new Date(deadlineStr) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) return <div style={{ padding: '2rem', color: '#fff' }}>Cargando Centro de Comando...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#050a15', color: '#f8fafc', fontFamily: 'var(--font-body)', paddingBottom: '4rem' }}>
      
      {/* HEADER ESTRATÉGICO */}
      <div style={{ background: 'linear-gradient(180deg, #0f172a 0%, #050a15 100%)', padding: '2rem 3rem', borderBottom: '1px solid rgba(56, 189, 248, 0.2)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                <ChevronLeft size={24} />
              </button>
              <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                <Globe size={28} color="#38bdf8" />
              </div>
              <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', color: '#fff' }}>
                Comando Global <span style={{ color: '#38bdf8' }}>Maestría</span>
              </h1>
            </div>
            <p style={{ color: '#94a3b8', margin: '0 0 0 3.5rem', fontSize: '1rem' }}>Director General: Andrés Gómez | Focus Mode Activado</p>
          </div>
          
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '8px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '1px' }}>
            <Target size={18} />
            FILTRO EQUIPO 1000 ACTIVO
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 3rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* SECCIÓN 1: CUELLOS DE BOTELLA Y ULTIMÁTUMS (TOP FOLD) */}
        <div>
          <h2 style={{ fontSize: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
            <AlertTriangle size={20} color="#ef4444" /> Cuellos de Botella y Misiones Críticas
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
            {missions.map(mission => {
              const daysLeft = calculateDaysLeft(mission.deadline);
              const isUrgent = daysLeft <= 15;
              return (
                <div key={mission.id} style={{ background: isUrgent ? 'rgba(239, 68, 68, 0.05)' : '#111827', borderRadius: '12px', padding: '1.5rem', border: isUrgent ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: mission.type === 'ULTIMATUM' ? '#ef4444' : '#f59e0b' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: mission.type === 'ULTIMATUM' ? '#ef4444' : '#f59e0b', letterSpacing: '1px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {mission.type === 'ULTIMATUM' ? <UserX size={14} /> : <Target size={14} />} 
                        {mission.type}
                      </div>
                      <h3 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '1.1rem' }}>{mission.title}</h3>
                      {mission.description && <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>{mission.description}</p>}
                    </div>
                  </div>
                  
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '0.9rem', color: isUrgent ? '#fca5a5' : '#fff' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={16} /> Deadline: {new Date(mission.deadline).toLocaleDateString()}</span>
                    <span>{daysLeft} días restantes</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECCIÓN 2: RADAR DE NODUS Y FUTUROS IMPOSIBLES */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          
          {/* Board Coordinadores */}
          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
              <Users size={20} color="#38bdf8" /> Supervisión de Sedes y Coordinadores
            </h2>
            <div style={{ background: '#111827', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                <thead style={{ background: '#1f2937', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <tr>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700 }}>Sede</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700 }}>Coordinador</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 700 }}>Aprobación Futuros</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 700 }}>Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  {coordinators.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem', fontWeight: 700, color: '#fff' }}>{c.sede}</td>
                      <td style={{ padding: '1rem', color: '#cbd5e1' }}>{c.coordinator}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {c.futurosImposiblesAlert ? (
                          <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <ShieldAlert size={14} /> {c.aprobacionRate} (Alerta: Estándar Bajo)
                          </span>
                        ) : (
                          <span style={{ color: '#10b981', fontWeight: 600 }}>{c.aprobacionRate}</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: c.pulse === 'RED' ? '#ef4444' : c.pulse === 'YELLOW' ? '#f59e0b' : c.pulse === 'GREEN' ? '#10b981' : '#64748b', margin: '0 auto', boxShadow: `0 0 10px ${c.pulse === 'RED' ? '#ef4444' : 'transparent'}` }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* KPIs Depurados */}
          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
              <PhoneMissed size={20} color="#a855f7" /> KPIs Puros (Sin Eq.1000)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {kpis.map(k => (
                <div key={k.sede} style={{ background: '#111827', borderRadius: '8px', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, color: '#fff' }}>{k.sede}</div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Llamadas Fallidas: <span style={{ color: k.llamadasFallidas > 10 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>{k.llamadasFallidas}</span></div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Retención: <strong style={{ color: '#fff' }}>{k.retencionPromedio}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* SECCIÓN 3: CONTENEDOR LEGACY (TAREAS RUTINARIAS) */}
        <div style={{ marginTop: '2rem' }}>
          <button 
            onClick={() => setShowLegacy(!showLegacy)}
            style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle size={20} color="#94a3b8" /> Operativa Legacy (Tareas y Rutinas Preservadas)
            </div>
            {showLegacy ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
          
          {showLegacy && (
            <div style={{ marginTop: '1.5rem', background: '#0b1120', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              {/* Aquí inyectamos el ChecklistBoard original sin destruir nada */}
              <p style={{ color: '#94a3b8', marginBottom: '1rem', fontSize: '0.9rem' }}>Todas tus tareas históricas y asignaciones se mantienen intactas aquí. Cero pérdida de datos.</p>
              <ChecklistBoard />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
