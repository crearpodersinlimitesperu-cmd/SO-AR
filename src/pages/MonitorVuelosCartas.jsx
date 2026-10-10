import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { canAccessMonitorVuelos, canAccessSistemaCartas, canAccessPagosSemanalesDrive } from '../config/permissions';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { FLIGHT_DISCLAIMER, loadFlightTracker, flightTimeWindow, matchesFlightTimeFilter, flightDepartureCountdown } from '../utils/flightMonitor';
import ModuleQuickGuide from '../components/ModuleQuickGuide';
import { flightMonitorGuide } from '../data/logisticsHelpContent';
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
  Car,
  FolderOpen,
  Calendar,
  Globe,
  FileSpreadsheet
} from 'lucide-react';

// Configuración de las 6 Sedes Operativas Oficiales
const SEDES_CONFIG = [
  { id: 'TODAS', label: 'Todas las Sedes', flag: '🌎', code: 'ALL' },
  { id: 'Lima', label: 'Lima', flag: '🇵🇪', code: 'LIM' },
  { id: 'Quito', label: 'Quito', flag: '🇪🇨', code: 'UIO' },
  { id: 'Cuenca', label: 'Cuenca', flag: '🇪🇨', code: 'CUE' },
  { id: 'Guayaquil', label: 'Guayaquil', flag: '🇪🇨', code: 'GYE' },
  { id: 'Medellín', label: 'Medellín', flag: '🇨🇴', code: 'MDE' },
  { id: 'México', label: 'México', flag: '🇲🇽', code: 'MEX' }
];

// Carpetas Oficiales de Google Drive
const DRIVE_REPOSITORIES = [
  {
    name: 'Vuelos y Documentación Entrenadores Multi-Sede',
    desc: 'Carpetas organizadas por sede (Cuenca, Quito, Guayaquil, Medellín, México, Lima) con itinerarios, pases de abordar y documentos oficiales.',
    url: 'https://drive.google.com/drive/folders/1oi7mUG619dQ2ZVzHzUyO5Xkwti-jgDFl?usp=drive_link',
    badge: 'Multi-Sede Ecuador / Colombia / México'
  },
  {
    name: 'Pasajes, Facturas y Logística Aérea General',
    desc: '331+ boletos de avión LATAM/Avianca/Copa, facturas de hospedaje y comprobantes de traslado de todas las sedes.',
    url: 'https://drive.google.com/drive/folders/1i60YXyxRrFP1LxmXUVuHK5eRyeUBzR0r?usp=drive_link',
    badge: 'Facturas & Tickets Oficiales'
  },
  {
    name: 'Planilla Oficial: LLAMADOS MANAGERS (Entrenadores y Sedes)',
    desc: 'Matriz de asignación de llamados, control de tarifas, graduados y desertores sincronizada automáticamente con Causa OS.',
    url: 'https://docs.google.com/spreadsheets/d/1lWAHh1PSAKu9eU6DOBxZExrHMbCYc3f2Sr8GdghNxD0/edit?usp=drive_link',
    badge: 'Google Sheets Sincronizado'
  }
];

// Información Logística Completa de Hoteles, Salones y Choferes por Sede
const SEDES_LOGISTICA = {
  Lima: {
    nombre: 'Lima',
    pais: 'Perú',
    bandera: 'ðŸ‡µðŸ‡ª',
    hotel: 'Hotel Jose Antonio Deluxe Miraflores',
    direccion: 'Calle Bellavista 133, Miraflores, Lima 15074, Perú',
    mapsUrl: 'https://maps.google.com/?q=Hotel+Jose+Antonio+Deluxe+Miraflores+Lima',
    checkIn: '15:00',
    checkOut: '12:00',
    notaCheckIn: 'Coordinado Early Check-in según arribo de vuelo',
    telefono: '(+51 1) 712-4400',
    servicios: 'Desayuno Buffet & WiFi Alta Velocidad • Room Service 24h',
    aeropuerto: 'Aeropuerto Internacional Jorge Chávez (LIM)',
    puntoEspera: 'Puerta de Llegadas Internacionales (Cartel oficial CREAR PODER SIN LÍMITES)',
    salonOficial: 'Hotel José Antonio Deluxe Miraflores (Salones Principales)',
    salonViaje: 'Hostal Sol y Luna (Cieneguilla, Lima)',
    salonCaminata: 'Casona Blanca, C. Las Perdices 1126, Lima'
  },
  Quito: {
    nombre: 'Quito',
    pais: 'Ecuador',
    bandera: 'ðŸ‡ªðŸ‡¨',
    hotel: 'Fortaleza Cuántica / Swissôtel Quito',
    direccion: 'De los Naranjos, 170124 Quito, Ecuador',
    mapsUrl: 'https://maps.google.com/?q=De+los+Naranjos+170124+Quito+Ecuador',
    checkIn: '14:00',
    checkOut: '12:00',
    notaCheckIn: 'Recepción y coordinación de llaves directa con Gerencia de Sede',
    telefono: '(+593 2) 256-7600',
    servicios: 'Salón Plenario Cuántico • Sala VIP Entrenadores • Catering Completo',
    aeropuerto: 'Aeropuerto Internacional Mariscal Sucre (UIO - Tababela)',
    puntoEspera: 'Puerta de Arribos Internacionales / Nacionales UIO (Cartel CPSL)',
    salonOficial: 'CREAR PODER SIN LÍMITES Fortaleza Cuántica (De los Naranjos, Quito)',
    salonViaje: 'Hostería Oficial de Retiro El Viaje (Quito)',
    salonCaminata: 'Zona de Empoderamiento y Fuego (Quito)'
  },
  Cuenca: {
    nombre: 'Cuenca',
    pais: 'Ecuador',
    bandera: 'ðŸ‡ªðŸ‡¨',
    hotel: 'Hotel Oro Verde Cuenca',
    direccion: 'Av. Ordóñez Lasso s/n, Cuenca 010150, Ecuador',
    mapsUrl: 'https://maps.google.com/?q=Hotel+Oro+Verde+Cuenca+Ecuador',
    checkIn: '15:00',
    checkOut: '12:00',
    notaCheckIn: 'Habitaciones ejecutivas asignadas para entrenadores',
    telefono: '(+593 7) 409-0000',
    servicios: 'Restaurante Gourmet • Conexión Fibra Óptica • Traslado Coordinado',
    aeropuerto: 'Aeropuerto Mariscal La Mar (CUE)',
    puntoEspera: 'Hall Principal de Salida de Pasajeros (Aeropuerto CUE)',
    salonOficial: 'Salones de Entrenamiento Oficiales Cuenca',
    salonViaje: 'Centro de Retiro Cuenca (El Viaje)',
    salonCaminata: 'Campo Abierto Cuenca'
  },
  Guayaquil: {
    nombre: 'Guayaquil',
    pais: 'Ecuador',
    bandera: 'ðŸ‡ªðŸ‡¨',
    hotel: 'Hotel Wyndham Guayaquil (Puerto Santa Ana)',
    direccion: 'Calle Numa Pompilio Llona, Ciudad del Río, Puerto Santa Ana, Guayaquil',
    mapsUrl: 'https://maps.google.com/?q=Hotel+Wyndham+Guayaquil+Puerto+Santa+Ana',
    checkIn: '15:00',
    checkOut: '12:00',
    notaCheckIn: 'Vista al río Guayas, check-in express para facilitadores',
    telefono: '(+593 4) 371-7800',
    servicios: 'Desayuno Buffet Ejecutivo • Piscina & Spa • Acceso Puerto Santa Ana',
    aeropuerto: 'Aeropuerto Internacional José Joaquín de Olmedo (GYE)',
    puntoEspera: 'Puerta de Salida Internacional / Nacional (Aeropuerto Olmedo GYE)',
    salonOficial: 'Salón de Eventos y Convenciones Guayaquil',
    salonViaje: 'Hostería Guayaquil (El Viaje)',
    salonCaminata: 'Sede de Campo Guayaquil'
  },
  Medellín: {
    nombre: 'Medellín',
    pais: 'Colombia',
    bandera: '🇨🇴',
    hotel: 'Hotel Dann Carlton Belfort Medellín',
    direccion: 'Cl. 17 #40b-300, El Poblado, Medellín, Antioquia, Colombia',
    mapsUrl: 'https://maps.google.com/?q=Hotel+Dann+Carlton+Belfort+Medellin',
    checkIn: '15:00',
    checkOut: '13:00',
    notaCheckIn: 'Ubicación en El Poblado con acceso rápido por Túnel de Oriente',
    telefono: '(+57 604) 444-5151',
    servicios: 'Desayuno Buffet Paisa & Internacional • Business Center • Piscina',
    aeropuerto: 'Aeropuerto Internacional José María Córdova (MDE - Rionegro)',
    puntoEspera: 'Salida Puerta 1 Llegadas Internacionales / Nacionales MDE',
    salonOficial: 'Salón Principal de Entrenamiento Medellín (El Poblado)',
    salonViaje: 'Finca Campestre de Retiro El Viaje (Antioquia)',
    salonCaminata: 'Espacio Abierto de Transformación Medellín'
  },
  México: {
    nombre: 'México',
    pais: 'México',
    bandera: '🇲🇽',
    hotel: 'Hotel Fiesta Americana Reforma',
    direccion: 'P.º de la Reforma 80, Juárez, Cuauhtémoc, 06600 Ciudad de México, CDMX',
    mapsUrl: 'https://maps.google.com/?q=Hotel+Fiesta+Americana+Reforma+CDMX',
    checkIn: '15:00',
    checkOut: '12:00',
    notaCheckIn: 'Ubicación estratégica sobre Paseo de la Reforma',
    telefono: '(+52 55) 5140-4100',
    servicios: 'Centro de Negocios • Concierge 24h • Room Service de Alta Gama',
    aeropuerto: 'Aeropuerto Internacional Benito Juárez (MEX / AICM)',
    puntoEspera: 'Puerta E1/E2 Llegadas Internacionales Terminal 1 o Terminal 2 (AICM)',
    salonOficial: 'Salones de Capacitación y Eventos CDMX',
    salonViaje: 'Sede Campestre México (El Viaje)',
    salonCaminata: 'Centro de Transformación al Aire Libre CDMX'
  }
};

