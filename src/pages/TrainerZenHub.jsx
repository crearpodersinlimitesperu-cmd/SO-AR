import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTrainerBriefing, getZeroEgoFeedback, acknowledgeFeedback, getComplementaryModules } from '../services/trainerService';
import ChecklistBoard from './ChecklistBoard'; // Para el Multi-Rol contenedor
import { toast } from 'react-hot-toast';
import { 
  Focus, MessageSquare, BookOpen, Clock, AlertTriangle, 
  CheckCircle, ChevronLeft, Calendar, FileText, Lock
} from 'lucide-react';

export default function TrainerZenHub() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [briefing, setBriefing] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLegacy, setShowLegacy] = useState(false); // Para Multi-Rol

  // Zen Mode Trigger: Viernes(5), Sábado(6), Domingo(0)
  const today = new Date().getDay();
  const isWeekend = today === 5 || today === 6 || today === 0;

  useEffect(() => {
    async function loadData() {
      const b = await getTrainerBriefing(currentUser?.sede);
      const f = await getZeroEgoFeedback(currentUser?.email);
      const m = await getComplementaryModules();
      
      setBriefing(b);
      setFeedbacks(f);
      setModules(m);
      setLoading(false);
    }
    loadData();
  }, [currentUser]);

  const handleAcknowledge = async (id) => {
    const success = await acknowledgeFeedback(id);
    if (success) {
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, acknowledged: true } : f));
      toast.success('Feedback firmado y cerrado criptográficamente.', { icon: '🔒' });
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: '#fff' }}>Iniciando Hub de Entrenamiento...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'var(--font-body)', paddingBottom: '4rem' }}>
      
      {/* HEADER ZEN MODE */}
      <div style={{ background: isWeekend ? '#000' : '#111', padding: '1.5rem 3rem', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/home')} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 300, color: '#fff', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Focus size={24} color={isWeekend ? "#10b981" : "#888"} /> 
              Hub de Entrenamiento {isWeekend && <span style={{ fontSize: '0.8rem', background: '#10b981', color: '#000', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>ZEN MODE</span>}
            </h1>
            <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>Instructor: {currentUser?.name || 'Entrenador'}</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 2rem', display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        
        {/* COLUMNA PRINCIPAL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* MÓDULO 1: BRIEFING DEL COORDINADOR */}
          {briefing && (
            <div style={{ background: '#151515', borderRadius: '8px', border: '1px solid #222', overflow: 'hidden' }}>
              <div style={{ background: '#1a1a1a', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid #222' }}>
                <Calendar size={18} color="#38bdf8" />
                <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: 500 }}>Briefing Operativo: Sede {briefing.sede}</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ margin: '0 0 1rem 0', color: '#aaa', fontSize: '0.9rem' }}>Actualizado por: {briefing.coordinatorName} ({new Date(briefing.updatedAt).toLocaleDateString()})</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: '#111', padding: '1rem', borderRadius: '6px', borderLeft: '3px solid #f59e0b' }}>
                    <strong style={{ display: 'block', color: '#f59e0b', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '4px' }}>Temperatura del Grupo</strong>
                    {briefing.temperature}
                  </div>
                  <div style={{ background: '#111', padding: '1rem', borderRadius: '6px', borderLeft: '3px solid #ef4444' }}>
                    <strong style={{ display: 'block', color: '#ef4444', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '4px' }}>Perfiles Críticos</strong>
                    {briefing.criticalProfiles}
                  </div>
                  <div style={{ background: '#111', padding: '1rem', borderRadius: '6px', borderLeft: '3px solid #10b981' }}>
                    <strong style={{ display: 'block', color: '#10b981', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '4px' }}>Logística y Horarios</strong>
                    {briefing.logisticNotes}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MÓDULO 2: BUZÓN ZERO-EGO (MENTORÍA) */}
          <div style={{ background: '#151515', borderRadius: '8px', border: '1px solid #222', overflow: 'hidden' }}>
            <div style={{ background: '#1a1a1a', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid #222' }}>
              <MessageSquare size={18} color="#a855f7" />
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: 500 }}>Feedback Direccional (Zero-Ego)</h2>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {feedbacks.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center', margin: '2rem 0' }}>No tienes feedback pendiente.</p>
              ) : (
                feedbacks.map(fbk => (
                  <div key={fbk.id} style={{ background: fbk.acknowledged ? '#0a0a0a' : '#1a1423', border: fbk.acknowledged ? '1px solid #222' : '1px solid #4c1d95', borderRadius: '8px', padding: '1.5rem', opacity: fbk.acknowledged ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', color: fbk.acknowledged ? '#888' : '#d8b4fe', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {fbk.title}
                          {fbk.acknowledged && <CheckCircle size={16} color="#10b981" />}
                        </h3>
                        <span style={{ fontSize: '0.8rem', color: '#666' }}>De: {fbk.from} | {new Date(fbk.date).toLocaleDateString()}</span>
                      </div>
                      {!fbk.acknowledged && <AlertTriangle size={20} color="#a855f7" />}
                    </div>
                    <p style={{ color: '#ccc', margin: '0 0 1.5rem 0', lineHeight: 1.6 }}>"{fbk.content}"</p>
                    
                    {!fbk.acknowledged && (
                      <button 
                        onClick={() => handleAcknowledge(fbk.id)}
                        style={{ width: '100%', padding: '1rem', background: '#7e22ce', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background = '#6b21a8'}
                        onMouseOut={e => e.currentTarget.style.background = '#7e22ce'}
                      >
                        <Lock size={16} /> ACEPTO Y APLICARÉ EN MI PRÓXIMA SALA
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* MÓDULO: CONTENEDOR MULTI-ROL (LEGACY) */}
          <div style={{ marginTop: '1rem' }}>
            <button 
              onClick={() => setShowLegacy(!showLegacy)}
              style={{ width: '100%', background: '#111', border: '1px dashed #333', color: '#888', padding: '1rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#666'; }}
              onMouseOut={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#333'; }}
            >
              {showLegacy ? 'OCULTAR TAREAS ADMINISTRATIVAS' : 'MOSTRAR TAREAS DE GERENCIA / ADMINISTRACIÓN'}
            </button>
            {showLegacy && (
              <div style={{ marginTop: '1rem', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '1rem' }}>
                <ChecklistBoard />
              </div>
            )}
          </div>

        </div>

        {/* COLUMNA LATERAL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* MÓDULO 3: GLOSARIO NEC (ESTÁNDAR) */}
          <div style={{ background: '#151515', borderRadius: '8px', border: '1px solid #222', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fca5a5' }}>
              <BookOpen size={18} /> Estándar NEC y Legal
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ background: '#1a1a1a', border: '1px solid #333', padding: '1rem', borderRadius: '6px' }}>
                <strong style={{ color: '#fff', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>Ley de Oro: "Creación"</strong>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>Sustituir el término "Transformación" por "Creación" (Tecnología NEC) en todo salón C1, C2 y MJ.</p>
              </div>
              <button style={{ width: '100%', padding: '0.8rem', background: 'transparent', color: '#38bdf8', border: '1px solid #38bdf8', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} /> Ver Contrato de Confidencialidad
              </button>
            </div>
          </div>

          {/* MÓDULO 4: CATÁLOGO COMPLEMENTARIOS */}
          <div style={{ background: '#151515', borderRadius: '8px', border: '1px solid #222', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#10b981', fontSize: '1rem' }}>Módulos Complementarios Flexibles</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {modules.map(mod => (
                <div key={mod.id} style={{ background: '#1a1a1a', padding: '0.75rem', borderRadius: '6px', borderLeft: '2px solid #10b981' }}>
                  <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 500 }}>{mod.title}</div>
                  <div style={{ color: '#666', fontSize: '0.75rem', marginTop: '4px' }}>{mod.duration} | {mod.focus}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
