import React, { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, ChevronDown, HelpCircle, X } from 'lucide-react';
import {
  managersActionHelp, managersFieldHelp, managersGuides, managersHelpUI,
  managersGuideStorageKey, shouldExplainAction
} from '../data/managersHelpContent';
import './ManagersHelp.css';

const HelpContext = createContext(null);

export function ManagersHelpProvider({ children }) {
  const [learning, setLearning] = useState(false);
  const [active, setActive] = useState(null);
  const [position, setPosition] = useState(null);
  const descriptionPrefix = useId();
  const timer = useRef(null);
  const panel = useRef(null);
  const clearTimer = () => clearTimeout(timer.current);
  const hide = () => {
    clearTimer();
    setActive(null);
    setPosition(null);
  };
  const show = (help, id, anchor) => {
    clearTimer();
    setPosition(null);
    setActive({ help, id, anchor });
  };
  const hideSoon = () => {
    clearTimer();
    timer.current = setTimeout(hide, 180);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!active) return;
    const place = () => {
      if (!active.anchor.isConnected) {
        hide();
        return;
      }
      const rect = active.anchor.getBoundingClientRect();
      const width = Math.min(320, window.innerWidth - 24);
      const height = panel.current?.getBoundingClientRect().height || 160;
      const top = rect.bottom + 8 + height <= window.innerHeight - 12
        ? rect.bottom + 8 : Math.max(12, rect.top - height - 8);
      setPosition({
        width, top,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))
      });
    };
    const dismiss = event => {
      if (event.key === 'Escape') hide();
    };
    const outside = event => {
      if (!active.anchor.contains(event.target) && !panel.current?.contains(event.target)) hide();
    };
    const scrolled = event => {
      if (!(event.target instanceof Node) || !panel.current?.contains(event.target)) hide();
    };
    place();
    // Hide on scroll so the explanation never obscures a different row.
    window.addEventListener('scroll', scrolled, true);
    window.addEventListener('resize', place);
    document.addEventListener('keydown', dismiss);
    document.addEventListener('pointerdown', outside);
    return () => {
      window.removeEventListener('scroll', scrolled, true);
      window.removeEventListener('resize', place);
      document.removeEventListener('keydown', dismiss);
      document.removeEventListener('pointerdown', outside);
    };
  }, [active]);

  return (
    <HelpContext.Provider value={{ learning, setLearning, active, descriptionPrefix, show, hideSoon, hide }}>
      {children}
      {Object.entries({ field: managersFieldHelp, action: managersActionHelp }).flatMap(([kind, entries]) =>
        Object.entries(entries).map(([key, help]) => (
          <span hidden id={`${descriptionPrefix}-${kind}-${key}`} key={`${kind}-${key}`}>
            {help.text} {help.good && `✓ Así: ${help.good}.`} {help.avoid && `✗ Evita: ${help.avoid}.`}
          </span>
        ))
      )}
      {active && createPortal(
        <div
          ref={panel}
          role="tooltip"
          id={active.id}
          className="managers-help-popover"
          style={{ ...position, visibility: position ? 'visible' : 'hidden' }}
          onPointerEnter={clearTimer}
          onPointerLeave={hideSoon}
        >
          <strong><HelpCircle size={15} aria-hidden="true" /> {active.help.label}</strong>
          <p>{active.help.text}</p>
          {active.help.good && <p className="managers-help-good">✓ Así: {active.help.good}</p>}
          {active.help.avoid && <p className="managers-help-avoid">✗ Evita: {active.help.avoid}</p>}
        </div>, document.body
      )}
    </HelpContext.Provider>
  );
}

function hasText(children) {
  return React.Children.toArray(children).some(child =>
    (typeof child === 'string' && /[\p{L}\p{N}]/u.test(child)) || typeof child === 'number' ||
    (React.isValidElement(child) && hasText(child.props.children))
  );
}

