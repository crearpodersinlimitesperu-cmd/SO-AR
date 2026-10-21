// Organización de metas por equipo y fechas del calendario oficial.
// Módulo puro (sin Firebase ni React) para poder probarlo con node --test.

const SEDE_CODES = [
  ['quito', 'Quito'], ['uio', 'Quito'],
  ['guayaquil', 'Guayaquil'], ['gye', 'Guayaquil'],
  ['cuenca', 'Cuenca'], ['cue', 'Cuenca'],
  ['medellin', 'Medellin'], ['med', 'Medellin'],
  ['mexico', 'CDMX'], ['cdmx', 'CDMX'],
  ['lima', 'Lima'], ['lim', 'Lima']
];

export function canonicalSede(raw) {
  if (!raw) return '';
  const s = String(raw).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [needle, name] of SEDE_CODES) {
    if (s.includes(needle)) return name;
  }
  return String(raw).trim();
}

const TEAM_PATTERNS = [
  /C\d+\s*E\s*(\d{1,3})\b/i,
  /\bEquipo\s*#?\s*(\d{1,3})\b/i,
  /\bEq\.?\s*#?\s*(\d{1,3})\b/i,
  /\bE\s*(\d{1,3})\b/
];

export function explicitTeamFromText(text) {
  const value = String(text || '');
  for (const pattern of TEAM_PATTERNS) {
    const match = value.match(pattern);
    if (match) return String(Number(match[1]));
  }
  return null;
}

// Solo devuelve un equipo cuando la meta lo declara (título, descripción o fase); nunca inventa uno.
export function explicitGoalTeam(goal) {
  if (!goal) return null;
  if (goal.teamNumber || goal.equipoNumero) return String(Number(goal.teamNumber || goal.equipoNumero));
  return explicitTeamFromText(goal.title) || explicitTeamFromText(`${goal.description || ''} ${goal.cyclePhase || ''}`);
}

export const STAGES = [
  { key: 'C1', label: 'Capítulo 1' },
  { key: 'C2', label: 'Capítulo 2' },
  { key: 'MJ_CREACION', label: 'MJ · Creación' },
  { key: 'MJ_RELACION', label: 'MJ · Relación' },
  { key: 'MJ_GRATITUD', label: 'MJ · Gratitud' }
];

export function goalStageKey(goal) {
  const text = `${goal?.title || ''} ${goal?.stage || ''} ${goal?.cyclePhase || ''}`
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (text.includes('creacion')) return 'MJ_CREACION';
  if (text.includes('relacion')) return 'MJ_RELACION';
  if (text.includes('gratitud')) return 'MJ_GRATITUD';
  if (/\b(mj|maestria)\b/.test(text)) return 'MJ';
  if (/capitulo\s*(2|dos)\b|\bc2\b|\bc2e\d/.test(text)) return 'C2';
  if (/capitulo\s*(1|uno)\b|\bc1\b|\bc1e\d/.test(text)) return 'C1';
  return null;
}

export function localDateKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const day = (value) => (value ? String(value).slice(0, 10) : '');

function splitCohort(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return [];
  let best = null;
  for (let a = 1; a <= 3; a++) {
    for (let b = 1; b <= 3; b++) {
      const c = digits.length - a - b;
      if (c < 1 || c > 3) continue;
      const parts = [digits.slice(0, a), digits.slice(a, a + b), digits.slice(a + b)];
      if (parts.some(p => p.length > 1 && p.startsWith('0'))) continue;
      const nums = parts.map(Number);
      const spread = Math.max(...nums) - Math.min(...nums);
      if (new Set(nums).size !== 3 || spread > 6) continue;
      if (!best || spread < best.spread) best = { spread, nums };
    }
  }
  return best ? best.nums.map(String) : [digits];
}

// En cada fin de semana de Maestría coinciden tres equipos: el más nuevo vive Creación,
// el intermedio Relación y el más antiguo Gratitud. El orden del texto varía por sede.
export function mjStageForTeam(cohortRaw, team) {
  const teams = splitCohort(cohortRaw);
  if (teams.length !== 3 || !teams.includes(String(team))) return null;
  const sorted = [...teams].sort((x, y) => Number(y) - Number(x));
  return ['MJ_CREACION', 'MJ_RELACION', 'MJ_GRATITUD'][sorted.indexOf(String(team))];
}

