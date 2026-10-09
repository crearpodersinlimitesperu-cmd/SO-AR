import { isAvailableForC1 } from '../../../functions-imo/c1Eligibility.mjs';
import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { listenCampaignMissions, listenConfirmations, listenMissionWindow, saveConfirmation, startMissionWindow } from './missionService';
import { isMissionComplete, missionProgress, normalizeText } from './missionModel';
import MissionWindowNotice from './MissionWindowNotice';
import { useMissionWindow } from './useMissionWindow';
import './mission.css';
import VerifiedMissionPortal from './VerifiedMissionPortal';

function HowItWorks({ schemaVersion }) {
  return <details className="imo-how">
    <summary>Cómo hacer esta misión</summary>
    {schemaVersion === 3 ? <ol>
      <li>Escribe tu documento y solicita el código que llegará al correo registrado en Nodus.</li>
      <li>Ingresa el código para abrir tu misión. <strong>En ese momento empieza el reloj de 7 horas.</strong></li>
      <li>Confirma la intención de asistencia o reporta la novedad de cada enrolado para revisión de C1/C2.</li>
      <li>Al terminar las 7 horas tendrás automáticamente 1 hora y 30 minutos adicionales. Después, la misión quedará en solo lectura.</li>
    </ol> : <ol>
      <li>Selecciona únicamente tu nombre en la lista. Si no aparece, pide ayuda a gerencia.</li>
      <li>Pulsa «Soy … · Ver mi misión». <strong>Al pulsar ese botón empieza el reloj de 7 horas.</strong></li>
      <li>Por cada enrolado, confirma si se comunicó con coordinación y si indicó que asistirá a C1.</li>
      <li>Al terminar las 7 horas tendrás automáticamente 1 hora y 30 minutos adicionales. Después, la misión quedará en solo lectura.</li>
    </ol>}
    <p>El reloj no se reinicia al recargar la página ni al volver a abrir el enlace. Lo ya guardado se conserva. La hora válida es la del servidor.</p>
  </details>;
}

