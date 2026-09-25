import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';

// Genera un id estable para un evento del calendario oficial (viene de una hoja
// de Google, sin "id" propio de Firestore), para poder recordar cuáles ya se
// sincronizaron y no duplicarlos en el Google Calendar del usuario.
const getEventSyncId = (ev) =>
  ev.id || `${ev.nombre || ev.name || ''}|${ev.sede || ev.sedeTag || ''}|${ev.fecha_inicio || ev.start || ''}`;

// El Apps Script conserva el histórico completo, pero puede tardar en
// republicar cambios de la agenda. Esta vista pública de la MISMA hoja es el
// contraste de actualidad: solamente complementa/actualiza eventos, nunca
// escribe en Sheets y nunca toca las asignaciones de Causa OS.
const OFFICIAL_CALENDAR_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1u0tc4GeooPmSwNxZ0CErKGtRU4oD-mO3l--ZSQM-KPs/gviz/tq?tqx=out:json&gid=1326951636';

const googleVizDateToIso = (value) => {
  const match = String(value || '').match(/^Date\((\d+),(\d+),(\d+)\)$/);
  if (!match) return '';
  const [, year, monthZeroBased, day] = match;
  return `${year}-${String(Number(monthZeroBased) + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`;
};

const calendarMergeKey = (event = {}) => [
  String(event.fecha_inicio || event.start || '').slice(0, 10),
  String(event.sede || event.sedeTag || '').trim().toUpperCase(),
  String(event.equipo || event.team || '').trim(),
  String(event.nombre || event.name || '').trim().toUpperCase()
].join('__');

const parseOfficialCalendarSheet = (text) => {
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first < 0 || last < first) throw new Error('Respuesta de calendario oficial inválida.');
  const payload = JSON.parse(text.slice(first, last + 1));
  return (payload.table?.rows || []).map(row => {
    const cells = row.c || [];
    const value = index => cells[index]?.v ?? '';
    const fechaInicio = googleVizDateToIso(value(0));
    if (!fechaInicio) return null;
    return {
      fecha_inicio: fechaInicio,
      // La hoja de contraste no declara fecha de fin. Se deja vacía: no se
      // inventa duración ni se altera la que ya provea el Apps Script.
      fecha_fin: '',
      sede: String(value(1) || '').trim(),
      equipo: String(value(2) ?? '').trim(),
      nombre: String(value(3) || '').trim(),
      trainer: String(value(4) || '').trim(),
      lugar: String(value(5) || '').trim(),
      direccion: String(value(6) || '').trim(),
      source: 'official_sheet_crosscheck'
    };
  }).filter(Boolean);
};

const mergeOfficialCalendar = (apiEvents, sheetEvents) => {
  const byKey = new Map((apiEvents || []).map(event => [calendarMergeKey(event), event]));
  for (const sheetEvent of sheetEvents || []) {
    const key = calendarMergeKey(sheetEvent);
    const previous = byKey.get(key);
    // La hoja es más reciente en los campos de programación. Conservamos los
    // datos logísticos del API, porque pertenecen a otro flujo y no existen
    // en el calendario de Sheets.
    byKey.set(key, {
      ...(previous || {}),
      ...sheetEvent,
      fecha_fin: previous?.fecha_fin || previous?.end || '',
      ticket: previous?.ticket || 'pending',
      hotel: previous?.hotel || 'pending',
      notified: previous?.notified || false,
      arrival: previous?.arrival || '',
      ticket_url: previous?.ticket_url || ''
    });
  }
  return [...byKey.values()];
};

