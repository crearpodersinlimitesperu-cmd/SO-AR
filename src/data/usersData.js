export const normalizeRole = (role) => {
  if (!role) return 'miembro';
  const r = role.toLowerCase().trim();
  // Coordinadores C1/C2
  if (r === 'coordinador_c1c2' || r === 'coord_c1' || r === 'coordinador_c1' || r.includes('capítulo uno') || r.includes('capitulo uno') || r.includes('capítulo 1') || r.includes('capitulo 1')) return 'coord_c1';
  // Coordinadores Maestría
  if (r === 'coordinador_mj' || r === 'coord_maestria' || r === 'coordinador_maestria' || r.includes('maestría del juego') || r.includes('maestria del juego') || r === 'coordinador global maestría' || r === 'coordinador global maestria') return 'coord_maestria';
  // Gerentes
  if (r === 'gerente' || r === 'gerente_sede' || r === 'gerente de sede') return 'gerente';
  // Capitanes
  if (r === 'capitan' || r === 'capitán') return 'capitan';
  // Quantum Team
  if (r === 'qt' || r === 'quantum_team' || r === 'quantum team' || r === 'quantum') return 'qt';
  // Director Maestría
  if (r === 'director_maestria' || r === 'director_mj' || r.includes('director') && r.includes('maestr')) return 'director_maestria';
  // Manager
  if (r === 'manager' || r === 'managers') return 'manager';
  // Dirección (CEO, CCO, Socio)
  if (r === 'ceo global' || r === 'cco global' || r === 'socio' || r === 'direccion' || r === 'dirección') return 'direccion';
  // CFO / Finanzas
  if (r === 'cfo' || r === 'jefa financiera' || r === 'jefe financiero') return 'cfo';
  if (r === 'facturación' || r === 'facturacion' || r === 'asistente facturación' || r === 'asistente facturacion' || r === 'contador lima' || r === 'contador medellín' || r === 'contador medellin') return 'finanzas';
  // Coordinación Administrativa
  if (r === 'coordinadora administrativa' || r === 'coordinador administrativo' || r === 'coordinador' || r === 'coordinadora') return 'coordinador';
  // Talento Humano
  if (r === 'talento humano' || r === 'talento_humano') return 'talento_humano';
  // Legal
  if (r === 'legal' || r.includes('legal') || r.includes('jurídico') || r.includes('juridico')) return 'legal';
  // Impuestos
  if (r === 'asistente impuestos quito' || r === 'asistente_impuestos_quito' || r.includes('impuesto') || r.includes('tributar')) return 'asistente_impuestos_quito';
  // SST
  // Entrenador de Llamadas / Coach
  if (r === 'entrenador_llamadas' || r === 'entrenador' || r === 'coach' || r.includes('entrenador') || r.includes('coach')) return 'entrenador_llamadas';
  return r;
};

export const normalizeSede = (sede) => {
  if (!sede) return 'Sede Global';
  const s = sede.trim();
  if (s === 'MED' || s.toLowerCase().includes('medell')) return 'Medellín';
  if (s === 'LIM' || s.toLowerCase().includes('lima')) return 'Lima';
  if (s === 'CUE' || s.toLowerCase().includes('cuenca')) return 'Cuenca';
  if (s === 'GYE' || s.toLowerCase().includes('guayaquil')) return 'Guayaquil';
  if (s === 'MEX' || s.toLowerCase().includes('mex') || s.toLowerCase().includes('méxico')) return 'México';
  if (s === 'UIO-C1' || s === 'UIO-C2' || s === 'UIO' ||
      s.toLowerCase().includes('ciclo 1') || s.toLowerCase().includes('ciclo1') ||
      s.toLowerCase().includes('ciclo 2') || s.toLowerCase().includes('ciclo2') ||
      s.toLowerCase().includes('quito')) return 'Quito';
  if (s === 'INT' || s.toLowerCase().includes('intern')) return 'Internacional';
  if (s.toLowerCase().includes('global')) return 'Sede Global';
  return s;
};


export const OPERATIONAL_SEDES = [
  'Lima',
  'Quito',       // Ciclo 1 + Ciclo 2 fusionados (operan juntos)
  'Cuenca',
  'Guayaquil',
  'Medellín',
  'México'
];

export const ROLE_DISPLAY_NAMES = {
  coord_c1: 'Coordinador C1 / C2',
  coordinador_c1c2: 'Coordinador C1 / C2',
  coord_maestria: 'Coordinador Maestría (MJ)',
  coordinador_mj: 'Coordinador Maestría (MJ)',
  gerente: 'Gerente de Sede',
  capitan: 'Capitán de Sede',
  qt: 'Quantum Team (QT)',
  director_maestria: 'Director de Maestría',
  manager: 'Manager',
  cfo: 'CFO (Chief Financial Officer)',
  direccion: 'Dirección Global',
  finanzas: 'Finanzas',
  coordinador: 'Coordinación Administrativa',
  talento_humano: 'Talento Humano',
  legal: 'Legal / Jurídico',
  entrenador_llamadas: 'Entrenador de Llamadas'
};

export const ROLE_COLORS = {
  direccion: '#ef4444',
  cfo: '#eab308',
  gerente: '#f59e0b',
  director_maestria: '#ec4899',
  coordinador_c1c2: '#29abe2',
  coord_c1: '#29abe2',
  coordinador_mj: '#8b5cf6',
  coord_maestria: '#8b5cf6',
  capitan: '#22c55e',
  manager: '#10b981',
  qt: '#ec4899',
  coordinador: '#0ea5e9',
  finanzas: '#6b7280',
  asistente_impuestos_quito: '#64748b',
  talento_humano: '#06b6d4',
  legal: '#a855f7',
  técnico_sst: '#14b8a6',
  entrenador_llamadas: '#38bdf8'
};

/**
 * Busca un usuario por cualquiera de sus correos (corporativo @crearpsl.net o personal Gmail)
 */
import { USERS_TO_IMPORT } from './usersToImport';

export const findUserByAnyEmail = (searchEmail) => {
  if (!searchEmail) return null;
  const emailLower = searchEmail.toLowerCase().trim();
  return usersData.find(u => {
    if (u.email?.toLowerCase().trim() === emailLower) return true;
    if (u.corporateEmail?.toLowerCase().trim() === emailLower) return true;
    if (u.personalEmail?.toLowerCase().trim() === emailLower) return true;
    if (u.emails && u.emails.some(e => e.toLowerCase().trim() === emailLower)) return true;
    return false;
  }) || null;
};

export const usersData = USERS_TO_IMPORT;