export function ManagerHelpControl({ as: Tag, helpKey, children, ...props }) {
  const context = useContext(HelpContext);
  const id = useId();
  const isAction = Tag === 'button' || Tag === 'a' || Tag === 'th';
  const help = isAction ? managersActionHelp[helpKey] : managersFieldHelp[helpKey];
  const explain = event => context.show(help, id, event.currentTarget);
  const click = event => {
    if (isAction && shouldExplainAction(context.learning, helpKey)) {
      event.preventDefault();
      event.stopPropagation();
      explain(event);
      return;
    }
    if (isAction) context.hide();
    props.onClick?.(event);
  };
  return (
    <Tag
      {...props}
      aria-label={props['aria-label'] || ((!isAction || !hasText(children)) ? (props.title || help.label) : undefined)}
      aria-describedby={[props['aria-describedby'], `${context.descriptionPrefix}-${isAction ? 'action' : 'field'}-${helpKey}`].filter(Boolean).join(' ')}
      data-manager-help={helpKey}
      onFocus={event => { explain(event); props.onFocus?.(event); }}
      onBlur={event => { context.hideSoon(); props.onBlur?.(event); }}
      onPointerEnter={event => {
        if (event.pointerType === 'mouse') explain(event);
        props.onPointerEnter?.(event);
      }}
      onPointerLeave={event => { context.hideSoon(); props.onPointerLeave?.(event); }}
      onKeyDown={event => {
        if (Tag === 'th' && ['Enter', ' '].includes(event.key)) {
          event.preventDefault();
          click(event);
        }
        props.onKeyDown?.(event);
      }}
      onClick={click}
    >{children}</Tag>
  );
}

export const HelpInput = props => <ManagerHelpControl as="input" {...props} />;
export const HelpSelect = props => <ManagerHelpControl as="select" {...props} />;
export const HelpTextarea = props => <ManagerHelpControl as="textarea" {...props} />;
export const HelpButton = props => <ManagerHelpControl as="button" {...props} />;
export const HelpLink = props => <ManagerHelpControl as="a" {...props} />;
export const HelpSortHeader = props => <ManagerHelpControl as="th" tabIndex={0} helpKey="ordenar" {...props} />;

export function ManagersHelpMode() {
  const { learning, setLearning, hide } = useContext(HelpContext);
  return (
    <div className="managers-help-mode">
      <button type="button" aria-pressed={learning} onClick={() => { hide(); setLearning(!learning); }}>
        <HelpCircle size={16} aria-hidden="true" />
        {learning ? managersHelpUI.work : managersHelpUI.learn}
      </button>
      {learning && <p role="status">{managersHelpUI.learning}</p>}
    </div>
  );
}

export function ManagersQuickGuide({ role }) {
  const guide = managersGuides[role];
  const storageKey = managersGuideStorageKey(role);
  const [storageError, setStorageError] = useState(false);
  const [open, setOpen] = useState(true);
  const id = useId();

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(storageKey) !== 'closed');
    } catch (error) {
      console.warn('No se pudo leer la preferencia de guía de Managers:', error);
      setStorageError(true);
    }
  }, [storageKey]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(storageKey, next ? 'open' : 'closed');
    } catch (error) {
      console.warn('No se pudo guardar la preferencia de guía de Managers:', error);
      setStorageError(true);
    }
  };

  return (
    <section className="managers-quick-guide" aria-label={`Guía rápida: ${guide.label}`}>
      <div className="managers-guide-header">
        <div>
          <span className="managers-guide-eyebrow"><BookOpen size={15} aria-hidden="true" /> {guide.label}</span>
          <h2>{managersHelpUI.guideTitle}</h2>
          <p>{managersHelpUI.intro}</p>
        </div>
        <button type="button" onClick={toggle} aria-expanded={open} aria-controls={id}>
          {open ? <X size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          {open ? managersHelpUI.close : managersHelpUI.open}
        </button>
      </div>
      <div id={id} hidden={!open}>
        <ol className="managers-guide-steps">
          {guide.steps.map(([title, text], index) => (
            <li key={title}><span aria-hidden="true">{index + 1}</span><div><strong>{title}</strong><p>{text}</p></div></li>
          ))}
        </ol>
        <p className="managers-guide-scope">{managersHelpUI.scope[role]}</p>
      </div>
      <p className="managers-guide-hint">{managersHelpUI.hint}</p>
      <ManagersHelpMode />
      {storageError && <p role="status">{managersHelpUI.storageError}</p>}
    </section>
  );
}
