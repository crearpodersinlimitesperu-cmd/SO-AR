import React, { useEffect, useMemo, useState } from 'react';
import { campaignUrl } from './missionModel';
import { getSedeCampaigns } from './missionService';
import { groupCampaignsByTeam } from './publicLinks';
import './mission.css';

export default function PublicLinksPanel({ defaultSede, sedes, onClose }) {
  const [sede, setSede] = useState(defaultSede || sedes[0] || '');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [team, setTeam] = useState(null);
  const [copiedId, setCopiedId] = useState('');

  useEffect(() => {
    setCampaigns([]); setTeam(null); setError('');
    if (!sede) return undefined;
    let active = true;
    setLoading(true);
    getSedeCampaigns(sede)
      .then(rows => { if (active) setCampaigns(rows); })
      .catch(() => { if (active) setError('No se pudieron cargar los enlaces de esta sede.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sede]);

  const groups = useMemo(() => groupCampaignsByTeam(campaigns), [campaigns]);
  const selected = groups.find(g => g.team === team);

  useEffect(() => {
    if (team === null && groups.length) setTeam((groups.find(g => g.hasActive) || groups[0]).team);
  }, [groups, team]);

  const copy = async id => {
    try {
      await navigator.clipboard.writeText(campaignUrl(id));
      setCopiedId(id);
    } catch {
      setError('No se pudo copiar automáticamente. Cópialo manualmente.');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
      <section className="imo-generator" role="dialog" aria-modal="true" aria-labelledby="imo-public-links-title">
        <div className="imo-row">
          <h2 id="imo-public-links-title" style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>Enlaces públicos de Misión IMO</h2>
          <button type="button" onClick={onClose} style={{ background: '#475569', padding: '8px 14px' }}>Cerrar</button>
        </div>

        <label style={{ display: 'block', marginTop: '14px' }}>
          Sede
          <select value={sede} onChange={e => setSede(e.target.value)}>
            <option value="">Seleccionar</option>
            {sedes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>

        {loading && <p role="status">Cargando enlaces…</p>}
        {error && <p className="imo-error" role="alert">{error}</p>}

        {!loading && sede && !groups.length && !error && (
          <p style={{ color: '#64748b' }}>No hay enlaces generados para {sede}. Créalos desde «Link IMO (Linaje)».</p>
        )}

        {groups.length > 0 && (
          <>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: '4px 0 6px' }}>Equipo</p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {groups.map(g => {
                const isSelected = g.team === team;
                return (
                  <button
                    key={g.team}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setTeam(g.team)}
                    style={{
                      background: isSelected ? '#2563eb' : '#eff6ff',
                      color: isSelected ? '#ffffff' : '#1d4ed8',
                      border: isSelected ? '1px solid #1d4ed8' : '1px solid #bfdbfe',
                      padding: '6px 12px', fontSize: '0.82rem', opacity: g.hasActive ? 1 : 0.6,
                    }}
                  >
                    Equipo {g.team}{g.hasActive ? '' : ' (cerrado)'}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {selected && selected.campaigns.map(c => {
          const url = campaignUrl(c.id);
          const isActive = c.status === 'active';
          return (
            <article key={c.id}>
              <div className="imo-row">
                <strong>Equipo {c.targetTeam} · {c.sede} · C1 {c.c1Date || 'sin fecha'}</strong>
                <span style={{ color: isActive ? '#16a34a' : '#64748b', fontWeight: 700, fontSize: '0.82rem' }}>{isActive ? 'Activo' : 'Cerrado'}</span>
              </div>
              <small>{c.count || 0} IMOs en este enlace</small>
              <input readOnly value={url} onFocus={e => e.target.select()} aria-label={`Enlace público del Equipo ${c.targetTeam}`} />
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" disabled={!isActive} onClick={() => copy(c.id)} style={{ background: '#16a34a', padding: '6px 12px', fontSize: '0.8rem' }}>
                  {copiedId === c.id ? '✓ Enlace copiado' : 'Copiar enlace'}
                </button>
                <a href={url} target="_blank" rel="noreferrer" style={{ alignSelf: 'center', fontWeight: 600, fontSize: '0.85rem' }}>Abrir</a>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
