import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useChecklist } from '../context/ChecklistContext';
import { useUI } from '../context/UIContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  FileText, LogOut, Clock, Calendar as CalendarIcon, MapPin, CheckCircle2, 
  AlertCircle, Circle, RefreshCw, CalendarPlus, Bell, Users, AtSign, 
  BookOpen, Lightbulb, Search, X, Filter, ChevronDown, Sparkles,
  Zap, LayoutGrid, Sliders, CheckSquare, ArrowRight, ArrowUpRight, ShieldCheck,
  TrendingUp, Compass, HelpCircle
} from 'lucide-react';
import { getFlagForSede } from '../utils/flags';
import { createGoogleEvent } from '../services/googleSync';
import { calculateAutomaticDeadline } from '../utils/soarDates';
import TaskAssignmentModal from '../components/TaskAssignmentModal';
import VenueConfigModal from '../components/VenueConfigModal';
import ViewModeSelector from '../components/ViewModeSelector';
import ThemeToggle from '../components/ThemeToggle';
import { getVenueForTraining } from '../data/venuesData';
import { ROLE_DISPLAY_NAMES, normalizeSede } from '../data/usersData';
import { 
  canAssignTrainer, canViewAllManagers, isDireccionRole, isGlobalQTCoordinator,
  canAccessAgendaTimeBoxing, canAccessFlyersC1, canAccessCalendarioMJ, 
  canAccessMonitorVuelos, canAccessHotelesSede, canAccessManualQT, 
  canAccessDirectorioQT, canAccessManualNodus, canAccessCampusInteractivo 
} from '../config/permissions';
import EffectiveCommunicationButton from '../components/EffectiveCommunicationButton';
import { getAllCompanyUsers } from '../services/userService';
import UserProfileModal from '../components/UserProfileModal';
import HorariosEntrenamientoModal from '../components/HorariosEntrenamientoModal';
import { INITIAL_MANAGERS } from '../data/managersData';

/**
 * Normaliza y verifica si un evento está asignado a un entrenador específico
 */
