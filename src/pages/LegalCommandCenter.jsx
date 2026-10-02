import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getArcoTickets, getIpTracker, getNdaMatrix } from '../services/legalService';
import ChecklistBoard from './ChecklistBoard';
import { 
  ShieldAlert, Lock, Scale, AlertTriangle, FileWarning, Fingerprint,
  ChevronLeft, FileSignature, EyeOff, ChevronDown, ChevronRight, Ban
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function LegalCommandCenter() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [arco, setArco] = useState([]);
  const [ipData, setIpData] = useState(null);
  const [ndaMatrix, setNdaMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLegacy, setShowLegacy] = useState(false);

  useEffect(() => {
    async function loadData() {
      setArco(await getArcoTickets());
      setIpData(await getIpTracker());
      setNdaMatrix(await getNdaMatrix());
      setLoading(false);
    }
    loadData();
  }, [currentUser]);

  const handleDataBreach = () => {
    toast.error('¡PROTOCOLO DE BRECHA INICIADO! Se ha notificado al CEO y bloqueado accesos externos. Plazo de reporte ODP: 5 días.', { icon: '🚨', duration: 6000, style: { background: '#7f1d1d', color: '#fff' } });
  };

  if (loading) return <div style={{ padding: '2rem', color: '#fff' }}>Desencriptando Bóveda Legal...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#f8fafc', fontFamily: 'var(--font-body)', paddingBottom: '4rem' }}>
      
      {/* HEADER ZERO-TRUST */}
      <div style={{ background: '#0f172a', padding: '1.5rem 3rem', borderBottom: '4px solid #64748b' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => navigate('/home')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Scale size={26} color="#94a3b8" /> Risk & Compliance Tower
                <span style={{ fontSize: '0.8rem', background: '#1e293b', color: '#38bdf8', padding: '4px 10px', borderRadius: '12px', letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Lock size={12} /> Zero-Trust
                </span>
              </h1>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Oficial de Cumplimiento: {currentUser?.name || 'Pablo Francisco Mendieta'}</p>
            </div>
          </div>
          <button onClick={handleDataBreach} style={{ background: '#7f1d1d', border: '1px solid #dc2626', padding: '0.6rem 1.2rem', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)' }}>
            <AlertTriangle size={18} /> REPORTAR DATA BREACH (ODP)
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 3rem', display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
        
        {/* WIDGET: ARCO RIGHTS SLA (CRITICAL) */}
        <div style={{ gridColumn: 'span 4', background: '#1e1b4b', borderRadius: '12px', border: '1px solid #4338ca', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', color: '#c7d2fe', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
            <ShieldAlert size={20} color="#818cf8" /> SLA Derechos ARCO (Máx 20 Días)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {arco.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#312e81', borderRadius: '8px', borderLeft: `4px solid ${a.status === 'CRITICAL' ? '#ef4444' : a.status === 'WARNING' ? '#f59e0b' : '#10b981'}` }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>{a.requester}</div>
                  <div style={{ fontSize: '0.75rem', color: '#a5b4fc', marginTop: '2px' }}>{a.type} | Sede: {a.sede}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: a.status === 'CRITICAL' ? '#ef4444' : a.status === 'WARNING' ? '#f59e0b' : '#10b981' }}>
                    {a.daysLeft}d
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#818cf8', textTransform: 'uppercase' }}>Restantes</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* WIDGET: IP & TRADEMARKS */}
        <div style={{ gridColumn: 'span 8', background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
            <Fingerprint size={20} color="#38bdf8" /> Propiedad Intelectual Corporativa (IP)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            
            <div style={{ background: '#1e293b', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8', marginBottom: '1rem', textTransform: 'uppercase' }}>Preparación</div>
              {ipData?.preparation.map(p => (
                <div key={p.id} style={{ background: '#0f172a', padding: '1rem', borderRadius: '6px', border: '1px solid #334155', borderLeft: '3px solid #64748b', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e2e8f0' }}>{p.asset}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.type}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#1e293b', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8', marginBottom: '1rem', textTransform: 'uppercase' }}>Filing / Trámite Indecopi</div>
              {ipData?.filing.map(p => (
                <div key={p.id} style={{ background: '#0f172a', padding: '1rem', borderRadius: '6px', border: '1px solid #334155', borderLeft: '3px solid #f59e0b', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e2e8f0' }}>{p.asset}</div>
                  <div style={{ fontSize: '0.75rem', color: '#fcd34d' }}>{p.status}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#064e3b', borderRadius: '8px', padding: '1rem', border: '1px solid #047857' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#6ee7b7', marginBottom: '1rem', textTransform: 'uppercase' }}>Asegurado (Patente/Registro)</div>
              {ipData?.secured.map(p => (
                <div key={p.id} style={{ background: '#022c22', padding: '1rem', borderRadius: '6px', border: '1px solid #065f46', borderLeft: '3px solid #10b981', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ecfdf5' }}>{p.asset}</div>
                  <div style={{ fontSize: '0.75rem', color: '#34d399' }}>{p.status}</div>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* WIDGET: MATRIZ DE CONFIDENCIALIDAD (NDA KILL-SWITCH) */}
        <div style={{ gridColumn: 'span 12', background: '#0f172a', borderRadius: '12px', border: '1px solid #334155', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <FileSignature size={22} color="#f59e0b" /> Matriz de Auditoría NDA & Bloqueo de Salón
            </h2>
            <div style={{ background: '#f59e0b', color: '#000', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Ban size={16} /> Kill-Switch Activo
            </div>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #334155', color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Personal (Staff)</th>
                <th style={{ padding: '12px 16px' }}>Rol Organizacional</th>
                <th style={{ padding: '12px 16px' }}>Estatus NDA / Contrato</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Asignación de Salón</th>
              </tr>
            </thead>
            <tbody>
              {ndaMatrix.map(n => (
                <tr key={n.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '16px', fontWeight: 600, color: '#f1f5f9' }}>{n.staffName}</td>
                  <td style={{ padding: '16px', color: '#cbd5e1' }}>{n.role}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      background: n.ndaStatus === 'SIGNED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                      color: n.ndaStatus === 'SIGNED' ? '#34d399' : '#f87171', 
                      padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 
                    }}>
                      {n.ndaStatus === 'SIGNED' ? 'VIGENTE' : n.ndaStatus === 'EXPIRED' ? 'VENCIDO' : 'FALTANTE'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    {n.canTrain ? (
                      <span style={{ color: '#10b981', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        Autorizado
                      </span>
                    ) : (
                      <span style={{ color: '#ef4444', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <Ban size={16} /> BLOQUEADO
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* LEGACY WRAPPER ZERO-TRUST */}
        <div style={{ gridColumn: 'span 12', marginTop: '1rem' }}>
          <button 
            onClick={() => setShowLegacy(!showLegacy)}
            style={{ width: '100%', background: '#020617', border: '1px solid #1e293b', color: '#64748b', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <EyeOff size={20} /> Bóveda Legacy (Contratos Antiguos / Historico)
            </div>
            {showLegacy ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
          {showLegacy && (
            <div style={{ marginTop: '1rem', background: '#0f172a', borderRadius: '12px', padding: '1rem', border: '1px solid #334155', boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.2)' }}>
              <ChecklistBoard />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
