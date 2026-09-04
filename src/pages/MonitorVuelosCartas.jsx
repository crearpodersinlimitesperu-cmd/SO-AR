import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import {
  Plane,
  FileText,
  Clock,
  MapPin,
  ExternalLink,
  Copy,
  Search,
  Building,
  Phone,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  User,
  Share2,
  X,
  Compass,
  Car
} from 'lucide-react';

const FALLBACK_TRACKER = {
  updatedAt: "2026-09-03T20:21:23.790Z",
  flights: {
    LA1437: {
      flightNumber: "LA 1437",
      flightCode: "LA1437",
      airline: "LATAM Airlines",
      callsign: "LAN1437",
      reservationCode: "DJBJJD",
      passengers: [
        "Elmer Andrés Idrovo Andrade",
        "María de Lourdes Patiño"
      ],
      route: {
        origin: "UIO",
        originCity: "Quito",
        originAirport: "Aeropuerto Internacional Mariscal Sucre",
        destination: "LIM",
        destinationCity: "Lima",
        destinationAirport: "Aeropuerto Internacional Jorge Chávez",
        isDirect: true,
        stops: 0,
        flightDuration: "2h 15m"
      },
      schedule: {
        departureDate: "2026-09-04",
        scheduledDeparture: "2026-09-04T07:55:00-05:00",
        scheduledArrival: "2026-09-04T10:10:00-05:00",
        estimatedDeparture: "2026-09-04T07:55:00-05:00",
        estimatedArrival: "2026-09-04T10:10:00-05:00",
        actualDeparture: null,
        actualArrival: null
      },
      status: "ON_TIME",
      statusLabel: "A tiempo",
      statusDescription: "Vuelo confirmado y a tiempo para despegue directo UIO → LIM",
      delayMinutes: 0,
      terminal: "T1",
      gate: "Confirmándose en aeropuerto",
      baggageClaim: "Por confirmar en arribo",
      logistics: {
        pickupLocation: "Puerta de Llegadas Internacionales (Aeropuerto Jorge Chávez)",
        destination: "Hotel Jose Antonio Deluxe (Calle Bellavista 133, Miraflores)",
        driverPickupEstimated: "10:35 AM",
        driverNote: "El conductor te contactará 1h antes por WhatsApp con datos del auto y placa oficial."
      },
      radarUrl: "https://www.flightradar24.com/data/flights/la1437",
      checkInUrl: "https://www.latamairlines.com/pe/es/check-in",
      relatedLetters: [
        { name: "Carta Andrés Idrovo", url: "/cartas/carta_andres_idrobo_e30.html" },
        { name: "Carta Lourdes Patiño", url: "/cartas/carta_lourdes_patino_e29.html" }
      ]
    },
    LA1449: {
      flightNumber: "LA 1449",
      flightCode: "LA1449",
      airline: "LATAM Airlines",
      callsign: "LAN1449",
      reservationCode: "DJBJJD",
      passengers: [
        "Elmer Andrés Idrovo Andrade"
      ],
      route: {
        origin: "LIM",
        originCity: "Lima",
        originAirport: "Aeropuerto Internacional Jorge Chávez",
        destination: "UIO",
        destinationCity: "Quito",
        destinationAirport: "Aeropuerto Internacional Mariscal Sucre",
        isDirect: false,
        stops: 1,
        stopover: "Guayaquil (GYE) - Escala de 4h 00m",
        flightDuration: "7h 02m (con escala)"
      },
      schedule: {
        departureDate: "2026-09-06",
        scheduledDeparture: "2026-09-06T23:35:00-05:00",
        scheduledArrival: "2026-09-07T06:37:00-05:00",
        estimatedDeparture: "2026-09-06T23:35:00-05:00",
        estimatedArrival: "2026-09-07T06:37:00-05:00",
        actualDeparture: null,
        actualArrival: null
      },
      status: "ON_TIME",
      statusLabel: "Programado · A tiempo",
      statusDescription: "Vuelo de retorno programado",
      delayMinutes: 0,
      terminal: "T1",
      gate: "Por confirmar",
      baggageClaim: null,
      logistics: {
        pickupLocation: "Lobby del Hotel Jose Antonio Deluxe",
        driverPickupEstimated: "8:30 PM (20:30 hrs)",
        destination: "Aeropuerto Jorge Chávez",
        driverNote: "Recojo 3h antes para vuelo internacional nocturno."
      },
      radarUrl: "https://www.flightradar24.com/data/flights/la1449",
      checkInUrl: "https://www.latamairlines.com/pe/es/check-in",
      relatedLetters: [
        { name: "Carta Andrés Idrovo (Retorno)", url: "/cartas/carta_andres_idrobo_e30.html" }
      ]
    },
    AV108: {
      flightNumber: "AV 108",
      flightCode: "AV108",
      airline: "Avianca",
      callsign: "AVA108",
      reservationCode: "AVCONF",
      passengers: [
        "Alejandro Díaz Pabón"
      ],
      route: {
        origin: "BOG",
        originCity: "Bogotá",
        originAirport: "Aeropuerto Internacional El Dorado",
        destination: "LIM",
        destinationCity: "Lima",
        destinationAirport: "Aeropuerto Internacional Jorge Chávez",
        isDirect: true,
        stops: 0,
        flightDuration: "3h 05m"
      },
      schedule: {
        departureDate: "2026-09-04",
        scheduledDeparture: "2026-09-04T06:15:00-05:00",
        scheduledArrival: "2026-09-04T09:20:00-05:00",
        estimatedDeparture: "2026-09-04T06:15:00-05:00",
        estimatedArrival: "2026-09-04T09:20:00-05:00",
        actualDeparture: null,
        actualArrival: null
      },
      status: "ON_TIME",
      statusLabel: "A tiempo",
      statusDescription: "Vuelo confirmado y a tiempo",
      delayMinutes: 0,
      terminal: "T1",
      gate: "Por confirmar",
      baggageClaim: "Por confirmar",
      logistics: {
        pickupLocation: "Puerta de Llegadas Internacionales (Aeropuerto Jorge Chávez)",
        destination: "Hotel Jose Antonio Deluxe",
        driverPickupEstimated: "09:45 AM",
        driverNote: "Conductor esperará en llegadas internacionales con cartel oficial CPSL."
      },
      radarUrl: "https://www.flightradar24.com/data/flights/av108",
      checkInUrl: "https://www.avianca.com",
      relatedLetters: [
        { name: "Carta Alejandro Díaz", url: "/cartas/carta_alejandro_diaz_e28.html" }
      ]
    }
  }
};

