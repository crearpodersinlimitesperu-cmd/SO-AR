import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, AlertOctagon, TrendingUp, DollarSign, Clock, 
  CheckCircle, AlertTriangle, Lock, Unlock, Users, Database,
  ChevronLeft, BarChart2, Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getHQOperationalStatus, toggleHQBlock, mockFinancialData } from '../services/financeService';
import { toast } from 'react-hot-toast';

export default function CfoDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(mockFinancialData);
  const [hqStatus, setHqStatus] = useState([]);
  const [loading, setLoading] = useState(true);

  // SLA Calculation (Friday 9:00 AM)
  const getNextFriday9AM = () => {
    const d = new Date();
    d.setDate(d.getDate() + ((5 + 7 - d.getDay()) % 7));
    d.setHours(9, 0, 0, 0);
    return d;
  };

  const calculateTimeLeft = () => {
    const now = new Date();
    const deadline = getNextFriday9AM();
    if (now > deadline) deadline.setDate(deadline.getDate() + 7);
    const diff = deadline - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return \`\${days}d \${hours}h\`;
  };

  useEffect(() => {
    loadRealStatus();
  }, []);

  const loadRealStatus = async () => {
    setLoading(true);
    const status = await getHQOperationalStatus();
    
    // Merge mock with real firestore status
    const merged = data.map(hq => {
      const dbStatus = status.find(s => s.sede === hq.sede);
      return {
        ...hq,
        isBlocked: dbStatus ? dbStatus.isBlocked : hq.isBlocked
      };
    });
    setData(merged);
    setLoading(false);
  };

  const handleToggleBlock = async (sede, isCurrentlyBlocked) => {
    const newStatus = !isCurrentlyBlocked;
    const reason = newStatus ? window.prompt(\`Motivo del bloqueo para \${sede} (Auditoría Zero-Trust):\`) : '';
    
    if (newStatus && !reason) return; // Cancelado

    setData(prev => prev.map(hq => hq.sede === sede ? { ...hq, isBlocked: newStatus } : hq));
    
    const success = await toggleHQBlock(sede, newStatus, currentUser?.name || 'CFO_ADMIN', reason);
    if (success) {
      toast.success(newStatus ? \`Sede \${sede} BLOQUEADA financieramente.\` : \`Bloqueo levantado para \${sede}.\`);
    } else {
      toast.error('Error al actualizar Firestore. Revirtiendo.');
      loadRealStatus();
    }
  };

  const totalNodus = data.reduce((acc, curr) => acc + curr.nodusIncome, 0);
  const totalBank = data.reduce((acc, curr) => acc + curr.bankConciliated, 0);
  const totalPending = data.reduce((acc, curr) => acc + curr.pendingExpenses, 0);
  const discrepancy = totalNodus - totalBank;

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', color: '#f8fafc', fontFamily: 'var(--font-body)', paddingBottom: '4rem' }}>
      
      {/* HEADER CFO */}
      <div style={{ background: 'linear-gradient(180deg, #0A192F 0%, #0b1120 100%)', padding: '2rem 3rem', borderBottom: '1px solid rgba(255,193,7,0.2)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                <ChevronLeft size={24} />
              </button>
              <div style={{ background: 'rgba(255, 193, 7, 0.1)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,193,7,0.3)' }}>
                <Activity size={28} color="var(--crear-gold)" />
              </div>
              <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', color: '#fff' }}>
                Dirección Financiera <span style={{ color: 'var(--crear-gold)' }}>Global</span>
              </h1>
            </div>
            <p style={{ color: '#94a3b8', margin: '0 0 0 3.5rem', fontSize: '1rem' }}>Auditoría Zero-Trust y Control de SLA Contable</p>
          </div>
          
          <div style={{ background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.4)', borderRadius: '8px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '1px' }}>
            <ShieldCheck size={18} />
            MOTOR ZERO-TRUST ACTIVO
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 3rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* MACRO KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
          <div style={{ background: '#111827', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={16} color="var(--crear-gold)" /> Ingreso Teórico (Nodus)
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>
              ${totalNodus.toLocaleString()}
            </div>
          </div>
          
          <div style={{ background: '#111827', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <DollarSign size={16} color="#10b981" /> Conciliado en Bancos
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
              ${totalBank.toLocaleString()}
            </div>
          </div>

          <div style={{ background: discrepancy > 100 ? 'rgba(220, 38, 38, 0.1)' : '#111827', borderRadius: '12px', padding: '1.5rem', border: discrepancy > 100 ? '1px solid #dc2626' : '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ color: discrepancy > 100 ? '#fca5a5' : '#94a3b8', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertOctagon size={16} color={discrepancy > 100 ? '#ef4444' : '#64748b'} /> Discrepancia Global
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: discrepancy > 100 ? '#ef4444' : '#fff', fontFamily: 'monospace' }}>
              ${discrepancy.toLocaleString()}
            </div>
          </div>

          <div style={{ background: '#111827', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={16} color="#3b82f6" /> Pasivo Flotante (Egresos)
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>
              ${totalPending.toLocaleString()}
            </div>
          </div>
        </div>

        {/* AUDITORÍA CROSS-CHECK (TABLA) */}
        <div>
          <h2 style={{ fontSize: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
            <BarChart2 size={20} color="var(--crear-gold)" /> Auditoría Sede por Sede (Zero-Trust)
          </h2>
          <div style={{ background: '#111827', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
              <thead style={{ background: '#1f2937', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <tr>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>Sede (País)</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>Ingreso Nodus</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>Banco Conciliado</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>Discrepancia</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>Kill-Switch (Bloqueo)</th>
                </tr>
              </thead>
              <tbody>
                {data.map(hq => {
                  const gap = hq.nodusIncome - hq.bankConciliated;
                  const isGap = gap > 10;
                  return (
                    <tr key={hq.sede} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {hq.isBlocked && <Lock size={14} color="#ef4444" />}
                        <span style={{ textDecoration: hq.isBlocked ? 'line-through' : 'none', opacity: hq.isBlocked ? 0.5 : 1 }}>{hq.sede}</span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', color: '#94a3b8' }}>${hq.nodusIncome.toLocaleString()}</td>
                      <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', color: '#10b981', fontWeight: 600 }}>${hq.bankConciliated.toLocaleString()}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        {isGap ? (
                          <span style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: '4px', fontWeight: 700, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={14} /> -${gap.toLocaleString()}
                          </span>
                        ) : (
                          <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14} /> OK
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <button
                          onClick={() => handleToggleBlock(hq.sede, hq.isBlocked)}
                          style={{
                            background: hq.isBlocked ? 'rgba(220, 38, 38, 0.1)' : '#1f2937',
                            color: hq.isBlocked ? '#ef4444' : '#fff',
                            border: hq.isBlocked ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                          }}
                        >
                          {hq.isBlocked ? <><Lock size={14} /> DESBLOQUEAR</> : <><Unlock size={14} /> BLOQUEAR SEDE</>}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* TEAM TRACKER & SLAs */}
        <div>
          <h2 style={{ fontSize: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
            <Users size={20} color="var(--crear-gold)" /> Rendimiento Contable y SLAs (Viernes 9:00 AM)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {data.map(hq => {
              let slaColor = '#10b981'; // Green
              let slaIcon = <CheckCircle size={18} />;
              let slaText = 'Conciliación Entregada';
              
              if (hq.slaStatus === 'WARNING') {
                slaColor = 'var(--crear-gold)';
                slaIcon = <Clock size={18} />;
                slaText = \`Pendiente (\${calculateTimeLeft()} restantes)\`;
              } else if (hq.slaStatus === 'VIOLATION') {
                slaColor = '#ef4444';
                slaIcon = <AlertOctagon size={18} />;
                slaText = 'SLA ROTO (Atrasado)';
              }

              return (
                <div key={hq.sede} style={{ background: '#111827', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: slaColor }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '1.1rem' }}>Contabilidad {hq.sede}</h3>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>Resp: {hq.contadores.join(', ')}</p>
                    </div>
                  </div>
                  
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: slaColor, fontWeight: 700, fontSize: '0.9rem' }}>
                    {slaIcon} {slaText}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
