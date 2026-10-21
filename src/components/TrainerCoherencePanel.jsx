import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { loadTrainerCoherence, repairTrainerLabel } from '../services/trainerCoherenceService';
import { isCoherenceAdmin } from '../utils/trainerCoherence';

const labels = {
  missing_identity: 'Sin ID/email explícito: revisión manual',
  ambiguous_identity: 'Identidad duplicada', unknown_identity: 'Identidad inexistente',
  conflicting_identity: 'ID y email contradictorios', inactive_trainer: 'Entrenador inactivo',
  unassigned_manager: 'Manager activo sin entrenador', label_mismatch: 'Etiqueta distinta del directorio',
  unlinked_record: 'Sin vínculo explícito al manager', unknown_manager: 'Manager vinculado inexistente',
  missing_scope: 'Falta sede/equipo', scope_mismatch: 'Sede/equipo discrepantes',
  assignment_mismatch: 'Coach de acompañamiento discrepante',
};

export default function TrainerCoherencePanel() {
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(null);
  const [saving, setSaving] = useState(false);
  const allowed = isCoherenceAdmin(currentUser);
  const refresh = async () => {
    setLoading(true);
    setError('');
    try { setReport(await loadTrainerCoherence(currentUser)); }
    catch (err) { setReport(null); setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    if (!allowed) { setReport(null); return; }
    let cancelled = false;
    setLoading(true);
    loadTrainerCoherence(currentUser).then(result => { if (!cancelled) setReport(result); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [allowed, currentUser]);
  if (!allowed) return null;
  const repair = async () => {
    setSaving(true);
    try {
      await repairTrainerLabel(currentUser, pending);
      setPending(null);
      showToast('Etiqueta corregida con auditoría. La asignación y el histórico no se modificaron.', 'success');
      await refresh();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSaving(false); }
  };
  return <section style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12 }}>
    <h2>Coherencia de entrenadores</h2>
    <p>Identidad: directorio Firestore <code>users</code>. Acompañamiento: <code>managers_directory</code>.
      Llamadas: registros publicados de Sheets. FDS: asignaciones por sesión, un rol distinto que no se iguala automáticamente.
      CMJ conserva diagnóstico histórico; no es una asignación de llamadas.</p>
    <p>Solo se comparan identidades explícitas y vínculos por documento + sede/equipo. Sin IDs, se requiere revisión manual.
      No se usan nombres ni catálogos locales para reparar.</p>
    <p>CMJ en este diagnóstico: SEGUIMIENTO_EQUIPOS histórico del repositorio, no asignaciones actuales de NODUS.</p>
    <button onClick={refresh} disabled={loading || saving}>{loading ? 'Consultando…' : 'Actualizar diagnóstico'}</button>
    {error && <p role="alert">No se pudo completar el diagnóstico: {error}</p>}
    {report && <>
      {!report.sessionsAvailable && <p role="status">Asignaciones privadas FDS fuera del permiso de lectura de este perfil; no se incluyeron en el diagnóstico.</p>}
      <p>{Object.entries(report.records).map(([source, count]) => `${source}: ${count}`).join(' · ')}. Lectura actual de Firestore, sin fallback histórico.</p>
      <table style={{ width: '100%', textAlign: 'left' }}>
        <thead><tr><th>Detección (no todas son errores)</th><th>Registros</th></tr></thead>
        <tbody>{Object.entries(report.counts).map(([code, count]) => <tr key={code}><td>{labels[code]}</td><td>{count}</td></tr>)}</tbody>
      </table>
      <h3>Reparaciones inequívocas</h3>
      <p>Solo cambia la etiqueta de un manager activo cuyo entrenadorId apunta a un usuario activo. No cambia IDs, equipos, roles, llamadas ni FDS.</p>
      {report.findings.filter(finding => finding.repair).map((finding, index) => <div key={`${finding.source}-${finding.index}`}>
        Caso {index + 1} · {finding.sede} · Equipo {finding.team || 'sin dato'}
        <button disabled={saving || loading} onClick={() => setPending(finding.repair)}>Revisar etiqueta</button>
      </div>)}
      {!report.findings.some(finding => finding.repair) && <p>No hay etiquetas reparables con identidad suficiente.</p>}
    </>}
    {pending && <div role="dialog" aria-modal="true" aria-label="Confirmar reparación de etiqueta">
      <p>Etiqueta actual: <strong>{pending.before || '(vacía)'}</strong>. Etiqueta del ID en directorio: <strong>{pending.after}</strong>.</p>
      <p>Se volverán a leer ambos documentos y se registrará la operación de forma atómica.</p>
      <button disabled={saving} onClick={repair}>Confirmar reparación auditada</button>
      <button disabled={saving} onClick={() => setPending(null)}>Cancelar</button>
    </div>}
  </section>;
}
