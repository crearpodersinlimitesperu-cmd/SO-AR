import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Briefcase, TrendingUp, AlertCircle, CheckCircle2, ChevronRight, Activity, Clock, ShieldCheck, Box, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc } from 'firebase/firestore';
import { db, getDocResilient } from '../services/firebase';
import { OPERATIONAL_SEDES, normalizeSede } from '../data/usersData';

export default function PortfolioBoard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('active');
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState([]);
  const [stats, setStats] = useState({ activos: 0, tiempo: 0, atrasado: 0, critico: 0 });
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab] = useState('ciclos');
  // CONTEXTO (28/08/2026): auditoría de roles encontró que esta pantalla arrancaba
  // fija en 'Lima' (sin importar quién entrara) y el desplegable ofrecía GLOBAL + las
  // 6 sedes libremente a cualquiera que llegara aquí — un Gerente podía ver el
  // portafolio de cualquier otra sede o el consolidado, cuando debería ver solo la suya.
  // Dirección/CFO/CEO/CCO/superadmin/consolidado (ver allowedRoles en App.jsx para esta
  // ruta) sí conservan visión global, tal como pide la matriz de roles.
  const isGlobalPortfolioRole = currentUser?.isSuperAdmin || ['direccion', 'cfo', 'ceo', 'cco', 'consolidado'].includes(currentUser?.appRole);
  const [selectedSede, setSelectedSede] = useState(() => isGlobalPortfolioRole ? 'GLOBAL' : normalizeSede(currentUser?.sede));

  const sedesDisponibles = isGlobalPortfolioRole ? ['GLOBAL', ...OPERATIONAL_SEDES] : [normalizeSede(currentUser?.sede)];

  const bgLight = "#f8fafc";
  const bgCard = "#ffffff";
  const textDark = "#0f172a";
  const textMuted = "#64748b";
  const borderLight = "#e2e8f0";

  const [errorObj, setErrorObj] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const docRef = doc(db, 'nodus_kpis_sincronizados', 'latest_snapshot');
        const docSnap = await getDocResilient(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          let totalEnrolados = 0;
          let totalDesertores = 0;
          const sedeFilter = selectedSede.toUpperCase();
          
          if(data.secciones?.reporteEntrenadores?.tablas?.length > 0) {
            const tablaEnrol = data.secciones.reporteEntrenadores.tablas.find(t => t.headers && (t.headers.includes("Total Enrolados") || t.headers.includes("TOTAL ENROLADOS"))) || data.secciones.reporteEntrenadores.tablas[0];
            
            if (tablaEnrol && tablaEnrol.rows) {
              tablaEnrol.rows.forEach(row => {
                if (!row.SEDE || String(row.SEDE).toUpperCase().includes(sedeFilter)) {
                   totalEnrolados += parseInt(row["Total Enrolados"] || row["TOTAL ENROLADOS"] || 0);
                   totalDesertores += parseInt(row["Desertor FDS"] || row["DESERTOR FDS"] || 0);
                }
              });
            }
          }

          let totalParticipantes = 0;
          if(data.secciones?.facturacion?.tablas?.[0]?.rows) {
            totalParticipantes = data.secciones.facturacion.tablas[0].rows.filter(r => !r.SEDE || String(r.SEDE).toUpperCase().includes(sedeFilter)).length;
          }

          const desercionRate = totalParticipantes > 0 ? (totalDesertores / totalParticipantes) * 100 : 0;
          let health = 'good';
          if (desercionRate > 10) health = 'warning';
          if (desercionRate > 20) health = 'critical';

          const progress = Math.min(100, Math.round((totalEnrolados / (totalParticipantes || 1)) * 100));

          const ciclosReales = [
            { 
              id: 1, 
              name: `${selectedSede} - CICLO 1 (Actual)`, 
              progress: progress > 0 ? progress : 85, 
              health: health, 
              date: 'Ciclo Activo', 
              action: health === 'critical' ? 'Intervención Urgente' : 'Ver Detalles',
              details: {
                totalEnrolados: totalEnrolados,
                totalDesertores: totalDesertores,
                tasaDesercion: desercionRate.toFixed(1),
                totalParticipantes: totalParticipantes
              }
            },
            { 
              id: 2, 
              name: 'Próximo Ciclo (C2)', 
              progress: Math.round(progress * 0.6), 
              health: 'good', 
              date: 'Próximo Mes', 
              action: 'Planificación',
              details: {
                totalParticipantes: '-',
                totalEnrolados: '-',
                totalDesertores: '-',
                tasaDesercion: '-'
              }
            }
          ];

          setPortfolio(ciclosReales);
          setStats({
            activos: ciclosReales.length,
            tiempo: ciclosReales.filter(c => c.health === 'good').length,
            atrasado: ciclosReales.filter(c => c.health === 'warning').length,
            critico: ciclosReales.filter(c => c.health === 'critical').length
          });
          setErrorObj(null);

        } else {
          console.warn("No se encontró el snapshot de Nodus");
          setErrorObj("No se encontró el archivo de datos sincronizados (latest_snapshot) en la base de datos.");
        }
      } catch (error) {
        console.error("Error obteniendo datos de Nodus:", error);
        if (error.code === 'permission-denied') {
          setErrorObj("Sesión expirada o sin permisos. Por favor, cierra sesión y entra de nuevo.");
        } else {
          setErrorObj(error.message || "Ocurrió un error inesperado al leer los datos.");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedSede]);

  return (
    <div style={{ minHeight: '100vh', background: bgLight, color: textDark, paddingBottom: '4rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* HEADER COHERENTE */}
      <header style={{ background: bgCard, borderBottom: `1px solid ${borderLight}`, padding: '1.2rem 2rem', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => navigate('/home')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: textDark, border: `1px solid ${borderLight}`, background: 'transparent', borderRadius: '6px', cursor: 'pointer' }}>
              <ArrowLeft size={16} /> Inicio
            </button>
            <div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#d97706', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Briefcase size={24} /> Portafolio PMO
              </h1>
              <p style={{ fontSize: '0.75rem', color: textMuted, margin: 0 }}>Gobernanza y Visión Central de Proyectos (Data en Vivo)</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: textMuted }}>SEDE:</span>
              <select
                value={selectedSede}
                onChange={(e) => setSelectedSede(e.target.value)}
                disabled={!isGlobalPortfolioRole}
                style={{ padding: '0.4rem 2rem 0.4rem 0.8rem', borderRadius: '6px', border: `1px solid ${borderLight}`, background: bgCard, color: textDark, fontWeight: 700, fontSize: '0.85rem', cursor: isGlobalPortfolioRole ? 'pointer' : 'not-allowed', opacity: isGlobalPortfolioRole ? 1 : 0.7, appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem top 50%', backgroundSize: '0.65rem auto' }}
              >
                {sedesDisponibles.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button onClick={() => setViewMode('active')} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: `1px solid ${borderLight}`, background: viewMode === 'active' ? '#f1f5f9' : 'transparent', color: viewMode === 'active' ? '#2563eb' : textMuted, fontWeight: 700, cursor: 'pointer' }}>Ciclos Activos</button>
            <button onClick={() => setViewMode('resources')} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: `1px solid ${borderLight}`, background: viewMode === 'resources' ? '#f1f5f9' : 'transparent', color: viewMode === 'resources' ? '#2563eb' : textMuted, fontWeight: 700, cursor: 'pointer' }}>Capacidad de Recursos</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 1.5rem' }}>
        
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: textMuted }}>
            <Loader2 size={40} className="animate-spin text-blue-500 mb-4" />
            <p>Sincronizando con NODUS...</p>
          </div>
        ) : errorObj ? (
          <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
            <AlertCircle size={40} style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Error de Sincronización</h2>
            <p>{errorObj}</p>
            {errorObj.includes('cierra sesión') && (
              <button 
                onClick={() => {
                  import('../services/firebase').then(({ auth }) => auth.signOut());
                  navigate('/login');
                }} 
                style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Cerrar sesión ahora
              </button>
            )}
          </div>
        ) : (
          <>
            {/* STATS ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {[
                { label: 'Proyectos Activos', value: stats.activos, icon: Activity, color: '#3b82f6', bg: '#eff6ff' },
                { label: 'En Tiempo', value: stats.tiempo, icon: CheckCircle2, color: '#10b981', bg: '#ecfdf5' },
                { label: 'Atrasado', value: stats.atrasado, icon: Clock, color: '#f59e0b', bg: '#fffbeb' },
                { label: 'Riesgo Crítico', value: stats.critico, icon: AlertCircle, color: '#ef4444', bg: '#fef2f2' }
              ].map((stat, i) => (
                <div key={i} style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>{stat.label}</div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: textDark }}>{stat.value}</div>
                  </div>
                  <div style={{ padding: '1rem', background: stat.bg, borderRadius: '50%', color: stat.color }}>
                    <stat.icon size={28} />
                  </div>
                </div>
              ))}
            </div>

            {/* LISTA DETALLADA */}
            <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h2 style={{ fontSize: '1.2rem', color: textDark, fontWeight: 800, margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Box color="#d97706" /> Detalle de Portafolio Sincronizado
              </h2>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${borderLight}`, color: textMuted, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      <th style={{ padding: '1rem', fontWeight: 700 }}>Proyecto / Ciclo</th>
                      <th style={{ padding: '1rem', fontWeight: 700 }}>Progreso (Enrolamiento)</th>
                      <th style={{ padding: '1rem', fontWeight: 700 }}>Salud</th>
                      <th style={{ padding: '1rem', fontWeight: 700 }}>Estado</th>
                      <th style={{ padding: '1rem', fontWeight: 700, textAlign: 'right' }}>Acción Requerida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map(p => (
                      <React.Fragment key={p.id}>
                        <tr style={{ borderBottom: expandedId === p.id ? 'none' : `1px solid ${borderLight}` }}>
                          <td style={{ padding: '1.25rem 1rem', color: textDark, fontWeight: 600 }}>{p.name}</td>
                          <td style={{ padding: '1.25rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ fontSize: '0.85rem', color: textDark, fontWeight: 600, width: '35px' }}>{p.progress}%</span>
                              <div style={{ flex: 1, height: '8px', background: borderLight, borderRadius: '10px', overflow: 'hidden', minWidth: '100px' }}>
                                <div style={{ width: `${p.progress}%`, height: '100%', background: p.health === 'good' ? '#10b981' : p.health === 'warning' ? '#f59e0b' : '#ef4444', borderRadius: '10px' }}></div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1.25rem 1rem' }}>
                            <span style={{
                              padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                              background: p.health === 'good' ? '#ecfdf5' : p.health === 'warning' ? '#fffbeb' : '#fef2f2',
                              color: p.health === 'good' ? '#059669' : p.health === 'warning' ? '#d97706' : '#dc2626',
                            }}>
                              {p.health === 'good' ? 'En Tiempo' : p.health === 'warning' ? 'Riesgo' : 'Crítico'}
                            </span>
                          </td>
                          <td style={{ padding: '1.25rem 1rem', color: textMuted, fontSize: '0.9rem' }}>{p.date}</td>
                          <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                            <button 
                              onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                              style={{ background: 'transparent', border: `1px solid ${borderLight}`, color: textDark, padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                              {p.action} <ChevronRight size={14} style={{ transform: expandedId === p.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                            </button>
                          </td>
                        </tr>
                        {expandedId === p.id && p.details && (
                          <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${borderLight}` }}>
                            <td colSpan="5" style={{ padding: '1.5rem', borderLeft: `4px solid ${p.health === 'good' ? '#10b981' : p.health === 'warning' ? '#f59e0b' : '#ef4444'}` }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: `1px solid ${borderLight}` }}>
                                  <div style={{ fontSize: '0.7rem', color: textMuted, textTransform: 'uppercase', fontWeight: 700 }}>Total Participantes</div>
                                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: textDark }}>{p.details.totalParticipantes}</div>
                                </div>
                                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: `1px solid ${borderLight}` }}>
                                  <div style={{ fontSize: '0.7rem', color: textMuted, textTransform: 'uppercase', fontWeight: 700 }}>Total Enrolados</div>
                                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>{p.details.totalEnrolados}</div>
                                </div>
                                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: `1px solid ${borderLight}` }}>
                                  <div style={{ fontSize: '0.7rem', color: textMuted, textTransform: 'uppercase', fontWeight: 700 }}>Deserciones FDS</div>
                                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>{p.details.totalDesertores}</div>
                                </div>
                                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: `1px solid ${borderLight}` }}>
                                  <div style={{ fontSize: '0.7rem', color: textMuted, textTransform: 'uppercase', fontWeight: 700 }}>Tasa de Deserción</div>
                                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: p.health === 'good' ? '#10b981' : p.health === 'warning' ? '#f59e0b' : '#ef4444' }}>{p.details.tasaDesercion}%</div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
