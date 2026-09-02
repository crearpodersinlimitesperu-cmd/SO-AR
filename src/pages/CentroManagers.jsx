import { getWhatsAppUrl } from '../utils/phoneUtils';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import {
  canAddManagers,
  canAssignTrainer,
  canChangeManagerStatus,
  canViewAllManagers,
  canViewSede,
  isDireccionRole,
  isGlobalQTCoordinator,
  hasQTPrivileges,
  DUAL_ROLE_TRAINER_EMAILS,
  canViewLiquidacionEntrenadores
} from '../config/permissions';
import { 
  INITIAL_MANAGERS, 
  INITIAL_LLAMADOS, 
  ENTRENADORES_LIST, 
  COORDINADORES_LIST,
  TRAINER_METADATA,
  normalizeTrainer,
  normalizeCoordinator
} from '../data/managersData';
import { OPERATIONAL_SEDES, normalizeRole, normalizeSede } from '../data/usersData';
import { recordAuditEvent } from '../services/auditService';
import { db } from '../services/firebase';
import { collection, getDocs, doc, addDoc, setDoc, updateDoc, deleteDoc, writeBatch, onSnapshot, serverTimestamp } from 'firebase/firestore';
import CountryFlag from '../components/CountryFlag';
import { 
  Users, PhoneCall, CheckCircle, XCircle, Calendar, Plus, PlusCircle,
  Search, Filter, Award, Building, UserCheck, Clock, 
  ChevronLeft, ChevronRight, DollarSign, Layers, ArrowLeft,
  Sparkles, ToggleLeft, ToggleRight, Archive, RotateCcw, X,
  Edit3, Trash2, UserPlus, Shield, Crown, Check, CheckSquare, Square,
  ShieldCheck, Lock, AlertTriangle, Target, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import CMJDashboard from '../components/CMJDashboard';

const SEDE_COLORS = {
  Quito: "#29abe2", Lima: "#ef4444", Guayaquil: "#f59e0b",
  Cuenca: "#8b5cf6", Medellín: "#22c55e", Medellin: "#22c55e",
  CDMX: "#f97316", México: "#f97316"
};

const MES_LABELS = {
  JULIO2026: "Jul 2026", JUNIO2026: "Jun 2026", MAYO2026: "May 2026",
  ABRIL2026: "Abr 2026", MARZO2026: "Mar 2026", FEBRERO2026: "Feb 2026",
  ENERO2026: "Ene 2026", DICIEMBRE2025: "Dic 2025", NOVIEMBRE2025: "Nov 2025",
  OCTUBRE2025: "Oct 2025"
};

// Parsea múltiples entrenadores de una cadena (separados por coma, barra, o punto medio)
export const parseTrainersList = (trainerStr) => {
  if (!trainerStr) return [];
  if (Array.isArray(trainerStr)) return trainerStr.map(t => normalizeTrainer(t)).filter(Boolean);
  return trainerStr
    .split(/[,/&•]+/)
    .map(t => normalizeTrainer(t.trim()))
    .filter(Boolean);
};

const isTrainerMatch = (mTrainer, targetTrainer) => {
  if (!mTrainer || !targetTrainer) return false;
  if (mTrainer === targetTrainer) return true;
  
  const mTrainersList = parseTrainersList(mTrainer);
  const targetTrainersList = parseTrainersList(targetTrainer);

  if (mTrainersList.length === 0) mTrainersList.push(mTrainer);
  if (targetTrainersList.length === 0) targetTrainersList.push(targetTrainer);

  for (const t1 of mTrainersList) {
    for (const t2 of targetTrainersList) {
      const norm1 = normalizeTrainer(t1);
      const norm2 = normalizeTrainer(t2);
      if (norm1 === norm2) return true;

      const clean1 = norm1.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const clean2 = norm2.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      if (clean1 === clean2 || clean1.includes(clean2) || clean2.includes(clean1)) return true;

      // Alias conocido: Jesus Acosta / Chuy Acosta / Jesus Adrian Acosta
      if ((clean1.includes('chuy') || clean1.includes('jesus')) && (clean2.includes('chuy') || clean2.includes('jesus')) && (clean1.includes('acosta') || clean2.includes('acosta'))) {
        return true;
      }

      const w1 = clean1.split(/\s+/);
      const w2 = clean2.split(/\s+/);
      if (w1.length >= 2 && w2.length >= 2) {
        if (w1[0] === w2[0] && (w1[1] === w2[1] || w1[w1.length - 1] === w2[w2.length - 1])) return true;
      }
    }
  }
  return false;
};

export default function CentroManagers() {
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'directorio';
  // NOTA (28/08/2026): permite que el Buscador Global de Home.jsx traiga al
  // usuario directo a un equipo/capitán/manager ya filtrado, vía
  // /centro-managers?tab=grupales&q=<texto>&sede=<sede>
  const initialSearchQuery = queryParams.get('q') || '';
  const initialSedeQuery = queryParams.get('sede') || '';

  // Permisos avanzados
  const canViewAll = canViewAllManagers(currentUser);
  const canViewOwnSede = canViewSede(currentUser);
  const canChangeStatus = canChangeManagerStatus(currentUser);
  const userCanAdd = canAddManagers(currentUser);
  const userCanAssign = canAssignTrainer(currentUser);
  // Pestaña de Liquidación de Entrenadores: solo José Sánchez y Elizabeth Escobar (02/09/2026)
  const canViewLiquidacion = canViewLiquidacionEntrenadores(currentUser);
  
  // Dual Role Toggle para QT y Corporativos que también son entrenadores
  const userRole = currentUser?.appRole || currentUser?.role;
  // Revisamos TODOS los roles del usuario, no solo el appRole activo
  const allUserRoles = currentUser?.roles || (userRole ? [userRole] : []);
  const isTrainerRole = userRole === 'entrenador' || userRole === 'entrenador_llamadas' ||
    allUserRoles.includes('entrenador') || allUserRoles.includes('entrenador_llamadas') ||
    DUAL_ROLE_TRAINER_EMAILS.includes((currentUser?.email || '').toLowerCase());
  const isDualRole = currentUser && (DUAL_ROLE_TRAINER_EMAILS.includes(currentUser.email) || (currentUser.roles && currentUser.roles.includes('entrenador') && currentUser.roles.length > 1));
  const [viewAsTrainer, setViewAsTrainer] = useState(isTrainerRole && (userRole === 'entrenador' || userRole === 'entrenador_llamadas'));

  // Estados de datos
  // Estados de datos
  const [managers, setManagers] = useState([]);
  const [llamadosData, setLlamadosData] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'managers_directory'), (querySnapshot) => {
      const firestoreManagers = [];
      querySnapshot.forEach((doc) => {
        firestoreManagers.push({ id: doc.id, ...doc.data() });
      });

      // Merge inteligente: Mapear por ID
      const firestoreMap = new Map();
      firestoreManagers.forEach(m => firestoreMap.set(String(m.id), m));

      // 1. Tomar todos los INITIAL_MANAGERS y reemplazar con los cambios de Firestore si existen
      const mergedManagers = INITIAL_MANAGERS.map(initM => {
        const fromFirestore = firestoreMap.get(String(initM.id));
        return fromFirestore ? { ...initM, ...fromFirestore } : initM;
      });

      // 2. Agregar managers nuevos creados en Firestore que no estén en el catálogo inicial
      const initialIds = new Set(INITIAL_MANAGERS.map(m => String(m.id)));
      firestoreManagers.forEach(fm => {
        if (!initialIds.has(String(fm.id))) {
          mergedManagers.push(fm);
        }
      });

      // Mapear y normalizar
      const normalized = mergedManagers.map(m => ({
        ...m,
        entrenador: normalizeTrainer(m.entrenador),
        coordinador: normalizeCoordinator(m.coordinador),
        sede: normalizeSede(m.sede)
      }));
      setManagers(normalized);
      setIsLoadingData(false);
    }, (error) => {
      console.error("Error fetching managers from Firestore in real-time:", error);
      // Fallback a localStorage si falla la conexión
      const saved = localStorage.getItem('cpsl_managers_data_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        setManagers(parsed);
      }
      setIsLoadingData(false);
    });

    return () => unsubscribe();
  }, []);

  // (02/09/2026) Historial de llamadas grupales — cada llamada registrada queda como
  // un documento nuevo (nunca se sobrescribe), para poder contar cuántas lleva cada
  // equipo. Es la base de la pestaña de Liquidación de Entrenadores.
  const [llamadasHistorial, setLlamadasHistorial] = useState([]);
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'llamadas_grupales_historial'), (querySnapshot) => {
      const rows = [];
      querySnapshot.forEach((doc) => rows.push({ id: doc.id, ...doc.data() }));
      setLlamadasHistorial(rows);
    }, (error) => {
      console.error("Error leyendo llamadas_grupales_historial:", error);
    });
    return () => unsubscribe();
  }, []);

  // Registro de pagos ya liquidados a entrenadores (solo se carga si el usuario
  // tiene permiso de ver la pestaña, para no pedir datos que no va a poder leer).
  const [liquidacionesPagos, setLiquidacionesPagos] = useState({});
  useEffect(() => {
    if (!canViewLiquidacion) return;
    const unsubscribe = onSnapshot(collection(db, 'liquidaciones_pagos'), (querySnapshot) => {
      const map = {};
      querySnapshot.forEach((doc) => { map[doc.id] = { id: doc.id, ...doc.data() }; });
      setLiquidacionesPagos(map);
    }, (error) => {
      console.error("Error leyendo liquidaciones_pagos:", error);
    });
    return () => unsubscribe();
  }, [canViewLiquidacion]);

  const [llamadosDataState, setLlamadosDataState] = useState(() => {
    try {
      const saved = localStorage.getItem('cpsl_llamados_data_v3');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_LLAMADOS;
  });

  useEffect(() => {
    setLlamadosData(llamadosDataState);
  }, [llamadosDataState]);

  useEffect(() => {
    try { localStorage.setItem('cpsl_llamados_data_v3', JSON.stringify(llamadosData)); } catch (e) {}
  }, [llamadosData]);

  // UI State
  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState(initialSearchQuery);
  const [filterSede, setFilterSede] = useState(initialSedeQuery ? normalizeSede(initialSedeQuery) : '');
  const [statusFilter, setStatusFilter] = useState('Todos'); // 'Todos' | 'Activo' | 'Graduado' | 'Desertor'

  // Estadísticas por Entrenador (Tab: Entrenadores)
  const allTrainerNames = useMemo(() => {
    const set = new Set(ENTRENADORES_LIST);
    managers.forEach(m => {
      if (m.entrenador && m.entrenador.trim() && m.entrenador !== 'Sin Asignar') {
        parseTrainersList(m.entrenador).forEach(t => set.add(t));
      }
    });
    return Array.from(set);
  }, [managers]);

  // Determinar el entrenador actual para filtrado
  const currentTrainerName = useMemo(() => {
    if (!currentUser) return '';
    const email = (currentUser.email || '').toLowerCase().trim();
    
    // Mapeo explícito para entrenadores duales cuyo nombre en Google no coincida exactamente con ENTRENADORES_LIST
    if (email === 'fer.aragon@crearpsl.net' || email === 'fer.aragon@crearpls.com') return 'Fer Aragon';
    if (email === 'paul.sosa@crearpsl.net') return 'Paul Sosa';
    if (email === 'jose.sanchez@crearpsl.net') return 'Jose Sanchez';
    if (email === 'andres.gomez@crearpsl.net') return 'Andres Gomez';
    if (email === 'leandro.brunis@crearpsl.net') return 'Leandro Brunis';
    if (email === 'carlos.brunis@crearpsl.net' || email === 'brunische66@gmail.com') return 'Carlos Brunis';

    const userName = currentUser.name || currentUser.displayName || '';
    const cleanUser = userName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const match = allTrainerNames.find(e => {
      const cleanE = e.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      if (cleanUser.includes(cleanE) || cleanE.includes(cleanUser)) return true;
      
      const w1 = cleanUser.split(/\s+/);
      const w2 = cleanE.split(/\s+/);
      if (w1.length >= 2 && w2.length >= 2) {
        if (w1[0] === w2[0] && (w1[1] === w2[1] || w1[w1.length - 1] === w2[w2.length - 1])) return true;
      }
      return false;
    });
    return match || userName;
  }, [currentUser, allTrainerNames]);

  const [filterEntrenador, setFilterEntrenador] = useState(viewAsTrainer ? currentTrainerName : '');

  // Efecto para actualizar el filtro si cambia el toggle de dual role
  useEffect(() => {
    if (viewAsTrainer) {
      setFilterEntrenador(currentTrainerName);
    } else {
      setFilterEntrenador('');
    }
  }, [viewAsTrainer, currentTrainerName]);


  // Modales y estados de edición
  const [showModal, setShowModal] = useState(false);
  const [addMode, setAddMode] = useState('individual'); // 'individual' | 'equipo'

  const [newManager, setNewManager] = useState({
    nombre: '',
    rol: 'Manager',
    telefono: '',
    sede: 'Quito',
    equipo: '',
    numEquipo: '',
    selectedTrainers: [ENTRENADORES_LIST[0] || ''],
    coordinador: COORDINADORES_LIST[0] || '',
    estado: 'Activo'
  });

  const [newTeam, setNewTeam] = useState({
    sede: 'Quito',
    equipo: '',
    numEquipo: '',
    selectedTrainers: [ENTRENADORES_LIST[0] || ''],
    coordinador: COORDINADORES_LIST[0] || '',
    capitan: { nombre: '', telefono: '' },
    managers: [{ id: 1, nombre: '', telefono: '' }]
  });

  // Modal para editar equipo completo
  const [editTeamModal, setEditTeamModal] = useState(null);

  // Modal para editar integrante individual (Manager o Capitán)
  const [editIndividualModal, setEditIndividualModal] = useState(null);

  // Modal de confirmación para eliminar
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [groupModal, setGroupModal] = useState(null);
  const [groupCallDate, setGroupCallDate] = useState(new Date().toISOString().split('T')[0]);
  const [groupCallAttendance, setGroupCallAttendance] = useState({}); // { managerId: boolean }

  // CONTEXTO (28/08/2026): pedido de José — al hacer clic en el badge 🎓 de un
  // entrenador (en la fila del Directorio o en la tarjeta de un Capitán) se debe
  // abrir la "tarjeta" de esa persona con su resumen (equipos a cargo, efectividad
  // de llamadas, activos/graduados/desertores) — el mismo cálculo que ya existía
  // para la pestaña "Entrenadores", pero accesible desde cualquier vista sin tener
  // que cambiar de pestaña. Solo guarda el NOMBRE del entrenador seleccionado; el
  // resumen se recalcula al vuelo con getTrainerCardStats() más abajo.
  const [trainerCardModal, setTrainerCardModal] = useState(null); // string | null (nombre del entrenador)

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 40;
  const [activeMes, setActiveMes] = useState('JULIO2026');

  // Estados de ordenamiento de columnas en el Directorio
  const [sortField, setSortField] = useState(null); // 'nombre' | 'sede' | 'entrenador' | 'estado' | 'llamada'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Filtrado principal
  const filteredManagers = useMemo(() => {
    const userSede = normalizeSede(currentUser?.sede);

    return managers.filter(m => {
      const mSede = normalizeSede(m.sede);

      // 1. Filtrado de Visibilidad (Seguridad y Jerarquía)
      if (viewAsTrainer) {
        // Solo ve los suyos como entrenador
        if (!isTrainerMatch(m.entrenador, currentTrainerName)) return false;
      } else if (!canViewAll && !isGlobalQTCoordinator(currentUser)) {
        const activeRole = currentUser?.appRole;
        const isGerente = activeRole === 'gerente';
        const isCoord = activeRole === 'coord_maestria' || activeRole === 'coordinador_mj' || activeRole === 'coord_c1' || activeRole === 'capitan';
        
        if (isGerente) {
          if (mSede !== userSede && mSede !== 'GLOBAL') return false;
        } else if (isCoord) {
          // Coordinadores ven su sede Y a los gerentes (como referencia directiva)
          const mRol = (m.rol || '').toLowerCase();
          if (mSede !== userSede && !mRol.includes('gerente')) return false;
        } else if (hasQTPrivileges(currentUser)) {
          // QT: ven su sede y al Coordinador Global de QT
          const mRol = (m.rol || '').toLowerCase();
          const isTargetGlobalQTCoordinator = m.id === 'staff_carlosbrunis' || m.email?.toLowerCase().includes('brunis') || (mRol.includes('qt') && (mSede === 'SEDE GLOBAL' || mSede === 'GLOBAL'));
          if (mSede !== userSede && !isTargetGlobalQTCoordinator) return false;
        } else if (isTrainerRole && currentTrainerName) {
          // ⚡ ENTRENADORES: siempre ven sus propios managers, sin importar el rol activo
          if (!isTrainerMatch(m.entrenador, currentTrainerName)) return false;
        } else {
          // Por defecto solo ven lo suyo
          if (!isTrainerMatch(m.entrenador, currentTrainerName) && mSede !== userSede) return false;
        }
      }

      // 2. Filtro de Entrenador (UI dropdown)
      if (filterEntrenador && !isTrainerMatch(m.entrenador, filterEntrenador)) return false;

      // 3. Filtro Sede (UI dropdown)
      if (filterSede && mSede !== normalizeSede(filterSede)) return false;

      // 4. Filtro Estado (Todos / Activo / Graduado / Desertor)
      if (statusFilter !== 'Todos' && m.estado !== statusFilter) return false;

      // 5. Búsqueda texto
      if (search.trim()) {
        const q = search.toLowerCase();
        const str = `${m.nombre} ${m.rol || ''} ${m.equipo || ''} ${m.entrenador || ''} ${m.telefono || ''} ${mSede}`.toLowerCase();
        if (!str.includes(q)) return false;
      }

      return true;
    });
  }, [managers, search, filterSede, filterEntrenador, statusFilter, viewAsTrainer, canViewAll, canViewOwnSede, currentTrainerName, currentUser]);

  // Agrupación de equipos
  const [groupLifecycleFilter, setGroupLifecycleFilter] = useState('Activos'); // 'Activos' | 'Archivo' | 'Todos'
  const [groupFilterStatus, setGroupFilterStatus] = useState('Todos'); // 'Todos' | 'Completos' | 'Parciales' | 'Pendientes'

  const groupTeams = useMemo(() => {
    const userSede = normalizeSede(currentUser?.sede);
    const baseList = managers.filter(m => {
      if (!m.equipo) return false;
      const mSede = normalizeSede(m.sede);

      // Filtro Activos / Archivo en Grupales
      if (groupLifecycleFilter === 'Activos') {
        if (m.estado === 'Desertor' || m.estado === 'Graduado' || m.estado === 'Archivado') return false;
      } else if (groupLifecycleFilter === 'Archivo') {
        if (m.estado === 'Activo') return false;
      }

      // Permisos base de rol
      if (viewAsTrainer) {
        if (!isTrainerMatch(m.entrenador, currentTrainerName)) return false;
      } else if (!canViewAll && !isGlobalQTCoordinator(currentUser)) {
        const activeRole = currentUser?.appRole;
        const isGerente = activeRole === 'gerente';
        const isCoord = activeRole === 'coord_maestria' || activeRole === 'coordinador_mj' || activeRole === 'coord_c1' || activeRole === 'capitan';
        
        if (isGerente) {
          if (mSede !== userSede && mSede !== 'GLOBAL') return false;
        } else if (isCoord) {
          const mRol = (m.rol || '').toLowerCase();
          if (mSede !== userSede && !mRol.includes('gerente')) return false;
        } else if (hasQTPrivileges(currentUser)) {
          // QT: ven su sede y al Coordinador Global de QT
          const mRol = (m.rol || '').toLowerCase();
          const isTargetGlobalQTCoordinator = m.id === 'staff_carlosbrunis' || m.email?.toLowerCase().includes('brunis') || (mRol.includes('qt') && (mSede === 'SEDE GLOBAL' || mSede === 'GLOBAL'));
          if (mSede !== userSede && !isTargetGlobalQTCoordinator) return false;
        } else if (isTrainerRole && currentTrainerName) {
          if (!isTrainerMatch(m.entrenador, currentTrainerName)) return false;
        } else {
          if (!isTrainerMatch(m.entrenador, currentTrainerName) && mSede !== userSede) return false;
        }
      }

      // Filtros de Sede y Entrenador de la barra
      if (filterSede && mSede !== normalizeSede(filterSede)) return false;
      if (filterEntrenador && !isTrainerMatch(m.entrenador, filterEntrenador)) return false;

      return true;
    });

    const teams = {};
    baseList.forEach(m => {
      const key = `${normalizeSede(m.sede)}_${m.equipo}`;
      if (!teams[key]) {
        teams[key] = {
          sede: normalizeSede(m.sede),
          equipo: m.equipo,
          numEquipo: m.numEquipo,
          managers: [],
          entrenadores: new Set(),
          lastDate: ''
        };
      }
      teams[key].managers.push(m);
      if (m.entrenador) {
        parseTrainersList(m.entrenador).forEach(t => teams[key].entrenadores.add(t));
      }
      if (m.llamadaFecha && (!teams[key].lastDate || m.llamadaFecha > teams[key].lastDate)) {
        teams[key].lastDate = m.llamadaFecha;
      }
    });

    let list = Object.values(teams).map(t => {
      const asistieron = t.managers.filter(m => m.llamadaAsistio === 'SI').length;
      const noAsistieron = t.managers.filter(m => m.llamadaAsistio === 'NO').length;
      const total = t.managers.length;
      const pct = total > 0 ? Math.round((asistieron / total) * 100) : 0;
      const hasCall = t.managers.some(m => m.llamadaAsistio === 'SI' || m.llamadaAsistio === 'NO');
      const entrenadoresArr = Array.from(t.entrenadores);
      const entrenadorUnico = entrenadoresArr.length === 1 ? entrenadoresArr[0] : (entrenadoresArr.join(', ') || 'Sin Asignar');
      const capitanes = t.managers.filter(m => (m.rol || '').toLowerCase().includes('capitan'));
      const managersOnly = t.managers.filter(m => !(m.rol || '').toLowerCase().includes('capitan'));

      let statusType = 'Pendiente';
      if (hasCall) {
        if (asistieron === total) statusType = 'Completo';
        else if (asistieron > 0) statusType = 'Parcial';
        else statusType = 'Ausente';
      }

      return {
        ...t,
        entrenadorUnico,
        entrenadoresArr,
        capitanes,
        managersOnly,
        asistieron,
        noAsistieron,
        total,
        pct,
        hasCall,
        statusType
      };
    });

    // Filtro por término de búsqueda en Grupales
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => {
        const teamMatch = `${t.equipo} ${t.numEquipo || ''} ${t.sede} ${t.entrenadorUnico}`.toLowerCase().includes(q);
        const managerMatch = t.managers.some(m => `${m.nombre} ${m.telefono || ''}`.toLowerCase().includes(q));
        return teamMatch || managerMatch;
      });
    }

    // Filtro por estado de conexión
    if (groupFilterStatus === 'Completos') return list.filter(t => t.statusType === 'Completo');
    if (groupFilterStatus === 'Parciales') return list.filter(t => t.statusType === 'Parcial' || t.statusType === 'Ausente');
    if (groupFilterStatus === 'Pendientes') return list.filter(t => t.statusType === 'Pendiente');
    return list;
  }, [managers, search, filterSede, filterEntrenador, groupLifecycleFilter, groupFilterStatus, viewAsTrainer, canViewAll, canViewOwnSede, currentTrainerName, currentUser]);

  const groupStats = useMemo(() => {
    let totalEq = groupTeams.length;
    let conLlamada = groupTeams.filter(t => t.hasCall).length;
    let totalMngrs = groupTeams.reduce((acc, t) => acc + t.total, 0);
    let totalAsist = groupTeams.reduce((acc, t) => acc + t.asistieron, 0);
    let avgPct = totalMngrs > 0 ? Math.round((totalAsist / totalMngrs) * 100) : 0;
    return { totalEq, conLlamada, totalMngrs, totalAsist, avgPct };
  }, [groupTeams]);

  // Estadísticas por Sede (Tab: Sedes)
  const sedesStats = useMemo(() => {
    let list = OPERATIONAL_SEDES.map(sedeName => {
      const normSede = normalizeSede(sedeName);
      const sedeManagers = managers.filter(m => normalizeSede(m.sede) === normSede);
      const total = sedeManagers.length;
      const activos = sedeManagers.filter(m => m.estado === 'Activo').length;
      const graduados = sedeManagers.filter(m => m.estado === 'Graduado').length;
      const desertores = sedeManagers.filter(m => m.estado === 'Desertor').length;
      const pctGrad = total > 0 ? Math.round((graduados / total) * 100) : 0;

      // Equipos y llamadas
      const sedeEquipos = new Set(sedeManagers.map(m => m.equipo).filter(Boolean));
      const totalEquipos = sedeEquipos.size;
      const asistieron = sedeManagers.filter(m => m.llamadaAsistio === 'SI').length;
      const conLlamada = sedeManagers.filter(m => m.llamadaAsistio === 'SI' || m.llamadaAsistio === 'NO').length;
      const pctAsist = conLlamada > 0 ? Math.round((asistieron / conLlamada) * 100) : 0;

      // Entrenadores en la sede
      const entrenadores = [...new Set(sedeManagers.flatMap(m => parseTrainersList(m.entrenador)))];

      return {
        sede: sedeName,
        normSede,
        total,
        activos,
        graduados,
        desertores,
        pctGrad,
        totalEquipos,
        asistieron,
        conLlamada,
        pctAsist,
        entrenadores
      };
    }).filter(s => s.total > 0 || OPERATIONAL_SEDES.includes(s.sede));

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.sede.toLowerCase().includes(q) ||
        s.entrenadores.some(e => e.toLowerCase().includes(q))
      );
    }
    return list;
  }, [managers, search]);



  const trainersStats = useMemo(() => {
    let list = allTrainerNames.map(trainerName => {
      const trainerManagers = managers.filter(m => isTrainerMatch(m.entrenador, trainerName));
      const total = trainerManagers.length;
      const activos = trainerManagers.filter(m => m.estado === 'Activo').length;
      const graduados = trainerManagers.filter(m => m.estado === 'Graduado').length;
      const desertores = trainerManagers.filter(m => m.estado === 'Desertor').length;
      
      const equipos = [...new Set(trainerManagers.map(m => m.equipo).filter(Boolean))];
      const sedes = [...new Set(trainerManagers.map(m => normalizeSede(m.sede)).filter(Boolean))];

      const asistieron = trainerManagers.filter(m => m.llamadaAsistio === 'SI').length;
      const noAsistieron = trainerManagers.filter(m => m.llamadaAsistio === 'NO').length;
      const conLlamada = asistieron + noAsistieron;
      const pctAsist = conLlamada > 0 ? Math.round((asistieron / conLlamada) * 100) : 0;

      return {
        entrenador: trainerName,
        total,
        activos,
        graduados,
        desertores,
        equipos,
        sedes,
        asistieron,
        noAsistieron,
        conLlamada,
        pctAsist
      };
    }).filter(t => t.total > 0);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.entrenador.toLowerCase().includes(q) ||
        t.sedes.some(s => s.toLowerCase().includes(q)) ||
        t.equipos.some(eq => eq.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allTrainerNames, managers, search]);

  // Mismo cálculo que trainersStats de arriba pero SIN el filtro de `search` y
  // para un solo nombre — usado por el modal "tarjeta de la persona" que se abre
  // al hacer clic en un badge 🎓 de entrenador desde cualquier vista.
  const getTrainerCardStats = (trainerName) => {
    if (!trainerName) return null;
    const trainerManagers = managers.filter(m => isTrainerMatch(m.entrenador, trainerName));
    const total = trainerManagers.length;
    const activos = trainerManagers.filter(m => m.estado === 'Activo').length;
    const graduados = trainerManagers.filter(m => m.estado === 'Graduado').length;
    const desertores = trainerManagers.filter(m => m.estado === 'Desertor').length;
    const equipos = [...new Set(trainerManagers.map(m => m.equipo).filter(Boolean))];
    const sedes = [...new Set(trainerManagers.map(m => normalizeSede(m.sede)).filter(Boolean))];
    const asistieron = trainerManagers.filter(m => m.llamadaAsistio === 'SI').length;
    const noAsistieron = trainerManagers.filter(m => m.llamadaAsistio === 'NO').length;
    const conLlamada = asistieron + noAsistieron;
    const pctAsist = conLlamada > 0 ? Math.round((asistieron / conLlamada) * 100) : 0;
    return { entrenador: trainerName, total, activos, graduados, desertores, equipos, sedes, asistieron, noAsistieron, conLlamada, pctAsist };
  };

  const stats = useMemo(() => {
    const userSede = normalizeSede(currentUser?.sede);
    // Si la vista está restringida, calcular stats solo de lo que puede ver
    const baseList = (viewAsTrainer || (!canViewAll && !canViewOwnSede)) 
      ? managers.filter(m => isTrainerMatch(m.entrenador, currentTrainerName))
      : (canViewOwnSede && !canViewAll) ? managers.filter(m => normalizeSede(m.sede) === userSede)
      : managers;

    const total = baseList.length;
    const graduados = baseList.filter(m => m.estado === 'Graduado').length;
    const desertores = baseList.filter(m => m.estado === 'Desertor').length;
    const activos = baseList.filter(m => m.estado === 'Activo').length;
    const pct = total > 0 ? Math.round((graduados / total) * 100) : 0;
    return { total, graduados, desertores, activos, pct };
  }, [managers, viewAsTrainer, canViewAll, canViewOwnSede, currentTrainerName, currentUser]);

  const handleResetMasterData = async () => {
    if (window.confirm("¿Deseas restablecer la lista completa de managers originales desde la base maestra a LA NUBE? Esto sobreescribirá la base de datos.")) {
      try {
        showToast('Subiendo datos a la nube... por favor espera', 'info');
        const batchArray = [];
        batchArray.push(writeBatch(db));
        let operationCounter = 0;
        let batchIndex = 0;
        
        for (const m of INITIAL_MANAGERS) {
          const docRef = doc(db, 'managers_directory', m.id.toString());
          batchArray[batchIndex].set(docRef, m);
          operationCounter++;
          
          if (operationCounter === 490) {
            batchArray.push(writeBatch(db));
            batchIndex++;
            operationCounter = 0;
          }
        }
        
        for (const batch of batchArray) {
          await batch.commit();
        }
        
        setManagers(INITIAL_MANAGERS);
        localStorage.removeItem('cpsl_managers_data_v3');
        showToast('✅ Datos maestros subidos a Firebase con éxito', 'success');
      } catch (error) {
        console.error(error);
        showToast('Error subiendo a Firebase', 'error');
      }
    }
  };

  // Acciones
  const handleUpdateManagerField = async (id, field, value) => {
    if (field === 'entrenador' && !userCanAssign) {
      showToast("Acceso restringido: Solo Fer, Paul y SuperAdmins pueden editar entrenadores.", "warning");
      return;
    }
    if (field === 'estado' && !canChangeStatus) {
      showToast("Acceso restringido: Las Graduaciones y Deserciones están restringidas a Coordinación de Maestría del Juego y Dirección de Maestría.", "warning");
      return;
    }
    const finalValue = field === 'entrenador' ? normalizeTrainer(value)
      : field === 'coordinador' ? normalizeCoordinator(value)
      : field === 'sede' ? normalizeSede(value)
      : value;
      
    try {
      const targetManager = managers.find(m => m.id === id) || { id };
      const docRef = doc(db, 'managers_directory', id.toString());
      await setDoc(docRef, { ...targetManager, [field]: finalValue }, { merge: true });
      
      setManagers(prev => prev.map(m => m.id === id ? { ...m, [field]: finalValue } : m));
      
      const managerName = targetManager ? targetManager.nombre : id;

      recordAuditEvent({
        action: 'ACTUALIZAR_MANAGER',
        email: currentUser?.email || 'admin@crearpsl.net',
        name: currentUser?.name || 'Usuario',
        role: currentUser?.appRole || 'gerente',
        sede: currentUser?.sede || 'Global',
        details: `Se actualizó el campo "${field}" de ${managerName} a "${finalValue}"`
      });

      showToast(`Actualizado: ${field}`, 'info');
    } catch (e) {
      console.error(e);
      showToast('Error al actualizar en la nube', 'error');
    }
  };

  const handleUpdateLlamada = async (id, fecha, asistio) => {
    try {
      const targetManager = managers.find(m => m.id === id) || { id };
      const docRef = doc(db, 'managers_directory', id.toString());
      await setDoc(docRef, { ...targetManager, llamadaFecha: fecha, llamadaAsistio: asistio }, { merge: true });
      
      // La actualización de managers en tiempo real ya se maneja por onSnapshot, pero por optimización optimista lo mantenemos aquí
      setManagers(prev => prev.map(m => m.id === id ? { ...m, llamadaFecha: fecha, llamadaAsistio: asistio } : m));
      
      const managerName = targetManager ? targetManager.nombre : id;
      
      recordAuditEvent({
        action: 'ACTUALIZAR_LLAMADA_MANAGER',
        email: currentUser?.email || 'admin@crearpsl.net',
        name: currentUser?.name || 'Usuario',
        role: currentUser?.appRole || 'gerente',
        sede: currentUser?.sede || 'Global',
        details: `Asistencia actualizada para ${managerName}: ${asistio === 'SI' ? 'Asistió' : 'No asistió'} el ${fecha}`
      });

      showToast(`Registro guardado: ${asistio === 'SI' ? 'Asistió' : 'No asistió'}`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Error al guardar en la nube', 'error');
    }
  };

  const openGroupModal = (team) => {
    const initialAttendance = {};
    team.managers.forEach(m => initialAttendance[m.id] = true); // Todos asisten por defecto
    setGroupCallAttendance(initialAttendance);
    setGroupModal(team);
  };

  const handleSaveGroupCall = async () => {
    if (!groupModal) return;
    
    try {
      const batch = writeBatch(db);
      groupModal.managers.forEach(m => {
        if (groupCallAttendance.hasOwnProperty(m.id)) {
          const docRef = doc(db, 'managers_directory', m.id.toString());
          batch.set(docRef, {
            ...m,
            llamadaFecha: groupCallDate,
            llamadaAsistio: groupCallAttendance[m.id] ? 'SI' : 'NO'
          }, { merge: true });
        }
      });
      
      await batch.commit();

      // (02/09/2026) Historial de llamadas grupales — se AGREGA un registro nuevo por
      // cada llamada (nunca sobrescribe), para poder contar cuántas lleva cada equipo.
      // Es la base de la pestaña de Liquidación de Entrenadores ($400 al llegar a 7).
      // Si esto falla, no bloquea el registro de asistencia (que ya se guardó arriba).
      try {
        const equipoKey = `${normalizeSede(groupModal.sede)}_${groupModal.equipo}`;
        const asistieronCount = Object.values(groupCallAttendance).filter(Boolean).length;
        await addDoc(collection(db, 'llamadas_grupales_historial'), {
          equipoKey,
          equipo: groupModal.equipo,
          numEquipo: groupModal.numEquipo || '',
          sede: normalizeSede(groupModal.sede),
          entrenador: groupModal.entrenadorUnico || '',
          fecha: groupCallDate,
          totalIntegrantes: groupModal.managers.length,
          asistieron: asistieronCount,
          registradoPorEmail: currentUser?.email || '',
          registradoPorNombre: currentUser?.name || '',
          createdAt: serverTimestamp()
        });
      } catch (histErr) {
        console.error('No se pudo guardar el historial de llamada grupal:', histErr);
      }

      setManagers(prev => prev.map(m => {
        if (groupCallAttendance.hasOwnProperty(m.id)) {
          return {
            ...m,
            llamadaFecha: groupCallDate,
            llamadaAsistio: groupCallAttendance[m.id] ? 'SI' : 'NO'
          };
        }
        return m;
      }));

      recordAuditEvent({
        action: 'ACTUALIZAR_LLAMADA_GRUPAL',
        user: currentUser?.email || currentUser?.name || 'Usuario',
        details: `Llamada grupal registrada para el equipo "${groupModal.equipo}" el ${groupCallDate}. Integrantes actualizados: ${groupModal.managers.length}`
      });

      showToast(`Llamada grupal registrada en la nube para el equipo ${groupModal.equipo}`, 'success');
      setGroupModal(null);
    } catch (e) {
      console.error(e);
      showToast('Error al registrar llamada grupal en la nube', 'error');
    }
  };

  // (02/09/2026) LIQUIDACIÓN DE ENTRENADORES — $400 USD por equipo, pago ÚNICO al
  // llegar a 7 llamadas grupales registradas en llamadas_grupales_historial.
  // Pedido explícito de José: "esta info solo la debo de ver yo y Elizabeth Escobar".
  // NOTA: si un equipo tiene varios entrenadores asignados, por ahora se muestra el
  // nombre combinado y se paga el monto completo una sola vez (no se divide) — José
  // confirmó que casi siempre es un solo entrenador por equipo y no priorizó resolver
  // el reparto todavía.
  const liquidacionData = useMemo(() => {
    if (!canViewLiquidacion) return { pendientes: [], pagados: [] };

    const porEquipo = {};
    llamadasHistorial.forEach(r => {
      if (!r.equipoKey) return;
      if (!porEquipo[r.equipoKey]) porEquipo[r.equipoKey] = [];
      porEquipo[r.equipoKey].push(r);
    });

    const pendientes = [];
    const pagados = [];

    Object.entries(porEquipo).forEach(([equipoKey, registros]) => {
      const count = registros.length;
      if (count < 7) return; // Todavía no llega a la meta de 7 llamadas

      const sorted = [...registros].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
      const septimo = sorted[6]; // La llamada #7 (índice 6) es la que dispara el pago
      const ultimo = sorted[sorted.length - 1];
      const pago = liquidacionesPagos[equipoKey];

      const item = {
        equipoKey,
        equipo: ultimo.equipo,
        numEquipo: ultimo.numEquipo,
        sede: ultimo.sede,
        entrenador: ultimo.entrenador || 'Sin Asignar',
        totalLlamadas: count,
        fechaAlcanzo7: septimo?.fecha || '',
        montoUSD: 400
      };

      if (pago && pago.estado === 'pagado') {
        pagados.push({ ...item, pagadoPorNombre: pago.pagadoPorNombre, pagadoPorEmail: pago.pagadoPorEmail, fechaPago: pago.fechaPago });
      } else {
        pendientes.push(item);
      }
    });

    pendientes.sort((a, b) => (a.fechaAlcanzo7 || '').localeCompare(b.fechaAlcanzo7 || ''));
    pagados.sort((a, b) => (b.fechaPago || '').localeCompare(a.fechaPago || ''));

    return { pendientes, pagados };
  }, [llamadasHistorial, liquidacionesPagos, canViewLiquidacion]);

  const handleMarcarPagado = async (item) => {
    if (!canViewLiquidacion) return;
    try {
      await setDoc(doc(db, 'liquidaciones_pagos', item.equipoKey), {
        equipoKey: item.equipoKey,
        equipo: item.equipo,
        numEquipo: item.numEquipo || '',
        sede: item.sede,
        entrenador: item.entrenador,
        montoUSD: item.montoUSD,
        llamadasAlPagar: item.totalLlamadas,
        fechaAlcanzo7: item.fechaAlcanzo7,
        estado: 'pagado',
        pagadoPorEmail: currentUser?.email || '',
        pagadoPorNombre: currentUser?.name || '',
        fechaPago: new Date().toISOString().split('T')[0],
        updatedAt: serverTimestamp()
      }, { merge: true });

      recordAuditEvent({
        action: 'LIQUIDACION_ENTRENADOR_PAGADA',
        email: currentUser?.email || '',
        name: currentUser?.name || '',
        role: currentUser?.appRole || '',
        sede: item.sede,
        details: `Liquidación marcada como pagada: ${item.equipo} (${item.sede}) - Entrenador: ${item.entrenador} - $${item.montoUSD} USD`
      });

      showToast(`Marcado como pagado: ${item.equipo}`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Error al marcar como pagado', 'error');
    }
  };

  // Guardar nuevo registro individual (Manager o Capitán)
  const handleSaveNewManager = async (e) => {
    e.preventDefault();
    if (!newManager.nombre.trim()) return showToast('El nombre completo es obligatorio', 'error');

    const finalTrainers = newManager.selectedTrainers && newManager.selectedTrainers.length > 0
      ? newManager.selectedTrainers.map(t => normalizeTrainer(t)).filter(Boolean).join(', ')
      : '';

    const created = {
      id: Date.now(),
      nombre: newManager.nombre.trim(),
      rol: newManager.rol || 'Manager',
      telefono: newManager.telefono.trim(),
      sede: normalizeSede(newManager.sede),
      equipo: (newManager.equipo || '').trim().toUpperCase(),
      numEquipo: newManager.numEquipo ? Number(newManager.numEquipo) || newManager.numEquipo : '',
      entrenador: finalTrainers,
      tieneEntrenador: finalTrainers ? 'Si' : 'No',
      coordinador: normalizeCoordinator(newManager.coordinador),
      estado: newManager.estado || 'Activo',
      llamadaFecha: '',
      llamadaAsistio: ''
    };

    try {
      const docRef = doc(db, 'managers_directory', created.id.toString());
      await setDoc(docRef, created);
      setManagers(prev => [created, ...prev]);

    } catch(e) { console.error(e); showToast('Error guardando en Firebase', 'error'); return; }

    recordAuditEvent({
      action: 'NUEVO_INTEGRANTE_MANAGER',
      user: currentUser?.email || 'Usuario',
      details: `Nuevo ${created.rol}: ${created.nombre} (${created.sede} - ${created.equipo || 'Sin Equipo'} - Coach: ${created.entrenador || 'N/A'})`
    });

    showToast(`✅ ${created.rol} "${created.nombre}" agregado con éxito`, 'success');
    setShowModal(false);
    setNewManager({
      nombre: '',
      rol: 'Manager',
      telefono: '',
      sede: 'Quito',
      equipo: '',
      numEquipo: '',
      selectedTrainers: [ENTRENADORES_LIST[0] || ''],
      coordinador: COORDINADORES_LIST[0] || '',
      estado: 'Activo'
    });
  };

  // Guardar nuevo equipo completo (Capitán + Managers)
  const handleSaveNewTeam = async (e) => {
    e.preventDefault();
    if (!newTeam.equipo.trim()) return showToast('El nombre del equipo es obligatorio', 'error');

    const finalTrainers = newTeam.selectedTrainers && newTeam.selectedTrainers.length > 0
      ? newTeam.selectedTrainers.map(t => normalizeTrainer(t)).filter(Boolean).join(', ')
      : '';

    const sede = normalizeSede(newTeam.sede);
    const equipo = newTeam.equipo.trim().toUpperCase();
    const numEquipo = newTeam.numEquipo ? Number(newTeam.numEquipo) || newTeam.numEquipo : '';
    const coordinador = normalizeCoordinator(newTeam.coordinador);

    const newRecords = [];
    const timestamp = Date.now();

    // 1. Capitán (si se ingresó)
    if (newTeam.capitan && newTeam.capitan.nombre.trim()) {
      newRecords.push({
        id: timestamp + 1,
        nombre: newTeam.capitan.nombre.trim(),
        rol: 'Capitan',
        telefono: (newTeam.capitan.telefono || '').trim(),
        sede,
        equipo,
        numEquipo,
        entrenador: finalTrainers,
        tieneEntrenador: finalTrainers ? 'Si' : 'No',
        coordinador,
        estado: 'Activo',
        llamadaFecha: '',
        llamadaAsistio: ''
      });
    }

    // 2. Managers
    if (Array.isArray(newTeam.managers)) {
      newTeam.managers.forEach((m, idx) => {
        if (m.nombre && m.nombre.trim()) {
          newRecords.push({
            id: timestamp + 2 + idx,
            nombre: m.nombre.trim(),
            rol: 'Manager',
            telefono: (m.telefono || '').trim(),
            sede,
            equipo,
            numEquipo,
            entrenador: finalTrainers,
            tieneEntrenador: finalTrainers ? 'Si' : 'No',
            coordinador,
            estado: 'Activo',
            llamadaFecha: '',
            llamadaAsistio: ''
          });
        }
      });
    }

    if (newRecords.length === 0) {
      return showToast('Debe ingresar al menos un integrante (Capitán o Manager) para el equipo', 'error');
    }

    try {
      const batch = writeBatch(db);
      newRecords.forEach(record => {
        const docRef = doc(db, 'managers_directory', record.id.toString());
        batch.set(docRef, record);
      });
      await batch.commit();

      setManagers(prev => [...newRecords, ...prev]);
    } catch(e) {
      console.error(e);
      return showToast('Error guardando el equipo en la nube', 'error');
    }

    recordAuditEvent({
      action: 'CREAR_EQUIPO_COMPLETO',
      user: currentUser?.email || 'Usuario',
      details: `Equipo "${equipo}" creado en ${sede} con ${newRecords.length} integrantes y Coach(es): ${finalTrainers || 'Sin Asignar'}`
    });

    showToast(`✅ Equipo "${equipo}" registrado con ${newRecords.length} integrantes`, 'success');
    setShowModal(false);
    setNewTeam({
      sede: 'Quito',
      equipo: '',
      numEquipo: '',
      selectedTrainers: [ENTRENADORES_LIST[0] || ''],
      coordinador: COORDINADORES_LIST[0] || '',
      capitan: { nombre: '', telefono: '' },
      managers: [{ id: 1, nombre: '', telefono: '' }]
    });
  };

  // Abrir modal para editar equipo
  const handleOpenEditTeam = (team) => {
    const trainersInTeam = new Set();
    team.managers.forEach(m => {
      if (m.entrenador) {
        parseTrainersList(m.entrenador).forEach(t => trainersInTeam.add(t));
      }
    });

    setEditTeamModal({
      originalSede: team.sede,
      originalEquipo: team.equipo,
      sede: team.sede,
      equipo: team.equipo,
      numEquipo: team.numEquipo || '',
      selectedTrainers: Array.from(trainersInTeam).length > 0 ? Array.from(trainersInTeam) : [ENTRENADORES_LIST[0] || ''],
      coordinador: team.managers[0]?.coordinador || COORDINADORES_LIST[0] || '',
      members: team.managers.map(m => ({
        id: m.id,
        nombre: m.nombre || '',
        rol: (m.rol || '').toLowerCase().includes('capitan') ? 'Capitan' : 'Manager',
        telefono: m.telefono || '',
        estado: m.estado || 'Activo',
        entrenador: m.entrenador || '',
        llamadaFecha: m.llamadaFecha || '',
        llamadaAsistio: m.llamadaAsistio || ''
      }))
    });
  };

  // Guardar edición de equipo completo
  const handleSaveEditTeam = async (e) => {
    e.preventDefault();
    if (!editTeamModal) return;
    if (!editTeamModal.equipo.trim()) return showToast('El nombre del equipo es obligatorio', 'error');

    const origSedeNorm = normalizeSede(editTeamModal.originalSede);
    const origEquipo = (editTeamModal.originalEquipo || '').trim().toUpperCase();

    const newSede = normalizeSede(editTeamModal.sede);
    const newEquipo = editTeamModal.equipo.trim().toUpperCase();
    const newNumEquipo = editTeamModal.numEquipo ? Number(editTeamModal.numEquipo) || editTeamModal.numEquipo : '';
    const newCoordinador = normalizeCoordinator(editTeamModal.coordinador);
    
    const finalTrainers = editTeamModal.selectedTrainers && editTeamModal.selectedTrainers.length > 0
      ? editTeamModal.selectedTrainers.map(t => normalizeTrainer(t)).filter(Boolean).join(', ')
      : '';

    const validMembers = editTeamModal.members.filter(m => m.nombre && m.nombre.trim());
    if (validMembers.length === 0) {
      return showToast('El equipo debe tener al menos un integrante', 'error');
    }

    try {
      const batch = writeBatch(db);
      
      // We don't delete old members from DB here to avoid data loss on mistakes, 
      // we only UPSERT the members in the edit modal.
      
      const updatedMembers = validMembers.map(m => {
        const memberId = typeof m.id === 'number' && m.id > 100000 ? m.id : Date.now() + Math.floor(Math.random() * 10000);
        const trainerToUse = userCanAssign ? finalTrainers : (m.entrenador || finalTrainers);
        return {
          id: memberId,
          nombre: m.nombre.trim(),
          rol: m.rol === 'Capitan' ? 'Capitan' : 'Manager',
          telefono: (m.telefono || '').trim(),
          sede: newSede,
          equipo: newEquipo,
          numEquipo: newNumEquipo,
          coordinador: newCoordinador,
          entrenador: trainerToUse,
          tieneEntrenador: trainerToUse ? 'Si' : 'No',
          estado: m.estado || 'Activo',
          llamadaFecha: m.llamadaFecha || '',
          llamadaAsistio: m.llamadaAsistio || ''
        };
      });

      updatedMembers.forEach(member => {
        const docRef = doc(db, 'managers_directory', member.id.toString());
        batch.set(docRef, member, { merge: true });
      });

      await batch.commit();

      setManagers(prev => {
        const others = prev.filter(m => {
          const isMatch = normalizeSede(m.sede) === origSedeNorm && (m.equipo || '').trim().toUpperCase() === origEquipo;
          return !isMatch;
        });
        return [...updatedMembers, ...others];
      });

    } catch(e) {
      console.error(e);
      return showToast('Error actualizando equipo en la nube', 'error');
    }

    recordAuditEvent({
      action: 'EDITAR_EQUIPO_COMPLETO',
      user: currentUser?.email || 'Usuario',
      details: `Equipo modificado: "${origEquipo}" -> "${newEquipo}" (${newSede}) con ${validMembers.length} integrantes.`
    });

    showToast(`✅ Equipo "${newEquipo}" actualizado correctamente`, 'success');
    setEditTeamModal(null);
  };

  // Abrir modal de edición individual
  const handleOpenEditIndividual = (m) => {
    setEditIndividualModal({
      ...m,
      rol: (m.rol || '').toLowerCase().includes('capitan') ? 'Capitan' : 'Manager',
      selectedTrainers: parseTrainersList(m.entrenador)
    });
  };

  // Guardar edición individual
  const handleSaveEditIndividual = async (e) => {
    e.preventDefault();
    if (!editIndividualModal) return;
    if (!editIndividualModal.nombre.trim()) return showToast('El nombre es obligatorio', 'error');

    const finalTrainers = editIndividualModal.selectedTrainers && editIndividualModal.selectedTrainers.length > 0
      ? editIndividualModal.selectedTrainers.map(t => normalizeTrainer(t)).filter(Boolean).join(', ')
      : '';

    try {
      const trainerToUse = userCanAssign ? finalTrainers : editIndividualModal.entrenador;
      const updatedData = {
        nombre: editIndividualModal.nombre.trim(),
        rol: editIndividualModal.rol || 'Manager',
        telefono: (editIndividualModal.telefono || '').trim(),
        sede: normalizeSede(editIndividualModal.sede),
        equipo: (editIndividualModal.equipo || '').trim().toUpperCase(),
        numEquipo: editIndividualModal.numEquipo ? Number(editIndividualModal.numEquipo) || editIndividualModal.numEquipo : '',
        entrenador: trainerToUse,
        tieneEntrenador: trainerToUse ? 'Si' : 'No',
        coordinador: normalizeCoordinator(editIndividualModal.coordinador),
        estado: canChangeStatus ? (editIndividualModal.estado || 'Activo') : editIndividualModal.estado
      };

      const docRef = doc(db, 'managers_directory', editIndividualModal.id.toString());
      await setDoc(docRef, updatedData, { merge: true });

      setManagers(prev => prev.map(m => m.id === editIndividualModal.id ? { ...m, ...updatedData } : m));
    } catch(e) {
      console.error(e);
      return showToast('Error actualizando integrante en la nube', 'error');
    }

    recordAuditEvent({
      action: 'EDITAR_INDIVIDUAL_MANAGER',
      user: currentUser?.email || 'Usuario',
      details: `Editado: ${editIndividualModal.nombre} (${editIndividualModal.rol}) - Sede: ${editIndividualModal.sede}`
    });

    showToast(`✅ Registro de ${editIndividualModal.nombre} actualizado`, 'success');
    setEditIndividualModal(null);
  };

  // Eliminar manager individual
  const handleDeleteManager = async (id) => {
    try {
      const docRef = doc(db, 'managers_directory', id.toString());
      await deleteDoc(docRef);
      
      setManagers(prev => prev.filter(m => m.id !== id));
      recordAuditEvent({
        action: 'ELIMINAR_INTEGRANTE_MANAGER',
        user: currentUser?.email || 'Usuario',
        details: `Eliminado integrante ID: ${id}`
      });
      showToast('Integrante eliminado permanentemente', 'info');
      setDeleteConfirm(null);
    } catch(e) {
      console.error(e);
      showToast('Error eliminando de la nube', 'error');
    }
  };

  // Eliminar equipo completo
  const handleDeleteTeam = async (sede, equipo) => {
    const sNorm = normalizeSede(sede);
    const eqUpper = (equipo || '').trim().toUpperCase();
    
    try {
      const toDelete = managers.filter(m => normalizeSede(m.sede) === sNorm && (m.equipo || '').trim().toUpperCase() === eqUpper);
      if (toDelete.length > 0) {
        const batch = writeBatch(db);
        toDelete.forEach(m => {
          const docRef = doc(db, 'managers_directory', m.id.toString());
          batch.delete(docRef);
        });
        await batch.commit();
      }

      setManagers(prev => prev.filter(m => !(normalizeSede(m.sede) === sNorm && (m.equipo || '').trim().toUpperCase() === eqUpper)));
      recordAuditEvent({
        action: 'ELIMINAR_EQUIPO_COMPLETO',
        user: currentUser?.email || 'Usuario',
        details: `Equipo eliminado: ${eqUpper} (${sNorm})`
      });
      showToast(`Equipo "${eqUpper}" eliminado de la nube`, 'info');
      setDeleteConfirm(null);
    } catch(e) {
      console.error(e);
      showToast('Error eliminando equipo de la nube', 'error');
    }
  };

  const sortedManagers = useMemo(() => {
    if (!sortField) return filteredManagers;

    return [...filteredManagers].sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortField === 'nombre') {
        valA = (a.nombre || '').toLowerCase();
        valB = (b.nombre || '').toLowerCase();
      } else if (sortField === 'sede') {
        valA = `${a.sede || ''} ${a.equipo || ''}`.toLowerCase();
        valB = `${b.sede || ''} ${b.equipo || ''}`.toLowerCase();
      } else if (sortField === 'entrenador') {
        valA = (a.entrenador || '').toLowerCase();
        valB = (b.entrenador || '').toLowerCase();
      } else if (sortField === 'estado') {
        valA = (a.estado || '').toLowerCase();
        valB = (b.estado || '').toLowerCase();
      } else if (sortField === 'llamada') {
        valA = `${a.llamadaAsistio || 'NO'} ${a.llamadaFecha || ''}`.toLowerCase();
        valB = `${b.llamadaAsistio || 'NO'} ${b.llamadaFecha || ''}`.toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredManagers, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedManagers.length / PAGE_SIZE) || 1;
  const paginatedManagers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedManagers.slice(start, start + PAGE_SIZE);
  }, [sortedManagers, currentPage]);

  // Tema Claro Estilos
  const bgLight = "#f8fafc";
  const bgCard = "#ffffff";
  const textDark = "#0f172a";
  const textMuted = "#64748b";
  const borderLight = "#e2e8f0";

  return (
    <div style={{ minHeight: '100vh', background: bgLight, color: textDark, paddingBottom: '4rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* HEADER TEMA CLARO */}
      <header style={{ background: bgCard, borderBottom: `1px solid ${borderLight}`, padding: '1.2rem 2rem', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => navigate('/home')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: textDark, borderColor: borderLight }}>
              <ArrowLeft size={16} /> Inicio
            </button>
            <div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#d97706', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={24} /> Centro de Managers
              </h1>
              <p style={{ fontSize: '0.75rem', color: textMuted, margin: 0 }}>Gestión de Asignaciones y Encuentros</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            {isDualRole && (
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                 <span style={{ fontSize: '0.8rem', fontWeight: 600, color: textMuted }}>Vista:</span>
                 <button onClick={() => setViewAsTrainer(!viewAsTrainer)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: viewAsTrainer ? '#3b82f6' : '#64748b', fontWeight: 'bold' }}>
                   {viewAsTrainer ? <ToggleRight size={24} color="#3b82f6" /> : <ToggleLeft size={24} />}
                   {viewAsTrainer ? 'Entrenador' : 'Corporativo'}
                 </button>
               </div>
            )}
            <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => { setStatusFilter('Todos'); setCurrentPage(1); }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: statusFilter === 'Todos' ? '#b45309' : '#d97706' }}>{stats.total}</div>
              <div style={{ fontSize: '0.65rem', color: textMuted, fontWeight: 700 }}>TOTAL</div>
            </div>
            <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => { setStatusFilter('Graduado'); setCurrentPage(1); }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: statusFilter === 'Graduado' ? '#059669' : '#10b981' }}>{stats.graduados}</div>
              <div style={{ fontSize: '0.65rem', color: textMuted, fontWeight: 700 }}>GRADUADOS</div>
            </div>
            <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => { setStatusFilter('Activo'); setCurrentPage(1); }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: statusFilter === 'Activo' ? '#1d4ed8' : '#3b82f6' }}>{stats.activos}</div>
              <div style={{ fontSize: '0.65rem', color: textMuted, fontWeight: 700 }}>ACTIVOS</div>
            </div>
          </div>
        </div>
      </header>

      {/* TABS */}
      <div style={{ background: bgCard, borderBottom: `1px solid ${borderLight}`, padding: '0 2rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '1.5rem', overflowX: 'auto' }}>
          {[
            { id: 'directorio', icon: Users, label: `Directorio (${filteredManagers.length})` },
            { id: 'grupales', icon: Layers, label: `Grupales (${groupTeams.length})` },
            ...(canViewAll ? [
              { id: 'dashboard', icon: Award, label: 'Sedes' },
              { id: 'entrenadores', icon: UserCheck, label: 'Entrenadores' }
            ] : []),
            ...(canViewLiquidacion ? [
              { id: 'liquidacion', icon: DollarSign, label: `Liquidación (${liquidacionData.pendientes.length})` }
            ] : [])
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: '1rem 0.5rem', border: 'none', background: 'transparent',
              color: activeTab === t.id ? '#d97706' : textMuted,
              borderBottom: activeTab === t.id ? '3px solid #d97706' : '3px solid transparent',
              fontWeight: activeTab === t.id ? 700 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'
            }}>
              <t.icon size={18} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <main style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 1.5rem' }}>

        {/* DIRECTORIO */}
        {activeTab === 'directorio' && (
          <div style={{ background: bgCard, borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: `1px solid ${borderLight}` }}>
            
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${borderLight}`, display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.75rem', flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', minWidth: '240px', flex: '1 1 260px', maxWidth: '360px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: textMuted, pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Buscar manager, equipo, entrenador o sede..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 2.2rem 0.6rem 2.4rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.88rem', outline: 'none', background: bgCard, color: textDark }}
                  />
                  {search && (
                    <button
                      onClick={() => { setSearch(''); setCurrentPage(1); }}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: textMuted, padding: 0 }}
                      title="Limpiar búsqueda"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                
                {canViewAll && (
                  <select value={filterSede} onChange={e => { setFilterSede(e.target.value); setCurrentPage(1); }} style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: `1px solid ${borderLight}`, background: bgCard, color: textDark, fontSize: '0.85rem' }}>
                    <option value="">Todas las Sedes</option>
                    {OPERATIONAL_SEDES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}

                {(canViewAll || canViewOwnSede) && !viewAsTrainer && (
                  <select value={filterEntrenador} onChange={e => { setFilterEntrenador(e.target.value); setCurrentPage(1); }} style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: `1px solid ${borderLight}`, background: bgCard, color: textDark, fontSize: '0.85rem' }}>
                    <option value="">Todos los Entrenadores</option>
                    {ENTRENADORES_LIST.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                )}

                {/* FILTROS DE ESTADO RÁPIDOS */}
                <div style={{ display: 'flex', gap: '0.25rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px', flexShrink: 0 }}>
                  {[
                    { id: 'Todos', label: `Todos (${stats.total})` },
                    { id: 'Activo', label: `⚡ Activos (${stats.activos})` },
                    { id: 'Graduado', label: `🎓 Graduados (${stats.graduados})` },
                    { id: 'Desertor', label: `⚠️ Desertores (${stats.desertores})` },
                  ].map(st => (
                    <button key={st.id} onClick={() => { setStatusFilter(st.id); setCurrentPage(1); }} style={{
                      padding: '0.4rem 0.75rem', borderRadius: '6px', border: 'none',
                      background: statusFilter === st.id ? '#ffffff' : 'transparent',
                      color: statusFilter === st.id ? '#0f172a' : '#64748b',
                      fontWeight: statusFilter === st.id ? 700 : 500,
                      boxShadow: statusFilter === st.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap'
                    }}>
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button onClick={() => {
                    setFilterSede('');
                    setFilterEntrenador('');
                    setStatusFilter('Todos');
                    setSearch('');
                    setSortField(null);
                    setSortDirection('asc');
                  }} title="Limpiar Filtros de Búsqueda y Ordenamiento" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.55rem 0.8rem', borderRadius: '6px', border: `1px solid ${borderLight}`, background: 'transparent', color: textMuted, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                    <RotateCcw size={14} /> Restaurar Filtros
                  </button>

                {userCanAdd && (
                  <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.2rem', borderRadius: '6px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}>
                    <Plus size={16} /> Nuevo Manager / Equipo
                  </button>
                )}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#475569', borderBottom: `2px solid ${borderLight}` }}>
                    <th 
                      onClick={() => handleSort('nombre')} 
                      style={{ padding: '1rem', cursor: 'pointer', userSelect: 'none', color: sortField === 'nombre' ? '#b45309' : '#475569', background: sortField === 'nombre' ? '#fef3c7' : 'transparent', transition: 'all 0.15s ease' }} 
                      title="Ordenar por Integrante & Rol (A-Z / Z-A)"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>Integrante & Rol</span>
                        {sortField === 'nombre' ? (
                          sortDirection === 'asc' ? <ArrowUp size={14} color="#b45309" /> : <ArrowDown size={14} color="#b45309" />
                        ) : (
                          <ArrowUpDown size={14} style={{ opacity: 0.35 }} />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('sede')} 
                      style={{ padding: '1rem', cursor: 'pointer', userSelect: 'none', color: sortField === 'sede' ? '#b45309' : '#475569', background: sortField === 'sede' ? '#fef3c7' : 'transparent', transition: 'all 0.15s ease' }} 
                      title="Ordenar por Sede y Equipo"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>Sede & Equipo</span>
                        {sortField === 'sede' ? (
                          sortDirection === 'asc' ? <ArrowUp size={14} color="#b45309" /> : <ArrowDown size={14} color="#b45309" />
                        ) : (
                          <ArrowUpDown size={14} style={{ opacity: 0.35 }} />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('entrenador')} 
                      style={{ padding: '1rem', cursor: 'pointer', userSelect: 'none', color: sortField === 'entrenador' ? '#b45309' : '#475569', background: sortField === 'entrenador' ? '#fef3c7' : 'transparent', transition: 'all 0.15s ease' }} 
                      title="Ordenar por Entrenador(es) Asignado(s)"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>Entrenador(es) Asignado(s)</span>
                        {sortField === 'entrenador' ? (
                          sortDirection === 'asc' ? <ArrowUp size={14} color="#b45309" /> : <ArrowDown size={14} color="#b45309" />
                        ) : (
                          <ArrowUpDown size={14} style={{ opacity: 0.35 }} />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('estado')} 
                      style={{ padding: '1rem', cursor: 'pointer', userSelect: 'none', color: sortField === 'estado' ? '#b45309' : '#475569', background: sortField === 'estado' ? '#fef3c7' : 'transparent', transition: 'all 0.15s ease' }} 
                      title="Ordenar por Estado (Activo / Graduado / Desertor)"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>Estado</span>
                        {sortField === 'estado' ? (
                          sortDirection === 'asc' ? <ArrowUp size={14} color="#b45309" /> : <ArrowDown size={14} color="#b45309" />
                        ) : (
                          <ArrowUpDown size={14} style={{ opacity: 0.35 }} />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('llamada')} 
                      style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none', color: sortField === 'llamada' ? '#b45309' : '#475569', background: sortField === 'llamada' ? '#fef3c7' : 'transparent', transition: 'all 0.15s ease' }} 
                      title="Ordenar por Confirmación de Llamada"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        <span>Confirmación de Llamada</span>
                        {sortField === 'llamada' ? (
                          sortDirection === 'asc' ? <ArrowUp size={14} color="#b45309" /> : <ArrowDown size={14} color="#b45309" />
                        ) : (
                          <ArrowUpDown size={14} style={{ opacity: 0.35 }} />
                        )}
                      </div>
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedManagers.map(m => {
                    const isCapitan = (m.rol || '').toLowerCase().includes('capitan');
                    const mTrainers = m.entrenador ? m.entrenador.split(',').map(t => t.trim()) : [];
                    return (
                      <tr key={m.id} style={{ borderBottom: `1px solid ${borderLight}`, background: isCapitan ? '#fffdf7' : 'transparent' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 700, color: textDark, fontSize: '0.95rem' }}>{m.nombre}</span>
                            {isCapitan ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>
                                <Crown size={12} color="#b45309" /> Capitán
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: '#f1f5f9', color: '#475569', padding: '0.15rem 0.45rem', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600 }}>
                                Manager
                              </span>
                            )}
                          </div>
                          <div style={{ color: textMuted, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.25rem' }}>
                            {m.telefono ? (
                              <a href={`${getWhatsAppUrl(m.telefono, m.sede || filterSede)}`} target="_blank" rel="noreferrer" style={{ color: '#10b981', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
                                📱 {m.telefono}
                              </a>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>Sin teléfono</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600, color: textDark }}>
                            <CountryFlag sede={m.sede} />
                            <span>{m.sede}</span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.2rem', fontWeight: 600 }}>
                            {m.equipo || 'Sin Equipo'} {m.numEquipo ? `(#${m.numEquipo})` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {mTrainers.length > 0 && mTrainers[0] !== "" ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                              {mTrainers.map(t => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => setTrainerCardModal(t)}
                                  title={`Ver tarjeta de ${t}`}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                  🎓 {t}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Sin Asignar</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {canChangeStatus ? (
                            <select value={m.estado} onChange={e => handleUpdateManagerField(m.id, 'estado', e.target.value)} style={{ padding: '0.3rem', borderRadius: '4px', border: 'none', background: m.estado==='Activo'?'#dbeafe':m.estado==='Graduado'?'#dcfce7':'#fee2e2', color: m.estado==='Activo'?'#2563eb':m.estado==='Graduado'?'#16a34a':'#dc2626', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                              <option value="Activo">Activo</option><option value="Graduado">Graduado</option><option value="Desertor">Desertor</option>
                            </select>
                          ) : (
                             <span style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', background: m.estado==='Activo'?'#dbeafe':m.estado==='Graduado'?'#dcfce7':'#fee2e2', color: m.estado==='Activo'?'#2563eb':m.estado==='Graduado'?'#16a34a':'#dc2626', fontWeight: 700, fontSize: '0.8rem' }}>{m.estado}</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <input type="date" value={m.llamadaFecha || ''} onChange={e => handleUpdateLlamada(m.id, e.target.value, m.llamadaAsistio || 'SI')} style={{ padding: '0.4rem', borderRadius: '6px', border: `1px solid ${borderLight}`, fontSize: '0.8rem' }} />
                            <button onClick={() => handleUpdateLlamada(m.id, m.llamadaFecha || new Date().toISOString().split('T')[0], 'SI')} style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #10b981', background: m.llamadaAsistio === 'SI' ? '#10b981' : '#fff', color: m.llamadaAsistio === 'SI' ? '#fff' : '#10b981', fontWeight: 700, cursor: 'pointer' }}>SÍ</button>
                            <button onClick={() => handleUpdateLlamada(m.id, m.llamadaFecha || new Date().toISOString().split('T')[0], 'NO')} style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #ef4444', background: m.llamadaAsistio === 'NO' ? '#ef4444' : '#fff', color: m.llamadaAsistio === 'NO' ? '#fff' : '#ef4444', fontWeight: 700, cursor: 'pointer' }}>NO</button>
                          </div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            {userCanAdd && (
                              <button
                                onClick={() => handleOpenEditIndividual(m)}
                                title="Editar Integrante"
                                style={{ background: '#f1f5f9', border: `1px solid ${borderLight}`, color: '#0f172a', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer' }}
                              >
                                <Edit3 size={15} />
                              </button>
                            )}
                            {userCanAdd && (
                              <button
                                onClick={() => setDeleteConfirm({ type: 'manager', id: m.id, name: m.nombre })}
                                title="Eliminar Integrante"
                                style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer' }}
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedManagers.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: textMuted }}>No hay managers en esta vista.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${borderLight}` }}>
               <span style={{ fontSize: '0.85rem', color: textMuted }}>Página {currentPage} de {totalPages}</span>
               <div style={{ display: 'flex', gap: '0.5rem' }}>
                 <button disabled={currentPage===1} onClick={() => setCurrentPage(p=>p-1)} style={{ padding: '0.3rem 0.8rem', borderRadius: '4px', border: `1px solid ${borderLight}`, background: '#fff', cursor: 'pointer' }}>Ant</button>
                 <button disabled={currentPage>=totalPages} onClick={() => setCurrentPage(p=>p+1)} style={{ padding: '0.3rem 0.8rem', borderRadius: '4px', border: `1px solid ${borderLight}`, background: '#fff', cursor: 'pointer' }}>Sig</button>
               </div>
            </div>
          </div>
        )}

        {/* GRUPALES */}
        {activeTab === 'grupales' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* KPI BAR GRUPAL */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ background: bgCard, borderRadius: '12px', padding: '1.2rem', border: `1px solid ${borderLight}`, display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ background: '#fef3c7', padding: '0.8rem', borderRadius: '10px', color: '#d97706' }}><Users size={24} /></div>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: textDark }}>{groupStats.totalEq}</div>
                  <div style={{ fontSize: '0.75rem', color: textMuted, fontWeight: 600 }}>Equipos ({groupLifecycleFilter})</div>
                </div>
              </div>
              <div style={{ background: bgCard, borderRadius: '12px', padding: '1.2rem', border: `1px solid ${borderLight}`, display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ background: '#dcfce7', padding: '0.8rem', borderRadius: '10px', color: '#16a34a' }}><CheckCircle size={24} /></div>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a' }}>{groupStats.conLlamada} / {groupStats.totalEq}</div>
                  <div style={{ fontSize: '0.75rem', color: textMuted, fontWeight: 600 }}>Equipos con Llamada</div>
                </div>
              </div>
              <div style={{ background: bgCard, borderRadius: '12px', padding: '1.2rem', border: `1px solid ${borderLight}`, display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ background: '#dbeafe', padding: '0.8rem', borderRadius: '10px', color: '#2563eb' }}><PhoneCall size={24} /></div>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb' }}>{groupStats.avgPct}%</div>
                  <div style={{ fontSize: '0.75rem', color: textMuted, fontWeight: 600 }}>Asistencia Promedio</div>
                </div>
              </div>
              <div style={{ background: bgCard, borderRadius: '12px', padding: '1.2rem', border: `1px solid ${borderLight}`, display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ background: '#f3e8ff', padding: '0.8rem', borderRadius: '10px', color: '#7c3aed' }}><Award size={24} /></div>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#7c3aed' }}>{groupStats.totalAsist} / {groupStats.totalMngrs}</div>
                  <div style={{ fontSize: '0.75rem', color: textMuted, fontWeight: 600 }}>Integrantes Conectados</div>
                </div>
              </div>
            </div>

            {/* BARRA DE FILTROS PARA GRUPALES */}
            <div style={{ background: bgCard, borderRadius: '12px', padding: '1.2rem 1.5rem', border: `1px solid ${borderLight}`, display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', gap: '0.75rem', flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', minWidth: '240px', flex: '1 1 260px', maxWidth: '360px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: textMuted, pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Buscar equipo, #, manager, coach o sede..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 2.2rem 0.6rem 2.4rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.88rem', outline: 'none', background: bgCard, color: textDark }}
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: textMuted, padding: 0 }}
                      title="Limpiar búsqueda"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {canViewAll && (
                  <select value={filterSede} onChange={e => setFilterSede(e.target.value)} style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: `1px solid ${borderLight}`, background: bgCard, color: textDark, fontSize: '0.85rem' }}>
                    <option value="">Todas las Sedes</option>
                    {OPERATIONAL_SEDES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}

                {(canViewAll || canViewOwnSede) && !viewAsTrainer && (
                  <select value={filterEntrenador} onChange={e => setFilterEntrenador(e.target.value)} style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: `1px solid ${borderLight}`, background: bgCard, color: textDark, fontSize: '0.85rem' }}>
                    <option value="">Todos los Entrenadores</option>
                    {ENTRENADORES_LIST.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                )}

                {/* FILTRO ACTIVOS / ARCHIVO / TODOS */}
                <div style={{ display: 'flex', gap: '0.25rem', background: '#e2e8f0', padding: '0.25rem', borderRadius: '8px', flexShrink: 0 }}>
                  {[
                    { id: 'Activos', label: '⚡ Activos' },
                    { id: 'Archivo', label: '📦 Archivo' },
                    { id: 'Todos', label: '🌐 Todos' },
                  ].map(lf => (
                    <button key={lf.id} onClick={() => setGroupLifecycleFilter(lf.id)} style={{
                      padding: '0.4rem 0.75rem', borderRadius: '6px', border: 'none',
                      background: groupLifecycleFilter === lf.id ? '#ffffff' : 'transparent',
                      color: groupLifecycleFilter === lf.id ? '#0f172a' : '#475569',
                      fontWeight: groupLifecycleFilter === lf.id ? 800 : 600,
                      boxShadow: groupLifecycleFilter === lf.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap'
                    }}>
                      {lf.label}
                    </button>
                  ))}
                </div>

                {/* FILTROS DE ASISTENCIA GRUPAL */}
                <div style={{ display: 'flex', gap: '0.25rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
                  {[
                    { id: 'Todos', label: 'Todos' },
                    { id: 'Completos', label: '🟢 100%' },
                    { id: 'Parciales', label: '🟡 Parcial' },
                    { id: 'Pendientes', label: '⏳ Pendiente' }
                  ].map(st => (
                    <button key={st.id} onClick={() => setGroupFilterStatus(st.id)} style={{
                      padding: '0.35rem 0.65rem', borderRadius: '6px', border: 'none',
                      background: groupFilterStatus === st.id ? '#ffffff' : 'transparent',
                      color: groupFilterStatus === st.id ? '#0f172a' : '#64748b',
                      fontWeight: groupFilterStatus === st.id ? 700 : 500,
                      boxShadow: groupFilterStatus === st.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      fontSize: '0.78rem', cursor: 'pointer'
                    }}>
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {userCanAdd && (
                <button
                  onClick={() => { setShowModal(true); setAddMode('equipo'); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.3)', whiteSpace: 'nowrap' }}
                >
                  <Plus size={16} /> + Nuevo Equipo
                </button>
              )}
            </div>

            {/* GRILLA DE EQUIPOS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
              {groupTeams.map((t, idx) => {
                const statusBadgeBg = t.statusType === 'Completo' ? '#dcfce7' : t.statusType === 'Parcial' ? '#fef3c7' : t.statusType === 'Ausente' ? '#fee2e2' : '#f1f5f9';
                const statusBadgeColor = t.statusType === 'Completo' ? '#15803d' : t.statusType === 'Parcial' ? '#b45309' : t.statusType === 'Ausente' ? '#b91c1c' : '#475569';
                const statusText = t.statusType === 'Completo' ? `🟢 ${t.pct}% (${t.asistieron}/${t.total})` : t.statusType === 'Parcial' ? `🟡 ${t.pct}% (${t.asistieron}/${t.total})` : t.statusType === 'Ausente' ? `🔴 0% (0/${t.total})` : `⏳ Sin Registro`;

                return (
                  <div key={idx} style={{ background: bgCard, borderRadius: '12px', padding: '1.5rem', border: `1px solid ${borderLight}`, borderTop: `4px solid ${SEDE_COLORS[t.sede] || '#3b82f6'}`, boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      {/* HEADER TARJETA */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem', gap: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <h3 style={{ margin: 0, color: textDark, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
                              <CountryFlag sede={t.sede} />
                              {t.equipo} {t.numEquipo ? `(#${t.numEquipo})` : ''}
                            </h3>
                            {userCanAdd && (
                              <button
                                onClick={() => handleOpenEditTeam(t)}
                                title="Editar Equipo y Miembros"
                                style={{ background: '#f1f5f9', border: `1px solid ${borderLight}`, color: '#2563eb', padding: '0.25rem 0.5rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                              >
                                <Edit3 size={12} /> Editar
                              </button>
                            )}
                          </div>
                          
                          {/* LISTA DE ENTRENADORES ASIGNADOS */}
                          <div style={{ fontSize: '0.8rem', color: textMuted, marginTop: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600 }}>Coach(es):</span>
                            {t.entrenadoresArr.length > 0 ? (
                              t.entrenadoresArr.map(e => (
                                <button
                                  key={e}
                                  type="button"
                                  onClick={() => setTrainerCardModal(e)}
                                  title={`Ver tarjeta de ${e}`}
                                  style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  🎓 {e}
                                </button>
                              ))
                            ) : (
                              <span style={{ color: '#94a3b8' }}>Sin Asignar</span>
                            )}
                            <span>•</span>
                            <span style={{ fontWeight: 600 }}>{t.sede}</span>
                          </div>
                        </div>
                        <div style={{ background: statusBadgeBg, color: statusBadgeColor, padding: '0.3rem 0.7rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                          {statusText}
                        </div>
                      </div>

                      {/* FECHA ULTIMA LLAMADA */}
                      <div style={{ fontSize: '0.78rem', color: t.lastDate ? '#2563eb' : textMuted, background: '#f8fafc', padding: '0.4rem 0.8rem', borderRadius: '6px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: `1px solid ${borderLight}` }}>
                        <Calendar size={14} />
                        {t.lastDate ? <span>Última llamada: <strong>{t.lastDate}</strong></span> : <span>Sin llamadas grupales registradas aún</span>}
                      </div>

                      {/* LISTA DETALLADA DE INTEGRANTES DEL EQUIPO */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        
                        {/* 1. CAPITANES DESTACADOS */}
                        {t.capitanes.map(m => {
                          const isAsistio = m.llamadaAsistio === 'SI';
                          const isNoAsistio = m.llamadaAsistio === 'NO';
                          return (
                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.8rem', background: '#fefce8', border: '1px solid #fef08a', borderRadius: '8px', fontSize: '0.85rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ background: '#fef08a', color: '#854d0e', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}>
                                  <Crown size={11} color="#854d0e" /> Capitán
                                </span>
                                <span style={{ fontWeight: 700, color: '#713f12' }}>{m.nombre}</span>
                                {m.telefono && (
                                  <a href={`${getWhatsAppUrl(m.telefono, m.sede || filterSede)}`} target="_blank" rel="noreferrer" title="Contactar por WhatsApp" style={{ color: '#10b981', textDecoration: 'none' }}>
                                    📱
                                  </a>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <button
                                  onClick={() => handleUpdateLlamada(m.id, m.llamadaFecha || new Date().toISOString().split('T')[0], isAsistio ? 'NO' : 'SI')}
                                  title="Clic para cambiar estado de conexión"
                                  style={{
                                    border: 'none', background: isAsistio ? '#10b981' : isNoAsistio ? '#ef4444' : '#e2e8f0',
                                    color: isAsistio || isNoAsistio ? '#fff' : '#64748b',
                                    padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                                  }}
                                >
                                  {isAsistio ? '✅ Conectó' : isNoAsistio ? '❌ No Conectó' : '⏳ Pendiente'}
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* 2. MANAGERS DEL EQUIPO */}
                        {t.managersOnly.map(m => {
                          const isAsistio = m.llamadaAsistio === 'SI';
                          const isNoAsistio = m.llamadaAsistio === 'NO';
                          const pillBg = isAsistio ? '#ecfdf5' : isNoAsistio ? '#fef2f2' : '#f8fafc';
                          const pillBorder = isAsistio ? '#a7f3d0' : isNoAsistio ? '#fecaca' : borderLight;
                          const pillText = isAsistio ? '#065f46' : isNoAsistio ? '#991b1b' : textDark;

                          return (
                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.8rem', background: pillBg, border: `1px solid ${pillBorder}`, borderRadius: '8px', fontSize: '0.85rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 600, color: pillText }}>{m.nombre}</span>
                                {m.telefono && (
                                  <a href={`${getWhatsAppUrl(m.telefono, m.sede || filterSede)}`} target="_blank" rel="noreferrer" title="Contactar por WhatsApp" style={{ color: '#10b981', textDecoration: 'none' }}>
                                    📱
                                  </a>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <button
                                  onClick={() => handleUpdateLlamada(m.id, m.llamadaFecha || new Date().toISOString().split('T')[0], isAsistio ? 'NO' : 'SI')}
                                  title="Clic para cambiar estado de conexión"
                                  style={{
                                    border: 'none', background: isAsistio ? '#10b981' : isNoAsistio ? '#ef4444' : '#e2e8f0',
                                    color: isAsistio || isNoAsistio ? '#fff' : '#64748b',
                                    padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                                  }}
                                >
                                  {isAsistio ? '✅ Conectó' : isNoAsistio ? '❌ No Conectó' : '⏳ Pendiente'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* BOTONES DE ACCION DEL EQUIPO */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => openGroupModal(t)} style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: 'none', background: '#d97706', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 2px 4px rgba(217,119,6,0.2)' }}>
                        <PhoneCall size={16} /> Llamada Grupal
                      </button>
                      {userCanAdd && (
                        <button
                          onClick={() => setDeleteConfirm({ type: 'team', sede: t.sede, equipo: t.equipo, name: t.equipo })}
                          title="Eliminar Equipo"
                          style={{ padding: '0.65rem', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {groupTeams.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', background: bgCard, borderRadius: '12px', border: `1px solid ${borderLight}`, color: textMuted }}>
                  <Users size={32} style={{ margin: '0 auto 1rem auto', display: 'block', opacity: 0.5 }} />
                  No hay equipos con los filtros seleccionados ({groupLifecycleFilter}).
                </div>
              )}
            </div>
          </div>
        )}

        {/* SEDES */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* KPI BAR SEDES */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div style={{ background: bgCard, borderRadius: '12px', padding: '1.2rem', border: `1px solid ${borderLight}`, display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ background: '#fef3c7', padding: '0.8rem', borderRadius: '10px', color: '#d97706' }}><Award size={24} /></div>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: textDark }}>{sedesStats.length}</div>
                  <div style={{ fontSize: '0.75rem', color: textMuted, fontWeight: 600 }}>Sedes Operativas</div>
                </div>
              </div>
              <div style={{ background: bgCard, borderRadius: '12px', padding: '1.2rem', border: `1px solid ${borderLight}`, display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ background: '#dbeafe', padding: '0.8rem', borderRadius: '10px', color: '#2563eb' }}><Users size={24} /></div>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb' }}>{stats.total}</div>
                  <div style={{ fontSize: '0.75rem', color: textMuted, fontWeight: 600 }}>Total Managers Global</div>
                </div>
              </div>
              <div style={{ background: bgCard, borderRadius: '12px', padding: '1.2rem', border: `1px solid ${borderLight}`, display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ background: '#dcfce7', padding: '0.8rem', borderRadius: '10px', color: '#16a34a' }}><CheckCircle size={24} /></div>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a' }}>{stats.graduados} ({stats.pct}%)</div>
                  <div style={{ fontSize: '0.75rem', color: textMuted, fontWeight: 600 }}>Graduados Totales</div>
                </div>
              </div>
            </div>

            {/* BARRA DE BUSQUEDA SEDES */}
            <div style={{ background: bgCard, borderRadius: '12px', padding: '1rem 1.5rem', border: `1px solid ${borderLight}`, display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ position: 'relative', minWidth: '280px', flex: '1 1 280px', maxWidth: '450px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: textMuted }} />
                <input
                  type="text"
                  placeholder="Buscar sede o entrenador..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 2.2rem 0.6rem 2.4rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.9rem', outline: 'none', background: bgCard, color: textDark }}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={{ position: 'absolute', right: '10px', top: '10px', background: 'transparent', border: 'none', cursor: 'pointer', color: textMuted, padding: 0 }}
                    title="Limpiar búsqueda"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <div style={{ fontSize: '0.82rem', color: textMuted, fontWeight: 600 }}>
                {sedesStats.length} sedes operativas registradas
              </div>
            </div>

            {/* GRILLA DE SEDES */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {sedesStats.map(s => (
                <div key={s.sede} style={{ background: bgCard, borderRadius: '12px', padding: '1.5rem', border: `1px solid ${borderLight}`, borderTop: `4px solid ${SEDE_COLORS[s.sede] || '#3b82f6'}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, color: textDark, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                        <CountryFlag sede={s.sede} /> {s.sede}
                      </h3>
                      <span style={{ background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
                        {s.total} Managers
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem', textAlign: 'center' }}>
                      <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '8px', border: `1px solid ${borderLight}` }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: textDark }}>{s.totalEquipos}</div>
                        <div style={{ fontSize: '0.7rem', color: textMuted }}>Equipos</div>
                      </div>
                      <div style={{ background: '#f0fdf4', padding: '0.5rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16a34a' }}>{s.activos}</div>
                        <div style={{ fontSize: '0.7rem', color: '#16a34a' }}>Activos</div>
                      </div>
                      <div style={{ background: '#fef2f2', padding: '0.5rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626' }}>{s.desertores}</div>
                        <div style={{ fontSize: '0.7rem', color: '#dc2626' }}>Desertores</div>
                      </div>
                    </div>

                    {s.entrenadores.length > 0 && (
                      <div style={{ fontSize: '0.78rem', marginBottom: '1rem' }}>
                        <span style={{ color: textMuted, fontWeight: 600 }}>Entrenadores:</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem' }}>
                          {s.entrenadores.map(e => (
                            <button
                              key={e}
                              type="button"
                              onClick={() => setTrainerCardModal(e)}
                              title={`Ver tarjeta de ${e}`}
                              style={{ background: '#eff6ff', color: '#1d4ed8', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              🎓 {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => { setFilterSede(s.sede); setActiveTab('directorio'); setCurrentPage(1); }}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: `1px solid ${borderLight}`, background: '#f8fafc', color: textDark, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    Ver Directorio de {s.sede} ({s.total})
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ENTRENADORES */}
        {activeTab === 'entrenadores' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ background: bgCard, borderRadius: '12px', padding: '1rem 1.5rem', border: `1px solid ${borderLight}`, display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ position: 'relative', minWidth: '280px', flex: '1 1 280px', maxWidth: '450px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: textMuted }} />
                <input
                  type="text"
                  placeholder="Buscar entrenador, equipo o sede..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 2.2rem 0.6rem 2.4rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.9rem', outline: 'none', background: bgCard, color: textDark }}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={{ position: 'absolute', right: '10px', top: '10px', background: 'transparent', border: 'none', cursor: 'pointer', color: textMuted, padding: 0 }}
                    title="Limpiar búsqueda"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <div style={{ fontSize: '0.82rem', color: textMuted, fontWeight: 600 }}>
                {trainersStats.length} entrenadores encontrados
              </div>
            </div>

            {/* GRILLA DE ENTRENADORES */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {trainersStats.map(t => (
                <div key={t.entrenador} style={{ background: bgCard, borderRadius: '12px', padding: '1.5rem', border: `1px solid ${borderLight}`, borderTop: '4px solid #7c3aed', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                      <div>
                        <h3 style={{ margin: 0, color: textDark, fontSize: '1.15rem', fontWeight: 800 }}>
                          🎓 {t.entrenador}
                        </h3>
                      </div>
                      <span style={{ background: '#f3e8ff', color: '#7c3aed', padding: '0.25rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
                        {t.total} Managers
                      </span>
                    </div>

                    <div style={{ margin: '1rem 0 0.5rem 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                        <span style={{ color: textMuted }}>Efectividad de Llamadas:</span>
                        <strong style={{ color: t.pctAsist >= 70 ? '#16a34a' : '#d97706' }}>{t.pctAsist}%</strong>
                      </div>
                      <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${t.pctAsist}%`, height: '100%', background: t.pctAsist >= 70 ? '#10b981' : '#f59e0b', borderRadius: '4px', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', margin: '1rem 0', textAlign: 'center' }}>
                      <div style={{ background: '#f8fafc', padding: '0.5rem 0.3rem', borderRadius: '8px', border: `1px solid ${borderLight}` }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: textDark }}>{t.equipos.length}</div>
                        <div style={{ fontSize: '0.68rem', color: textMuted }}>Equipos</div>
                      </div>
                      <div style={{ background: '#f0fdf4', padding: '0.5rem 0.3rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#16a34a' }}>{t.asistieron}</div>
                        <div style={{ fontSize: '0.68rem', color: '#16a34a' }}>Conectaron</div>
                      </div>
                      <div style={{ background: '#fef2f2', padding: '0.5rem 0.3rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#dc2626' }}>{t.noAsistieron}</div>
                        <div style={{ fontSize: '0.68rem', color: '#dc2626' }}>Ausentes</div>
                      </div>
                    </div>

                    {t.equipos.length > 0 && (
                      <div style={{ fontSize: '0.78rem', marginBottom: '1rem' }}>
                        <span style={{ color: textMuted, fontWeight: 600 }}>Equipos a cargo:</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem' }}>
                          {t.equipos.map(eq => (
                            <span key={eq} style={{ background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', color: '#334155', fontWeight: 500 }}>
                              {eq}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: `1px solid ${borderLight}`, paddingTop: '1rem' }}>
                    <button
                      onClick={() => { setFilterEntrenador(t.entrenador); setActiveTab('directorio'); setCurrentPage(1); }}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: `1px solid ${borderLight}`, background: '#fff', color: textDark, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                    >
                      <Users size={14} /> Managers ({t.total})
                    </button>
                    <button
                      onClick={() => { setFilterEntrenador(t.entrenador); setActiveTab('grupales'); }}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: '#7c3aed', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                    >
                      <Layers size={14} /> Equipos ({t.equipos.length})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LIQUIDACIÓN DE ENTRENADORES (02/09/2026) — solo José Sánchez y Elizabeth Escobar */}
        {activeTab === 'liquidacion' && canViewLiquidacion && (
          <div style={{ background: bgCard, borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: `1px solid ${borderLight}`, padding: '1.5rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: textDark }}>💰 Liquidación de Entrenadores</h2>
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: textMuted }}>
                $400 USD por equipo, pago único al llegar a 7 llamadas grupales registradas.
                Acceso restringido a José Sánchez y Elizabeth Escobar.
              </p>
            </div>

            <h3 style={{ fontSize: '1rem', color: textDark, marginBottom: '0.75rem' }}>
              Pendientes de pago ({liquidacionData.pendientes.length})
            </h3>
            {liquidacionData.pendientes.length === 0 ? (
              <p style={{ color: textMuted, fontSize: '0.9rem' }}>No hay equipos pendientes de liquidar por ahora.</p>
            ) : (
              <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${borderLight}`, textAlign: 'left' }}>
                      <th style={{ padding: '0.6rem' }}>Equipo</th>
                      <th style={{ padding: '0.6rem' }}>Sede</th>
                      <th style={{ padding: '0.6rem' }}>Entrenador</th>
                      <th style={{ padding: '0.6rem' }}>Llamadas</th>
                      <th style={{ padding: '0.6rem' }}>Llegó a 7 el</th>
                      <th style={{ padding: '0.6rem' }}>Monto</th>
                      <th style={{ padding: '0.6rem' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {liquidacionData.pendientes.map(item => (
                      <tr key={item.equipoKey} style={{ borderBottom: `1px solid ${borderLight}` }}>
                        <td style={{ padding: '0.6rem', fontWeight: 600 }}>{item.equipo} {item.numEquipo ? `(#${item.numEquipo})` : ''}</td>
                        <td style={{ padding: '0.6rem' }}><CountryFlag sede={item.sede} /> {item.sede}</td>
                        <td style={{ padding: '0.6rem' }}>{item.entrenador}</td>
                        <td style={{ padding: '0.6rem' }}>{item.totalLlamadas}</td>
                        <td style={{ padding: '0.6rem' }}>{item.fechaAlcanzo7 || '—'}</td>
                        <td style={{ padding: '0.6rem', fontWeight: 700, color: '#059669' }}>${item.montoUSD}</td>
                        <td style={{ padding: '0.6rem' }}>
                          <button
                            onClick={() => handleMarcarPagado(item)}
                            style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            Marcar como pagado
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h3 style={{ fontSize: '1rem', color: textDark, marginBottom: '0.75rem' }}>
              Historial de pagos ({liquidacionData.pagados.length})
            </h3>
            {liquidacionData.pagados.length === 0 ? (
              <p style={{ color: textMuted, fontSize: '0.9rem' }}>Todavía no se ha marcado ningún pago.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${borderLight}`, textAlign: 'left' }}>
                      <th style={{ padding: '0.6rem' }}>Equipo</th>
                      <th style={{ padding: '0.6rem' }}>Sede</th>
                      <th style={{ padding: '0.6rem' }}>Entrenador</th>
                      <th style={{ padding: '0.6rem' }}>Monto</th>
                      <th style={{ padding: '0.6rem' }}>Pagado el</th>
                      <th style={{ padding: '0.6rem' }}>Pagado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liquidacionData.pagados.map(item => (
                      <tr key={item.equipoKey} style={{ borderBottom: `1px solid ${borderLight}` }}>
                        <td style={{ padding: '0.6rem', fontWeight: 600 }}>{item.equipo} {item.numEquipo ? `(#${item.numEquipo})` : ''}</td>
                        <td style={{ padding: '0.6rem' }}>{item.sede}</td>
                        <td style={{ padding: '0.6rem' }}>{item.entrenador}</td>
                        <td style={{ padding: '0.6rem', fontWeight: 700, color: '#059669' }}>${item.montoUSD}</td>
                        <td style={{ padding: '0.6rem' }}>{item.fechaPago || '—'}</td>
                        <td style={{ padding: '0.6rem' }}>{item.pagadoPorNombre || item.pagadoPorEmail || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ======================================================== */}
      {/* MODAL MULTI-PROPÓSITO: NUEVO INTEGRANTE O EQUIPO COMPLETO */}
      {/* ======================================================== */}
      {showModal && userCanAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: bgCard, width: '100%', maxWidth: '680px', borderRadius: '16px', padding: '2rem', boxShadow: '0 25px 30px -5px rgba(0,0,0,0.2)', border: `1px solid ${borderLight}`, maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h2 style={{ margin: 0, color: textDark, fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PlusCircle size={22} color="#3b82f6" /> Crear Nuevo Registro
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: textMuted }}>
                <X size={20} />
              </button>
            </div>

            {/* SELECTOR DE MODO: INDIVIDUAL VS EQUIPO COMPLETO */}
            <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.3rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setAddMode('individual')}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none',
                  background: addMode === 'individual' ? '#ffffff' : 'transparent',
                  color: addMode === 'individual' ? '#2563eb' : '#64748b',
                  fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                  boxShadow: addMode === 'individual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                }}
              >
                <Users size={16} /> 👤 Integrante Individual (Manager / Capitán)
              </button>
              <button
                type="button"
                onClick={() => setAddMode('equipo')}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none',
                  background: addMode === 'equipo' ? '#ffffff' : 'transparent',
                  color: addMode === 'equipo' ? '#2563eb' : '#64748b',
                  fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                  boxShadow: addMode === 'equipo' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                }}
              >
                <Shield size={16} /> 🛡️ Equipo Completo (Capitán + Managers)
              </button>
            </div>

            {/* FORMULARIO 1: INDIVIDUAL */}
            {addMode === 'individual' && (
              <form onSubmit={handleSaveNewManager} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: textDark, marginBottom: '0.3rem' }}>
                      Nombre Completo *
                    </label>
                    <input
                      required
                      placeholder="Ej: Juan Pérez"
                      value={newManager.nombre}
                      onChange={e => setNewManager({ ...newManager, nombre: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: textDark, marginBottom: '0.3rem' }}>
                      Rol en el Equipo
                    </label>
                    <select
                      value={newManager.rol}
                      onChange={e => setNewManager({ ...newManager, rol: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.9rem', fontWeight: 600 }}
                    >
                      <option value="Manager">Manager</option>
                      <option value="Capitan">👑 Capitán</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: textDark, marginBottom: '0.3rem' }}>
                      Teléfono WhatsApp
                    </label>
                    <input
                      placeholder="Ej: +593 99 123 4567"
                      value={newManager.telefono}
                      onChange={e => setNewManager({ ...newManager, telefono: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: textDark, marginBottom: '0.3rem' }}>
                      Sede
                    </label>
                    <select
                      value={newManager.sede}
                      onChange={e => setNewManager({ ...newManager, sede: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.9rem' }}
                    >
                      {OPERATIONAL_SEDES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: textDark, marginBottom: '0.3rem' }}>
                      Nombre de Equipo
                    </label>
                    <input
                      placeholder="Ej: FENIX, ALFA, TITANES..."
                      value={newManager.equipo}
                      onChange={e => setNewManager({ ...newManager, equipo: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: textDark, marginBottom: '0.3rem' }}>
                      # Número
                    </label>
                    <input
                      placeholder="Ej: 1, 2, 4..."
                      value={newManager.numEquipo}
                      onChange={e => setNewManager({ ...newManager, numEquipo: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                {/* SELECTOR DE MULTI-ENTRENADORES */}
                <div style={{ border: `1px solid ${borderLight}`, borderRadius: '10px', padding: '0.8rem', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: textDark }}>
                      🎓 Entrenador(es) Asignado(s)
                    </label>
                    {!userCanAssign && (
                      <span style={{ fontSize: '0.72rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Lock size={12} /> Requiere permiso de Fer / Paul / SuperAdmin
                      </span>
                    )}
                  </div>
                  {userCanAssign ? (
                    <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.4rem' }}>
                      {ENTRENADORES_LIST.map(e => {
                        const isSelected = (newManager.selectedTrainers || []).includes(e);
                        return (
                          <button
                            type="button"
                            key={e}
                            onClick={() => {
                              const current = newManager.selectedTrainers || [];
                              const updated = isSelected ? current.filter(t => t !== e) : [...current, e];
                              setNewManager({ ...newManager, selectedTrainers: updated });
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.4rem',
                              padding: '0.4rem 0.6rem', borderRadius: '6px',
                              border: `1px solid ${isSelected ? '#3b82f6' : '#cbd5e1'}`,
                              background: isSelected ? '#eff6ff' : '#ffffff',
                              color: isSelected ? '#1d4ed8' : textDark,
                              fontSize: '0.78rem', fontWeight: isSelected ? 700 : 500,
                              cursor: 'pointer', textAlign: 'left'
                            }}
                          >
                            {isSelected ? <CheckSquare size={14} color="#2563eb" /> : <Square size={14} color="#94a3b8" />}
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ color: textMuted, fontSize: '0.82rem' }}>
                      {newManager.selectedTrainers?.length > 0 ? newManager.selectedTrainers.join(', ') : 'Sin Asignar'}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: `1px solid ${borderLight}`, background: '#fff', color: textDark, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}>Guardar Integrante</button>
                </div>
              </form>
            )}

            {/* FORMULARIO 2: EQUIPO COMPLETO */}
            {addMode === 'equipo' && (
              <form onSubmit={handleSaveNewTeam} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: textDark, marginBottom: '0.3rem' }}>
                      Sede *
                    </label>
                    <select
                      value={newTeam.sede}
                      onChange={e => setNewTeam({ ...newTeam, sede: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.9rem' }}
                    >
                      {OPERATIONAL_SEDES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: textDark, marginBottom: '0.3rem' }}>
                      Nombre del Equipo *
                    </label>
                    <input
                      required
                      placeholder="Ej: TITANES, FENIX, IMPARABLES..."
                      value={newTeam.equipo}
                      onChange={e => setNewTeam({ ...newTeam, equipo: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.9rem', fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: textDark, marginBottom: '0.3rem' }}>
                      # Número
                    </label>
                    <input
                      placeholder="Ej: 1"
                      value={newTeam.numEquipo}
                      onChange={e => setNewTeam({ ...newTeam, numEquipo: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                {/* SELECTOR MULTI-COACH PARA EQUIPO */}
                <div style={{ border: `1px solid ${borderLight}`, borderRadius: '10px', padding: '0.8rem', background: '#f8fafc' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: textDark, marginBottom: '0.4rem' }}>
                    🎓 Entrenador(es) Asignado(s) al Equipo
                  </label>
                  {userCanAssign ? (
                    <div style={{ maxHeight: '130px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.4rem' }}>
                      {ENTRENADORES_LIST.map(e => {
                        const isSelected = (newTeam.selectedTrainers || []).includes(e);
                        return (
                          <button
                            type="button"
                            key={e}
                            onClick={() => {
                              const current = newTeam.selectedTrainers || [];
                              const updated = isSelected ? current.filter(t => t !== e) : [...current, e];
                              setNewTeam({ ...newTeam, selectedTrainers: updated });
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.4rem',
                              padding: '0.4rem 0.6rem', borderRadius: '6px',
                              border: `1px solid ${isSelected ? '#3b82f6' : '#cbd5e1'}`,
                              background: isSelected ? '#eff6ff' : '#ffffff',
                              color: isSelected ? '#1d4ed8' : textDark,
                              fontSize: '0.78rem', fontWeight: isSelected ? 700 : 500,
                              cursor: 'pointer', textAlign: 'left'
                            }}
                          >
                            {isSelected ? <CheckSquare size={14} color="#2563eb" /> : <Square size={14} color="#94a3b8" />}
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ color: textMuted, fontSize: '0.82rem' }}>
                      {newTeam.selectedTrainers?.length > 0 ? newTeam.selectedTrainers.join(', ') : 'Sin Asignar'}
                    </div>
                  )}
                </div>

                {/* CAPITÁN DEL EQUIPO */}
                <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '10px', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                    <Crown size={16} color="#854d0e" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#854d0e' }}>Capitán del Equipo</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.8rem' }}>
                    <input
                      placeholder="Nombre del Capitán"
                      value={newTeam.capitan.nombre}
                      onChange={e => setNewTeam({ ...newTeam, capitan: { ...newTeam.capitan, nombre: e.target.value } })}
                      style={{ padding: '0.55rem', borderRadius: '6px', border: '1px solid #fde047', fontSize: '0.85rem', background: '#fff' }}
                    />
                    <input
                      placeholder="Teléfono Capitán"
                      value={newTeam.capitan.telefono}
                      onChange={e => setNewTeam({ ...newTeam, capitan: { ...newTeam.capitan, telefono: e.target.value } })}
                      style={{ padding: '0.55rem', borderRadius: '6px', border: '1px solid #fde047', fontSize: '0.85rem', background: '#fff' }}
                    />
                  </div>
                </div>

                {/* LISTA DINÁMICA DE MANAGERS DEL EQUIPO */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: textDark }}>
                      Managers del Equipo ({newTeam.managers.length})
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewTeam({
                        ...newTeam,
                        managers: [...newTeam.managers, { id: Date.now() + Math.random(), nombre: '', telefono: '' }]
                      })}
                      style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', fontSize: '0.78rem', fontWeight: 700, padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <UserPlus size={14} /> + Agregar Manager
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                    {newTeam.managers.map((m, idx) => (
                      <div key={m.id || idx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          placeholder={`Manager #${idx + 1}`}
                          value={m.nombre}
                          onChange={e => {
                            const updated = [...newTeam.managers];
                            updated[idx].nombre = e.target.value;
                            setNewTeam({ ...newTeam, managers: updated });
                          }}
                          style={{ padding: '0.5rem', borderRadius: '6px', border: `1px solid ${borderLight}`, fontSize: '0.85rem' }}
                        />
                        <input
                          placeholder="Teléfono"
                          value={m.telefono}
                          onChange={e => {
                            const updated = [...newTeam.managers];
                            updated[idx].telefono = e.target.value;
                            setNewTeam({ ...newTeam, managers: updated });
                          }}
                          style={{ padding: '0.5rem', borderRadius: '6px', border: `1px solid ${borderLight}`, fontSize: '0.85rem' }}
                        />
                        {newTeam.managers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = newTeam.managers.filter((_, i) => i !== idx);
                              setNewTeam({ ...newTeam, managers: updated });
                            }}
                            style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.45rem', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: `1px solid ${borderLight}`, background: '#fff', color: textDark, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}>Guardar Equipo Completo</button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL EDITAR EQUIPO COMPLETO Y SUS INTEGRANTES           */}
      {/* ======================================================== */}
      {editTeamModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: bgCard, width: '100%', maxWidth: '720px', borderRadius: '16px', padding: '2rem', boxShadow: '0 25px 30px -5px rgba(0,0,0,0.2)', border: `1px solid ${borderLight}`, maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <div>
                <h2 style={{ margin: 0, color: textDark, fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Edit3 size={22} color="#3b82f6" /> Editar Equipo: {editTeamModal.originalEquipo}
                </h2>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: textMuted }}>
                  Sede: {editTeamModal.originalSede} • {editTeamModal.members.length} integrantes
                </p>
              </div>
              <button onClick={() => setEditTeamModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: textMuted }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditTeam} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: textDark, marginBottom: '0.3rem' }}>
                    Sede
                  </label>
                  <select
                    value={editTeamModal.sede}
                    onChange={e => setEditTeamModal({ ...editTeamModal, sede: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.9rem' }}
                  >
                    {OPERATIONAL_SEDES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: textDark, marginBottom: '0.3rem' }}>
                    Nombre del Equipo *
                  </label>
                  <input
                    required
                    value={editTeamModal.equipo}
                    onChange={e => setEditTeamModal({ ...editTeamModal, equipo: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.9rem', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: textDark, marginBottom: '0.3rem' }}>
                    # Número
                  </label>
                  <input
                    value={editTeamModal.numEquipo}
                    onChange={e => setEditTeamModal({ ...editTeamModal, numEquipo: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {/* ASIGNACIÓN DE MULTI-ENTRENADORES */}
              <div style={{ border: `1px solid ${borderLight}`, borderRadius: '10px', padding: '0.8rem', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: textDark }}>
                    🎓 Entrenador(es) Asignado(s) al Equipo
                  </label>
                  {!userCanAssign && (
                    <span style={{ fontSize: '0.72rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Lock size={12} /> Solo Fer, Paul y SuperAdmin pueden reasignar
                    </span>
                  )}
                </div>
                {userCanAssign ? (
                  <div style={{ maxHeight: '130px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.4rem' }}>
                    {ENTRENADORES_LIST.map(e => {
                      const isSelected = (editTeamModal.selectedTrainers || []).includes(e);
                      return (
                        <button
                          type="button"
                          key={e}
                          onClick={() => {
                            const current = editTeamModal.selectedTrainers || [];
                            const updated = isSelected ? current.filter(t => t !== e) : [...current, e];
                            setEditTeamModal({ ...editTeamModal, selectedTrainers: updated });
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.4rem 0.6rem', borderRadius: '6px',
                            border: `1px solid ${isSelected ? '#3b82f6' : '#cbd5e1'}`,
                            background: isSelected ? '#eff6ff' : '#ffffff',
                            color: isSelected ? '#1d4ed8' : textDark,
                            fontSize: '0.78rem', fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer', textAlign: 'left'
                          }}
                        >
                          {isSelected ? <CheckSquare size={14} color="#2563eb" /> : <Square size={14} color="#94a3b8" />}
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ color: textMuted, fontSize: '0.82rem' }}>
                    {editTeamModal.selectedTrainers?.length > 0 ? editTeamModal.selectedTrainers.join(', ') : 'Sin Asignar'}
                  </div>
                )}
              </div>

              {/* GESTION DE INTEGRANTES DEL EQUIPO (EDITAR ROL / NOMBRE / TELÉFONO / AGREGAR / REMOVER) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 800, color: textDark }}>
                    Roster de Integrantes ({editTeamModal.members.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditTeamModal({
                      ...editTeamModal,
                      members: [...editTeamModal.members, { id: Date.now() + Math.random(), nombre: '', rol: 'Manager', telefono: '', estado: 'Activo' }]
                    })}
                    style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: '0.78rem', fontWeight: 700, padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <UserPlus size={14} /> + Agregar Integrante
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                  {editTeamModal.members.map((m, idx) => {
                    const isCap = m.rol === 'Capitan';
                    return (
                      <div key={m.id || idx} style={{ display: 'grid', gridTemplateColumns: '120px 1.5fr 1fr auto', gap: '0.5rem', alignItems: 'center', background: isCap ? '#fefce8' : '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: '8px', border: `1px solid ${isCap ? '#fef08a' : borderLight}` }}>
                        <select
                          value={m.rol}
                          onChange={e => {
                            const updated = [...editTeamModal.members];
                            updated[idx].rol = e.target.value;
                            setEditTeamModal({ ...editTeamModal, members: updated });
                          }}
                          style={{ padding: '0.45rem', borderRadius: '6px', border: `1px solid ${isCap ? '#fde047' : borderLight}`, fontSize: '0.78rem', fontWeight: isCap ? 800 : 600, color: isCap ? '#854d0e' : textDark, background: '#fff' }}
                        >
                          <option value="Manager">Manager</option>
                          <option value="Capitan">👑 Capitán</option>
                        </select>
                        <input
                          placeholder="Nombre Completo"
                          value={m.nombre}
                          onChange={e => {
                            const updated = [...editTeamModal.members];
                            updated[idx].nombre = e.target.value;
                            setEditTeamModal({ ...editTeamModal, members: updated });
                          }}
                          style={{ padding: '0.45rem', borderRadius: '6px', border: `1px solid ${borderLight}`, fontSize: '0.85rem', fontWeight: 600 }}
                        />
                        <input
                          placeholder="Teléfono"
                          value={m.telefono}
                          onChange={e => {
                            const updated = [...editTeamModal.members];
                            updated[idx].telefono = e.target.value;
                            setEditTeamModal({ ...editTeamModal, members: updated });
                          }}
                          style={{ padding: '0.45rem', borderRadius: '6px', border: `1px solid ${borderLight}`, fontSize: '0.85rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editTeamModal.members.filter((_, i) => i !== idx);
                            setEditTeamModal({ ...editTeamModal, members: updated });
                          }}
                          title="Eliminar del equipo"
                          style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.45rem', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setEditTeamModal(null)} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: `1px solid ${borderLight}`, background: '#fff', color: textDark, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}>Guardar Cambios del Equipo</button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL EDITAR INTEGRANTE INDIVIDUAL                       */}
      {/* ======================================================== */}
      {editIndividualModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: bgCard, width: '100%', maxWidth: '600px', borderRadius: '16px', padding: '2rem', boxShadow: '0 25px 30px -5px rgba(0,0,0,0.2)', border: `1px solid ${borderLight}`, maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h2 style={{ margin: 0, color: textDark, fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={20} color="#3b82f6" /> Editar Integrante: {editIndividualModal.nombre}
              </h2>
              <button onClick={() => setEditIndividualModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: textMuted }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditIndividual} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: textDark, marginBottom: '0.3rem' }}>
                    Nombre Completo *
                  </label>
                  <input
                    required
                    value={editIndividualModal.nombre}
                    onChange={e => setEditIndividualModal({ ...editIndividualModal, nombre: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: textDark, marginBottom: '0.3rem' }}>
                    Rol
                  </label>
                  <select
                    value={editIndividualModal.rol}
                    onChange={e => setEditIndividualModal({ ...editIndividualModal, rol: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.9rem', fontWeight: 600 }}
                  >
                    <option value="Manager">Manager</option>
                    <option value="Capitan">👑 Capitán</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: textDark, marginBottom: '0.3rem' }}>
                    Teléfono WhatsApp
                  </label>
                  <input
                    value={editIndividualModal.telefono || ''}
                    onChange={e => setEditIndividualModal({ ...editIndividualModal, telefono: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: textDark, marginBottom: '0.3rem' }}>
                    Sede
                  </label>
                  <select
                    value={editIndividualModal.sede}
                    onChange={e => setEditIndividualModal({ ...editIndividualModal, sede: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.9rem' }}
                  >
                    {OPERATIONAL_SEDES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: textDark, marginBottom: '0.3rem' }}>
                    Equipo
                  </label>
                  <input
                    value={editIndividualModal.equipo || ''}
                    onChange={e => setEditIndividualModal({ ...editIndividualModal, equipo: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: textDark, marginBottom: '0.3rem' }}>
                    # Número
                  </label>
                  <input
                    value={editIndividualModal.numEquipo || ''}
                    onChange={e => setEditIndividualModal({ ...editIndividualModal, numEquipo: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {/* ASIGNACIÓN DE MULTI-ENTRENADOR */}
              <div style={{ border: `1px solid ${borderLight}`, borderRadius: '10px', padding: '0.8rem', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: textDark }}>
                    🎓 Entrenador(es) Asignado(s)
                  </label>
                  {!userCanAssign && (
                    <span style={{ fontSize: '0.72rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Lock size={12} /> Requiere permiso de Fer / Paul / SuperAdmin
                    </span>
                  )}
                </div>
                {userCanAssign ? (
                  <div style={{ maxHeight: '130px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.4rem' }}>
                    {ENTRENADORES_LIST.map(e => {
                      const isSelected = (editIndividualModal.selectedTrainers || []).includes(e);
                      return (
                        <button
                          type="button"
                          key={e}
                          onClick={() => {
                            const current = editIndividualModal.selectedTrainers || [];
                            const updated = isSelected ? current.filter(t => t !== e) : [...current, e];
                            setEditIndividualModal({ ...editIndividualModal, selectedTrainers: updated });
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.4rem 0.6rem', borderRadius: '6px',
                            border: `1px solid ${isSelected ? '#3b82f6' : '#cbd5e1'}`,
                            background: isSelected ? '#eff6ff' : '#ffffff',
                            color: isSelected ? '#1d4ed8' : textDark,
                            fontSize: '0.78rem', fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer', textAlign: 'left'
                          }}
                        >
                          {isSelected ? <CheckSquare size={14} color="#2563eb" /> : <Square size={14} color="#94a3b8" />}
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ color: textMuted, fontSize: '0.82rem' }}>
                    {editIndividualModal.selectedTrainers?.length > 0 ? editIndividualModal.selectedTrainers.join(', ') : 'Sin Asignar'}
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: textDark }}>
                    Estado (Graduación / Deserción)
                  </label>
                  {!canChangeStatus && (
                    <span style={{ fontSize: '0.72rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
                      <Lock size={12} /> Restringido a Coord. Maestría y Dirección
                    </span>
                  )}
                </div>
                {canChangeStatus ? (
                  <select
                    value={editIndividualModal.estado || 'Activo'}
                    onChange={e => setEditIndividualModal({ ...editIndividualModal, estado: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: `1px solid ${borderLight}`, fontSize: '0.9rem', fontWeight: 600 }}
                  >
                    <option value="Activo">⚡ Activo</option>
                    <option value="Graduado">🎓 Graduado</option>
                    <option value="Desertor">⚠️ Desertor</option>
                    <option value="Archivado">📦 Archivado</option>
                  </select>
                ) : (
                  <div style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', background: '#f8fafc', border: `1px solid ${borderLight}`, color: '#64748b', fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Lock size={14} color="#dc2626" />
                    <span>{editIndividualModal.estado || 'Activo'}</span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: 'auto' }}>Solo Lectura</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setEditIndividualModal(null)} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: `1px solid ${borderLight}`, background: '#fff', color: textDark, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}>Guardar Cambios</button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL CONFIRMACIÓN DE ELIMINACIÓN                        */}
      {/* ======================================================== */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: bgCard, width: '100%', maxWidth: '440px', borderRadius: '16px', padding: '2rem', boxShadow: '0 25px 30px -5px rgba(0,0,0,0.2)', border: `1px solid ${borderLight}`, textAlign: 'center' }}>
            <div style={{ background: '#fef2f2', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <AlertTriangle size={28} color="#dc2626" />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: textDark, fontSize: '1.2rem', fontWeight: 800 }}>
              ¿Confirmar Eliminación?
            </h3>
            <p style={{ color: textMuted, fontSize: '0.88rem', margin: '0 0 1.5rem 0' }}>
              {deleteConfirm.type === 'team'
                ? `¿Estás seguro de que deseas eliminar el equipo "${deleteConfirm.name}" y a todos sus integrantes de ${deleteConfirm.sede}?`
                : `¿Estás seguro de que deseas eliminar a "${deleteConfirm.name}"?`}
            </p>
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: `1px solid ${borderLight}`, background: '#fff', color: textDark, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'team') {
                    handleDeleteTeam(deleteConfirm.sede, deleteConfirm.equipo);
                  } else {
                    handleDeleteManager(deleteConfirm.id);
                  }
                }}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(220,38,38,0.3)' }}
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL ASISTENCIA LLAMADA GRUPAL                          */}
      {/* ======================================================== */}
      {groupModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: bgCard, width: '100%', maxWidth: '540px', borderRadius: '12px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', border: `1px solid ${borderLight}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <h2 style={{ margin: 0, color: textDark, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                <CountryFlag sede={groupModal.sede} /> {groupModal.equipo} {groupModal.numEquipo ? `(#${groupModal.numEquipo})` : ''}
              </h2>
              <span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 700, color: '#475569' }}>
                {groupModal.managers.length} Integrantes
              </span>
            </div>
            
            <p style={{ margin: '0 0 1.2rem 0', color: textMuted, fontSize: '0.85rem' }}>
              🎓 Entrenador(es): <strong>{groupModal.entrenadorUnico}</strong> • Sede: <strong>{groupModal.sede}</strong>
            </p>
            
            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: textDark, marginBottom: '0.4rem' }}>
                Fecha de la Llamada:
              </label>
              <input type="date" value={groupCallDate} onChange={e => setGroupCallDate(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: `1px solid ${borderLight}`, fontSize: '0.9rem' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: textDark }}>Asistencia Individual:</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    const allTrue = {};
                    groupModal.managers.forEach(m => allTrue[m.id] = true);
                    setGroupCallAttendance(allTrue);
                  }}
                  style={{ border: 'none', background: '#ecfdf5', color: '#059669', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Marcar Todos ✅
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const allFalse = {};
                    groupModal.managers.forEach(m => allFalse[m.id] = false);
                    setGroupCallAttendance(allFalse);
                  }}
                  style={{ border: 'none', background: '#fef2f2', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Marcar Todos ❌
                </button>
              </div>
            </div>
            
            <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '4px' }}>
              {groupModal.managers.map(m => {
                const checked = !!groupCallAttendance[m.id];
                const isCap = (m.rol || '').toLowerCase().includes('capitan');
                return (
                  <label key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1rem', background: checked ? '#f0fdf4' : '#fef2f2', borderRadius: '8px', border: `1px solid ${checked ? '#bbf7d0' : '#fecaca'}`, cursor: 'pointer', transition: 'all 0.15s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isCap && (
                        <span style={{ background: '#fef08a', color: '#854d0e', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800 }}>
                          👑 Capitán
                        </span>
                      )}
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: textDark }}>{m.nombre}</span>
                      {m.telefono && <a href={getWhatsAppUrl(m.telefono, m.sede || filterSede)} target='_blank' rel='noreferrer' style={{ fontSize: '0.75rem', color: '#10b981', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px', marginLeft: '4px' }}>💬 {m.telefono}</a>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: checked ? '#16a34a' : '#dc2626' }}>
                        {checked ? 'Conectó ✅' : 'No Asistió ❌'}
                      </span>
                      <input type="checkbox" checked={checked} onChange={e => setGroupCallAttendance({...groupCallAttendance, [m.id]: e.target.checked})} style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }} />
                    </div>
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setGroupModal(null)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: `1px solid ${borderLight}`, background: '#fff', color: textDark, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSaveGroupCall} style={{ padding: '0.6rem 1.4rem', borderRadius: '6px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(16,185,129,0.3)' }}>Guardar Asistencia</button>
            </div>
          </div>
        </div>
      )}

      {/* TARJETA DE LA PERSONA (Entrenador) — se abre al hacer clic en cualquier
          badge 🎓 de un entrenador (Directorio, Equipos o Sedes). Pedido de José
          el 28/08/2026: "cuando de click aqui debe de abrir la tarjeta de la persona". */}
      {trainerCardModal && (() => {
        const tc = getTrainerCardStats(trainerCardModal);
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setTrainerCardModal(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: bgCard, width: '100%', maxWidth: '440px', borderRadius: '12px', padding: '1.8rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', border: `1px solid ${borderLight}`, borderTop: '4px solid #7c3aed' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, color: textDark, fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  🎓 {trainerCardModal}
                </h2>
                <button onClick={() => setTrainerCardModal(null)} title="Cerrar" style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '0.3rem', cursor: 'pointer', color: textMuted }}>
                  <X size={16} />
                </button>
              </div>

              {tc && tc.total > 0 ? (
                <>
                  <div style={{ margin: '0.5rem 0 1rem 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                      <span style={{ color: textMuted }}>Efectividad de Llamadas:</span>
                      <strong style={{ color: tc.pctAsist >= 70 ? '#16a34a' : '#d97706' }}>{tc.pctAsist}%</strong>
                    </div>
                    <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${tc.pctAsist}%`, height: '100%', background: tc.pctAsist >= 70 ? '#10b981' : '#f59e0b', borderRadius: '4px' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', margin: '1rem 0', textAlign: 'center' }}>
                    <div style={{ background: '#f8fafc', padding: '0.5rem 0.3rem', borderRadius: '8px', border: `1px solid ${borderLight}` }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: textDark }}>{tc.total}</div>
                      <div style={{ fontSize: '0.65rem', color: textMuted }}>Managers</div>
                    </div>
                    <div style={{ background: '#eff6ff', padding: '0.5rem 0.3rem', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2563eb' }}>{tc.activos}</div>
                      <div style={{ fontSize: '0.65rem', color: '#2563eb' }}>Activos</div>
                    </div>
                    <div style={{ background: '#f0fdf4', padding: '0.5rem 0.3rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#16a34a' }}>{tc.graduados}</div>
                      <div style={{ fontSize: '0.65rem', color: '#16a34a' }}>Graduados</div>
                    </div>
                    <div style={{ background: '#fef2f2', padding: '0.5rem 0.3rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#dc2626' }}>{tc.desertores}</div>
                      <div style={{ fontSize: '0.65rem', color: '#dc2626' }}>Desertores</div>
                    </div>
                  </div>

                  {tc.sedes.length > 0 && (
                    <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.8rem', color: textMuted }}>
                      Sede(s): <strong style={{ color: textDark }}>{tc.sedes.join(', ')}</strong>
                    </p>
                  )}

                  {tc.equipos.length > 0 && (
                    <div style={{ fontSize: '0.78rem', marginBottom: '1rem' }}>
                      <span style={{ color: textMuted, fontWeight: 600 }}>Equipos a cargo:</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem' }}>
                        {tc.equipos.map(eq => (
                          <span key={eq} style={{ background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', color: '#334155', fontWeight: 500 }}>
                            {eq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ fontSize: '0.85rem', color: textMuted, margin: '0.5rem 0 1rem 0' }}>
                  No se encontraron managers/capitanes asignados actualmente a este entrenador en el Centro de Managers.
                </p>
              )}

              <button
                onClick={() => { setFilterEntrenador(trainerCardModal); setActiveTab('directorio'); setCurrentPage(1); setTrainerCardModal(null); }}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                Ver Directorio de {trainerCardModal}
              </button>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
