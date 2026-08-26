import { useState, useEffect } from 'react';
import { X, RefreshCcw, CheckCircle2, Info, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChecklist } from '../context/ChecklistContext';

export default function SyncHistoryModal({ isOpen, onClose }) {
  const { currentUser } = useAuth();
  const { fetchSyncHistory } = useChecklist();
  
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadHistory();
    }
  }, [isOpen, currentUser]);

  const loadHistory = async () => {
    setLoading(true);
    const data = await fetchSyncHistory(currentUser.email);
    setHistory(data);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div className="glass-panel" style={{ 
        width: '100%', maxWidth: '500px', padding: '2rem', 
        position: 'relative', border: '1px solid var(--crear-gold)' 
      }}>
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>

        <h3 className="text-gold" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCcw size={20} /> Historial de Sincronización
        </h3>

        <div style={{ marginTop: '1.5rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {loading ? (
            <p className="text-center text-muted" style={{ padding: '2rem 0' }}>Cargando historial...</p>
          ) : history.length === 0 ? (
            <p className="text-center text-muted" style={{ padding: '2rem 0' }}>No hay sincronizaciones recientes registradas.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {history.map(record => {
                const isSuccess = record.status === 'Éxito';
                const dateObj = new Date(record.timestamp);
                const dateStr = dateObj.toLocaleDateString();
                const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={record.id} style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    border: `1px solid ${isSuccess ? 'rgba(34, 197, 94, 0.3)' : 'rgba(41, 171, 226, 0.3)'}`,
                    borderRadius: '8px', 
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem'
                  }}>
                    <div style={{ marginTop: '0.2rem' }}>
                      {isSuccess ? <CheckCircle2 size={20} color="#22c55e" /> : <Info size={20} color="#29abe2" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <span style={{ fontWeight: 'bold', color: isSuccess ? '#22c55e' : '#29abe2', fontSize: '0.9rem' }}>
                          {record.status}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          <Clock size={12} /> {dateStr} a las {timeStr}
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#fff' }}>
                        {record.details}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button onClick={onClose} className="btn-secondary" style={{ width: '100%' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
