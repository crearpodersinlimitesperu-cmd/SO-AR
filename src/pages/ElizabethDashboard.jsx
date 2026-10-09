import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarClock, CheckCircle2, Clock3, ListChecks, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChecklist } from '../context/ChecklistContext';
import { isElizabethEscobar } from '../config/permissions';
import { findUserByAnyEmail } from '../data/usersData';
import {
  getTaskAssigneeEmails,
  getTasksAssignedBy,
  getTaskTiming,
  getTeamMembers,
  getTeamTimingSummary,
  normalizeTaskEmail
} from '../utils/elizabethDashboard';
import './ElizabethDashboard.css';

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

export default function ElizabethDashboard() {
  const { currentUser } = useAuth();
  const { tasks = [], loading, taskLoadError } = useChecklist();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const assignedTasks = useMemo(
    () => getTasksAssignedBy(tasks, currentUser?.email),
    [tasks, currentUser?.email]
  );
  const teamMembers = useMemo(() => getTeamMembers(assignedTasks), [assignedTasks]);
  const summary = useMemo(() => getTeamTimingSummary(assignedTasks, now), [assignedTasks, now]);
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
            <button type="button" onClick={() => navigate('/cfo-dashboard')}>
              <ArrowRight size={18} aria-hidden="true" /> Panel financiero y liquidaciones
            </button>
            <button type="button" className="elizabeth-dashboard__secondary" onClick={() => navigate('/home-completo')}>
              Abrir Causa OS completo
            </button>
          </nav>
        </header>

        {taskLoadError && (
          <p className="elizabeth-dashboard__notice" role="status">
            No se pudo cargar toda la información de tareas. Algunos datos pueden faltar.
          </p>
        )}

        <section className="elizabeth-dashboard__section" aria-labelledby="elizabeth-timing-title">
          <div className="elizabeth-dashboard__section-heading">
            <div>
              <p className="elizabeth-dashboard__eyebrow">DE UN VISTAZO</p>
              <h2 id="elizabeth-timing-title">Los tiempos de tu equipo</h2>
            </div>
            <CalendarClock size={26} aria-hidden="true" />
          </div>
          <div className="elizabeth-dashboard__summary">
            <article className="elizabeth-summary-card elizabeth-summary-card--today">
              <span>Vencen hoy</span><strong>{summary.today}</strong>
            </article>
            <article className="elizabeth-summary-card elizabeth-summary-card--overdue">
              <span>Atrasadas</span><strong>{summary.overdue}</strong>
            </article>
            <article className="elizabeth-summary-card elizabeth-summary-card--ontime">
              <span>A tiempo</span><strong>{summary.onTime}</strong>
            </article>
            <article className="elizabeth-summary-card elizabeth-summary-card--completed">
              <span>Completadas</span><strong>{summary.completed}</strong>
            </article>
          </div>
          {summary.noDeadline > 0 && (
            <p className="elizabeth-dashboard__footnote">
              {numberLabel(summary.noDeadline, 'tarea')} sin fecha límite.
            </p>
          )}
        </section>

        <section className="elizabeth-dashboard__section" aria-labelledby="elizabeth-assigned-title">
          <div className="elizabeth-dashboard__section-heading">
            <div>
              <p className="elizabeth-dashboard__eyebrow">LO QUE TÚ ENCARGASTE</p>
              <h2 id="elizabeth-assigned-title">Tareas que asignaste</h2>
            </div>
            <ListChecks size={26} aria-hidden="true" />
          </div>
          {loading ? (
            <p className="elizabeth-dashboard__empty" role="status">Cargando tus tareas…</p>
          ) : assignedTasks.length === 0 ? (
            <p className="elizabeth-dashboard__empty">Todavía no aparecen tareas que hayas asignado.</p>
          ) : (
            <div className="elizabeth-dashboard__task-list">
              {assignedTasks.map(task => {
                const assignees = getTaskAssigneeEmails(task);
                const title = task.title || task.task || task.name || 'Tarea sin título';
                return (
                  <article className="elizabeth-task-card" key={task.id}>
                    <div className="elizabeth-task-card__main">
                      <h3>{title}</h3>
                      <p>{assignees.length
                        ? `Para: ${assignees.map(email => assigneeName(task, email)).join(', ')}`
                        : 'Sin una persona asignada registrada'}</p>
                    </div>
                    <TaskTiming task={task} now={now} />
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="elizabeth-dashboard__section" aria-labelledby="elizabeth-team-title">
          <div className="elizabeth-dashboard__section-heading">
            <div>
              <p className="elizabeth-dashboard__eyebrow">AVANCE POR PERSONA</p>
              <h2 id="elizabeth-team-title">Lo que tiene tu equipo</h2>
            </div>
            <Users size={26} aria-hidden="true" />
          </div>
          <p className="elizabeth-dashboard__helper">
            El equipo se forma con las personas que figuran como asignadas en las tareas que tú encargaste.
          </p>
          {teamMembers.length === 0 ? (
            <p className="elizabeth-dashboard__empty">Cuando asignes una tarea, aquí verás a quién se la encargaste y su avance.</p>
          ) : (
            <div className="elizabeth-dashboard__team-grid">
              {teamMembers.map(person => (
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
                  <ul>
                    {person.tasks.map((task, index) => (
                      <li key={`${task.id || task.task || 'task'}-${index}`}>
                        <span>{task.title || task.task || task.name || 'Tarea sin título'}</span>
                        <TaskTiming task={{ ...task, assignedToEmail: null, assigned_to: null, assignedToEmails: [person.email] }} now={now} />
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="elizabeth-dashboard__footer">
          <Clock3 size={17} aria-hidden="true" />
          <span>Las fechas se muestran con la información registrada en cada tarea.</span>
        </footer>
      </div>
    </main>
  );
}
