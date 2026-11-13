import { normalizeSede, normalizeRole, ROLE_DISPLAY_NAMES } from '../data/usersData.js';
import { isTaskVisibleForUser } from './taskPrivacy.js';

export function normalizeSearchText(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function tokenizeSearchQuery(query) {
  const norm = normalizeSearchText(query);
  return norm.length >= 2 ? norm.split(/\s+/).filter(Boolean) : [];
}

export function matchesAllTokens(searchableText, tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) return false;
  const target = normalizeSearchText(searchableText);
  return tokens.every(t => target.includes(t));
}

export function searchUserTasks({ allTasks = [], currentUser, tokens, limit = 6 }) {
  if (!tokens || tokens.length === 0) return [];
  const userSedeNorm = normalizeSede(currentUser?.sede);
  const isGlobal = Boolean(currentUser?.isSuperAdmin || currentUser?.isDireccion || currentUser?.appRole === 'direccion');

  return allTasks
    .filter(t => isTaskVisibleForUser(t, currentUser))
    .filter(t => {
      if (isGlobal) return true;
      const taskSede = t.assignedSede || t.sede;
      if (!taskSede || taskSede === 'Global' || taskSede === 'Sede Global') return true;
      if (!userSedeNorm || userSedeNorm === 'Sede Global') return true;
      return normalizeSede(taskSede) === userSedeNorm;
    })
    .filter(t => {
      const text = [
        t.task,
        t.title,
        t.notes,
        t.description,
        t.cyclePhase,
        t.priority,
        t.associatedGoal,
        t.assignedSede,
        t.sede,
        ROLE_DISPLAY_NAMES[normalizeRole(t.role)] || t.role
      ].filter(Boolean).join(' ');
      return matchesAllTokens(text, tokens);
    })
    .slice(0, limit);
}

export function searchUserEvents({ events = [], currentUser, canSeeGlobalDirectory = false, tokens, limit = 5 }) {
  if (!tokens || tokens.length === 0) return [];
  const userSedeNorm = normalizeSede(currentUser?.sede);

  return events
    .filter(ev => {
      if (canSeeGlobalDirectory || !userSedeNorm || userSedeNorm === 'Sede Global') return true;
      const evSede = ev?.sede || ev?.sedeTag || '';
      if (!evSede || evSede === 'Todas' || evSede === 'Global' || evSede === 'Sede Global') return true;
      return normalizeSede(evSede) === userSedeNorm;
    })
    .filter(ev => {
      const text = [
        ev.nombre,
        ev.name,
        ev.sede,
        ev.sedeTag,
        ev.equipo,
        ev.lugar,
        ev.trainer,
        ev.fecha_inicio,
        ev.start
      ].filter(Boolean).join(' ');
      return matchesAllTokens(text, tokens);
    })
    .slice(0, limit);
}
