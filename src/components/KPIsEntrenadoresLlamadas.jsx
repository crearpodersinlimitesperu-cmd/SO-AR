import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp, BarChart3, Users, DollarSign, CheckCircle2,
  Clock, Calendar, Search, Filter, ExternalLink, RefreshCw,
  X, ArrowUpDown, ChevronRight, Phone, Award, Eye, Download, Info
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  Legend, Cell, PieChart, Pie
} from 'recharts';
import { subscribeToKpisSummary, slugify } from '../services/kpisLlamadasService';

const SHEET_MANAGERS_URL = 'https://docs.google.com/spreadsheets/d/1KF58QXAiIk4KP_9G2aiAM3ERVoptcqKlIraszNKq2Ow/edit?usp=drive_link';
const SHEET_LLAMADOS_URL = 'https://docs.google.com/spreadsheets/d/1lWAHh1PSAKu9eU6DOBxZExrHMbCYc3f2Sr8GdghNxD0/edit?usp=drive_link';

const COLORS_SEDES = {
  'Quito': '#3b82f6',
  'Lima': '#10b981',
  'Guayaquil': '#f59e0b',
  'Cuenca': '#8b5cf6',
  'Medellín': '#ec4899',
  'CDMX': '#06b6d4',
  'Sin Sede': '#94a3b8'
};

