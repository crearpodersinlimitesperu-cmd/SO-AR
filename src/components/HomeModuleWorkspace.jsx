import { Children, Fragment, cloneElement, isValidElement, useId, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { homeModuleHelp } from '../data/homeModuleHelp';
import '../pages/HomeModules.css';

const categories = [
  { id: 'operacion', label: 'Operación y seguimiento', keys: ['horarios', 'gerencial', 'checklist', 'kpis', 'hubQT', 'vuelos', 'imos', 'asignador'] },
  { id: 'direccion', label: 'Dirección y gestión', keys: ['portafolio', 'estrategia', 'auditoria', 'mando', 'cfo', 'finanzas', 'talento', 'legal', 'auditoriaLegal'] },
  { id: 'personas', label: 'Personas y equipos', keys: ['directorioQT', 'llamadas', 'managers', 'crm'] },
  { id: 'formacion', label: 'Formación y recursos', keys: ['manualQT', 'manualNodus', 'maestria', 'entrenador', 'campus', 'flyers'] },
  { id: 'calendarios', label: 'Calendarios', keys: ['calendarioGlobal', 'calendarioMJ'] },
  { id: 'otros', label: 'Otros accesos', keys: [] }
];

function flatten(children, prefix = '') {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement(child)) return [child];
    const key = `${prefix}/${child.key}`;
    return child.type === Fragment
      ? flatten(child.props.children, key) : [cloneElement(child, { key })];
  });
}

function textContent(children) {
  return Children.toArray(children).map(child =>
    isValidElement(child) ? textContent(child.props.children) : String(child)
  ).join(' ');
}

const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

export default function HomeModuleWorkspace({ children }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState('personas');
  const [collapsedResults, setCollapsedResults] = useState([]);
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const searching = terms.length > 0;
  // Home evaluates permissions before passing these elements. Never rebuild accesses from a registry.
  const modules = flatten(children);
  const groups = categories.map(category => {
    const accesses = modules.filter(child => {
      const key = child.props?.helpKey;
      return category.id === 'otros'
        ? !categories.some(group => group.keys.includes(key))
        : category.keys.includes(key);
    });
    const matches = accesses.filter(child => {
      const text = normalize(`${textContent(child.props?.children)} ${homeModuleHelp[child.props?.helpKey] || ''} ${category.label}`);
      return terms.every(term => text.includes(term));
    });
    return { ...category, accesses, matches };
  }).filter(group => group.matches.length > 0);
  const count = groups.reduce((total, group) => total + group.matches.length, 0);

  return (
    <section className="home-modules" aria-labelledby={`${id}-title`}>
      <header className="home-modules-header">
        <div>
          <p className="home-modules-eyebrow">TU ESPACIO DE TRABAJO</p>
          <h2 id={`${id}-title`}>Módulos y herramientas</h2>
          <p className="home-modules-intro">Busca un acceso o explora por categoría.</p>
        </div>
        <div className="home-modules-search">
          <Search size={17} aria-hidden="true" />
          <label className="home-modules-sr-only" htmlFor={`${id}-search`}>Buscar módulos y herramientas</label>
          <input id={`${id}-search`} type="search" value={query}
            placeholder="Buscar módulos…" autoComplete="off"
            aria-controls={`${id}-groups`}
            onChange={event => {
              setQuery(event.target.value);
              setCollapsedResults([]);
            }} />
        </div>
      </header>
      <p className="home-modules-status" role="status" aria-live="polite" aria-atomic="true">
        {searching ? `${count} ${count === 1 ? 'acceso encontrado' : 'accesos encontrados'}` : `${modules.length} accesos disponibles`}
      </p>
      <div id={`${id}-groups`} className="home-module-groups">
        {groups.map(group => {
          const open = searching ? !collapsedResults.includes(group.id) : expanded === group.id;
          return (
            <div key={group.id} className="home-module-group" data-expanded={open}>
              <h3>
                <button type="button" className="home-module-group-toggle"
                  aria-expanded={open} aria-controls={`${id}-${group.id}`}
                  onClick={() => {
                    if (searching) {
                      setCollapsedResults(previous => open
                        ? [...previous, group.id] : previous.filter(value => value !== group.id));
                    } else {
                      setExpanded(open ? null : group.id);
                    }
                  }}>
                  <span>{group.label}</span>
                  <span className="home-module-count">{group.matches.length}</span>
                  <ChevronDown size={16} aria-hidden="true" />
                </button>
              </h3>
              <div id={`${id}-${group.id}`} hidden={!open} className="home-modules-grid">
                {group.matches}
              </div>
            </div>
          );
        })}
      </div>
      {count === 0 && <p className="home-modules-empty">No hay accesos para esa búsqueda. Prueba otro nombre o categoría.</p>}
    </section>
  );
}
