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

export function getNextCompletionState(updates) {
  if (typeof updates?.completed === 'boolean') return updates.completed;
  if (updates?.status === 'Completada') return true;
  return updates?.progressPercentage === 100 || updates?.progress === 100;
}

export function createCycleCompletion(current = {}, { cycle, completed, updatedAt, completionId } = {}) {
  return {
    ...current,
    completed: completed === true,
    status: completed === true ? 'Completada' : 'Pendiente',
    cycleId: cycle?.id || current.cycleId || '',
    cycleName: cycle?.name || current.cycleName || '',
    updatedAt,
    ...(completed === true ? { completedAt: updatedAt, completionId } : { completedAt: null })
  };
}