// Catálogo Completo Multi-Sede de Cartas Oficiales y Documentación Migratoria
const OFICIAL_LETTERS = [

    {
      id: 'carta-andres-creacion-e31',
      entrenador: 'Andrés Idrovo',
      rol: 'Líder Creación',
      equipo: 'Equipo 31 - Creación',
      sede: 'Lima',
      url: '/cartas/carta_andres_idrobo_creacion_e31.html',
      badge: 'N/A',
      fecha: '2026',
      descripcion: 'Carta oficial de bienvenida.',
      vuelos: []
    },
    {
      id: 'carta-lourdes-relacion-e30',
      entrenador: 'Lourdes Patiño',
      rol: 'Líder Relación',
      equipo: 'Equipo 30 - Relación',
      sede: 'Lima',
      url: '/cartas/carta_lourdes_relacion_e30.html',
      badge: 'N/A',
      fecha: '2026',
      descripcion: 'Carta oficial de bienvenida.',
      vuelos: []
    },
    {
      id: 'carta-mike-gratitud-e29',
      entrenador: 'Mike Boada',
      rol: 'Líder Gratitud',
      equipo: 'Equipo 29 - Gratitud',
      sede: 'Lima',
      url: '/cartas/carta_mike_boada_gratitud_e29.html',
      badge: 'SEGURO PENDIENTE',
      fecha: '2026',
      descripcion: 'Carta oficial de bienvenida con condición (Falta Seguro Médico).',
      vuelos: []
    },

  // SEDE LIMA
  {
    id: 'carta-andres-idrovo',
    entrenador: 'Elmer Andrés Idrovo Andrade',
    rol: 'Entrenador Principal',
    equipo: 'Equipo 30 - Creación',
    sede: 'Lima',
    url: '/cartas/carta_andres_idrobo_e30.html',
    badge: 'Volaris DD7FPP',
    fecha: 'Enero - Febrero 2027',
    descripcion: 'Carta oficial de invitación, itinerario de vuelos TIJ ➔ LIM (Y4 181) y LIM ➔ TIJ (Y4 3919), hotel y logística de chofer.',
    vuelos: ['Y4 181', 'Y4 3919']
  },
  {
    id: 'carta-ana-monroy-lim',
    entrenador: 'Ana Elena Monroy Thompson',
    rol: 'Entrenadora',
    equipo: 'Lima 2027',
    sede: 'Lima',
    url: '/cartas/carta_ana_monroy_lim.html',
    badge: 'Volaris DD7FPP',
    fecha: 'Ene - Feb 2027',
    descripcion: 'Carta oficial de invitación, itinerario de vuelos TIJ ? LIM (Y4 181) y LIM ? TIJ (Y4 3919), hotel y logística de chofer.',
    vuelos: ['Y4 181', 'Y4 3919']
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
    fecha: 'Enero - Febrero 2027',
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
    fecha: 'Enero - Febrero 2027',
    descripcion: 'Carta de confirmación logística y requerimientos de sala para Maestría del Juego El Viaje en Cieneguilla.',
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
    fecha: 'Agosto - Enero - Febrero 2027',
    descripcion: 'Carta oficial de asignación y cronograma de intervención ontológica para CC1.',
    vuelos: []
  },
  {
    id: 'carta-migraciones-oficial',
    entrenador: 'Superintendencia Nacional de Migraciones (Perú)',
    rol: 'Respaldo Institucional Oficial',
    equipo: 'Datos de sede: /datos-sedes-cartas',
    sede: 'Lima',
    url: '/cartas/carta_invitacion_migraciones.html?sede=lima',
    badge: 'Documento Legal Migratorio',
    fecha: 'Oficial 2026',
    descripcion: 'Carta de invitación migratoria. La razón social, identificación fiscal, dirección y responsables se leen de la ficha de cada sede en Datos de sedes para cartas.',
    vuelos: ['LA 1437', 'AV 108', 'LA 1449']
  },

  {
    id: 'carpeta-pagos-semanales-lima',
    entrenador: 'Gerencia de Lima (José Sánchez)',
    rol: 'Gerente de Sede',
    equipo: 'PAGOS SEMANALES LIMA',
    sede: 'Lima',
    url: 'https://drive.google.com/drive/folders/1c3wkWITxPTdtvZ41o-MTcftRPkQtmpgi?usp=drive_link',
    badge: 'PAGOS SEMANALES LIMA',
    fecha: 'Acceso Exclusivo Gerente',
    descripcion: 'Carpeta oficial de liquidación y pagos semanales restringida exclusivamente para el Gerente de Lima.',
    vuelos: [],
    soloGerenteLima: true
  },
  // SEDE QUITO
  {
    id: 'carta-mike-boada-uio',
    entrenador: 'Mike Boada',
    rol: 'Entrenador Senior',
    equipo: 'UIO FDS E128 & E129',
    sede: 'Quito',
    url: 'https://drive.google.com/drive/folders/1N64i0WfN_x-WOQ1ULeOIQSADnMw2mSw4',
    badge: 'UIO E128-E129',
    fecha: 'Septiembre - Octubre 2026',
    descripcion: 'Itinerario de vuelos, asignación de salas en Fortaleza Cuántica Quito (De los Naranjos) y agenda logística de entrenadores.',
    vuelos: ['LA 1437', 'LA 1414']
  },
  {
    id: 'carta-mauricio-perez-uio',
    entrenador: 'Mauricio Pérez',
    rol: 'Entrenador de Sala',
    equipo: 'UIO CAP 1 E128',
    sede: 'Quito',
    url: 'https://drive.google.com/drive/folders/1tjYp0VIugfs7hQ3PLTZKqp1oQkWIvRak',
    badge: 'UIO E128',
    fecha: 'Enero - Febrero 2027',
    descripcion: 'Carta de confirmación logística y vuelo hacia Quito (UIO) para entrenamiento CAP 1 en Fortaleza Cuántica.',
    vuelos: ['LA 1429']
  },
  {
    id: 'carta-andres-gomez-uio',
    entrenador: 'Andrés Gómez',
    rol: 'Entrenador de Impacto',
    equipo: 'UIO CAP 2 E128 & Academia',
    sede: 'Quito',
    url: 'https://drive.google.com/drive/folders/1YCq9xVMWZXgD_T7HDrnVn9NnVVz_8W41',
    badge: 'UIO Academia',
    fecha: 'Enero - Febrero 2027',
    descripcion: 'Itinerario de vuelo, agenda de formación en Fortaleza Cuántica y traslado desde aeropuerto Mariscal Sucre (UIO).',
    vuelos: ['LA 1437']
  },
  {
    id: 'carta-cirilo-martinez-uio',
    entrenador: 'Cirilo Martínez',
    rol: 'Facilitador Internacional',
    equipo: 'UIO FDS E124 - E126',
    sede: 'Quito',
    url: 'https://drive.google.com/drive/folders/1Oo7gTTY2F0ciag7oCboaFIpgB08Z61N1',
    badge: 'UIO FDS E126',
    fecha: 'Septiembre - Octubre 2026',
    descripcion: 'Itinerario de vuelos internacionales, agenda en Quito y coordinación logística de hospedaje en Swissôtel Quito.',
    vuelos: ['LA 1414']
  },
  {
    id: 'carta-alonso-solares-uio',
    entrenador: 'Alonso Solares',
    rol: 'Entrenador de Caminata y Fuego',
    equipo: 'UIO Caminata Fuego E125',
    sede: 'Quito',
    url: 'https://drive.google.com/drive/folders/1TzY9oDXpkA485OOuS7TiAYmJWA1qPKOX',
    badge: 'UIO Caminata E125',
    fecha: 'Enero - Febrero 2027',
    descripcion: 'Plan de vuelo Quito, traslado al sitio de Caminata y requerimientos operativos de seguridad para evento de alto impacto.',
    vuelos: ['LA 1429']
  },
  {
    id: 'carta-chuy-acosta-uio',
    entrenador: 'Chuy Acosta',
    rol: 'Entrenador Ontológico',
    equipo: 'UIO Academia & FDS 127',
    sede: 'Quito',
    url: 'https://drive.google.com/drive/folders/1Q9kiTKVKbHDKm4jsi7WboYDk-yj-vQQr',
    badge: 'UIO E127',
    fecha: 'Octubre 2026',
    descripcion: 'Itinerario de vuelos y asignación de sala para FDS 127 en sede Quito Fortaleza Cuántica.',
    vuelos: ['LA 1437']
  },
  {
    id: 'carta-ana-monroy-uio',
    entrenador: 'Ana Elena Monroy Thompson',
    rol: 'Directora Académica Internacional',
    equipo: 'Academia UIO & Formación Kids',
    sede: 'Quito',
    url: 'https://drive.google.com/drive/folders/1cONlxQGyWNmqcYoF2oD4Mmi_pPyH--Jo',
    badge: 'Academia UIO',
    fecha: 'Enero - Febrero 2027',
    descripcion: 'Itinerario oficial de vuelos, traslados y agenda de formación académica en sede Quito.',
    vuelos: ['LA 1414']
  },

  // SEDE CUENCA
  {
    id: 'carta-diego-bravo-cue',
    entrenador: 'Diego Bravo Figueroa',
    rol: 'Entrenador Senior',
    equipo: '4FDS Cuenca Oficial',
    sede: 'Cuenca',
    url: 'https://drive.google.com/drive/folders/1AI57KdM7u572KULm5aE20TpmaaWVj10F',
    badge: 'CUE 4FDS',
    fecha: 'Septiembre - Octubre 2026',
    descripcion: 'Boleto aéreo e itinerario de traslados a Cuenca (CUE), hospedaje en Hotel Oro Verde Cuenca y coordinación de sala.',
    vuelos: ['LA 1414']
  },
  {
    id: 'carta-carlos-brunis-cue',
    entrenador: 'Carlos Brunis',
    rol: 'Entrenador de Sala',
    equipo: '4FDS Cuenca',
    sede: 'Cuenca',
    url: 'https://drive.google.com/drive/folders/1AI57KdM7u572KULm5aE20TpmaaWVj10F',
    badge: 'CUE 4FDS',
    fecha: 'Septiembre - Octubre 2026',
    descripcion: 'Itinerario oficial de vuelo hacia Cuenca Mariscal La Mar (CUE) y hospedaje asignado en Hotel Oro Verde.',
    vuelos: ['LA 1429']
  },
  {
    id: 'carta-mildred-munoz-cue',
    entrenador: 'Mildred Muñoz',
    rol: 'Entrenadora de Alto Impacto',
    equipo: 'CAP 2 CUE E23',
    sede: 'Cuenca',
    url: 'https://drive.google.com/drive/folders/1crElNGKJGrtLG-_BBgqUPjHDn9WsfcyV',
    badge: 'CUE E23',
    fecha: 'Enero - Febrero 2027',
    descripcion: 'Carta de vuelo y agenda logística para entrenamiento CAP 2 en sede Cuenca.',
    vuelos: ['LA 1437']
  },
  {
    id: 'carta-leandro-brunis-cue',
    entrenador: 'Leandro Brunis',
    rol: 'Entrenador de Sala',
    equipo: 'CUE CAP 1 E24',
    sede: 'Cuenca',
    url: 'https://drive.google.com/drive/folders/1vMwDSynVEdK1tiBhPV3u0Y1dk9iQP2LV',
    badge: 'CUE CAP 1',
    fecha: 'Octubre 2026',
    descripcion: 'Itinerario aéreo para sede Cuenca (CUE) y plan de recojo con chofer oficial en aeropuerto Mariscal La Mar.',
    vuelos: ['LA 1414']
  },
  {
    id: 'carta-juan-angel-arreola-cue',
    entrenador: 'Juan Ángel Arreola',
    rol: 'Facilitador Internacional',
    equipo: 'CUE CAP 2 E24',
    sede: 'Cuenca',
    url: 'https://drive.google.com/drive/folders/1X9MROEm3agkqEEbYOFsKD7eAhw3VAjB1',
    badge: 'CUE CAP 2',
    fecha: 'Septiembre - Octubre 2026',
    descripcion: 'Documento oficial de vuelo internacional hacia Cuenca y agenda de intervención transformacional.',
    vuelos: ['LA 1429']
  },
  {
    id: 'carta-andres-idrovo-cue',
    entrenador: 'Elmer Andrés Idrovo Andrade',
    rol: 'Entrenador Principal',
    equipo: 'CUE FDS E21',
    sede: 'Cuenca',
    url: 'https://drive.google.com/drive/folders/1-82Q9FS9s1YOHliXFm4vwiMvxDGoD_7r',
    badge: 'CUE FDS E21',
    fecha: 'Enero - Febrero 2027',
    descripcion: 'Itinerario de vuelo, logística de chofer en aeropuerto Mariscal La Mar y hospedaje en Cuenca.',
    vuelos: ['LA 1437']
  },

  // SEDE GUAYAQUIL
  {
    id: 'carta-mike-boada-gye',
    entrenador: 'Mike Boada',
    rol: 'Entrenador Senior',
    equipo: 'GYE FDS E37',
    sede: 'Guayaquil',
    url: 'https://drive.google.com/drive/folders/1N64i0WfN_x-WOQ1ULeOIQSADnMw2mSw4',
    badge: 'GYE FDS E37',
    fecha: 'Enero - Febrero 2027',
    descripcion: 'Carta de confirmación aérea UIO ➔ GYE, hospedaje en Hotel Wyndham Guayaquil y chofer asignado.',
    vuelos: ['LA 1429']
  },
  {
    id: 'carta-mauricio-perez-gye',
    entrenador: 'Mauricio Pérez',
    rol: 'Entrenador de Sala',
    equipo: 'GYE CAP 1 E38',
    sede: 'Guayaquil',
    url: 'https://drive.google.com/drive/folders/1tjYp0VIugfs7hQ3PLTZKqp1oQkWIvRak',
    badge: 'GYE E38',
    fecha: 'Octubre 2026',
    descripcion: 'Vuelo hacia Guayaquil (GYE), traslado en aeropuerto José Joaquín de Olmedo y agenda operativa.',
    vuelos: ['LA 1414']
  },
  {
    id: 'carta-lourdes-patino-gye',
    entrenador: 'María de Lourdes Patiño',
    rol: 'Entrenadora de Sala',
    equipo: 'GYE FDS E37',
    sede: 'Guayaquil',
    url: 'https://drive.google.com/drive/folders/1LsipQSaorbQSMOdijVFWzu1K-Vs72ZkJ',
    badge: 'GYE FDS E37',
    fecha: 'Enero - Febrero 2027',
    descripcion: 'Itinerario de vuelo Guayaquil, hotel oficial Wyndham en Puerto Santa Ana y protocolo de chofer.',
    vuelos: ['LA 1437']
  },
  {
    id: 'carta-ana-monroy-gye',
    entrenador: 'Ana Elena Monroy Thompson',
    rol: 'Directora Académica',
    equipo: 'GYE FDS E35 & E38',
    sede: 'Guayaquil',
    url: 'https://drive.google.com/drive/folders/1cONlxQGyWNmqcYoF2oD4Mmi_pPyH--Jo',
    badge: 'GYE FDS E38',
    fecha: 'Enero - Febrero 2027',
    descripcion: 'Itinerario de pasaje aéreo Guayaquil, traslados y agenda del fin de semana.',
    vuelos: ['LA 1429']
  },
  {
    id: 'carta-juan-angel-arreola-gye',
    entrenador: 'Juan Ángel Arreola',
    rol: 'Facilitador Internacional',
    equipo: 'GYE CAP 2 E37 / E38',
    sede: 'Guayaquil',
    url: 'https://drive.google.com/drive/folders/1X9MROEm3agkqEEbYOFsKD7eAhw3VAjB1',
    badge: 'GYE CAP 2',
    fecha: 'Enero - Febrero 2027',
    descripcion: 'Boleto aéreo, logística de transporte aeropuerto José Joaquín de Olmedo y hotel oficial.',
    vuelos: ['LA 1414']
  },
  {
    id: 'carta-andres-idrovo-gye',
    entrenador: 'Elmer Andrés Idrovo Andrade',
    rol: 'Entrenador Principal',
    equipo: 'GYE FDS E36',
    sede: 'Guayaquil',
    url: 'https://drive.google.com/drive/folders/1-82Q9FS9s1YOHliXFm4vwiMvxDGoD_7r',
    badge: 'GYE FDS E36',
    fecha: 'Enero - Febrero 2027',
    descripcion: 'Vuelo directo Guayaquil, traslado hacia hotel y salón de entrenamiento oficial.',
    vuelos: ['LA 1437']
  },

  // SEDE MEDELLÍN
  {
    id: 'carta-ana-monroy-mde',
    entrenador: 'Ana Elena Monroy Thompson',
    rol: 'Directora Académica Internacional',
    equipo: 'Medellín Kids & Liderazgo Juvenil',
    sede: 'Medellín',
    url: 'https://drive.google.com/drive/folders/1cONlxQGyWNmqcYoF2oD4Mmi_pPyH--Jo',
    badge: 'MDE Kids Oficial',
    fecha: 'Septiembre - Octubre 2026',
    descripcion: 'Itinerario aéreo hacia Medellín José María Córdova (MDE), hospedaje en Hotel Dann Carlton Belfort y logística de sala.',
    vuelos: ['AV 108']
  },
  {
    id: 'carta-alejandro-diaz-mde',
    entrenador: 'Alejandro Díaz Pabón',
    rol: 'Entrenador Senior',
    equipo: 'Coordinación Colombia',
    sede: 'Medellín',
    url: 'https://drive.google.com/drive/folders/1i60YXyxRrFP1LxmXUVuHK5eRyeUBzR0r',
    badge: 'MDE Conexión',
    fecha: 'Enero - Febrero 2027',
    descripcion: 'Carta oficial de coordinación, vuelos de enlace BOG-MDE-LIM y protocolo de chofer en Rionegro.',
    vuelos: ['AV 108']
  },

  // SEDE MÉXICO
  {
    id: 'carta-lourdes-patino-mex',
    entrenador: 'María de Lourdes Patiño',
    rol: 'Entrenadora Internacional',
    equipo: 'Enlace México - Perú',
    sede: 'México',
    url: 'https://drive.google.com/file/d/1GGakOnjKwxr-tOK7bBijlWpy5Mym2T_9/view?usp=drivesdk',
    badge: 'MEX ➔ LIM',
    fecha: 'Julio - Enero - Febrero 2027',
    descripcion: 'Pasaje aéreo internacional México ➔ Lima, confirmación de vuelo y respaldo institucional de facilitación.',
    vuelos: ['LA 1437']
  },
  {
    id: 'carta-arreola-martinez-mex',
    entrenador: 'Juan Ángel Arreola / Cirilo Martínez',
    rol: 'Facilitadores Internacionales',
    equipo: 'Red Internacional México',
    sede: 'México',
    url: 'https://drive.google.com/drive/folders/1oi7mUG619dQ2ZVzHzUyO5Xkwti-jgDFl',
    badge: 'MEX Internacional',
    fecha: 'Oficial 2026',
    descripcion: 'Carta oficial de acreditación para vuelos internacionales desde Aeropuerto Benito Juárez (MEX).',
    vuelos: ['LA 1437']
  }
];

