import { isTaskVisibleForUser } from '../utils/taskPrivacy.js';

export async function resolveTaskLink(taskId, tasks, user, readTask) {
  if (!taskId || !user) throw new Error('No se pudo identificar la tarea o la sesión.');
  const cached = tasks.find(task => task.id === taskId);
  const task = cached || await readTask(taskId);
  if (!task || !isTaskVisibleForUser(task, user)) {
    throw new Error('Esta tarea ya no existe o no tienes acceso a ella.');
  }
  return task;
}
