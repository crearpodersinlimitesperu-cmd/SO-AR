import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import {
  Users, PhoneCall, CheckCircle2, AlertCircle, Clock, Search, Filter,
  RefreshCw, BarChart2, PieChart as PieChartIcon, TrendingUp, ChevronDown,
  ChevronRight, Award, MapPin, Building2, Layers, UserCheck, PhoneOff,
  Calendar, Eye, ArrowUpDown, Download, CheckCircle, X
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  Legend, CartesianGrid, Cell, PieChart, Pie, ComposedChart, Line
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import ThemeSelector from './ThemeSelector';
import nodusFallbackData from '../data/nodusFallbackData.json';
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
  const { activeTheme } = useTheme();
  const isLight = activeTheme === 'light';

  const gridStroke = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
  const axisStroke = isLight ? '#64748b' : '#94a3b8';
  const chartTooltipStyle = useMemo(() => ({
    backgroundColor: isLight ? '#ffffff' : '#0a192f',
    borderColor: isLight ? 'rgba(15, 23, 42, 0.15)' : '#334155',
    borderRadius: '12px',
    color: isLight ? '#0f172a' : '#ffffff',
    boxShadow: isLight ? '0 10px 25px rgba(0,0,0,0.1)' : '0 10px 30px rgba(0,0,0,0.6)',
    fontSize: '12px'
  }), [isLight]);
  const chartItemStyle = useMemo(() => ({
    color: isLight ? '#0f172a' : '#ffffff',
    padding: '2px 0'
  }), [isLight]);

  // Tooltip Glassmorphic personalizado para el gráfico de coordinadores
  const CustomCoordTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="nodus-chart-custom-tooltip">
          <div className="nodus-tooltip-header">
            <span className="nodus-tooltip-title">{item.fullName || label}</span>
            <span className="nodus-tooltip-badge">{item.sede}</span>
          </div>
          <div className="nodus-tooltip-body">
            <div className="nodus-tooltip-row highlight-gold">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="nodus-tooltip-dot gold" />
                <span>Sentados C1:</span>
              </div>
              <span className="nodus-tooltip-val">{item.sentadosC1?.toLocaleString() || 0}</span>
            </div>
            <div className="nodus-tooltip-row highlight-purple">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="nodus-tooltip-dot purple" />
                <span>Sentados C2:</span>
              </div>
              <span className="nodus-tooltip-val">{item.sentadosC2?.toLocaleString() || 0}</span>
            </div>
            <div className="nodus-tooltip-row highlight-emerald">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="nodus-tooltip-dot emerald" />
                <span>Total Sentados:</span>
              </div>
              <span className="nodus-tooltip-val bold">{item.totalSentados?.toLocaleString() || 0}</span>
            </div>
            <div className="nodus-tooltip-divider" />
            <div className="nodus-tooltip-row">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="nodus-tooltip-dot sky" />
                <span>Gestiones Totales:</span>
              </div>
              <span className="nodus-tooltip-val">{item.gestiones?.toLocaleString() || 0}</span>
            </div>
            <div className="nodus-tooltip-row">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="nodus-tooltip-dot green" />
                <span>Confirmados:</span>
              </div>
              <span className="nodus-tooltip-val">{item.confirmados?.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const [data, setData] = useState(nodusFallbackData || null);
  const [loading, setLoading] = useState(!nodusFallbackData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSede, setSelectedSede] = useState('TODAS');
  const [selectedEquipo, setSelectedEquipo] = useState('TODOS');
  const [selectedEntrenamiento, setSelectedEntrenamiento] = useState('TODOS'); // TODOS, C1, C2
  const [selectedCiclo, setSelectedCiclo] = useState('TODOS');
  const [sortBy, setSortBy] = useState('sentados'); // sentados, sentadosC1, sentadosC2, gestiones, cobertura, productividad, confirmados, nombre
  const [activeChartTab, setActiveChartTab] = useState('coordinadores'); // coordinadores, sedes, estados
  const [chartMetric, setChartMetric] = useState('sentados'); // 'sentados' (C1 vs C2), 'gestiones' (Llamadas), 'integral' (Doble eje)

  // Filas expandidas (para ver desglose de equipos)
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (coordId) => {
    setExpandedRows(prev => ({
      ...prev,
      [coordId]: !prev[coordId]
    }));
  };

  const hasActiveFilters = Boolean(
    selectedSede !== 'TODAS' ||
    selectedEquipo !== 'TODOS' ||
    selectedEntrenamiento !== 'TODOS' ||
    selectedCiclo !== 'TODOS' ||
    searchTerm.trim() !== ''
  );

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedSede('TODAS');
    setSelectedEquipo('TODOS');
    setSelectedEntrenamiento('TODOS');
    setSelectedCiclo('TODOS');
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
        console.warn("Realtime listener usando snapshot de respaldo:", err.message);
        setData(prev => prev || nodusFallbackData);
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

  // 1. Filtrado de seguridad estricto: Única y exclusivamente coordinadores operativos de C1 y C2
  // Se excluyen departamentos (contabilidad, facturación, entrenadores, soporte, admin) y usuarios sin llamadas/equipos en C1 o C2
  const c1c2Coordinadores = useMemo(() => {
    if (!data?.coordinadores) return [];
    return data.coordinadores.filter(c => {
      if (!c) return false;
      const name = (c.nombre || '').toLowerCase().trim();
      const email = (c.email || '').toLowerCase().trim();

      // Excluir cuentas departamentales, finanzas, entrenadores, administrativas o soporte
      if (name.includes('contab') || email.includes('contab')) return false;
      if (name.includes('entrena') || email.includes('entrena')) return false;
      if (name.includes('admin') || email.includes('admin')) return false;
      if (name.includes('soporte') || email.includes('soporte')) return false;
      if (name.includes('factura') || email.includes('factura')) return false;

      // Debe ser un coordinador de C1 o C2 con llamadas reales o equipos asignados
      const hasC1C2Calls = (Number(c.c1) > 0 || Number(c.c2) > 0 || Number(c.gestiones) > 0);
      const hasEquipos = Array.isArray(c.equipos) && c.equipos.length > 0;

      return hasC1C2Calls && hasEquipos;
    }).map(c => {
      let sentadosC1 = c.sentadosC1;
      let sentadosC2 = c.sentadosC2;
      let gestionesC1 = c.gestionesC1;
      let gestionesC2 = c.gestionesC2;
      let confirmadosC1 = c.confirmadosC1;
      let confirmadosC2 = c.confirmadosC2;

      // Cálculo resiliente en caliente si faltasen campos precalculados
      if (sentadosC1 === undefined || sentadosC2 === undefined) {
        let sc1 = 0, sc2 = 0, gc1 = 0, gc2 = 0, cc1 = 0, cc2 = 0;
        (c.equipos || []).forEach(eq => {
          const num = parseInt(eq.equipo.replace(/[^0-9]/g, '')) || 0;
          const isC2 = num >= 100;
          if (isC2) {
            sc2 += (eq.asistieron || 0);
            gc2 += (eq.llamadas || 0);
            cc2 += (eq.confirmado || 0);
          } else {
            sc1 += (eq.asistieron || 0);
            gc1 += (eq.llamadas || 0);
            cc1 += (eq.confirmado || 0);
          }
        });
        sentadosC1 = sc1;
        sentadosC2 = sc2;
        gestionesC1 = (gc1 + gc2 > 0) ? gc1 : (c.c1 || 0);
        gestionesC2 = (gc1 + gc2 > 0) ? gc2 : (c.c2 || 0);
        confirmadosC1 = cc1;
        confirmadosC2 = cc2;
      }

      const totalSentados = c.asistieron || (sentadosC1 + sentadosC2);
      const totalGestiones = c.gestiones || (gestionesC1 + gestionesC2);
      const totalConfirmados = c.estados?.confirmado || (confirmadosC1 + confirmadosC2);

      return {
        ...c,
        sentadosC1: sentadosC1 || 0,
        sentadosC2: sentadosC2 || 0,
        sentadosTotal: totalSentados || 0,
        gestionesC1: gestionesC1 || 0,
        gestionesC2: gestionesC2 || 0,
        gestionesTotal: totalGestiones || 0,
        confirmadosC1: confirmadosC1 || 0,
        confirmadosC2: confirmadosC2 || 0,
        confirmadosTotal: totalConfirmados || 0
      };
    });
  }, [data]);

  // Lista única de sedes (basada exclusivamente en coordinadores C1 y C2)
  const sedesList = useMemo(() => {
    const set = new Set(c1c2Coordinadores.map(c => c.sede).filter(Boolean));
    return Array.from(set).sort();
  }, [c1c2Coordinadores]);

  // Lista única de equipos disponibles según la sede seleccionada
  const equiposList = useMemo(() => {
    let coords = c1c2Coordinadores;
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
  }, [c1c2Coordinadores, selectedSede]);

  // Filtrado exhaustivo y contextual de coordinadores C1 & C2
  const filteredCoordinadores = useMemo(() => {
    if (!c1c2Coordinadores.length) return [];

    const result = [];

    for (const c of c1c2Coordinadores) {
      // 1. Filtro Sede
      if (selectedSede !== 'TODAS' && c.sede !== selectedSede) continue;

      // 2. Filtro Ciclo
      if (selectedCiclo !== 'TODOS' && c.ciclo !== selectedCiclo) continue;

      // 3. Filtro Entrenamiento (C1 / C2) - Muestra quienes tengan sentados o llamadas en ese capítulo
      if (selectedEntrenamiento === 'C1' && (c.sentadosC1 === 0 && c.gestionesC1 === 0)) continue;
      if (selectedEntrenamiento === 'C2' && (c.sentadosC2 === 0 && c.gestionesC2 === 0)) continue;

      // 4. Filtro por Equipo
      let matchingEquipos = c.equipos || [];
      if (selectedEquipo !== 'TODOS') {
        matchingEquipos = matchingEquipos.filter(eq => eq.equipo === selectedEquipo);
        if (matchingEquipos.length === 0) continue;
      }

      // 5. Búsqueda por texto (nombre, email, sede, o equipo)
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const matchCoord = (c.nombre || '').toLowerCase().includes(term) ||
                           (c.nombreCompleto || '').toLowerCase().includes(term) ||
                           (c.email || '').toLowerCase().includes(term) ||
                           (c.sede || '').toLowerCase().includes(term);
        const eqMatches = matchingEquipos.filter(eq => (eq.equipo || '').toLowerCase().includes(term));

        if (!matchCoord && eqMatches.length === 0) continue;

        // Si la búsqueda coincidió específicamente con un equipo, mostramos solo esos equipos en el desglose
        if (!matchCoord && eqMatches.length > 0) {
          matchingEquipos = eqMatches;
        }
      }

      // 6. Cómputo de métricas exactas según el filtro aplicado
      const isEquipoFiltered = selectedEquipo !== 'TODOS' || (searchTerm && matchingEquipos.length < (c.equipos || []).length);
      
      let dispGestiones = c.gestionesTotal;
      let dispConfirmados = c.confirmadosTotal;
      let dispNoContesta = c.estados?.noContesta || 0;
      let dispPorConfirmar = c.estados?.porConfirmar || 0;
      let dispSiguiente = c.estados?.siguiente || 0;
      let dispNoInteresa = c.estados?.noInteresa || 0;
      let dispAsistieron = c.sentadosTotal;
      let dispAsignados = c.asignados;
      let dispSentadosC1 = c.sentadosC1;
      let dispSentadosC2 = c.sentadosC2;
      let dispGestionesC1 = c.gestionesC1;
      let dispGestionesC2 = c.gestionesC2;

      if (isEquipoFiltered) {
        dispGestiones = matchingEquipos.reduce((s, e) => s + (e.llamadas || 0), 0);
        dispConfirmados = matchingEquipos.reduce((s, e) => s + (e.confirmado || 0), 0);
        dispNoContesta = matchingEquipos.reduce((s, e) => s + (e.noContesta || 0), 0);
        dispPorConfirmar = matchingEquipos.reduce((s, e) => s + (e.porConfirmar || 0), 0);
        dispSiguiente = matchingEquipos.reduce((s, e) => s + (e.siguiente || 0), 0);
        dispNoInteresa = matchingEquipos.reduce((s, e) => s + (e.noInteresa || 0), 0);
        dispAsistieron = matchingEquipos.reduce((s, e) => s + (e.asistieron || 0), 0);
        dispAsignados = dispGestiones;
        dispSentadosC1 = matchingEquipos.filter(e => (parseInt(e.equipo.replace(/[^0-9]/g, '')) || 0) < 100).reduce((s, e) => s + (e.asistieron || 0), 0);
        dispSentadosC2 = matchingEquipos.filter(e => (parseInt(e.equipo.replace(/[^0-9]/g, '')) || 0) >= 100).reduce((s, e) => s + (e.asistieron || 0), 0);
        dispGestionesC1 = matchingEquipos.filter(e => (parseInt(e.equipo.replace(/[^0-9]/g, '')) || 0) < 100).reduce((s, e) => s + (e.llamadas || 0), 0);
        dispGestionesC2 = matchingEquipos.filter(e => (parseInt(e.equipo.replace(/[^0-9]/g, '')) || 0) >= 100).reduce((s, e) => s + (e.llamadas || 0), 0);
      } else if (selectedEntrenamiento === 'C1') {
        dispGestiones = c.gestionesC1;
        dispConfirmados = c.confirmadosC1;
        dispAsistieron = c.sentadosC1;
      } else if (selectedEntrenamiento === 'C2') {
        dispGestiones = c.gestionesC2;
        dispConfirmados = c.confirmadosC2;
        dispAsistieron = c.sentadosC2;
      }

      const coberturaPct = dispAsignados > 0 && isEquipoFiltered
        ? Math.min(100, Math.round((dispGestiones / dispAsignados) * 100))
        : c.coberturaPct;

      const productividadPct = dispGestiones > 0 && isEquipoFiltered
        ? Math.round((dispAsistieron / dispGestiones) * 100)
        : c.productividadPct;

      result.push({
        ...c,
        visibleEquipos: matchingEquipos,
        isSpecificFilter: isEquipoFiltered || selectedEntrenamiento !== 'TODOS',
        displayStats: {
          gestiones: dispGestiones,
          gestionesC1: dispGestionesC1,
          gestionesC2: dispGestionesC2,
          confirmados: dispConfirmados,
          noContesta: dispNoContesta,
          porConfirmar: dispPorConfirmar,
          siguiente: dispSiguiente,
          noInteresa: dispNoInteresa,
          asistieron: dispAsistieron,
          sentadosC1: dispSentadosC1,
          sentadosC2: dispSentadosC2,
          asignados: dispAsignados,
          coberturaPct,
          productividadPct
        }
      });
    }

    // Ordenamiento
    return result.sort((a, b) => {
      if (sortBy === 'sentados') return b.displayStats.asistieron - a.displayStats.asistieron;
      if (sortBy === 'sentadosC1') return b.displayStats.sentadosC1 - a.displayStats.sentadosC1;
      if (sortBy === 'sentadosC2') return b.displayStats.sentadosC2 - a.displayStats.sentadosC2;
      if (sortBy === 'gestiones') return b.displayStats.gestiones - a.displayStats.gestiones;
      if (sortBy === 'confirmados') return b.displayStats.confirmados - a.displayStats.confirmados;
      if (sortBy === 'cobertura') return b.displayStats.coberturaPct - a.displayStats.coberturaPct;
      if (sortBy === 'productividad') return b.displayStats.productividadPct - a.displayStats.productividadPct;
      if (sortBy === 'nombre') return a.nombre.localeCompare(b.nombre);
      return 0;
    });
  }, [c1c2Coordinadores, searchTerm, selectedSede, selectedEquipo, selectedEntrenamiento, selectedCiclo, sortBy]);

  // Métricas agregadas reactivas según los filtros aplicados
  const aggregatedStats = useMemo(() => {
    const list = filteredCoordinadores;
    const totalGestiones = list.reduce((acc, c) => acc + (c.displayStats.gestiones || 0), 0);
    const totalAsignados = list.reduce((acc, c) => acc + (c.displayStats.asignados || 0), 0);
    const totalConfirmados = list.reduce((acc, c) => acc + (c.displayStats.confirmados || 0), 0);
    const totalNoContesta = list.reduce((acc, c) => acc + (c.displayStats.noContesta || 0), 0);
    const totalPorConfirmar = list.reduce((acc, c) => acc + (c.displayStats.porConfirmar || 0), 0);
    const totalSiguiente = list.reduce((acc, c) => acc + (c.displayStats.siguiente || 0), 0);
    const totalNoInteresa = list.reduce((acc, c) => acc + (c.displayStats.noInteresa || 0), 0);
    const totalAsistieron = list.reduce((acc, c) => acc + (c.displayStats.asistieron || 0), 0);
    const totalSentadosC1 = list.reduce((acc, c) => acc + (c.displayStats.sentadosC1 || 0), 0);
    const totalSentadosC2 = list.reduce((acc, c) => acc + (c.displayStats.sentadosC2 || 0), 0);

    const coberturaProm = list.length ? Math.round(list.reduce((acc, c) => acc + (c.displayStats.coberturaPct || 0), 0) / list.length) : 0;
    const productividadProm = list.length ? Math.round(list.reduce((acc, c) => acc + (c.displayStats.productividadPct || 0), 0) / list.length) : 0;

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
      totalSentadosC1,
      totalSentadosC2,
      coberturaProm,
      productividadProm,
      tasaEfectividad: totalGestiones > 0 ? Math.round((totalConfirmados / totalGestiones) * 100) : 0
    };
  }, [filteredCoordinadores]);

  // Datos para Gráfico 1: Coordinadores Filtrados (hasta 18 o todos si son <= 22)
  const chartCoordinadoresData = useMemo(() => {
    const limit = filteredCoordinadores.length <= 22 ? filteredCoordinadores.length : 16;
    return filteredCoordinadores.slice(0, limit).map(c => ({
      name: `${c.nombre} (${c.sede.slice(0, 3)})`,
      fullName: `${c.nombreCompleto || c.nombre}`,
      sede: c.sede,
      sentadosC1: c.displayStats.sentadosC1,
      sentadosC2: c.displayStats.sentadosC2,
      totalSentados: c.displayStats.asistieron,
      gestionesC1: c.displayStats.gestionesC1,
      gestionesC2: c.displayStats.gestionesC2,
      gestiones: c.displayStats.gestiones,
      confirmados: c.displayStats.confirmados,
      cobertura: c.displayStats.coberturaPct
    }));
  }, [filteredCoordinadores]);

  // Datos para Gráfico 2: Desglose por Sedes (computado estrictamente desde los datos filtrados)
  const chartSedesData = useMemo(() => {
    if (!filteredCoordinadores.length) return [];
    
    const sedesMap = {};
    filteredCoordinadores.forEach(c => {
      if (!sedesMap[c.sede]) {
        sedesMap[c.sede] = {
          sede: c.sede,
          gestiones: 0,
          confirmados: 0,
          asignados: 0,
          sentadosC1: 0,
          sentadosC2: 0,
          sentadosTotal: 0,
          c1: 0,
          c2: 0,
          coordinadores: 0
        };
      }
      sedesMap[c.sede].gestiones += c.displayStats.gestiones;
      sedesMap[c.sede].confirmados += c.displayStats.confirmados;
      sedesMap[c.sede].asignados += c.displayStats.asignados;
      sedesMap[c.sede].sentadosC1 += c.displayStats.sentadosC1 || 0;
      sedesMap[c.sede].sentadosC2 += c.displayStats.sentadosC2 || 0;
      sedesMap[c.sede].sentadosTotal += c.displayStats.asistieron || 0;
      sedesMap[c.sede].c1 += c.displayStats.gestionesC1 || 0;
      sedesMap[c.sede].c2 += c.displayStats.gestionesC2 || 0;
      sedesMap[c.sede].coordinadores += 1;
    });

    return Object.values(sedesMap).sort((a, b) => b.sentadosTotal - a.sentadosTotal);
  }, [filteredCoordinadores]);

  // Datos para Gráfico 3: Distribución Global de Estados (Donut adaptado a lo filtrado)
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
      const syncDate = new Date(data.timestamp);
      const now = new Date();
      const diffMs = now.getTime() - syncDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Hace instantes';
      if (diffMins === 1) return 'Hace 1 min';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      return `Hace ${diffHours} h ${diffMins % 60} m`;
    } catch (e) {
      return 'Reciente';
    }
  }, [data]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '1rem', background: 'var(--nodus-bg-card, rgba(17, 34, 64, 0.7))', borderRadius: '16px', border: '1px solid var(--nodus-border-card, rgba(255, 255, 255, 0.08))', color: 'var(--nodus-text-sub, #94a3b8)' }}>
        <RefreshCw size={36} color="#ffc107" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--nodus-text-title, #f8fafc)', margin: 0 }}>Cargando datos ejecutivos de Coordinadores C1 & C2...</p>
        <p style={{ fontSize: '0.78rem', color: 'var(--nodus-text-muted, #64748b)', margin: 0 }}>Conectando con el enjambre de agentes autónomos Nodus</p>
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
          <ThemeSelector compact={false} />

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

      {/* 2. SCORECARDS EJECUTIVAS REACTIVAS A FILTROS */}
      <div className="nodus-scorecards-grid">
        <div className="nodus-card">
          <div className="nodus-card-header">
            <span>Total Sentados (Salón)</span>
            <Award size={16} color="#10b981" />
          </div>
          <div className="nodus-card-value highlight-emerald">{aggregatedStats.totalAsistieron.toLocaleString()}</div>
          <div className="nodus-card-footer">
            C1: <strong style={{ color: '#f59e0b' }}>{aggregatedStats.totalSentadosC1.toLocaleString()}</strong> • C2: <strong style={{ color: '#8b5cf6' }}>{aggregatedStats.totalSentadosC2.toLocaleString()}</strong>
          </div>
        </div>

        <div className="nodus-card">
          <div className="nodus-card-header">
            <span>Sentados Capítulo 1</span>
            <Award size={16} color="#f59e0b" />
          </div>
          <div className="nodus-card-value highlight-gold">{aggregatedStats.totalSentadosC1.toLocaleString()}</div>
          <div className="nodus-card-footer">
            {aggregatedStats.totalAsistieron > 0 ? Math.round((aggregatedStats.totalSentadosC1 / aggregatedStats.totalAsistieron) * 100) : 0}% del total de sala
          </div>
        </div>

        <div className="nodus-card">
          <div className="nodus-card-header">
            <span>Sentados Capítulo 2</span>
            <Award size={16} color="#8b5cf6" />
          </div>
          <div className="nodus-card-value highlight-purple">{aggregatedStats.totalSentadosC2.toLocaleString()}</div>
          <div className="nodus-card-footer">
            {aggregatedStats.totalAsistieron > 0 ? Math.round((aggregatedStats.totalSentadosC2 / aggregatedStats.totalAsistieron) * 100) : 0}% del total de sala
          </div>
        </div>

        <div className="nodus-card">
          <div className="nodus-card-header">
            <span>Gestiones Totales</span>
            <PhoneCall size={16} color="#0ea5e9" />
          </div>
          <div className="nodus-card-value highlight-sky">{aggregatedStats.totalGestiones.toLocaleString()}</div>
          <div className="nodus-card-footer">
            {selectedEquipo !== 'TODOS'
              ? `Llamadas de ${selectedEquipo}`
              : `${aggregatedStats.coordinadoresCount} coordinadores C1 & C2`}
          </div>
        </div>

        <div className="nodus-card">
          <div className="nodus-card-header">
            <span>Confirmados</span>
            <CheckCircle2 size={16} color="#10b981" />
          </div>
          <div className="nodus-card-value highlight-emerald">{aggregatedStats.totalConfirmados.toLocaleString()}</div>
          <div className="nodus-card-footer">{aggregatedStats.tasaEfectividad}% efectividad de contacto</div>
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
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--nodus-text-muted)',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                title="Borrar búsqueda"
              >
                ✕
              </button>
            )}
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
                <option value="sentados">Más Sentados en Sala (Total)</option>
                <option value="sentadosC1">Más Sentados C1</option>
                <option value="sentadosC2">Más Sentados C2</option>
                <option value="gestiones">Más Gestiones / Llamadas</option>
                <option value="confirmados">Más Confirmados</option>
                <option value="cobertura">Mayor Cobertura %</option>
                <option value="productividad">Mayor Productividad %</option>
                <option value="nombre">Alfabético</option>
              </select>
            </div>
          </div>
        </div>

        {/* CHIPS DE FILTROS ACTIVOS CON BOTÓN RESTABLECER */}
        {hasActiveFilters && (
          <div className="nodus-active-filters-bar">
            <span className="nodus-active-filters-label">Filtrando por:</span>
            {selectedSede !== 'TODAS' && (
              <span className="nodus-filter-chip" onClick={() => setSelectedSede('TODAS')} title="Quitar filtro de sede">
                <MapPin size={11} /> Sede: {selectedSede} ✕
              </span>
            )}
            {selectedEquipo !== 'TODOS' && (
              <span className="nodus-filter-chip" onClick={() => setSelectedEquipo('TODOS')} title="Quitar filtro de equipo">
                <Layers size={11} /> {selectedEquipo} ✕
              </span>
            )}
            {selectedEntrenamiento !== 'TODOS' && (
              <span className="nodus-filter-chip" onClick={() => setSelectedEntrenamiento('TODOS')} title="Quitar filtro de capítulo">
                <Award size={11} /> {selectedEntrenamiento === 'C1' ? 'Solo Capítulo 1' : 'Solo Capítulo 2'} ✕
              </span>
            )}
            {selectedCiclo !== 'TODOS' && (
              <span className="nodus-filter-chip" onClick={() => setSelectedCiclo('TODOS')} title="Quitar filtro de ciclo">
                <Calendar size={11} /> {selectedCiclo} ✕
              </span>
            )}
            {searchTerm.trim() !== '' && (
              <span className="nodus-filter-chip" onClick={() => setSearchTerm('')} title="Quitar búsqueda de texto">
                <Search size={11} /> "{searchTerm}" ✕
              </span>
            )}
            <button onClick={clearAllFilters} className="nodus-btn-clear-filters" title="Restablecer todos los filtros a su estado inicial">
              Restablecer Filtros
            </button>
          </div>
        )}
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

          <div style={{ fontSize: '0.78rem', color: 'var(--nodus-text-muted)' }}>
            Mostrando {chartCoordinadoresData.length} de {filteredCoordinadores.length} coordinadores {hasActiveFilters && '(filtrados)'}
          </div>
        </div>

        <div className="nodus-chart-viewport">
          {activeChartTab === 'coordinadores' && (
            <>
              {/* SELECTOR DE MÉTRICA DE RENDIMIENTO */}
              <div className="nodus-metric-toggle-group">
                <button
                  type="button"
                  onClick={() => setChartMetric('sentados')}
                  className={`nodus-metric-toggle-btn ${chartMetric === 'sentados' ? 'active' : ''}`}
                  title="Ver participantes efectivamente sentados en sala por capítulo"
                >
                  <Award size={14} color="#f59e0b" />
                  <span>🏆 Sentados en Sala (C1 vs C2)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChartMetric('gestiones')}
                  className={`nodus-metric-toggle-btn ${chartMetric === 'gestiones' ? 'active' : ''}`}
                  title="Ver volumen de gestiones telefónicas y llamadas"
                >
                  <PhoneCall size={14} color="#0ea5e9" />
                  <span>📞 Gestiones & Llamadas (C1 vs C2)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChartMetric('integral')}
                  className={`nodus-metric-toggle-btn ${chartMetric === 'integral' ? 'active' : ''}`}
                  title="Comparativo de doble eje: Sentados vs Esfuerzo de Gestiones"
                >
                  <TrendingUp size={14} color="#10b981" />
                  <span>📊 Comparativo Integral (Doble Eje)</span>
                </button>
              </div>

              {chartMetric === 'sentados' && (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartCoordinadoresData} margin={{ top: 15, right: 25, left: 15, bottom: 65 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis
                      dataKey="name"
                      stroke={axisStroke}
                      fontSize={11}
                      angle={-35}
                      textAnchor="end"
                      height={65}
                      interval={0}
                      tickMargin={6}
                    />
                    <YAxis stroke={axisStroke} fontSize={11} />
                    <Tooltip content={<CustomCoordTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: isLight ? '#334155' : '#cbd5e1' }} />
                    {selectedEntrenamiento !== 'C2' && (
                      <Bar dataKey="sentadosC1" name="Sentados Capítulo 1" fill="#f59e0b" radius={[5, 5, 0, 0]} maxBarSize={45} />
                    )}
                    {selectedEntrenamiento !== 'C1' && (
                      <Bar dataKey="sentadosC2" name="Sentados Capítulo 2" fill="#8b5cf6" radius={[5, 5, 0, 0]} maxBarSize={45} />
                    )}
                    <Bar dataKey="totalSentados" name="Total Sentados (Salón)" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {chartMetric === 'gestiones' && (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartCoordinadoresData} margin={{ top: 15, right: 25, left: 15, bottom: 65 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis
                      dataKey="name"
                      stroke={axisStroke}
                      fontSize={11}
                      angle={-35}
                      textAnchor="end"
                      height={65}
                      interval={0}
                      tickMargin={6}
                    />
                    <YAxis stroke={axisStroke} fontSize={11} />
                    <Tooltip content={<CustomCoordTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: isLight ? '#334155' : '#cbd5e1' }} />
                    <Bar dataKey="gestiones" name="Gestiones Totales" fill={isLight ? '#0284c7' : '#0ea5e9'} radius={[5, 5, 0, 0]} maxBarSize={45} />
                    <Bar dataKey="confirmados" name="Confirmados" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={45} />
                    {selectedEntrenamiento !== 'C2' && (
                      <Bar dataKey="gestionesC1" name="Llamadas Capítulo 1" fill="#f59e0b" radius={[5, 5, 0, 0]} maxBarSize={45} />
                    )}
                    {selectedEntrenamiento !== 'C1' && (
                      <Bar dataKey="gestionesC2" name="Llamadas Capítulo 2" fill="#8b5cf6" radius={[5, 5, 0, 0]} maxBarSize={45} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              )}

              {chartMetric === 'integral' && (
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={chartCoordinadoresData} margin={{ top: 15, right: 30, left: 15, bottom: 65 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis
                      dataKey="name"
                      stroke={axisStroke}
                      fontSize={11}
                      angle={-35}
                      textAnchor="end"
                      height={65}
                      interval={0}
                      tickMargin={6}
                    />
                    <YAxis yAxisId="left" stroke="#10b981" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" stroke="#0ea5e9" fontSize={11} />
                    <Tooltip content={<CustomCoordTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: isLight ? '#334155' : '#cbd5e1' }} />
                    {selectedEntrenamiento !== 'C2' && (
                      <Bar yAxisId="left" dataKey="sentadosC1" name="Sentados C1" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    )}
                    {selectedEntrenamiento !== 'C1' && (
                      <Bar yAxisId="left" dataKey="sentadosC2" name="Sentados C2" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    )}
                    <Bar yAxisId="left" dataKey="totalSentados" name="Total Sentados" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Line yAxisId="right" type="monotone" dataKey="gestiones" name="Gestiones Totales (Eje Der)" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </>
          )}

          {activeChartTab === 'sedes' && (
            <ResponsiveContainer width="100%" height={390}>
              <ComposedChart data={chartSedesData} margin={{ top: 15, right: 25, left: 15, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="sede" stroke={axisStroke} fontSize={12} />
                <YAxis yAxisId="left" stroke="#10b981" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="#0ea5e9" fontSize={11} />
                <Tooltip contentStyle={chartTooltipStyle} itemStyle={chartItemStyle} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: isLight ? '#334155' : '#cbd5e1' }} />
                <Bar yAxisId="left" dataKey="sentadosC1" name="Sentados C1" fill="#f59e0b" radius={[5, 5, 0, 0]} maxBarSize={38} />
                <Bar yAxisId="left" dataKey="sentadosC2" name="Sentados C2" fill="#8b5cf6" radius={[5, 5, 0, 0]} maxBarSize={38} />
                <Bar yAxisId="left" dataKey="sentadosTotal" name="Total Sentados" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={38} />
                <Line yAxisId="right" type="monotone" dataKey="gestiones" name="Gestiones Totales (Eje Der)" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4 }} />
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
                    <Tooltip contentStyle={chartTooltipStyle} itemStyle={chartItemStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="nodus-pie-legend-box">
                {chartEstadosData.map((e, idx) => (
                  <div key={idx} className="nodus-legend-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: e.color }} />
                      <span style={{ color: isLight ? '#334155' : '#cbd5e1', fontWeight: 500 }}>{e.name}</span>
                    </div>
                    <span style={{ fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff' }}>{e.value.toLocaleString()}</span>
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
            <span>Coordinadores Activos C1 & C2</span>
            {hasActiveFilters && (
              <span style={{ fontSize: '0.68rem', padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(255,193,7,0.18)', color: '#ffc107', fontWeight: 700, border: '1px solid rgba(255,193,7,0.3)' }}>
                Filtros Activos ({filteredCoordinadores.length} encontrados)
              </span>
            )}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--nodus-text-muted)' }}>
            Mostrando {filteredCoordinadores.length} {filteredCoordinadores.length === 1 ? 'coordinador C1/C2' : 'coordinadores C1/C2'}
          </span>
        </div>

        <div className="nodus-table-scroll">
          <table className="nodus-table">
            <thead>
              <tr>
                <th className="nodus-th">Colaborador / Coordinador</th>
                <th className="nodus-th">Sede & Ciclo</th>
                <th className="nodus-th" style={{ textAlign: 'right', color: '#f59e0b' }}>Sentados C1</th>
                <th className="nodus-th" style={{ textAlign: 'right', color: '#8b5cf6' }}>Sentados C2</th>
                <th className="nodus-th" style={{ textAlign: 'right', color: '#10b981' }}>Total Sentados</th>
                <th className="nodus-th" style={{ textAlign: 'right' }}>Gestiones (C1 / C2)</th>
                <th className="nodus-th" style={{ textAlign: 'right' }}>Confirmados</th>
                <th className="nodus-th" style={{ textAlign: 'center' }}>Cobertura</th>
                <th className="nodus-th" style={{ textAlign: 'center' }}>Productividad</th>
                <th className="nodus-th" style={{ textAlign: 'center' }}>Última Gestión</th>
                <th className="nodus-th" style={{ textAlign: 'center' }}>Equipos</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoordinadores.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--nodus-text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                      <AlertCircle size={24} color="#f59e0b" />
                      <span>No se encontraron coordinadores con los filtros seleccionados.</span>
                      {hasActiveFilters && (
                        <button onClick={clearAllFilters} className="nodus-btn-clear-filters" style={{ margin: '0.4rem auto 0 auto' }}>
                          Restablecer Filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCoordinadores.map((coord) => {
                  const isExpanded = !!expandedRows[coord.id];
                  const hasEquipos = (coord.visibleEquipos || []).length > 0;
                  const isFilteredEquipo = selectedEquipo !== 'TODOS';

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
                              <div style={{ fontWeight: 700, color: 'var(--nodus-text-title)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                {coord.nombre}
                                {coord.sentadosC2 > 0 && selectedEntrenamiento !== 'C1' && (
                                  <span className="nodus-badge-c1c2">C1+C2</span>
                                )}
                                {isFilteredEquipo && (
                                  <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#0284c7', fontWeight: 700, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                                    {selectedEquipo}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--nodus-text-muted)', fontFamily: 'monospace' }}>
                                {coord.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Sede & Ciclo */}
                        <td className="nodus-td">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--nodus-text-title)', fontWeight: 600 }}>
                              <MapPin size={13} color="#ffc107" />
                              {coord.sede}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--nodus-text-muted)' }}>
                              {coord.ciclo}
                            </span>
                          </div>
                        </td>

                        {/* Sentados C1 */}
                        <td className="nodus-td" style={{ textAlign: 'right' }}>
                          <span className="nodus-badge-sentados-c1">
                            {coord.displayStats.sentadosC1}
                          </span>
                        </td>

                        {/* Sentados C2 */}
                        <td className="nodus-td" style={{ textAlign: 'right' }}>
                          <span className="nodus-badge-sentados-c2">
                            {coord.displayStats.sentadosC2}
                          </span>
                        </td>

                        {/* Total Sentados */}
                        <td className="nodus-td" style={{ textAlign: 'right' }}>
                          <span className="nodus-badge-asistieron">
                            {coord.displayStats.asistieron}
                          </span>
                        </td>

                        {/* Gestiones (C1 / C2) */}
                        <td className="nodus-td" style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.1rem' }}>
                            <span style={{ fontWeight: 800, color: '#0ea5e9', fontSize: '0.92rem' }}>
                              {coord.displayStats.gestiones.toLocaleString()}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--nodus-text-muted)' }}>
                              C1: <strong style={{ color: '#f59e0b' }}>{coord.displayStats.gestionesC1 || 0}</strong> • C2: <strong style={{ color: '#8b5cf6' }}>{coord.displayStats.gestionesC2 || 0}</strong>
                            </span>
                          </div>
                        </td>

                        {/* Confirmados */}
                        <td className="nodus-td" style={{ textAlign: 'right' }}>
                          <span className="nodus-badge-confirmados">
                            {coord.displayStats.confirmados}
                          </span>
                        </td>

                        {/* Cobertura */}
                        <td className="nodus-td" style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ fontWeight: 800, color: '#ffc107' }}>{coord.displayStats.coberturaPct}%</span>
                            <div style={{ width: '55px', height: '4px', background: 'var(--nodus-progress-bg)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${coord.displayStats.coberturaPct}%`, height: '100%', background: '#ffc107', borderRadius: '2px' }} />
                            </div>
                          </div>
                        </td>

                        {/* Productividad */}
                        <td className="nodus-td" style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ fontWeight: 800, color: '#14b8a6' }}>{coord.displayStats.productividadPct}%</span>
                            <div style={{ width: '55px', height: '4px', background: 'var(--nodus-progress-bg)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${coord.displayStats.productividadPct}%`, height: '100%', background: '#14b8a6', borderRadius: '2px' }} />
                            </div>
                          </div>
                        </td>

                        {/* Última Gestión */}
                        <td className="nodus-td" style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--nodus-text-muted)', fontFamily: 'monospace' }}>
                          {coord.ultGestion || coord.ultConexion || 'N/D'}
                        </td>

                        {/* Acciones */}
                        <td className="nodus-td" style={{ textAlign: 'center' }}>
                          {hasEquipos ? (
                            <button
                              onClick={() => toggleRow(coord.id)}
                              className={`nodus-btn-expand ${isExpanded ? 'expanded' : ''}`}
                              title={isFilteredEquipo ? `Ver detalle de ${selectedEquipo}` : `Ver desglose de ${coord.visibleEquipos.length} equipos`}
                            >
                              <span>
                                {isFilteredEquipo ? selectedEquipo : `Equipos (${coord.visibleEquipos.length})`}
                              </span>
                              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: 'var(--nodus-text-muted)', fontStyle: 'italic' }}>Sin equipos</span>
                          )}
                        </td>
                      </tr>

                      {/* SUBTABLA ANIDADA (SOLO MUESTRA LOS EQUIPOS FILTRADOS) */}
                      {isExpanded && hasEquipos && (
                        <tr>
                          <td colSpan={11} className="nodus-nested-wrapper">
                            <div className="nodus-nested-panel">
                              <div className="nodus-nested-header">
                                <h4 className="nodus-nested-title">
                                  <Layers size={14} />
                                  <span>Desglose por Equipo — {coord.nombre} ({coord.sede})</span>
                                  {isFilteredEquipo && (
                                    <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.18)', color: '#0284c7', fontWeight: 700, marginLeft: '0.5rem' }}>
                                      Filtrado: {selectedEquipo}
                                    </span>
                                  )}
                                </h4>
                                <span style={{ fontSize: '0.72rem', color: 'var(--nodus-text-muted)' }}>
                                  {coord.visibleEquipos.length} {coord.visibleEquipos.length === 1 ? 'equipo mostrado' : 'equipos mostrados'}
                                </span>
                              </div>

                              <div style={{ overflowX: 'auto' }}>
                                <table className="nodus-nested-table">
                                  <thead>
                                    <tr>
                                      <th className="nodus-nested-th">Capítulo & Equipo</th>
                                      <th className="nodus-nested-th" style={{ textAlign: 'right' }}>Llamadas</th>
                                      <th className="nodus-nested-th" style={{ textAlign: 'right' }}>Confirmado</th>
                                      <th className="nodus-nested-th" style={{ textAlign: 'right' }}>No Contesta</th>
                                      <th className="nodus-nested-th" style={{ textAlign: 'right' }}>Por Confirmar</th>
                                      <th className="nodus-nested-th" style={{ textAlign: 'right' }}>Siguiente</th>
                                      <th className="nodus-nested-th" style={{ textAlign: 'right', color: '#10b981' }}>Sentados en Sala</th>
                                      <th className="nodus-nested-th" style={{ textAlign: 'center' }}>Tasa Asistencia</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {coord.visibleEquipos.map((eq, eqIdx) => {
                                      const teamNum = parseInt(eq.equipo.replace(/[^0-9]/g, '')) || 0;
                                      const isC2 = teamNum >= 100;
                                      const tasaAsist = eq.confirmado > 0 ? Math.round((eq.asistieron / eq.confirmado) * 100) : 0;
                                      return (
                                        <tr key={eqIdx} style={{ transition: 'background 0.15s ease' }}>
                                          <td className="nodus-nested-td" style={{ fontWeight: 700, color: 'var(--nodus-text-title)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                              <span className={isC2 ? "nodus-badge-c2-small" : "nodus-badge-c1-small"}>
                                                {isC2 ? 'C2' : 'C1'}
                                              </span>
                                              <span>{eq.equipo}</span>
                                            </div>
                                          </td>
                                          <td className="nodus-nested-td" style={{ textAlign: 'right', color: '#0284c7', fontWeight: 600 }}>
                                            {eq.llamadas}
                                          </td>
                                          <td className="nodus-nested-td" style={{ textAlign: 'right', color: '#10b981', fontWeight: 700 }}>
                                            {eq.confirmado}
                                          </td>
                                          <td className="nodus-nested-td" style={{ textAlign: 'right', color: 'var(--nodus-text-muted)' }}>
                                            {eq.noContesta}
                                          </td>
                                          <td className="nodus-nested-td" style={{ textAlign: 'right', color: '#fbbf24' }}>
                                            {eq.porConfirmar}
                                          </td>
                                          <td className="nodus-nested-td" style={{ textAlign: 'right', color: '#60a5fa' }}>
                                            {eq.siguiente}
                                          </td>
                                          <td className="nodus-nested-td" style={{ textAlign: 'right' }}>
                                            <span className="nodus-badge-asistieron" style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>
                                              {eq.asistieron}
                                            </span>
                                          </td>
                                          <td className="nodus-nested-td" style={{ textAlign: 'center' }}>
                                            <span style={{
                                              padding: '0.15rem 0.5rem',
                                              borderRadius: '6px',
                                              fontSize: '0.72rem',
                                              fontWeight: 700,
                                              background: tasaAsist >= 80 ? 'rgba(16, 185, 129, 0.18)' : tasaAsist >= 50 ? 'rgba(245, 158, 11, 0.18)' : (isLight ? 'rgba(100, 116, 139, 0.12)' : 'rgba(255, 255, 255, 0.08)'),
                                              color: tasaAsist >= 80 ? (isLight ? '#059669' : '#10b981') : tasaAsist >= 50 ? (isLight ? '#b45309' : '#fbbf24') : (isLight ? '#475569' : '#94a3b8'),
                                              border: `1px solid ${tasaAsist >= 80 ? 'rgba(16, 185, 129, 0.4)' : tasaAsist >= 50 ? 'rgba(245, 158, 11, 0.4)' : (isLight ? 'rgba(100, 116, 139, 0.25)' : 'rgba(255, 255, 255, 0.1)')}`
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
