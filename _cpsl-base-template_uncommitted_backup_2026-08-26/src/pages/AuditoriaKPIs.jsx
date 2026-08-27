import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { collection, query, where, getDocs, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { CheckCircle2, AlertCircle, ArrowLeft, TrendingUp, Users, Target } from 'lucide-react';

export default function AuditoriaKPIs() {
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [filterSede, setFilterSede] = useState(currentUser?.sede || 'Todas');

  useEffect(() => {
    fetchReports();
  }, [filterSede, currentUser]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let q;
      const baseQuery = collection(db, 'kpi_reports');
      
      // Si el gerente no es de la Sede Global, forzamos su sede
      const isGlobal = currentUser?.sede === 'Sede Global' || currentUser?.appRole === 'direccion';
      const sedeToFilter = isGlobal ? filterSede : currentUser?.sede;

      if (sedeToFilter === 'Todas') {
        q = query(baseQuery, orderBy('createdAt', 'desc'));
      } else {
        q = query(baseQuery, where('sede', '==', sedeToFilter), orderBy('createdAt', 'desc'));
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(data);
    } catch (error) {
      console.error("Error al cargar reportes de KPIs:", error);
      showToast("Error al cargar reportes", "error");
    }
    setLoading(false);
  };

  const handleMarkAsReviewed = async (reportId) => {
    try {
      await updateDoc(doc(db, 'kpi_reports', reportId), {
        status: 'reviewed',
        reviewedBy: currentUser.name || currentUser.displayName,
        reviewedAt: new Date()
      });
      showToast("Reporte marcado como revisado", "success");
      fetchReports();
    } catch (error) {
      console.error(error);
      showToast("Error al actualizar reporte", "error");
    }
  };

  // Helpers de visualización
  const renderC1Data = (data) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
      <KPIMetric label="Asistencia" value={`${data.asistencia}%`} target={95} actual={parseFloat(data.asistencia)} />
      <KPIMetric label="Retención" value={`${data.retencion}%`} target={10} actual={parseFloat(data.retencion)} isInverse />
      <KPIMetric label="Conv. a C2" value={`${data.conversionC1C2}%`} target={50} actual={parseFloat(data.conversionC1C2)} />
      <KPIMetric label="Mov. a MJ" value={`${data.conversionC2MJ}%`} target={70} actual={parseFloat(data.conversionC2MJ)} />
      <KPIMetric label="Breakthrough" value={`${data.declaracionBreakthrough}%`} target={90} actual={parseFloat(data.declaracionBreakthrough)} />
      <KPIMetric label="Aliados" value={`${data.declaracionAliados}%`} target={40} actual={parseFloat(data.declaracionAliados)} />
      <KPIMetric label="Palabras Rotas" value={`${data.palabrasRotas}%`} target={5} actual={parseFloat(data.palabrasRotas)} isInverse />
      <KPIMetric label="Eficiencia" value={`${data.eficienciaGestion}%`} target={100} actual={parseFloat(data.eficienciaGestion)} />
    </div>
  );

  const renderQTData = (data) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        <KPIMetric label="Efectividad Llamadas" value={`${data.efectividadLlamadas}%`} target={60} actual={parseFloat(data.efectividadLlamadas)} />
        <KPIMetric label="Futuros Imposibles" value={data.futurosImposibles} target={2} actual={parseFloat(data.futurosImposibles)} />
      </div>
      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h5 style={{ margin: '0 0 0.5rem', color: 'var(--crear-gold)' }}>Resolución de Quiebres:</h5>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>{data.resolucionQuiebres}</p>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button onClick={() => navigate('/gerente')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} /> Volver a SO-AR
        </button>

        {(currentUser?.sede === 'Sede Global' || currentUser?.appRole === 'direccion') && (
          <select 
            value={filterSede} 
            onChange={(e) => setFilterSede(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '8px', background: '#0a1628', color: 'white', border: '1px solid var(--crear-gold)' }}
          >
            <option value="Todas">Todas las Sedes</option>
            <option value="Lima">Lima</option>
            <option value="Quito">Quito</option>
            <option value="Guayaquil">Guayaquil</option>
            <option value="Medellín">Medellín</option>
            <option value="Cuenca">Cuenca</option>
          </select>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 className="text-gold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.8rem', margin: '0 0 0.5rem 0' }}>
          <Target /> Auditoría de KPIs
        </h2>
        <p className="text-muted" style={{ marginBottom: '2rem' }}>
          Revisión de rendimiento de Coordinadores y Quantum Team.
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--crear-gold)' }}>Cargando reportes...</div>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No hay reportes de KPIs pendientes en esta sede.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {reports.map(rep => (
              <div key={rep.id} style={{ 
                background: rep.status === 'reviewed' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.05)', 
                border: '1px solid',
                borderColor: rep.status === 'reviewed' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                borderRadius: '12px', 
                padding: '1.5rem' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.25rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={18} className="text-gold" /> {rep.userName} <span style={{ fontSize: '0.8rem', background: 'var(--crear-blue)', padding: '2px 8px', borderRadius: '12px' }}>{rep.sede}</span>
                    </h3>
                    <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                      {rep.role === 'qt' ? 'Rol: Quantum Team' : 'Rol: Coordinador C1/C2'} | Enviado: {rep.createdAt?.toDate().toLocaleString()}
                    </p>
                  </div>
                  <div>
                    {rep.status === 'reviewed' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#10b981', fontWeight: 'bold' }}>
                          <CheckCircle2 size={18} /> Revisado
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Por {rep.reviewedBy}</span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleMarkAsReviewed(rep.id)}
                        className="btn-neon-action" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                      >
                        <CheckCircle2 size={16} /> Marcar como Revisado
                      </button>
                    )}
                  </div>
                </div>

                {rep.role === 'coord_c1' ? renderC1Data(rep.data) : renderQTData(rep.data)}
                
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Subcomponente para mostrar una métrica con color según alcance de la meta
function KPIMetric({ label, value, target, actual, isInverse = false }) {
  // isInverse significa que MENOR es MEJOR (ej. Palabras rotas < 5%, Retencion < 10%)
  let isSuccess = false;
  if (isInverse) {
    isSuccess = actual <= target;
  } else {
    isSuccess = actual >= target;
  }

  const color = isSuccess ? '#10b981' : '#ef4444';

  return (
    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {value}
        {!isSuccess && <AlertCircle size={14} color={color} title={`Meta no alcanzada (${isInverse ? 'Máx' : 'Min'}: ${target})`} />}
      </div>
    </div>
  );
}