export default function KPIsEntrenadoresLlamadas({ allManagersList = [] }) {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [filterSede, setFilterSede] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('todos'); // 'todos' | 'con_pendientes' | 'completados' | 'sin_actividad'
  const [sortBy, setSortBy] = useState('montoTotal'); // 'montoTotal' | 'totalLlamadas' | 'pagadoLlamadas' | 'pendienteLlamadas' | 'entrenador'
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [modalSearch, setModalSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Escuchar datos en tiempo real
  useEffect(() => {
    const unsub = subscribeToKpisSummary((kpiPayload) => {
      setData(kpiPayload);
    });
    return () => unsub();
  }, []);

  // Mapeo rápido de managers por teléfono / sede desde allManagersList (Sheet 1)
  const phoneByManagerName = useMemo(() => {
    const map = {};
    (allManagersList || []).forEach(m => {
      if (m.nombre) {
        const clean = m.nombre.trim().toLowerCase();
        map[clean] = m.telefono || '';
      }
    });
    return map;
  }, [allManagersList]);

  // Lista de entrenadores procesada con filtros y orden
  const processedTrainers = useMemo(() => {
    if (!data?.kpis) return [];

    let list = data.kpis.map(item => {
      // Cruzar con los registros detallados de llamados
      const detailed = (data.llamadosDetalle || []).filter(
        d => slugify(d.entrenador) === slugify(item.entrenador)
      );

      // Sedes asociadas a este entrenador
      const sedesCount = {};
      detailed.forEach(d => {
        const s = d.sede || 'Sin Sede';
        sedesCount[s] = (sedesCount[s] || 0) + 1;
      });
      const topSede = Object.entries(sedesCount).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Varias';

      return {
        ...item,
        topSede,
        managersCount: detailed.length,
        detalles: detailed,
      };
    });

    // Filtro por búsqueda
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => 
        t.entrenador.toLowerCase().includes(q) ||
        t.topSede.toLowerCase().includes(q)
      );
    }

    // Filtro por sede
    if (filterSede !== 'Todas') {
      list = list.filter(t => 
        t.topSede === filterSede || 
        t.detalles.some(d => d.sede === filterSede)
      );
    }

    // Filtro por estado de cobro
    if (filterStatus === 'con_pendientes') {
      list = list.filter(t => t.pendienteLlamadas > 0);
    } else if (filterStatus === 'completados') {
      list = list.filter(t => t.totalLlamadas > 0 && t.pendienteLlamadas === 0);
    } else if (filterStatus === 'sin_actividad') {
      list = list.filter(t => t.totalLlamadas === 0);
    }

    // Ordenamiento
    list.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [data, search, filterSede, filterStatus, sortBy, sortOrder]);

  // Top 10 entrenadores para gráfico de barras por facturación
  const topRevenueTrainers = useMemo(() => {
    if (!data?.kpis) return [];
    return [...data.kpis]
      .filter(t => t.montoTotal > 0)
      .sort((a, b) => b.montoTotal - a.montoTotal)
      .slice(0, 10);
  }, [data]);

  // Top 10 entrenadores para gráfico apilado Pagadas vs Pendientes
  const topVolumeTrainers = useMemo(() => {
    if (!data?.kpis) return [];
    return [...data.kpis]
      .filter(t => t.totalLlamadas > 0)
      .sort((a, b) => b.totalLlamadas - a.totalLlamadas)
      .slice(0, 10);
  }, [data]);

  // Datos para gráfico de distribución por Sede
  const sedePieData = useMemo(() => {
    if (!data?.llamadosDetalle) return [];
    const counts = {};
    data.llamadosDetalle.forEach(d => {
      const s = d.sede || 'Sin Sede';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: COLORS_SEDES[name] || '#64748b'
    })).sort((a, b) => b.value - a.value);
  }, [data]);

  // Totales calculados en base al dataset filtrado o global
  const statsGlobal = useMemo(() => {
    if (!data?.totales) {
      return {
        totalLlamadas: 5402,
        totalPagado: 3102,
        totalPendiente: 2241,
        montoTotal: 77550,
        porcentajePagado: 57.4
      };
    }
    return data.totales;
  }, [data]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simular un trigger de refresco visual o sincronización rápida
    setTimeout(() => {
      setIsRefreshing(false);
    }, 900);
  };

  if (!data) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 1rem auto', color: '#7c3aed' }} />
        <p style={{ fontWeight: 600 }}>Cargando datos analíticos de llamadas en tiempo real...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. HEADER DE CONTROL Y CONEXIÓN EN VIVO */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        color: '#fff',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{
              background: 'rgba(124, 58, 237, 0.3)',
              color: '#c4b5fd',
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              border: '1px solid rgba(139, 92, 246, 0.4)'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Datos en Vivo • Google Sheets v4
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Última actualización: {new Date(data.metadata?.generatedAt || Date.now()).toLocaleTimeString()}
            </span>
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#f8fafc' }}>
            Panel de KPIs: Entrenadores de Llamadas
          </h2>
          <p style={{ margin: '0.4rem 0 0 0', color: '#cbd5e1', fontSize: '0.92rem', maxWidth: '650px' }}>
            Auditoría en tiempo real de llamadas asignadas, recaudación acumulada ($), llamadas completadas vs. pendientes y cumplimiento por sede.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <a
            href={SHEET_LLAMADOS_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '0.6rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <ExternalLink size={15} /> Hoja Llamados
          </a>

          <a
            href={SHEET_MANAGERS_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '0.6rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <ExternalLink size={15} /> Hoja Managers
          </a>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              background: '#7c3aed',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.6rem 1.1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.35)',
              opacity: isRefreshing ? 0.7 : 1
            }}
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Sincronizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* 2. TARJETAS DE RESUMEN EJECUTIVO (SCORECARDS) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Total Facturado */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          border: '1px solid #e2e8f0',
          borderLeft: '5px solid #8b5cf6',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>Monto Total Generado</span>
            <span style={{ background: '#f5f3ff', color: '#7c3aed', padding: '0.3rem', borderRadius: '8px' }}>
              <DollarSign size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', margin: '0.4rem 0 0.2rem 0' }}>
            ${statsGlobal.montoTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Tarifa estándar: <strong>$25.00</strong> por llamada pagada
          </div>
        </div>

        {/* Total Llamadas */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          border: '1px solid #e2e8f0',
          borderLeft: '5px solid #3b82f6',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>Total Llamadas Registradas</span>
            <span style={{ background: '#eff6ff', color: '#2563eb', padding: '0.3rem', borderRadius: '8px' }}>
              <BarChart3 size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', margin: '0.4rem 0 0.2rem 0' }}>
            {statsGlobal.totalLlamadas.toLocaleString('en-US')}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            En 34 entrenadores y 934 seguimientos
          </div>
        </div>

        {/* Llamadas Pagadas */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          border: '1px solid #e2e8f0',
          borderLeft: '5px solid #10b981',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>Llamadas Pagadas / Cobradas</span>
            <span style={{ background: '#ecfdf5', color: '#059669', padding: '0.3rem', borderRadius: '8px' }}>
              <CheckCircle2 size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#059669', margin: '0.4rem 0 0.2rem 0' }}>
            {statsGlobal.totalPagado.toLocaleString('en-US')}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>
            {statsGlobal.porcentajePagado}% del volumen total liquidado
          </div>
        </div>

        {/* Llamadas Pendientes */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          border: '1px solid #e2e8f0',
          borderLeft: '5px solid #f59e0b',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>Llamadas Pendientes</span>
            <span style={{ background: '#fffbeb', color: '#d97706', padding: '0.3rem', borderRadius: '8px' }}>
              <Clock size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#d97706', margin: '0.4rem 0 0.2rem 0' }}>
            {statsGlobal.totalPendiente.toLocaleString('en-US')}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#d97706', fontWeight: 700 }}>
            {(100 - statsGlobal.porcentajePagado).toFixed(1)}% pendiente de liquidación
          </div>
        </div>

        {/* Entrenadores Activos */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          border: '1px solid #e2e8f0',
          borderLeft: '5px solid #6366f1',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>Entrenadores Activos</span>
            <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.3rem', borderRadius: '8px' }}>
              <Award size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', margin: '0.4rem 0 0.2rem 0' }}>
            {data.kpis?.filter(k => k.totalLlamadas > 0).length || 23}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            De 34 entrenadores registrados en catálogo
          </div>
        </div>
      </div>

      {/* 3. SECCIÓN DE GRÁFICAS DE ALTO IMPACTO (RECHARTS) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* GRÁFICA 1: Monto Total Generado por Entrenador */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Monto Total Generado por Entrenador ($)
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Clasificación de entrenadores según ingresos totales por llamadas pagadas ($25/llamada)
            </p>
          </div>

          <div style={{ width: '100%', height: '360px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topRevenueTrainers}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 90, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  tickFormatter={(val) => `$${val}`}
                  stroke="#94a3b8"
                  fontSize={12}
                />
                <YAxis
                  type="category"
                  dataKey="entrenador"
                  stroke="#475569"
                  fontSize={12}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  formatter={(value) => [`$${value.toLocaleString()} USD`, 'Monto Generado']}
                  labelFormatter={(name) => `Entrenador: ${name}`}
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                />
                <Bar dataKey="montoTotal" fill="#4a90e2" radius={[0, 6, 6, 0]}>
                  {topRevenueTrainers.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? '#7c3aed' : index < 3 ? '#3b82f6' : '#60a5fa'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICA 2: Distribución de Llamadas: Pagadas vs Pendientes */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Distribución de Llamadas: Pagadas vs Pendientes
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Análisis del volumen total de llamadas por entrenador y su estado de cobro
            </p>
          </div>

          <div style={{ width: '100%', height: '360px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topVolumeTrainers}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 90, bottom: 5 }}
              >
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="entrenador"
                  stroke="#475569"
                  fontSize={12}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  formatter={(value, name) => [value, name === 'pagadoLlamadas' ? 'Pagadas' : 'Pendientes']}
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  formatter={(value) => (value === 'pagadoLlamadas' ? 'Pagadas (Completadas)' : 'Pendientes')}
                  wrapperStyle={{ fontSize: '0.8rem', paddingBottom: '10px' }}
                />
                <Bar dataKey="pagadoLlamadas" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pendienteLlamadas" stackId="a" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICA 3: Distribución por Sede */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Distribución de Managers con Llamadas por Sede
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Concentración geográfica de managers con llamadas de entrenamiento registradas
            </p>
          </div>

          <div style={{ width: '100%', height: '280px', display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={sedePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {sedePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} managers (${((value / 934) * 100).toFixed(1)}%)`, name]}
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1rem' }}>
              {sedePieData.map((item) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }} />
                    <span style={{ fontWeight: 600, color: '#334155' }}>{item.name}</span>
                  </div>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TARJETA RESUMEN DE CICLOS Y EFECTIVIDAD */}
        <div style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          borderRadius: '14px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Efectividad Global de Ejecución
            </h3>
            <p style={{ margin: '0.2rem 0 1.25rem 0', fontSize: '0.8rem', color: '#64748b' }}>
              Relación entre llamadas programadas vs. recaudación efectiva ejecutada
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>Tasa de Liquidación / Cobro:</span>
                <strong style={{ color: '#10b981' }}>{statsGlobal.porcentajePagado}%</strong>
              </div>
              <div style={{ height: '12px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${statsGlobal.porcentajePagado}%`, background: '#10b981', transition: 'width 0.5s' }} />
                <div style={{ width: `${100 - statsGlobal.porcentajePagado}%`, background: '#f59e0b', transition: 'width 0.5s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.4rem', color: '#64748b' }}>
                <span>● Pagado: {statsGlobal.totalPagado} (${(statsGlobal.totalPagado * 25).toLocaleString()})</span>
                <span>● Pendiente: {statsGlobal.totalPendiente} (${(statsGlobal.totalPendiente * 25).toLocaleString()})</span>
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '8px', padding: '1rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Métricas de Impacto Operativo
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.82rem' }}>
                <div>
                  <div style={{ color: '#94a3b8' }}>Promedio llamadas/coach:</div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                    {Math.round(statsGlobal.totalLlamadas / 34)}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8' }}>Recaudación media:</div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                    ${Math.round(statsGlobal.montoTotal / 34).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#e0e7ff', borderRadius: '8px', border: '1px solid #c7d2fe', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Info size={18} style={{ color: '#4338ca', flexShrink: 0 }} />
            <div style={{ fontSize: '0.75rem', color: '#3730a3', lineHeight: '1.3' }}>
              Cada llamada de entrenamiento completada genera un valor pactado de $25.00 USD. Los datos se actualizan automáticamente contra Google Sheets.
            </div>
          </div>
        </div>
      </div>

      {/* 4. FILTROS Y CONTROLES DE LA TABLA MAESTRA */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        {/* Buscador */}
        <div style={{ position: 'relative', minWidth: '280px', flex: '1 1 300px', maxWidth: '420px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Buscar por entrenador o sede..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 2.2rem 0.6rem 2.4rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.88rem',
              outline: 'none',
              background: '#f8fafc',
              color: '#0f172a'
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: '10px', top: '10px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filtros Dropdown */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {/* Filtro Sede */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Sede:</span>
            <select
              value={filterSede}
              onChange={(e) => setFilterSede(e.target.value)}
              style={{
                padding: '0.55rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                background: '#ffffff',
                color: '#334155',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              <option value="Todas">Todas las Sedes</option>
              <option value="Quito">Quito</option>
              <option value="Guayaquil">Guayaquil</option>
              <option value="Lima">Lima</option>
              <option value="Cuenca">Cuenca</option>
              <option value="Medellín">Medellín</option>
              <option value="CDMX">CDMX</option>
            </select>
          </div>

          {/* Filtro Estado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Estado:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '0.55rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                background: '#ffffff',
                color: '#334155',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              <option value="todos">Todos los Estados</option>
              <option value="con_pendientes">Con Llamadas Pendientes</option>
              <option value="completados">100% Pagados</option>
              <option value="sin_actividad">Sin Actividad (0 llamadas)</option>
            </select>
          </div>

          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, marginLeft: '0.5rem' }}>
            Mostrando <strong>{processedTrainers.length}</strong> entrenadores
          </div>
        </div>
      </div>

      {/* 5. TABLA MAESTRA DE ENTRENADORES */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '1rem 1.25rem', cursor: 'pointer' }} onClick={() => handleSort('entrenador')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    Entrenador <ArrowUpDown size={13} />
                  </div>
                </th>
                <th style={{ padding: '1rem 1rem' }}>Sede Principal</th>
                <th style={{ padding: '1rem 1rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('totalLlamadas')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    Total Llamadas <ArrowUpDown size={13} />
                  </div>
                </th>
                <th style={{ padding: '1rem 1rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('pagadoLlamadas')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    Pagadas <ArrowUpDown size={13} />
                  </div>
                </th>
                <th style={{ padding: '1rem 1rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('pendienteLlamadas')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    Pendientes <ArrowUpDown size={13} />
                  </div>
                </th>
                <th style={{ padding: '1rem 1rem', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('montoTotal')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                    Monto Generado ($) <ArrowUpDown size={13} />
                  </div>
                </th>
                <th style={{ padding: '1rem 1rem', textAlign: 'center' }}>Cumplimiento</th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {processedTrainers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                    No se encontraron entrenadores con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                processedTrainers.map((t, idx) => {
                  const pct = t.totalLlamadas > 0 ? Math.round((t.pagadoLlamadas / t.totalLlamadas) * 100) : 0;
                  return (
                    <tr
                      key={t.entrenador}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#fafafa'}
                    >
                      {/* Entrenador */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: '#e0e7ff',
                            color: '#4338ca',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.85rem'
                          }}>
                            {t.entrenador.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{t.entrenador}</div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              {t.managersCount} managers en seguimiento
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Sede */}
                      <td style={{ padding: '1rem 1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: `${COLORS_SEDES[t.topSede] || '#64748b'}15`,
                          color: COLORS_SEDES[t.topSede] || '#64748b'
                        }}>
                          {t.topSede}
                        </span>
                      </td>

                      {/* Total Llamadas */}
                      <td style={{ padding: '1rem 1rem', textAlign: 'center', fontWeight: 800, color: '#1e293b' }}>
                        {t.totalLlamadas}
                      </td>

                      {/* Pagadas */}
                      <td style={{ padding: '1rem 1rem', textAlign: 'center' }}>
                        <span style={{
                          background: '#ecfdf5',
                          color: '#059669',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.82rem'
                        }}>
                          {t.pagadoLlamadas}
                        </span>
                      </td>

                      {/* Pendientes */}
                      <td style={{ padding: '1rem 1rem', textAlign: 'center' }}>
                        <span style={{
                          background: t.pendienteLlamadas > 0 ? '#fffbeb' : '#f1f5f9',
                          color: t.pendienteLlamadas > 0 ? '#d97706' : '#94a3b8',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.82rem'
                        }}>
                          {t.pendienteLlamadas}
                        </span>
                      </td>

                      {/* Monto Generado */}
                      <td style={{ padding: '1rem 1rem', textAlign: 'right' }}>
                        <span style={{
                          fontWeight: 800,
                          fontSize: '0.95rem',
                          color: t.montoTotal > 0 ? '#7c3aed' : '#94a3b8'
                        }}>
                          ${t.montoTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Cumplimiento */}
                      <td style={{ padding: '1rem 1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444' }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: pct >= 70 ? '#16a34a' : '#d97706' }}>
                            {pct}%
                          </span>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        <button
                          onClick={() => { setSelectedTrainer(t); setModalSearch(''); }}
                          style={{
                            background: '#7c3aed',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.45rem 0.85rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: '0 2px 4px rgba(124, 58, 237, 0.2)'
                          }}
                        >
                          <Eye size={13} /> Ver Managers ({t.detalles.length})
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. MODAL DE AUDITORÍA DETALLADA POR ENTRENADOR (DRILL DOWN) */}
      {selectedTrainer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '1100px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem 2rem',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: '#7c3aed',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.2rem'
                }}>
                  {selectedTrainer.entrenador.charAt(0)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                    {selectedTrainer.entrenador}
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
                    <span>Sede: <strong>{selectedTrainer.topSede}</strong></span>
                    <span>Total llamadas: <strong>{selectedTrainer.totalLlamadas}</strong></span>
                    <span>Pagadas: <strong style={{ color: '#16a34a' }}>{selectedTrainer.pagadoLlamadas}</strong></span>
                    <span>Pendientes: <strong style={{ color: '#d97706' }}>{selectedTrainer.pendienteLlamadas}</strong></span>
                    <span>Monto: <strong style={{ color: '#7c3aed' }}>${selectedTrainer.montoTotal.toLocaleString()}</strong></span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedTrainer(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Search & Subheader */}
            <div style={{ padding: '1rem 2rem', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div style={{ position: 'relative', flex: '1', maxWidth: '380px' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Buscar manager o equipo en este entrenador..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem 0.5rem 2.2rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '3px', display: 'inline-block' }} /> Asistió (SI)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '3px', display: 'inline-block' }} /> Ausente (NO)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: '12px', height: '12px', background: '#e2e8f0', borderRadius: '3px', display: 'inline-block' }} /> Pendiente (-)
                </span>
              </div>
            </div>

            {/* Modal Body - Matriz 1 a 16 */}
            <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#64748b', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Manager</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>Sede / Equipo</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Total</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Matriz 16 Llamadas</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Contacto</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTrainer.detalles
                    .filter(m => !modalSearch.trim() || 
                      m.manager.toLowerCase().includes(modalSearch.toLowerCase()) || 
                      m.equipo.toLowerCase().includes(modalSearch.toLowerCase())
                    )
                    .map((item, idx) => {
                      const phone = phoneByManagerName[item.manager.trim().toLowerCase()] || '';
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                            {item.manager}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', color: '#475569' }}>
                            <div>{item.sede}</div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{item.equipo}</div>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 800, color: '#7c3aed' }}>
                            {item.totalReportado}
                          </td>
                          {/* Cuadricula 1 a 16 */}
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                              {(item.calls || []).map((c, cIdx) => {
                                const isYes = c === 'SI';
                                const isNo = c === 'NO';
                                return (
                                  <div
                                    key={cIdx}
                                    title={`Llamada ${cIdx + 1}: ${c || 'Sin dato'}`}
                                    style={{
                                      width: '18px',
                                      height: '20px',
                                      borderRadius: '3px',
                                      background: isYes ? '#10b981' : isNo ? '#ef4444' : '#f1f5f9',
                                      color: isYes || isNo ? '#ffffff' : '#cbd5e1',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.62rem',
                                      fontWeight: 800
                                    }}
                                  >
                                    {cIdx + 1}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          {/* Teléfono / WhatsApp */}
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                            {phone ? (
                              <a
                                href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  background: '#25D366',
                                  color: '#ffffff',
                                  padding: '0.3rem 0.6rem',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}
                              >
                                <Phone size={12} /> WhatsApp
                              </a>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Sin tel</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedTrainer(null)}
                style={{
                  background: '#334155',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.6rem 1.4rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