const OFICIAL_LETTERS = [
  {
    id: 'carta-andres-idrovo',
    entrenador: 'Elmer Andrés Idrovo Andrade',
    rol: 'Entrenador Principal',
    equipo: 'Equipo 30 - Creación',
    sede: 'Lima',
    url: '/cartas/carta_andres_idrobo_e30.html',
    badge: 'LATAM DJBJJD',
    fecha: 'Septiembre 2026',
    descripcion: 'Carta oficial de invitación, itinerario de vuelos UIO ➔ LIM (LA 1437) y LIM ➔ UIO (LA 1449), hotel y logística de chofer.',
    vuelos: ['LA 1437', 'LA 1449']
  },
  {
    id: 'carta-lourdes-patino',
    entrenador: 'María de Lourdes Patiño',
    rol: 'Entrenadora de Sala',
    equipo: 'Equipo 29 - Relación',
    sede: 'Lima',
    url: '/cartas/carta_lourdes_patino_e29.html',
    badge: 'LATAM DJBJJD',
    fecha: 'Septiembre 2026',
    descripcion: 'Carta oficial de invitación, itinerario de vuelo internacional UIO ➔ LIM (LA 1437), hospedaje y viáticos de coordinación.',
    vuelos: ['LA 1437']
  },
  {
    id: 'carta-alejandro-diaz',
    entrenador: 'Alejandro Díaz Pabón',
    rol: 'Entrenador Senior',
    equipo: 'Equipo 28 - Gratitud',
    sede: 'Lima',
    url: '/cartas/carta_alejandro_diaz_e28.html',
    badge: 'Avianca AVCONF',
    fecha: 'Septiembre 2026',
    descripcion: 'Carta de facilitación e itinerario de vuelo BOG ➔ LIM (AV 108), transporte en Lima y agenda del fin de semana.',
    vuelos: ['AV 108']
  },
  {
    id: 'carta-julio-narvaez',
    entrenador: 'Julio Narváez',
    rol: 'Entrenador / Facilitador',
    equipo: 'Equipo 28 - El Viaje',
    sede: 'Lima',
    url: '/cartas/julio-narvaez-elviaje-e28.html',
    badge: 'Maestría del Juego',
    fecha: 'Septiembre 2026',
    descripcion: 'Carta de confirmación logística y requerimientos de sala para Maestría del Juego El Viaje.',
    vuelos: []
  },
  {
    id: 'carta-fernando-aragon',
    entrenador: 'Fernando Aragón',
    rol: 'Coach de Transformación',
    equipo: 'CC1 - Transformación',
    sede: 'Lima',
    url: '/cartas/fernando-aragon-c1.html',
    badge: 'CC1 Oficial',
    fecha: 'Agosto - Septiembre 2026',
    descripcion: 'Carta oficial de asignación y cronograma de intervención ontológica para CC1.',
    vuelos: []
  },
  {
    id: 'carta-migraciones-oficial',
    entrenador: 'Superintendencia Nacional de Migraciones (Perú)',
    rol: 'Respaldo Institucional Oficial',
    equipo: 'CREAR PODER SIN LÍMITES S.A.C.',
    sede: 'Aeropuerto Internacional Jorge Chávez',
    url: '/cartas/carta_invitacion_migraciones.html',
    badge: 'Documento Legal Migratorio',
    fecha: 'Oficial 2026',
    descripcion: 'Carta de respaldo institucional, personería jurídica y acreditación oficial de conferencistas extranjeros.',
    vuelos: ['LA 1437', 'AV 108', 'LA 1449']
  }
];

