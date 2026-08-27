import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ComposedChart, Area
} from 'recharts';
import { Target, Users, AlertTriangle, Activity } from 'lucide-react';
import DataJSON from '../data/SEGUIMIENTO_EQUIPOS.json';

export default function CMJDashboard({ globalFilterSede }) {
  const [activeSede, setActiveSede] = useState('CDMX');
  const [processedData, setProcessedData] = useState({});

  // Sync internal Sede with Global Sede if provided and valid
  useEffect(() => {
    if (!globalFilterSede || globalFilterSede === 'Todas' || globalFilterSede === 'Global') return;
    const normalized = globalFilterSede === 'GYE' ? 'GUAYAQUIL' : globalFilterSede.toUpperCase();
    if (processedData[normalized]) {
      setActiveSede(normalized);
    }
  }, [globalFilterSede, processedData]);

  useEffect(() => {
    try {
      const sheet = DataJSON.Hoja1 || [];
      const sedesData = {};

      // Parse the JSON data structure from the Excel and aggregate by Sede
      sheet.forEach((row, index) => {
        if (index > 0) { // Skip header row
          const sedeName = (row['MAESTRIA DEL JUEGO '] || '').trim();
          if (sedeName && !sedeName.includes('SEDE')) {
            const cmjName = row['COORDINADOR MAESTRIA DEL JUEGO'] || 'Sin Asignar';
            
            if (!sedesData[sedeName]) {
              sedesData[sedeName] = {
                cmj: new Set([cmjName]),
                metrics: {
                  enrolamientoC1: 0,
                  terminanC1: 0,
                  paganC2: 0,
                  inicianC2: 0,
                  terminanC2: 0,
                  pagosMJ: 0,
                  managersDeclarados: 0,
                  pxInicioMJ: 0,
                  managersInicioMJ: 0,
                  pxFinalMJ: 0,
                  managersFinalMJ: 0,
                  desercionPx: 0,
                  desercionMg: 0,
                  totalEnrolamiento: 0,
                  equipos: 0,
                }
              };
            }
            
            const s = sedesData[sedeName];
            if (cmjName !== 'Sin Asignar') s.cmj.add(cmjName);
            
            s.metrics.equipos += 1;
            s.metrics.enrolamientoC1 += Number(row['CAPITULO UNO']) || 0;
            s.metrics.terminanC1 += Number(row['__EMPTY_2']) || 0;
            s.metrics.paganC2 += Number(row['__EMPTY_3']) || 0;
            s.metrics.inicianC2 += Number(row['__EMPTY_5']) || 0;
            s.metrics.terminanC2 += Number(row['C2 A CREACION']) || 0;
            s.metrics.pagosMJ += Number(row['__EMPTY_6']) || 0;
            s.metrics.managersDeclarados += Number(row['__EMPTY_8']) || 0;
            s.metrics.pxInicioMJ += Number(row['__EMPTY_11']) || 0;
            s.metrics.managersInicioMJ += Number(row['__EMPTY_12']) || 0;
            s.metrics.pxFinalMJ += Number(row['__EMPTY_13']) || 0;
            s.metrics.managersFinalMJ += Number(row['__EMPTY_14']) || 0;
            s.metrics.desercionPx += Number(row['__EMPTY_15']) || 0;
            s.metrics.desercionMg += Number(row['__EMPTY_16']) || 0;
            s.metrics.totalEnrolamiento += Number(row['__EMPTY_19']) || 0;
          }
        }
      });
      
      // Post-process to calculate charts and formats
      Object.keys(sedesData).forEach(sede => {
        const s = sedesData[sede];
        s.cmj = Array.from(s.cmj).join(', ') || 'Sin Asignar';
        s.metrics.tasaDesercionTotal = s.metrics.pxInicioMJ > 0 ? (s.metrics.desercionPx / s.metrics.pxInicioMJ) : 0;
        
        s.chartData = [
          { name: 'C1', Enrolados: s.metrics.enrolamientoC1, Terminaron: s.metrics.terminanC1 },
          { name: 'C2', Enrolados: s.metrics.inicianC2, Terminaron: s.metrics.terminanC2 },
          { name: 'MJ', Enrolados: s.metrics.pxInicioMJ, Terminaron: s.metrics.pxFinalMJ },
        ];
        
        s.funnelData = [
          { step: 'C1 (Inician)', value: s.metrics.enrolamientoC1 },
          { step: 'C2 (Pagan)', value: s.metrics.paganC2 },
          { step: 'MJ (Inician)', value: s.metrics.pxInicioMJ },
          { step: 'MJ (Gradúan)', value: s.metrics.pxFinalMJ }
        ];
      });
      
      setProcessedData(sedesData);
      
      // Select first available sede if active isn't found
      const availableSedes = Object.keys(sedesData);
      if (availableSedes.length > 0 && !availableSedes.includes(activeSede)) {
        setActiveSede(availableSedes[0]);
      }
    } catch (err) {
      console.error("Error processing CMJ data", err);
    }
  }, []);

  const sedesList = Object.keys(processedData);
  const currentData = processedData[activeSede];

  if (!currentData) return <div style={{ padding: '1rem', color: '#fff' }}>Cargando datos CMJ...</div>;

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-subtle)', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Target size={24} style={{ color: 'var(--crear-gold)' }} />
          <h3 style={{ margin: 0, color: 'var(--text-heading)', fontSize: '1.2rem' }}>
            Panel CMJ (Coordinadores Maestría del Juego)
          </h3>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {sedesList.map(sede => (
            <button
              key={sede}
              onClick={() => setActiveSede(sede)}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '20px',
                border: activeSede === sede ? '1px solid var(--crear-gold)' : '1px solid var(--border-subtle)',
                background: activeSede === sede ? 'rgba(212, 175, 55, 0.15)' : 'rgba(0,0,0,0.2)',
                color: activeSede === sede ? 'var(--crear-gold)' : 'var(--text-muted)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {sede}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Users size={14} /> CMJ Asignado
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{currentData.cmj}</div>
        </div>
        
        <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <div style={{ fontSize: '0.8rem', color: '#10b981', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Activity size={14} /> Retención MJ (PX)
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff' }}>
            {currentData.metrics.pxFinalMJ} <span style={{ fontSize: '1rem', color: '#10b981', fontWeight: 500 }}>/ {currentData.metrics.pxInicioMJ}</span>
          </div>
        </div>

        <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <div style={{ fontSize: '0.8rem', color: '#3b82f6', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Users size={14} /> Enrolamiento Total
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff' }}>
            {currentData.metrics.totalEnrolamiento}
          </div>
        </div>

        <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <div style={{ fontSize: '0.8rem', color: '#ef4444', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <AlertTriangle size={14} /> Deserción % (Global)
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff' }}>
            {typeof currentData.metrics.tasaDesercionTotal === 'number' 
              ? (currentData.metrics.tasaDesercionTotal * 100).toFixed(1) + '%' 
              : currentData.metrics.tasaDesercionTotal}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
          <h4 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', marginTop: 0, textAlign: 'center' }}>
            Supervivencia de Entrenamientos (Inician vs Terminaron)
          </h4>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentData.chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '0.8rem' }} />
                <Bar dataKey="Enrolados" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="Terminaron" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
          <h4 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', marginTop: 0, textAlign: 'center' }}>
            Funnel de Retención C1  Y" MJ
          </h4>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={currentData.funnelData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="step" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10 }} />
                <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="value" fill="url(#colorFunnel)" stroke="#d4af37" />
                <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: '#f59e0b', strokeWidth: 0 }} />
                <defs>
                  <linearGradient id="colorFunnel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4af37" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
