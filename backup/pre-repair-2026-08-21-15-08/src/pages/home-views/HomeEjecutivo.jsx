import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCycles } from '../../context/CyclesContext';
import { Target, Users, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';

export default function HomeEjecutivo() {
  const { currentUser } = useAuth();
  const { currentStage } = useCycles();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Saludo y Contexto */}
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="text-white" style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>
            Hola, {currentUser?.displayName?.split(' ')[0] || 'Gerente'}
          </h2>
          <p className="text-muted" style={{ margin: 0 }}>
            Visión Global - Sede: <strong className="text-white">{currentUser?.sede || 'TODAS'}</strong>
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 'bold', border: '1px solid rgba(239,68,68,0.2)' }}>
            <ShieldCheck size={18} /> MODO EJECUTIVO
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        
        {/* DASHBOARD PRINCIPAL */}
        <div className="glass-panel hover-glow" onClick={() => navigate('/gerente')} style={{ padding: '2rem', textAlign: 'center', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,215,0,0) 100%)', border: '1px solid rgba(255,215,0,0.3)' }}>
          <Activity size={48} color="var(--crear-gold)" style={{ margin: '0 auto 1rem' }} />
          <h3 className="text-white" style={{ margin: '0 0 0.5rem' }}>Panel de Control</h3>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Vista 360° de la operación, bloqueos y avance de cada rol en tiempo real.</p>
          <button className="btn-primary" style={{ marginTop: '1.5rem', width: '100%' }}>Entrar al Panel</button>
        </div>

        {/* METAS Y REPORTES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel hover-glow" onClick={() => navigate('/metas')} style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
            <div style={{ background: 'rgba(0, 212, 255, 0.1)', padding: '1rem', borderRadius: '50%' }}>
              <Target size={24} color="var(--crear-blue)" />
            </div>
            <div>
              <h4 className="text-white" style={{ margin: '0 0 0.3rem' }}>Metas del Ciclo</h4>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Revisar y definir objetivos Px y Aliados</p>
            </div>
          </div>

          <div className="glass-panel hover-glow" onClick={() => navigate('/reportes')} style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '50%' }}>
              <Users size={24} color="var(--text-main)" />
            </div>
            <div>
              <h4 className="text-white" style={{ margin: '0 0 0.3rem' }}>Reportes de Campo</h4>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Leer actualizaciones del equipo operativo</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
