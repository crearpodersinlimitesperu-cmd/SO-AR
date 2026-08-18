import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CyclesContext = createContext();

export function CyclesProvider({ children }) {
  const { currentUser } = useAuth();
  const [currentCycle, setCurrentCycle] = useState(null);
  const [currentStage, setCurrentStage] = useState('CARGANDO...');
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const API_URL = 'https://script.google.com/macros/s/AKfycbxSZFhddMYyspZpkW-qPHEi8hycLGfnhFeCPSYc4VbckWIeiiZAbxyJY71XRb2-Ya4U/exec?action=getEventos';
        const res = await fetch(API_URL);
        const json = await res.json();
        const data = json.data || json;
        
        if (Array.isArray(data)) {
           const allEvents = data.filter(ev => ev.fecha_inicio || ev.start).sort((a, b) => new Date(a.fecha_inicio || a.start) - new Date(b.fecha_inicio || b.start));
           setEvents(allEvents);
           
           if (currentUser) {
             calculateCycleAndStage(allEvents, currentUser.sede, currentUser.appRole);
           }
        }
      } catch (e) {
        console.error("Error fetching calendar for cycles", e);
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchEvents();
  }, [currentUser]); // Re-fetch or recalculate when currentUser changes

  const calculateCycleAndStage = (allEvents, userSedeRaw, userRole) => {
    if (userRole === 'direccion' || userRole === 'director_maestria' || userRole === 'cfo' || !userSedeRaw || userSedeRaw.toLowerCase() === 'global' || userSedeRaw.toLowerCase() === 'sede global') {
      setCurrentCycle({ name: 'Múltiples Equipos (Global)' });
      setCurrentStage('GLOBAL');
      return;
    }

    const sedeMap = {
      'cuenca': 'CUE',
      'lima': 'LIM',
      'med': 'MED',
      'méxico': 'MEX',
      'mexico': 'MEX',
      'uio': 'UIO',
      'guayaquil': 'GYE'
    };
    
    let userSede = userSedeRaw.toLowerCase().trim();
    if (userSede === 'quito') userSede = 'uio';
    if (userSede === 'quito ciclo 1') userSede = 'uio c1';
    if (userSede === 'quito c1') userSede = 'uio c1';
    if (userSede === 'quito ciclo 2') userSede = 'uio c2';
    if (userSede === 'quito c2') userSede = 'uio c2';
    
    const sedeCode = sedeMap[userSede] || userSede.toUpperCase();

    const sedeEvents = allEvents.filter(e => {
        const evSede = (e.sede || e.sedeTag || '').toUpperCase();
        return evSede.startsWith(sedeCode) || evSede === sedeCode;
    });

    const today = new Date();
    
    let nextEvent = null;
    for (const e of sedeEvents) {
        const d = new Date((e.fecha_inicio || e.start).replace('Z', ''));
        if (d >= today && ['CAPITULO UNO', 'CAPITULO DOS', 'MAESTRIA DEL JUEGO'].includes(e.nombre || e.name)) {
            nextEvent = e;
            break;
        }
    }
    
    if (!nextEvent) {
        for (let i = sedeEvents.length - 1; i >= 0; i--) {
            const e = sedeEvents[i];
            if (['CAPITULO UNO', 'CAPITULO DOS', 'MAESTRIA DEL JUEGO'].includes(e.nombre || e.name)) {
                nextEvent = e;
                break;
            }
        }
    }

    if (!nextEvent) {
        setCurrentCycle({ name: 'Sin Equipo Activo' });
        setCurrentStage('INACTIVO');
        return;
    }

    const equipo = nextEvent.equipo;
    const equipoEvents = sedeEvents.filter(e => String(e.equipo) === String(equipo) || String(e.equipo).includes(String(equipo)));

    const c1 = equipoEvents.find(e => (e.nombre || e.name) === 'CAPITULO UNO');
    const c2 = equipoEvents.find(e => (e.nombre || e.name) === 'CAPITULO DOS');
    const mj = equipoEvents.find(e => (e.nombre || e.name) === 'MAESTRIA DEL JUEGO');

    const active = {
        id: `${sedeCode}-EQ-${equipo}`,
        name: `Equipo ${equipo}`,
        c1_start: c1 ? (c1.fecha_inicio || c1.start) : '',
        c1_end: c1 ? (c1.fecha_fin || c1.end) : '',
        c2_start: c2 ? (c2.fecha_inicio || c2.start) : '',
        c2_end: c2 ? (c2.fecha_fin || c2.end) : '',
        maestria_start: mj ? (mj.fecha_inicio || mj.start) : '',
        maestria_end: mj ? (mj.fecha_fin || mj.end) : ''
    };

    setCurrentCycle(active);

    // Etapa calculation
    if (!active.c1_start) {
        setCurrentStage('PRE-C1');
        return;
    }

    const c1Start = new Date(active.c1_start.replace('Z', ''));
    const c1End = new Date((active.c1_end || active.c1_start).replace('Z', ''));
    c1End.setHours(23, 59, 59);

    const c2Start = active.c2_start ? new Date(active.c2_start.replace('Z', '')) : new Date('2099-01-01');
    const c2End = active.c2_end ? new Date((active.c2_end || active.c2_start).replace('Z', '')) : new Date('2099-01-01');
    c2End.setHours(23, 59, 59);

    const maestriaStart = active.maestria_start ? new Date(active.maestria_start.replace('Z', '')) : new Date('2099-01-01');
    const maestriaEnd = active.maestria_end ? new Date((active.maestria_end || active.maestria_start).replace('Z', '')) : new Date('2099-01-01');
    maestriaEnd.setHours(23, 59, 59);

    const gate1Date = new Date(c1Start);
    gate1Date.setDate(gate1Date.getDate() - 21);

    if (today < gate1Date) {
      setCurrentStage('GATE 1');
    } else if (today < c1Start) {
      setCurrentStage('PRE-C1');
    } else if (today >= c1Start && today <= c1End) {
      setCurrentStage('C1');
    } else if (today > c1End && today < c2Start) {
      setCurrentStage('POST-C1');
    } else if (today >= c2Start && today <= c2End) {
      setCurrentStage('C2');
    } else if (today > c2End && today < maestriaStart) {
      setCurrentStage('PRE-MJ');
    } else if (today >= maestriaStart && today <= maestriaEnd) {
      setCurrentStage('MJ');
    } else {
      setCurrentStage('POST-MJ');
    }
  };

  return (
    <CyclesContext.Provider value={{ currentCycle, currentStage, events, loadingEvents }}>
      {children}
    </CyclesContext.Provider>
  );
}

export function useCycles() {
  return useContext(CyclesContext);
}