function eventName(event) {
  return String(event?.nombre || event?.name || event?.title || '').toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function eventSede(event) {
  return canonicalSede(event?.sede || event?.sedeTag || event?.place || '');
}

export function buildTeamSchedule(events, sede, team) {
  if (!Array.isArray(events) || !team) return null;
  const targetSede = canonicalSede(sede);
  const teamStr = String(Number(team));
  const schedule = {};
  for (const event of events) {
    if (targetSede && eventSede(event) !== targetSede) continue;
    const start = day(event.fecha_inicio || event.start);
    if (!start) continue;
    const end = day(event.fecha_fin || event.end) || start;
    const name = eventName(event);
    const equipo = String(event.equipo ?? event.team ?? '').trim();
    let key = null;
    if (name === 'CAPITULO UNO' && equipo === teamStr) key = 'C1';
    else if (name === 'CAPITULO DOS' && equipo === teamStr) key = 'C2';
    else if (name === 'MAESTRIA DEL JUEGO') key = mjStageForTeam(equipo, teamStr);
    if (key && (!schedule[key] || start > schedule[key].start)) schedule[key] = { start, end };
  }
  const items = STAGES.filter(s => schedule[s.key]).map(s => ({ ...s, ...schedule[s.key] }));
  if (!items.length) return null;
  return { team: teamStr, sede: targetSede, stages: items, start: items[0].start, end: items[items.length - 1].end };
}

export function scheduleStatus(schedule, today) {
  if (!schedule) return { status: 'sin_calendario', current: null, next: null };
  const t = day(today);
  const current = schedule.stages.find(s => t >= s.start && t <= s.end) || null;
  const next = schedule.stages.find(s => s.start > t) || null;
  let status = 'activo';
  if (t < schedule.start) status = 'proximo';
  else if (t > schedule.end && schedule.stages.some(s => s.key === 'MJ_GRATITUD')) status = 'finalizado';
  return { status, current, next };
}

const STATUS_ORDER = { activo: 0, proximo: 1, sin_calendario: 2, finalizado: 3, legado: 4 };
const STAGE_ORDER = { C1: 0, C2: 1, MJ: 2, MJ_CREACION: 3, MJ_RELACION: 4, MJ_GRATITUD: 5 };

export function organizeGoalsByTeam(goals, { events = [], today = localDateKey() } = {}) {
  const byId = new Map((goals || []).map(g => [g.id, g]));
  const groups = new Map();
  const ensure = (sede, team) => {
    const key = sede ? `${sede}|${team || 'sin-equipo'}` : 'legado';
    if (!groups.has(key)) groups.set(key, { key, sede, team: sede ? team : null, cycles: [], children: [], misaligned: [] });
    return groups.get(key);
  };

  for (const goal of goals || []) {
    const parent = goal.parentId ? byId.get(goal.parentId) : null;
    const sede = canonicalSede(goal.sede || parent?.sede || '');
    const ownTeam = explicitGoalTeam(goal);
    const parentTeam = parent ? explicitGoalTeam(parent) : null;
    const team = ownTeam || parentTeam;
    const group = ensure(sede, team);
    if (goal.scope === 'CICLO' && !goal.parentId) {
      group.cycles.push(goal);
      continue;
    }
    group.children.push(goal);
    if (ownTeam && parentTeam && ownTeam !== parentTeam) group.misaligned.push(goal);
  }

  const result = [];
  for (const group of groups.values()) {
    const schedule = group.sede && group.team ? buildTeamSchedule(events, group.sede, group.team) : null;
    const { status, current, next } = group.key === 'legado'
      ? { status: 'legado', current: null, next: null }
      : scheduleStatus(schedule, today);
    const sortByDate = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    group.cycles.sort(sortByDate);
    group.children.sort((a, b) => {
      const sa = STAGE_ORDER[goalStageKey(a)] ?? 9;
      const sb = STAGE_ORDER[goalStageKey(b)] ?? 9;
      return sa - sb || sortByDate(a, b);
    });
    const progressValues = group.children.map(g => Number(g.progress)).filter(Number.isFinite);
    const childProgress = progressValues.length
      ? Math.round(progressValues.reduce((sum, v) => sum + Math.min(100, Math.max(0, v)), 0) / progressValues.length)
      : null;
    result.push({ ...group, schedule, status, current, next, childProgress, duplicateCycles: group.cycles.length > 1 });
  }

  result.sort((a, b) =>
    (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) ||
    String(a.sede || '').localeCompare(String(b.sede || '')) ||
    (Number(b.team || 0) - Number(a.team || 0)));
  return result;
}
