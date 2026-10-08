import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
export default function MissionHistory({ mission, onClose }) {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    getDocs(query(collection(db, 'imo_campaigns', mission.campaignId, 'profiles', mission.id, 'imo_events'), orderBy('at', 'desc'), limit(50))).then(s => { if (active) setEvents(s.docs.map(d => ({ ...d.data(), id: d.id }))); }).catch(() => { if (active) setError('No se pudo recuperar el historial.'); });
    return () => { active = false; };
  }, [mission.id, mission.campaignId]);
  const names = Object.fromEntries(mission.enrolados.map(e => [e.id, e.nombre]));
  const describe = state => `Contacto: ${state.contacto ? 'sí' : 'no'} · Asistencia confirmada: ${state.asistencia ? 'sí' : 'no'}`;
  return <div style={{ position: 'fixed', inset: 0, background: '#0f172acc', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}><section className="imo-generator" role="dialog" aria-modal="true" aria-label="Historial de misión"><div className="imo-row"><h2>Historial · {mission.imoNombre}</h2><button onClick={onClose}>Cerrar</button></div><p>Equipo de origen {mission.originTeam || 'por confirmar'} → C1 Equipo {mission.targetTeam} · {mission.sede} · {mission.c1Date}</p><small>Últimos 50 cambios. El nombre corresponde al perfil seleccionado; la sesión identifica el navegador, no una identidad verificada.</small>{error && <p role="alert">{error}</p>}{events === null && !error ? <p>Cargando…</p> : events?.length === 0 ? <p>Aún no hay confirmaciones registradas.</p> : events?.map(e => <article key={e.id}><strong>{names[e.enroladoId] || e.enroladoId}</strong><p>{e.at?.toDate?.().toLocaleString('es-PE')} · {e.reportedName}</p><small>Antes: {describe(e.before)}<br/>Después: {describe(e.after)}<br/>Sesión: {e.sessionId}</small></article>)}</section></div>;
}
