import React, { useEffect } from 'react';
import { Zap, Sparkles, X, CheckCircle2, Award } from 'lucide-react';

/**
 * TaskCompletionChoiceModal
 * Permite al usuario decidir en 1 clic si desea compartir su experiencia de aprendizaje
 * o simplemente completar la tarea a máxima velocidad sin cuestionarios ni interrupciones.
 */
export default function TaskCompletionChoiceModal({
  isOpen,
  task,
  onCompleteOnly,
  onShareExperience,
  onClose
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        // Por defecto, Enter completa rápidamente la tarea
        onCompleteOnly();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCompleteOnly, onClose]);

  if (!isOpen || !task) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10500,
        padding: '1rem',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '520px',
          width: '100%',
          background: 'var(--bg-glass-heavy, #0c1527)',
          border: '1px solid var(--crear-gold, #ffb703)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(255, 183, 3, 0.2)',
          borderRadius: '16px',
          padding: '1.8rem',
          position: 'relative',
          color: 'var(--text-main, #ffffff)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* BOTÓN CERRAR */}
        <button
          onClick={onClose}
          type="button"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted, #94a3b8)',
            cursor: 'pointer',
            padding: '0.4rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Cancelar (Esc)"
        >
          <X size={18} />
        </button>

        {/* CABECERA CON INSIGNIA DE LOGRO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.2rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(255, 183, 3, 0.2), rgba(16, 185, 129, 0.2))',
              border: '1px solid rgba(255, 183, 3, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--crear-gold, #ffb703)'
            }}
          >
            <Award size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.15)',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}
              >
                ✓ Tarea Lista Para Completar
              </span>
            </div>
            <h3
              style={{
                margin: '0.2rem 0 0 0',
                fontSize: '1.15rem',
                fontWeight: 800,
                color: 'var(--text-heading, #ffffff)'
              }}
            >
              ¿Cómo deseas finalizarla?
            </h3>
          </div>
        </div>

        {/* TÍTULO DE LA TAREA */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            marginBottom: '1.4rem'
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--text-main, #f8f9fa)',
              lineHeight: 1.4
            }}
          >
            {task.task || task.title || task.name}
          </p>
          {task.priority && (
            <span
              style={{
                display: 'inline-block',
                marginTop: '0.4rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--crear-gold, #ffb703)'
              }}
            >
              Prioridad: {task.priority}
            </span>
          )}
        </div>

        {/* BOTONES DE DECISIÓN DE ALTA VELOCIDAD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {/* OPCIÓN 1: SOLO COMPLETAR TAREA (VELOCIDAD MÁXIMA / RECOMENDADO) */}
          <button
            type="button"
            onClick={onCompleteOnly}
            style={{
              width: '100%',
              padding: '0.95rem 1.2rem',
              borderRadius: '12px',
              border: '1px solid rgba(16, 185, 129, 0.5)',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.35))',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.25)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.25)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left' }}>
              <div
                style={{
                  background: '#10b981',
                  color: '#000',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900
                }}
              >
                <Zap size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.96rem', letterSpacing: '0.2px' }}>
                  ⚡ Solo Completar Tarea
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                  Finalización inmediata en 1 clic (Presiona Enter)
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '3px 8px',
                borderRadius: '8px',
                color: '#6ee7b7'
              }}
            >
              MÁS RÁPIDO
            </span>
          </button>

          {/* OPCIÓN 2: SÍ, COMPARTIR EXPERIENCIA / APRENDIZAJE */}
          <button
            type="button"
            onClick={onShareExperience}
            style={{
              width: '100%',
              padding: '0.9rem 1.2rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 183, 3, 0.4)',
              background: 'linear-gradient(135deg, rgba(255, 183, 3, 0.08), rgba(41, 171, 226, 0.08))',
              color: 'var(--text-main, #ffffff)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = 'var(--crear-gold, #ffb703)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(255, 183, 3, 0.4)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left' }}>
              <div
                style={{
                  background: 'rgba(255, 183, 3, 0.2)',
                  color: 'var(--crear-gold, #ffb703)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Sparkles size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.94rem' }}>
                  ✨ Compartir mi Experiencia
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)' }}>
                  Registrar qué funcionó o aprendizaje para el equipo
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                background: 'rgba(255, 183, 3, 0.15)',
                color: 'var(--crear-gold, #ffb703)',
                padding: '3px 8px',
                borderRadius: '8px'
              }}
            >
              +50 XP
            </span>
          </button>
        </div>

        {/* PIE DE PÁGINA CON CANCELAR */}
        <div style={{ marginTop: '1.2rem', textAlign: 'center' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Cancelar (mantener pendiente)
          </button>
        </div>
      </div>
    </div>
  );
}
