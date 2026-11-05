import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDown, ArrowUpRight, Check, Printer, RotateCcw, ShieldCheck } from 'lucide-react';
import { phases, preparation, reference } from './content.js';
import { decodeProgress, STORAGE_KEY } from './progress.js';
import './style.css';

const allowedIds = preparation.map(item => item.id);
const phaseFromHash = () => {
  const hash = window.location.hash.slice(1);
  return phases.some(phase => phase.id === hash) ? hash : 'todo';
};

function readSavedProgress() {
  try {
    return { completed: decodeProgress(localStorage.getItem(STORAGE_KEY), allowedIds), error: '' };
  } catch {
    return { completed: [], error: 'No pudimos leer la preparación guardada. Puedes usar la lista en esta sesión; “Borrar marcas” permite intentar restablecerla.' };
  }
}

export function Guide() {
  const [phaseId, setPhaseId] = useState(phaseFromHash);
  const [progress, setProgress] = useState(readSavedProgress);
  const [resetPending, setResetPending] = useState(false);
  const [message, setMessage] = useState('');
  const [openReferences, setOpenReferences] = useState([]);

  useEffect(() => {
    const update = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'todo' || phases.some(phase => phase.id === hash)) setPhaseId(hash);
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  useEffect(() => {
    if (window.location.hash === `#${phaseId}`) {
      document.getElementById(phaseId)?.scrollIntoView();
    }
  }, [phaseId]);

  function save(completed) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
      setProgress({ completed, error: '' });
      setMessage('Preparación guardada en este navegador.');
    } catch {
      setProgress({ completed, error: 'No se pudo guardar en este navegador. Las marcas funcionan en esta sesión, pero podrían perderse al cerrar. Revisa los permisos de almacenamiento.' });
      setMessage('');
    }
  }

  function toggle(id) {
    save(progress.completed.includes(id)
      ? progress.completed.filter(item => item !== id)
      : [...progress.completed, id]);
  }

  const count = progress.completed.length;
  const currentPhase = phases.find(phase => phase.id === phaseId);

  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <div id="todo" className="preview-notice"><ShieldCheck size={16} aria-hidden="true" /> Prototipo local · Solo para revisión · No publicado en crearpsl.net</div>
      <header className="brand-bar">
        <a className="brand" href="#todo" aria-label="CREAR, ver agenda completa">CREAR<span>Programa de Resultados</span></a>
        <span className="guide-label">Guía del Partner</span>
        <button className="print-button" onClick={() => window.print()}><Printer size={17} aria-hidden="true" /><span>Imprimir guía</span></button>
      </header>

      <div className="page-shell">
        <aside className="wayfinding" aria-label="Índice de la guía">
          <nav aria-label="Cronograma por fase">
            <p className="nav-title">Tu recorrido</p>
            <a className="all-phases" href="#todo" aria-current={phaseId === 'todo' ? 'location' : undefined}>Agenda completa <ArrowUpRight size={16} aria-hidden="true" /></a>
            {phases.map((phase, index) => (
              <a key={phase.id} href={`#${phase.id}`} aria-current={phaseId === phase.id ? 'location' : undefined} className="phase-link">
                <span className="phase-index">{index + 1}</span><span>{phase.short}<small>{phase.period}</small></span>
              </a>
            ))}
          </nav>
          <nav className="secondary-nav" aria-label="Recursos de preparación">
            <a href="#preparacion">Mi preparación <span>{count}/{preparation.length}</span></a>
            <a href="#consulta">Consulta rápida <ArrowDown size={15} aria-hidden="true" /></a>
            <a href="#criterios">Fuente y cuidados</a>
          </nav>
          <p className="sidebar-note">Sin fechas inventadas.<br />Sin datos personales.<br />A tu ritmo.</p>
        </aside>

        <main id="contenido" tabIndex="-1">
          <section className="opening" aria-labelledby="page-title">
            <div className="opening-copy">
              <h1 id="page-title">Aliados de<br /><span>Capítulo Dos.</span></h1>
              <p>Claridad para acompañar.<br />Una guía para estar en tiempo y forma, desde el puente de C1 hasta Socios de Vida.</p>
              <a className="primary-link" href="#agenda">Consultar el cronograma <ArrowDown size={19} aria-hidden="true" /></a>
            </div>
            <div className="chapter-mark" aria-hidden="true"><span>C</span><span>2</span><div className="chapter-line" /></div>
            <div className="route-strip" aria-label="Secuencia de fases">
              {phases.map((phase, i) => <a key={phase.id} href={`#${phase.id}`}><span>Fase {i + 1}</span>{phase.short}<ArrowUpRight size={16} aria-hidden="true" /></a>)}
            </div>
          </section>

          <div className="working-spread">
            <section id="agenda" className="agenda" aria-labelledby="agenda-title">
              <div className="section-heading"><h2 id="agenda-title">El cronograma</h2><span>Consulta por fase</span></div>
              <p className="schedule-note">Horarios del adjunto, sin fechas de calendario. El grounding virtual indica hora local; confirma con el equipo la fecha, sede y zona horaria aplicables al resto de actividades.</p>
              <p className="filter-status" aria-live="polite">{currentPhase ? `Mostrando: ${currentPhase.short}.` : 'Mostrando las cuatro fases.'} {currentPhase && <a href="#todo">Ver agenda completa</a>}</p>
              {phases.map((phase, index) => (
                <section key={phase.id} id={phase.id} className={`schedule-phase ${phaseId !== 'todo' && phaseId !== phase.id ? 'phase-hidden' : ''}`} aria-labelledby={`${phase.id}-title`}>
                  <div className="phase-heading"><span className="phase-number">{index + 1}</span><div><h3 id={`${phase.id}-title`}>{phase.title}</h3><p>{phase.period}</p></div></div>
                  <p className="phase-description">{phase.description}</p>
                  <ol className="events">
                    {phase.events.map(([day, time, title, detail], eventIndex) => (
                      <li key={`${phase.id}-${eventIndex}`}>
                        <div className="event-time"><span>{time}</span><small>{day}</small></div>
                        <div className="event-body"><h4>{title}</h4><p>{detail}</p></div>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </section>

            <aside id="preparacion" className="preparation" aria-labelledby="preparation-title">
              <h2 id="preparation-title">Mi preparación</h2>
              <p>Convierte la guía en acuerdos concretos. Marca lo que ya revisaste.</p>
              <div className="progress-label"><strong>{count} de {preparation.length}</strong><span>{count === preparation.length ? 'Todo revisado' : 'revisado'}</span></div>
              <progress value={count} max={preparation.length} aria-label="Preparación revisada" />
              <p className="local-note">Solo en este navegador. Marcar no envía evidencias ni acredita cumplimiento.</p>
              {progress.error && <p role="alert" className="storage-error">{progress.error}</p>}
              <p role="status" className="save-status">{message}</p>
              <ul className="checklist">
                {preparation.map(item => <li key={item.id}><label><input type="checkbox" checked={progress.completed.includes(item.id)} onChange={() => toggle(item.id)} /><span><strong>{item.title}</strong><small>{item.detail}</small></span></label></li>)}
              </ul>
              {!resetPending ? <button className="reset-button" onClick={() => setResetPending(true)}><RotateCcw size={15} aria-hidden="true" />Borrar marcas</button> :
                <div className="reset-confirm"><p>¿Borrar todas las marcas de preparación?</p><button onClick={() => { save([]); setResetPending(false); }}>Sí, borrar marcas</button><button onClick={() => setResetPending(false)}>Conservar marcas</button></div>}
              <div className="complete-message" hidden={count !== preparation.length}><Check size={18} aria-hidden="true" />Lista revisada. Confirma los acuerdos con tu equipo.</div>
            </aside>
          </div>

          <section id="consulta" className="quick-reference" aria-labelledby="reference-title">
            <div className="section-heading"><h2 id="reference-title">Consulta rápida</h2><span>Rol · Conversación · Cuidado</span></div>
            <p>Lo esencial para volver a la guía, sin perder de vista a la persona.</p>
            {reference.map((item, index) => <details key={item.title} open={openReferences.includes(index)} onToggle={event => {
              const isOpen = event.currentTarget.open;
              setOpenReferences(items => isOpen ? [...new Set([...items, index])] : items.filter(itemIndex => itemIndex !== index));
            }}>
              <summary>{item.title}<span className="details-sign" aria-hidden="true">+</span></summary>
              <div className="reference-body">{item.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<div className="care-note"><strong>Nota editorial de cuidado</strong><p>{item.care}</p></div></div>
            </details>)}
          </section>

          <footer id="criterios">
            <h2>Una guía para consultar,<br />no para presionar.</h2>
            <p>Basada en “Guía Práctica Operativa: Aliado de Capítulo Dos (C2)”, adjunto de 115 líneas. Se reorganizan fases, horarios y misiones; se normaliza la numeración y se sintetiza la redacción para facilitar la consulta.</p>
            <p>Las notas editoriales de cuidado no son citas ni cambios a las políticas del programa. Los pasajes de presión se presentan con límites de consentimiento y seguridad, no como técnicas de manipulación. No se atribuye evidencia neurocientífica a este contenido.</p>
            <div className="footer-line"><span>CREAR · Aliados C2</span><a href="#todo">Volver a la agenda <ArrowUpRight size={16} aria-hidden="true" /></a></div>
          </footer>
        </main>
      </div>
    </>
  );
}

createRoot(document.getElementById('root')).render(<Guide />);
