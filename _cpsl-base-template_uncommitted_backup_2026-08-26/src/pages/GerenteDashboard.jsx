import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useChecklist } from '../context/ChecklistContext';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useUI } from '../context/UIContext';
import { useNavigate } from 'react-router-dom';
import { Target, AlertTriangle, Users, PlusCircle, Activity, CheckCircle, Building, MessageSquare, Mail, ExternalLink, ArrowUpRight, Clock, ShieldAlert, ChevronRight, CheckSquare } from 'lucide-react';
import { usersData, normalizeRole } from '../data/usersData';
import TaskAssignmentModal from '../components/TaskAssignmentModal';
import VenueConfigModal from '../components/VenueConfigModal';

export default function GerenteDashboard() {
  const { currentUser } = useAuth();
  const { currentStage } = useCycles();
  const { tasks, initializeFirestore, getProgressByRole } = useChecklist();
  const { showToast } = useUI();
  const navigate = useNavigate();

  const [dailyGoals, setDailyGoals] = useState([]);
  const [trainingGoals, setTrainingGoals] = useState([]);
  const [cycleGoals, setCycleGoals] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showVenueModal, setShowVenueModal] = useState(false);

  useEffect(() => {
    if (currentUser?.appRole !== 'gerente') {
      navigate('/');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const unsubscribeDaily = onSnapshot(query(collection(db, 'goals'), where('scope', '==', 'DIARIA')), (snapshot) => {
       setDailyGoals(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
    });
    const unsubscribeTraining = onSnapshot(query(collection(db, 'goals'), where('scope', '==', 'ENTRENAMIENTO')), (snapshot) => {
       setTrainingGoals(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
    });
    const unsubscribeCycle = onSnapshot(query(collection(db, 'goals'), where('scope', '==', 'CICLO')), (snapshot) => {
       setCycleGoals(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => {
      unsubscribeDaily();
      unsubscribeTraining();
      unsubscribeCycle();
    };
  }, []);

  // --- DERIVED DATA ---
  
  // 1. DÓNDE ESTAMOS
  const currentTraining = currentStage;
  const cycleFlow = ['GATE 1', 'PRE-C1', 'C1', 'POST-C1', 'C2', 'PRE-MJ', 'MJ', 'POST-MJ'];
  const currentIndex = cycleFlow.indexOf(currentStage);
  const nextTraining = currentIndex !== -1 && currentIndex < cycleFlow.length - 1 ? cycleFlow[currentIndex + 1] : 'Próximo Ciclo';

  const isTaskVisibleToMe = (t) => {
    if (currentUser?.isSuperAdmin) return true;
    if (t.assignedToEmail) {
      const isManagerRole = r => r === 'gerente' || r === 'director_maestria' || r === 'direccion';
      if (isManagerRole(currentUser?.appRole) && isManagerRole(normalizeRole(t.role))) {
        if (t.assignedToEmail.toLowerCase() !== currentUser?.email?.toLowerCase()) {
          const iAmCreator = t.createdBy?.toLowerCase() === currentUser?.email?.toLowerCase();
          const iAmCollaborator = t.collaborators?.includes(currentUser?.email);
          if (!iAmCreator && !iAmCollaborator) return false;
        }
      }
    }
    return true;
  };

  // 2. QUÉ ESTÁ EN RIESGO (Radar)
  // Críticas / Vencidas / Rojas
  const criticalTasks = tasks.filter(t => !t.completed && (t.priority === 'Crítica' || t.isCritical) && isTaskVisibleToMe(t));
  // Proximas (Naranjas o sin completar)
  const upcomingTasks = tasks.filter(t => !t.completed && !t.isCritical && t.priority !== 'Crítica' && isTaskVisibleToMe(t));

  // 3. QUÉ DEBO HACER HOY (Acciones Gerente)
  const myPendingTasks = tasks.filter(t => t.role === 'gerente' && !t.completed && (t.cyclePhase === currentStage || t.isCritical) && isTaskVisibleToMe(t));
  const topActions = myPendingTasks.slice(0, 5); // Limit to top 5 actions

  // Helper para resolver los responsables
  const getResponsiblesForTask = (task) => {
    if (task.assignedToEmail) {
      const u = usersData.find(usr => usr.email.toLowerCase() === task.assignedToEmail.toLowerCase());
      if (u) return [u];
      return [{ name: task.assignedToEmail.split('@')[0], email: task.assignedToEmail, role: task.role, sede: task.sede || currentUser?.sede }];
    }
    if (task.collaboratorDetails && task.collaboratorDetails.length > 0) return task.collaboratorDetails;
    
    const taskRoleNorm = normalizeRole(task.role);
    const targetSede = (task.sede || currentUser?.sede || '').toLowerCase().trim();

    const sedeMatches = usersData.filter(u => normalizeRole(u.role) === taskRoleNorm && (!u.sede || !targetSede || u.sede.toLowerCase().trim() === targetSede));
    if (sedeMatches.length > 0) return sedeMatches;

    const roleMatches = usersData.filter(u => normalizeRole(u.role) === taskRoleNorm);
    if (roleMatches.length > 0) return roleMatches.slice(0, 2);

    return [{ name: `Resp: ${task.role.replace(/_/g, ' ')}`, email: '', role: task.role, sede: currentUser?.sede }];
  };

  const handleOpenGoogleChat = (email) => {
    if (!email) window.open('https://chat.google.com/', '_blank');
    else window.open(`https://mail.google.com/chat/u/0/#chat/dm/${email}`, '_blank');
  };

  const handleSendEmail = (email, taskTitle, taskRole) => {
    const subject = `⚠️ URGENTE SO-AR: ${taskTitle}`;
    const body = `Hola,\n\nRequiero actualización urgente sobre:\n📌 TAREA: ${taskTitle}\n\nPor favor reportar estado.\n\nGerencia Sede`;
    window.location.href = `mailto:${email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gold" style={{ margin: 0, fontSize: '2.2rem', fontWeight: '900', letterSpacing: '-0.5px' }}>
            Dashboard "30 Segundos"
          </h1>
          <p className="text-muted" style={{ margin: '0.5rem 0 0', textTransform: 'uppercase', fontWeight: '600' }}>
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => setShowVenueModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building size={16} /> Hoteles Sede
          </button>
          <button className="btn-primary" onClick={() => setShowTaskForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={16} /> Asignar Meta
          </button>
          {(currentUser?.isSuperAdmin || currentUser?.appRole === 'gerente' || currentUser?.appRole === 'direccion' || currentUser?.appRole === 'director_maestria') && (
            <button className="btn-primary" onClick={() => navigate('/superadmin')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #8b5cf6, #29abe2)', color: 'white', border: 'none' }}>
              👥 Directorio de Equipo
            </button>
          )}
          <button 
            className="btn-primary" 
            onClick={() => window.open('https://cartas.crearpsl.net/', '_blank')} 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #f59e0b, #ec4899)', color: 'white', border: 'none' }}
          >
            <Mail size={16} /> Sistema de Cartas
          </button>
          <button className="btn-secondary" onClick={() => navigate('/')}>Volver</button>
        </div>
      </div>

      <TaskAssignmentModal isOpen={showTaskForm} onClose={() => setShowTaskForm(false)} />
      <VenueConfigModal isOpen={showVenueModal} onClose={() => setShowVenueModal(false)} />

      {/* CUADRANTES EJECUTIVOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* CUADRANTE 1: ¿DÓNDE ESTAMOS? */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05, transform: 'scale(1.5)' }}>
            <Target size={150} />
          </div>
          <h3 style={{ color: 'var(--crear-blue)', marginTop: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={16} /> 1. ¿Dónde Estamos?
          </h3>
          
          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>CICLO ACTIVO / FASE ACTUAL</p>
            <h2 style={{ margin: '0.5rem 0', fontSize: '2.5rem', fontWeight: '900', color: 'var(--text-heading)' }}>
              {currentTraining}
            </h2>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Próximo Hito Operativo</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <ChevronRight size={18} color="var(--crear-gold)" />
                <span style={{ color: 'var(--text-heading)', fontWeight: 'bold', fontSize: '1.1rem' }}>{nextTraining}</span>
              </div>
            </div>
          </div>

          {(dailyGoals.length > 0 || trainingGoals.length > 0 || cycleGoals.length > 0) && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* METAS DEL CICLO */}
              {cycleGoals.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.75rem', color: 'var(--crear-gold)', fontSize: '0.85rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Target size={14} /> Metas Globales de Ciclo
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {cycleGoals.map(g => (
                      <div key={g.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.8rem', borderRadius: '6px', borderLeft: '3px solid var(--crear-gold)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                          <span style={{ fontWeight: '600', color: 'var(--text-heading)' }}>{g.title}</span>
                          <span style={{ fontWeight: 'bold', color: g.progress >= 100 ? '#22c55e' : 'var(--crear-gold)' }}>{g.currentValue} / {g.targetValue}</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(g.progress, 100)}%`, background: g.progress >= 100 ? '#22c55e' : 'var(--crear-gold)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* METAS DE ENTRENAMIENTO */}
              {trainingGoals.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.75rem', color: 'var(--crear-cyan)', fontSize: '0.85rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Target size={14} /> Metas de Entrenamiento
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {trainingGoals.filter(g => g.cyclePhase === currentStage || !g.cyclePhase || g.cyclePhase.includes('MJ')).map(g => (
                      <div key={g.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.8rem', borderRadius: '6px', borderLeft: '3px solid var(--crear-cyan)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                          <span style={{ fontWeight: '600', color: 'var(--text-heading)' }}>{g.title}</span>
                          <span style={{ fontWeight: 'bold', color: g.progress >= 100 ? '#22c55e' : 'var(--crear-cyan)' }}>{g.currentValue} / {g.targetValue}</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(g.progress, 100)}%`, background: g.progress >= 100 ? '#22c55e' : 'var(--crear-cyan)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* METAS DIARIAS */}
              {dailyGoals.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.75rem', color: '#10b981', fontSize: '0.85rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Target size={14} /> Metas Diarias Activas
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {dailyGoals.map(g => (
                      <div key={g.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.8rem', borderRadius: '6px', borderLeft: '3px solid #10b981' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                          <span style={{ fontWeight: '600', color: 'var(--text-heading)' }}>{g.title}</span>
                          <span style={{ fontWeight: 'bold', color: g.progress >= 100 ? '#22c55e' : '#10b981' }}>{g.currentValue} / {g.targetValue}</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(g.progress, 100)}%`, background: g.progress >= 100 ? '#22c55e' : '#10b981' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CUADRANTE 2: ¿QUÉ DEBO HACER HOY? (ACCIONES DEL GERENTE) */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ color: 'var(--crear-gold)', marginTop: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,215,0,0.2)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckSquare size={16} /> 2. ¿Qué debo hacer hoy? (Top 5)
          </h3>
          
          {topActions.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--color-success)', gap: '0.5rem', minHeight: '150px' }}>
              <CheckCircle size={32} />
              <p style={{ margin: 0, fontWeight: 'bold' }}>Día Libre de Tareas Críticas</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', flex: 1 }}>
              {topActions.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', borderLeft: t.isCritical ? '3px solid #ef4444' : '3px solid var(--crear-gold)' }}>
                  <div style={{ marginTop: '2px' }}>
                    {t.isCritical ? <ShieldAlert size={16} color="#ef4444" /> : <Clock size={16} color="var(--crear-gold)" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, color: 'var(--text-heading)', fontSize: '0.95rem', fontWeight: '500', lineHeight: '1.3' }}>{t.task || t.title}</p>
                  </div>
                  <button onClick={() => navigate(`/checklist/gerente`)} style={{ background: 'none', border: 'none', color: 'var(--crear-blue)', cursor: 'pointer', padding: '0.2rem' }}>
                    <ExternalLink size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* CUADRANTE 3: ¿QUÉ ESTÁ EN RIESGO? */}
        <div className="glass-panel" style={{ padding: '1.5rem', border: criticalTasks.length > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ color: '#ef4444', marginTop: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(239,68,68,0.2)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} /> 3. ¿Qué está en Riesgo?
            </span>
            <span style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
              {criticalTasks.length}
            </span>
          </h3>

          {criticalTasks.length === 0 ? (
            <p style={{ color: 'var(--color-success)', margin: '1.5rem 0 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={18} /> Ningún Gate ni Tarea Crítica en riesgo.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
              {criticalTasks.map(t => {
                const responsibles = getResponsiblesForTask(t);
                const taskTitle = t.task || t.title;

                return (
                  <div key={t.id} style={{ background: 'rgba(0, 0, 0, 0.35)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div>
                        <div style={{ color: 'var(--text-heading)', fontWeight: 'bold', fontSize: '0.95rem', lineHeight: '1.3' }}>{taskTitle}</div>
                        <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.4rem', fontWeight: '600' }}>
                          Responsabilidad: {t.role?.replace(/_/g, ' ').toUpperCase()}
                        </div>
                        {t.dependency && t.dependency !== 'Ninguna' && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            <span style={{ color: '#f59e0b' }}>⚠ Dependencia:</span> {t.dependency}
                          </div>
                        )}
                        {t.escalation && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            <span style={{ color: '#ef4444' }}>⇡ Escalamiento:</span> {t.escalation}
                          </div>
                        )}
                      </div>
                      <button onClick={() => navigate(`/checklist/${t.role}?filter=criticas`)} style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        Ver <ArrowUpRight size={13} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                      {responsibles.map((resp, idx) => (
                        <div key={resp.email || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--border-subtle)', padding: '0.5rem', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-heading)', fontWeight: '500' }}>{resp.name}</span>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleOpenGoogleChat(resp.email)} style={{ background: 'transparent', border: '1px solid rgba(0, 210, 255, 0.3)', color: 'var(--crear-blue)', padding: '0.3rem 0.5rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MessageSquare size={14} /> Chat
                            </button>
                            <button onClick={() => handleSendEmail(resp.email, taskTitle, t.role)} style={{ background: 'transparent', border: '1px solid rgba(255, 183, 3, 0.3)', color: 'var(--crear-gold)', padding: '0.3rem 0.5rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Mail size={14} /> Correo
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CUADRANTE 4: ¿QUÉ ESTÁ DELEGADO? (ACCOUNTABILITY) */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--text-muted)', marginTop: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={16} /> 4. ¿Qué está delegado? (Progreso)
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
            {[
              { id: 'coord_c1', name: 'Coordinación C1 / C2' },
              { id: 'coord_maestria', name: 'Coordinación Maestría' },
              { id: 'capitan', name: 'Capitán' },
              { id: 'qt', name: 'Equipo de Apoyo' }
            ].map(role => {
              const progress = getProgressByRole(role.id);
              let barColor = 'var(--crear-gold)';
              if (progress === 100) barColor = 'var(--color-success)';
              else if (progress < 30) barColor = '#ef4444';

              return (
                <div key={role.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                    <span style={{ color: 'var(--text-heading)', fontWeight: '600' }}>{role.name}</span>
                    <span style={{ color: barColor, fontWeight: 'bold' }}>{progress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: barColor, transition: 'width 0.5s ease-out' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botón de Reinicio Rápido */}
          <div style={{ marginTop: '2.5rem', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '1.5rem', textAlign: 'center' }}>
            <button onClick={() => initializeFirestore(currentUser)} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer' }}>
              ⚠ Reiniciar Ciclo / Vaciar Tareas
            </button>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Utilizar solo al finalizar el ciclo MJ</p>
          </div>
        </div>

      </div>
    </div>
  );
}
