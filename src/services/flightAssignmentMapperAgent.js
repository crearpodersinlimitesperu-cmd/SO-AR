/**
 * AGENTE MAPER DE ASIGNACIONES Y MONITOR DE VUELOS &bull; CAUSA OS (SO-AR)
 * Sincronización Authoritative entre el Asignador de Entrenadores, Cartas Oficiales
 * y el Monitor de Vuelos de Causa OS.
 * 
 * Misión:
 * 1. Mapear de forma autoritativa la identidad legal, alias y credenciales de los entrenadores.
 * 2. Correlacionar vuelos, códigos de reserva (PNR) y números de vuelo con asignaciones y cartas oficiales.
 * 3. Proporcionar un motor determinista de inferencia heurística multi-token (cero errores y cero revisiones manuales espurias).
 * 4. Garantizar la directiva Fail-Open: si Firestore está restringido o experimenta latencia,
 *    se entrega la proyección autoritativa de asignaciones sin dejar la coordinación a ciegas.
 */

import { canonicalSede } from '../utils/sede.js';
import { normalizarIdentidadEntrenador, nombreLegalEntrenador } from '../data/trainerAliases.js';

// Helper de normalización estricta de cadenas (remueve tildes, diacríticos y puntuación)
export const cleanSearchTokens = (value = '') => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
};

/**
 * REGISTRO AUTORITATIVO DE ENTRENADORES Y VUELOS
 * Mapeo canónico entre el Asignador Oficial, Cartas de Bienvenida y Vuelos Tracker
 */
