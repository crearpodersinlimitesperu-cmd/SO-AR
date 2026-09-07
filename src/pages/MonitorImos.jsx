import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function MonitorImos() {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'imo_missions'), orderBy('startedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setMissions(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching IMO missions:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center" style={{ color: 'var(--crear-gold)' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚡</div>
        <p>Cargando telemetría de IMOs...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in p-8" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
          <span style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
            SISTEMA OPERATIVO CAUSA
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Misión IMO</span>
        </div>
        <h1 className="text-gold" style={{ fontSize: '2.4rem', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
          MONITOR DE IMOS
        </h1>
        <p className="text-muted" style={{ fontSize: '1.05rem', margin: 0 }}>
          Supervisión en tiempo real de los IMOs conectados, sus enrolados y su progreso de llamadas.
        </p>
      </header>

      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid rgba(255, 183, 3, 0.3)' }}>
              <th style={{ padding: '1rem', color: 'var(--crear-gold)', fontSize: '0.85rem' }}>IMO (Nombre)</th>
              <th style={{ padding: '1rem', color: 'var(--crear-gold)', fontSize: '0.85rem' }}>Inicio Misión</th>
              <th style={{ padding: '1rem', color: 'var(--crear-gold)', fontSize: '0.85rem' }}>Avance Enrolados</th>
              <th style={{ padding: '1rem', color: 'var(--crear-gold)', fontSize: '0.85rem' }}>Total Confirmados</th>
              <th style={{ padding: '1rem', color: 'var(--crear-gold)', fontSize: '0.85rem' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {missions.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No hay misiones de IMOs registradas actualmente.
                </td>
              </tr>
            ) : missions.map((m) => {
              const enrolledKeys = Object.keys(m.enrolledStatus || {});
              const totalEnrolled = enrolledKeys.length;
              let confirmed = 0;
              let guaranteed = 0;
              enrolledKeys.forEach(k => {
                if (m.enrolledStatus[k]?.confirmed) confirmed++;
                if (m.enrolledStatus[k]?.guaranteed) guaranteed++;
              });

              const isCompleted = m.missionCompleted;
              const dateStarted = new Date(m.startedAt).toLocaleString();

              return (
                <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{m.imoName || 'Desconocido'}</td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem' }} className="text-muted">{dateStarted}</td>
                  <td style={{ padding: '1rem' }}>
                    <div>Confirmados: {confirmed} / {totalEnrolled}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--crear-blue)' }}>Garantizados: {guaranteed}</div>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 700 }}>
                    {confirmed}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {isCompleted ? (
                      <span style={{ color: '#22c55e', background: 'rgba(34, 197, 94, 0.15)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700 }}>Completado</span>
                    ) : (
                      <span style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700 }}>En Progreso</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
