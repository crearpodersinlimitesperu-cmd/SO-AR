import React from 'react';
import { useMissionWindow } from './useMissionWindow';

const formatRemaining = value => {
  const seconds = Math.max(0, Math.ceil(value / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
};

export default function MissionWindowNotice({ openedAt, compact = false, notStartedMessage = 'El reloj comenzará al confirmar tu perfil IMO.' }) {
  const window = useMissionWindow(openedAt, !compact);
  if (!window) return <p role="status">{notStartedMessage}</p>;

  const finalDeadline = new Date(window.finalDeadlineMs).toLocaleString('es-PE');
  const startedAt = new Date(window.openedAtMs).toLocaleString('es-PE');
  if (compact) {
    const label = window.phase === 'active' ? 'Plazo inicial' : window.phase === 'extension' ? 'Prórroga automática' : 'Plazo vencido';
    return <small>Inició {startedAt} · {label}: {formatRemaining(window.remainingMs)} · vence {finalDeadline}</small>;
  }

  return <div
    role={window.phase === 'expired' ? 'alert' : 'status'}
    style={{ background: window.phase === 'expired' ? '#fff7ed' : '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 14, margin: '12px 0', display: 'grid', gap: 6 }}
  >
    {window.phase === 'active' && <strong>Tiempo disponible: {formatRemaining(window.remainingMs)}</strong>}
    {window.phase === 'extension' && <strong>Prórroga automática de 1 h 30 min: {formatRemaining(window.remainingMs)}</strong>}
    {window.phase === 'expired' && <strong>El plazo terminó. La misión quedó en solo lectura; lo que ya reportaste se conserva.</strong>}
    <span>Inicio según el servidor: {startedAt} · plazo final: {finalDeadline}</span>
    <small>El reloj empezó al confirmar que eres el IMO seleccionado. No se reinicia al cerrar la página, cambiar de dispositivo o volver al enlace. La hora del servidor es la que permite guardar.</small>
  </div>;
}
