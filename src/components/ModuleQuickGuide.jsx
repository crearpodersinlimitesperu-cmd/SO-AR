import React, { useId, useState } from 'react';
import { BookOpen, ChevronDown, X } from 'lucide-react';
import './ManagersHelp.css';

export default function ModuleQuickGuide({ guide }) {
  const [open, setOpen] = useState(true);
  const id = useId();

  return (
    <section className="managers-quick-guide" aria-label={`Guía rápida: ${guide.label}`}>
      <div className="managers-guide-header">
        <div>
          <span className="managers-guide-eyebrow"><BookOpen size={15} aria-hidden="true" /> {guide.label}</span>
          <h2>Indicaciones de uso</h2>
          <p>{guide.intro}</p>
        </div>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id}>
          {open ? <X size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          {open ? 'Cerrar indicaciones' : 'Ver indicaciones'}
        </button>
      </div>
      <div id={id} hidden={!open}>
        <ol className="managers-guide-steps">
          {guide.steps.map(([title, text], index) => (
            <li key={title}><span aria-hidden="true">{index + 1}</span><div><strong>{title}</strong><p>{text}</p></div></li>
          ))}
        </ol>
        <p className="managers-guide-scope">{guide.scope}</p>
      </div>
    </section>
  );
}
