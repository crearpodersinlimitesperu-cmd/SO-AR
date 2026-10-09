export const normalizeTaskEmail = (value) => (typeof value === 'string'
  ? value.trim().toLowerCase()
      .replace('@crearpls.com', '@crearpsl.net')
      .replace('@crearpsl.com', '@crearpsl.net')
  : '');

const getEmailValues = (value) => (Array.isArray(value) ? value : value ? [value] : [])
  .map(entry => typeof entry === 'string' ? entry : entry?.email)
  .map(normalizeTaskEmail)
  .filter(Boolean);

const getAssigneeEmails = (task) => [...new Set([
  ...getEmailValues(task?.assignedToEmails),
  ...getEmailValues(task?.assignedToEmail),
  ...getEmailValues(task?.assigned_to)
])];

const getAssignerEmails = (task) => [
  ...getEmailValues(task?.assignedByEmail),
  ...getEmailValues(task?.createdBy),
  ...getEmailValues(task?.createdByEmail),
  ...getEmailValues(task?.created_by)
];

export const getTasksAssignedBy = (tasks, assignerEmail) => {
  const email = normalizeTaskEmail(assignerEmail);
  if (!email || !Array.isArray(tasks)) return [];
  return tasks.filter(task => task && getAssignerEmails(task).includes(email) && getAssigneeEmails(task).length > 0);
};

export const getTaskAssigneeEmails = getAssigneeEmails;

const findAssigneeProgress = (task, email) => {
  const progress = task?.assigneeProgress;
  if (!progress || typeof progress !== 'object') return null;
  const entry = Object.entries(progress).find(([key]) => normalizeTaskEmail(key) === email);
  return entry?.[1] || null;
};

const isTaskMarkedComplete = (task) => Boolean(task && (
  task.completed === true ||
  String(task.status || '').trim().toLowerCase() === 'completada' ||
  task.progressPercentage === 100
));

export const isTaskCompleteForAssignee = (task, email) => {
  if (!task) return false;
  if (isTaskMarkedComplete(task)) return true;
  const normalizedEmail = normalizeTaskEmail(email);
  if (!normalizedEmail) return false;
  const progress = findAssigneeProgress(task, normalizedEmail);
  return progress?.completed === true ||
    String(progress?.status || '').trim().toLowerCase() === 'completada' ||
    progress?.progress === 100 || progress?.progressPercentage === 100;
};

export const isTaskCompleteForTeam = (task) => {
  if (isTaskMarkedComplete(task)) return true;
  const assignees = getAssigneeEmails(task);
  return assignees.length > 0 && assignees.every(email => isTaskCompleteForAssignee(task, email));
};

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }
  if (typeof value === 'string') {
    const dateOnly = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const date = dateOnly
      ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
      : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const getTaskTiming = (task, now = new Date()) => {
  if (isTaskCompleteForTeam(task)) return { key: 'completed', label: 'Completada', days: null };
  const deadline = toDate(task?.deadline || task?.dueDate);
  if (!deadline) return { key: 'noDeadline', label: 'Sin fecha límite', days: null };

  const today = startOfDay(now);
  const dueDay = startOfDay(deadline);
  const days = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { key: 'overdue', label: `Atrasada ${Math.abs(days)} ${Math.abs(days) === 1 ? 'día' : 'días'}`, days };
  if (days === 0) return { key: 'today', label: 'Vence hoy', days };
  if (days === 1) return { key: 'tomorrow', label: 'Vence mañana', days };
  return { key: 'onTime', label: `Vence en ${days} días`, days };
};

export const getTeamTimingSummary = (tasks, now = new Date()) => {
  const summary = { today: 0, overdue: 0, onTime: 0, completed: 0, noDeadline: 0 };
  (Array.isArray(tasks) ? tasks : []).forEach(task => {
    const timing = getTaskTiming(task, now);
    if (timing.key === 'tomorrow' || timing.key === 'onTime') summary.onTime += 1;
    else summary[timing.key] += 1;
  });
  return summary;
};

export const getTeamMembers = (tasks) => {
  const peopleByEmail = new Map();
  (Array.isArray(tasks) ? tasks : []).forEach(task => {
    getAssigneeEmails(task).forEach(email => {
      const progress = findAssigneeProgress(task, email);
      const person = peopleByEmail.get(email) || { email, taskCount: 0, completedCount: 0, tasks: [] };
      person.taskCount += 1;
      if (isTaskCompleteForAssignee(task, email)) person.completedCount += 1;
      person.tasks.push(task);
      person.name = person.name || progress?.name || '';
      peopleByEmail.set(email, person);
    });
  });
  return [...peopleByEmail.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
};
