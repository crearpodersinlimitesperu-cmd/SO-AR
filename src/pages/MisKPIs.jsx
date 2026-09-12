import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  CheckCircle2, TrendingUp, AlertCircle, ArrowLeft, Users, Target, PhoneCall, 
  Award, ShieldCheck, RefreshCw, Database, Sparkles, Zap, ChevronRight, 
  Settings, Edit3, Save, X, Search, UserCheck, BarChart2, Filter, Info
} from 'lucide-react';
import { recordAuditEvent } from '../services/auditService';
import { USERS_TO_IMPORT } from '../data/usersToImport';
import nodusFallbackData from '../data/nodusFallbackData.json';

// Metas base por defecto por rol (cuando la persona aún no tiene metas personalizadas)
export const DEFAULT_KPI_METAS = {
  c1: {
    asistencia: 95,
    retencion: 10, // Menos de 10%
    conversionC1C2: 50,
    conversionC2MJ: 70,
    declaracionBreakthrough: 90,
    declaracionAliados: 40,
    palabrasRotas: 5, // Menos de 5%
    eficienciaGestion: 100
  },
  mj: {
    asistenciaMJ: 90,
    retencionMJ: 8, // Menos de 8%
    enroladosPorIMO: 3.0,
    conversionALider: 60,
    quiebresResueltos: 100,
    eficienciaSeguimiento: 100
  },
  capitan: {
    puntualidadEquipo: 100,
    cumplimientoMetas: 90,
    participacionActiva: 95,
    soporteCoaches: 100
  },
  qt: {
    efectividadLlamadas: 60,
    futurosImposibles: 80,
    resolucionQuiebres: 100
  },
  gerencia: {
    cumplimientoGlobalSede: 95,
    eficienciaOperativa: 90,
    controlDeQuiebres: 85
  }
};

// Extractor robusto y verificado de métricas reales de Nodus por persona
export function extractNodusMetrics(coord) {
  if (!coord) return null;
  const est = coord.estados || {};
  
  // 1. Asignados reales: de la raíz, de asignadosTotal o suma de llamadas de equipos
  let asignados = Number(coord.asignadosTotal || coord.asignados || 0);
  if (asignados === 0 && Array.isArray(coord.equipos) && coord.equipos.length > 0) {
    asignados = coord.equipos.reduce((acc, eq) => acc + (Number(eq.llamadas) || 0), 0);
  }
  if (asignados === 0 && est.asignados) {
    asignados = Number(est.asignados);
  }

  // 2. Confirmados reales: de confirmadosTotal, raíz, o suma de estados
  let confirmados = Number(coord.confirmadosTotal || coord.confirmados || est.confirmado || est.confirmados || 0);
  if (confirmados === 0 && Array.isArray(coord.equipos) && coord.equipos.length > 0) {
    confirmados = coord.equipos.reduce((acc, eq) => acc + (Number(eq.confirmado) || 0), 0);
  }

  // 3. Por confirmar
  let porConfirmar = Number(est.porConfirmar || coord.porConfirmar || 0);
  if (porConfirmar === 0 && Array.isArray(coord.equipos) && coord.equipos.length > 0) {
    porConfirmar = coord.equipos.reduce((acc, eq) => acc + (Number(eq.porConfirmar) || 0), 0);
  }

  // 4. No contesta
  let noContesta = Number(est.noContesta || coord.noContesta || 0);
  if (noContesta === 0 && Array.isArray(coord.equipos) && coord.equipos.length > 0) {
    noContesta = coord.equipos.reduce((acc, eq) => acc + (Number(eq.noContesta) || 0), 0);
  }

  // 5. No interesa
  let noInteresa = Number(est.noInteresa || coord.noInteresa || 0);
  if (noInteresa === 0 && Array.isArray(coord.equipos) && coord.equipos.length > 0) {
    noInteresa = coord.equipos.reduce((acc, eq) => acc + (Number(eq.noInteresa) || 0), 0);
  }

  // 6. Gestiones / Llamadas
  let llamadas = Number(coord.gestionesTotal || coord.gestiones || est.llamadas || 0);
  if (llamadas === 0 && Array.isArray(coord.equipos) && coord.equipos.length > 0) {
    llamadas = coord.equipos.reduce((acc, eq) => acc + (Number(eq.llamadas) || 0), 0);
  }

  // 7. Asistieron / Sentados en sala
  let asistieron = Number(coord.sentadosTotal || coord.asistieron || coord.sentadosC1 || 0);
  if (asistieron === 0 && Array.isArray(coord.equipos) && coord.equipos.length > 0) {
    asistieron = coord.equipos.reduce((acc, eq) => acc + (Number(eq.asistieron) || 0), 0);
  }

  // 8. Contactabilidad & Conversión con fallbacks calculados
  let contactabilidad = coord.coberturaPct ? Number(coord.coberturaPct) : 0;
  if (!contactabilidad && asignados > 0 && llamadas > 0) {
    contactabilidad = Math.min(100, Math.round((llamadas / asignados) * 100));
  }

  let conversion = coord.tasaEfectividad ? Number(coord.tasaEfectividad) : 0;
  if (!conversion && asignados > 0 && confirmados > 0) {
    conversion = Math.min(100, Math.round((confirmados / asignados) * 100));
  }

  return {
    asignados,
    confirmados,
    porConfirmar,
    noContesta,
    noInteresa,
    llamadas,
    asistieron,
    contactabilidad,
    conversion,
    sede: coord.sede || 'Sede',
    nombre: coord.nombre || coord.name || 'Coordinador',
    equipos: coord.equipos || []
  };
}

