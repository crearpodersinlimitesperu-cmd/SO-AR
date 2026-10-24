import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Users,
  CheckCircle2,
  UserCheck,
  UserX,
  Layers,
  MapPin,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function AuditoriaSentadosConfirmadosModal({ isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSede, setSelectedSede] = useState('TODAS');
  const [selectedStage, setSelectedStage] = useState('TODAS');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTeam, setExpandedTeam] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const docRef = doc(db, 'nodus_auditoria_sentados_confirmados', 'latest_reconciliation');
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setData(snap.data());
      }
      setLoading(false);
    }, (err) => {
      console.warn('Error leyendo nodus_auditoria_sentados_confirmados:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [isOpen]);

  // Sedes disponibles
  const sedesList = useMemo(() => {
    if (!data?.equipos) return [];
    return Array.from(new Set(data.equipos.map(e => e.sede))).sort();
  }, [data]);

  // Filtrado reactivo de equipos
  const filteredEquipos = useMemo(() => {
    if (!data?.equipos) return [];
    return data.equipos.filter(eq => {
      if (selectedSede !== 'TODAS' && eq.sede !== selectedSede) return false;
      if (selectedStage !== 'TODAS' && eq.stage !== selectedStage) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchName = (eq.equipoNombre || '').toLowerCase().includes(term);
        const matchSede = (eq.sede || '').toLowerCase().includes(term);
        if (!matchName && !matchSede) return false;
      }
      return true;
    });
  }, [data, selectedSede, selectedStage, searchTerm]);

  // Resumen calculado reactivo sobre los equipos filtrados
  const filteredSummary = useMemo(() => {
    if (!filteredEquipos.length) {
      return {
        totalAsignados: 0,
        totalConfirmados: 0,
        totalSentados: 0,
        tasaAsistencia: 0,
        nuevosConfirmados: 0,
        nuevosSentados: 0,
        tasaNuevos: 0,
        rezagadosConfirmados: 0,
        rezagadosSentados: 0,
        tasaRezagados: 0,
        noShows: 0,
        walkIns: 0
      };
    }

    const asig = filteredEquipos.reduce((acc, e) => acc + (e.metricas?.totalAsignados || 0), 0);
    const conf = filteredEquipos.reduce((acc, e) => acc + (e.metricas?.totalConfirmados || 0), 0);
    const sent = filteredEquipos.reduce((acc, e) => acc + (e.metricas?.totalSentados || 0), 0);
    
    const nConf = filteredEquipos.reduce((acc, e) => acc + (e.metricas?.nuevos?.confirmados || 0), 0);
    const nSent = filteredEquipos.reduce((acc, e) => acc + (e.metricas?.nuevos?.sentados || 0), 0);
    
    const rConf = filteredEquipos.reduce((acc, e) => acc + (e.metricas?.rezagados?.confirmados || 0), 0);
    const rSent = filteredEquipos.reduce((acc, e) => acc + (e.metricas?.rezagados?.sentados || 0), 0);
    
    const noShows = filteredEquipos.reduce((acc, e) => acc + (e.metricas?.totalNoShows || 0), 0);
    const walkIns = filteredEquipos.reduce((acc, e) => acc + (e.metricas?.totalWalkIns || 0), 0);

    return {
      totalAsignados: asig,
      totalConfirmados: conf,
      totalSentados: sent,
      tasaAsistencia: conf > 0 ? Math.round((sent / conf) * 100) : 0,
      nuevosConfirmados: nConf,
      nuevosSentados: nSent,
      tasaNuevos: nConf > 0 ? Math.round((nSent / nConf) * 100) : 0,
      rezagadosConfirmados: rConf,
      rezagadosSentados: rSent,
      tasaRezagados: rConf > 0 ? Math.round((rSent / rConf) * 100) : 0,
      noShows,
      walkIns
    };
  }, [filteredEquipos]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 11, 24, 0.82)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1.5rem'
    }}>
      <div style={{
        background: '#0d1b2a',
        border: '1px solid rgba(255, 193, 7, 0.35)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(255, 193, 7, 0.15)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1240px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#f8fafc'
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(255, 193, 7, 0.15)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={20} color="#ffc107" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                Auditoría: Sentados vs Confirmados
                <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                  Nuevos & Rezagados • C1 & C2
                </span>
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Conciliación certificada entre llamadas de coordinación y aforo presencial de sala en Nodus.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.45rem',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            title="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
              <RefreshCw size={32} color="#ffc107" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }} />
              <p>Cargando auditoría certificada...</p>
            </div>
          ) : (
            <>
              {/* Scorecards de Resumen Rápido */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.85rem'
              }}>
                {/* 1. Confirmados */}
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle2 size={13} color="#38bdf8" />
                    CONFIRMADOS TOTALES
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.3rem' }}>
                    {filteredSummary.totalConfirmados.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Por llamadas de coordinación
                  </div>
                </div>

                {/* 2. Sentados en Sala */}
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <UserCheck size={13} color="#10b981" />
                    SENTADOS EN SALA
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginTop: '0.3rem' }}>
                    {filteredSummary.totalSentados.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '0.2rem', fontWeight: 700 }}>
                    {filteredSummary.tasaAsistencia}% tasa de asistencia
                  </div>
                </div>

                {/* 3. Cohorte Nuevos */}
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Users size={13} color="#f59e0b" />
                    COHORTE NUEVOS
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.3rem' }}>
                    {filteredSummary.nuevosSentados.toLocaleString()} <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>/ {filteredSummary.nuevosConfirmados}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '0.2rem', fontWeight: 700 }}>
                    {filteredSummary.tasaNuevos}% efectividad nuevos
                  </div>
                </div>

                {/* 4. Cohorte Rezagados */}
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Layers size={13} color="#8b5cf6" />
                    COHORTE REZAGADOS
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8b5cf6', marginTop: '0.3rem' }}>
                    {filteredSummary.rezagadosSentados.toLocaleString()} <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>/ {filteredSummary.rezagadosConfirmados}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#8b5cf6', marginTop: '0.2rem', fontWeight: 700 }}>
                    {filteredSummary.tasaRezagados}% efectividad rezagados
                  </div>
                </div>

                {/* 5. No-Shows (Fuga) */}
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <UserX size={13} color="#ef4444" />
                    NO-SHOWS (FUGA)
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444', marginTop: '0.3rem' }}>
                    {filteredSummary.noShows.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '0.2rem' }}>
                    Confirmaron pero no asistieron
                  </div>
                </div>
              </div>

              {/* Barra de Filtros */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: 'rgba(15, 23, 42, 0.45)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {/* Selector Sede */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={14} color="#ffc107" />
                    <select
                      value={selectedSede}
                      onChange={(e) => setSelectedSede(e.target.value)}
                      style={{
                        background: '#1e293b',
                        color: '#f8fafc',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        padding: '0.35rem 0.6rem',
                        fontSize: '0.8rem'
                      }}
                    >
                      <option value="TODAS">Todas las Sedes ({sedesList.length})</option>
                      {sedesList.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Selector Etapa */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Layers size={14} color="#38bdf8" />
                    <select
                      value={selectedStage}
                      onChange={(e) => setSelectedStage(e.target.value)}
                      style={{
                        background: '#1e293b',
                        color: '#f8fafc',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        padding: '0.35rem 0.6rem',
                        fontSize: '0.8rem'
                      }}
                    >
                      <option value="TODAS">C1 & C2 (Todas)</option>
                      <option value="C1">Capítulo 1 (C1)</option>
                      <option value="C2">Capítulo 2 (C2)</option>
                    </select>
                  </div>
                </div>

                {/* Búsqueda */}
                <div style={{ position: 'relative', minWidth: '220px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="text"
                    placeholder="Buscar equipo o sede..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      background: '#1e293b',
                      color: '#f8fafc',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      padding: '0.35rem 0.6rem 0.35rem 2rem',
                      fontSize: '0.8rem',
                      width: '100%'
                    }}
                  />
                </div>
              </div>

              {/* Tabla Detallada de Conciliación */}
              <div style={{
                overflowX: 'auto',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(15, 23, 42, 0.5)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(30, 41, 59, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#94a3b8' }}>Sede & Etapa</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#f8fafc' }}>Equipo</th>
                      <th style={{ padding: '0.75rem 0.8rem', textAlign: 'right', color: '#94a3b8' }}>Padrón</th>
                      <th style={{ padding: '0.75rem 0.8rem', textAlign: 'right', color: '#38bdf8' }}>Confirmados</th>
                      <th style={{ padding: '0.75rem 0.8rem', textAlign: 'right', color: '#10b981' }}>Sentados</th>
                      <th style={{ padding: '0.75rem 0.8rem', textAlign: 'center', color: '#10b981' }}>% Asist.</th>
                      <th style={{ padding: '0.75rem 0.8rem', textAlign: 'center', color: '#f59e0b' }}>Nuevos (S/C)</th>
                      <th style={{ padding: '0.75rem 0.8rem', textAlign: 'center', color: '#8b5cf6' }}>Rezagados (S/C)</th>
                      <th style={{ padding: '0.75rem 0.8rem', textAlign: 'right', color: '#ef4444' }}>No-Shows</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEquipos.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                          No se encontraron equipos con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      filteredEquipos.map((eq, idx) => {
                        const m = eq.metricas || {};
                        const n = m.nuevos || {};
                        const r = m.rezagados || {};
                        const isExpanded = expandedTeam === eq.equipoId;

                        return (
                          <React.Fragment key={eq.equipoId || idx}>
                            <tr
                              onClick={() => setExpandedTeam(isExpanded ? null : eq.equipoId)}
                              style={{
                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                cursor: 'pointer',
                                background: isExpanded ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                                transition: 'background 0.15s ease'
                              }}
                            >
                              {/* Sede & Etapa */}
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                  <MapPin size={12} color="#ffc107" />
                                  <span style={{ fontWeight: 600 }}>{eq.sede}</span>
                                  <span style={{
                                    fontSize: '0.65rem',
                                    padding: '0.1rem 0.35rem',
                                    borderRadius: '4px',
                                    background: eq.stage === 'C2' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                    color: eq.stage === 'C2' ? '#a78bfa' : '#fbbf24',
                                    fontWeight: 700
                                  }}>
                                    {eq.stage}
                                  </span>
                                </div>
                              </td>

                              {/* Equipo */}
                              <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#f8fafc' }}>
                                {eq.equipoNombre}
                              </td>

                              {/* Padrón */}
                              <td style={{ padding: '0.75rem 0.8rem', textAlign: 'right', color: '#94a3b8' }}>
                                {m.totalAsignados?.toLocaleString() || 0}
                              </td>

                              {/* Confirmados */}
                              <td style={{ padding: '0.75rem 0.8rem', textAlign: 'right', color: '#38bdf8', fontWeight: 700 }}>
                                {m.totalConfirmados?.toLocaleString() || 0}
                              </td>

                              {/* Sentados */}
                              <td style={{ padding: '0.75rem 0.8rem', textAlign: 'right', color: '#10b981', fontWeight: 800 }}>
                                {m.totalSentados?.toLocaleString() || 0}
                              </td>

                              {/* % Asistencia */}
                              <td style={{ padding: '0.75rem 0.8rem', textAlign: 'center' }}>
                                <span style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '6px',
                                  background: m.tasaAsistenciaGeneral >= 80 ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                                  color: m.tasaAsistenciaGeneral >= 80 ? '#10b981' : '#f87171',
                                  fontWeight: 800,
                                  fontSize: '0.78rem'
                                }}>
                                  {m.tasaAsistenciaGeneral}%
                                </span>
                              </td>

                              {/* Nuevos (S/C) */}
                              <td style={{ padding: '0.75rem 0.8rem', textAlign: 'center', color: '#fbbf24' }}>
                                <span style={{ fontWeight: 700 }}>{n.sentados || 0}</span> / {n.confirmados || 0}
                                <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginLeft: '0.3rem' }}>
                                  ({n.tasaAsistencia || 0}%)
                                </span>
                              </td>

                              {/* Rezagados (S/C) */}
                              <td style={{ padding: '0.75rem 0.8rem', textAlign: 'center', color: '#a78bfa' }}>
                                <span style={{ fontWeight: 700 }}>{r.sentados || 0}</span> / {r.confirmados || 0}
                                <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginLeft: '0.3rem' }}>
                                  ({r.tasaAsistencia || 0}%)
                                </span>
                              </td>

                              {/* No-Shows */}
                              <td style={{ padding: '0.75rem 0.8rem', textAlign: 'right', color: '#ef4444', fontWeight: 700 }}>
                                {m.totalNoShows || 0}
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.75rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: '#64748b'
        }}>
          <div>
            Fuente Certificada: <code>nodus_auditoria_sentados_confirmados/latest_reconciliation</code> • Auditoría en Caja Negra
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              padding: '0.4rem 1rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
