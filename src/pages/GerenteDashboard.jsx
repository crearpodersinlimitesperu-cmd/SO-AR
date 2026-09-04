import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useChecklist } from '../context/ChecklistContext';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useUI } from '../context/UIContext';
import { useNavigate } from 'react-router-dom';
import { Target, Zap, AlertTriangle, Users, PlusCircle, Activity, CheckCircle, Building, MessageSquare, Mail, ExternalLink, ArrowRight, Clock, ShieldAlert, ChevronRight, CheckSquare } from 'lucide-react';
import { usersData, normalizeRole } from '../data/usersData';
import TaskAssignmentModal from '../components/TaskAssignmentModal';
import IAAuditor from '../components/IAAuditor';
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
    const allowedRoles = ['gerente', 'direccion', 'director_maestria', 'superadmin', 'consolidado', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'entrenador', 'entrenador_llamadas', 'qt', 'capitan'];
    const isAllowed = currentUser?.isGerente || currentUser?.isDireccion || currentUser?.isSuperAdmin || allowedRoles.includes(currentUser?.appRole);
    if (!isAllowed) {
      navigate('/home');
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
    if (currentUser?.isSuperAdmin || currentUser?.appRole === 'consolidado') return true;
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
    const collabs = task.collaboratorDetails || [];
    
    // Extraer todos los correos asignados (array o string)
    let assignedEmails = [];
    if (task.assignedToEmails && Array.isArray(task.assignedToEmails)) {
      assignedEmails.push(...task.assignedToEmails);
    } else if (task.assignedToEmail) {
      assignedEmails.push(task.assignedToEmail);
    }
    
    // Remover nuestro propio email si somos el creador (para ver a quién delegamos)
    if (task.createdBy === currentUser?.email) {
      assignedEmails = assignedEmails.filter(email => email.toLowerCase() !== currentUser?.email?.toLowerCase());
    }

    const assignedUsers = assignedEmails.map(email => {
       const emailStr = email || '';
       const u = usersData.find(usr => usr.email.toLowerCase() === emailStr.toLowerCase());
       return { name: u?.name?.split(' ')[0] || emailStr.split('@')[0] || 'Desconocido', email: emailStr, role: u?.role || task.role, sede: u?.sede || task.assignedSede || currentUser?.sede };
    });

    if (assignedUsers.length > 0) {
      return [...assignedUsers, ...collabs];
    }
    
    const taskRoleNorm = normalizeRole(task.role);
    const targetSede = (task.sede || currentUser?.sede || '').toLowerCase().trim();

    const sedeMatches = usersData.filter(u => normalizeRole(u.role) === taskRoleNorm && (!u.sede || !targetSede || u.sede.toLowerCase().trim() === targetSede));
    if (sedeMatches.length > 0) return sedeMatches;

    const roleMatches = usersData.filter(u => normalizeRole(u.role) === taskRoleNorm);
    if (roleMatches.length > 0) return roleMatches.slice(0, 2);

    return [{ name: `Resp: ${task.role.replace(/_/g, ' ')}`, email: '', role: task.role, sede: currentUser?.sede }];
  };

  const handleOpenGoogleChat = (email) => {
    // NOTA (23/08/2026): Google Chat no tiene una URL pública que abra el DM
    // de una persona a partir de su email. Abrir un DM exacto por URL requiere
    // la API de Chat (spaces.findDirectMessage) con el ID de usuario resuelto
    // vía People/Directory API, no un enlace directo. Ver:
    // https://developers.google.com/workspace/chat/find-direct-message-in-spaces
    // Mientras no se construya esa integración (Opción B), copiamos el email
    // al portapapeles y abrimos Google Chat para que el usuario lo pegue en el
    // buscador y abra el chat correcto en 2 clics.
    if (!email) {
      window.open('https://chat.google.com/u/0/', '_blank');
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email)
        .then(() => showToast(`Email copiado: ${email}. Pégalo en el buscador de Google Chat para abrir el chat.`, 'success'))
        .catch(() => showToast(`No se pudo copiar automáticamente. Busca a: ${email}`, 'error'));
    } else {
      showToast(`Busca en Google Chat a: ${email}`, 'success');
    }
    window.open('https://chat.google.com/u/0/', '_blank');
  };

  const handleSendEmail = (email, taskTitle, taskRole) => {
    const subject = `⚠️ URGENTE Causa OS: ${taskTitle}`;
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
          {/* CONTEXTO (28/08/2026): auditoría de roles encontró que este botón no tenía
              ningún condicional — cualquier rol que llegara a este dashboard (coordinador,
              entrenador, QT, capitán) podía abrir el editor de sedes/hoteles. Firestore ya
              bloqueaba la escritura del lado servidor, pero la interfaz ni debía ofrecer el
              botón. Se gatea igual que "Asignar Meta" y "Directorio de Equipo" en esta misma
              barra (gerencia/dirección). */}
          {(currentUser?.isSuperAdmin || currentUser?.appRole === 'gerente' || currentUser?.isDireccion || currentUser?.appRole === 'director_maestria') && (
            <button className="btn-secondary" onClick={() => setShowVenueModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building size={16} /> Hoteles Sede
            </button>
          )}
          {(currentUser?.isSuperAdmin || currentUser?.appRole === 'gerente' || currentUser?.isDireccion || currentUser?.appRole === 'director_maestria') && (
            <button className="btn-primary" onClick={() => setShowTaskForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PlusCircle size={16} /> Asignar Meta
            </button>
          )}
          {(currentUser?.isSuperAdmin || currentUser?.appRole === 'gerente' || currentUser?.isDireccion || currentUser?.appRole === 'director_maestria') && (
            <button className="btn-primary" onClick={() => navigate('/superadmin')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #8b5cf6, #29abe2)', color: 'white', border: 'none' }}>
              👥 Directorio de Equipo
            </button>
          )}
          {(currentUser?.appRole === 'gerente') && (
            <button 
              className="btn-primary" 
              onClick={() => window.open('https://cartas.crearpsl.net/', '_blank')} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #f59e0b, #ec4899)', color: 'white', border: 'none' }}
            >
              <Mail size={16} /> Sistema de Cartas
            </button>
          )}
          <button className="btn-secondary" onClick={() => navigate('/')}>Volver</button>
        </div>
      </div>

      <TaskAssignmentModal isOpen={showTaskForm} onClose={() => setShowTaskForm(false)} />
      <VenueConfigModal isOpen={showVenueModal} onClose={() => setShowVenueModal(false)} />

      
      {/* BANNER OPERATIVO REPORTE RELÁMPAGO POST-FDS */}
      <div 
        className="glass-panel" 
        style={{ 
          marginBottom: '1.5rem', 
          padding: '1.2rem 1.5rem', 
          borderLeft: '5px solid #f59e0b', 
          background: 'linear-gradient(90deg, rgba(245,158,11,0.1), rgba(0,0,0,0.3))',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '1rem' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(245,158,11,0.2)', padding: '0.7rem', borderRadius: '10px', color: '#fbbf24' }}>
            <Zap size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h4 style={{ margin: 0, color: '#fff', fontSize: '1.05rem', fontWeight: 800 }}>
                ⚡ Reporte Relámpago Post-FDS (Nodus & Causa OS)
              </h4>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 800 }}>
                🔒 Candado Presupuestario
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              ⏰ Horario Operativo: <strong>Habilita Domingo 21:00 PM</strong> | <strong>Deadline Innegociable: Lunes 12:00 PM (Mediodía)</strong>. Tiempo de llenado: &lt; 3 minutos.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/reportes')}
          className="btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#000',
            fontWeight: 800,
            fontSize: '0.85rem',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <Zap size={16} /> Llenar Reporte Relámpago
        </button>
      </div>

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
                        Ver <ArrowRight size={13} />
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

      {/* SECCIÓN DE HORARIOS OPERATIVOS DEL EQUIPO (OFICINA, GERENCIA Y COORDINACIÓN) */}
      <div style={{ marginTop: "2.5rem", marginBottom: "2rem" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.6rem", marginBottom: "1.2rem" }}>
          <h2 style={{ fontSize: "1.35rem", color: "var(--text-heading)", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Clock size={22} color="var(--crear-cyan)" />
            Horarios Operativos y Turnos: Oficina, Gerentes y Coordinadores
          </h2>
          <button
            onClick={() => navigate('/calendario-equipo')}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--crear-cyan)' }}
          >
            Ver Calendario Interactivo & Time Boxing <ArrowRight size={14} />
          </button>
        </div>

        {/* TARJETAS DE TURNOS POR ROL */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
          
          {/* OFICINA */}
          <div className="glass-panel" style={{ padding: "1.4rem", borderTop: "4px solid #0ea5e9", borderRadius: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
              <h3 style={{ color: "#38bdf8", margin: 0, fontSize: "1.1rem" }}>🏢 Equipo de Oficina</h3>
              <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "12px", background: "rgba(14, 165, 233, 0.15)", color: "#38bdf8", fontWeight: "bold" }}>Soporte & Mesas</span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div><strong>Lunes a Jueves (Semanal):</strong> 09:00 - 18:00 (Atención, cobranzas, facturación y regularización).</div>
              <div><strong>Jueves (Montaje):</strong> 15:00 - 20:00 (Terminales Nodus, caja y cierre bajo llave).</div>
              <div><strong>Viernes (Apertura):</strong> 07:45 - 23:30 (Mesas registro QR, cartas y soporte Noche de Confianza).</div>
              <div><strong>Sábado (Operativo):</strong> 08:00 - 22:30 (Ticket Naranja y soporte de sala).</div>
              <div><strong>Domingo (Fiscal):</strong> 08:00 - 22:00 (<span style={{ color: "#ef4444", fontWeight: "bold" }}>21:00 Cierre Contable POS obligatorio</span> y envío de fichas firmadas).</div>
            </div>
          </div>

          {/* GERENCIA */}
          <div className="glass-panel" style={{ padding: "1.4rem", borderTop: "4px solid #f59e0b", borderRadius: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
              <h3 style={{ color: "#fbbf24", margin: 0, fontSize: "1.1rem" }}>👔 Gerentes de Sede</h3>
              <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "12px", background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", fontWeight: "bold" }}>Gobernanza Nivel 8</span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div><strong>Lunes:</strong> 08:30 - 12:00 (Cierre de Caja Nodus) • <span style={{ color: "#ef4444", fontWeight: "bold" }}>12:00 Trigger Impecabilidad Contable</span>.</div>
              <div><strong>Martes:</strong> 09:00 - 13:00 (Auditoría salones, hotel y coach) • 15:00 (QT Sync).</div>
              <div><strong>Miércoles:</strong> <span style={{ color: "#ef4444", fontWeight: "bold" }}>19:00 Trigger Alerta Deserción</span> (verificación de FI en Nodus).</div>
              <div><strong>Jueves:</strong> 14:30 - 20:30 (Supervisión presencial: techo 4.5m, audio y sala).</div>
              <div><strong>Viernes a Domingo:</strong> 14:01 Trigger Palabra Rota • Domingo liderazgo Mesas de Enrolamiento (50% / 70%).</div>
            </div>
          </div>

          {/* COORDINADORES */}
          <div className="glass-panel" style={{ padding: "1.4rem", borderTop: "4px solid #8b5cf6", borderRadius: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
              <h3 style={{ color: "#a78bfa", margin: 0, fontSize: "1.1rem" }}>🎯 Coordinadores (CC1Y2 & CMJ)</h3>
              <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "12px", background: "rgba(139, 92, 246, 0.15)", color: "#a78bfa", fontWeight: "bold" }}>Nivel 5 & 6</span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div><strong>Miércoles:</strong> 19:00 Deadline carga FI (CMJ) • 20:00 Grounding virtual aliados C2 (CC1Y2).</div>
              <div><strong>Jueves:</strong> 15:00 Montaje de sala • 18:00 Grounding presencial C1 (Puertas cerradas).</div>
              <div><strong>Viernes:</strong> 08:00 Grounding C1 • 11:30 Reporte asistencia • 22:00 Noche de Confianza con tinas.</div>
              <div><strong>Sábado:</strong> Caída de Confianza con escalera 2m, colchoneta y 4 apoyos certificados.</div>
              <div><strong>Domingo:</strong> Control Mesa C2 Nodus (Ticket Rojo) • 18:00 Pase de Antorcha Maestría.</div>
            </div>
          </div>

        </div>

        {/* SUB-SECCIÓN: HORARIOS DE ENTRENAMIENTOS EN SALA (PARTICIPANTES) */}
        <h3 style={{ fontSize: "1.15rem", color: "var(--text-heading)", marginBottom: "0.8rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          ⏰ Horarios de Sala de Participantes & Vestimenta (C1 / C2 / MJ)
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
          {/* CAPITULO UNO */}
          <div className="glass-panel" style={{ padding: "1.4rem", borderTop: "4px solid #8b5cf6", borderRadius: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ color: "#8b5cf6", margin: 0, fontSize: "1.1rem" }}>Capítulo UNO (C1)</h3>
              <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "12px", background: "rgba(139, 92, 246, 0.15)", color: "#a78bfa", fontWeight: "bold" }}>Descubrimiento</span>
            </div>
            <table style={{ width: "100%", fontSize: "0.85rem", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                  <th style={{ padding: "0.4rem 0" }}>DÍA</th>
                  <th style={{ padding: "0.4rem 0" }}>HORARIO</th>
                  <th style={{ padding: "0.4rem 0", textAlign: "right" }}>VESTIMENTA</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "0.6rem 0", fontWeight: "bold" }}>Jueves</td>
                  <td style={{ padding: "0.6rem 0", color: "var(--text-muted)" }}>4:30 PM - Cierre</td>
                  <td style={{ padding: "0.6rem 0", textAlign: "right", color: "var(--text-main)" }}>Negro</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "0.6rem 0", fontWeight: "bold" }}>Viernes</td>
                  <td style={{ padding: "0.6rem 0", color: "var(--text-muted)" }}>7:30 AM - 3:00 PM<br/><span style={{ color: "var(--crear-cyan)" }}>5:00 PM - Cierre (Noche Confianza)</span></td>
                  <td style={{ padding: "0.6rem 0", textAlign: "right", color: "#f59e0b", fontWeight: "600" }}>Negro formal</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "0.6rem 0", fontWeight: "bold" }}>Sábado</td>
                  <td style={{ padding: "0.6rem 0", color: "var(--text-muted)" }}>8:00 AM - 4:00 PM<br/>3:00 PM - Cierre</td>
                  <td style={{ padding: "0.6rem 0", textAlign: "right", color: "var(--text-main)" }}>Polo / pantalón negro</td>
                </tr>
                <tr>
                  <td style={{ padding: "0.6rem 0", fontWeight: "bold" }}>Domingo</td>
                  <td style={{ padding: "0.6rem 0", color: "var(--text-muted)" }}>8:00 AM - Cierre (Graduación)</td>
                  <td style={{ padding: "0.6rem 0", textAlign: "right", color: "var(--text-main)" }}>Polo / pantalón negro</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* CAPITULO DOS */}
          <div className="glass-panel" style={{ padding: "1.4rem", borderTop: "4px solid #29abe2", borderRadius: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ color: "#29abe2", margin: 0, fontSize: "1.1rem" }}>Capítulo DOS (C2)</h3>
              <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "12px", background: "rgba(41, 171, 226, 0.15)", color: "#38bdf8", fontWeight: "bold" }}>Avanzado</span>
            </div>
            <table style={{ width: "100%", fontSize: "0.85rem", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                  <th style={{ padding: "0.4rem 0" }}>DÍA</th>
                  <th style={{ padding: "0.4rem 0" }}>HORARIO</th>
                  <th style={{ padding: "0.4rem 0", textAlign: "right" }}>VESTIMENTA</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "0.6rem 0", fontWeight: "bold" }}>Jueves</td>
                  <td style={{ padding: "0.6rem 0", color: "var(--text-muted)" }}>10:30 AM - 4:00 PM<br/>4:00 PM - Cierre</td>
                  <td style={{ padding: "0.6rem 0", textAlign: "right", color: "#f59e0b", fontWeight: "600" }}>Negro formal</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "0.6rem 0", fontWeight: "bold" }}>Viernes</td>
                  <td style={{ padding: "0.6rem 0", color: "var(--text-muted)" }}>7:15 AM - 4:00 PM<br/>4:00 PM - Cierre</td>
                  <td style={{ padding: "0.6rem 0", textAlign: "right", color: "var(--text-main)" }}>Polo / pantalón negro</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "0.6rem 0", fontWeight: "bold" }}>Sábado</td>
                  <td style={{ padding: "0.6rem 0", color: "var(--text-muted)" }}>7:30 AM - 3:00 PM<br/>3:00 PM - Cierre</td>
                  <td style={{ padding: "0.6rem 0", textAlign: "right", color: "var(--text-main)" }}>Polo / pantalón negro</td>
                </tr>
                <tr>
                  <td style={{ padding: "0.6rem 0", fontWeight: "bold" }}>Domingo</td>
                  <td style={{ padding: "0.6rem 0", color: "var(--text-muted)" }}>Inicio - Cierre<br/>3:00 PM - Cierre</td>
                  <td style={{ padding: "0.6rem 0", textAlign: "right", color: "var(--text-main)" }}>Polo / pantalón negro</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* MAESTRIA */}
          <div className="glass-panel" style={{ padding: "1.4rem", borderTop: "4px solid #f59e0b", borderRadius: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ color: "#f59e0b", margin: 0, fontSize: "1.1rem" }}>Maestría del Juego (MJ)</h3>
              <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "12px", background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", fontWeight: "bold" }}>Liderazgo Cuántico</span>
            </div>
            <table style={{ width: "100%", fontSize: "0.85rem", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                  <th style={{ padding: "0.4rem 0" }}>DÍA</th>
                  <th style={{ padding: "0.4rem 0" }}>HORARIO</th>
                  <th style={{ padding: "0.4rem 0", textAlign: "right" }}>VESTIMENTA</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "0.6rem 0", fontWeight: "bold" }}>Viernes</td>
                  <td style={{ padding: "0.6rem 0", color: "var(--text-muted)" }}>3:00 PM - 9:00 PM</td>
                  <td style={{ padding: "0.6rem 0", textAlign: "right", color: "#f59e0b", fontWeight: "600" }}>Negro formal</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "0.6rem 0", fontWeight: "bold" }}>Sábado</td>
                  <td style={{ padding: "0.6rem 0", color: "var(--text-muted)" }}>8:30 AM - 12:00 PM<br/>4:00 PM - 9:00 PM</td>
                  <td style={{ padding: "0.6rem 0", textAlign: "right", color: "var(--text-main)" }}>Camiseta / pantalón negro</td>
                </tr>
                <tr>
                  <td style={{ padding: "0.6rem 0", fontWeight: "bold" }}>Domingo</td>
                  <td style={{ padding: "0.6rem 0", color: "var(--text-muted)" }}>8:30 AM - 12:00 PM<br/>4:00 PM - Cierre</td>
                  <td style={{ padding: "0.6rem 0", textAlign: "right", color: "var(--text-main)" }}>Camiseta / pantalón negro</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* NOTA DE VESTIMENTA OFICIAL 2026 */}
        <div style={{ marginTop: '1rem', padding: '0.8rem 1.2rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <span style={{ fontSize: '1.2rem' }}>👟</span>
          <span><strong>Actualización Vestimenta 2026:</strong> Para preservar la energía física y dinamismo en sala durante sesiones prolongadas, el <strong>Entrenador / Coach</strong> tiene autorización formal para el uso de <strong>zapatillas deportivas negras</strong>. Todo el resto del staff y directiva mantiene el código de etiqueta negra rigurosa.</span>
        </div>
      </div>

      <TaskAssignmentModal isOpen={showTaskForm} onClose={() => setShowTaskForm(false)} />
      <VenueConfigModal isOpen={showVenueModal} onClose={() => setShowVenueModal(false)} />
    </div>
  );
}
