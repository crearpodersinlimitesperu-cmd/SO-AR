import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Target, TrendingUp, AlertCircle, CheckCircle2, ChevronRight, BarChart2, Briefcase, ChevronDown, ArrowLeft, Loader2, Sparkles, Bell, AlertTriangle, Zap, ShieldAlert, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc } from 'firebase/firestore';
import { db, getDocResilient } from '../services/firebase';
import { OPERATIONAL_SEDES, normalizeSede } from '../data/usersData';

export default function StrategyBoard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  // CONTEXTO (28/08/2026): mismo hallazgo de la auditoría de roles que en PortfolioBoard.jsx
  // — arrancaba fijo en 'Lima' y el desplegable ofrecía GLOBAL + las 6 sedes libremente a
  // cualquiera. Un Gerente ahora ve solo su sede; dirección/CFO/CEO/CCO/superadmin/consolidado
  // (ver allowedRoles en App.jsx para /estrategia) conservan visión global.
    const isGlobalStrategyRole = (() => {
    if (currentUser?.isSuperAdmin) return true;
    const exec = ['direccion', 'cfo', 'ceo', 'cco'];
    if (currentUser?.appRole === 'consolidado') {
      return (currentUser?.roles || []).some(r => exec.includes(r));
    }
    return exec.includes(currentUser?.appRole);
  })();
  const [selectedSede, setSelectedSede] = useState(() => isGlobalStrategyRole ? 'GLOBAL' : normalizeSede(currentUser?.sede));

  const sedesDisponibles = isGlobalStrategyRole ? ['GLOBAL', ...OPERATIONAL_SEDES] : [normalizeSede(currentUser?.sede)];
  const [loading, setLoading] = useState(true);
  const [globalHealth, setGlobalHealth] = useState(0);
  const [okrs, setOkrs] = useState([]);
  const [errorObj, setErrorObj] = useState(null);
  const [predictionData, setPredictionData] = useState(null);
  const [managerAlerts, setManagerAlerts] = useState([]);

  const bgLight = "#f8fafc";
  const bgCard = "#ffffff";
  const textDark = "#0f172a";
  const textMuted = "#64748b";
  const borderLight = "#e2e8f0";

  useEffect(() => {
    async function fetchData() {
      try {
        const docRef = doc(db, 'nodus_coordinadores_c1c2', 'latest');
        const docSnap = await getDocResilient(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          let okrGenerales = [];

          let totalAsignados = 0;
          let totalGestiones = 0;
          let totalConfirmados = 0;

          if (selectedSede === 'GLOBAL') {
            if (data.totales) {
              totalAsignados = data.totales.totalAsignados || 0;
              totalGestiones = data.totales.totalGestiones || 0;
              totalConfirmados = data.totales.totalConfirmados || 0;
            }
          } else {
            if (data.sedes) {
              const sedeData = data.sedes.find(s => String(s.sede).toUpperCase() === selectedSede.toUpperCase());
              if (sedeData) {
                totalAsignados = sedeData.asignadosTotal || 0;
                totalGestiones = sedeData.gestionesTotal || 0;
                totalConfirmados = sedeData.confirmadosTotal || 0;
              }
            }
          }

          let contactabilidadRate = totalAsignados > 0 ? Math.round((totalGestiones / totalAsignados) * 100) : 0;
          if(contactabilidadRate > 100) contactabilidadRate = 100;

          okrGenerales.push({
            id: 1,
            owner: 'Mesa de Registro',
            objective: 'Maximizar Tasa de Contactabilidad Base C1',
            progress: contactabilidadRate || 0,
            keyResults: [
              { id: 'kr1', text: 'Total Gestiones Realizadas (Coordinadores)', current: totalGestiones, target: totalAsignados, unit: 'llamadas' }
            ]
          });

          let enrolRate = totalAsignados > 0 ? Math.round((totalConfirmados / totalAsignados) * 100) : 0;
          if(enrolRate > 100) enrolRate = 100;

          okrGenerales.push({
            id: 2,
            owner: 'Staff Elite',
            objective: 'Cumplimiento de Metas de Enrolamiento (Participantes)',
            progress: enrolRate || 0,
            keyResults: [
              { id: 'kr2', text: 'Enrolamiento de Participantes Base Asignados', current: totalConfirmados, target: totalAsignados, unit: 'enrolados' }
            ]
          });

          setOkrs(okrGenerales);
          
          let prom = 0;
          if (okrGenerales.length > 0) {
             prom = Math.round(okrGenerales.reduce((acc, curr) => acc + curr.progress, 0) / okrGenerales.length);
          }
          setGlobalHealth(prom || 0);

          // CÁLCULO OBJETIVO DEL AGENTE DE PREDICCIÓN OPERATIVA
          const diasCampanaTranscurridos = 8;
          const diasRestantesSala = 4;
          const ritmoDiario = totalConfirmados > 0 ? (totalConfirmados / diasCampanaTranscurridos) : 0;
          const proyeccionFinal = Math.round(totalConfirmados + (ritmoDiario * diasRestantesSala));
          const metaSalaSede = selectedSede === 'GLOBAL' ? 180 : 32;
          const probabilidadCumplimiento = Math.min(100, Math.round((proyeccionFinal / metaSalaSede) * 100));

          setPredictionData({
            confirmados: totalConfirmados,
            asignados: totalAsignados,
            ritmoDiario: ritmoDiario.toFixed(1),
            diasRestantes: diasRestantesSala,
            proyeccionFinal,
            meta: metaSalaSede,
            probabilidad: probabilidadCumplimiento,
            tendencia: ritmoDiario >= 2.5 ? 'ACELERANDO' : ritmoDiario >= 1.0 ? 'ESTABLE' : 'LENTO'
          });

          // CÁLCULO DEL AGENTE DE ALERTAS A GERENTES DE ACTIVIDAD EN NODUS
          const coords = data.coordinadores || [];
          const filteredCoords = selectedSede === 'GLOBAL' 
            ? coords 
            : coords.filter(c => String(c.sede).toUpperCase() === selectedSede.toUpperCase());

          const generatedAlerts = [];
          filteredCoords.forEach(c => {
            const est = c.estados || {};
            const asig = Number(est.asignados || 0);
            const conf = Number(est.confirmado || 0);
            const porConf = Number(est.porConfirmar || 0);
            const noCont = Number(est.noContesta || 0);
            const llam = Number(est.llamadas || 0);
            const pend = asig - llam;

            if (asig > 0 && llam === 0) {
              generatedAlerts.push({
                id: `alt_zero_${c.id}`,
                tipo: 'CRITICA',
                icono: 'AlertTriangle',
                color: '#ef4444',
                coordinador: c.nombre,
                sede: c.sede,
                mensaje: `Sin actividad registrada: 0 de ${asig} contactos llamados.`,
                accionRecomendada: 'Comunicarse inmediatamente con el coordinador para verificar bloqueo o reasignar base.'
              });
            } else if (asig > 15 && pend > (asig * 0.6)) {
              generatedAlerts.push({
                id: `alt_pend_${c.id}`,
                tipo: 'ADVERTENCIA',
                icono: 'Clock',
                color: '#f59e0b',
                coordinador: c.nombre,
                sede: c.sede,
                mensaje: `Ritmo rezagado: ${pend} contactos pendientes de gestión (${Math.round((pend/asig)*100)}% de su base).`,
                accionRecomendada: 'Habilitar apoyo telefónico con Quantum Team en bloque vespertino.'
              });
            }

            if (porConf >= 8) {
              generatedAlerts.push({
                id: `alt_close_${c.id}`,
                tipo: 'OPORTUNIDAD',
                icono: 'Zap',
                color: '#3b82f6',
                coordinador: c.nombre,
                sede: c.sede,
                mensaje: `Alta reserva de cierre: ${porConf} contactos 'Por Confirmar' listos para pase a sala.`,
                accionRecomendada: 'Realizar llamada de cierre con speech de bienvenida y confirmación de cupo.'
              });
            }
          });

          setManagerAlerts(generatedAlerts);
          setErrorObj(null);

        } else {
          console.warn("No se encontró el snapshot de Nodus");
          setErrorObj("No se encontró el archivo de datos sincronizados (latest) en la base de datos.");
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
                disabled={!isGlobalStrategyRole}
                style={{ padding: '0.4rem 2rem 0.4rem 0.8rem', borderRadius: '6px', border: `1px solid ${borderLight}`, background: bgCard, color: textDark, fontWeight: 700, fontSize: '0.85rem', cursor: isGlobalStrategyRole ? 'pointer' : 'not-allowed', opacity: isGlobalStrategyRole ? 1 : 0.7, appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem top 50%', backgroundSize: '0.65rem auto' }}
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
                <div style={{ fontSize: '0.75rem', color: textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>{`Salud Estratégica ${selectedSede === 'GLOBAL' ? 'Global' : selectedSede}`}</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>{globalHealth}%</span>
                  <span style={{ color: textMuted, fontSize: '0.9rem', marginBottom: '0.3rem' }}>{`Cumplimiento ${selectedSede === 'GLOBAL' ? 'Global' : 'Sede'} (Calculado en Vivo)`}</span>
                </div>
              </div>
              <div style={{ padding: '1rem', background: '#ecfdf5', borderRadius: '50%', color: '#10b981' }}>
                <TrendingUp size={32} />
              </div>
            </div>

            {/* 1. AGENTE DE PREDICCIÓN OPERATIVA */}
            {predictionData && (
              <div style={{ background: bgCard, border: '1px solid #10b981', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ padding: '0.4rem', borderRadius: '8px', background: '#ecfdf5', color: '#10b981', display: 'flex' }}>
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: textDark, margin: 0 }}>
                        Agente de Predicción Operativa (Causa OS Engine)
                      </h3>
                      <p style={{ fontSize: '0.75rem', color: textMuted, margin: 0 }}>
                        Proyección algorítmica de confirmados al día de apertura de sala
                      </p>
                    </div>
                  </div>
                  <span style={{ padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, background: predictionData.probabilidad >= 80 ? '#ecfdf5' : predictionData.probabilidad >= 50 ? '#fffbeb' : '#fef2f2', color: predictionData.probabilidad >= 80 ? '#10b981' : predictionData.probabilidad >= 50 ? '#f59e0b' : '#ef4444', border: `1px solid ${predictionData.probabilidad >= 80 ? '#10b981' : predictionData.probabilidad >= 50 ? '#f59e0b' : '#ef4444'}` }}>
                    Probabilidad de Meta: {predictionData.probabilidad}%
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: `1px solid ${borderLight}` }}>
                    <div style={{ fontSize: '0.72rem', color: textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Confirmados Actuales</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>{predictionData.confirmados}</div>
                    <div style={{ fontSize: '0.68rem', color: textMuted }}>Enrolados auditados</div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: `1px solid ${borderLight}` }}>
                    <div style={{ fontSize: '0.72rem', color: textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Ritmo de Enrolamiento</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#3b82f6' }}>{predictionData.ritmoDiario} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>/día</span></div>
                    <div style={{ fontSize: '0.68rem', color: textMuted }}>Tendencia: {predictionData.tendencia}</div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: `1px solid ${borderLight}` }}>
                    <div style={{ fontSize: '0.72rem', color: textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Proyección al Cierre</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: predictionData.proyeccionFinal >= predictionData.meta ? '#10b981' : '#f59e0b' }}>
                      {predictionData.proyeccionFinal} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>/ {predictionData.meta}</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: textMuted }}>En {predictionData.diasRestantes} días restantes</div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: `1px solid ${borderLight}` }}>
                    <div style={{ fontSize: '0.72rem', color: textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Déficit a Cubrir</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: Math.max(0, predictionData.meta - predictionData.confirmados) === 0 ? '#10b981' : '#ef4444' }}>
                      {Math.max(0, predictionData.meta - predictionData.confirmados)}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: textMuted }}>Cupos para meta segura</div>
                  </div>
                </div>

                {/* BARRA PREDICTIVA */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                    <span>Progreso Proyectado vs Meta de Sala ({predictionData.meta} pax)</span>
                    <span style={{ color: '#10b981' }}>{predictionData.probabilidad}% esperado</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: borderLight, borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, predictionData.probabilidad)}%`, height: '100%', background: predictionData.probabilidad >= 80 ? '#10b981' : predictionData.probabilidad >= 50 ? '#f59e0b' : '#ef4444', borderRadius: '6px' }} />
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: textDark, background: '#f1f5f9', padding: '0.75rem 1rem', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                  🎯 <strong>Dictamen Algorítmico:</strong> Al ritmo actual de {predictionData.ritmoDiario} confirmaciones/día, la proyección de cierre es de {predictionData.proyeccionFinal} participantes. {predictionData.proyeccionFinal >= predictionData.meta ? 'La sede alcanzará la cuota programada de sala con holgura operativa.' : `Se requiere elevar el ritmo a ${((predictionData.meta - predictionData.confirmados) / predictionData.diasRestantes).toFixed(1)} confirmados/día para garantizar sala completa.`}
                </div>
              </div>
            )}

            {/* 2. AGENTE DE ALERTAS A GERENTES DE ACTIVIDAD EN NODUS */}
            <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ padding: '0.4rem', borderRadius: '8px', background: '#fee2e2', color: '#ef4444', display: 'flex' }}>
                    <Bell size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: textDark, margin: 0 }}>
                      Agente de Alertas a Gerentes (Monitoreo Nodus en Vivo)
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: textMuted, margin: 0 }}>
                      Detección automática de rezagos de gestión, cuellos de botella y oportunidades
                    </p>
                  </div>
                </div>

                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.3rem 0.6rem', borderRadius: '6px', background: '#f1f5f9', color: textDark }}>
                  {managerAlerts.length} Alerta{managerAlerts.length === 1 ? '' : 's'} Activa{managerAlerts.length === 1 ? '' : 's'}
                </span>
              </div>

              {managerAlerts.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#10b981', background: '#ecfdf5', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                  ✓ Sin anomalías operativas: Todos los coordinadores registran gestión activa y flujo normal en Nodus.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {managerAlerts.map(alert => (
                    <div 
                      key={alert.id}
                      style={{ 
                        padding: '1rem', 
                        borderRadius: '8px', 
                        border: `1px solid ${alert.color}40`, 
                        background: `${alert.color}08`,
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flex: 1, minWidth: '280px' }}>
                        <div style={{ color: alert.color, marginTop: '2px' }}>
                          {alert.tipo === 'CRITICA' ? <AlertTriangle size={18} /> : alert.tipo === 'OPORTUNIDAD' ? <Zap size={18} /> : <Clock size={18} />}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: alert.color, textTransform: 'uppercase' }}>
                              [{alert.tipo}] {alert.sede}: {alert.coordinador}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: textDark, marginBottom: '0.3rem' }}>
                            {alert.mensaje}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: textMuted }}>
                            ⚡ <strong>Acción Sugerida para Gerente:</strong> {alert.accionRecomendada}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate('/auditoria-coordinadores')}
                        style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', background: bgCard, border: `1px solid ${borderLight}`, fontSize: '0.75rem', fontWeight: 700, color: textDark, cursor: 'pointer' }}
                      >
                        Auditar en Nodus →
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                        <div style={{ fontSize: '0.7rem', color: textMuted, fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>{`Progreso ${selectedSede === 'GLOBAL' ? 'Global' : 'Sede'}`}</div>
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
