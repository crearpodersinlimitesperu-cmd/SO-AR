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
      'cue': 'CUE',
      'lima': 'LIM',
      'lim': 'LIM',
      'med': 'MED',
      'medellin': 'MED',
      'medellín': 'MED',
      'méxico': 'MEX',
      'mexico': 'MEX',
      'cdmx': 'MEX',
      'mex': 'MEX',
      'uio': 'UIO',
      'quito': 'UIO',
      'guayaquil': 'GYE',
      'gye': 'GYE'
    };
    
    let userSede = userSedeRaw.toLowerCase().trim();
    // Quito fusionado: cualquier variante de Quito C1 o C2 → 'uio'
    if (userSede === 'quito' || userSede === 'quito ciclo 1' || userSede === 'quito ciclo 2' ||
        userSede === 'quito c1' || userSede === 'quito c2') userSede = 'uio';
    
    const sedeCode = sedeMap[userSede] || userSede.toUpperCase();

    // Filtro tolerante de eventos por sede
    const isQuito = sedeCode === 'UIO' || userSede.includes('uio') || userSede.includes('quito');
    const isMexico = sedeCode === 'MEX' || userSede.includes('mex') || userSede.includes('cdmx');
    const isMedellin = sedeCode === 'MED' || userSede.includes('med');
    const isGuayaquil = sedeCode === 'GYE' || userSede.includes('gye') || userSede.includes('guayaquil');
    const isCuenca = sedeCode === 'CUE' || userSede.includes('cue') || userSede.includes('cuenca');
    const isLima = sedeCode === 'LIM' || userSede.includes('lim') || userSede.includes('lima');

    const sedeEvents = allEvents.filter(e => {
        const evSede = (e.sede || e.sedeTag || e.place || e.address || '').toUpperCase();
        if (isQuito) {
          return evSede.includes('UIO') || evSede.includes('QUITO');
        }
        if (isMexico) {
          return evSede.includes('MEX') || evSede.includes('CDMX') || evSede.includes('MÉXICO') || evSede.includes('MEXICO') || evSede.includes('CIUDAD DE M');
        }
        if (isMedellin) {
          return evSede.includes('MED') || evSede.includes('MEDELL');
        }
        if (isGuayaquil) {
          return evSede.includes('GYE') || evSede.includes('GUAYAQUIL');
        }
        if (isCuenca) {
          return evSede.includes('CUE') || evSede.includes('CUENCA');
        }
        if (isLima) {
          return evSede.includes('LIM') || evSede.includes('LIMA');
        }
        return evSede.includes(sedeCode) || evSede === sedeCode || evSede.includes(userSede.toUpperCase());
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
    const equipoStr = String(equipo);
    const nextEventDate = new Date((nextEvent.fecha_inicio || nextEvent.start).replace('Z', ''));
    const timeWindow = 180 * 24 * 60 * 60 * 1000; // 6 meses

    // Filtrar eventos que compartan parte del nombre del equipo (para manejar '343536' machacado con '34', '35')
    // Y limitamos a +/- 6 meses para no agarrar el equipo '3' de hace años si el string es '343536'
    let equipoEvents = sedeEvents.filter(e => {
        const d = new Date((e.fecha_inicio || e.start).replace('Z', ''));
        if (Math.abs(d - nextEventDate) > timeWindow) return false;

        const eEq = String(e.equipo);
        return eEq === equipoStr || eEq.includes(equipoStr) || equipoStr.includes(eEq);
    });

    // Ordenar descendente para que find() tome el evento más reciente si hay varios (ej. 3 C1s distintos)
    equipoEvents.sort((a, b) => new Date(b.fecha_inicio || b.start) - new Date(a.fecha_inicio || a.start));

    const c1 = equipoEvents.find(e => (e.nombre || e.name) === 'CAPITULO UNO');
    const c2 = equipoEvents.find(e => (e.nombre || e.name) === 'CAPITULO DOS');
    const mj = equipoEvents.find(e => (e.nombre || e.name) === 'MAESTRIA DEL JUEGO');

    // Mejoramos la visualización del nombre si viene con asteriscos o delimitadores
    let displayNombre = equipoStr.replace(/\*/g, ', ');
    if (displayNombre.length === 6 && /^\d+$/.test(displayNombre)) {
       displayNombre = `${displayNombre.slice(0,2)}, ${displayNombre.slice(2,4)}, ${displayNombre.slice(4,6)}`;
    } else if (displayNombre.length === 4 && /^\d+$/.test(displayNombre)) {
       displayNombre = `${displayNombre.slice(0,2)}, ${displayNombre.slice(2,4)}`;
    }
    // NOTA: Los equipos de 3 dígitos (ej. Equipo 126 en Quito) se mantienen intactos como 126.

    const active = {
        id: `${sedeCode}-EQ-${equipoStr}`,
        name: `Equipo ${displayNombre}`,
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
