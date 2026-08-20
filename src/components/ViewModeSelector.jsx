import React, { useState } from 'react';
import { useUI } from '../context/UIContext';
import { Zap, LayoutGrid, Sliders, Settings2 } from 'lucide-react';
import CustomizeViewModal from './CustomizeViewModal';

export default function ViewModeSelector() {
  const { viewMode, setViewMode } = useUI();
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  return (
    <>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '10px',
        padding: '3px',
        gap: '2px',
        backdropFilter: 'blur(8px)'
      }}>
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
            color: viewMode === 'lite' ? '#ffffff' : 'var(--text-muted)'
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
            color: viewMode === 'compact' ? '#ffffff' : 'var(--text-muted)'
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
            color: viewMode === 'pro' ? '#ffffff' : 'var(--text-muted)'
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
              background: 'rgba(255, 255, 255, 0.08)',
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
