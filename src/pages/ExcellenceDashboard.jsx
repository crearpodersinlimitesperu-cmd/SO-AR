import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { Crown, Sparkles, Clock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ExcellenceDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [standards, setStandards] = useState([]);
  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExcellenceData();
  }, []);

  const fetchExcellenceData = async () => {
    try {
      // 1. Nuevos estándares
      const standardsQuery = query(
        collection(db, 'excellence_standards'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const standardsSnap = await getDocs(standardsQuery);
      setStandards(standardsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 2. Validaciones pendientes
      const validationQuery = query(
        collection(db, 'tasks'),
        where('isValidation', '==', true)
      );
      const validationSnap = await getDocs(validationQuery);
      setValidations(validationSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      setLoading(false);
    } catch (error) {
      console.error('Error fetching excellence data:', error);
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      <button onClick={() => navigate(-1)} className="btn-secondary" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ArrowLeft size={16} /> Volver
      </button>

      <div className="glass-panel" style={{ 
        padding: '2.5rem', 
        marginBottom: '2rem',
        border: '2px solid var(--crear-gold)',
        background: 'linear-gradient(135deg, rgba(255,183,3,0.05) 0%, rgba(0,0,0,0) 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            padding: '1rem',
            background: 'rgba(255,183,3,0.15)',
            borderRadius: '50%',
            border: '2px solid var(--crear-gold)'
          }}>
            <Crown size={32} color="var(--crear-gold)" />
          </div>
          <div>
            <h1 style={{ margin: 0, color: 'var(--crear-gold)', fontSize: '2rem', fontWeight: 900 }}>
              EXCELENCIA OPERATIVA
            </h1>
            <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-muted)' }}>
              Nuevas verdades operativas descubiertas por líderes de alto rendimiento
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-muted">Cargando nueva excelencia...</p>
      ) : (
        <>
          {/* ESTADÍSTICAS DE TRANSFORMACIÓN */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--crear-gold)' }}>{standards.length}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nuevas Excelencias</div>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#22c55e' }}>
                {standards.filter(s => s.status === 'NUEVO_ESTANDAR').length}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estándares Codificados</div>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b' }}>{validations.length}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Validaciones Pendientes</div>
            </div>
          </div>

          {/* NUEVAS EXCELENCIAS */}
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{ color: 'var(--crear-gold)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
              <Sparkles size={20} /> Nuevas Verdades Operativas
            </h3>
            
            {standards.length === 0 ? (
              <p className="text-muted">Aún no se han descubierto nuevas excelencias. ¡Sé el primero en transformar!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {standards.map(s => (
                  <div key={s.id} style={{
                    padding: '1.5rem',
                    background: s.status === 'NUEVO_ESTANDAR' 
                      ? 'rgba(34, 197, 94, 0.05)' 
                      : 'rgba(255,183,3,0.03)',
                    borderRadius: '12px',
                    border: `1px solid ${s.status === 'NUEVO_ESTANDAR' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,183,3,0.2)'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>
                          {s.newStandard?.title || 'Sin Título'}
                        </h4>
                        <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {s.newStandard?.description}
                        </p>
                      </div>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: s.status === 'NUEVO_ESTANDAR' 
                          ? 'rgba(34, 197, 94, 0.15)' 
                          : 'rgba(255,183,3,0.15)',
                        color: s.status === 'NUEVO_ESTANDAR' ? '#22c55e' : 'var(--crear-gold)',
                        border: `1px solid ${s.status === 'NUEVO_ESTANDAR' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,183,3,0.3)'}`
                      }}>
                        {s.status === 'NUEVO_ESTANDAR' ? '✅ EXCELENCIA CODIFICADA' : '🔄 EN VALIDACIÓN'}
                      </span>
                    </div>
                    
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        🔍 Descubierto por: <strong>{s.discoveredBy?.name}</strong> ({s.discoveredBy?.role})
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        📍 {s.discoveredBy?.sede}
                      </span>
                      {s.evidence?.transformationImpact?.timeReduction && (
                        <span style={{ fontSize: '0.75rem', color: '#22c55e' }}>
                          ⏱️ -{s.evidence.transformationImpact.timeReduction} min
                        </span>
                      )}
                    </div>
                    
                    {s.newReality?.whatChanges && s.newReality.whatChanges.length > 0 && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {s.newReality.whatChanges.slice(0, 3).map((change, idx) => (
                          <span key={idx} style={{
                            padding: '0.2rem 0.5rem',
                            background: 'rgba(255,183,3,0.08)',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            color: 'var(--crear-gold)'
                          }}>
                            ✨ {change}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* VALIDACIONES PENDIENTES */}
          {validations.length > 0 && (
            <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
                <Clock size={20} /> Validaciones Pendientes de Liderazgo
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {validations.map(v => (
                  <div key={v.id} style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.05)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#fff' }}>{v.task}</span>
                      {/* Aquí idealmente conectaríamos la acción de codificar al hacer clic, por ahora es un mock de UI para mostrar lo pendiente */}
                      <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={() => alert('Función de validación directa en desarrollo. Validar desde el Checklist Board asignado.')}>
                        Validar Ahora
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
