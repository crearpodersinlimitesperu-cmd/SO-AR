import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { homeModuleHelp } from '../data/homeModuleHelp';
import './ModuleHelpButton.css';

export default function ModuleHelpButton({ helpKey, children, className = '', ...props }) {
  const id = useId();
  const anchor = useRef(null);
  const panel = useRef(null);
  const timer = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const description = homeModuleHelp[helpKey];
  const clearTimer = () => clearTimeout(timer.current);
  const show = () => {
    clearTimer();
    setOpen(true);
  };
  const hide = () => {
    clearTimer();
    setOpen(false);
  };
  const hideSoon = () => {
    clearTimer();
    timer.current = setTimeout(hide, 180);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = anchor.current.getBoundingClientRect();
      const width = Math.min(280, window.innerWidth - 24);
      if (panel.current) panel.current.style.width = `${width}px`;
      const height = panel.current?.getBoundingClientRect().height || 80;
      setPosition({
        width,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        top: rect.bottom + height + 8 <= window.innerHeight - 12
          ? rect.bottom + 8 : Math.max(12, rect.top - height - 8)
      });
    };
    const dismiss = event => {
      if (event.key === 'Escape') hide();
    };
    const outside = event => {
      if (!anchor.current.contains(event.target) && !panel.current?.contains(event.target)) hide();
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', hide, true);
    document.addEventListener('keydown', dismiss);
    document.addEventListener('pointerdown', outside);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', hide, true);
      document.removeEventListener('keydown', dismiss);
      document.removeEventListener('pointerdown', outside);
    };
  }, [open]);

  return (
    <>
      <button
        {...props}
        ref={anchor}
        type={props.type || 'button'}
        className={`${className} module-help-button`}
        title={description}
        aria-labelledby={props['aria-labelledby'] || (props['aria-label'] ? undefined : `${id}-label`)}
        aria-describedby={[props['aria-describedby'], `${id}-description`].filter(Boolean).join(' ')}
        data-module-help={helpKey}
        onFocus={event => { show(); props.onFocus?.(event); }}
        onBlur={event => { hideSoon(); props.onBlur?.(event); }}
        onPointerEnter={event => { if (event.pointerType === 'mouse') show(); props.onPointerEnter?.(event); }}
        onPointerLeave={event => { hideSoon(); props.onPointerLeave?.(event); }}
        onClick={event => { hide(); props.onClick?.(event); }}
      >
        <span id={`${id}-label`}>{children}</span>
        <span id={`${id}-description`} className="module-help-description">{description}</span>
      </button>
      {open && createPortal(
        <div
          ref={panel}
          role="tooltip"
          className="module-help-tooltip"
          style={{ ...position, visibility: position ? 'visible' : 'hidden' }}
          onPointerEnter={clearTimer}
          onPointerLeave={hideSoon}
        >{description}</div>,
        document.body
      )}
    </>
  );
}
