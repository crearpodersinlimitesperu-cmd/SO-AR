export function resolveTaskCycleScope(task, { catalogTask = false, sede, cycle } = {}) {
  const hasDirectAssignees = Boolean(task?.assignedToEmail) ||
    (Array.isArray(task?.assignedToEmails) && task.assignedToEmails.length > 0);
  if (!catalogTask || task?.isCustom || hasDirectAssignees) return null;
  if (!sede?.trim() || typeof cycle?.id !== 'string' || !cycle.id.trim()) {
    throw new Error('Espera a que cargue el ciclo de la tarea antes de guardar los avances.');
  }
  return { sede, cycle };
}

export function getEffectiveCompletion(task, { sede, cycleId, cycleScoped = false } = {}) {
  if (cycleScoped) {
    const cycleCompletion = cycleId && sede
      ? task?.completions?.[`${sede}__${cycleId}`]
      : null;
    const completed = cycleCompletion?.completed === true;
    return {
      completed,
      status: completed ? 'Completada' : 'Pendiente',
      completion: cycleCompletion || null
    };
  }

  const sedeCompletion = sede ? task?.completions?.[sede] : null;
  if (sedeCompletion?.completed !== undefined) {
    const completed = sedeCompletion.completed === true;
    return {
      completed,
      status: sedeCompletion.status || (completed ? 'Completada' : 'Pendiente'),
      completion: sedeCompletion
    };
  }

  const completed = task?.completed === true || task?.status === 'Completada';
  return {
    completed,
    status: task?.status || (completed ? 'Completada' : 'Pendiente'),
    completion: null
  };
}

export function isCompletionTransition(previousCompleted, nextCompleted) {
  return previousCompleted !== true && nextCompleted === true;
}

export function getTaskProgress(task) {
  if (typeof task?.progressPercentage === 'number') return task.progressPercentage;
  if (typeof task?.progress === 'number') return task.progress;
  return task?.completed === true || task?.status === 'Completada' ? 100 : 0;
}

export function applyCycleCompletion(task, { sede, cycleId } = {}) {
  const effective = getEffectiveCompletion(task, { sede, cycleId, cycleScoped: true });
  const entry = effective.completion;
  // Older entries stored progress only at the root. Recover it only when
  // there is a single cycle entry, so it cannot leak from another cycle.
  const legacyProgress = entry && Object.keys(task.completions || {}).filter(key => key.includes('__')).length === 1
    ? task : null;
  const progressPercentage = effective.completed ? 100 : entry
    ? getTaskProgress({
        progressPercentage: entry.progressPercentage ?? entry.progress ?? legacyProgress?.progressPercentage ?? legacyProgress?.progress,
        completed: effective.completed
      })
    : 0;
  return {
    ...task,
    completed: effective.completed,
    status: effective.completed ? 'Completada' : (progressPercentage > 0 ? 'En progreso' : effective.status),
    progressPercentage,
    progress: progressPercentage,
    completedAt: entry?.completedAt || null
  };
}

export function getNextCompletionState(updates) {
  if (typeof updates?.completed === 'boolean') return updates.completed;
  if (updates?.status === 'Completada') return true;
  return updates?.progressPercentage === 100 || updates?.progress === 100;
}

export function createCycleCompletion(current = {}, { cycle, completed, updatedAt, completionId, updates = {} } = {}) {
  const progress = typeof updates.progressPercentage === 'number'
    ? updates.progressPercentage
    : (typeof updates.progress === 'number' ? updates.progress : (completed ? 100 : 0));
  return {
    ...current,
    completed: completed === true,
    status: completed === true ? 'Completada' : (progress > 0 ? 'En progreso' : 'Pendiente'),
    progressPercentage: progress,
    progress,
    cycleId: cycle?.id || current.cycleId || '',
    cycleName: cycle?.name || current.cycleName || '',
    updatedAt,
    ...(completed === true ? { completedAt: current.completedAt || updatedAt, completionId } : { completedAt: null })
  };
}