export default function MonitorVuelosCartas() {
  const navigate = useNavigate();
  const { showToast } = useUI();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('radar'); // 'radar' | 'cartas' | 'logistica'
  const [trackerData, setTrackerData] = useState(null);
  const [asignaciones, setAsignaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackerError, setTrackerError] = useState('');
  const [assignmentError, setAssignmentError] = useState('');
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [now, setNow] = useState(Date.now);
  const fetchingTracker = useRef(false);
  const fetchingAssignments = useRef(false);
  const [previewLetter, setPreviewLetter] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('ALL');
  const [flightStatusFilter, setFlightStatusFilter] = useState('activos');
  
  // Selector de Sede Operativa
  const [selectedSede, setSelectedSede] = useState('TODAS'); // 'TODAS' | 'Lima' | 'Quito' | 'Cuenca' | 'Guayaquil' | 'Medellín' | 'México'
  const [logisticaSede, setLogisticaSede] = useState('Lima');

  const puedeVerRadar = canAccessMonitorVuelos(currentUser);
  const puedeVerCartas = canAccessSistemaCartas(currentUser);

  useEffect(() => {
    if (activeTab === 'radar' && !puedeVerRadar) {
      setActiveTab(puedeVerCartas ? 'cartas' : 'logistica');
    } else if (activeTab === 'cartas' && !puedeVerCartas) {
      setActiveTab(puedeVerRadar ? 'radar' : 'logistica');
    }
  }, [activeTab, puedeVerRadar, puedeVerCartas]);

  const fetchTrackerData = useCallback(async () => {
    if (!puedeVerRadar || fetchingTracker.current) return;
    fetchingTracker.current = true;
    setLoading(true);
    setTrackerError('');
    try {
      setTrackerData(await loadFlightTracker());
      setNow(Date.now());
    } catch (error) {
      setTrackerData(null);
      setTrackerError(error.message);
    } finally {
      setLoading(false);
      fetchingTracker.current = false;
    }
  }, [puedeVerRadar]);

  const fetchAssignments = useCallback(async () => {
    if (!puedeVerRadar || fetchingAssignments.current) return;
    fetchingAssignments.current = true;
    setAssignmentLoading(true);
    setAssignmentError('');
    let timeout;
    try {
      const snap = await Promise.race([
        getDocs(collection(db, 'asignaciones_entrenadores')),
        new Promise((_, reject) => {
          timeout = setTimeout(() => reject(new Error('Tiempo de espera agotado')), 15000);
        })
      ]);
      setAsignaciones(snap.docs.map(doc => doc.data()));
    } catch {
      setAsignaciones([]);
      setAssignmentError('Asignaciones de entrenadores no disponibles. La coordinación puede estar incompleta.');
    } finally {
      clearTimeout(timeout);
      setAssignmentLoading(false);
      fetchingAssignments.current = false;
    }
  }, [puedeVerRadar]);

  useEffect(() => {
    fetchTrackerData();
    fetchAssignments();
  }, [fetchTrackerData, fetchAssignments]);

  useEffect(() => {
    if (!puedeVerRadar) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [puedeVerRadar]);

  useEffect(() => {
    if (!puedeVerRadar || !autoRefresh) return;
    const timer = setInterval(() => {
      if (activeTab === 'radar' && document.visibilityState === 'visible') {
        fetchTrackerData();
        fetchAssignments();
      }
    }, 300000);
    return () => clearInterval(timer);
  }, [autoRefresh, activeTab, puedeVerRadar, fetchTrackerData, fetchAssignments]);

  const refreshMonitor = () => {
    fetchTrackerData();
    fetchAssignments();
  };

  const copyToClipboard = (text, label = 'Información') => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copiado al portapapeles`, 'success');
  };

  // Generador de briefing para chofer adaptado a la sede del vuelo
  const copyDriverBriefing = (flight) => {
    const destCity = flight.route?.destinationCity || 'Lima';
    let matchedSede = Object.keys(SEDES_LOGISTICA).find(s => destCity.toLowerCase().includes(s.toLowerCase()));
    if (!matchedSede) matchedSede = 'Lima';
    const info = SEDES_LOGISTICA[matchedSede];

    const arrivalDate = new Date(flight.schedule?.scheduledArrival);
    const arrivalTime = Number.isFinite(arrivalDate.getTime()) ? arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No disponible';

    const text = `✈️ *CREAR PODER SIN LÍMITES - BRIEFING DE RECOJO DE ENTRENADOR*\n` +
      `📍 *Sede de Llegada:* ${info.nombre} ${info.bandera}\n\n` +
      `📍Œ *Vuelo:* ${flight.flightNumber} (${flight.airline})\n` +
      `ðŸ‘¤ *Pasajero(s):* ${flight.passengers.join(', ')}\n` +
      `ðŸ›« *Ruta:* ${flight.route.originCity} (${flight.route.origin}) ➔ ${flight.route.destinationCity} (${flight.route.destination})\n` +
      `⏰ *Llegada según itinerario:* ${arrivalTime}\n` +
      `📍 *Punto de Recojo:* ${flight.logistics?.pickupLocation || info.puntoEspera}\n` +
      `ðŸ¨ *Destino:* ${info.hotel} (${info.direccion})\n` +
      `ðŸš— *Hora Chofer:* ${flight.logistics?.driverPickupEstimated || '30 min posteriores al aterrizaje'}\n` +
      `ℹ️ *Nota de Protocolo:* ${flight.logistics?.driverNote || 'Conductor esperará en llegadas con cartel oficial CREAR PODER SIN LÍMITES.'}\n` +
      `ℹ️ *Estado:* ${FLIGHT_DISCLAIMER}\n` +
      `🔍— *Radar externo:* ${flight.radarUrl || 'Consultar aerolínea'}`;
    copyToClipboard(text, `Briefing de WhatsApp para chofer (${info.nombre})`);
  };

  const flightsList = Object.values(trackerData?.flights || {});

  // Filtro de vuelos según Sede seleccionada, estado y rutas
  const filteredFlights = flightsList.filter(f => {
    if (!matchesFlightTimeFilter(f, flightStatusFilter, now)) return false;

    // Filtro por Sede seleccionada
    if (selectedSede !== 'TODAS') {
      const sedeNorm = selectedSede.toLowerCase();
      const originMatch = f.route?.originCity?.toLowerCase().includes(sedeNorm) ||
        (selectedSede === 'Lima' && f.route?.origin === 'LIM') ||
        (selectedSede === 'Quito' && f.route?.origin === 'UIO') ||
        (selectedSede === 'Cuenca' && f.route?.origin === 'CUE') ||
        (selectedSede === 'Guayaquil' && f.route?.origin === 'GYE') ||
        (selectedSede === 'Medellín' && f.route?.origin === 'MDE') ||
        (selectedSede === 'México' && f.route?.origin === 'MEX');

      const destMatch = f.route?.destinationCity?.toLowerCase().includes(sedeNorm) ||
        (selectedSede === 'Lima' && f.route?.destination === 'LIM') ||
        (selectedSede === 'Quito' && f.route?.destination === 'UIO') ||
        (selectedSede === 'Cuenca' && f.route?.destination === 'CUE') ||
        (selectedSede === 'Guayaquil' && f.route?.destination === 'GYE') ||
        (selectedSede === 'Medellín' && f.route?.destination === 'MDE') ||
        (selectedSede === 'México' && f.route?.destination === 'MEX');

      if (!originMatch && !destMatch) return false;
    }

    // Filtros rápidos de ruta dinámicos
    if (routeFilter && routeFilter !== 'ALL') {
      const parts = routeFilter.split('-');
      if (parts.length === 2) {
        if (f.route?.origin !== parts[0] || f.route?.destination !== parts[1]) return false;
      }
    }

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
  filteredFlights.sort((a, b) => new Date(a.schedule?.scheduledDeparture || new Date()).getTime() - new Date(b.schedule?.scheduledDeparture || new Date()).getTime());

  // Filtro de cartas según Sede seleccionada y búsqueda
  const filteredLetters = OFICIAL_LETTERS.filter(l => {
    // Si la carta o recurso es exclusivo para Gerente de Lima
    if (l.soloGerenteLima && !canAccessPagosSemanalesDrive(currentUser)) {
      return false;
    }
    if (selectedSede !== 'TODAS') {
      if (l.sede.toLowerCase() !== selectedSede.toLowerCase()) return false;
    }

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchSearch = l.entrenador.toLowerCase().includes(q) ||
        l.equipo.toLowerCase().includes(q) ||
        l.sede.toLowerCase().includes(q) ||
        l.descripcion.toLowerCase().includes(q);
      return matchSearch;
    }
    return true;
  });

  // Obtener rutas rápidas dinámicas según la sede seleccionada
  const getDynamicQuickRoutes = () => {
    if (selectedSede === 'Quito') {
      return [
        { id: 'ALL', label: 'Todos en Quito' },
        { id: 'UIO-LIM', label: 'Quito → Lima' },
        { id: 'LIM-UIO', label: 'Lima → Quito' },
        { id: 'UIO-GYE', label: 'Quito → GYE' },
        { id: 'GYE-UIO', label: 'GYE → Quito' },
        { id: 'UIO-CUE', label: 'Quito → Cuenca' },
        { id: 'CUE-UIO', label: 'Cuenca → Quito' },
        { id: 'BOG-UIO', label: 'Bogotá → Quito' }
      ];
    }
    if (selectedSede === 'Guayaquil') {
      return [
        { id: 'ALL', label: 'Todos en Guayaquil' },
        { id: 'BOG-GYE', label: 'Bogotá → GYE' },
        { id: 'GYE-BOG', label: 'GYE → Bogotá' },
        { id: 'PTY-GYE', label: 'Panamá → GYE' },
        { id: 'GYE-PTY', label: 'GYE → Panamá' },
        { id: 'GYE-UIO', label: 'GYE → Quito' },
        { id: 'UIO-GYE', label: 'Quito → GYE' },
        { id: 'LIM-GYE', label: 'Lima → GYE' }
      ];
    }
    if (selectedSede === 'Medellín') {
      return [
        { id: 'ALL', label: 'Todos en Medellín' },
        { id: 'MDE-BOG', label: 'Medellín → Bogotá' },
        { id: 'UIO-MDE', label: 'Quito → Medellín' },
        { id: 'MDE-LIM', label: 'Medellín → Lima' }
      ];
    }
    if (selectedSede === 'México') {
      return [
        { id: 'ALL', label: 'Todos en México' },
        { id: 'MEX-PTY', label: 'México → Panamá' },
        { id: 'PTY-MEX', label: 'Panamá → México' },
        { id: 'MEX-LIM', label: 'México → Lima' }
      ];
    }
    if (selectedSede === 'Cuenca') {
      return [
        { id: 'ALL', label: 'Todos en Cuenca' },
        { id: 'UIO-CUE', label: 'Quito → Cuenca' },
        { id: 'CUE-UIO', label: 'Cuenca → Quito' }
      ];
    }
    return [
      { id: 'ALL', label: `Todos los Vuelos (${flightsList.length})` },
      { id: 'UIO-LIM', label: 'Quito → Lima' },
      { id: 'LIM-UIO', label: 'Lima → Quito' },
      { id: 'GYE-UIO', label: 'GYE → Quito' },
      { id: 'LIM-GYE', label: 'Lima → GYE' },
      { id: 'BOG-LIM', label: 'Bogotá → Lima' },
      { id: 'MEX-LIM', label: 'México → Lima' }
    ];
  };

  const quickRoutes = getDynamicQuickRoutes();

  return (
    <div className="flight-monitor-page" style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem', minHeight: '90vh' }}>
      
      {/* ENCABEZADO DE PÁGINA */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
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
                LOGÍSTICA DE ENTRENADORES MULTI-SEDE 2026
              </span>
            </div>
            <h1 style={{ fontSize: '2.4rem', margin: '0.2rem 0', fontWeight: 800, color: 'var(--text-heading)' }}>
              Monitor de Vuelos y Cartas Oficiales
            </h1>
            <p className="text-muted" style={{ margin: 0, fontSize: '1rem' }}>
              Centro operativo de arribos de conferencistas internacionales, logística de transporte y repositorio oficial de cartas en todas las sedes operativas.
            </p>
          </div>

          {puedeVerRadar && <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={refreshMonitor}
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
              {loading ? 'Actualizando...' : 'Actualizar itinerarios'}
            </button>
          </div>}
        </div>

        {/* SELECTOR GLOBAL DE SEDE OPERATIVA */}
        <div style={{
          marginTop: '1.2rem',
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={16} color="var(--crear-gold)" /> Sede Operativa:
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {SEDES_CONFIG.map(s => {
              const isSelected = selectedSede === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedSede(s.id);
                    setRouteFilter('ALL');
                    if (s.id !== 'TODAS') {
                      setLogisticaSede(s.id);
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: isSelected ? '1px solid var(--crear-gold)' : '1px solid rgba(255,255,255,0.1)',
                    background: isSelected ? 'linear-gradient(135deg, rgba(255, 183, 3, 0.25) 0%, rgba(255, 183, 3, 0.08) 100%)' : 'rgba(0,0,0,0.3)',
                    color: isSelected ? '#fff' : 'var(--text-muted)',
                    fontWeight: isSelected ? 800 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 0 12px rgba(255, 183, 3, 0.25)' : 'none'
                  }}
                >
                  <span>{s.flag}</span>
                  <span>{s.label}</span>
                </button>
              );
            })}
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
          marginTop: '1.2rem'
        }}>
          {puedeVerRadar && (
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
              <span>Itinerarios de Vuelos</span>
              <span style={{
                background: '#38bdf8',
                color: '#000',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: 800
              }}>
                {filteredFlights.length}
              </span>
            </button>
          )}

          {puedeVerCartas && (
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
              <span>Repositorio de Cartas & Drive</span>
              <span style={{
                background: 'var(--crear-gold)',
                color: '#000',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: 800
              }}>
                {filteredLetters.length}
              </span>
            </button>
          )}

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
      {activeTab === 'radar' && puedeVerRadar && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <ModuleQuickGuide guide={flightMonitorGuide} />
          
          {/* Barra de Filtros y Búsqueda de Vuelos */}
          <div className="flight-filters" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'activos', label: 'Próximos / En horario estimado' },
                  { id: 'pasados', label: 'Pasados' },
                  { id: 'todos', label: 'Todos' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setFlightStatusFilter(t.id)}
                    className="flight-filter-chip"
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: flightStatusFilter === t.id ? '#10b981' : 'rgba(255,255,255,0.1)',
                      background: flightStatusFilter === t.id ? 'rgba(16,185,129,0.2)' : 'rgba(0,0,0,0.3)',
                      color: flightStatusFilter === t.id ? '#10b981' : 'var(--text-muted)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {quickRoutes.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setRouteFilter(r.id)}
                    className="flight-filter-chip"
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
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  Itinerarios: {flightsList.filter(f => flightTimeWindow(f, now) === 'upcoming').length} próximos · {flightsList.filter(f => flightTimeWindow(f, now) === 'estimated').length} en horario estimado
                </span>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Itinerarios sincronizados desde Drive · Última sincronización: <span style={{ color: 'var(--text-main)' }}>{trackerData ? new Date(trackerData.updatedAt).toLocaleString() : 'No disponible'}</span>
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
                placeholder="Buscar entrenador, vuelo o código de reserva (PNR)…"
                style={{
                  width: '100%',
                  padding: '10px 16px 10px 42px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '0.9rem'
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
                    cursor: 'pointer'
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <p>{FLIGHT_DISCLAIMER}. Los horarios no confirman despegue ni aterrizaje.</p>
          <label>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            {' '}Actualizar automáticamente cada 5 minutos (panel visible)
          </label>
          {assignmentLoading && <p role="status">Cargando asignaciones; los itinerarios pueden consultarse independientemente.</p>}
          {assignmentError && <div role="alert"><p>{assignmentError}</p><button onClick={fetchAssignments} disabled={assignmentLoading}>Reintentar asignaciones</button></div>}
          {/* Grid de Vuelos */}
          {loading ? (
            <div className="glass-panel animate-pulse" role="status" aria-busy="true" style={{ padding: '3rem' }}>Cargando itinerarios…</div>
          ) : trackerError ? (
            <div className="glass-panel" role="alert" style={{ padding: '2rem' }}>
              <p>{trackerError}</p>
              <button onClick={refreshMonitor}>Reintentar</button>
            </div>
          ) : filteredFlights.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
              <Plane size={48} style={{ opacity: 0.3, margin: '0 auto 1rem', display: 'block' }} />
              <h3 style={{ margin: '0 0 0.5rem', color: '#fff' }}>No se encontraron vuelos</h3>
              <p className="text-muted" style={{ margin: 0 }}>
                {selectedSede !== 'TODAS'
                  ? `No hay vuelos registrados para la sede ${selectedSede} con los filtros aplicados.`
                  : 'No hay vuelos con los filtros o búsqueda actuales.'}
              </p>
            </div>
          ) : (
            <div className="flight-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.2rem' }}>
              {filteredFlights.map((flight, idx) => {
                const schedDep = new Date(flight.schedule?.scheduledDeparture);
                const countdown = flightDepartureCountdown(flight, now);
                
                // Match exacto
                const matchedAsignaciones = (asignaciones || []).filter(asig => 
                  (flight.passengers || []).some(p => 
                    asig.entrenador && p && asig.entrenador.toLowerCase().includes(p.toLowerCase().split(' ')[0])
                  )
                );

                // Motor de Inferencia (Heurística)
                let suggestedAsignaciones = [];
                if (matchedAsignaciones.length === 0) {
                    suggestedAsignaciones = (asignaciones || []).filter(asig => {
                        let matchScore = 0;
                        const asigSede = (asig.sede || '').toLowerCase();
                        const flightDest = (flight.route?.destinationCity || '').toLowerCase();
                        const flightOrig = (flight.route?.originCity || '').toLowerCase();
                        
                        // Validacion Geográfica
                        if (asigSede && (flightDest.includes(asigSede) || flightOrig.includes(asigSede))) {
                            matchScore += 1;
                        }

                        // Deteccion de subcadenas (Identidad Relativa)
                        const passMatch = (flight.passengers || []).some(p => {
                           const pParts = p.toLowerCase().split(' ');
                           const eLower = (asig.entrenador || '').toLowerCase();
                           // Coincide si el nombre o apellido parcial está en la carta, ignorando "de", "la" etc
                           return pParts.some(part => part.length >= 3 && eLower.includes(part));
                        });
                        
                        // Si hay match de pasajero, ya es sugerible, si ademas coincide ciudad, es match fuerte
                        if (passMatch) matchScore += 2;

                        return matchScore >= 2;
                    });
                }

                const getAirlineUrl = (airline) => {
                    const normalized = (airline || '').toLowerCase();
                    if (normalized.includes('latam')) return 'https://www.latamairlines.com/ec/es/mis-viajes';
                    if (normalized.includes('avianca')) return 'https://www.avianca.com/es/tu-reserva/check-in/';
                    if (normalized.includes('copa')) return 'https://www.copaair.com/es-gs/check-in/';
                    if (normalized.includes('aerogal')) return 'https://www.avianca.com/es/tu-reserva/check-in/';
                    if (normalized.includes('equair')) return 'https://www.equair.com/';
                    if (normalized.includes('klm')) return 'https://www.klm.com.ec/check-in';
                    return `https://www.google.com/search?q=${encodeURIComponent(airline + ' check in')}`;
                };

                return (
                  <div
                    key={idx}
                    className="glass-panel flight-card"
                    style={{
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderLeft: '4px solid #38bdf8',
                      transition: 'all 0.2s ease',
                      gap: '1rem'
                    }}
                  >
                    <div>
                      <div className="flight-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div className="flight-card-date">
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fecha y Hora</div>
                          <div className="flight-card-date-value" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            {Number.isFinite(schedDep.getTime()) ? `${schedDep.toLocaleDateString([], { timeZone: 'America/Guayaquil' })} ${schedDep.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'America/Guayaquil' })}` : 'Fecha no disponible'}
                          </div>
                        </div>
                        <div className="flight-status-wrap">
                          <span className="flight-status-badge" style={{
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: 700
                          }}>
                            {flightTimeWindow(flight, now) === 'estimated' ? 'En horario estimado' : flight.statusLabel}
                          </span>
                        </div>
                      </div>

                      <div className="flight-departure-countdown" style={{
                        background: 'rgba(56,189,248,0.08)',
                        border: '1px solid rgba(56,189,248,0.25)',
                        padding: '0.85rem 1rem',
                        borderRadius: '12px',
                        marginBottom: '1rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-main)', marginBottom: '6px' }}>
                          <Clock size={16} aria-hidden="true" />
                          Hasta la salida programada
                        </div>
                        <div role="timer" aria-live="off" aria-label={`Hasta la salida programada: ${countdown.text}`} style={{
                          fontSize: '1.15rem',
                          fontWeight: 800,
                          fontVariantNumeric: 'tabular-nums',
                          color: countdown.state === 'upcoming' ? '#38bdf8' : 'var(--text-main)',
                          overflowWrap: 'anywhere'
                        }}>
                          {countdown.text}
                        </div>
                      </div>

                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aerolínea</div>
                            <div style={{ fontSize: '0.95rem', color: '#38bdf8', fontWeight: 600 }}>{flight.airline || 'N/A'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Código de reserva (PNR)</div>
                            <div style={{ fontSize: '1.1rem', color: 'var(--crear-gold)', fontWeight: 800 }}>{flight.reservationCode || 'N/A'}</div>
                          </div>
                        </div>
                      </div>

                      {matchedAsignaciones.length > 0 ? (
                        <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          <h4 style={{ margin: '0 0 8px 0', color: '#059669', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle size={16} /> Asignación verificada
                          </h4>
                          {matchedAsignaciones.map((asig, i) => (
                            <div key={i} style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: i !== matchedAsignaciones.length - 1 ? '6px' : '0' }}>
                              <span style={{ fontWeight: 600 }}>{asig.entrenador}</span> asignado a <span style={{ color: '#38bdf8' }}>{asig.entrenamiento || asig.equipo}</span> {asig.sede && `en ${asig.sede}`}
                            </div>
                          ))}
                        </div>
                      ) : suggestedAsignaciones.length > 0 ? (
                        <div style={{ padding: '12px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                          <h4 style={{ margin: '0 0 8px 0', color: '#0284c7', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Compass size={16} /> Sugerencia del sistema
                          </h4>
                          <div className="flight-alert-copy" style={{ fontSize: '0.82rem', marginBottom: '8px' }}>
                            Este vuelo podría pertenecer a:
                          </div>
                          {suggestedAsignaciones.map((asig, i) => (
                            <div key={i} style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: i !== suggestedAsignaciones.length - 1 ? '6px' : '0' }}>
                              <span style={{ fontWeight: 600 }}>{asig.entrenador}</span> para <span style={{ color: '#34d399' }}>{asig.entrenamiento || asig.equipo}</span> {asig.sede && `(${asig.sede})`}
                            </div>
                          ))}
                          <button 
                            onClick={(e) => {
                                e.preventDefault();
                                alert('Enlace confirmado por heurística (integración en desarrollo)');
                            }}
                            style={{ marginTop: '10px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56,189,248,0.4)', color: '#38bdf8', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', width: '100%', fontWeight: '600' }}
                          >
                            Vincular Vuelo y Carta
                          </button>
                        </div>
                      ) : (
                        <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                          <h4 style={{ margin: '0 0 8px 0', color: '#b45309', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertTriangle size={16} /> Requiere revisión manual
                          </h4>
                          <div className="flight-alert-copy" style={{ fontSize: '0.85rem' }}>
                            No se encontraron similitudes para: <strong>{(flight.passengers || []).join(', ')}</strong>.
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
                      <a
                        href={getAirlineUrl(flight.airline)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
                        style={{
                          flex: 1,
                          fontSize: '0.85rem',
                          padding: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          textDecoration: 'none'
                        }}
                      >
                        Hacer Check-In
                      </a>
                      
                      {flight.radarUrl && (
                        <a
                          href={flight.radarUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          style={{
                            flex: 1,
                            fontSize: '0.85rem',
                            padding: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            textDecoration: 'none'
                          }}
                        >
                          Consultar radar externo
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* PESTAÑA 2: REPOSITORIO DE CARTAS Y MIGRACIONES MULTI-SEDE  */}
      {/* ========================================================= */}
      {activeTab === 'cartas' && puedeVerCartas && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* BANNER OFICIAL DE ACCESO A REPOSITORIOS GOOGLE DRIVE */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 183, 3, 0.1) 0%, rgba(56, 189, 248, 0.1) 100%)',
            border: '1px solid rgba(255, 183, 3, 0.3)',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.2rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '1.3rem' }}>📍‚</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: 800 }}>
                  Carpetas Oficiales de Google Drive (Todas las Sedes)
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '620px' }}>
                Acceso directo a los repositorios en la nube: cartas de facilitación migratoria, boletos aéreos y comprobantes de logística para Ecuador, Colombia, México y Perú.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <a
                href={DRIVE_REPOSITORIES[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  borderRadius: '10px',
                  fontWeight: 700
                }}
              >
                <FolderOpen size={16} />
                <span>Drive: Vuelos Entrenadores Multi-Sede</span>
                <ExternalLink size={13} />
              </a>

              <a
                href={DRIVE_REPOSITORIES[1].url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  borderRadius: '10px',
                  fontWeight: 700
                }}
              >
                <FolderOpen size={16} />
                <span>Drive: Facturas y Pasajes Generales</span>
                <ExternalLink size={13} />
              </a>
              <a
                href={DRIVE_REPOSITORIES[2].url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  borderColor: 'rgba(16, 185, 129, 0.4)',
                  color: '#10b981'
                }}
              >
                <FileSpreadsheet size={16} />
                <span>Hoja: LLAMADOS MANAGERS</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          {/* Buscador de Cartas */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ position: 'relative', minWidth: '300px', flex: 1, maxWidth: '500px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar por entrenador, equipo, sede o documento..."
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
              {selectedSede !== 'TODAS' && <span> en sede <strong style={{ color: '#fff' }}>{selectedSede}</strong></span>}
            </div>
          </div>

          {/* Grid de Cartas Multi-Sede */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.2rem' }}>
            {filteredLetters.map(letter => {
              const sedeInfo = SEDES_LOGISTICA[letter.sede] || { bandera: 'ðŸŒ' };
              const isDriveLink = letter.url.includes('drive.google.com');

              return (
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                        <span style={{
                          background: 'rgba(56, 189, 248, 0.12)',
                          color: '#38bdf8',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          {sedeInfo.bandera} {letter.sede}
                        </span>
                      </div>
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
                    {isDriveLink ? (
                      <a
                        href={letter.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
                        style={{
                          flex: 1,
                          fontSize: '0.8rem',
                          padding: '8px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          textDecoration: 'none'
                        }}
                      >
                        <FolderOpen size={14} />
                        Abrir en Google Drive
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      <>
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
                      </>
                    )}

                    <button
                      onClick={() => copyToClipboard(isDriveLink ? letter.url : window.location.origin + letter.url, 'Enlace de la carta')}
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
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PESTAÑA 3: LOGÍSTICA DE HOTEL Y CHOFERES MULTI-SEDE       */}
      {/* ========================================================= */}
      {activeTab === 'logistica' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Selector de Sede para Logística */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            background: 'rgba(255,255,255,0.03)',
            padding: '12px 18px',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={18} color="#34d399" />
              <span style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>
                Seleccionar Sede para Logística y Hospedaje:
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.keys(SEDES_LOGISTICA).map(sedeKey => {
                const s = SEDES_LOGISTICA[sedeKey];
                const isSelected = logisticaSede === sedeKey;
                return (
                  <button
                    key={sedeKey}
                    onClick={() => setLogisticaSede(sedeKey)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: isSelected ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                      background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0,0,0,0.3)',
                      color: isSelected ? '#34d399' : 'var(--text-muted)',
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>{s.bandera}</span>
                    <span>{s.nombre}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tarjeta del Hotel Oficial de la Sede Seleccionada */}
          {(() => {
            const currentLogistica = SEDES_LOGISTICA[logisticaSede] || SEDES_LOGISTICA['Lima'];
            return (
              <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 800
                      }}>
                        SEDE OFICIAL DE HOSPEDAJE 2026 • {currentLogistica.bandera} {currentLogistica.nombre.toUpperCase()}
                      </span>
                    </div>
                    <h2 style={{ fontSize: '1.8rem', margin: '0.4rem 0 0', color: '#fff' }}>
                      {currentLogistica.hotel}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                      <MapPin size={16} color="var(--crear-gold)" />
                      <span>{currentLogistica.direccion}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <a
                      href={currentLogistica.mapsUrl}
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
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                      Check-in: {currentLogistica.checkIn} | Check-out: {currentLogistica.checkOut}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>*{currentLogistica.notaCheckIn}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Teléfono Recepción</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>{currentLogistica.telefono}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Atención 24 Horas</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Servicios y Salones</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#34d399', marginTop: '2px' }}>{currentLogistica.servicios}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currentLogistica.salonOficial}</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Protocolo de Operación Chofer y Recojo por Sede */}
          {(() => {
            const currentLogistica = SEDES_LOGISTICA[logisticaSede] || SEDES_LOGISTICA['Lima'];
            return (
              <div className="glass-panel" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.4rem', margin: 0, color: '#fff' }}>
                      Protocolo Oficial de Traslado y Bienvenida • {currentLogistica.bandera} {currentLogistica.nombre}
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {currentLogistica.aeropuerto}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const text = `ðŸš— *CPSL PROTOCOLO CHOFER - SEDE ${currentLogistica.nombre.toUpperCase()}*\n` +
                        `ðŸ¨ *Hotel:* ${currentLogistica.hotel}\n` +
                        `📍 *Dirección:* ${currentLogistica.direccion}\n` +
                        `✈️ *Aeropuerto:* ${currentLogistica.aeropuerto}\n` +
                        `📍Œ *Punto de Espera:* ${currentLogistica.puntoEspera}\n` +
                        `📍ž *Teléfono Hotel:* ${currentLogistica.telefono}`;
                      copyToClipboard(text, `Protocolo de sede ${currentLogistica.nombre}`);
                    }}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#38bdf8' }}
                  >
                    <Copy size={14} /> Copiar Ficha de Sede
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--crear-gold)', fontWeight: 700, marginBottom: '0.5rem' }}>
                      <CheckCircle size={18} />
                      <span>1. Contacto Previo (1h antes)</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                      El chofer oficial contacta al entrenador vía WhatsApp indicando modelo de vehículo, color, número de placa oficial y foto del conductor en sede <strong>{currentLogistica.nombre}</strong>.
                    </p>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 700, marginBottom: '0.5rem' }}>
                      <MapPin size={18} />
                      <span>2. Punto de Espera en Aeropuerto</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                      Ubicación exacta: <strong>{currentLogistica.puntoEspera}</strong> con cartel oficial de <strong>CREAR PODER SIN LÍMITES</strong>.
                    </p>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 700, marginBottom: '0.5rem' }}>
                      <Building size={18} />
                      <span>3. Traslado y Check-in</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                      Traslado seguro hacia <strong>{currentLogistica.hotel}</strong> ({currentLogistica.direccion}). El equipo de Gerencia de Sede confirma arribo y entrega de llaves.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Directorio Rápido de Todas las Sedes */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={18} color="var(--crear-gold)" /> Directorio Logístico Completo de Sedes CPSL
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {Object.keys(SEDES_LOGISTICA).map(key => {
                const item = SEDES_LOGISTICA[key];
                return (
                  <div
                    key={key}
                    onClick={() => setLogisticaSede(key)}
                    style={{
                      background: logisticaSede === key ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)',
                      border: logisticaSede === key ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>
                        {item.bandera} {item.nombre}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>{item.pais}</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: 600 }}>{item.hotel}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{item.aeropuerto}</div>
                  </div>
                );
              })}
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
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#0d1322',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '900px',
            height: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.02)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>
                  {previewLetter.entrenador || previewLetter.name}
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {previewLetter.rol || 'Documento Oficial de Facilitación'} {previewLetter.sede ? `• Sede ${previewLetter.sede}` : ''}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={previewLetter.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', textDecoration: 'none' }}
                >
                  <ExternalLink size={14} /> Abrir Completo
                </a>
                <button
                  onClick={() => setPreviewLetter(null)}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, position: 'relative', background: '#000' }}>
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
