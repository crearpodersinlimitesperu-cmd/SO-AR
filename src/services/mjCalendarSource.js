import { canonicalSede, mjStageForTeam } from './goalsTimeline.js';

export function findOfficialMJEvent(events, sede, equipoNumero) {
  const team = String(equipoNumero ?? '').trim();
  if (!canonicalSede(sede) || !/^[1-9]\d{0,2}$/.test(team) || !Array.isArray(events)) return null;
  const matches = events.filter(event => {
    const name = String(event.nombre || event.name || event.title || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
    if (name !== 'MAESTRIA DEL JUEGO' ||
        canonicalSede(event.sede || event.sedeTag || event.place) !== canonicalSede(sede)) return false;
    const cohort = String(event.equipo ?? event.team ?? '').trim();
    // A cohort shares one weekend, but only its newest team is in Creación.
    if (cohort !== team && mjStageForTeam(cohort, team) !== 'MJ_CREACION') return false;
    const start = String(event.fecha_inicio || event.start || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return false;
    const date = new Date(`${start}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === start;
  });
  const dates = new Set(matches.map(event => String(event.fecha_inicio || event.start).slice(0, 10)));
  return dates.size === 1 ? matches[0] : null;
}
