import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { LearningService } from '../services/LearningService';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. Guardar el aprendizaje
      const result = await LearningService.captureLearning(
        task,
        {
          ...reflection,
          timeSpent: parseInt(reflection.timeSpent) || null
        },
        currentUser
      );

      if (result.success) {
        // 2. Completar la tarea original
        await onComplete(task.id);
        
        showToast(
          '🎉 ¡Aprendizaje capturado! Gracias por compartir tu experiencia.',
          'success'
        );
        onClose();
      }
    } catch (error) {
      showToast('Error al guardar el aprendizaje', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, padding: '1rem'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '600px', width: '100%',
        padding: '2rem', border: '1px solid var(--crear-gold)',
        position: 'relative'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: 'transparent', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer'
        }}>
          <X size={20} />
        </button>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{
            background: 'rgba(255, 183, 3, 0.15)',
            padding: '0.75rem', borderRadius: '50%'
          }}>
            <Sparkles size={24} color="var(--crear-gold)" />
          </div>
          <div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.3rem' }}>
              ✨ Capturar Aprendizaje
            </h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Tu experiencia ayuda a toda la manada a crecer
            </p>
          </div>
        </div>

        {/* CONTENIDO */}
        <div style={{ marginBottom: '1.5rem' }}>
          
          {/* Paso 1: ¿Qué funcionó? */}
          {step === 1 && (
            <div>
              <h4 style={{ color: 'var(--crear-gold)', marginBottom: '0.5rem' }}>
                🟢 ¿Qué funcionó bien?
              </h4>
              <textarea
                value={reflection.whatWorked}
                onChange={(e) => setReflection({...reflection, whatWorked: e.target.value})}
                placeholder="Ej: La convocatoria anticipada mejoró la asistencia..."
                style={{
                  width: '100%', minHeight: '80px',
                  padding: '0.75rem',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  resize: 'vertical',
                  marginBottom: '1rem'
                }}
              />
              
              <h4 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>
                🔴 ¿Qué no funcionó?
              </h4>
              <textarea
                value={reflection.whatFailed}
                onChange={(e) => setReflection({...reflection, whatFailed: e.target.value})}
                placeholder="Ej: No tener backups de los materiales..."
                style={{
                  width: '100%', minHeight: '80px',
                  padding: '0.75rem',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  resize: 'vertical'
                }}
              />
            </div>
          )}

          {/* Paso 2: Insights y recomendaciones */}
          {step === 2 && (
            <div>
              <h4 style={{ color: '#a855f7', marginBottom: '0.5rem' }}>
                💡 Insights y Aprendizajes Clave
              </h4>
              <textarea
                value={reflection.insights}
                onChange={(e) => setReflection({...reflection, insights: e.target.value})}
                placeholder="Ej: El equipo responde mejor a recordatorios con 24h de anticipación..."
                style={{
                  width: '100%', minHeight: '80px',
                  padding: '0.75rem',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  resize: 'vertical',
                  marginBottom: '1rem'
                }}
              />
              
              <h4 style={{ color: '#22c55e', marginBottom: '0.5rem' }}>
                🚀 Recomendación para futuros equipos
              </h4>
              <textarea
                value={reflection.recommendation}
                onChange={(e) => setReflection({...reflection, recommendation: e.target.value})}
                placeholder="Ej: Implementar un sistema de backup digital para todos los materiales..."
                style={{
                  width: '100%', minHeight: '80px',
                  padding: '0.75rem',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  resize: 'vertical'
                }}
              />
            </div>
          )}

          {/* Paso 3: Métricas */}
          {step === 3 && (
            <div>
              <h4 style={{ color: 'var(--crear-cyan)', marginBottom: '0.5rem' }}>
                📊 Métricas de Ejecución
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Tiempo invertido (minutos)
                  </label>
                  <input
                    type="number"
                    value={reflection.timeSpent}
                    onChange={(e) => setReflection({...reflection, timeSpent: e.target.value})}
                    placeholder="Ej: 45"
                    style={{
                      width: '100%', padding: '0.5rem',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      color: '#fff'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Dificultad (1-5)
                  </label>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {[1, 2, 3, 4, 5].map(num => (
                      <button
                        key={num}
                        onClick={() => setReflection({...reflection, difficulty: num})}
                        style={{
                          width: '40px', height: '40px',
                          borderRadius: '8px', border: '1px solid',
                          borderColor: reflection.difficulty === num ? 'var(--crear-gold)' : 'rgba(255,255,255,0.1)',
                          background: reflection.difficulty === num ? 'rgba(255,183,3,0.2)' : 'transparent',
                          color: reflection.difficulty === num ? 'var(--crear-gold)' : 'var(--text-muted)',
                          fontWeight: reflection.difficulty === num ? 'bold' : 'normal',
                          cursor: 'pointer'
                        }}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div style={{
                padding: '1rem',
                background: 'rgba(255,183,3,0.08)',
                borderRadius: '8px',
                border: '1px solid rgba(255,183,3,0.2)'
              }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <strong>💡 Tip:</strong> Compartir tu experiencia ayuda a que otros 
                  aprendan de tus aciertos y eviten tus errores. ¡Tu conocimiento es 
                  el activo más valioso de la manada!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* NAVEGACIÓN */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {[1, 2, 3].map(num => (
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
            
            {step < 3 ? (
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
                disabled={isSubmitting}
                className="btn-neon-action"
                style={{ padding: '0.5rem 1.5rem' }}
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
