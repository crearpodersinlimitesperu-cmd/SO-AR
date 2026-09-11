import React, { useState } from 'react';
import { useUI } from '../context/UIContext';
import { useTheme } from '../context/ThemeContext';
import { Zap, LayoutGrid, Sliders, Settings2 } from 'lucide-react';
import CustomizeViewModal from './CustomizeViewModal';

export default function ViewModeSelector() {
  const { viewMode, setViewMode } = useUI();
  const { activeTheme } = useTheme();
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  const isLight = activeTheme === 'light';
  const isZen = activeTheme === 'zen';

  const pillBg = isLight 
    ? 'rgba(0, 0, 0, 0.05)' 
    : isZen 
      ? 'rgba(7, 21, 17, 0.8)' 
      : 'rgba(0, 0, 0, 0.4)';
  const pillBorder = isLight 
    ? '1px solid rgba(0, 0, 0, 0.12)' 
    : isZen 
      ? '1px solid rgba(52, 211, 153, 0.25)' 
      : '1px solid rgba(255, 255, 255, 0.15)';
  const inactiveColor = isLight 
    ? '#475569' 
    : isZen 
      ? '#a7f3d0' 
      : 'var(--text-muted, #94a3b8)';

  return (
    <>
      <div 
        className="view-mode-selector-pill"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: pillBg,
          border: pillBorder,
          borderRadius: '10px',
          padding: '3px',
          gap: '2px',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.3s ease'
        }}
      >
        <button
          type="button"
          onClick={() => setViewMode('lite')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '7px',
            border: 'none',
            fontSize: '0.78rem',
            fontWeight: viewMode === 'lite' ? '700' : '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: viewMode === 'lite' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'transparent',
            color: viewMode === 'lite' ? '#ffffff' : inactiveColor
          }}
          title="Modo Lite: Vista ultra limpia, solo tus tareas y checklist sin saturación de botones"
        >
          <Zap size={14} />
          <span>Lite</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('compact')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '7px',
            border: 'none',
            fontSize: '0.78rem',
            fontWeight: viewMode === 'compact' ? '700' : '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: viewMode === 'compact' ? 'linear-gradient(135deg, #29abe2, #0284c7)' : 'transparent',
            color: viewMode === 'compact' ? '#ffffff' : inactiveColor
          }}
          title="Modo Compacto: Vista equilibrada con herramientas organizadas en menú inteligente"
        >
          <LayoutGrid size={14} />
          <span>Compacto</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('pro')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '7px',
            border: 'none',
            fontSize: '0.78rem',
            fontWeight: viewMode === 'pro' ? '700' : '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: viewMode === 'pro' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
            color: viewMode === 'pro' ? '#ffffff' : inactiveColor
          }}
          title="Modo Pro: Todos los paneles y herramientas avanzadas visibles"
        >
          <Sliders size={14} />
          <span>Pro</span>
        </button>

        {viewMode === 'pro' && (
          <button
            type="button"
            onClick={() => setShowCustomizeModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 8px',
              borderRadius: '7px',
              border: 'none',
              fontSize: '0.78rem',
              cursor: 'pointer',
              background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255, 255, 255, 0.08)',
              color: 'var(--crear-gold)'
            }}
            title="Personalizar qué módulos mostrar u ocultar"
          >
            <Settings2 size={14} />
          </button>
        )}
      </div>

      {showCustomizeModal && (
        <CustomizeViewModal 
          isOpen={showCustomizeModal} 
          onClose={() => setShowCustomizeModal(false)} 
        />
      )}
    </>
  );
}

