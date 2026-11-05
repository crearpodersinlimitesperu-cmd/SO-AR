import React, { useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { localFirebase } from './firebase.js';
import { createSession } from './session.js';
import './style.css';

export function Login({ session, disabled }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return <form onSubmit={event => {
    event.preventDefault();
    session.login(email, password);
    setPassword('');
  }}>
    <h2>Entrar al entorno de prueba</h2>
    <p>Solo cuentas sintéticas del emulador. No introduzcas credenciales reales. El correo verificado requiere además una invitación/aprobación exacta para este UID y correo.</p>
    <label htmlFor="email">Correo de prueba</label>
    <input id="email" type="email" autoComplete="off" required value={email} onChange={event => setEmail(event.target.value)} disabled={disabled} />
    <label htmlFor="password">Contraseña de prueba</label>
    <input id="password" type="password" autoComplete="off" required value={password} onChange={event => setPassword(event.target.value)} disabled={disabled} />
    <button type="submit" disabled={disabled}>Entrar / cambiar de cuenta</button>
  </form>;
}

export function PrivateGuide({ session, state }) {
  const { guide, record, busy } = state;
  const [resetPending, setResetPending] = useState(false);
  const completed = record?.completed ?? [];
  return <div data-private className="private-spread">
    <section aria-labelledby="guide-title">
      <h2 id="guide-title">{guide.title}</h2>
      <p>{guide.notice}</p>
      <nav aria-label="Fases">
        {[{ id: 'todo', title: 'Todas las fases' }, ...guide.phases].map(phase =>
          <button key={phase.id} aria-pressed={state.phase === phase.id} disabled={busy}
            onClick={() => session.perform({ kind: 'phase', target: phase.id })}>{phase.title}</button>)}
      </nav>
      {guide.phases.filter(phase => state.phase === 'todo' || state.phase === phase.id).map(phase =>
        <section key={phase.id} className="phase"><h3>{phase.title}</h3><p>{phase.body}</p></section>)}
      <h3>Consulta del servidor</h3>
      <nav aria-label="Consulta">
        {guide.references.map(item => <button key={item.id} disabled={busy}
          aria-pressed={state.reference === item.id}
          onClick={() => session.perform({ kind: 'reference', target: item.id })}>{item.title}</button>)}
      </nav>
      {guide.references.filter(item => item.id === state.reference).map(item => <p key={item.id}>{item.body}</p>)}
    </section>
    <aside aria-labelledby="preparation-title">
      <h2 id="preparation-title">Mi preparación</h2>
      <p>UID <strong data-uid>{state.uid}</strong> · {completed.length}/{guide.preparation.length} marcas · revisión <span data-revision>{record?.revision ?? 0}</span></p>
      <p>Los cambios se muestran confirmados solo después de la respuesta del servidor. Cada acción escribe estado e historial de forma atómica.</p>
      <div className="checklist">
        {guide.preparation.map(item => <label key={item.id}>
          <input type="checkbox" data-item={item.id} checked={completed.includes(item.id)} disabled={busy}
            onChange={event => session.perform({ kind: event.target.checked ? 'check' : 'uncheck', target: item.id })} />
          <span>{item.label}</span>
        </label>)}
      </div>
      {!resetPending ? <button disabled={busy || completed.length === 0} onClick={() => setResetPending(true)}>Borrar mi preparación</button>
        : <div className="reset-confirmation"><p>¿Borrar tus marcas? El historial no se borra.</p>
          <button disabled={busy} onClick={() => {
            setResetPending(false);
            session.perform({ kind: 'reset', target: 'preparation' });
          }}>Confirmar borrado</button>
          <button disabled={busy} onClick={() => setResetPending(false)}>Cancelar</button>
        </div>}
      <h3>Historial de esta cuenta</h3>
      {state.events.length === 0 ? <p>Sin eventos guardados.</p> : <ol className="history">
        {state.events.map(event => <li key={event.id}>
          Revisión {event.revision} · {event.kind} / {event.target}
          <small>{event.createdAt?.toDate ? event.createdAt.toDate().toLocaleString('es') : 'Hora de servidor no disponible'}</small>
        </li>)}
      </ol>}
    </aside>
  </div>;
}

export function App({ session }) {
  const state = useSyncExternalStore(session.subscribe, session.snapshot);
  const pending = ['signing-in', 'signing-out', 'checking', 'loading'].includes(state.status);
  return <>
    <a className="skip-link" href="#content">Saltar al contenido</a>
    <header><strong>CREAR · C2</strong><span>LOCAL · Auth + Firestore demo · Sin publicación</span></header>
    <main id="content">
      <h1>Acceso privado local</h1>
      <p className="notice">Demostración aislada. La guía operativa real no está incluida ni subida. Esta interfaz no habilita un servicio privado de producción.</p>
      <div className="session-bar">
        <p data-session>{state.email ? `Cuenta: ${state.email}` : 'Sin sesión activa'}</p>
        {state.uid && <button onClick={() => session.logout()} disabled={['signing-in', 'signing-out'].includes(state.status)}>Cerrar sesión</button>}
      </div>
      <p role={['error', 'denied', 'unverified'].includes(state.status) ? 'alert' : 'status'} data-status={state.status}>
        {state.message || ({
          'signed-out': 'Inicia sesión para comprobar la autoridad. No hay contenido privado en esta entrada.',
          'signing-in': 'Autenticando en el emulador local…',
          'signing-out': 'Cerrando sesión; datos privados retirados.',
          checking: 'Comprobando correo e invitación/aprobación en el servidor local…',
          loading: 'Autoridad válida. Cargando la guía y el registro desde el emulador…',
          ready: 'Autoridad válida y datos confirmados por el servidor local.',
        }[state.status])}
      </p>
      {state.status === 'ready' && state.guide
        ? <PrivateGuide key={state.uid} session={session} state={state} />
        : <Login session={session} disabled={pending} />}
      {state.status === 'ready' && <details className="account-switch"><summary>Cambiar de cuenta</summary>
        <Login session={session} disabled={false} /></details>}
      <footer><h2>Privacidad y límites</h2>
        <p>Sesión y caché solo en memoria, sin migrar marcas del prototipo. Salir, cambiar cuenta o perder aprobación retira contenido y callbacks privados. Ningún guardado fallido se anuncia como éxito. Las capturas o copias ya hechas no pueden revocarse.</p>
        <p>Para un servicio real faltan Authentication autorizado, administrador real verificado, aprobación legal y control de DNS. Las reglas de despliegue siguen cerradas. No se habilitan servicios ni cuentas reales desde aquí.</p>
      </footer>
    </main>
  </>;
}

const root = createRoot(document.getElementById('root'));
try {
  const session = createSession(localFirebase());
  root.render(<App session={session} />);
  window.addEventListener('pagehide', () => session.dispose(), { once: true });
  if (import.meta.hot) import.meta.hot.dispose(() => session.dispose());
} catch (error) {
  root.render(<main><h1>Entorno bloqueado</h1><p role="alert">{error.message}</p></main>);
}
