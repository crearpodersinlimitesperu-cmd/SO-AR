import React, { useState } from 'react';
import { CheckCircle2, Clock, Target, ArrowRight, ShieldCheck, Moon } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Ritual de Cierre de Jornada - Causa OS
 * 
 * Permite al colaborador registrar sus 2 prioridades críticas para el día siguiente
 * antes de desconectarse, asegurando foco inmediato y despeje mental.
 * 
 * Regla de Opacidad: Cero jerga psicológica o tecnológica en los textos.
 */
export default function RitualCierreModal({ isOpen, onClose, onConfirmLogout, currentUser }) {
  const [prioridad1, setPrioridad1] = useState('');
  const [prioridad2, setPrioridad2] = useState('');
  const [bloqueHorario, setBloqueHorario] = useState('09:00 - 11:00 am');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSaveAndLogout = async (e) => {
    e?.preventDefault();
    if (saving) return;
    setSaving(true);

    const payload = {
      userEmail: (currentUser?.email || '').toLowerCase().trim(),
      userName: currentUser?.name || currentUser?.displayName || 'Colaborador',
      sede: currentUser?.sede || 'Global',
      prioridadPrincipal: prioridad1.trim() || 'Llamadas de confirmación y asistencia en sala',
      segundaPrioridad: prioridad2.trim() || 'Revisión y registro de abonos en mesa de registro',
      bloqueHorarioProtegido: bloqueHorario,
      fechaRegistro: new Date().toISOString().slice(0, 10),
      createdAt: serverTimestamp()
    };

    try {
      // Guardar en base de datos
      const colRef = collection(db, 'coordinator_daily_commitments');
      await addDoc(colRef, payload);
    } catch (err) {
      console.warn('[Cierre de Jornada] Registro en cola local por contingencia de red:', err.message);
    }

    try {
      // Respaldo en almacenamiento local del navegador
      localStorage.setItem(`causa_compromiso_manana_${payload.userEmail}`, JSON.stringify(payload));
    } catch (e) {}

    setSaving(false);
    onConfirmLogout();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* ENCABEZADO */}
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <Moon size={22} color="#d4af37" />
          </div>
          <div>
            <h3 style={styles.title}>Cierre de Jornada — Mi Enfoque para Mañana</h3>
            <p style={styles.subtitle}>
              Define tus 2 prioridades de mayor impacto antes de desconectarte. Mañana tu jornada comenzará con foco directo.
            </p>
          </div>
        </div>

        {/* FORMULARIO DIRECTO */}
        <form onSubmit={handleSaveAndLogout} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <Target size={15} color="#10b981" /> 1. Prioridad Principal (Confirmaciones / Asistencia)
            </label>
            <input
              type="text"
              required
              value={prioridad1}
              onChange={(e) => setPrioridad1(e.target.value)}
              placeholder="Ej. Confirmar los 15 participantes de C1 sala Lima"
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <CheckCircle2 size={15} color="#3b82f6" /> 2. Segunda Prioridad (Mesa de Registro / Pagos)
            </label>
            <input
              type="text"
              required
              value={prioridad2}
              onChange={(e) => setPrioridad2(e.target.value)}
              placeholder="Ej. Revisar y reconciliar comprobantes de abono pendientes"
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <Clock size={15} color="#f59e0b" /> Bloque de Tiempo Protegido para Mañana
            </label>
            <select
              value={bloqueHorario}
              onChange={(e) => setBloqueHorario(e.target.value)}
              style={styles.select}
            >
              <option value="09:00 - 11:00 am">Mañana temprano (09:00 am - 11:00 am)</option>
              <option value="11:30 am - 01:30 pm">Mediodía de llamadas (11:30 am - 01:30 pm)</option>
              <option value="03:00 - 05:00 pm">Tarde de confirmaciones (03:00 pm - 05:00 pm)</option>
            </select>
          </div>

          {/* ACCIONES */}
          <div style={styles.actions}>
            <button
              type="button"
              onClick={onConfirmLogout}
              style={styles.secondaryBtn}
            >
              Cerrar Sesión Directamente
            </button>
            <button
              type="submit"
              disabled={saving}
              style={styles.primaryBtn}
            >
              {saving ? 'Guardando...' : (
                <>
                  Guardar Plan y Finalizar <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 17, 32, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: '1rem'
  },
  modal: {
    background: '#131c31',
    border: '1px solid rgba(212, 175, 55, 0.3)',
    borderRadius: '16px',
    maxWidth: '520px',
    width: '100%',
    padding: '1.75rem',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
    color: '#f8fafc',
    animation: 'fadeIn 0.25s ease-out'
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    marginBottom: '1.5rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '1rem'
  },
  iconContainer: {
    background: 'rgba(212, 175, 55, 0.12)',
    padding: '0.65rem',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(212, 175, 55, 0.25)'
  },
  title: {
    margin: 0,
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#f8fafc'
  },
  subtitle: {
    margin: '0.35rem 0 0',
    fontSize: '0.82rem',
    color: '#94a3b8',
    lineHeight: '1.35'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#e2e8f0'
  },
  input: {
    background: '#0b1120',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.7rem 0.9rem',
    fontSize: '0.88rem',
    color: '#f8fafc',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  select: {
    background: '#0b1120',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.7rem 0.9rem',
    fontSize: '0.88rem',
    color: '#f8fafc',
    outline: 'none'
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '0.75rem',
    gap: '0.75rem'
  },
  secondaryBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: '0.82rem',
    cursor: 'pointer',
    padding: '0.5rem',
    textDecoration: 'underline'
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'linear-gradient(135deg, #d4af37 0%, #b89628 100%)',
    color: '#0b1120',
    border: 'none',
    borderRadius: '8px',
    padding: '0.65rem 1.25rem',
    fontSize: '0.88rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.25)'
  }
};