const isTrainerMatchingUser = (evTrainer, user) => {
  if (!evTrainer || !user) return false;
  const normalize = (str) => (str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

  const trainerStr = normalize(evTrainer);
  const userName = normalize(user.name || user.displayName || '');
  const userEmail = normalize(user.email || '');

  if (!trainerStr || trainerStr === 'tba' || /^\d+$/.test(trainerStr) || /^eq\s*\d+$/i.test(trainerStr)) return false;

  if (userName && (trainerStr.includes(userName) || userName.includes(trainerStr))) return true;

  const nameParts = userName.split(/\s+/).filter(p => p.length >= 3);
  const trainerParts = trainerStr.split(/[\/\s,\-]+/).filter(p => p.length >= 3);
  
  if (nameParts.length > 0) {
    const matchedTokens = nameParts.filter(part => trainerParts.some(tp => tp.includes(part) || part.includes(tp)));
    if (matchedTokens.length >= Math.min(2, nameParts.length)) return true;
  }

  const emailPrefix = userEmail.split('@')[0];
  const emailTokens = emailPrefix.split(/[\._\-]/).filter(t => t.length >= 3);
  if (emailTokens.length > 0) {
    const matchedEmailTokens = emailTokens.filter(tok => trainerParts.some(tp => tp.includes(tok) || tok.includes(tp)));
    if (matchedEmailTokens.length >= Math.min(2, emailTokens.length)) return true;
  }

  return false;
};

// ============================================================================
// BUSCADOR GLOBAL — Registro de módulos/páginas (28/08/2026)
// ----------------------------------------------------------------------------
// Refleja exactamente las mismas rutas y los mismos arrays de roles que ya
// usan el menú "🛠️ Más Módulos y Herramientas" y la Barra Pro en este mismo
// archivo (ver las secciones "MENÚ DESPLEGABLE DE MÁS MÓDULOS" y "BARRA PRO
// COMPLETA" más abajo). Si se agrega, quita o re-permisiona un módulo ahí,
// hay que actualizar también esta lista para que el buscador no muestre
// accesos desactualizados o incorrectos.
// ============================================================================
const EXEC_ROLES = ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado'];
const KPI_ROLES = ['coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'qt', 'capitan'];
const DIRECTORIO_QT_ROLES = ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'qt', 'superadmin', 'consolidado'];
const CAMPUS_ROLES = ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'superadmin', 'consolidado'];
const CENTRO_MANAGERS_ROLES = ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coordinador_mj', 'coord_maestria', 'entrenador', 'entrenador_llamadas', 'superadmin', 'consolidado'];
const MANUAL_ROLES = ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'qt', 'superadmin', 'consolidado'];
const MANUAL_NODUS_ROLES = ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'superadmin', 'consolidado'];
const REPORTES_VISIBLE = (u) => Boolean(
  u?.isSuperAdmin || u?.isGerente ||
  ['coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'capitan', 'qt', 'direccion', 'director_maestria', 'consolidado', 'aliado', 'manager'].includes(u?.appRole)
);

// ============================================================================
// REGISTRO DE OPCIONES Y ACCIONES DE CAUSA OS (02/09/2026)
// ----------------------------------------------------------------------------
// Permite buscar directamente herramientas, botones clave, accesos rápidos,
// cartas de entrenadores, vuelos, configuraciones y acciones del sistema.
// ============================================================================
const CAUSA_OPTIONS_REGISTRY = [
  {
    id: 'opt-brandscript',
    title: '📜 BrandScript & Guiones MJ',
    category: 'Ventas y Enrolamiento',
    badge: 'Manual Oficial',
    emoji: '📜',
    desc: 'Manual Oficial de Enrolamiento Narrativo para Mánagers y Entrenadores.',
    keywords: ['guiones', 'brandscript', 'storybrand', 'neuromarketing', 'conversion', 'ventas', 'enrolamiento', 'mj'],
    route: '/brandscript',
    roles: null
  },
  {
    id: 'opt-reporte-relampago',
    title: '⚡ Reporte Relámpago Post-FDS (Gerentes de Sede)',
    category: 'Reportes Operativos',
    badge: '<3 min • Nodus',
    emoji: '⚡',
    desc: 'Evaluación de 5 puntos post-FDS: Entrenador (1-5), Infraestructura (1-5), Staff (1-5), Retención TRO % y Quiebres Críticos. Habilitado Domingo 21:00 a Lunes 12:00 PM.',
    keywords: ['reporte relampago', 'relampago', 'reporte post fds', 'reportes', 'fds', 'gerente', 'retencion', 'tro', 'lunes 12', 'candado presupuestario', 'evaluacion entrenador'],
    route: '/reportes',
    roles: null
  },
  {
    id: 'opt-micro-pulso',
    title: '🎧 Micro-Pulso de Staff (3 Preguntas Aleatorias)',
    category: 'Escucha Activa',
    badge: '<30 seg • Cero Pereza',
    emoji: '🎧',
    desc: 'Micro-encuesta rotativa de baja fricción: Seguridad Psicológica (Amy Edmondson), Liderazgo Project Oxygen y Buzón Stop a la Burocracia (Gary Hamel). Lunes 11:00 AM a Martes 18:00 PM.',
    keywords: ['micro pulso', 'micropulso', 'pulso staff', '3 preguntas', 'seguridad psicologica', 'oxygen', 'humanocracy', 'stop', 'buzon stop', 'escucha activa'],
    route: '/reportes',
    roles: null
  },
  {
    id: 'opt-dashboard-evolucion',
    title: '📊 Dashboard de Evolución Organizacional (Causa OS)',
    category: 'Inteligencia Organizacional',
    badge: 'Seguridad & Rider',
    emoji: '📊',
    desc: 'Monitor en vivo de temperatura de seguridad psicológica (<85%), ranking histórico de entrenadores y buzón de simplificación operativa Trim & Stack.',
    keywords: ['dashboard evolucion', 'evolucion organizacional', 'seguridad psicologica', 'rider entrenador', 'trim and stack', 'metricas humanas'],
    route: '/reportes',
    roles: null
  },

  {
    id: 'opt-kpis-lima',
    title: '📊 Dashboard Directivo (Sede Lima)',
    category: 'Analítica de Sede',
    badge: 'Nuevo • Lima',
    emoji: '📈',
    desc: 'Análisis de efectividad, enrolamiento y calidad de datos operacionales de equipos y coordinadoras de la Sede Lima.',
    keywords: ['kpi', 'dashboard', 'lima', 'coordinadoras', 'equipos', 'efectividad', 'desertores', 'analisis', 'datos', 'directivo'],
    route: '/kpis-lima',
    roles: null
  },
  {
    id: 'opt-flyer',
    title: 'Generador de Flyers Oficiales',
    category: 'Herramienta HD',
    badge: 'Flyer 1080x1920',
    emoji: '🎨',
    desc: 'Diseño y descarga de afiches oficiales para Instagram, WhatsApp y redes por sede',
    keywords: ['flyer', 'flyers', 'generador', 'afiche', 'diseño', 'diseno', 'poster', 'descargar flyer', 'hd', '1080x1920', 'tierra', 'bot flyer', 'imagen'],
    route: '/generador-flyer',
    roles: null
  },
  {
    id: 'opt-new-task',
    title: 'Crear Nueva Tarea (+ TAREA)',
    category: 'Acción Rápida',
    badge: '+ Tarea',
    emoji: '➕',
    desc: 'Abrir ventana para crear, asignar y fechar una nueva tarea o compromiso',
    keywords: ['crear tarea', 'nueva tarea', 'tarea', 'task', 'asignar tarea', 'pendiente', 'agregar tarea', '+ tarea'],
    action: 'new_task',
    roles: null
  },
  {
    id: 'opt-cartas-hub',
    title: 'Cartas de Entrenadores e Itinerarios de Vuelo',
    category: 'Operaciones Lima',
    badge: 'Vuelos y Migraciones',
    emoji: '✈️',
    desc: 'Cartas de compromiso, itinerarios confirmados, escalas técnicas, boletos y migración',
    keywords: ['cartas', 'carta', 'entrenadores', 'itinerario', 'vuelos', 'pasajes', 'boletos', 'migraciones', 'recojo hotel', 'checkin', 'avianca', 'latam'],
    external: 'https://cartas.crearpsl.net',
    roles: null
  },
  {
    id: 'opt-carta-alejo',
    title: 'Carta Alejandro Díaz (Equipo 28 - Gratitud)',
    category: 'Carta Oficial',
    badge: 'Avianca AS58FE',
    emoji: '📄',
    desc: 'Vuelos AV108 / AV51, escala en Bogotá, carta de migración y recojo 07:05 AM',
    keywords: ['alejo', 'alejandro diaz', 'equipo 28', 'gratitud', 'as58fe', 'avianca', 'carta alejo'],
    external: 'https://cartas.crearpsl.net/carta_alejandro_diaz_e28.html',
    roles: null
  },
  {
    id: 'opt-carta-lourdes',
    title: 'Carta Lourdes Patiño (Equipo 29 - Relación)',
    category: 'Carta Oficial',
    badge: 'LATAM JYUAGO',
    emoji: '📄',
    desc: 'Vuelo directo LA 1437, retorno con escala en Guayaquil, carta migración y recojo 07:50 AM',
    keywords: ['lourdes', 'lourdes patino', 'equipo 29', 'relacion', 'jyuago', 'latam', 'carta lourdes'],
    external: 'https://cartas.crearpsl.net/carta_lourdes_patino_e29.html',
    roles: null
  },
  {
    id: 'opt-monitor-vuelos',
    title: '✈️ Monitor de Vuelos y Cartas Oficiales',
    category: 'Logística de Entrenadores',
    badge: 'Radar en Vivo',
    emoji: '✈️',
    desc: 'Control de vuelos en vivo (LATAM/Avianca), logística de choferes, recojo en aeropuerto y repositorio de cartas oficiales',
    keywords: ['vuelos', 'vuelo', 'cartas', 'carta', 'monitor de vuelos', 'radar', 'itinerario', 'chofer', 'hotel', 'andres idrobo', 'lourdes patino', 'alejandro diaz', 'migraciones', 'latam', 'avianca'],
    route: '/monitor-vuelos',
    roles: null
  },
  {
    id: 'opt-carta-andres',
    title: 'Carta Andrés Idrobo (Equipo 30 - Creación)',
    category: 'Carta Oficial',
    badge: 'LATAM DJBJJD',
    emoji: '📄',
    desc: 'Vuelos con escala en Guayaquil LA 1351 / LA 1430, carta migración y recojo 8:30 PM',
    keywords: ['andres', 'andres idrobo', 'equipo 30', 'creacion', 'djbjjd', 'latam', 'carta andres'],
    external: '/cartas/carta_andres_idrobo_e30.html',
    roles: null
  },
  {
    id: 'opt-calendario-mj',
    title: 'Calendario de Maestría del Juego (MJ)',
    category: 'Cronograma',
    badge: 'E28 / E29 / E30',
    emoji: '📅',
    desc: 'Editor y visor oficial del cronograma de Maestría del Juego para todas las sedes',
    keywords: ['calendario mj', 'maestria del juego', 'cronograma mj', 'fechas maestria', 'e28', 'e29', 'e30', 'equipos'],
    route: '/calendario-mj',
    roles: ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado', 'director_maestria', 'coord_maestria', 'coordinador_mj']
  },
  {
    id: 'opt-calendario-global',
    title: 'Calendario Global Maestro',
    category: 'Agenda General',
    badge: 'Todas las Sedes',
    emoji: '📅',
    desc: 'Cronograma global consolidado de eventos, talleres y hitos para Lima, Quito, GYE y Cuenca',
    keywords: ['calendario global', 'calendario maestro', 'fechas globales', 'eventos', 'cronograma', 'google calendar'],
    external: 'calendario-global',
    roles: null
  },
  {
    id: 'opt-agenda-equipo',
    title: 'Agenda y Time Boxing del Equipo',
    category: 'Productividad',
    badge: 'Time Boxing',
    emoji: '🗓️',
    desc: 'Planificación semanal por bloques de tiempo y alineación del equipo',
    keywords: ['agenda', 'time boxing', 'bloques', 'semana', 'calendario equipo'],
    route: '/calendario-equipo',
    roles: null
  },
  {
    id: 'opt-masterclass-distinciones',
    title: 'Masterclass: Distinciones de Liderazgo',
    category: 'Formación',
    badge: 'Nuevo',
    emoji: '🌟',
    desc: '5 Distinciones Cuánticas: Empatía vs Comodidad, Causa vs Efecto, Hecho vs Interpretación, Rigor vs Agresión, Compromiso vs Obligación.',
    keywords: ['masterclass', 'distinciones', 'liderazgo', 'empatia', 'causa', 'efecto', 'interpretacion', 'rigor', 'agresion', 'compromiso'],
    route: '/masterclass-distinciones',
    roles: null
  },
  {
    id: 'opt-horarios-entrenamientos',
    title: 'Horarios de Entrenamientos y Código de Vestimenta',
    category: 'Operaciones',
    badge: 'C1 / C2 / MJ',
    emoji: '⏰',
    desc: 'Horarios oficiales de sala (Jueves a Domingo), aperturas, recesos, noches de confianza y código de vestimenta oficial',
    keywords: ['horarios', 'horario', 'vestimenta', 'ropa', 'turnos', 'c1', 'c2', 'maestria', 'horas', 'cronograma', 'lima', 'jueves', 'viernes', 'sabado', 'domingo'],
    action: 'open_horarios_modal',
    roles: null
  },

  {
    id: 'opt-checklist',
    title: 'Mi Checklist Operativo',
    category: 'Operaciones',
    badge: 'Ciclo Activo',
    emoji: '✅',
    desc: 'Listado de compromisos y tareas críticas del ciclo según tu rol',
    keywords: ['checklist', 'mis tareas', 'operativo', 'c1', 'c2', 'pendientes', 'actividades'],
    route: (u) => `/checklist/${u?.appRole || 'capitan'}`,
    roles: null
  },
  {
    id: 'opt-metas',
    title: 'Mis Metas y Puntuación',
    category: 'Rendimiento',
    badge: 'Score',
    emoji: '🏆',
    desc: 'Panel de metas personales y del equipo, cumplimiento de objetivos y avance',
    keywords: ['metas', 'mis metas', 'score', 'objetivos', 'puntaje', 'avance', 'resultados'],
    route: '/metas',
    roles: null
  },
  {
    id: 'opt-kpis',
    title: 'Mis KPIs y Métricas',
    category: 'Indicadores',
    badge: 'Métricas',
    emoji: '📊',
    desc: 'Indicadores clave de rendimiento: deserción, confirmados, reentrenados y futuros imposibles',
    keywords: ['kpi', 'kpis', 'mis kpis', 'metricas', 'indicadores', 'desercion', 'confirmados', 'reentrenados', 'enrolamiento'],
    route: '/mis-kpis',
    roles: ['coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'qt', 'capitan']
  },
  {
    id: 'opt-reportes',
    title: 'Enviar Reportes Operativos',
    category: 'Formularios',
    badge: 'Envío',
    emoji: '📤',
    desc: 'Envío de reportes periódicos a gerencia y coordinadores',
    keywords: ['reporte', 'reportes', 'enviar reportes', 'formulario', 'informe'],
    route: '/reportes',
    roles: null,
    visible: REPORTES_VISIBLE
  },
  {
    id: 'opt-centro-managers',
    title: 'Centro de Managers',
    category: 'Gestión de Equipos',
    badge: 'PX y Aliados',
    emoji: '🎯',
    desc: 'Gestión de llamadas, seguimiento a participantes PX, aliados y coordinadores',
    keywords: ['centro managers', 'managers', 'llamadas', 'px', 'aliados', 'seguimiento equipos'],
    route: '/centro-managers',
    roles: ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coordinador_mj', 'coord_maestria', 'entrenador', 'entrenador_llamadas', 'superadmin', 'consolidado']
  },
  {
    id: 'opt-directorio-qt',
    title: 'Directorio Quantum Team (QT)',
    category: 'Contactos',
    badge: 'WhatsApp y Teléfonos',
    emoji: '⚡',
    desc: 'Teléfonos, WhatsApp directos y correos de todo el equipo de coordinación y staff',
    keywords: ['directorio', 'directorio qt', 'telefonos', 'whatsapp', 'contactos staff', 'coordinadores'],
    route: '/directorio-qt',
    roles: ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'qt', 'superadmin', 'consolidado']
  },
  {
    id: 'opt-gerencial',
    title: 'Causa OS Gerencial',
    category: 'Ejecutivo',
    badge: 'Gerencia',
    emoji: '💼',
    desc: 'Panel de control de alta dirección y toma de decisiones estratégicas',
    keywords: ['gerente', 'gerencial', 'comite', 'direccion', 'dashboard gerencial'],
    route: '/gerente',
    roles: ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado']
  },
  {
    id: 'opt-estrategia',
    title: 'Estrategia OKRs (Cascade)',
    category: 'Estrategia',
    badge: 'OKRs',
    emoji: '🎯',
    desc: 'Mapa estratégico y seguimiento de objetivos clave y resultados',
    keywords: ['estrategia', 'okrs', 'cascade', 'objetivos', 'iniciativas'],
    route: '/estrategia',
    roles: ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado']
  },
  {
    id: 'opt-portafolio',
    title: 'Portafolio PMO (Planview)',
    category: 'Proyectos',
    badge: 'PMO',
    emoji: '📈',
    desc: 'Supervisión de iniciativas, proyectos corporativos y cronogramas de entrega',
    keywords: ['portafolio', 'pmo', 'proyectos', 'planview', 'gantt'],
    route: '/portafolio',
    roles: ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado']
  },
  {
    id: 'opt-auditoria-kpis',
    title: 'Auditoría de KPIs',
    category: 'Auditoría',
    badge: 'Control',
    emoji: '📉',
    desc: 'Detección de anomalías, inconsistencias y validación cruzada de números',
    keywords: ['auditoria', 'auditoria kpis', 'control', 'revision metricas', 'inconsistencias'],
    route: '/auditoria-kpis',
    roles: ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado']
  },
  {
    id: 'opt-acuerdos',
    title: 'Acuerdos Oficiales (Correo)',
    category: 'Compromisos',
    badge: 'Minutas',
    emoji: '✉️',
    desc: 'Redacción y consulta de actas de reunión y acuerdos formales del equipo',
    keywords: ['acuerdos', 'minutas', 'actas', 'correo', 'compromisos'],
    route: '/acuerdos',
    roles: null
  },
  {
    id: 'opt-learning',
    title: 'Inteligencia Colectiva (Learning)',
    category: 'Conocimiento',
    badge: 'Learning',
    emoji: '🧠',
    desc: 'Repositorio de lecciones aprendidas, mejoras operativas e ideas del equipo',
    keywords: ['learning', 'aprendizaje', 'lecciones aprendidas', 'inteligencia colectiva', 'ideas'],
    route: '/learning',
    roles: null
  },
  {
    id: 'opt-excelencia',
    title: 'Excelencia Operativa',
    category: 'Calidad',
    badge: 'Estándares',
    emoji: '👑',
    desc: 'Reconocimientos, estándares de ejecución y manual de buenas prácticas',
    keywords: ['excelencia', 'excelencia operativa', 'calidad', 'estandares', 'reconocimientos'],
    route: '/excelencia',
    roles: null
  },
  {
    id: 'opt-superadmin',
    title: 'Centro de Mando (Super Admin)',
    category: 'Administración',
    badge: 'Sistema',
    emoji: '🌐',
    desc: 'Gestión integral de usuarios, asignación de roles, permisos y configuración del sistema',
    keywords: ['superadmin', 'centro de mando', 'administracion', 'usuarios', 'roles', 'permisos'],
    route: '/superadmin',
    roles: ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado']
  },
  {
    id: 'opt-sedes',
    title: 'Configuración de Sedes y Salones',
    category: 'Configuración',
    badge: 'Locales',
    emoji: '🏢',
    desc: 'Configurar aforos, salones, hoteles y direcciones de cada sede (Lima, Quito, GYE, Cuenca)',
    keywords: ['sede', 'sedes', 'configurar sedes', 'salones', 'hoteles', 'aforo', 'locales'],
    action: 'venue_modal',
    roles: null
  },
  {
    id: 'opt-emergencias',
    title: 'Protocolo de Emergencias',
    category: 'Seguridad',
    badge: 'SOS',
    emoji: '🚨',
    desc: 'Flujo de actuación ante emergencias médicas, logísticas o de seguridad',
    keywords: ['emergencia', 'emergencias', 'protocolo emergencias', 'sos', 'urgencias', 'medico'],
    route: '/protocolo-emergencias',
    roles: null
  },
  {
    id: 'opt-manual',
    title: 'Manual / Guía Causa OS / QT',
    category: 'Ayuda',
    badge: 'Manual',
    emoji: '📘',
    desc: 'Documentación paso a paso de todas las funciones de Causa OS',
    keywords: ['manual', 'guia', 'manual causa', 'instructivo', 'como funciona', 'ayuda'],
    route: '/manual',
    roles: ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'qt', 'superadmin', 'consolidado']
  },
  {
    id: 'opt-manual-nodus',
    title: 'Gobernanza y Manual Nodus (Edición 2026)',
    category: 'Gobernanza',
    badge: '18 Caps + 9 Niveles',
    emoji: '📗',
    desc: 'Gobernanza simbiótica Nodus + Causa OS, 9 niveles, vestimenta 2026, 14 KPIs y manual paso a paso de Nodus',
    keywords: ['manual nodus', 'nodus', 'gobernanza', 'guia nodus', 'plataforma nodus', 'imo', 'kpis', 'triggers', 'vestimenta', 'el viaje', 'paul sosa', 'fer aragon', 'elizabeth escobar'],
    route: '/manual-nodus',
    roles: null
  },
  {
    id: 'opt-vende-sin-vender',
    title: '📖 Vende Sin Vender (Best-Seller Causa OS)',
    category: 'Formación y Liderazgo',
    badge: 'Best-Seller 2026',
    emoji: '📖',
    desc: 'El Arte de Enrolar y Despertar Gigantes: Neuromarketing Ético, Alex Hormozi y Causa OS con 8 gráficas narrativas interactivas',
    keywords: ['vende sin vender', 'libro', 'best seller', 'hormozi', 'yoda', 'perro guardian', 'ecuacion de valor', 'ticket verde', 'rezagados', 'enrolamiento', 'storybrand'],
    route: '/vende-sin-vender',
    roles: null
  },
  {
    id: 'opt-campus',
    title: 'Campus Interactivo CREAR',
    category: 'Academia',
    badge: 'Formación',
    emoji: '🎓',
    desc: 'Plataforma interactiva de entrenamiento, videos y recursos de capacitación',
    keywords: ['campus', 'campus interactivo', 'academia', 'cursos', 'videos', 'capacitacion'],
    external: 'https://cpsl-campus-interactivo.vercel.app/ruta',
    roles: ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'superadmin', 'consolidado']
  },
  {
    id: 'opt-tema',
    title: 'Cambiar Modo de Tema (Claro / Oscuro / Auto)',
    category: 'Apariencia',
    badge: 'Tema',
    emoji: '🌓',
    desc: 'Alternar entre Modo Oscuro (noche), Modo Claro (día) o Automático según la hora',
    keywords: ['tema', 'modo oscuro', 'modo claro', 'dark mode', 'light mode', 'apariencia', 'colores', 'dia', 'noche', 'auto'],
    action: 'toggle_theme',
    roles: null
  },
  {
    id: 'opt-vista',
    title: 'Cambiar Vista de Pantalla (Lite / Compacto / Pro)',
    category: 'Interfaz',
    badge: 'Vista',
    emoji: '👁️',
    desc: 'Cambiar la densidad de información en el inicio: Modo Pro, Compacto o Lite',
    keywords: ['vista', 'cambiar vista', 'modo pro', 'compacto', 'lite', 'densidad', 'interfaz'],
    action: 'change_view',
    roles: null
  },
  {
    id: 'opt-logout',
    title: 'Cerrar Sesión (Salir de Causa OS)',
    category: 'Cuenta',
    badge: 'Salir',
    emoji: '🚪',
    desc: 'Desconectar tu cuenta y salir de la plataforma',
    keywords: ['salir', 'cerrar sesion', 'logout', 'desconectar'],
    action: 'logout',
    roles: null
  }
];

