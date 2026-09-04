import React, { useState, useMemo } from 'react';
import { ArrowLeft, BarChart2, Users, TrendingUp, AlertTriangle, ShieldCheck, Download, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../context/UIContext';
import kpisData from '../data/kpisLima.json';

export default function DashboardKpisLima() {
  const navigate = useNavigate();
  const { showToast } = useUI();
  
  const [selectedEquipo, setSelectedEquipo] = useState('ALL');
  const [selectedCoordinadora, setSelectedCoordinadora] = useState('ALL');
  
  const equiposData = kpisData.equipos;
  const coordinadorasData = kpisData.coordinadoras;

  const equiposOptions = ['ALL', ...Array.from(new Set(equiposData.map(e => e.Equipo)))];
  const coordinadorasOptions = ['ALL', ...Array.from(new Set(coordinadorasData.map(c => c.Coordinadora)))];

  // Filtros combinados
  const filteredEquipos = useMemo(() => {
    return equiposData.filter(e => selectedEquipo === 'ALL' || e.Equipo === selectedEquipo);
  }, [selectedEquipo, equiposData]);

  const filteredCoordinadoras = useMemo(() => {
    return coordinadorasData.filter(c => 
      (selectedEquipo === 'ALL' || c.Equipo === selectedEquipo) &&
      (selectedCoordinadora === 'ALL' || c.Coordinadora === selectedCoordinadora)
    );
  }, [selectedEquipo, selectedCoordinadora, coordinadorasData]);

  // Agregados Ejecutivos
  const totalAsignados = filteredEquipos.reduce((acc, curr) => acc + curr.Asignados, 0);
  const totalSentados = filteredEquipos.reduce((acc, curr) => acc + curr.Sentados, 0);
  const efectividadGlobal = totalAsignados > 0 ? (totalSentados / totalAsignados) * 100 : 0;
  
  const totalDatosPendientes = filteredCoordinadoras.reduce((acc, curr) => acc + curr['Datos pendientes'], 0);
  const totalDesertores = filteredEquipos.reduce((acc, curr) => acc + curr['Desertores C1'] + curr['Desertores C2'], 0);

  const renderCard = (title, value, subtitle, icon, colorClass, highlight = false) => (
    <div className={`glass-panel p-4 ${highlight ? 'border-crear-cyan' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: highlight ? '4px solid var(--crear-cyan)' : '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{title}</span>
        {icon}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>
        {value}
      </div>
      <div className={colorClass} style={{ fontSize: '0.75rem', fontWeight: 600 }}>
        {subtitle}
      </div>
    </div>
  );

  return (
    <div className="page-container page-transition" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <button onClick={() => navigate('/')} className="btn-secondary" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            <ArrowLeft size={16} /> Volver al Inicio
          </button>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span className="badge badge-primary">Sede Lima</span>
            <span className="badge badge-success">Actualizado: {equiposData[0]['Última actualización']}</span>
          </div>
          <h1 style={{ fontSize: '2rem', margin: 0, background: 'linear-gradient(90deg, #fff, var(--crear-cyan))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Dashboard Directivo: Equipos y Coordinadoras
          </h1>
          <p className="text-muted" style={{ marginTop: '0.4rem', fontSize: '0.95rem' }}>
            Análisis de efectividad, enrolamiento y calidad de datos operacionales.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => showToast('Descargando reporte Excel...', 'success')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Exportar
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
          <Filter size={18} /> <span style={{ fontWeight: 600 }}>Filtros Globales:</span>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Equipo:</label>
          <select 
            value={selectedEquipo} 
            onChange={(e) => setSelectedEquipo(e.target.value)}
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: 'white', padding: '0.4rem', borderRadius: '6px', fontSize: '0.85rem' }}
          >
            {equiposOptions.map(opt => <option key={opt} value={opt}>{opt === 'ALL' ? 'Todos los Equipos' : opt}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Coordinadora:</label>
          <select 
            value={selectedCoordinadora} 
            onChange={(e) => setSelectedCoordinadora(e.target.value)}
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: 'white', padding: '0.4rem', borderRadius: '6px', fontSize: '0.85rem' }}
          >
            {coordinadorasOptions.map(opt => <option key={opt} value={opt}>{opt === 'ALL' ? 'Todas las Coordinadoras' : opt}</option>)}
          </select>
        </div>
      </div>

      {/* RESUMEN EJECUTIVO (KPIs) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {renderCard('Total Asignados', totalAsignados, 'Px en base de datos', <Users size={20} className="text-muted" />, 'text-muted')}
        {renderCard('Total Sentados', totalSentados, 'Px confirmados en sala', <ShieldCheck size={20} color="var(--crear-cyan)" />, 'text-cyan', true)}
        {renderCard('Efectividad Global', `${efectividadGlobal.toFixed(1)}%`, 'Tasa de conversión final', <TrendingUp size={20} color="var(--color-success)" />, 'text-success')}
        {renderCard('Alertas (Desertores)', totalDesertores, 'Px retirados C1/C2', <AlertTriangle size={20} color="var(--color-warning)" />, 'text-warning')}
        {renderCard('Datos Pendientes', totalDatosPendientes, 'Requieren validación', <BarChart2 size={20} color="var(--color-error)" />, 'text-error')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* TABLA DE EQUIPOS */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--crear-gold)' }}>Rendimiento por Equipos</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.8rem 1rem' }}>Equipo</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Asignados</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Confirmados</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Sentados</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Efectividad</th>
                </tr>
              </thead>
              <tbody>
                {filteredEquipos.map((eq, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.8rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>{eq.Equipo}</td>
                    <td style={{ padding: '0.8rem 1rem' }}>{eq.Asignados}</td>
                    <td style={{ padding: '0.8rem 1rem' }}>{eq.Confirmados}</td>
                    <td style={{ padding: '0.8rem 1rem', color: 'var(--crear-cyan)', fontWeight: 'bold' }}>{eq.Sentados}</td>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <span className="badge badge-outline" style={{ border: '1px solid var(--color-success)', color: 'var(--color-success)' }}>
                        {(eq.Efectividad * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredEquipos.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay datos para este filtro</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TABLA DE COORDINADORAS */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--crear-gold)' }}>Desglose por Coordinadora</h3>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: '400px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#0e1628', zIndex: 1 }}>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.8rem 1rem' }}>Coordinadora</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Equipo</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Sentados</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Aliados</th>
                  <th style={{ padding: '0.8rem 1rem' }}>P. Pendientes</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoordinadoras.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.8rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>{c.Coordinadora}</td>
                    <td style={{ padding: '0.8rem 1rem', fontSize: '0.85rem' }}>{c.Equipo}</td>
                    <td style={{ padding: '0.8rem 1rem', color: 'var(--crear-cyan)' }}>{c.Sentados}</td>
                    <td style={{ padding: '0.8rem 1rem' }}>{c.Aliados}</td>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      {c['Datos pendientes'] > 0 ? (
                        <span className="badge badge-error">{c['Datos pendientes']}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredCoordinadoras.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay datos para este filtro</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