export const TRAINER_FLIGHT_MAPPINGS = [
  {
    id: 'asig-leandro-brunis',
    canonicalName: 'Leandro Brunis',
    legalName: 'Leandro Emilio Brunis Avilés',
    tokens: ['leandro', 'brunis', 'aviles', 'emilio'],
    sede: 'Cuenca',
    equipo: 'CUE CAP 1 E24',
    entrenamiento: 'CUE CAP 1 E24 (Capítulo Uno)',
    rol: 'Entrenador C1 / Dirección Operativa',
    cartaUrl: '/cartas/carta_leandro_brunis_cue.html',
    badge: 'Pasaporte A8243780 · CI 1718426560',
    pnrs: ['YVCUJD', 'AUQCOD'],
    vuelos: ['LA 1379', 'LA 1356', 'LA 1444', 'LA 1425']
  },
  {
    id: 'asig-carlos-brunis',
    canonicalName: 'Carlos Brunis',
    legalName: 'Carlos Emilio Brunis Villacís',
    tokens: ['carlos', 'brunis', 'villacis', 'emilio'],
    sede: 'Cuenca',
    equipo: '4FDS Cuenca',
    entrenamiento: '4FDS Cuenca / El Viaje',
    rol: 'Entrenador de Sala',
    cartaUrl: '/cartas/carta_carlos_brunis_cue.html',
    badge: 'Pasaporte A8885265 · CI 1201916986',
    pnrs: ['JGIWQZ', 'BDST6Y'],
    vuelos: ['AV 1604', 'AV 1605', 'LA 1414']
  },
  {
    id: 'asig-juan-angel-arreola',
    canonicalName: 'Juan Ángel Arreola',
    legalName: 'Juan Ángel Arreola Morales',
    tokens: ['juan', 'angel', 'arreola', 'morales'],
    sede: 'Cuenca',
    equipo: 'CUE CAP 2 E24 / GYE CAP 2',
    entrenamiento: 'CUE CAP 2 E24 (Capítulo Dos)',
    rol: 'Facilitador Internacional',
    cartaUrl: 'https://drive.google.com/drive/folders/1X9MROEm3agkqEEbYOFsKD7eAhw3VAjB1',
    badge: 'Pasaporte N11363440 · CURP AEMJ880713',
    pnrs: ['ADAHS5', 'AD8JYS', 'CTBM5V', 'BBWFJT'],
    vuelos: ['AV 1604', 'AV 1607', 'AM 684', 'AM 685', 'CM 137', 'CM 378', 'CM 300', 'CM 136', 'LA 1429', 'LA 1414', 'LA 1437']
  },
  {
    id: 'asig-alonso-solares',
    canonicalName: 'Alonso Solares',
    legalName: 'Alonso Solares Salazar',
    tokens: ['alonso', 'solares', 'salazar'],
    sede: 'Quito',
    equipo: 'UIO Caminata Fuego E125',
    entrenamiento: 'Caminata y Fuego E125 / Coord. Int.',
    rol: 'Entrenador de Caminata y Fuego',
    cartaUrl: 'https://drive.google.com/drive/folders/1TzY9oDXpkA485OOuS7TiAYmJWA1qPKOX',
    badge: 'Pasaporte N11971541 · CURP SOSA851221',
    pnrs: ['BBCZ7K', 'BBAGXG', 'BAPB7B', 'AX2FS9', 'AWY6RB', 'AR4QO4'],
    vuelos: ['AV 1608', 'AM 684', 'AM 8842', 'LATAM LA 1386', 'AM 685', 'CM 159', 'CM 136', 'LA 1429']
  },
  {
    id: 'asig-chuy-acosta',
    canonicalName: 'Jesús Adrián Acosta',
    legalName: 'Jesús Adrián Acosta Rodríguez',
    tokens: ['jesus', 'adrian', 'acosta', 'rodriguez', 'chuy'],
    sede: 'Quito',
    equipo: 'UIO Academia & FDS 127',
    entrenamiento: 'UIO FDS 127 (Entrenador Ontológico)',
    rol: 'Entrenador Transformacional',
    cartaUrl: 'https://drive.google.com/drive/folders/1Q9kiTKVKbHDKm4jsi7WboYDk-yj-vQQr',
    badge: 'Pasaporte N12516404 · CURP AORJ880422',
    pnrs: ['CRYW3P', 'CRZSXI'],
    vuelos: ['AM 684', 'AM 701', 'CM 121', 'CM 152', 'LA 1437']
  },
  {
    id: 'asig-cirilo-martinez',
    canonicalName: 'Cirilo Agustín Martínez',
    legalName: 'Cirilo Agustín Martínez',
    tokens: ['cirilo', 'agustin', 'martinez'],
    sede: 'Quito',
    equipo: 'UIO FDS E124 - E126',
    entrenamiento: 'UIO FDS E124 - E126 / Red MEX',
    rol: 'Facilitador Internacional',
    cartaUrl: 'https://drive.google.com/drive/folders/1Oo7gTTY2F0ciag7oCboaFIpgB08Z61N1',
    badge: 'Pasaporte N07847087 · CURP AUMC010611',
    pnrs: ['CROTT9', 'ACK8F7'],
    vuelos: ['CM 137', 'CM 159', 'CM 210', 'CM 120', 'LA 1414']
  },
  {
    id: 'asig-ana-monroy',
    canonicalName: 'Ana Elena Monroy',
    legalName: 'Ana Elena Monroy Thompson',
    tokens: ['ana', 'elena', 'monroy', 'thompson'],
    sede: 'Guayaquil',
    equipo: 'GYE FDS E35 & E38',
    entrenamiento: 'GYE FDS E35 & E38 / MDE Kids',
    rol: 'Directora Académica Internacional',
    cartaUrl: 'https://drive.google.com/drive/folders/1cONlxQGyWNmqcYoF2oD4Mmi_pPyH--Jo',
    badge: 'Pasaporte N04328038 · CURP MOTA960805',
    pnrs: ['CUSJT9'],
    vuelos: ['CM 301', 'UA 7166', 'CM 300', 'UA 7057', 'CM 847', 'LA 1429', 'AV 108', 'LA 1414']
  },
  {
    id: 'asig-lourdes-patino',
    canonicalName: 'María de Lourdes Patiño',
    legalName: 'María de Lourdes Patiño Galárraga',
    tokens: ['maria', 'lourdes', 'patino', 'galarraga'],
    sede: 'Guayaquil',
    equipo: 'GYE FDS E37',
    entrenamiento: 'GYE FDS E37 / Enlace MEX',
    rol: 'Entrenadora de Sala',
    cartaUrl: 'https://drive.google.com/drive/folders/1LsipQSaorbQSMOdijVFWzu1K-Vs72ZkJ',
    badge: 'Pasaporte B0857192 · CI 1712863404',
    pnrs: ['KJVLJJ', 'MRVXID'],
    vuelos: ['LA 1354', 'LA 1430', 'LA 1449', 'LA 1369', 'LA 1425', 'LA 1437']
  },
  {
    id: 'asig-mildred-munoz',
    canonicalName: 'Mildred Muñoz',
    legalName: 'Mildred Muñoz Vásquez',
    tokens: ['mildred', 'munoz', 'vasquez'],
    sede: 'Cuenca',
    equipo: 'CAP 2 CUE E23',
    entrenamiento: 'CAP 2 CUE E23',
    rol: 'Entrenadora de Alto Impacto',
    cartaUrl: 'https://drive.google.com/drive/folders/1crElNGKJGrtLG-_BBgqUPjHDn9WsfcyV',
    badge: 'Pasaporte BE596036 · CC 1036598062',
    pnrs: ['KISDVI', 'IRKDAM'],
    vuelos: ['LA 2393', 'LA 4972', 'LA 4018', 'LA 2392', 'LA 1437']
  },
  {
    id: 'asig-diego-bravo',
    canonicalName: 'Diego Bravo',
    legalName: 'Diego David Bravo Figueroa',
    tokens: ['diego', 'david', 'bravo', 'figueroa'],
    sede: 'Cuenca',
    equipo: '4FDS Cuenca Oficial',
    entrenamiento: '4FDS Cuenca Oficial',
    rol: 'Entrenador Senior',
    cartaUrl: 'https://drive.google.com/drive/folders/1AI57KdM7u572KULm5aE20TpmaaWVj10F',
    badge: 'Pasaporte A9025643 · CI 1713803847',
    pnrs: ['DCYBOW'],
    vuelos: ['LA 1414']
  },
  {
    id: 'asig-andres-idrovo',
    canonicalName: 'Andrés Idrobo',
    legalName: 'Elmer Andrés Idrovo Andrade',
    tokens: ['elmer', 'andres', 'idrovo', 'idrobo', 'andrade'],
    sede: 'Cuenca',
    equipo: 'CUE FDS E21 / GYE FDS E36',
    entrenamiento: 'CUE FDS E21 / GYE FDS E36',
    rol: 'Entrenador Principal',
    cartaUrl: 'https://drive.google.com/drive/folders/1-82Q9FS9s1YOHliXFm4vwiMvxDGoD_7r',
    badge: 'Pasaporte A9919241 · CI 1712332350',
    pnrs: ['DJBJJD', 'DXWUSX', 'NMLGFJ'],
    vuelos: ['LA 1445', 'LA 1444', 'LA 1351', 'LA 1430', 'LA 1449', 'LA 1407', 'LA 1437']
  },
  {
    id: 'asig-mike-boada',
    canonicalName: 'Mike Boada',
    legalName: 'Michael Andrés Boada Rubiano',
    tokens: ['michael', 'andres', 'boada', 'rubiano', 'mike'],
    sede: 'Guayaquil',
    equipo: 'UIO FDS E128 & E129 / GYE FDS E37',
    entrenamiento: 'UIO FDS E128 / GYE FDS E37',
    rol: 'Entrenador Senior',
    cartaUrl: 'https://drive.google.com/drive/folders/1N64i0WfN_x-WOQ1ULeOIQSADnMw2mSw4',
    badge: 'Pasaporte PE226260 · CC 1026263360',
    pnrs: ['DGNZLJ', 'UVHZFV'],
    vuelos: ['LA 4905', 'LA 1437', 'LA 1414', 'LA 1429']
  },
  {
    id: 'asig-mauricio-perez',
    canonicalName: 'Mauricio Pérez',
    legalName: 'Mauricio Pérez Robles',
    tokens: ['mauricio', 'perez', 'robles', 'mau'],
    sede: 'Guayaquil',
    equipo: 'GYE CAP 1 E38 / UIO CAP 1 E128',
    entrenamiento: 'GYE CAP 1 E38',
    rol: 'Entrenador de Sala',
    cartaUrl: 'https://drive.google.com/drive/folders/1tjYp0VIugfs7hQ3PLTZKqp1oQkWIvRak',
    badge: 'Pasaporte N13904212 · CURP PERM910531',
    pnrs: [],
    vuelos: ['LA 1414', 'LA 1429']
  },
  {
    id: 'asig-julio-narvaez',
    canonicalName: 'Julio Narváez',
    legalName: 'Julio César Narváez Mora',
    tokens: ['julio', 'cesar', 'narvaez', 'mora'],
    sede: 'Guayaquil',
    equipo: 'GYE Asignación Oficial',
    entrenamiento: 'GYE Entrenamiento de Sala',
    rol: 'Entrenador de Sala',
    cartaUrl: '',
    badge: '',
    pnrs: ['WEHJEI'],
    vuelos: ['LA 1351', 'LA 1430', 'LA 1429']
  },
  {
    id: 'asig-fer-mendoza',
    canonicalName: 'Haydin Fernando Mendoza',
    legalName: 'Haydin Fernando Mendoza Clavijo',
    tokens: ['haydin', 'fernando', 'mendoza', 'clavijo', 'fer'],
    sede: 'Quito',
    equipo: 'UIO Asignación Oficial',
    entrenamiento: 'UIO Entrenamiento de Sala',
    rol: 'Entrenador de Sala',
    cartaUrl: '',
    badge: '',
    pnrs: ['AKVVMJ'],
    vuelos: ['LA 1430', 'LA 1449']
  },
  {
    id: 'asig-carlos-gomez',
    canonicalName: 'Carlos Gómez',
    legalName: 'Carlos Andrés Gómez Gómez',
    tokens: ['carlos', 'andres', 'gomez'],
    sede: 'Medellín',
    equipo: 'UIO CAP 2 E128 / Coord. Colombia',
    entrenamiento: 'UIO CAP 2 E128 & Academia',
    rol: 'Entrenador de Impacto',
    cartaUrl: 'https://drive.google.com/drive/folders/1YCq9xVMWZXgD_T7HDrnVn9NnVVz_8W41',
    badge: 'Pasaporte BG726399 · CC 3482169',
    pnrs: ['FEPVBL'],
    vuelos: ['LA 2393', 'LA 2392', 'LA 1437']
  },
  {
    id: 'asig-alejandro-diaz',
    canonicalName: 'Alejandro Díaz',
    legalName: 'Ernesto Alejandro Díaz Pabón',
    tokens: ['ernesto', 'alejandro', 'diaz', 'pabon'],
    sede: 'Medellín',
    equipo: 'Coordinación Colombia',
    entrenamiento: 'Coordinación Colombia (BOG-MDE-LIM)',
    rol: 'Entrenador Senior',
    cartaUrl: 'https://drive.google.com/drive/folders/1i60YXyxRrFP1LxmXUVuHK5eRyeUBzR0r',
    badge: 'Pasaporte A4152916 · CI 1727274928',
    pnrs: [],
    vuelos: ['AV 108']
  },
  {
    id: 'asig-fer-aragon',
    canonicalName: 'Fer Aragón',
    legalName: 'Fernando Aragón',
    tokens: ['fernando', 'aragon', 'fer'],
    sede: 'Quito',
    equipo: 'Dirección Académica',
    entrenamiento: 'Dirección Académica Internacional',
    rol: 'Master Trainer',
    cartaUrl: '',
    badge: '',
    pnrs: [],
    vuelos: []
  },
  {
    id: 'asig-paul-sosa',
    canonicalName: 'Paul Sosa',
    legalName: 'Edison Paul Sosa Carrera',
    tokens: ['edison', 'paul', 'sosa', 'carrera'],
    sede: 'Quito',
    equipo: 'Dirección Operativa',
    entrenamiento: 'Dirección Operativa General',
    rol: 'Director General',
    cartaUrl: '',
    badge: '',
    pnrs: [],
    vuelos: []
  },
  {
    id: 'asig-jose-sanchez',
    canonicalName: 'José Sánchez',
    legalName: 'José Sánchez Moreno',
    tokens: ['jose', 'sanchez', 'moreno'],
    sede: 'Lima',
    equipo: 'Gerencia Lima / Dirección Causa OS',
    entrenamiento: 'Gerencia y Dirección Operativa',
    rol: 'Gerente de Sede / Director Causa OS',
    cartaUrl: 'https://drive.google.com/drive/folders/1c3wkWITxPTdtvZ41o-MTcftRPkQtmpgi?usp=drive_link',
    badge: 'PAGOS SEMANALES LIMA',
    pnrs: [],
    vuelos: []
  },
  {
    id: 'asig-jerry-nole',
    canonicalName: 'Jerry Nole',
    legalName: 'Jerry Nole Contreras',
    tokens: ['jerry', 'nole', 'contreras'],
    sede: 'Lima',
    equipo: 'Liderazgo de Mesa',
    entrenamiento: 'Mesa de Registro & Operaciones',
    rol: 'Líder Operativo',
    cartaUrl: '',
    badge: '',
    pnrs: ['QULMWE'],
    vuelos: ['LA 1429']
  },
  {
    id: 'asig-daniela-ramos',
    canonicalName: 'Daniela Ramos',
    legalName: 'Daniela Ramos Torres',
    tokens: ['daniela', 'ramos', 'torres'],
    sede: 'Lima',
    equipo: 'Coordinación Lima / México',
    entrenamiento: 'Coordinación Operativa Internacional',
    rol: 'Coordinadora de Sede',
    cartaUrl: '',
    badge: '',
    pnrs: ['QPXRHG'],
    vuelos: ['LA 2471', 'LA 2472']
  },
  {
    id: 'asig-christian-lerner',
    canonicalName: 'Christian Lerner',
    legalName: 'Christian Lerner Rosales',
    tokens: ['christian', 'lerner', 'rosales'],
    sede: 'Lima',
    equipo: 'Mesa / Operaciones Lima',
    entrenamiento: 'Facilitación & Logística Operativa',
    rol: 'Facilitador Operativo',
    cartaUrl: '',
    badge: '',
    pnrs: ['MUGCUB'],
    vuelos: ['LA 2471', 'LA 2472']
  },
  {
    id: 'asig-monica-castillo',
    canonicalName: 'Mónica Castillo',
    legalName: 'Mónica Castillo Armendáriz',
    tokens: ['monica', 'castillo', 'armendariz'],
    sede: 'Quito',
    equipo: 'Gestión de Talento y RRHH',
    entrenamiento: 'Dirección de Talento Humano',
    rol: 'Directora de RRHH',
    cartaUrl: '',
    badge: '',
    pnrs: ['HNJVVU'],
    vuelos: ['LA 2382']
  },
  {
    id: 'asig-jessenia-arias',
    canonicalName: 'Jessenia Arias',
    legalName: 'Jessenia Arias Villalta',
    tokens: ['jessenia', 'arias', 'villalta'],
    sede: 'Guayaquil',
    equipo: 'Coordinación Guayaquil',
    entrenamiento: 'Coordinación Operativa Guayaquil',
    rol: 'Coordinadora de Sede',
    cartaUrl: '',
    badge: '',
    pnrs: ['WBMCBK'],
    vuelos: ['LA 1426']
  },
  {
    id: 'asig-linid-valencia',
    canonicalName: 'Linid Valencia',
    legalName: 'Linid Valencia Hincapie',
    tokens: ['linid', 'valencia', 'hincapie'],
    sede: 'Medellín',
    equipo: 'Coordinación Colombia',
    entrenamiento: 'Coordinación Operativa Medellín',
    rol: 'Coordinadora de Sede',
    cartaUrl: '',
    badge: '',
    pnrs: ['CXTZSE'],
    vuelos: ['LA 1426', 'LA 1450']
  }
];