// (14/09/2026) EXTRAÍDO de calculateCycleAndStage() sin cambiar su lógica, para
// poder reutilizarlo tanto en la detección AUTOMÁTICA de equipo (el comportamiento
// de siempre: "el próximo evento cronológico de la sede") como en la selección
// MANUAL de equipo para Quito (equiposQuito, ver AuthContext.jsx/UserProfileModal.jsx)
// — Quito, a diferencia de las demás sedes, corre varios equipos en paralelo, así
// que un solo "currentCycle" por sede ya no alcanza. "anchorDate" es la fecha que
// se usa como centro de la ventana de +/- 6 meses para no mezclar dos equipos
// distintos que compartan parte del número (ej. "34" dentro de "343536"): en el
// modo automático es la fecha del evento detectado (idéntico a como funcionaba
// antes, sin ningún cambio de comportamiento); en el modo manual, quien llama a
// esta función decide qué fecha usar como ancla.
function buildCycleForEquipo(sedeEvents, equipoStr, sedeCode, anchorDate) {
  const timeWindow = 180 * 24 * 60 * 60 * 1000; // 6 meses

  // Filtrar eventos que compartan parte del nombre del equipo (para manejar '343536' machacado con '34', '35')
  // Y limitamos a +/- 6 meses para no agarrar el equipo '3' de hace años si el string es '343536'
  let equipoEvents = sedeEvents.filter(e => {
    const d = new Date((e.fecha_inicio || e.start).replace('Z', ''));
    if (Math.abs(d - anchorDate) > timeWindow) return false;

    const eEq = String(e.equipo);
    return eEq === equipoStr || eEq.includes(equipoStr) || equipoStr.includes(eEq);
  });

  // Ordenar cronológicamente (ascendente) para tomar el C1, C2 y MJ correspondientes a este ciclo,
  // y no eventos de varios meses después.
  equipoEvents.sort((a, b) => new Date(a.fecha_inicio || a.start) - new Date(b.fecha_inicio || b.start));

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

  return {
      id: `${sedeCode}-EQ-${equipoStr}`,
      name: `Equipo ${displayNombre}`,
      c1_start: c1 ? (c1.fecha_inicio || c1.start) : '',
      c1_end: c1 ? (c1.fecha_fin || c1.end) : '',
      c2_start: c2 ? (c2.fecha_inicio || c2.start) : '',
      c2_end: c2 ? (c2.fecha_fin || c2.end) : '',
      maestria_start: mj ? (mj.fecha_inicio || mj.start) : '',
      maestria_end: mj ? (mj.fecha_fin || mj.end) : ''
  };
}

// (14/09/2026) EXTRAÍDO de calculateCycleAndStage() sin cambiar su lógica (ver nota
// de buildCycleForEquipo arriba) — calcula la etapa GATE 1/PRE-C1/.../POST-MJ de UN
// ciclo ya armado, para poder calcularla tanto para el ciclo único de siempre como
// para cada equipo elegido manualmente en Quito.
function computeStageForCycle(active, today) {
  if (!active.c1_start) {
      return 'PRE-C1';
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
    return 'GATE 1';
  } else if (today < c1Start) {
    return 'PRE-C1';
  } else if (today >= c1Start && today <= c1End) {
    return 'C1';
  } else if (today > c1End && today < c2Start) {
    return 'POST-C1';
  } else if (today >= c2Start && today <= c2End) {
    return 'C2';
  } else if (today > c2End && today < maestriaStart) {
    return 'PRE-MJ';
  } else if (today >= maestriaStart && today <= maestriaEnd) {
    return 'MJ';
  }
  return 'POST-MJ';
}

const CyclesContext = createContext();

