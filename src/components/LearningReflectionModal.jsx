import React, { useState, useEffect } from 'react';
import { X, Sparkles, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { LearningService } from '../services/LearningService';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { celebrateVictory } from '../utils/neuroFeedback';

export default function LearningReflectionModal({ isOpen, onClose, task, onComplete }) {
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const [step, setStep] = useState(1);
  const [reflection, setReflection] = useState({
    whatWorked: '',
    whatFailed: '',
    insights: '',
    recommendation: '',
    timeSpent: '',
    difficulty: 3
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setReflection({
        whatWorked: '',
        whatFailed: '',
        insights: '',
        recommendation: '',
        timeSpent: '',
        difficulty: 3
      });
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !task) return null;

  // OPCIÓN 1: Solo completar la tarea (fricción cero / ultra rápido)
  const handleCompleteOnly = async () => {
    setIsSubmitting(true);
    try {
      await onComplete(task.id);
      celebrateVictory();
      showToast('⚡ Tarea completada con éxito.', 'success');
      onClose();
    } catch (error) {
      console.error('Error completando tarea:', error);
      showToast('Error al completar la tarea', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // OPCIÓN 2: Guardar aprendizaje y completar
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await LearningService.captureLearning(
        task,
        {
          ...reflection,
          timeSpent: parseInt(reflection.timeSpent) || null
        },
        currentUser
      );

      if (result.success) {
        await onComplete(task.id);
        celebrateVictory();
        showToast(
          '🎉 ¡Aprendizaje capturado y tarea completada! Gracias por sumar a la manada.',
          'success'
        );
        onClose();
      }
    } catch (error) {
      console.error('Error guardando aprendizaje:', error);
      showToast('Error al guardar el aprendizaje', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 7, 18, 0.82)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '1rem',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '620px',
          width: '100%',
          padding: '2rem',
          border: '1px solid var(--crear-gold, #ffb703)',
          background: 'var(--bg-glass-heavy, #0c1527)',
          color: 'var(--text-main, #ffffff)',
          position: 'relative',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
            padding: '0.4rem'
          }}
          title="Cerrar"
        >
          <X size={20} />
        </button>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem', paddingRight: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                background: 'rgba(255, 183, 3, 0.15)',
                padding: '0.65rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Sparkles size={22} color="var(--crear-gold, #ffb703)" />
            </div>
            <div>
              <h2 style={{ margin: 0, color: 'var(--text-heading, #ffffff)', fontSize: '1.25rem', fontWeight: 800 }}>
                ✨ Compartir Experiencia
              </h2>
              <p style={{ margin: 0, color: 'var(--text-muted, #94a3b8)', fontSize: '0.82rem' }}>
                {task.task || task.title}
              </p>
            </div>
          </div>

          {/* BOTÓN RÁPIDO PARA OMITIR Y SOLO COMPLETAR */}
          <button
            type="button"
            onClick={handleCompleteOnly}
            disabled={isSubmitting}
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#10b981',
              padding: '0.4rem 0.8rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              whiteSpace: 'nowrap'
            }}
            title="Finaliza la tarea al instante sin guardar notas"
          >
            <Zap size={13} />
            Solo Completar
          </button>
        </div>

        {/* CONTENIDO POR PASOS */}
        <div style={{ marginBottom: '1.5rem' }}>
          {/* Paso 1: ¿Qué funcionó? */}
          {step === 1 && (
            <div>
              <h4 style={{ color: 'var(--crear-gold, #ffb703)', marginBottom: '0.4rem', fontSize: '0.92rem' }}>
                🟢 ¿Qué funcionó bien? (Opcional)
              </h4>
              <textarea
                value={reflection.whatWorked}
                onChange={(e) => setReflection({ ...reflection, whatWorked: e.target.value })}
                placeholder="Ej: La convocatoria anticipada mejoró la asistencia del equipo..."
                style={{
                  width: '100%',
                  minHeight: '75px',
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                  borderRadius: '8px',
                  color: 'var(--text-main, #ffffff)',
                  fontSize: '0.88rem',
                  resize: 'vertical',
                  marginBottom: '1rem',
                  boxSizing: 'border-box'
                }}
              />

              <h4 style={{ color: '#ef4444', marginBottom: '0.4rem', fontSize: '0.92rem' }}>
                🔴 ¿Qué no funcionó o generó quiebre? (Opcional)
              </h4>
              <textarea
                value={reflection.whatFailed}
                onChange={(e) => setReflection({ ...reflection, whatFailed: e.target.value })}
                placeholder="Ej: No tener material de reserva generó 10 min de retraso..."
                style={{
                  width: '100%',
                  minHeight: '75px',
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                  borderRadius: '8px',
                  color: 'var(--text-main, #ffffff)',
                  fontSize: '0.88rem',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* Paso 2: Aprendizaje y Recomendación */}
          {step === 2 && (
            <div>
              <h4 style={{ color: 'var(--crear-cyan, #29abe2)', marginBottom: '0.4rem', fontSize: '0.92rem' }}>
                💡 Insight / Aprendizaje Clave
              </h4>
              <textarea
                value={reflection.insights}
                onChange={(e) => setReflection({ ...reflection, insights: e.target.value })}
                placeholder="¿Qué distinción o principio ontológico validaste en esta tarea?"
                style={{
                  width: '100%',
                  minHeight: '75px',
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                  borderRadius: '8px',
                  color: 'var(--text-main, #ffffff)',
                  fontSize: '0.88rem',
                  resize: 'vertical',
                  marginBottom: '1rem',
                  boxSizing: 'border-box'
                }}
              />

              <h4 style={{ color: 'var(--crear-gold, #ffb703)', marginBottom: '0.4rem', fontSize: '0.92rem' }}>
                🎯 Recomendación para la Próxima Vez
              </h4>
              <textarea
                value={reflection.recommendation}
                onChange={(e) => setReflection({ ...reflection, recommendation: e.target.value })}
                placeholder="¿Qué estándar o acción concreta debe aplicarse a futuro?"
                style={{
                  width: '100%',
                  minHeight: '75px',
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                  borderRadius: '8px',
                  color: 'var(--text-main, #ffffff)',
                  fontSize: '0.88rem',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* Paso 3: Métricas */}
          {step === 3 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', marginBottom: '0.4rem' }}>
                    ⏱ Tiempo Dedicado (minutos)
                  </label>
                  <input
                    type="number"
                    value={reflection.timeSpent}
                    onChange={(e) => setReflection({ ...reflection, timeSpent: e.target.value })}
                    placeholder="Ej: 45"
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                      borderRadius: '8px',
                      color: 'var(--text-main, #ffffff)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', marginBottom: '0.4rem' }}>
                    📊 Complejidad Percibida (1-5)
                  </label>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setReflection({ ...reflection, difficulty: num })}
                        style={{
                          flex: 1,
                          padding: '0.65rem 0',
                          borderRadius: '8px',
                          border: reflection.difficulty === num ? '1px solid var(--crear-gold)' : '1px solid rgba(255,255,255,0.1)',
                          background: reflection.difficulty === num ? 'rgba(255,183,3,0.2)' : 'rgba(0,0,0,0.2)',
                          color: reflection.difficulty === num ? 'var(--crear-gold)' : 'var(--text-muted)',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: '0.85rem 1rem',
                  background: 'rgba(255, 183, 3, 0.08)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 183, 3, 0.2)'
                }}
              >
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)' }}>
                  💡 <strong>Tip de Liderazgo:</strong> Tu experiencia documentada queda guardada en el Registro de Aprendizaje para que todo el equipo evolucione.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* NAVEGACIÓN Y BOTONES DE ACCIÓN */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: step === num ? 'var(--crear-gold)' : 'rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.3s'
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            {step === 1 && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid rgba(255, 183, 3, 0.3)',
                  background: 'rgba(255, 183, 3, 0.1)',
                  color: 'var(--crear-gold, #ffb703)'
                }}
                title="Guardar lo ingresado en el paso 1 y finalizar de inmediato"
              >
                ⚡ Guardar y Completar
              </button>
            )}

            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="btn-secondary"
                style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
              >
                Anterior
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="btn-primary"
                style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                Siguiente <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-neon-action"
                style={{ padding: '0.55rem 1.4rem', fontSize: '0.88rem' }}
              >
                {isSubmitting ? 'Guardando...' : '✨ Compartir Aprendizaje'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
