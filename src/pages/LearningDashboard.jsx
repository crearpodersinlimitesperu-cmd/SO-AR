import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { Lightbulb, TrendingUp, Award, Users, Sparkles, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LearningDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [learnings, setLearnings] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [topContributors, setTopContributors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLearningData();
  }, []);

  const fetchLearningData = async () => {
    try {
      // 1. Aprendizajes recientes
      const learningsQuery = query(
        collection(db, 'learning_logs'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const learningsSnap = await getDocs(learningsQuery);
      setLearnings(learningsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 2. Patrones de éxito
      const patternsQuery = query(
        collection(db, 'success_patterns'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const patternsSnap = await getDocs(patternsQuery);
      setPatterns(patternsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 3. Top contribuidores
      const statsQuery = query(
        collection(db, 'user_stats'),
        orderBy('learningContributions', 'desc'),
        limit(10)
      );
      const statsSnap = await getDocs(statsQuery);
      setTopContributors(statsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (error) {
      console.error('Error fetching learning data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      <button onClick={() => navigate(-1)} className="btn-secondary" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ArrowLeft size={16} /> Volver
      </button>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--crear-gold)', margin: '0 0 0.5rem 0' }}>
          <Sparkles size={28} /> Inteligencia Colectiva SO-AR
        </h1>
        <p className="text-muted" style={{ margin: 0 }}>El conocimiento de la manada crece con cada experiencia compartida</p>
      </div>

      {loading ? (
        <p className="text-muted">Cargando sabiduría colectiva...</p>
      ) : (
        <>
          {/* PATRONES DE ÉXITO */}
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{ color: 'var(--crear-gold)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
              <Award size={20} /> Patrones de Éxito Detectados
            </h3>
            {patterns.length === 0 ? (
              <p className="text-muted">Aún no hay patrones de éxito identificados. ¡Sé el primero en compartir!</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                {patterns.map(p => (
                  <div key={p.id} style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                    <h4 style={{ margin: '0 0 0.3rem', color: '#22c55e' }}>{p.taskTitle}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
                      ✅ {p.successCount} personas lo hicieron con éxito
                    </p>
                    <div style={{ fontSize: '0.8rem' }}>
                      <strong style={{ color: 'var(--crear-gold)' }}>Mejores prácticas:</strong>
                      <ul style={{ margin: '0.3rem 0 0 0', paddingLeft: '1.2rem', color: 'var(--text-main)' }}>
                        {p.bestPractices?.slice(0, 3).map((practice, i) => (
                          <li key={i}>{practice}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TOP CONTRIBUIDORES Y APRENDIZAJES RECIENTES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
            {/* TOP CONTRIBUIDORES */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ color: 'var(--crear-cyan)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
                <Users size={20} /> Líderes de Aprendizaje
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {topContributors.length === 0 ? (
                  <p className="text-muted">Nadie ha contribuido todavía.</p>
                ) : (
                  topContributors.map((user, idx) => (
                    <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <span style={{ color: idx === 0 ? 'var(--crear-gold)' : 'var(--text-muted)', fontWeight: 'bold', fontSize: '1.2rem' }}>
                        #{idx + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontWeight: 'bold' }}>{user.name || user.id}</div>
                      </div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--crear-cyan)', background: 'rgba(0, 210, 255, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        🧠 {user.learningContributions || 0} aportes
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* APRENDIZAJES RECIENTES */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ color: 'var(--crear-gold)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
                <Lightbulb size={20} /> Aprendizajes Recientes
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {learnings.length === 0 ? (
                  <p className="text-muted">No hay aprendizajes registrados.</p>
                ) : (
                  learnings.map(l => (
                    <div key={l.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{l.taskTitle}</strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(l.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {l.insights && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '0.5rem 0' }}>
                          💡 {l.insights}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        {l.tags?.slice(0, 4).map(tag => (
                          <span key={tag} style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
