import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { listenCampaignMissions, listenConfirmations, saveConfirmation } from './missionService';
import { isMissionComplete, missionProgress, normalizeText } from './missionModel';
import './mission.css';

function HowItWorks({ open = false }) {
  return <details className="imo-how" open={open}>
    <summary>¿Cómo funciona tu Misión IMO?</summary>
    <ol>
      <li><strong>Elige tu nombre</strong> en la lista y entra a tu misión. Selecciona solo tu propio perfil.</li>
      <li>Verás a las personas que <strong>tú enrolaste</strong> para este Capítulo Uno y quién es su coordinadora.</li>
      <li>Comunícate con cada enrolado y pídele que <strong>hable con su coordinación</strong>. Puedes usar el botón «Contactar a coordinación» (WhatsApp).</li>
      <li>Marca <strong>«se comunicó con coordinación»</strong> cuando lo haya hecho.</li>
      <li>Marca <strong>«confirmó que asistirá»</strong> cuando te confirme que estará en Capítulo Uno.</li>
      <li>Tu misión se completa cuando todos tus enrolados tienen las dos marcas. <strong>Todo se guarda solo</strong>: puedes volver con este mismo enlace cuando quieras.</li>
    </ol>
    <p>Tus marcas son tu compromiso como IMO; no reemplazan el registro de asistencia de coordinación.</p>
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
      setCampaign(snap.data());
    }, () => { setError('El enlace no está disponible o la campaña está cerrada. Solicita a gerencia el enlace vigente.'); setLoaded(true); });
  }, [campaignId, validId]);
  useEffect(() => {
    if (!validId) return;
    return listenCampaignMissions(campaignId, data => { setMissions(data); setLoaded(true); }, () => { setError('No se pudieron consultar los perfiles. Revisa tu conexión o solicita el enlace vigente.'); setLoaded(true); });
  }, [campaignId, validId]);
  const mission = missions.find(m => m.id === selected);
  useEffect(() => {
    setChecks({}); setChecksLoaded(false);
    if (!mission || !confirmedProfile) return;
    return listenConfirmations(campaignId, mission.id, data => { setChecks(data); setChecksLoaded(true); }, () => { setError('No se pudieron recuperar las confirmaciones. Los cambios están deshabilitados.'); setChecksLoaded(false); });
  }, [campaignId, mission, confirmedProfile]);
  const enrolados = (mission?.enrolados || []).map(e => ({ ...e, contacto: checks[e.id]?.contacto === true, asistencia: checks[e.id]?.asistencia === true }));
  const visibleEnrolados = enrolados.filter(e => (!search || normalizeText(e.nombre).includes(normalizeText(search))) && (statusFilter === 'all' || (statusFilter === 'confirmed' ? e.asistencia : statusFilter === 'contact' ? !e.contacto : !e.asistencia)));
  const pending = Object.values(checks).some(c => c.pending);
  const complete = checksLoaded && !saving && !pending && !error && isMissionComplete(enrolados);
  async function update(id, field, value) {
    setSaving(true); setError('');
    try { await saveConfirmation(campaignId, mission.id, id, field, value, mission.imoNombre, sessionId); }
    catch { setError('No se guardó la confirmación. Revisa tu conexión e inténtalo de nuevo. La misión no se dará por completada con un guardado pendiente.'); }
    finally { setSaving(false); }
  }
  return <main className="imo-page"><section className="imo-card">
    <header><img className="imo-logo" src="/imo/logo-crear.png" alt="CREAR · Poder sin límites" width="151" height="180"/><span className="imo-brand">CREAR · PODER SIN LÍMITES</span><h1>Misión IMO</h1><p>IMO es la persona que enrola a alguien para entrenarse, como mínimo, en Capítulo Uno.</p></header>
    {!validId ? <><h2>Solicita el enlace vigente de tu equipo</h2><p>Las misiones ahora se generan desde Causa OS por sede, equipo de ingreso y fecha de Capítulo Uno. Pide a gerencia el enlace de tu campaña.</p><p>Las direcciones antiguas no identifican una campaña vigente. No se han modificado tus registros anteriores.</p></> : !loaded ? <p role="status">Consultando la campaña…</p> : <>
      {campaign && <h2>{campaign.sede} · Capítulo Uno · Equipo {campaign.targetTeam}<br/><small>Inicio de C1: {campaign.c1Date}</small></h2>}
      {!confirmedProfile ? <><HowItWorks open /><label>Selecciona tu nombre<select value={selected} onChange={e => setSelected(e.target.value)}><option value="">Elige tu perfil IMO</option>{missions.map(m => <option key={m.id} value={m.id}>{m.imoNombre} · {m.originTeam ? `Equipo de origen ${m.originTeam}` : 'Equipo de origen por confirmar'}</option>)}</select></label>
        <p>Si tu nombre no aparece, solicita a gerencia que revise tu asignación. No selecciones el perfil de otra persona.</p>
        <button disabled={!mission || campaign?.status !== 'active'} onClick={() => { setError(''); setConfirmedProfile(true); }}>Soy {mission?.imoNombre || 'el IMO seleccionado'} · Ver mi misión</button></> : mission && <>
        <div className="imo-row"><h2>{mission.imoNombre}</h2><button className="imo-secondary" disabled={saving || pending} onClick={() => setConfirmedProfile(false)}>Cambiar perfil</button></div>
        <HowItWorks /><p><strong>Tu equipo de origen: {mission.originTeam || 'por confirmar'}</strong><br/>Tus enrolados ingresan a <strong>Capítulo Uno · Equipo {mission.targetTeam} · {mission.sede}</strong>.</p>
        <p className="imo-note">Creación, Relación y Gratitud son fines de semana por los que pasa cada equipo. Esta misión registra contacto y confirmación de asistencia; no determina la graduación ni acredita asistencia efectiva.</p>
        <p role="status">{!checksLoaded ? 'Recuperando avance…' : saving || pending ? 'Guardando; esperando confirmación del servidor…' : complete ? 'Misión completada y guardada: contacto y asistencia confirmados para todos tus enrolados.' : `Avance guardado: ${missionProgress(enrolados)}%`}</p>
        <div className="imo-grid"><label>Buscar enrolado<input type="search" value={search} onChange={ev => setSearch(ev.target.value)} placeholder="Nombre de tu enrolado"/></label><label>Confirmación del IMO<select value={statusFilter} onChange={ev => setStatusFilter(ev.target.value)}><option value="all">Todos</option><option value="confirmed">Asistencia confirmada por mí</option><option value="pending">Asistencia pendiente de confirmar</option><option value="contact">Contacto pendiente</option></select></label></div>
        <p>{visibleEnrolados.length} de {enrolados.length} enrolados. El avance corresponde a tu lista completa.</p>
        {!visibleEnrolados.length && <p>No hay enrolados que coincidan con esta búsqueda y filtro.</p>}
        {visibleEnrolados.map(e => <article className="imo-enrolado" key={e.id}><h3>{e.nombre}</h3><p>Coordinación: {e.coordinadora_nombre || 'Pendiente de asignación por gerencia'}</p>
          {e.coordinadora_telefono && <a href={`https://wa.me/${e.coordinadora_telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, soy ${mission.imoNombre}. Quisiera confirmar la comunicación y asistencia de ${e.nombre} a C1 del Equipo ${mission.targetTeam} de ${mission.sede}.`)}`} target="_blank" rel="noreferrer">Contactar a coordinación</a>}
          <label className="imo-check"><input type="checkbox" checked={e.contacto} disabled={!checksLoaded || saving || pending || campaign?.status !== 'active'} onChange={ev => update(e.id, 'contacto', ev.target.checked)}/>Confirmo que mi enrolado se comunicó con coordinación.</label>
          <label className="imo-check"><input type="checkbox" checked={e.asistencia} disabled={!checksLoaded || saving || pending || campaign?.status !== 'active'} onChange={ev => update(e.id, 'asistencia', ev.target.checked)}/>Mi enrolado confirmó que asistirá a Capítulo Uno.</label>
          {checks[e.id]?.updatedAt?.toDate && <small>Última confirmación: {checks[e.id].updatedAt.toDate().toLocaleString('es-PE')} · Perfil seleccionado: {checks[e.id].reportedName}</small>}
        </article>)}
        <small>La trazabilidad registra el perfil seleccionado, la sesión y la hora. El acceso por enlace no verifica la identidad de la persona.</small>
      </>}
    </>}
    {error && <p className="imo-error" role="alert">{error}</p>}
  </section></main>;
}
