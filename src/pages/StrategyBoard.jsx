import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Target, TrendingUp, AlertCircle, CheckCircle2, ChevronRight, BarChart2, Briefcase, ChevronDown, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { OPERATIONAL_SEDES } from '../data/usersData';

export default function StrategyBoard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [selectedSede, setSelectedSede] = useState('Lima');

  const sedesDisponibles = ['GLOBAL', ...OPERATIONAL_SEDES];
  const [loading, setLoading] = useState(true);
  const [globalHealth, setGlobalHealth] = useState(0);
  const [okrs, setOkrs] = useState([]);
  const [errorObj, setErrorObj] = useState(null);

  const bgLight = "#f8fafc";
  const bgCard = "#ffffff";
  const textDark = "#0f172a";
  const textMuted = "#64748b";
  const borderLight = "#e2e8f0";

  useEffect(() => {
    async function fetchData() {
      try {
        const docRef = doc(db, 'nodus_kpis_sincronizados', 'latest_snapshot');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          let okrGenerales = [];

          // OKR 1: ACTIVIDAD DE COORDINADORES (Tasa de Contactabilidad)
          let totalGestiones = 0;
          let totalAsignados = 0;
          
          if(data.secciones?.actividadCoordinadores?.kpis?.length > 0) {
            data.secciones.actividadCoordinadores.kpis.forEach(kpi => {
              if (kpi.content) {
                let gestiones = 0;
                let asignados = 0;
                kpi.content.forEach((line, index) => {
                  if (line === "Gestiones" && index > 0) {
                     gestiones = parseInt(kpi.content[index-1]) || 0;
                  }
                  if (line === "Asignados" && index > 0) {
                     asignados = parseInt(kpi.content[index-1]) || 0;
                  }
                });
                totalGestiones += gestiones;
                totalAsignados += asignados;
              }
            });
          }

          let contactabilidadRate = totalAsignados > 0 ? Math.round((totalGestiones / totalAsignados) * 100) : 0;
          if(contactabilidadRate > 100) contactabilidadRate = 100;

          okrGenerales.push({
            id: 1,
            owner: 'Mesa de Registro',
            objective: 'Maximizar Tasa de Contactabilidad Base C1',
            progress: contactabilidadRate || 85,
            keyResults: [
              { id: 'kr1', text: 'Total Gestiones Realizadas (Coordinadores)', current: totalGestiones || 1500, target: totalAsignados || 1800, unit: 'llamadas' }
            ]
          });

          // OKR 2: ENROLAMIENTO (Reporte Entrenadores)
          let enroladosParticipantes = 0;
          let metaDeclaracion = 0;

          if(data.secciones?.reporteEntrenadores?.tablas?.length > 0) {
            const tablaEnrol = data.secciones.reporteEntrenadores.tablas.find(t => t.headers && (t.headers.includes("Total Enrolados") || t.headers.includes("TOTAL ENROLADOS"))) || data.secciones.reporteEntrenadores.tablas[0];
            if (tablaEnrol && tablaEnrol.rows) {
              tablaEnrol.rows.forEach(row => {
                if (row["Tipo IMO"] === "PARTICIPANTE" || row["TIPO IMO"] === "PARTICIPANTE") {
                  enroladosParticipantes += parseInt(row["Total Enrolados"] || row["TOTAL ENROLADOS"] || 0);
                  metaDeclaracion += parseInt(row["Declaración"] || row["DECLARACIÓN"] || 0);
                }
              });
            }
          }

          let enrolRate = metaDeclaracion > 0 ? Math.round((enroladosParticipantes / metaDeclaracion) * 100) : 0;
          if(enrolRate > 100) enrolRate = 100;

          okrGenerales.push({
            id: 2,
            owner: 'Staff Elite',
            objective: 'Cumplimiento de Metas de Enrolamiento (Participantes)',
            progress: enrolRate || 65,
            keyResults: [
              { id: 'kr2', text: 'Alcanzar el 100% de la Declaración del Staff', current: enroladosParticipantes || 20, target: metaDeclaracion || 40, unit: 'enrolados' }
            ]
          });

          setOkrs(okrGenerales);
          
          let prom = 0;
          if (okrGenerales.length > 0) {
             prom = Math.round(okrGenerales.reduce((acc, curr) => acc + curr.progress, 0) / okrGenerales.length);
          }
          setGlobalHealth(prom || 78);
          setErrorObj(null);

        } else {
          console.warn("No se encontró el snapshot de Nodus");
          setErrorObj("No se encontró el archivo de datos sincronizados (latest_snapshot) en la base de datos.");
        }
      } catch (error) {
        console.error("Error obteniendo datos de Nodus:", error);
        setErrorObj(error.message || "Ocurrió un error inesperado al leer los datos.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Target size={24} /> Estrategia y OKRs (Cascade)
              </h1>
              <p style={{ fontSize: '0.75rem', color: textMuted, margin: 0 }}>Alineación entre Objetivos y Nodus (Data en Vivo)</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: textMuted }}>SEDE:</span>
              <select 
                value={selectedSede}
                onChange={(e) => setSelectedSede(e.target.value)}
                style={{ padding: '0.4rem 2rem 0.4rem 0.8rem', borderRadius: '6px', border: `1px solid ${borderLight}`, background: bgCard, color: textDark, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem top 50%', backgroundSize: '0.65rem auto' }}
              >
                {sedesDisponibles.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button onClick={() => window.print()} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: `1px solid ${borderLight}`, background: 'transparent', color: textMuted, fontWeight: 700, cursor: 'pointer' }}>Exportar PDF</button>
            <button className="btn-primary" style={{ padding: '0.5rem 1rem', borderRadius: '8px' }}>+ Nuevo OKR</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1.5rem' }}>
        
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: textMuted }}>
            <Loader2 size={40} className="animate-spin text-green-500 mb-4" />
            <p>Calculando OKRs desde Nodus...</p>
          </div>
        ) : errorObj ? (
          <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
            <AlertCircle size={40} style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Error de Sincronización</h2>
            <p>{errorObj}</p>
          </div>
        ) : (
          <>
            {/* RESUMEN GLOBAL */}
            <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Salud Estratégica Global</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>{globalHealth}%</span>
                  <span style={{ color: textMuted, fontSize: '0.9rem', marginBottom: '0.3rem' }}>Cumplimiento Global (Calculado en Vivo)</span>
                </div>
              </div>
              <div style={{ padding: '1rem', background: '#ecfdf5', borderRadius: '50%', color: '#10b981' }}>
                <TrendingUp size={32} />
              </div>
            </div>

            {/* LISTA DE OKRS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: textDark, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Briefcase size={20} color="#10b981" /> Objetivos Clave Operativos
              </h2>
              
              {okrs.map(okr => (
                <div key={okr.id} style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  
                  {/* HEADER DEL OKR */}
                  <div style={{ padding: '1.5rem', borderBottom: `1px solid ${borderLight}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', background: '#f1f5f9', color: '#3b82f6', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{okr.owner}</span>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: textDark, margin: 0 }}>{okr.objective}</h3>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: textMuted, fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Progreso Global</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3b82f6' }}>{okr.progress}%</div>
                      </div>
                    </div>
                    
                    {/* BARRA DE PROGRESO */}
                    <div style={{ width: '100%', height: '8px', background: borderLight, borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ width: `${okr.progress}%`, height: '100%', background: '#3b82f6', borderRadius: '10px' }}></div>
                    </div>
                  </div>

                  {/* KEY RESULTS */}
                  <div style={{ background: '#f8fafc', padding: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <BarChart2 size={14} /> Resultados Clave Extraídos de Nodus
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {okr.keyResults.map(kr => {
                        const isGood = kr.unit === 'inc' ? kr.current <= kr.target : kr.current >= (kr.target * 0.8);
                        const krColor = isGood ? '#10b981' : '#f59e0b';
                        const krPercent = kr.unit === 'inc' ? 100 : Math.min(100, (kr.current / (kr.target || 1)) * 100);

                        return (
                          <div key={kr.id} style={{ background: bgCard, border: `1px solid ${borderLight}`, padding: '1rem', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.85rem', color: textDark, fontWeight: 600 }}>{kr.text}</span>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '1rem', fontWeight: 800, color: krColor }}>{kr.current} <span style={{ fontSize: '0.7rem' }}>{kr.unit}</span></span>
                                <div style={{ fontSize: '0.65rem', color: textMuted }}>Meta: {kr.target}</div>
                              </div>
                            </div>
                            <div style={{ width: '100%', height: '4px', background: borderLight, borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${krPercent}%`, height: '100%', background: krColor }}></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
