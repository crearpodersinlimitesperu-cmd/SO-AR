import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, X, MapPin, User, ArrowLeft, AlertCircle, ShieldCheck } from 'lucide-react';
import { normalizeSede, ROLE_DISPLAY_NAMES, ROLE_COLORS, normalizeRole } from '../data/usersData';

/**
 * ForeignTaskWarningModal
 * Modal de advertencia de gobernanza cuando un usuario intenta completar
 * una tarea que pertenece a otra sede y no le fue asignada ni fue creada por él.
 */
export default function ForeignTaskWarningModal({
  isOpen,
  task,
  currentUser,
  onClose,
  onForceComplete = null
}) {
  const [showAdminConfirm, setShowAdminConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowAdminConfirm(false);
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  const isSuperAdmin = Boolean(currentUser?.isSuperAdmin);
  const taskSede = task.assignedSede || task.sede || 'Otra Sede';
  const userSede = currentUser?.sede || 'Global';
  const assignerName = task.assignedByName || (task.createdBy ? task.createdBy.split('@')[0] : 'Responsable de Sede');
  const roleName = ROLE_DISPLAY_NAMES[normalizeRole(task.role)] || task.role || 'Rol Operativo';
  
  // Destinatarios asignados
  const assignedList = Array.isArray(task.assignedToEmails) && task.assignedToEmails.length > 0 
    ? task.assignedToEmails.join(', ') 
    : (task.assignedToEmail || `Equipo Operativo de ${taskSede}`);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 11000,
        padding: '1rem',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '540px',
          width: '100%',
          background: 'var(--bg-glass-heavy, #0c1527)',
          border: '1px solid rgba(239, 68, 68, 0.45)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(239, 68, 68, 0.15)',
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
          title="Cerrar (Esc)"
        >
          <X size={18} />
        </button>

        {/* CABECERA CON ALERTA DE GOBERNANZA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.2rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.18)',
              border: '1px solid rgba(239, 68, 68, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              flexShrink: 0
            }}
          >
            <ShieldAlert size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  color: '#ef4444',
                  background: 'rgba(239, 68, 68, 0.15)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                🔒 Control de Sede & Gobernanza
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#f59e0b',
                  background: 'rgba(245, 158, 11, 0.15)',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}
              >
                📍 Sede {taskSede}
              </span>
            </div>
            <h3
              style={{
                margin: '0.3rem 0 0 0',
                fontSize: '1.2rem',
                fontWeight: 800,
                color: '#ffffff'
              }}
            >
              ⚠️ Tarea de Otra Sede
            </h3>
          </div>
        </div>

        {/* DETALLE DE LA TAREA */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.2rem'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginBottom: '0.3rem', textTransform: 'uppercase', fontWeight: 700 }}>
            Tarea seleccionada:
          </div>
          <p
            style={{
              margin: '0 0 0.8rem 0',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.4
            }}
          >
            {task.task || task.title}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem', fontSize: '0.8rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.5rem 0.7rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'var(--text-muted, #94a3b8)', display: 'block', fontSize: '0.7rem' }}>📍 Sede de la Tarea:</span>
              <strong style={{ color: '#f59e0b' }}>{taskSede}</strong> <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>(Tu sede: {userSede})</span>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.5rem 0.7rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'var(--text-muted, #94a3b8)', display: 'block', fontSize: '0.7rem' }}>👤 Creada / Asignada por:</span>
              <strong style={{ color: '#ffffff' }}>{assignerName}</strong>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.5rem 0.7rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', gridColumn: '1 / -1' }}>
              <span style={{ color: 'var(--text-muted, #94a3b8)', display: 'block', fontSize: '0.7rem' }}>🎯 Responsables Asignados:</span>
              <span style={{ color: '#cbd5e1' }}>{assignedList}</span>
            </div>
          </div>
        </div>

        {/* MOTIVO DE ADVERTENCIA */}
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            borderLeft: '4px solid #ef4444',
            padding: '0.85rem 1rem',
            borderRadius: '6px',
            marginBottom: '1.4rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ef4444', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.2rem' }}>
            <AlertTriangle size={15} />
            <span>Restricción de Cumplimiento:</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#fca5a5', lineHeight: 1.5 }}>
            No puedes marcar como completada esta tarea porque <strong>ni la creaste ni te fue asignada a ti</strong>. Corresponde a la operación de la sede <strong>{taskSede}</strong>. Modificar su estado alteraría las métricas y el radar de avance de ese equipo.
          </p>
        </div>

        {/* ACCIONES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* BOTÓN PRINCIPAL: ENTENDIDO / SALIR */}
          <button
            type="button"
            onClick={onClose}
            className="btn-primary"
            style={{
              padding: '0.75rem 1.2rem',
              fontWeight: 700,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
            }}
          >
            <ArrowLeft size={17} />
            <span>Entendido, mantener pendiente</span>
          </button>

          {/* OPCIÓN SUPERADMIN DE FUERZA MAYOR */}
          {isSuperAdmin && onForceComplete && (
            <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.8rem', textAlign: 'center' }}>
              {!showAdminConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowAdminConfirm(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted, #94a3b8)',
                    fontSize: '0.75rem',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: '0.3rem 0.5rem'
                  }}
                >
                  ⚡ Opciones de Supervisión SuperAdmin (Forzar completado)
                </button>
              ) : (
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '0.8rem' }}>
                  <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.78rem', color: '#fbbf24', fontWeight: 600 }}>
                    ¿Confirmas forzar el completado de esta tarea ajena como SuperAdmin? Quedará registrado en auditoría.
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setShowAdminConfirm(false)}
                      style={{
                        padding: '0.35rem 0.8rem',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#ffffff',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onForceComplete(task);
                      }}
                      style={{
                        padding: '0.35rem 0.8rem',
                        background: '#dc2626',
                        border: 'none',
                        color: '#ffffff',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Sí, forzar completado
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
