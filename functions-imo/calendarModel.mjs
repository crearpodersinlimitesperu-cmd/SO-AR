const normalizeText = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const teamNumber = value => { const match=String(value || '').match(/^(?:EQUIPO\s*)?(\d+)\b/i);return match?Number(match[1]):null; };
export const OFFICIAL_CALENDAR_URL = 'https://docs.google.com/spreadsheets/d/1u0tc4GeooPmSwNxZ0CErKGtRU4oD-mO3l--ZSQM-KPs/gviz/tq?tqx=out:json&gid=1326951636';
export function calendarSede(value) {
  const key = normalizeText(value).replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (['LIM', 'LIMA'].includes(key)) return 'Lima';
  if (['UIO', 'UIOC1', 'UIOC2', 'QUITO'].includes(key)) return 'Quito';
  if (['CUE', 'CUENCA'].includes(key)) return 'Cuenca';
  if (['GYE', 'GUAYAQUIL'].includes(key)) return 'Guayaquil';
  if (['MED', 'MEDELLIN'].includes(key)) return 'Medellín';
  if (['MEX', 'CDMX', 'MEXICO'].includes(key)) return 'México';
  if (['BOG', 'BOGOTA'].includes(key)) return 'Bogotá';
  return String(value || '');
}
const dateOnly = value => {
  const raw = String(value || '');
  const m = /^Date\((\d{4}),(\d{1,2}),(\d{1,2})(?:,.*)?\)$/.exec(raw);
  return m ? `${m[1]}-${String(Number(m[2]) + 1).padStart(2, '0')}-${m[3].padStart(2, '0')}` : /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : '';
};
export function parseOfficialCalendar(text) {
  const first = text.indexOf('{'), last = text.lastIndexOf('}');
  if (first < 0 || last < first) throw new Error('El calendario oficial no respondió con datos válidos.');
  const data = JSON.parse(text.slice(first, last + 1));
  if (!Array.isArray(data.table?.rows)) throw new Error('El calendario oficial no contiene eventos.');
  return data.table.rows.flatMap(({ c }) => {
    const v = i => c?.[i]?.v ?? '';
    const start = dateOnly(v(0)), rawSede = String(v(1)).trim(), name = String(v(3)).trim();
    if (!start || !name) return [];
    const sede = calendarSede(rawSede), team = teamNumber(v(2));
    const key = `${start}__${sede}__${name}${team ? `__${team}` : ''}`.replace(/\//g, '-');
    return [{ key, date: start, sede, rawSede, team, name, source: 'Calendario oficial' }];
  });
}
export function applyCalendarChanges(events, changes) {
  const result = events.map(e => ({ ...e }));
  for (const change of changes) {
    if (change.kind === 'override' && change.sourceEventKey) {
      const matches = result.filter(e => e.key === change.sourceEventKey || e.key.replace(/__\d+$/, '') === change.sourceEventKey);
      for (const e of matches) Object.assign(e, { date: dateOnly(change.fechaInicio) || e.date, name: change.nombre || e.name, team: change.equipo == null ? e.team : teamNumber(change.equipo), sede: change.sede ? calendarSede(change.sede) : e.sede, source: 'Calendario Causa OS' });
    } else if (change.kind === 'custom' && change.fechaInicio && change.nombre) {
      result.push({ key: `custom__${change.id}`, date: dateOnly(change.fechaInicio), name: change.nombre, team: teamNumber(change.equipo), sede: calendarSede(change.sede), rawSede: change.sede, source: 'Calendario Causa OS' });
    }
  }
  return result;
}
export function findC1Dates(events, sede, team) {
  const dates = new Map();
  for (const e of events) {
    if (e.sede !== calendarSede(sede) || !Number(team) || e.team !== Number(team) || !/^(CAPITULO UNO|CAPITULO 1|C1)$/i.test(normalizeText(e.name))) continue;
    if (e.date) dates.set(e.date, e);
  }
  return [...dates.values()].sort((a, b) => a.date.localeCompare(b.date));
}
