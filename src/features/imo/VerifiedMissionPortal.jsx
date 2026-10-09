import { isAvailableForC1 } from '../../../functions-imo/c1Eligibility.mjs';
import React, { useEffect, useRef, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../../services/firebase';
import { normalizeText } from './missionModel';
import MissionWindowNotice from './MissionWindowNotice';
import { useMissionWindow } from './useMissionWindow';

const access = httpsCallable(getFunctions(app, 'us-central1'), 'imoAccess');
const absent = '[DATO NO REGISTRADO EN NODUS]';
const recorded = value => value === null || value === undefined || value === '' ? absent : typeof value === 'boolean' ? (value ? 'Sí' : 'No') : String(value);
const statuses = { pending_coordinator: 'Pendiente de C1/C2', approved_pending_nodus: 'Aprobada; pendiente de reflejarse en Nodus', rejected: 'Rechazada por C1/C2', confirmed_in_nodus: 'Confirmada en Nodus' };

// Tokens remain in memory. Reloading or leaving the portal requires a fresh code.
export default function VerifiedMissionPortal({ campaignId, invoke = access }) {
  const [document, setDocument] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState('');
  const [session, setSession] = useState(null);
  const [roster, setRoster] = useState(null);
  const [events, setEvents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [drafts, setDrafts] = useState({});
  const attempts = useRef(new Map());
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => {
      setSession(null); setRoster(null); setRequests([]); setEvents([]); setChallenge('');
      setNotice('Tu sesión venció. Solicita otro código para continuar.');
    }, Math.max(0, session.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [session]);
  async function call(action, data = {}, credentials = session) {
    return (await invoke({ action, campaignId, ...(credentials ? { token: credentials.token } : {}), ...data })).data;
  }
  async function perform(operation) {
    setBusy(true); setError(''); setNotice('');
    try { await operation(); }
    catch (err) {
      if (err.code === 'functions/unauthenticated') {
        setSession(null); setRoster(null); setRequests([]); setEvents([]); setChallenge('');
      }
      setError(err.code === 'functions/failed-precondition' ? 'El acceso requiere una campaña habilitada y registros verificados y recientes de Nodus. Solicita a gerencia que revise la sincronización.' : err.message || 'No se pudo guardar. Intenta nuevamente.');
    } finally { setBusy(false); }
  }
  async function refresh(credentials = session) {
    const result = await Promise.all([call('roster', {}, credentials), call('events', {}, credentials), call('requests', {}, credentials)]);
    setRoster(result[0]); setEvents(result[1].events); setRequests(result[2].requests);
  }
  function draftFor(id, field, value) { setDrafts(old => ({ ...old, [id]: { ...old[id], [field]: value } })); }
  async function report(row) {
    const draft = drafts[row.id] || {};
    const type = draft.type || 'attendance_confirmation';
    const payload = { enrolleeId: row.id, type, note: draft.note || '', ...(type === 'team_change' ? { targetEventId: draft.event || '' } : type === 'attendance_confirmation' ? { attendance: draft.attendance !== 'no' } : {}) };
    const key = JSON.stringify(payload);
    if (!attempts.current.has(key)) attempts.current.set(key, crypto.randomUUID());
    await call('report', { ...payload, requestId: attempts.current.get(key) });
    // Keep the same id on retries, including when the following read fails.
    setRequests((await call('requests')).requests);
    setNotice('Solicitud registrada para revisión de C1/C2. El estado oficial de Nodus no ha cambiado.');
  }
  const visible = (roster?.enrolados || []).filter(isAvailableForC1).filter(row => normalizeText(row.nombre).includes(normalizeText(search)) && (filter === 'all' || requests.some(r => r.enrolleeId === row.id && r.status === filter)));
  const missionWindow = useMissionWindow(roster?.missionWindow?.openedAt);
  const canReport = !!roster?.missionWindow?.openedAt && missionWindow?.phase !== 'expired';
  return <>
    <h2>Acceso verificado a tu misión</h2>
    {!session ? <form onSubmit={event => { event.preventDefault(); perform(async () => {
      if (!challenge) { const result = await call('requestCode', { document }); setChallenge(result.challengeId); setNotice(result.message); setDocument(''); }
      else { const result = await call('verifyCode', { challengeId: challenge, code }); setSession(result); setCode(''); await refresh(result); }
    }); }}>
      {!challenge ? <label>Documento de identidad<input required value={document} onChange={e => setDocument(e.target.value)} maxLength={40} autoComplete="off" /></label> : <label>Código recibido por correo<input required value={code} onChange={e => setCode(e.target.value)} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" /></label>}
      <button disabled={busy}>{busy ? 'Procesando…' : challenge ? 'Verificar código' : 'Solicitar código'}</button>
      {challenge && <button type="button" className="imo-secondary" disabled={busy} onClick={() => { setChallenge(''); setCode(''); }}>Solicitar otro código</button>}
      <p>El código se envía al correo registrado en Nodus. Nunca selecciones el nombre de otra persona.</p>
    </form> : <>
      <div className="imo-row"><button disabled={busy} onClick={() => perform(() => refresh())}>Actualizar consulta</button><button className="imo-secondary" disabled={busy} onClick={() => perform(async () => { await call('logout'); setSession(null); setRoster(null); setRequests([]); setEvents([]); setChallenge(''); })}>Cerrar sesión</button></div>
      {roster && <>
        <h2>{roster.nombre}</h2><p>{roster.sede} · Equipo de ingreso {roster.targetTeam} · C1: {roster.c1Date}</p>
        <MissionWindowNotice openedAt={roster.missionWindow?.openedAt} notStartedMessage="No hay un plazo activo para esta sesión. Cierra sesión y vuelve a verificar tu acceso; al verificar empieza el reloj."/>
        <p>Fuente Nodus: {recorded(roster.sourceUpdatedAt)}. Confirmar intención de asistencia no acredita asistencia efectiva.</p>
        <div className="imo-grid"><label>Buscar enrolado<input type="search" value={search} onChange={e => setSearch(e.target.value)} /></label><label>Estado de la solicitud<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Todos</option>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
        <p>{visible.length} de {roster.enrolados.length} enrolados vinculados a tu identidad. Solo pendientes de sentarse o desertores de C1 con registro explícito en Nodus.</p>
        {visible.map(row => { const draft = drafts[row.id] || {}; return <article className="imo-enrolado" key={row.id}>
          <h3>{row.nombre}</h3><p>Equipo actual Nodus: {recorded(row.currentTeam)}<br/>Asistencia C1: {recorded(row.asistenciaC1)} · C2: {recorded(row.asistenciaC2)}<br/>Primera llamada: {recorded(row.llamada1)}<br/>Segunda llamada: {recorded(row.llamada2)}<br/>Coordinación: {recorded(row.coordinadorNombre)}</p>
          {requests.filter(r => r.enrolleeId === row.id).map(r => <p className="imo-note" key={r.id}>{statuses[r.status] || r.status}{r.requested?.team ? ` · Equipo solicitado: ${r.requested.team} · ${r.requested.c1Date}` : ''}{r.reviewNote ? ` · ${r.reviewNote}` : ''}</p>)}
          <label>Reportar novedad<select disabled={busy || !canReport} value={draft.type || 'attendance_confirmation'} onChange={e => draftFor(row.id, 'type', e.target.value)}><option value="attendance_confirmation">Intención de asistencia</option><option value="team_change">Solicitar cambio de equipo</option><option value="contact_update">Reportar contacto</option></select></label>
          {draft.type === 'team_change' ? <label>Equipo y fecha C1 del calendario<select disabled={busy || !canReport} value={draft.event || ''} onChange={e => draftFor(row.id, 'event', e.target.value)}><option value="">Selecciona equipo y fecha</option>{events.filter(e => String(e.team) !== String(row.currentTeam)).map(e => <option key={e.id} value={e.id}>Equipo {e.team} · {e.date}</option>)}</select></label> : (!draft.type || draft.type === 'attendance_confirmation') && <label>Mi enrolado indica<select disabled={busy || !canReport} value={draft.attendance || 'yes'} onChange={e => draftFor(row.id, 'attendance', e.target.value)}><option value="yes">Que asistirá</option><option value="no">Que no asistirá</option></select></label>}
          <label>Comentario<textarea disabled={busy || !canReport} maxLength={1000} value={draft.note || ''} onChange={e => draftFor(row.id, 'note', e.target.value)} /></label>
          <button disabled={busy || !canReport || (draft.type === 'team_change' && !draft.event)} onClick={() => perform(() => report(row))}>Enviar solicitud a C1/C2</button>
        </article>; })}
      </>}
    </>}
    {notice && <p role="status" className="imo-note">{notice}</p>}
    {error && <p role="alert" className="imo-error">{error}</p>}
  </>;
}
