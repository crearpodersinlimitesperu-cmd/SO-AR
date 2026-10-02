import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getManagersPipeline, getDualTasks, signoffDualTask } from '../services/callCoachService';
import ChecklistBoard from './ChecklistBoard';
import { toast } from 'react-hot-toast';
import { 
  PhoneCall, Users, AlertOctagon, CheckCircle, Clock, 
  ChevronRight, ChevronDown, Activity, ChevronLeft, Lock
} from 'lucide-react';

export default function CallCoachCRM() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [pipeline, setPipeline] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLegacy, setShowLegacy] = useState(false);

  useEffect(() => {
    async function loadData() {
      const p = await getManagersPipeline(currentUser?.sede);
      const t = await getDualTasks(currentUser?.sede);
      setPipeline(p);
      setTasks(t);
      setLoading(false);
    }
    loadData();
  }, [currentUser]);

  const handleSignoff = async (id) => {
    const success = await signoffDualTask(id, 'coach');
    if (success) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, coachSigned: true } : t));
      toast.success('Tu parte de la tarea ha sido firmada. Esperando al Coordinador.', { icon: '✅' });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-heading)', background: 'var(--bg-dark)', minHeight: '100vh' }}>
        <PhoneCall size={36} color="var(--crear-gold)" style={{ animation: 'bounce 1s infinite', marginBottom: '1rem' }} />
        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>Cargando Speed CRM de Seguimiento...</div>
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
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.5rem 1rem', borderRadius: '8px', color: '#10b981', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={16} /> Nodus Sync: Activo (Equipo 1000 Excluido)
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 2rem', display: 'grid', gridTemplateColumns: '1fr 2.5fr 1.5fr', gap: '1.5rem' }}>
        
        {/* COLUMNA 1: URGENCIAS Y SEMÁFORO ROJO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-strong)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <h2 style={{ fontSize: '1.1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
              <AlertOctagon size={20} /> Urgencias de Hoy (En Rojo)
            </h2>
            {redManagers.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay Managers en rojo.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {redManagers.map(m => (
                  <div key={m.id} style={{ background: 'rgba(239, 68, 68, 0.08)', borderLeft: '4px solid #ef4444', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '0.95rem' }}>{m.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>Sentados: {m.sentados}/{m.meta}</div>
                    <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, marginTop: '4px' }}>Nodus: {m.nodusLastCall}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA 2: PIPELINE "3 SENTADOS" */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-strong)', padding: '1.5rem', flex: 1, boxShadow: 'var(--shadow-sm)' }}>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
              <Users size={20} color="var(--color-primary, #3b82f6)" /> Pipeline de Managers (En Seguimiento / Verde)
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {otherManagers.map(m => (
                <div key={m.id} style={{ background: 'var(--bg-dark-alt)', border: '1px solid var(--border-subtle)', padding: '1rem', borderRadius: '8px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, height: '4px', width: `${(m.sentados/m.meta)*100}%`, background: m.status === 'GREEN' ? '#10b981' : '#f59e0b', transition: 'width 0.5s ease' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '1rem' }}>{m.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{m.equipo}</div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 800, color: m.status === 'GREEN' ? '#10b981' : '#f59e0b', border: '1px solid var(--border-subtle)' }}>
                      {m.sentados}/{m.meta}
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <PhoneCall size={14} color="var(--color-primary, #3b82f6)" /> Último estado: <strong style={{ color: 'var(--text-main)' }}>{m.nodusLastCall}</strong>
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
    </div>
  );
}
