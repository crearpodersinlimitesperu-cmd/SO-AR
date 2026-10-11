import { canonicalSede, explicitGoalTeam, goalStageKey } from './goalsTimeline.js';

export const NODUS_GOAL_SOURCE = 'https://imo.crearpslglobal.com';

export function nodusDate(value) {
  const match = String(value || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const iso = `${y}-${m}-${d}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : null;
}

export function nodusGoalSourceStatus(snapshot, now = Date.now()) {
  if (!snapshot) return { ready: false, message: 'Esperando la consulta de fuentes de Nodus.' };
  const observed = Date.parse(snapshot.queriedAt);
  if (snapshot.source !== NODUS_GOAL_SOURCE || snapshot.schemaVersion !== 1 ||
      !Array.isArray(snapshot.teams) || !Array.isArray(snapshot.allies) ||
      !Number.isFinite(observed) || observed > now + 60000 || now - observed > 24 * 60 * 60 * 1000) {
    return { ready: false, message: 'La consulta de Nodus falta o está desactualizada; no se aplica a las metas.' };
  }
  return { ready: true, message: `Consultado en Nodus: ${snapshot.queriedAt}. No se conoce la fecha de modificación del dato.` };
}

export function findNodusTeam(snapshot, sede, team, stage = null) {
  const matches = (snapshot?.teams || []).filter(t =>
    canonicalSede(t.sede) === canonicalSede(sede) && t.team === String(team) &&
    ['C1', 'C2'].includes(t.stage) && (!stage || t.stage === stage) &&
    /^\d+$/.test(t.teamId) && t.path === `/equipos/detalle/${t.teamId}`);
  // A group can show both explicitly labelled stages, never choose an ambiguous id.
  return matches.filter(t => matches.filter(other => other.stage === t.stage).length === 1);
}

export function findNodusAllyEvidence(snapshot, goal, parentGoal, now = Date.now()) {
  if (!nodusGoalSourceStatus(snapshot, now).ready) return null;
  const text = `${goal?.title || ''} ${goal?.kpi || ''}`.toLowerCase();
  if (!text.includes('aliado')) return null;
  const sede = canonicalSede(goal?.sede || parentGoal?.sede || '');
  const team = explicitGoalTeam(goal) || explicitGoalTeam(parentGoal);
  const stage = goalStageKey(goal);
  if (!team || !['C1', 'C2'].includes(stage) || !sede) return null;
  const metric = stage === 'C1' ? 'assignedAllies' : 'confirmedC2Allies';
  const matches = (snapshot.allies || []).filter(record =>
    canonicalSede(record.sede) === sede && record.team === team && record.stage === stage &&
    record.metric === metric && record.complete === true && Number.isInteger(record.value) && record.value >= 0 &&
    record.path === `/aliados?id_equipo=${record.teamId}`);
  return matches.length === 1 ? { ...matches[0], queriedAt: snapshot.queriedAt } : null;
}
