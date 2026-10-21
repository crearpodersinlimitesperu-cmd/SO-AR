const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

// Calendar timestamps describe civil dates at the venue, not browser instants.
export function parseCalendarDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) return null;
  if (!Number.isFinite(Date.parse(value))) return null;
  const day = value.slice(0, 10);
  const date = new Date(`${day}T00:00:00Z`);
  return date.toISOString().slice(0, 10) === day ? date : null;
}

export function localCalendarDay(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function nextFlyerC1Event(events, patterns, today = localCalendarDay()) {
  return events.filter(event => {
    const name = String(event.nombre || event.name || '').toUpperCase();
    const sede = String(event.sede || event.place || event.sedeTag || '').toUpperCase();
    const start = parseCalendarDay(event.fecha_inicio || event.start);
    const isC1 = name.includes('CAPITULO UNO') || name.includes('CAPÍTULO UNO') || name.startsWith('C1 ');
    return start && start.toISOString().slice(0, 10) >= today &&
      isC1 && patterns.some(pattern => sede.includes(pattern));
  }).sort((a, b) => parseCalendarDay(a.fecha_inicio || a.start) - parseCalendarDay(b.fecha_inicio || b.start))[0];
}

export function formatFlyerC1Dates(startValue, endValue) {
  const start = parseCalendarDay(startValue);
  if (!start) return 'Fecha por confirmar';
  const inferred = endValue == null || endValue === '';
  // C1 presets use three inclusive days. This inference is presentation-only.
  const end = inferred ? new Date(start.getTime() + 2 * 86400000) : parseCalendarDay(endValue);
  if (!end || end < start) return 'Fecha por confirmar';

  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();
  const startMonth = MONTHS[start.getUTCMonth()];
  const endMonth = MONTHS[end.getUTCMonth()];
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();
  let range;
  if (startYear !== endYear) {
    range = `${startDay} de ${startMonth} de ${startYear} al ${endDay} de ${endMonth} de ${endYear}`;
  } else if (start.getUTCMonth() !== end.getUTCMonth()) {
    range = `${startDay} de ${startMonth} al ${endDay} de ${endMonth}`;
  } else if (startDay === endDay) {
    range = `${startDay} de ${startMonth}`;
  } else if (endDay - startDay === 2) {
    range = `${startDay}, ${startDay + 1} y ${endDay} de ${startMonth}`;
  } else {
    range = `${startDay} al ${endDay} de ${startMonth}`;
  }
  return range;
}
