import { getTaskTiming, isTaskCompleteForAssignee } from './elizabethDashboard.js';

export const DASHBOARD_SECTIONS = ['timing', 'assigned', 'own', 'team'];
export const DASHBOARD_FILTERS = ['all', 'pending', 'today', 'overdue', 'completed'];
export const defaultPreferences = () => ({ version: 1, filter: 'all', sections: {}, people: {} });
export const canLearnPreferences = (user) => Boolean(user?.uid && !user.isSimulated);
export const preferenceKey = (user) => `causa:elizabeth-preferences:v1:${user.uid}`;

export const parsePreferences = (value) => {
  if (!value || value.version !== 1 || !DASHBOARD_FILTERS.includes(value.filter)) {
    throw new Error('Formato de preferencias no válido');
  }
  for (const field of ['sections', 'people']) {
    if (!value[field] || typeof value[field] !== 'object' || Array.isArray(value[field])) {
      throw new Error('Historial de preferencias no válido');
    }
    for (const [key, count] of Object.entries(value[field])) {
      if (!Number.isSafeInteger(count) || count < 0 || count > 1_000_000 ||
          (field === 'sections' && !DASHBOARD_SECTIONS.includes(key))) {
        throw new Error('Contador de preferencias no válido');
      }
    }
  }
  return { version: 1, filter: value.filter, sections: { ...value.sections }, people: { ...value.people } };
};

export const readPreferences = (storage, user) => {
  if (!canLearnPreferences(user)) return defaultPreferences();
  const raw = storage.getItem(preferenceKey(user));
  return raw ? parsePreferences(JSON.parse(raw)) : defaultPreferences();
};

export const savePreferences = (storage, user, preferences) => {
  if (!canLearnPreferences(user)) return false;
  storage.setItem(preferenceKey(user), JSON.stringify(parsePreferences(preferences)));
  return true;
};

export const resetPreferences = (storage, user) => {
  if (!canLearnPreferences(user)) return false;
  storage.removeItem(preferenceKey(user));
  return true;
};

export const recordPreference = (preferences, field, key) => {
  if (field === 'filter') {
    if (!DASHBOARD_FILTERS.includes(key)) throw new Error('Filtro no válido');
    return { ...preferences, filter: key };
  }
  if (!['sections', 'people'].includes(field) ||
      (field === 'sections' && !DASHBOARD_SECTIONS.includes(key)) || !key) {
    throw new Error('Acción de preferencias no válida');
  }
  return { ...preferences, [field]: {
    ...preferences[field],
    [key]: Math.min(1_000_000, (preferences[field][key] || 0) + 1)
  } };
};

export const orderSections = (preferences) => [...DASHBOARD_SECTIONS]
  .sort((a, b) => (preferences.sections[b] || 0) - (preferences.sections[a] || 0));

export const orderPeople = (people, preferences) => [...people]
  .sort((a, b) => (preferences.people[b.email] || 0) - (preferences.people[a.email] || 0));

export const filterDashboardTasks = (tasks, filter, now, assigneeEmail) => {
  if (!DASHBOARD_FILTERS.includes(filter)) throw new Error('Filtro no válido');
  return tasks.filter(task => {
    const timing = getTaskTiming(assigneeEmail
      ? { ...task, completed: isTaskCompleteForAssignee(task, assigneeEmail) }
      : task, now);
    if (filter === 'all') return true;
    if (filter === 'pending') return timing.key !== 'completed';
    return timing.key === filter;
  });
};

export const getReviewSuggestion = (people, preferences, now) => {
  const person = orderPeople(people, preferences).find(member => (preferences.people[member.email] || 0) >= 2);
  if (!person) return null;
  const dueSoon = person.tasks.filter(task => {
    const timing = getTaskTiming({ ...task, completed: isTaskCompleteForAssignee(task, person.email) }, now);
    return timing.key === 'today' || timing.key === 'tomorrow';
  }).length;
  return { email: person.email, name: person.name || person.email, dueSoon };
};
