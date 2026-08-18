// src/data/venuesData.js
// Configuración de Sedes, Hoteles y Salones Oficiales por Defecto

export const defaultVenues = {
  Lima: {
    sede: 'Lima',
    c1_venue: 'Hotel José Antonio Deluxe Miraflores (Calle Bellavista 133, Miraflores)',
    c2_venue: 'Hotel José Antonio Deluxe Miraflores (Calle Bellavista 133, Miraflores)',
    mj_venue: 'Hotel José Antonio Deluxe Miraflores (Calle Bellavista 133, Miraflores)',
    viaje_venue: 'Hostal Sol y Luna (Cieneguilla, Lima, Perú)',
    caminata_venue: 'CASONA BLANCA C. Las Perdices 1126, Lima 15457',
    address: 'Calle Bellavista 133, Miraflores, Lima, Perú',
    city: 'Lima',
    country: 'Perú'
  },
  Quito: {
    sede: 'Quito',
    c1_venue: 'Lugar Quito',
    c2_venue: 'Lugar Quito',
    mj_venue: 'Lugar Quito',
    viaje_venue: 'Lugar Viaje Quito',
    address: 'Quito, Ecuador',
    city: 'Quito',
    country: 'Ecuador'
  },
  Cuenca: {
    sede: 'Cuenca',
    c1_venue: 'Lugar Cuenca',
    c2_venue: 'Lugar Cuenca',
    mj_venue: 'Lugar Cuenca',
    viaje_venue: 'Lugar Viaje Cuenca',
    address: 'Cuenca, Ecuador',
    city: 'Cuenca',
    country: 'Ecuador'
  },
  Guayaquil: {
    sede: 'Guayaquil',
    c1_venue: 'Lugar Guayaquil',
    c2_venue: 'Lugar Guayaquil',
    mj_venue: 'Lugar Guayaquil',
    viaje_venue: 'Lugar Viaje Guayaquil',
    address: 'Guayaquil, Ecuador',
    city: 'Guayaquil',
    country: 'Ecuador'
  },
  Medellin: {
    sede: 'Medellín',
    c1_venue: 'Lugar Medellín',
    c2_venue: 'Lugar Medellín',
    mj_venue: 'Lugar Medellín',
    viaje_venue: 'Lugar Viaje Medellín',
    address: 'Medellín, Colombia',
    city: 'Medellín',
    country: 'Colombia'
  },
  Mexico: {
    sede: 'México',
    c1_venue: 'Lugar México',
    c2_venue: 'Lugar México',
    mj_venue: 'Lugar México',
    viaje_venue: 'Lugar Viaje México',
    address: 'Ciudad de México, México',
    city: 'Ciudad de México',
    country: 'México'
  }
};

/**
 * Obtiene el lugar/hotel oficial para una sede y nivel de entrenamiento
 */
export function getVenueForTraining(sede, trainingLevel = 'C1', rawPlace = '', rawAddress = '') {
  const normSede = (sede || '').trim().toLowerCase();
  const level = (trainingLevel || '').toUpperCase();
  
  let matchKey = 'Lima';
  if (normSede.includes('lima') || normSede === 'lim' || normSede.includes('pe lim') || normSede === 'pe') matchKey = 'Lima';
  else if (normSede.includes('quito') || normSede === 'uio' || normSede.includes('ec uio')) matchKey = 'Quito';
  else if (normSede.includes('cuenca') || normSede === 'cue' || normSede.includes('ec cue')) matchKey = 'Cuenca';
  else if (normSede.includes('guayaquil') || normSede === 'gye' || normSede.includes('ec gye')) matchKey = 'Guayaquil';
  else if (normSede.includes('medell') || normSede === 'med' || normSede.includes('co med')) matchKey = 'Medellin';
  else if (normSede.includes('mex') || normSede.includes('méx') || normSede.includes('mx')) matchKey = 'Mexico';

  const venueObj = defaultVenues[matchKey] || defaultVenues.Lima;

  // Si el evento es "El Viaje", SIEMPRE devolver por defecto el hostal/lugar de retiro asignado
  if (level.includes('VIAJE') || level.includes('RETIRO') || level.includes('CIE') || level.includes('SOL Y LUNA')) {
    try {
      const customVenues = JSON.parse(localStorage.getItem('cpsl_custom_venues') || '{}');
      if (customVenues[matchKey] && customVenues[matchKey].viaje_venue) {
        return customVenues[matchKey].viaje_venue;
      }
    } catch (e) {}
    return venueObj.viaje_venue || (matchKey === 'Lima' ? 'Hostal Sol y Luna (Cieneguilla, Lima, Perú)' : venueObj.mj_venue);
  }

  // Si viene un nombre específico de hotel con más de 20 caracteres y contiene 'hotel', 'hostal', 'hostería' o 'salón', usarlo
  const cleanPlace = (rawPlace || '').trim();
  const isGeneric = !cleanPlace || 
                    cleanPlace.toLowerCase() === 'lima, perú' || 
                    cleanPlace.toLowerCase() === 'lima, peru' ||
                    cleanPlace.toLowerCase() === 'lima' ||
                    cleanPlace.toLowerCase() === 'quito, ecuador' ||
                    cleanPlace.toLowerCase() === 'quito' ||
                    cleanPlace.toLowerCase() === 'cuenca, ecuador' ||
                    cleanPlace.toLowerCase() === 'cuenca' ||
                    cleanPlace.toLowerCase() === 'guayaquil' ||
                    cleanPlace.toLowerCase() === 'medellín' ||
                    cleanPlace.toLowerCase() === 'medellin' ||
                    cleanPlace.toLowerCase() === 'méxico' ||
                    cleanPlace.toLowerCase() === 'mexico' ||
                    cleanPlace.toLowerCase().includes('pe lim') ||
                    cleanPlace.toLowerCase().includes('por confirmar');

  if (!isGeneric && (cleanPlace.toLowerCase().includes('hotel') || cleanPlace.toLowerCase().includes('hostal') || cleanPlace.toLowerCase().includes('hoster') || cleanPlace.toLowerCase().includes('salon') || cleanPlace.toLowerCase().includes('salón') || cleanPlace.length > 25)) {
    return cleanPlace;
  }

  // Leer overrides personalizados en localStorage si existen
  try {
    const customVenues = JSON.parse(localStorage.getItem('cpsl_custom_venues') || '{}');
    if (customVenues[matchKey]) {
      if ((level.includes('C1') || level.includes('UNO')) && customVenues[matchKey].c1_venue) return customVenues[matchKey].c1_venue;
      if ((level.includes('C2') || level.includes('DOS')) && customVenues[matchKey].c2_venue) return customVenues[matchKey].c2_venue;
      if ((level.includes('MJ') || level.includes('MAESTR') || level.includes('JUEGO')) && customVenues[matchKey].mj_venue) return customVenues[matchKey].mj_venue;
      if (customVenues[matchKey].c1_venue) return customVenues[matchKey].c1_venue;
    }
  } catch (e) {}

  if (level.includes('C2') || level.includes('DOS')) return venueObj.c2_venue;
  if (level.includes('MJ') || level.includes('MAESTR') || level.includes('JUEGO')) return venueObj.mj_venue;
  if (level.includes('CAMINATA') || level.includes('FUEGO')) return venueObj.caminata_venue || venueObj.c1_venue;
  return venueObj.c1_venue;
}
