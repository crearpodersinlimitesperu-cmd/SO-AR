// src/components/ModuleTelemetryView.jsx
// Panel Autoritativo de Telemetría y Adopción de Módulos en el Centro de Mando
// Garantía estricta de veracidad: cálculo 100% basado en Firestore audit_logs, sin invención ni alucinación.

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, Users, Eye, AlertTriangle, ShieldCheck, RefreshCw, 
  Download, Search, Sparkles, Filter, ChevronDown, ChevronRight,
  Clock, CheckCircle2, Flame, Snowflake, ArrowUpDown, ExternalLink
} from 'lucide-react';
import { fetchModuleTelemetryReport } from '../services/moduleTelemetryService';
import UserGeoHistoryModal from './UserGeoHistoryModal';

export default function ModuleTelemetryView({ currentUser }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('TODOS');
  const [activeSubTab, setActiveSubTab] = useState('ranking'); // 'ranking' | 'usuarios' | 'huerfanos'
  const [expandedModuleId, setExpandedModuleId] = useState(null);
  const [geoModalUser, setGeoModalUser] = useState(null);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await fetchModuleTelemetryReport();
      setReport(data);
    } catch (e) {
      console.error('Error cargando telemetría de módulos:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  // Módulos filtrados para el Ranking
  const filteredModules = useMemo(() => {
    if (!report?.modules) return [];
    return report.modules.filter(m => {
      const matchesSearch = !searchTerm.trim() || 
        m.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.id.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (tierFilter === 'TODOS') return true;
      if (tierFilter === 'ALTO') return m.usageTier === 'ALTO';
      if (tierFilter === 'MEDIO') return m.usageTier === 'MEDIO';
      if (tierFilter === 'BAJO') return m.usageTier === 'BAJO';
      if (tierFilter === 'SIN_USO') return m.usageTier === 'SIN_USO';
      return true;
    });
  }, [report, searchTerm, tierFilter]);

  // Módulos con 0 visitas
  const zeroUsageModules = useMemo(() => {
    if (!report?.modules) return [];
    return report.modules.filter(m => m.totalVisits === 0);
  }, [report]);

  // Exportar a CSV
  const handleExportCSV = () => {
    if (!report?.modules) return;
    const headers = ['ID', 'Nombre Modulo', 'Ruta', 'Total Visitas', 'Usuarios Unicos', 'Nivel de Uso', 'Ultimo Acceso', 'Ultimo Usuario'];
    const rows = report.modules.map(m => [
      `"${m.id}"`,
      `"${m.label.replace(/"/g, '""')}"`,
      `"${m.route}"`,
      m.totalVisits,
      m.uniqueUsersCount,
      `"${m.usageTier}"`,
      `"${m.lastAccessIso || 'Sin accesos'}"`,
      `"${m.lastUser ? `${m.lastUser.name} (${m.lastUser.email})` : 'N/A'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetria_modulos_causa_os_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxVisits = useMemo(() => {
    if (!report?.modules?.length) return 1;
    return Math.max(...report.modules.map(m => m.totalVisits), 1);
  }, [report]);

  const formatDate = (iso) => {
    if (!iso) return 'Sin registros';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString('es-ES', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return iso;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* HEADER DE TELEMETRÍA Y CONTROLES */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '1.5rem 1.75rem', 
          borderRadius: '14px', 
          border: '1px solid rgba(251, 191, 36, 0.3)',
          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(15, 23, 42, 0.85))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.6rem' }}>📊</span>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-heading)' }}>
              Telemetría de Adopción y Uso de Módulos
            </h2>
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <ShieldCheck size={12} /> DATOS 100% REALES AUDITADOS
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            Supervisión inmutable de qué herramientas se usan más, cuáles se usan menos, quiénes entran y cuándo. Sin estimaciones ni datos inventados.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={loadReport}
            disabled={loading}
            className="btn-secondary"
            style={{
              padding: '0.55rem 1rem',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: '8px',
              fontWeight: 600
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Calculando...' : 'Actualizar'}
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!report || loading}
            className="btn-secondary"
            style={{
              padding: '0.55rem 1rem',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: '8px',
              fontWeight: 600,
              background: 'rgba(251, 191, 36, 0.12)',
              borderColor: 'rgba(251, 191, 36, 0.4)',
              color: 'var(--crear-gold)'
            }}
          >
            <Download size={15} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS GLOBALES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL MÓDULOS</span>
            <BarChart3 size={18} color="var(--crear-gold)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
            {report?.summary?.totalModules ?? '...'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Herramientas oficiales en catálogo
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>MÓDULOS CON USO</span>
            <Flame size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>
            {report?.summary?.activeModulesCount ?? '...'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Tienen al menos 1 acceso auditado
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: 600 }}>SIN USO (0 ACCESOS)</span>
            <Snowflake size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444' }}>
            {report?.summary?.inactiveModulesCount ?? '...'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Candidatos a reentrenar o eliminar
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 600 }}>INTERACCIONES AUDITADAS</span>
            <Eye size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8' }}>
            {report?.summary?.totalEventsCount ?? '...'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Eventos reales en Firestore
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#c084fc', fontWeight: 600 }}>USUARIOS MONITOREADOS</span>
            <Users size={18} color="#a855f7" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#c084fc' }}>
            {report?.summary?.uniqueUsersCount ?? '...'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Colaboradores únicos registrados
          </div>
        </div>

      </div>

      {/* DICTAMEN DEL AGENTE AUDITOR DE TELEMETRÍA (Modo Estricto Anti-Alucinación) */}
      {report?.agentAnalysis && (
        <div 
          className="glass-panel"
          style={{ 
            padding: '1.5rem', 
            borderRadius: '14px', 
            border: '1px solid rgba(251, 191, 36, 0.35)',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Sparkles size={20} color="var(--crear-gold)" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--crear-gold)' }}>
                Dictamen Ejecutivo del Agente Auditor de Telemetría
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Auditado: {formatDate(report.agentAnalysis.fechaAuditoriaIso)} | Regla: Cero Alucinación
            </span>
          </div>

          <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.6 }}>
            {report.agentAnalysis.conclusion}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.85rem' }}>
            {report.agentAnalysis.hallazgos.map((h, idx) => (
              <div 
                key={idx}
                style={{ 
                  background: 'rgba(0, 0, 0, 0.35)', 
                  borderLeft: h.severidad === 'ALERTA' ? '4px solid #ef4444' : (h.severidad === 'POSITIVO' ? '4px solid #10b981' : '4px solid #38bdf8'),
                  padding: '0.85rem 1rem',
                  borderRadius: '6px'
                }}
              >
                <div style={{ 
                  fontSize: '0.84rem', 
                  fontWeight: 700, 
                  color: h.severidad === 'ALERTA' ? '#fca5a5' : (h.severidad === 'POSITIVO' ? '#86efac' : '#7dd3fc'),
                  marginBottom: '4px' 
                }}>
                  {h.titulo}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                  {h.descripcion}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑAS DE VISTA Y FILTROS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* SUBTABS */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: '10px' }}>
          <button
            onClick={() => setActiveSubTab('ranking')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: activeSubTab === 'ranking' ? 'var(--crear-gold)' : 'transparent',
              color: activeSubTab === 'ranking' ? '#000' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer'
            }}
          >
            🏆 Ranking de Módulos (Más a Menos)
          </button>
          <button
            onClick={() => setActiveSubTab('usuarios')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: activeSubTab === 'usuarios' ? 'var(--crear-gold)' : 'transparent',
              color: activeSubTab === 'usuarios' ? '#000' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer'
            }}
          >
            👥 ¿Quién Usa Qué? (Por Colaborador)
          </button>
          <button
            onClick={() => setActiveSubTab('huerfanos')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: activeSubTab === 'huerfanos' ? '#ef4444' : 'transparent',
              color: activeSubTab === 'huerfanos' ? '#fff' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer'
            }}
          >
            ⚠️ Candidatos a Depuración ({zeroUsageModules.length})
          </button>
        </div>

        {/* BUSCADOR Y FILTROS RÁPIDOS */}
        {activeSubTab === 'ranking' && (
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar módulo o ruta..."
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem 0.45rem 2rem',
                  fontSize: '0.82rem',
                  borderRadius: '8px',
                  background: 'var(--bg-card)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff'
                }}
              />
            </div>

            <select
              value={tierFilter}
              onChange={e => setTierFilter(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                fontSize: '0.82rem',
                borderRadius: '8px',
                background: 'var(--bg-card)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff'
              }}
            >
              <option value="TODOS">Todos los niveles</option>
              <option value="ALTO">🔥 Alto Uso</option>
              <option value="MEDIO">⚡ Uso Moderado</option>
              <option value="BAJO">🧊 Bajo Uso</option>
              <option value="SIN_USO">⚠️ 0 Accesos</option>
            </select>
          </div>
        )}
      </div>

      {/* CONTENIDO PRINCIPAL SEGÚN SUBTAB */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', borderRadius: '12px' }}>
          <RefreshCw size={32} className="animate-spin" color="var(--crear-gold)" style={{ margin: '0 auto 1rem' }} />
          <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Auditando registros reales en Firestore...</div>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Consultando colección audit_logs y user_profiles sin intermediarios
          </div>
        </div>
      ) : (
        <>
          {/* TAB 1: RANKING DE MÓDULOS (MÁS A MENOS) */}
          {activeSubTab === 'ranking' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredModules.length === 0 ? (
                <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron módulos con el criterio de búsqueda seleccionado.
                </div>
              ) : (
                filteredModules.map((m, index) => {
                  const isExpanded = expandedModuleId === m.id;
                  const percentOfMax = maxVisits > 0 ? (m.totalVisits / maxVisits) * 100 : 0;

                  return (
                    <div
                      key={m.id}
                      className="glass-panel"
                      style={{
                        padding: '1.1rem 1.4rem',
                        borderRadius: '12px',
                        border: m.totalVisits === 0 
                          ? '1px dashed rgba(239, 68, 68, 0.4)' 
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        background: m.totalVisits === 0 ? 'rgba(239, 68, 68, 0.03)' : 'var(--bg-card)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        
                        {/* IDENTIFICADOR Y NOMBRE DEL MÓDULO */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: '280px' }}>
                          <span style={{ 
                            fontSize: '0.8rem', 
                            fontWeight: 800, 
                            color: index < 3 && m.totalVisits > 0 ? 'var(--crear-gold)' : 'var(--text-muted)',
                            width: '28px'
                          }}>
                            #{index + 1}
                          </span>
                          <span style={{ fontSize: '1.5rem' }}>{m.emoji}</span>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                                {m.label}
                              </h4>
                              {m.usageTier === 'ALTO' && (
                                <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                                  🔥 ALTO
                                </span>
                              )}
                              {m.usageTier === 'MEDIO' && (
                                <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                                  ⚡ MEDIO
                                </span>
                              )}
                              {m.usageTier === 'BAJO' && (
                                <span style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600 }}>
                                  🧊 BAJO
                                </span>
                              )}
                              {m.usageTier === 'SIN_USO' && (
                                <span style={{ background: 'rgba(239, 68, 68, 0.18)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                                  ⚠️ 0 ACCESOS
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'monospace' }}>
                              {m.route}
                            </div>
                          </div>
                        </div>

                        {/* BARRA DE PROPORCIÓN VISUAL */}
                        <div style={{ flex: '1 1 200px', minWidth: '180px', padding: '0 1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-muted)' }}>
                            <span>Frecuencia Relativa</span>
                            <span style={{ fontWeight: 700, color: '#fff' }}>{m.totalVisits} visitas</span>
                          </div>
                          <div style={{ height: '7px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                height: '100%', 
                                width: `${percentOfMax}%`, 
                                background: m.totalVisits === 0 
                                  ? 'transparent' 
                                  : (m.usageTier === 'ALTO' ? 'var(--crear-gold)' : (m.usageTier === 'MEDIO' ? '#38bdf8' : '#64748b')),
                                borderRadius: '999px',
                                transition: 'width 0.4s ease'
                              }} 
                            />
                          </div>
                        </div>

                        {/* ESTADÍSTICAS DEL MÓDULO */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', textAlign: 'right' }}>
                          <div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                              {m.uniqueUsersCount}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Usuarios únicos
                            </div>
                          </div>

                          <div style={{ minWidth: '160px', textAlign: 'right' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: m.lastAccessIso ? '#e2e8f0' : '#ef4444' }}>
                              {formatDate(m.lastAccessIso)}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {m.lastUser ? `${m.lastUser.name} (${m.lastUser.role})` : 'Nunca ingresaron'}
                            </div>
                          </div>

                          {/* BOTÓN EXPANDIR QUIÉN LO USA */}
                          <button
                            onClick={() => setExpandedModuleId(isExpanded ? null : m.id)}
                            className="btn-secondary"
                            style={{
                              padding: '0.4rem 0.75rem',
                              fontSize: '0.78rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              borderRadius: '6px'
                            }}
                          >
                            {isExpanded ? 'Ocultar' : 'Ver Quién'}
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </div>

                      </div>

                      {/* DETALLE EXPANDIDO DE USUARIOS QUE USARON ESTE MÓDULO */}
                      {isExpanded && (
                        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                          <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--crear-gold)', fontWeight: 700 }}>
                            Colaboradores que han ingresado a "{m.label}":
                          </h5>

                          {m.users.length === 0 ? (
                            <p style={{ margin: 0, fontSize: '0.82rem', color: '#f87171' }}>
                              ⚠️ Ningún colaborador registrado en la base de datos ha ingresado a este módulo.
                            </p>
                          ) : (
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                <thead>
                                  <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                                    <th style={{ padding: '0.4rem 0.5rem' }}>Colaborador</th>
                                    <th style={{ padding: '0.4rem 0.5rem' }}>Correo</th>
                                    <th style={{ padding: '0.4rem 0.5rem' }}>Rol</th>
                                    <th style={{ padding: '0.4rem 0.5rem' }}>Sede</th>
                                    <th style={{ padding: '0.4rem 0.5rem', textAlign: 'center' }}>Veces Usado</th>
                                    <th style={{ padding: '0.4rem 0.5rem' }}>Último Ingreso</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {m.users.map((u, uIdx) => (
                                    <tr key={uIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                      <td style={{ padding: '0.4rem 0.5rem', fontWeight: 600, color: '#fff' }}>{u.name}</td>
                                      <td style={{ padding: '0.4rem 0.5rem', color: 'var(--text-muted)' }}>{u.email}</td>
                                      <td style={{ padding: '0.4rem 0.5rem', color: '#38bdf8' }}>{u.role}</td>
                                      <td style={{ padding: '0.4rem 0.5rem', color: 'var(--text-muted)' }}>{u.sede}</td>
                                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'center', fontWeight: 700, color: 'var(--crear-gold)' }}>{u.count}</td>
                                      <td style={{ padding: '0.4rem 0.5rem', color: 'var(--text-muted)' }}>{formatDate(u.lastVisitedIso)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: DETALLE POR COLABORADOR */}
          {activeSubTab === 'usuarios' && (
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', overflowX: 'auto' }}>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                    Adopción y Frecuencia de Módulos por Colaborador
                  </h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Listado de usuarios ordenados por mayor actividad de herramientas en Causa OS.
                  </p>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--crear-gold)' }}>
                  {report?.usersSummary?.length || 0} usuarios activos
                </span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Colaborador</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Rol</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Sede</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Módulos Usados</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Total Ingresos</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Última Actividad</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Historial Geo</th>
                  </tr>
                </thead>
                <tbody>
                  {(report?.usersSummary || []).map((u, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{u.name}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', color: '#38bdf8' }}>{u.role}</td>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>{u.sede}</td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 700, color: '#a855f7' }}>
                        {u.modulesCount}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 800, color: 'var(--crear-gold)' }}>
                        {u.totalModuleVisits}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>
                        {formatDate(u.lastActiveIso)}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => setGeoModalUser({
                            email: u.email,
                            name: u.name,
                            role: u.role,
                            sede: u.sede
                          })}
                          className="btn-secondary"
                          style={{
                            padding: '0.3rem 0.65rem',
                            fontSize: '0.74rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            borderRadius: '6px',
                            background: 'rgba(56, 189, 248, 0.1)',
                            borderColor: 'rgba(56, 189, 248, 0.3)',
                            color: '#38bdf8'
                          }}
                          title="Ver historial geográfico de conexiones de este colaborador"
                        >
                          🌍 Conexiones
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: CANDIDATOS A DEPURACIÓN (0 ACCESOS) */}
          {activeSubTab === 'huerfanos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div 
                className="glass-panel" 
                style={{ 
                  padding: '1.25rem 1.5rem', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(15, 23, 42, 0.8))'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                  <AlertTriangle size={20} color="#ef4444" />
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fca5a5' }}>
                    Módulos Huérfanos / Sin Tracción Auditada ({zeroUsageModules.length})
                  </h4>
                </div>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                  Estas herramientas forman parte del código y menú de Causa OS pero ningún usuario ha registrado ingresos en el histórico auditado. 
                  La Dirección General puede decidir si el equipo requiere capacitación de uso o si conviene darlas de baja definitiva para mantener el sistema ligero y enfocado.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.85rem' }}>
                {zeroUsageModules.map((m) => (
                  <div 
                    key={m.id}
                    className="glass-panel"
                    style={{ 
                      padding: '1.25rem', 
                      borderRadius: '10px', 
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      background: 'rgba(239, 68, 68, 0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.75rem'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                        <span style={{ fontSize: '1.3rem' }}>{m.emoji}</span>
                        <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                          {m.label}
                        </h5>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {m.route}
                      </div>
                      <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: '#fca5a5' }}>
                        ⚠️ Estado: 0 visitas registradas en Firestore
                      </div>
                    </div>

                    <div style={{ paddingTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Roles autorizados: {Array.isArray(m.roles) ? m.roles.slice(0, 3).join(', ') + (m.roles.length > 3 ? '...' : '') : 'Público'}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}
        </>
      )}

      {/* MODAL DE HISTORIAL GEOGRÁFICO DE CONEXIONES */}
      <UserGeoHistoryModal
        isOpen={!!geoModalUser}
        onClose={() => setGeoModalUser(null)}
        userEmail={geoModalUser?.email}
        userName={geoModalUser?.name}
        userRole={geoModalUser?.role}
        userSede={geoModalUser?.sede}
      />
    </div>
  );
}
