import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useChecklist } from '../context/ChecklistContext';
import { useUI } from '../context/UIContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  LogOut, Clock, Calendar as CalendarIcon, MapPin, CheckCircle2, 
  AlertCircle, Circle, RefreshCw, CalendarPlus, Bell, Users, AtSign, 
  BookOpen, Lightbulb, Search, X, Filter, ChevronDown, Sparkles,
  Zap, LayoutGrid, Sliders, CheckSquare, ArrowRight, ShieldCheck,
  TrendingUp, Compass, HelpCircle
} from 'lucide-react';
import { getFlagForSede } from '../utils/flags';
import { createGoogleEvent } from '../services/googleSync';
import { calculateAutomaticDeadline } from '../utils/soarDates';
import TaskAssignmentModal from '../components/TaskAssignmentModal';
import VenueConfigModal from '../components/VenueConfigModal';
import ViewModeSelector from '../components/ViewModeSelector';
import { getVenueForTraining } from '../data/venuesData';
import { ROLE_DISPLAY_NAMES } from '../data/usersData';
import { canAssignTrainer } from '../config/permissions';

/**
 * Normaliza y verifica si un evento está asignado a un entrenador específico
 */
const isTrainerMatchingUser = (evTrainer, user) => {
  if (!evTrainer || !user) return false;
  const normalize = (str) => (str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

  const trainerStr = normalize(evTrainer);
  const userName = normalize(user.name || user.displayName || '');
  const userEmail = normalize(user.email || '');

  if (!trainerStr || trainerStr === 'tba' || /^\d+$/.test(trainerStr) || /^eq\s*\d+$/i.test(trainerStr)) return false;

  if (userName && (trainerStr.includes(userName) || userName.includes(trainerStr))) return true;

  const nameParts = userName.split(/\s+/).filter(p => p.length >= 3);
  const trainerParts = trainerStr.split(/[\/\s,\-]+/).filter(p => p.length >= 3);
  
  if (nameParts.length > 0) {
    const matchedTokens = nameParts.filter(part => trainerParts.some(tp => tp.includes(part) || part.includes(tp)));
    if (matchedTokens.length >= Math.min(2, nameParts.length)) return true;
  }

  const emailPrefix = userEmail.split('@')[0];
  const emailTokens = emailPrefix.split(/[\._\-]/).filter(t => t.length >= 3);
  if (emailTokens.length > 0) {
    const matchedEmailTokens = emailTokens.filter(tok => trainerParts.some(tp => tp.includes(tok) || tok.includes(tp)));
    if (matchedEmailTokens.length >= Math.min(2, emailTokens.length)) return true;
  }

  return false;
};

export default function Home() {
  const { currentUser, logout, switchRole } = useAuth();
  const { currentCycle, currentStage, events, loadingEvents } = useCycles();
  const { tasks: allTasks, loading: loadingTasks, syncTasksToGoogle, acceptCollaboration, rejectCollaboration } = useChecklist();
  const { showToast, viewMode, customModules } = useUI();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  // Reloj local
  const [time, setTime] = useState(new Date());
  
  // Eventos locales
  const [activeEventTab, setActiveEventTab] = useState('locales');
  const [timeFilter, setTimeFilter] = useState('futuros');
  const [selectedSedeFilter, setSelectedSedeFilter] = useState('todas');
  const [selectedTrainingFilter, setSelectedTrainingFilter] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const toolsDropdownRef = useRef(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(event.target)) {
        setShowToolsDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddEventToGoogle = async (ev, startDate, endDate) => {
    const token = sessionStorage.getItem('googleAccessToken');
    const hotelLocation = getVenueForTraining(ev.sede || ev.sedeTag || currentUser?.sede, ev.nombre || ev.name, ev.lugar, ev.direccion);
    
    const result = await createGoogleEvent({
      summary: `CREAR: ${ev.nombre || ev.name}`,
      location: hotelLocation,
      description: `Lugar / Hotel Oficial: ${hotelLocation}\n${ev.detalles || ''}${currentUser?.appRole !== 'qt' ? `\nEntrenador: ${ev.trainer || ev.equipo || 'TBA'}` : ''}`,
      start: startDate,
      end: endDate
    }, token);

    if (result.success) {
      if (result.via === 'api') {
        showToast(`¡"${ev.nombre || ev.name}" añadido a tu Google Calendar exitosamente!`, "success");
      } else {
        showToast(`Abriendo Google Calendar para agendar "${ev.nombre || ev.name}"...`, "info");
      }
    } else {
      showToast(result.error || "Hubo un error al abrir el calendario.", "error");
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  // Cálculo de tareas del usuario
  const userEmail = (currentUser?.email || '').toLowerCase().trim();
  const activeRole = currentUser?.appRole || currentUser?.role || 'gerente';
  const myTasksForProgress = allTasks.filter(t => {
    const isAssigned = (t.assignedToEmails && t.assignedToEmails.some(e => e.toLowerCase().trim() === userEmail)) || (t.assignedToEmail && t.assignedToEmail.toLowerCase().trim() === userEmail) ||
                       (t.collaborators && t.collaborators.map(c => c.toLowerCase().trim()).includes(userEmail));
    if (isAssigned) return true;
    if (activeRole === 'consolidado' || activeRole === 'direccion') {
      return t.role === 'direccion' || t.role === 'gerente';
    }
    return t.role === activeRole;
  });
  const completedForProgress = myTasksForProgress.filter(t => t.completed || t.status === 'Completada').length;
  const progressPercentage = myTasksForProgress.length > 0 ? Math.round((completedForProgress / myTasksForProgress.length) * 100) : 0;
  const criticasCount = myTasksForProgress.filter(t => !t.completed && (t.isCritical || t.priority === '🔴 ROJO')).length;
  const importantesCount = myTasksForProgress.filter(t => !t.completed && t.status !== 'Completada' && !t.isCritical && t.priority !== '🔴 ROJO').length;

  const urgentTasks = myTasksForProgress.filter(t => !t.completed && t.status !== 'Completada');
  urgentTasks.sort((a, b) => {
    const valA = (a.isCritical || a.priority === '🔴 ROJO') ? 3 : (a.priority === '🟡 AMARILLO' ? 2 : 1);
    const valB = (b.isCritical || b.priority === '🔴 ROJO') ? 3 : (b.priority === '🟡 AMARILLO' ? 2 : 1);
    return valB - valA;
  });

  return (
    <div style={{ maxWidth: viewMode === 'lite' ? '780px' : '960px', margin: '0 auto', padding: viewMode === 'lite' ? '1.5rem 1rem' : '2rem 1rem' }}>
      
      {/* CABECERA PRINCIPAL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <img 
            src="/logo.png" 
            alt="CREAR PODER SIN LÍMITES" 
            style={{ 
              height: viewMode === 'lite' ? '130px' : '170px', 
              marginBottom: '1rem', 
              objectFit: 'contain', 
              filter: 'drop-shadow(0 10px 25px rgba(212, 175, 55, 0.6)) drop-shadow(0 4px 10px rgba(41, 171, 226, 0.4))', 
              display: 'block', 
              transform: viewMode === 'lite' ? 'scale(1)' : 'scale(1.05)', 
              transformOrigin: 'left center' 
            }} 
          />
          <h1 className="text-gold" style={{ margin: 0, fontSize: viewMode === 'lite' ? '2rem' : '2.4rem', fontWeight: '900', letterSpacing: '-0.5px' }}>
            {time.getHours() < 12 ? 'Buenos días' : time.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches'}, {currentUser?.displayName || 'Equipo'}
          </h1>
          <p className="text-muted" style={{ margin: '0.4rem 0 0', textTransform: 'uppercase', fontSize: '0.85rem' }}>
            {(currentUser?.isSuperAdmin || currentUser?.appRole === 'direccion') ? 'MÚLTIPLES EQUIPOS (GLOBAL) • VISIÓN MÚLTIPLES SEDES' : (currentCycle ? `${currentCycle.name} • ETAPA: ${currentStage}` : 'CARGANDO CICLO...')}
          </p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={15} className="text-blue" />
              <span className="text-white" style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="text-muted" style={{ marginLeft: '0.3rem', fontSize: '0.85rem' }}>
                {time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>

            <span style={{ 
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 95, 70, 0.3))', 
              border: '1px solid #10b981', 
              color: '#10b981', 
              padding: '2px 8px', 
              borderRadius: '12px', 
              fontSize: '0.72rem', 
              fontWeight: 700, 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '5px' 
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }}></span>
              SO-AR v2.8.0
            </span>
          </div>
        </div>

        {/* CONTROLES SUPERIORES Y SELECTOR DE VISTA */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.8rem' }}>
          
          {/* SELECTOR DE MODO DE VISTA (LITE / COMPACTO / PRO) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Vista:</span>
            <ViewModeSelector />
          </div>

          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{currentUser?.name || currentUser?.displayName || 'Usuario'}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--crear-gold)', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                {currentUser?.isSuperAdmin && !currentUser?.isSimulated
                  ? <>Super Admin | Gerente Lima {getFlagForSede('Lima')}</>
                  : <>{ROLE_DISPLAY_NAMES[currentUser?.appRole] || currentUser?.appRole?.replace(/_/g, ' ') || 'Miembro'} {getFlagForSede(currentUser?.sede)}</>}
              </span>
              {currentUser?.roles && currentUser.roles.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '3px' }}>
                  <select
                    value={currentUser.activeRole || currentUser.appRole}
                    onChange={(e) => switchRole(e.target.value)}
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      background: 'rgba(255, 183, 3, 0.15)',
                      border: '1px solid var(--crear-gold)',
                      color: 'var(--text-heading)',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                    title="Cambiar tu rol activo"
                  >
                    {currentUser.roles.map(r => (
                      <option key={r} value={r} style={{ background: '#0d152d', color: '#ffffff' }}>
                        🎭 {ROLE_DISPLAY_NAMES[r] || r.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Avatar" style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2px solid var(--crear-gold)' }} />
            ) : (
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'var(--crear-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '2px solid var(--crear-gold)' }}>
                {currentUser?.displayName ? currentUser.displayName.charAt(0) : 'U'}
              </div>
            )}
            
            {/* Notificaciones */}
            <div style={{ position: 'relative' }}>
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} onClick={() => setShowNotifications(!showNotifications)}>
                <Bell size={20} className="text-white" />
                {unreadCount > 0 && (
                  <div style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--color-error)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 'bold' }}>
                    {unreadCount}
                  </div>
                )}
              </div>
              
              {showNotifications && (
                <div className="glass-panel" style={{ position: 'absolute', top: '125%', right: 0, width: '320px', zIndex: 100, padding: '1rem', boxShadow: '0 10px 40px rgba(0,0,0,0.8)', border: '1px solid rgba(41, 171, 226, 0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, color: 'var(--crear-gold)' }}>🔔 Notificaciones</h4>
                    <button onClick={() => { markAllAsRead(); setShowNotifications(false); }} style={{ background: 'transparent', border: 'none', color: 'var(--crear-cyan)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>Marcar leídas</button>
                  </div>
                  <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingRight: '0.5rem' }}>
                    {notifications?.length > 0 ? notifications.map(n => (
                      <div key={n.id} style={{ fontSize: '0.8rem', padding: '0.75rem', background: n.read ? 'rgba(0,0,0,0.4)' : 'rgba(41, 171, 226, 0.15)', borderRadius: '8px', borderLeft: n.read ? 'none' : '3px solid var(--crear-cyan)' }}>
                        <strong style={{ color: n.read ? 'var(--text-muted)' : '#ffffff', display: 'block', marginBottom: '0.2rem' }}>{n.title || 'Alerta'}</strong>
                        <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: '1.4' }}>{n.message}</p>
                      </div>
                    )) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', margin: '1rem 0' }}>No tienes notificaciones recientes.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button 
              type="button"
              onClick={() => setShowTaskModal(true)} 
              className="btn-neon-action"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
            >
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span>
              <span>TAREA</span>
            </button>

            {/* BOTÓN SALIR */}
            <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <LogOut size={15} /> Salir
            </button>
          </div>
        </div>
      </div>

      {/* BARRA DE HERRAMIENTAS ADAPTABLE SEGÚN MODO */}
      {viewMode === 'compact' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.6rem 1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              onClick={() => navigate(currentUser?.appRole === 'gerente' ? '/gerente' : `/checklist/${currentUser?.appRole || 'capitan'}`)}
              className="btn-primary"
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              📋 Abrir Mi Checklist
            </button>
            <button
              onClick={() => navigate('/metas')}
              className="btn-secondary"
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
            >
              🎯 Mis Metas
            </button>
          </div>

          {/* MENÚ DESPLEGABLE DE MÁS MÓDULOS */}
          <div style={{ position: 'relative' }} ref={toolsDropdownRef}>
            <button
              onClick={() => setShowToolsDropdown(!showToolsDropdown)}
              className="btn-secondary hover-glow"
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(41, 171, 226, 0.1)', borderColor: 'rgba(41, 171, 226, 0.4)', color: 'var(--crear-cyan)', fontWeight: 'bold' }}
            >
              🛠️ Más Módulos y Herramientas <ChevronDown size={16} />
            </button>

            {showToolsDropdown && (
              <div className="glass-panel" style={{
                position: 'absolute',
                top: '120%',
                right: 0,
                width: '260px',
                zIndex: 100,
                padding: '0.6rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                boxShadow: '0 10px 40px rgba(0,0,0,0.9)',
                border: '1px solid rgba(41, 171, 226, 0.3)'
              }}>
                {(currentUser?.isGerente || currentUser?.isDireccion || currentUser?.isSuperAdmin) && (
                  <>
                    <button onClick={() => { setShowToolsDropdown(false); navigate('/gerente'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start' }}>
                      💼 SO-AR Gerencial
                    </button>
                    <button onClick={() => { setShowToolsDropdown(false); navigate('/auditoria-kpis'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start' }}>
                      📈 Auditoría de KPIs
                    </button>
                  </>
                )}

                {['coord_c1', 'coord_maestria', 'qt', 'capitan'].includes(currentUser?.appRole) && (
                  <button onClick={() => { setShowToolsDropdown(false); navigate('/mis-kpis'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start' }}>
                    📊 Mis KPIs
                  </button>
                )}

                {!['entrenador', 'entrenador_llamadas'].includes(currentUser?.appRole) && (
                  <button onClick={() => { setShowToolsDropdown(false); navigate('/directorio-qt'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start' }}>
                    ⚡ Directorio QT
                  </button>
                )}

                {(currentUser?.isSuperAdmin || currentUser?.isGerente || currentUser?.isDireccion || currentUser?.appRole === 'director_maestria') && (
                  <button onClick={() => { setShowToolsDropdown(false); navigate('/superadmin'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start' }}>
                    {currentUser?.isSuperAdmin ? '🌐 Centro de Mando' : '👥 Directorio de Equipo'}
                  </button>
                )}

                {(currentUser?.isSuperAdmin || currentUser?.isGerente || currentUser?.isDireccion) && (
                  <button onClick={() => { setShowToolsDropdown(false); window.open('/calendario_global.html?v=' + Date.now() + '&email=' + encodeURIComponent(currentUser?.email || '') + '&name=' + encodeURIComponent(currentUser?.displayName || currentUser?.name || ''), '_blank'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start' }}>
                    📅 Calendario Global Maestro ↗
                  </button>
                )}

                {(currentUser?.isSuperAdmin || currentUser?.isDireccion || currentUser?.isGerente || ['coord_c1', 'coordinador_c1c2', 'coord_c2', 'coordinador', 'cc1y2', 'capitan', 'qt'].includes(currentUser?.appRole)) && (
                  <button onClick={() => { setShowToolsDropdown(false); window.open('https://cpsl-campus-interactivo.vercel.app/ruta', '_blank'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start' }}>
                    🎓 Campus Interactivo ↗
                  </button>
                )}

                {currentUser?.appRole !== 'qt' && (currentUser?.isSuperAdmin || currentUser?.isDireccion || currentUser?.isGerente || ['director_maestria', 'coordinador_mj', 'coord_maestria', 'finanzas', 'cfo'].includes(currentUser?.appRole)) && (
                  <button onClick={() => { setShowToolsDropdown(false); navigate('/centro-managers'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start' }}>
                    🎯 Centro de Managers
                  </button>
                )}

                <button onClick={() => { setShowToolsDropdown(false); navigate('/protocolo-emergencias'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.1)', fontWeight: 'bold' }}>
                  🚨 Protocolo de Emergencias
                </button>

                {(currentUser?.appRole === 'qt' || currentUser?.isSuperAdmin) && (
                  <button onClick={() => { setShowToolsDropdown(false); window.open('https://crearpsl.net/manual_quantum_team.html', '_blank'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start' }}>
                    📘 Manual Quantum Team ↗
                  </button>
                )}
                {currentUser?.appRole !== 'qt' && (
                  <button onClick={() => { setShowToolsDropdown(false); navigate('/manual'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start' }}>
                    📘 Manual y Guía SO-AR
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BARRA PRO COMPLETA (SI ESTÁ EN MODO PRO) */}
      {viewMode === 'pro' && customModules.advancedTools !== false && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(currentUser?.isGerente || currentUser?.isDireccion || currentUser?.isSuperAdmin) && (
            <>
              <button onClick={() => navigate('/gerente')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'var(--crear-gold)', color: 'black' }}>
                💼 SO-AR Gerencial
              </button>
              <button onClick={() => navigate('/auditoria-kpis')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #10b981, #047857)', color: 'white', border: 'none' }}>
                📈 Auditoría KPIs
              </button>
            </>
          )}

          {['coord_c1', 'coord_maestria', 'qt', 'capitan'].includes(currentUser?.appRole) && (
            <button onClick={() => navigate('/mis-kpis')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #10b981, #047857)', color: 'white', border: 'none' }}>
              📊 Mis KPIs
            </button>
          )}

          {(currentUser?.appRole === 'qt' || currentUser?.isSuperAdmin) && (
            <button onClick={() => window.open('https://crearpsl.net/manual_quantum_team.html', '_blank')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #0284c7, #2563eb)', color: 'white', border: 'none' }}>
              📘 Manual QT
            </button>
          )}

          {!['entrenador', 'entrenador_llamadas'].includes(currentUser?.appRole) && (
            <button onClick={() => navigate('/directorio-qt')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none' }}>
              ⚡ Directorio QT
            </button>
          )}

          {(currentUser?.isSuperAdmin || currentUser?.isGerente || currentUser?.isDireccion || currentUser?.appRole === 'director_maestria') && (
            <button onClick={() => navigate('/superadmin')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #8b5cf6, #29abe2)', color: 'white', border: 'none' }}>
              {currentUser?.isSuperAdmin ? '🌐 Centro de Mando' : '👥 Directorio de Equipo'}
            </button>
          )}

          {(currentUser?.isSuperAdmin || currentUser?.isGerente || currentUser?.isDireccion) && (
            <button onClick={() => window.open('/calendario_global.html?v=' + Date.now() + '&email=' + encodeURIComponent(currentUser?.email || '') + '&name=' + encodeURIComponent(currentUser?.displayName || currentUser?.name || ''), '_blank')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white', border: 'none' }}>
              📅 Calendario Global
            </button>
          )}

          {(currentUser?.isSuperAdmin || currentUser?.isDireccion || currentUser?.isGerente || ['coord_c1', 'coordinador_c1c2', 'coord_c2', 'coordinador', 'cc1y2', 'capitan', 'qt'].includes(currentUser?.appRole)) && (
            <button onClick={() => window.open('https://cpsl-campus-interactivo.vercel.app/ruta', '_blank')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none' }}>
              🎓 Campus Interactivo
            </button>
          )}

          {currentUser?.appRole !== 'qt' && (currentUser?.isSuperAdmin || currentUser?.isDireccion || currentUser?.isGerente || ['director_maestria', 'coordinador_mj', 'coord_maestria', 'finanzas', 'cfo'].includes(currentUser?.appRole)) && (
            <button onClick={() => navigate('/centro-managers')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000', fontWeight: 'bold', border: 'none' }}>
              🎯 Centro Managers
            </button>
          )}
        </div>
      )}

      {/* BANNER INTERACTIVO DE SOLICITUDES DE COLABORACIÓN */}
      {(() => {
        const pendingInvites = (notifications || []).filter(n => n.type === 'COLLABORATION_INVITE' && !n.read && n.status !== 'ACEPTADA' && n.status !== 'RECHAZADA');
        if (pendingInvites.length === 0) return null;

        return (
          <div className="glass-panel" style={{ padding: '1.2rem', marginBottom: '1.5rem', border: '1px solid rgba(0, 210, 255, 0.4)', background: 'rgba(0, 210, 255, 0.05)', boxShadow: '0 0 25px rgba(0, 210, 255, 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
              <Users size={20} color="var(--crear-blue)" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff' }}>
                🤝 Invitaciones de Colaboración ({pendingInvites.length} pendientes)
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {pendingInvites.map(inv => (
                <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 0, 0, 0.35)', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)', flexWrap: 'wrap', gap: '0.8rem' }}>
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--crear-blue)', fontSize: '0.9rem' }}>{inv.title}</div>
                    <div style={{ color: 'var(--text-main)', fontSize: '0.82rem', marginTop: '0.2rem' }}>{inv.message}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                      Tarea: <strong style={{ color: '#ffffff' }}>{inv.taskTitle}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => acceptCollaboration(inv)}
                      className="btn-neon-action"
                      style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}
                    >
                      ✅ Aceptar
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectCollaboration(inv)}
                      className="btn-secondary"
                      style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem' }}
                    >
                      ❌ Declinar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* VISTA MODO LITE (ULTRA-LIMPIO / ENFOQUE DIARIO) */}
      {/* ======================================================== */}
      {viewMode === 'lite' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* TARJETA HERO: MI ENFOQUE DE HOY */}
          <div className="glass-panel" style={{ padding: '1.8rem', border: '1px solid rgba(212, 175, 55, 0.3)', background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.08) 0%, rgba(13, 21, 45, 0.9) 100%)', boxShadow: '0 15px 35px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--crear-gold)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>⚡ Vista Rápida Diaria</span>
                <h2 style={{ margin: '0.2rem 0 0 0', color: '#ffffff', fontSize: '1.5rem', fontWeight: '800' }}>Tus Pendientes Críticos</h2>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--crear-gold)' }}>{progressPercentage}%</span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>cumplimiento</span>
              </div>
            </div>

            {/* Barra de Progreso */}
            <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div style={{ height: '100%', width: `${progressPercentage}%`, background: 'linear-gradient(90deg, #29abe2, #d4af37)', transition: 'width 0.5s ease-out' }} />
            </div>

            {/* Resumen de contadores */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem', marginBottom: '1.5rem' }}>
              <div 
                onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=criticas`)}
                style={{ padding: '0.8rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}
              >
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ef4444' }}>{criticasCount}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🔴 Críticas</div>
              </div>
              <div 
                onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=importantes`)}
                style={{ padding: '0.8rem', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}
              >
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ffb347' }}>{importantesCount}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🟡 Importantes</div>
              </div>
              <div 
                onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=completed`)}
                style={{ padding: '0.8rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}
              >
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#10b981' }}>{completedForProgress}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🟢 Listas</div>
              </div>
            </div>

            {/* Lista de Tareas Urgentes (Top 5 en Lite) */}
            <h4 style={{ margin: '0 0 0.8rem 0', color: 'var(--crear-cyan)', fontSize: '0.95rem' }}>🎯 Tareas para Hoy:</h4>
            {urgentTasks.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ margin: 0, color: '#10b981', fontWeight: 'bold' }}>¡Excelente! No tienes tareas urgentes pendientes.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {urgentTasks.slice(0, 5).map(task => {
                  const isCrit = task.isCritical || task.priority === '🔴 ROJO';
                  const color = isCrit ? '#ef4444' : '#ffb347';
                  const bg = isCrit ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.08)';

                  return (
                    <div 
                      key={task.id}
                      onClick={() => navigate(currentUser?.appRole === 'gerente' ? '/gerente' : `/checklist/${currentUser?.appRole}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        background: bg,
                        border: `1px solid ${color}33`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'transform 0.15s'
                      }}
                      onMouseOver={e => e.currentTarget.style.transform = 'translateX(4px)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'translateX(0)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.88rem', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.task || task.title}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--crear-gold)', fontWeight: 'bold', marginLeft: '0.5rem', flexShrink: 0 }}>
                        ⏰ {task.deadline || calculateAutomaticDeadline(task, currentCycle)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* BOTONES PRINCIPALES DE ACCIÓN */}
            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
              <button 
                className="btn-primary" 
                onClick={() => navigate(currentUser?.appRole === 'gerente' ? '/gerente' : `/checklist/${currentUser?.appRole || 'capitan'}`)} 
                style={{ flex: 2, minWidth: '200px', padding: '0.85rem 1.5rem', fontSize: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <span>👉 Ir a mi Checklist Completo</span>
                <ArrowRight size={18} />
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => navigate('/metas')} 
                style={{ flex: 1, minWidth: '130px', padding: '0.85rem 1rem', fontSize: '0.95rem', fontWeight: 'bold' }}
              >
                🎯 Mis Metas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA MODO COMPACTO / PRO */}
      {/* ======================================================== */}
      {viewMode !== 'lite' && (
        <>
          {/* MI PROGRESO GENERAL */}
          {(viewMode === 'compact' || customModules.progress !== false) && !['entrenador', 'entrenador_llamadas'].includes(currentUser?.appRole) && (
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <h3 className="text-main" style={{ margin: 0, fontSize: '1.1rem' }}>Mi Progreso General en el Ciclo</h3>
                <span className="text-gold" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{progressPercentage}%</span>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPercentage}%`, background: 'var(--crear-gold)', transition: 'width 0.5s ease-out' }} />
              </div>
            </div>
          )}

          {/* PANEL DE EVENTOS */}
          {(viewMode === 'compact' || customModules.events !== false) && (
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                <h3 className="text-blue" style={{ marginTop: 0, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                  <CalendarIcon size={18} /> EVENTOS Y ENTRENAMIENTOS
                </h3>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {(currentUser?.isSuperAdmin || currentUser?.isDireccion || currentUser?.isGerente || ['gerente', 'direccion', 'director_maestria', 'qt'].includes(currentUser?.appRole)) && (
                    <button 
                      type="button"
                      onClick={() => setShowVenueModal(true)}
                      className="btn-secondary"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
                      title="Configurar el hotel o salón oficial por defecto de la sede"
                    >
                      🏨 Hoteles / Salones
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: '0.4rem', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '0.6rem' }}>
                    <button 
                      onClick={() => {
                        setActiveEventTab('locales');
                        setSelectedSedeFilter('todas');
                      }}
                      style={{ background: 'none', border: 'none', color: activeEventTab === 'locales' ? 'var(--crear-gold)' : 'var(--text-muted)', fontWeight: activeEventTab === 'locales' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      {['entrenador', 'entrenador_llamadas'].includes(currentUser?.appRole) ? 'MIS FECHAS' : 'MI SEDE'}
                    </button>
                    {(!['entrenador', 'entrenador_llamadas'].includes(currentUser?.appRole) && (currentUser?.isSuperAdmin || currentUser?.isDireccion || currentUser?.isGerente || ['gerente', 'direccion', 'director_maestria', 'qt', 'cfo'].includes(currentUser?.appRole) || currentUser?.sede?.toLowerCase().includes('global'))) && (
                      <button 
                        onClick={() => setActiveEventTab('globales')}
                        style={{ background: 'none', border: 'none', color: activeEventTab === 'globales' ? 'var(--crear-gold)' : 'var(--text-muted)', fontWeight: activeEventTab === 'globales' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        GLOBAL
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Filtros */}
              <div style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                alignItems: 'center', 
                flexWrap: 'wrap', 
                marginBottom: '1rem', 
                background: 'rgba(255,255,255,0.03)', 
                padding: '0.5rem 0.7rem', 
                borderRadius: '8px', 
                border: '1px solid rgba(255,255,255,0.06)' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={13} style={{ color: 'var(--crear-blue)' }} />
                  <select 
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    <option value="futuros" style={{ background: '#0d152d' }}>⏳ Próximos</option>
                    <option value="hoy" style={{ background: '#0d152d' }}>🔥 Hoy</option>
                    <option value="todos" style={{ background: '#0d152d' }}>🗓 Todos</option>
                    <option value="pasados" style={{ background: '#0d152d' }}>📁 Historial</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Filter size={13} style={{ color: 'var(--crear-gold)' }} />
                  <select 
                    value={selectedTrainingFilter}
                    onChange={(e) => setSelectedTrainingFilter(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    <option value="todos" style={{ background: '#0d152d' }}>Todos los tipos</option>
                    <option value="C1" style={{ background: '#0d152d' }}>Capítulo 1</option>
                    <option value="C2" style={{ background: '#0d152d' }}>Capítulo 2</option>
                    <option value="MJ" style={{ background: '#0d152d' }}>Maestría del Juego</option>
                    <option value="VIAJE" style={{ background: '#0d152d' }}>Viajes</option>
                    <option value="OTROS" style={{ background: '#0d152d' }}>Confianza / Tanque</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flex: 1, minWidth: '150px' }}>
                  <Search size={13} style={{ color: 'var(--text-muted)' }} />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar evento, trainer o lugar..."
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.78rem', width: '100%' }}
                  />
                </div>
              </div>

              {/* Lista de eventos filtrados */}
              {loadingEvents ? (
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Cargando eventos oficiales...</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {(() => {
                    const isEntrenador = ['entrenador', 'entrenador_llamadas'].includes(currentUser?.appRole);
                    let displayEvents = (events || []).filter(ev => {
                      if (activeEventTab === 'locales') {
                        if (isEntrenador) return isTrainerMatchingUser(ev.trainer || ev.entrenador, currentUser);
                        const userSede = currentUser?.sede || '';
                        if (!userSede || userSede.toLowerCase().includes('global')) return true;
                        const evSede = ev.sede || ev.sedeTag || '';
                        return evSede.toLowerCase().includes(userSede.toLowerCase()) || userSede.toLowerCase().includes(evSede.toLowerCase());
                      }
                      return true;
                    });

                    if (searchQuery.trim()) {
                      const q = searchQuery.toLowerCase().trim();
                      displayEvents = displayEvents.filter(ev => {
                        const name = (ev.nombre || ev.name || '').toLowerCase();
                        const trainer = (ev.trainer || ev.entrenador || '').toLowerCase();
                        const sede = (ev.sede || ev.sedeTag || ev.place || ev.address || ev.lugar || '').toLowerCase();
                        return name.includes(q) || trainer.includes(q) || sede.includes(q);
                      });
                    }

                    if (timeFilter !== 'todos') {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const now = today.getTime();
                      displayEvents = displayEvents.filter(ev => {
                        const evDate = new Date(ev.fecha_inicio || ev.start || new Date());
                        evDate.setHours(0, 0, 0, 0);
                        const evTime = evDate.getTime();
                        if (timeFilter === 'futuros') return evTime >= now;
                        if (timeFilter === 'pasados') return evTime < now;
                        if (timeFilter === 'hoy') return evTime === now;
                        return true;
                      });
                    }

                    if (selectedTrainingFilter !== 'todos') {
                      displayEvents = displayEvents.filter(ev => {
                        const name = (ev.nombre || ev.name || '').toUpperCase();
                        if (selectedTrainingFilter === 'C1') return name.includes('CAPITULO UNO') || name.includes('C1') || name.includes('CAPÍTULO UNO');
                        if (selectedTrainingFilter === 'C2') return name.includes('CAPITULO DOS') || name.includes('C2') || name.includes('CAPÍTULO DOS');
                        if (selectedTrainingFilter === 'MJ') return name.includes('MAESTRIA') || name.includes('MJ') || name.includes('MAESTRÍA');
                        if (selectedTrainingFilter === 'VIAJE') return name.includes('VIAJE') || name.includes('RETIRO');
                        if (selectedTrainingFilter === 'OTROS') return !name.includes('CAPITULO') && !name.includes('MAESTRIA') && !name.includes('VIAJE') && !name.includes('CAPÍTULO') && !name.includes('MAESTRÍA');
                        return true;
                      });
                    }

                    // Sort events by date ascending so closest events show first
                    displayEvents.sort((a, b) => {
                      const dateA = new Date(a.fecha_inicio || a.start || 0).getTime();
                      const dateB = new Date(b.fecha_inicio || b.start || 0).getTime();
                      return timeFilter === 'pasados' ? dateB - dateA : dateA - dateB; // Past events descending, future ascending
                    });

                    if (displayEvents.length === 0) {
                      return (
                        <div style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
                          <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>No hay eventos registrados en este filtro.</p>
                        </div>
                      );
                    }

                    return (
                      <div style={{ maxHeight: '320px', overflowY: 'auto', paddingRight: '0.4rem' }}>
                        {displayEvents.slice(0, 8).map((ev, i) => {
                          const baseDate = ev.fecha_inicio || ev.start;
                          const evStartDate = new Date(baseDate || new Date());
                          let evEndDate = new Date(ev.fecha_fin || baseDate || new Date());
                          const hotelVenue = getVenueForTraining(ev.sede || ev.sedeTag || currentUser?.sede, ev.nombre || ev.name, ev.lugar, ev.direccion);

                          return (
                            <li key={i} style={{ padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.8rem' }}>
                              <div style={{ minWidth: 0 }}>
                                <span className="text-white" style={{ fontWeight: 'bold', fontSize: '0.92rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {ev.nombre || ev.name || 'Entrenamiento'}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--crear-cyan)', display: 'block', marginTop: '0.1rem' }}>
                                  🏨 {hotelVenue}
                                </span>
                                {(!['qt', 'capitan', 'manager'].includes(currentUser?.appRole)) && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.1rem' }}>
                                    🎙️ Trainer: {ev.trainer || ev.entrenador || 'Por confirmar'}
                                  </span>
                                )}
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <span className="text-gold" style={{ fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'flex-end' }}>
                                  <MapPin size={11} /> {getFlagForSede(ev.sede || ev.sedeTag)} {ev.sede || ev.sedeTag || 'GLOBAL'}
                                </span>
                                <span className="text-muted" style={{ fontSize: '0.75rem', display: 'block' }}>
                                  {ev.fecha_inicio ? ev.fecha_inicio.substring(0, 10) : ''}
                                </span>
                                <button 
                                  onClick={() => handleAddEventToGoogle(ev, evStartDate, evEndDate)}
                                  style={{ background: 'transparent', border: '1px solid rgba(41, 171, 226, 0.3)', color: 'var(--crear-cyan)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.25rem', cursor: 'pointer', marginLeft: 'auto' }}
                                  title="Agendar en Google Calendar"
                                >
                                  <CalendarPlus size={11} /> Agendar
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </div>
                    );
                  })()}
                </ul>
              )}
            </div>
          )}

          {/* GRID DE PENDIENTES & PRIORIDAD TOP 3 */}
          {(viewMode === 'compact' || customModules.todayTasks !== false) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>
              
              {/* PANEL HOY */}
              <div className="glass-panel" style={{ padding: '1.2rem' }}>
                <h3 className="text-blue" style={{ marginTop: 0, borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.4rem', fontSize: '1rem' }}>HOY (Tus Pendientes)</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0.8rem 0 0 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <li 
                    onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=criticas`)}
                    style={{ padding: '0.65rem 0.8rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', color: 'var(--color-error)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.85rem' }}
                  >
                    <AlertCircle size={16} /> <strong>{criticasCount}</strong> críticas (Hoy)
                  </li>
                  <li 
                    onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=importantes`)}
                    style={{ padding: '0.65rem 0.8rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px', color: '#ffb347', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '0.85rem' }}
                  >
                    <Circle size={16} /> <strong>{importantesCount}</strong> importantes
                  </li>
                  <li 
                    onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=completed`)}
                    style={{ padding: '0.65rem 0.8rem', background: 'rgba(52, 168, 83, 0.1)', borderRadius: '6px', color: 'var(--color-success)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(52, 168, 83, 0.2)', fontSize: '0.85rem' }}
                  >
                    <CheckCircle2 size={16} /> <strong>{completedForProgress}</strong> completadas
                  </li>
                </ul>
              </div>

              {/* PANEL PRIORIDAD TOP 3 */}
              <div className="glass-panel" style={{ padding: '1.2rem' }}>
                <h3 className="text-blue" style={{ marginTop: 0, borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.4rem', fontSize: '1rem' }}>TU PRIORIDAD (Top 3)</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0.8rem 0 0 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {urgentTasks.slice(0, 3).length === 0 ? (
                    <li className="text-muted" style={{ padding: '0.5rem 0', fontSize: '0.85rem' }}>No tienes tareas urgentes pendientes. ¡Excelente!</li>
                  ) : (
                    urgentTasks.slice(0, 3).map(task => {
                      const isCrit = task.isCritical || task.priority === '🔴 ROJO';
                      const color = isCrit ? 'var(--color-error)' : '#ffb347';
                      const bg = isCrit ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)';

                      return (
                        <li 
                          key={task.id}
                          onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=${isCrit ? 'criticas' : 'importantes'}`)}
                          style={{ padding: '0.65rem 0.8rem', background: bg, borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', border: `1px solid ${color}33` }}
                        >
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }}></span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span className="text-white" style={{ fontSize: '0.82rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {task.task || task.title}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--crear-gold)', fontWeight: 'bold' }}>
                              ⏰ Límite: {task.deadline || calculateAutomaticDeadline(task, currentCycle)}
                            </span>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* BOTONES INFERIORES */}
          {(viewMode === 'compact' || customModules.shortcuts !== false) && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
              <button 
                className="btn-primary" 
                onClick={() => navigate(currentUser?.appRole === 'gerente' ? '/gerente' : `/checklist/${currentUser?.appRole || 'capitan'}`)} 
                style={{ padding: '0.8rem 1.6rem', fontSize: '1rem', fontWeight: 'bold' }}
              >
                IR A MI CHECKLIST OPERATIVO ({ROLE_DISPLAY_NAMES[currentUser?.appRole] || currentUser?.appRole?.toUpperCase()})
              </button>
              <button className="btn-secondary" onClick={() => navigate('/metas')} style={{ padding: '0.8rem 1.4rem', fontSize: '1rem', fontWeight: 'bold' }}>
                VER MIS METAS
              </button>
              {(currentUser?.isSuperAdmin || currentUser?.isGerente || ['coord_c1', 'coord_maestria', 'capitan', 'qt', 'direccion', 'director_maestria'].includes(currentUser?.appRole)) && (
                <button className="btn-secondary" onClick={() => navigate('/reportes')} style={{ padding: '0.8rem 1.4rem', fontSize: '1rem', fontWeight: 'bold' }}>
                  ENVIAR REPORTES
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL ASIGNAR TAREA */}
      <TaskAssignmentModal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} />

      {/* MODAL CONFIGURACIÓN DE HOTELES Y SALONES */}
      <VenueConfigModal isOpen={showVenueModal} onClose={() => setShowVenueModal(false)} />
    </div>
  );
}
