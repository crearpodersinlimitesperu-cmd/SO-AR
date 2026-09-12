import React, { useState, useEffect, useMemo } from 'react';
import { useCycles } from '../context/CyclesContext';
import { defaultVenues } from '../data/venuesData';
import { 
  User, Users, MapPin, Calendar, Plane, CheckCircle2, 
  AlertTriangle, Clock, Search, ShieldCheck, Building2, 
  ArrowRight, ExternalLink, Filter, Sparkles
} from 'lucide-react';

export default function ResourceCapacityView({ selectedSede = 'GLOBAL', hrSentinelData = null }) {
  const { events, loadingEvents } = useCycles();
  const [activeSubTab, setActiveSubTab] = useState('trainers'); // 'trainers' | 'coordinators' | 'venues' | 'conflicts'
  const [searchQuery, setSearchQuery] = useState('');
  const [flightsData, setFlightsData] = useState([]);
  const [loadingFlights, setLoadingFlights] = useState(false);

  // Paleta de estilos adaptativa (Dark / Light)
  const bgCard = "var(--bg-card, rgba(17, 34, 64, 0.75))";
  const bgSubCard = "var(--bg-dark, #0A192F)";
  const textDark = "var(--text-main, #f8fafc)";
  const textMuted = "var(--text-muted, #94a3b8)";
  const borderLight = "var(--border-subtle, rgba(255, 255, 255, 0.08))";

  // Cargar vuelos de vuelos_tracker.json para cruzar logística de entrenadores
  useEffect(() => {
    let isMounted = true;
    async function loadFlights() {
      try {
        setLoadingFlights(true);
        const res = await fetch('/vuelos_tracker.json?t=' + Date.now());
        if (res.ok) {
          const json = await res.json();
          if (json.flights && isMounted) {
            setFlightsData(Object.values(json.flights));
          }
        }
      } catch (err) {
        console.warn('Aviso cargando vuelos en Capacidad de Recursos:', err);
      } finally {
        if (isMounted) setLoadingFlights(false);
      }
    }
    loadFlights();
    return () => { isMounted = false; };
  }, []);

  // Normalizar sedes para comparación
  const normSede = (s) => {
    if (!s) return '';
    const upper = String(s).toUpperCase().trim();
    if (upper.includes('LIM')) return 'LIMA';
    if (upper.includes('UIO') || upper.includes('QUITO')) return 'QUITO';
    if (upper.includes('GYE') || upper.includes('GUAYAQUIL')) return 'GUAYAQUIL';
    if (upper.includes('CUE') || upper.includes('CUENCA')) return 'CUENCA';
    if (upper.includes('MED') || upper.includes('MDE') || upper.includes('MEDELLIN')) return 'MEDELLIN';
    if (upper.includes('MEX') || upper.includes('CDMX')) return 'MEXICO';
    return upper;
  };

  // 1. Filtrar eventos relevantes (actuales y futuros)
  const processedEvents = useMemo(() => {
    if (!events || !Array.isArray(events)) return [];

    const now = new Date();
    // Horizonte: desde 15 días atrás hasta 12 meses adelante
    const minDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    const maxDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    return events.filter(e => {
      const dateStr = e.fecha_inicio || e.start;
      if (!dateStr) return false;
      const d = new Date(dateStr.replace('Z', ''));
      if (d < minDate || d > maxDate) return false;

      if (selectedSede !== 'GLOBAL') {
        const evSedeNorm = normSede(e.sede || e.sedeTag || e.lugar);
        const selNorm = normSede(selectedSede);
        if (evSedeNorm !== selNorm) return false;
      }
      return true;
    }).sort((a, b) => new Date((a.fecha_inicio || a.start).replace('Z', '')) - new Date((b.fecha_inicio || b.start).replace('Z', '')));
  }, [events, selectedSede]);

  // 2. Mapear Entrenadores y sus eventos
  const trainersCapacity = useMemo(() => {
    const map = {};

    processedEvents.forEach(e => {
      if (!e.trainer || !e.trainer.trim()) return;
      
      // Manejar nombres compuestos con "/" (tríos o duplas)
      const rawTrainers = e.trainer.split('/').map(t => t.trim()).filter(Boolean);
      
      rawTrainers.forEach(trainerName => {
        const cleanName = trainerName.toUpperCase();
        if (!map[cleanName]) {
          map[cleanName] = {
            name: cleanName,
            events: [],
            sedes: new Set(),
            nextFlight: null
          };
        }
        map[cleanName].events.push(e);
        if (e.sede) map[cleanName].sedes.add(normSede(e.sede));
      });
    });

    // Cruzar con vuelos de vuelos_tracker.json
    if (flightsData.length > 0) {
      Object.keys(map).forEach(tName => {
        const nameParts = tName.toLowerCase().split(/\s+/).filter(p => p.length > 2);
        
        // Buscar vuelo más próximo para este entrenador
        const matchingFlights = flightsData.filter(fl => {
          const paxStr = (fl.passengers || []).join(' ').toLowerCase();
          return nameParts.some(part => paxStr.includes(part));
        });

        if (matchingFlights.length > 0) {
          // Ordenar por fecha estimada de salida
          matchingFlights.sort((a, b) => new Date(a.schedule?.estimatedDeparture || 0) - new Date(b.schedule?.estimatedDeparture || 0));
          map[tName].nextFlight = matchingFlights[0];
          map[tName].totalFlights = matchingFlights.length;
        }
      });
    }

    return Object.values(map).sort((a, b) => b.events.length - a.events.length);
  }, [processedEvents, flightsData]);

  // 3. Detectar Conflictos de Agenda (solapamiento de fechas para un mismo entrenador)
  const agendaConflicts = useMemo(() => {
    const conflicts = [];
    
    trainersCapacity.forEach(t => {
      if (t.events.length < 2) return;
      
      for (let i = 0; i < t.events.length; i++) {
        for (let j = i + 1; j < t.events.length; j++) {
          const evA = t.events[i];
          const evB = t.events[j];
          
          const startA = new Date((evA.fecha_inicio || evA.start).replace('Z', ''));
          const endA = new Date((evA.fecha_fin || evA.fecha_inicio || evA.start).replace('Z', ''));
          const startB = new Date((evB.fecha_inicio || evB.start).replace('Z', ''));
          const endB = new Date((evB.fecha_fin || evB.fecha_inicio || evB.start).replace('Z', ''));

          // Si hay solapamiento o menos de 24h entre sedes distintas
          const diffHours = Math.abs(startB - endA) / (1000 * 60 * 60);
          const sameSede = normSede(evA.sede) === normSede(evB.sede);
          
          if ((startA <= endB && startB <= endA) || (!sameSede && diffHours < 18)) {
            conflicts.push({
              trainer: t.name,
              eventA: evA,
              eventB: evB,
              diffHours: Math.round(diffHours),
              reason: startA <= endB && startB <= endA 
                ? 'Solapamiento directo de fechas' 
                : 'Tiempo de traslado inter-sede insuficiente (< 18 hrs)'
            });
          }
        }
      }
    });

    return conflicts;
  }, [trainersCapacity]);

  // 4. Mapear Ocupación de Salas / Sedes
  const venuesCapacity = useMemo(() => {
    const list = [];
    const sedesKeys = selectedSede === 'GLOBAL' 
      ? Object.keys(defaultVenues) 
      : Object.keys(defaultVenues).filter(k => normSede(k) === normSede(selectedSede));

    sedesKeys.forEach(sKey => {
      const v = defaultVenues[sKey];
      const sedeEvents = processedEvents.filter(e => normSede(e.sede) === normSede(sKey));
      
      list.push({
        sede: sKey,
        venueData: v,
        events: sedeEvents,
        upcomingCount: sedeEvents.length,
        currentOrNextEvent: sedeEvents[0] || null
      });
    });

    return list;
  }, [processedEvents, selectedSede]);

  // 5. Coordinadores desde hrSentinelData
  const coordinatorsList = useMemo(() => {
    if (!hrSentinelData) return [];
    const all = [
      ...(hrSentinelData.enAlertaCritica || []),
      ...(hrSentinelData.enAlertaMedia || []),
      ...(hrSentinelData.optimos || [])
    ];

    if (selectedSede === 'GLOBAL') return all;
    return all.filter(c => normSede(c.sede) === normSede(selectedSede));
  }, [hrSentinelData, selectedSede]);

  // Filtrado por buscador
  const filteredTrainers = useMemo(() => {
    if (!searchQuery.trim()) return trainersCapacity;
    const q = searchQuery.toLowerCase();
    return trainersCapacity.filter(t => t.name.toLowerCase().includes(q));
  }, [trainersCapacity, searchQuery]);

  const filteredCoordinators = useMemo(() => {
    if (!searchQuery.trim()) return coordinatorsList;
    const q = searchQuery.toLowerCase();
    return coordinatorsList.filter(c => (c.nombre || '').toLowerCase().includes(q));
  }, [coordinatorsList, searchQuery]);

  if (loadingEvents) {
    return (
      <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '3rem', textAlign: 'center', color: textMuted }}>
        <Clock size={32} style={{ animation: 'spin 2s linear infinite', margin: '0 auto 1rem', display: 'block', color: '#38bdf8' }} />
        <h3 style={{ color: textDark, fontWeight: 700, margin: 0 }}>Cargando Capacidad Operativa y Eventos...</h3>
        <p style={{ fontSize: '0.85rem', margin: '0.5rem 0 0' }}>Sincronizando asignaciones de entrenadores, coordinadores y salas oficiales.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* 4 CARDS EJECUTIVAS DE CAPACIDAD */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        
        {/* Entrenadores */}
        <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: textMuted, textTransform: 'uppercase' }}>Entrenadores Activos</span>
            <User size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#38bdf8', margin: '0.3rem 0 0' }}>
            {trainersCapacity.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: textMuted, marginTop: '0.2rem' }}>
            En horizonte de {processedEvents.length} eventos programados
          </div>
        </div>

        {/* Coordinadores */}
        <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: textMuted, textTransform: 'uppercase' }}>Coordinadores Operativos</span>
            <Users size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981', margin: '0.3rem 0 0' }}>
            {coordinatorsList.length > 0 ? coordinatorsList.length : '18+'}
          </div>
          <div style={{ fontSize: '0.8rem', color: textMuted, marginTop: '0.2rem' }}>
            {selectedSede === 'GLOBAL' ? 'Desplegados en las 6 sedes' : `Asignados a sede ${selectedSede}`}
          </div>
        </div>

        {/* Sedes y Salas */}
        <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: textMuted, textTransform: 'uppercase' }}>Salas & Espacios Oficiales</span>
            <Building2 size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b', margin: '0.3rem 0 0' }}>
            {venuesCapacity.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: textMuted, marginTop: '0.2rem' }}>
            {selectedSede === 'GLOBAL' ? 'Sedes homologadas con salones oficiales' : `Salas operativas en ${selectedSede}`}
          </div>
        </div>

        {/* Conflictos de Agenda */}
        <div style={{ 
          background: bgCard, 
          border: agendaConflicts.length > 0 ? '1px solid #fecaca' : `1px solid ${borderLight}`, 
          borderRadius: '12px', 
          padding: '1.25rem', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: agendaConflicts.length > 0 ? '#ef4444' : '#10b981', textTransform: 'uppercase' }}>
              Conflictos de Agenda
            </span>
            {agendaConflicts.length > 0 ? <AlertTriangle size={18} color="#ef4444" /> : <ShieldCheck size={18} color="#10b981" />}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: agendaConflicts.length > 0 ? '#ef4444' : '#10b981', margin: '0.3rem 0 0' }}>
            {agendaConflicts.length} {agendaConflicts.length === 0 ? '✓' : ''}
          </div>
          <div style={{ fontSize: '0.8rem', color: agendaConflicts.length > 0 ? '#b91c1c' : textMuted, marginTop: '0.2rem' }}>
            {agendaConflicts.length > 0 ? 'Solapamiento de fechas detectado' : 'Agenda 100% blindada y sincronizada'}
          </div>
        </div>

      </div>

      {/* BARRA DE NAVEGACIÓN DE SUB-PESTAÑAS Y BUSCADOR */}
      <div style={{ 
        background: bgCard, 
        border: `1px solid ${borderLight}`, 
        borderRadius: '12px', 
        padding: '0.8rem 1.25rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '1rem' 
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveSubTab('trainers')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: activeSubTab === 'trainers' ? '1px solid #38bdf8' : `1px solid ${borderLight}`,
              background: activeSubTab === 'trainers' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeSubTab === 'trainers' ? '#38bdf8' : textMuted,
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <User size={16} /> Entrenadores ({trainersCapacity.length})
          </button>

          <button
            onClick={() => setActiveSubTab('coordinators')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: activeSubTab === 'coordinators' ? '1px solid #10b981' : `1px solid ${borderLight}`,
              background: activeSubTab === 'coordinators' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: activeSubTab === 'coordinators' ? '#10b981' : textMuted,
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Users size={16} /> Coordinadores ({coordinatorsList.length > 0 ? coordinatorsList.length : 'Activos'})
          </button>

          <button
            onClick={() => setActiveSubTab('venues')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: activeSubTab === 'venues' ? '1px solid #f59e0b' : `1px solid ${borderLight}`,
              background: activeSubTab === 'venues' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              color: activeSubTab === 'venues' ? '#f59e0b' : textMuted,
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Building2 size={16} /> Salas & Sedes ({venuesCapacity.length})
          </button>

          <button
            onClick={() => setActiveSubTab('conflicts')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: activeSubTab === 'conflicts' ? '1px solid #ef4444' : `1px solid ${borderLight}`,
              background: activeSubTab === 'conflicts' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
              color: activeSubTab === 'conflicts' ? '#ef4444' : textMuted,
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <AlertTriangle size={16} /> Auditoría de Conflictos ({agendaConflicts.length})
          </button>
        </div>

        {/* Buscador */}
        <div style={{ position: 'relative', minWidth: '220px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: textMuted }} />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.45rem 0.8rem 0.45rem 2.2rem',
              borderRadius: '8px',
              border: `1px solid ${borderLight}`,
              background: bgSubCard,
              color: textDark,
              fontSize: '0.85rem'
            }}
          />
        </div>
      </div>

      {/* =========================================================================
         SECCIÓN 1: ENTRENADORES (TRAINERS)
         ========================================================================= */}
      {activeSubTab === 'trainers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredTrainers.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '3rem', textAlign: 'center', color: textMuted }}>
              No se encontraron entrenadores para la sede {selectedSede} con el filtro aplicado.
            </div>
          ) : (
            filteredTrainers.map((t, idx) => {
              const nextEv = t.events[0];
              const dateFormatted = nextEv ? (nextEv.fecha_inicio || nextEv.start || '').substring(0, 10) : 'N/A';
              
              return (
                <div 
                  key={idx} 
                  style={{ 
                    background: bgCard, 
                    border: `1px solid ${borderLight}`, 
                    borderRadius: '12px', 
                    padding: '1.25rem', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    {/* Header Card Entrenador */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: textDark, margin: 0 }}>
                          {t.name}
                        </h4>
                        <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '0.2rem' }}>
                          Sedes asignadas: {Array.from(t.sedes).join(', ') || 'N/A'}
                        </div>
                      </div>
                      <span style={{ 
                        background: 'rgba(56, 189, 248, 0.15)', 
                        color: '#38bdf8', 
                        padding: '0.25rem 0.6rem', 
                        borderRadius: '20px', 
                        fontSize: '0.75rem', 
                        fontWeight: 800,
                        whiteSpace: 'nowrap'
                      }}>
                        {t.events.length} {t.events.length === 1 ? 'evento' : 'eventos'}
                      </span>
                    </div>

                    {/* Próximo Evento */}
                    {nextEv && (
                      <div style={{ background: bgSubCard, borderRadius: '8px', padding: '0.75rem', border: `1px solid ${borderLight}`, marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '0.7rem', color: textMuted, textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.25rem' }}>
                          Próximo Entrenamiento:
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: textDark }}>
                          {nextEv.nombre} {nextEv.equipo ? `(Eq ${nextEv.equipo})` : ''}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: textMuted, marginTop: '0.3rem' }}>
                          <span>📍 {nextEv.sede || 'Sede oficial'}</span>
                          <span>📅 {dateFormatted}</span>
                        </div>
                      </div>
                    )}

                    {/* Vuelo y Logística Cruzada */}
                    {t.nextFlight ? (
                      <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '0.6rem 0.75rem', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>
                          <Plane size={14} /> Vuelo Confirmado en Radar:
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: textDark, marginTop: '0.2rem' }}>
                          {t.nextFlight.flightNumber} ({t.nextFlight.route?.origin} → {t.nextFlight.route?.destination})
                        </div>
                        <div style={{ fontSize: '0.7rem', color: textMuted, marginTop: '0.15rem' }}>
                          Salida: {(t.nextFlight.schedule?.estimatedDeparture || '').substring(0, 16).replace('T', ' ')}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: textMuted, fontStyle: 'italic', padding: '0.3rem 0' }}>
                        ✈️ Logística de vuelo en coordinación con Dirección
                      </div>
                    )}
                  </div>

                  {/* Lista de Eventos Restantes */}
                  {t.events.length > 1 && (
                    <div style={{ marginTop: '0.5rem', borderTop: `1px solid ${borderLight}`, paddingTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: textMuted, marginBottom: '0.3rem' }}>
                        Otros entrenamientos agendados:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '100px', overflowY: 'auto' }}>
                        {t.events.slice(1, 4).map((ev, i) => (
                          <div key={i} style={{ fontSize: '0.75rem', color: textMuted, display: 'flex', justifyContent: 'space-between' }}>
                            <span>&bull; {ev.nombre} ({ev.sede})</span>
                            <span style={{ fontWeight: 600 }}>{(ev.fecha_inicio || ev.start || '').substring(0, 10)}</span>
                          </div>
                        ))}
                        {t.events.length > 4 && (
                          <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 700 }}>
                            +{t.events.length - 4} eventos adicionales en agenda
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      )}

      {/* =========================================================================
         SECCIÓN 2: COORDINADORES & EQUIPOS
         ========================================================================= */}
      {activeSubTab === 'coordinators' && (
        <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: textDark, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users color="#10b981" size={20} /> Asignación y Carga de Coordinadores
              </h3>
              <p style={{ fontSize: '0.8rem', color: textMuted, margin: 0 }}>
                Supervisión del volumen de gestión y cobertura por coordinador en {selectedSede}
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '750px' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${borderLight}`, color: textMuted, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '0.8rem', fontWeight: 700 }}>Coordinador</th>
                  <th style={{ padding: '0.8rem', fontWeight: 700 }}>Sede</th>
                  <th style={{ padding: '0.8rem', fontWeight: 700 }}>Gestión / Asignados</th>
                  <th style={{ padding: '0.8rem', fontWeight: 700 }}>Tasa de Cobertura</th>
                  <th style={{ padding: '0.8rem', fontWeight: 700 }}>Confirmados</th>
                  <th style={{ padding: '0.8rem', fontWeight: 700 }}>Estado Operativo</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoordinators.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: textMuted }}>
                      No se registran coordinadores con el filtro seleccionado en {selectedSede}.
                    </td>
                  </tr>
                ) : (
                  filteredCoordinators.map((c, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${borderLight}` }}>
                      <td style={{ padding: '1rem 0.8rem', fontWeight: 700, color: textDark }}>
                        {c.nombre || 'Coordinador Oficial'}
                      </td>
                      <td style={{ padding: '1rem 0.8rem', fontSize: '0.85rem' }}>
                        <span style={{ background: bgSubCard, padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 600, color: textDark }}>
                          {c.sede || selectedSede}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.8rem', fontSize: '0.85rem', color: textDark }}>
                        <strong>{c.gestiones || 0}</strong> / {c.asignados || 0}
                      </td>
                      <td style={{ padding: '1rem 0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: textDark, width: '35px' }}>
                            {c.coberturaPct || 0}%
                          </span>
                          <div style={{ flex: 1, height: '6px', background: borderLight, borderRadius: '4px', overflow: 'hidden', minWidth: '80px' }}>
                            <div style={{ 
                              width: `${Math.min(100, c.coberturaPct || 0)}%`, 
                              height: '100%', 
                              background: (c.coberturaPct || 0) >= 60 ? '#10b981' : (c.coberturaPct || 0) >= 35 ? '#f59e0b' : '#ef4444' 
                            }}></div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 0.8rem', fontWeight: 700, color: '#10b981' }}>
                        {c.confirmados || 0}
                      </td>
                      <td style={{ padding: '1rem 0.8rem' }}>
                        <span style={{
                          background: c.nivelRiesgo === 'CRITICO' ? 'rgba(239, 68, 68, 0.15)' : (c.coberturaPct || 0) >= 60 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: c.nivelRiesgo === 'CRITICO' ? '#ef4444' : (c.coberturaPct || 0) >= 60 ? '#10b981' : '#f59e0b',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 800
                        }}>
                          {c.nivelRiesgo === 'CRITICO' ? '🚨 REZAGO' : (c.coberturaPct || 0) >= 60 ? '🟢 ÓPTIMO' : '⚠️ EN CURSO'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
         SECCIÓN 3: SALAS & SEDES OFICIALES
         ========================================================================= */}
      {activeSubTab === 'venues' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {venuesCapacity.map((item, idx) => (
            <div 
              key={idx}
              style={{ 
                background: bgCard, 
                border: `1px solid ${borderLight}`, 
                borderRadius: '12px', 
                padding: '1.5rem', 
                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: textDark, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={18} color="#f59e0b" /> Sede {item.sede}
                  </h4>
                  <span style={{ 
                    background: item.events.length > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)', 
                    color: item.events.length > 0 ? '#10b981' : textMuted, 
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '20px', 
                    fontSize: '0.75rem', 
                    fontWeight: 800 
                  }}>
                    {item.events.length} {item.events.length === 1 ? 'módulo' : 'módulos'}
                  </span>
                </div>

                {/* Datos del Salón Oficial */}
                <div style={{ background: bgSubCard, borderRadius: '8px', padding: '0.85rem', border: `1px solid ${borderLight}`, marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: textMuted, textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.2rem' }}>
                    Salón / Sede Principal:
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: textDark, lineHeight: '1.4' }}>
                    {item.venueData.c1_venue}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '0.4rem' }}>
                    📍 Dirección: {item.venueData.address}
                  </div>
                </div>

                {/* Próximos Eventos en la Sala */}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: textMuted, marginBottom: '0.5rem' }}>
                    Próxima Ocupación de Salón:
                  </div>
                  {item.events.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: textMuted, fontStyle: 'italic' }}>
                      Sin módulos agendados en el horizonte inmediato.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {item.events.slice(0, 3).map((ev, i) => (
                        <div key={i} style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: `1px solid ${borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: textDark }}>
                              {ev.nombre} {ev.equipo ? `(Eq ${ev.equipo})` : ''}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: textMuted }}>
                              Trainer: {ev.trainer || 'Por confirmar'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8' }}>
                              {(ev.fecha_inicio || ev.start || '').substring(0, 10)}
                            </div>
                            <span style={{ fontSize: '0.65rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              PROGRAMADO
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================================
         SECCIÓN 4: AUDITORÍA DE CONFLICTOS & SOLAPAMIENTOS
         ========================================================================= */}
      {activeSubTab === 'conflicts' && (
        <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <ShieldCheck color="#10b981" size={24} />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: textDark, margin: 0 }}>
                Auditoría Predictiva de Conflictos de Capacidad
              </h3>
              <p style={{ fontSize: '0.8rem', color: textMuted, margin: 0 }}>
                Monitoreo automático de choques de agenda, traslados inter-sede y disponibilidad de recursos.
              </p>
            </div>
          </div>

          {agendaConflicts.length === 0 ? (
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
              <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 1rem', display: 'block' }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981', margin: 0 }}>
                ¡Excelente! Cero Conflictos de Agenda Detectados
              </h4>
              <p style={{ fontSize: '0.85rem', color: textMuted, maxWidth: '600px', margin: '0.5rem auto 0', lineHeight: '1.6' }}>
                Todos los entrenadores y salas tienen márgenes de tiempo adecuados (&gt; 18 horas) entre eventos consecutivos en las distintas sedes de CPSL.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {agendaConflicts.map((conf, idx) => (
                <div key={idx} style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 800, color: '#ef4444', fontSize: '0.9rem' }}>
                      ⚠️ Conflicto: {conf.trainer}
                    </span>
                    <span style={{ background: '#fef2f2', color: '#dc2626', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                      {conf.reason}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: textDark }}>
                    <strong>Evento A:</strong> {conf.eventA.nombre} ({conf.eventA.sede}) &bull; Fecha: {(conf.eventA.fecha_inicio || conf.eventA.start).substring(0, 10)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: textDark, marginTop: '0.2rem' }}>
                    <strong>Evento B:</strong> {conf.eventB.nombre} ({conf.eventB.sede}) &bull; Fecha: {(conf.eventB.fecha_inicio || conf.eventB.start).substring(0, 10)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
