import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDown, ArrowUpRight, Check, Printer, RotateCcw, ShieldCheck } from 'lucide-react';
import { phases, preparation, reference } from './content.js';
import crearLogo from './logo-crear.png';
import './style.css';

const phaseFromHash = () => {
  const hash = window.location.hash.slice(1);
  return phases.some(phase => phase.id === hash) ? hash : 'todo';
};

export function Guide() {
  const [phaseId, setPhaseId] = useState(phaseFromHash);
  const [completed, setCompleted] = useState([]);
  const [resetPending, setResetPending] = useState(false);
  const [message, setMessage] = useState('');
  const [openReferences, setOpenReferences] = useState([]);
  const [logoError, setLogoError] = useState(false);

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

  function toggle(id) {
    setCompleted(items => items.includes(id) ? items.filter(item => item !== id) : [...items, id]);
    setMessage('Marca de prueba actualizada. No se ha guardado un registro personal.');
  }

  const count = completed.length;
  const currentPhase = phases.find(phase => phase.id === phaseId);

  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <div id="todo" className="preview-notice"><ShieldCheck size={16} aria-hidden="true" /> Guía de Aliados C2 · Revisión local · Sin publicación ni cuentas personales</div>
      <header className="brand-bar">
        <a className="brand" href="#todo" aria-label="CREAR Poder sin límites, ver agenda completa">
          <img src={crearLogo} alt="CREAR · Poder sin límites" width="270" height="360" onError={() => setLogoError(true)} hidden={logoError} />
          {logoError && <span role="alert">CREAR · No se pudo cargar el logo. Recarga la página.</span>}
        </a>
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
            <a href="#privacidad">Privacidad y derechos</a>
          </nav>
          <p className="sidebar-note">Sin fechas inventadas.<br />Sin registros personales.<br />A tu ritmo.</p>
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

          <section className="service-status" aria-labelledby="service-status-title">
            <h2 id="service-status-title">Tu registro personal aún no está habilitado</h2>
            <p>Esta revisión local no tiene inicio de sesión, historial individual ni sincronización entre dispositivos. Las casillas son una demostración: se borran al recargar o cerrar esta página. No se importan las marcas compartidas del prototipo anterior.</p>
            <a href="#privacidad">Consultar cómo se protegen los datos en esta versión <ArrowDown size={16} aria-hidden="true" /></a>
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
              <p>Revisa estos acuerdos. Puedes probar las casillas; no acreditan cumplimiento ni envían evidencias.</p>
              <div className="progress-label"><strong>{count} de {preparation.length}</strong><span>{count === preparation.length ? 'Todo revisado' : 'revisado'}</span></div>
              <progress value={count} max={preparation.length} aria-label="Preparación revisada" />
              <p className="local-note">Modo de demostración. Sin guardado: las marcas se pierden al recargar. No es tu registro personal.</p>
              <p role="status" className="save-status">{message}</p>
              <ul className="checklist">
                {preparation.map(item => <li key={item.id}><label><input type="checkbox" checked={completed.includes(item.id)} onChange={() => toggle(item.id)} aria-describedby="preparation-mode" /><span><strong>{item.title}</strong><small>{item.detail}</small></span></label></li>)}
              </ul>
              <p id="preparation-mode" className="local-note">Estas casillas son pruebas temporales, no registros guardados.</p>
              {!resetPending ? <button className="reset-button" onClick={() => setResetPending(true)}><RotateCcw size={15} aria-hidden="true" />Borrar marcas</button> :
                <div className="reset-confirm"><p>¿Borrar todas las marcas de esta demostración?</p><button onClick={() => { setCompleted([]); setMessage('Marcas de prueba borradas. No se modificó ningún registro personal.'); setResetPending(false); }}>Sí, borrar marcas</button><button onClick={() => setResetPending(false)}>Conservar marcas</button></div>}
              <div className="complete-message" hidden={count !== preparation.length}><Check size={18} aria-hidden="true" />Demostración revisada. No se ha guardado un registro personal.</div>
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

          <section id="privacidad" className="privacy-section" aria-labelledby="privacy-title">
            <div className="section-heading"><h2 id="privacy-title">Privacidad y derechos</h2><span>Versión local · 1.1</span></div>
            <h3>Protección de datos en esta versión</h3>
            <p>No se solicitan nombres, correos, contraseñas, documentos, pagos ni información de participantes. No hay cuentas, analítica, cookies de seguimiento ni envío de interacciones a un servidor. Las marcas de prueba viven solo en la memoria de esta página; no se escriben en el almacenamiento del navegador.</p>
            <p>No introduzcas ni compartas datos personales de terceros, testimonios, imágenes o información financiera. En un equipo compartido, recarga o cierra esta página al terminar. Las marcas antiguas del prototipo no se leen ni se migran; puedes eliminarlas desde los datos del sitio en tu navegador.</p>
            <h3>Propiedad intelectual y uso del material</h3>
            <p>El logo y la denominación CREAR identifican a “CREAR · Poder sin límites”. Los derechos sobre los signos distintivos, materiales fuente y componentes de software corresponden a sus respectivos titulares. Esta guía no transfiere derechos sobre el material del programa ni concede una licencia para publicarlo, revenderlo o distribuirlo a terceros. Solicita autorización de su titular para esos usos; los componentes de software conservan sus licencias aplicables.</p>
            <p>Contenido orientado a Aliados de C2. La impresión es una herramienta de consulta; no autoriza difusión pública ni debe incluir datos de otras personas. Las notas editoriales se distinguen del documento fuente.</p>
            <h3>Antes de habilitar cuentas y uso mundial</h3>
            <p>Faltan una infraestructura autorizada, acreditación de Aliados, autenticación y controles de acceso por identidad, guardado confirmado por servidor e historial trazable. También debe aprobarse el aviso de privacidad con responsable, contacto, finalidad, conservación, derechos y transferencias que correspondan. No se inventan esos datos ni se afirma cumplimiento legal mundial.</p>
            <p>Una señal “noindex” no protege el acceso. No hay protección absoluta contra errores: un servicio real debe mostrar pendientes, conflictos y fallos, y permitir recuperación sin atribuir registros de una persona a otra. Esta versión no debe publicarse para recopilar registros reales.</p>
          </section>

          <footer id="criterios">
            <h2>Una guía para consultar,<br />no para presionar.</h2>
            <p>Basada en “Guía Práctica Operativa: Aliado de Capítulo Dos (C2)”, adjunto de 115 líneas. Se reorganizan fases, horarios y misiones; se normaliza la numeración y se sintetiza la redacción para facilitar la consulta.</p>
            <p>Las notas editoriales de cuidado no son citas ni cambios a las políticas del programa. Los pasajes de presión se presentan con límites de consentimiento y seguridad, no como técnicas de manipulación. No se atribuye evidencia neurocientífica a este contenido.</p>
            <div className="footer-line"><span>CREAR · Aliados C2 · Guía 1.1</span><a href="#privacidad">Privacidad y derechos</a><a href="#todo">Volver a la agenda <ArrowUpRight size={16} aria-hidden="true" /></a></div>
          </footer>
        </main>
      </div>
    </>
  );
}

createRoot(document.getElementById('root')).render(<Guide />);
