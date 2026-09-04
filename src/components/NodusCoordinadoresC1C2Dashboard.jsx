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
      <div className="flex flex-col items-center justify-center p-16 space-y-4 bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-300">
        <RefreshCw className="w-10 h-10 text-amber-500 animate-spin" />
        <p className="text-base font-semibold">Cargando datos ejecutivos de Coordinadores C1 & C2...</p>
        <p className="text-xs text-slate-500">Conectando con el enjambre de agentes autónomos Nodus</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER SUPERIOR: ESTADO EN VIVO & SINCRONIZACIÓN */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-800 border border-amber-500/30 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl shadow-inner">
              <Award className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Panel de Coordinadores C1 & C2
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                  Nodus Live Global
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Auditoría horaria multi-agente de gestiones, llamadas, confirmaciones y cobertura en tiempo real
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start lg:self-center">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-300">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>Sincronizado: <strong className="text-emerald-400">{timeSinceSync}</strong></span>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
            title="Refrescar datos en vivo"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Actualizando...' : 'Refrescar'}</span>
          </button>
        </div>
      </div>

      {/* SCORECARDS EJECUTIVAS DE ALTO IMPACTO */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 rounded-2xl shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Coordinadores</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">{aggregatedStats.coordinadoresCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">En {selectedSede === 'TODAS' ? '6 Sedes' : selectedSede}</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 hover:border-sky-500/40 rounded-2xl shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Gestiones Totales</span>
            <PhoneCall className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white">{aggregatedStats.totalGestiones.toLocaleString()}</div>
          <div className="text-[11px] text-sky-400/80 mt-1">Llamadas realizadas</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 hover:border-violet-500/40 rounded-2xl shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Asignados</span>
            <Building2 className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-black text-white">{aggregatedStats.totalAsignados.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1">Participantes meta</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 rounded-2xl shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Confirmados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{aggregatedStats.totalConfirmados.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-400/80 mt-1">{aggregatedStats.tasaEfectividad}% efectividad</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 rounded-2xl shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Cobertura Media</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">{aggregatedStats.coberturaProm}%</div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${aggregatedStats.coberturaProm}%` }} />
          </div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 hover:border-teal-500/40 rounded-2xl shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Productividad Media</span>
            <UserCheck className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-white">{aggregatedStats.productividadProm}%</div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-teal-500 h-full rounded-full transition-all" style={{ width: `${aggregatedStats.productividadProm}%` }} />
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS MULTIDIMENSIONALES */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-md space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Input de Búsqueda */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar colaborador, sede o equipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Selectores de Filtros */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Sede */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <select
                value={selectedSede}
                onChange={(e) => {
                  setSelectedSede(e.target.value);
                  setSelectedEquipo('TODOS');
                }}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="TODAS" className="bg-slate-900">Todas las Sedes</option>
                {sedesList.map(s => (
                  <option key={s} value={s} className="bg-slate-900">{s}</option>
                ))}
              </select>
            </div>

            {/* Equipo */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <select
                value={selectedEquipo}
                onChange={(e) => setSelectedEquipo(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer max-w-[130px] truncate"
              >
                <option value="TODOS" className="bg-slate-900">Todos Equipos</option>
                {equiposList.map(eq => (
                  <option key={eq} value={eq} className="bg-slate-900">{eq}</option>
                ))}
              </select>
            </div>

            {/* Entrenamiento */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700">
              <Award className="w-3.5 h-3.5 text-violet-400" />
              <select
                value={selectedEntrenamiento}
                onChange={(e) => setSelectedEntrenamiento(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="TODOS" className="bg-slate-900">C1 y C2</option>
                <option value="C1" className="bg-slate-900">Solo Capítulo 1</option>
                <option value="C2" className="bg-slate-900">Solo Capítulo 2</option>
              </select>
            </div>

            {/* Ciclo */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <select
                value={selectedCiclo}
                onChange={(e) => setSelectedCiclo(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="TODOS" className="bg-slate-900">Todos Ciclos</option>
                <option value="Ciclo 1" className="bg-slate-900">Ciclo 1</option>
                <option value="Ciclo 2" className="bg-slate-900">Ciclo 2</option>
              </select>
            </div>

            {/* Ordenamiento */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700">
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="gestiones" className="bg-slate-900">Más Gestiones</option>
                <option value="confirmados" className="bg-slate-900">Más Confirmados</option>
                <option value="cobertura" className="bg-slate-900">Mayor Cobertura %</option>
                <option value="productividad" className="bg-slate-900">Mayor Productividad %</option>
                <option value="nombre" className="bg-slate-900">Alfabético</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE GRÁFICOS DE ALTO RENDIMIENTO */}
      <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        {/* Selector de Pestaña de Gráfico */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveChartTab('coordinadores')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeChartTab === 'coordinadores'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Rendimiento por Colaborador</span>
            </button>

            <button
              onClick={() => setActiveChartTab('sedes')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeChartTab === 'sedes'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Comparativo de Sedes</span>
            </button>

            <button
              onClick={() => setActiveChartTab('estados')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeChartTab === 'estados'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <PieChartIcon className="w-4 h-4" />
              <span>Distribución de Contacto</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 hidden sm:block">
            Mostrando {filteredCoordinadores.length} coordinadores
          </div>
        </div>

        {/* CONTENEDOR DE GRÁFICO SEGÚN TAB ACTIVA */}
        <div className="h-[340px] w-full pt-2">
          {activeChartTab === 'coordinadores' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartCoordinadoresData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} angle={-25} textAnchor="end" height={50} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
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
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartSedesData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="sede" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="gestiones" name="Gestiones Realizadas" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="confirmados" name="Confirmados" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Line type="monotone" dataKey="asignados" name="Participantes Asignados" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {activeChartTab === 'estados' && (
            <div className="flex flex-col sm:flex-row items-center justify-around h-full">
              <div className="h-[280px] w-full sm:w-[60%]">
                <ResponsiveContainer width="100%" height="100%">
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
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-1 gap-2.5 w-full sm:w-[35%] px-4">
                {chartEstadosData.map((e, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: e.color }} />
                      <span className="text-slate-300 font-medium">{e.name}</span>
                    </div>
                    <span className="font-bold text-white">{e.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TABLA PRINCIPAL DE COORDINADORES CON DESGLOSE POR EQUIPO */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              Detalle Puntual por Colaborador y Equipos Asignados
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {filteredCoordinadores.length} coordinadores encontrados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">Colaborador / Coordinador</th>
                <th className="py-3 px-3">Sede & Ciclo</th>
                <th className="py-3 px-3 text-right">Gestiones</th>
                <th className="py-3 px-3 text-right">C1 / C2</th>
                <th className="py-3 px-3 text-right">Asignados</th>
                <th className="py-3 px-3 text-center">Cobertura</th>
                <th className="py-3 px-3 text-center">Productividad</th>
                <th className="py-3 px-3 text-right">Confirmados</th>
                <th className="py-3 px-3 text-right">Asistieron</th>
                <th className="py-3 px-3 text-center">Última Gestión</th>
                <th className="py-3 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filteredCoordinadores.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-500">
                    No se encontraron coordinadores con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredCoordinadores.map((coord) => {
                  const isExpanded = !!expandedRows[coord.id];
                  const hasEquipos = (coord.equipos || []).length > 0;

                  return (
                    <React.Fragment key={coord.id}>
                      <tr className={`hover:bg-slate-800/50 transition-colors ${isExpanded ? 'bg-slate-800/40' : ''}`}>
                        {/* Nombre y datos oficiales */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs uppercase shadow-sm">
                              {coord.nombre.slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                {coord.nombre}
                                {coord.c2 > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                    C1+C2
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono truncate max-w-[170px]">
                                {coord.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Sede & Ciclo */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-200">
                              <MapPin className="w-3 h-3 text-amber-400" />
                              {coord.sede}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {coord.ciclo}
                            </span>
                          </div>
                        </td>

                        {/* Gestiones */}
                        <td className="py-3.5 px-3 text-right font-black text-sky-400 text-sm">
                          {coord.gestiones.toLocaleString()}
                        </td>

                        {/* C1 / C2 */}
                        <td className="py-3.5 px-3 text-right">
                          <div className="text-[11px]">
                            <span className="text-amber-400 font-semibold">{coord.c1}</span>
                            <span className="text-slate-500 mx-1">/</span>
                            <span className="text-violet-400 font-semibold">{coord.c2}</span>
                          </div>
                        </td>

                        {/* Asignados */}
                        <td className="py-3.5 px-3 text-right text-slate-300 font-medium">
                          {coord.asignados.toLocaleString()}
                        </td>

                        {/* Cobertura % */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-amber-400">{coord.coberturaPct}%</span>
                            <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${coord.coberturaPct}%` }} />
                            </div>
                            <span className="text-[9px] text-slate-500">{coord.coberturaDetalle?.split(' ')[0]}</span>
                          </div>
                        </td>

                        {/* Productividad % */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-teal-400">{coord.productividadPct}%</span>
                            <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-teal-500 h-full rounded-full" style={{ width: `${coord.productividadPct}%` }} />
                            </div>
                            <span className="text-[9px] text-slate-500">{coord.productividadDetalle?.split(' ')[0]}</span>
                          </div>
                        </td>

                        {/* Confirmados */}
                        <td className="py-3.5 px-3 text-right">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                            {coord.estados?.confirmado || 0}
                          </span>
                        </td>

                        {/* Asistieron */}
                        <td className="py-3.5 px-3 text-right">
                          <span className="px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 font-bold">
                            {coord.asistieron || 0}
                          </span>
                        </td>

                        {/* Última Gestión */}
                        <td className="py-3.5 px-3 text-center text-[10px] text-slate-400 font-mono">
                          {coord.ultGestion || coord.ultConexion || 'N/D'}
                        </td>

                        {/* Acciones */}
                        <td className="py-3.5 px-3 text-center">
                          {hasEquipos ? (
                            <button
                              onClick={() => toggleRow(coord.id)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                                isExpanded
                                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                                  : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              <span>Equipos ({coord.equipos.length})</span>
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Sin tabla</span>
                          )}
                        </td>
                      </tr>

                      {/* FILA EXPANDIBLE: DESGLOSE DE EQUIPOS DE ESTE COORDINADOR */}
                      {isExpanded && hasEquipos && (
                        <tr className="bg-slate-950/80">
                          <td colSpan={11} className="p-4 pl-12">
                            <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-3 shadow-inner">
                              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2">
                                  <Layers className="w-3.5 h-3.5" />
                                  Desglose por Equipo — {coord.nombre} ({coord.sede})
                                </h4>
                                <span className="text-[10px] text-slate-400">
                                  {coord.equipos.length} equipos gestionados
                                </span>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-[11px]">
                                  <thead className="text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                                    <tr>
                                      <th className="py-1.5 px-3">Equipo</th>
                                      <th className="py-1.5 px-3 text-right">Llamadas</th>
                                      <th className="py-1.5 px-3 text-right">Confirmado</th>
                                      <th className="py-1.5 px-3 text-right">No Contesta</th>
                                      <th className="py-1.5 px-3 text-right">Por Confirmar</th>
                                      <th className="py-1.5 px-3 text-right">Siguiente</th>
                                      <th className="py-1.5 px-3 text-right">Asistieron</th>
                                      <th className="py-1.5 px-3 text-center">Tasa Asistencia</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                    {coord.equipos.map((eq, eqIdx) => {
                                      const tasaAsist = eq.confirmado > 0 ? Math.round((eq.asistieron / eq.confirmado) * 100) : 0;
                                      return (
                                        <tr key={eqIdx} className="hover:bg-slate-800/40">
                                          <td className="py-1.5 px-3 font-semibold text-white">
                                            {eq.equipo}
                                          </td>
                                          <td className="py-1.5 px-3 text-right font-medium text-sky-400">
                                            {eq.llamadas}
                                          </td>
                                          <td className="py-1.5 px-3 text-right font-bold text-emerald-400">
                                            {eq.confirmado}
                                          </td>
                                          <td className="py-1.5 px-3 text-right text-slate-400">
                                            {eq.noContesta}
                                          </td>
                                          <td className="py-1.5 px-3 text-right text-amber-400">
                                            {eq.porConfirmar}
                                          </td>
                                          <td className="py-1.5 px-3 text-right text-blue-400">
                                            {eq.siguiente}
                                          </td>
                                          <td className="py-1.5 px-3 text-right font-bold text-sky-300">
                                            {eq.asistieron}
                                          </td>
                                          <td className="py-1.5 px-3 text-center">
                                            <span className={`px-1.5 py-0.2 rounded font-semibold text-[10px] ${
                                              tasaAsist >= 80 ? 'bg-emerald-500/20 text-emerald-300' :
                                              tasaAsist >= 50 ? 'bg-amber-500/20 text-amber-300' :
                                              'bg-slate-800 text-slate-400'
                                            }`}>
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