export function CyclesProvider({ children }) {
  const { currentUser, reauthenticateGoogle } = useAuth();
  const [currentCycle, setCurrentCycle] = useState(null);
  const [currentStage, setCurrentStage] = useState('CARGANDO...');
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  // (14/09/2026) quitoCycles: ciclo(s) construido(s) para el/los equipo(s) que el
  // usuario de Quito eligió en su perfil (0, 1 o 2 — ver equiposQuito). Queda en
  // [] para cualquier usuario que no sea de Quito, y también para un usuario de
  // Quito que todavía no eligió equipo (modo automático, sin cambios). Lo consume
  // principalmente ChecklistBoard.jsx para las pestañas "Todos/Equipo X/Equipo Y".
  const [quitoCycles, setQuitoCycles] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const API_URL = 'https://script.google.com/macros/s/AKfycbxSZFhddMYyspZpkW-qPHEi8hycLGfnhFeCPSYc4VbckWIeiiZAbxyJY71XRb2-Ya4U/exec?action=getEventos';
        const [apiResult, sheetResult] = await Promise.allSettled([
          fetch(API_URL).then(res => {
            if (!res.ok) throw new Error(`Apps Script respondió ${res.status}`);
            return res.json();
          }),
          fetch(OFFICIAL_CALENDAR_SHEET_URL).then(res => {
            if (!res.ok) throw new Error(`Calendario oficial respondió ${res.status}`);
            return res.text();
          })
        ]);
        const apiJson = apiResult.status === 'fulfilled' ? apiResult.value : [];
        const data = apiJson.data || apiJson;
        const sheetEvents = sheetResult.status === 'fulfilled'
          ? parseOfficialCalendarSheet(sheetResult.value)
          : [];
        if (sheetResult.status === 'rejected') {
          console.warn('No se pudo contrastar la agenda actual de Sheets:', sheetResult.reason);
        }

        if (Array.isArray(data)) {
           const allEvents = mergeOfficialCalendar(
             data.filter(ev => ev.fecha_inicio || ev.start),
             sheetEvents
           ).sort((a, b) => new Date(a.fecha_inicio || a.start) - new Date(b.fecha_inicio || b.start));
           setEvents(allEvents);
           
           if (currentUser) {
             calculateCycleAndStage(allEvents, currentUser.sede, currentUser.appRole, currentUser.equiposQuito);
           }
        } else if (sheetEvents.length) {
          // Si el histórico del Apps Script falla, seguimos mostrando la
          // programación actual verificable de la hoja, sin fabricar datos.
          const allEvents = sheetEvents.sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));
          setEvents(allEvents);
          if (currentUser) calculateCycleAndStage(allEvents, currentUser.sede, currentUser.appRole, currentUser.equiposQuito);
        }
      } catch (e) {
        console.error("Error fetching calendar for cycles", e);
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchEvents();
  }, [currentUser]); // Re-fetch or recalculate when currentUser changes

  const calculateCycleAndStage = (allEvents, userSedeRaw, userRole, userEquiposQuito) => {
    if (userRole === 'direccion' || userRole === 'director_maestria' || userRole === 'cfo' || !userSedeRaw || userSedeRaw.toLowerCase() === 'global' || userSedeRaw.toLowerCase() === 'sede global') {
      setCurrentCycle({ name: 'Múltiples Equipos (Global)' });
      setCurrentStage('GLOBAL');
      setQuitoCycles([]);
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

    // (14/09/2026) SELECCIÓN MANUAL DE EQUIPO PARA QUITO — José confirmó que, a
    // diferencia de las demás sedes (un solo equipo activo a la vez), Quito corre
    // VARIOS equipos en paralelo (ej. C1 Equipo 122 y C1 Equipo 128 el mismo fin de
    // semana). Antes de este cambio, esta función SIEMPRE adivinaba el equipo
    // usando "el próximo evento cronológico de la sede" (el bloque de más abajo),
    // sin importar a qué equipo pertenecía realmente cada gerente/coordinador —
    // así que en Quito le mostraba a cada quien fechas de un equipo que podía NO
    // ser el suyo. Ahora, si la persona ya eligió 1 o 2 equipos en su perfil
    // (users/{id}.equiposQuito, ver UserProfileModal.jsx), se usa ESE equipo
    // directamente y se sale de la función aquí mismo, sin tocar la detección
    // automática de abajo. Si todavía NO ha elegido equipo (array vacío/ausente —
    // el caso por defecto para usuarios existentes sin migrar), el código sigue de
    // largo hacia la detección automática de siempre, para no romper nada mientras
    // se adopta gradualmente. El resto de sedes (isQuito === false) nunca entra a
    // este bloque, así que su comportamiento queda 100% intacto.
    if (isQuito) {
      const rawSelected = Array.isArray(userEquiposQuito) ? userEquiposQuito : [];
      const selectedTeams = [...new Set(rawSelected.map(v => String(v).trim()).filter(Boolean))].slice(0, 2);

      if (selectedTeams.length > 0) {
        const now = new Date();
        const builtCycles = selectedTeams.map(eq => {
          // Ancla para la ventana de +/- 6 meses de buildCycleForEquipo(): el
          // evento de ESTE equipo más cercano a hoy (no hay un "nextEvent" de
          // referencia como en el modo automático, porque el equipo ya viene
          // elegido de antemano).
          const matches = sedeEvents.filter(e => {
            const eEq = String(e.equipo);
            return eEq === eq || eEq.includes(eq) || eq.includes(eEq);
          });
          let anchorDate = now;
          if (matches.length > 0) {
            const closest = matches.reduce((best, e) => {
              const d = new Date((e.fecha_inicio || e.start).replace('Z', ''));
              const bestD = new Date((best.fecha_inicio || best.start).replace('Z', ''));
              return Math.abs(d - now) < Math.abs(bestD - now) ? e : best;
            });
            anchorDate = new Date((closest.fecha_inicio || closest.start).replace('Z', ''));
          }

          const cycle = buildCycleForEquipo(sedeEvents, eq, sedeCode, anchorDate);
          const stage = computeStageForCycle(cycle, now);
          return { equipo: eq, cycle, stage };
        });

        setQuitoCycles(builtCycles);
        // currentCycle/currentStage se mantienen por compatibilidad con el resto
        // de la app (todo lo que todavía lee un solo ciclo, ej. ChecklistContext.jsx
        // para el catálogo cuando NO hay 2 equipos elegidos) — reflejan el primer
        // equipo elegido. Cuando hay 2 equipos, ChecklistBoard.jsx usa quitoCycles
        // directamente para mostrar ambos con sus pestañas/badges propios.
        setCurrentCycle(builtCycles[0].cycle);
        setCurrentStage(builtCycles[0].stage);
        return;
      }
    }
    setQuitoCycles([]);

    const today = new Date();
    // Miramos hasta 4 días atrás (el fin de semana concluye el domingo, y el martes siguiente
    // ya se activa de inmediato la preparación del siguiente ciclo/equipo).
    const lookbackDate = new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000);
    
    let nextEvent = null;
    for (const e of sedeEvents) {
        const d = new Date((e.fecha_inicio || e.start).replace('Z', ''));
        if (d >= lookbackDate && ['CAPITULO UNO', 'CAPITULO DOS', 'MAESTRIA DEL JUEGO'].includes(e.nombre || e.name)) {
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

    // (14/09/2026) Construcción del ciclo activo y su etapa, ahora delegada a
    // buildCycleForEquipo()/computeStageForCycle() (ver arriba) — misma lógica de
    // siempre (equipoEvents filtrado por +/- 6 meses alrededor de nextEventDate,
    // mismo cálculo de displayNombre y de la etapa GATE 1..POST-MJ), solo
    // refactorizada para poder reutilizarla también en la selección manual de
    // equipo de Quito, sin duplicar el código.
    const active = buildCycleForEquipo(sedeEvents, equipoStr, sedeCode, nextEventDate);
    setCurrentCycle(active);
    setCurrentStage(computeStageForCycle(active, today));
  };

  // Sincronización masiva de eventos con Google Calendar — el equivalente,
  // para el calendario, del botón "Sincronizar" que ya existe para las tareas
  // (ver ChecklistContext.jsx -> syncTasksToGoogle, que hace lo mismo con
  // Google Tasks). DECISIÓN de implementación (28/08/2026): a diferencia de
  // las tareas (que viven en Firestore y tienen un campo "synced"), estos
  // eventos vienen de una hoja de Google de solo lectura sin ID propio de
  // Firestore, así que aquí se recuerda qué ya se sincronizó guardando los
  // IDs sincronizados en localStorage de este navegador (no en Firestore) —
  // funciona por dispositivo/navegador, no se sincroniza entre dispositivos.
  // Si el usuario quiere que esto sea igual en todos sus dispositivos, habría
  // que moverlo a una colección de Firestore — no se hizo así todavía porque
  // no se pidió explícitamente.
  const syncEventsToGoogle = async (eventsToSync, ownerEmail) => {
    let token = sessionStorage.getItem('googleAccessToken');
    if (!token) {
      // (04/09/2026) Antes fallaba directo con "no_token" — ahora intenta
      // primero un popup corto de reautenticación con Google.
      token = await reauthenticateGoogle();
    }
    if (!token) {
      return { success: false, error: 'no_token' };
    }
    if (!eventsToSync || eventsToSync.length === 0) {
      return { success: true, syncedCount: 0, skippedCount: 0, totalCount: 0, failed: [] };
    }

    const storageKey = `causaos_synced_events_${(ownerEmail || 'anon').toLowerCase()}`;
    let syncedIds = [];
    try {
      syncedIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch (e) {
      syncedIds = [];
    }
    const syncedSet = new Set(syncedIds);

    let syncedCount = 0;
    let skippedCount = 0;
    const failed = [];

    for (const ev of eventsToSync) {
      const id = getEventSyncId(ev);
      if (syncedSet.has(id)) {
        skippedCount++;
        continue;
      }

      try {
        const start = ev.fecha_inicio || ev.start;
        const end = ev.fecha_fin || ev.end || new Date(new Date(start).getTime() + 2 * 3600000).toISOString();
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summary: ev.nombre || ev.name || 'Evento CREAR PSL',
            location: ev.sede || ev.sedeTag || ev.lugar || ev.direccion || '',
            description: `Entrenador: ${ev.trainer || ev.entrenador || 'Por Confirmar'}\n${ev.detalles || ev.description || ''}\n\nOrganizado por CREAR Poder Sin Límites`,
            start: { dateTime: new Date(start).toISOString(), timeZone },
            end: { dateTime: new Date(end).toISOString(), timeZone }
          })
        });

        if (res.ok) {
          syncedSet.add(id);
          syncedCount++;
        } else {
          failed.push(ev.nombre || ev.name || 'Evento sin nombre');
        }
      } catch (e) {
        failed.push(ev.nombre || ev.name || 'Evento sin nombre');
      }
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify([...syncedSet]));
    } catch (e) { /* localStorage no disponible: no bloquea el resultado */ }

    return { success: true, syncedCount, skippedCount, totalCount: eventsToSync.length, failed };
  };

  // (14/09/2026) quitoTeamOptions: lista de números de equipo ÚNICOS que aparecen
  // en el calendario oficial en vivo (mismos "events" de arriba) para eventos de
  // sede Quito/UIO de tipo CAPITULO UNO, CAPITULO DOS o MAESTRIA DEL JUEGO. Se
  // calcula siempre a partir de datos reales — NUNCA una lista fija de números de
  // equipo — para que el selector de UserProfileModal.jsx no quede desactualizado
  // cuando se agreguen equipos nuevos al calendario. No depende del usuario actual
  // (cualquier persona editando un perfil de Quito, sea el suyo o el de otra
  // persona, ve las mismas opciones).
  const quitoTeamOptions = useMemo(() => {
    const teamSet = new Set();
    events.forEach(e => {
      const evSede = (e.sede || e.sedeTag || e.place || e.address || '').toUpperCase();
      const isQuitoEvent = evSede.includes('UIO') || evSede.includes('QUITO');
      if (!isQuitoEvent) return;
      const activityName = e.nombre || e.name;
      if (!['CAPITULO UNO', 'CAPITULO DOS', 'MAESTRIA DEL JUEGO'].includes(activityName)) return;
      if (e.equipo === undefined || e.equipo === null || e.equipo === '') return;
      // Igual que buildCycleForEquipo(), separamos solo por '*' (delimitador que
      // ya usa el calendario para varios equipos en un mismo evento) — a
      // diferencia de otras sedes, los números de equipo de Quito son de 3
      // dígitos y NO vienen pegados entre sí, así que no aplicamos aquí el
      // "split" por pares de dígitos que sí usa displayNombre más arriba.
      String(e.equipo).split('*').map(t => t.trim()).filter(Boolean).forEach(t => teamSet.add(t));
    });
    return Array.from(teamSet).sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ''), 10);
      const nb = parseInt(b.replace(/\D/g, ''), 10);
      if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
      return a.localeCompare(b);
    });
  }, [events]);

  return (
    <CyclesContext.Provider value={{ currentCycle, currentStage, events, loadingEvents, syncEventsToGoogle, quitoCycles, quitoTeamOptions }}>
      {children}
    </CyclesContext.Provider>
  );
}

export function useCycles() {
  return useContext(CyclesContext);
}
