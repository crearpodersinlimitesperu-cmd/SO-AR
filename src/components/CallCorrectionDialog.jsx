import React, { useEffect, useRef, useState } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { correctManagerCall } from '../services/callHistoryService';
import { canCorrectManagerCall, canViewKPIsLlamadas } from '../config/permissions';
import { isActiveCall } from '../utils/callHistory';
import { HelpButton, HelpInput, HelpSelect, HelpTextarea } from './ManagersHelp';

export default function CallCorrectionDialog({ db, user, manager, call, initialFecha, onClose, onSaved }) {
  const [action, setAction] = useState(isActiveCall(call) ? 'editar' : 'restaurar');
  const [fecha, setFecha] = useState(initialFecha || call.fecha || '');
  const [asistio, setAsistio] = useState(call.asistio === true || call.asistio === 'SI');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const operation = useRef(null);
  const locked = useRef(false);
  const panel = useRef(null);
  const allowed = canCorrectManagerCall(user, manager, call) &&
    (isActiveCall(call) || canViewKPIsLlamadas(user));

  useEffect(() => {
    const previousFocus = document.activeElement;
    panel.current?.focus();
    return () => previousFocus?.isConnected && previousFocus.focus();
  }, []);

  useEffect(() => onSnapshot(query(collection(db, 'call_corrections'), where('callId', '==', call.id)), snapshot => {
    setHistory(snapshot.docs.map(row => ({ id: row.id, ...row.data() }))
      .filter(row => row.tipo === (call.tipo === 'grupal' ? 'grupal' : 'individual') &&
        (row.tipo === 'grupal' || row.managerDocId === (manager?.docId || manager?.id)))
      .sort((a, b) => (a.occurredAtIso || '').localeCompare(b.occurredAtIso || '')));
    setHistoryError(snapshot.metadata.fromCache ? 'Esperando confirmación del servidor para la auditoría…' : '');
  }, err => {
    console.error('Error leyendo correcciones de llamadas:', err);
    setHistoryError('No se pudo verificar la auditoría. Revisa la conexión antes de continuar.');
  }), [db, call.id, call.tipo, manager?.docId, manager?.id]);

  const save = async event => {
    event.preventDefault();
    if (locked.current || !allowed) return;
    const input = {
      tipo: call.tipo === 'grupal' ? 'grupal' : 'individual',
      managerDocId: call.tipo === 'grupal' ? '' : (manager.docId || manager.id),
      callId: call.id, action, motivo: motivo.trim(), expectedRevision: call.revision || 0,
      changes: action === 'editar' ? { fecha, ...(call.tipo !== 'grupal' ? { asistio } : {}) } : {},
    };
    const fingerprint = JSON.stringify(input);
    if (operation.current?.fingerprint !== fingerprint) {
      operation.current = { fingerprint, id: doc(collection(db, 'call_corrections')).id };
    }
    locked.current = true;
    setSaving(true);
    setError('');
    try {
      await correctManagerCall(db, { ...input, operationId: operation.current.id });
      onSaved();
    } catch (err) {
      console.error('Error corrigiendo llamada:', err);
      setError(err.code === 'functions/not-found'
        ? 'El servicio de correcciones aún no está disponible. No se modificó ningún registro; informa a Dirección.'
        : (err.message || 'No se confirmó la corrección. Reintenta sin cerrar este formulario.'));
    } finally {
      locked.current = false;
      setSaving(false);
    }
  };
  const keyDown = event => {
    if (event.key === 'Escape' && !locked.current) { event.stopPropagation(); onClose(); }
    if (event.key !== 'Tab') return;
    const controls = panel.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary');
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus();
    }
  };
  const controlStyle = { padding: '0.65rem', font: 'inherit', fontSize: '1rem', width: '100%', boxSizing: 'border-box', border: '1px solid #94a3b8', borderRadius: '6px' };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1600, background: 'rgba(15,23,42,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <section ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="call-correction-title"
        onKeyDown={keyDown} style={{ background: 'var(--bg-card, #fff)', color: 'var(--text-heading, #0f172a)', width: '100%', maxWidth: '520px', maxHeight: '90dvh', overflowY: 'auto', padding: '1.25rem', borderRadius: '12px', boxSizing: 'border-box', overflowWrap: 'anywhere', lineHeight: 1.5 }}>
        <h2 id="call-correction-title" style={{ fontSize: '1.2rem', marginTop: 0 }}>Corrección trazable de llamada</h2>
        <p>{call.fecha} · {call.tipo === 'grupal' ? 'Llamada grupal: afecta a todos sus integrantes' : manager?.nombre}</p>
        <p>El original nunca se borra. Las llamadas anuladas no cuentan ni generan pendientes. Si está pagada, solicita revisión a Finanzas o Dirección.</p>
        <form onSubmit={save} style={{ display: 'grid', gap: '1rem' }}>
          <label>Acción
            <HelpSelect helpKey="accionCorreccion" passiveHelp value={action} disabled={saving || !allowed} onChange={event => setAction(event.target.value)} style={controlStyle}>
              {isActiveCall(call) ? <><option value="editar">Corregir datos</option><option value="anular">Anular registro duplicado o incorrecto</option></> :
                <option value="restaurar">Restaurar registro (Dirección)</option>}
            </HelpSelect>
          </label>
          {action === 'editar' && <>
            <label>Fecha real
              <HelpInput helpKey={call.tipo === 'grupal' ? 'fechaGrupal' : 'fechaIndividual'} passiveHelp type="date" required value={fecha} disabled={saving || !allowed} onChange={event => setFecha(event.target.value)} style={controlStyle} />
            </label>
            {call.tipo !== 'grupal' && <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', minHeight: '44px' }}>
              <HelpInput helpKey="asistencia" passiveHelp type="checkbox" checked={asistio} disabled={saving || !allowed} onChange={event => setAsistio(event.target.checked)} />
              Asistió / llamada efectiva
            </label>}
          </>}
          <label>Motivo obligatorio
            <HelpTextarea helpKey="motivoCorreccion" passiveHelp required minLength={5} maxLength={500} value={motivo} disabled={saving || !allowed} onChange={event => setMotivo(event.target.value)} rows={3} style={controlStyle} />
          </label>
          {!allowed && <p role="status">Solo puedes corregir registros propios o asignados. La restauración requiere Dirección.</p>}
          {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <HelpButton helpKey="confirmarCorreccion" passiveHelp type="submit" disabled={saving || !allowed || motivo.trim().length < 5} style={{ minHeight: '44px', padding: '0.65rem 1rem', border: '1px solid #1d4ed8', borderRadius: '6px', background: '#1d4ed8', color: '#fff', font: 'inherit', opacity: saving || !allowed || motivo.trim().length < 5 ? 0.55 : 1 }}>
              {saving ? 'Guardando…' : 'Guardar corrección'}
            </HelpButton>
            <HelpButton helpKey="cancelar" passiveHelp type="button" disabled={saving} onClick={onClose} style={{ minHeight: '44px', padding: '0.65rem 1rem', border: '1px solid #94a3b8', borderRadius: '6px', background: 'transparent', color: 'inherit', font: 'inherit' }}>Cerrar</HelpButton>
          </div>
        </form>
        <h3 style={{ fontSize: '1rem' }}>Auditoría del registro</h3>
        {historyError && <p role="status">{historyError}</p>}
        {!history.length && !historyError && <p>Sin correcciones anteriores.</p>}
        {history.map(entry => <details key={entry.id} style={{ marginBlock: '0.75rem' }}>
          <summary>{entry.occurredAtIso} · {entry.action} · {entry.actorEmail}</summary>
          <p>{entry.motivo}</p>
          <p>Antes: {entry.before.fecha} · {entry.before.estadoRegistro || 'activa'} · {entry.before.asistio === true ? 'Asistió' : entry.before.asistieron ?? 'No asistió'}</p>
          <p>Después: {entry.after.fecha} · {entry.after.estadoRegistro || 'activa'} · {entry.after.asistio === true ? 'Asistió' : entry.after.asistieron ?? 'No asistió'}</p>
        </details>)}
      </section>
    </div>
  );
}
