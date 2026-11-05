import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  ExternalLink,
  BookOpen,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';
import NodusLiveModulesDashboard from '../components/NodusLiveModulesDashboard';

export default function ContrasteNodusSheets() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Contraste Nodus vs Sheets · CREAR Poder Sin Límites';
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'shortcut icon';
    link.href = '/logo-crear.png';
    document.getElementsByTagName('head')[0].appendChild(link);
  }, []);

  return (
    <div style={{ padding: '1.5rem 2rem 4rem 2rem', maxWidth: '1600px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Barra superior de navegación y contexto */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate('/home')}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
          >
            <ArrowLeft size={16} /> Inicio
          </button>
          <button
            onClick={() => navigate('/superadmin')}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
          >
            <ShieldCheck size={16} /> Centro de Mando
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/guia-aliados-c1')}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', borderColor: '#38bdf8' }}
          >
            <BookOpen size={14} color="#38bdf8" /> Guía Aliados C1
          </button>
          <a
            href="/aliados-c2/"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', borderColor: '#fbbf24' }}
          >
            <ExternalLink size={14} color="#fbbf24" /> Portal Aliados C2
          </a>
        </div>
      </div>

      {/* Encabezado del Módulo */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem 1.75rem',
          marginBottom: '1.75rem',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(15, 23, 42, 0.85))',
          borderRadius: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.75rem' }}>📊</span>
          <span
            style={{
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
              background: 'rgba(16, 185, 129, 0.25)',
              color: '#34d399',
              border: '1px solid rgba(52, 211, 153, 0.4)',
            }}
          >
            MÓDULO OFICIAL INDEPENDIENTE
          </span>
          <span
            style={{
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
            }}
          >
            NODUS LIVE + GOOGLE SHEETS
          </span>
        </div>

        <h1 style={{ margin: '0.25rem 0 0.5rem 0', fontSize: '1.65rem', fontWeight: 900, color: '#f8fafc' }}>
          Contraste Multiequipo: Nodus vs. Hoja Oficial QT & Aliados
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.5, maxWidth: '1100px' }}>
          Auditoría de consistencia en tiempo real entre la base de Nodus (<code>/aliados?id_equipo=ID</code>) y la Hoja
          Oficial de QT & Aliados (Google Sheets). Incluye desglose por equipo, PX iniciales vs fin, desertores, declaraciones C2,
          pagos totales C2+MJ y la <strong>Matriz Histórica de Graduados (E4–E39 y Staff Elite)</strong>.
        </p>
      </div>

      {/* Render del Tablero Completo de Contraste */}
      <NodusLiveModulesDashboard />
    </div>
  );
}
