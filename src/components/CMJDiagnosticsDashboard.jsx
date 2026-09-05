import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ComposedChart, Area, AreaChart, PieChart, Pie, Cell
} from 'recharts';
import {
  Shield, Users, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
  Activity, Filter, Search, Download, ChevronDown, ChevronUp, Layers,
  Award, Building2, Calendar, Sparkles, RefreshCw, Eye, ArrowUpRight,
  Flame, HelpCircle, UserCheck, UserX, Target, Zap
} from 'lucide-react';
import {
  getAllEquipos,
  getAllEventos,
  getResumen2026PorSede,
  getCMJSummary,
  getFunnelData,
  getRetentionEvolutionData,
  getSedesBenchmark,
  CMJ_METADATA,
  SEDES_LIST,
  normalizeSedeName
} from '../services/cmjDataService';

const RISK_COLORS = {
  CRITICO: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#f87171', label: 'Riesgo Crítico' },
  ATENCION: { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#fbbf24', label: 'En Atención' },
  OPTIMO: { bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', text: '#4ade80', label: 'Óptimo' }
};

export default function CMJDiagnosticsDashboard({ globalFilterSede }) {
  // Filtros
  const [selectedSede, setSelectedSede] = useState('TODAS');
  const [activeTab, setActiveTab] = useState('equipos'); // 'equipos', 'eventos', 'funnel', 'benchmark'
  const [riskFilter, setRiskFilter] = useState('ALL'); // 'ALL', 'CRITICO', 'ATENCION', 'OPTIMO'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrainer, setSelectedTrainer] = useState('ALL');
  const [sortBy, setSortBy] = useState('desercion_desc');
  const [expandedRow, setExpandedRow] = useState(null);

  // Sincronizar con filtro global si existe
  useEffect(() => {
    if (globalFilterSede && globalFilterSede !== 'Todas' && globalFilterSede !== 'Global') {
      const norm = normalizeSedeName(globalFilterSede);
      setSelectedSede(norm);
    }
  }, [globalFilterSede]);

  // Cargar datos
  const rawEquipos = useMemo(() => getAllEquipos(), []);
  const rawEventos = useMemo(() => getAllEventos(), []);
  const summary = useMemo(() => getCMJSummary(selectedSede), [selectedSede]);
  const funnelData = useMemo(() => getFunnelData(selectedSede), [selectedSede]);
  const evolutionData = useMemo(() => getRetentionEvolutionData(selectedSede), [selectedSede]);
  const sedesBenchmark = useMemo(() => getSedesBenchmark(), []);

  // Lista de entrenadores únicos para el filtro
  const uniqueTrainers = useMemo(() => {
    const set = new Set();
    rawEventos.forEach(ev => {
      ev.fdsList.forEach(f => {
        if (f.entrenador && f.entrenador !== 'Sin Asignar') {
          set.add(f.entrenador);
        }
      });
    });
    return Array.from(set).sort();
  }, [rawEventos]);

  // Filtrado de Equipos
  const filteredEquipos = useMemo(() => {
    return rawEquipos.filter(eq => {
      // Sede
      if (selectedSede !== 'TODAS' && eq.sede !== selectedSede) return false;
      // Riesgo
      if (riskFilter !== 'ALL' && eq.resumen.nivelRiesgo !== riskFilter) return false;
      // Búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchEq = eq.equipoLabel.toLowerCase().includes(q);
        const matchSede = eq.sede.toLowerCase().includes(q) || eq.sedeNombreLargo.toLowerCase().includes(q);
        const matchCMJ = eq.cmj.toLowerCase().includes(q);
        if (!matchEq && !matchSede && !matchCMJ) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'desercion_desc') return b.resumen.desercionTotalPx - a.resumen.desercionTotalPx;
      if (sortBy === 'desercion_asc') return a.resumen.desercionTotalPx - b.resumen.desercionTotalPx;
      if (sortBy === 'retencion_asc') return a.resumen.tasaRetencion - b.resumen.tasaRetencion;
      if (sortBy === 'retencion_desc') return b.resumen.tasaRetencion - a.resumen.tasaRetencion;
      if (sortBy === 'enrol_desc') return b.resumen.enrolTotalAcumulado - a.resumen.enrolTotalAcumulado;
      if (sortBy === 'equipo_asc') return a.equipoNum - b.equipoNum;
      return 0;
    });
  }, [rawEquipos, selectedSede, riskFilter, searchQuery, sortBy]);

  // Filtrado de Eventos FDS
  const filteredEventos = useMemo(() => {
    return rawEventos.filter(ev => {
      if (selectedSede !== 'TODAS' && ev.sede !== selectedSede) return false;
      if (selectedTrainer !== 'ALL') {
        const hasTrainer = ev.fdsList.some(f => f.entrenador === selectedTrainer);
        if (!hasTrainer) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchEv = ev.evento.toLowerCase().includes(q);
        const matchSede = ev.sede.toLowerCase().includes(q);
        const matchTr = ev.fdsList.some(f => f.entrenador.toLowerCase().includes(q));
        if (!matchEv && !matchSede && !matchTr) return false;
      }
      return true;
    });
  }, [rawEventos, selectedSede, selectedTrainer, searchQuery]);

  // Exportar a CSV
  const handleExportCSV = () => {
    let headers = '';
    let rows = [];

    if (activeTab === 'equipos') {
      headers = 'Sede,CMJ,Equipo,PX_Iniciales,PX_Finales,Desercion_PX,Desercion_Managers,Retencion_Pct,Enrolamiento_Total,Nivel_Riesgo\n';
      rows = filteredEquipos.map(e => [
        e.sede,
        `"${e.cmj}"`,
        e.equipoLabel,
        e.resumen.pxIniciales,
        e.resumen.pxFinales,
        e.resumen.desercionTotalPx,
        e.resumen.desercionTotalMg,
        `${e.resumen.tasaRetencion}%`,
        e.resumen.enrolTotalAcumulado,
        e.resumen.nivelRiesgo
      ].join(','));
    } else {
      headers = 'Sede,Evento,Total_Llegaron,Total_Desercion,Total_Terminaron,Tasa_Retencion,Enrolamiento_Total,PX_en_0\n';
      rows = filteredEventos.map(ev => [
        ev.sede,
        `"${ev.evento}"`,
        ev.totalLlegaron,
        ev.totalDesercion,
        ev.totalTerminaron,
        `${ev.tasaRetencionGlobal}%`,
        ev.totalEnrol,
        ev.totalPxCero
      ].join(','));
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + rows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Diagnostico_CMJ_${selectedSede}_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setSelectedSede('TODAS');
    setRiskFilter('ALL');
    setSearchQuery('');
    setSelectedTrainer('ALL');
    setSortBy('desercion_desc');
    setExpandedRow(null);
  };

  const cmjActual = CMJ_METADATA[selectedSede] || {
    sede: 'TODAS',
    nombreLargo: 'Consolidado Global',
    cmj: 'Dirección de Maestría & CMJs Regionales',
    color: '#d4af37',
    flag: '🌎'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', color: 'var(--text-main, #f8fafc)' }}>
      {/* 1. ENCABEZADO Y BRANDING OFICIAL */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
        border: '1px solid rgba(212, 175, 55, 0.35)',
        borderRadius: '16px',
        padding: '1.5rem 2rem',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.25rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '220px', height: '220px', background: 'radial-gradient(circle, rgba(212, 175, 55, 0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', zIndex: 1 }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #d4af37 0%, #aa820a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0f172a',
            boxShadow: '0 4px 15px rgba(212, 175, 55, 0.4)'
          }}>
            <Target size={28} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', color: '#d4af37', textTransform: 'uppercase' }}>
                CREAR PODER SIN LÍMITES • CAUSA OS
              </span>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.2)', color: '#d4af37', border: '1px solid rgba(212, 175, 55, 0.4)' }}>
                DIAGNÓSTICO CMJ HD
              </span>
            </div>
            <h1 style={{ fontSize: '1.7rem', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Monitor Clínico de Maestría del Juego
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#94a3b8' }}>
              Diagnóstico de Equipos, Participantes (PX), Creación, Relación, Gratitud y Retención vs Abandono.
            </p>
          </div>
        </div>

        {/* Resumen de CMJ a cargo de la Sede seleccionada */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '0.75rem 1.25rem',
          borderRadius: '12px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 1
        }}>
          <span style={{ fontSize: '1.8rem' }}>{cmjActual.flag}</span>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              CMJ a Cargo • {cmjActual.nombreLargo}
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: cmjActual.color }}>
              {cmjActual.cmj}
            </div>
          </div>
        </div>
      </div>

      {/* 2. SELECTOR DE SEDES OFICIALES */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        padding: '4px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        {SEDES_LIST.map(s => {
          const isSelected = selectedSede === s;
          const meta = CMJ_METADATA[s] || { flag: '🌎', nombreLargo: 'Global', color: '#d4af37' };
          return (
            <button
              key={s}
              onClick={() => setSelectedSede(s)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.65rem 1.1rem',
                borderRadius: '10px',
                border: isSelected ? `1px solid ${meta.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                background: isSelected ? 'rgba(212, 175, 55, 0.15)' : 'rgba(30, 41, 59, 0.45)',
                color: isSelected ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                fontWeight: isSelected ? 700 : 500,
                fontSize: '0.88rem',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{meta.flag}</span>
              <span>{s === 'TODAS' ? 'Todas las Sedes' : meta.nombreLargo}</span>
            </button>
          );
        })}
      </div>

      {/* 3. SCORECARDS EJECUTIVOS CON MICRO-INDICADORES */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        {/* Card 1: Llegaron */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '1.2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>PX QUE LLEGARON</span>
            <Users size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc' }}>
            {summary.totalLlegaron.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            En {summary.totalEquipos} equipos registrados
          </div>
        </div>

        {/* Card 2: Retención */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid rgba(34, 197, 94, 0.25)',
          borderRadius: '14px',
          padding: '1.2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>TASA DE RETENCIÓN</span>
            <TrendingUp size={18} color="#4ade80" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#4ade80' }}>
            {summary.tasaRetencion}%
          </div>
          <div style={{ fontSize: '0.78rem', color: '#86efac' }}>
            {summary.totalTerminaron.toLocaleString()} participantes culminaron
          </div>
        </div>

        {/* Card 3: Deserción */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '14px',
          padding: '1.2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>DESERCIÓN / ABANDONO</span>
            <TrendingDown size={18} color="#f87171" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f87171' }}>
            {summary.tasaDesercion}%
          </div>
          <div style={{ fontSize: '0.78rem', color: '#fca5a5' }}>
            {summary.totalDesercion.toLocaleString()} abandonos acumulados
          </div>
        </div>

        {/* Card 4: PX en 0 (Alerta de Quiebre) */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '14px',
          padding: '1.2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>PARTICIPANTES EN 0</span>
            <AlertTriangle size={18} color="#fbbf24" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24' }}>
            {summary.totalPxCero} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#fef08a' }}>({summary.pctPxCero}%)</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#fde047' }}>
            Alerta de riesgo de deserción inminente
          </div>
        </div>

        {/* Card 5: Enrolamiento Total */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          borderRadius: '14px',
          padding: '1.2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>ENROLAMIENTO TOTAL</span>
            <Award size={18} color="#d4af37" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d4af37' }}>
            {summary.totalEnrol.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#fde68a' }}>
            Ratio: {summary.ratioEnrol} enrolamientos / PX
          </div>
        </div>

        {/* Card 6: Salud de Equipos */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '1.2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>ESTADO SEMAFÓRICO</span>
            <Shield size={18} color="#a855f7" />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
            <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', fontSize: '0.85rem', fontWeight: 700 }}>
              {summary.equiposSalud.optimo} 🟢
            </span>
            <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 700 }}>
              {summary.equiposSalud.atencion} 🟡
            </span>
            <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '0.85rem', fontWeight: 700 }}>
              {summary.equiposSalud.critico} 🔴
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Distribución de riesgo en {summary.totalEquipos} equipos
          </div>
        </div>
      </div>

      {/* 4. BARRA DE HERRAMIENTAS Y PESTAÑAS DE VISTA */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '1rem',
        background: 'rgba(30, 41, 59, 0.5)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        {/* Pestañas de modo */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '10px' }}>
          <button
            onClick={() => setActiveTab('equipos')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: activeTab === 'equipos' ? '#d4af37' : 'transparent',
              color: activeTab === 'equipos' ? '#0f172a' : '#94a3b8',
              transition: 'all 0.2s'
            }}
          >
            🛡️ Equipos ({filteredEquipos.length})
          </button>
          <button
            onClick={() => setActiveTab('eventos')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: activeTab === 'eventos' ? '#d4af37' : 'transparent',
              color: activeTab === 'eventos' ? '#0f172a' : '#94a3b8',
              transition: 'all 0.2s'
            }}
          >
            📅 Ciclos & FDS Drive ({filteredEventos.length})
          </button>
          <button
            onClick={() => setActiveTab('funnel')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: activeTab === 'funnel' ? '#d4af37' : 'transparent',
              color: activeTab === 'funnel' ? '#0f172a' : '#94a3b8',
              transition: 'all 0.2s'
            }}
          >
            📉 Embudo CRES & Gráficos HD
          </button>
          <button
            onClick={() => setActiveTab('benchmark')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: activeTab === 'benchmark' ? '#d4af37' : 'transparent',
              color: activeTab === 'benchmark' ? '#0f172a' : '#94a3b8',
              transition: 'all 0.2s'
            }}
          >
            🏆 Benchmark Regional
          </button>
        </div>

        {/* Buscador & Controles rápidos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar equipo, sede, CMJ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                color: '#ffffff',
                fontSize: '0.85rem',
                outline: 'none',
                minWidth: '220px'
              }}
            />
          </div>

          {/* Filtro de Riesgo (en Equipos) */}
          {activeTab === 'equipos' && (
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                color: '#ffffff',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">Nivel de Riesgo: Todos</option>
              <option value="CRITICO">🔴 Riesgo Crítico (Deserción &gt; 15%)</option>
              <option value="ATENCION">🟡 En Atención (Deserción 7-15%)</option>
              <option value="OPTIMO">🟢 Desempeño Óptimo (&lt; 7%)</option>
            </select>
          )}

          {/* Filtro de Entrenador (en Eventos) */}
          {activeTab === 'eventos' && (
            <select
              value={selectedTrainer}
              onChange={(e) => setSelectedTrainer(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                color: '#ffffff',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">Entrenador: Todos ({uniqueTrainers.length})</option>
              {uniqueTrainers.map(tr => (
                <option key={tr} value={tr}>{tr}</option>
              ))}
            </select>
          )}

          {/* Ordenamiento */}
          {activeTab === 'equipos' && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                color: '#ffffff',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <option value="desercion_desc">Mayor Deserción PX</option>
              <option value="desercion_asc">Menor Deserción PX</option>
              <option value="retencion_desc">Mayor Retención %</option>
              <option value="retencion_asc">Menor Retención %</option>
              <option value="enrol_desc">Mayor Enrolamiento</option>
              <option value="equipo_asc">Número de Equipo</option>
            </select>
          )}

          {/* Botón Exportar CSV */}
          <button
            onClick={handleExportCSV}
            title="Exportar datos filtrados a CSV"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              background: 'rgba(212, 175, 55, 0.1)',
              color: '#d4af37',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            <Download size={15} />
            <span>CSV</span>
          </button>

          {/* Botón Restablecer */}
          <button
            onClick={resetFilters}
            title="Restablecer filtros"
            style={{
              padding: '0.5rem 0.65rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* 5. CONTENIDO SEGÚN LA PESTAÑA ACTIVA */}

      {/* MODO 1: TABLA DE DIAGNÓSTICO DE EQUIPOS (CRES) */}
      {activeTab === 'equipos' && (
        <div style={{
          background: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                Diagnóstico Clínico por Equipo (Funnel CRES)
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Monitoreo detallado de deserción y enrolamiento desde Creación (1er FDS) hasta El Viaje.
              </p>
            </div>
            <span style={{ fontSize: '0.85rem', color: '#d4af37', fontWeight: 600 }}>
              Mostrando {filteredEquipos.length} equipos
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.85)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Equipo & Sede</th>
                  <th style={{ padding: '0.85rem 1rem' }}>CMJ Asignado</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>PX Inician</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Deserción PX</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>PX Culminan</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Retención %</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Enrol. Total</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Estado de Salud</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredEquipos.map((eq) => {
                  const isExpanded = expandedRow === eq.id;
                  const risk = RISK_COLORS[eq.resumen.nivelRiesgo] || RISK_COLORS.OPTIMO;
                  const sedeMeta = CMJ_METADATA[eq.sede] || { flag: '📍', color: '#64748b' };

                  return (
                    <React.Fragment key={eq.id}>
                      <tr
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          background: isExpanded ? 'rgba(212, 175, 55, 0.08)' : 'transparent',
                          transition: 'background 0.2s'
                        }}
                      >
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{sedeMeta.flag}</span>
                            <div>
                              <div style={{ color: '#ffffff', fontWeight: 700 }}>{eq.equipoLabel}</div>
                              <div style={{ fontSize: '0.75rem', color: sedeMeta.color }}>{eq.sedeNombreLargo}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>
                          {eq.cmj}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#38bdf8' }}>
                          {eq.resumen.pxIniciales}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: eq.resumen.desercionTotalPx > 3 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.1)',
                            color: eq.resumen.desercionTotalPx > 3 ? '#f87171' : '#fbbf24',
                            fontWeight: 700
                          }}>
                            {eq.resumen.desercionTotalPx} ({eq.resumen.tasaDesercion}%)
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#4ade80' }}>
                          {eq.resumen.pxFinales}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, color: eq.resumen.tasaRetencion >= 85 ? '#4ade80' : eq.resumen.tasaRetencion >= 70 ? '#fbbf24' : '#f87171' }}>
                              {eq.resumen.tasaRetencion}%
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#d4af37' }}>
                          {eq.resumen.enrolTotalAcumulado}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: risk.bg,
                            border: `1px solid ${risk.border}`,
                            color: risk.text,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            letterSpacing: '0.02em'
                          }}>
                            {risk.label}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : eq.id)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              background: isExpanded ? '#d4af37' : 'rgba(15, 23, 42, 0.6)',
                              color: isExpanded ? '#0f172a' : '#94a3b8',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 600
                            }}
                          >
                            <span>Detalle</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>

                      {/* FILA EXPANDIBLE CON EL DIAGNÓSTICO DETALLADO CRES */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} style={{ padding: '1.25rem 1.5rem', background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#d4af37' }}>
                                  🔬 Desglose Clínico de Etapas: {eq.equipoLabel} ({eq.sedeNombreLargo})
                                </span>
                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                  Inician C1: {eq.c1.inician} → Terminan C1: {eq.c1.terminan} | Inician C2: {eq.c2.inician} → Terminan C2: {eq.c2.terminan}
                                </span>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                                {/* 1er FDS: Creación */}
                                <div style={{ background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '10px', padding: '1rem' }}>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#d4af37', marginBottom: '8px' }}>
                                    ✨ 1er FDS: Creación
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div>PX Inician: <strong style={{ color: '#ffffff' }}>{eq.creacion.pxInicio}</strong></div>
                                    <div>Deserción PX: <strong style={{ color: eq.creacion.desercionPx > 0 ? '#f87171' : '#4ade80' }}>{eq.creacion.desercionPx}</strong></div>
                                    <div>PX Final: <strong style={{ color: '#ffffff' }}>{eq.creacion.pxFinal}</strong></div>
                                    <div>Deserción Managers: <strong style={{ color: eq.creacion.desercionMg > 0 ? '#f87171' : '#cbd5e1' }}>{eq.creacion.desercionMg}</strong></div>
                                    <div style={{ marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '4px' }}>
                                      Enrolamiento PX: <strong style={{ color: '#38bdf8' }}>{eq.creacion.enrolPx}</strong>
                                    </div>
                                    <div>Enrolamiento Managers: <strong style={{ color: '#a78bfa' }}>{eq.creacion.enrolMg}</strong></div>
                                  </div>
                                </div>

                                {/* 2do FDS: Relación */}
                                <div style={{ background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '1rem' }}>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399', marginBottom: '8px' }}>
                                    🤝 2do FDS: Relación
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div>PX Inician: <strong style={{ color: '#ffffff' }}>{eq.relacion.pxInicio}</strong></div>
                                    <div>Deserción PX: <strong style={{ color: eq.relacion.desercionPx > 0 ? '#f87171' : '#4ade80' }}>{eq.relacion.desercionPx}</strong></div>
                                    <div>PX Final: <strong style={{ color: '#ffffff' }}>{eq.relacion.pxFinal}</strong></div>
                                    <div>Deserción Managers: <strong style={{ color: eq.relacion.desercionMg > 0 ? '#f87171' : '#cbd5e1' }}>{eq.relacion.desercionMg}</strong></div>
                                    <div style={{ marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '4px' }}>
                                      Enrolamiento FDS 2: <strong style={{ color: '#38bdf8' }}>{eq.relacion.enrolTotal}</strong>
                                    </div>
                                  </div>
                                </div>

                                {/* 3er FDS: Gratitud */}
                                <div style={{ background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '10px', padding: '1rem' }}>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#22d3ee', marginBottom: '8px' }}>
                                    🙏 3er FDS: Gratitud
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div>PX Inician: <strong style={{ color: '#ffffff' }}>{eq.gratitud.pxInicio}</strong></div>
                                    <div>Deserción PX: <strong style={{ color: eq.gratitud.desercionPx > 0 ? '#f87171' : '#4ade80' }}>{eq.gratitud.desercionPx}</strong></div>
                                    <div>PX Final: <strong style={{ color: '#ffffff' }}>{eq.gratitud.pxFinal}</strong></div>
                                    <div>Deserción Managers: <strong style={{ color: eq.gratitud.desercionMg > 0 ? '#f87171' : '#cbd5e1' }}>{eq.gratitud.desercionMg}</strong></div>
                                    <div style={{ marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '4px' }}>
                                      Enrolamiento FDS 3: <strong style={{ color: '#38bdf8' }}>{eq.gratitud.enrolTotal}</strong>
                                    </div>
                                  </div>
                                </div>

                                {/* El Viaje: Graduación */}
                                <div style={{ background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', padding: '1rem' }}>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24', marginBottom: '8px' }}>
                                    🎓 El Viaje (Graduación)
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div>PX Inician Viaje: <strong style={{ color: '#ffffff' }}>{eq.viaje.pxInicio}</strong></div>
                                    <div>PX Graduados: <strong style={{ color: '#4ade80', fontSize: '1rem' }}>{eq.viaje.pxGraduados}</strong></div>
                                    <div>Total Desertores PX: <strong style={{ color: eq.resumen.desercionTotalPx > 0 ? '#f87171' : '#4ade80' }}>{eq.resumen.desercionTotalPx}</strong></div>
                                    <div style={{ marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '4px' }}>
                                      Retención Global: <strong style={{ color: '#d4af37' }}>{eq.resumen.tasaRetencion}%</strong>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODO 2: TABLA DE EVENTOS FDS (DRIVE) */}
      {activeTab === 'eventos' && (
        <div style={{
          background: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                Hojas Clínicas de FDS de Maestría (Google Drive)
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Eventos con Entrenadores a cargo, PX en 0 (Alerta de deserción) y comparativas de metas.
              </p>
            </div>
            <span style={{ fontSize: '0.85rem', color: '#d4af37', fontWeight: 600 }}>
              {filteredEventos.length} eventos encontrados
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.85)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Evento / Fecha</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Sede</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Entrenadores por FDS</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>PX Llegaron</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Deserción</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Retención %</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>PX en 0 (Alerta)</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Enrol. Total</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredEventos.map((ev) => {
                  const isExpanded = expandedRow === ev.id;
                  const trainers = Array.from(new Set(ev.fdsList.map(f => f.entrenador).filter(t => t && t !== 'Sin Asignar'))).join(', ') || 'Sin Asignar';
                  const sedeMeta = CMJ_METADATA[ev.sede] || { flag: '📍', color: '#64748b' };

                  return (
                    <React.Fragment key={ev.id}>
                      <tr style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: isExpanded ? 'rgba(212, 175, 55, 0.08)' : 'transparent'
                      }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#ffffff' }}>
                          {ev.evento}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: sedeMeta.color, fontWeight: 600 }}>
                            {sedeMeta.flag} {ev.sede}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1', fontSize: '0.82rem' }}>
                          {trainers}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#38bdf8' }}>
                          {ev.totalLlegaron}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: ev.tasaDesercionGlobal > 10 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.1)',
                            color: ev.tasaDesercionGlobal > 10 ? '#f87171' : '#fbbf24',
                            fontWeight: 700
                          }}>
                            {ev.totalDesercion} ({ev.tasaDesercionGlobal}%)
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#4ade80' }}>
                          {ev.tasaRetencionGlobal}%
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: ev.totalPxCero > 5 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.15)',
                            color: ev.totalPxCero > 5 ? '#f87171' : '#fbbf24',
                            fontWeight: 700
                          }}>
                            {ev.totalPxCero} en 0
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#d4af37' }}>
                          {ev.totalEnrol}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : ev.id)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              background: isExpanded ? '#d4af37' : 'rgba(15, 23, 42, 0.6)',
                              color: isExpanded ? '#0f172a' : '#94a3b8',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 600
                            }}
                          >
                            <span>FDS</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>

                      {/* FILA EXPANDIBLE CON CADA FDS */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} style={{ padding: '1.25rem 1.5rem', background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                              {ev.fdsList.map((f, idx) => (
                                <div key={idx} style={{ background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '1rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#d4af37' }}>{f.fdsName}</span>
                                    <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: '#38bdf8' }}>
                                      {f.entrenador}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div>PX Llegaron: <strong style={{ color: '#ffffff' }}>{f.llegaron}</strong></div>
                                    <div>Deserción: <strong style={{ color: f.desercion > 0 ? '#f87171' : '#4ade80' }}>{f.desercion} ({f.tasaDesercion}%)</strong></div>
                                    <div>PX Terminaron: <strong style={{ color: '#4ade80' }}>{f.terminaron}</strong></div>
                                    <div style={{ color: f.pxEnCero > 0 ? '#fbbf24' : '#94a3b8' }}>
                                      PX en 0: <strong>{f.pxEnCero} ({f.pctPxEnCero}%)</strong>
                                    </div>
                                    <div style={{ marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '4px' }}>
                                      Enrolamiento PX: <strong style={{ color: '#38bdf8' }}>{f.enrolPx}</strong> (Meta: {f.declPx})
                                    </div>
                                    <div>Enrolamiento Managers: <strong style={{ color: '#a78bfa' }}>{f.enrolMg}</strong></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODO 3: FUNNEL DE CONVERSIÓN & GRÁFICOS HD */}
      {activeTab === 'funnel' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Gráfico 1: Embudo de Supervivencia CRES */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                  Embudo de Conversión & Supervivencia del Proceso (CRES)
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Visualización paso a paso: Cómo van creándose los equipos y dónde ocurren los abandonos.
                </p>
              </div>
              <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px', background: 'rgba(212, 175, 55, 0.15)', color: '#d4af37', fontWeight: 600 }}>
                {selectedSede === 'TODAS' ? 'Todas las Sedes' : selectedSede}
              </span>
            </div>

            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis dataKey="etapa" stroke="#94a3b8" angle={-25} textAnchor="end" interval={0} fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(212, 175, 55, 0.4)',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }}
                  />
                  <Bar dataKey="cantidad" name="Participantes Activos" radius={[6, 6, 0, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 2: Evolución de Retención vs Deserción */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                  Evolución Temporal: Retención vs Abandono & Participantes en 0
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Comportamiento histórico de participantes que culminan vs desertores en cada ciclo.
                </p>
              </div>
            </div>

            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolutionData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorTerminaron" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDesercion" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis dataKey={selectedSede === 'TODAS' ? 'nombre' : 'fecha'} stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="Terminaron" stroke="#22c55e" fillOpacity={1} fill="url(#colorTerminaron)" />
                  <Area type="monotone" dataKey="Desercion" stroke="#ef4444" fillOpacity={1} fill="url(#colorDesercion)" />
                  <Line type="monotone" dataKey="PxEnCero" stroke="#f59e0b" strokeWidth={2} name="PX en 0 (Alerta)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* MODO 4: BENCHMARK REGIONAL ENTRE LAS 6 SEDES */}
      {activeTab === 'benchmark' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                Benchmark Regional Comparativo de Maestría del Juego (2026)
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Comparación directa entre las 6 sedes: Eficiencia de retención, deserción y enrolamiento per cápita.
              </p>
            </div>

            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sedesBenchmark} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis dataKey="nombreLargo" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(212, 175, 55, 0.4)',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="terminaron" name="PX Terminaron" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="desercion" name="Deserción" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pxCero" name="PX en 0" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tarjetas de Resumen por Sede */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {sedesBenchmark.map(b => (
              <div
                key={b.sede}
                onClick={() => { setSelectedSede(b.sede); setActiveTab('equipos'); }}
                style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: `1px solid ${b.color}40`,
                  borderRadius: '14px',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.5rem' }}>{b.flag}</span>
                    <div>
                      <div style={{ fontWeight: 700, color: '#ffffff' }}>{b.nombreLargo}</div>
                      <div style={{ fontSize: '0.75rem', color: b.color }}>CMJ: {b.cmj}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8' }}>
                    {b.totalEquipos} Equipos
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem', marginTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Retención: </span>
                    <strong style={{ color: '#4ade80' }}>{b.tasaRetencion}%</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Deserción: </span>
                    <strong style={{ color: b.tasaDesercion > 8 ? '#f87171' : '#fbbf24' }}>{b.tasaDesercion}%</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Enrol. Total: </span>
                    <strong style={{ color: '#d4af37' }}>{b.enrolTotal}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>PX en 0: </span>
                    <strong style={{ color: b.pxCero > 5 ? '#f87171' : '#fbbf24' }}>{b.pxCero}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
