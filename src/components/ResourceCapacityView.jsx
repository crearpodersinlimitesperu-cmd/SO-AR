import React, { useMemo } from 'react';
import { useCycles } from '../context/CyclesContext';
import { User, MapPin } from 'lucide-react';

export default function ResourceCapacityView({ selectedSede }) {
  const { events, loadingEvents } = useCycles();

  const data = useMemo(() => {
    if (!events || events.length === 0) return { trainers: {}, locations: {} };
    
    // Filtro por sede (si no es global)
    let filtered = events.filter(e => e.fecha_inicio || e.start);
    if (selectedSede !== 'GLOBAL') {
      const sCode = selectedSede.substring(0, 3).toUpperCase();
      filtered = filtered.filter(e => {
        const evSede = (e.sede || e.sedeTag || e.place || '').toUpperCase();
        return evSede.includes(sCode) || evSede === sCode || evSede.includes(selectedSede.toUpperCase());
      });
    }

    // Limitar a eventos futuros o recientes (últimos 30 días y futuros 6 meses)
    const today = new Date();
    const minDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const maxDate = new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000);

    filtered = filtered.filter(e => {
      const d = new Date((e.fecha_inicio || e.start).replace('Z', ''));
      return d >= minDate && d <= maxDate;
    });

    const trainers = {};
    const locations = {};

    filtered.forEach(e => {
      if (e.trainer && e.trainer.trim() !== '') {
        const t = e.trainer.trim().toUpperCase();
        if (!trainers[t]) trainers[t] = [];
        trainers[t].push(e);
      }
      
      const loc = (e.lugar || e.direccion || e.sede || 'Sin Asignar').trim().toUpperCase();
      if (!locations[loc]) locations[loc] = [];
      locations[loc].push(e);
    });

    // Ordenar cronológicamente
    Object.values(trainers).forEach(arr => arr.sort((a,b) => new Date(a.fecha_inicio || a.start) - new Date(b.fecha_inicio || b.start)));
    Object.values(locations).forEach(arr => arr.sort((a,b) => new Date(a.fecha_inicio || a.start) - new Date(b.fecha_inicio || b.start)));

    return { trainers, locations };
  }, [events, selectedSede]);

  if (loadingEvents) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando capacidad operativa de Nodus...</div>;
  }

  const bgCard = "#ffffff";
  const borderLight = "#e2e8f0";

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
      
      {/* COLUMNA ENTRENADORES */}
      <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={20} color="#3b82f6" /> Capacidad de Entrenadores
        </h3>
        
        {Object.keys(data.trainers).length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No hay entrenadores programados en el horizonte actual.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {Object.keys(data.trainers).sort().map(trainer => (
              <div key={trainer} style={{ borderLeft: '3px solid #3b82f6', paddingLeft: '1rem' }}>
                <h4 style={{ fontWeight: 700, fontSize: '0.95rem', color: '#334155', marginBottom: '0.5rem' }}>{trainer}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {data.trainers[trainer].map((ev, i) => (
                    <div key={i} style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{ev.nombre} (Eq {ev.equipo}) - {ev.sede}</span>
                      <span style={{ fontWeight: 600 }}>{(ev.fecha_inicio || ev.start).substring(0,10)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* COLUMNA SALAS / LOCACIONES */}
      <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={20} color="#10b981" /> Ocupación de Salas/Sedes
        </h3>
        
        {Object.keys(data.locations).length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No hay locaciones programadas en el horizonte actual.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {Object.keys(data.locations).sort().map(loc => (
              <div key={loc} style={{ borderLeft: '3px solid #10b981', paddingLeft: '1rem' }}>
                <h4 style={{ fontWeight: 700, fontSize: '0.95rem', color: '#334155', marginBottom: '0.5rem' }}>{loc}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {data.locations[loc].map((ev, i) => (
                    <div key={i} style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{ev.nombre} (Eq {ev.equipo})</span>
                      <span style={{ fontWeight: 600 }}>{(ev.fecha_inicio || ev.start).substring(0,10)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
