import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import {
  Users, PhoneCall, CheckCircle2, AlertCircle, Clock, Search, Filter,
  RefreshCw, BarChart2, PieChart as PieChartIcon, TrendingUp, ChevronDown,
  ChevronRight, Award, MapPin, Building2, Layers, UserCheck, PhoneOff,
  Calendar, Eye, ArrowUpDown, Download, CheckCircle
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  Legend, CartesianGrid, Cell, PieChart, Pie, ComposedChart, Line
} from 'recharts';
import './NodusCoordinadoresC1C2Dashboard.css';

const COLORS = {
  confirmado: '#10b981', // Emerald
  porConfirmar: '#f59e0b', // Amber
  noContesta: '#64748b', // Slate
  siguiente: '#3b82f6', // Blue
  noInteresa: '#ef4444', // Red
  c1: '#eab308', // Gold
  c2: '#8b5cf6', // Violet
  primary: '#0ea5e9' // Sky
};

const PIE_COLORS = ['#10b981', '#f59e0b', '#64748b', '#3b82f6', '#ef4444'];

export default function NodusCoordinadoresC1C2Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSede, setSelectedSede] = useState('TODAS');
  const [selectedEquipo, setSelectedEquipo] = useState('TODOS');
  const [selectedEntrenamiento, setSelectedEntrenamiento] = useState('TODOS'); // TODOS, C1, C2
  const [selectedCiclo, setSelectedCiclo] = useState('TODOS');
  const [sortBy, setSortBy] = useState('gestiones'); // gestiones, cobertura, productividad, confirmados, nombre
  const [activeChartTab, setActiveChartTab] = useState('coordinadores'); // coordinadores, sedes, estados

  // Filas expandidas (para ver desglose de equipos)
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (coordId) => {
    setExpandedRows(prev => ({
      ...prev,
      [coordId]: !prev[coordId]
    }));
  };

  // Carga y suscripción en tiempo real desde Firestore
  useEffect(() => {
    let unsubscribe = null;
    try {
      const docRef = doc(db, 'nodus_coordinadores_c1c2', 'latest');
      unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setData(docSnap.data());
          setLoading(false);
          setError(null);
        } else {
          // Intentar fallback a nodus_kpis_sincronizados/latest_snapshot
          const fallbackRef = doc(db, 'nodus_kpis_sincronizados', 'latest_snapshot');
          getDoc(fallbackRef).then((fSnap) => {
            if (fSnap.exists()) {
              const fData = fSnap.data();
              setData({
                timestamp: fData.timestamp,
                totales: fData.totales,
                sedes: fData.sedes,
                coordinadores: fData.coordinadores || [],
                equiposReporte: fData.equiposReporte || []
              });
            }
            setLoading(false);
          }).catch(err => {
            console.error("Error en fallback:", err);
            setLoading(false);
          });
        }
      }, (err) => {
        console.error("Error en realtime listener:", err);
        setError("No se pudo cargar la sincronización en vivo.");
        setLoading(false);
      });
    } catch (e) {
      console.error(e);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const docRef = doc(db, 'nodus_coordinadores_c1c2', 'latest');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setData(snap.data());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  // Lista única de sedes
  const sedesList = useMemo(() => {
    if (!data?.coordinadores) return [];
    const set = new Set(data.coordinadores.map(c => c.sede).filter(Boolean));
    return Array.from(set).sort();
  }, [data]);

  // Lista única de equipos disponibles según la sede seleccionada
  const equiposList = useMemo(() => {
    if (!data?.coordinadores) return [];
    let coords = data.coordinadores;
    if (selectedSede !== 'TODAS') {
      coords = coords.filter(c => c.sede === selectedSede);
    }
    const set = new Set();
    coords.forEach(c => {
      (c.equipos || []).forEach(eq => {
        if (eq.equipo) set.add(eq.equipo);
      });
    });
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  }, [data, selectedSede]);

  // Filtrado y ordenamiento de coordinadores
  const filteredCoordinadores = useMemo(() => {
    if (!data?.coordinadores) return [];

    return data.coordinadores.filter(c => {
      // Filtro de búsqueda
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = c.nombre?.toLowerCase().includes(term) || c.nombreCompleto?.toLowerCase().includes(term);
        const matchesSede = c.sede?.toLowerCase().includes(term);
        const matchesEquipos = (c.equipos || []).some(eq => eq.equipo?.toLowerCase().includes(term));
        if (!matchesName && !matchesSede && !matchesEquipos) return false;
      }

      // Filtro por Sede
      if (selectedSede !== 'TODAS' && c.sede !== selectedSede) {
        return false;
      }

      // Filtro por Ciclo
      if (selectedCiclo !== 'TODOS' && c.ciclo !== selectedCiclo) {
        return false;
      }

      // Filtro por Entrenamiento (C1 o C2)
      if (selectedEntrenamiento === 'C1' && c.c1 === 0) return false;
      if (selectedEntrenamiento === 'C2' && c.c2 === 0) return false;

      // Filtro por Equipo
      if (selectedEquipo !== 'TODOS') {
        const hasEquipo = (c.equipos || []).some(eq => eq.equipo === selectedEquipo);
        if (!hasEquipo) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'gestiones') return b.gestiones - a.gestiones;
      if (sortBy === 'cobertura') return b.coberturaPct - a.coberturaPct;
      if (sortBy === 'productividad') return b.productividadPct - a.productividadPct;
      if (sortBy === 'confirmados') return (b.estados?.confirmado || 0) - (a.estados?.confirmado || 0);
      if (sortBy === 'nombre') return a.nombre.localeCompare(b.nombre);
      return 0;
    });
  }, [data, searchTerm, selectedSede, selectedEquipo, selectedEntrenamiento, selectedCiclo, sortBy]);

  // Métricas agregadas reactivas según los filtros aplicados
  const aggregatedStats = useMemo(() => {
    const list = filteredCoordinadores;
    const totalGestiones = list.reduce((acc, c) => acc + (c.gestiones || 0), 0);
    const totalAsignados = list.reduce((acc, c) => acc + (c.asignados || 0), 0);
    const totalConfirmados = list.reduce((acc, c) => acc + (c.estados?.confirmado || 0), 0);
    const totalNoContesta = list.reduce((acc, c) => acc + (c.estados?.noContesta || 0), 0);
    const totalPorConfirmar = list.reduce((acc, c) => acc + (c.estados?.porConfirmar || 0), 0);
    const totalSiguiente = list.reduce((acc, c) => acc + (c.estados?.siguiente || 0), 0);
    const totalNoInteresa = list.reduce((acc, c) => acc + (c.estados?.noInteresa || 0), 0);
    const totalAsistieron = list.reduce((acc, c) => acc + (c.asistieron || 0), 0);

    const coberturaProm = list.length ? Math.round(list.reduce((acc, c) => acc + (c.coberturaPct || 0), 0) / list.length) : 0;
    const productividadProm = list.length ? Math.round(list.reduce((acc, c) => acc + (c.productividadPct || 0), 0) / list.length) : 0;

    return {
      coordinadoresCount: list.length,
      totalGestiones,
      totalAsignados,
      totalConfirmados,
      totalNoContesta,
      totalPorConfirmar,
      totalSiguiente,
      totalNoInteresa,
      totalAsistieron,
      coberturaProm,
      productividadProm,
      tasaEfectividad: totalGestiones > 0 ? Math.round((totalConfirmados / totalGestiones) * 100) : 0
    };
  }, [filteredCoordinadores]);

  // Datos para Gráfico 1: Top 12 Coordinadores por Gestiones y Confirmados
  const chartCoordinadoresData = useMemo(() => {
    return filteredCoordinadores.slice(0, 12).map(c => ({
      name: `${c.nombre} (${c.sede.slice(0, 3)})`,
      gestiones: c.gestiones,
      confirmados: c.estados?.confirmado || 0,
      c1: c.c1,
      c2: c.c2,
      cobertura: c.coberturaPct
    }));
  }, [filteredCoordinadores]);

  // Datos para Gráfico 2: Desglose por Sedes
  const chartSedesData = useMemo(() => {
    if (!data?.sedes) return [];
    return data.sedes.map(s => ({
      sede: s.sede,
      gestiones: s.gestionesTotal,
      confirmados: s.confirmadosTotal,
      asignados: s.asignadosTotal,
      c1: s.c1Total,
      c2: s.c2Total,
      coordinadores: s.coordinadoresCount
    })).sort((a, b) => b.gestiones - a.gestiones);
  }, [data]);

  // Datos para Gráfico 3: Distribución Global de Estados (Donut)
  const chartEstadosData = useMemo(() => {
    return [
      { name: 'Confirmado', value: aggregatedStats.totalConfirmados, color: COLORS.confirmado },
      { name: 'Por Confirmar', value: aggregatedStats.totalPorConfirmar, color: COLORS.porConfirmar },
      { name: 'No Contesta', value: aggregatedStats.totalNoContesta, color: COLORS.noContesta },
      { name: 'Siguiente', value: aggregatedStats.totalSiguiente, color: COLORS.siguiente },
      { name: 'No le Interesa', value: aggregatedStats.totalNoInteresa, color: COLORS.noInteresa },
    ].filter(item => item.value > 0);
  }, [aggregatedStats]);

  // Cálculo de tiempo transcurrido desde la última sincronización
  const timeSinceSync = useMemo(() => {
    if (!data?.timestamp) return 'Reciente';
    try {
      const diffMs = Date.now() - new Date(data.timestamp).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Hace unos segundos';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      return `Hace ${diffHours} h y ${diffMins % 60} min`;
    } catch {
      return 'Reciente';
    }
  }, [data?.timestamp]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '1rem', background: 'rgba(17, 34, 64, 0.7)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8' }}>
        <RefreshCw size={36} color="#ffc107" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Cargando datos ejecutivos de Coordinadores C1 & C2...</p>
        <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>Conectando con el enjambre de agentes autónomos Nodus</p>
      </div>
    );
  }

  return (
    <div className="nodus-dashboard-container">
      {/* 1. HEADER SUPERIOR: ESTADO EN VIVO & SINCRONIZACIÓN */}
      <div className="nodus-header-banner">
        <div className="nodus-header-left">
          <div className="nodus-header-icon">
            <Award size={26} color="#ffc107" />
          </div>
          <div>
            <h2 className="nodus-header-title">
              Panel de Coordinadores C1 & C2
              <span className="nodus-badge-live">Nodus Live Global</span>
            </h2>
            <p className="nodus-header-subtitle">
              Auditoría horaria multi-agente de gestiones, llamadas, confirmaciones y cobertura en tiempo real
            </p>
          </div>
        </div>

        <div className="nodus-header-right">
          <div className="nodus-sync-indicator">
            <span className="nodus-pulse-dot" />
            <span>Sincronizado: <strong style={{ color: '#10b981' }}>{timeSinceSync}</strong></span>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="nodus-btn-refresh"
            title="Refrescar datos en vivo"
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{refreshing ? 'Actualizando...' : 'Refrescar'}</span>
          </button>
        </div>
      </div>

      {/* 2. SCORECARDS EJECUTIVAS */}
      <div className="nodus-scorecards-grid">
        <div className="nodus-card">
          <div className="nodus-card-header">
            <span>Coordinadores</span>
            <Users size={16} color="#ffc107" />
          </div>
          <div className="nodus-card-value">{aggregatedStats.coordinadoresCount}</div>
          <div className="nodus-card-footer">En {selectedSede === 'TODAS' ? '6 Sedes' : selectedSede}</div>
        </div>

        <div className="nodus-card">
          <div className="nodus-card-header">
            <span>Gestiones Totales</span>
            <PhoneCall size={16} color="#0ea5e9" />
          </div>
          <div className="nodus-card-value" style={{ color: '#38bdf8' }}>{aggregatedStats.totalGestiones.toLocaleString()}</div>
          <div className="nodus-card-footer" style={{ color: '#38bdf8' }}>Llamadas realizadas</div>
        </div>

        <div className="nodus-card">
          <div className="nodus-card-header">
            <span>Asignados</span>
            <Building2 size={16} color="#a855f7" />
          </div>
          <div className="nodus-card-value">{aggregatedStats.totalAsignados.toLocaleString()}</div>
          <div className="nodus-card-footer">Participantes meta</div>
        </div>

        <div className="nodus-card">
          <div className="nodus-card-header">
            <span>Confirmados</span>
            <CheckCircle2 size={16} color="#10b981" />
          </div>
          <div className="nodus-card-value highlight-emerald">{aggregatedStats.totalConfirmados.toLocaleString()}</div>
          <div className="nodus-card-footer" style={{ color: '#10b981' }}>{aggregatedStats.tasaEfectividad}% efectividad</div>
        </div>

        <div className="nodus-card">
          <div className="nodus-card-header">
            <span>Cobertura Media</span>
            <TrendingUp size={16} color="#ffc107" />
          </div>
          <div className="nodus-card-value">{aggregatedStats.coberturaProm}%</div>
          <div className="nodus-progress-bar">
            <div className="nodus-progress-fill" style={{ width: `${aggregatedStats.coberturaProm}%`, background: '#ffc107' }} />
          </div>
        </div>

        <div className="nodus-card">
          <div className="nodus-card-header">
            <span>Productividad Media</span>
            <UserCheck size={16} color="#14b8a6" />
          </div>
          <div className="nodus-card-value">{aggregatedStats.productividadProm}%</div>
          <div className="nodus-progress-bar">
            <div className="nodus-progress-fill" style={{ width: `${aggregatedStats.productividadProm}%`, background: '#14b8a6' }} />
          </div>
        </div>
      </div>

      {/* 3. BARRA DE FILTROS MULTIDIMENSIONALES */}
      <div className="nodus-filters-bar">
        <div className="nodus-filters-row">
          <div className="nodus-search-box">
            <Search size={15} className="nodus-search-icon" />
            <input
              type="text"
              placeholder="Buscar colaborador, sede o equipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="nodus-search-input"
            />
          </div>

          <div className="nodus-select-group">
            <div className="nodus-select-item">
              <MapPin size={14} color="#ffc107" />
              <select
                value={selectedSede}
                onChange={(e) => {
                  setSelectedSede(e.target.value);
                  setSelectedEquipo('TODOS');
                }}
                className="nodus-select"
              >
                <option value="TODAS">Todas las Sedes</option>
                {sedesList.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="nodus-select-item">
              <Layers size={14} color="#38bdf8" />
              <select
                value={selectedEquipo}
                onChange={(e) => setSelectedEquipo(e.target.value)}
                className="nodus-select"
                style={{ maxWidth: '140px' }}
              >
                <option value="TODOS">Todos Equipos</option>
                {equiposList.map(eq => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>
            </div>

            <div className="nodus-select-item">
              <Award size={14} color="#a855f7" />
              <select
                value={selectedEntrenamiento}
                onChange={(e) => setSelectedEntrenamiento(e.target.value)}
                className="nodus-select"
              >
                <option value="TODOS">C1 y C2</option>
                <option value="C1">Solo Capítulo 1</option>
                <option value="C2">Solo Capítulo 2</option>
              </select>
            </div>

            <div className="nodus-select-item">
              <Calendar size={14} color="#10b981" />
              <select
                value={selectedCiclo}
                onChange={(e) => setSelectedCiclo(e.target.value)}
                className="nodus-select"
              >
                <option value="TODOS">Todos Ciclos</option>
                <option value="Ciclo 1">Ciclo 1</option>
                <option value="Ciclo 2">Ciclo 2</option>
              </select>
            </div>

            <div className="nodus-select-item">
              <ArrowUpDown size={14} color="#ffc107" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="nodus-select"
              >
                <option value="gestiones">Más Gestiones</option>
                <option value="confirmados">Más Confirmados</option>
                <option value="cobertura">Mayor Cobertura %</option>
                <option value="productividad">Mayor Productividad %</option>
                <option value="nombre">Alfabético</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. SECCIÓN DE GRÁFICOS */}
      <div className="nodus-charts-section">
        <div className="nodus-charts-header">
          <div className="nodus-chart-tabs">
            <button
              onClick={() => setActiveChartTab('coordinadores')}
              className={`nodus-chart-tab-btn ${activeChartTab === 'coordinadores' ? 'active-tab' : ''}`}
            >
              <BarChart2 size={16} />
              <span>Rendimiento por Colaborador</span>
            </button>

            <button
              onClick={() => setActiveChartTab('sedes')}
              className={`nodus-chart-tab-btn ${activeChartTab === 'sedes' ? 'active-tab' : ''}`}
            >
              <Building2 size={16} />
              <span>Comparativo de Sedes</span>
            </button>

            <button
              onClick={() => setActiveChartTab('estados')}
              className={`nodus-chart-tab-btn ${activeChartTab === 'estados' ? 'active-tab' : ''}`}
            >
              <PieChartIcon size={16} />
              <span>Distribución de Contacto</span>
            </button>
          </div>

          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Mostrando {filteredCoordinadores.length} coordinadores
          </div>
        </div>

        <div className="nodus-chart-viewport">
          {activeChartTab === 'coordinadores' && (
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={chartCoordinadoresData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} angle={-25} textAnchor="end" height={50} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a192f', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  itemStyle={{ padding: '2px 0' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="gestiones" name="Gestiones Totales" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="confirmados" name="Confirmados" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="c1" name="Capítulo 1" fill="#eab308" radius={[4, 4, 0, 0]} />
                <Bar dataKey="c2" name="Capítulo 2" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeChartTab === 'sedes' && (
            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart data={chartSedesData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="sede" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a192f', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="gestiones" name="Gestiones Realizadas" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="confirmados" name="Confirmados" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Line type="monotone" dataKey="asignados" name="Participantes Asignados" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {activeChartTab === 'estados' && (
            <div className="nodus-pie-wrapper">
              <div className="nodus-pie-chart-box">
                <ResponsiveContainer width="100%" height={340}>
                  <PieChart>
                    <Pie
                      data={chartEstadosData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {chartEstadosData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0a192f', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="nodus-pie-legend-box">
                {chartEstadosData.map((e, idx) => (
                  <div key={idx} className="nodus-legend-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: e.color }} />
                      <span style={{ color: '#cbd5e1', fontWeight: 500 }}>{e.name}</span>
                    </div>
                    <span style={{ fontWeight: 800, color: '#ffffff' }}>{e.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. TABLA PRINCIPAL DE COORDINADORES CON DESGLOSE POR EQUIPO */}
      <div className="nodus-table-container">
        <div className="nodus-table-header">
          <div className="nodus-table-title">
            <Users size={18} color="#ffc107" />
            <span>Detalle Puntual por Colaborador y Equipos Asignados</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            {filteredCoordinadores.length} coordinadores encontrados
          </span>
        </div>

        <div className="nodus-table-scroll">
          <table className="nodus-table">
            <thead>
              <tr>
                <th className="nodus-th">Colaborador / Coordinador</th>
                <th className="nodus-th">Sede & Ciclo</th>
                <th className="nodus-th" style={{ textAlign: 'right' }}>Gestiones</th>
                <th className="nodus-th" style={{ textAlign: 'right' }}>C1 / C2</th>
                <th className="nodus-th" style={{ textAlign: 'right' }}>Asignados</th>
                <th className="nodus-th" style={{ textAlign: 'center' }}>Cobertura</th>
                <th className="nodus-th" style={{ textAlign: 'center' }}>Productividad</th>
                <th className="nodus-th" style={{ textAlign: 'right' }}>Confirmados</th>
                <th className="nodus-th" style={{ textAlign: 'right' }}>Asistieron</th>
                <th className="nodus-th" style={{ textAlign: 'center' }}>Última Gestión</th>
                <th className="nodus-th" style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoordinadores.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
                    No se encontraron coordinadores con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredCoordinadores.map((coord) => {
                  const isExpanded = !!expandedRows[coord.id];
                  const hasEquipos = (coord.equipos || []).length > 0;

                  return (
                    <React.Fragment key={coord.id}>
                      <tr className={`nodus-tr ${isExpanded ? 'expanded-row' : ''}`}>
                        {/* Colaborador */}
                        <td className="nodus-td">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div className="nodus-coord-avatar">
                              {coord.nombre.slice(0, 2)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                {coord.nombre}
                                {coord.c2 > 0 && (
                                  <span className="nodus-badge-c1c2">C1+C2</span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                                {coord.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Sede & Ciclo */}
                        <td className="nodus-td">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#f1f5f9', fontWeight: 600 }}>
                              <MapPin size={13} color="#ffc107" />
                              {coord.sede}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              {coord.ciclo}
                            </span>
                          </div>
                        </td>

                        {/* Gestiones */}
                        <td className="nodus-td" style={{ textAlign: 'right', fontWeight: 800, color: '#38bdf8', fontSize: '0.95rem' }}>
                          {coord.gestiones.toLocaleString()}
                        </td>

                        {/* C1 / C2 */}
                        <td className="nodus-td" style={{ textAlign: 'right' }}>
                          <span style={{ color: '#ffc107', fontWeight: 700 }}>{coord.c1}</span>
                          <span style={{ color: '#64748b', margin: '0 0.3rem' }}>/</span>
                          <span style={{ color: '#a78bfa', fontWeight: 700 }}>{coord.c2}</span>
                        </td>

                        {/* Asignados */}
                        <td className="nodus-td" style={{ textAlign: 'right', color: '#cbd5e1', fontWeight: 600 }}>
                          {coord.asignados.toLocaleString()}
                        </td>

                        {/* Cobertura */}
                        <td className="nodus-td" style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ fontWeight: 800, color: '#ffc107' }}>{coord.coberturaPct}%</span>
                            <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${coord.coberturaPct}%`, height: '100%', background: '#ffc107', borderRadius: '2px' }} />
                            </div>
                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{coord.coberturaDetalle?.split(' ')[0]}</span>
                          </div>
                        </td>

                        {/* Productividad */}
                        <td className="nodus-td" style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ fontWeight: 800, color: '#14b8a6' }}>{coord.productividadPct}%</span>
                            <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${coord.productividadPct}%`, height: '100%', background: '#14b8a6', borderRadius: '2px' }} />
                            </div>
                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{coord.productividadDetalle?.split(' ')[0]}</span>
                          </div>
                        </td>

                        {/* Confirmados */}
                        <td className="nodus-td" style={{ textAlign: 'right' }}>
                          <span className="nodus-badge-confirmados">
                            {coord.estados?.confirmado || 0}
                          </span>
                        </td>

                        {/* Asistieron */}
                        <td className="nodus-td" style={{ textAlign: 'right' }}>
                          <span className="nodus-badge-asistieron">
                            {coord.asistieron || 0}
                          </span>
                        </td>

                        {/* Última Gestión */}
                        <td className="nodus-td" style={{ textAlign: 'center', fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                          {coord.ultGestion || coord.ultConexion || 'N/D'}
                        </td>

                        {/* Acciones */}
                        <td className="nodus-td" style={{ textAlign: 'center' }}>
                          {hasEquipos ? (
                            <button
                              onClick={() => toggleRow(coord.id)}
                              className={`nodus-btn-expand ${isExpanded ? 'expanded' : ''}`}
                            >
                              <span>Equipos ({coord.equipos.length})</span>
                              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' }}>Sin equipos</span>
                          )}
                        </td>
                      </tr>

                      {/* SUBTABLA ANIDADA */}
                      {isExpanded && hasEquipos && (
                        <tr>
                          <td colSpan={11} style={{ padding: '0.75rem 1.5rem', background: 'rgba(10, 25, 47, 0.98)' }}>
                            <div className="nodus-nested-panel">
                              <div className="nodus-nested-header">
                                <h4 className="nodus-nested-title">
                                  <Layers size={14} />
                                  <span>Desglose por Equipo — {coord.nombre} ({coord.sede})</span>
                                </h4>
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                  {coord.equipos.length} equipos gestionados
                                </span>
                              </div>

                              <div style={{ overflowX: 'auto' }}>
                                <table className="nodus-nested-table">
                                  <thead>
                                    <tr>
                                      <th className="nodus-nested-th">Equipo</th>
                                      <th className="nodus-nested-th" style={{ textAlign: 'right' }}>Llamadas</th>
                                      <th className="nodus-nested-th" style={{ textAlign: 'right' }}>Confirmado</th>
                                      <th className="nodus-nested-th" style={{ textAlign: 'right' }}>No Contesta</th>
                                      <th className="nodus-nested-th" style={{ textAlign: 'right' }}>Por Confirmar</th>
                                      <th className="nodus-nested-th" style={{ textAlign: 'right' }}>Siguiente</th>
                                      <th className="nodus-nested-th" style={{ textAlign: 'right' }}>Asistieron</th>
                                      <th className="nodus-nested-th" style={{ textAlign: 'center' }}>Tasa Asistencia</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {coord.equipos.map((eq, eqIdx) => {
                                      const tasaAsist = eq.confirmado > 0 ? Math.round((eq.asistieron / eq.confirmado) * 100) : 0;
                                      return (
                                        <tr key={eqIdx} style={{ transition: 'background 0.15s ease' }}>
                                          <td className="nodus-nested-td" style={{ fontWeight: 700, color: '#ffffff' }}>
                                            {eq.equipo}
                                          </td>
                                          <td className="nodus-nested-td" style={{ textAlign: 'right', color: '#38bdf8', fontWeight: 600 }}>
                                            {eq.llamadas}
                                          </td>
                                          <td className="nodus-nested-td" style={{ textAlign: 'right', color: '#10b981', fontWeight: 700 }}>
                                            {eq.confirmado}
                                          </td>
                                          <td className="nodus-nested-td" style={{ textAlign: 'right', color: '#94a3b8' }}>
                                            {eq.noContesta}
                                          </td>
                                          <td className="nodus-nested-td" style={{ textAlign: 'right', color: '#fbbf24' }}>
                                            {eq.porConfirmar}
                                          </td>
                                          <td className="nodus-nested-td" style={{ textAlign: 'right', color: '#60a5fa' }}>
                                            {eq.siguiente}
                                          </td>
                                          <td className="nodus-nested-td" style={{ textAlign: 'right', color: '#38bdf8', fontWeight: 700 }}>
                                            {eq.asistieron}
                                          </td>
                                          <td className="nodus-nested-td" style={{ textAlign: 'center' }}>
                                            <span style={{
                                              padding: '0.15rem 0.5rem',
                                              borderRadius: '6px',
                                              fontSize: '0.72rem',
                                              fontWeight: 700,
                                              background: tasaAsist >= 80 ? 'rgba(16, 185, 129, 0.2)' : tasaAsist >= 50 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                                              color: tasaAsist >= 80 ? '#10b981' : tasaAsist >= 50 ? '#f59e0b' : '#94a3b8',
                                              border: `1px solid ${tasaAsist >= 80 ? 'rgba(16, 185, 129, 0.4)' : tasaAsist >= 50 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`
                                            }}>
                                              {tasaAsist}%
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