const MODULE_REGISTRY = [
  { id: 'gerencial', label: 'Causa OS Gerencial', emoji: '💼', route: '/gerente', roles: EXEC_ROLES },
  { id: 'portafolio', label: 'Portafolio PMO (Planview)', emoji: '📈', route: '/portafolio', roles: EXEC_ROLES },
  { id: 'estrategia', label: 'Estrategia OKRs (Cascade)', emoji: '🎯', route: '/estrategia', roles: EXEC_ROLES },
  { id: 'auditoria-kpis', label: 'Auditoría de KPIs', emoji: '📉', route: '/auditoria-kpis', roles: EXEC_ROLES },
  { id: 'acuerdos', label: 'Acuerdos Oficiales (Correo)', emoji: '✉️', route: '/acuerdos', roles: EXEC_ROLES },
  { id: 'calendario-equipo', label: 'Agenda y Time Boxing', emoji: '🗓️', route: '/calendario-equipo', roles: null },
  { id: 'learning', label: 'Inteligencia Colectiva (Learning)', emoji: '🧠', route: '/learning', roles: EXEC_ROLES },
  { id: 'excelencia', label: 'Excelencia Operativa', emoji: '👑', route: '/excelencia', roles: EXEC_ROLES },
  { id: 'mis-kpis', label: 'Mis KPIs', emoji: '📊', route: '/mis-kpis', roles: KPI_ROLES },
  { id: 'directorio-qt', label: 'Directorio QT', emoji: '⚡', route: '/directorio-qt', roles: DIRECTORIO_QT_ROLES },
  { id: 'superadmin', label: 'Centro de Mando', emoji: '🌐', route: '/superadmin', roles: EXEC_ROLES },
  { id: 'calendario-global', label: 'Calendario Global Maestro', emoji: '📅', external: 'calendario-global', roles: null },
  { id: 'campus', label: 'Campus Interactivo', emoji: '🎓', external: 'https://cpsl-campus-interactivo.vercel.app/ruta', roles: CAMPUS_ROLES },
  { id: 'centro-managers', label: 'Centro de Managers', emoji: '🎯', route: '/centro-managers', roles: CENTRO_MANAGERS_ROLES },
  { id: 'protocolo-emergencias', label: 'Protocolo de Emergencias', emoji: '🚨', route: '/protocolo-emergencias', roles: null },
  { id: 'manual', label: 'Manual / Guía Causa OS / QT', emoji: '📘', route: '/manual', roles: MANUAL_ROLES },
  { id: 'manual-nodus', label: 'Manual Práctico Nodus', emoji: '📗', route: '/manual-nodus', roles: MANUAL_NODUS_ROLES },
  { id: 'checklist', label: 'Mi Checklist Operativo', emoji: '✅', route: (u) => `/checklist/${u?.appRole || 'capitan'}`, roles: null },
  { id: 'metas', label: 'Mis Metas', emoji: '🏆', route: '/metas', roles: null },
  { id: 'reportes', label: 'Enviar Reportes', emoji: '📤', route: '/reportes', roles: null, visible: REPORTES_VISIBLE },
  { id: 'generador-flyer', label: 'Generador de Flyers Oficiales', emoji: '🎨', route: '/generador-flyer', roles: [...EXEC_ROLES, 'coordinador', 'coord_c1', 'coord_c2', 'coordinador_c1c2'] },
];

const isModuleVisible = (mod, currentUser) => {
  if (typeof mod.visible === 'function') return mod.visible(currentUser);
  if (mod.roles === null) return true;
  return (mod.roles || []).includes(currentUser?.appRole);
};

// ============================================================================
// TAREAS QUE HAS ASIGNADO — cuenta regresiva (28/08/2026)
// ----------------------------------------------------------------------------
// Calcula el texto y color de la cuenta regresiva hasta la fecha límite de una
// tarea, a partir de "now" (se le pasa el estado "time" que ya existe en Home
// y se actualiza cada segundo, así que esto queda "vivo" sin agregar un
// segundo intervalo). Los umbrales de color (3h / 24h / 72h) son una
// RECOMENDACIÓN razonable, no algo que José haya especificado con números
// exactos — se puede ajustar si prefiere otros cortes.
// ============================================================================
const getCountdownInfo = (deadlineIso, now) => {
  if (!deadlineIso) return { label: 'Sin fecha límite', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: '#9ca3af', overdue: false };
  const deadline = new Date(deadlineIso).getTime();
  if (isNaN(deadline)) return { label: 'Fecha inválida', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: '#9ca3af', overdue: false };

  const diffMs = deadline - now.getTime();
  const absMs = Math.abs(diffMs);
  const totalHours = Math.floor(absMs / 3600000);
  const days = Math.floor(totalHours / 24);
  const mins = Math.floor((absMs % 3600000) / 60000);
  const timeStr = days > 0 ? `${days}d ${totalHours % 24}h` : (totalHours > 0 ? `${totalHours}h ${mins}m` : `${mins}m`);

  if (diffMs <= 0) return { label: `⏰ VENCIDA hace ${timeStr}`, color: '#ffffff', bg: '#dc2626', border: '#7f1d1d', overdue: true };
  if (diffMs < 3 * 3600000) return { label: `🔴 ${timeStr} restantes`, color: '#ffffff', bg: '#ef4444', border: '#b91c1c', overdue: false };
  if (diffMs < 24 * 3600000) return { label: `🟠 ${timeStr} restantes`, color: '#ffffff', bg: '#f97316', border: '#c2410c', overdue: false };
  if (diffMs < 72 * 3600000) return { label: `🟡 ${timeStr} restantes`, color: '#1a1300', bg: '#facc15', border: '#a16207', overdue: false };
  return { label: `🟢 ${timeStr} restantes`, color: '#ffffff', bg: '#16a34a', border: '#166534', overdue: false };
};

