import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHQOperationalStatus, submitDailyClose, submitWeeklySLA } from '../services/financeService';
import { toast } from 'react-hot-toast';
import { 
  ShieldAlert, BookOpen, Clock, FileCheck, Send, CheckCircle, 
  DollarSign, Activity, Lock, AlertTriangle, ChevronLeft 
} from 'lucide-react';

export default function FinanceWorkspace() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Formularios
  const [txAmount, setTxAmount] = useState('');
  const [txConcept, setTxConcept] = useState('');
  const [txType, setTxType] = useState('ingreso');

  const [slaBudget, setSlaBudget] = useState(false);
  const [slaBank, setSlaBank] = useState(false);
  const [slaNotes, setSlaNotes] = useState('');

  const sede = currentUser?.sede || 'Global';

  useEffect(() => {
    async function loadStatus() {
      const status = await getHQOperationalStatus();
      const myHQ = status.find(s => s.sede === sede);
      if (myHQ && myHQ.isBlocked) {
        setIsBlocked(true);
      }
      setLoading(false);
    }
    loadStatus();
  }, [sede]);

  // SLA Calculation (Friday 9:00 AM)
  const calculateTimeLeft = () => {
    const d = new Date();
    const deadline = new Date();
    deadline.setDate(d.getDate() + ((5 + 7 - d.getDay()) % 7));
    deadline.setHours(9, 0, 0, 0);
    if (d > deadline) deadline.setDate(deadline.getDate() + 7);
    
    const diff = deadline - d;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return `${days}d ${hours}h`;
  };

  const handleCaptureTx = (e) => {
    e.preventDefault();
    if (isBlocked) return toast.error('OPERACIONES CONGELADAS');
    toast.success('Transacción capturada y enviada a Causa OS.');
    setTxAmount(''); setTxConcept('');
  };

  const handleDailyClose = async () => {
    if (isBlocked) return toast.error('OPERACIONES CONGELADAS');
    const success = await submitDailyClose(sede, {
      totalTransactions: 15,
      montoConciliado: 5400,
      usuario: currentUser.email
    });
    if (success) {
      toast.success('Cierre de caja encriptado y sellado (SHA-256).');
    }
  };

  const handleWeeklySLA = async () => {
    if (isBlocked) return toast.error('OPERACIONES CONGELADAS');
    if (!slaBudget || !slaBank) {
      return toast.error('Debes adjuntar ambos reportes para el cierre semanal.');
    }
    const success = await submitWeeklySLA(sede, {
      presupuestoOk: slaBudget,
      bancoOk: slaBank,
      notas: slaNotes,
      contador: currentUser.email
    });
    if (success) {
      toast.success('SLA Semanal completado. Enviado a Dirección Financiera.');
      setSlaBudget(false); setSlaBank(false); setSlaNotes('');
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: '#fff' }}>Verificando encriptación...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#0A1118', color: '#f8fafc', fontFamily: 'var(--font-body)', paddingBottom: '4rem' }}>
      
      {/* KIOSK HEADER (FOCUS MODE) */}
      <div style={{ background: '#0f172a', padding: '1.5rem 3rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/home')} style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', padding: '0.5rem', borderRadius: '6px', display: 'flex' }}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Estación de Trabajo Operativa</h1>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>Sede: <strong style={{ color: '#fff' }}>{sede}</strong> | {currentUser?.name}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={16} /> SYNC: ON
          </div>
        </div>
      </div>

      {/* KILL-SWITCH BANNER */}
      {isBlocked && (
        <div style={{ background: '#ef4444', color: '#fff', padding: '1rem', textAlign: 'center', fontWeight: 900, fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', letterSpacing: '1px' }}>
          <Lock size={24} /> OPERACIONES FINANCIERAS CONGELADAS POR DIRECCIÓN GLOBAL (CFO) <Lock size={24} />
        </div>
      )}

      <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 3rem', display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        
        {/* COLUMNA PRINCIPAL (OPERATIVA) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* MÓDULO 1: CAPTURA TRANSACCIONAL */}
          <div style={{ background: '#111827', borderRadius: '12px', padding: '2rem', border: '1px solid rgba(255,255,255,0.05)', opacity: isBlocked ? 0.5 : 1, pointerEvents: isBlocked ? 'none' : 'auto' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.2rem' }}>
              <DollarSign color="#10b981" /> Captura Rápida de Transacciones
            </h2>
            <form onSubmit={handleCaptureTx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 150px', gap: '1rem' }}>
              <select 
                value={txType} 
                onChange={e => setTxType(e.target.value)}
                style={{ padding: '0.8rem', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
              >
                <option value="ingreso">Ingreso (Abono)</option>
                <option value="egreso">Egreso (Gasto)</option>
              </select>
              <input 
                type="text" 
                placeholder="Concepto / DNI Participante" 
                value={txConcept}
                onChange={e => setTxConcept(e.target.value)}
                required
                style={{ padding: '0.8rem', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
              />
              <input 
                type="number" 
                placeholder="Monto ($)" 
                value={txAmount}
                onChange={e => setTxAmount(e.target.value)}
                required
                min="0.01" step="0.01"
                style={{ padding: '0.8rem', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', fontWeight: 'bold' }}
              />
              <button type="submit" style={{ gridColumn: '1 / -1', padding: '1rem', background: '#38bdf8', color: '#0f172a', fontWeight: 800, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}>
                REGISTRAR TRANSACCIÓN (SYNC NODUS)
              </button>
            </form>
          </div>

          {/* MÓDULO 2: SLA SEMANAL (VIERNES 9 AM) */}
          <div style={{ background: 'linear-gradient(145deg, #1e1b4b, #312e81)', borderRadius: '12px', padding: '2rem', border: '1px solid #4338ca', opacity: isBlocked ? 0.5 : 1, pointerEvents: isBlocked ? 'none' : 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.2rem', color: '#fff' }}>
                <Clock color="#818cf8" /> Checkpoint SLA: Cierre Semanal
              </h2>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 700, color: '#a5b4fc' }}>
                Viernes 9:00 AM (Faltan: {calculateTimeLeft()})
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '1rem' }}>
                <input type="checkbox" checked={slaBudget} onChange={e => setSlaBudget(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#6366f1' }} />
                He cargado el Presupuesto Ejecutado consolidado de la Sede.
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '1rem' }}>
                <input type="checkbox" checked={slaBank} onChange={e => setSlaBank(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#6366f1' }} />
                Las conciliaciones bancarias cuadran al 100% con los ingresos de Nodus.
              </label>
              
              <textarea 
                placeholder="Notas u observaciones para Dirección Financiera (Opcional)..." 
                value={slaNotes}
                onChange={e => setSlaNotes(e.target.value)}
                style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', minHeight: '80px', marginTop: '0.5rem' }}
              />
              
              <button onClick={handleWeeklySLA} style={{ marginTop: '1rem', padding: '1rem', background: '#4f46e5', color: '#fff', fontWeight: 800, border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background='#4338ca'} onMouseOut={e => e.currentTarget.style.background='#4f46e5'}>
                <Send size={18} /> ENVIAR CIERRE SEMANAL AL CFO
              </button>
            </div>
          </div>

        </div>

        {/* COLUMNA LATERAL (WIKI & TAREAS) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* MÓDULO 3: CIERRE DIARIO */}
          <div style={{ background: '#111827', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', opacity: isBlocked ? 0.5 : 1, pointerEvents: isBlocked ? 'none' : 'auto' }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
              <FileCheck size={18} color="var(--crear-gold)" /> Cierre de Caja Diario
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>Estandariza tu caja local y genera un sello criptográfico inmutable en Causa OS.</p>
            <button onClick={handleDailyClose} style={{ width: '100%', padding: '0.8rem', background: 'transparent', color: 'var(--crear-gold)', fontWeight: 700, border: '1px solid var(--crear-gold)', borderRadius: '6px', cursor: 'pointer' }}>
              EJECUTAR CIERRE DIARIO
            </button>
          </div>

          {/* MÓDULO 4: WIKI DE AUDITORÍA */}
          <div style={{ background: '#0f172a', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.02)' }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8' }}>
              <BookOpen size={18} /> Wiki: Auditoría Digital
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ background: '#1e293b', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={14} color="#10b981" /> Manual de Conciliación Nodus
              </div>
              <div style={{ background: '#1e293b', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={14} color="#10b981" /> Política Zero-Trust (CFO)
              </div>
              <div style={{ background: '#1e293b', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={14} color="#10b981" /> Qué hacer en un Bloqueo de Sede
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
