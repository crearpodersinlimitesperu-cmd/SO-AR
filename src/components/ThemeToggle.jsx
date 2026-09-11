import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Leaf, Sparkles } from 'lucide-react';

export default function ThemeToggle() {
  const { themeMode, setThemeMode, activeTheme } = useTheme();

  return (
    <div 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.2rem', 
        background: activeTheme === 'light' 
          ? 'rgba(0, 0, 0, 0.06)' 
          : activeTheme === 'zen'
            ? 'rgba(16, 185, 129, 0.1)'
            : 'rgba(255, 255, 255, 0.06)', 
        backdropFilter: 'blur(12px)',
        padding: '0.25rem', 
        borderRadius: '24px', 
        border: activeTheme === 'light' 
          ? '1px solid rgba(0, 0, 0, 0.12)' 
          : activeTheme === 'zen'
            ? '1px solid rgba(52, 211, 153, 0.25)'
            : '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: activeTheme === 'light' 
          ? '0 2px 8px rgba(0, 0, 0, 0.05)' 
          : activeTheme === 'zen'
            ? '0 2px 10px rgba(16, 185, 129, 0.2)'
            : '0 4px 12px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.3s ease'
      }}
      title={`Tema actual: ${themeMode === 'auto' ? `Automático (${activeTheme === 'light' ? '☀️ Día' : activeTheme === 'zen' ? '🌿 Zen' : '🌙 Noche'})` : themeMode === 'light' ? '☀️ Día' : themeMode === 'zen' ? '🌿 Zen' : '🌙 Noche'}`}
    >
      {/* ☀️ MODO DÍA */}
      <button
        type="button"
        onClick={() => setThemeMode('light')}
        style={{
          background: themeMode === 'light' 
            ? 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)' 
            : 'transparent',
          color: themeMode === 'light' 
            ? '#ffffff' 
            : (activeTheme === 'light' ? '#64748b' : '#94a3b8'),
          border: 'none',
          padding: '0.4rem',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          boxShadow: themeMode === 'light' ? '0 2px 8px rgba(245, 158, 11, 0.4)' : 'none'
        }}
        title="Modo Día (Luminoso, Alto Contraste)"
      >
        <Sun size={15} strokeWidth={2.3} />
      </button>

      {/* 🌙 MODO NOCHE */}
      <button
        type="button"
        onClick={() => setThemeMode('dark')}
        style={{
          background: themeMode === 'dark' 
            ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' 
            : 'transparent',
          color: themeMode === 'dark' 
            ? '#ffffff' 
            : (activeTheme === 'light' ? '#64748b' : '#94a3b8'),
          border: 'none',
          padding: '0.4rem',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          boxShadow: themeMode === 'dark' ? '0 2px 8px rgba(59, 130, 246, 0.4)' : 'none'
        }}
        title="Modo Noche (Oscuro Clásico)"
      >
        <Moon size={15} strokeWidth={2.3} />
      </button>

      {/* 🌿 MODO ZEN */}
      <button
        type="button"
        onClick={() => setThemeMode('zen')}
        style={{
          background: themeMode === 'zen' 
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
            : 'transparent',
          color: themeMode === 'zen' 
            ? '#ffffff' 
            : (activeTheme === 'light' ? '#64748b' : '#94a3b8'),
          border: 'none',
          padding: '0.4rem',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          boxShadow: themeMode === 'zen' ? '0 2px 10px rgba(16, 185, 129, 0.45)' : 'none'
        }}
        title="Modo Zen (Verde Botánico, Sereno y Minimalista)"
      >
        <Leaf size={15} strokeWidth={2.3} />
      </button>

      {/* ✨ MODO AUTOMÁTICO */}
      <button
        type="button"
        onClick={() => setThemeMode('auto')}
        style={{
          background: themeMode === 'auto' 
            ? 'linear-gradient(135deg, #00d2ff 0%, #8b5cf6 100%)' 
            : 'transparent',
          color: themeMode === 'auto' 
            ? '#ffffff' 
            : (activeTheme === 'light' ? '#64748b' : '#94a3b8'),
          border: 'none',
          padding: '0.4rem',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          boxShadow: themeMode === 'auto' ? '0 2px 8px rgba(139, 92, 246, 0.4)' : 'none'
        }}
        title={`Modo Automático (Horario Solar: ${activeTheme === 'light' ? '☀️ Día' : activeTheme === 'zen' ? '🌿 Zen' : '🌙 Noche'})`}
      >
        <Sparkles size={15} strokeWidth={2.3} />
      </button>
    </div>
  );
}
