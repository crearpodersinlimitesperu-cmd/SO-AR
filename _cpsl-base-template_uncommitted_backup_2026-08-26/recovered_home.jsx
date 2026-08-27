import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useChecklist } from '../context/ChecklistContext';
import { LogOut, Clock, Calendar as CalendarIcon, MapPin, CheckCircle2, AlertCircle, Circle, RefreshCw, CalendarPlus } from 'lucide-react';
import { getFlagForSede } from '../utils/flags';
import { createGoogleEvent } from '../services/googleSync';
import { calculateAutomaticDeadline } from '../utils/soarDates';

export default function Home() {
  const { currentUser, logout } = useAuth();
  const { currentCycle, currentStage } = useCycles();
  const { tasks: allTasks, loading: loadingTasks, syncTasksToGoogle } = useChecklist();
  const navigate = useNavigate();

  // Reloj local
  const [time, setTime] = useState(new Date());
  
  // Eventos locales
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [activeEventTab, setActiveEventTab] = useState('locales');
  const [timeFilter, setTimeFilter] = useState('futuros'); // 'todos', 'pasados', 'hoy', 'futuros'

  const handleAddEventToGoogle = async (ev, startDate, endDate) => {
    const token = sessionStorage.getItem('googleAccessToken');
    if (!token) {
      alert("No se encontró sesión con permisos de Google. Por favor, cierra sesión y vuelve a entrar.");
      return;
    }
    
    const result = await createGoogleEvent({
      summary: `CREAR: ${ev.nombre || ev.name}`,
      location: ev.direccion || ev.lugar || ev.sede || '',
      description: `Entrenador: ${ev.trainer || ev.equipo || 'TBA'}\n${ev.detalles || ''}`,
      start: startDate,
      end: endDate
    }, token);

    if (result.success) {
      alert(`¡"${ev.nombre || ev.name}" añadido a tu Google Calendar exitosamente!`);
    } else {
      alert("Hubo un error al añadir al calendario.");
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const API_URL = 'https://script.google.com/macros/s/AKfycbxSZFhddMYyspZpkW-qPHEi8hycLGfnhFeCPSYc4VbckWIeiiZAbxyJY71XRb2-Ya4U/exec?action=getEventos';
        const res = await fetch(API_URL);
        const json = await res.json();
        const data = json.data || json;
        
        if (Array.isArray(data)) {
           // Ordenamos todos los eventos por fecha
           const allEvents = data.filter(ev => ev.fecha_inicio || ev.start).sort((a, b) => new Date(a.fecha_inicio || a.start) - new Date(b.fecha_inicio || b.start));
           
           // Extraemos el mapeo de sedes para el usuario actual
           const sedeMap = {
             'cuenca': 'CUE',
             'lima': 'LIM',
             'med': 'MED',
             'méxico': 'MEX',
             'mexico': 'MEX',
             'uio': 'UIO',
             'uio ': 'UIO', // por si hay espacios
             'guayaquil': 'GYE'
           };
           
           const userSede = currentUser?.sede?.toLowerCase().trim();
           const eventSedeCode = userSede ? sedeMap[userSede] : null;

           // Guardamos todos los eventos
           setEvents(allEvents);
        }
      } catch (e) {
        console.error("Error fetching calendar", e);
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchEvents();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gold" style={{ margin: 0, fontSize: '2rem' }}>
            {time.getHours() < 12 ? 'Buenos días' : time.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches'}, {currentUser?.displayName || 'Equipo'}
          </h1>
          <p className="text-muted" style={{ margin: '0.5rem 0 0', textTransform: 'uppercase' }}>
            {currentCycle ? `${currentCycle.name} • ETAPA ACTUAL: ${currentStage}` : 'CARGANDO CICLO...'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
            <Clock size={16} className="text-blue" />
            <span className="text-white" style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-muted" style={{ marginLeft: '0.5rem' }}>
              {time.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{currentUser?.displayName || 'Usuario'}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--crear-gold)', fontWeight: 'bold', textTransform: 'uppercase' }}>
              {currentUser?.isSuperAdmin 
                ? `Super Admin | Gerente de Lima ${getFlagForSede('Lima')}` 
                : `${currentUser?.appRole?.replace(/_/g, ' ') || 'Miembro del equipo'} ${getFlagForSede(currentUser?.sede)}`}
            </span>
          </div>
          {currentUser?.photoURL ? (
            <img src={currentUser.photoURL} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--crear-gold)' }} />
          ) : (
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--crear-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '2px solid var(--crear-gold)' }}>
              {currentUser?.displayName ? currentUser.displayName.charAt(0) : 'U'}
            </div>
          )}
          
          {currentUser?.isGerente && (
            <button onClick={() => navigate('/gerente')} className="btn-primary" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: '0.5rem', background: 'var(--crear-gold)', color: 'black' }}>
               SO-AR Gerencial
            </button>
          )}
          {currentUser?.isSuperAdmin && (
            <button onClick={() => navigate('/superadmin')} className="btn-primary" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: '0.5rem', background: 'linear-gradient(135deg, #8b5cf6, #29abe2)', color: 'white', border: 'none' }}>
              🌐 Centro de Mando
            </button>
          )}

          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: '0.5rem' }}>
            <LogOut size={16} /> Salir
          </button>
        </div>
      </div>

      {(() => {
        const myTasksForProgress = allTasks.filter(t => t.role === currentUser?.appRole);
        const completedForProgress = myTasksForProgress.filter(t => t.completed || t.status === 'Completada').length;
        const progressPercentage = myTasksForProgress.length > 0 ? Math.round((completedForProgress / myTasksForProgress.length) * 100) : 0;
        
        return (
          <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h2 className="text-main" style={{ marginTop: 0, marginBottom: '1rem' }}>Mi Progreso General</h2>
            <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPercentage}%`, background: 'var(--crear-gold)', transition: 'width 0.5s ease-out' }} />
            </div>
            <p className="text-gold" style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>{progressPercentage}% completado</p>
          </div>
        );
      })()}

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 className="text-blue" style={{ marginTop: 0, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarIcon size={18} /> EVENTOS
          </h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {/* Filtro de Tiempo */}
            <select 
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}
            >
              <option value="todos" style={{ color: 'black' }}>Todas las fechas</option>
              <option value="futuros" style={{ color: 'black' }}>Próximos</option>
              <option value="hoy" style={{ color: 'black' }}>Hoy</option>
              <option value="pasados" style={{ color: 'black' }}>Históricos (Pasados)</option>
            </select>

            {/* Pestañas Sede/Global */}
            <div style={{ display: 'flex', gap: '0.5rem', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1rem' }}>
              <button 
                onClick={() => setActiveEventTab('locales')}
                style={{ background: 'none', border: 'none', color: activeEventTab === 'locales' ? 'var(--crear-gold)' : 'var(--text-muted)', fontWeight: activeEventTab === 'locales' ? 'bold' : 'normal', cursor: 'pointer', transition: 'color 0.2s' }}
              >
                MI SEDE
              </button>
              {currentUser?.appRole === 'gerente' && (
                <button 
                  onClick={() => setActiveEventTab('globales')}
                  style={{ background: 'none', border: 'none', color: activeEventTab === 'globales' ? 'var(--crear-gold)' : 'var(--text-muted)', fontWeight: activeEventTab === 'globales' ? 'bold' : 'normal', cursor: 'pointer', transition: 'color 0.2s' }}
                >
                  GLOBAL
                </button>
              )}
            </div>
          </div>
        </div>
        {loadingEvents ? (
          <p className="text-muted">Cargando inteligencia global...</p>
        ) : events.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {(() => {
              let displayEvents = events;
              
              // Filtro estricto: Si NO es gerente, siempre forzar a ver solo locales
              let isLocales = activeEventTab === 'locales' || currentUser?.appRole !== 'gerente';
              
              if (isLocales) {
                const sedeMap = { 'cuenca': 'CUE', 'lima': 'LIM', 'med': 'MED', 'méxico': 'MEX', 'mexico': 'MEX', 'uio': 'UIO', 'guayaquil': 'GYE' };
                const userSede = currentUser?.sede?.toLowerCase().trim();
                const eventSedeCode = userSede ? sedeMap[userSede] : null;
                
                if (eventSedeCode && userSede !== 'global') {
                  displayEvents = displayEvents.filter(ev => {
                    const evSede = (ev.sede || ev.sedeTag || '').toUpperCase();
                    return evSede.includes(eventSedeCode);
                  });
                }
              }

              // Filtro por tiempo (Futuros, Hoy, Pasados)
              const todayStr = time.toISOString().substring(0, 10);
              const nowMidnight = new Date();
              nowMidnight.setHours(0,0,0,0);
              const tomorrow = new Date(nowMidnight);
              tomorrow.setDate(tomorrow.getDate() + 1);

              displayEvents = displayEvents.filter(ev => {
                if (timeFilter === 'todos') return true;
                if (!ev.fecha_inicio) return false;
                
                const evDate = new Date(ev.fecha_inicio);
                evDate.setHours(0,0,0,0);
                
                let evEndDate = new Date(ev.fecha_inicio);
                if (ev.fecha_fin) {
                  evEndDate = new Date(ev.fecha_fin);
                }
                
                // Ajustar horas específicas según el tipo de evento si es posible, por defecto 9PM
                const eventName = (ev.nombre || ev.name || "").toUpperCase();
                if (eventName.includes("UNO")) {
                   evEndDate.setHours(21,0,0,0); // Domingo 9 PM
                } else if (eventName.includes("DOS")) {
                   evEndDate.setHours(20,0,0,0); // Domingo 8 PM
                } else if (eventName.includes("MAESTR") || eventName.includes("JUEGO")) {
                   evEndDate.setHours(23,0,0,0); // Domingo 11 PM
                } else if (eventName.includes("VIAJE")) {
                   evEndDate.setHours(17,0,0,0); // Domingo 5 PM
                } else if (eventName.includes("CONFIANZA")) {
                   evEndDate.setHours(14,0,0,0); // Sábado 2 PM
                } else if (eventName.includes("TANQUE")) {
                   evEndDate.setHours(16,0,0,0); // Sábado 4 PM
                } else {
                   evEndDate.setHours(21,0,0,0); 
                }

                const todayMidnight = new Date();
                todayMidnight.setHours(0,0,0,0);
                const todayEnd = new Date();
                todayEnd.setHours(23,59,59,999);

                if (timeFilter === 'hoy') {
                  // El evento abarca el día de hoy
                  return evDate <= todayEnd && evEndDate >= todayMidnight;
                } else if (timeFilter === 'pasados') {
                  return evEndDate < todayMidnight;
                } else { // futuros
                  // Incluir eventos de hoy y futuros (que no han terminado)
                  return evEndDate >= todayMidnight;
                }
              });
              
              // Si vemos históricos, invertimos el orden para ver los más recientes primero
              if (timeFilter === 'pasados') {
                displayEvents = displayEvents.reverse();
              }

              // Permitimos hacer scroll si hay muchos
              const isScrollable = displayEvents.length > 4;

              if (displayEvents.length === 0) {
                return <p className="text-muted">No hay eventos próximos registrados en esta vista.</p>;
              }

              return (
                <div style={{ maxHeight: isScrollable ? '400px' : 'auto', overflowY: isScrollable ? 'auto' : 'visible', paddingRight: isScrollable ? '0.5rem' : '0' }}>
                  {displayEvents.map((ev, i) => {
                    // TODAS las fechas se calculan FUERA del if para que el botón Agendar las tenga en su closure
                    const eventName = (ev.nombre || ev.name || "").toUpperCase();
                    const baseDate = ev.fecha_inicio || ev.start;
                    const evStartDate = new Date(baseDate || new Date());
                    const evEndDate = new Date(ev.fecha_fin || baseDate || new Date());

                    // Horarios de inicio
                    if (eventName.includes("UNO")) { evStartDate.setHours(9,0,0,0); }
                    else if (eventName.includes("DOS")) { evStartDate.setHours(13,0,0,0); }
                    else if (eventName.includes("MAESTR") || eventName.includes("JUEGO") || eventName.includes("VIAJE")) { evStartDate.setHours(17,0,0,0); }
                    else if (eventName.includes("CONFIANZA")) { evStartDate.setHours(10,0,0,0); }
                    else if (eventName.includes("TANQUE")) { evStartDate.setHours(13,0,0,0); }
                    else { evStartDate.setHours(8,0,0,0); }

                    // Horarios de fin
                    if (eventName.includes("UNO")) { evEndDate.setHours(21,0,0,0); }
                    else if (eventName.includes("DOS")) { evEndDate.setHours(20,0,0,0); }
                    else if (eventName.includes("VIAJE")) { evEndDate.setHours(17,0,0,0); }
                    else if (eventName.includes("MAESTR") || eventName.includes("JUEGO")) { evEndDate.setHours(23,0,0,0); }
                    else if (eventName.includes("CONFIANZA")) { evEndDate.setHours(14,0,0,0); }
                    else if (eventName.includes("TANQUE")) { evEndDate.setHours(16,0,0,0); }
                    else { evEndDate.setHours(21,0,0,0); }

                    // Countdown
                    let countdownStr = '';
                    if (baseDate) {
                      const nowTime = time.getTime();
                      const startDiff = evStartDate.getTime() - nowTime;
                      const endDiff = evEndDate.getTime() - nowTime;
                      if (startDiff > 0) {
                        const days = Math.floor(startDiff / (1000 * 60 * 60 * 24));
                        const hours = Math.floor((startDiff / (1000 * 60 * 60)) % 24);
                        const minutes = Math.floor((startDiff / 1000 / 60) % 60);
                        const seconds = Math.floor((startDiff / 1000) % 60);
                        countdownStr = days > 30 ? `Faltan: ${Math.floor(days/30)}m ${days%30}d ${hours}h` : `Faltan: ${days}d ${hours}h ${minutes}m ${seconds}s`;
                      } else if (endDiff > 0) {
                        countdownStr = '¡EN CURSO!';
                      } else {
                        countdownStr = 'FINALIZADO';
                      }
                    }

                    return (
                      <li key={i} style={{ padding: '0.8rem 0', borderBottom: i !== displayEvents.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <span className="text-white" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{ev.nombre || ev.name || 'Entrenamiento'}</span>
                          <span className="text-muted" style={{ display: 'block', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                            Trainer: <span className="text-white">{ev.trainer || ev.equipo || 'TBA'}</span>
                          </span>
                          {((ev.nombre || "").toUpperCase().includes("UNO")) && (
                             <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.3rem', color: '#ffb347' }}>
                               🗓 Horario: Vie 9am-11pm | Sáb 9am-11pm | Dom 9am-9pm
                             </span>
                          )}
                          {((ev.nombre || "").toUpperCase().includes("DOS")) && (
                             <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.3rem', color: '#ffb347' }}>
                               🗓 Horario: Jue 1pm-11pm | Vie 8am-11pm | Sáb 8am-11pm | Dom 8am-8pm
                             </span>
                          )}
                          {((ev.nombre || "").toUpperCase().includes("MAESTR") || (ev.nombre || "").toUpperCase().includes("JUEGO")) && !((ev.nombre || "").toUpperCase().includes("VIAJE")) && (
                             <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.3rem', color: '#ffb347' }}>
                               🗓 Horario: Vie 5pm-11pm | Sáb 8am-11pm | Dom 8am-11pm
                             </span>
                          )}
                          {((ev.nombre || "").toUpperCase().includes("VIAJE")) && (
                             <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.3rem', color: '#ffb347' }}>
                               🗓 Horario: Vie 5pm-11pm | Sáb 7am hasta Dom 5pm
                             </span>
                          )}
                          {((ev.nombre || "").toUpperCase().includes("CONFIANZA")) && (
                             <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.3rem', color: '#ffb347' }}>
                               🗓 Horario: Sáb 10am-2pm
                             </span>
                          )}
                          {((ev.nombre || "").toUpperCase().includes("TANQUE")) && (
                             <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.3rem', color: '#ffb347' }}>
                               🗓 Horario: Sáb 1pm-4pm
                             </span>
                          )}
                          {((ev.nombre || "").toUpperCase().includes("REVISION")) && (
                             <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.3rem', color: '#ffb347' }}>
                               🗓 Horario: Según el día que se indica
                             </span>
                          )}
                          {(ev.detalles || ev.details) && (
                            <span className="text-muted" style={{ display: 'block', fontSize: '0.8rem', marginTop: '0.2rem', fontStyle: 'italic' }}>
                              {ev.detalles || ev.details}
                            </span>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="text-gold" style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'flex-end' }}>
                            <MapPin size={12} /> {getFlagForSede(ev.sede || ev.sedeTag)} {ev.sede || ev.sedeTag || 'GLOBAL'}
                          </span>
                          <span className="text-muted" style={{ fontSize: '0.85rem', display: 'block' }}>
                            {ev.fecha_inicio ? ev.fecha_inicio.substring(0, 10) : ''}
                          </span>
                          {countdownStr && (
                            <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.2rem', color: countdownStr === '¡EN CURSO!' ? 'var(--color-success)' : (countdownStr === 'FINALIZADO' ? 'var(--text-muted)' : 'var(--crear-blue)'), fontWeight: 'bold', fontFamily: 'monospace' }}>
                              {countdownStr}
                            </span>
                          )}
                          <button 
                            onClick={() => handleAddEventToGoogle(ev, evStartDate, evEndDate)}
                            style={{ background: 'transparent', border: '1px solid rgba(41, 171, 226, 0.3)', color: 'var(--crear-cyan)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.5rem', cursor: 'pointer', marginLeft: 'auto' }}
                            title="Agendar en mi Google Calendar"
                          >
                            <CalendarPlus size={12} /> Agendar
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </div>
              );
            })()}
          </ul>
        ) : (
          <p className="text-muted">No hay eventos próximos registrados hoy.</p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {/* PANEL: HOY (Tus Pendientes) */}
        <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
          <h3 className="text-blue" style={{ marginTop: 0, borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.5rem' }}>HOY (Tus Pendientes)</h3>
          {loadingTasks ? (
            <p className="text-muted">Calculando prioridades...</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(() => {
                const myTasks = allTasks.filter(t => t.role === currentUser?.appRole);
                const completed = myTasks.filter(t => t.completed || t.status === 'Completada').length;
                const criticas = myTasks.filter(t => !t.completed && (t.isCritical || t.priority === '🔴 ROJO')).length;
                const importantes = myTasks.filter(t => !t.completed && t.status !== 'Completada' && !t.isCritical && t.priority !== '🔴 ROJO').length;
                
                return (
                  <>
                    <li 
                      onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=criticas`)}
                      style={{ padding: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: 'var(--color-error)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    >
                      <AlertCircle size={18} /> <strong>{criticas}</strong> críticas (Requieren acción hoy)
                    </li>
                    <li 
                      onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=importantes`)}
                      style={{ padding: '0.8rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', color: '#ffb347', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', border: '1px solid rgba(245, 158, 11, 0.2)' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'}
                    >
                      <Circle size={18} /> <strong>{importantes}</strong> importantes
                    </li>
                    <li 
                      onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=completed`)}
                      style={{ padding: '0.8rem', background: 'rgba(52, 168, 83, 0.1)', borderRadius: '8px', color: 'var(--color-success)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', border: '1px solid rgba(52, 168, 83, 0.2)' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(52, 168, 83, 0.2)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(52, 168, 83, 0.1)'}
                    >
                      <CheckCircle2 size={18} /> <strong>{completed}</strong> completadas
                    </li>
                  </>
                );
              })()}
            </ul>
          )}
          
          <button 
            onClick={() => syncTasksToGoogle(currentUser?.appRole)}
            className="btn-primary" 
            style={{ width: '100%', marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}
          >
            Sincronizar a Google Tasks
          </button>
        </div>

        {/* PANEL: TU PRIORIDAD (Top 3) */}
        <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
          <h3 className="text-blue" style={{ marginTop: 0, borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.5rem' }}>TU PRIORIDAD (Top 3)</h3>
          {loadingTasks ? (
            <p className="text-muted">Buscando tareas urgentes...</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(() => {
                const myTasks = allTasks.filter(t => t.role === currentUser?.appRole && !t.completed && t.status !== 'Completada' && t.status !== 'Pendiente de validación');
                // Ordenar: críticas/rojas primero, luego importantes/amarillas
                myTasks.sort((a, b) => {
                  const valA = (a.isCritical || a.priority === '🔴 ROJO') ? 3 : (a.priority === '🟡 AMARILLO' ? 2 : 1);
                  const valB = (b.isCritical || b.priority === '🔴 ROJO') ? 3 : (b.priority === '🟡 AMARILLO' ? 2 : 1);
                  return valB - valA;
                });
                
                const top3 = myTasks.slice(0, 3);
                
                if (top3.length === 0) {
                  return <li className="text-muted" style={{ padding: '1rem 0' }}>No tienes tareas urgentes pendientes. ¡Buen trabajo!</li>;
                }

                return top3.map(task => {
                  const isCrit = task.isCritical || task.priority === '🔴 ROJO';
                  const isImp = task.priority === '🟡 AMARILLO';
                  const color = isCrit ? 'var(--color-error)' : (isImp ? '#ffb347' : 'var(--crear-blue)');
                  const bg = isCrit ? 'rgba(239, 68, 68, 0.1)' : (isImp ? 'rgba(245, 158, 11, 0.1)' : 'rgba(0, 212, 255, 0.1)');
                  
                  return (
                    <li 
                      key={task.id}
                      onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=${isCrit ? 'criticas' : 'importantes'}`)}
                      style={{ 
                        padding: '0.8rem', 
                        background: bg, 
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.8rem', 
                        transition: 'all 0.2s', 
                        border: `1px solid ${color}33` 
                      }}
                      onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }}></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="text-white" style={{ fontSize: '0.9rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.task || task.title}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--crear-gold)', fontWeight: 'bold' }}>
                          ⏰ Límite: {task.deadline || calculateAutomaticDeadline(task, currentCycle)}
                        </span>
                      </div>
                    </li>
                  );
                });
              })()}
            </ul>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={() => navigate(currentUser?.isGerente ? '/gerente' : `/checklist/${currentUser?.appRole || 'capitan'}`)} style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
          IR A MI CHECKLIST OPERATIVO
        </button>
        <button className="btn-secondary" onClick={() => navigate('/metas')} style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
          VER MIS METAS
        </button>
        {(currentUser?.isSuperAdmin || currentUser?.isGerente || ['coord_c1', 'coord_maestria', 'capitan', 'qt', 'direccion'].includes(currentUser?.appRole)) && (
          <button className="btn-secondary" onClick={() => navigate('/reportes')} style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
            ENVIAR REPORTES
          </button>
        )}
      </div>

    </div>
  );
}

```

---

## <a id="src-pages-GerenteDashboard-jsx"></a> 📄 `src/pages/GerenteDashboard.jsx`

```javascript
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useChecklist } from '../context/ChecklistContext';
import { useNavigate } from 'react-router-dom';
import { Target, AlertTriangle, Users, PlusCircle, Activity, CheckCircle } from 'lucide-react';
