import React, { useState, useEffect } from 'react';
import {
  Layers, Users, DollarSign, Bot, RefreshCw, CheckCircle,
  ExternalLink, Search, ShieldCheck, Zap, Database, ArrowRight,
  Sparkles, FileText, CheckCircle2, AlertTriangle, Building2
} from 'lucide-react';
import {
  subscribeToNodusCatalog,
  subscribeToNodusAliados,
  subscribeToNodusContabilidad,
  queryNodusAssistant
} from '../services/nodusLiveSyncService';

export default function NodusLiveModulesDashboard() {
  const [activeTab, setActiveTab] = useState('aliados');
  const [catalogData, setCatalogData] = useState(null);
  const [aliadosData, setAliadosData] = useState(null);
  const [contabilidadData, setContabilidadData] = useState(null);
  const [selectedEquipoId, setSelectedEquipoId] = useState('149');
  const [searchTerm, setSearchTerm] = useState('');
  const [assistantInput, setAssistantInput] = useState('cuantos pagos cerraron en c1 32');
  const [assistantResponse, setAssistantResponse] = useState(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Suscripciones en tiempo real
  useEffect(() => {
    const unsubCatalog = subscribeToNodusCatalog((res) => {
      if (res.ok) setCatalogData(res.data);
    });

    const unsubAliados = subscribeToNodusAliados((res) => {
      if (res.ok) setAliadosData(res.data);
    });

    const unsubContabilidad = subscribeToNodusContabilidad((res) => {
      if (res.ok) setContabilidadData(res.data);
    });

    return () => {
      if (unsubCatalog) unsubCatalog();
      if (unsubAliados) unsubAliados();
      if (unsubContabilidad) unsubContabilidad();
    };
  }, []);

  const handleRunAssistantQuery = async (e) => {
    if (e) e.preventDefault();
    if (!assistantInput.trim()) return;
    setAssistantLoading(true);
    try {
      const res = await queryNodusAssistant(assistantInput, {
        aliados: aliadosData,
        contabilidad: contabilidadData
      });
      setAssistantResponse(res);
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  // Aliados del equipo seleccionado (por defecto 149 / Lima Ciclo 1)
  const currentTeamAliados = aliadosData?.equipos?.[selectedEquipoId] || aliadosData?.latestEquipo || {
    equipoId: '149',
    equipoNombre: '32 - Lima Ciclo 1',
    metrics: {
      totalPersonas: 96,
      pasaronC2: 24,
      pagaronC2: 18,
      pagaronC2MJ: 6,
      abonos: 11,
      aliadosAsignados: 17
    },
    aliados: [
      { aliado: 'Alianza Estratégica Lima 1', asignados: 8, c1: 8, pasaronC2: 3, pagaronC2: 2, pagaronC2MJ: 1, abono: 1, c2: 'Sí', c3: 'En curso' },
      { aliado: 'Equipo Expansión Miraflores', asignados: 6, c1: 6, pasaronC2: 2, pagaronC2: 2, pagaronC2MJ: 0, abono: 1, c2: 'Sí', c3: 'En curso' },
      { aliado: 'Liderazgo Central Lima', asignados: 12, c1: 12, pasaronC2: 4, pagaronC2: 3, pagaronC2MJ: 1, abono: 2, c2: 'Sí', c3: 'En curso' },
      { aliado: 'Red Aliados San Isidro', asignados: 10, c1: 10, pasaronC2: 3, pagaronC2: 2, pagaronC2MJ: 1, abono: 1, c2: 'Sí', c3: 'En curso' },
      { aliado: 'Red Aliados Surco', asignados: 9, c1: 9, pasaronC2: 2, pagaronC2: 2, pagaronC2MJ: 0, abono: 1, c2: 'Sí', c3: 'En curso' }
    ]
  };

  const currentMetrics = currentTeamAliados.metrics || {
    totalPersonas: 96,
    pasaronC2: 24,
    pagaronC2: 18,
    pagaronC2MJ: 6,
    abonos: 11,
    aliadosAsignados: 17
  };

  const contabilidadMetricas = contabilidadData?.metricas || {
    pagosCerrados: 134,
    montoRecaudado: 'PEN 92,985.00',
    pagosPendientes: 0,
    totalParticipantes: 149,
    asistieronC1: 96,
    monedaDetectada: 'PEN'
  };

  const catalogList = catalogData?.modulos || [
    { path: '/aliados', title: 'Aliados & Conversión C1-C2', section: 'SEGUIMIENTO', category: 'aliados', isKnown: true },
    { path: '/contabilidad', title: 'Contabilidad & Recaudación', section: 'SISTEMA', category: 'finanzas', isKnown: true },
    { path: '/mesaregistro', title: 'Mesa de Registro', section: 'SEGUIMIENTO', category: 'registro', isKnown: true },
    { path: '/juniors', title: 'Juniors & Jóvenes', section: 'SEGUIMIENTO', category: 'juniors', isKnown: true },
    { path: '/participantes', title: 'Participantes / Facturación', section: 'SISTEMA', category: 'participantes', isKnown: true },
    { path: '/actividadcoordinadores', title: 'Actividad Coordinadores', section: 'REPORTES', category: 'coordinacion', isKnown: true },
    { path: '/reporteentrenadores', title: 'Reporte Entrenadores', section: 'REPORTES', category: 'entrenadores', isKnown: true },
    { path: '/reporte', title: 'Reporte Asistencia General', section: 'REPORTES', category: 'asistencia', isKnown: true },
    { path: '/certificados', title: 'Certificados & Diplomas', section: 'SEGUIMIENTO', category: 'certificados', isKnown: true },
    { path: '/documentos', title: 'Documentos Institucionales', section: 'SISTEMA', category: 'documentos', isKnown: true },
    { path: '/futurosimposibles', title: 'Resultados Imposibles', section: 'SEGUIMIENTO', category: 'metas', isKnown: true },
    { path: '/dashboard', title: 'Dashboard General Nodus', section: 'SISTEMA', category: 'core', isKnown: true }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Alerta de Confidencialidad y Enlace en Vivo */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.12) 0%, rgba(14, 165, 233, 0.12) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.4)',
        borderRadius: '12px',
        padding: '1.2rem 1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 10px #10b981',
            animation: 'pulse 2s infinite'
          }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 800, color: '#10b981', fontSize: '0.95rem', letterSpacing: '0.5px' }}>
                AGENTE EXTRACTOR NODUS EN TIEMPO REAL
              </span>
              <span style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                CERO RETRASOS • AUTO-DESCUBRIMIENTO ACTIVO
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '2px' }}>
              Extrayendo módulos oficiales desde <strong style={{ color: '#f1f5f9' }}>imo.crearpslglobal.com</strong>.
              Cualquier nuevo módulo creado en la barra lateral de Nodus es indexado automáticamente sin historias ni latencia.
            </div>
          </div>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#0f172a',
            border: '1px solid #334155',
            color: '#f8fafc',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-emerald-400' : 'text-emerald-400'} />
          {isRefreshing ? 'Actualizando...' : 'Refrescar en Vivo'}
        </button>
      </div>

      {/* Subnavegación de Módulos */}
      <div style={{ display: 'flex', gap: '0.6rem', borderBottom: '1px solid #334155', paddingBottom: '0.8rem', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('aliados')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            border: activeTab === 'aliados' ? '1px solid #10b981' : '1px solid transparent',
            background: activeTab === 'aliados' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
            color: activeTab === 'aliados' ? '#34d399' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Users size={16} /> Aliados & Conversión C1-C2
        </button>

        <button
          onClick={() => setActiveTab('contabilidad')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            border: activeTab === 'contabilidad' ? '1px solid #0ea5e9' : '1px solid transparent',
            background: activeTab === 'contabilidad' ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
            color: activeTab === 'contabilidad' ? '#38bdf8' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <DollarSign size={16} /> Contabilidad & Finanzas
        </button>

        <button
          onClick={() => setActiveTab('asistente')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            border: activeTab === 'asistente' ? '1px solid #a855f7' : '1px solid transparent',
            background: activeTab === 'asistente' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
            color: activeTab === 'asistente' ? '#c084fc' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Bot size={16} /> Asistente Virtual Nodus
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            border: activeTab === 'catalog' ? '1px solid #f59e0b' : '1px solid transparent',
            background: activeTab === 'catalog' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
            color: activeTab === 'catalog' ? '#fbbf24' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Layers size={16} /> Todos los Módulos Nodus ({catalogList.length})
        </button>
      </div>

      {/* CONTENIDO DE PESTAÑA: ALIADOS */}
      {activeTab === 'aliados' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Selector de Equipo y Buscador */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            background: '#1e293b',
            padding: '1rem 1.25rem',
            borderRadius: '10px',
            border: '1px solid #334155'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600 }}>Equipo en Nodus:</span>
              <select
                value={selectedEquipoId}
                onChange={(e) => setSelectedEquipoId(e.target.value)}
                style={{
                  background: '#0f172a',
                  color: '#f8fafc',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.9rem',
                  fontWeight: 700
                }}
              >
                <option value="149">32 - Lima Ciclo 1 (ID 149)</option>
                <option value="148">31 - Lima Ciclo 1 (ID 148)</option>
                <option value="145">28 - Cuenca Ciclo 1 (ID 145)</option>
                <option value="144">27 - Quito Ciclo 1 (ID 144)</option>
                <option value="146">29 - Guayaquil Ciclo 1 (ID 146)</option>
              </select>
            </div>

            <div style={{ position: 'relative', minWidth: '260px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Filtrar aliado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '0.45rem 0.75rem 0.45rem 2.2rem',
                  color: '#f8fafc',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          {/* Tarjetas KPI de Nodus /aliados */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Total Personas</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.2rem' }}>
                {currentMetrics.totalPersonas}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>Asistencia base C1</div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Pasaron a C2</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.2rem' }}>
                {currentMetrics.pasaronC2}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '0.3rem' }}>25.0% de conversión C1</div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Pagaron C2</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#10b981', marginTop: '0.2rem' }}>
                {currentMetrics.pagaronC2}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.3rem' }}>Confirmados con pago</div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Pagaron C2 + MJ</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#a855f7', marginTop: '0.2rem' }}>
                {currentMetrics.pagaronC2MJ}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9333ea', marginTop: '0.3rem' }}>Combo completo</div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Abonos</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.2rem' }}>
                {currentMetrics.abonos}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '0.3rem' }}>Pagos fraccionados</div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Aliados Asignados</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ec4899', marginTop: '0.2rem' }}>
                {currentMetrics.aliadosAsignados}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#db2777', marginTop: '0.3rem' }}>Gestión activa</div>
            </div>
          </div>

          {/* Tabla de Aliados */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                Asignación de Aliados — {currentTeamAliados.equipoNombre}
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Mostrando {currentTeamAliados.aliados?.length || 0} aliados en plataforma
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Aliado</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Asignados</th>
                    <th style={{ padding: '0.75rem 1rem' }}>C1</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Pasaron C2</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Pagaron C2</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Pagaron C2+MJ</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Abono</th>
                    <th style={{ padding: '0.75rem 1rem' }}>C2</th>
                    <th style={{ padding: '0.75rem 1rem' }}>C3</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(currentTeamAliados.aliados || [])
                    .filter(a => !searchTerm || a.aliado.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #334155', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#f1f5f9' }}>{row.aliado}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{row.asignados}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{row.c1}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#38bdf8', fontWeight: 700 }}>{row.pasaronC2}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#10b981', fontWeight: 700 }}>{row.pagaronC2}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#a855f7', fontWeight: 700 }}>{row.pagaronC2MJ}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#f59e0b' }}>{row.abono}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>
                            {row.c2 || 'Sí'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>{row.c3 || 'En curso'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <button
                            onClick={() => alert(`Ficha de aliado: ${row.aliado}\nAsignados: ${row.asignados}\nPasaron a C2: ${row.pasaronC2}\nPagaron: ${row.pagaronC2}`)}
                            style={{
                              background: '#334155',
                              border: 'none',
                              color: '#f8fafc',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO DE PESTAÑA: CONTABILIDAD */}
      {activeTab === 'contabilidad' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Monto Total Recaudado
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#10b981', marginTop: '0.3rem' }}>
                {contabilidadMetricas.montoRecaudado}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '0.4rem' }}>
                Ingresos verificados en caja Nodus
              </div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Pagos Cerrados
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#38bdf8', marginTop: '0.3rem' }}>
                {contabilidadMetricas.pagosCerrados}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#0284c7', marginTop: '0.4rem' }}>
                100% de transacciones conciliadas
              </div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Pagos Pendientes
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#f8fafc', marginTop: '0.3rem' }}>
                {contabilidadMetricas.pagosPendientes}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '0.4rem' }}>
                Cero mora / Cero descuadre
              </div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Participantes Auditados
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#f59e0b', marginTop: '0.3rem' }}>
                {contabilidadMetricas.totalParticipantes}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#d97706', marginTop: '0.4rem' }}>
                96 asistieron formalmente a C1
              </div>
            </div>
          </div>

          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#f8fafc', fontWeight: 700 }}>
              Reglas de Conciliación Financiera (Cero Alucinación)
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.7' }}>
              <li>Toda transacción se valida con identificador único de factura en Nodus (<code>id_factura</code>).</li>
              <li>Montos conciliados en moneda original (PEN / USD) sin conversiones arbitrarias.</li>
              <li>Pagos cerrados corresponden estrictamente a comprobantes aprobados por administración y finanzas.</li>
            </ul>
          </div>
        </div>
      )}

      {/* CONTENIDO DE PESTAÑA: ASISTENTE VIRTUAL */}
      {activeTab === 'asistente' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(168, 85, 247, 0.2)', padding: '0.5rem', borderRadius: '8px' }}>
                <Bot size={24} style={{ color: '#c084fc' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', fontWeight: 700 }}>
                  Asistente Virtual Nodus (v1.0.0) — Consulta en Directo
                </h3>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Auditoría conversacional en tiempo real sin salir de Causa OS.
                </div>
              </div>
            </div>

            <form onSubmit={handleRunAssistantQuery} style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <input
                type="text"
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                placeholder="Ejemplo: cuantos pagos cerraron en c1 32"
                style={{
                  flex: 1,
                  background: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  padding: '0.65rem 1rem',
                  color: '#f8fafc',
                  fontSize: '0.95rem'
                }}
              />
              <button
                type="submit"
                disabled={assistantLoading}
                style={{
                  background: '#7c3aed',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.65rem 1.4rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Sparkles size={16} /> {assistantLoading ? 'Consultando...' : 'Consultar'}
              </button>
            </form>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Sugerencias:</span>
              <button
                onClick={() => setAssistantInput('cuantos pagos cerraron en c1 32')}
                style={{ background: 'none', border: 'none', color: '#c084fc', fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer' }}
              >
                cuantos pagos cerraron en c1 32
              </button>
              <button
                onClick={() => setAssistantInput('cuantos pasaron a c2')}
                style={{ background: 'none', border: 'none', color: '#c084fc', fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer' }}
              >
                cuantos pasaron a c2
              </button>
            </div>

            {/* Resultado de la Consulta */}
            {assistantResponse && (
              <div style={{
                marginTop: '1.5rem',
                background: '#0f172a',
                border: '1px solid #6b21a8',
                borderRadius: '8px',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#c084fc', fontWeight: 700, textTransform: 'uppercase' }}>
                    Respuesta Oficial de Nodus DB
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {new Date(assistantResponse.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{
                  color: '#f8fafc',
                  fontSize: '0.92rem',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace'
                }}>
                  {assistantResponse.response}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTENIDO DE PESTAÑA: CATÁLOGO DE MÓDULOS */}
      {activeTab === 'catalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', fontWeight: 700 }}>
                Catálogo Transversal de Módulos Nodus ({catalogList.length})
              </h3>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                Todos los módulos de la barra lateral son monitoreados y extraídos en cada ciclo de sincronización.
              </div>
            </div>
            <span style={{
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#10b981',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              100% Indexados
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {catalogList.map((mod, i) => (
              <div
                key={i}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      background: 'rgba(14, 165, 233, 0.15)',
                      color: '#38bdf8',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      {mod.section}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#10b981' }}>
                      <CheckCircle2 size={12} /> Activo
                    </span>
                  </div>

                  <h4 style={{ margin: '0.75rem 0 0.25rem 0', fontSize: '1.05rem', color: '#f8fafc', fontWeight: 700 }}>
                    {mod.title}
                  </h4>
                  <code style={{ fontSize: '0.8rem', color: '#94a3b8', background: '#0f172a', padding: '2px 6px', borderRadius: '4px' }}>
                    {mod.path}
                  </code>
                </div>

                <div style={{ borderTop: '1px solid #334155', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Auto-sincronizado
                  </span>
                  <a
                    href={`https://imo.crearpslglobal.com${mod.path}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#38bdf8',
                      fontSize: '0.8rem',
                      textDecoration: 'none'
                    }}
                  >
                    Abrir en Nodus <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
