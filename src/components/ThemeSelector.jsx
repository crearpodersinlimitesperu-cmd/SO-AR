import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Sparkles } from 'lucide-react';

export default function ThemeSelector({ compact = false }) {
  const { themeMode, setThemeMode, activeTheme } = useTheme();

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
        boxShadow: activeTheme === 'light' ? '0 2px 8px rgba(0, 0, 0, 0.05)' : '0 4px 15px rgba(0, 0, 0, 0.4)',
        transition: 'all 0.3s ease'
      }}
      title={`Modo actual: ${themeMode === 'auto' ? `Automático (${activeTheme === 'light' ? '☀️ Día' : '🌙 Noche'})` : themeMode === 'light' ? '☀️ Día' : '🌙 Noche'}`}
    >
      {/* BOTÓN DÍA */}
      <button
        type="button"
        onClick={() => setThemeMode('light')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: compact ? '4px 8px' : '5px 11px',
          borderRadius: '9999px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.5px',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          background: themeMode === 'light' 
            ? 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)' 
            : 'transparent',
          color: themeMode === 'light' 
            ? '#ffffff' 
            : (activeTheme === 'light' ? '#64748b' : '#94a3b8'),
          boxShadow: themeMode === 'light' ? '0 2px 10px rgba(245, 158, 11, 0.4)' : 'none'
        }}
      >
        <Sun size={13} strokeWidth={2.5} />
        {!compact && <span>DÍA</span>}
      </button>

      {/* BOTÓN NOCHE */}
      <button
        type="button"
        onClick={() => setThemeMode('dark')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: compact ? '4px 8px' : '5px 11px',
          borderRadius: '9999px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.5px',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          background: themeMode === 'dark' 
            ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' 
            : 'transparent',
          color: themeMode === 'dark' 
            ? '#ffffff' 
            : (activeTheme === 'light' ? '#64748b' : '#94a3b8'),
          boxShadow: themeMode === 'dark' ? '0 2px 10px rgba(59, 130, 246, 0.4)' : 'none'
        }}
      >
        <Moon size={13} strokeWidth={2.5} />
        {!compact && <span>NOCHE</span>}
      </button>

      {/* BOTÓN AUTOMÁTICO */}
      <button
        type="button"
        onClick={() => setThemeMode('auto')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: compact ? '4px 8px' : '5px 11px',
          borderRadius: '9999px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.5px',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          background: themeMode === 'auto' 
            ? 'linear-gradient(135deg, #00d2ff 0%, #8b5cf6 100%)' 
            : 'transparent',
          color: themeMode === 'auto' 
            ? '#030712' 
            : (activeTheme === 'light' ? '#64748b' : '#94a3b8'),
          boxShadow: themeMode === 'auto' ? '0 2px 10px rgba(0, 210, 255, 0.4)' : 'none'
        }}
      >
        <Sparkles size={13} strokeWidth={2.5} />
        {!compact && <span>AUTO</span>}
      </button>
    </div>
  );
}
