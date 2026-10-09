import React, { useEffect, useMemo, useState } from 'react';
import { campaignUrl, normalizeText, teamNumber } from './missionModel';
import { createCampaign, getSedeCampaigns, closeCampaign } from './missionService';
import './mission.css';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { OFFICIAL_CALENDAR_URL, parseOfficialCalendar, applyCalendarChanges, findC1Dates, calendarSede } from './missionCalendar';
import { buildCampaignCandidates, teamsWithRecords, MAX_CAMPAIGN_IMOS } from './campaignCandidates';

// Helper robusto para resolver sede desde m.sede o m.equipo
function resolveMissionSede(m) {
  let s = m.sede;
  if (!s || s === 'No especificada' || s === 'Sede Global') {
    const eqUpper = (m.equipo || '').toUpperCase();
    if (eqUpper.includes("CUENCA")) s = "Cuenca";
    else if (eqUpper.includes("QUITO")) s = "Quito";
    else if (eqUpper.includes("GUAYAQUIL") || eqUpper.includes("GYE")) s = "Guayaquil";
    else if (eqUpper.includes("LIMA") || eqUpper.includes("LIM")) s = "Lima";
    else if (eqUpper.includes("BOGOTA") || eqUpper.includes("BOGOTÁ")) s = "Bogotá";
    else if (eqUpper.includes("MEDELLIN") || eqUpper.includes("MEDELLÍN")) s = "Medellín";
    else if (eqUpper.includes("MEXICO") || eqUpper.includes("MÉXICO") || eqUpper.includes("CDMX")) s = "México";
    else s = "No especificada";
  }
  return calendarSede(s);
}

// Helper flexible para extraer número de equipo (E30, EQUIPO 30, 30, etc.)
function parseTeamNumber(val) {
  const match = String(val || '').match(/(?:EQUIPO|EQ|E|IMOSE)?[\s\-_]*(\d+)\b/i);
  return match ? Number(match[1]) : null;
}

