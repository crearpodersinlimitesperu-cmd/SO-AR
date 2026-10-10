import { FLYER_VENUES, flyerEventType } from './flyerPrograms.js';
import { formatFlyerC1Dates, parseCalendarDay } from './flyerDates.js';

const normalize = value => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toUpperCase().trim().replace(/\s+/g, ' ');
const teamPattern = /^(?:EQUIPO\s*#?\s*|EQ\.?\s*#?\s*|E\s*)?(\d+)$/;
const mjHeading = /^(?:MJ|MAESTRIA DEL JUEGO)(?:\s*#?\s*(\d+)(?:\s*,\s*(\d+)\s*,\s*(\d+))?)?(?:\s*(?:[-:·]\s*)?(?:EQUIPO\s*#?\s*\d+|EQ\.?\s*#?\s*\d+|E\s*\d+))?\.?$/;

function parseTeams(value) {
  const parts = normalize(value).split('*');
  const matches = parts.map(part => part.trim().match(teamPattern));
  if (matches.some(match => !match)) return [];
  return [...new Set(matches.map(match => String(Number(match[1]))))].sort();
}

export function flyerTeamIds(event = {}) {
  const fields = [event.equipo, event.team, event.equipoNombre, event.equipoId]
    .filter(value => value !== undefined && value !== null && String(value).trim() !== '');
  const declared = fields.map(parseTeams).filter(ids => ids.length);
  const name = normalize(event.nombre || event.name);
  const suffix = name.match(/(?:^|[\s:·-]|C[12])((?:EQUIPO\s*#?\s*|EQ\.?\s*#?\s*|E\s*)\d+)\.?$/);
  if (suffix) declared.push(parseTeams(suffix[1]));
  if (declared.length) {
    // Conflicting declarations must not attach a date to either team.
    if (declared.some(ids => ids.join('|') !== declared[0].join('|'))) return [];
    return declared[0].map(id => `E${id}`);
  }
  // Opaque IDs are usable only as exact IDs, never mapped to a numbered cohort.
  const id = String(event.equipoId ?? '').trim();
  return id ? [`id:${id}`] : [];
}

export function flyerTeamVenue(event = {}) {
  const fields = [event.sede, event.sedeTag, event.place].filter(value => String(value ?? '').trim());
  const matches = fields.map(value => {
    const tokens = normalize(value).split(/[^A-Z0-9]+/);
    return FLYER_VENUES.filter(venue => venue.aliases.some(alias => tokens.includes(alias)));
  });
  if (!matches.length || matches.some(venues => venues.length !== 1)) return null;
  return matches.every(venues => venues[0].id === matches[0][0].id) ? matches[0][0] : null;
}

export function flyerTeamType(event = {}) {
  const phase = flyerEventType(event);
  if (phase) return phase;
  return mjHeading
    .test(normalize(event.nombre || event.name)) ? 'MJ' : null;
}

export function flyerMJNumber(event = {}) {
  if (flyerTeamType(event) !== 'MJ') return null;
  const heading = normalize(event.nombre || event.name).match(mjHeading);
  const fields = [event.mjNumero, event.numeroMJ, event.mjNumber]
    .filter(value => value !== undefined && value !== null && String(value).trim() !== '');
  if (heading?.[1]) fields.push(heading[1]);
  if (!fields.length || fields.some(value => !/^\d+$/.test(String(value).trim()))) return null;
  const numbers = fields.map(value => Number(value));
  const number = numbers[0];
  if (!Number.isSafeInteger(number) || number < 1 || numbers.some(value => value !== number)) return null;
  if (heading?.[2] && (Number(heading[2]) !== number - 1 || Number(heading[3]) !== number - 2)) return null;
  return number;
}

export function flyerMJPhases(event) {
  const number = flyerMJNumber(event);
  if (number === null) return [];
  return ['CREACION', 'RELACION', 'GRATITUD'].map((type, offset) => ({
    type, number: number > offset ? number - offset : null
  }));
}

export function flyerTeamsForVenue(events, venueId) {
  const ids = new Set();
  for (const event of Array.isArray(events) ? events : []) {
    if (flyerTeamVenue(event)?.id !== venueId || !flyerTeamType(event)) continue;
    flyerTeamIds(event).forEach(id => ids.add(id));
  }
  return [...ids].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
}

export function flyerTeamEvents(events, venueId, teamId) {
  if (!venueId || !teamId) return [];
  return (Array.isArray(events) ? events : []).filter(event =>
    flyerTeamVenue(event)?.id === venueId && flyerTeamIds(event).includes(teamId) && flyerTeamType(event))
    .sort((a, b) => (parseCalendarDay(a.fecha_inicio || a.start)?.getTime() ?? Infinity) -
      (parseCalendarDay(b.fecha_inicio || b.start)?.getTime() ?? Infinity));
}

export function flyerTeamLabel(id) {
  return id.startsWith('id:') ? `ID ${id.slice(3)}` : `Equipo ${id.slice(1)}`;
}

const labels = {
  C1: 'C1 · Capítulo Uno', C2: 'C2 · Capítulo Dos', MJ: 'MJ · Maestría del Juego',
  CREACION: 'MJ · Creación', RELACION: 'MJ · Relación', GRATITUD: 'MJ · Gratitud'
};

export function selectTeamFlyer(events, venueId, teamId) {
  const venue = FLYER_VENUES.find(item => item.id === venueId);
  if (!venue || !flyerTeamsForVenue(events, venueId).includes(teamId)) {
    return { sedes: [], error: 'Selecciona una sede y un equipo explícito del calendario.' };
  }
  const selected = flyerTeamEvents(events, venueId, teamId);
  const rows = [];
  for (const type of ['C1', 'C2', 'MJ']) {
    const phaseEvents = selected.filter(event => type === 'MJ'
      ? ['MJ', 'CREACION', 'RELACION', 'GRATITUD'].includes(flyerTeamType(event))
      : flyerTeamType(event) === type);
    const seen = new Set();
    for (const event of phaseEvents) {
      const eventType = flyerTeamType(event);
      const start = event.fecha_inicio || event.start;
      const end = event.fecha_fin || event.end;
      const mjNumber = flyerMJNumber(event);
      const key = JSON.stringify([eventType, start, end, mjNumber]);
      if (seen.has(key)) continue;
      seen.add(key);
      const validStart = parseCalendarDay(start);
      const dates = validStart ? formatFlyerC1Dates(start, end || start) : 'Fecha no disponible';
      const phases = flyerMJPhases(event);
      const entries = phases.length ? phases : [{ type: eventType }];
      for (const phase of entries) {
        const unavailable = phase.number === null;
        rows.push({
          id: `${venueId}-${teamId}-${rows.length}`,
          ciudad: `${labels[phase.type]}${phase.number ? ` ${phase.number}` : ''}`,
          fechas: unavailable ? `Sin fase derivable para MJ ${mjNumber}`
            : `${validStart ? `${dates} (${String(start).slice(0, 4)})${end ? '' : ' · fin por confirmar'}` : dates}${eventType === 'MJ' && !phases.length ? ' · sin número MJ explícito; sin fases derivables' : ''}`,
          equipo: `${venue.ciudad} — ${flyerTeamLabel(teamId)}`,
          source: unavailable ? 'sin-fechas' : 'calendario',
          programType: phase.type, activo: true,
          ...(phases.length ? { mjNumber, phaseNumber: phase.number, derivedFrom: 'MJ' } : {})
        });
      }
    }
    if (!phaseEvents.length) rows.push({
      id: `${venueId}-${teamId}-${type}`, ciudad: labels[type],
      fechas: 'Fechas no disponibles · sin vínculo explícito',
      equipo: `${venue.ciudad} — ${flyerTeamLabel(teamId)}`, source: 'sin-fechas',
      programType: type, activo: true
    });
  }
  return { sedes: rows, error: null };
}

export function teamFlyerPages(rows) {
  return Array.from({ length: Math.ceil(rows.length / 6) }, (_, index) => rows.slice(index * 6, index * 6 + 6));
}