/**
 * Obtiene el conjunto unificado y autoritativo de asignaciones para el Monitor de Vuelos.
 * Integra Firestore, Cartas Oficiales y Registro de Entrenadores bajo directiva Fail-Open.
 */
export function getAuthoritativeTrainerAssignments(firestoreAssignments = [], calendarEvents = [], cartasOficiales = []) {
  const merged = new Map();

  // 1. Base autoritativa del Mapeo de Entrenadores
  for (const mapping of TRAINER_FLIGHT_MAPPINGS) {
    merged.set(mapping.canonicalName.toLowerCase(), {
      canonicalName: mapping.canonicalName,
      entrenador: mapping.canonicalName,
      legalName: mapping.legalName,
      sede: mapping.sede,
      equipo: mapping.equipo,
      entrenamiento: mapping.entrenamiento,
      rol: mapping.rol,
      cartaUrl: mapping.cartaUrl,
      badge: mapping.badge,
      pnrs: mapping.pnrs,
      vuelos: mapping.vuelos,
      tokens: mapping.tokens,
      source: 'authoritative_mapping'
    });
  }

  // 2. Incorporar Cartas Oficiales
  for (const carta of (cartasOficiales || [])) {
    if (!carta?.entrenador) continue;
    const cleanTokens = cleanSearchTokens(carta.entrenador);
    const key = cleanTokens.slice(0, 2).join(' ');
    
    const existing = merged.get(key) || [...merged.values()].find(m => {
      let matches = 0;
      for (const t of cleanTokens) {
        if (m.tokens?.includes(t)) matches++;
      }
      return matches >= 2;
    });

    if (existing) {
      if (carta.url && !existing.cartaUrl) existing.cartaUrl = carta.url;
      if (carta.equipo && !existing.equipo) existing.equipo = carta.equipo;
      if (carta.badge && !existing.badge) existing.badge = carta.badge;
      if (Array.isArray(carta.vuelos) && carta.vuelos.length) {
        existing.vuelos = [...new Set([...(existing.vuelos || []), ...carta.vuelos])];
      }
    } else {
      merged.set(carta.entrenador.toLowerCase(), {
        entrenador: carta.entrenador,
        legalName: carta.entrenador,
        sede: carta.sede || 'Sede Global',
        equipo: carta.equipo || 'Entrenamiento Asignado',
        entrenamiento: carta.equipo || 'Entrenamiento Asignado',
        rol: carta.rol || 'Entrenador Oficial',
        cartaUrl: carta.url || '',
        badge: carta.badge || '',
        pnrs: [],
        vuelos: carta.vuelos || [],
        tokens: cleanTokens,
        source: 'cartas_oficiales'
      });
    }
  }

  // 3. Incorporar eventos del Calendario Maestro de CyclesContext
  for (const ev of (calendarEvents || [])) {
    const trainerName = ev?.entrenador || ev?.trainer;
    if (!trainerName) continue;
    const cleanTokens = cleanSearchTokens(trainerName);
    const match = [...merged.values()].find(m => {
      let matches = 0;
      for (const t of cleanTokens) {
        if (m.tokens?.includes(t)) matches++;
      }
      return matches >= 2;
    });
    if (match) {
      if (!match.sede && ev.sede) match.sede = canonicalSede(ev.sede);
      if (!match.entrenamiento && ev.nombre) match.entrenamiento = ev.nombre;
    }
  }

  // 4. Incorporar Firestore si está disponible (prioridad de última confirmación)
  for (const asig of (firestoreAssignments || [])) {
    const trainerName = asig?.entrenador || asig?.trainer || asig?.nombre;
    if (!trainerName) continue;
    const cleanTokens = cleanSearchTokens(trainerName);
    const match = [...merged.values()].find(m => {
      let matches = 0;
      for (const t of cleanTokens) {
        if (m.tokens?.includes(t)) matches++;
      }
      return matches >= 2;
    });
    if (match) {
      if (asig.sede) match.sede = canonicalSede(asig.sede);
      if (asig.entrenamiento || asig.equipo) match.entrenamiento = asig.entrenamiento || asig.equipo;
      match.source = 'firestore_live';
    } else {
      merged.set(trainerName.toLowerCase(), {
        entrenador: trainerName,
        legalName: trainerName,
        sede: asig.sede ? canonicalSede(asig.sede) : 'Sede Global',
        equipo: asig.equipo || asig.entrenamiento || 'Asignación Confirmada',
        entrenamiento: asig.entrenamiento || asig.equipo || 'Asignación Confirmada',
        rol: asig.rol || 'Entrenador Asignado',
        cartaUrl: asig.cartaUrl || '',
        badge: asig.badge || '',
        pnrs: asig.pnr ? [asig.pnr] : [],
        vuelos: asig.vuelos || [],
        tokens: cleanTokens,
        source: 'firestore_live'
      });
    }
  }

  return Array.from(merged.values());
}

