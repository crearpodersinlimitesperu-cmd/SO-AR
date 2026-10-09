import React, { useState } from 'react';
import { X, Crown, Rocket } from 'lucide-react';
import { ExcellenceService } from '../services/ExcellenceService';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

export default function NewExcellenceModal({ isOpen, onClose, task, onComplete }) {
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const [step, setStep] = useState(1);
  const [standard, setStandard] = useState({
    title: '',
    description: '',
    replaces: '',
    newReality: '',
    corePrinciple: '',
    appliedIn: [],
    timeReduction: '',
    errorElimination: '',
    participantSatisfaction: '',
    teamAdoptionRate: '',
    whatChanges: [],
    newSkills: [],
    obsoletePractices: [],
    roles: [],
    sedes: [],
    phases: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newChange, setNewChange] = useState('');

  if (!isOpen || !task) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await ExcellenceService.captureNewStandard(
        task,
        {
          ...standard,
          appliedIn: standard.appliedIn.length > 0 ? standard.appliedIn : [currentUser.sede || 'Global'],
          roles: standard.roles.length > 0 ? standard.roles : [currentUser.appRole || 'capitan'],
          phases: standard.phases.length > 0 ? standard.phases : [task.cyclePhase || 'GLOBAL'],
          sedes: standard.sedes.length > 0 ? standard.sedes : ['Todas'],
          timeReduction: parseInt(standard.timeReduction) || null,
          errorElimination: parseInt(standard.errorElimination) || null,
          participantSatisfaction: parseFloat(standard.participantSatisfaction) || null,
          teamAdoptionRate: parseInt(standard.teamAdoptionRate) || null
        },
        currentUser
      );

      if (result.success) {
        showToast(
          `🌟 ¡NUEVA EXCELENCIA DESCUBIERTA! "${standard.title}" está siendo validada por liderazgo.`,
          'success'
        );
        onClose();
      }
    } catch (error) {
      showToast('Error al registrar la nueva excelencia', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.92)',
      backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, padding: '1rem'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '720px', width: '100%',
        padding: '2.5rem',
        border: '2px solid var(--crear-gold)',
        boxShadow: '0 0 60px rgba(255, 183, 3, 0.2)',
        position: 'relative',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: 'transparent', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer'
        }}>
          <X size={20} />
        </button>

        {/* HEADER - EXCELENCIA */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            padding: '0.75rem 1.5rem',
            background: 'rgba(255, 183, 3, 0.15)',
            borderRadius: '9999px',
            border: '2px solid var(--crear-gold)',
            marginBottom: '1rem',
            boxShadow: '0 0 30px rgba(255, 183, 3, 0.15)'
          }}>
            <Crown size={20} color="var(--crear-gold)" />
            <span style={{ color: 'var(--crear-gold)', fontWeight: 900, marginLeft: '0.5rem', letterSpacing: '1px' }}>
              NUEVA EXCELENCIA OPERATIVA
            </span>
          </div>
          <h2 style={{ margin: '0', color: '#fff', fontSize: '1.6rem', fontWeight: 900 }}>
            {task.task || task.title}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem', fontSize: '0.95rem' }}>
            Has descubierto una nueva verdad operativa. Compártela con la manada.
          </p>
        </div>

        {/* PASO 1: LA NUEVA VERDAD */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--crear-gold)', marginBottom: '0.4rem' }}>
                ⚡ Título de la Nueva Excelencia
              </label>
              <input
                type="text"
                value={standard.title}
                onChange={(e) => setStandard({...standard, title: e.target.value})}
                placeholder="Ej: Grounding Digital - La Nueva Excelencia"
                style={{
                  width: '100%', padding: '0.75rem',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,183,3,0.3)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  🔄 Esto reemplaza...
                </label>
                <input
                  type="text"
                  value={standard.replaces}
                  onChange={(e) => setStandard({...standard, replaces: e.target.value})}
                  placeholder="Ej: Grounding con impresiones"
                  style={{
                    width: '100%', padding: '0.6rem',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#fff'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  💡 El Principio Central
                </label>
                <input
                  type="text"
                  value={standard.corePrinciple}
                  onChange={(e) => setStandard({...standard, corePrinciple: e.target.value})}
                  placeholder="Ej: La información debe fluir libremente"
                  style={{
                    width: '100%', padding: '0.6rem',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#fff'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--crear-gold)', marginBottom: '0.4rem' }}>
                📝 Descripción de la Nueva Realidad
              </label>
              <textarea
                value={standard.description}
                onChange={(e) => setStandard({...standard, description: e.target.value})}
                placeholder="Describe la nueva manera de ser y hacer..."
                style={{
                  width: '100%', minHeight: '80px',
                  padding: '0.75rem',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,183,3,0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--crear-gold)', marginBottom: '0.4rem' }}>
                🌟 ¿Qué Cambia en la Nueva Realidad?
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  value={newChange}
                  onChange={(e) => setNewChange(e.target.value)}
                  placeholder="Ej: Ya no se imprimen listas de asistencia"
                  style={{
                    flex: 1, padding: '0.5rem',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#fff'
                  }}
                />
                <button
                  onClick={() => {
                    if (newChange.trim()) {
                      setStandard({...standard, whatChanges: [...standard.whatChanges, newChange.trim()]});
                      setNewChange('');
                    }
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--crear-gold)',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#000',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  +
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {standard.whatChanges.map((item, idx) => (
                  <span key={idx} style={{
                    padding: '0.25rem 0.6rem',
                    background: 'rgba(255,183,3,0.1)',
                    borderRadius: '4px',
                    border: '1px solid rgba(255,183,3,0.2)',
                    fontSize: '0.8rem',
                    color: 'var(--crear-gold)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    {item}
                    <button
                      onClick={() => setStandard({...standard, whatChanges: standard.whatChanges.filter((_, i) => i !== idx)})}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0', marginLeft: '0.5rem' }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PASO 2: EVIDENCIA Y EXPANSIÓN */}
        {step === 2 && (
          <div>
            <h4 style={{ color: 'var(--crear-gold)', marginBottom: '1rem', marginTop: 0 }}>
              📊 Evidencia de Transformación
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  ⏱️ Tiempo Ahorrado (minutos)
                </label>
                <input
                  type="number"
                  value={standard.timeReduction}
                  onChange={(e) => setStandard({...standard, timeReduction: e.target.value})}
                  placeholder="Ej: 40"
                  style={{
                    width: '100%', padding: '0.6rem',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#fff'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  🎯 % Errores Eliminados
                </label>
                <input
                  type="number"
                  value={standard.errorElimination}
                  onChange={(e) => setStandard({...standard, errorElimination: e.target.value})}
                  placeholder="Ej: 100"
                  style={{
                    width: '100%', padding: '0.6rem',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#fff'
                  }}
                />
              </div>
            </div>

            <h4 style={{ color: 'var(--crear-gold)', marginBottom: '1rem' }}>
              🌍 Expansión Colectiva
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  👥 Roles Aplicables (separados por coma)
                </label>
                <input
                  type="text"
                  value={standard.roles.join(', ')}
                  onChange={(e) => setStandard({...standard, roles: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                  placeholder="qt, coord_c1, capitan"
                  style={{
                    width: '100%', padding: '0.6rem',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#fff'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  📍 Sedes (separadas por coma)
                </label>
                <input
                  type="text"
                  value={standard.sedes.join(', ')}
                  onChange={(e) => setStandard({...standard, sedes: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                  placeholder="Todas, Lima, Quito"
                  style={{
                    width: '100%', padding: '0.6rem',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#fff'
                  }}
                />
              </div>
            </div>

            <div style={{
              padding: '1.5rem',
              background: 'rgba(255, 183, 3, 0.05)',
              borderRadius: '12px',
              border: '2px solid rgba(255, 183, 3, 0.2)',
              marginTop: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Rocket size={24} color="var(--crear-gold)" />
                <div>
                  <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>
                    🚀 Impacto de la Transformación
                  </h4>
                  <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {standard.whatChanges.length > 0 
                      ? `${standard.whatChanges.length} cambios documentados en la nueva realidad operativa`
                      : 'Aún no has documentado los cambios en la nueva realidad'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NAVEGACIÓN */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {[1, 2].map(num => (
              <div
                key={num}
                style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: step === num ? 'var(--crear-gold)' : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.3s'
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                Anterior
              </button>
            )}
            
            {step < 2 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="btn-primary"
                style={{ padding: '0.5rem 1.5rem' }}
              >
                Siguiente →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !standard.title.trim()}
                className="btn-neon-action"
                style={{ padding: '0.6rem 1.8rem', fontSize: '1rem', background: 'linear-gradient(135deg, #ffb703, #f59e0b)', border: 'none', color: '#000', fontWeight: 'bold' }}
              >
                {isSubmitting ? 'Registrando...' : '🌟 Descubrir Nueva Excelencia'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
