import { formatFlyerC1Dates, localCalendarDay, parseCalendarDay } from './flyerDates.js';
import { explicitTeamFromText } from '../services/goalsTimeline.js';

export const FLYER_PROGRAMS = [
  { id: 'C1', label: 'Capítulo Uno', outline: 'UNO' },
  { id: 'C2', label: 'Capítulo Dos', outline: 'DOS' },
  { id: 'CREACION', label: 'Creación', outline: 'CREACIÓN' },
  { id: 'RELACION', label: 'Relación', outline: 'RELACIÓN' },
  { id: 'GRATITUD', label: 'Gratitud', outline: 'GRATITUD' }
];

export const FLYER_VENUES = [
  { id: 'mex', ciudad: 'México', aliases: ['MEX', 'CDMX', 'MEXICO'] },
  { id: 'lim', ciudad: 'Lima', aliases: ['LIM', 'LIMA'] },
  { id: 'uio', ciudad: 'Quito', aliases: ['UIO', 'QUITO'] },
  { id: 'gye', ciudad: 'Guayaquil', aliases: ['GYE', 'GUAYAQUIL'] },
  { id: 'cue', ciudad: 'Cuenca', aliases: ['CUE', 'CUENCA'] },
  { id: 'med', ciudad: 'Medellín', aliases: ['MED', 'MEDELLIN'] }
];

const normalize = value => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toUpperCase().trim().replace(/\s+/g, ' ');

export function flyerEventKey(event) {
  return [event.fecha_inicio || event.start, normalize(event.nombre || event.name),
    normalize(event.sede || event.sedeTag || event.place), flyerEventTeam(event)].join('|');
}

export function flyerEventType(event = {}) {
  const name = normalize(event.nombre || event.name);
  // Only explicit program headings, optionally followed by an explicit team.
  const suffix = '(?:\\s*(?:[-:·]\\s*)?(?:EQUIPO\\s*#?\\s*\\d+|EQ\\.?\\s*#?\\s*\\d+|E\\s*\\d+))?';
  const matches = [
    ['C1', '(?:CAPITULO\\s*(?:UNO|1)|C1)'],
    ['C2', '(?:CAPITULO\\s*(?:DOS|2)|C2)'],
    ['CREACION', '(?:(?:MJ|MAESTRIA(?: DEL JUEGO)?|PRIMER FDS)\\s*[-:·]?\\s*)?CREACION'],
    ['RELACION', '(?:(?:MJ|MAESTRIA(?: DEL JUEGO)?|SEGUNDO FDS)\\s*[-:·]?\\s*)?RELACION'],
    ['GRATITUD', '(?:(?:MJ|MAESTRIA(?: DEL JUEGO)?|TERCER FDS)\\s*[-:·]?\\s*)?GRATITUD']
  ].filter(([, heading]) => new RegExp(`^${heading}${suffix}\\.?$`).test(name));
  return matches.length === 1 ? matches[0][0] : null;
}

export function flyerEventTeam(event = {}) {
  const raw = String(event.equipo ?? event.team ?? '').trim();
  if (raw) return /^\d+$/.test(raw) ? `Equipo ${raw}` : raw;
  const explicit = explicitTeamFromText(event.nombre || event.name);
  return explicit ? `Equipo ${explicit}` : '';
}

export function flyerEventDates(event, type) {
  const start = event.fecha_inicio || event.start;
  const end = event.fecha_fin || event.end;
  if (type === 'C1' || end) return formatFlyerC1Dates(start, end);
  return `${formatFlyerC1Dates(start, start)} (fin por confirmar)`;
}

export function flyerCalendarEvents(events, type, venue, today = localCalendarDay()) {
  return (Array.isArray(events) ? events : []).filter(event => {
    const start = parseCalendarDay(event.fecha_inicio || event.start);
    const sede = normalize(event.sede || event.sedeTag || event.place);
    const tokens = sede.split(/[^A-Z0-9]+/);
    return start && start.toISOString().slice(0, 10) >= today &&
      flyerEventType(event) === type &&
      venue.aliases.some(alias => tokens.includes(alias));
  }).sort((a, b) => parseCalendarDay(a.fecha_inicio || a.start) - parseCalendarDay(b.fecha_inicio || b.start));
}

export function flyerCalendarRow(venue, event, type) {
  const label = FLYER_PROGRAMS.find(program => program.id === type)?.label || type;
  return {
    id: venue.id, ciudad: venue.ciudad, programType: type,
    fechas: event ? flyerEventDates(event, type) : '',
    equipo: event ? flyerEventTeam(event) : '',
    eventKey: event ? flyerEventKey(event) : '',
    activo: Boolean(event), source: event ? 'calendario' : 'sin-fechas',
    notice: event ? '' : `Sin fechas de ${label} en el calendario`
  };
}

export function synchronizeFlyerRows(events, type, today = localCalendarDay()) {
  return FLYER_VENUES.map(venue =>
    flyerCalendarRow(venue, flyerCalendarEvents(events, type, venue, today)[0], type));
}
