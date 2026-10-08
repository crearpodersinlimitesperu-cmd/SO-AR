export const OVERDUE_THRESHOLD_MS = 72 * 60 * 60 * 1000;

export const normalizeTaskEmail = (e) => (typeof e === 'string'
  ? e.trim().toLowerCase()
      .replace('@crearpls.com', '@crearpsl.net')
      .replace('@crearpsl.com', '@crearpsl.net')
  : '');

const toMs = (val) => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val.getTime();
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    const d = val.toDate();
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val === 'string') {
    const clean = val.trim();
    if (!clean) return null;
    let ms = Date.parse(clean);
    if (isNaN(ms)) ms = Date.parse(clean.replace(' ', 'T'));
    return isNaN(ms) ? null : ms;
  }
  return null;
};

const listEmails = (task) => [
  ...(Array.isArray(task.assignedToEmails) ? task.assignedToEmails : []),
  ...(task.assignedToEmail ? [task.assignedToEmail] : []),
  ...(Array.isArray(task.collaborators) ? task.collaborators : [])
].map(normalizeTaskEmail).filter(Boolean);

const findProgressEntry = (task, email) => {
  const map = task.assigneeProgress;
  if (!map || typeof map !== 'object') return null;
  const key = Object.keys(map).find(k => normalizeTaskEmail(k) === email);
  return key ? map[key] : null;
};

const isCompletedFlag = (e) => !!e && (
  e.completed === true || e.status === 'Completada' ||
  e.progress === 100 || e.progressPercentage === 100
);

// Completion escrita por el usuario actual: por sede (`completions.<sede>`)
// o por ciclo (`completions.<sede>__<cycleId>`). toggleTask usa 'Global'
// cuando el usuario no tiene sede, así que se aplica el mismo valor por defecto.
const isDoneInCompletions = (task, sede, cycleIds) => {
  const map = task.completions;
  if (!map || typeof map !== 'object') return false;
  const s = (typeof sede === 'string' ? sede.trim() : '') || 'Global';
  if (isCompletedFlag(map[s])) return true;
  return cycleIds.some(id => isCompletedFlag(map[`${s}__${id}`]));
};

const isDoneForUser = (task, email, { sede, cycleId, cycleIds } = {}) => {
  const entry = findProgressEntry(task, email);
  if (isCompletedFlag(entry)) return true;
  const ids = [cycleId, ...(Array.isArray(cycleIds) ? cycleIds : [])].filter(Boolean);
  if (isDoneInCompletions(task, sede, ids)) return true;
  if (entry) return false;
  return !!(task.completed || task.status === 'Completada');
};

/** Tareas asignadas/colaborativas del usuario, incompletas y vencidas hace MÁS de 72 h. */
export const getOverdueAssignedTasks = (tasks, userEmail, now = Date.now(), options = {}) => {
  const email = normalizeTaskEmail(userEmail);
  if (!email || !Array.isArray(tasks)) return [];
  const nowMs = now instanceof Date ? now.getTime() : now;
  return tasks.filter(t => {
    if (!t || !listEmails(t).includes(email)) return false;
    const deadline = toMs(t.deadline);
    if (deadline === null) return false;
    if (nowMs - deadline <= OVERDUE_THRESHOLD_MS) return false;
    return !isDoneForUser(t, email, options);
  });
};

export const getTaskDisplayName = (t) => t.title || t.task || t.name || 'Tarea sin título';