export default function Home() {
  const { currentUser, logout, switchRole, reauthenticateGoogle } = useAuth();
  const { currentCycle, currentStage, events, loadingEvents } = useCycles();
  const { tasks: allTasks, loading: loadingTasks, syncTasksToGoogle, acceptCollaboration, rejectCollaboration } = useChecklist();
  const { showToast, viewMode, setViewMode, customModules } = useUI();
  const { themeMode, setThemeMode } = useTheme();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  // Reloj local
  const [time, setTime] = useState(new Date());
  
  // Eventos locales
  const [activeEventTab, setActiveEventTab] = useState('locales');
  const [timeFilter, setTimeFilter] = useState('futuros');
  const [selectedSedeFilter, setSelectedSedeFilter] = useState('todas');
  const [selectedTrainingFilter, setSelectedTrainingFilter] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskBeingEdited, setTaskBeingEdited] = useState(null); // tarea a editar desde el panel "Tareas que has asignado"
  const [tareasAsignadasFilter, setTareasAsignadasFilter] = useState('Activas'); // 'Activas' | 'Vencidas' | 'Cumplidas' | 'Todas'
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [showHorariosModal, setShowHorariosModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const toolsDropdownRef = useRef(null);
  const notificationsRef = useRef(null); // (03/09/2026) fix: faltaba cerrar este panel al hacer click fuera

  // BUSCADOR GLOBAL (28/08/2026) — Personas + Páginas y módulos + Equipos/Capitanes
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [showGlobalSearchResults, setShowGlobalSearchResults] = useState(false);
  const globalSearchRef = useRef(null);
  const [realUsersData, setRealUsersData] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedSearchUser, setSelectedSearchUser] = useState(null);
  const [showSearchUserModal, setShowSearchUserModal] = useState(false);

  // Carga de personas para el buscador (misma fuente que Centro de Mando: getAllCompanyUsers())
  useEffect(() => {
    let isMounted = true;
    async function fetchUsersForSearch() {
      try {
        const users = await getAllCompanyUsers();
        if (isMounted) setRealUsersData(users);
      } catch (err) {
        console.error("Error cargando usuarios para el buscador global:", err);
      } finally {
        if (isMounted) setUsersLoading(false);
      }
    }
    fetchUsersForSearch();
    return () => { isMounted = false; };
  }, []);

  // Cerrar el buscador global al hacer click fuera
  useEffect(() => {
    function handleClickOutsideSearch(event) {
      if (globalSearchRef.current && !globalSearchRef.current.contains(event.target)) {
        setShowGlobalSearchResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutsideSearch);
    return () => document.removeEventListener("mousedown", handleClickOutsideSearch);
  }, []);

  // Cerrar dropdown al hacer click fuera
  // (03/09/2026) FIX — el panel de Notificaciones no tenía este cierre por
  // click-afuera, y ambos dropdowns (Notificaciones y Más Módulos) podían
  // quedar abiertos al mismo tiempo sin excluirse entre sí. En modo oscuro
  // los dos usan un fondo casi transparente (glass-panel), así que al
  // superponerse el texto de ambos se mezclaba y se veía ilegible (ver
  // captura de José). Ahora también se cierran mutuamente al abrir el otro.
  useEffect(() => {
    function handleClickOutside(event) {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(event.target)) {
        setShowToolsDropdown(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddEventToGoogle = async (ev, startDate, endDate) => {
    let token = sessionStorage.getItem('googleAccessToken');
    if (!token) {
      // (04/09/2026) Antes se seguía sin token (createGoogleEvent caía al
      // enlace manual de Google Calendar) — ahora intenta primero un popup
      // corto de reautenticación para poder usar la API directamente.
      token = await reauthenticateGoogle();
    }
    const hotelLocation = getVenueForTraining(ev.sede || ev.sedeTag || currentUser?.sede, ev.nombre || ev.name, ev.lugar, ev.direccion);
    
    const result = await createGoogleEvent({
      summary: `CREAR: ${ev.nombre || ev.name}`,
      location: hotelLocation,
      description: `Lugar / Hotel Oficial: ${hotelLocation}\n${ev.detalles || ''}${currentUser?.appRole !== 'qt' ? `\nEntrenador: ${ev.trainer || ev.entrenador || 'TBA'}` : ''}`,
      start: startDate,
      end: endDate
    }, token);

    if (result.success) {
      if (result.via === 'api') {
        showToast(`¡"${ev.nombre || ev.name}" añadido a tu Google Calendar exitosamente!`, "success");
      } else {
        showToast(`Abriendo Google Calendar para agendar "${ev.nombre || ev.name}"...`, "info");
      }
    } else {
      showToast(result.error || "Hubo un error al abrir el calendario.", "error");
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Error al cerrar sesión", error);
      setIsLoggingOut(false);
    }
  };

  // Cálculo de tareas del usuario
  const userEmail = (currentUser?.email || '').toLowerCase().trim();
  const activeRole = currentUser?.appRole || currentUser?.role || 'gerente';
  const isExecutiveUser = ['ceo', 'cco', 'socio', 'super_admin', 'direccion'].includes(activeRole) || 
                          userEmail === 'fer.aragon@crearpsl.net' || 
                          userEmail === 'paul.sosa@crearpsl.net';

  const myTasksForProgress = allTasks.filter(t => {
    const isAssigned = (t.assignedToEmails && t.assignedToEmails.some(e => e.toLowerCase().trim() === userEmail)) || 
                       (t.assignedToEmail && t.assignedToEmail.toLowerCase().trim() === userEmail) ||
                       (t.collaborators && t.collaborators.map(c => c.toLowerCase().trim()).includes(userEmail));
    if (isAssigned) return true;
    if (isExecutiveUser) return false; // Roles ejecutivos / Fer y Paul no tienen tareas operativas por defecto
    if (activeRole === 'consolidado') {
      return true;
    }
    return t.role === activeRole;
  });
  const completedForProgress = myTasksForProgress.filter(t => t.completed || t.status === 'Completada').length;
  const progressPercentage = myTasksForProgress.length > 0 ? Math.round((completedForProgress / myTasksForProgress.length) * 100) : 0;
  const criticasCount = myTasksForProgress.filter(t => !t.completed && (t.isCritical || t.priority === '🔴 ROJO')).length;
  const importantesCount = myTasksForProgress.filter(t => !t.completed && t.status !== 'Completada' && !t.isCritical && t.priority !== '🔴 ROJO').length;

  const urgentTasks = myTasksForProgress.filter(t => !t.completed && t.status !== 'Completada');
  urgentTasks.sort((a, b) => {
    const valA = (a.isCritical || a.priority === '🔴 ROJO') ? 3 : (a.priority === '🟡 AMARILLO' ? 2 : 1);
    const valB = (b.isCritical || b.priority === '🔴 ROJO') ? 3 : (b.priority === '🟡 AMARILLO' ? 2 : 1);
    return valB - valA;
  });

  // ==========================================================================
  // BUSCADOR GLOBAL — lógica de resultados (28/08/2026)
  // --------------------------------------------------------------------------
  // DATO FALTANTE / INFERENCIA (declarado explícitamente por REGLA ABSOLUTA):
  // Causa OS no tenía, antes de este cambio, un módulo de "buscador global"
  // documentado con reglas de visibilidad propias, así que el alcance de
  // "Personas" y "Equipos/Capitanes" aquí se apoya en el mismo criterio ya
  // usado en otras pantallas de la app (canViewAllManagers/isDireccionRole =
  // ver TODO; el resto = solo su propia sede + registros marcados como
  // Sede Global). Si esto no es lo que José quiere, hay que ajustarlo.
  // "Páginas y módulos" sí es un HECHO: son exactamente las mismas rutas y
  // los mismos arrays de roles que ya usa el menú "Más Módulos y Herramientas"
  // de este archivo.
  // ==========================================================================
  const canSeeGlobalDirectory = Boolean(
    currentUser?.isSuperAdmin ||
    currentUser?.isDireccion ||
    isDireccionRole(currentUser?.appRole) ||
    canViewAllManagers(currentUser)
  );
  const currentUserSedeNorm = normalizeSede(currentUser?.sede);
  const normalizeSearchText = (str) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const globalSearchQ = globalSearchTerm.trim().toLowerCase();
  const globalSearchActive = globalSearchQ.length >= 2;

  const searchTokens = !globalSearchActive
    ? []
    : normalizeSearchText(globalSearchTerm).split(/\s+/).filter(Boolean);

  const matchesAllTokens = (searchableText) => {
    if (searchTokens.length === 0) return false;
    const target = normalizeSearchText(searchableText);
    return searchTokens.every(t => target.includes(t));
  };

  const globalSearchOptionResults = !globalSearchActive ? [] : CAUSA_OPTIONS_REGISTRY
    .filter(opt => {
      if (opt.roles && !opt.roles.includes(currentUser?.appRole) && !currentUser?.isSuperAdmin) {
        return false;
      }
      if (typeof opt.visible === 'function' && !opt.visible(currentUser)) {
        return false;
      }
      const fullSearchable = `${opt.title} ${opt.category || ''} ${opt.badge || ''} ${opt.desc || ''} ${(opt.keywords || []).join(' ')}`;
      return matchesAllTokens(fullSearchable);
    })
    .slice(0, 8);

  const globalSearchPeopleResults = !globalSearchActive ? [] : (realUsersData || [])
    .filter(u => {
      if (canSeeGlobalDirectory) return true;
      const uSede = normalizeSede(u.sede);
      return uSede === currentUserSedeNorm || uSede === 'Sede Global' || isGlobalQTCoordinator({ email: u.email });
    })
    .filter(u => {
      const name = (u.name || u.displayName || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const role = (ROLE_DISPLAY_NAMES[u.role] || u.role || '').toLowerCase();
      const sede = (u.sede || '').toLowerCase();
      return name.includes(globalSearchQ) || email.includes(globalSearchQ) || role.includes(globalSearchQ) || sede.includes(globalSearchQ);
    })
    .slice(0, 8);

  const globalSearchModuleResults = !globalSearchActive ? [] : MODULE_REGISTRY
    .filter(mod => isModuleVisible(mod, currentUser))
    .filter(mod => mod.label.toLowerCase().includes(globalSearchQ))
    .slice(0, 8);

  const globalSearchTeamResults = (() => {
    if (!globalSearchActive) return [];
    const seenTeams = new Map();
    const capitanHits = [];
    INITIAL_MANAGERS.forEach(m => {
      const mSede = normalizeSede(m.sede);
      if (!canSeeGlobalDirectory && mSede !== currentUserSedeNorm && mSede !== 'Sede Global') return;

      if (m.equipo) {
        const key = `${mSede}_${m.equipo}`;
        const teamStr = `${m.equipo} ${m.numEquipo || ''} ${mSede} ${m.entrenador || ''}`.toLowerCase();
        if (!seenTeams.has(key) && teamStr.includes(globalSearchQ)) {
          seenTeams.set(key, { type: 'equipo', key, equipo: m.equipo, sede: mSede });
        }
      }

      const rol = (m.rol || '').toLowerCase();
      if (rol.includes('capitan') && (m.nombre || '').toLowerCase().includes(globalSearchQ)) {
        capitanHits.push({ type: 'capitan', key: `cap_${m.id}`, id: m.id, nombre: m.nombre, equipo: m.equipo, sede: mSede });
      }
    });
    return [...Array.from(seenTeams.values()).slice(0, 5), ...capitanHits.slice(0, 5)];
  })();

  const handleSelectSearchOption = (opt) => {
    setShowGlobalSearchResults(false);
    setGlobalSearchTerm('');
    if (opt.action === 'open_horarios_modal') {
      setShowHorariosModal(true);
    } else if (opt.action === 'new_task') {
      setShowTaskModal(true);
    } else if (opt.action === 'venue_modal') {
      setShowVenueModal(true);
    } else if (opt.action === 'toggle_theme') {
      const nextTheme = themeMode === 'dark' ? 'light' : (themeMode === 'light' ? 'auto' : 'dark');
      setThemeMode?.(nextTheme);
      showToast?.(`Tema cambiado a: ${nextTheme === 'light' ? 'Día (Claro)' : nextTheme === 'dark' ? 'Noche (Oscuro)' : 'Automático'}`, 'info');
    } else if (opt.action === 'change_view') {
      const nextView = viewMode === 'pro' ? 'compact' : (viewMode === 'compact' ? 'lite' : 'pro');
      setViewMode?.(nextView);
      showToast?.(`Vista cambiada a: ${nextView.toUpperCase()}`, 'info');
    } else if (opt.action === 'logout') {
      logout();
    } else if (opt.external === 'calendario-global') {
      window.open('/calendario_global.html?v=' + Date.now() + '&email=' + encodeURIComponent(currentUser?.email || '') + '&name=' + encodeURIComponent(currentUser?.displayName || currentUser?.name || ''), '_blank');
    } else if (opt.external) {
      window.open(opt.external, '_blank');
    } else if (typeof opt.route === 'function') {
      navigate(opt.route(currentUser));
    } else if (opt.route) {
      navigate(opt.route);
    }
  };

  const handleSelectSearchPerson = (u) => {
    setSelectedSearchUser(u);
    setShowSearchUserModal(true);
    setShowGlobalSearchResults(false);
    setGlobalSearchTerm('');
  };

  const handleSelectSearchModule = (mod) => {
    setShowGlobalSearchResults(false);
    setGlobalSearchTerm('');
    if (mod.external === 'calendario-global') {
      window.open('/calendario_global.html?v=' + Date.now() + '&email=' + encodeURIComponent(currentUser?.email || '') + '&name=' + encodeURIComponent(currentUser?.displayName || currentUser?.name || ''), '_blank');
    } else if (mod.external) {
      window.open(mod.external, '_blank');
    } else if (typeof mod.route === 'function') {
      navigate(mod.route(currentUser));
    } else if (mod.route) {
      navigate(mod.route);
    }
  };

  const handleSelectSearchTeam = (item) => {
    setShowGlobalSearchResults(false);
    setGlobalSearchTerm('');
    if (item.type === 'equipo') {
      navigate(`/centro-managers?tab=grupales&q=${encodeURIComponent(item.equipo)}&sede=${encodeURIComponent(item.sede)}`);
    } else {
      navigate(`/centro-managers?tab=directorio&q=${encodeURIComponent(item.nombre)}&sede=${encodeURIComponent(item.sede)}`);
    }
  };

  // ==========================================================================
  // TAREAS QUE HAS ASIGNADO A OTROS + TAREAS QUE TE ASIGNARON A TI (28/08/2026,
  // ampliado 04/09/2026 a pedido de José: "podrían ir también las que me
  // asignan")
  // --------------------------------------------------------------------------
  // "tasks" (allTasks) ya trae TODA la colección "tasks" de Firestore sin
  // filtrar (ChecklistContext hace onSnapshot sobre la colección completa),
  // así que no hace falta una consulta nueva. Se combinan dos grupos:
  //   1. Tareas donde createdBy === mi correo (las que YO asigné a otros).
  //   2. Tareas donde YO aparezco en assignedToEmails/assignedToEmail/
  //      collaborators (las que ME asignaron a mí), EXCLUYENDO las que yo
  //      mismo creé (para no duplicar una tarea que me autoasigné).
  // Cada tarea queda marcada con __direction ('asignada_por_mi' |
  // 'asignada_a_mi') para poder distinguirlas visualmente y para que el
  // botón "Editar" solo aparezca en las que yo creé (regla confirmada por
  // José: solo el creador de la tarea puede editarla).
  const userDisplayNameByEmail = {};
  (realUsersData || []).forEach(u => {
    if (u.email) userDisplayNameByEmail[u.email.toLowerCase().trim()] = u.name || u.displayName || u.email;
  });
  const resolveAssigneeName = (email) => userDisplayNameByEmail[(email || '').toLowerCase().trim()] || email;

  const tareasQueHeAsignado = [
    ...(allTasks || [])
      .filter(t => (t.createdBy || '').toLowerCase().trim() === userEmail && userEmail)
      .map(t => ({ ...t, __direction: 'asignada_por_mi' })),
    ...(allTasks || [])
      .filter(t => {
        const yaEsCreador = (t.createdBy || '').toLowerCase().trim() === userEmail;
        if (yaEsCreador || !userEmail) return false; // evita duplicar autoasignadas
        return (t.assignedToEmails && t.assignedToEmails.some(e => e.toLowerCase().trim() === userEmail)) ||
               (t.assignedToEmail && t.assignedToEmail.toLowerCase().trim() === userEmail) ||
               (t.collaborators && t.collaborators.map(c => c.toLowerCase().trim()).includes(userEmail));
      })
      .map(t => ({ ...t, __direction: 'asignada_a_mi' }))
  ]
    .sort((a, b) => {
      const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const dbTime = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return da - dbTime;
    });

  return (
    <div style={{ maxWidth: viewMode === 'lite' ? '780px' : '960px', margin: '0 auto', padding: viewMode === 'lite' ? '1.5rem 1rem' : '2rem 1rem' }}>
      
      {/* CABECERA PRINCIPAL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ 
            display: 'flex', 
            gap: '2rem', 
            alignItems: 'center', 
            marginBottom: '1.5rem', 
            flexWrap: 'wrap',
            padding: '0.5rem 0'
          }}>
            <img 
              src="/logo.png" 
              alt="Crear Poder Sin Limites" 
              style={{ 
                height: viewMode === 'lite' ? '70px' : '85px', 
                objectFit: 'contain', 
                display: 'block',
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.08))',
                transition: 'transform 0.3s ease'
              }} 
            />
            <div style={{ 
              height: '50px', 
              width: '1px', 
              background: 'linear-gradient(to bottom, transparent, var(--border-strong), transparent)', 
              display: viewMode === 'lite' ? 'none' : 'block',
              opacity: 0.6
            }}></div>
            <img 
              src="/causa-logo-transparent.png" 
              alt="Causa OS" 
              className="causa-logo"
              style={{ 
                height: viewMode === 'lite' ? '70px' : '85px', 
                objectFit: 'contain', 
                display: 'block', 
                transformOrigin: 'left center',
                filter: 'drop-shadow(0 4px 15px rgba(0, 191, 255, 0.2))',
                transition: 'transform 0.3s ease'
              }} 
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <h1 className="text-blue" style={{ margin: 0, fontSize: viewMode === 'lite' ? '2.5rem' : '3rem', fontWeight: '900', letterSpacing: '-1px', textShadow: '0 0 20px rgba(100, 255, 218, 0.3)' }}>
              Causa OS
            </h1>
            <h2 className="text-gold" style={{ margin: 0, fontSize: viewMode === 'lite' ? '1.5rem' : '1.8rem', fontWeight: '700', letterSpacing: '-0.5px' }}>
              {time.getHours() < 12 ? 'Buenos días' : time.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches'}, {currentUser?.displayName || currentUser?.name || 'Equipo'}
            </h2>
          </div>
          <p className="text-muted" style={{ margin: '0.8rem 0 0', textTransform: 'uppercase', fontSize: '0.85rem' }}>
            {(currentUser?.isSuperAdmin || currentUser?.appRole === 'direccion') ? 'MÚLTIPLES EQUIPOS (GLOBAL) • VISIÓN MÚLTIPLES SEDES' : (currentCycle ? `${currentCycle.name} • ETAPA: ${currentStage}` : 'CARGANDO CICLO...')}
          </p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={15} className="text-blue" />
              <span className="text-white" style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="text-muted" style={{ marginLeft: '0.3rem', fontSize: '0.85rem' }}>
                {time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>

            <span style={{ 
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 95, 70, 0.3))', 
              border: '1px solid #10b981', 
              color: '#10b981', 
              padding: '2px 8px', 
              borderRadius: '12px', 
              fontSize: '0.72rem', 
              fontWeight: 700, 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '5px' 
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }}></span>
              Causa OS v2.8.0
            </span>
          </div>
        </div>

        {/* CONTROLES SUPERIORES Y SELECTOR DE VISTA */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.8rem' }}>
          
          {/* SELECTOR DE MODO DE VISTA Y TEMA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Tema:</span>
              <ThemeToggle />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Vista:</span>
              <ViewModeSelector />
            </div>
          </div>

          {/* BUSCADOR GLOBAL (Opciones de Causa + Personas + Páginas y módulos + Equipos/Capitanes) */}
          <div ref={globalSearchRef} style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-strong)', borderRadius: '8px', padding: '0.45rem 0.75rem', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}>
              <Search size={15} className="text-muted" style={{ color: 'var(--crear-cyan)' }} />
              <input
                type="text"
                value={globalSearchTerm}
                onChange={(e) => { setGlobalSearchTerm(e.target.value); setShowGlobalSearchResults(true); }}
                onFocus={() => setShowGlobalSearchResults(true)}
                placeholder="Buscar opciones de Causa, páginas, personas, equipos..."
                style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
              {globalSearchTerm && (
                <X size={14} className="text-muted" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => { setGlobalSearchTerm(''); setShowGlobalSearchResults(false); }} />
              )}
            </div>

            {showGlobalSearchResults && globalSearchActive && (
              <div className="glass-panel dropdown-panel" style={{
                position: 'absolute',
                top: '110%',
                left: 0,
                right: 0,
                zIndex: 9999,
                maxHeight: '420px',
                overflowY: 'auto',
                padding: '0.6rem',
                background: '#0c1527',
                borderRadius: '14px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.95), 0 0 25px rgba(41, 171, 226, 0.2)',
                border: '1px solid rgba(41, 171, 226, 0.4)',
                textAlign: 'left'
              }}>
                {usersLoading && (
                  <div className="text-muted" style={{ fontSize: '0.78rem', padding: '0.4rem' }}>Cargando personas...</div>
                )}

                {!usersLoading && globalSearchOptionResults.length === 0 && globalSearchPeopleResults.length === 0 && globalSearchModuleResults.length === 0 && globalSearchTeamResults.length === 0 && (
                  <div className="text-muted" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>Sin resultados para "{globalSearchTerm}"</div>
                )}

                {/* ⚡ SECCIÓN DESTACADA: OPCIONES Y ACCIONES DE CAUSA */}
                {globalSearchOptionResults.length > 0 && (
                  <div style={{ marginBottom: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.4rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--crear-cyan)', textTransform: 'uppercase', padding: '0.2rem 0.4rem', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>⚡ Opciones y Acciones de Causa</span>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(41,171,226,0.18)', color: 'var(--crear-cyan)', padding: '1px 6px', borderRadius: '10px' }}>{globalSearchOptionResults.length}</span>
                    </div>
                    {globalSearchOptionResults.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectSearchOption(opt)}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem', width: '100%', textAlign: 'left', padding: '0.45rem 0.5rem', background: 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-main)', transition: 'background 0.15s ease' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(41,171,226,0.15)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ fontSize: '1.2rem', lineHeight: 1, marginTop: '2px', flexShrink: 0 }}>{opt.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>{opt.title}</span>
                            {opt.badge && (
                              <span style={{ fontSize: '0.63rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(41,171,226,0.2)', color: 'var(--crear-cyan)', fontWeight: 600 }}>{opt.badge}</span>
                            )}
                          </div>
                          {opt.desc && (
                            <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.3 }}>{opt.desc}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {globalSearchPeopleResults.length > 0 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--crear-gold)', textTransform: 'uppercase', padding: '0.2rem 0.4rem' }}>Personas</div>
                    {globalSearchPeopleResults.map((u, i) => (
                      <button
                        key={u.id || u.email || i}
                        onClick={() => handleSelectSearchPerson(u)}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', textAlign: 'left', padding: '0.45rem 0.5rem', background: 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-main)' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(41,171,226,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>👤 {u.name || u.displayName || u.email}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ROLE_DISPLAY_NAMES[u.role] || u.role || ''}{u.sede ? ` • ${u.sede}` : ''}</span>
                      </button>
                    ))}
                  </div>
                )}

                {globalSearchModuleResults.length > 0 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--crear-cyan)', textTransform: 'uppercase', padding: '0.2rem 0.4rem' }}>Páginas y módulos</div>
                    {globalSearchModuleResults.map(mod => (
                      <button
                        key={mod.id}
                        onClick={() => handleSelectSearchModule(mod)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', textAlign: 'left', padding: '0.45rem 0.5rem', background: 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.85rem' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(41,171,226,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {mod.emoji} {mod.label}
                      </button>
                    ))}
                  </div>
                )}

                {globalSearchTeamResults.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', padding: '0.2rem 0.4rem' }}>Equipos y Capitanes (Centro de Managers)</div>
                    {globalSearchTeamResults.map((item, i) => (
                      <button
                        key={item.key || i}
                        onClick={() => handleSelectSearchTeam(item)}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', textAlign: 'left', padding: '0.45rem 0.5rem', background: 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-main)' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(217,119,6,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {item.type === 'equipo' ? (
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>👥 Equipo {item.equipo}</span>
                        ) : (
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>🎖️ {item.nombre} (Capitán)</span>
                        )}
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.sede}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{currentUser?.name || currentUser?.displayName || 'Usuario'}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--crear-gold)', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                {currentUser?.isSuperAdmin && !currentUser?.isSimulated
                  ? <>Super Admin | Gerente Lima {getFlagForSede('Lima')}</>
                  : <>{ROLE_DISPLAY_NAMES[currentUser?.appRole] || currentUser?.appRole?.replace(/_/g, ' ') || 'Miembro'} {getFlagForSede(currentUser?.sede)}</>}
              </span>
              {currentUser?.roles && currentUser.roles.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '3px' }}>
                  <select
                    value={currentUser.activeRole || currentUser.appRole}
                    onChange={(e) => switchRole(e.target.value)}
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      background: 'rgba(255, 183, 3, 0.15)',
                      border: '1px solid var(--crear-gold)',
                      color: 'var(--text-heading)',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                    title="Cambiar tu rol activo"
                  >
                    {currentUser.roles.map(r => (
                      <option key={r} value={r} style={{ background: '#0d152d', color: '#ffffff' }}>
                        🎭 {ROLE_DISPLAY_NAMES[r] || r.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Avatar" style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2px solid var(--crear-gold)' }} />
            ) : (
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'var(--crear-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '2px solid var(--crear-gold)' }}>
                {currentUser?.displayName ? currentUser.displayName.charAt(0) : 'U'}
              </div>
            )}
            
            {/* Notificaciones */}
            <div style={{ position: 'relative' }} ref={notificationsRef}>
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} onClick={() => { setShowNotifications(!showNotifications); setShowToolsDropdown(false); }}>
                <Bell size={20} className="text-white" />
                {unreadCount > 0 && (
                  <div style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--color-error)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 'bold' }}>
                    {unreadCount}
                  </div>
                )}
              </div>

              {showNotifications && (
                <div className="glass-panel dropdown-panel" style={{
                  position: 'absolute',
                  top: '125%',
                  right: 0,
                  width: '360px',
                  zIndex: 9999,
                  padding: '1rem',
                  background: '#0c1527',
                  borderRadius: '14px',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.95), 0 0 25px rgba(41, 171, 226, 0.2)',
                  border: '1px solid rgba(41, 171, 226, 0.4)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.6rem' }}>
                    <h4 style={{ margin: 0, color: 'var(--crear-gold)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                      <span>🔔</span> Notificaciones
                    </h4>
                    <button
                      onClick={() => { markAllAsRead(); setShowNotifications(false); }}
                      style={{ background: 'rgba(41,171,226,0.15)', border: '1px solid rgba(41,171,226,0.3)', color: 'var(--crear-cyan)', fontSize: '0.72rem', padding: '3px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Marcar leídas
                    </button>
                  </div>
                  <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingRight: '0.4rem' }}>
                    {notifications?.length > 0 ? notifications.map(n => (
                      <div key={n.id} style={{
                        fontSize: '0.8rem',
                        padding: '0.75rem',
                        background: n.read ? 'rgba(255, 255, 255, 0.03)' : 'rgba(41, 171, 226, 0.12)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderLeft: n.read ? '1px solid rgba(255, 255, 255, 0.08)' : '3px solid var(--crear-cyan)'
                      }}>
                        <strong style={{ color: n.read ? 'var(--text-muted)' : '#ffffff', display: 'block', marginBottom: '0.2rem', fontSize: '0.84rem' }}>
                          {n.title || 'Alerta'}
                        </strong>
                        <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: '1.4', fontSize: '0.78rem' }}>
                          {n.message}
                        </p>
                        {n.created_at && (
                          <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {new Date(n.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    )) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', margin: '1.5rem 0' }}>
                        No tienes notificaciones recientes.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button 
              type="button"
              onClick={() => setShowTaskModal(true)} 
              className="btn-neon-action"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
            >
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span>
              <span>TAREA</span>
            </button>

            {/* BOTÓN DE COMUNICACIÓN EFECTIVA OFICIAL SEGÚN MATRIZ */}
            <EffectiveCommunicationButton currentUser={currentUser} />

            {/* BOTÓN SALIR */}
            <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <LogOut size={15} /> Salir
            </button>
          </div>
        </div>
      </div>

      {/* BARRA DE HERRAMIENTAS ADAPTABLE SEGÚN MODO */}
      {viewMode === 'compact' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.6rem 1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              onClick={() => navigate(currentUser?.appRole === 'gerente' ? '/gerente' : `/checklist/${currentUser?.appRole || 'capitan'}`)}
              className="btn-primary"
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              📋 Abrir Mi Checklist
            </button>
            <button
              onClick={() => navigate('/metas')}
              className="btn-secondary"
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
            >
              🎯 Mis Metas
            </button>
            {canAccessAgendaTimeBoxing(currentUser) && (
              <button
                onClick={() => setShowHorariosModal(true)}
                className="btn-secondary"
                title="Horarios oficiales de entrenamiento y código de vestimenta"
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', color: 'var(--crear-cyan)', borderColor: 'rgba(41, 171, 226, 0.5)', background: 'rgba(41, 171, 226, 0.12)', fontWeight: 'bold' }}
              >
                ⏰ Horarios y Vestimenta
              </button>
            )}
            {canAccessFlyersC1(currentUser) && (
              <button onClick={() => navigate('/generador-flyer')} className="btn-secondary" title="Generador de Flyers Oficiales para Capítulos Uno" style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.5)', background: 'rgba(245, 158, 11, 0.12)', fontWeight: 'bold' }}>
                🎨 Flyers C1 Globales
              </button>
            )}
          </div>

          {/* MENÚ DESPLEGABLE DE MÁS MÓDULOS */}
          <div style={{ position: 'relative' }} ref={toolsDropdownRef}>
            <button
              onClick={() => { setShowToolsDropdown(!showToolsDropdown); setShowNotifications(false); }}
              className="btn-secondary hover-glow"
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(41, 171, 226, 0.1)', borderColor: 'rgba(41, 171, 226, 0.4)', color: 'var(--crear-cyan)', fontWeight: 'bold' }}
            >
              🛠️ Más Módulos y Herramientas <ChevronDown size={16} />
            </button>

            {showToolsDropdown && (
              <div className="glass-panel dropdown-panel" style={{
                position: 'absolute',
                top: '120%',
                right: 0,
                width: '270px',
                zIndex: 9999,
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                background: '#0c1527',
                borderRadius: '14px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.95), 0 0 25px rgba(41, 171, 226, 0.2)',
                border: '1px solid rgba(41, 171, 226, 0.4)'
              }}>
                {['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado'].includes(currentUser?.appRole) ? (
                  <>
                    <button onClick={() => { setShowToolsDropdown(false); navigate('/gerente'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start' }}>
                      💼 Causa OS Gerencial
                    </button>
                    <button onClick={() => { setShowToolsDropdown(false); navigate('/portafolio'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', color: 'var(--crear-cyan)', background: 'rgba(41, 171, 226, 0.1)' }}>
                      📈 Portafolio PMO (Planview)
                    </button>
                    <button onClick={() => { setShowToolsDropdown(false); navigate('/estrategia'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}>
                      🎯 Estrategia OKRs (Cascade)
                    </button>
                    <button onClick={() => { setShowToolsDropdown(false); navigate('/auditoria-kpis'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start' }}>
                      📉 Auditoría de KPIs
                    </button>
                    <button onClick={() => { setShowToolsDropdown(false); navigate('/nodus-data-map'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }}>
                      🗺️ Nodus Data Map
                    </button>
                  </>
                ) : (
                  <button onClick={() => { setShowToolsDropdown(false); navigate(`/checklist/${currentUser?.appRole || 'capitan'}`); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start' }}>
                    💼 Mi Dashboard / Checklist
                  </button>
                )}

                {(currentUser?.appRole !== 'qt') && (
                  <button onClick={() => { setShowToolsDropdown(false); navigate('/acuerdos'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', color: '#a855f7', background: 'rgba(168, 85, 247, 0.1)' }}>
                    ✉️ Acuerdos Oficiales (Correo)
                  </button>
                )}

                {canAccessAgendaTimeBoxing(currentUser) && (
                  <>
                    <button onClick={() => { setShowToolsDropdown(false); navigate('/calendario-equipo'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', color: '#f97316', background: 'rgba(249, 115, 22, 0.1)' }}>
                      🗓️ Agenda y Time Boxing
                    </button>
                    <button onClick={() => { setShowToolsDropdown(false); setShowHorariosModal(true); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', color: 'var(--crear-cyan)', background: 'rgba(41, 171, 226, 0.1)' }}>
                      ⏰ Horarios de Entrenamientos
                    </button>
                  </>
                )}

                {(currentUser?.appRole !== 'qt') && (
                  <button onClick={() => { setShowToolsDropdown(false); navigate('/learning'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', background: 'rgba(41, 171, 226, 0.1)', color: 'var(--crear-cyan)' }}>
                    🧠 Inteligencia Colectiva (Learning)
                  </button>
                )}

                {(currentUser?.appRole !== 'qt') && (
                  <button onClick={() => { setShowToolsDropdown(false); navigate('/excelencia'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', background: 'rgba(255, 183, 3, 0.15)', color: 'var(--crear-gold)' }}>
                    👑 Excelencia Operativa
                  </button>
                )}

                {canAccessFlyersC1(currentUser) && (
                  <button onClick={() => { setShowToolsDropdown(false); navigate('/generador-flyer'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', fontWeight: 'bold' }}>
                    🎨 Generador de Flyers Oficiales
                  </button>
                )}

                {canAccessMonitorVuelos(currentUser) && (
                  <button 
                    onClick={() => { setShowToolsDropdown(false); navigate('/monitor-vuelos'); }} 
                    className="btn-secondary" 
                    style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(56, 189, 248, 0.3)', cursor: 'pointer' }}
                  >
                    ✈️ Monitor de Vuelos y Cartas
                  </button>
                )}

                {['coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'qt', 'capitan'].includes(currentUser?.appRole) && (
                  <button onClick={() => { setShowToolsDropdown(false); navigate('/mis-kpis'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start' }}>
                    📊 Mis KPIs
                  </button>
                )}

                {canAccessDirectorioQT(currentUser) && (
                  <button onClick={() => { setShowToolsDropdown(false); navigate('/directorio-qt'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start' }}>
                    ⚡ Directorio QT
                  </button>
                )}

                {['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado'].includes(currentUser?.appRole) && (
                  <button onClick={() => { setShowToolsDropdown(false); navigate('/superadmin'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start' }}>
                    🌐 Centro de Mando
                  </button>
                )}

                {['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado'].includes(currentUser?.appRole) && (
                  <button onClick={() => { setShowToolsDropdown(false); window.open('/calendario_global.html?v=' + Date.now() + '&email=' + encodeURIComponent(currentUser?.email || '') + '&name=' + encodeURIComponent(currentUser?.displayName || currentUser?.name || ''), '_blank'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start' }}>
                    📅 Calendario Global Maestro ↗
                  </button>
                )}

                {/* Campus Interactivo: Para TODOS los roles según Matriz */}
                <button onClick={() => { setShowToolsDropdown(false); window.open('https://cpsl-campus-interactivo.vercel.app/ruta', '_blank'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}>
                  🎓 Campus Interactivo ↗
                </button>

                {['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coordinador_mj', 'coord_maestria', 'entrenador', 'entrenador_llamadas', 'superadmin', 'consolidado'].includes(currentUser?.appRole) && (
                  <div style={{ display: 'flex', gap: '0.2rem', padding: '0.2rem' }}>
                    <button onClick={() => { setShowToolsDropdown(false); navigate('/centro-managers'); }} className="btn-secondary" style={{ flex: 1, textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start' }}>
                      🎯 Centro de Managers
                    </button>
                    <button onClick={() => { setShowToolsDropdown(false); navigate('/centro-managers?tab=directorio'); }} className="btn-secondary" style={{ padding: '0.5rem', fontSize: '0.82rem' }}>
                      👥
                    </button>
                  </div>
                )}

                {canAccessCalendarioMJ(currentUser) && (
                  <button onClick={() => { setShowToolsDropdown(false); navigate('/calendario-mj'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', color: '#1a75bc', background: 'rgba(26, 117, 188, 0.1)' }}>
                    📅 Calendario de Maestría del Juego
                  </button>
                )}

                <button onClick={() => { setShowToolsDropdown(false); navigate('/protocolo-emergencias'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.1)', fontWeight: 'bold' }}>
                  🚨 Protocolo de Emergencias
                </button>

                {canAccessManualQT(currentUser) && (
                  <button onClick={() => { setShowToolsDropdown(false); navigate('/manual'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start' }}>
                    📘 Manual / Guía Causa OS / QT
                  </button>
                )}

                {canAccessManualNodus(currentUser) && (
                  <button onClick={() => { setShowToolsDropdown(false); navigate('/manual-nodus'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.1)', fontWeight: 'bold' }}>
                    📗 Manual Práctico Nodus
                  </button>
                )}

                <button onClick={() => { setShowToolsDropdown(false); navigate('/vende-sin-vender'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', color: 'var(--crear-gold)', borderColor: 'rgba(255, 183, 3, 0.4)', background: 'rgba(255, 183, 3, 0.1)', fontWeight: 'bold' }}>
                  📖 Vende Sin Vender (Causa OS)
                </button>

                <button onClick={() => { setShowToolsDropdown(false); navigate('/brandscript'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)', background: 'rgba(56, 189, 248, 0.1)', fontWeight: 'bold' }}>
                  📜 BrandScript & Guiones MJ
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BARRA PRO COMPLETA (SI ESTÁ EN MODO PRO) */}
      {viewMode === 'pro' && customModules.advancedTools !== false && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          {canAccessAgendaTimeBoxing(currentUser) && (
            <button onClick={() => setShowHorariosModal(true)} className="btn-primary" title="Horarios oficiales de entrenamiento y código de vestimenta" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #06b6d4, #0284c7)', color: 'white', fontWeight: 'bold', border: 'none' }}>
              ⏰ Horarios y Vestimenta
            </button>
          )}
          {['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado'].includes(currentUser?.appRole) ? (
            <button onClick={() => navigate('/gerente')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'var(--crear-gold)', color: 'black' }}>
              💼 SO-AR Gerencial
            </button>
          ) : (
            <button onClick={() => navigate(`/checklist/${currentUser?.appRole || 'capitan'}`)} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'var(--crear-gold)', color: 'black' }}>
              💼 Mi Dashboard
            </button>
          )}
          {['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado'].includes(currentUser?.appRole) && (
            <>
              <button onClick={() => navigate('/portafolio')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', color: 'white', border: 'none' }}>
                📈 Portafolio PMO
              </button>
              <button onClick={() => navigate('/estrategia')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #10b981, #047857)', color: 'white', border: 'none' }}>
                🎯 OKRs (Cascade)
              </button>
              <button onClick={() => navigate('/auditoria-kpis')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid #10b981', color: '#10b981' }}>
                📉 Auditoría KPIs
              </button>
            </>
          )}

          {['coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'qt', 'capitan'].includes(currentUser?.appRole) && (
            <button onClick={() => navigate('/mis-kpis')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #10b981, #047857)', color: 'white', border: 'none' }}>
              📊 Mis KPIs
            </button>
          )}

          {canAccessManualQT(currentUser) && (
            <button onClick={() => navigate('/manual')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #0284c7, #2563eb)', color: 'white', border: 'none' }}>
              📘 Manual QT
            </button>
          )}

          {canAccessManualNodus(currentUser) && (
            <button onClick={() => navigate('/manual-nodus')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #10b981, #047857)', color: 'white', border: 'none' }}>
              📗 Manual Nodus
            </button>
          )}

          {canAccessDirectorioQT(currentUser) && (
            <button onClick={() => navigate('/directorio-qt')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none' }}>
              ⚡ Directorio QT
            </button>
          )}

          {['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado'].includes(currentUser?.appRole) && (
            <button onClick={() => navigate('/superadmin')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #8b5cf6, #29abe2)', color: 'white', border: 'none' }}>
              🌐 Centro de Mando
            </button>
          )}

          {['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado'].includes(currentUser?.appRole) && (
            <button onClick={() => window.open('/calendario_global.html?v=' + Date.now() + '&email=' + encodeURIComponent(currentUser?.email || '') + '&name=' + encodeURIComponent(currentUser?.displayName || currentUser?.name || ''), '_blank')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white', border: 'none' }}>
              📅 Calendario Global
            </button>
          )}

          {/* Campus Interactivo: abierto a TODOS los 9 roles */}
          <button onClick={() => window.open('https://cpsl-campus-interactivo.vercel.app/ruta', '_blank')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none' }}>
            🎓 Campus Interactivo
          </button>

          {['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coordinador_mj', 'coord_maestria', 'entrenador', 'entrenador_llamadas', 'superadmin', 'consolidado'].includes(currentUser?.appRole) && (
            <button onClick={() => navigate('/centro-managers')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000', fontWeight: 'bold', border: 'none' }}>
              👑 Centro Managers
            </button>
          )}

          {canAccessCalendarioMJ(currentUser) && (
            <button onClick={() => navigate('/calendario-mj')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #1a75bc, #29abe2)', color: 'white', border: 'none' }}>
              📅 Calendario MJ
            </button>
          )}

          {canAccessFlyersC1(currentUser) && (
            <button onClick={() => navigate('/generador-flyer')} className="btn-primary" title="Generador de Flyers Oficiales para Capítulos Uno" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #f59e0b, #ec4899)', color: 'white', fontWeight: 'bold', border: 'none', boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)' }}>
              🎨 Flyers C1 Globales
            </button>
          )}

          {canAccessMonitorVuelos(currentUser) && (
            <button onClick={() => navigate('/monitor-vuelos')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #38bdf8, #0284c7)', color: 'white', fontWeight: 'bold', border: 'none' }}>
              ✈️ Monitor de Vuelos
            </button>
          )}
        </div>
      )}

      {/* BANNER INTERACTIVO DE SOLICITUDES DE COLABORACIÓN */}
      {(() => {
        const pendingInvites = (notifications || []).filter(n => n.type === 'COLLABORATION_INVITE' && !n.read && n.status !== 'ACEPTADA' && n.status !== 'RECHAZADA');
        if (pendingInvites.length === 0) return null;

        return (
          <div className="glass-panel" style={{ padding: '1.2rem', marginBottom: '1.5rem', border: '1px solid rgba(0, 210, 255, 0.4)', background: 'rgba(0, 210, 255, 0.05)', boxShadow: '0 0 25px rgba(0, 210, 255, 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
              <Users size={20} color="var(--crear-blue)" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff' }}>
                🤝 Invitaciones de Colaboración ({pendingInvites.length} pendientes)
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {pendingInvites.map(inv => (
                <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 0, 0, 0.35)', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)', flexWrap: 'wrap', gap: '0.8rem' }}>
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--crear-blue)', fontSize: '0.9rem' }}>{inv.title}</div>
                    <div style={{ color: 'var(--text-main)', fontSize: '0.82rem', marginTop: '0.2rem' }}>{inv.message}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                      Tarea: <strong style={{ color: '#ffffff' }}>{inv.taskTitle}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => acceptCollaboration(inv)}
                      className="btn-neon-action"
                      style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}
                    >
                      ✅ Aceptar
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectCollaboration(inv)}
                      className="btn-secondary"
                      style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem' }}
                    >
                      ❌ Declinar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* VISTA MODO LITE (ULTRA-LIMPIO / ENFOQUE DIARIO) */}
      {/* ======================================================== */}
      {viewMode === 'lite' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* TARJETA HERO: MI ENFOQUE DE HOY */}
          <div className="glass-panel" style={{ padding: '1.8rem', border: '1px solid rgba(212, 175, 55, 0.3)', background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.08) 0%, rgba(13, 21, 45, 0.9) 100%)', boxShadow: '0 15px 35px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--crear-gold)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>⚡ Vista Rápida Diaria</span>
                <h2 style={{ margin: '0.2rem 0 0 0', color: '#ffffff', fontSize: '1.5rem', fontWeight: '800' }}>Tus Pendientes Críticos</h2>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--crear-gold)' }}>{progressPercentage}%</span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>cumplimiento</span>
              </div>
            </div>

            {/* Barra de Progreso */}
            <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div style={{ height: '100%', width: `${progressPercentage}%`, background: 'linear-gradient(90deg, #29abe2, #d4af37)', transition: 'width 0.5s ease-out' }} />
            </div>

            {/* Resumen de contadores */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem', marginBottom: '1.5rem' }}>
              <div 
                onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=criticas`)}
                style={{ padding: '0.8rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}
              >
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ef4444' }}>{criticasCount}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🔴 Críticas</div>
              </div>
              <div 
                onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=importantes`)}
                style={{ padding: '0.8rem', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}
              >
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ffb347' }}>{importantesCount}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🟡 Importantes</div>
              </div>
              <div 
                onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=completed`)}
                style={{ padding: '0.8rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}
              >
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#10b981' }}>{completedForProgress}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🟢 Listas</div>
              </div>
            </div>

            {/* Lista de Tareas Urgentes (Top 5 en Lite) */}
            <h4 style={{ margin: '0 0 0.8rem 0', color: 'var(--crear-cyan)', fontSize: '0.95rem' }}>🎯 Tareas para Hoy:</h4>
            {urgentTasks.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ margin: 0, color: '#10b981', fontWeight: 'bold' }}>¡Excelente! No tienes tareas urgentes pendientes.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {urgentTasks.slice(0, 5).map(task => {
                  const isCrit = task.isCritical || task.priority === '🔴 ROJO';
                  const color = isCrit ? '#ef4444' : '#ffb347';
                  const bg = isCrit ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.08)';

                  return (
                    <div 
                      key={task.id}
                      onClick={() => navigate(currentUser?.appRole === 'gerente' ? '/gerente' : `/checklist/${currentUser?.appRole}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        background: bg,
                        border: `1px solid ${color}33`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'transform 0.15s'
                      }}
                      onMouseOver={e => e.currentTarget.style.transform = 'translateX(4px)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'translateX(0)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.88rem', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.task || task.title}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--crear-gold)', fontWeight: 'bold', marginLeft: '0.5rem', flexShrink: 0 }}>
                        ⏰ {task.deadline || calculateAutomaticDeadline(task, currentCycle)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* BOTONES PRINCIPALES DE ACCIÓN */}
            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => navigate('/gerente-dashboard')}
                    style={{ flex: 1, padding: '0.8rem', background: 'var(--crear-blue)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 10px rgba(2, 132, 199, 0.3)' }}
                  >
                    <ArrowUpRight size={18} />
                    <span>
                      💼 Causa OS Gerencial
                    </span>
                  </button>
              <button 
                className="btn-primary" 
                onClick={() => navigate(currentUser?.appRole === 'gerente' ? '/gerente' : `/checklist/${currentUser?.appRole || 'capitan'}`)} 
                style={{ flex: 2, minWidth: '200px', padding: '0.85rem 1.5rem', fontSize: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <span>👉 Ir a mi Checklist Completo</span>
                <ArrowRight size={18} />
              </button>
              <button
                className="btn-secondary"
                onClick={() => navigate('/metas')}
                style={{ flex: 1, minWidth: '130px', padding: '0.85rem 1rem', fontSize: '0.95rem', fontWeight: 'bold' }}
              >
                🎯 Mis Metas
              </button>
              {['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado'].includes(currentUser?.appRole) && (
                <button
                  className="btn-secondary hover-glow"
                  onClick={() => navigate('/superadmin')}
                  title="Directorio Global — Panel Super Admin"
                  style={{ flex: 1, minWidth: '150px', padding: '0.85rem 1rem', fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: 'rgba(139, 92, 246, 0.12)', borderColor: 'rgba(139, 92, 246, 0.4)', color: '#a78bfa' }}
                >
                  🌐 Directorio Global
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA MODO COMPACTO / PRO */}
      {/* ======================================================== */}
      {viewMode !== 'lite' && (
        <>
          {/* MI PROGRESO GENERAL */}
          {(viewMode === 'compact' || customModules.progress !== false) && !['entrenador', 'entrenador_llamadas'].includes(currentUser?.appRole) && (
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <h3 className="text-main" style={{ margin: 0, fontSize: '1.1rem' }}>Mi Progreso General en el Ciclo</h3>
                <span className="text-gold" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{progressPercentage}%</span>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPercentage}%`, background: 'var(--crear-gold)', transition: 'width 0.5s ease-out' }} />
              </div>
            </div>
          )}

          {/* PANEL DE EVENTOS */}
          {(viewMode === 'compact' || customModules.events !== false) && (
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                <h3 className="text-blue" style={{ marginTop: 0, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                  <CalendarIcon size={18} /> EVENTOS Y ENTRENAMIENTOS
                </h3>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {canAccessHotelesSede(currentUser) && (
                    <button 
                      type="button"
                      onClick={() => setShowVenueModal(true)}
                      className="btn-secondary"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
                      title="Configurar el hotel o salón oficial por defecto de la sede"
                    >
                      🏨 Hoteles / Salones
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: '0.4rem', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '0.6rem' }}>
                    <button 
                      onClick={() => {
                        setActiveEventTab('locales');
                        setSelectedSedeFilter('todas');
                      }}
                      style={{ background: 'none', border: 'none', color: activeEventTab === 'locales' ? 'var(--crear-gold)' : 'var(--text-muted)', fontWeight: activeEventTab === 'locales' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      {['entrenador', 'entrenador_llamadas'].includes(currentUser?.appRole) ? 'MIS FECHAS' : 'MI SEDE'}
                    </button>
                    {(!['entrenador', 'entrenador_llamadas'].includes(currentUser?.appRole) && (currentUser?.isSuperAdmin || currentUser?.isDireccion || currentUser?.isGerente || ['gerente', 'direccion', 'director_maestria', 'cfo'].includes(currentUser?.appRole) || currentUser?.sede?.toLowerCase().includes('global'))) && (
                      <button 
                        onClick={() => setActiveEventTab('globales')}
                        style={{ background: 'none', border: 'none', color: activeEventTab === 'globales' ? 'var(--crear-gold)' : 'var(--text-muted)', fontWeight: activeEventTab === 'globales' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        GLOBAL
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Filtros */}
              <div style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                alignItems: 'center', 
                flexWrap: 'wrap', 
                marginBottom: '1rem', 
                background: 'rgba(255,255,255,0.03)', 
                padding: '0.5rem 0.7rem', 
                borderRadius: '8px', 
                border: '1px solid rgba(255,255,255,0.06)' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={13} style={{ color: 'var(--crear-blue)' }} />
                  <select 
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    <option value="futuros" style={{ background: '#0d152d' }}>⏳ Próximos</option>
                    <option value="hoy" style={{ background: '#0d152d' }}>🔥 Hoy</option>
                    <option value="todos" style={{ background: '#0d152d' }}>🗓 Todos</option>
                    <option value="pasados" style={{ background: '#0d152d' }}>📁 Historial</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Filter size={13} style={{ color: 'var(--crear-gold)' }} />
                  <select 
                    value={selectedTrainingFilter}
                    onChange={(e) => setSelectedTrainingFilter(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    <option value="todos" style={{ background: '#0d152d' }}>Todos los tipos</option>
                    <option value="C1" style={{ background: '#0d152d' }}>Capítulo 1</option>
                    <option value="C2" style={{ background: '#0d152d' }}>Capítulo 2</option>
                    <option value="MJ" style={{ background: '#0d152d' }}>Maestría del Juego</option>
                    <option value="VIAJE" style={{ background: '#0d152d' }}>Viajes</option>
                    <option value="OTROS" style={{ background: '#0d152d' }}>Confianza / Tanque</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flex: 1, minWidth: '150px' }}>
                  <Search size={13} style={{ color: 'var(--text-muted)' }} />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar evento, trainer o lugar..."
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.78rem', width: '100%' }}
                  />
                </div>
              </div>

              {/* Lista de eventos filtrados */}
              {loadingEvents ? (
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Cargando eventos oficiales...</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {(() => {
                    const role = currentUser?.appRole || '';
                    const isSuperOrDir = currentUser?.isSuperAdmin || currentUser?.isDireccion || ['direccion', 'cfo', 'ceo', 'cco', 'superadmin', 'consolidado'].includes(role);
                    const isGerente = role === 'gerente' || currentUser?.isGerente;
                    const isCoordC1C2 = ['coord_c1', 'coord_c2', 'coordinador_c1c2'].includes(role);
                    const isCoordMJ = ['coord_maestria', 'coordinador_mj', 'director_maestria'].includes(role);
                    const isEntrenador = ['entrenador', 'entrenador_llamadas'].includes(role);
                    const isQT = role === 'qt' || (currentUser?.roles || []).includes('qt');
                    const isEquipoRole = ['capitan', 'aliado', 'manager'].includes(role);

                    let displayEvents = (events || []).filter(ev => {
                      // 1. Entrenadores: solo los eventos que él/ella dictará
                      if (isEntrenador) {
                        return isTrainerMatchingUser(ev.trainer || ev.entrenador, currentUser);
                      }

                      // 2. Coordinadores C1/C2: solo los de su sede y solo C1/C2
                      if (isCoordC1C2) {
                        const userSede = currentUser?.sede || '';
                        const evSede = ev.sede || ev.sedeTag || '';
                        if (userSede && !userSede.toLowerCase().includes('global')) {
                          if (!evSede || (!evSede.toLowerCase().includes(userSede.toLowerCase()) && !userSede.toLowerCase().includes(evSede.toLowerCase()))) {
                            return false;
                          }
                        }
                        const name = (ev.nombre || ev.name || '').toUpperCase();
                        return name.includes('CAPITULO UNO') || name.includes('C1') || name.includes('CAPÍTULO UNO') || name.includes('CAPITULO DOS') || name.includes('C2') || name.includes('CAPÍTULO DOS');
                      }

                      // 3. Coordinadores MJ: solo los de su sede y solo MJ
                      if (isCoordMJ) {
                        const userSede = currentUser?.sede || '';
                        const evSede = ev.sede || ev.sedeTag || '';
                        if (userSede && !userSede.toLowerCase().includes('global')) {
                          if (!evSede || (!evSede.toLowerCase().includes(userSede.toLowerCase()) && !userSede.toLowerCase().includes(evSede.toLowerCase()))) {
                            return false;
                          }
                        }
                        const name = (ev.nombre || ev.name || '').toUpperCase();
                        return name.includes('MAESTRIA') || name.includes('MJ') || name.includes('MAESTRÍA');
                      }

                      // 4. Capitanes, Aliados y Managers: solo los de su equipo
                      if (isEquipoRole) {
                        const userTeam = (currentUser?.equipo || currentUser?.equipoAsignado || '').toLowerCase().trim();
                        if (userTeam) {
                          const name = (ev.nombre || ev.name || '').toLowerCase();
                          const desc = (ev.descripcion || ev.desc || '').toLowerCase();
                          return name.includes(userTeam) || desc.includes(userTeam);
                        }
                        const userSede = currentUser?.sede || '';
                        const evSede = ev.sede || ev.sedeTag || '';
                        if (userSede && !userSede.toLowerCase().includes('global')) {
                          if (!evSede || (!evSede.toLowerCase().includes(userSede.toLowerCase()) && !userSede.toLowerCase().includes(evSede.toLowerCase()))) {
                            return false;
                          }
                        }
                        return true;
                      }

                      // 5. Filtro tab locales vs globales para Gerentes y Directivos
                      if (activeEventTab === 'locales' || (isGerente && !isSuperOrDir)) {
                        const userSede = currentUser?.sede || '';
                        if (!userSede || userSede.toLowerCase().includes('global')) return true;
                        const evSede = ev.sede || ev.sedeTag || '';
                        if (!evSede) return false;
                        return evSede.toLowerCase().includes(userSede.toLowerCase()) || userSede.toLowerCase().includes(evSede.toLowerCase());
                      }

                      return true;
                    });

                    if (searchQuery.trim()) {
                      const q = searchQuery.toLowerCase().trim();
                      displayEvents = displayEvents.filter(ev => {
                        const name = (ev.nombre || ev.name || '').toLowerCase();
                        const trainer = (ev.trainer || ev.entrenador || '').toLowerCase();
                        const sede = (ev.sede || ev.sedeTag || ev.place || ev.address || ev.lugar || '').toLowerCase();
                        return name.includes(q) || trainer.includes(q) || sede.includes(q);
                      });
                    }

                    if (timeFilter !== 'todos') {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const now = today.getTime();
                      displayEvents = displayEvents.filter(ev => {
                        const evDate = new Date(ev.fecha_inicio || ev.start || new Date());
                        evDate.setHours(0, 0, 0, 0);
                        const evTime = evDate.getTime();
                        if (timeFilter === 'futuros') return evTime >= now;
                        if (timeFilter === 'pasados') return evTime < now;
                        if (timeFilter === 'hoy') return evTime === now;
                        return true;
                      });
                    }

                    if (selectedTrainingFilter !== 'todos') {
                      displayEvents = displayEvents.filter(ev => {
                        const name = (ev.nombre || ev.name || '').toUpperCase();
                        if (selectedTrainingFilter === 'C1') return name.includes('CAPITULO UNO') || name.includes('C1') || name.includes('CAPÍTULO UNO');
                        if (selectedTrainingFilter === 'C2') return name.includes('CAPITULO DOS') || name.includes('C2') || name.includes('CAPÍTULO DOS');
                        if (selectedTrainingFilter === 'MJ') return name.includes('MAESTRIA') || name.includes('MJ') || name.includes('MAESTRÍA');
                        if (selectedTrainingFilter === 'VIAJE') return name.includes('VIAJE') || name.includes('RETIRO');
                        if (selectedTrainingFilter === 'OTROS') return !name.includes('CAPITULO') && !name.includes('MAESTRIA') && !name.includes('VIAJE') && !name.includes('CAPÍTULO') && !name.includes('MAESTRÍA');
                        return true;
                      });
                    }

                    // Sort events by date ascending so closest events show first
                    displayEvents.sort((a, b) => {
                      const dateA = new Date(a.fecha_inicio || a.start || 0).getTime();
                      const dateB = new Date(b.fecha_inicio || b.start || 0).getTime();
                      return timeFilter === 'pasados' ? dateB - dateA : dateA - dateB; // Past events descending, future ascending
                    });

                    // --- QT Filter Logic: solo de su sede, solo C1 y C2 actual y próximo ---
                    if (isQT) {
                      const qtNow = new Date().getTime();
                      const userSede = currentUser?.sede || '';
                      let c1Count = 0;
                      let c2Count = 0;
                      displayEvents = displayEvents.filter(ev => {
                        if (userSede && !userSede.toLowerCase().includes('global')) {
                          const evSede = ev.sede || ev.sedeTag || '';
                          if (!evSede || (!evSede.toLowerCase().includes(userSede.toLowerCase()) && !userSede.toLowerCase().includes(evSede.toLowerCase()))) {
                            return false;
                          }
                        }
                        const dateMs = new Date(ev.fecha_inicio || ev.start || 0).getTime();
                        if (dateMs < qtNow) return false;
                        const name = (ev.nombre || ev.name || '').toUpperCase();
                        if (name.includes('CAPITULO UNO') || name.includes('C1') || name.includes('CAPÍTULO UNO')) {
                          c1Count++;
                          return c1Count <= 2;
                        }
                        if (name.includes('CAPITULO DOS') || name.includes('C2') || name.includes('CAPÍTULO DOS')) {
                          c2Count++;
                          return c2Count <= 2;
                        }
                        return false; // QTs SOLO ven C1 y C2 de su sede (actual y próximo)
                      });
                    }

                    if (displayEvents.length === 0) {
                      return (
                        <div style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
                          <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>No hay eventos registrados en este filtro.</p>
                        </div>
                      );
                    }

                    return (
                      <div style={{ maxHeight: '320px', overflowY: 'auto', paddingRight: '0.4rem' }}>
                        {displayEvents.slice(0, 8).map((ev, i) => {
                          const baseDate = ev.fecha_inicio || ev.start;
                          const evStartDate = new Date(baseDate || new Date());
                          let evEndDate = new Date(ev.fecha_fin || baseDate || new Date());
                          const hotelVenue = getVenueForTraining(ev.sede || ev.sedeTag || currentUser?.sede, ev.nombre || ev.name, ev.lugar, ev.direccion);

                          return (
                            <li key={i} style={{ padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.8rem' }}>
                              <div style={{ minWidth: 0 }}>
                                <span className="text-white" style={{ fontWeight: 'bold', fontSize: '0.92rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {ev.nombre || ev.name || 'Entrenamiento'}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--crear-cyan)', display: 'block', marginTop: '0.1rem' }}>
                                  🏨 {hotelVenue}
                                </span>
                                {(!['qt', 'capitan', 'manager', 'aliado'].includes(currentUser?.appRole)) && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.1rem' }}>
                                    🎙️ Trainer: {ev.trainer || ev.entrenador || 'Por confirmar'}
                                  </span>
                                )}
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <span className="text-gold" style={{ fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'flex-end' }}>
                                  <MapPin size={11} /> {getFlagForSede(ev.sede || ev.sedeTag)} {ev.sede || ev.sedeTag || 'GLOBAL'}
                                </span>
                                <span className="text-muted" style={{ fontSize: '0.75rem', display: 'block' }}>
                                  {ev.fecha_inicio ? ev.fecha_inicio.substring(0, 10) : ''}
                                </span>
                                <button 
                                  onClick={() => handleAddEventToGoogle(ev, evStartDate, evEndDate)}
                                  style={{ background: 'transparent', border: '1px solid rgba(41, 171, 226, 0.3)', color: 'var(--crear-cyan)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.25rem', cursor: 'pointer', marginLeft: 'auto' }}
                                  title="Agendar en Google Calendar"
                                >
                                  <CalendarPlus size={11} /> Agendar
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </div>
                    );
                  })()}
                </ul>
              )}
            </div>
          )}

          {/* GRID DE PENDIENTES & PRIORIDAD TOP 3 */}
          {(viewMode === 'compact' || customModules.todayTasks !== false) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>
              
              {/* PANEL HOY */}
              <div className="glass-panel" style={{ padding: '1.2rem' }}>
                <h3 className="text-blue" style={{ marginTop: 0, borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.4rem', fontSize: '1rem' }}>HOY (Tus Pendientes)</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0.8rem 0 0 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <li 
                    onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=criticas`)}
                    style={{ padding: '0.65rem 0.8rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', color: 'var(--color-error)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.85rem' }}
                  >
                    <AlertCircle size={16} /> <strong>{criticasCount}</strong> críticas (Hoy)
                  </li>
                  <li 
                    onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=importantes`)}
                    style={{ padding: '0.65rem 0.8rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px', color: '#ffb347', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '0.85rem' }}
                  >
                    <Circle size={16} /> <strong>{importantesCount}</strong> importantes
                  </li>
                  <li 
                    onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=completed`)}
                    style={{ padding: '0.65rem 0.8rem', background: 'rgba(52, 168, 83, 0.1)', borderRadius: '6px', color: 'var(--color-success)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(52, 168, 83, 0.2)', fontSize: '0.85rem' }}
                  >
                    <CheckCircle2 size={16} /> <strong>{completedForProgress}</strong> completadas
                  </li>
                </ul>
              </div>

              {/* PANEL PRIORIDAD TOP 3 */}
              <div className="glass-panel" style={{ padding: '1.2rem' }}>
                <h3 className="text-blue" style={{ marginTop: 0, borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.4rem', fontSize: '1rem' }}>TU PRIORIDAD (Top 3)</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0.8rem 0 0 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {urgentTasks.slice(0, 3).length === 0 ? (
                    <li className="text-muted" style={{ padding: '0.5rem 0', fontSize: '0.85rem' }}>No tienes tareas urgentes pendientes. ¡Excelente!</li>
                  ) : (
                    urgentTasks.slice(0, 3).map(task => {
                      const isCrit = task.isCritical || task.priority === '🔴 ROJO';
                      const color = isCrit ? 'var(--color-error)' : '#ffb347';
                      const bg = isCrit ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)';

                      return (
                        <li 
                          key={task.id}
                          onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=${isCrit ? 'criticas' : 'importantes'}`)}
                          style={{ padding: '0.65rem 0.8rem', background: bg, borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', border: `1px solid ${color}33` }}
                        >
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }}></span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span className="text-white" style={{ fontSize: '0.82rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {task.task || task.title}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--crear-gold)', fontWeight: 'bold' }}>
                              ⏰ Límite: {task.deadline || calculateAutomaticDeadline(task, currentCycle)}
                            </span>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* PANEL: TAREAS QUE HAS ASIGNADO A OTROS (con cuenta regresiva) */}
          {tareasQueHeAsignado.length > 0 && (() => {
            // Clasificación para las pestañas de filtro (Activas/Vencidas/Cumplidas/Todas).
            const clasificadas = tareasQueHeAsignado.map(task => {
              const isDone = task.completed || task.status === 'Completada';
              const isOverdue = !isDone && getCountdownInfo(task.deadline, time).overdue;
              return { task, isDone, isOverdue };
            });
            const counts = {
              Activas: clasificadas.filter(c => !c.isDone && !c.isOverdue).length,
              Vencidas: clasificadas.filter(c => c.isOverdue).length,
              Cumplidas: clasificadas.filter(c => c.isDone).length,
              Todas: clasificadas.length
            };
            const visibles = clasificadas.filter(c => {
              if (tareasAsignadasFilter === 'Activas') return !c.isDone && !c.isOverdue;
              if (tareasAsignadasFilter === 'Vencidas') return c.isOverdue;
              if (tareasAsignadasFilter === 'Cumplidas') return c.isDone;
              return true; // Todas
            });

            return (
            <div className="glass-panel" style={{ padding: '1.2rem', marginBottom: '2rem' }}>
              <h3 className="text-blue" style={{ marginTop: 0, borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.4rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                📋 MIS TAREAS ASIGNADAS ({tareasQueHeAsignado.length})
              </h3>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.8rem' }}>
                {['Activas', 'Vencidas', 'Cumplidas', 'Todas'].map(f => (
                  <button
                    key={f}
                    onClick={() => setTareasAsignadasFilter(f)}
                    style={{
                      padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                      border: `1px solid ${tareasAsignadasFilter === f ? 'var(--crear-cyan)' : 'var(--border-subtle)'}`,
                      background: tareasAsignadasFilter === f ? 'rgba(41, 171, 226, 0.18)' : 'transparent',
                      color: tareasAsignadasFilter === f ? 'var(--crear-cyan)' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    {f} ({counts[f]})
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.8rem', maxHeight: '360px', overflowY: 'auto' }}>
                {visibles.length === 0 && (
                  <p className="text-muted" style={{ fontSize: '0.82rem', padding: '0.5rem 0' }}>No hay tareas en "{tareasAsignadasFilter}".</p>
                )}
                {visibles.map(({ task, isDone }) => {
                  const countdown = getCountdownInfo(task.deadline, time);
                  const emails = task.assignedToEmails && task.assignedToEmails.length > 0
                    ? task.assignedToEmails
                    : (task.assignedToEmail ? [task.assignedToEmail] : []);
                  const asignadosLabel = emails.length > 0 ? emails.map(resolveAssigneeName).join(', ') : 'Cualquiera en el rol';
                  const esCreador = task.__direction === 'asignada_por_mi';

                  return (
                    <div
                      key={task.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap',
                        padding: '0.65rem 0.8rem', borderRadius: '8px',
                        background: isDone ? 'rgba(52, 168, 83, 0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isDone ? 'rgba(52, 168, 83, 0.25)' : 'var(--border-subtle)'}`
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '160px' }}>
                        <span className="text-white" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block' }}>
                          {isDone ? '✅ ' : ''}{task.task || task.title}
                          <span style={{
                            marginLeft: '0.5rem', fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem',
                            borderRadius: '10px', verticalAlign: 'middle',
                            background: esCreador ? 'rgba(41, 171, 226, 0.15)' : 'rgba(255, 193, 7, 0.15)',
                            color: esCreador ? 'var(--crear-cyan)' : '#ffc107',
                            border: `1px solid ${esCreador ? 'rgba(41, 171, 226, 0.4)' : 'rgba(255, 193, 7, 0.4)'}`
                          }}>
                            {esCreador ? '→ TÚ ASIGNASTE' : '← TE ASIGNARON'}
                          </span>
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {esCreador ? `👤 Asignada a: ${asignadosLabel}` : `👤 Asignada por: ${resolveAssigneeName(task.createdBy)}`}
                        </span>
                      </div>
                      {!isDone && (
                        <span style={{
                          fontSize: '0.88rem', fontWeight: 800, padding: '0.42rem 0.9rem', borderRadius: '20px',
                          color: countdown.color, background: countdown.bg, border: `2px solid ${countdown.border}`,
                          whiteSpace: 'nowrap', letterSpacing: '0.02em',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.25)'
                        }}>
                          {countdown.label}
                        </span>
                      )}
                      {esCreador && (
                        <button
                          onClick={() => { setTaskBeingEdited(task); setShowTaskModal(true); }}
                          title="Editar tarea"
                          style={{
                            background: 'rgba(41, 171, 226, 0.12)', border: '1px solid rgba(41, 171, 226, 0.4)',
                            borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.72rem', fontWeight: 700,
                            color: 'var(--crear-cyan)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0
                          }}
                        >
                          ✏️ Editar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })()}

          {/* BOTONES INFERIORES */}
          {(viewMode === 'compact' || customModules.shortcuts !== false) && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
              <button 
                className="btn-primary" 
                onClick={() => navigate(currentUser?.appRole === 'gerente' ? '/gerente' : `/checklist/${currentUser?.appRole || 'capitan'}`)} 
                style={{ padding: '0.8rem 1.6rem', fontSize: '1rem', fontWeight: 'bold' }}
              >
                IR A MI CHECKLIST OPERATIVO ({ROLE_DISPLAY_NAMES[currentUser?.appRole] || currentUser?.appRole?.toUpperCase()})
              </button>
              <button className="btn-secondary" onClick={() => navigate('/metas')} style={{ padding: '0.8rem 1.4rem', fontSize: '1rem', fontWeight: 'bold' }}>
                VER MIS METAS
              </button>
              {(currentUser?.isSuperAdmin || currentUser?.isGerente || ['coord_c1', 'coord_maestria', 'capitan', 'qt', 'direccion', 'director_maestria', 'consolidado'].includes(currentUser?.appRole)) && (
                <button className="btn-secondary" onClick={() => navigate('/reportes')} style={{ padding: '0.8rem 1.4rem', fontSize: '1rem', fontWeight: 'bold' }}>
                  ENVIAR REPORTES
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL ASIGNAR TAREA */}
      <TaskAssignmentModal
        isOpen={showTaskModal}
        onClose={() => { setShowTaskModal(false); setTaskBeingEdited(null); }}
        taskToEdit={taskBeingEdited}
      />

      {/* MODAL CONFIGURACIÓN DE HOTELES Y SALONES */}
      <VenueConfigModal isOpen={showVenueModal} onClose={() => setShowVenueModal(false)} />

      {/* MODAL DE PERFIL DE PERSONA (abierto desde el Buscador Global) */}
      {showSearchUserModal && selectedSearchUser && (
        <UserProfileModal isOpen={showSearchUserModal} onClose={() => setShowSearchUserModal(false)} user={selectedSearchUser} allTasks={allTasks} />
      )}

      {/* MODAL HORARIOS DE ENTRENAMIENTOS Y CÓDIGO DE VESTIMENTA */}
      <HorariosEntrenamientoModal isOpen={showHorariosModal} onClose={() => setShowHorariosModal(false)} />
    </div>
  );
}
