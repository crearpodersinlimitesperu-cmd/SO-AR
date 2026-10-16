export const TASK_LOCATION_MAX_LENGTH = 300;

export function normalizeTaskLocation(value) {
  if (value == null) return '';
  if (typeof value !== 'string' || value.trim().length > TASK_LOCATION_MAX_LENGTH) {
    throw new Error('La ubicación debe ser texto de hasta 300 caracteres.');
  }
  return value.trim();
}

export const taskLocationLabel = task =>
  typeof task?.location === 'string' && task.location.trim()
    ? task.location.trim() : 'Ubicación no declarada';

export const taskPath = taskId => `/home?taskId=${encodeURIComponent(taskId)}`;
export const taskUrl = taskId => `https://centro-operativo-cpsl.web.app${taskPath(taskId)}`;
export const escapeTaskHtml = value => String(value ?? '').replace(/[&<>"']/g,
  char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function taskReminderMessage(task, body) {
  return `${body}\nUbicación: ${taskLocationLabel(task)}\nAbrir tarea: ${taskPath(task.id)}`;
}
