import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Leaf, LayoutTemplate } from 'lucide-react';

export default function ZenModeSelector() {
  const { zenMode, setZenMode, activeTheme } = useTheme();

  return (
    <div 
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: activeTheme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(12px)',
        border: activeTheme === 'light' ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '9999px',
        padding: '3px',
        gap: '2px',
        marginLeft: '10px',
        boxShadow: activeTheme === 'light' ? '0 2px 8px rgba(0, 0, 0, 0.05)' : '0 4px 15px rgba(0, 0, 0, 0.4)',
        transition: 'all 0.3s ease'
      }}
      title="Cambiar entre vista completa y Modo Zen (simplificado)"
    >
      <button
        type="button"
        onClick={() => setZenMode(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '5px 11px',
          borderRadius: '9999px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.5px',
          transition: 'all 0.25s',
          background: zenMode ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
          color: zenMode ? '#ffffff' : (activeTheme === 'light' ? '#64748b' : '#94a3b8'),
          boxShadow: zenMode ? '0 2px 10px rgba(16, 185, 129, 0.4)' : 'none'
        }}
      >
        <Leaf size={13} strokeWidth={2.5} />
        <span>ZEN</span>
      </button>

      <button
        type="button"
        onClick={() => setZenMode(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '5px 11px',
          borderRadius: '9999px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.5px',
          transition: 'all 0.25s',
          background: !zenMode ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
          color: !zenMode ? '#ffffff' : (activeTheme === 'light' ? '#64748b' : '#94a3b8'),
          boxShadow: !zenMode ? '0 2px 10px rgba(99, 102, 241, 0.4)' : 'none'
        }}
      >
        <LayoutTemplate size={13} strokeWidth={2.5} />
        <span>COMPLETO</span>
      </button>
    </div>
  );
}