export default function CampaignGenerator({ missions, defaultSede, defaultEquipo, sedes, getEnrolados, onCreated, onClose }) {
  const initialTeam = parseTeamNumber(defaultEquipo) || '';
  const [sede, setSede] = useState(defaultSede === 'todos' ? 'Lima' : (defaultSede || 'Lima'));
  const [target, setTarget] = useState(initialTeam);
  const [date, setDate] = useState('');
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

  // 1. Cargar calendario oficial y cambios públicos en Causa OS
  useEffect(() => {
    const controller = new AbortController();
    fetch(OFFICIAL_CALENDAR_URL, { signal: controller.signal, cache: 'no-store' })
      .then(r => { if (!r.ok) throw Error('Calendario no disponible'); return r.text(); })
      .then(text => setCalendar(parseOfficialCalendar(text)))
      .catch(e => {
        if (e.name !== 'AbortError') {
          console.warn('Calendario remoto no disponible, usando fallback manual:', e);
        }
      });
    const stop = onSnapshot(collection(db, 'calendario_operativo_publico'), snap => setCalendarChanges(snap.docs.map(d => ({ ...d.data(), id: d.id }))), () => {
      console.warn('No se pudo escuchar calendario_operativo_publico');
    });
    return () => { controller.abort(); stop(); };
  }, []);

  // Eventos activos del calendario con sobreescrituras de Causa OS
  const activeCalendarEvents = useMemo(() => {
    if (!calendar) return [];
    return calendarChanges ? applyCalendarChanges(calendar, calendarChanges) : calendar;
  }, [calendar, calendarChanges]);

  // Lista de todos los C1 oficiales para la sede seleccionada (priorizando las fechas actuales y futuras)
  const sedeC1Options = useMemo(() => {
    if (!activeCalendarEvents.length || !sede) return [];
    const targetSede = calendarSede(sede);
    const map = new Map();
    const todayStr = new Date().toISOString().slice(0, 10);

    for (const e of activeCalendarEvents) {
      if (calendarSede(e.sede) !== targetSede) continue;
      const isC1 = /^(CAPITULO UNO|CAPITULO 1|C1)$/i.test(normalizeText(e.name));
      if (!isC1 || !e.team || !e.date) continue;
      const key = `${e.team}__${e.date}`;
      if (!map.has(key)) {
        map.set(key, { team: Number(e.team), date: e.date, source: e.source, label: `Equipo ${e.team} · Inicio C1: ${e.date}` });
      }
    }

    const allEvents = [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
    // Priorizar eventos futuros o de los últimos 7 días
    const upcomingEvents = allEvents.filter(e => e.date >= todayStr || (() => {
      const diffMs = new Date(todayStr) - new Date(e.date);
      return diffMs >= 0 && diffMs <= 7 * 86400000;
    })());

    return upcomingEvents.length > 0 ? upcomingEvents : allEvents;
  }, [activeCalendarEvents, sede]);

  // Si no hay target seleccionado y hay opciones C1 para esta sede, preseleccionar la próxima oficial
  useEffect(() => {
    if (!target && sedeC1Options.length > 0) {
      const nextOpt = sedeC1Options[0];
      setTarget(nextOpt.team);
      setDate(nextOpt.date);
    }
  }, [sedeC1Options, target]);

  // Fechas coincidentes con target y sede
  const c1Dates = useMemo(() => {
    if (!activeCalendarEvents.length || !sede || !target) return [];
    return findC1Dates(activeCalendarEvents, sede, target);
  }, [activeCalendarEvents, sede, target]);

  // Sincronizar fecha automáticamente si el calendario arroja fecha oficial única
  useEffect(() => {
    if (c1Dates.length === 1 && (!date || !c1Dates.some(c => c.date === date))) {
      setDate(c1Dates[0].date);
      setReviewed(false);
    }
  }, [c1Dates]);

  // Consultar campañas existentes por sede
  useEffect(() => {
    setChosen({}); setReviewed(false); setLink(''); setExisting([]);
    let active = true;
    if (sede) {
      getSedeCampaigns(sede).then(rows => { if (active) setExisting(rows); }).catch(() => {
        if (active) setError('No se pudieron consultar las campañas existentes.');
      });
    }
    return () => { active = false; };
  }, [sede]);

  // Manejar cambio de opción oficial C1 (equipo + fecha simultáneos)
  function handleSelectC1Option(opt) {
    if (!opt) return;
    setTarget(opt.team);
    setDate(opt.date);
    setReviewed(false);
    setChosen({});
  }

  // Candidatos: IMOs cuyos enrolados ingresan al equipo C1 elegido (registros de Nodus),
  // un candidato por IMO aunque Nodus lo haya guardado en varios registros.
  const { candidates, conflicts, phoneConflicts } = useMemo(
    () => buildCampaignCandidates(missions, { sede, targetTeam: target, resolveSede: resolveMissionSede, getEnrolados, search }),
    [missions, sede, target, search, getEnrolados]
  );
  const sedeTeams = useMemo(() => teamsWithRecords(missions, sede, resolveMissionSede, getEnrolados), [missions, sede, getEnrolados]);

  const copyCandidate = c => ({ ...c, enrolados: c.enrolados.map(e => ({ ...e })) });

  function choose(c, value) {
    setReviewed(false);
    setChosen(previous => {
      const next = { ...previous };
      if (!value) delete next[c.id];
      else next[c.id] = copyCandidate(c);
      return next;
    });
  }

  function handleSelectAll(select) {
    setReviewed(false);
    if (!select) {
      setChosen({});
      return;
    }
    const next = { ...chosen };
    candidates.forEach(c => { next[c.id] = copyCandidate(c); });
    setChosen(next);
  }

  function handleSelectTarget(team) {
    setTarget(team);
    setReviewed(false);
    setChosen({});
    const official = sedeC1Options.find(o => Number(o.team) === Number(team));
    setDate(official ? official.date : '');
  }

  function edit(id, field, value) {
    setReviewed(false);
    setChosen(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  // Generación y guardado
  async function generate() {
    setBusy(true); setError(''); setLink(''); setCopied(false);
    try {
      const id = await createCampaign({
        sede,
        targetTeam: Number(target),
        c1Date: date,
        assignments: Object.values(chosen)
      });
      setLink(campaignUrl(id));
      onCreated?.(id);
      setExisting(await getSedeCampaigns(sede));
    } catch (e) {
      setError(e.message || 'No se pudo generar la campaña.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0f172acc', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <section className="imo-generator" role="dialog" aria-modal="true" aria-labelledby="imo-generator-title">
        <div className="imo-row">
          <h2 id="imo-generator-title" style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>Generar enlace de Misión IMO</h2>
          <button type="button" disabled={busy} onClick={onClose} style={{ background: '#475569', padding: '8px 14px' }}>Cerrar</button>
        </div>
        <p style={{ margin: '8px 0 16px', color: '#475569', fontSize: '0.9rem' }}>
          El enlace corresponde al equipo que ingresa a Capítulo Uno. Cada IMO conserva su equipo de origen. Revisa los enrolados antes de generar la campaña. Quien tenga el enlace podrá seleccionar su nombre; comparte el enlace solo con ese grupo.
        </p>

        {/* Acceso Rápido: Próximos Equipos C1 Oficiales */}
        {sedeC1Options.length > 0 && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', display: 'block', marginBottom: '6px' }}>
              🎯 Próximos Equipos de Capítulo Uno en {sede} (Calendario Oficial):
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {sedeC1Options.slice(0, 5).map(opt => {
                const isSelected = Number(target) === Number(opt.team) && date === opt.date;
                return (
                  <button
                    key={`${opt.team}_${opt.date}`}
                    type="button"
                    disabled={busy}
                    onClick={() => handleSelectC1Option(opt)}
                    style={{
                      background: isSelected ? '#16a34a' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#166534',
                      border: isSelected ? '1px solid #15803d' : '1px solid #86efac',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Equipo {opt.team} ({opt.date}) {isSelected ? '✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="imo-grid">
          <label>
            Sede
            <select value={sede} disabled={busy} onChange={e => { setSede(e.target.value); setTarget(''); setDate(''); }}>
              <option value="">Seleccionar</option>
              {sedes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <label>
            Equipo de ingreso a C1
            <input
              type="number"
              min="1"
              value={target}
              placeholder="Ej. 32"
              disabled={busy}
              onChange={e => {
                const val = e.target.value;
                setTarget(val);
                setReviewed(false);
                setChosen({});
              }}
            />
          </label>

          <label>
            Fecha de inicio de C1
            {c1Dates.length > 0 ? (
              <select value={date} disabled={busy} onChange={e => { setDate(e.target.value); setReviewed(false); }}>
                <option value="">Selecciona la fecha oficial</option>
                {c1Dates.map(e => <option key={e.date} value={e.date}>{e.date} · {e.source}</option>)}
              </select>
            ) : (
              <input
                type="date"
                value={date}
                disabled={busy}
                onChange={e => { setDate(e.target.value); setReviewed(false); }}
              />
            )}
          </label>

        </div>

        {c1Dates.length === 1 && (
          <p role="status" style={{ fontSize: '0.82rem', color: '#0369a1', margin: '4px 0 12px' }}>
            ℹ️ Fecha precargada desde {c1Dates[0].source}: <strong>{date}</strong>.
          </p>
        )}

        <small style={{ color: '#64748b', fontSize: '0.8rem', display: 'block', margin: '6px 0 14px' }}>
          Se listan los IMOs cuyos enrolados figuran en Nodus para el Equipo {target || '…'} de {sede}. El equipo de origen de cada IMO se deduce de Nodus cuando el IMO figura como participante de un equipo anterior; si no, queda «por confirmar». No se reutilizan confirmaciones de otras campañas.
        </small>

        {/* Buscador de IMO y botones de selección masiva */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', margin: '10px 0 6px', flexWrap: 'wrap' }}>
          <label style={{ flex: '1 1 240px', margin: 0 }}>
            Buscar IMO en los registros disponibles
            <input
              value={search}
              placeholder="Nombre del IMO o del enrolado..."
              onChange={e => setSearch(e.target.value)}
              style={{ margin: '4px 0 0' }}
            />
          </label>
          <button
            type="button"
            disabled={busy || !candidates.length}
            onClick={() => handleSelectAll(true)}
            style={{ background: '#0284c7', padding: '9px 12px', fontSize: '0.82rem' }}
          >
            Seleccionar todos ({candidates.length})
          </button>
          <button
            type="button"
            disabled={busy || !Object.keys(chosen).length}
            onClick={() => handleSelectAll(false)}
            style={{ background: '#64748b', padding: '9px 12px', fontSize: '0.82rem' }}
          >
            Deseleccionar
          </button>
        </div>

        {sedeTeams.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', margin: '6px 0 10px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
              Equipos de {sede} con enrolados en Nodus:
            </span>
            {sedeTeams.map(ts => {
              const isSelected = Number(target) === ts.team;
              return (
                <button
                  key={`team_btn_${ts.team}`}
                  type="button"
                  disabled={busy}
                  aria-pressed={isSelected}
                  onClick={() => handleSelectTarget(ts.team)}
                  style={{
                    background: isSelected ? '#2563eb' : '#eff6ff',
                    color: isSelected ? '#ffffff' : '#1d4ed8',
                    border: isSelected ? '1px solid #1d4ed8' : '1px solid #bfdbfe',
                    borderRadius: '6px', padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Equipo {ts.team} {isSelected ? '✓' : ''}
                </button>
              );
            })}
          </div>
        )}

        {conflicts.length > 0 && (
          <details style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', padding: '8px 12px', margin: '6px 0 10px', fontSize: '0.8rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#92400e' }}>
              {conflicts.length} enrolado(s) figuran con más de un IMO en Nodus: se mantienen con el registro más reciente. Revisa antes de generar.
            </summary>
            <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
              {conflicts.slice(0, 30).map((c, i) => <li key={i}>{c.enrolado}: queda con {c.keptWith} (no se incluye en {c.skippedFrom})</li>)}
            </ul>
          </details>
        )}
        {phoneConflicts.length > 0 && (
          <details style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '8px', padding: '8px 12px', margin: '6px 0 10px', fontSize: '0.8rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#1e3a8a' }}>
              {phoneConflicts.length} pares de personas comparten un teléfono: se conservaron por separado. Revisa antes de generar.
            </summary>
            <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
              {phoneConflicts.slice(0, 30).map((c, i) => <li key={i}>{c.enrolado} y {c.otherEnrolado} · IMO: {c.imoNombre}</li>)}
            </ul>
          </details>
        )}

        <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: '8px 0' }}>
          {candidates.length} IMOs con enrolados para el Equipo {target || '…'} · {Object.keys(chosen).length} seleccionados (máximo {MAX_CAMPAIGN_IMOS}). Solo se incluirán los seleccionados.
        </p>

        {/* Lista de candidatos con checkbox */}
        <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px 8px', background: '#f8fafc' }}>
          {candidates.slice(0, MAX_CAMPAIGN_IMOS).map(m => (
            <label
              key={m.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 8px',
                borderBottom: '1px solid #f1f5f9',
                cursor: 'pointer',
                fontSize: '0.85rem',
                margin: 0
              }}
            >
              <input
                type="checkbox"
                disabled={busy}
                checked={!!chosen[m.id]}
                onChange={e => choose(m, e.target.checked)}
              />
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{m.nombre}</span>
              <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                · {m.originTeam ? `origen Equipo ${m.originTeam}` : 'origen por confirmar'} · {m.enrolados.length} enrolados
              </span>
            </label>
          ))}
          {candidates.length > MAX_CAMPAIGN_IMOS && (
            <small style={{ padding: '6px', textAlign: 'center', color: '#64748b' }}>
              Se muestran {MAX_CAMPAIGN_IMOS} de {candidates.length} IMOs. Acota la búsqueda por nombre para ver otros.
            </small>
          )}
          {!candidates.length && (
            <p style={{ padding: '16px', color: '#64748b', textAlign: 'center', margin: 0 }}>
              {target ? `Nodus todavía no registra enrolados con IMO para el Equipo ${target} de ${sede}. Cuando la sincronización de Nodus los traiga aparecerán aquí.` : 'Elige el equipo que ingresa a C1.'}
            </p>
          )}
        </div>

        {/* Detalle de IMOs seleccionados */}
        {Object.entries(chosen).length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <h4 style={{ margin: '8px 0', fontSize: '0.95rem' }}>
              IMOs Seleccionados para la Campaña ({Object.keys(chosen).length})
            </h4>
            <div style={{ maxHeight: 200, overflow: 'auto' }}>
              {Object.entries(chosen).map(([id, a]) => (
                <article key={id} style={{ margin: '6px 0', padding: '8px 12px' }}>
                  <div className="imo-row">
                    <strong>{a.nombre}</strong>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => choose({ id }, false)}
                      style={{ background: '#ef4444', padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      Quitar IMO
                    </button>
                  </div>
                  <div className="imo-grid" style={{ margin: '6px 0' }}>
                    <label style={{ fontSize: '0.8rem', margin: 0 }}>
                      Equipo de origen (0 = por confirmar)
                      <input
                        type="number"
                        min="0"
                        value={a.originTeam}
                        disabled={busy}
                        onChange={e => edit(id, 'originTeam', e.target.value)}
                        style={{ margin: '2px 0' }}
                      />
                    </label>
                  </div>
                  <small style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {a.enrolados.length} enrolados que ingresarán al Equipo {target || '…'}.
                  </small>
                </article>
              ))}
            </div>
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '16px 0 12px', fontSize: '0.85rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={reviewed}
            disabled={busy}
            onChange={e => setReviewed(e.target.checked)}
          />
          <span>Revisé los equipos de origen y que estos enrolados ingresan al C1 seleccionado ({sede} · Equipo {target || '…'}).</span>
        </label>

        <button
          type="button"
          disabled={busy || !target || !date || !reviewed || !Object.keys(chosen).length}
          onClick={generate}
          style={{ width: '100%', padding: '12px', fontSize: '0.95rem', background: '#0891b2' }}
        >
          {busy ? 'Guardando campaña…' : 'Generar y guardar enlace'}
        </button>

        {error && <p className="imo-error" role="alert" style={{ marginTop: '10px' }}>{error}</p>}

        {link && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '14px', margin: '16px 0' }}>
            <span style={{ color: '#166534', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              🎉 ¡Enlace de Misión IMO generado con éxito!
            </span>
            <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: '0.9rem', color: '#0284c7', fontWeight: 600 }}>
              {link}
            </a>
            <div style={{ marginTop: '8px' }}>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    setCopied(true);
                  } catch {
                    setError('No se pudo copiar automáticamente. Cópialo manualmente.');
                  }
                }}
                style={{ background: '#16a34a', padding: '6px 12px', fontSize: '0.8rem' }}
              >
                {copied ? '✓ Enlace copiado' : 'Copiar enlace'}
              </button>
            </div>
          </div>
        )}

        <h3 style={{ marginTop: '20px', fontSize: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
          Campañas generadas para {sede}
        </h3>
        {existing.length ? (
          existing.sort((a, b) => (b.c1Date || '').localeCompare(a.c1Date || '')).map(c => (
            <p key={c.id} style={{ fontSize: '0.85rem', margin: '6px 0' }}>
              <a href={campaignUrl(c.id)} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                Equipo {c.targetTeam} · {c.sede} · C1 {c.c1Date}
              </a>{' '}
              · <span style={{ color: c.status === 'active' ? '#16a34a' : '#64748b', fontWeight: 600 }}>{c.status === 'active' ? 'Activa' : 'Cerrada'}</span>{' '}
              {c.status === 'active' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await closeCampaign(c.id);
                      setExisting(await getSedeCampaigns(sede));
                    } catch {
                      setError('No se pudo cerrar la campaña.');
                    } finally {
                      setBusy(false);
                    }
                  }}
                  style={{ background: '#dc2626', padding: '3px 8px', fontSize: '0.75rem', marginLeft: '6px' }}
                >
                  Cerrar acceso
                </button>
              )}
            </p>
          ))
        ) : (
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No hay campañas guardadas para esta sede.</p>
        )}
      </section>
    </div>
  );
}