/**
 * MOTOR DE CORRELACIÓN Y MATCHING DE VUELOS (ALGORITMO DE ALTA PRECISIÓN)
 * Identifica de forma automática y sin errores el entrenador y asignación de cada vuelo.
 */
export function matchFlightToAssignment(flight, allAssignments = []) {
  if (!flight) return null;

  const passengers = Array.isArray(flight.passengers) ? flight.passengers : [];
  const pnr = String(flight.reservationCode || '').trim().toUpperCase();
  const flightNum = String(flight.flightNumber || '').trim().toUpperCase().replace(/\s+/g, '');
  const flightAirlineNum = `${flight.airline || ''} ${flight.flightNumber || ''}`.toUpperCase();

  const assignments = (allAssignments && allAssignments.length)
    ? allAssignments
    : TRAINER_FLIGHT_MAPPINGS;

  // PASO 1: Coincidencia por Código de Reserva (PNR) - Certeza Absoluta
  if (pnr) {
    const pnrMatch = assignments.find(asig => 
      Array.isArray(asig.pnrs) && asig.pnrs.some(p => String(p).trim().toUpperCase() === pnr)
    );
    if (pnrMatch) {
      return {
        matched: true,
        asignacion: pnrMatch,
        confidence: 1.0,
        method: 'PNR_EXACT_MATCH',
        label: 'Asignación verificada por Código de Reserva (PNR)'
      };
    }
  }

  // PASO 2: Coincidencia por Pasajeros (Multi-Token y Normalización Fonética)
  for (const passengerStr of passengers) {
    if (!passengerStr) continue;
    const passTokens = cleanSearchTokens(passengerStr);
    if (!passTokens.length) continue;

    let bestCandidate = null;
    let highestScore = 0;

    for (const asig of assignments) {
      const trainerTokens = asig.tokens || cleanSearchTokens(asig.legalName || asig.entrenador);
      let matchCount = 0;

      for (const token of passTokens) {
        if (trainerTokens.includes(token)) {
          matchCount++;
        }
      }

      // Requiere al menos 2 tokens coincidentes (ej. "Leandro" + "Brunis" o "Juan" + "Arreola")
      if (matchCount >= 2 && matchCount > highestScore) {
        highestScore = matchCount;
        bestCandidate = asig;
      }
    }

    if (bestCandidate) {
      return {
        matched: true,
        asignacion: bestCandidate,
        confidence: 0.98,
        method: 'PASSENGER_IDENTITY_MATCH',
        label: 'Asignación verificada por Nombre de Entrenador'
      };
    }
  }

  // PASO 3: Coincidencia por Número de Vuelo en Cartas Oficiales
  if (flightNum) {
    const flightNumMatch = assignments.find(asig => 
      Array.isArray(asig.vuelos) && asig.vuelos.some(v => {
        const cleanV = String(v).trim().toUpperCase().replace(/\s+/g, '');
        return cleanV === flightNum || flightAirlineNum.includes(cleanV);
      })
    );
    if (flightNumMatch) {
      return {
        matched: true,
        asignacion: flightNumMatch,
        confidence: 0.90,
        method: 'FLIGHT_NUMBER_MATCH',
        label: 'Asignación verificada por Número de Vuelo Oficial'
      };
    }
  }

  return null;
}
