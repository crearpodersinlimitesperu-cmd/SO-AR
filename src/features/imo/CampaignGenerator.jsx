import React, { useEffect, useMemo, useState } from 'react';
import { campaignUrl, normalizeText, teamNumber } from './missionModel';
import { createCampaign, getSedeCampaigns, closeCampaign } from './missionService';
import './mission.css';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { OFFICIAL_CALENDAR_URL, parseOfficialCalendar, applyCalendarChanges, findC1Dates } from './missionCalendar';

export default function CampaignGenerator({ missions, defaultSede, defaultEquipo, sedes, getEnrolados, onCreated, onClose }) {
  const initialTeam = teamNumber(defaultEquipo) || '';
  const [sede, setSede] = useState(defaultSede === 'todos' ? '' : defaultSede);
  const [target, setTarget] = useState(initialTeam);
  const [date, setDate] = useState('');
  const [origins, setOrigins] = useState(initialTeam > 3 ? `${initialTeam - 1}, ${initialTeam - 2}, ${initialTeam - 3}` : '');
  const [search, setSearch] = useState('');
  const [chosen, setChosen] = useState({});
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState('');
  const [existing, setExisting] = useState([]);
  const [copied, setCopied] = useState(false);
  const [calendar, setCalendar] = useState(null);
  const [calendarChanges, setCalendarChanges] = useState(null);
  const [calendarError, setCalendarError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch(OFFICIAL_CALENDAR_URL, { signal: controller.signal, cache: 'no-store' })
      .then(r => { if (!r.ok) throw Error('Calendario no disponible'); return r.text(); })
      .then(text => setCalendar(parseOfficialCalendar(text)))
      .catch(e => { if (e.name !== 'AbortError') setCalendarError('No se pudo cargar el calendario oficial. Cierra y vuelve a abrir el generador para reintentar.'); });
    const stop = onSnapshot(collection(db, 'calendario_operativo_publico'), snap => setCalendarChanges(snap.docs.map(d => ({ ...d.data(), id: d.id }))), () => setCalendarError('No se pudieron verificar los cambios de fechas en Causa OS.'));
    return () => { controller.abort(); stop(); };
  }, []);
  const c1Dates = useMemo(() => calendar && calendarChanges ? findC1Dates(applyCalendarChanges(calendar, calendarChanges), sede, target) : [], [calendar, calendarChanges, sede, target]);
  useEffect(() => { setDate(c1Dates.length === 1 ? c1Dates[0].date : ''); setReviewed(false); }, [c1Dates]);
  useEffect(() => {
    setChosen({}); setReviewed(false); setLink(''); setExisting([]);
    let active = true;
    if (sede) getSedeCampaigns(sede).then(rows => { if (active) setExisting(rows); }).catch(() => { if (active) setError('No se pudieron consultar las campañas existentes.'); });
    return () => { active = false; };
  }, [sede]);
  const candidates = useMemo(() => {
    const teams = origins.split(',').map(s => Number(s.trim())).filter(n => n > 0);
    return missions.filter(m => m.schemaVersion !== 2 && normalizeText(m.sede) === normalizeText(sede) && teams.includes(teamNumber(m.equipo)) && (!search || normalizeText(m.imoNombre).includes(normalizeText(search))));
  }, [missions, sede, origins, search]);
  function choose(m, value) {
    setReviewed(false);
    setChosen(previous => {
      const next = { ...previous };
      if (!value) delete next[m.id];
      else next[m.id] = { sourceMissionId: m.id, nombre: m.imoNombre || '', originTeam: m.originTeam || teamNumber(m.equipo) || '', enrolados: getEnrolados(m).map(e => ({ ...e, id: String(e.id || '').replace(/\//g, '_') })) };
      return next;
    });
  }
  function edit(id, field, value) { setReviewed(false); setChosen(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } })); }
  async function generate() {
    setBusy(true); setError(''); setLink(''); setCopied(false);
    try {
      const id = await createCampaign({ sede, targetTeam: Number(target), c1Date: date, assignments: Object.values(chosen) });
      setLink(campaignUrl(id));
      onCreated?.(id);
      setExisting(await getSedeCampaigns(sede));
    } catch (e) { setError(e.message || 'No se pudo generar la campaña.'); }
    finally { setBusy(false); }
  }
  return <div style={{ position: 'fixed', inset: 0, background: '#0f172acc', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}><section className="imo-generator" role="dialog" aria-modal="true" aria-labelledby="imo-generator-title">
    <div className="imo-row"><h2 id="imo-generator-title">Generar enlace de Misión IMO</h2><button disabled={busy} onClick={onClose}>Cerrar</button></div>
    <p>El enlace corresponde al equipo que ingresa a Capítulo Uno. Cada IMO conserva su equipo de origen. Revisa los enrolados antes de generar la campaña. Quien tenga el enlace podrá seleccionar su nombre; comparte el enlace solo con ese grupo.</p>
    <div className="imo-grid">
      <label>Sede<select value={sede} disabled={busy} onChange={e => setSede(e.target.value)}><option value="">Seleccionar</option>{sedes.map(s => <option key={s}>{s}</option>)}</select></label>
      <label>Equipo de ingreso a C1<input type="number" min="1" value={target} disabled={busy} onChange={e => { setTarget(e.target.value); setReviewed(false); if (!Object.keys(chosen).length) setOrigins([1, 2, 3].map(n => Number(e.target.value) - n).filter(n => n > 0).join(', ')); }}/></label>
      <label>Fecha de inicio de C1<select value={date} disabled={busy || !!calendarError || !c1Dates.length} onChange={e => { setDate(e.target.value); setReviewed(false); }}><option value="">{calendar === null || calendarChanges === null ? 'Consultando calendario…' : !c1Dates.length ? 'Sin fecha oficial para esta sede y equipo' : 'Selecciona la fecha oficial'}</option>{c1Dates.map(e => <option key={e.date} value={e.date}>{e.date} · {e.source}</option>)}</select></label>
      <label>Equipos de origen a consultar<input value={origins} placeholder="30, 29, 28" disabled={busy} onChange={e => setOrigins(e.target.value)}/></label>
    </div>
    {calendarError && <p className="imo-error" role="alert">{calendarError}</p>}
    {!calendarError && c1Dates.length === 1 && <p role="status">Fecha precargada desde {c1Dates[0].source}: {date}. Si cambió, actualiza el calendario oficial.</p>}
    <small>Los equipos anteriores son una sugerencia de búsqueda, no una asignación automática. Creación, Relación y Gratitud son fines de semana de MJ; la campaña no deduce el fin de semana a partir del número de equipo. No se reutilizan las confirmaciones de otra campaña.</small>
    <label>Buscar IMO en los registros disponibles<input value={search} placeholder="Nombre del IMO" onChange={e => setSearch(e.target.value)}/></label>
    <p>{candidates.length} registros candidatos · {Object.keys(chosen).length} seleccionados. Solo se incluirán los seleccionados.</p>
    <div style={{ maxHeight: 200, overflow: 'auto' }}>{candidates.slice(0, 80).map(m => <label style={{ display: 'block', padding: 5 }} key={m.id}><input type="checkbox" disabled={busy} checked={!!chosen[m.id]} onChange={e => choose(m, e.target.checked)}/>{m.imoNombre} · Equipo registrado: {m.equipo} · {getEnrolados(m).length} enrolados</label>)}</div>
    {candidates.length > 80 && <small>Acota la búsqueda para ver los demás registros.</small>}
    {!candidates.length && <p>No hay registros de origen que coincidan. Revisa la sede y los equipos, o actualiza las asignaciones en Nodus antes de generar el enlace.</p>}
    {Object.entries(chosen).map(([id, a]) => <article key={id}>
      <div className="imo-row"><strong>{a.nombre}</strong><button disabled={busy} onClick={() => choose({ id }, false)}>Quitar IMO</button></div>
      <div className="imo-grid"><label>Equipo de origen confirmado<input type="number" min="1" value={a.originTeam} disabled={busy} onChange={e => edit(id, 'originTeam', e.target.value)}/></label></div>
      <small>Enrolados que ingresarán al Equipo {target || '…'}. Quita los que no correspondan a este C1.</small>
      {a.enrolados.map(e => <div className="imo-row" key={e.id}><span>{e.nombre} · {e.coordinadora_nombre || 'Coordinación pendiente'}</span><button disabled={busy} onClick={() => edit(id, 'enrolados', a.enrolados.filter(x => x.id !== e.id))}>Quitar</button></div>)}
    </article>)}
    <label style={{ display: 'block', margin: '16px 0' }}><input type="checkbox" checked={reviewed} disabled={busy} onChange={e => setReviewed(e.target.checked)}/>Revisé los equipos de origen y que estos enrolados ingresan al C1 seleccionado. Compartiré el enlace solo con los IMOs de esta campaña.</label>
    <button disabled={busy || !!calendarError || !date || !reviewed || !Object.keys(chosen).length} onClick={generate}>{busy ? 'Guardando campaña…' : 'Generar y guardar enlace'}</button>
    {error && <p className="imo-error" role="alert">{error}</p>}
    {link && <p role="status"><a href={link} target="_blank" rel="noreferrer">{link}</a><br/><button onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setError('No se pudo copiar. Selecciona el enlace y cópialo manualmente.'); } }}>{copied ? 'Enlace copiado' : 'Copiar enlace'}</button></p>}
    <h3>Campañas generadas</h3>{existing.length ? existing.sort((a, b) => b.c1Date.localeCompare(a.c1Date)).map(c => <p key={c.id}><a href={campaignUrl(c.id)} target="_blank" rel="noreferrer">Equipo {c.targetTeam} · {c.sede} · C1 {c.c1Date}</a> · {c.status === 'active' ? 'Activa' : 'Cerrada'} {c.status === 'active' && <button disabled={busy} onClick={async () => { setBusy(true); try { await closeCampaign(c.id); setExisting(await getSedeCampaigns(sede)); } catch { setError('No se pudo cerrar la campaña.'); } finally { setBusy(false); } }}>Cerrar acceso al enlace</button>}</p>) : <p>No hay campañas guardadas para esta sede.</p>}
  </section></div>;
}
