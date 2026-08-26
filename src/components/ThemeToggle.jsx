import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function ThemeToggle() {
  const { themeMode, setThemeMode } = useTheme();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--bg-card)', padding: '0.3rem', borderRadius: '24px', border: '1px solid var(--border-subtle)' }}>
      <button
        onClick={() => setThemeMode('light')}
        style={{
          background: themeMode === 'light' ? 'var(--crear-gold)' : 'transparent',
          color: themeMode === 'light' ? '#000' : 'var(--text-muted)',
          border: 'none',
          padding: '0.4rem',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s'
        }}
        title="Modo Día"
      >
        <Sun size={16} />
      </button>
      <button
        onClick={() => setThemeMode('dark')}
        style={{
          background: themeMode === 'dark' ? 'var(--crear-cyan)' : 'transparent',
          color: themeMode === 'dark' ? '#000' : 'var(--text-muted)',
          border: 'none',
          padding: '0.4rem',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s'
        }}
        title="Modo Noche"
      >
        <Moon size={16} />
      </button>
      <button
        onClick={() => setThemeMode('auto')}
        style={{
          background: themeMode === 'auto' ? 'rgba(128,128,128,0.2)' : 'transparent',
          color: themeMode === 'auto' ? 'var(--text-heading)' : 'var(--text-muted)',
          border: 'none',
          padding: '0.4rem',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s'
        }}
        title="Modo Sistema (Automático)"
      >
        <Monitor size={16} />
      </button>
    </div>
  );
}