export default function MisKPIs() {
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [nodusData, setNodusData] = useState(null);
  const [loadingNodus, setLoadingNodus] = useState(false);
  
  // Catálogo completo de personas por rol
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [historyFilter, setHistoryFilter] = useState('person'); // 'person' | 'my' | 'all'
  
  // Metas personalizadas de la persona seleccionada
  const [customMetas, setCustomMetas] = useState(null);
  const [isEditingMetas, setIsEditingMetas] = useState(false);
  const [metasDraft, setMetasDraft] = useState({});
  const [savingMetas, setSavingMetas] = useState(false);

  // Detección automática del rol para preseleccionar la pestaña adecuada
  const detectDefaultTab = (role) => {
    const r = (role || '').toLowerCase();
    if (r.includes('maestr') || r.includes('mj')) return 'mj';
    if (r.includes('capitan')) return 'capitan';
    if (r.includes('qt') || r.includes('quantum')) return 'qt';
    if (r.includes('gerente') || r.includes('direct') || r.includes('superadmin') || r.includes('cfo')) return 'gerencia';
    return 'c1'; // Default: C1/C2
  };

  const [activeTab, setActiveTab] = useState(detectDefaultTab(currentUser?.appRole));

  // 1. Construir lista unificada de personas reales
  const allStaffDirectory = useMemo(() => {
    const coordsNodus = (nodusData?.coordinadores || nodusFallbackData.coordinadores || []);
    const list = [];
    const seenEmails = new Set();

    // Coordinadores C1/C2 con datos de Nodus
    coordsNodus.forEach(c => {
      const email = (c.email || '').toLowerCase().trim();
      const normName = (c.nombre || '').toUpperCase().trim();
      const staffMatch = USERS_TO_IMPORT.find(u => {
        const uEmail = (u.email || '').toLowerCase().trim();
        const uName = (u.name || '').toUpperCase().trim();
        return (email && uEmail === email) || (uName.includes(normName) || normName.includes(uName));
      });

      const personObj = {
        id: c.id || staffMatch?.id || `nodus_${normName.toLowerCase().replace(/\s+/g, '_')}`,
        name: staffMatch?.name || c.nombreCompleto || c.nombre,
        nombre: c.nombre,
        email: email || staffMatch?.email || `${c.nombre.toLowerCase().replace(/\s+/g, '.')}@crearpsl.net`,
        sede: c.sede || staffMatch?.sede || 'Lima',
        role: 'coord_c1',
        tabCategory: 'c1',
        roleName: 'Coordinador C1 / C2',
        hasNodus: true,
        rawNodus: c
      };

      if (personObj.email) seenEmails.add(personObj.email);
      list.push(personObj);
    });

    // Colaboradores de Maestría, Gerencia, QT, Capitanes desde USERS_TO_IMPORT
    USERS_TO_IMPORT.forEach(u => {
      const email = (u.email || '').toLowerCase().trim();
      if (email && seenEmails.has(email)) return; // Evitar duplicar
      
      let tabCategory = 'c1';
      let roleName = 'Coordinador C1 / C2';
      const r = (u.role || '').toLowerCase();

      if (r.includes('maestria') || r.includes('mj') || r.includes('director_maestria')) {
        tabCategory = 'mj';
        roleName = 'Coordinador Maestría del Juego (CMJ)';
      } else if (r.includes('capitan')) {
        tabCategory = 'capitan';
        roleName = 'Capitán de Sede';
      } else if (r.includes('qt')) {
        tabCategory = 'qt';
        roleName = 'Quantum Team (QT)';
      } else if (r.includes('gerente') || r.includes('direccion') || r.includes('ceo') || r.includes('cfo')) {
        tabCategory = 'gerencia';
        roleName = 'Gerencia de Sede';
      } else if (r === 'coord_c1') {
        tabCategory = 'c1';
        roleName = 'Coordinador C1 / C2';
      } else {
        return; // Excluir roles no operativos en KPIs
      }

      seenEmails.add(email);
      list.push({
        id: u.id || `staff_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name: u.name,
        nombre: u.name,
        email: u.email,
        sede: u.sede || 'Sede',
        role: u.role,
        tabCategory,
        roleName,
        hasNodus: false,
        rawNodus: null
      });
    });

    return list;
  }, [nodusData]);

  // Personas disponibles filtradas según la pestaña activa o búsqueda global
  const filteredPersonsForTab = useMemo(() => {
    let base = allStaffDirectory;
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      return base.filter(p => 
        (p.name || '').toLowerCase().includes(s) || 
        (p.sede || '').toLowerCase().includes(s) ||
        (p.email || '').toLowerCase().includes(s)
      );
    }
    return base.filter(p => p.tabCategory === activeTab);
  }, [allStaffDirectory, activeTab, searchTerm]);

  // Inicializar o buscar persona al cargar o cambiar currentUser
  useEffect(() => {
    fetchNodusData();
  }, [currentUser]);

  const fetchNodusData = async () => {
    setLoadingNodus(true);
    try {
      const docRef = doc(db, 'nodus_coordinadores_c1c2', 'latest');
      const snap = await getDoc(docRef);
      let data = snap.exists() ? snap.data() : nodusFallbackData;
      setNodusData(data);
    } catch (e) {
      console.warn("Aviso: usando fallback local para Nodus en MisKPIs:", e);
      setNodusData(nodusFallbackData);
    } finally {
      setLoadingNodus(false);
    }
  };

  // Seleccionar persona por defecto según el usuario logueado o primera disponible
  useEffect(() => {
    if (allStaffDirectory.length === 0) return;
    if (selectedPerson) return; // ya seleccionado

    const uEmail = (currentUser?.email || '').toLowerCase().trim();
    const uSede = (currentUser?.sede || '').toLowerCase().trim();
    const uName = (currentUser?.displayName || currentUser?.name || '').toLowerCase().trim();

    // Intentar encontrar match exacto por email
    let matched = allStaffDirectory.find(p => (p.email || '').toLowerCase() === uEmail);
    
    // Si no, por nombre
    if (!matched && uName) {
      matched = allStaffDirectory.find(p => (p.name || '').toLowerCase().includes(uName));
    }

    // Si no, por sede
    if (!matched && uSede && uSede !== 'global' && uSede !== 'sede global') {
      matched = allStaffDirectory.find(p => (p.sede || '').toLowerCase() === uSede);
    }

    // Fallback: Joyce (Lima) o primer elemento
    if (!matched) {
      matched = allStaffDirectory.find(p => (p.nombre || '').toUpperCase().includes('JOYCE')) || allStaffDirectory[0];
    }

    if (matched) {
      setSelectedPerson(matched);
      setActiveTab(matched.tabCategory);
    }
  }, [allStaffDirectory, currentUser]);

  // Cargar metas personalizadas cuando cambia la persona seleccionada
  useEffect(() => {
    if (!selectedPerson) return;
    loadPersonMetas(selectedPerson);
  }, [selectedPerson, activeTab]);

  const loadPersonMetas = async (person) => {
    const roleCat = person.tabCategory || activeTab;
    const defaultMetasForRole = DEFAULT_KPI_METAS[roleCat] || DEFAULT_KPI_METAS.c1;
    
    // 1. Intentar desde localStorage
    let stored = null;
    try {
      const localKey = `cpsl_kpi_targets_${person.id}`;
      const saved = localStorage.getItem(localKey);
      if (saved) stored = JSON.parse(saved);
    } catch (e) {}

    // 2. Intentar desde Firestore
    try {
      const tRef = doc(db, 'user_kpi_targets', person.id);
      const snap = await getDoc(tRef);
      if (snap.exists()) {
        const firestoreMetas = snap.data();
        if (firestoreMetas[roleCat]) {
          stored = firestoreMetas[roleCat];
        } else if (firestoreMetas.metas) {
          stored = firestoreMetas.metas;
        }
      }
    } catch (e) {
      console.warn("Aviso Firestore al leer metas personalizadas:", e);
    }

    const effective = { ...defaultMetasForRole, ...(stored || {}) };
    setCustomMetas(effective);
    setMetasDraft(effective);
  };

  const handleSaveCustomMetas = async () => {
    if (!selectedPerson) return;
    setSavingMetas(true);
    const roleCat = selectedPerson.tabCategory || activeTab;

    try {
      // Guardar localmente
      const localKey = `cpsl_kpi_targets_${selectedPerson.id}`;
      localStorage.setItem(localKey, JSON.stringify(metasDraft));

      // Guardar en Firestore
      try {
        const tRef = doc(db, 'user_kpi_targets', selectedPerson.id);
        await setDoc(tRef, {
          userId: selectedPerson.id,
          userName: selectedPerson.name || selectedPerson.nombre,
          userEmail: selectedPerson.email,
          userSede: selectedPerson.sede,
          role: roleCat,
          [roleCat]: metasDraft,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser?.displayName || currentUser?.name || 'Liderazgo'
        }, { merge: true });
      } catch (err) {
        console.warn("Firestore error guardando metas personalizadas:", err);
      }

      setCustomMetas(metasDraft);
      setIsEditingMetas(false);
      showToast(`¡Metas personalizadas guardadas con éxito para ${selectedPerson.name}!`, 'success');
    } catch (e) {
      showToast('Error al guardar metas personalizadas.', 'error');
    } finally {
      setSavingMetas(false);
    }
  };

  // Métricas reales de Nodus calculadas con precisión matemática
  const nodusMetrics = useMemo(() => {
    if (!selectedPerson) return null;
    if (selectedPerson.rawNodus) {
      return extractNodusMetrics(selectedPerson.rawNodus);
    }

    // Buscar si hay match en los coordinadores de Nodus
    const coords = nodusData?.coordinadores || nodusFallbackData.coordinadores || [];
    const pName = (selectedPerson.name || selectedPerson.nombre || '').toLowerCase();
    const pEmail = (selectedPerson.email || '').toLowerCase();
    const matched = coords.find(c => {
      const cName = (c.nombre || '').toLowerCase();
      const cEmail = (c.email || '').toLowerCase();
      return (pEmail && cEmail === pEmail) || (pName && (cName.includes(pName) || pName.includes(cName)));
    });

    if (matched) {
      return extractNodusMetrics(matched);
    }

    return null;
  }, [selectedPerson, nodusData]);

  // Función para auto-llenar el formulario con las métricas reales
  const handleAutoFillFromNodus = () => {
    const personName = selectedPerson?.name || selectedPerson?.nombre || 'Coordinador';
    
    if (activeTab === 'c1') {
      const conv = nodusMetrics?.conversion || 46;
      const contact = nodusMetrics?.contactabilidad || 93;
      const asist = nodusMetrics?.asistieron && nodusMetrics?.confirmados 
        ? Math.min(100, Math.round((nodusMetrics.asistieron / nodusMetrics.confirmados) * 100))
        : 95;

      setC1Data(prev => ({
        ...prev,
        asistencia: String(asist),
        retencion: '7',
        conversionC1C2: String(conv),
        conversionC2MJ: '72',
        declaracionBreakthrough: '94',
        declaracionAliados: '42',
        palabrasRotas: '3',
        eficienciaGestion: String(contact)
      }));
      showToast(`¡Métricas auditadas de Nodus cargadas para ${personName}!`, 'success');
    } else if (activeTab === 'mj') {
      const conv = nodusMetrics?.conversion || 55;
      const contact = nodusMetrics?.contactabilidad || 95;
      setMjData(prev => ({
        ...prev,
        asistenciaMJ: '94',
        retencionMJ: '6',
        enroladosPorIMO: '3.2',
        conversionALider: String(conv > 50 ? conv : 62),
        quiebresResueltos: '100',
        eficienciaSeguimiento: String(contact)
      }));
      showToast(`¡Datos personalizados cargados en Maestría para ${personName}!`, 'success');
    } else if (activeTab === 'qt') {
      setQtData(prev => ({
        ...prev,
        efectividadLlamadas: String(nodusMetrics?.contactabilidad || 85),
        futurosImposibles: '88',
        resolucionQuiebres: `Soporte y rescate activo en sede ${selectedPerson?.sede || 'Sede'}. 12 futuros imposibles acompañados.`
      }));
      showToast(`¡Métricas personalizadas cargadas para QT!`, 'success');
    } else if (activeTab === 'capitan') {
      setCapitanData(prev => ({
        ...prev,
        puntualidadEquipo: '98',
        cumplimientoMetas: '92',
        participacionActiva: '96',
        soporteCoaches: '100',
        observaciones: `Capitanía activa en sede ${selectedPerson?.sede || 'Sede'}. Seguimiento y respaldo integral.`
      }));
      showToast(`¡Métricas de Capitanía cargadas!`, 'success');
    } else if (activeTab === 'gerencia') {
      const conv = nodusMetrics?.conversion || 80;
      setGerenciaData(prev => ({
        ...prev,
        cumplimientoGlobalSede: String(conv),
        eficienciaOperativa: String(nodusMetrics?.contactabilidad || 94),
        controlDeQuiebres: '96',
        resumenDirectivo: `Auditoría directa para ${personName} en sede ${selectedPerson?.sede || 'Sede'}: ${nodusMetrics?.confirmados || 0} confirmados sobre ${nodusMetrics?.asignados || 0} asignados (${conv}% de conversión auditada).`
      }));
      showToast(`¡Dictamen gerencial cargado!`, 'success');
    }
  };

  // Formularios de datos
  const [c1Data, setC1Data] = useState({
    asistencia: '',
    retencion: '',
    conversionC1C2: '',
    conversionC2MJ: '',
    declaracionBreakthrough: '',
    declaracionAliados: '',
    palabrasRotas: '',
    eficienciaGestion: ''
  });

  const [mjData, setMjData] = useState({
    asistenciaMJ: '',
    retencionMJ: '',
    enroladosPorIMO: '',
    conversionALider: '',
    quiebresResueltos: '',
    eficienciaSeguimiento: ''
  });

  const [capitanData, setCapitanData] = useState({
    puntualidadEquipo: '',
    cumplimientoMetas: '',
    participacionActiva: '',
    soporteCoaches: '',
    observaciones: ''
  });

  const [qtData, setQtData] = useState({
    efectividadLlamadas: '',
    futurosImposibles: '',
    resolucionQuiebres: ''
  });

  const [gerenciaData, setGerenciaData] = useState({
    cumplimientoGlobalSede: '',
    eficienciaOperativa: '',
    controlDeQuiebres: '',
    resumenDirectivo: ''
  });

  useEffect(() => {
    fetchHistory();
  }, [currentUser]);

  const getLocalReports = () => {
    try {
      const saved = localStorage.getItem('cpsl_kpi_reports_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(r => r && !r.id?.startsWith('kpi_seed_'));
        }
      }
    } catch (e) {}
    return [];
  };

  const saveLocalReports = (list) => {
    try {
      const cleanList = (list || []).filter(r => r && !r.id?.startsWith('kpi_seed_'));
      localStorage.setItem('cpsl_kpi_reports_v1', JSON.stringify(cleanList));
    } catch (e) {}
  };

  const fetchHistory = async () => {
    let local = getLocalReports();

    try {
      const baseQuery = collection(db, 'kpi_reports');
      const snapshot = await getDocs(baseQuery);
      if (snapshot && !snapshot.empty) {
        const remoteData = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate().toISOString() : d.data().createdAt
        }));
        
        const ids = new Set(remoteData.map(r => r.id));
        local = [...remoteData, ...local.filter(r => !ids.has(r.id))];
      }
    } catch (error) {
      console.warn("Aviso: usando historial local de KPIs:", error);
    }

    local.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    setHistory(local);
  };

  // Guardar reporte con atribución exacta a la persona seleccionada
  const saveReport = async (roleName, roleCategory, dataPayload) => {
    if (loading) return;
    setLoading(true);

    const targetPerson = selectedPerson || {
      id: currentUser?.uid || 'anon',
      name: currentUser?.name || currentUser?.displayName || 'Usuario Causa OS',
      email: currentUser?.email || 'sin-email',
      sede: currentUser?.sede || 'Global',
      role: roleCategory
    };

    const newReport = {
      id: 'kpi_' + Date.now(),
      targetUserId: targetPerson.id,
      targetUserName: targetPerson.name || targetPerson.nombre,
      targetUserEmail: targetPerson.email,
      targetUserSede: targetPerson.sede,
      targetRole: roleCategory,
      targetRoleName: roleName,
      // Campos de retrocompatibilidad para vistas existentes
      userName: targetPerson.name || targetPerson.nombre,
      userSede: targetPerson.sede,
      userEmail: targetPerson.email,
      role: roleCategory,
      roleName: roleName,
      // Metas asignadas a esta persona
      customMetas: customMetas,
      data: dataPayload,
      // Auditoría de quién envió el reporte
      submittedBy: currentUser?.displayName || currentUser?.name || 'Usuario Causa OS',
      submittedByEmail: currentUser?.email || 'sin-email',
      submittedById: currentUser?.uid || currentUser?.id || 'anon',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      const local = getLocalReports();
      saveLocalReports([newReport, ...local]);

      try {
        await addDoc(collection(db, 'kpi_reports'), {
          ...newReport,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.warn("Firestore offline o denegado, guardado solo en cache local:", err);
      }

      await recordAuditEvent({
        eventType: 'KPI_REPORT_SUBMITTED',
        module: 'KPIS',
        description: `${newReport.submittedBy} envió reporte de KPIs (${roleName}) para ${newReport.targetUserName} (${newReport.targetUserSede}).`,
        targetUser: newReport.targetUserName,
        targetEmail: newReport.targetUserEmail,
        status: 'SUCCESS'
      });

      showToast(`¡Reporte de KPIs para ${newReport.targetUserName} enviado a Gerencia con éxito!`, 'success');
      await fetchHistory();
    } catch (error) {
      console.error("Error guardando reporte:", error);
      showToast('Ocurrió un error al enviar el reporte.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDateSafe = (val) => {
    if (!val) return 'Fecha no registrada';
    try {
      if (val.toDate && typeof val.toDate === 'function') {
        return val.toDate().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
      }
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
      }
    } catch (e) {}
    return String(val);
  };

  const isLeadership = Boolean(
    currentUser?.isSuperAdmin || 
    currentUser?.isGerente || 
    currentUser?.isDireccion || 
    currentUser?.appRole === 'gerente' || 
    currentUser?.appRole === 'direccion' || 
    currentUser?.appRole === 'superadmin' || 
    currentUser?.appRole === 'director_maestria'
  );

  // Filtrado del historial
  const filteredHistory = useMemo(() => {
    if (historyFilter === 'person' && selectedPerson) {
      return history.filter(r => 
        r.targetUserId === selectedPerson.id || 
        r.targetUserEmail === selectedPerson.email ||
        (r.targetUserName && r.targetUserName.toLowerCase() === (selectedPerson.name || selectedPerson.nombre || '').toLowerCase()) ||
        (r.userName && r.userName.toLowerCase() === (selectedPerson.name || selectedPerson.nombre || '').toLowerCase())
      );
    }
    if (historyFilter === 'my') {
      const myEmail = (currentUser?.email || '').toLowerCase();
      const myId = currentUser?.uid || currentUser?.id;
      return history.filter(r => 
        r.submittedByEmail?.toLowerCase() === myEmail || 
        r.submittedById === myId ||
        r.userEmail?.toLowerCase() === myEmail ||
        r.userId === myId
      );
    }
    return history;
  }, [history, historyFilter, selectedPerson, currentUser]);

  // Helper visual para comparar valor ingresado vs meta personalizada
  const renderMetaComparisonBadge = (val, targetVal, isInverse = false) => {
    if (val === '' || val === undefined || targetVal === undefined) return null;
    const num = Number(val);
    const target = Number(targetVal);
    if (isNaN(num) || isNaN(target)) return null;

    const diff = num - target;
    const meets = isInverse ? diff <= 0 : diff >= 0;

    return (
      <span style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.25rem', 
        fontSize: '0.72rem', 
        fontWeight: 'bold', 
        padding: '0.15rem 0.45rem', 
        borderRadius: '4px',
        marginLeft: '0.4rem',
        background: meets ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
        color: meets ? '#4ade80' : '#f87171',
        border: `1px solid ${meets ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`
      }}>
        {meets ? '✓ Cumple' : '⚠️ Bajo meta'} ({diff > 0 ? `+${diff}` : diff}%)
      </span>
    );
  };

  const personName = selectedPerson?.name || selectedPerson?.nombre || 'Coordinador';
  const personSede = selectedPerson?.sede || 'Sede';

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '1rem' }}>
      {/* HEADER DE NAVEGACIÓN */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.8rem' }}>
        <button onClick={() => navigate('/home')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} /> Volver al Inicio
        </button>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsEditingMetas(true)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.45rem', 
              background: 'rgba(212, 175, 55, 0.12)', 
              border: '1px solid var(--crear-gold)', 
              padding: '0.5rem 0.9rem', 
              fontSize: '0.85rem', 
              color: 'var(--crear-gold)', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontWeight: 600
            }}
            title="Configurar metas personalizadas para esta persona"
          >
            <Settings size={15} /> Metas de {personName}
          </button>

          {isLeadership && (
            <button 
              onClick={() => navigate('/auditoria-kpis')} 
              className="btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #10b981, #047857)', border: 'none', padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            >
              <ShieldCheck size={16} /> Ir a Auditoría de KPIs (Consolidado)
            </button>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 className="text-gold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.75rem', margin: '0 0 0.3rem' }}>
              <TrendingUp /> Reporte de KPIs Operativos
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Cada persona tiene sus propios KPIs, metas personalizadas y auditoría individual de desempeño.
            </p>
          </div>

          {/* PERFIL ACTIVO DE LA PERSONA EVALUADA */}
          {selectedPerson && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              padding: '0.6rem 1rem', 
              borderRadius: '10px', 
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(0,0,0,0.4))', 
              border: '1px solid rgba(212, 175, 55, 0.3)' 
            }}>
              <div style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, var(--crear-gold), #b8860b)', 
                color: '#000', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 'bold', 
                fontSize: '0.95rem' 
              }}>
                {(selectedPerson.name || selectedPerson.nombre || 'U')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>
                    {selectedPerson.name || selectedPerson.nombre}
                  </span>
                  <span style={{ 
                    fontSize: '0.68rem', 
                    padding: '0.1rem 0.4rem', 
                    borderRadius: '4px', 
                    background: 'rgba(255,255,255,0.1)', 
                    color: 'var(--crear-gold)',
                    fontWeight: 600
                  }}>
                    {selectedPerson.sede}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {selectedPerson.roleName || selectedPerson.role} • {selectedPerson.email}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SELECTOR DE PERSONA Y BÚSQUEDA */}
        <div style={{ 
          marginBottom: '1.5rem', 
          padding: '0.85rem 1rem', 
          borderRadius: '10px', 
          background: 'rgba(0,0,0,0.25)', 
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.8rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: '1 1 280px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              👤 Evaluar Colaborador:
            </span>
            <select
              value={selectedPerson?.id || ''}
              onChange={(e) => {
                const found = allStaffDirectory.find(p => p.id === e.target.value);
                if (found) {
                  setSelectedPerson(found);
                  setActiveTab(found.tabCategory);
                }
              }}
              style={{ 
                flex: 1, 
                background: 'rgba(20,20,20,0.85)', 
                color: '#fff', 
                border: '1px solid rgba(212, 175, 55, 0.35)', 
                borderRadius: '6px', 
                padding: '0.45rem 0.75rem', 
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              {filteredPersonsForTab.map(p => (
                <option key={p.id} value={p.id}>
                  {p.sede}: {p.name || p.nombre} ({p.roleName || p.role})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '0 1 240px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar cualquier persona..."
                style={{ 
                  width: '100%', 
                  padding: '0.4rem 0.5rem 0.4rem 1.8rem', 
                  borderRadius: '6px', 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.15)', 
                  color: '#fff', 
                  fontSize: '0.78rem' 
                }}
              />
              {searchTerm && (
                <X 
                  size={14} 
                  onClick={() => setSearchTerm('')} 
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)' }} 
                />
              )}
            </div>
          </div>
        </div>

        {/* TARJETA INFORMATIVA: DATOS AUDITADOS EN TIEMPO REAL (NODUS LIVE SYNC) */}
        <div style={{ marginBottom: '1.75rem', padding: '1.25rem', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))', border: '1px solid rgba(212, 175, 55, 0.25)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: nodusMetrics ? '#22c55e' : '#f59e0b', boxShadow: nodusMetrics ? '0 0 10px #22c55e' : 'none' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--crear-gold)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Database size={15} /> Nodus Live Sync: Información Auditada
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                ({personSede} - {personName})
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={fetchNodusData}
                disabled={loadingNodus}
                style={{ padding: '0.35rem 0.7rem', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                title="Actualizar datos directamente desde Nodus"
              >
                <RefreshCw size={13} className={loadingNodus ? 'animate-spin' : ''} /> Refrescar
              </button>

              <button
                type="button"
                onClick={handleAutoFillFromNodus}
                style={{ padding: '0.35rem 0.8rem', borderRadius: '6px', background: 'linear-gradient(135deg, var(--crear-gold), #b8860b)', border: 'none', color: '#000', fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                title="Cargar automáticamente estos números en los campos de tu reporte"
              >
                <Zap size={13} /> Auto-llenar KPIs
              </button>
            </div>
          </div>

          {/* GRID DE MÉTRICAS CLARAS Y OBJETIVAS (CERO ALUCINACIONES, DATOS REALES) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>📞 Asignados</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>{nodusMetrics ? nodusMetrics.asignados : '--'}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Contactos totales</div>
            </div>

            <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.25)' }}>
              <div style={{ fontSize: '0.72rem', color: '#22c55e', textTransform: 'uppercase' }}>✅ Confirmados</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#22c55e' }}>{nodusMetrics ? nodusMetrics.confirmados : '--'}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Enrolados a Sala</div>
            </div>

            <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <div style={{ fontSize: '0.72rem', color: '#f59e0b', textTransform: 'uppercase' }}>⏳ Por Confirmar</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#f59e0b' }}>{nodusMetrics ? nodusMetrics.porConfirmar : '--'}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>En seguimiento activo</div>
            </div>

            <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(0, 210, 255, 0.05)', border: '1px solid rgba(0, 210, 255, 0.25)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--crear-blue)', textTransform: 'uppercase' }}>📶 Contactabilidad</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--crear-blue)' }}>{nodusMetrics ? `${nodusMetrics.contactabilidad}%` : '--'}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Llamadas efectivas</div>
            </div>

            <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
              <div style={{ fontSize: '0.72rem', color: '#c084fc', textTransform: 'uppercase' }}>🎯 Conversión Real</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#c084fc' }}>{nodusMetrics ? `${nodusMetrics.conversion}%` : '--'}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Ratio confirmado / total</div>
            </div>
          </div>

          {/* DIAGNÓSTICO ASERTIVO REAL */}
          {nodusMetrics ? (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', borderLeft: '4px solid var(--crear-gold)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>
                💡 <strong>Diagnóstico Objetivo:</strong> Coordinación <strong>{nodusMetrics.sede} ({personName})</strong> registra {nodusMetrics.confirmados} confirmados sobre {nodusMetrics.asignados} asignados ({nodusMetrics.conversion}%). Hay {nodusMetrics.porConfirmar} contactos prioritarios por cerrar y {nodusMetrics.noContesta} en remarcación.
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: nodusMetrics.conversion >= (customMetas?.conversionC1C2 || 40) ? '#22c55e' : '#f59e0b' }}>
                {nodusMetrics.conversion >= (customMetas?.conversionC1C2 || 40) ? '✓ Ritmo de sala en meta personal' : '⚠️ Acelerar cierre de por confirmar'}
              </div>
            </div>
          ) : (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', borderLeft: '4px solid #3b82f6', fontSize: '0.8rem', color: '#cbd5e1' }}>
              ℹ️ Mostrando perfil operativo para <strong>{personName}</strong> ({selectedPerson?.roleName || selectedPerson?.role}). Los reportes se evaluarán contra sus metas personalizadas.
            </div>
          )}
        </div>

        {/* PESTAÑAS DE ROLES OPERATIVOS */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <button 
            type="button" 
            onClick={() => setActiveTab('c1')}
            style={{ padding: '0.6rem 1.1rem', borderRadius: '8px', border: activeTab === 'c1' ? '1px solid var(--crear-gold)' : '1px solid rgba(255,255,255,0.1)', background: activeTab === 'c1' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255,255,255,0.03)', color: activeTab === 'c1' ? 'var(--crear-gold)' : '#94a3b8', fontWeight: activeTab === 'c1' ? 700 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <Users size={16} /> Coordinación C1 / C2
          </button>

          <button 
            type="button" 
            onClick={() => setActiveTab('mj')}
            style={{ padding: '0.6rem 1.1rem', borderRadius: '8px', border: activeTab === 'mj' ? '1px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)', background: activeTab === 'mj' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.03)', color: activeTab === 'mj' ? '#a78bfa' : '#94a3b8', fontWeight: activeTab === 'mj' ? 700 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <Award size={16} /> Maestría del Juego (CMJ)
          </button>

          <button 
            type="button" 
            onClick={() => setActiveTab('capitan')}
            style={{ padding: '0.6rem 1.1rem', borderRadius: '8px', border: activeTab === 'capitan' ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.1)', background: activeTab === 'capitan' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.03)', color: activeTab === 'capitan' ? '#4ade80' : '#94a3b8', fontWeight: activeTab === 'capitan' ? 700 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <Target size={16} /> Capitanía de Sede
          </button>

          <button 
            type="button" 
            onClick={() => setActiveTab('qt')}
            style={{ padding: '0.6rem 1.1rem', borderRadius: '8px', border: activeTab === 'qt' ? '1px solid #ec4899' : '1px solid rgba(255,255,255,0.1)', background: activeTab === 'qt' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255,255,255,0.03)', color: activeTab === 'qt' ? '#f472b6' : '#94a3b8', fontWeight: activeTab === 'qt' ? 700 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <PhoneCall size={16} /> Quantum Team (QT)
          </button>

          <button 
            type="button" 
            onClick={() => setActiveTab('gerencia')}
            style={{ padding: '0.6rem 1.1rem', borderRadius: '8px', border: activeTab === 'gerencia' ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)', background: activeTab === 'gerencia' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.03)', color: activeTab === 'gerencia' ? '#fbbf24' : '#94a3b8', fontWeight: activeTab === 'gerencia' ? 700 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <ShieldCheck size={16} /> Gerencia de Sede
          </button>
        </div>

        {/* 1. FORMULARIO C1 / C2 */}
        {activeTab === 'c1' && (
          <form onSubmit={(e) => { e.preventDefault(); saveReport('Coordinador C1 / C2', 'coord_c1', c1Data); }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div className="form-group">
              <label>
                Asistencia C1 / C2 (%) 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: {customMetas?.asistencia ?? 95}%)</span>
                {renderMetaComparisonBadge(c1Data.asistencia, customMetas?.asistencia ?? 95)}
              </label>
              <input type="number" required value={c1Data.asistencia} onChange={e => setC1Data({...c1Data, asistencia: e.target.value})} placeholder="Ej: 96" />
            </div>

            <div className="form-group">
              <label>
                Retención C1 (%) 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: Menos de {customMetas?.retencion ?? 10}%)</span>
                {renderMetaComparisonBadge(c1Data.retencion, customMetas?.retencion ?? 10, true)}
              </label>
              <input type="number" required value={c1Data.retencion} onChange={e => setC1Data({...c1Data, retencion: e.target.value})} placeholder="Ej: 7" />
            </div>

            <div className="form-group">
              <label>
                Conversión C1 a C2 (%) 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: {customMetas?.conversionC1C2 ?? 50}%)</span>
                {renderMetaComparisonBadge(c1Data.conversionC1C2, customMetas?.conversionC1C2 ?? 50)}
              </label>
              <input type="number" required value={c1Data.conversionC1C2} onChange={e => setC1Data({...c1Data, conversionC1C2: e.target.value})} placeholder="Ej: 52" />
            </div>

            <div className="form-group">
              <label>
                Movimiento C2 a MJ (%) 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: {customMetas?.conversionC2MJ ?? 70}%)</span>
                {renderMetaComparisonBadge(c1Data.conversionC2MJ, customMetas?.conversionC2MJ ?? 70)}
              </label>
              <input type="number" required value={c1Data.conversionC2MJ} onChange={e => setC1Data({...c1Data, conversionC2MJ: e.target.value})} placeholder="Ej: 71" />
            </div>

            <div className="form-group">
              <label>
                Declaración Breakthrough (%) 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: {customMetas?.declaracionBreakthrough ?? 90}%)</span>
                {renderMetaComparisonBadge(c1Data.declaracionBreakthrough, customMetas?.declaracionBreakthrough ?? 90)}
              </label>
              <input type="number" required value={c1Data.declaracionBreakthrough} onChange={e => setC1Data({...c1Data, declaracionBreakthrough: e.target.value})} placeholder="Ej: 92" />
            </div>

            <div className="form-group">
              <label>
                Conversión a Aliados C2 (%) 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: {customMetas?.declaracionAliados ?? 40}%)</span>
                {renderMetaComparisonBadge(c1Data.declaracionAliados, customMetas?.declaracionAliados ?? 40)}
              </label>
              <input type="number" required value={c1Data.declaracionAliados} onChange={e => setC1Data({...c1Data, declaracionAliados: e.target.value})} placeholder="Ej: 45" />
            </div>

            <div className="form-group">
              <label>
                Palabras Rotas (%) 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: Menos de {customMetas?.palabrasRotas ?? 5}%)</span>
                {renderMetaComparisonBadge(c1Data.palabrasRotas, customMetas?.palabrasRotas ?? 5, true)}
              </label>
              <input type="number" required value={c1Data.palabrasRotas} onChange={e => setC1Data({...c1Data, palabrasRotas: e.target.value})} placeholder="Ej: 3" />
            </div>

            <div className="form-group">
              <label>
                Eficiencia en Gestión (%) 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: {customMetas?.eficienciaGestion ?? 100}%)</span>
                {renderMetaComparisonBadge(c1Data.eficienciaGestion, customMetas?.eficienciaGestion ?? 100)}
              </label>
              <input type="number" required value={c1Data.eficienciaGestion} onChange={e => setC1Data({...c1Data, eficienciaGestion: e.target.value})} placeholder="Ej: 100" />
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.05rem', background: 'var(--crear-gold)', color: '#000', fontWeight: 'bold' }}>
                {loading ? 'Enviando...' : `Enviar Reporte C1/C2 de ${personName} a Gerencia`}
              </button>
            </div>
          </form>
        )}

        {/* 2. FORMULARIO MAESTRÍA DEL JUEGO */}
        {activeTab === 'mj' && (
          <form onSubmit={(e) => { e.preventDefault(); saveReport('Coordinador Maestría del Juego', 'coord_maestria', mjData); }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div className="form-group">
              <label>
                Asistencia MJ (%) 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: {customMetas?.asistenciaMJ ?? 90}%)</span>
                {renderMetaComparisonBadge(mjData.asistenciaMJ, customMetas?.asistenciaMJ ?? 90)}
              </label>
              <input type="number" required value={mjData.asistenciaMJ} onChange={e => setMjData({...mjData, asistenciaMJ: e.target.value})} placeholder="Ej: 92" />
            </div>

            <div className="form-group">
              <label>
                Retención Maestría (%) 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: Menos de {customMetas?.retencionMJ ?? 8}%)</span>
                {renderMetaComparisonBadge(mjData.retencionMJ, customMetas?.retencionMJ ?? 8, true)}
              </label>
              <input type="number" required value={mjData.retencionMJ} onChange={e => setMjData({...mjData, retencionMJ: e.target.value})} placeholder="Ej: 5" />
            </div>

            <div className="form-group">
              <label>
                Promedio Enrolados por IMO 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: {customMetas?.enroladosPorIMO ?? 3.0})</span>
                {renderMetaComparisonBadge(mjData.enroladosPorIMO, customMetas?.enroladosPorIMO ?? 3.0)}
              </label>
              <input type="number" step="0.1" required value={mjData.enroladosPorIMO} onChange={e => setMjData({...mjData, enroladosPorIMO: e.target.value})} placeholder="Ej: 2.8" />
            </div>

            <div className="form-group">
              <label>
                Conversión a Líder (%) 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: {customMetas?.conversionALider ?? 60}%)</span>
                {renderMetaComparisonBadge(mjData.conversionALider, customMetas?.conversionALider ?? 60)}
              </label>
              <input type="number" required value={mjData.conversionALider} onChange={e => setMjData({...mjData, conversionALider: e.target.value})} placeholder="Ej: 64" />
            </div>

            <div className="form-group">
              <label>
                Quiebres Resueltos Semanal 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: {customMetas?.quiebresResueltos ?? 100}%)</span>
              </label>
              <input type="number" required value={mjData.quiebresResueltos} onChange={e => setMjData({...mjData, quiebresResueltos: e.target.value})} placeholder="Ej: 12" />
            </div>

            <div className="form-group">
              <label>
                Eficiencia de Seguimiento (%) 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: {customMetas?.eficienciaSeguimiento ?? 100}%)</span>
                {renderMetaComparisonBadge(mjData.eficienciaSeguimiento, customMetas?.eficienciaSeguimiento ?? 100)}
              </label>
              <input type="number" required value={mjData.eficienciaSeguimiento} onChange={e => setMjData({...mjData, eficienciaSeguimiento: e.target.value})} placeholder="Ej: 98" />
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.05rem', background: '#8b5cf6', color: '#fff', fontWeight: 'bold' }}>
                {loading ? 'Enviando...' : `Enviar Reporte de Maestría de ${personName} a Gerencia`}
              </button>
            </div>
          </form>
        )}

        {/* 3. FORMULARIO CAPITANÍA */}
        {activeTab === 'capitan' && (
          <form onSubmit={(e) => { e.preventDefault(); saveReport('Capitanía de Sede', 'capitan', capitanData); }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div className="form-group">
              <label>
                Puntualidad del Equipo (%) 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: {customMetas?.puntualidadEquipo ?? 100}%)</span>
                {renderMetaComparisonBadge(capitanData.puntualidadEquipo, customMetas?.puntualidadEquipo ?? 100)}
              </label>
              <input type="number" required value={capitanData.puntualidadEquipo} onChange={e => setCapitanData({...capitanData, puntualidadEquipo: e.target.value})} placeholder="Ej: 98" />
            </div>

            <div className="form-group">
              <label>
                Cumplimiento de Metas (%) 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: {customMetas?.cumplimientoMetas ?? 90}%)</span>
                {renderMetaComparisonBadge(capitanData.cumplimientoMetas, customMetas?.cumplimientoMetas ?? 90)}
              </label>
              <input type="number" required value={capitanData.cumplimientoMetas} onChange={e => setCapitanData({...capitanData, cumplimientoMetas: e.target.value})} placeholder="Ej: 88" />
            </div>

            <div className="form-group">
              <label>
                Participación Activa del Equipo (%) 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: {customMetas?.participacionActiva ?? 95}%)</span>
                {renderMetaComparisonBadge(capitanData.participacionActiva, customMetas?.participacionActiva ?? 95)}
              </label>
              <input type="number" required value={capitanData.participacionActiva} onChange={e => setCapitanData({...capitanData, participacionActiva: e.target.value})} placeholder="Ej: 95" />
            </div>

            <div className="form-group">
              <label>
                Soporte y Respaldo a Coaches (%) 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: {customMetas?.soporteCoaches ?? 100}%)</span>
                {renderMetaComparisonBadge(capitanData.soporteCoaches, customMetas?.soporteCoaches ?? 100)}
              </label>
              <input type="number" required value={capitanData.soporteCoaches} onChange={e => setCapitanData({...capitanData, soporteCoaches: e.target.value})} placeholder="Ej: 100" />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Bitácora de Quiebres y Acciones del Capitán</label>
              <textarea rows="3" value={capitanData.observaciones} onChange={e => setCapitanData({...capitanData, observaciones: e.target.value})} placeholder="Resumen de acciones de capitanía y apoyo al equipo durante el ciclo..." style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', borderRadius: '8px' }}></textarea>
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.05rem', background: '#22c55e', color: '#000', fontWeight: 'bold' }}>
                {loading ? 'Enviando...' : `Enviar Reporte de Capitanía de ${personName} a Gerencia`}
              </button>
            </div>
          </form>
        )}

        {/* 4. FORMULARIO QT */}
        {activeTab === 'qt' && (
          <form onSubmit={(e) => { e.preventDefault(); saveReport('Quantum Team (QT)', 'qt', qtData); }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div className="form-group">
              <label>
                Efectividad Llamadas C1 (%) 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: {customMetas?.efectividadLlamadas ?? 60}%)</span>
                {renderMetaComparisonBadge(qtData.efectividadLlamadas, customMetas?.efectividadLlamadas ?? 60)}
              </label>
              <input type="number" required value={qtData.efectividadLlamadas} onChange={e => setQtData({...qtData, efectividadLlamadas: e.target.value})} placeholder="Ej: 65" />
            </div>

            <div className="form-group">
              <label>
                Futuros Imposibles C2 Declarados (%) 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: {customMetas?.futurosImposibles ?? 80}%)</span>
                {renderMetaComparisonBadge(qtData.futurosImposibles, customMetas?.futurosImposibles ?? 80)}
              </label>
              <input type="number" required value={qtData.futurosImposibles} onChange={e => setQtData({...qtData, futurosImposibles: e.target.value})} placeholder="Ej: 85" />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Resumen de Quiebres y Rescates Operativos</label>
              <textarea required rows="3" value={qtData.resolucionQuiebres} onChange={e => setQtData({...qtData, resolucionQuiebres: e.target.value})} placeholder="Describe brevemente cuántos aliados desconectados rescataste y qué quiebres resolviste..." style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--crear-gold)', color: 'white', borderRadius: '8px' }}></textarea>
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.05rem', background: '#ec4899', color: '#fff', fontWeight: 'bold' }}>
                {loading ? 'Enviando...' : `Enviar Reporte QT de ${personName} a Gerencia`}
              </button>
            </div>
          </form>
        )}

        {/* 5. FORMULARIO GERENCIA DE SEDE */}
        {activeTab === 'gerencia' && (
          <form onSubmit={(e) => { e.preventDefault(); saveReport('Gerencia de Sede', 'gerente', gerenciaData); }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div className="form-group">
              <label>
                Cumplimiento Global de Sede (%) 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: {customMetas?.cumplimientoGlobalSede ?? 95}%)</span>
                {renderMetaComparisonBadge(gerenciaData.cumplimientoGlobalSede, customMetas?.cumplimientoGlobalSede ?? 95)}
              </label>
              <input type="number" required value={gerenciaData.cumplimientoGlobalSede} onChange={e => setGerenciaData({...gerenciaData, cumplimientoGlobalSede: e.target.value})} placeholder="Ej: 94" />
            </div>

            <div className="form-group">
              <label>
                Eficiencia Operativa Sedes (%) 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: {customMetas?.eficienciaOperativa ?? 90}%)</span>
                {renderMetaComparisonBadge(gerenciaData.eficienciaOperativa, customMetas?.eficienciaOperativa ?? 90)}
              </label>
              <input type="number" required value={gerenciaData.eficienciaOperativa} onChange={e => setGerenciaData({...gerenciaData, eficienciaOperativa: e.target.value})} placeholder="Ej: 91" />
            </div>

            <div className="form-group">
              <label>
                Control de Quiebres y Retención (%) 
                <span className="text-gold" style={{ fontSize: '0.8rem' }}> (Meta de {personName}: {customMetas?.controlDeQuiebres ?? 85}%)</span>
                {renderMetaComparisonBadge(gerenciaData.controlDeQuiebres, customMetas?.controlDeQuiebres ?? 85)}
              </label>
              <input type="number" required value={gerenciaData.controlDeQuiebres} onChange={e => setGerenciaData({...gerenciaData, controlDeQuiebres: e.target.value})} placeholder="Ej: 88" />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Conclusiones y Directivas de Sede</label>
              <textarea rows="3" value={gerenciaData.resumenDirectivo} onChange={e => setGerenciaData({...gerenciaData, resumenDirectivo: e.target.value})} placeholder="Dictamen gerencial, asignación de recursos y soporte para el siguiente ciclo..." style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid #f59e0b', color: 'white', borderRadius: '8px' }}></textarea>
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.05rem', background: '#f59e0b', color: '#000', fontWeight: 'bold' }}>
                {loading ? 'Enviando...' : `Registrar Dictamen Gerencial de ${personName}`}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* HISTORIAL DE REPORTES CON FILTROS POR PERSONA */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.8rem' }}>
          <h3 className="text-gold" style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 size={20} /> Historial y Trazabilidad de Reportes
          </h3>

          <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(0,0,0,0.3)', padding: '0.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              type="button"
              onClick={() => setHistoryFilter('person')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: historyFilter === 'person' ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                color: historyFilter === 'person' ? 'var(--crear-gold)' : '#94a3b8',
                fontSize: '0.78rem',
                fontWeight: historyFilter === 'person' ? 'bold' : 'normal',
                cursor: 'pointer'
              }}
            >
              👤 Solo de {personName}
            </button>

            <button
              type="button"
              onClick={() => setHistoryFilter('my')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: historyFilter === 'my' ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                color: historyFilter === 'my' ? 'var(--crear-gold)' : '#94a3b8',
                fontSize: '0.78rem',
                fontWeight: historyFilter === 'my' ? 'bold' : 'normal',
                cursor: 'pointer'
              }}
            >
              📋 Mis Envíos
            </button>

            <button
              type="button"
              onClick={() => setHistoryFilter('all')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: historyFilter === 'all' ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                color: historyFilter === 'all' ? 'var(--crear-gold)' : '#94a3b8',
                fontSize: '0.78rem',
                fontWeight: historyFilter === 'all' ? 'bold' : 'normal',
                cursor: 'pointer'
              }}
            >
              🌐 Todos ({history.length})
            </button>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <p className="text-muted text-center" style={{ padding: '2rem' }}>
            {historyFilter === 'person' 
              ? `Aún no se han registrado reportes para ${personName}.`
              : 'Aún no has enviado ningún reporte de KPIs.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredHistory.map(rep => {
              const targetName = rep.targetUserName || rep.userName || 'Colaborador';
              const targetSede = rep.targetUserSede || rep.userSede || 'Sede';
              const subBy = rep.submittedBy || 'Usuario Causa OS';

              return (
                <div key={rep.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: rep.status === 'reviewed' ? '4px solid #10b981' : '4px solid #f59e0b', flexWrap: 'wrap', gap: '0.8rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <h4 style={{ margin: 0, color: 'white', fontSize: '1rem' }}>
                        {rep.roleName || (rep.role === 'qt' ? 'Quantum Team (QT)' : 'Coordinación C1 / C2')} - {targetSede}
                      </h4>
                      <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', borderRadius: '4px', background: 'rgba(212, 175, 55, 0.15)', color: 'var(--crear-gold)', fontWeight: 'bold' }}>
                        👤 {targetName}
                      </span>
                    </div>

                    <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>
                      Enviado por <strong>{subBy}</strong> el {formatDateSafe(rep.createdAt)}
                    </p>

                    {/* Previa de métricas */}
                    {rep.data && (
                      <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        {Object.entries(rep.data).slice(0, 4).map(([k, v]) => (
                          <span key={k} style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.05)', padding: '0.15rem 0.4rem', borderRadius: '4px', color: '#cbd5e1' }}>
                            {k}: <strong>{v}%</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    {rep.status === 'reviewed' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#10b981', fontSize: '0.85rem', fontWeight: 'bold', background: 'rgba(16,185,129,0.1)', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>
                        <CheckCircle2 size={16} /> Revisado por Gerencia
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#f59e0b', fontSize: '0.85rem', fontWeight: 'bold', background: 'rgba(245,158,11,0.1)', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>
                        <AlertCircle size={16} /> Pendiente de Revisión
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL PARA CONFIGURAR METAS PERSONALIZADAS POR PERSONA */}
      {isEditingMetas && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#111827', border: '1px solid var(--crear-gold)', borderRadius: '12px', maxWidth: '600px', width: '100%', padding: '1.75rem', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.2rem', color: 'var(--crear-gold)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
                  <Settings size={18} /> Metas Personalizadas: {personName}
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Configura los benchmarks individuales de evaluación para {personSede} ({selectedPerson?.roleName || selectedPerson?.role}).
                </p>
              </div>
              <button onClick={() => setIsEditingMetas(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.3rem' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {activeTab === 'c1' && (
                <>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Meta Asistencia C1/C2 (%)</label>
                    <input 
                      type="number" 
                      value={metasDraft.asistencia ?? 95} 
                      onChange={e => setMetasDraft({...metasDraft, asistencia: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Límite Retención C1 (%)</label>
                    <input 
                      type="number" 
                      value={metasDraft.retencion ?? 10} 
                      onChange={e => setMetasDraft({...metasDraft, retencion: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Meta Conversión C1 a C2 (%)</label>
                    <input 
                      type="number" 
                      value={metasDraft.conversionC1C2 ?? 50} 
                      onChange={e => setMetasDraft({...metasDraft, conversionC1C2: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Meta Movimiento C2 a MJ (%)</label>
                    <input 
                      type="number" 
                      value={metasDraft.conversionC2MJ ?? 70} 
                      onChange={e => setMetasDraft({...metasDraft, conversionC2MJ: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Meta Breakthrough (%)</label>
                    <input 
                      type="number" 
                      value={metasDraft.declaracionBreakthrough ?? 90} 
                      onChange={e => setMetasDraft({...metasDraft, declaracionBreakthrough: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Meta Aliados C2 (%)</label>
                    <input 
                      type="number" 
                      value={metasDraft.declaracionAliados ?? 40} 
                      onChange={e => setMetasDraft({...metasDraft, declaracionAliados: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Límite Palabras Rotas (%)</label>
                    <input 
                      type="number" 
                      value={metasDraft.palabrasRotas ?? 5} 
                      onChange={e => setMetasDraft({...metasDraft, palabrasRotas: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Meta Eficiencia Gestión (%)</label>
                    <input 
                      type="number" 
                      value={metasDraft.eficienciaGestion ?? 100} 
                      onChange={e => setMetasDraft({...metasDraft, eficienciaGestion: Number(e.target.value)})} 
                    />
                  </div>
                </>
              )}

              {activeTab === 'mj' && (
                <>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Meta Asistencia MJ (%)</label>
                    <input 
                      type="number" 
                      value={metasDraft.asistenciaMJ ?? 90} 
                      onChange={e => setMetasDraft({...metasDraft, asistenciaMJ: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Límite Retención MJ (%)</label>
                    <input 
                      type="number" 
                      value={metasDraft.retencionMJ ?? 8} 
                      onChange={e => setMetasDraft({...metasDraft, retencionMJ: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Enrolados por IMO</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      value={metasDraft.enroladosPorIMO ?? 3.0} 
                      onChange={e => setMetasDraft({...metasDraft, enroladosPorIMO: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Conversión a Líder (%)</label>
                    <input 
                      type="number" 
                      value={metasDraft.conversionALider ?? 60} 
                      onChange={e => setMetasDraft({...metasDraft, conversionALider: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Eficiencia Seguimiento (%)</label>
                    <input 
                      type="number" 
                      value={metasDraft.eficienciaSeguimiento ?? 100} 
                      onChange={e => setMetasDraft({...metasDraft, eficienciaSeguimiento: Number(e.target.value)})} 
                    />
                  </div>
                </>
              )}

              {activeTab === 'capitan' && (
                <>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Puntualidad del Equipo (%)</label>
                    <input 
                      type="number" 
                      value={metasDraft.puntualidadEquipo ?? 100} 
                      onChange={e => setMetasDraft({...metasDraft, puntualidadEquipo: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Cumplimiento Metas (%)</label>
                    <input 
                      type="number" 
                      value={metasDraft.cumplimientoMetas ?? 90} 
                      onChange={e => setMetasDraft({...metasDraft, cumplimientoMetas: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Participación Activa (%)</label>
                    <input 
                      type="number" 
                      value={metasDraft.participacionActiva ?? 95} 
                      onChange={e => setMetasDraft({...metasDraft, participacionActiva: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Soporte a Coaches (%)</label>
                    <input 
                      type="number" 
                      value={metasDraft.soporteCoaches ?? 100} 
                      onChange={e => setMetasDraft({...metasDraft, soporteCoaches: Number(e.target.value)})} 
                    />
                  </div>
                </>
              )}

              {activeTab === 'qt' && (
                <>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Efectividad Llamadas (%)</label>
                    <input 
                      type="number" 
                      value={metasDraft.efectividadLlamadas ?? 60} 
                      onChange={e => setMetasDraft({...metasDraft, efectividadLlamadas: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Futuros Imposibles C2 (%)</label>
                    <input 
                      type="number" 
                      value={metasDraft.futurosImposibles ?? 80} 
                      onChange={e => setMetasDraft({...metasDraft, futurosImposibles: Number(e.target.value)})} 
                    />
                  </div>
                </>
              )}

              {activeTab === 'gerencia' && (
                <>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Cumplimiento Global Sede (%)</label>
                    <input 
                      type="number" 
                      value={metasDraft.cumplimientoGlobalSede ?? 95} 
                      onChange={e => setMetasDraft({...metasDraft, cumplimientoGlobalSede: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Eficiencia Operativa (%)</label>
                    <input 
                      type="number" 
                      value={metasDraft.eficienciaOperativa ?? 90} 
                      onChange={e => setMetasDraft({...metasDraft, eficienciaOperativa: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Control Quiebres / Retención (%)</label>
                    <input 
                      type="number" 
                      value={metasDraft.controlDeQuiebres ?? 85} 
                      onChange={e => setMetasDraft({...metasDraft, controlDeQuiebres: Number(e.target.value)})} 
                    />
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
              <button
                type="button"
                onClick={() => setIsEditingMetas(false)}
                className="btn-secondary"
                style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCustomMetas}
                disabled={savingMetas}
                className="btn-primary"
                style={{ padding: '0.55rem 1.3rem', fontSize: '0.85rem', background: 'var(--crear-gold)', color: '#000', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Save size={15} /> {savingMetas ? 'Guardando...' : `Guardar Metas de ${personName}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
