// src/components/UserStatusModal.jsx
import React, { useState } from 'react';
import { UserX, UserCheck, ShieldAlert, AlertTriangle, Calendar, FileText, CheckCircle2, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { setUserActiveStatus } from '../services/userService';

const DEACTIVATION_REASONS = [
  'Renuncia voluntaria',
  'Término de contrato',
  'Desvinculación / Despido',
  'Licencia temporal / Permiso prolongado',
  'Abandono de puesto',
  'Reestructuración organizacional',
  'Otro'
];

const REACTIVATION_REASONS = [
  'Reincorporación laboral / Reingreso',
  'Corrección de baja errónea',
  'Retorno de licencia temporal',
  'Nuevo contrato',
  'Otro'
];

export default function UserStatusModal({ isOpen, onClose, user, onStatusUpdated }) {
  const { currentUser } = useAuth();
  
  const isCurrentlyInactive = user?.isActive === false || user?.status === 'inactive' || user?.active === false;
  const isDeactivating = !isCurrentlyInactive;

  const todayStr = new Date().toISOString().split('T')[0];

  const [reason, setReason] = useState(isDeactivating ? 'Renuncia voluntaria' : 'Reincorporación laboral / Reingreso');
  const [customReason, setCustomReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(todayStr);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !user) return null;

  const finalReason = reason === 'Otro' ? (customReason.trim() || 'Otro') : reason;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (isDeactivating && !notes.trim()) {
      setErrorMessage('Por favor ingresa una breve observación o detalle para la trazabilidad y auditoría.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await setUserActiveStatus(user, {
        isActive: !isDeactivating,
        reason: finalReason,
        notes: notes.trim(),
        effectiveDate,
        performedBy: {
          name: currentUser?.name || currentUser?.displayName || 'Administrador',
          email: currentUser?.email || '',
          appRole: currentUser?.appRole || currentUser?.role || 'superadmin',
          sede: currentUser?.sede || 'Global'
        }
      });

      if (onStatusUpdated) {
        onStatusUpdated(updated);
      }
      onClose();
    } catch (err) {
      console.error('Error al actualizar estado del colaborador:', err);
      setErrorMessage('Error al registrar el cambio de estado: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '540px',
        width: '100%',
        background: '#0f172a',
        border: isDeactivating ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(34, 197, 94, 0.5)',
        borderRadius: '16px',
        padding: '1.8rem',
        boxShadow: isDeactivating 
          ? '0 20px 40px -15px rgba(239, 68, 68, 0.25)' 
          : '0 20px 40px -15px rgba(34, 197, 94, 0.25)',
        color: '#f8fafc',
        position: 'relative'
      }}>
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          style={{
            position: 'absolute',
            top: '1.2rem',
            right: '1.2rem',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer'
          }}
          title="Cerrar ventana"
        >
          <X size={20} />
        </button>

        {/* Encabezado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.2rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: isDeactivating ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
            border: isDeactivating ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDeactivating ? '#ef4444' : '#22c55e'
          }}>
            {isDeactivating ? <UserX size={26} /> : <UserCheck size={26} />}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: isDeactivating ? '#fca5a5' : '#86efac' }}>
              {isDeactivating ? 'Desactivar Colaborador (Baja)' : 'Reactivar Colaborador'}
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              Gestión de personal y trazabilidad institucional
            </p>
          </div>
        </div>

        {/* Ficha Resumen del Colaborador */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          padding: '0.9rem',
          marginBottom: '1.2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.6rem',
          fontSize: '0.85rem'
        }}>
          <div>
            <span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block' }}>Colaborador:</span>
            <strong style={{ color: '#f8fafc' }}>{user.name || 'Sin nombre'}</strong>
          </div>
          <div>
            <span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block' }}>Cargo / Rol:</span>
            <span style={{ color: 'var(--crear-cyan, #38bdf8)' }}>{user.role || 'Colaborador'}</span>
          </div>
          <div>
            <span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block' }}>Correo:</span>
            <span style={{ color: '#cbd5e1', wordBreak: 'break-all' }}>{user.email || 'N/A'}</span>
          </div>
          <div>
            <span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block' }}>Sede:</span>
            <span style={{ color: 'var(--crear-gold, #fbbf24)' }}>{user.sede || 'Global'}</span>
          </div>
        </div>

        {/* Aviso de Trazabilidad */}
        <div style={{
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '8px',
          padding: '0.7rem 0.9rem',
          marginBottom: '1.2rem',
          fontSize: '0.8rem',
          color: '#bae6fd',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          <ShieldAlert size={18} style={{ flexShrink: 0, color: '#38bdf8' }} />
          <div>
            <strong>Trazabilidad de Auditoría:</strong> Acción registrada por{' '}
            <span style={{ color: '#f8fafc', fontWeight: 600 }}>{currentUser?.name || currentUser?.email}</span> ({currentUser?.appRole || 'SuperAdmin'}).
          </div>
        </div>

        {errorMessage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '0.7rem 0.9rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            color: '#fca5a5'
          }}>
            {errorMessage}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          {/* Motivo */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.4rem' }}>
              Motivo del cambio de estado: *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                background: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#f8fafc',
                fontSize: '0.9rem'
              }}
            >
              {(isDeactivating ? DEACTIVATION_REASONS : REACTIVATION_REASONS).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {reason === 'Otro' && (
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Especifica el motivo..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  background: '#1e293b',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#f8fafc',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          )}

          {/* Fecha Efectiva */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.4rem' }}>
              Fecha efectiva de la {isDeactivating ? 'baja' : 'reactivación'}:
            </label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.55rem 0.8rem',
                borderRadius: '8px',
                background: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#f8fafc',
                fontSize: '0.9rem'
              }}
            />
          </div>

          {/* Observaciones / Notas de Auditoría */}
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.4rem' }}>
              Observaciones y Detalles de Trazabilidad: {isDeactivating && '*'}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              placeholder={isDeactivating 
                ? "Ej: Leyla presentó su carta de renuncia el día de hoy, entrega de puesto completada..."
                : "Ej: Se reincorpora a sus funciones en la sede Lima..."}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                background: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#f8fafc',
                fontSize: '0.85rem',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary"
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.9rem' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.4rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                border: 'none',
                color: '#ffffff',
                background: isDeactivating
                  ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                  : 'linear-gradient(135deg, #22c55e, #15803d)',
                boxShadow: isDeactivating
                  ? '0 4px 12px rgba(239, 68, 68, 0.3)'
                  : '0 4px 12px rgba(34, 197, 94, 0.3)'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Guardando trazabilidad...
                </>
              ) : isDeactivating ? (
                <>
                  <UserX size={16} />
                  Confirmar Desactivación
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Confirmar Reactivación
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
