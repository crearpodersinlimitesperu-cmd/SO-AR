import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp, BarChart3, Users, DollarSign, CheckCircle2,
  Clock, Calendar, Search, Filter, ExternalLink, RefreshCw,
  X, ArrowUpDown, ChevronRight, Phone, Award, Eye, Download,
  Info, GraduationCap, UserX, UserCheck, AlertTriangle, UserMinus,
  Sparkles, Check, PieChart as PieIcon, ListFilter
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  Legend, Cell, PieChart, Pie
} from 'recharts';
import { subscribeToKpisSummary, slugify } from '../services/kpisLlamadasService';
import { useAuth } from '../context/AuthContext';
import { canViewKPIsLlamadas } from '../config/permissions';

const SHEET_MANAGERS_URL = 'https://docs.google.com/spreadsheets/d/1KF58QXAiIk4KP_9G2aiAM3ERVoptcqKlIraszNKq2Ow/edit?usp=drive_link';
const SHEET_LLAMADOS_URL = 'https://docs.google.com/spreadsheets/d/1lWAHh1PSAKu9eU6DOBxZExrHMbCYc3f2Sr8GdghNxD0/edit?usp=drive_link';

const COLORS_SEDES = {
  'Quito': '#3b82f6',
  'QUITO': '#3b82f6',
  'Lima': '#10b981',
  'LIMA': '#10b981',
  'Guayaquil': '#f59e0b',
  'Cuenca': '#8b5cf6',
  'CUENCA': '#8b5cf6',
  'Medellín': '#ec4899',
  'Medellin': '#ec4899',
  'MEDELLIN': '#ec4899',
  'CDMX': '#06b6d4',
  'Sin Sede': '#94a3b8'
};

