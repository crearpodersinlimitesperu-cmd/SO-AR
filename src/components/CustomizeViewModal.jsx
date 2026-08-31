import React from 'react';
import { useUI } from '../context/UIContext';
import { X, Check, Eye, EyeOff, LayoutTemplate, RotateCcw } from 'lucide-react';

export default function CustomizeViewModal({ isOpen, onClose }) {
  const { customModules, toggleCustomModule, setCustomModules, setViewMode } = useUI();

  if (!isOpen) return null;

  const modulesList = [
    { key: 'todayTasks', title: '📋 Tus Pendientes de Hoy', desc: 'Panel principal con tareas críticas, importantes y completadas' },
    { key: 'progress', title: '📊 Mi Progreso General', desc: 'Barra de porcentaje de cumplimiento en el ciclo' },
    { key: 'events', title: '📅 Eventos y Entrenamientos', desc: 'Filtros y lista de fechas de C1, C2, Maestría del Juego y Viajes' },
    { key: 'advancedTools', title: '🛠️ Barra de Herramientas Rápidas', desc: 'Botones superiores de Centro de Mando, KPIs y Calendario Global' },
    { key: 'shortcuts', title: '🚀 Atajos y Módulos del Sistema', desc: 'Accesos directos a Campus Interactivo, Asistente IA y Guías' },
  ];

  const resetToDefault = () => {
    setCustomModules({
      todayTasks: true,
      progress: true,
      events: true,
      shortcuts: true,
      advancedTools: true
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '1.8rem',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <LayoutTemplate color="var(--crear-gold)" size={22} />
            <h3 style={{ margin: 0, color: 'var(--crear-gold)', fontSize: '1.2rem' }}>Personalizar Vista</h3>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
          Elige exactamente qué paneles y módulos deseas ver en tu pantalla principal para mantener tu espacio de trabajo cómodo y sin distracciones.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.8rem' }}>
          {modulesList.map((m) => {
            const isVisible = customModules[m.key] !== false;
            return (
              <div 
                key={m.key}
                onClick={() => toggleCustomModule(m.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  background: isVisible ? 'rgba(41, 171, 226, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: isVisible ? '1px solid rgba(41, 171, 226, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', color: isVisible ? 'var(--text-heading)' : 'var(--text-muted)' }}>
                    {m.title}
                  </h4>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {m.desc}
                  </p>
                </div>
                <div style={{
                  width: '36px',
                  height: '22px',
                  borderRadius: '12px',
                  background: isVisible ? 'var(--crear-cyan)' : 'rgba(255,255,255,0.2)',
                  position: 'relative',
                  transition: 'background 0.2s'
                }}>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    position: 'absolute',
                    top: '2px',
                    left: isVisible ? '16px' : '2px',
                    transition: 'left 0.2s'
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            type="button" 
            onClick={resetToDefault}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem' }}
          >
            <RotateCcw size={14} /> Restaurar todo
          </button>
          <button 
            type="button" 
            onClick={onClose}
            className="btn-primary"
            style={{ fontSize: '0.85rem', padding: '0.5rem 1.2rem', fontWeight: 'bold' }}
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
