import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGlobalSupervision, getFuturosImposiblesAudit, getTalentAndUltimatums, getNodusCleanKpis } from '../services/andresService';
import ChecklistBoard from './ChecklistBoard';
import { 
  Globe, AlertTriangle, Target, Activity, PhoneCall, CheckCircle2, 
  ChevronLeft, Users, ShieldAlert, BarChart3, ChevronDown, ChevronRight 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AndresCommandCenter() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [supervision, setSupervision] = useState([]);
  const [audit, setAudit] = useState([]);
  const [talent, setTalent] = useState({ expansion: [], ultimatums: [] });
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLegacy, setShowLegacy] = useState(false);

  useEffect(() => {
    async function loadData() {
      setSupervision(await getGlobalSupervision());
      setAudit(await getFuturosImposiblesAudit());
      setTalent(await getTalentAndUltimatums());
      setKpis(await getNodusCleanKpis());
      setLoading(false);
    }
    loadData();
  }, [currentUser]);

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-heading)', background: 'var(--bg-dark)', minHeight: '100vh' }}>
        <Globe size={36} color="var(--color-primary, #3b82f6)" style={{ animation: 'spin 2s linear infinite', marginBottom: '1rem' }} />
        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>Iniciando Centro de Comando Global de Maestría...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-main)', fontFamily: 'var(--font-body)', paddingBottom: '4rem' }}>
      
      {/* HEADER DE JEFATURA */}
      <div style={{ background: 'var(--bg-card)', padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => navigate('/home')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Globe size={26} color="var(--color-primary, #3b82f6)" /> Comando Global de Maestría
                <span style={{ fontSize: '0.75rem', background: '#dc2626', color: '#fee2e2', padding: '4px 8px', borderRadius: '4px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 800 }}>Confidencial</span>
              </h1>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Director Global: {currentUser?.name || 'Andrés Gómez'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.5rem 1rem', borderRadius: '8px', color: '#3b82f6', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={16} /> Radar Nodus Activo
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 2rem', display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
        
        {/* TOP FOLD: CUELLOS DE BOTELLA Y ULTIMATUMS */}
        <div style={{ gridColumn: 'span 6', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-strong)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '1.1rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
            <Target size={20} color="#f43f5e" /> Misiones de Expansión & Deadlines
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {talent.expansion.map(e => (
              <div key={e.id} style={{ background: 'var(--bg-dark-alt)', padding: '1rem', borderRadius: '8px', borderLeft: e.status === 'URGENT' ? '4px solid #ef4444' : '4px solid #3b82f6', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-heading)' }}>{e.mission}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: e.status === 'URGENT' ? '#ef4444' : '#3b82f6' }}>Deadline: {e.deadline}</div>
                </div>
                <div style={{ marginTop: '10px', background: 'var(--border-subtle)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: e.progress + '%', background: e.status === 'URGENT' ? '#ef4444' : '#3b82f6', height: '100%' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ gridColumn: 'span 6', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '1.1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
            <ShieldAlert size={20} color="#ef4444" /> Panel de Acondicionamiento (Ultimátums)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {talent.ultimatums.map(u => (
              <div key={u.id} style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #ef4444', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-heading)' }}>{u.name}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, background: 'rgba(239, 68, 68, 0.15)', padding: '4px 8px', borderRadius: '4px', color: '#ef4444' }}>Límite: {u.deadline}</div>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>Condición: {u.reason}</div>
              </div>
            ))}
          </div>
        </div>

        {/* SECOND FOLD: RADAR NODUS & FUTUROS IMPOSIBLES */}
        <div style={{ gridColumn: 'span 8', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-strong)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '1.1rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
            <BarChart3 size={20} color="#38bdf8" /> Efectividad de Llamadas (Depurado: Excluye Eq.1000)
          </h2>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpis} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="hq" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: '8px', color: 'var(--text-heading)' }} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="llamadasEfectivas" name="Efectivas (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="llamadasSinRespuesta" name="Sin Respuesta (%)" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ gridColumn: 'span 4', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-strong)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '1.1rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
            <AlertTriangle size={20} color="#f59e0b" /> Auditor: Futuros Imposibles
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {audit.map(a => (
              <div key={a.id} style={{ background: 'var(--bg-dark-alt)', padding: '1rem', borderRadius: '8px', borderLeft: a.severity === 'HIGH' ? '4px solid #ef4444' : '4px solid #f59e0b', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-heading)', marginBottom: '4px' }}>Alerta Sede: {a.hq}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{a.message}</div>
              </div>
            ))}
          </div>
        </div>

        {/* THIRD FOLD: SUPERVISION BOARD */}
        <div style={{ gridColumn: 'span 12', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-strong)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1.5rem 0' }}>
            <Users size={22} color="#8b5cf6" /> Board de Supervisión Global (Coordinadores Locales)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {supervision.map(s => (
              <div key={s.id} style={{ background: 'var(--bg-dark-alt)', borderRadius: '8px', borderTop: s.status === 'CRITICAL' ? '4px solid #ef4444' : s.status === 'WARNING' ? '4px solid #f59e0b' : '4px solid #10b981', padding: '1.2rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-heading)' }}>{s.hq}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.coordinator}</div>
                  </div>
                  {s.status === 'CRITICAL' && <AlertTriangle size={20} color="#ef4444" />}
                  {s.status === 'HEALTHY' && <CheckCircle2 size={20} color="#10b981" />}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '0.8rem', borderRadius: '6px', marginBottom: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Cumplimiento</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: s.compliance >= 90 ? '#10b981' : s.compliance >= 70 ? '#f59e0b' : '#ef4444' }}>{s.compliance}%</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Tareas Críticas Vencidas</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: s.pendingCritical > 0 ? '#ef4444' : 'var(--text-muted)' }}>{s.pendingCritical}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LEGACY WRAPPER */}
        <div style={{ gridColumn: 'span 12', marginTop: '1rem' }}>
          <button 
            onClick={() => setShowLegacy(!showLegacy)}
            style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle2 size={20} /> Trinchera Operativa (Checklist Histórico)
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
    </div>
  );
}
