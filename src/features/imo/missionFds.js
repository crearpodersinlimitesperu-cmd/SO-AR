import { buildOriginIndex, inferOriginTeam, recordTeamNumber } from './campaignCandidates.js';
import { normalizeText } from './missionModel.js';

const updatedMs = calendar => {
  const value = calendar?.updatedAt;
  if (value?.toMillis) return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = Date.parse(value || '');
  return Number.isNaN(parsed) ? 0 : parsed;
};

export function buildMissionFdsContexts(missions, calendars, resolveSede) {
  const originIndex = buildOriginIndex(missions, resolveSede);
  const calendarsByOrigin = new Map();
  for (const calendar of calendars || []) {
    const team = Number(calendar?.equipoNumero);
    const sede = normalizeText(calendar?.sede);
    if (!Number.isInteger(team) || team < 1 || !sede) continue;
    const key = `${sede}|${team}`;
    const current = calendarsByOrigin.get(key);
    if (!current || updatedMs(calendar) > updatedMs(current)) calendarsByOrigin.set(key, calendar);
  }

  const contexts = new Map();
  for (const mission of missions || []) {
    const targetTeam = recordTeamNumber(mission);
    const originTeam = mission.schemaVersion === 2
      ? Number(mission.originTeam) || 0
      : inferOriginTeam(mission.imoNombre, targetTeam, originIndex, resolveSede?.(mission) || '');
    const sede = normalizeText(resolveSede ? resolveSede(mission) : mission.sede);
    const calendar = originTeam ? calendarsByOrigin.get(`${sede}|${originTeam}`) : null;
    contexts.set(mission.id, {
      originTeam,
      calendarFound: !!calendar,
      fds: (calendar?.fds || []).map(fds => ({
        id: String(fds.id || ''),
        title: String(fds.titulo || fds.title || fds.id || ''),
        startDate: String(fds.fechaInicio || ''),
        endDate: String(fds.fechaFin || ''),
      })),
    });
  }
  return contexts;
}