export default function MonitorVuelosCartas() {
  const navigate = useNavigate();
  const { showToast } = useUI();
  const [activeTab, setActiveTab] = useState('radar'); // 'radar' | 'cartas' | 'logistica'
  const [trackerData, setTrackerData] = useState(FALLBACK_TRACKER);
  const [loading, setLoading] = useState(false);
  const [previewLetter, setPreviewLetter] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('ALL');

  const fetchTrackerData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/vuelos_tracker.json?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        setTrackerData(data);
        showToast('Radar de vuelos sincronizado en tiempo real', 'success');
      } else {
        const res2 = await fetch('/cartas/vuelos_tracker.json?t=' + Date.now());
        if (res2.ok) {
          const data2 = await res2.json();
          setTrackerData(data2);
          showToast('Radar de vuelos sincronizado', 'success');
        }
      }
    } catch (e) {
      console.warn('Usando datos de respaldo para tracker de vuelos:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackerData();
  }, []);

  const copyToClipboard = (text, label = 'Información') => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copiado al portapapeles`, 'success');
  };

  const copyDriverBriefing = (flight) => {
    const text = `✈️ *CREAR PODER SIN LÍMITES - BRIEFING DE RECOJO DE ENTRENADOR*\n\n` +
      `📌 *Vuelo:* ${flight.flightNumber} (${flight.airline})\n` +
      `👤 *Pasajero(s):* ${flight.passengers.join(', ')}\n` +
      `🛫 *Ruta:* ${flight.route.originCity} (${flight.route.origin}) ➔ ${flight.route.destinationCity} (${flight.route.destination})\n` +
      `⏰ *Llegada Estimada:* ${new Date(flight.schedule.estimatedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n` +
      `📍 *Punto de Recojo:* ${flight.logistics.pickupLocation}\n` +
      `🏨 *Destino:* ${flight.logistics.destination}\n` +
      `🚗 *Hora Chofer:* ${flight.logistics.driverPickupEstimated}\n` +
      `ℹ️ *Nota:* ${flight.logistics.driverNote}\n` +
      `🔗 *Radar en vivo:* ${flight.radarUrl}`;
    copyToClipboard(text, 'Briefing de WhatsApp para chofer');
  };

  const flightsList = Object.values(trackerData?.flights || {});

  const filteredFlights = flightsList.filter(f => {
    if (routeFilter === 'UIO-LIM' && !(f.route.origin === 'UIO' && f.route.destination === 'LIM')) return false;
    if (routeFilter === 'LIM-UIO' && !(f.route.origin === 'LIM' && f.route.destination === 'UIO')) return false;
    if (routeFilter === 'LIM-GYE' && !(f.route.origin === 'LIM' && f.route.destination === 'GYE')) return false;
    if (routeFilter === 'BOG-LIM' && !(f.route.origin === 'BOG' && f.route.destination === 'LIM')) return false;

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      const matchPax = f.passengers?.some(p => p.toLowerCase().includes(q));
      const matchFlight = f.flightNumber?.toLowerCase().includes(q) || f.flightCode?.toLowerCase().includes(q);
      const matchCity = f.route?.originCity?.toLowerCase().includes(q) || f.route?.destinationCity?.toLowerCase().includes(q) || f.route?.origin?.toLowerCase().includes(q) || f.route?.destination?.toLowerCase().includes(q);
      const matchAirline = f.airline?.toLowerCase().includes(q);
      const matchPnr = f.reservationCode?.toLowerCase().includes(q);
      return matchPax || matchFlight || matchCity || matchAirline || matchPnr;
    }
    return true;
  });

  const filteredLetters = OFICIAL_LETTERS.filter(l => {
    const matchSearch = l.entrenador.toLowerCase().includes(searchFilter.toLowerCase()) ||
      l.equipo.toLowerCase().includes(searchFilter.toLowerCase()) ||
      l.sede.toLowerCase().includes(searchFilter.toLowerCase());
    return matchSearch;
  });

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem', minHeight: '90vh' }}>
      
      {/* HEADER DE PÁGINA */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/home')}
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.8rem',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} /> Volver al Inicio
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
              <span style={{
                background: 'rgba(255, 183, 3, 0.15)',
                color: 'var(--crear-gold)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                letterSpacing: '0.05em'
              }}>
                CREAR PODER SIN LÍMITES
              </span>
              <span style={{
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}>
                LOGÍSTICA DE ENTRENADORES 2026
              </span>
            </div>
            <h1 style={{ fontSize: '2.4rem', margin: '0.2rem 0', fontWeight: 800, color: '#fff' }}>
              ✈️ Monitor de Vuelos y Cartas Oficiales
            </h1>
            <p className="text-muted" style={{ margin: 0, fontSize: '1rem' }}>
              Centro operativo de arribos de conferencistas internacionales, logística de transporte y repositorio oficial de cartas de facilitación.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={fetchTrackerData}
              disabled={loading}
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1rem',
                fontSize: '0.85rem',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Actualizando...' : 'Actualizar Radar'}
            </button>
          </div>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS */}
        <div style={{
          display: 'flex',
          gap: '10px',
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '6px',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)',
          marginTop: '1.5rem'
        }}>
          <button
            onClick={() => setActiveTab('radar')}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'radar' ? 'linear-gradient(135deg, rgba(56,189,248,0.2) 0%, rgba(56,189,248,0.05) 100%)' : 'transparent',
              color: activeTab === 'radar' ? '#38bdf8' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderBottom: activeTab === 'radar' ? '2px solid #38bdf8' : '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <Plane size={18} />
            <span>Radar de Vuelos en Vivo</span>
            <span style={{
              background: '#38bdf8',
              color: '#000',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              {flightsList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cartas')}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'cartas' ? 'linear-gradient(135deg, rgba(255,183,3,0.2) 0%, rgba(255,183,3,0.05) 100%)' : 'transparent',
              color: activeTab === 'cartas' ? 'var(--crear-gold)' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderBottom: activeTab === 'cartas' ? '2px solid var(--crear-gold)' : '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <FileText size={18} />
            <span>Repositorio de Cartas y Migraciones</span>
            <span style={{
              background: 'var(--crear-gold)',
              color: '#000',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              {OFICIAL_LETTERS.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('logistica')}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'logistica' ? 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.05) 100%)' : 'transparent',
              color: activeTab === 'logistica' ? '#34d399' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderBottom: activeTab === 'logistica' ? '2px solid #34d399' : '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <Car size={18} />
            <span>Hotel & Choferes de Sede</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* PESTAÑA 1: RADAR DE VUELOS EN TIEMPO REAL                 */}
      {/* ========================================================= */}
      {activeTab === 'radar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Barra de Filtros y Búsqueda de Vuelos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'ALL', label: `Todos los Vuelos (${flightsList.length})` },
                  { id: 'UIO-LIM', label: 'Quito ➔ Lima (UIO → LIM)' },
                  { id: 'LIM-UIO', label: 'Lima ➔ Quito (LIM → UIO)' },
                  { id: 'LIM-GYE', label: 'Lima ➔ Guayaquil (LIM → GYE)' },
                  { id: 'BOG-LIM', label: 'Bogotá ➔ Lima (BOG → LIM)' }
                ].map(r => (
                  <button
                    key={r.id}
                    onClick={() => setRouteFilter(r.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: routeFilter === r.id ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                      background: routeFilter === r.id ? 'rgba(56,189,248,0.2)' : 'rgba(0,0,0,0.3)',
                      color: routeFilter === r.id ? '#38bdf8' : 'var(--text-muted)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  background: 'rgba(52, 211, 153, 0.15)',
                  color: '#34d399',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }}></span>
                  Drive Sync (7x/día)
                </span>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Sincronizado: <span style={{ color: '#fff' }}>{new Date(trackerData?.updatedAt || Date.now()).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            {/* Input de Búsqueda de Pasajero/Vuelo */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar por entrenador (ej. Elmer Idrobo, María Patiño, Fernando Aragón, Diego Bravo, Carlos Brunis...), vuelo o PNR..."
                style={{
                  width: '100%',
                  padding: '10px 16px 10px 42px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Tarjetas de Vuelos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {filteredFlights.map((flight, idx) => {
              const depTime = new Date(flight.schedule.scheduledDeparture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const arrTime = new Date(flight.schedule.estimatedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={idx}
                  className="glass-panel"
                  style={{
                    padding: '1.8rem',
                    borderTop: '4px solid #38bdf8',
                    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.05) 0%, rgba(7, 13, 31, 0.95) 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.2rem',
                    position: 'relative'
                  }}
                >
                  {/* Encabezado Vuelo */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>
                          {flight.flightNumber}
                        </span>
                        <span style={{
                          background: 'rgba(255,255,255,0.1)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          color: '#e2e8f0',
                          fontWeight: 700
                        }}>
                          {flight.airline}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Reserva: <strong style={{ color: 'var(--crear-gold)' }}>{flight.reservationCode}</strong> • Callsign: {flight.callsign}
                      </div>
                    </div>

                    <span style={{
                      background: flight.status === 'ON_TIME' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: flight.status === 'ON_TIME' ? '#34d399' : '#f87171',
                      border: `1px solid ${flight.status === 'ON_TIME' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 800
                    }}>
                      ● {flight.statusLabel}
                    </span>
                  </div>

                  {/* Pasajeros / Entrenadores */}
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: '0.8rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Entrenador(es) a Bordo:
                    </div>
                    {flight.passengers.map((p, pIdx) => (
                      <div key={pIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                        <User size={15} color="var(--crear-gold)" />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>

                  {/* Ruta y Tiempos */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8' }}>{flight.route.origin}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{flight.route.originCity}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '4px', color: '#fff' }}>{depTime}</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '0 10px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{flight.route.flightDuration}</span>
                      <div style={{
                        width: '100%',
                        height: '2px',
                        background: 'linear-gradient(90deg, #38bdf8 0%, var(--crear-gold) 100%)',
                        position: 'relative',
                        margin: '6px 0'
                      }}>
                        <Plane size={14} style={{ position: 'absolute', top: '-6px', left: '45%', color: 'var(--crear-gold)' }} />
                      </div>
                      <span style={{ fontSize: '0.7rem', color: flight.route.isDirect ? '#10b981' : '#fbbf24', fontWeight: 600 }}>
                        {flight.route.isDirect ? 'Directo' : flight.route.stopover || '1 Escala'}
                      </span>
                    </div>

                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--crear-gold)' }}>{flight.route.destination}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{flight.route.destinationCity}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '4px', color: '#fff' }}>{arrTime}</div>
                    </div>
                  </div>

                  {/* Información Logística de Chofer */}
                  <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0' }}>
                      <MapPin size={14} color="#38bdf8" />
                      <span><strong>Recojo:</strong> {flight.logistics.pickupLocation}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0' }}>
                      <Building size={14} color="var(--crear-gold)" />
                      <span><strong>Destino:</strong> {flight.logistics.destination}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399' }}>
                      <Clock size={14} />
                      <span><strong>Hora Estimada Chofer:</strong> {flight.logistics.driverPickupEstimated}</span>
                    </div>
                  </div>

                  {/* Acciones y Enlaces */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    paddingTop: '1rem'
                  }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a
                        href={flight.radarUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary"
                        style={{
                          flex: 1,
                          fontSize: '0.78rem',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          textDecoration: 'none',
                          color: '#38bdf8',
                          borderColor: 'rgba(56, 189, 248, 0.4)'
                        }}
                      >
                        <Compass size={14} />
                        FlightRadar24
                      </a>

                      <button
                        onClick={() => copyDriverBriefing(flight)}
                        className="btn-secondary"
                        style={{
                          flex: 1,
                          fontSize: '0.78rem',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Share2 size={14} />
                        WhatsApp Chofer
                      </button>
                    </div>

                    {/* Cartas relacionadas directas */}
                    {flight.relatedLetters && flight.relatedLetters.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {flight.relatedLetters.map((rl, rlIdx) => (
                          <button
                            key={rlIdx}
                            onClick={() => setPreviewLetter(rl)}
                            style={{
                              background: 'rgba(255, 183, 3, 0.12)',
                              color: 'var(--crear-gold)',
                              border: '1px solid rgba(255, 183, 3, 0.3)',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <FileText size={12} />
                            {rl.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PESTAÑA 2: REPOSITORIO DE CARTAS Y MIGRACIONES            */}
      {/* ========================================================= */}
      {activeTab === 'cartas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Buscador de Cartas */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ position: 'relative', minWidth: '300px', flex: 1, maxWidth: '500px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar por entrenador, equipo o documento..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Mostrando <strong style={{ color: 'var(--crear-gold)' }}>{filteredLetters.length}</strong> documentos oficiales
            </div>
          </div>

          {/* Grid de Cartas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.2rem' }}>
            {filteredLetters.map(letter => (
              <div
                key={letter.id}
                className="glass-panel"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  borderLeft: '4px solid var(--crear-gold)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '0.5rem' }}>
                    <span style={{
                      background: 'rgba(255, 183, 3, 0.15)',
                      color: 'var(--crear-gold)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      {letter.badge}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {letter.fecha}
                    </span>
                  </div>

                  <h3 style={{ margin: '0.2rem 0', fontSize: '1.2rem', color: '#fff' }}>
                    {letter.entrenador}
                  </h3>

                  <div style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {letter.rol} • <span style={{ color: 'var(--text-muted)' }}>{letter.equipo}</span>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                    {letter.descripcion}
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '8px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  paddingTop: '0.8rem'
                }}>
                  <button
                    onClick={() => setPreviewLetter(letter)}
                    className="btn-primary"
                    style={{
                      flex: 1,
                      fontSize: '0.8rem',
                      padding: '8px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <FileText size={14} />
                    Ver Previa
                  </button>

                  <a
                    href={letter.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                    style={{
                      fontSize: '0.8rem',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      textDecoration: 'none'
                    }}
                  >
                    <ExternalLink size={14} />
                  </a>

                  <button
                    onClick={() => copyToClipboard(window.location.origin + letter.url, 'Enlace de la carta')}
                    className="btn-secondary"
                    style={{
                      fontSize: '0.8rem',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Copiar enlace"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PESTAÑA 3: LOGÍSTICA DE HOTEL Y CHOFERES                  */}
      {/* ========================================================= */}
      {activeTab === 'logistica' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Tarjeta del Hotel Oficial */}
          <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid #10b981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
              <div>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 800
                }}>
                  SEDE OFICIAL DE HOSPEDAJE 2026
                </span>
                <h2 style={{ fontSize: '1.8rem', margin: '0.4rem 0 0', color: '#fff' }}>
                  Hotel Jose Antonio Deluxe
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                  <MapPin size={16} color="var(--crear-gold)" />
                  <span>Calle Bellavista 133, Miraflores, Lima 15074, Perú</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href="https://maps.google.com/?q=Hotel+Jose+Antonio+Deluxe+Miraflores+Lima"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', textDecoration: 'none' }}
                >
                  <MapPin size={15} /> Ver en Google Maps
                </a>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
              background: 'rgba(0,0,0,0.3)',
              padding: '1.2rem',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Check-in / Check-out</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>Check-in: 15:00 | Check-out: 12:00</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>*Coordinado Early Check-in según arribo de vuelo</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Teléfono Recepción</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>(+51 1) 712-4400</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Atención 24 Horas</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Servicios Incluidos</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#34d399', marginTop: '2px' }}>Desayuno Buffet & WiFi Alta Velocidad</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Room Service disponible</div>
              </div>
            </div>
          </div>

          {/* Protocolo de Operación Chofer y Recojo */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.4rem', margin: '0 0 1rem', color: '#fff' }}>
              Protocolo Oficial de Traslado y Bienvenida
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--crear-gold)', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <CheckCircle size={18} />
                  <span>1. Contacto Previo (1h antes)</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                  El chofer asignado contacta al entrenador vía WhatsApp indicando modelo de vehículo, color, número de placa oficial y foto del conductor.
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <MapPin size={18} />
                  <span>2. Punto de Espera en Aeropuerto</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                  Ubicación exacta: <strong>Puerta de Llegadas Internacionales</strong> del Aeropuerto Internacional Jorge Chávez con cartel oficial con la marca <strong>CREAR PODER SIN LÍMITES</strong>.
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <Building size={18} />
                  <span>3. Traslado y Check-in</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                  Traslado directo hacia el Hotel Jose Antonio Deluxe en Miraflores. El equipo de Gerencia de Sede confirma arribo y entrega de llaves.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE PREVISUALIZACIÓN DE CARTAS                       */}
      {/* ========================================================= */}
      {previewLetter && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '1000px',
            height: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid rgba(255,183,3,0.4)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
          }}>
            {/* Header Modal */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.5)'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--crear-gold)', fontWeight: 800, textTransform: 'uppercase' }}>
                  DOCUMENTO OFICIAL CPSL
                </div>
                <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.2rem', color: '#fff' }}>
                  {previewLetter.entrenador || previewLetter.name}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={previewLetter.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                >
                  <ExternalLink size={14} /> Abrir en Pestaña Nueva
                </a>
                <button
                  onClick={() => setPreviewLetter(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Iframe View */}
            <div style={{ flex: 1, background: '#fff' }}>
              <iframe
                src={previewLetter.url}
                title={previewLetter.entrenador || previewLetter.name}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
