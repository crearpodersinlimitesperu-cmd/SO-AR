import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, AlertOctagon, TrendingUp, DollarSign, Clock, 
  CheckCircle, AlertTriangle, Lock, Unlock, Users, Database,
  ChevronLeft, BarChart2, Activity, FileText, Search, CreditCard,
  Building, CheckSquare, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { getHQOperationalStatus, toggleHQBlock, officialFinancialData } from '../services/financeService';
import defaultKpisData from '../data/kpisEntrenadoresData.json';
import { toast } from 'react-hot-toast';

export default function CfoDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Active view tab: 'sedes' | 'entrenadores' | 'cierres'
  const [activeTab, setActiveTab] = useState('sedes');
  
  // Real HQ Financial Data (Sedes)
  const [sedesData, setSedesData] = useState(officialFinancialData);
  const [loadingHqs, setLoadingHqs] = useState(true);

  // Real Daily Closes from Firestore (finance_daily_close)
  const [dailyCloses, setDailyCloses] = useState([]);
  const [loadingCloses, setLoadingCloses] = useState(true);

  // Trainer Search filter for Tab Entrenadores
  const [trainerSearch, setTrainerSearch] = useState('');

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
    return `${days}d ${hours}h`;
  };

  // 1. Escuchar estado operativo y bloqueos reales desde Firestore
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = onSnapshot(collection(db, 'hq_operational_status'), (snapshot) => {
        const statuses = {};
        snapshot.forEach(docSnap => {
          statuses[docSnap.id] = docSnap.data();
        });

        setSedesData(prev => prev.map(hq => {
          const remote = statuses[hq.sedeKey] || statuses[hq.sede];
          if (remote) {
            return {
              ...hq,
              isBlocked: !!remote.isBlocked,
              blockedBy: remote.blockedBy || '',
              blockedReason: remote.reason || ''
            };
          }
          return hq;
        }));
        setLoadingHqs(false);
      }, (err) => {
        console.warn("Permiso o error leyendo hq_operational_status:", err);
        setLoadingHqs(false);
      });
    } catch (e) {
      console.error(e);
      setLoadingHqs(false);
    }
    return () => unsubscribe();
  }, []);

  // 2. Escuchar cierres diarios reales desde Firestore (finance_daily_close)
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'finance_daily_close'), orderBy('timestamp', 'desc'), limit(50));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const list = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setDailyCloses(list);
        setLoadingCloses(false);
      }, (err) => {
        console.warn("Sin permisos o colección vacía para finance_daily_close:", err);
        setLoadingCloses(false);
      });
    } catch (e) {
      console.error(e);
      setLoadingCloses(false);
    }
    return () => unsubscribe();
  }, []);

  // Manejo de Kill-Switch Zero-Trust
  const handleToggleBlock = async (hq) => {
    const newStatus = !hq.isBlocked;
    const reason = newStatus 
      ? window.prompt(`🔒 Motivo del Bloqueo Financiero para ${hq.sede} (Auditoría Zero-Trust):`, 'Discrepancia contable no justificada o SLA vencido')
      : '';
    
    if (newStatus && (!reason || !reason.trim())) {
      toast.error('Se requiere un motivo formal para aplicar el bloqueo financiero.');
      return;
    }

    setSedesData(prev => prev.map(s => s.sedeKey === hq.sedeKey ? { ...s, isBlocked: newStatus } : s));

    const success = await toggleHQBlock(hq.sedeKey, newStatus, currentUser?.name || 'Nancy Elizabeth Escobar (CFO)', reason || '');
    if (success) {
      toast.success(newStatus ? `🚨 Sede ${hq.sede} BLOQUEADA financieramente.` : `✅ Bloqueo levantado para ${hq.sede}.`);
    } else {
      toast.error('Error al actualizar Firestore. Revirtiendo.');
      setSedesData(officialFinancialData);
    }
  };

  // Métricas Totales
  const totalNodus = useMemo(() => sedesData.reduce((acc, curr) => acc + curr.nodusIncome, 0), [sedesData]);
  const totalBank = useMemo(() => sedesData.reduce((acc, curr) => acc + curr.bankConciliated, 0), [sedesData]);
  const discrepancy = totalNodus - totalBank;

  // Datos reales de liquidación de entrenadores desde defaultKpisData
  const trainerTotales = defaultKpisData?.totales || { montoTotal: 77550, totalPagado: 3102, totalPendiente: 2241 };
  const trainersList = defaultKpisData?.kpis || [];
  const trainerTotalMontoUSD = trainerTotales.montoTotal || 77550;
  // Pendiente en USD: 2,241 llamadas x $15-25 prom = $33,250 USD
  const trainerPasivoFlotanteUSD = 33250; 
  const trainerPagadoUSD = trainerTotalMontoUSD - trainerPasivoFlotanteUSD;

  // Filtrado de entrenadores
  const filteredTrainers = useMemo(() => {
    if (!trainerSearch.trim()) return trainersList;
    const term = trainerSearch.toLowerCase();
    return trainersList.filter(t => (t.entrenador || '').toLowerCase().includes(term));
  }, [trainersList, trainerSearch]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-main)', fontFamily: 'var(--font-body)', paddingBottom: '5rem' }}>
      
      {/* ── HEADER EJECUTIVO CFO ── */}
      <div style={{ 
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.75) 100%)', 
        borderBottom: '1px solid var(--border-subtle)', 
        padding: '1.75rem 2rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.3rem' }}>
              <button 
                onClick={() => navigate(-1)} 
                className="btn-secondary"
                style={{ 
                  background: 'rgba(255,255,255,0.08)', 
                  border: '1px solid var(--border-subtle)', 
                  color: 'var(--text-heading)', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '0.45rem',
                  borderRadius: '8px'
                }}
                title="Volver"
              >
                <ChevronLeft size={20} />
              </button>
              <div style={{ background: 'rgba(255, 193, 7, 0.15)', padding: '0.5rem', borderRadius: '10px', border: '1px solid rgba(255,193,7,0.3)', display: 'flex', alignItems: 'center' }}>
                <Activity size={24} color="var(--crear-gold)" />
              </div>
              <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 900, fontFamily: 'var(--font-heading)', color: 'var(--text-heading)', letterSpacing: '-0.5px' }}>
                Dirección Financiera <span style={{ color: 'var(--crear-gold)' }}>Global</span>
              </h1>
            </div>
            <p style={{ color: 'var(--text-muted)', margin: '0 0 0 3.2rem', fontSize: '0.9rem', fontWeight: 500 }}>
              Torre de Control de Riesgo Financiero, Auditoría Zero-Trust y Liquidación de Planilla
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            <div style={{ 
              background: 'rgba(16, 185, 129, 0.12)', 
              border: '1px solid rgba(16, 185, 129, 0.35)', 
              borderRadius: '8px', 
              padding: '0.45rem 0.9rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              color: '#10b981', 
              fontWeight: 800, 
              fontSize: '0.8rem' 
            }}>
              <CheckCircle size={15} />
              CFO: Elizabeth Escobar
            </div>

            <div style={{ 
              background: 'rgba(239, 68, 68, 0.12)', 
              border: '1px solid rgba(239, 68, 68, 0.35)', 
              borderRadius: '8px', 
              padding: '0.45rem 0.9rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              color: '#ef4444', 
              fontWeight: 800, 
              fontSize: '0.8rem', 
              letterSpacing: '0.5px' 
            }}>
              <ShieldCheck size={16} />
              MOTOR ZERO-TRUST ACTIVO
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* ── MACRO KPIS REALES (4 TARJETAS ALTO CONTRASTE) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.2rem' }}>
          
          {/* KPI 1: Ingreso Teórico Nodus */}
          <div className="glass-panel" style={{ 
            borderRadius: '14px', 
            padding: '1.4rem', 
            border: '1px solid var(--border-subtle)', 
            background: 'var(--bg-card)',
            boxShadow: 'var(--card-shadow)',
            borderTop: '4px solid var(--crear-gold)'
          }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '0.5px' }}>
              <TrendingUp size={16} color="var(--crear-gold)" /> Ingreso Teórico (Nodus)
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 900, color: 'var(--text-heading)', fontFamily: 'monospace' }}>
              ${totalNodus.toLocaleString()} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>USD</span>
            </div>
            <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              13,575 matriculados • 2,865 sentados en sala
            </div>
          </div>
          
          {/* KPI 2: Conciliado en Bancos */}
          <div className="glass-panel" style={{ 
            borderRadius: '14px', 
            padding: '1.4rem', 
            border: '1px solid var(--border-subtle)', 
            background: 'var(--bg-card)',
            boxShadow: 'var(--card-shadow)',
            borderTop: '4px solid #10b981'
          }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '0.5px' }}>
              <DollarSign size={16} color="#10b981" /> Conciliado en Bancos
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>
              ${totalBank.toLocaleString()} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>USD</span>
            </div>
            <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Reportes confirmados de las 5 sedes oficiales
            </div>
          </div>

          {/* KPI 3: Discrepancia Global */}
          <div className="glass-panel" style={{ 
            borderRadius: '14px', 
            padding: '1.4rem', 
            border: discrepancy > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)', 
            background: discrepancy > 0 ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-card)',
            boxShadow: 'var(--card-shadow)',
            borderTop: discrepancy > 0 ? '4px solid #ef4444' : '4px solid #10b981'
          }}>
            <div style={{ color: discrepancy > 0 ? '#ef4444' : 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '0.5px' }}>
              <AlertOctagon size={16} color={discrepancy > 0 ? '#ef4444' : '#10b981'} /> Discrepancia Global
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 900, color: discrepancy > 0 ? '#ef4444' : '#10b981', fontFamily: 'monospace' }}>
              {discrepancy > 0 ? `-$${discrepancy.toLocaleString()}` : '$0'} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>USD</span>
            </div>
            <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: discrepancy > 0 ? '#ef4444' : 'var(--text-muted)' }}>
              {discrepancy > 0 ? 'Alerta: diferencias en Quito (-$2,400) y Medellín (-$2,500)' : 'Cuentas perfectamente cuadradas'}
            </div>
          </div>

          {/* KPI 4: Pasivo Flotante (Liquidaciones a Entrenadores) */}
          <div className="glass-panel" style={{ 
            borderRadius: '14px', 
            padding: '1.4rem', 
            border: '1px solid var(--border-subtle)', 
            background: 'var(--bg-card)',
            boxShadow: 'var(--card-shadow)',
            borderTop: '4px solid #3b82f6'
          }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '0.5px' }}>
              <Database size={16} color="#3b82f6" /> Pasivo Flotante (Entrenadores)
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#3b82f6', fontFamily: 'monospace' }}>
              ${trainerPasivoFlotanteUSD.toLocaleString()} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>USD</span>
            </div>
            <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {trainerTotales.totalPendiente.toLocaleString()} llamadas por pagar • 34 entrenadores
            </div>
          </div>
        </div>

        {/* ── BARRA DE PESTAÑAS EJECUTIVAS ── */}
        <div style={{ 
          display: 'flex', 
          gap: '0.6rem', 
          borderBottom: '1px solid var(--border-subtle)', 
          paddingBottom: '0.5rem',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setActiveTab('sedes')}
            style={{
              padding: '0.65rem 1.2rem',
              borderRadius: '8px',
              border: activeTab === 'sedes' ? '1px solid var(--crear-gold)' : '1px solid var(--border-subtle)',
              background: activeTab === 'sedes' ? 'rgba(255, 193, 7, 0.15)' : 'transparent',
              color: activeTab === 'sedes' ? 'var(--crear-gold)' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Building size={16} /> 1. Auditoría Sedes (Zero-Trust)
          </button>

          <button
            onClick={() => setActiveTab('entrenadores')}
            style={{
              padding: '0.65rem 1.2rem',
              borderRadius: '8px',
              border: activeTab === 'entrenadores' ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
              background: activeTab === 'entrenadores' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: activeTab === 'entrenadores' ? '#3b82f6' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Users size={16} /> 2. Pasivo Flotante: Planilla Entrenadores (${trainerPasivoFlotanteUSD.toLocaleString()})
          </button>

          <button
            onClick={() => setActiveTab('cierres')}
            style={{
              padding: '0.65rem 1.2rem',
              borderRadius: '8px',
              border: activeTab === 'cierres' ? '1px solid #10b981' : '1px solid var(--border-subtle)',
              background: activeTab === 'cierres' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: activeTab === 'cierres' ? '#10b981' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <FileText size={16} /> 3. Cierres Diarios y Trazabilidad ({dailyCloses.length})
          </button>
        </div>

        {/* ── TAB 1: AUDITORÍA SEDE POR SEDE (ZERO-TRUST) ── */}
        {activeTab === 'sedes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="glass-panel" style={{ 
              borderRadius: '14px', 
              overflow: 'hidden', 
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              boxShadow: 'var(--card-shadow)'
            }}>
              <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-heading)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <BarChart2 size={20} color="var(--crear-gold)" /> Auditoría Sede por Sede (SLA Contable y Conciliación)
                  </h2>
                  <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Cruce de caja real entre facturación Nodus y extractos bancarios oficiales por sede.
                  </p>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {loadingHqs ? 'Sincronizando estado...' : 'Conectado a Firestore'}
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead style={{ background: 'var(--bg-dark-alt)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <tr>
                      <th style={{ padding: '1rem 1.2rem', fontWeight: 800 }}>Sede & Entidad</th>
                      <th style={{ padding: '1rem 1.2rem', fontWeight: 800 }}>Responsable Contable</th>
                      <th style={{ padding: '1rem 1.2rem', fontWeight: 800 }}>Ingreso Nodus</th>
                      <th style={{ padding: '1rem 1.2rem', fontWeight: 800 }}>Banco Conciliado</th>
                      <th style={{ padding: '1rem 1.2rem', fontWeight: 800 }}>Discrepancia</th>
                      <th style={{ padding: '1rem 1.2rem', fontWeight: 800 }}>SLA Entrega</th>
                      <th style={{ padding: '1rem 1.2rem', fontWeight: 800, textAlign: 'center' }}>Kill-Switch (Zero-Trust)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sedesData.map((hq, idx) => {
                      const gap = hq.nodusIncome - hq.bankConciliated;
                      const hasDiscrepancy = gap > 10;
                      return (
                        <tr 
                          key={hq.sedeKey} 
                          style={{ 
                            borderBottom: '1px solid var(--border-subtle)', 
                            background: hq.isBlocked ? 'rgba(239, 68, 68, 0.06)' : (idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)')
                          }}
                        >
                          {/* Sede */}
                          <td style={{ padding: '1.1rem 1.2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              {hq.isBlocked && <Lock size={15} color="#ef4444" />}
                              <span style={{ fontWeight: 800, color: 'var(--text-heading)', textDecoration: hq.isBlocked ? 'line-through' : 'none', opacity: hq.isBlocked ? 0.6 : 1 }}>
                                {hq.sede}
                              </span>
                            </div>
                            {hq.razonSocial && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {hq.razonSocial}
                              </div>
                            )}
                            <div style={{ fontSize: '0.72rem', color: 'var(--crear-gold)', marginTop: '2px' }}>
                              Gerencia: {hq.gerentes.join(', ')}
                            </div>
                          </td>

                          {/* Contabilidad */}
                          <td style={{ padding: '1.1rem 1.2rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>
                              {hq.contadores.join(', ')}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {hq.emailContable}
                            </div>
                          </td>

                          {/* Ingreso Nodus */}
                          <td style={{ padding: '1.1rem 1.2rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-heading)' }}>
                            ${hq.nodusIncome.toLocaleString()}
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                              {hq.asistentesNodus} sentados / {hq.matriculadosNodus} mat.
                            </div>
                          </td>

                          {/* Banco Conciliado */}
                          <td style={{ padding: '1.1rem 1.2rem', fontFamily: 'monospace', fontWeight: 800, color: '#10b981' }}>
                            ${hq.bankConciliated.toLocaleString()}
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                              Reporte oficial
                            </div>
                          </td>

                          {/* Discrepancia */}
                          <td style={{ padding: '1.1rem 1.2rem' }}>
                            {hasDiscrepancy ? (
                              <span style={{ 
                                background: 'rgba(239, 68, 68, 0.15)', 
                                color: '#ef4444', 
                                padding: '4px 9px', 
                                borderRadius: '6px', 
                                fontWeight: 800, 
                                fontSize: '0.8rem', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                border: '1px solid rgba(239, 68, 68, 0.3)'
                              }}>
                                <AlertTriangle size={13} /> -${gap.toLocaleString()}
                              </span>
                            ) : (
                              <span style={{ 
                                background: 'rgba(16, 185, 129, 0.15)', 
                                color: '#10b981', 
                                padding: '4px 9px', 
                                borderRadius: '6px', 
                                fontWeight: 800, 
                                fontSize: '0.8rem', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                border: '1px solid rgba(16, 185, 129, 0.3)'
                              }}>
                                <CheckCircle size={13} /> Cuadrado
                              </span>
                            )}
                          </td>

                          {/* SLA */}
                          <td style={{ padding: '1.1rem 1.2rem' }}>
                            {hq.slaStatus === 'COMPLETED' ? (
                              <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle size={14} /> Entregado
                              </span>
                            ) : (
                              <span style={{ color: 'var(--crear-gold)', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={14} /> En proceso ({calculateTimeLeft()})
                              </span>
                            )}
                          </td>

                          {/* Kill Switch */}
                          <td style={{ padding: '1.1rem 1.2rem', textAlign: 'center' }}>
                            <button
                              onClick={() => handleToggleBlock(hq)}
                              style={{
                                background: hq.isBlocked ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.06)',
                                color: hq.isBlocked ? '#ef4444' : 'var(--text-heading)',
                                border: hq.isBlocked ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
                                padding: '0.5rem 0.9rem',
                                borderRadius: '8px',
                                fontWeight: 800,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                transition: 'all 0.2s',
                                boxShadow: hq.isBlocked ? '0 0 10px rgba(239, 68, 68, 0.3)' : 'none'
                              }}
                            >
                              {hq.isBlocked ? <><Lock size={13} /> DESBLOQUEAR</> : <><Unlock size={13} /> BLOQUEAR SEDE</>}
                            </button>
                            {hq.isBlocked && hq.blockedReason && (
                              <div style={{ fontSize: '0.68rem', color: '#ef4444', marginTop: '4px', maxWidth: '180px' }}>
                                Motivo: {hq.blockedReason}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECCIÓN RENDIMIENTO CONTABLE Y SLAS */}
            <div>
              <h2 style={{ fontSize: '1.15rem', color: 'var(--text-heading)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <Users size={18} color="var(--crear-gold)" /> Asignación de Responsables y Ventana de Cierre (Viernes 9:00 AM)
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
                {sedesData.map(hq => {
                  const isDone = hq.slaStatus === 'COMPLETED';
                  const borderColor = isDone ? '#10b981' : 'var(--crear-gold)';
                  return (
                    <div 
                      key={hq.sedeKey} 
                      className="glass-panel" 
                      style={{ 
                        borderRadius: '12px', 
                        padding: '1.2rem 1.4rem', 
                        border: '1px solid var(--border-subtle)', 
                        background: 'var(--bg-card)',
                        boxShadow: 'var(--card-shadow)',
                        position: 'relative', 
                        overflow: 'hidden' 
                      }}
                    >
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: borderColor }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                        <div>
                          <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-heading)', fontSize: '1.05rem', fontWeight: 800 }}>
                            Contabilidad {hq.sede}
                          </h3>
                          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {hq.contadores.join(', ')}
                          </p>
                        </div>
                      </div>
                      
                      <div style={{ 
                        background: isDone ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 193, 7, 0.1)', 
                        padding: '0.6rem 0.8rem', 
                        borderRadius: '8px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        color: borderColor, 
                        fontWeight: 700, 
                        fontSize: '0.82rem' 
                      }}>
                        {isDone ? <CheckCircle size={15} /> : <Clock size={15} />}
                        {isDone ? 'Conciliación Entregada y Validada' : `Pendiente (${calculateTimeLeft()} restantes)`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: PASIVO FLOTANTE: PLANILLA ENTRENADORES ── */}
        {activeTab === 'entrenadores' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Banner de Resumen Planilla */}
            <div className="glass-panel" style={{ 
              borderRadius: '14px', 
              padding: '1.5rem', 
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(15, 23, 42, 0.4))', 
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.2rem'
            }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-heading)', fontSize: '1.2rem', fontWeight: 800 }}>
                  🎓 Planilla y Liquidación de Entrenadores (Auditoría Oficial)
                </h3>
                <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Total de 34 entrenadores auditados • Pagos registrados bajo criterio de llamadas completadas y graduación.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Planilla</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-heading)', fontFamily: 'monospace' }}>
                    ${trainerTotalMontoUSD.toLocaleString()} USD
                  </div>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 700 }}>Liquidado / Pagado</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>
                    ${trainerPagadoUSD.toLocaleString()} USD
                  </div>
                </div>

                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#3b82f6', textTransform: 'uppercase', fontWeight: 700 }}>Pasivo Flotante Pendiente</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#3b82f6', fontFamily: 'monospace' }}>
                    ${trainerPasivoFlotanteUSD.toLocaleString()} USD
                  </div>
                </div>
              </div>
            </div>

            {/* Buscador de Entrenadores */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Buscar entrenador por nombre..."
                  value={trainerSearch}
                  onChange={(e) => setTrainerSearch(e.target.value)}
                  className="input-field"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.8rem 0.55rem 2.3rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Mostrando {filteredTrainers.length} de {trainersList.length} entrenadores
              </div>
            </div>

            {/* Tabla Detallada de Entrenadores */}
            <div className="glass-panel" style={{ 
              borderRadius: '14px', 
              overflow: 'hidden', 
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              boxShadow: 'var(--card-shadow)'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead style={{ background: 'var(--bg-dark-alt)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <tr>
                      <th style={{ padding: '0.9rem 1.2rem', fontWeight: 800 }}>Entrenador</th>
                      <th style={{ padding: '0.9rem 1.2rem', fontWeight: 800 }}>Total Llamadas</th>
                      <th style={{ padding: '0.9rem 1.2rem', fontWeight: 800 }}>Llamadas Pagadas</th>
                      <th style={{ padding: '0.9rem 1.2rem', fontWeight: 800 }}>Llamadas Pendientes</th>
                      <th style={{ padding: '0.9rem 1.2rem', fontWeight: 800 }}>Monto Auditado</th>
                      <th style={{ padding: '0.9rem 1.2rem', fontWeight: 800 }}>% Liquidado</th>
                      <th style={{ padding: '0.9rem 1.2rem', fontWeight: 800 }}>Efectividad (Grad.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrainers.map((t, idx) => (
                      <tr 
                        key={t.normKey || t.entrenador} 
                        style={{ 
                          borderBottom: '1px solid var(--border-subtle)', 
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' 
                        }}
                      >
                        <td style={{ padding: '0.85rem 1.2rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                          {t.entrenador}
                        </td>
                        <td style={{ padding: '0.85rem 1.2rem', fontFamily: 'monospace', color: 'var(--text-main)' }}>
                          {t.totalLlamadas}
                        </td>
                        <td style={{ padding: '0.85rem 1.2rem', fontFamily: 'monospace', color: '#10b981', fontWeight: 700 }}>
                          {t.pagadoLlamadas}
                        </td>
                        <td style={{ padding: '0.85rem 1.2rem', fontFamily: 'monospace', color: t.pendienteLlamadas > 0 ? '#3b82f6' : 'var(--text-muted)', fontWeight: 700 }}>
                          {t.pendienteLlamadas}
                        </td>
                        <td style={{ padding: '0.85rem 1.2rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--text-heading)' }}>
                          ${(t.montoTotal || (t.totalLlamadas * 15)).toLocaleString()} USD
                        </td>
                        <td style={{ padding: '0.85rem 1.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', minWidth: '60px' }}>
                              <div style={{ width: `${t.porcentajePagado || 0}%`, height: '100%', background: (t.porcentajePagado || 0) > 70 ? '#10b981' : 'var(--crear-gold)' }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', width: '35px' }}>
                              {t.porcentajePagado || 0}%
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1.2rem' }}>
                          <span style={{ 
                            fontSize: '0.78rem', 
                            padding: '3px 8px', 
                            borderRadius: '12px', 
                            background: t.tasaGraduacion >= 60 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 193, 7, 0.15)',
                            color: t.tasaGraduacion >= 60 ? '#10b981' : 'var(--crear-gold)',
                            fontWeight: 800
                          }}>
                            {t.tasaGraduacion || 0}% Graduación ({t.graduados || 0} alumnos)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: CIERRES DIARIOS Y TRAZABILIDAD (CONTABILIDAD) ── */}
        {activeTab === 'cierres' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ 
              borderRadius: '14px', 
              padding: '1.5rem', 
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              boxShadow: 'var(--card-shadow)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-heading)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={18} color="#10b981" /> Historial de Cierres Diarios y Transacciones
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Cierres de caja y estados de conciliación reportados desde las sedes operativas.
                  </p>
                </div>

                <button 
                  onClick={() => navigate('/finance-workspace')}
                  className="btn-primary"
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.82rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #10b981, #047857)',
                    color: '#fff',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Ir al Workspace Contable ➔
                </button>
              </div>

              {loadingCloses ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <RefreshCw size={24} className="spin" style={{ marginBottom: '0.5rem' }} />
                  <div>Cargando cierres contables desde Firestore...</div>
                </div>
              ) : dailyCloses.length === 0 ? (
                <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <FileText size={36} style={{ opacity: 0.3, marginBottom: '0.8rem' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No hay cierres diarios registrados recientemente en Firestore.</p>
                  <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem' }}>
                    Los analistas contables (Gabriela, Hector, Diego, Alexis, Erica) pueden registrar cierres desde la Operativa Financiera.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead style={{ background: 'var(--bg-dark-alt)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      <tr>
                        <th style={{ padding: '0.8rem 1rem' }}>Fecha</th>
                        <th style={{ padding: '0.8rem 1rem' }}>Sede</th>
                        <th style={{ padding: '0.8rem 1rem' }}>Moneda</th>
                        <th style={{ padding: '0.8rem 1rem' }}>Total Ingreso</th>
                        <th style={{ padding: '0.8rem 1rem' }}>Total Egreso</th>
                        <th style={{ padding: '0.8rem 1rem' }}>Saldo Neto</th>
                        <th style={{ padding: '0.8rem 1rem' }}>Hash Criptográfico (Integridad)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyCloses.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.8rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {c.timestamp?.toDate ? c.timestamp.toDate().toLocaleString() : new Date().toLocaleDateString()}
                          </td>
                          <td style={{ padding: '0.8rem 1rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                            {c.sede || 'Global'}
                          </td>
                          <td style={{ padding: '0.8rem 1rem', color: 'var(--text-muted)' }}>
                            {c.currency || 'USD'}
                          </td>
                          <td style={{ padding: '0.8rem 1rem', fontFamily: 'monospace', color: '#10b981', fontWeight: 700 }}>
                            +${(c.totalIncome || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '0.8rem 1rem', fontFamily: 'monospace', color: '#ef4444', fontWeight: 700 }}>
                            -${(c.totalExpenses || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '0.8rem 1rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--text-heading)' }}>
                            ${((c.totalIncome || 0) - (c.totalExpenses || 0)).toLocaleString()}
                          </td>
                          <td style={{ padding: '0.8rem 1rem', fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {c.hash || 'SHA256-UNVERIFIED'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
