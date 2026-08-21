import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { CheckCircle2, AlertCircle, ArrowLeft, Users, Target } from 'lucide-react';
import CountryFlag from '../components/CountryFlag';
import { recordAuditEvent } from '../services/auditService';

export default function AuditoriaKPIs() {
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [filterSede, setFilterSede] = useState(currentUser?.sede || 'Todas');

  useEffect(() => {
    fetchReports();
  }, [filterSede, currentUser?.sede]);

  const getLocalReports = () => {
    try {
      const saved = localStorage.getItem('cpsl_kpi_reports_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filtrar y purgar cualquier dato falso o de prueba antiguo
          const clean = parsed.filter(r => r && !r.id?.startsWith('kpi_seed_'));
          if (clean.length !== parsed.length) {
            saveLocalReports(clean);
          }
          return clean;
        }
      }
    } catch (e) {
      console.warn("Error leyendo reportes locales:", e);
    }
    return [];
  };

  const saveLocalReports = (list) => {
    try {
      const cleanList = (list || []).filter(r => r && !r.id?.startsWith('kpi_seed_'));
      localStorage.setItem('cpsl_kpi_reports_v1', JSON.stringify(cleanList));
    } catch (e) {}
  };

  const fetchReports = async () => {
    setLoading(true);
    let allData = getLocalReports();

    try {
      const baseQuery = collection(db, 'kpi_reports');
      const snapshot = await getDocs(baseQuery);
      if (snapshot && !snapshot.empty) {
        const remoteData = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate().toISOString() : d.data().createdAt
        }));
        // Fusionar datos remotos y locales sin duplicados
        const ids = new Set(remoteData.map(r => r.id));
        allData = [...remoteData, ...allData.filter(r => !ids.has(r.id))];
        saveLocalReports(allData);
      }
    } catch (error) {
      console.warn("Aviso: usando base local de reportes KPI:", error);
    }

    // Filtrar por sede
    const isGlobal = !currentUser?.sede || currentUser?.sede === 'Sede Global' || currentUser?.sede === 'Global' || currentUser?.appRole === 'direccion' || currentUser?.isSuperAdmin;
    const sedeToFilter = isGlobal ? filterSede : currentUser?.sede;

    let filtered = allData;
    if (sedeToFilter && sedeToFilter !== 'Todas') {
      filtered = filtered.filter(r => r.sede === sedeToFilter || (r.sede && r.sede.toLowerCase().includes(sedeToFilter.toLowerCase())));
    }

    // Ordenar por fecha descendente
    filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    setReports(filtered);
    setLoading(false);
  };

  const handleMarkAsReviewed = async (reportId) => {
    const reviewerName = currentUser?.name || currentUser?.displayName || 'Dirección / Gerencia';
    const nowIso = new Date().toISOString();

    // Actualizar localmente de inmediato
    const updated = reports.map(r => r.id === reportId ? {
      ...r,
      status: 'reviewed',
      reviewedBy: reviewerName,
      reviewedAt: nowIso
    } : r);
    setReports(updated);

    const allLocal = getLocalReports().map(r => r.id === reportId ? {
      ...r,
      status: 'reviewed',
      reviewedBy: reviewerName,
      reviewedAt: nowIso
    } : r);
    saveLocalReports(allLocal);

    showToast("Reporte marcado como revisado", "success");

    // Intentar sync en Firestore en background
    try {
      await updateDoc(doc(db, 'kpi_reports', reportId), {
        status: 'reviewed',
        reviewedBy: reviewerName,
        reviewedAt: new Date()
      });
      await recordAuditEvent({
        email: currentUser?.email || 'admin',
        name: reviewerName,
        role: currentUser?.appRole || 'gerente',
        sede: currentUser?.sede || 'Global',
        action: 'AUDITORIA_KPI_REVISADO',
        details: `Reporte ${reportId} aprobado y auditado por ${reviewerName}`
      });
    } catch (e) {
      console.warn("Aviso Firestore al actualizar reporte:", e);
    }
  };

  // Helpers de visualización
  const renderC1Data = (data = {}) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
      <KPIMetric label="Asistencia" value={`${data.asistencia || 0}%`} target={95} actual={parseFloat(data.asistencia || 0)} />
      <KPIMetric label="Retención" value={`${data.retencion || 0}%`} target={10} actual={parseFloat(data.retencion || 0)} isInverse />
      <KPIMetric label="Conv. a C2" value={`${data.conversionC1C2 || 0}%`} target={50} actual={parseFloat(data.conversionC1C2 || 0)} />
      <KPIMetric label="Mov. a MJ" value={`${data.conversionC2MJ || 0}%`} target={70} actual={parseFloat(data.conversionC2MJ || 0)} />
      <KPIMetric label="Breakthrough" value={`${data.declaracionBreakthrough || 0}%`} target={90} actual={parseFloat(data.declaracionBreakthrough || 0)} />
      <KPIMetric label="Aliados" value={`${data.declaracionAliados || 0}%`} target={40} actual={parseFloat(data.declaracionAliados || 0)} />
      <KPIMetric label="Palabras Rotas" value={`${data.palabrasRotas || 0}%`} target={5} actual={parseFloat(data.palabrasRotas || 0)} isInverse />
      <KPIMetric label="Eficiencia" value={`${data.eficienciaGestion || 0}%`} target={100} actual={parseFloat(data.eficienciaGestion || 0)} />
    </div>
  );

  const renderQTData = (data = {}) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        <KPIMetric label="Efectividad Llamadas" value={`${data.efectividadLlamadas || 0}%`} target={60} actual={parseFloat(data.efectividadLlamadas || 0)} />
        <KPIMetric label="Futuros Imposibles" value={data.futurosImposibles || 0} target={2} actual={parseFloat(data.futurosImposibles || 0)} />
      </div>
      {data.resolucionQuiebres && (
        <div style={{ background: 'var(--bg-card, rgba(0,0,0,0.2))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))' }}>
          <h5 style={{ margin: '0 0 0.5rem', color: 'var(--crear-gold, #f59e0b)', fontWeight: 700 }}>Resolución de Quiebres:</h5>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main, #334155)', whiteSpace: 'pre-wrap' }}>{data.resolucionQuiebres}</p>
        </div>
      )}
    </div>
  );

  const formatDate = (dateVal) => {
    if (!dateVal) return 'Reciente';
    try {
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? 'Reciente' : d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Reciente';
    }
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button onClick={() => navigate('/gerente')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} /> Volver a SO-AR
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Filtrar Sede:</label>
          <select 
            value={filterSede} 
            onChange={(e) => setFilterSede(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--bg-card, #ffffff)', color: 'var(--text-main, #0f172a)', border: '1px solid var(--border-subtle, #cbd5e1)', fontWeight: 600 }}
          >
            <option value="Todas">Todas las Sedes</option>
            <option value="Quito">Quito</option>
            <option value="Guayaquil">Guayaquil</option>
            <option value="Cuenca">Cuenca</option>
            <option value="Lima">Lima</option>
            <option value="Medellín">Medellín</option>
            <option value="México">México</option>
            <option value="Global">Global</option>
          </select>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-subtle, #e2e8f0)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.7rem', margin: '0 0 0.4rem 0', fontWeight: 800, color: 'var(--text-heading, #0f172a)' }}>
              <Target color="#f59e0b" /> Auditoría de KPIs
            </h2>
            <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '0.95rem' }}>
              Revisión y aprobación de rendimiento operativo de Coordinadores y Quantum Team.
            </p>
          </div>
          <div style={{ background: 'var(--bg-card-hover, #f8fafc)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main, #334155)', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
            {reports.length} {reports.length === 1 ? 'Reporte registrado' : 'Reportes registrados'}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--crear-gold, #f59e0b)', fontWeight: 600 }}>Cargando reportes de KPIs...</div>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted, #64748b)' }}>No hay reportes de KPIs en la sede seleccionada.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {reports.map(rep => (
              <div key={rep.id} style={{ 
                background: rep.status === 'reviewed' ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-card, #ffffff)', 
                border: '1px solid',
                borderColor: rep.status === 'reviewed' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                borderRadius: '12px', 
                padding: '1.5rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle, #e2e8f0)', paddingBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.35rem', color: 'var(--text-heading, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                      <Users size={18} color="#f59e0b" /> {rep.userName} 
                      <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 700 }}>
                        <CountryFlag sede={rep.sede} /> {rep.sede}
                      </span>
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
                      {rep.role === 'qt' ? 'Quantum Team' : 'Coordinador C1/C2'} • Enviado: {formatDate(rep.createdAt)}
                    </p>
                  </div>
                  <div>
                    {rep.status === 'reviewed' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#10b981', fontWeight: 800, fontSize: '0.9rem' }}>
                          <CheckCircle2 size={18} /> Revisado
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>Por {rep.reviewedBy}</span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleMarkAsReviewed(rep.id)}
                        className="btn-neon-action" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '8px', background: '#3b82f6', color: '#ffffff', border: 'none', cursor: 'pointer' }}
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
  let isSuccess = false;
  if (isInverse) {
    isSuccess = actual <= target;
  } else {
    isSuccess = actual >= target;
  }

  const color = isSuccess ? '#10b981' : '#ef4444';

  return (
    <div style={{ background: 'var(--bg-card-hover, #f8fafc)', padding: '0.9rem', borderRadius: '8px', borderLeft: `4px solid ${color}`, border: '1px solid var(--border-subtle, #e2e8f0)', borderLeftColor: color }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', marginBottom: '0.3rem', textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-heading, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {value}
        {!isSuccess && <AlertCircle size={15} color={color} title={`Meta no alcanzada (${isInverse ? 'Máx' : 'Min'}: ${target})`} />}
      </div>
    </div>
  );
}
