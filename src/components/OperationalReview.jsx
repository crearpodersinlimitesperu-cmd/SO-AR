import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useCycles } from '../context/CyclesContext';
import { buildOperationalReview, REVIEW_SOURCE } from '../services/operationalReview';

export function OperationalReviewView({ events, snapshot, loading, error, onReload, globalFilterSede = 'Todas', now = Date.now() }) {
  const review = buildOperationalReview(events, snapshot, now);
  const groups = review.sedes.filter(group => globalFilterSede === 'Todas' || group.sede === globalFilterSede);
  return (
    <section className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }} aria-label="Revisión de seis equipos por sede">
      <h2>Últimos seis equipos por sede · evidencia operativa</h2>
      <p>Fuente: {REVIEW_SOURCE}. Publicado: {typeof review.timestamp === 'string' ? review.timestamp : 'Fecha no verificable'} · {review.freshness.label}.</p>
      <p>Período: desde el inicio C1 más antiguo hasta el más reciente de la selección de cada sede.
        Se excluyen futuros; identidad sede + equipo explícito y orden por primera fecha C1 del calendario oficial, no por número global.
        La fecha del snapshot no acredita el período de cada gestión.</p>
      <p>Fer Aragon (CEO) y Paul Sosa (CCO): revisión institucional compartida, no desempeño personal.
        KPI personal, fórmula, meta y período aprobados: <strong>no verificables en estas fuentes</strong>.
        No se les atribuyen los totales de coordinadores ni se usan metas genéricas de gerencia.</p>
      <button type="button" onClick={onReload} disabled={loading}>{loading ? 'Consultando fuentes…' : 'Volver a leer fuentes'}</button>
      {error && <p role="alert">{error} No se certifica cobertura completa.</p>}
      {!loading && !snapshot && !error && <p role="status">No existe snapshot publicado. No equivale a cero actividad.</p>}
      {loading ? <p role="status">Esperando calendario y snapshot; no se muestran conclusiones parciales.</p> : groups.map(group => {
        const evidenced = group.teams.filter(team => team.stages.every(stage => stage.status === 'ready')).length;
        return <section key={group.sede} data-review-sede={group.sede} style={{ marginTop: '1rem' }}>
          <h3>{group.sede}: {group.teams.length}/6 equipos fechados · {evidenced}/6 con reporte C1 y C2 legible</h3>
          <p>Período C1: {group.teams.at(-1)?.start || 'Sin fecha'} — {group.teams[0]?.start || 'Sin fecha'}.
            {' '}{group.missingCalendarTeams > 0 && `Faltan ${group.missingCalendarTeams} equipos en el calendario accesible. `}
            {group.invalidEvents > 0 && `${group.invalidEvents} eventos excluidos por identidad/fecha no verificables. `}
            Cobertura del histórico completo de Nodus: no certificada; el publicador consulta equipos activos.</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left' }}>
              <caption>Reportes por etapa; «Sin dato» nunca significa cero</caption>
              <thead><tr><th>Equipo</th><th>Inicio C1</th><th>Etapa</th><th>Registros</th><th>Confirmados de llamada</th><th>Evidencia</th></tr></thead>
              <tbody>{group.teams.flatMap(team => team.stages.map(stage =>
                <tr key={`${team.team}-${stage.stage}`}>
                  <td>Equipo {team.team}</td><td>{team.start}</td><td>{stage.stage}</td>
                  <td>{stage.rows ?? 'Sin dato'}</td><td>{stage.confirmed ?? 'Sin dato'}</td><td>{stage.label}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>;
      })}
    </section>
  );
}

export default function OperationalReview({ globalFilterSede }) {
  const { events, loadingEvents } = useCycles();
  const [state, setState] = useState({ snapshot: null, loading: true, error: '' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setState({ snapshot: null, loading: true, error: '' });
    getDoc(doc(db, 'nodus_coordinadores_c1c2', 'latest')).then(snapshot => {
      if (!cancelled) setState({ snapshot: snapshot.exists() ? snapshot.data() : null, loading: false, error: '' });
    }).catch(error => {
      console.error('No se pudo leer la revisión operativa:', error);
      if (!cancelled) setState({ snapshot: null, loading: false, error: 'No se pudo leer Nodus; comprueba sesión, permisos o conectividad.' });
    });
    return () => { cancelled = true; };
  }, [revision]);
  return <OperationalReviewView events={events || []} {...state} loading={state.loading || loadingEvents}
    globalFilterSede={globalFilterSede} onReload={() => setRevision(value => value + 1)} />;
}
