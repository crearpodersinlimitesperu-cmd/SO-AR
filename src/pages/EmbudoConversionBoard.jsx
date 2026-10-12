import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Users, Activity, CircleHelp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/firebase';

const WORKER_URL = import.meta.env.VITE_COPILOTO_WORKER_URL ||
  'https://so-ar-copiloto.crearpsl-cpsl.workers.dev';

function formatTimestamp(value) {
  if (!value) return 'No disponible';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
}

function knownRate(counts) {
  const known = counts.yes + counts.no;
  return known ? `${((counts.yes / known) * 100).toFixed(1)}%` : 'Sin datos verificables';
}

function CountCard({ label, counts, description }) {
  return (
    <article style={styles.card}>
      <div style={styles.cardLabel}>{label}</div>
      <strong style={styles.count}>{counts.yes}</strong>
      <div style={styles.secondary}>Sí · {counts.no} No · {counts.unknown} Sin dato</div>
      <div style={styles.rate}>Tasa entre {counts.yes + counts.no} estados conocidos: {knownRate(counts)}</div>
      <p style={styles.cardDescription}>{description}</p>
    </article>
  );
}

export default function EmbudoConversionBoard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState('');
  const [selectedSedeId, setSelectedSedeId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [metricsError, setMetricsError] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const callWorker = useCallback(async (path, body) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Inicia sesión en Causa OS para consultar Nodus.');
    const token = await user.getIdToken();
    const response = await fetch(`${WORKER_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? '{}' : JSON.stringify(body)
    });
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error('El servicio de Nodus respondió con un formato no válido.');
    }
    if (!response.ok) throw new Error(result.message || 'No se pudo consultar Nodus.');
    return result;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingCatalog(true);
    setCatalog(null);
    setMetrics(null);
    setCatalogError('');
    setLoadingMetrics(false);
    callWorker('/nodus-json/catalog')
      .then((result) => {
        if (cancelled) return;
        setCatalog(result);
        if (result.scope !== 'general') {
          const firstSede = result.sedes?.[0];
          setSelectedSedeId((current) => current || String(firstSede?.id || ''));
        }
      })
      .catch((error) => {
        if (!cancelled) setCatalogError(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalog(false);
      });
    return () => { cancelled = true; };
  }, [callWorker, currentUser?.uid, refreshKey]);

  const visibleSedes = catalog?.sedes || [];
  const selectedSede = visibleSedes.find((sede) => String(sede.id) === selectedSedeId) || visibleSedes[0];
  const availableTeams = useMemo(() => selectedSede?.equipos || [], [selectedSede]);

  useEffect(() => {
    if (!availableTeams.length) {
      setSelectedTeamId('');
      setMetrics(null);
      setMetricsError('');
      setLoadingMetrics(false);
      return;
    }
    if (!availableTeams.some((team) => String(team.id) === selectedTeamId)) {
      setSelectedTeamId(String(availableTeams[0].id));
    }
  }, [availableTeams, selectedTeamId]);

  useEffect(() => {
    if (!catalog || !selectedTeamId || catalog.scope === 'general') return undefined;
    let cancelled = false;
    setLoadingMetrics(true);
    setMetrics(null);
    setMetricsError('');
    callWorker('/nodus-json/team-metrics', { teamId: Number(selectedTeamId) })
      .then((result) => {
        if (!cancelled) setMetrics(result);
      })
      .catch((error) => {
        if (!cancelled) setMetricsError(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingMetrics(false);
      });
    return () => { cancelled = true; };
  }, [callWorker, catalog?.scope, selectedTeamId]);

  const teamSummary = metrics?.metrics;

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <button type="button" onClick={() => navigate('/home')} style={styles.backButton}>
          <ArrowLeft size={17} /> Volver al tablero
        </button>
        <div style={{ flex: 1 }}>
          <p style={styles.eyebrow}>NODUS · CONSULTA VERIFICADA</p>
          <h1 style={styles.title}>Seguimiento de C1 y C2</h1>
          <p style={styles.subtitle}>Consulta por equipo basada en los estados que Nodus documenta; los datos faltantes se mantienen como desconocidos.</p>
        </div>
        <button type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={loadingCatalog || loadingMetrics} style={styles.refreshButton}>
          <RefreshCw size={16} /> Actualizar
        </button>
      </header>

      {loadingCatalog && <p role="status" style={styles.notice}>Consultando la fuente oficial de Nodus…</p>}
      {catalogError && <div role="alert" style={styles.error}>{catalogError}</div>}

      {catalog && (
        <>
          <section aria-label="Estado de la fuente" style={styles.source}>
            <Activity size={17} />
            <span><strong>Fuente:</strong> API JSON de Nodus</span>
            <span><strong>Generado:</strong> {formatTimestamp(catalog.generatedAt)}</span>
            <span><strong>Recibido:</strong> {formatTimestamp(catalog.retrievedAt)}</span>
          </section>
          <p style={styles.freshnessNote}>La consulta valida la antigüedad de la respuesta. No es un flujo en vivo; vuelve a actualizar para pedir una nueva lectura.</p>

          {catalog.scope === 'general' ? (
            <section style={styles.summaryGrid} aria-label="Indicadores generales Nodus">
              <div style={styles.card}><div style={styles.cardLabel}>Sedes con datos</div><strong style={styles.count}>{catalog.totals.sedes}</strong></div>
              <div style={styles.card}><div style={styles.cardLabel}>Equipos activos</div><strong style={styles.count}>{catalog.totals.equipos}</strong></div>
              <div style={styles.card}><div style={styles.cardLabel}>Participantes reportados por equipo</div><strong style={styles.count}>{catalog.totals.participantes}</strong></div>
              <p style={styles.scopeNote}>Tu vista muestra indicadores generales. El detalle de equipos y participantes está limitado a coordinación de la sede asignada y gerencia.</p>
            </section>
          ) : (
            <>
              <section style={styles.filters} aria-label="Filtros Nodus">
                {catalog.scope === 'global' && (
                  <label style={styles.field}>
                    <span>Sede</span>
                    <select value={selectedSede?.id || ''} onChange={(event) => setSelectedSedeId(event.target.value)} style={styles.select}>
                      {visibleSedes.map((sede) => <option key={sede.id} value={sede.id}>{sede.nombre}</option>)}
                    </select>
                  </label>
                )}
                <label style={styles.field}>
                  <span>Equipo</span>
                  <select value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)} style={styles.select}>
                    {availableTeams.map((team) => <option key={team.id} value={team.id}>{team.nombre}</option>)}
                  </select>
                </label>
                <span style={styles.scopePill}>{catalog.scope === 'global' ? 'Alcance de gerencia' : `Sede asignada: ${selectedSede?.nombre || 'No disponible'}`}</span>
              </section>

              {loadingMetrics && <p role="status" style={styles.notice}>Cargando estados del equipo…</p>}
              {metricsError && <div role="alert" style={styles.error}>{metricsError}</div>}
              {teamSummary && (
                <>
                  <section style={styles.teamHeading}>
                    <div>
                      <p style={styles.eyebrow}>EQUIPO SELECCIONADO</p>
                      <h2 style={styles.teamTitle}>{teamSummary.equipo.nombre}</h2>
                      <p style={styles.subtitle}>{teamSummary.equipo.sede} · {teamSummary.totalParticipantes} participantes activos devueltos por Nodus</p>
                    </div>
                    <span style={styles.sourceBadge}>Respuesta validada</span>
                  </section>
                  <section style={styles.grid} aria-label="Estados de participantes">
                    <CountCard label="C1 · Pago registrado" counts={teamSummary.capitulo1Pagado} description="Cuenta únicamente cuando Nodus registra pagado como sí o no." />
                    <CountCard label="C1 · Asistencia registrada" counts={teamSummary.capitulo1Asistio} description="Asistencia declarada en el estado de Capítulo 1." />
                    <CountCard label="C1 · Deserción registrada" counts={teamSummary.capitulo1Desertor} description="No se interpreta la falta de un valor como ausencia de deserción." />
                    <CountCard label="C2 · Pago registrado" counts={teamSummary.capitulo2Pagado} description="Pago de Capítulo 2; no equivale por sí solo a asistencia." />
                    <CountCard label="Maestría · Estado registrado" counts={teamSummary.maestria} description="Estado que Nodus expone dentro de Capítulo 2; no predice etapas futuras." />
                  </section>
                  <p style={styles.dataNote}><CircleHelp size={15} /> “Sin dato” significa que el campo no llegó como verdadero o falso. Las tasas usan solo estados conocidos y muestran su denominador; no estiman graduación, llamadas ni llegada a etapas que esta API no documenta.</p>
                  <p style={styles.freshnessNote}>Estados del equipo generados por Nodus: {formatTimestamp(metrics.generatedAt)} · recibidos: {formatTimestamp(metrics.retrievedAt)}.</p>
                </>
              )}
              {!loadingMetrics && !metricsError && !availableTeams.length && (
                <p style={styles.notice}><Users size={17} /> No hay equipos activos en la sede disponible.</p>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f4f7fb', color: '#172033', padding: 'clamp(1rem, 3vw, 2.5rem)', fontFamily: 'Inter, system-ui, sans-serif' },
  header: { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' },
  backButton: { display: 'inline-flex', alignItems: 'center', gap: '.5rem', border: '1px solid #d4dce8', borderRadius: 9, background: '#fff', padding: '.65rem .85rem', color: '#34445f', cursor: 'pointer' },
  refreshButton: { display: 'inline-flex', alignItems: 'center', gap: '.5rem', border: 0, borderRadius: 9, background: '#174a78', padding: '.7rem .9rem', color: '#fff', cursor: 'pointer' },
  eyebrow: { margin: '0 0 .35rem', color: '#52718e', fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em' },
  title: { margin: 0, fontSize: 'clamp(1.35rem, 3vw, 2rem)', color: '#183453' },
  subtitle: { margin: '.35rem 0 0', color: '#617087', lineHeight: 1.5 },
  source: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: '#eaf3fa', border: '1px solid #c8ddeb', borderRadius: 10, padding: '.8rem 1rem', color: '#31536e', fontSize: '.85rem' },
  freshnessNote: { margin: '.6rem 0 1.2rem', color: '#718096', fontSize: '.82rem' },
  notice: { display: 'flex', alignItems: 'center', gap: '.5rem', background: '#fff', border: '1px solid #dce4ee', borderRadius: 9, padding: '1rem', color: '#4f6077' },
  error: { border: '1px solid #efc2bd', borderRadius: 9, background: '#fff1ef', padding: '1rem', color: '#8a332c' },
  filters: { display: 'flex', alignItems: 'end', flexWrap: 'wrap', gap: '1rem', margin: '1rem 0 1.5rem', padding: '1rem', background: '#fff', border: '1px solid #e0e6ef', borderRadius: 12 },
  field: { display: 'grid', gap: '.35rem', minWidth: 220, color: '#4c5c72', fontSize: '.82rem', fontWeight: 600 },
  select: { border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', padding: '.65rem .75rem', color: '#23354f', fontSize: '.92rem' },
  scopePill: { marginLeft: 'auto', borderRadius: 999, background: '#edf5ef', padding: '.45rem .7rem', color: '#386344', fontSize: '.8rem' },
  teamHeading: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', margin: '1rem 0' },
  teamTitle: { margin: 0, color: '#183453', fontSize: '1.35rem' },
  sourceBadge: { borderRadius: 999, background: '#e7f4ed', padding: '.45rem .75rem', color: '#31704a', fontSize: '.8rem', fontWeight: 600 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '1rem' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1rem' },
  card: { minWidth: 0, border: '1px solid #e0e6ef', borderRadius: 12, background: '#fff', padding: '1.1rem', boxShadow: '0 2px 8px #19324d0a' },
  cardLabel: { color: '#52657d', fontSize: '.85rem', fontWeight: 650 },
  count: { display: 'block', marginTop: '.65rem', color: '#174a78', fontSize: '2rem', lineHeight: 1.1 },
  secondary: { marginTop: '.5rem', color: '#4f6077', fontSize: '.86rem' },
  rate: { marginTop: '.45rem', color: '#31536e', fontSize: '.82rem', fontWeight: 600 },
  cardDescription: { margin: '.75rem 0 0', color: '#718096', fontSize: '.8rem', lineHeight: 1.45 },
  scopeNote: { gridColumn: '1 / -1', margin: 0, color: '#617087', fontSize: '.86rem' },
  dataNote: { display: 'flex', alignItems: 'flex-start', gap: '.5rem', margin: '1rem 0 0', color: '#53657d', fontSize: '.84rem', lineHeight: 1.5 }
};
