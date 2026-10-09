import { Children, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarClock, CheckCircle2, Clock3, ListChecks, Users, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChecklist } from '../context/ChecklistContext';
import { isElizabethEscobar } from '../config/permissions';
import { findUserByAnyEmail } from '../data/usersData';
import TaskAssignmentModal from '../components/TaskAssignmentModal';
import {
  getTaskAssigneeEmails,
  getTasksAssignedBy,
  getTasksAssignedTo,
  getTaskReadState,
  getTaskTiming,
  getTeamMembers,
  getTeamTimingSummary,
  isTaskCompleteForAssignee,
  normalizeTaskEmail
} from '../utils/elizabethDashboard';
import './ElizabethDashboard.css';
import {
  canLearnPreferences, defaultPreferences, readPreferences, savePreferences, resetPreferences,
  recordPreference, orderSections, orderPeople, filterDashboardTasks, getReviewSuggestion
} from '../utils/elizabethPreferences';

const numberLabel = (count, singular, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;

function assigneeName(task, email) {
  const progress = Object.entries(task.assigneeProgress || {})
    .find(([key]) => normalizeTaskEmail(key) === email)?.[1];
  return progress?.name || findUserByAnyEmail(email)?.name || email;
}

function TaskTiming({ task, now }) {
  const timing = getTaskTiming(task, now);
  return <span className={`elizabeth-badge elizabeth-badge--${timing.key}`}>{timing.label}</span>;
}

function TaskList({ tasks, now, emptyLabel, assigneeEmail }) {
  if (tasks.length === 0) return <p className="elizabeth-dashboard__empty" role="status">{emptyLabel}</p>;
  return (
    <div className="elizabeth-dashboard__task-list">
      {tasks.map(task => {
        const assignees = getTaskAssigneeEmails(task);
        return (
          <article className="elizabeth-task-card" key={task.id}>
            <div className="elizabeth-task-card__main">
              <h3>{task.title || task.task || task.name || 'Tarea sin título'}</h3>
              <p>{assignees.length
                ? `Para: ${assignees.map(email => assigneeName(task, email)).join(', ')}`
                : 'Sin una persona asignada registrada'}</p>
            </div>
            <TaskTiming task={assigneeEmail
              ? { ...task, completed: isTaskCompleteForAssignee(task, assigneeEmail) }
              : task} now={now} />
          </article>
        );
      })}
    </div>
  );
}

function OrderedSections({ order, children }) {
  const sections = Children.toArray(children);
  return <div className="elizabeth-dashboard__sections">
    {order.map(section => sections.find(child => child.props['data-section'] === section))}
  </div>;
}

export default function ElizabethDashboard() {
  const { currentUser } = useAuth();
  const { tasks = [], loading, taskLoadError, taskReadRestricted } = useChecklist();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [preferenceError, setPreferenceError] = useState('');
  const [preferenceOwner, setPreferenceOwner] = useState(null);
  const [creationOpen, setCreationOpen] = useState(false);
  const [creationNotice, setCreationNotice] = useState('');
  const userKey = currentUser?.isSimulated ? null : currentUser?.uid;
  const activePreferences = preferenceOwner === userKey ? preferences : defaultPreferences();
  const canLearn = canLearnPreferences(currentUser) && preferenceOwner === userKey;

  useEffect(() => {
    setCreationOpen(false);
    setCreationNotice('');
  }, [currentUser?.uid, currentUser?.email, currentUser?.isSimulated]);

  useEffect(() => {
    setPreferenceError('');
    try {
      setPreferences(userKey
        ? readPreferences(window.localStorage, { uid: userKey })
        : defaultPreferences());
    } catch (error) {
      console.error('No se pudieron leer las preferencias del panel:', error);
      setPreferences(defaultPreferences());
      setPreferenceError('No se pudieron leer tus preferencias. Puedes restablecerlas para empezar de nuevo.');
    }
    setPreferenceOwner(userKey);
  }, [userKey, currentUser?.isSimulated]);

  const remember = (field, key) => {
    if (!canLearn) return;
    const next = recordPreference(activePreferences, field, key);
    setPreferences(next);
    try {
      savePreferences(window.localStorage, currentUser, next);
      setPreferenceError('');
    } catch (error) {
      console.error('No se pudieron guardar las preferencias del panel:', error);
      setPreferenceError('No se pudieron guardar tus preferencias en este navegador.');
    }
  };
  const restorePreferences = () => {
    if (!canLearn) return;
    try {
      resetPreferences(window.localStorage, currentUser);
      setPreferences(defaultPreferences());
      setPreferenceError('');
    } catch (error) {
      console.error('No se pudieron restablecer las preferencias del panel:', error);
      setPreferenceError('No se pudieron restablecer tus preferencias en este navegador.');
    }
  };
  const openSection = (section) => {
    remember('sections', section);
    window.requestAnimationFrame(() => {
      const heading = document.getElementById(`elizabeth-${section}-title`);
      heading?.scrollIntoView({ block: 'start' });
      heading?.focus({ preventScroll: true });
    });
  };

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const assignedTasks = useMemo(
    () => getTasksAssignedBy(tasks, currentUser?.email, currentUser?.name || currentUser?.displayName),
    [tasks, currentUser?.email, currentUser?.name, currentUser?.displayName]
  );
  const ownTasks = useMemo(() => getTasksAssignedTo(tasks, currentUser?.email), [tasks, currentUser?.email]);
  const readState = getTaskReadState({
    loading, taskLoadError, taskReadRestricted, isSimulated: currentUser?.isSimulated
  });
  const teamMembers = useMemo(() => getTeamMembers(assignedTasks), [assignedTasks]);
  const summary = useMemo(() => getTeamTimingSummary(assignedTasks, now), [assignedTasks, now]);
  const filter = activePreferences.filter;
  const visibleAssignedTasks = filterDashboardTasks(assignedTasks, filter, now);
  const visibleOwnTasks = filterDashboardTasks(ownTasks, filter, now, currentUser?.email);
  const sectionOrder = orderSections(activePreferences);
  const peopleOrder = orderPeople(teamMembers, activePreferences);
  const suggestion = readState.canShowTotals
    ? getReviewSuggestion(teamMembers, activePreferences, now) : null;
  const firstName = isElizabethEscobar(currentUser)
    ? 'Elizabeth'
    : (currentUser?.name || currentUser?.displayName || 'Elizabeth').trim().split(/\s+/)[0];

  return (
    <main className="elizabeth-dashboard">
      <div className="elizabeth-dashboard__content">
        <header className="elizabeth-dashboard__header">
          <div>
            <p className="elizabeth-dashboard__eyebrow">TU ESPACIO EN CAUSA OS</p>
            <h1>Hola, {firstName} <span aria-hidden="true">☀️</span></h1>
            <p className="elizabeth-dashboard__intro">Aquí puedes ver lo que encargaste y cómo avanza tu equipo.</p>
          </div>
          <nav className="elizabeth-dashboard__actions" aria-label="Tus otros espacios">
            <button type="button" className="elizabeth-dashboard__create" onClick={() => {
              if (currentUser?.isSimulated) {
                setCreationNotice('No se puede crear una tarea en simulación. Entra con tu cuenta real para asignarla.');
                return;
              }
              setCreationNotice('');
              setCreationOpen(true);
            }}>
              <Plus size={24} aria-hidden="true" /> Crear tarea
            </button>
            <button type="button" className="elizabeth-dashboard__secondary" onClick={() => navigate('/cfo-dashboard')}>
              <ArrowRight size={18} aria-hidden="true" /> Panel financiero y liquidaciones
            </button>
            <button type="button" className="elizabeth-dashboard__secondary" onClick={() => navigate('/home-completo')}>
              Abrir Causa OS completo
            </button>
          </nav>
        </header>

        {creationNotice && <p className="elizabeth-dashboard__notice" role="status">{creationNotice}</p>}
        {creationOpen && !currentUser?.isSimulated && (
          <TaskAssignmentModal
            key={userKey}
            isOpen
            simple
            teamMembers={teamMembers}
            onClose={() => setCreationOpen(false)}
          />
        )}
        {readState.notice && (
          <p className="elizabeth-dashboard__notice" role="status">
            {readState.notice}
          </p>
        )}
        <div className="elizabeth-dashboard__preferences">
          <p>{currentUser?.isSimulated
            ? 'En simulación no se aprenden ni se guardan preferencias.'
            : 'Este panel recuerda lo que abres y el último filtro, solo en este navegador y para tu cuenta. No usa IA ni comparte tus hábitos.'}</p>
          {suggestion && <p role="status">
            Sueles revisar a <strong>{suggestion.name}</strong>; {suggestion.dueSoon > 0
              ? `tiene ${numberLabel(suggestion.dueSoon, 'tarea')} por vencer hoy o mañana.`
              : 'no tiene tareas por vencer hoy o mañana.'}
          </p>}
          <button type="button" onClick={restorePreferences} disabled={!canLearn}>Restablecer mis preferencias</button>
          {preferenceError && <p className="elizabeth-dashboard__notice" role="alert">{preferenceError}</p>}
        </div>
        <nav className="elizabeth-dashboard__quick-links" aria-label="Ir a una sección">
          {sectionOrder.map(section => (
            <button type="button" key={section} onClick={() => openSection(section)}>
              {{ timing: 'Los tiempos', assigned: 'Lo que encargué', own: 'Mis tareas', team: 'Mi equipo' }[section]}
            </button>
          ))}
        </nav>
        <label className="elizabeth-dashboard__filter">
          Mostrar tareas
          <select value={filter} onChange={event => {
            if (canLearn) remember('filter', event.target.value);
            else setPreferences(previous => ({ ...previous, filter: event.target.value }));
          }}>
            <option value="all">Todas</option>
            <option value="pending">Pendientes</option>
            <option value="today">Vencen hoy</option>
            <option value="overdue">Atrasadas</option>
            <option value="completed">Completadas</option>
          </select>
        </label>

        <OrderedSections order={sectionOrder}>
        <section className="elizabeth-dashboard__section" data-section="timing" aria-labelledby="elizabeth-timing-title">
          <div className="elizabeth-dashboard__section-heading">
            <div>
              <p className="elizabeth-dashboard__eyebrow">DE UN VISTAZO</p>
              <h2 id="elizabeth-timing-title" tabIndex={-1}>Los tiempos de tu equipo</h2>
            </div>
            <CalendarClock size={26} aria-hidden="true" />
          </div>
          <div className="elizabeth-dashboard__summary">
            <article className="elizabeth-summary-card elizabeth-summary-card--today">
              <span>Vencen hoy</span><strong>{readState.canShowTotals ? summary.today : '—'}</strong>
            </article>
            <article className="elizabeth-summary-card elizabeth-summary-card--overdue">
              <span>Atrasadas</span><strong>{readState.canShowTotals ? summary.overdue : '—'}</strong>
            </article>
            <article className="elizabeth-summary-card elizabeth-summary-card--ontime">
              <span>A tiempo</span><strong>{readState.canShowTotals ? summary.onTime : '—'}</strong>
            </article>
            <article className="elizabeth-summary-card elizabeth-summary-card--completed">
              <span>Completadas</span><strong>{readState.canShowTotals ? summary.completed : '—'}</strong>
            </article>
          </div>
          {readState.canShowTotals && summary.noDeadline > 0 && (
            <p className="elizabeth-dashboard__footnote">
              {numberLabel(summary.noDeadline, 'tarea')} sin fecha límite.
            </p>
          )}
        </section>

        <section className="elizabeth-dashboard__section" data-section="assigned" aria-labelledby="elizabeth-assigned-title">
          <div className="elizabeth-dashboard__section-heading">
            <div>
              <p className="elizabeth-dashboard__eyebrow">LO QUE TÚ ENCARGASTE</p>
              <h2 id="elizabeth-assigned-title" tabIndex={-1}>Tareas que asignaste</h2>
            </div>
            <ListChecks size={26} aria-hidden="true" />
          </div>
          <TaskList tasks={visibleAssignedTasks} now={now} emptyLabel={readState.emptyLabel || (assignedTasks.length ? 'No hay tareas con este filtro.' : 'No hay tareas que hayas asignado.')} />
        </section>

        <section className="elizabeth-dashboard__section" data-section="own" aria-labelledby="elizabeth-own-title">
          <div className="elizabeth-dashboard__section-heading">
            <div>
              <p className="elizabeth-dashboard__eyebrow">LO QUE TE ENCARGARON</p>
              <h2 id="elizabeth-own-title" tabIndex={-1}>Tus propias tareas</h2>
            </div>
            <ListChecks size={26} aria-hidden="true" />
          </div>
          <TaskList tasks={visibleOwnTasks} now={now} assigneeEmail={currentUser?.email} emptyLabel={readState.emptyLabel || (ownTasks.length ? 'No hay tareas con este filtro.' : 'No hay tareas asignadas a ti.')} />
        </section>

        <section className="elizabeth-dashboard__section" data-section="team" aria-labelledby="elizabeth-team-title">
          <div className="elizabeth-dashboard__section-heading">
            <div>
              <p className="elizabeth-dashboard__eyebrow">AVANCE POR PERSONA</p>
              <h2 id="elizabeth-team-title" tabIndex={-1}>Lo que tiene tu equipo</h2>
            </div>
            <Users size={26} aria-hidden="true" />
          </div>
          <p className="elizabeth-dashboard__helper">
            El equipo se forma con las personas que figuran como asignadas en las tareas que tú encargaste.
          </p>
          {teamMembers.length === 0 ? (
            <p className="elizabeth-dashboard__empty" role="status">
              {readState.emptyLabel || 'No hay personas asignadas en las tareas que encargaste.'}
            </p>
          ) : (
            <div className="elizabeth-dashboard__team-grid">
              {peopleOrder.map(person => (
                <article className="elizabeth-person-card" key={person.email}>
                  <div className="elizabeth-person-card__heading">
                    <span className="elizabeth-person-card__avatar" aria-hidden="true">
                      {(person.name || findUserByAnyEmail(person.email)?.name || person.email).charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <h3>{person.name || findUserByAnyEmail(person.email)?.name || person.email}</h3>
                      <p>{numberLabel(person.completedCount, 'completada')} de {person.taskCount}</p>
                    </div>
                    <CheckCircle2 size={20} aria-hidden="true" />
                  </div>
                  {(activePreferences.people[person.email] || 0) >= 2 &&
                    <p className="elizabeth-dashboard__followed">Una de las personas que más revisas</p>}
                  <details onToggle={event => {
                    if (event.currentTarget.open) remember('people', person.email);
                  }}>
                  <summary>Ver sus {numberLabel(person.taskCount, 'tarea')}</summary>
                  <ul>
                    {filterDashboardTasks(person.tasks, filter, now, person.email).map((task, index) => (
                      <li key={`${task.id || task.task || 'task'}-${index}`}>
                        <span>{task.title || task.task || task.name || 'Tarea sin título'}</span>
                        <TaskTiming task={{ ...task, assignedToEmail: null, assigned_to: null, assignedToEmails: [person.email] }} now={now} />
                      </li>
                    ))}
                  </ul>
                  {filterDashboardTasks(person.tasks, filter, now, person.email).length === 0 &&
                    <p className="elizabeth-dashboard__empty">No hay tareas con este filtro.</p>}
                  </details>
                </article>
              ))}
            </div>
          )}
        </section>
        </OrderedSections>

        <footer className="elizabeth-dashboard__footer">
          <Clock3 size={17} aria-hidden="true" />
          <span>Las fechas se muestran con la información registrada en cada tarea.</span>
        </footer>
      </div>
    </main>
  );
}
