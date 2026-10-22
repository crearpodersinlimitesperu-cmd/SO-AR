import { calendarFreshnessText } from '../../public/officialCalendarSource.js';

export default function CalendarFreshness({ status, onRefresh }) {
  return (
    <div style={{ marginBottom: '1rem', fontSize: '0.82rem' }}>
      <p role="status" aria-live="polite">{calendarFreshnessText(status)}</p>
      <button type="button" className="btn-secondary" disabled={status.refreshing} onClick={onRefresh}>
        {status.refreshing ? 'Consultando calendario…' : 'Actualizar calendario'}
      </button>
    </div>
  );
}
