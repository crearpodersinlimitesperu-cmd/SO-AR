import React, { useState, useEffect } from 'react';
import { defaultVenues, getVenueForTraining } from '../data/venuesData';
import { MapPin, Building, Edit, Save, X, CheckCircle2, RotateCcw, Compass } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const OFFICIAL_SEDES = ['Quito', 'Guayaquil', 'Cuenca', 'Lima', 'Medellin', 'Mexico'];

export default function VenueConfigModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const [selectedSede, setSelectedSede] = useState(() => {
    const rawSede = (currentUser?.sede || '').toLowerCase().trim();
    if (rawSede.includes('quito') || rawSede.includes('uio')) return 'Quito';
    if (rawSede.includes('guayaquil') || rawSede.includes('gye')) return 'Guayaquil';
    if (rawSede.includes('cuenca') || rawSede.includes('cue')) return 'Cuenca';
    if (rawSede.includes('medell') || rawSede.includes('med')) return 'Medellin';
    if (rawSede.includes('mex') || rawSede.includes('méx')) return 'Mexico';
    return 'Lima';
  });

  const [venues, setVenues] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cpsl_custom_venues') || '{}');
      const sanitized = {};
      let needsCleanup = false;
      
      // Conservar solo sedes oficiales activas
      for (const sedeKey of OFFICIAL_SEDES) {
        sanitized[sedeKey] = saved[sedeKey] || defaultVenues[sedeKey];
      }

      // Si había sedes obsoletas en localStorage, purgarlas de inmediato
      for (const k of Object.keys(saved)) {
        if (!OFFICIAL_SEDES.includes(k)) {
          needsCleanup = true;
        }
      }

      if (needsCleanup) {
        localStorage.setItem('cpsl_custom_venues', JSON.stringify(sanitized));
      }

      return sanitized;
    } catch (e) {
      return defaultVenues;
    }
  });

  const currentSedeVenue = venues[selectedSede] || defaultVenues[selectedSede] || defaultVenues.Quito || defaultVenues.Lima;

  const [c1Venue, setC1Venue] = useState(currentSedeVenue.c1_venue || '');
  const [c2Venue, setC2Venue] = useState(currentSedeVenue.c2_venue || '');
  const [mjVenue, setMjVenue] = useState(currentSedeVenue.mj_venue || '');
  const [viajeVenue, setViajeVenue] = useState(currentSedeVenue.viaje_venue || '');
  const [address, setAddress] = useState(currentSedeVenue.address || '');

  useEffect(() => {
    const fetchSedeVenue = async () => {
      try {
        const venueDocRef = doc(db, 'venues', selectedSede);
        const snap = await getDoc(venueDocRef);
        if (snap.exists()) {
          const firestoreVenue = snap.data();
          setC1Venue(firestoreVenue.c1_venue || '');
          setC2Venue(firestoreVenue.c2_venue || '');
          setMjVenue(firestoreVenue.mj_venue || '');
          setViajeVenue(firestoreVenue.viaje_venue || '');
          setAddress(firestoreVenue.address || '');
          return;
        }
      } catch (e) {
        // Fallback to local
      }

      const sVenue = venues[selectedSede] || defaultVenues[selectedSede];
      if (sVenue) {
        setC1Venue(sVenue.c1_venue || '');
        setC2Venue(sVenue.c2_venue || '');
        setMjVenue(sVenue.mj_venue || '');
        setViajeVenue(sVenue.viaje_venue || '');
        setAddress(sVenue.address || '');
      }
    };

    fetchSedeVenue();
  }, [selectedSede, venues]);

  const handleSave = async () => {
    const venueData = {
      ...currentSedeVenue,
      sede: selectedSede,
      c1_venue: c1Venue,
      c2_venue: c2Venue,
      mj_venue: mjVenue,
      viaje_venue: viajeVenue,
      address: address,
      updatedBy: currentUser?.email || 'gerente',
      updatedAt: new Date().toISOString()
    };

    const updated = {
      ...venues,
      [selectedSede]: venueData
    };

    setVenues(updated);
    try {
      localStorage.setItem('cpsl_custom_venues', JSON.stringify(updated));
    } catch (e) {}

    try {
      await setDoc(doc(db, 'venues', selectedSede), venueData, { merge: true });
      showToast(`¡Lugares y Salones de entrenamiento para ${selectedSede} actualizados!`, 'success');
      onClose();
    } catch (err) {
      console.error("Could not write venue to Firestore:", err);
      showToast(`Guardado localmente para ${selectedSede}.`, 'success');
      onClose();
    }
  };

  const handleResetDefault = () => {
    const dVenue = defaultVenues[selectedSede] || defaultVenues.Quito;
    if (dVenue) {
      setC1Venue(dVenue.c1_venue);
      setC2Venue(dVenue.c2_venue);
      setMjVenue(dVenue.mj_venue);
      setViajeVenue(dVenue.viaje_venue || '');
      setAddress(dVenue.address);
      showToast(`Valores restaurados a los salones oficiales por defecto.`, 'info');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(3, 7, 18, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '640px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '2rem',
        border: '1px solid rgba(0, 210, 255, 0.3)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 210, 255, 0.15)',
        position: 'relative'
      }}>
        {/* BOTÓN CERRAR */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Building size={28} color="var(--crear-gold)" />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#ffffff' }}>
              Configuración de Hoteles, Salones & El Viaje
            </h2>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              Establece el lugar oficial por defecto o modifícalo según la necesidad
            </p>
          </div>
        </div>

        <hr style={{ borderColor: 'rgba(255, 255, 255, 0.08)', margin: '1.25rem 0' }} />

        {/* SELECTOR DE SEDE */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            Seleccionar Sede a Configurar:
          </label>
          <select
            value={selectedSede}
            onChange={(e) => setSelectedSede(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.9rem',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.4)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              fontSize: '0.95rem',
              fontWeight: 'bold'
            }}
          >
            {OFFICIAL_SEDES.map(s => (
              <option key={s} value={s}>{s === 'Medellin' ? 'Medellín' : s === 'Mexico' ? 'México' : s}</option>
            ))}
          </select>
        </div>

        {/* LUGAR PARA C1 */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '0.35rem' }}>
            <span>🏨 Hotel / Salón para Capítulo 1 (C1):</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--crear-blue)' }}>Por Defecto</span>
          </label>
          <input
            type="text"
            value={c1Venue}
            onChange={(e) => setC1Venue(e.target.value)}
            placeholder="Ej: Hotel José Antonio Deluxe Miraflores"
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(0, 210, 255, 0.25)',
              color: '#ffffff',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* LUGAR PARA C2 */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '0.35rem' }}>
            <span>🏨 Hotel / Salón para Capítulo 2 (C2):</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--crear-blue)' }}>Por Defecto</span>
          </label>
          <input
            type="text"
            value={c2Venue}
            onChange={(e) => setC2Venue(e.target.value)}
            placeholder="Ej: Hotel José Antonio Deluxe Miraflores"
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(0, 210, 255, 0.25)',
              color: '#ffffff',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* LUGAR PARA MJ */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '0.35rem' }}>
            <span>🏨 Hotel / Salón para Maestría del Juego (MJ):</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--role-mj)' }}>Por Defecto</span>
          </label>
          <input
            type="text"
            value={mjVenue}
            onChange={(e) => setMjVenue(e.target.value)}
            placeholder="Ej: Hotel José Antonio Deluxe Miraflores"
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              color: '#ffffff',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* LUGAR PARA EL VIAJE */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '0.35rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24' }}>
              <Compass size={14} /> 🏕️ Lugar / Hostal para "El Viaje" (MJ Viaje):
            </span>
            <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>Especial Retiro</span>
          </label>
          <input
            type="text"
            value={viajeVenue}
            onChange={(e) => setViajeVenue(e.target.value)}
            placeholder="Ej: Hostal Sol y Luna (Cieneguilla, Lima, Perú)"
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(251, 191, 36, 0.35)',
              color: '#ffffff',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* DIRECCIÓN OFICIAL */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            📍 Dirección General de la Sede para Mapas:
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ej: Calle Bellavista 133, Miraflores, Lima, Perú"
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* ACCIONES */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <button
            type="button"
            onClick={handleResetDefault}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RotateCcw size={13} /> Restaurar Oficiales
          </button>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: '0.5rem 1rem' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn-neon-action"
              style={{ padding: '0.5rem 1.4rem' }}
            >
              <Save size={14} />
              <span>Guardar Configuración</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
