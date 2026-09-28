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
