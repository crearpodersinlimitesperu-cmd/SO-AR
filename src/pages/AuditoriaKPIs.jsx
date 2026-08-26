import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, getDocResilient } from '../services/firebase';
import { CheckCircle2, AlertCircle, ArrowLeft, Users, Target } from 'lucide-react';
import CountryFlag from '../components/CountryFlag';
import { recordAuditEvent } from '../services/auditService';
import { OPERATIONAL_SEDES } from '../data/usersData';
import DriveDashboard from '../components/DriveDashboard';

export default function AuditoriaKPIs() {
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [filterSede, setFilterSede] = useState(currentUser?.sede || 'Todas');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isScrapingLive, setIsScrapingLive] = useState(false);
  const sedesDisponibles = ['Todas', ...OPERATIONAL_SEDES];

  useEffect(() => {
    fetchReports();
  }, [filterSede, currentUser?.sede]);

  const parseNodusData = (data) => {
    let allData = [];
    if (data.secciones && data.secciones.actividadCoordinadores && data.secciones.actividadCoordinadores.kpis) {
      const kpisList = data.secciones.actividadCoordinadores.kpis;
      kpisList.forEach((kpi, index) => {
        const content = kpi.content;
        if (content && content.length > 5 && content[0].includes(' ')) {
          const nameParts = content[0].split(' ');
          const name = nameParts[0];
          const sede = nameParts.slice(1).join(' ');
          
          const gestiones = content.includes('Gestiones') ? content[content.indexOf('Gestiones') - 1] : '0';
          const asignados = content.includes('Asignados') ? content[content.indexOf('Asignados') - 1] : '0';
          
          const confirmadosStr = content.find(c => c.startsWith('Confirmado:'));
          const confirmados = confirmadosStr ? confirmadosStr.split(': ')[1] : '0';
          
          let roleStr = 'coord_c1';
          const sedeUpper = sede.toUpperCase();
          if (sedeUpper.includes('MAESTR') || sedeUpper.includes('MJ')) {
            roleStr = 'coord_maestria';
          } else if (sedeUpper.includes('QT') || sedeUpper.includes('QUANTUM')) {
            roleStr = 'qt';
          }

          const dynamicMetrics = [];
          const statusPills = [];
          for(let i = 1; i < content.length; i++) {
            const str = content[i];
            if (!str || typeof str !== 'string' || str.startsWith('Últ.')) continue;
            
            if (str.includes(':')) {
              const parts = str.split(':');
              const label = parts[0].trim();
              const val = parts[1].trim();
              
              if (['Confirmado', 'Siguiente', 'En espera', 'Cierre'].some(keyword => label.includes(keyword))) {
                statusPills.push({ label, value: val });
              } else {
                dynamicMetrics.push({ label, value: val });
              }
              continue;
            }
            
            if (/[a-zA-Z]/.test(str)) { 
              let val = '';
              if (i > 0 && /^[0-9]/.test(content[i-1]) && !/[a-zA-Z]/.test(content[i-1])) {
                  val = content[i-1];
              } else if (i < content.length - 1 && /^[0-9]/.test(content[i+1])) {
                  val = content[i+1];
              }
              if (val) {
                  let label = str.trim();
                  if (label.includes('Cobertura')) label = 'Cobertura';
                  dynamicMetrics.push({ label, value: val });
              }
            }
          }

          allData.push({
            id: `nodus_${index}`,
            userName: name,
            team: sede,
            coordinator: name,
            sede: sede,
            role: roleStr,
            gestionesTotal: parseInt(gestiones) || 0,
            asignados: parseInt(asignados) || 0,
            dynamicMetrics: dynamicMetrics,
            statusPills: statusPills,
            status: 'pending',
            createdAt: data.timestamp || new Date().toISOString(),
            rawContent: content
          });
        }
      });
    }
    return allData;
  };

  const handleLiveFilter = async () => {
    if (!startDate || !endDate) {
      showToast("Por favor selecciona Desde y Hasta para filtrar en Nodus", "warning");
      return;
    }
    
    setIsScrapingLive(true);
    showToast("Conectando con Nodus para extraer datos en vivo...", "info");
    
    try {
      const response = await fetch('http://localhost:3001/api/scrape-nodus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate })
      });
      const data = await response.json();
      const parsedData = parseNodusData(data);
      setReports(parsedData);
      showToast("Datos de Nodus actualizados.", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al extraer datos de Nodus", "error");
    } finally {
      setIsScrapingLive(false);
    }
  };

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

    try {
      const nodusRef = doc(db, 'nodus_kpis_sincronizados', 'latest_snapshot');
      const nodusSnap = await getDocResilient(nodusRef);
      
      let allData = [];
      
      if (nodusSnap.exists()) {
        allData = parseNodusData(nodusSnap.data());
      }

      // Filtrar por sede
      const isGlobal = !currentUser?.sede || currentUser?.sede === 'Sede Global' || currentUser?.sede === 'Global' || currentUser?.appRole === 'direccion' || currentUser?.isSuperAdmin;
      const sedeToFilter = isGlobal ? filterSede : currentUser?.sede;

      let filtered = allData;
      if (sedeToFilter && sedeToFilter !== 'Todas') {
        // Adaptación flexible del nombre de la sede
        const searchTerm = sedeToFilter.toUpperCase().replace('SEDE ', '');
        filtered = filtered.filter(r => r.sede && r.sede.toUpperCase().includes(searchTerm));
      }

      setReports(filtered);
    } catch (error) {
      if (error.code === 'permission-denied') {
        console.error("Sesión expirada: Firestore rechazó la lectura", error);
        showToast("Sesión expirada. Por favor, cierra sesión y entra de nuevo.", 'error');
      } else {
        console.warn("Aviso: Error cargando Nodus", error);
      }
    }

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
  const renderC1Data = (report = {}) => {
    const data = report;
    return (
      <div style={{ marginTop: '1rem' }}>
        {data.dynamicMetrics && data.dynamicMetrics.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            {data.dynamicMetrics.map((m, i) => {
               const numericVal = parseFloat(String(m.value).replace(/[^0-9.]/g, '')) || 0;
               const isInverse = m.label.toLowerCase().includes('rotas') || m.label.toLowerCase().includes('desercion');
               return (
                 <KPIMetric key={i} label={m.label} value={m.value} actual={numericVal} target={numericVal > 0 ? numericVal : 1} isInverse={isInverse} />
               );
            })}
          </div>
        )}
        
        {data.statusPills && data.statusPills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
            {data.statusPills.map((p, i) => {
              let bg = '#f1f5f9';
              let color = '#475569';
              let label = p.label.toLowerCase();
              if (label.includes('confirmado') && !label.includes('por')) { bg = '#10b981'; color = '#fff'; }
              else if (label.includes('por confirmar')) { bg = '#f59e0b'; color = '#fff'; }
              else if (label.includes('no contesta')) { bg = '#64748b'; color = '#fff'; }
              else if (label.includes('siguiente')) { bg = '#0ea5e9'; color = '#fff'; }
              else if (label.includes('interesa')) { bg = '#ef4444'; color = '#fff'; }
              else if (label.includes('asisti')) { bg = '#3b82f6'; color = '#fff'; }

              return (
                <span key={i} style={{ padding: '0.4rem 0.8rem', background: bg, borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, color: color, border: 'none' }}>
                  {p.label}: <strong>{p.value}</strong>
                </span>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderMaestriaData = (report = {}) => {
    const data = report.data || report;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        <KPIMetric label="Graduados Viaje" value={data.graduadosViaje || 0} target={1} actual={parseInt(data.graduadosViaje || 0)} />
        <KPIMetric label="Sentados FDS1" value={data.sentadosFDS1 || 0} target={1} actual={parseInt(data.sentadosFDS1 || 0)} />
        <KPIMetric label="Sentados FDS2" value={data.sentadosFDS2 || 0} target={1} actual={parseInt(data.sentadosFDS2 || 0)} />
        <KPIMetric label="Sentados FDS3" value={data.sentadosFDS3 || 0} target={1} actual={parseInt(data.sentadosFDS3 || 0)} />
        <KPIMetric label="Deserción FDS1-2" value={`${data.desercion1 || 0}%`} target={10} actual={parseFloat(data.desercion1 || 0)} isInverse />
        <KPIMetric label="Deserción FDS2-3" value={`${data.desercion2 || 0}%`} target={10} actual={parseFloat(data.desercion2 || 0)} isInverse />
        <KPIMetric label="Efec. Enrol." value={`${data.efectividadEnrolamiento || 0}%`} target={90} actual={parseFloat(data.efectividadEnrolamiento || 0)} />
        <KPIMetric label="Cump. FI" value={`${data.cumplimientoFI || 0}%`} target={80} actual={parseFloat(data.cumplimientoFI || 0)} />
        <KPIMetric label="Conv. Aliados" value={`${data.conversionAliados || 0}%`} target={1} actual={parseFloat(data.conversionAliados || 0)} />
      </div>
    );
  };

  const renderQTData = (report = {}) => {
    const data = report.data || report;
    return (
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
  };

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
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <button onClick={() => navigate('/gerente')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={16} /> Volver a Causa OS
          </button>
          <button 
            onClick={() => navigate('/embudo-conversion')} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
              color: '#000', 
              fontWeight: 'bold', 
              padding: '0.6rem 1.2rem', 
              borderRadius: '8px', 
              border: 'none', 
              cursor: 'pointer' 
            }}
          >
            📊 Embudo C1 ➔ C2 ➔ MJ
          </button>
        </div>
      </div>

        {/* Dashboards Integrados de Google Drive (Reportes de Entrenadores Maestría) */}
        <DriveDashboard />
  
      {/* Barra de Filtros Estilo Nodus */}
      <div style={{ 
        background: 'var(--bg-card, #ffffff)', 
        padding: '1rem', 
        borderRadius: '12px', 
        border: '1px solid var(--border-subtle, #e2e8f0)', 
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.5rem',
        alignItems: 'flex-end',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Sede</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#10b981' }}>📍</span>
            <select 
              value={filterSede} 
              onChange={(e) => setFilterSede(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.2rem', borderRadius: '8px', background: '#f8fafc', color: 'var(--text-main, #0f172a)', border: '1px solid #cbd5e1', fontWeight: 600 }}
            >
              <option value="Todas">Todas las Sedes</option>
              {sedesDisponibles.filter(s => s !== 'Todas').map(s => <option key={s} value={s}>{s}</option>)}
              <option value="Global">Global</option>
            </select>
          </div>
        </div>

        <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Desde</label>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: '#f8fafc', color: 'var(--text-main, #0f172a)', border: '1px solid #cbd5e1', fontWeight: 500 }}
          />
        </div>

        <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Hasta</label>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: '#f8fafc', color: 'var(--text-main, #0f172a)', border: '1px solid #cbd5e1', fontWeight: 500 }}
          />
        </div>

        <div style={{ flex: '0 1 auto' }}>
          <button 
            onClick={handleLiveFilter}
            disabled={isScrapingLive}
            style={{ 
              padding: '0.6rem 2rem', 
              borderRadius: '8px', 
              background: '#ffffff', 
              color: '#0ea5e9', 
              border: '1px solid #0ea5e9', 
              fontWeight: 700,
              cursor: isScrapingLive ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: isScrapingLive ? 0.7 : 1
            }}
          >
            {isScrapingLive ? (
              <>⏳ Filtrando...</>
            ) : (
              <>▽ Filtrar</>
            )}
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-subtle, #e2e8f0)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        
        {/* GLOBAL DEBUG BLOCK A NIVEL PÁGINA */}
        <div style={{ display: 'none', background: '#1a1a1a', padding: '15px', marginBottom: '20px', borderRadius: '8px', border: '2px solid #00ff00' }}>
            <h4 style={{color: '#00ff00', margin: '0 0 10px 0'}}>🛑 ALERTA PARA SOPORTE (TOMA FOTO DE ESTO): 🛑</h4>
            <pre style={{ fontSize: '11px', color: '#00ff00', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '400px', overflowY: 'auto' }}>
              === KEYS DISPONIBLES EN NODUS ===
              {JSON.stringify(window.__nodusDebugKeys, null, 2)}
              
              === REPORTES DE ENTRENADORES ===
              {JSON.stringify(window.__nodusDebugEntrenadores, null, 2)}
              
              === PRIMER COORDINADOR ===
              {reports.length > 0 ? JSON.stringify(reports[0].rawContent, null, 2) : 'Vacio'}
            </pre>
        </div>

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
                      {rep.role === 'qt' ? 'Quantum Team' : rep.role === 'coord_maestria' ? 'Coordinador de Maestría' : 'Coordinador C1/C2'} • Enviado: {formatDate(rep.createdAt)}
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

                {rep.role === 'coord_c1' ? renderC1Data(rep) : rep.role === 'coord_maestria' ? renderMaestriaData(rep) : renderQTData(rep)}
                
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