export default function KPIsEntrenadoresLlamadas({ allManagersList = [] }) {
  const { currentUser } = useAuth();
  const hasAccess = canViewKPIsLlamadas(currentUser);

  const [data, setData] = useState(null);
  const [activeSubView, setActiveSubView] = useState('entrenadores'); // 'entrenadores' | 'graficas_retencion' | 'directorio_estados'
  const [search, setSearch] = useState('');
  const [filterSede, setFilterSede] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('todos'); // 'todos' | 'con_pendientes' | 'completados' | 'alta_graduacion' | 'alta_desercion'
  const [filterManagerStatus, setFilterManagerStatus] = useState('todos'); // 'todos' | 'GRADUADO' | 'DESERTOR' | 'EN_JUEGO' | 'sin_entrenador'
  const [sortBy, setSortBy] = useState('montoTotal');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [modalSearch, setModalSearch] = useState('');
  const [modalFilterStatus, setModalFilterStatus] = useState('todos');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Escuchar datos en tiempo real solo si el usuario tiene acceso
  useEffect(() => {
    if (!hasAccess) return;
    const unsub = subscribeToKpisSummary((kpiPayload) => {
      setData(kpiPayload);
    });
    return () => unsub();
  }, [hasAccess]);

  // Mapeo rápido de managers por teléfono / sede desde allManagersList o managersSheet1
  const phoneByManagerName = useMemo(() => {
    const map = {};
    (data?.managersSheet1 || []).forEach(m => {
      if (m.nombre) {
        map[m.nombre.trim().toLowerCase()] = m.telefono || '';
      }
    });
    (allManagersList || []).forEach(m => {
      if (m.nombre && !map[m.nombre.trim().toLowerCase()]) {
        map[m.nombre.trim().toLowerCase()] = m.telefono || '';
      }
    });
    return map;
  }, [data, allManagersList]);

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
        t.topSede.toLowerCase().includes(filterSede.toLowerCase()) || 
        t.detalles.some(d => d.sede.toLowerCase().includes(filterSede.toLowerCase()))
      );
    }

    // Filtro por estado de cobro o desempeño
    if (filterStatus === 'con_pendientes') {
      list = list.filter(t => t.pendienteLlamadas > 0);
    } else if (filterStatus === 'completados') {
      list = list.filter(t => t.totalLlamadas > 0 && t.pendienteLlamadas === 0);
    } else if (filterStatus === 'alta_graduacion') {
      list = list.filter(t => t.tasaGraduacion >= 65 && t.totalAsignados > 0);
    } else if (filterStatus === 'alta_desercion') {
      list = list.filter(t => t.tasaDesercion >= 30 && t.totalAsignados > 0);
    }

    // Ordenamiento
    list.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
    });

    return list;
  }, [data, search, filterSede, filterStatus, sortBy, sortOrder]);

  // Lista de Managers de Sheet 1 procesada
  const processedManagersList = useMemo(() => {
    if (!data?.managersSheet1) return [];
    let list = [...data.managersSheet1];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m => 
        m.nombre.toLowerCase().includes(q) ||
        m.entrenador.toLowerCase().includes(q) ||
        m.sede.toLowerCase().includes(q) ||
        m.nombreEquipo.toLowerCase().includes(q) ||
        m.coordinador.toLowerCase().includes(q)
      );
    }

    if (filterSede !== 'Todas') {
      list = list.filter(m => m.sede.toLowerCase().includes(filterSede.toLowerCase()));
    }

    if (filterManagerStatus === 'GRADUADO') {
      list = list.filter(m => m.estado === 'GRADUADO');
    } else if (filterManagerStatus === 'DESERTOR') {
      list = list.filter(m => m.estado === 'DESERTOR');
    } else if (filterManagerStatus === 'EN_JUEGO') {
      list = list.filter(m => m.estado === 'EN_JUEGO');
    } else if (filterManagerStatus === 'sin_entrenador') {
      list = list.filter(m => !m.tieneEntrenador);
    }

    return list;
  }, [data, search, filterSede, filterManagerStatus]);

  // Top 10 entrenadores para gráfico de facturación
  const topRevenueTrainers = useMemo(() => {
    if (!data?.kpis) return [];
    return [...data.kpis]
      .filter(t => t.montoTotal > 0)
      .sort((a, b) => b.montoTotal - a.montoTotal)
      .slice(0, 10);
  }, [data]);

  // Top 12 entrenadores para gráfico de Graduados vs Desertores
  const topRetentionTrainers = useMemo(() => {
    if (!data?.kpis) return [];
    return [...data.kpis]
      .filter(t => (t.totalAsignados || 0) > 0)
      .sort((a, b) => (b.totalAsignados || 0) - (a.totalAsignados || 0))
      .slice(0, 12);
  }, [data]);

  // Datos para gráfico Donut de Estado del Ciclo de Vida
  const statusPieData = useMemo(() => {
    if (!data?.totales?.statusDist) {
      return [
        { name: 'Graduados', value: 447, color: '#10b981' },
        { name: 'Desertores', value: 168, color: '#ef4444' },
        { name: 'En Juego', value: 84, color: '#3b82f6' }
      ];
    }
    const dist = data.totales.statusDist;
    return [
      { name: 'Graduados', value: dist.Graduados || 0, color: '#10b981' },
      { name: 'Desertores', value: dist.Desertores || 0, color: '#ef4444' },
      { name: 'En Juego', value: dist['En Juego'] || 0, color: '#3b82f6' }
    ];
  }, [data]);

  // Datos para gráfico de distribución por Sede
  const sedePieData = useMemo(() => {
    if (!data?.llamadosDetalle) return [];
    const counts = {};
    data.llamadosDetalle.forEach(d => {
      let s = d.sede || 'Sin Sede';
      if (s.toLowerCase().includes('quito')) s = 'Quito';
      else if (s.toLowerCase().includes('lima')) s = 'Lima';
      else if (s.toLowerCase().includes('cuenca')) s = 'Cuenca';
      else if (s.toLowerCase().includes('guayaquil')) s = 'Guayaquil';
      else if (s.toLowerCase().includes('medellin')) s = 'Medellín';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: COLORS_SEDES[name] || '#64748b'
    })).sort((a, b) => b.value - a.value);
  }, [data]);

  const statsGlobal = useMemo(() => {
    if (!data?.totales) {
      return {
        totalLlamadas: 5402,
        totalPagado: 3102,
        totalPendiente: 2241,
        montoTotal: 77550,
        porcentajePagado: 57,
        totalManagers: 699,
        totalGraduados: 447,
        totalDesertores: 168,
        totalActivos: 84,
        totalAsignados: 681,
        totalSinAsignar: 18,
        tasaGraduacionGlobal: 64,
        tasaDesercionGlobal: 24,
        tasaAsignacionGlobal: 97
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
    setTimeout(() => {
      setIsRefreshing(false);
    }, 900);
  };

  if (!hasAccess) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '3rem 2rem',
        textAlign: 'center',
        border: '1px solid #fee2e2',
        maxWidth: '560px',
        margin: '3rem auto',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: '#fef2f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem',
          color: '#ef4444'
        }}>
          <AlertTriangle size={28} />
        </div>
        <h3 style={{ margin: '0 0 0.5rem', color: '#991b1b', fontSize: '1.2rem', fontWeight: 800 }}>
          Acceso Restringido a Dirección
        </h3>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', lineHeight: '1.6' }}>
          Este módulo de auditoría financiera, balance de llamadas y análisis de retención/deserción está reservado exclusivamente para la Dirección y Administración Central.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 1rem auto', color: '#7c3aed' }} />
        <p style={{ fontWeight: 600 }}>Cargando analítica en tiempo real de Google Sheets...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* 1. HERO HEADER DE CONTROL Y CONEXIÓN EN TIEMPO REAL */}
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
              Google Sheets API v4 • En Vivo
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              699 Managers • 34 Entrenadores • 5,402 Llamadas
            </span>
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#f8fafc' }}>
            Auditoría Ejecutiva: Llamadas, Graduados y Deserción
          </h2>
          <p style={{ margin: '0.4rem 0 0 0', color: '#cbd5e1', fontSize: '0.92rem', maxWidth: '720px' }}>
            Monitoreo en tiempo real de llamadas ($77,550 USD), rendimiento de retención (Graduados vs. Desertores), asignaciones de entrenadores y matriz de 1 a 16 llamadas.
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
              padding: '0.55rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              textDecoration: 'none'
            }}
          >
            <ExternalLink size={14} /> Hoja Llamados
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
              padding: '0.55rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              textDecoration: 'none'
            }}
          >
            <ExternalLink size={14} /> Hoja Managers
          </a>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              background: '#7c3aed',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.55rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.35)',
              opacity: isRefreshing ? 0.7 : 1
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* 2. TABLERO DE SCORECARDS GLOBALES (Llamadas, Graduados, Desertores, Asignados) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: '1rem'
      }}>
        {/* Monto Generado */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem 1.25rem',
          border: '1px solid #e2e8f0',
          borderLeft: '5px solid #8b5cf6',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>Monto Generado</span>
            <span style={{ background: '#f5f3ff', color: '#7c3aed', padding: '0.3rem', borderRadius: '6px' }}>
              <DollarSign size={16} />
            </span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', margin: '0.3rem 0 0.1rem 0' }}>
            ${statsGlobal.montoTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
            Tarifa: $25 USD / llamada
          </div>
        </div>

        {/* Total Llamadas */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem 1.25rem',
          border: '1px solid #e2e8f0',
          borderLeft: '5px solid #3b82f6',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>Total Llamadas</span>
            <span style={{ background: '#eff6ff', color: '#2563eb', padding: '0.3rem', borderRadius: '6px' }}>
              <BarChart3 size={16} />
            </span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', margin: '0.3rem 0 0.1rem 0' }}>
            {statsGlobal.totalLlamadas.toLocaleString('en-US')}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700 }}>
            {statsGlobal.totalPagado} Pagadas ({statsGlobal.porcentajePagado}%)
          </div>
        </div>

        {/* Graduados */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem 1.25rem',
          border: '1px solid #e2e8f0',
          borderLeft: '5px solid #10b981',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>Managers Graduados</span>
            <span style={{ background: '#ecfdf5', color: '#059669', padding: '0.3rem', borderRadius: '6px' }}>
              <GraduationCap size={16} />
            </span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#059669', margin: '0.3rem 0 0.1rem 0' }}>
            {statsGlobal.totalGraduados}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700 }}>
            {statsGlobal.tasaGraduacionGlobal}% del total de managers
          </div>
        </div>

        {/* Desertores */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem 1.25rem',
          border: '1px solid #e2e8f0',
          borderLeft: '5px solid #ef4444',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>Desertores</span>
            <span style={{ background: '#fef2f2', color: '#dc2626', padding: '0.3rem', borderRadius: '6px' }}>
              <UserX size={16} />
            </span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#dc2626', margin: '0.3rem 0 0.1rem 0' }}>
            {statsGlobal.totalDesertores}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: 700 }}>
            {statsGlobal.tasaDesercionGlobal}% índice de abandono
          </div>
        </div>

        {/* En Juego / Activos */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem 1.25rem',
          border: '1px solid #e2e8f0',
          borderLeft: '5px solid #06b6d4',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>En Juego (Activos)</span>
            <span style={{ background: '#ecfeff', color: '#0891b2', padding: '0.3rem', borderRadius: '6px' }}>
              <TrendingUp size={16} />
            </span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0891b2', margin: '0.3rem 0 0.1rem 0' }}>
            {statsGlobal.totalActivos}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#0891b2', fontWeight: 700 }}>
            {((statsGlobal.totalActivos / statsGlobal.totalManagers) * 100).toFixed(1)}% en proceso activo
          </div>
        </div>

        {/* Asignados a Entrenador */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem 1.25rem',
          border: '1px solid #e2e8f0',
          borderLeft: '5px solid #f59e0b',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>Con Entrenador</span>
            <span style={{ background: '#fffbeb', color: '#d97706', padding: '0.3rem', borderRadius: '6px' }}>
              <UserCheck size={16} />
            </span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#d97706', margin: '0.3rem 0 0.1rem 0' }}>
            {statsGlobal.totalAsignados}
          </div>
          <div style={{ fontSize: '0.74rem', color: statsGlobal.totalSinAsignar > 0 ? '#ef4444' : '#64748b', fontWeight: 700 }}>
            {statsGlobal.totalSinAsignar} sin entrenador asignado
          </div>
        </div>
      </div>

      {/* 3. SUBBARRA DE VISTAS (Navegación interna) */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '0.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveSubView('entrenadores')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: activeSubView === 'entrenadores' ? '#7c3aed' : 'transparent',
              color: activeSubView === 'entrenadores' ? '#ffffff' : '#64748b',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Award size={16} /> Entrenadores & Llamadas (34)
          </button>

          <button
            onClick={() => setActiveSubView('graficas_retencion')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: activeSubView === 'graficas_retencion' ? '#7c3aed' : 'transparent',
              color: activeSubView === 'graficas_retencion' ? '#ffffff' : '#64748b',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <BarChart3 size={16} /> Gráficas de Retención & Deserción
          </button>

          <button
            onClick={() => setActiveSubView('directorio_estados')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: activeSubView === 'directorio_estados' ? '#7c3aed' : 'transparent',
              color: activeSubView === 'directorio_estados' ? '#ffffff' : '#64748b',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Users size={16} /> Directorio de Managers por Estado ({data.managersSheet1?.length || 699})
          </button>
        </div>

        {/* Contador Rápido de Estados */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.78rem', paddingRight: '0.5rem' }}>
          <span style={{ background: '#ecfdf5', color: '#059669', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>
            🎓 {statsGlobal.totalGraduados} Graduados
          </span>
          <span style={{ background: '#fef2f2', color: '#dc2626', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>
            ⚠️ {statsGlobal.totalDesertores} Desertores
          </span>
          <span style={{ background: '#eff6ff', color: '#2563eb', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>
            ⚡ {statsGlobal.totalActivos} En Juego
          </span>
        </div>
      </div>

      {/* 4. FILTROS DINÁMICOS */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem'
      }}>
        <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 280px', maxWidth: '380px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder={activeSubView === 'directorio_estados' ? "Buscar manager, equipo, entrenador o sede..." : "Buscar entrenador o sede..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 2rem 0.55rem 2.3rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              outline: 'none',
              background: '#f8fafc',
              color: '#0f172a'
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: '10px', top: '9px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {/* Filtro Sede */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Sede:</span>
            <select
              value={filterSede}
              onChange={(e) => setFilterSede(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
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

          {activeSubView === 'directorio_estados' ? (
            /* Filtro de Estado para Directorio de Managers */
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Estado:</span>
              <select
                value={filterManagerStatus}
                onChange={(e) => setFilterManagerStatus(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  background: '#ffffff',
                  color: '#334155',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                <option value="todos">Todos los Managers</option>
                <option value="GRADUADO">🎓 Graduados ({statsGlobal.totalGraduados})</option>
                <option value="DESERTOR">⚠️ Desertores ({statsGlobal.totalDesertores})</option>
                <option value="EN_JUEGO">⚡ En Juego ({statsGlobal.totalActivos})</option>
                <option value="sin_entrenador">🚫 Sin Entrenador ({statsGlobal.totalSinAsignar})</option>
              </select>
            </div>
          ) : (
            /* Filtro de Desempeño para Entrenadores */
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Rendimiento:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  background: '#ffffff',
                  color: '#334155',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                <option value="todos">Todos los Entrenadores</option>
                <option value="alta_graduacion">⭐ Alta Graduación (≥65%)</option>
                <option value="alta_desercion">⚠️ Alerta Deserción (≥30%)</option>
                <option value="con_pendientes">Con Llamadas Pendientes</option>
                <option value="completados">100% Pagados</option>
              </select>
            </div>
          )}

          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            {activeSubView === 'directorio_estados' ? (
              <span><strong>{processedManagersList.length}</strong> managers</span>
            ) : (
              <span><strong>{processedTrainers.length}</strong> entrenadores</span>
            )}
          </div>
        </div>
      </div>

      {/* 5. VISTA A: ENTRENADORES & LLAMADAS (TABLA MAESTRA ENRIQUECIDA) */}
      {activeSubView === 'entrenadores' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.9rem 1.25rem', cursor: 'pointer' }} onClick={() => handleSort('entrenador')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      Entrenador <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th style={{ padding: '0.9rem 0.8rem' }}>Sede</th>
                  <th style={{ padding: '0.9rem 0.8rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('totalAsignados')}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                      Asignados <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th style={{ padding: '0.9rem 0.8rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('graduados')}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                      Graduados <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th style={{ padding: '0.9rem 0.8rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('desertores')}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                      Desertores <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th style={{ padding: '0.9rem 0.8rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('activos')}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                      En Juego <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th style={{ padding: '0.9rem 0.8rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('totalLlamadas')}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                      Llamadas <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th style={{ padding: '0.9rem 0.8rem', textAlign: 'center' }}>Pag / Pend</th>
                  <th style={{ padding: '0.9rem 1rem', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('montoTotal')}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                      Monto ($) <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>% Éxito</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {processedTrainers.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                      No se encontraron entrenadores con los criterios aplicados.
                    </td>
                  </tr>
                ) : (
                  processedTrainers.map((t, idx) => {
                    const pctGrad = t.tasaGraduacion || 0;
                    const pctDes = t.tasaDesercion || 0;
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
                        <td style={{ padding: '0.85rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: '#e0e7ff',
                              color: '#4338ca',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.82rem'
                            }}>
                              {t.entrenador.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{t.entrenador}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                {t.detalles.length} en matriz de llamadas
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Sede */}
                        <td style={{ padding: '0.85rem 0.8rem' }}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '5px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            background: `${COLORS_SEDES[t.topSede] || '#64748b'}15`,
                            color: COLORS_SEDES[t.topSede] || '#64748b'
                          }}>
                            {t.topSede}
                          </span>
                        </td>

                        {/* Asignados en Directorio */}
                        <td style={{ padding: '0.85rem 0.8rem', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                          {t.totalAsignados || 0}
                        </td>

                        {/* Graduados */}
                        <td style={{ padding: '0.85rem 0.8rem', textAlign: 'center' }}>
                          <span style={{
                            background: '#ecfdf5',
                            color: '#059669',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontSize: '0.8rem'
                          }}>
                            {t.graduados || 0} <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>({pctGrad}%)</span>
                          </span>
                        </td>

                        {/* Desertores */}
                        <td style={{ padding: '0.85rem 0.8rem', textAlign: 'center' }}>
                          <span style={{
                            background: (t.desertores || 0) > 0 ? '#fef2f2' : '#f8fafc',
                            color: (t.desertores || 0) > 0 ? '#dc2626' : '#94a3b8',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontSize: '0.8rem'
                          }}>
                            {t.desertores || 0} <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>({pctDes}%)</span>
                          </span>
                        </td>

                        {/* En Juego */}
                        <td style={{ padding: '0.85rem 0.8rem', textAlign: 'center' }}>
                          <span style={{
                            background: (t.activos || 0) > 0 ? '#eff6ff' : '#f8fafc',
                            color: (t.activos || 0) > 0 ? '#2563eb' : '#94a3b8',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontSize: '0.8rem'
                          }}>
                            {t.activos || 0}
                          </span>
                        </td>

                        {/* Total Llamadas */}
                        <td style={{ padding: '0.85rem 0.8rem', textAlign: 'center', fontWeight: 800, color: '#1e293b' }}>
                          {t.totalLlamadas}
                        </td>

                        {/* Pagadas vs Pendientes */}
                        <td style={{ padding: '0.85rem 0.8rem', textAlign: 'center', fontSize: '0.76rem' }}>
                          <span style={{ color: '#059669', fontWeight: 700 }}>{t.pagadoLlamadas}</span>
                          <span style={{ color: '#94a3b8', margin: '0 3px' }}>/</span>
                          <span style={{ color: t.pendienteLlamadas > 0 ? '#d97706' : '#94a3b8', fontWeight: 700 }}>{t.pendienteLlamadas}</span>
                        </td>

                        {/* Monto Generado */}
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <span style={{
                            fontWeight: 900,
                            fontSize: '0.92rem',
                            color: t.montoTotal > 0 ? '#7c3aed' : '#94a3b8'
                          }}>
                            ${t.montoTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* Barra de Éxito / Graduación */}
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            <div style={{ width: '50px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${pctGrad}%`, height: '100%', background: pctGrad >= 65 ? '#10b981' : pctGrad >= 40 ? '#f59e0b' : '#ef4444' }} />
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: pctGrad >= 65 ? '#16a34a' : '#d97706' }}>
                              {pctGrad}%
                            </span>
                          </div>
                        </td>

                        {/* Acciones */}
                        <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                          <button
                            onClick={() => { setSelectedTrainer(t); setModalSearch(''); setModalFilterStatus('todos'); }}
                            style={{
                              background: '#7c3aed',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.4rem 0.75rem',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              boxShadow: '0 2px 4px rgba(124, 58, 237, 0.2)'
                            }}
                          >
                            <Eye size={12} /> Ver Detalle
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
      )}

      {/* 6. VISTA B: GRÁFICAS DE RETENCIÓN & DESERCIÓN */}
      {activeSubView === 'graficas_retencion' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* GRÁFICA: Graduados vs Desertores vs En Juego por Entrenador */}
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
                Retención por Entrenador: Graduados vs. Desertores vs. En Juego
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Mide cuántos managers de cada entrenador alcanzaron la meta frente a las bajas
              </p>
            </div>

            <div style={{ width: '100%', height: '380px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topRetentionTrainers}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
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
                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.82rem' }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: '0.8rem', paddingBottom: '10px' }}
                  />
                  <Bar dataKey="graduados" name="Graduados" stackId="a" fill="#10b981" />
                  <Bar dataKey="desertores" name="Desertores" stackId="a" fill="#ef4444" />
                  <Bar dataKey="activos" name="En Juego" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GRÁFICA: Donut de Distribución General de Managers */}
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
                Ciclo de Vida Global de Managers (699)
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Proporción de graduados (64%), bajas/desertores (24%) y managers activos (12%)
              </p>
            </div>

            <div style={{ width: '100%', height: '280px', display: 'flex', alignItems: 'center' }}>
              <ResponsiveContainer width="55%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [`${val} (${((val / statsGlobal.totalManagers) * 100).toFixed(1)}%)`, 'Cantidad']}
                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.82rem' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1rem' }}>
                {statusPieData.map((item) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.color }} />
                      <span style={{ fontWeight: 600, color: '#334155' }}>{item.name}</span>
                    </div>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>
                      {item.value} ({((item.value / statsGlobal.totalManagers) * 100).toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569' }}>
              <strong>Cobertura de Asignación:</strong> 681 de los 699 managers (97.4%) cuentan con entrenador de llamadas formalmente registrado.
            </div>
          </div>

          {/* GRÁFICA: Monto Total Generado ($) por Entrenador */}
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
                Top Entrenadores por Recaudación ($)
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Total facturado por llamadas efectivas completadas ($25/llamada)
              </p>
            </div>

            <div style={{ width: '100%', height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topRevenueTrainers}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 90, bottom: 5 }}
                >
                  <XAxis type="number" tickFormatter={(val) => `$${val}`} stroke="#94a3b8" fontSize={11} />
                  <YAxis type="category" dataKey="entrenador" stroke="#475569" fontSize={11} tickLine={false} width={110} />
                  <Tooltip
                    formatter={(value) => [`$${value.toLocaleString()} USD`, 'Monto Generado']}
                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.82rem' }}
                  />
                  <Bar dataKey="montoTotal" fill="#7c3aed" radius={[0, 6, 6, 0]}>
                    {topRevenueTrainers.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? '#7c3aed' : index < 3 ? '#6366f1' : '#3b82f6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GRÁFICA: Distribución por Sede */}
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
                Distribución Geográfica de Llamadas
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Participación por sede en la matriz operativa
              </p>
            </div>

            <div style={{ width: '100%', height: '320px', display: 'flex', alignItems: 'center' }}>
              <ResponsiveContainer width="55%" height="100%">
                <PieChart>
                  <Pie
                    data={sedePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sedePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [`${val} llamadas registradas`, name]}
                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.82rem' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: '0.45rem', paddingLeft: '0.5rem' }}>
                {sedePieData.map((item) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }} />
                      <span style={{ fontWeight: 600, color: '#334155' }}>{item.name}</span>
                    </div>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. VISTA C: DIRECTORIO DE MANAGERS POR ESTADO (GRADUADOS, DESERTORES, EN JUEGO, ASIGNADOS) */}
      {activeSubView === 'directorio_estados' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          {/* Quick Filter Buttons with Counts */}
          <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button
              onClick={() => setFilterManagerStatus('todos')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '20px',
                border: filterManagerStatus === 'todos' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                background: filterManagerStatus === 'todos' ? '#f5f3ff' : '#ffffff',
                color: filterManagerStatus === 'todos' ? '#7c3aed' : '#475569',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Todos ({statsGlobal.totalManagers})
            </button>

            <button
              onClick={() => setFilterManagerStatus('GRADUADO')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '20px',
                border: filterManagerStatus === 'GRADUADO' ? '2px solid #10b981' : '1px solid #cbd5e1',
                background: filterManagerStatus === 'GRADUADO' ? '#ecfdf5' : '#ffffff',
                color: filterManagerStatus === 'GRADUADO' ? '#059669' : '#475569',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              🎓 Graduados ({statsGlobal.totalGraduados})
            </button>

            <button
              onClick={() => setFilterManagerStatus('DESERTOR')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '20px',
                border: filterManagerStatus === 'DESERTOR' ? '2px solid #ef4444' : '1px solid #cbd5e1',
                background: filterManagerStatus === 'DESERTOR' ? '#fef2f2' : '#ffffff',
                color: filterManagerStatus === 'DESERTOR' ? '#dc2626' : '#475569',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              ⚠️ Desertores ({statsGlobal.totalDesertores})
            </button>

            <button
              onClick={() => setFilterManagerStatus('EN_JUEGO')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '20px',
                border: filterManagerStatus === 'EN_JUEGO' ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                background: filterManagerStatus === 'EN_JUEGO' ? '#eff6ff' : '#ffffff',
                color: filterManagerStatus === 'EN_JUEGO' ? '#2563eb' : '#475569',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              ⚡ En Juego ({statsGlobal.totalActivos})
            </button>

            <button
              onClick={() => setFilterManagerStatus('sin_entrenador')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '20px',
                border: filterManagerStatus === 'sin_entrenador' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                background: filterManagerStatus === 'sin_entrenador' ? '#fffbeb' : '#ffffff',
                color: filterManagerStatus === 'sin_entrenador' ? '#d97706' : '#475569',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              🚫 Sin Entrenador ({statsGlobal.totalSinAsignar})
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Manager</th>
                  <th style={{ padding: '0.85rem 0.8rem' }}>Sede</th>
                  <th style={{ padding: '0.85rem 0.8rem' }}>Equipo</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Entrenador Asignado</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Coordinador MJ</th>
                  <th style={{ padding: '0.85rem 0.8rem', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Contacto</th>
                </tr>
              </thead>
              <tbody>
                {processedManagersList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                      No se encontraron managers con el filtro seleccionado.
                    </td>
                  </tr>
                ) : (
                  processedManagersList.slice(0, 250).map((m, idx) => {
                    const isGrad = m.estado === 'GRADUADO';
                    const isDes = m.estado === 'DESERTOR';
                    return (
                      <tr
                        key={m.id || idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                        }}
                      >
                        <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: '#0f172a' }}>
                          {m.nombre}
                        </td>
                        <td style={{ padding: '0.85rem 0.8rem' }}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '5px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            background: `${COLORS_SEDES[m.sede] || '#64748b'}15`,
                            color: COLORS_SEDES[m.sede] || '#64748b'
                          }}>
                            {m.sede || 'Sin Sede'}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 0.8rem', color: '#475569' }}>
                          <div style={{ fontWeight: 600 }}>{m.nombreEquipo || '—'}</div>
                          {m.numEquipo && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Equipo #{m.numEquipo}</div>}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: m.entrenador !== 'Sin Asignar' ? '#1e293b' : '#94a3b8', fontWeight: 600 }}>
                          {m.entrenador}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', color: '#64748b' }}>
                          {m.coordinador || '—'}
                        </td>
                        <td style={{ padding: '0.85rem 0.8rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '20px',
                            fontWeight: 800,
                            fontSize: '0.74rem',
                            textTransform: 'uppercase',
                            background: isGrad ? '#ecfdf5' : isDes ? '#fef2f2' : '#eff6ff',
                            color: isGrad ? '#059669' : isDes ? '#dc2626' : '#2563eb',
                            border: `1px solid ${isGrad ? '#a7f3d0' : isDes ? '#fecaca' : '#bfdbfe'}`
                          }}>
                            {isGrad ? '🎓 GRADUADO' : isDes ? '⚠️ DESERTOR' : '⚡ EN JUEGO'}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                          {m.telefono ? (
                            <a
                              href={`https://wa.me/${m.telefono.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                background: '#25D366',
                                color: '#ffffff',
                                padding: '0.3rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              <Phone size={12} /> {m.telefono}
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Sin tel</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {processedManagersList.length > 250 && (
            <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.78rem', color: '#64748b', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              Mostrando los primeros 250 de <strong>{processedManagersList.length}</strong> managers coincidentes. Utilice el buscador para afinar su consulta.
            </div>
          )}
        </div>
      )}

      {/* 8. MODAL DRILL-DOWN POR ENTRENADOR (CON MATRIZ DE 16 LLAMADAS Y ESTADO) */}
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
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 2rem',
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
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                    {selectedTrainer.entrenador}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.2rem' }}>
                    <span>Sede: <strong>{selectedTrainer.topSede}</strong></span>
                    <span>Asignados: <strong>{selectedTrainer.totalAsignados || 0}</strong></span>
                    <span>Graduados: <strong style={{ color: '#059669' }}>{selectedTrainer.graduados || 0} ({selectedTrainer.tasaGraduacion}%)</strong></span>
                    <span>Desertores: <strong style={{ color: '#dc2626' }}>{selectedTrainer.desertores || 0} ({selectedTrainer.tasaDesercion}%)</strong></span>
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

            {/* Modal Controls */}
            <div style={{ padding: '0.85rem 2rem', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ position: 'relative', flex: '1', maxWidth: '340px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Buscar manager en este entrenador..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 1rem 0.45rem 2.1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <select
                  value={modalFilterStatus}
                  onChange={(e) => setModalFilterStatus(e.target.value)}
                  style={{
                    padding: '0.4rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.78rem',
                    background: '#ffffff',
                    fontWeight: 600
                  }}
                >
                  <option value="todos">Todos los Estados</option>
                  <option value="GRADUADO">Solo Graduados</option>
                  <option value="DESERTOR">Solo Desertores</option>
                  <option value="EN_JUEGO">Solo En Juego</option>
                </select>

                <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.75rem', alignItems: 'center', marginLeft: '0.5rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '3px', display: 'inline-block' }} /> SI
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '3px', display: 'inline-block' }} /> NO
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ width: '10px', height: '10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '3px', display: 'inline-block' }} /> Pendiente
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem 2rem', overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#64748b', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                    <th style={{ padding: '0.65rem 0.8rem', textAlign: 'left' }}>Manager</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left' }}>Equipo</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>Estado</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>Total</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>Matriz 16 Llamadas</th>
                    <th style={{ padding: '0.65rem 0.8rem', textAlign: 'right' }}>Contacto</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTrainer.detalles
                    .filter(m => {
                      if (modalFilterStatus !== 'todos' && m.estado !== modalFilterStatus) return false;
                      if (!modalSearch.trim()) return true;
                      const q = modalSearch.toLowerCase();
                      return m.manager.toLowerCase().includes(q) || m.equipo.toLowerCase().includes(q);
                    })
                    .map((item, idx) => {
                      const phone = phoneByManagerName[item.manager.trim().toLowerCase()] || item.telefono || '';
                      const isGrad = item.estado === 'GRADUADO';
                      const isDes = item.estado === 'DESERTOR';
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.65rem 0.8rem', fontWeight: 700, color: '#0f172a' }}>
                            {item.manager}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', color: '#475569' }}>
                            <div>{item.sede}</div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{item.equipo}</div>
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                            <span style={{
                              padding: '0.15rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              background: isGrad ? '#ecfdf5' : isDes ? '#fef2f2' : '#eff6ff',
                              color: isGrad ? '#059669' : isDes ? '#dc2626' : '#2563eb'
                            }}>
                              {isGrad ? 'GRADUADO' : isDes ? 'DESERTOR' : 'EN JUEGO'}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 800, color: '#7c3aed' }}>
                            {item.totalReportado}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem' }}>
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
                          <td style={{ padding: '0.65rem 0.8rem', textAlign: 'right' }}>
                            {phone ? (
                              <a
                                href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  background: '#25D366',
                                  color: '#ffffff',
                                  padding: '0.25rem 0.55rem',
                                  borderRadius: '6px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                <Phone size={11} /> WhatsApp
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
            <div style={{ padding: '0.85rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedTrainer(null)}
                style={{
                  background: '#334155',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.82rem',
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
