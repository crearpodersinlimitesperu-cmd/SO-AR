const SEDE_TIME_ZONES = {
  quito: { zone: 'America/Guayaquil', label: 'Quito' },
  cuenca: { zone: 'America/Guayaquil', label: 'Cuenca' },
  guayaquil: { zone: 'America/Guayaquil', label: 'Guayaquil' },
  lima: { zone: 'America/Lima', label: 'Lima' },
  medellin: { zone: 'America/Bogota', label: 'Medellín' },
  mexico: { zone: 'America/Mexico_City', label: 'Ciudad de México' },
  cdmx: { zone: 'America/Mexico_City', label: 'Ciudad de México' },
};

export const timeZoneForSede = sede => {
  const key = String(sede || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return Object.entries(SEDE_TIME_ZONES).find(([match]) => key.includes(match))?.[1] || null;
};

const format = (date, zone) => new Intl.DateTimeFormat('es-EC', {
  timeZone: zone, weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
}).format(date);

const offset = (date, zone) => new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' })
  .formatToParts(date).find(part => part.type === 'timeZoneName')?.value || zone;

const offsetMilliseconds = (date, zone) => {
  const label = offset(date, zone);
  const match = label.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return (match[1] === '-' ? -1 : 1) * minutes * 60_000;
};

export const zonedDateInputParts = (iso, zone) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { date: '', time: '' };
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const part = type => parts.find(item => item.type === type)?.value || '';
  return { date: `${part('year')}-${part('month')}-${part('day')}`, time: `${part('hour')}:${part('minute')}` };
};

// Convierte la fecha/hora escrita para la sede a un único instante UTC. Así
// el mismo límite se ve correctamente desde cualquier país sin duplicar fechas.
export const zonedDateTimeToIso = (dateValue, timeValue, zone) => {
  const [year, month, day] = String(dateValue).split('-').map(Number);
  const [hour, minute] = String(timeValue).split(':').map(Number);
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let instant = naiveUtc - offsetMilliseconds(new Date(naiveUtc), zone);
  instant = naiveUtc - offsetMilliseconds(new Date(instant), zone);
  return new Date(instant).toISOString();
};

export const deadlineTimeReference = (iso, sede) => {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return null;
  const date = new Date(iso);
  const quito = { zone: 'America/Guayaquil', label: 'Quito' };
  const local = timeZoneForSede(sede) || quito;
  const sameOffset = offset(date, local.zone) === offset(date, quito.zone);
  return {
    localLabel: `${local.label}: ${format(date, local.zone)}`,
    quitoLabel: `Quito: ${format(date, quito.zone)}`,
    differsFromQuito: !sameOffset,
    zoneLabel: local.zone,
  };
};
