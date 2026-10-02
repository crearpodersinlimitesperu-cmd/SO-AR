import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAttentionIndex, getUltimatums, getLegalRadar, getRecruitmentPipeline } from '../services/hrService';
import ChecklistBoard from './ChecklistBoard';
import { 
  Users, Activity, ShieldAlert, FileSignature, 
  ChevronLeft, Briefcase, Eye, ChevronDown, ChevronRight, Gavel
} from 'lucide-react';

export default function HrCommandCenter() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [attention, setAttention] = useState([]);
  const [ultimatums, setUltimatums] = useState([]);
  const [legal, setLegal] = useState([]);
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLegacy, setShowLegacy] = useState(false);

  useEffect(() => {
    async function loadData() {
      setAttention(await getAttentionIndex());
      setUltimatums(await getUltimatums());
      setLegal(await getLegalRadar());
      setPipeline(await getRecruitmentPipeline());
      setLoading(false);
    }
    loadData();
  }, [currentUser]);

  if (loading) return <div style={{ padding: '2rem', color: '#fff' }}>Cargando HR Command Center...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'var(--font-body)', paddingBottom: '4rem' }}>
      
      {/* HEADER CORPORATIVO */}
      <div style={{ background: '#0f172a', padding: '1.5rem 3rem', borderBottom: '4px solid #3b82f6' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => navigate('/home')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Briefcase size={26} color="#3b82f6" /> HR Command Center
                <span style={{ fontSize: '0.8rem', background: '#1e293b', color: '#cbd5e1', padding: '4px 10px', borderRadius: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>Talento Humano Global</span>
              </h1>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Director: {currentUser?.name || 'Lennin Fernando Chasi Lima'}</p>
            </div>
          </div>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.5rem 1rem', borderRadius: '8px', color: '#60a5fa', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={16} /> Organigrama Vivo Activo
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 3rem', display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
        
        {/* WIDGET: LEGAL RADAR */}
        <div style={{ gridColumn: 'span 4', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
            <ShieldAlert size={20} color="#ef4444" /> Radar Legal y Seguros
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {legal.map(l => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: '#f8fafc', borderRadius: '8px', borderLeft: `4px solid ${l.status === 'EXPIRED' ? '#ef4444' : l.status === 'EXPIRES_SOON' ? '#f59e0b' : '#10b981'}` }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{l.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{l.type}</div>
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: l.status === 'EXPIRED' ? '#ef4444' : l.status === 'EXPIRES_SOON' ? '#f59e0b' : '#10b981' }}>
                  {l.expiry}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* WIDGET: ATTENTION INDEX (TAREAS TRAMPA) */}
        <div style={{ gridColumn: 'span 4', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
            <Eye size={20} color="#8b5cf6" /> Attention Index (Mala Práctica)
          </h2>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>Personal que ha caído en tareas trampa ciegas.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {attention.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: '#f8fafc', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{a.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{a.role}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: a.status === 'CRITICAL' ? '#ef4444' : a.status === 'WARNING' ? '#f59e0b' : '#10b981' }}>{a.fallosTotales}</div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Último: {a.lastFallo}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* WIDGET: ULTIMATUMS & SLA DE RENDIMIENTO */}
        <div style={{ gridColumn: 'span 4', background: '#1e1b4b', borderRadius: '12px', border: '1px solid #312e81', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '1.5rem', color: '#fff' }}>
          <h2 style={{ fontSize: '1.1rem', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
            <Gavel size={20} color="#f43f5e" /> Bóveda de Ultimátums y SLA
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {ultimatums.map(u => (
              <div key={u.id} style={{ padding: '0.8rem', background: '#312e81', borderRadius: '8px', borderLeft: `4px solid ${u.status === 'URGENT' ? '#f43f5e' : '#f59e0b'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{u.name}</div>
                  <div style={{ fontSize: '0.7rem', background: '#1e1b4b', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1' }}>Req: {u.supervisor}</div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#a5b4fc', marginTop: '4px' }}>{u.reason}</div>
                <div style={{ fontSize: '0.75rem', color: u.status === 'URGENT' ? '#fda4af' : '#fcd34d', fontWeight: 700, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Activity size={12} /> Deadline: {u.deadline}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RECRUITMENT PIPELINE */}
        <div style={{ gridColumn: 'span 12', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
            <Users size={22} color="#0ea5e9" /> Pipeline de Expansión Internacional (ATS)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {/* SOURCING */}
            <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: '1rem', textTransform: 'uppercase' }}>Búsqueda Activa (1)</div>
              {pipeline?.sourcing.map(p => (
                <div key={p.id} style={{ background: '#fff', padding: '1rem', borderRadius: '6px', border: '1px solid #cbd5e1', borderLeft: '3px solid #0ea5e9' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.position}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>📍 {p.location}</div>
                </div>
              ))}
            </div>
            {/* INTERVIEW */}
            <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: '1rem', textTransform: 'uppercase' }}>Entrevistas (1)</div>
              {pipeline?.interview.map(p => (
                <div key={p.id} style={{ background: '#fff', padding: '1rem', borderRadius: '6px', border: '1px solid #cbd5e1', borderLeft: '3px solid #f59e0b' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.position}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>📍 {p.location}</div>
                </div>
              ))}
            </div>
            {/* ONBOARDING NEC */}
            <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: '1rem', textTransform: 'uppercase' }}>Onboarding NEC & NDAs (1)</div>
              {pipeline?.onboarding.map(p => (
                <div key={p.id} style={{ background: '#fff', padding: '1rem', borderRadius: '6px', border: '1px solid #cbd5e1', borderLeft: '3px solid #10b981' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.position}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>📍 {p.location}</div>
                  <div style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                    <FileSignature size={12} /> Faltan Firmas
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LEGACY WRAPPER */}
        <div style={{ gridColumn: 'span 12', marginTop: '1rem' }}>
          <button 
            onClick={() => setShowLegacy(!showLegacy)}
            style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Users size={20} /> Histórico de Tareas de RRHH (Legacy)
            </div>
            {showLegacy ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
          {showLegacy && (
            <div style={{ marginTop: '1rem', background: '#fff', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.02)' }}>
              <ChecklistBoard />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