export default function MissionPortal() {
  const campaignId = new URLSearchParams(window.location.search).get('campana');
  const validId = /^[A-Za-z0-9]{20}$/.test(campaignId || '');
  const [sessionId] = useState(() => { try { const old = sessionStorage.getItem('imo-session'); if (old) return old; const id = crypto.randomUUID(); sessionStorage.setItem('imo-session', id); return id; } catch { return crypto.randomUUID(); } });
  const [missions, setMissions] = useState([]);
  const [selected, setSelected] = useState('');
  const [confirmedProfile, setConfirmedProfile] = useState(false);
  const [campaign, setCampaign] = useState(null);
  const [checks, setChecks] = useState({});
  const [windowOpenedAt, setWindowOpenedAt] = useState(null);
  const [windowLoaded, setWindowLoaded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [checksLoaded, setChecksLoaded] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  useEffect(() => {
    if (!validId) return;
    return onSnapshot(doc(db, 'imo_campaigns', campaignId), snap => {
      if (!snap.exists()) { setError('La campaña no existe. Solicita a gerencia el enlace vigente.'); setLoaded(true); return; }
      setCampaign(snap.data()); setLoaded(true);
    }, () => { setError('El enlace no está disponible o la campaña está cerrada. Solicita a gerencia el enlace vigente.'); setLoaded(true); });
  }, [campaignId, validId]);
  useEffect(() => {
    if (!validId || campaign?.schemaVersion !== 2) return;
    return listenCampaignMissions(campaignId, data => { setMissions(data); setLoaded(true); }, () => { setError('No se pudieron consultar los perfiles. Revisa tu conexión o solicita el enlace vigente.'); setLoaded(true); });
  }, [campaignId, validId, campaign?.schemaVersion]);
  const mission = missions.find(m => m.id === selected);
  const missionId = mission?.id;
  useEffect(() => {
    setChecks({}); setChecksLoaded(false);
    if (!missionId || !confirmedProfile) return;
    return listenConfirmations(campaignId, missionId, data => { setChecks(data); setChecksLoaded(true); }, () => { setError('No se pudieron recuperar las confirmaciones. Los cambios están deshabilitados.'); setChecksLoaded(false); });
  }, [campaignId, missionId, confirmedProfile]);
  useEffect(() => {
    setWindowOpenedAt(null); setWindowLoaded(false);
    if (!missionId || !confirmedProfile) return;
    return listenMissionWindow(campaignId, missionId, openedAt => { setWindowOpenedAt(openedAt); setWindowLoaded(true); }, () => {
      setError('No se pudo recuperar el inicio del plazo. La misión permanece deshabilitada.');
      setWindowLoaded(false);
    });
  }, [campaignId, missionId, confirmedProfile]);
  const missionWindow = useMissionWindow(windowOpenedAt);
  const windowExpired = missionWindow?.phase === 'expired';
  const canWrite = windowLoaded && !!windowOpenedAt && !windowExpired && campaign?.status === 'active';
  const enrolados = (mission?.enrolados || []).filter(isAvailableForC1).map(e => ({ ...e, contacto: checks[e.id]?.contacto === true, asistencia: checks[e.id]?.asistencia === true }));
  const visibleEnrolados = enrolados.filter(e => (!search || normalizeText(e.nombre).includes(normalizeText(search))) && (statusFilter === 'all' || (statusFilter === 'confirmed' ? e.asistencia : statusFilter === 'contact' ? !e.contacto : !e.asistencia)));
  const pending = Object.values(checks).some(c => c.pending);
  const complete = checksLoaded && !saving && !pending && !error && isMissionComplete(enrolados);
  async function update(id, field, value) {
    if (!canWrite) return;
    setSaving(true); setError('');
    try { await saveConfirmation(campaignId, mission.id, id, field, value, mission.imoNombre, sessionId); }
    catch { setError('No se guardó la confirmación. Revisa tu conexión e inténtalo de nuevo. La misión no se dará por completada con un guardado pendiente.'); }
    finally { setSaving(false); }
  }
  return <main className="imo-page"><section className="imo-card">
    <header><img src="/imo/logo-crear.png" alt="CREAR · Poder sin límites" width="76" height="91" style={{ objectFit: 'contain' }}/><h1>Misión IMO</h1><p>IMO es la persona que enrola a alguien para entrenarse, como mínimo, en Capítulo Uno.</p></header>
    {!validId ? <><h2>Solicita el enlace vigente de tu equipo</h2><p>Las misiones ahora se generan desde Causa OS por sede, equipo de ingreso y fecha de Capítulo Uno. Pide a gerencia el enlace de tu campaña.</p><p>Las direcciones antiguas no identifican una campaña vigente. No se han modificado tus registros anteriores.</p></> : !loaded ? <p role="status">Consultando la campaña…</p> : campaign?.schemaVersion === 3 ? <><HowItWorks schemaVersion={3}/><VerifiedMissionPortal key={campaignId} campaignId={campaignId} /></> : campaign?.schemaVersion !== 2 ? <p>Campaña no disponible. Solicita el enlace vigente a gerencia.</p> : <>
      {campaign && <><h2>{campaign.sede} · Capítulo Uno · Equipo {campaign.targetTeam}<br/><small>Inicio de C1: {campaign.c1Date}</small></h2><HowItWorks schemaVersion={campaign.schemaVersion}/></>}
      {!confirmedProfile ? <><label>Selecciona tu nombre<select value={selected} onChange={e => setSelected(e.target.value)}><option value="">Elige tu perfil IMO</option>{missions.map(m => <option key={m.id} value={m.id}>{m.imoNombre} · {m.originTeam ? `Equipo de origen ${m.originTeam}` : 'Equipo de origen por confirmar'}</option>)}</select></label>
        <p>Si tu nombre no aparece, solicita a gerencia que revise tu asignación. No selecciones el perfil de otra persona.</p>
        <button disabled={!mission || campaign?.status !== 'active' || saving} onClick={async () => {
          setError(''); setSaving(true);
          try { await startMissionWindow(campaignId, mission.id); setConfirmedProfile(true); }
          catch { setError('No se pudo iniciar el plazo. Revisa tu conexión e inténtalo nuevamente.'); }
          finally { setSaving(false); }
        }}>{saving ? 'Iniciando misión…' : `Soy ${mission?.imoNombre || 'el IMO seleccionado'} · Ver mi misión`}</button></> : mission && <>
        <div className="imo-row"><h2>{mission.imoNombre}</h2><button className="imo-secondary" disabled={saving || pending || !windowLoaded || !!windowOpenedAt} onClick={() => setConfirmedProfile(false)}>Cambiar perfil</button></div>
        <p><strong>Tu equipo de origen: {mission.originTeam || 'por confirmar'}</strong><br/>Tus enrolados ingresan a <strong>Capítulo Uno · Equipo {mission.targetTeam} · {mission.sede}</strong>.</p>
        <p className="imo-note">Creación, Relación y Gratitud son fines de semana por los que pasa cada equipo. Esta misión registra contacto y confirmación de asistencia; no determina la graduación ni acredita asistencia efectiva.</p>
        {!windowLoaded || !windowOpenedAt ? <p role="status">Confirmando el inicio del plazo con el servidor…</p> : <MissionWindowNotice openedAt={windowOpenedAt}/>}
        <p role="status">{!checksLoaded ? 'Recuperando avance…' : saving || pending ? 'Guardando; esperando confirmación del servidor…' : complete ? 'Misión completada y guardada: contacto y asistencia confirmados para todos tus enrolados.' : `Avance guardado: ${missionProgress(enrolados)}%`}</p>
        <div className="imo-grid"><label>Buscar enrolado<input type="search" value={search} onChange={ev => setSearch(ev.target.value)} placeholder="Nombre de tu enrolado"/></label><label>Confirmación del IMO<select value={statusFilter} onChange={ev => setStatusFilter(ev.target.value)}><option value="all">Todos</option><option value="confirmed">Asistencia confirmada por mí</option><option value="pending">Asistencia pendiente de confirmar</option><option value="contact">Contacto pendiente</option></select></label></div>
        <p>Solo se muestran personas con C1 pendiente o deserción de C1 registrada en Nodus. Sin un estado C1 explícito no se acredita disponibilidad.</p><p>{visibleEnrolados.length} de {enrolados.length} enrolados disponibles. El avance corresponde a tu lista completa.</p>
        {!visibleEnrolados.length && <p>No hay enrolados que coincidan con esta búsqueda y filtro.</p>}
        {visibleEnrolados.map(e => <article className="imo-enrolado" key={e.id}><h3>{e.nombre}</h3><p>Coordinación: {e.coordinadora_nombre || 'Pendiente de asignación por gerencia'}</p>
          {e.coordinadora_telefono && <a href={`https://wa.me/${e.coordinadora_telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, soy ${mission.imoNombre}. Quisiera confirmar la comunicación y asistencia de ${e.nombre} a C1 del Equipo ${mission.targetTeam} de ${mission.sede}.`)}`} target="_blank" rel="noreferrer">Contactar a coordinación</a>}
          <label className="imo-check"><input type="checkbox" checked={e.contacto} disabled={!checksLoaded || !canWrite || saving || pending} onChange={ev => update(e.id, 'contacto', ev.target.checked)}/>Confirmo que mi enrolado se comunicó con coordinación.</label>
          <label className="imo-check"><input type="checkbox" checked={e.asistencia} disabled={!checksLoaded || !canWrite || saving || pending} onChange={ev => update(e.id, 'asistencia', ev.target.checked)}/>Mi enrolado confirmó que asistirá a Capítulo Uno.</label>
          {checks[e.id]?.updatedAt?.toDate && <small>Última confirmación: {checks[e.id].updatedAt.toDate().toLocaleString('es-PE')} · Perfil seleccionado: {checks[e.id].reportedName}</small>}
        </article>)}
        <small>La trazabilidad registra el perfil seleccionado, la sesión y la hora. El acceso por enlace no verifica la identidad de la persona.</small>
      </>}
    </>}
    {error && <p className="imo-error" role="alert">{error}</p>}
  </section></main>;
}
