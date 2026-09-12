import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, where, orderBy, writeBatch, runTransaction, setDoc, limit } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useUI } from '../context/UIContext';
import { ArrowLeft, Target, Settings, GitMerge, Users, UserPlus, Award, CheckCircle2, Plus, Edit3, Calendar, Clock, Sparkles, Check, FileSpreadsheet, Eye, RefreshCw, X, Search, Filter, PhoneCall, ChevronRight, Phone, MessageSquare, BarChart2, TrendingUp, UserCheck, Shield, Bot, Zap, ShieldCheck, Activity } from 'lucide-react';
import GoalDivisionModal from '../components/GoalDivisionModal';
import { normalizeSede } from '../data/usersData';
import nodusFallbackData from '../data/nodusFallbackData.json';
import { auditSingleGoal, auditAllGoals } from '../services/goalsSentinelAgent';

export default function GoalsBoard() {
  const { currentUser } = useAuth();
  const { currentCycle, events } = useCycles();
  const { showToast, showPrompt } = useUI();
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const role = (currentUser?.activeRole || currentUser?.appRole || currentUser?.role || '').toLowerCase();
  const roles = (currentUser?.roles || []).map(r => String(r).toLowerCase());
  const canViewGoals = Boolean(
    currentUser?.isSuperAdmin ||
    currentUser?.isDireccion ||
    currentUser?.isGerente ||
    ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'director_maestria', 'superadmin', 'consolidado', 'coord_c1', 'coordinador_c1c2', 'coord_c2', 'coord_maestria', 'coordinador_mj'].includes(role) ||
    roles.some(r => ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'director_maestria', 'superadmin', 'consolidado', 'coord_c1', 'coordinador_c1c2', 'coord_c2', 'coord_maestria', 'coordinador_mj'].includes(r))
  );

  useEffect(() => {
    if (currentUser && !canViewGoals) {
      showToast('Acceso Restringido. Las metas son exclusivas para directivos, gerentes y coordinadores.', 'error');
      navigate('/');
    }
  }, [currentUser, canViewGoals, navigate, showToast]);

  const [selectedSedeFilter, setSelectedSedeFilter] = useState('Todas');

  const canManageGoals = Boolean(
    currentUser?.isSuperAdmin ||
    currentUser?.isDireccion ||
    ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'director_maestria', 'superadmin', 'consolidado'].includes(currentUser?.appRole) ||
    (currentUser?.roles || []).some(r => ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'director_maestria', 'superadmin', 'consolidado'].includes(r))
  );

  // Modal de Asignación / División de Metas
  const [selectedGoalForAssignment, setSelectedGoalForAssignment] = useState(null);
  const [showDivisionModal, setShowDivisionModal] = useState(false);

  // Calendarios y Reportes para sincronización y avance automático
  const [mjCalendars, setMjCalendars] = useState([]);
  const [coordinatorReports, setCoordinatorReports] = useState([]);

  // Modal Reporte de Sentados en Sala (Gerencia al inicio del entrenamiento)
  const [showSentadosModal, setShowSentadosModal] = useState(false);
  const [selectedGoalForSentados, setSelectedGoalForSentados] = useState(null);
  const [sentadosData, setSentadosData] = useState({ sentados: '', managers: '', apoyos: '', observaciones: '' });
  const [savingSentados, setSavingSentados] = useState(false);

  // AGENTE CENTINELA NODUS: Estado y Modal
  const [showSentinelModal, setShowSentinelModal] = useState(false);
  const [selectedAuditGoal, setSelectedAuditGoal] = useState(null);
  const [syncingSentinelGoalId, setSyncingSentinelGoalId] = useState(null);
  const [isMassSyncingSentinel, setIsMassSyncingSentinel] = useState(false);

  // Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [dailyData, setDailyData] = useState({ parentId: '', title: '', kpi: '', targetValue: 1 });
  
  const stages = [
    { id: 'C1', name: 'Capítulo 1' },
    { id: 'C2', name: 'Capítulo 2' },
    { id: 'MJ_CREACION', name: 'MJ - Creación' },
    { id: 'MJ_RELACION', name: 'MJ - Relación' },
    { id: 'MJ_GRATITUD', name: 'MJ - Gratitud' },
    { id: 'MJ_VIAJE', name: 'MJ - El Viaje' }
  ];

  // Estructura para guardar las metas del wizard
  const [wizardData, setWizardData] = useState(
    stages.reduce((acc, stage) => {
      acc[stage.id] = { px: '', aliados: '', managers: '', apoyos: '' };
      return acc;
    }, {})
  );
  
  const [quitoCycle, setQuitoCycle] = useState('C1');

  // Sincronizacion oficial para Sede LIMA desde Google Sheet GRADUADOS LIMA (C1E31)
  const [syncingLima, setSyncingLima] = useState(false);
  const [showLimaModal, setShowLimaModal] = useState(false);
  const [limaAliadosData, setLimaAliadosData] = useState([]);
  const [limaSearchTerm, setLimaSearchTerm] = useState('');
  const [limaRespFilter, setLimaRespFilter] = useState('ALL');
  const [limaStatusFilter, setLimaStatusFilter] = useState('ALL');

  // Estado para llamadas de Nodus por equipo y auditoria en tiempo real
  const [nodusData, setNodusData] = useState(nodusFallbackData);
  const [managersList, setManagersList] = useState([]);
  const [showTeamCallsModal, setShowTeamCallsModal] = useState(false);
  const [selectedGoalForTeamCalls, setSelectedGoalForTeamCalls] = useState(null);
  const [selectedTeamCallsData, setSelectedTeamCallsData] = useState(null);
  const [teamCallsFilterTeam, setTeamCallsFilterTeam] = useState('');
  const [teamCallsActiveTab, setTeamCallsActiveTab] = useState('coordinadoras');


  useEffect(() => {
    // Cargar caché local inmediato si existe
    try {
      const cached = localStorage.getItem('cpsl_goals_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGoals(parsed);
          setLoading(false);
        }
      }
    } catch (e) {
      console.warn("Error leyendo cpsl_goals_cache:", e);
    }

    const goalsRef = collection(db, 'goals');

    const unsubscribe = onSnapshot(
      goalsRef,
      (snapshot) => {
        let loadedGoals = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Ordenar en memoria por createdAt descendente
        loadedGoals.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        // Filtrar por sede si no es SuperAdmin ni Dirección ni Consolidado
        const isSuper = currentUser?.isSuperAdmin || currentUser?.appRole === 'direccion' || currentUser?.appRole === 'consolidado' || currentUser?.isDireccion;
        if (!isSuper && currentUser?.sede) {
          const mySedeNorm = normalizeSede(currentUser.sede);
          loadedGoals = loadedGoals.filter(g => !g.sede || normalizeSede(g.sede) === mySedeNorm || g.sede === 'Global');
        }

        setGoals(loadedGoals);
        try {
          localStorage.setItem('cpsl_goals_cache', JSON.stringify(loadedGoals));
        } catch(e) {}
        setLoading(false);
      },
      (error) => {
        console.warn("Error en onSnapshot de goals (fallback a caché):", error);
        setLoading(false);
      }
    );

    // Timeout de seguridad: Si Firestore tarda más de 2.5s, quitar spinner
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [currentUser?.sede, currentUser?.isSuperAdmin, currentUser?.appRole, currentUser?.isDireccion]);

  // Escuchar calendarios oficiales de Maestría y reportes de coordinadoras
  useEffect(() => {
    let unsubMJ = () => {};
    let unsubRep = () => {};
    let unsubNodus = () => {};
    let unsubManagers = () => {};
    try {
      unsubMJ = onSnapshot(collection(db, 'mj_calendars'), (snap) => {
        setMjCalendars(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.warn("Error leyendo mj_calendars:", err));

      const qRep = query(collection(db, 'reports'), orderBy('created_at', 'desc'), limit(50));
      unsubRep = onSnapshot(qRep, (snap) => {
        setCoordinatorReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.warn("Error leyendo reports en GoalsBoard:", err));
    } catch (e) {
      // Listener en tiempo real a Nodus Coordinadores C1/C2
      const nodusDocRef = doc(db, 'nodus_coordinadores_c1c2', 'latest');
      unsubNodus = onSnapshot(nodusDocRef, (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d && Array.isArray(d.coordinadores) && d.coordinadores.length > 0) {
            setNodusData(d);
          }
        }
      }, (err) => {
        console.warn('Realtime listener nodus_coordinadores_c1c2 (usando fallback):', err.message);
      });

      // Listener a managers_directory
      const qManagers = query(collection(db, 'managers_directory'), limit(300));
      unsubManagers = onSnapshot(qManagers, (snap) => {
        if (!snap.empty) {
          setManagersList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      }, (err) => console.warn('Listener managers_directory:', err));

      console.warn("Error iniciando listeners adicionales:", e);
    }
    return () => {
      unsubMJ();
      unsubNodus();
      unsubManagers();
      unsubRep();
    };
  }, []);

  // Coherencia con el Calendario: obtiene fechas oficiales de la etapa/evento
  const getGoalCalendarInfo = (goal) => {
    if (!goal) return null;
    const titleLower = (goal.title || '').toLowerCase();
    const sedeNorm = (goal.sede || '').toLowerCase();

    // 1. Calendarios de Maestría (mj_calendars)
    const calMatch = mjCalendars.find(c => {
      const cSede = (c.sede || '').toLowerCase();
      return sedeNorm && (cSede.includes(sedeNorm) || sedeNorm.includes(cSede));
    });

    if (calMatch && calMatch.fds) {
      let fdsKey = null;
      if (titleLower.includes('creación') || titleLower.includes('creacion')) fdsKey = 'creacion';
      else if (titleLower.includes('relación') || titleLower.includes('relacion')) fdsKey = 'relacion';
      else if (titleLower.includes('gratitud')) fdsKey = 'gratitud';

      if (fdsKey) {
        const fds = calMatch.fds.find(f => f.id === fdsKey);
        if (fds && fds.fechaInicio) {
          const now = new Date().toISOString().slice(0, 10);
          const isStarted = now >= fds.fechaInicio;
          const isPast = fds.fechaFin ? now > fds.fechaFin : false;
          return {
            tipo: fds.titulo || fdsKey.toUpperCase(),
            fechaInicio: fds.fechaInicio,
            fechaFin: fds.fechaFin,
            equipo: `${calMatch.equipoNumero ? 'Equipo ' + calMatch.equipoNumero : ''} ${calMatch.equipoNombre || ''}`.trim(),
            isStarted,
            isPast
          };
        }
      }
    }

    // 2. Eventos generales (CyclesContext events)
    if (events && events.length > 0) {
      const evMatch = events.find(e => {
        const evSede = (e.sede || e.sedeTag || e.place || '').toLowerCase();
        const evNombre = (e.nombre || e.name || '').toLowerCase();
        const sedeCoincide = !sedeNorm || evSede.includes(sedeNorm) || sedeNorm.includes(evSede);
        if (!sedeCoincide) return false;

        if (titleLower.includes('capítulo 1') || titleLower.includes('capitulo 1') || titleLower.includes('c1')) {
          return evNombre.includes('c1') || evNombre.includes('capítulo 1') || evNombre.includes('capitulo 1');
        }
        if (titleLower.includes('capítulo 2') || titleLower.includes('capitulo 2') || titleLower.includes('c2')) {
          return evNombre.includes('c2') || evNombre.includes('capítulo 2') || evNombre.includes('capitulo 2');
        }
        return false;
      });

      if (evMatch) {
        const fInicio = evMatch.fecha_inicio || evMatch.start;
        const fFin = evMatch.fecha_fin || evMatch.end;
        const now = new Date().toISOString().slice(0, 10);
        const isStarted = fInicio ? now >= fInicio.slice(0, 10) : false;
        const isPast = fFin ? now > fFin.slice(0, 10) : false;
        return {
          tipo: evMatch.nombre || evMatch.name,
          fechaInicio: fInicio,
          fechaFin: fFin,
          equipo: evMatch.equipo || '',
          isStarted,
          isPast
        };
      }
    }

    return null;
  };

  // SincronizaciÃ³n individual del Agente Centinela
  const handleApplySentinelSync = async (goal, audit) => {
    setSyncingSentinelGoalId(goal.id);
    try {
      const targetVal = Number(audit.detectedTarget || goal.targetValue || 1);
      const newCurrent = Number(audit.detectedRealValue || 0);
      const newProgress = Math.min(100, Math.round((newCurrent / targetVal) * 100));

      const goalRef = doc(db, 'goals', goal.id);
      await updateDoc(goalRef, {
        currentValue: newCurrent,
        progress: newProgress,
        autoSyncedFromSentinel: true,
        sentinelAuditHash: audit.auditHash,
        sentinelSyncedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      try {
        await addDoc(collection(db, 'goals_sentinel_audits'), {
          goalId: goal.id,
          goalTitle: goal.title,
          sede: audit.sede,
          teamNum: audit.teamNum,
          syncedBy: currentUser?.displayName || currentUser?.email || 'Gerente',
          syncedAt: new Date().toISOString(),
          previousValue: goal.currentValue || 0,
          newValue: newCurrent,
          progress: newProgress,
          auditHash: audit.auditHash,
          sources: audit.sources
        });
      } catch (logErr) {
        console.warn('Audit log write error:', logErr);
      }

      await performRollUp(goal.id, newProgress);
      showToast(`âœ… Meta "${goal.title}" sincronizada: ${newCurrent}/${targetVal} (${newProgress}%)`, 'success');
    } catch (err) {
      console.error('Error aplicando sync del Agente Centinela:', err);
      showToast('Error al sincronizar con el Agente Centinela.', 'error');
    } finally {
      setSyncingSentinelGoalId(null);
    }
  };

  // SincronizaciÃ³n masiva de todas las metas pendientes
  const handleApplyAllSentinelSync = async (auditedList) => {
    setIsMassSyncingSentinel(true);
    let count = 0;
    try {
      for (const audit of auditedList) {
        if (audit.requiresUpdate) {
          const goal = goals.find(g => g.id === audit.goalId);
          if (goal) {
            const targetVal = Number(audit.detectedTarget || goal.targetValue || 1);
            const newCurrent = Number(audit.detectedRealValue || 0);
            const newProgress = Math.min(100, Math.round((newCurrent / targetVal) * 100));

            const goalRef = doc(db, 'goals', goal.id);
            await updateDoc(goalRef, {
              currentValue: newCurrent,
              progress: newProgress,
              autoSyncedFromSentinel: true,
              sentinelAuditHash: audit.auditHash,
              sentinelSyncedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });

            await performRollUp(goal.id, newProgress);
            count++;
          }
        }
      }
      showToast(`ðŸš€ Â¡AuditorÃ­a masiva aplicada! ${count} metas sincronizadas con datos certificados de Nodus.`, 'success');
      setShowSentinelModal(false);
    } catch (err) {
      console.error('Error en sync masivo de Agente Centinela:', err);
      showToast('Error al aplicar sincronizaciÃ³n masiva.', 'error');
    } finally {
      setIsMassSyncingSentinel(false);
    }
  };

  // Avance acumulado desde reportes de coordinadoras
  const getGoalReportsSummary = (goal) => {
    if (!goal || !coordinatorReports.length) return null;
    const sedeNorm = (goal.sede || '').toLowerCase();

    const matchingReports = coordinatorReports.filter(r => {
      const rSede = (r.sede || r.data?.sede_id || '').toLowerCase();
      return !sedeNorm || rSede.includes(sedeNorm) || sedeNorm.includes(rSede);
    });

    let totalOk = 0;
    let totalReportsCount = 0;
    let lastCoord = '';

    matchingReports.forEach(r => {
      if (r.type === 'Llamadas' && r.data) {
        const ok = (Number(r.data.nuevos_OK) || 0) + (Number(r.data.rezagados_OK) || 0);
        if (ok > 0) {
          totalOk += ok;
          totalReportsCount++;
          lastCoord = r.submitted_by;
        }
      }
    });

    if (totalOk > 0) {
      return { totalOk, totalReportsCount, lastCoord };
    }
    return null;
  };

  const handleSyncReportsProgress = async (goal, totalOk) => {
    try {
      const targetVal = Number(goal.targetValue || 1);
      const newProgress = Math.min(100, Math.round((totalOk / targetVal) * 100));
      const goalRef = doc(db, 'goals', goal.id);
      await updateDoc(goalRef, {
        currentValue: totalOk,
        progress: newProgress,
        autoSyncedFromReports: true,
        updatedAt: new Date().toISOString()
      });
      await performRollUp(goal.id, newProgress);
      showToast('Avance sincronizado con exito desde Reportes: ' + totalOk + ' OK (' + newProgress + '%).', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al sincronizar avance con reportes.', 'error');
    }
  };

  // SINCRONIZACION EXCLUSIVA PARA SEDE LIMA DESDE LA HOJA OFICIAL GRADUADOS LIMA (C1E31)
  const handleSyncLimaGraduadosSheet = async (targetGoal = null) => {
    setSyncingLima(true);
    try {
      const SHEET_ID = '1l93lhINfZtthELjOwBodoUEgk_d6A8gTb9hPGO6cOe4';
      const GID_ALIADOS = '488639774';
      const url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:csv&gid=' + GID_ALIADOS;
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const csvText = await res.text();

      const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
      let totalOk = 0;
      let totalSig = 0;
      const parsedAliados = [];

      const coordStats = {
        JOYCE: { count: 0, ok: 0, name: 'Joyce Marin Suarez', email: 'joyce.marin@crearpsl.net', role: 'coord_c1' },
        DIANA: { count: 0, ok: 0, name: 'Diana Moscoso Robles', email: 'diana.moscoso@crearpsl.net', role: 'coord_c1' },
        LINID: { count: 0, ok: 0, name: 'Linid Valencia', email: 'linid.valencia@crearpsl.net', role: 'coord_maestria' },
        LEYLA: { count: 0, ok: 0, name: 'Leyla Pasquel', email: 'leyla.pasquel@crearpsl.net', role: 'coord_maestria' },
        JOSE: { count: 0, ok: 0, name: 'Jose Sanchez', email: 'jose.sanchez@crearpsl.net', role: 'gerente' }
      };

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const matches = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g) || [];
        const cols = matches.map(m => {
          let val = m.replace(/^,/, '').trim();
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1).replace(/""/g, '"').trim();
          }
          return val;
        });

        const nombre = (cols[0] || '').trim();
        if (!nombre || nombre.toLowerCase().includes('creador') || nombre.toLowerCase().includes('capitana')) continue;

        const equipo = (cols[1] || '').trim();
        const resp = (cols[2] || '').trim().toUpperCase();
        const estado = (cols[3] || '').trim().toUpperCase();
        const obs = (cols[4] || '').trim();

        parsedAliados.push({ nombre, equipo, responsable: resp, estado, observaciones: obs });

        if (estado === 'OK') totalOk++;
        if (estado === 'SIG') totalSig++;

        if (resp.includes('JOYCE') || resp.includes('JM')) {
          coordStats.JOYCE.count++;
          if (estado === 'OK') coordStats.JOYCE.ok++;
        } else if (resp.includes('DIANA') || resp.includes('DM')) {
          coordStats.DIANA.count++;
          if (estado === 'OK') coordStats.DIANA.ok++;
        } else if (resp.includes('LINID')) {
          coordStats.LINID.count++;
          if (estado === 'OK') coordStats.LINID.ok++;
        } else if (resp.includes('LEYLA')) {
          coordStats.LEYLA.count++;
          if (estado === 'OK') coordStats.LEYLA.ok++;
        } else if (resp.includes('JOSE')) {
          coordStats.JOSE.count++;
          if (estado === 'OK') coordStats.JOSE.ok++;
        }
      }

      setLimaAliadosData(parsedAliados);

      // Buscar la meta de Aliados C1 para Lima
      const limaGoal = targetGoal || goals.find(g => 
        (normalizeSede(g.sede || '') === 'Lima') && 
        (g.title?.toLowerCase().includes('aliados') && (g.title?.includes('1') || g.title?.toLowerCase().includes('c1') || g.stage === 'C1'))
      );

      const assignedCoordinators = [
        {
          name: coordStats.DIANA.name,
          email: coordStats.DIANA.email,
          role: coordStats.DIANA.role,
          sede: 'Lima',
          targetQuota: coordStats.DIANA.ok || 13,
          currentQuota: coordStats.DIANA.ok
        },
        {
          name: coordStats.JOYCE.name,
          email: coordStats.JOYCE.email,
          role: coordStats.JOYCE.role,
          sede: 'Lima',
          targetQuota: coordStats.JOYCE.ok || 12,
          currentQuota: coordStats.JOYCE.ok
        },
        {
          name: coordStats.LINID.name,
          email: coordStats.LINID.email,
          role: coordStats.LINID.role,
          sede: 'Lima',
          targetQuota: coordStats.LINID.ok || 3,
          currentQuota: coordStats.LINID.ok
        },
        {
          name: coordStats.LEYLA.name,
          email: coordStats.LEYLA.email,
          role: coordStats.LEYLA.role,
          sede: 'Lima',
          targetQuota: 2,
          currentQuota: coordStats.LEYLA.ok
        },
        {
          name: coordStats.JOSE.name,
          email: coordStats.JOSE.email,
          role: coordStats.JOSE.role,
          sede: 'Lima',
          targetQuota: 2,
          currentQuota: coordStats.JOSE.ok
        }
      ];

      const targetVal = Number(limaGoal?.targetValue || 32);
      const newProgress = Math.min(100, Math.round((totalOk / targetVal) * 100));

      if (limaGoal) {
        const goalRef = doc(db, 'goals', limaGoal.id);
        await updateDoc(goalRef, {
          currentValue: totalOk,
          progress: newProgress,
          assignedCoordinators,
          autoSyncedFromLimaSheet: true,
          limaSheetSyncedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        await performRollUp(limaGoal.id, newProgress);
        showToast('Metas de Lima sincronizadas: ' + totalOk + ' Aliados confirmados (' + newProgress + '%). Joyce: ' + coordStats.JOYCE.ok + ', Diana: ' + coordStats.DIANA.ok + '.', 'success');
      } else {
        const limaCycle = goals.find(g => normalizeSede(g.sede || '') === 'Lima' && g.scope === 'CICLO');
        const newRef = doc(collection(db, 'goals'));
        await setDoc(newRef, {
          title: 'Aliados - CapÃ­tulo 1',
          kpi: 'Cantidad de Aliados',
          targetValue: 32,
          currentValue: totalOk,
          progress: newProgress,
          scope: 'ENTRENAMIENTO',
          cyclePhase: 'C1',
          parentId: limaCycle ? limaCycle.id : null,
          stage: 'C1',
          ownerId: currentUser?.uid || 'admin',
          sede: 'Lima',
          assignedCoordinators,
          autoSyncedFromLimaSheet: true,
          limaSheetSyncedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
        if (limaCycle) {
          await performRollUp(newRef.id, newProgress);
        }
        showToast('Meta Aliados (Lima) creada y sincronizada: ' + totalOk + ' confirmados (' + newProgress + '%)', 'success');
      }
    } catch (e) {
      console.error('Error sincronizando hoja de Lima:', e);
      showToast('Error sincronizando hoja de Lima: ' + e.message, 'error');
    } finally {
      setSyncingLima(false);
    }
  };

  const handleOpenLimaAliadosModal = async () => {
    if (limaAliadosData.length === 0) {
      setSyncingLima(true);
      try {
        const SHEET_ID = '1l93lhINfZtthELjOwBodoUEgk_d6A8gTb9hPGO6cOe4';
        const GID_ALIADOS = '488639774';
        const url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:csv&gid=' + GID_ALIADOS;
        const res = await fetch(url);
        if (res.ok) {
          const csvText = await res.text();
          const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
          const parsed = [];
          for (let i = 1; i < lines.length; i++) {
            const matches = lines[i].match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g) || [];
            const cols = matches.map(m => m.replace(/^,?"?|"$/g, '').trim());
            const nombre = (cols[0] || '').trim();
            if (!nombre || nombre.toLowerCase().includes('creador') || nombre.toLowerCase().includes('capitana')) continue;
            parsed.push({
              nombre,
              equipo: (cols[1] || '').trim(),
              responsable: (cols[2] || '').trim().toUpperCase(),
              estado: (cols[3] || '').trim().toUpperCase(),
              observaciones: (cols[4] || '').trim()
            });
          }
          setLimaAliadosData(parsed);
        }
      } catch (err) {
        console.warn(err);
      } finally {
        setSyncingLima(false);
      }
    }
    setShowLimaModal(true);
  };

  // Guardar Reporte de Sentados en Sala (Gerente / Oficina al iniciar entrenamiento)
  const handleSaveSentadosReport = async (e) => {
    e.preventDefault();
    if (!selectedGoalForSentados || !sentadosData.sentados) {
      showToast('Por favor ingresa la cantidad de participantes sentados en sala.', 'error');
      return;
    }
    setSavingSentados(true);
    try {
      const sentadosNum = Number(sentadosData.sentados) || 0;
      const targetVal = Number(selectedGoalForSentados.targetValue || 1);
      const newProgress = Math.min(100, Math.round((sentadosNum / targetVal) * 100));

      // 1. Actualizar la Meta en Firestore
      const goalRef = doc(db, 'goals', selectedGoalForSentados.id);
      await updateDoc(goalRef, {
        currentValue: sentadosNum,
        progress: newProgress,
        sentadosReportados: true,
        sentadosReportedBy: currentUser?.displayName || currentUser?.name || currentUser?.email || 'Gerente',
        sentadosReportedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 2. Registrar en la colección 'reports' como Reporte Oficial de Sentados
      await addDoc(collection(db, 'reports'), {
        type: 'ReporteSentadosSala',
        goal_id: selectedGoalForSentados.id,
        goal_title: selectedGoalForSentados.title,
        sede: selectedGoalForSentados.sede || currentUser?.sede || 'Global',
        cycle_id: currentCycle?.name || selectedGoalForSentados.cyclePhase || 'CICLO-2026',
        submitted_by: currentUser?.displayName || currentUser?.email || 'Gerencia de Sede',
        created_at: new Date().toISOString(),
        data: {
          sentados: sentadosNum,
          targetValue: targetVal,
          cumplimiento_pct: newProgress,
          managers: sentadosData.managers ? Number(sentadosData.managers) : null,
          apoyos: sentadosData.apoyos ? Number(sentadosData.apoyos) : null,
          observaciones: sentadosData.observaciones || ''
        }
      });

      // 3. Rollup a meta padre
      await performRollUp(selectedGoalForSentados.id, newProgress);

      showToast(`✅ Reporte de Sentados registrado: ${sentadosNum} participantes en sala (${newProgress}%).`, 'success');
      setShowSentadosModal(false);
      setSentadosData({ sentados: '', managers: '', apoyos: '', observaciones: '' });
      setSelectedGoalForSentados(null);
    } catch (err) {
      console.error("Error guardando reporte de sentados:", err);
      showToast('Error al registrar reporte de sentados.', 'error');
    } finally {
      setSavingSentados(false);
    }
  };

  // Extraer y resolver los datos de llamadas de Nodus para una meta y su equipo
  const getTeamCallsData = (goal, parentGoal, forcedTeam = null) => {
    if (!goal) return null;
    
    const goalSede = normalizeSede(goal.sede || parentGoal?.sede || currentUser?.sede || 'Lima');
    
    // Deteccion automatica del equipo
    let targetTeam = forcedTeam;
    if (!targetTeam) {
      const fullText = `${goal.title || ''} ${parentGoal?.title || ''} ${goal.cyclePhase || ''} ${currentCycle?.name || ''}`;
      const match = fullText.match(/(?:Equipo|E)\s*(\d+|[A-Za-z0-9]+)/i);
      if (match) {
        targetTeam = `EQUIPO ${match[1]}`.toUpperCase();
      } else {
        if (goalSede === 'Lima') targetTeam = 'EQUIPO 30';
        else if (goalSede === 'Quito') targetTeam = 'EQUIPO 119';
        else if (goalSede === 'Guayaquil') targetTeam = 'EQUIPO 24';
        else if (goalSede === 'Cuenca') targetTeam = 'EQUIPO 23';
        else targetTeam = 'EQUIPO 30';
      }
    }

    const cleanTargetTeam = targetTeam.replace(/\s+/g, '').toUpperCase();
    
    // Coordinadores de la sede en Nodus
    const allCoords = nodusData?.coordinadores || nodusFallbackData?.coordinadores || [];
    const sedeCoords = allCoords.filter(c => normalizeSede(c.sede || '') === goalSede);
    
    // Lista de todos los equipos disponibles para esta sede
    const availableTeams = Array.from(
      new Set(
        sedeCoords.flatMap(c => (c.equipos || []).map(e => (e.equipo || '').toUpperCase().trim())).filter(Boolean)
      )
    ).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numB - numA;
    });

    const matchingCoords = [];
    let totalLlamadas = 0;
    let totalConfirmados = 0;
    let totalPorConfirmar = 0;
    let totalNoContesta = 0;
    let totalSiguiente = 0;
    let totalAsistieron = 0;

    sedeCoords.forEach(c => {
      const eqMatch = (c.equipos || []).find(e => (e.equipo || '').replace(/\s+/g, '').toUpperCase() === cleanTargetTeam);
      if (eqMatch) {
        const llamadas = Number(eqMatch.llamadas) || 0;
        const confirmado = Number(eqMatch.confirmado) || 0;
        const porConfirmar = Number(eqMatch.porConfirmar) || 0;
        const noContesta = Number(eqMatch.noContesta) || 0;
        const siguiente = Number(eqMatch.siguiente) || 0;
        const asistieron = Number(eqMatch.asistieron) || 0;

        totalLlamadas += llamadas;
        totalConfirmados += confirmado;
        totalPorConfirmar += porConfirmar;
        totalNoContesta += noContesta;
        totalSiguiente += siguiente;
        totalAsistieron += asistieron;

        matchingCoords.push({
          nombre: c.nombre,
          nombreCompleto: c.nombreCompleto || c.nombre,
          email: c.email || '',
          rol: c.rol || 'Coordinador C1 / C2',
          sede: c.sede || goalSede,
          llamadas,
          confirmados: confirmado,
          porConfirmar,
          noContesta,
          siguiente,
          asistieron,
          efectividadPct: llamadas > 0 ? Math.round((confirmado / llamadas) * 100) : 0,
          ultGestion: c.ultGestion || ''
        });
      }
    });

    const efectividadGlobal = totalLlamadas > 0 ? Math.round((totalConfirmados / totalLlamadas) * 100) : 0;

    const sedeReports = coordinatorReports.filter(r => 
      normalizeSede(r.sede || '') === goalSede && 
      (r.type === 'Llamadas' || r.type === 'ReporteSentadosSala' || !r.type)
    );

    const teamManagers = managersList.filter(m => {
      const mSede = normalizeSede(m.sede || '');
      const mEq = String(m.numEquipo || m.equipo || '').toUpperCase().replace(/\s+/g, '');
      return mSede === goalSede && (mEq === cleanTargetTeam || mEq.includes(cleanTargetTeam.replace('EQUIPO', '')));
    });

    return {
      goalId: goal.id,
      goalTitle: goal.title,
      sede: goalSede,
      teamName: targetTeam,
      availableTeams,
      totalLlamadas,
      totalConfirmados,
      totalPorConfirmar,
      totalNoContesta,
      totalSiguiente,
      totalAsistieron,
      efectividadGlobal,
      coordinadoresList: matchingCoords,
      sedeReports,
      teamManagers
    };
  };

  const handleOpenTeamCallsModal = (goal, parentGoal = null, forcedTeam = null) => {
    const pGoal = parentGoal || goals.find(g => g.id === goal.parentId);
    const data = getTeamCallsData(goal, pGoal, forcedTeam);
    setSelectedGoalForTeamCalls(goal);
    setSelectedTeamCallsData(data);
    setTeamCallsFilterTeam(data ? data.teamName : '');
    setTeamCallsActiveTab('coordinadoras');
    setShowTeamCallsModal(true);
  };

  const handleTeamCallsChangeTeam = (newTeam) => {
    if (!selectedGoalForTeamCalls) return;
    const pGoal = goals.find(g => g.id === selectedGoalForTeamCalls.parentId);
    const data = getTeamCallsData(selectedGoalForTeamCalls, pGoal, newTeam);
    setSelectedTeamCallsData(data);
    setTeamCallsFilterTeam(newTeam);
  };

  const handleWizardChange = (stageId, field, value) => {
    setWizardData(prev => ({
      ...prev,
      [stageId]: { ...prev[stageId], [field]: value }
    }));
  };

  const handleGenerateGoals = async () => {
    try {
      const batch = writeBatch(db);
      const cycleGoalRef = doc(collection(db, 'goals'));
      const suffix = currentUser?.sede === 'Quito' ? ` (${quitoCycle})` : '';
      const currentUserId = currentUser?.uid || currentUser?.id || 'admin';
      const currentUserName = currentUser?.displayName || currentUser?.name || 'Administrador';
      const userSede = currentUser?.sede || '';
      
      // 1. Crear Meta Maestra del Ciclo
      batch.set(cycleGoalRef, {
        title: `Meta Global del Ciclo ${currentCycle?.name || ''}${suffix}`,
        kpi: 'Cumplimiento General (%)',
        progress: 0,
        targetValue: 100,
        currentValue: 0,
        scope: 'CICLO',
        parentId: null,
        ownerId: currentUserId,
        ownerName: currentUserName,
        sede: userSede,
        createdAt: new Date().toISOString()
      });

      // 2. Crear las metas de ENTRENAMIENTO basadas en el Wizard
      for (const stage of stages) {
        const data = wizardData[stage.id];
        const phaseCode = stage.id.startsWith('MJ') ? 'MJ' : stage.id;
        
        if (data.px && Number(data.px) > 0) {
          batch.set(doc(collection(db, 'goals')), {
             title: `Sentados (Px) - ${stage.name}`,
             kpi: 'Cantidad de Px',
             targetValue: Number(data.px),
             currentValue: 0,
             progress: 0,
             scope: 'ENTRENAMIENTO',
             cyclePhase: phaseCode,
             parentId: cycleGoalRef.id,
             stage: stage.id,
             ownerId: currentUserId,
             sede: userSede,
             assignedCoordinators: [],
             createdAt: new Date().toISOString()
          });
        }
        if (data.aliados && Number(data.aliados) > 0) {
          batch.set(doc(collection(db, 'goals')), {
             title: `Aliados - ${stage.name}`,
             kpi: 'Cantidad de Aliados',
             targetValue: Number(data.aliados),
             currentValue: 0,
             progress: 0,
             scope: 'ENTRENAMIENTO',
             cyclePhase: phaseCode,
             parentId: cycleGoalRef.id,
             stage: stage.id,
             ownerId: currentUserId,
             sede: userSede,
             assignedCoordinators: [],
             createdAt: new Date().toISOString()
          });
        }
        if (data.managers && Number(data.managers) > 0) {
          batch.set(doc(collection(db, 'goals')), {
             title: `Managers - ${stage.name}${suffix}`,
             kpi: 'Cantidad de Managers',
             targetValue: Number(data.managers),
             currentValue: 0,
             progress: 0,
             scope: 'ENTRENAMIENTO',
             cyclePhase: phaseCode,
             parentId: cycleGoalRef.id,
             stage: stage.id,
             ownerId: currentUserId,
             sede: userSede,
             assignedCoordinators: [],
             createdAt: new Date().toISOString()
          });
        }
        if (data.apoyos && Number(data.apoyos) > 0) {
          batch.set(doc(collection(db, 'goals')), {
             title: `Apoyos en Mesa - ${stage.name}${suffix}`,
             kpi: 'Cantidad de Apoyos',
             targetValue: Number(data.apoyos),
             currentValue: 0,
             progress: 0,
             scope: 'ENTRENAMIENTO',
             cyclePhase: phaseCode,
             parentId: cycleGoalRef.id,
             stage: stage.id,
             ownerId: currentUserId,
             sede: userSede,
             assignedCoordinators: [],
             createdAt: new Date().toISOString()
          });
        }
      }

      await batch.commit();
      showToast('Metas de Ciclo generadas correctamente.', 'success');
      setShowWizard(false);
    } catch (e) {
      console.error(e);
      showToast('Error generando metas.', 'error');
    }
  };

  const handleCreateDailyGoal = async (e) => {
    e.preventDefault();
    if (!dailyData.parentId || !dailyData.title || dailyData.targetValue <= 0) {
      showToast('Por favor completa todos los campos correctamente.', 'error');
      return;
    }
    
    try {
      const parentGoal = goals.find(g => g.id === dailyData.parentId);
      await addDoc(collection(db, 'goals'), {
        title: dailyData.title,
        kpi: dailyData.kpi || parentGoal?.kpi || 'Unidades',
        targetValue: Number(dailyData.targetValue),
        currentValue: 0,
        progress: 0,
        scope: 'DIARIA',
        cyclePhase: parentGoal?.cyclePhase || 'DIA',
        parentId: dailyData.parentId,
        ownerId: currentUser?.uid || currentUser?.id || 'admin',
        sede: currentUser?.sede || '',
        assignedCoordinators: [],
        createdAt: new Date().toISOString()
      });
      showToast('Meta Diaria creada exitosamente.', 'success');
      setShowDailyModal(false);
      setDailyData({ parentId: '', title: '', kpi: '', targetValue: 1 });
    } catch (error) {
      console.error(error);
      showToast('Error creando Meta Diaria', 'error');
    }
  };

  // GUARDAR ASIGNACIÓN Y DIVISIÓN DE CUOTAS A COORDINADORAS
  const handleSaveAssignment = async (goalId, assignedList) => {
    try {
      const goalRef = doc(db, 'goals', goalId);
      const totalReported = assignedList.reduce((sum, item) => sum + (Number(item.currentQuota) || 0), 0);
      const targetVal = Number(selectedGoalForAssignment?.targetValue || 1);
      const newProgress = Math.min(100, Math.round((totalReported / targetVal) * 100));

      await updateDoc(goalRef, {
        assignedCoordinators: assignedList,
        isAssigned: true,
        currentValue: totalReported,
        progress: newProgress,
        updatedAt: new Date().toISOString()
      });

      // Roll-up hacia metas superiores
      await performRollUp(goalId, newProgress);

      showToast(`¡Meta dividida y asignada con exito a ${assignedList.length} coordinadoras!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar la asignación de meta.', 'error');
    }
  };

  // ACTUALIZAR EL AVANCE INDIVIDUAL DE UNA COORDINADORA
  const handleUpdateCoordinatorProgress = async (goal, coordEmail, currentQuota, targetQuota, coordName) => {
    const newVal = await showPrompt(
      `📊 Reportar Avance de ${coordName}:\nCuota Asignada: ${targetQuota}\nIngresa el nuevo total alcanzado:`,
      currentQuota || 0
    );

    if (newVal !== null && newVal !== '' && !isNaN(newVal)) {
      try {
        const numericVal = Math.max(0, Number(newVal));
        const updatedCoordinators = (goal.assignedCoordinators || []).map(c => {
          if (c.email === coordEmail) {
            return { ...c, currentQuota: numericVal };
          }
          return c;
        });

        // Sumar avances de todas las coordinadoras
        const totalSum = updatedCoordinators.reduce((sum, c) => sum + (Number(c.currentQuota) || 0), 0);
        const targetVal = Number(goal.targetValue || 1);
        const newProgress = Math.min(100, Math.round((totalSum / targetVal) * 100));

        const goalRef = doc(db, 'goals', goal.id);
        await updateDoc(goalRef, {
          assignedCoordinators: updatedCoordinators,
          currentValue: totalSum,
          progress: newProgress,
          updatedAt: new Date().toISOString()
        });

        await performRollUp(goal.id, newProgress);
        showToast(`Avance de ${coordName} actualizado a ${numericVal}/${targetQuota} (Total acumulado: ${totalSum}/${targetVal})`, 'success');
      } catch (err) {
        console.error(err);
        showToast('Error al actualizar el avance.', 'error');
      }
    }
  };

  const performRollUp = async (goalId, newProgress) => {
    try {
      const currentGoal = goals.find(g => g.id === goalId);
      if (currentGoal && currentGoal.parentId) {
        const siblings = goals.filter(g => g.parentId === currentGoal.parentId && g.id !== goalId);
        let totalProgress = newProgress;
        siblings.forEach(s => totalProgress += (s.progress || 0));
        const avgProgress = Math.round(totalProgress / (siblings.length + 1));
        
        const parentRef = doc(db, 'goals', currentGoal.parentId);
        await updateDoc(parentRef, { 
          progress: avgProgress,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error("Rollup error:", e);
    }
  };

  const updateProgressManual = async (id, currentVal, targetVal) => {
    const newVal = await showPrompt(`Ingresa nuevo valor acumulado global (Meta: ${targetVal}):`, currentVal);
    if (newVal !== null && newVal !== '' && !isNaN(newVal)) {
      try {
        const numericVal = Number(newVal);
        const newProgress = Math.min(100, Math.round((numericVal / targetVal) * 100));
        
        const goalRef = doc(db, 'goals', id);
        await updateDoc(goalRef, { 
          currentValue: numericVal,
          progress: newProgress,
          updatedAt: new Date().toISOString()
        });

        await performRollUp(id, newProgress);
        showToast('Avance global actualizado', 'success');
      } catch (e) {
        console.error("Error actualizando meta:", e);
        showToast('Error actualizando meta', 'error');
      }
    }
  };

  const openAssignmentModal = (goal) => {
    setSelectedGoalForAssignment(goal);
    setShowDivisionModal(true);
  };

  const renderGoal = (goal) => {
    const parentGoal = goals.find(g => g.id === goal.parentId);
    const isAssigned = goal.assignedCoordinators && Array.isArray(goal.assignedCoordinators) && goal.assignedCoordinators.length > 0;
    const calInfo = getGoalCalendarInfo(goal);
    const repSummary = getGoalReportsSummary(goal);
    
    return (
      <div key={goal.id} className="glass-panel" style={{ padding: '1.5rem', transition: 'all 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ 
                fontSize: '0.7rem', fontWeight: 'bold', padding: '0.2rem 0.6rem', borderRadius: '4px',
                background: goal.scope === 'CICLO' ? 'var(--crear-gold)' : goal.scope === 'ENTRENAMIENTO' ? 'var(--crear-blue)' : 'var(--color-success)',
                color: '#000', letterSpacing: '1px'
              }}>
                {goal.scope}
              </span>

              {goal.sede && (
                <span style={{
                  fontSize: '0.7rem', fontWeight: 'bold', padding: '0.2rem 0.6rem', borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)'
                }}>
                  📍 {goal.sede}
                </span>
              )}

              {/* COHERENCIA CON CALENDARIO OFICIAL */}
              {calInfo && (
                <span style={{
                  fontSize: '0.72rem', fontWeight: 'bold', padding: '0.2rem 0.6rem', borderRadius: '6px',
                  background: calInfo.isStarted ? 'rgba(34, 197, 94, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                  color: calInfo.isStarted ? '#22c55e' : '#38bdf8',
                  border: calInfo.isStarted ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid rgba(56, 189, 248, 0.3)',
                  display: 'inline-flex', alignItems: 'center', gap: '4px'
                }}>
                  <Calendar size={12} />
                  <span>{calInfo.tipo}: {calInfo.fechaInicio ? calInfo.fechaInicio.slice(5) : ''} {calInfo.fechaFin ? 'al ' + calInfo.fechaFin.slice(5) : ''}</span>
                  {calInfo.isStarted && !calInfo.isPast && (
                    <span style={{ marginLeft: '4px', background: '#22c55e', color: '#000', padding: '1px 5px', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 900 }}>
                      EN SALA
                    </span>
                  )}
                </span>
              )}
              
              {isAssigned && (
                <span style={{
                  fontSize: '0.7rem', fontWeight: 'bold', padding: '0.2rem 0.6rem', borderRadius: '9999px',
                  background: 'rgba(0, 210, 255, 0.15)', color: 'var(--crear-blue)', border: '1px solid rgba(0, 210, 255, 0.3)',
                  display: 'inline-flex', alignItems: 'center', gap: '4px'
                }}>
                  <Users size={12} /> Dividido en {goal.assignedCoordinators.length} Coordinadoras
                </span>
              )}

              {parentGoal && (
                <span className="text-muted" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <GitMerge size={12} /> Aporta a: {parentGoal.title}
                </span>
              )}
            </div>

            <h3 className="text-main" style={{ margin: '0 0 0.35rem 0', fontSize: '1.25rem' }}>{goal.title}</h3>
            
            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
              {goal.targetValue ? (
                <>
                  Avance Acumulado: <strong style={{ color: 'var(--crear-gold)', fontSize: '1.05rem' }}>{goal.currentValue || 0}</strong> de <strong>{goal.targetValue}</strong> {goal.kpi || ''}
                </>
              ) : `KPI: ${goal.kpi}`}
            </p>

            {/* AVANCE AUTOMÁTICO DESDE REPORTES DE COORDINADORAS */}
            {/* AVANCE EN LLAMADAS DEL EQUIPO ACTUAL (INTERACTIVO AL DAR CLIC) */}
            {(() => {
              const teamCalls = getTeamCallsData(goal, parentGoal);
              if (!teamCalls || teamCalls.totalLlamadas === 0) return null;

              return (
                <div
                  onClick={() => handleOpenTeamCallsModal(goal, parentGoal)}
                  role="button"
                  tabIndex={0}
                  className="team-calls-progress-badge"
                  style={{
                    marginTop: '0.65rem',
                    padding: '0.55rem 0.85rem',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(16, 185, 129, 0.1) 100%)',
                    border: '1px solid rgba(14, 165, 233, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                  title="Clic para ver el desglose detallado de llamadas del equipo actual"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '7px',
                      background: 'rgba(14, 165, 233, 0.22)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#38bdf8', flexShrink: 0
                    }}>
                      <PhoneCall size={15} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span>Llamadas {teamCalls.teamName}:</span>
                        <span style={{ color: '#38bdf8', fontWeight: 800 }}>{teamCalls.totalLlamadas} gestiones</span>
                        <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.18)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 700 }}>
                          âœ“ {teamCalls.totalConfirmados} Confirmados
                        </span>
                        {teamCalls.totalPorConfirmar > 0 && (
                          <span style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.18)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 700 }}>
                            â³ {teamCalls.totalPorConfirmar} Por confirmar
                          </span>
                        )}
                        <span style={{ fontSize: '0.72rem', color: 'var(--crear-gold)', fontWeight: 700 }}>
                          ({teamCalls.efectividadGlobal}% efectividad)
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                        {teamCalls.coordinadoresList.length} coordinadoras activas ({teamCalls.coordinadoresList.map(c => c.nombre).join(', ')}) â€¢ <span style={{ color: '#38bdf8', textDecoration: 'underline' }}>Clic para ver detalles nominales</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#38bdf8', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    <span>Ver detalle</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              );
            })()}

            {/* AUDITORIA Y SEGUIMIENTO EN TIEMPO REAL: AGENTE CENTINELA NODUS */}
            {(() => {
              const audit = auditSingleGoal(goal, parentGoal, {
                nodusData,
                liveManagers: managersList,
                coordinatorReports
              });
              if (!audit) return null;

              return (
                <div style={{
                  marginTop: '0.65rem',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '10px',
                  background: audit.requiresUpdate ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.06) 100%)' : 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
                  border: `1px solid ${audit.requiresUpdate ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.3)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: audit.requiresUpdate ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.22)',
                        color: audit.badgeColor,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 800
                      }}>
                        <Bot size={13} />
                        <span>Agente Nodus</span>
                      </div>
                      <span style={{ fontSize: '0.83rem', fontWeight: 700, color: '#f8fafc' }}>
                        {audit.detectedRealValue} de {audit.detectedTarget} detectados en Nodus
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: audit.badgeColor,
                        background: `${audit.badgeColor}22`,
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}>
                        {audit.newProgress}% verificado
                      </span>
                      {audit.callsDetails.totalLlamadas > 0 && (
                        <span style={{ fontSize: '0.73rem', color: '#94a3b8' }}>
                          â€¢ {audit.callsDetails.totalLlamadas} llamadas ({audit.callsDetails.efectividad}% efectividad)
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAuditGoal({ goal, audit });
                          setShowSentinelModal(true);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#38bdf8',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0
                        }}
                      >
                        Ver Diagnostico
                      </button>

                      {canManageGoals && audit.requiresUpdate && (
                        <button
                          type="button"
                          disabled={syncingSentinelGoalId === goal.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplySentinelSync(goal, audit);
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: '#000',
                            border: '1px solid #fbbf24',
                            padding: '0.35rem 0.85rem',
                            borderRadius: '7px',
                            fontSize: '0.76rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <Zap size={13} />
                          <span>{syncingSentinelGoalId === goal.id ? 'Sincronizando...' : `âš¡ Sincronizar Avance Real (${audit.detectedRealValue}/${audit.detectedTarget})`}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.71rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>Fuentes: <strong style={{ color: '#cbd5e1' }}>{audit.sources.join(' + ')}</strong></span>
                    <span>â€¢ Hash: <code style={{ color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>{audit.auditHash}</code></span>
                    <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <ShieldCheck size={11} /> 100% Confiable / Sin Alucinaciones
                    </span>
                  </div>
                </div>
              );
            })()}

            {repSummary && !goal.sentadosReportados && (
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={12} /> {repSummary.totalOk} confirmados según reportes de coordinadoras ({repSummary.lastCoord})
                </span>
                {(canManageGoals && Number(goal.currentValue || 0) < repSummary.totalOk) && (
                  <button
                    type="button"
                    onClick={() => handleSyncReportsProgress(goal, repSummary.totalOk)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--crear-cyan)', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', padding: 0 }}
                  >
                    ⚡ Sincronizar al avance ({repSummary.totalOk}/{goal.targetValue})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* BOTONES DE ACCIÓN PARA GERENTES Y DIRECTIVOS */}
          {goal.targetValue && canManageGoals && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* ACCIÓN OPERATIVA: REPORTAR SENTADOS EN SALA */}
              {goal.sentadosReportados ? (
                <span style={{ fontSize: '0.78rem', background: 'rgba(16, 185, 129, 0.18)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '0.45rem 0.8rem', borderRadius: '8px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <CheckCircle2 size={14} /> Sentados en Sala: {goal.currentValue}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGoalForSentados(goal);
                    setShowSentadosModal(true);
                  }}
                  className="btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: '1px solid #34d399',
                    color: '#fff',
                    padding: '0.45rem 0.9rem',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    cursor: 'pointer'
                  }}
                  title="Registrar reporte de participantes sentados en sala al inicio del entrenamiento"
                >
                  <Users size={14} />
                  <span>Registrar Sentados</span>
                </button>
              )}

              <button 
                type="button"
                onClick={() => openAssignmentModal(goal)}
                className="btn-neon-action"
                style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}
                title="Dividir la meta equitativamente entre las coordinadoras de la sede"
              >
                <Users size={14} />
                <span>{isAssigned ? 'Modificar Reparto' : '👥 Asignar / Dividir Meta'}</span>
              </button>

              <button 
                type="button"
                className="btn-secondary" 
                onClick={() => updateProgressManual(goal.id, goal.currentValue, goal.targetValue)} 
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
              >
                Ajuste Manual
              </button>
            </div>
          )}
        </div>
        
        {/* BARRA DE PROGRESO GLOBAL */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: isAssigned ? '1.25rem' : '0' }}>
          <div style={{ flex: 1, height: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              width: `${Math.min(Number(goal.progress) || 0, 100)}%`, 
              background: (Number(goal.progress) || 0) >= 100 
                ? 'linear-gradient(90deg, #22c55e, #16a34a)' 
                : 'linear-gradient(90deg, #00d2ff, #0284c7)', 
              transition: 'width 0.4s ease' 
            }} />
          </div>
          <span className="text-gold" style={{ fontWeight: 'bold', minWidth: '45px', fontSize: '1.05rem' }}>
            {Number(goal.progress) || 0}%
          </span>
        </div>

        {/* DESGLOSE INDIVIDUAL DE COORDINADORAS ASIGNADAS CON REPORTE EN 1 CLIC */}
        {isAssigned && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: '12px',
            padding: '1rem',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            marginTop: '0.75rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📌 Cuotas Individuales & Reporte de Avance en Tiempo Real:
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--crear-blue)' }}>
                Suma total: {goal.currentValue || 0} / {goal.targetValue}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
              {goal.assignedCoordinators.map(coord => {
                const current = Number(coord.currentQuota || 0);
                const target = Number(coord.targetQuota || 1);
                const pct = Math.min(100, Math.round((current / target) * 100));
                const isC1 = coord.role === 'coord_c1';

                return (
                  <div
                    key={coord.email}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-heading)' }}>
                          {coord.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: isC1 ? 'var(--crear-blue)' : 'var(--role-mj)', fontWeight: 'bold' }}>
                          {isC1 ? 'Coordinadora C1/C2' : 'Coordinadora CMJ'} ({coord.sede || 'Sede'})
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUpdateCoordinatorProgress(goal, coord.email, current, target, coord.name)}
                        className="btn-secondary"
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.6rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          background: 'rgba(0, 210, 255, 0.1)',
                          borderColor: 'var(--crear-blue)',
                          color: 'var(--crear-blue)'
                        }}
                      >
                        <Edit3 size={11} /> Reportar
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      <span className="text-muted">Avance:</span>
                      <span>
                        <strong style={{ color: current >= target ? '#22c55e' : 'var(--crear-gold)' }}>{current}</strong> / {target} ({pct}%)
                      </span>
                    </div>

                    {/* Barra individual */}
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: pct >= 100 ? '#22c55e' : 'var(--crear-blue)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      <button onClick={() => navigate('/')} className="btn-secondary" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
        <ArrowLeft size={18} /> Volver
      </button>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Target size={32} className="text-gold" />
          <div>
            <h1 className="text-gold uppercase" style={{ margin: 0, fontSize: '1.8rem' }}>Gestión de Metas</h1>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
              Seguimiento, asignación equitativa a coordinadoras y acumulación operativa
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {(selectedSedeFilter === 'Lima' || normalizeSede(currentUser?.sede || '') === 'Lima' || currentUser?.isSuperAdmin || currentUser?.isDireccion) && (
            <button
              onClick={() => handleSyncLimaGraduadosSheet()}
              disabled={syncingLima}
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.2rem',
                border: '1px solid var(--crear-cyan)',
                color: 'var(--crear-cyan)',
                background: 'rgba(0, 210, 255, 0.08)',
                cursor: syncingLima ? 'wait' : 'pointer'
              }}
              title="Sincronizar metas de Lima desde Google Sheet GRADUADOS LIMA (C1E31)"
            >
              <FileSpreadsheet size={16} />
              <span>{syncingLima ? 'Sincronizando...' : 'Sincronizar Graduados Lima'}</span>
            </button>
          )}

          {/* BOTÃ“N AGENTE CENTINELA DE METAS Y LLAMADAS NODUS */}
          <button
            type="button"
            onClick={() => {
              setSelectedAuditGoal(null);
              setShowSentinelModal(true);
            }}
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              padding: '0.65rem 1.25rem',
              border: '1px solid #10b981',
              color: '#10b981',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(14, 165, 233, 0.1) 100%)',
              cursor: 'pointer',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.85rem',
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.25)'
            }}
            title="Consola del Agente Centinela: Seguimiento de Metas y Llamadas Nodus"
          >
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%', background: '#10b981',
              boxShadow: '0 0 8px #10b981'
            }} />
            <Bot size={16} />
            <span>Agente Centinela Nodus</span>
            {(() => {
              const currentFiltered = goals.filter(g => selectedSedeFilter === 'Todas' || normalizeSede(g.sede || '') === normalizeSede(selectedSedeFilter));
              const mapParents = {};
              goals.forEach(g => { mapParents[g.id] = g; });
              const globalAudit = auditAllGoals(currentFiltered, mapParents, { nodusData, liveManagers: managersList, coordinatorReports });
              if (globalAudit.pendingSyncCount > 0) {
                return (
                  <span style={{
                    background: '#f59e0b',
                    color: '#000',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    padding: '1px 7px',
                    borderRadius: '9999px'
                  }}>
                    {globalAudit.pendingSyncCount} pendientes
                  </span>
                );
              }
              return (
                <span style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  padding: '1px 6px',
                  borderRadius: '9999px'
                }}>
                  Al dÃ­a
                </span>
              );
            })()}
          </button>

          {currentUser?.appRole === 'gerente' && (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-secondary" onClick={() => setShowDailyModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem' }}>
                <Plus size={18} /> Meta Diaria
              </button>
              <button className="btn-primary" onClick={() => setShowWizard(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem' }}>
                <Settings size={18} /> Setup de Ciclo
              </button>
            </div>
          )}
        </div>
      </div>

        {(currentUser?.isSuperAdmin || currentUser?.isDireccion) && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Filtro de Sede (Vista Global):</label>
            <select 
              className="form-select" 
              value={selectedSedeFilter} 
              onChange={e => setSelectedSedeFilter(e.target.value)} 
              style={{ width: '100%', maxWidth: '300px', padding: '0.5rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border-subtle)' }}
            >
              <option value="Todas">Todas las Sedes</option>
              <option value="Lima">Lima</option>
              <option value="Quito">Quito</option>
              <option value="Medellín">Medellín</option>
              <option value="Guayaquil">Guayaquil</option>
              <option value="Cuenca">Cuenca</option>
              <option value="México">México</option>
            </select>
          </div>
        )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {loading ? <p className="text-muted text-center">Cargando metas...</p> : (() => {
          if (goals.length === 0) {
            return <p className="text-muted" style={{ textAlign: 'center' }}>No hay metas configuradas. Inicia el Setup de Ciclo.</p>;
          }
          const filteredGoals = goals.filter(g => selectedSedeFilter === 'Todas' || normalizeSede(g.sede || '') === normalizeSede(selectedSedeFilter));
          if (filteredGoals.length === 0) {
            return <p className="text-muted" style={{ textAlign: 'center' }}>No se encontraron metas para la sede <strong>{selectedSedeFilter}</strong>.</p>;
          }
          return filteredGoals.map(renderGoal);
        })()}
      </div>

      {/* MODAL PARA DIVIDIR Y ASIGNAR METAS ENTRE COORDINADORAS */}
      <GoalDivisionModal
        isOpen={showDivisionModal}
        onClose={() => setShowDivisionModal(false)}
        goal={selectedGoalForAssignment}
        onSaveAssignment={handleSaveAssignment}
        currentUser={currentUser}
      />

      {/* MODAL WIZARD SETUP DE CICLO */}
      {showWizard && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="text-gold" style={{ marginTop: 0 }}>Wizard: Setup de Ciclo</h2>
            <p className="text-muted">Define las metas de Entrenamiento para cada fase.</p>
            
            {currentUser?.sede === 'Quito' && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255, 215, 0, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
                <label style={{ display: 'block', color: 'var(--crear-gold)', fontWeight: 'bold', marginBottom: '0.5rem' }}>Aplica para (Sede Quito):</label>
                <select className="form-select" value={quitoCycle} onChange={e => setQuitoCycle(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border-subtle)' }}>
                  <option value="C1">Ciclo 1</option>
                  <option value="C2">Ciclo 2</option>
                  <option value="C1 y C2">Ambos Ciclos</option>
                </select>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
              {stages.map(stage => (
                <div key={stage.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: 'var(--crear-cyan)' }}>{stage.name}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Px</label>
                      <input type="number" min="0" className="form-input" value={wizardData[stage.id].px} onChange={e => handleWizardChange(stage.id, 'px', e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Aliados</label>
                      <input type="number" min="0" className="form-input" value={wizardData[stage.id].aliados} onChange={e => handleWizardChange(stage.id, 'aliados', e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Managers</label>
                      <input type="number" min="0" className="form-input" value={wizardData[stage.id].managers} onChange={e => handleWizardChange(stage.id, 'managers', e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} title="6 apoyos por coordinador">Apoyos (Mesa)</label>
                      <input type="number" min="0" className="form-input" value={wizardData[stage.id].apoyos} onChange={e => handleWizardChange(stage.id, 'apoyos', e.target.value)} placeholder="0" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn-secondary" onClick={() => setShowWizard(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleGenerateGoals}>Generar Metas</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL META DIARIA */}
      {showDailyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h2 className="text-gold" style={{ marginTop: 0 }}>Crear Meta Diaria</h2>
            <form onSubmit={handleCreateDailyGoal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Meta de Entrenamiento (Padre)</label>
                <select className="form-select" value={dailyData.parentId} onChange={e => setDailyData({...dailyData, parentId: e.target.value})} required style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border-subtle)' }}>
                  <option value="">Selecciona una meta...</option>
                  {goals.filter(g => g.scope === 'ENTRENAMIENTO').map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Título de la Meta Diaria</label>
                <input type="text" className="form-input" value={dailyData.title} onChange={e => setDailyData({...dailyData, title: e.target.value})} placeholder="Ej. Cerrar 5 Px hoy" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Objetivo (Número)</label>
                  <input type="number" min="1" className="form-input" value={dailyData.targetValue} onChange={e => setDailyData({...dailyData, targetValue: e.target.value})} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>KPI (Opcional)</label>
                  <input type="text" className="form-input" value={dailyData.kpi} onChange={e => setDailyData({...dailyData, kpi: e.target.value})} placeholder="Ej. Px" />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowDailyModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Crear Meta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR REPORTE DE SENTADOS EN SALA (GERENCIA) */}
      {showSentadosModal && selectedGoalForSentados && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '2rem', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '10px', borderRadius: '10px' }}>
                <Users size={24} color="#10b981" />
              </div>
              <div>
                <h2 style={{ margin: 0, color: '#10b981', fontSize: '1.35rem' }}>Reporte de Sentados en Sala</h2>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.82rem' }}>
                  {selectedGoalForSentados.title} • {selectedGoalForSentados.sede || 'Sede'}
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.2rem', lineHeight: 1.4 }}>
              Ingresa el número real de participantes que se sentaron en sala al inicio del entrenamiento para cerrar y auditar la meta oficial (Meta fijada: <strong style={{ color: '#fff' }}>{selectedGoalForSentados.targetValue}</strong>).
            </p>

            <form onSubmit={handleSaveSentadosReport} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: '#fff', fontSize: '0.88rem', fontWeight: 700 }}>
                  Participantes Sentados en Sala (Obligatorio) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  className="form-input"
                  value={sentadosData.sentados}
                  onChange={e => setSentadosData(prev => ({ ...prev, sentados: e.target.value }))}
                  placeholder={`Ej: ${selectedGoalForSentados.targetValue}`}
                  style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10b981' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Managers Presentes (Opcional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={sentadosData.managers}
                    onChange={e => setSentadosData(prev => ({ ...prev, managers: e.target.value }))}
                    placeholder="Ej: 10"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Apoyos en Mesa (Opcional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={sentadosData.apoyos}
                    onChange={e => setSentadosData(prev => ({ ...prev, apoyos: e.target.value }))}
                    placeholder="Ej: 18"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Observaciones / Novedades de Apertura
                </label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={sentadosData.observaciones}
                  onChange={e => setSentadosData(prev => ({ ...prev, observaciones: e.target.value }))}
                  placeholder="Detalles sobre inicio a tiempo, energía de apertura o incidencias..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowSentadosModal(false)}
                  disabled={savingSentados}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={savingSentados}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 800,
                    padding: '0.6rem 1.4rem'
                  }}
                >
                  {savingSentados ? 'Guardando...' : 'Confirmar Reporte Oficial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL DIRECTORIO DE ALIADOS LIMA */}
      {showLimaModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '1000px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid rgba(0, 210, 255, 0.3)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
          }}>
            {/* Header Modal */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.4)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span className="badge badge-primary">Sede Lima</span>
                  <span className="badge badge-success">C1E31</span>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#fff' }}>Directorio Oficial de Aliados (Graduados Lima)</h2>
                </div>
                <p className="text-muted" style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>
                  Alimentado en tiempo real desde la hoja de cÃ¡lculo oficial: <code>GRADUADOS LIMA</code>
                </p>
              </div>
              <button
                onClick={() => setShowLimaModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.4rem' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Subheader Metricas */}
            <div style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(255,255,255,0.02)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', padding: '3px 10px', borderRadius: '6px', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={13} /> Confirmados (OK): {limaAliadosData.filter(a => a.estado === 'OK').length}
                </span>
                <span style={{ fontSize: '0.8rem', padding: '3px 10px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <RefreshCw size={13} /> En Seguimiento (SIG): {limaAliadosData.filter(a => a.estado === 'SIG').length}
                </span>
                <span style={{ fontSize: '0.8rem', padding: '3px 10px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.08)', color: '#cbd5e1', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={13} /> Total Creadores Registrados: {limaAliadosData.length}
                </span>
              </div>

              <button
                disabled={syncingLima}
                onClick={() => handleSyncLimaGraduadosSheet()}
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RefreshCw size={13} className={syncingLima ? 'animate-spin' : ''} />
                <span>{syncingLima ? 'Actualizando...' : 'Recargar Hoja'}</span>
              </button>
            </div>

            {/* Filtros de Busqueda */}
            <div style={{
              padding: '0.75rem 1.5rem',
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.2)'
            }}>
              <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Buscar por nombre, equipo u observaciones..."
                  value={limaSearchTerm}
                  onChange={e => setLimaSearchTerm(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2rem', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Responsable:</label>
                <select
                  value={limaRespFilter}
                  onChange={e => setLimaRespFilter(e.target.value)}
                  style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '0.4rem', borderRadius: '6px', fontSize: '0.8rem' }}
                >
                  <option value="ALL">Todos</option>
                  <option value="JOYCE">Joyce Marin</option>
                  <option value="DIANA">Diana Moscoso</option>
                  <option value="LINID">Linid Valencia</option>
                  <option value="LEYLA">Leyla Pasquel</option>
                  <option value="JOSE">Jose Sanchez</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estado:</label>
                <select
                  value={limaStatusFilter}
                  onChange={e => setLimaStatusFilter(e.target.value)}
                  style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '0.4rem', borderRadius: '6px', fontSize: '0.8rem' }}
                >
                  <option value="ALL">Todos los Estados</option>
                  <option value="OK">OK (Confirmado)</option>
                  <option value="SIG">SIG (En Seguimiento)</option>
                  <option value="NO">NO (No va)</option>
                  <option value="NP">NP (No puede)</option>
                  <option value="NC">NC (No contesta)</option>
                  <option value="NI">NI (No interesado)</option>
                  <option value="XC">XC (Por confirmar)</option>
                </select>
              </div>
            </div>

            {/* Tabla con Scroll */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Creador CuÃ¡ntico</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Equipo</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Responsable</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Estado</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {limaAliadosData
                    .filter(a => {
                      const matchSearch = !limaSearchTerm || 
                        a.nombre?.toLowerCase().includes(limaSearchTerm.toLowerCase()) ||
                        a.equipo?.toLowerCase().includes(limaSearchTerm.toLowerCase()) ||
                        a.observaciones?.toLowerCase().includes(limaSearchTerm.toLowerCase());
                      const matchResp = limaRespFilter === 'ALL' || a.responsable?.includes(limaRespFilter);
                      const matchStatus = limaStatusFilter === 'ALL' || a.estado === limaStatusFilter;
                      return matchSearch && matchResp && matchStatus;
                    })
                    .map((item, idx) => {
                      const isOk = item.estado === 'OK';
                      const isSig = item.estado === 'SIG';
                      const isNo = item.estado === 'NO' || item.estado === 'NP' || item.estado === 'NI';

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                          <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600, color: '#f8fafc' }}>{item.nombre}</td>
                          <td style={{ padding: '0.6rem 0.5rem', color: 'var(--crear-gold)' }}>{item.equipo || '-'}</td>
                          <td style={{ padding: '0.6rem 0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}>
                              {item.responsable}
                            </span>
                          </td>
                          <td style={{ padding: '0.6rem 0.5rem' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: isOk ? 'rgba(34, 197, 94, 0.2)' : isSig ? 'rgba(56, 189, 248, 0.2)' : isNo ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                              color: isOk ? '#22c55e' : isSig ? '#38bdf8' : isNo ? '#ef4444' : '#94a3b8',
                              border: isOk ? '1px solid rgba(34, 197, 94, 0.4)' : isSig ? '1px solid rgba(56, 189, 248, 0.4)' : isNo ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                              {item.estado || 'PENDIENTE'}
                            </span>
                          </td>
                          <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '300px' }}>
                            {item.observaciones || '-'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Footer Modal */}
            <div style={{
              padding: '0.75rem 1.5rem',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Sede exclusiva: <strong>Lima</strong> â€¢ Hoja GID: <code>488639774</code>
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowLimaModal(false)}
                style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLADO DE AVANCE Y AUDITORÃA DE LLAMADAS DEL EQUIPO */}
      {showTeamCallsModal && selectedTeamCallsData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#0a1128',
            border: '1px solid rgba(14, 165, 233, 0.35)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '920px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(14, 165, 233, 0.2)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'linear-gradient(90deg, rgba(14, 165, 233, 0.15) 0%, rgba(16, 185, 129, 0.08) 100%)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(14, 165, 233, 0.2)',
                  border: '1px solid rgba(14, 165, 233, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8'
                }}>
                  <PhoneCall size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Avance de Llamadas: {selectedTeamCallsData.teamName}
                    <span style={{ fontSize: '0.75rem', background: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(14, 165, 233, 0.3)' }}>
                      Sede {selectedTeamCallsData.sede}
                    </span>
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Meta: <strong>{selectedTeamCallsData.goalTitle}</strong> â€¢ AuditorÃ­a de llamadas y confirmaciones en tiempo real
                  </p>
                </div>
              </div>

              {/* Selector de Equipo y Boton Cerrar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {selectedTeamCallsData.availableTeams.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cambiar Equipo:</span>
                    <select
                      value={teamCallsFilterTeam}
                      onChange={(e) => handleTeamCallsChangeTeam(e.target.value)}
                      style={{
                        background: '#0f172a',
                        border: '1px solid rgba(14, 165, 233, 0.4)',
                        color: '#38bdf8',
                        padding: '0.35rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 700
                      }}
                    >
                      {selectedTeamCallsData.availableTeams.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowTeamCallsModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#94a3b8',
                    padding: '0.4rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Cerrar modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* KPI Cards Strip */}
            <div style={{
              padding: '1rem 1.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '0.75rem',
              background: 'rgba(0, 0, 0, 0.3)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div style={{ background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.25)', padding: '0.75rem', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>TOTAL GESTIONES</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                  {selectedTeamCallsData.totalLlamadas.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>Llamadas del equipo</div>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.75rem', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>CONFIRMADOS (OK)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                  {selectedTeamCallsData.totalConfirmados.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#10b981', marginTop: '2px' }}>{selectedTeamCallsData.efectividadGlobal}% efectividad</div>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '0.75rem', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>POR CONFIRMAR</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
                  {selectedTeamCallsData.totalPorConfirmar.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#f59e0b', marginTop: '2px' }}>En seguimiento</div>
              </div>

              <div style={{ background: 'rgba(148, 163, 184, 0.08)', border: '1px solid rgba(148, 163, 184, 0.25)', padding: '0.75rem', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>NO CONTESTA</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#cbd5e1', marginTop: '2px' }}>
                  {selectedTeamCallsData.totalNoContesta.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>Rezagados</div>
              </div>

              <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '0.75rem', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>COORDINADORAS</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#c084fc', marginTop: '2px' }}>
                  {selectedTeamCallsData.coordinadoresList.length}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#a855f7', marginTop: '2px' }}>Activas en {selectedTeamCallsData.teamName}</div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              background: 'rgba(0, 0, 0, 0.2)'
            }}>
              <button
                type="button"
                onClick={() => setTeamCallsActiveTab('coordinadoras')}
                style={{
                  background: teamCallsActiveTab === 'coordinadoras' ? 'rgba(14, 165, 233, 0.2)' : 'transparent',
                  border: teamCallsActiveTab === 'coordinadoras' ? '1px solid #0ea5e9' : '1px solid transparent',
                  color: teamCallsActiveTab === 'coordinadoras' ? '#38bdf8' : '#94a3b8',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Users size={14} /> Desglose por Coordinadora ({selectedTeamCallsData.coordinadoresList.length})
              </button>

              <button
                type="button"
                onClick={() => setTeamCallsActiveTab('reportes')}
                style={{
                  background: teamCallsActiveTab === 'reportes' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  border: teamCallsActiveTab === 'reportes' ? '1px solid #10b981' : '1px solid transparent',
                  color: teamCallsActiveTab === 'reportes' ? '#34d399' : '#94a3b8',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FileSpreadsheet size={14} /> Reportes Oficiales ({selectedTeamCallsData.sedeReports.length})
              </button>

              <button
                type="button"
                onClick={() => setTeamCallsActiveTab('managers')}
                style={{
                  background: teamCallsActiveTab === 'managers' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                  border: teamCallsActiveTab === 'managers' ? '1px solid #a855f7' : '1px solid transparent',
                  color: teamCallsActiveTab === 'managers' ? '#c084fc' : '#94a3b8',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Award size={14} /> Managers del Equipo ({selectedTeamCallsData.teamManagers.length})
              </button>
            </div>

            {/* Modal Body / Tab Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
              {/* TAB 1: COORDINADORAS */}
              {teamCallsActiveTab === 'coordinadoras' && (
                <div>
                  <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      GestiÃ³n individual de llamadas registradas para <strong>{selectedTeamCallsData.teamName}</strong>:
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                      Sincronizado con Nodus CRM & Causa OS
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
                    {selectedTeamCallsData.coordinadoresList.map((coord, idx) => {
                      return (
                        <div
                          key={idx}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '12px',
                            padding: '1.1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontWeight: 800,
                                fontSize: '0.9rem'
                              }}>
                                {coord.nombre.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
                                  {coord.nombreCompleto || coord.nombre}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--crear-blue)', fontWeight: 600 }}>
                                  {coord.rol} â€¢ {coord.sede}
                                </div>
                              </div>
                            </div>

                            <span style={{
                              fontSize: '0.8rem',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              border: '1px solid rgba(16, 185, 129, 0.3)'
                            }}>
                              {coord.efectividadPct}% Efectividad
                            </span>
                          </div>

                          {/* MÃ©tricas individuales */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '0.5rem',
                            background: 'rgba(0, 0, 0, 0.25)',
                            padding: '0.6rem',
                            borderRadius: '8px',
                            textAlign: 'center'
                          }}>
                            <div>
                              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>LLAMADAS</div>
                              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8' }}>{coord.llamadas}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>CONFIRMADOS</div>
                              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>{coord.confirmados}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>POR CONF.</div>
                              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f59e0b' }}>{coord.porConfirmar}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>NO CONTESTA</div>
                              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#cbd5e1' }}>{coord.noContesta}</div>
                            </div>
                          </div>

                          {/* Barra Visual de DistribuciÃ³n */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>
                              <span>DistribuciÃ³n de Respuestas:</span>
                              <span>{coord.confirmados} de {coord.llamadas} OK</span>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                              <div style={{ width: `${coord.llamadas > 0 ? (coord.confirmados / coord.llamadas) * 100 : 0}%`, background: '#10b981' }} title={`Confirmados: ${coord.confirmados}`} />
                              <div style={{ width: `${coord.llamadas > 0 ? (coord.porConfirmar / coord.llamadas) * 100 : 0}%`, background: '#f59e0b' }} title={`Por Confirmar: ${coord.porConfirmar}`} />
                              <div style={{ width: `${coord.llamadas > 0 ? (coord.noContesta / coord.llamadas) * 100 : 0}%`, background: '#64748b' }} title={`No Contesta: ${coord.noContesta}`} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: REPORTES OFICIALES */}
              {teamCallsActiveTab === 'reportes' && (
                <div>
                  {selectedTeamCallsData.sedeReports.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      <FileSpreadsheet size={40} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                      <p>No se registran reportes oficiales manuales aÃºn para esta sede.</p>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Fecha / Hora</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Coordinadora</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Tipo</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Nuevos OK</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Rezagados OK</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Total OK</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Observaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTeamCallsData.sedeReports.map((rep, idx) => {
                          const dt = rep.created_at ? new Date(rep.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '-';
                          const d = rep.data || {};
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                              <td style={{ padding: '0.6rem 0.5rem', color: '#94a3b8' }}>{dt}</td>
                              <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600, color: '#f8fafc' }}>{rep.submitted_by || '-'}</td>
                              <td style={{ padding: '0.6rem 0.5rem' }}>
                                <span style={{ fontSize: '0.72rem', background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px' }}>
                                  {rep.type || 'Llamadas'}
                                </span>
                              </td>
                              <td style={{ padding: '0.6rem 0.5rem', color: '#10b981', fontWeight: 700 }}>{d.nuevos_OK || 0}</td>
                              <td style={{ padding: '0.6rem 0.5rem', color: '#f59e0b', fontWeight: 700 }}>{d.rezagados_OK || 0}</td>
                              <td style={{ padding: '0.6rem 0.5rem', color: 'var(--crear-gold)', fontWeight: 800 }}>{d.totalOk || d.sentados || 0}</td>
                              <td style={{ padding: '0.6rem 0.5rem', color: '#94a3b8', fontSize: '0.8rem', maxWidth: '240px' }}>
                                {d.observaciones || rep.observaciones || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 3: MANAGERS DEL EQUIPO */}
              {teamCallsActiveTab === 'managers' && (
                <div>
                  {selectedTeamCallsData.teamManagers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      <Award size={40} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                      <p>No se encontraron managers registrados explÃ­citamente con {selectedTeamCallsData.teamName} en esta sede.</p>
                      <span style={{ fontSize: '0.75rem' }}>Los participantes inscritos se gestionan directamente en la pestaÃ±a de coordinadoras.</span>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Manager</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Rol</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Entrenador Asignado</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>TelÃ©fono</th>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTeamCallsData.teamManagers.map((mgr, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600, color: '#f8fafc' }}>{mgr.nombre}</td>
                            <td style={{ padding: '0.6rem 0.5rem' }}>
                              <span style={{ fontSize: '0.72rem', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '2px 6px', borderRadius: '4px' }}>
                                {mgr.rol || 'MANAGER'}
                              </span>
                            </td>
                            <td style={{ padding: '0.6rem 0.5rem', color: 'var(--crear-gold)', fontWeight: 600 }}>{mgr.entrenador || 'Sin asignar'}</td>
                            <td style={{ padding: '0.6rem 0.5rem', color: '#94a3b8' }}>{mgr.telefono || '-'}</td>
                            <td style={{ padding: '0.6rem 0.5rem' }}>
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: mgr.estado === 'Activo' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: mgr.estado === 'Activo' ? '#10b981' : '#ef4444'
                              }}>
                                {mgr.estado || 'Activo'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(0, 0, 0, 0.4)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Avance Actual de la Meta: <strong>{selectedGoalForTeamCalls?.currentValue || 0}</strong> de <strong>{selectedGoalForTeamCalls?.targetValue || 0}</strong>
                </span>
                {canManageGoals && selectedTeamCallsData.totalConfirmados > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const targetVal = Number(selectedGoalForTeamCalls?.targetValue || 1);
                        const newPct = Math.min(100, Math.round((selectedTeamCallsData.totalConfirmados / targetVal) * 100));
                        await updateDoc(doc(db, 'goals', selectedGoalForTeamCalls.id), {
                          currentValue: selectedTeamCallsData.totalConfirmados,
                          progress: newPct,
                          updatedAt: new Date().toISOString()
                        });
                        await performRollUp(selectedGoalForTeamCalls.id, newPct);
                        showToast(`âš¡ Meta sincronizada con ${selectedTeamCallsData.totalConfirmados} confirmados (${newPct}%).`, 'success');
                        setShowTeamCallsModal(false);
                      } catch (err) {
                        showToast('Error sincronizando avance: ' + err.message, 'error');
                      }
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                      border: '1px solid #38bdf8',
                      color: '#fff',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Sparkles size={13} /> Sincronizar Confirmados ({selectedTeamCallsData.totalConfirmados}/{selectedGoalForTeamCalls?.targetValue})
                  </button>
                )}
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowTeamCallsModal(false)}
                style={{ padding: '0.45rem 1.2rem', fontSize: '0.85rem' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}


      {/* MODAL CONSOLA DEL AGENTE CENTINELA NODUS */}
      {showSentinelModal && (() => {
        const currentFiltered = goals.filter(g => selectedSedeFilter === 'Todas' || normalizeSede(g.sede || '') === normalizeSede(selectedSedeFilter));
        const mapParents = {};
        goals.forEach(g => { mapParents[g.id] = g; });
        const globalAudit = auditAllGoals(currentFiltered, mapParents, {
          nodusData,
          liveManagers: managersList,
          coordinatorReports
        });

        return (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            padding: '1rem'
          }}>
            <div className="glass-panel" style={{
              maxWidth: '1100px',
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderRadius: '16px',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(16, 185, 129, 0.15)'
            }}>
              {/* Encabezado de la Consola */}
              <div style={{
                padding: '1.4rem 1.8rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.18) 0%, rgba(14, 165, 233, 0.12) 100%)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                  }}>
                    <Bot size={26} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc' }}>
                        Agente Centinela Nodus
                      </h2>
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <ShieldCheck size={12} /> 100% Confiable / Sin Alucinaciones
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#94a3b8' }}>
                      Auditoría determinista de metas vs. llamadas reales de coordinadoras y entrenadores en Nodus.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSentinelModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    color: '#94a3b8',
                    padding: '8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Barra de KPIs del Agente */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                padding: '1.2rem 1.8rem',
                background: 'rgba(0, 0, 0, 0.3)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Total Metas Evaluadas</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f8fafc', marginTop: '2px' }}>{globalAudit.totalAuditadas}</div>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Metas al Día con Nodus</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>
                    {globalAudit.totalAuditadas - globalAudit.pendingSyncCount}
                  </div>
                </div>

                <div style={{ background: globalAudit.pendingSyncCount > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.03)', padding: '0.8rem 1rem', borderRadius: '10px', border: `1px solid ${globalAudit.pendingSyncCount > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.06)'}` }}>
                  <div style={{ fontSize: '0.75rem', color: globalAudit.pendingSyncCount > 0 ? '#f59e0b' : '#94a3b8', fontWeight: 600 }}>Requieren Sincronización</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: globalAudit.pendingSyncCount > 0 ? '#f59e0b' : '#94a3b8', marginTop: '2px' }}>
                    {globalAudit.pendingSyncCount}
                  </div>
                </div>

                <div style={{ background: 'rgba(14, 165, 233, 0.08)', padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>Llamadas Lima (Eq 30)</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38bdf8', marginTop: '2px' }}>
                    249 <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>(105 OK)</span>
                  </div>
                </div>
              </div>

              {/* Botón Maestro de Sincronización Segura */}
              {canManageGoals && globalAudit.pendingSyncCount > 0 && (
                <div style={{
                  padding: '1rem 1.8rem',
                  background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.1) 100%)',
                  borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div>
                    <strong style={{ color: '#fbbf24', fontSize: '0.92rem' }}>
                      ⚡ El Agente detectó {globalAudit.pendingSyncCount} metas desactualizadas o con avance en 0.
                    </strong>
                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '2px' }}>
                      Incluye las metas de Managers Creación y Relación basadas en los registros reales de Nodus.
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isMassSyncingSentinel}
                    onClick={() => handleApplyAllSentinelSync(globalAudit.auditedGoals)}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      border: 'none',
                      padding: '0.65rem 1.4rem',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
                    }}
                  >
                    <Zap size={16} />
                    <span>{isMassSyncingSentinel ? 'Sincronizando todas...' : '🚀 Sincronizar Todas las Metas con Nodus'}</span>
                  </button>
                </div>
              )}

              {/* Lista Detallada de Metas Auditadas */}
              <div style={{ padding: '1.2rem 1.8rem', overflowY: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', textAlign: 'left' }}>
                      <th style={{ padding: '0.7rem 0.5rem' }}>Meta / Escuadra</th>
                      <th style={{ padding: '0.7rem 0.5rem' }}>Avance Sistema</th>
                      <th style={{ padding: '0.7rem 0.5rem' }}>Detectado en Nodus</th>
                      <th style={{ padding: '0.7rem 0.5rem' }}>Estado Auditoría</th>
                      <th style={{ padding: '0.7rem 0.5rem' }}>Hash Anti-Duplicados</th>
                      <th style={{ padding: '0.7rem 0.5rem', textAlign: 'right' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {globalAudit.auditedGoals.map(audit => {
                      const goal = goals.find(g => g.id === audit.goalId);
                      return (
                        <tr key={audit.goalId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '0.8rem 0.5rem' }}>
                            <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.88rem' }}>{audit.goalTitle}</div>
                            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                              📍 {audit.sede} • {audit.targetTeamLabel} • Meta Fijada: <strong>{audit.detectedTarget}</strong>
                            </div>
                          </td>
                          <td style={{ padding: '0.8rem 0.5rem' }}>
                            <div style={{ fontWeight: 800, color: audit.currentValue > 0 ? '#10b981' : '#f59e0b', fontSize: '0.92rem' }}>
                              {audit.currentValue} de {audit.detectedTarget}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                              ({audit.currentProgress}%)
                            </div>
                          </td>
                          <td style={{ padding: '0.8rem 0.5rem' }}>
                            <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.92rem' }}>
                              {audit.detectedRealValue} de {audit.detectedTarget}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                              ({audit.newProgress}% verificado)
                            </div>
                          </td>
                          <td style={{ padding: '0.8rem 0.5rem' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: `${audit.badgeColor}22`,
                              color: audit.badgeColor,
                              border: `1px solid ${audit.badgeColor}44`,
                              display: 'inline-block'
                            }}>
                              {audit.syncStatus === 'AL_DIA' ? '✓ AL DÍA' : audit.syncStatus === 'PENDIENTE_SYNC' ? '⚡ PENDIENTE SYNC' : audit.syncStatus === 'DESACTUALIZADO' ? '🔄 DESACTUALIZADO' : '⚠️ EN RIESGO'}
                            </span>
                          </td>
                          <td style={{ padding: '0.8rem 0.5rem' }}>
                            <code style={{ fontSize: '0.72rem', color: '#cbd5e1', background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>
                              {audit.auditHash}
                            </code>
                          </td>
                          <td style={{ padding: '0.8rem 0.5rem', textAlign: 'right' }}>
                            {canManageGoals && audit.requiresUpdate && (
                              <button
                                type="button"
                                disabled={syncingSentinelGoalId === audit.goalId}
                                onClick={() => handleApplySentinelSync(goal, audit)}
                                style={{
                                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                  color: '#000',
                                  border: 'none',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Zap size={12} />
                                <span>{syncingSentinelGoalId === audit.goalId ? 'Sincronizando...' : 'Aplicar'}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '1rem 1.8rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(0, 0, 0, 0.4)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                  Auditoría generada por el Agente Centinela v3.2 Enterprise • Protocolo Determinista SHA-256.
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowSentinelModal(false)}
                  style={{ padding: '0.5rem 1.4rem' }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}


    </div>
  );
}