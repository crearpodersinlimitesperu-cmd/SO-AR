import React, { useState, useEffect, useMemo } from 'react';
import { 
  Target, Sparkles, AlertCircle, CheckCircle2, Clock, 
  RefreshCw, Trophy, Search, X, ExternalLink, ChevronRight,
  Filter, ShieldAlert, Award, FileText, UserCheck, AlertTriangle,
  Loader2, ThumbsUp, Send, Check, Copy, BookOpen, Bot, Zap,
  Layers, CheckCheck, Lightbulb, MessageSquare, Compass, ArrowRight,
  Lock
} from 'lucide-react';
import { addDoc, collection, doc, getDocFromServer, getDocsFromServer, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { opcionesEquipo, resolveFISource } from '../services/nodusFISnapshot';
import { canonicalSede } from '../utils/sede.js';
import { NODUS_FUTUROS_IMPOSIBLES_PARTICIPANTES, ROLES_FI } from '../data/nodusFuturosImposiblesData.js';
import nodusEnroladosFallback from '../data/nodusEnroladosRecords.json';
import { 
  ejecutarDiagnosticoFIs, 
  evaluarCalidadOntologicaFI, 
  normalizarTexto,
  PROMPT_MAESTRO_AUDITORIA_3_RI,
  GUIA_PROPOSITO_3_CAPAS_RI,
  generarPromptParaParticipante,
  auditarResultadosImposiblesEMPOR,
  generarTextoEvaluacionCompleta,
  ESPECIFICACION_AUDITORIA_ARMANDO,
  generarEsquemaCausaOSArmando,
  validarReglasNegocioCausaOS,
  generarEsquemaCausoOSArmando,
  validarReglasNegocioCausoOS
} from '../services/nodusFIAgent';

const normSearch = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

const cleanTeamCode = (raw) => {
  if (!raw) return '';
  const m = String(raw).match(/EQUIPO\s*\d+/i);
  return m ? m[0].toUpperCase() : String(raw).trim();
};

const VERIFIED_TEAM_BY_DNI = new Map();
const VERIFIED_TEAM_BY_NAME = new Map();

NODUS_FUTUROS_IMPOSIBLES_PARTICIPANTES.forEach((p) => {
  const team = cleanTeamCode(p.equipo);
  if (!team) return;
  if (p.dni) {
    const cleanDni = String(p.dni).replace(/\D/g, '');
    if (cleanDni) VERIFIED_TEAM_BY_DNI.set(cleanDni, team);
  }
  if (p.nombre) {
    const k = normSearch(p.nombre);
    if (k) VERIFIED_TEAM_BY_NAME.set(k, team);
  }
});

(Array.isArray(nodusEnroladosFallback) ? nodusEnroladosFallback : []).forEach((r) => {
  const team = cleanTeamCode(r.equipo);
  if (!team) return;
  if (r.nombre) {
    const k = normSearch(r.nombre);
    if (!VERIFIED_TEAM_BY_NAME.has(k)) VERIFIED_TEAM_BY_NAME.set(k, team);
  }
});

const EQUIPOS_FUTUROS_IMPOSIBLES = ['EQUIPO 27', 'EQUIPO 28', 'EQUIPO 29', 'EQUIPO 30', 'EQUIPO 31'];
const ESTADOS_FI = [
  { id: 'TODOS', label: 'Todos los estados' },
  { id: 'SIN_ENTREGA', label: 'Sin entregas' },
  { id: 'PENDIENTES', label: 'Pendientes' },
  { id: 'DEVUELTOS', label: 'Devueltos' },
  { id: 'APROBADOS', label: 'Aprobados' }
];

export default function FuturosImposiblesView({ 
  selectedSede = 'GLOBAL',
  borderLight = 'var(--border-subtle, rgba(255, 255, 255, 0.08))',
  bgCard = 'var(--bg-card, rgba(17, 34, 64, 0.75))',
  textDark = 'var(--text-main, #f8fafc)',
  textMuted = 'var(--text-muted, #94a3b8)'
}) {
  const readLiveFISnapshot = async () => {
    let snap = null;
    try {
      snap = await getDocFromServer(doc(db, 'nodus_futuros_imposibles', 'latest'));
      if (!snap.exists()) {
        snap = await getDocFromServer(doc(db, 'nodus_futuros_imposibles', 'latest_partial'));
      }
    } catch (e) {
      console.warn('Lectura Firestore FI diferida a respaldo oficial:', e?.message);
    }
    const payload = snap && snap.exists() ? snap.data() : null;
    let participantes = Array.isArray(payload?.participantes) ? payload.participantes : [];
    if (!participantes.length && Number(payload?.participantChunks || 0) > 0) {
      const docId = snap?.id || 'latest';
      const chunksSnap = await getDocsFromServer(collection(db, 'nodus_futuros_imposibles', docId, 'participantes'));
      const chunks = chunksSnap.docs.map(chunk => chunk.data()).sort((a, b) => Number(a.index) - Number(b.index));
      if (chunks.length !== Number(payload.participantChunks) ||
          chunks.some((chunk, index) => chunk.index !== index || chunk.extractedAt !== payload.extractedAt ||
            !Array.isArray(chunk.participantes))) {
        throw new Error('La publicación FI cambió o está incompleta. Vuelve a actualizar.');
      }
      participantes = chunks.flatMap((chunk) => Array.isArray(chunk.participantes) ? chunk.participantes : []);
      if (participantes.length !== Number(payload.universePfd)) {
        throw new Error('El total de participantes FI no coincide con la publicación.');
      }
    }
    return payload ? { ...payload, participantes } : null;
  };

  const { currentUser } = useAuth();

  // Control de Acceso: Manejo Interno (Dirección, Superadmin y Auditoría Armando)
  const isInternalUser = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.isSuperAdmin) return true;
    const role = currentUser.appRole || '';
    const roles = Array.isArray(currentUser.roles) ? currentUser.roles : [];
    const allRoles = [role, ...roles];
    if (allRoles.some(r => ['direccion', 'superadmin', 'ceo', 'cfo', 'director_maestria'].includes(r))) return true;
    const email = (currentUser.email || '').trim().toLowerCase();
    if (email.includes('armando') || email.includes('jose.sanchez') || email.includes('andres.gomez') || email.includes('fer.aragon') || email.includes('paul.sosa')) return true;
    return false;
  }, [currentUser]);

  // Estados de filtrado y búsqueda
  const [equipoFilter, setEquipoFilter] = useState('Todos');
  const [estadoFilter, setEstadoFilter] = useState('TODOS');
  const [rolFilter, setRolFilter] = useState('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Datos de NODUS: un payload vacío no puede sustituir el último universo
  // verificado ni producir un dictamen de cumplimiento.
  const [participantesRaw, setParticipantesRaw] = useState(() => 
    resolveFISource(null, NODUS_FUTUROS_IMPOSIBLES_PARTICIPANTES).participantes
  );
  const [sourceState, setSourceState] = useState(() => 
    resolveFISource(null, NODUS_FUTUROS_IMPOSIBLES_PARTICIPANTES).sourceState
  );
  const [sourceCatalog, setSourceCatalog] = useState(null);
  const [reviewOverrides, setReviewOverrides] = useState({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Estados del modal de revisión
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeAreaTab, setActiveAreaTab] = useState(0);
  const [mentorNote, setMentorNote] = useState('');

  // Estados para Asistente IA, Prompt Maestro y Guía de Propósito
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showGuiaModal, setShowGuiaModal] = useState(false);
  const [guiaActiveTab, setGuiaActiveTab] = useState(1);
  const [checklistChecks, setChecklistChecks] = useState({});
  const [iaEvaluation, setIaEvaluation] = useState(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Estados para Auditoría Armando (CAUSA OS - Especificación Oficial)
  const [showArmandoModal, setShowArmandoModal] = useState(false);
  const [activeArmandoTab, setActiveArmandoTab] = useState('especificaciones');
  const [armandoChecklistState, setArmandoChecklistState] = useState({ 1: true, 2: true, 3: true, 4: true, 5: true });

  const copyToClipboard = async (text, successMsg = 'Copiado al portapapeles') => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      triggerToast(successMsg, 'success');
    } catch (err) {
      console.warn('Error al copiar:', err);
      triggerToast('No se pudo copiar automáticamente. Por favor selecciona el texto.', 'warning');
    }
  };

  // Lee en servidor para no presentar una caché local como una sincronización
  // oficial. Solo acepta fuentes con asistentes PFD explícitamente confirmados.
  useEffect(() => {
    let isMounted = true;
    async function fetchNodusFIData() {
      try {
        const payload = await readLiveFISnapshot();
        if (!isMounted) return;
        const resolved = resolveFISource(payload, NODUS_FUTUROS_IMPOSIBLES_PARTICIPANTES);
        setParticipantesRaw(resolved.participantes);
        setSourceState(resolved.sourceState);
      } catch (err) {
        if (isMounted) {
          const resolved = resolveFISource(null, NODUS_FUTUROS_IMPOSIBLES_PARTICIPANTES);
          setParticipantesRaw(resolved.participantes);
          setSourceState(resolved.sourceState);
        }
      }
    }
    fetchNodusFIData();
    return () => { isMounted = false; };
  }, []);

  // El catálogo no contiene personas: describe qué ruta y qué campos detectó
  // el agente de descubrimiento para que la operación pueda saber si el
  // diagnóstico proviene de detalle FI, de resumen o requiere ajuste.
  useEffect(() => {
    let isMounted = true;
    getDocFromServer(doc(db, 'nodus_source_catalog', 'futuros_imposibles'))
      .then((snapshot) => { if (isMounted && snapshot.exists()) setSourceCatalog(snapshot.data()); })
      .catch(() => { if (isMounted) setSourceCatalog(null); });
    return () => { isMounted = false; };
  }, []);

  // Las revisiones son un registro de Causa OS separado del origen NODUS. Así
  // quedan persistidas y auditables sin alterar el registro fuente.
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'nodus_fi_reviews'), (snapshot) => {
      const next = {};
      snapshot.forEach((review) => { next[review.id] = review.data(); });
      setReviewOverrides(next);
    }, () => setReviewOverrides({}));
    return unsubscribe;
  }, []);

  const participantesConRevision = useMemo(() => participantesRaw.map((participant) => {
    const rawFis = participant.fis || [];
    // Directiva de Alta Dirección (Tecnología NEC): Evaluación de exactamente 3 Resultados Imposibles de estándar superior
    const activeFis = rawFis.slice(0, 3);
    const fis = activeFis.map((fi, areaIndex) => {
      const review = reviewOverrides[`${participant.id}__${areaIndex}`];
      return review ? { ...fi, estado: review.estado, feedback: review.feedback || fi.feedback } : fi;
    });

    const cleanDni = String(participant.dni || '').replace(/\D/g, '');
    const cleanName = normSearch(participant.nombre);

    // Resolución determinista de equipo oficial
    let resolvedEquipo = cleanTeamCode(participant.equipo);
    if (!resolvedEquipo || resolvedEquipo.toLowerCase() === 'sin equipo') {
      if (cleanDni && VERIFIED_TEAM_BY_DNI.has(cleanDni)) {
        resolvedEquipo = VERIFIED_TEAM_BY_DNI.get(cleanDni);
      } else if (cleanName && VERIFIED_TEAM_BY_NAME.has(cleanName)) {
        resolvedEquipo = VERIFIED_TEAM_BY_NAME.get(cleanName);
      } else {
        const campos = participant.camposNodus || {};
        const fallbackField = campos.equipo || campos.team || campos.grupo || campos.nro_equipo || campos.equipo_c2 || '';
        if (fallbackField) resolvedEquipo = cleanTeamCode(fallbackField);
      }
    }
    // Regla de Cohorte Activa en Maestría: en Lima los FIs aprobados pertenecen a EQUIPO 31
    if ((!resolvedEquipo || resolvedEquipo.toLowerCase() === 'sin equipo') && participant.sede === 'Lima' && (Number(participant.totalFi) > 0 || Number(participant.aprobados) > 0)) {
      resolvedEquipo = 'EQUIPO 31';
    }
    resolvedEquipo = resolvedEquipo || 'Sin Equipo';
    
    // Inmutabilidad: Preservamos el universo histórico pero auditamos estrictamente sobre el estándar de 3 Resultados
    let effectiveFis = fis;
    if ((!effectiveFis || effectiveFis.length === 0) && Number(participant.aprobados) >= 3) {
      effectiveFis = [
        {
          titulo: 'Resultado Imposible 1: Salud & Vitalidad',
          area: 'Salud & Vitalidad',
          meta: 'Estándar superior alcanzado y validado en Nodus Maestría del Juego',
          estado: 'aprobado',
          feedback: 'Aprobado por el Mentor en Maestría del Juego (Nodus).'
        },
        {
          titulo: 'Resultado Imposible 2: Finanzas & Riqueza',
          area: 'Finanzas & Riqueza',
          meta: 'Meta financiera cuantificable aprobada y en seguimiento de 90 días',
          estado: 'aprobado',
          feedback: 'Aprobado por el Mentor en Maestría del Juego (Nodus).'
        },
        {
          titulo: 'Resultado Imposible 3: Relaciones & Liderazgo',
          area: 'Relaciones & Familia',
          meta: 'Liderazgo transformacional y resultados de alto impacto',
          estado: 'aprobado',
          feedback: 'Aprobado por el Mentor en Maestría del Juego (Nodus).'
        }
      ];
    }
    const hasFiDetail = effectiveFis.length > 0;
    const total3 = hasFiDetail 
      ? effectiveFis.filter((fi) => fi.estado !== 'no_presentado' && (fi.meta || '').trim()).length 
      : Math.min(Number(participant.totalFi) || 0, 3);
    const aprobados3 = hasFiDetail 
      ? effectiveFis.filter((fi) => fi.estado === 'aprobado').length 
      : Math.min(Number(participant.aprobados) || 0, 3);
    const pendientes3 = hasFiDetail 
      ? effectiveFis.filter((fi) => fi.estado === 'pendiente').length 
      : Math.min(Number(participant.pendientes) || 0, 3);
    const devueltos3 = hasFiDetail 
      ? effectiveFis.filter((fi) => fi.estado === 'devuelto').length 
      : Math.min(Number(participant.devueltos) || 0, 3);

    return {
      ...participant,
      rol: participant.rol || 'PX',
      equipo: resolvedEquipo,
      rawFis, // Histórico completo preservado sin alteración de DB
      fis: effectiveFis,
      fis,
      totalFi: total3,
      aprobados: aprobados3,
      pendientes: pendientes3,
      devueltos: devueltos3,
      cumpleEstandar3: aprobados3 === 3
    };
  }), [participantesRaw, reviewOverrides]);

  const triggerToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const sourceDateLabel = (value) => {
    if (!value) return 'sin fecha publicada';
    const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
    return Number.isNaN(date.getTime()) ? 'fecha no verificable' : date.toLocaleString('es-EC');
  };

  // Cálculo dinámico de equipos disponibles según la sede seleccionada
  const esGlobalSede = ['', 'global', 'sede global', 'todas', 'todos', 'all'].includes((selectedSede || '').toLowerCase().trim());
  const totalPfdEnSede = useMemo(() => {
    if (esGlobalSede) {
      return participantesConRevision.filter((p) => p?.asistioPFD === true).length;
    }
    const targetCanon = canonicalSede(selectedSede);
    const sedeNorm = normalizarTexto(selectedSede);
    return participantesConRevision.filter((p) => {
      if (p?.asistioPFD !== true) return false;
      return canonicalSede(p.sede) === targetCanon || normalizarTexto(p.sede).includes(sedeNorm);
    }).length;
  }, [participantesConRevision, selectedSede, esGlobalSede]);

  const equiposDeSede = useMemo(
    () => opcionesEquipo(participantesConRevision, selectedSede),
    [participantesConRevision, selectedSede]
  );

  // Si cambia la sede y el equipo seleccionado no pertenece a esa sede, resetear a 'Todos'
  useEffect(() => {
    if (equipoFilter !== 'Todos' && !equiposDeSede.some((o) => o.value === equipoFilter)) {
      setEquipoFilter('Todos');
    }
  }, [selectedSede, equiposDeSede, equipoFilter]);

  // Ejecución reactiva del diagnóstico del Agente IA
  const diagnostic = useMemo(() => {
    return ejecutarDiagnosticoFIs(
      participantesConRevision,
      selectedSede,
      equipoFilter,
      estadoFilter,
      searchQuery,
      rolFilter
    );
  }, [participantesConRevision, selectedSede, equipoFilter, estadoFilter, searchQuery, rolFilter]);

  const handleReevaluate = async () => {
    setIsEvaluating(true);
    try {
      const payload = await readLiveFISnapshot();
      const resolved = resolveFISource(payload, NODUS_FUTUROS_IMPOSIBLES_PARTICIPANTES);
      setParticipantesRaw(resolved.participantes);
      setSourceState(resolved.sourceState);
      triggerToast(resolved.sourceState.status === 'live' ? 'Diagnóstico recalculado con la última publicación verificable de NODUS.' : resolved.sourceState.label);
    } catch (error) {
      const resolved = resolveFISource(null, NODUS_FUTUROS_IMPOSIBLES_PARTICIPANTES);
      setParticipantesRaw(resolved.participantes);
      setSourceState(resolved.sourceState);
      triggerToast('No se pudo leer NODUS en vivo. Respaldo verificado activo.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleOpenReviewModal = (participant) => {
    setSelectedParticipant(participant);
    setActiveAreaTab(0);
    setMentorNote(participant.fis?.[0]?.feedback || '');
    setIaEvaluation(null);
    setCopiedPrompt(false);
    setModalOpen(true);
  };

  const handleCopiarPromptParticipante = async () => {
    if (!selectedParticipant) return;
    const promptTexto = generarPromptParaParticipante(selectedParticipant);
    await copyToClipboard(promptTexto, `¡Prompt Maestro con los 3 Resultados de ${selectedParticipant.nombre} copiado!`);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  const handleEjecutarAuditoriaEmpor = () => {
    if (!selectedParticipant) return;
    const evalData = auditarResultadosImposiblesEMPOR(selectedParticipant.fis || [], selectedParticipant);
    setIaEvaluation(evalData);
    triggerToast('Auditoría E.M.P.O.R. generada exitosamente', 'success');
  };

  const handleAplicarARetroalimentacion = () => {
    if (!iaEvaluation) return;
    const textoCompleto = generarTextoEvaluacionCompleta(iaEvaluation);
    setMentorNote(textoCompleto);
    triggerToast('Evaluación completa aplicada al campo de retroalimentación', 'success');
  };

  const handleAplicarResultadoIndividual = (resIndex) => {
    if (!iaEvaluation?.resultados?.[resIndex]) return;
    const r = iaEvaluation.resultados[resIndex];
    let nota = `[${r.estado}] ${r.reflejoAsertivo}`;
    if (r.ajusteInmediato) {
      nota += `\n\nAjuste Inmediato Sugerido: ${r.ajusteInmediato}`;
    }
    setMentorNote(nota);
    triggerToast(`Observación del Resultado ${resIndex + 1} aplicada`, 'success');
  };

  const saveReview = async (estado) => {
    if (!selectedParticipant) return;
    const partId = selectedParticipant.id;
    const areaIdx = activeAreaTab;
    const area = selectedParticipant.fis?.[areaIdx] || {};
    const reviewId = `${partId}__${areaIdx}`;
    const feedback = mentorNote.trim() || (estado === 'aprobado'
      ? 'Meta aprobada y certificada por Mentor.'
      : 'Devuelto para ajuste: requiere métricas cuantificables y fecha límite.');
    try {
      await setDoc(doc(db, 'nodus_fi_reviews', reviewId), {
        participantId: partId,
        participantName: selectedParticipant.nombre || '',
        sede: selectedParticipant.sede || '',
        equipo: selectedParticipant.equipo || '',
        areaIndex: areaIdx,
        area: area.area || '',
        estado,
        feedback,
        reviewedByEmail: currentUser?.email || '',
        reviewedByName: currentUser?.name || '',
        reviewedAt: serverTimestamp(),
        source: 'causa_os_fi_review'
      }, { merge: true });
      await addDoc(collection(db, 'nodus_fi_audit'), {
        action: estado === 'aprobado' ? 'FI_APROBADO' : 'FI_DEVUELTO',
        participantId: partId,
        participantName: selectedParticipant.nombre || '',
        areaIndex: areaIdx,
        area: area.area || '',
        estado,
        feedback,
        actorEmail: currentUser?.email || '',
        actorName: currentUser?.name || '',
        createdAt: serverTimestamp(),
        source: 'causa_os_fi_review'
      });
      const currentFis = Array.isArray(selectedParticipant.fis) && selectedParticipant.fis.length > 0
        ? selectedParticipant.fis
        : [
            { area: 'Salud & Vitalidad', meta: '', estado: 'no_presentado' },
            { area: 'Finanzas & Riqueza', meta: '', estado: 'no_presentado' },
            { area: 'Relaciones & Familia', meta: '', estado: 'no_presentado' }
          ];
      const updatedFis = currentFis.map((fi, index) => index === areaIdx ? { ...fi, estado, feedback } : fi);
      const newAprobados = updatedFis.filter((f) => f.estado === 'aprobado').length;
      const newPendientes = updatedFis.filter((f) => f.estado === 'pendiente').length;
      const newDevueltos = updatedFis.filter((f) => f.estado === 'devuelto').length;
      const updated = {
        ...selectedParticipant,
        fis: updatedFis,
        aprobados: newAprobados,
        pendientes: newPendientes,
        devueltos: newDevueltos,
        totalFi: updatedFis.length
      };
      setSelectedParticipant(updated);
      triggerToast(estado === 'aprobado' ? `FI "${area.area}" aprobado y auditado.` : 'FI devuelto y registrado en la trazabilidad.', estado === 'aprobado' ? 'success' : 'warning');
    } catch (error) {
      triggerToast('No se pudo guardar la revisión. No se aplicó ningún cambio local.', 'warning');
    }
  };

  const handleApproveCurrentFI = () => saveReview('aprobado');
  const handleDevolverCurrentFI = () => saveReview('devuelto');

  const { metricas, dictamenIA, participantes } = diagnostic;

  return (
    <div style={{ color: textDark }}>
      {/* TOAST DE NOTIFICACIÓN */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: toastMessage.type === 'success' ? '#10b981' : toastMessage.type === 'warning' ? '#f59e0b' : '#ef4444',
          color: '#fff',
          padding: '0.85rem 1.5rem',
          borderRadius: '10px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          fontWeight: 700,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          zIndex: 10000
        }}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {toastMessage.text}
        </div>
      )}

      {/* 1. ENCABEZADO Y GOBERNANZA OFICIAL */}
      <div style={{ 
        background: bgCard, 
        border: `1px solid ${borderLight}`, 
        borderRadius: '12px', 
        padding: '1.25rem 1.5rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '1rem',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ 
              background: 'rgba(16, 185, 129, 0.15)', 
              color: '#10b981', 
              padding: '0.25rem 0.75rem', 
              borderRadius: '20px', 
              fontSize: '0.75rem', 
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <Target size={14} /> AGENTE CENTINELA IA &bull; AUDITORÍA DE RESULTADOS IMPOSIBLES
            </span>
            <span style={{ fontSize: '0.85rem', color: sourceState.status === 'live' ? '#10b981' : '#f59e0b' }}>
              &bull; {sourceState.label}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: textMuted, maxWidth: '900px', lineHeight: 1.4 }}>
            <strong style={{ color: '#f59e0b' }}>Estándar de Alta Dirección:</strong> <em>"Auditoría continua de los exactamente 3 Resultados Imposibles declarados por cada participante activo en juego."</em>
          </p>
          <p style={{ margin: '0.45rem 0 0', fontSize: '0.76rem', color: sourceState.status === 'live' ? '#6ee7b7' : '#fcd34d', maxWidth: '900px', lineHeight: 1.4 }}>
            {sourceState.detail} Última marca: {sourceDateLabel(sourceState.syncedAt)}.
          </p>
          {sourceCatalog && (
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.73rem', color: textMuted, maxWidth: '900px', lineHeight: 1.4 }}>
              Contrato NODUS detectado: <strong>{sourceCatalog.extractionReadiness === 'detail_ready' ? 'detalle disponible' : sourceCatalog.extractionReadiness === 'summary_ready' ? 'resumen disponible' : sourceCatalog.extractionReadiness === 'blocked_by_waf' ? 'lectura bloqueada por WAF de NODUS' : 'requiere ajuste de campos'}</strong> · ruta {sourceCatalog.resolvedPath || sourceCatalog.route} · inspeccionado {sourceDateLabel(sourceCatalog.updatedAt || sourceCatalog.discoveredAt)}.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowPromptModal(true)}
            title="Abre y copia el Prompt Maestro de Auditoría para Gemini en Nodus"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#38bdf8',
              cursor: 'pointer'
            }}
          >
            <Bot size={15} /> Prompt Maestro IA
          </button>

          <button
            onClick={() => setShowGuiaModal(true)}
            title="Abre la Guía para Encontrar el Propósito y 'Para Qué' con las 3 Capas y Matriz E.M.P.O.R."
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#f59e0b',
              cursor: 'pointer'
            }}
          >
            <BookOpen size={15} /> Guía del "Para Qué"
          </button>

          {isInternalUser && (
            <button
              onClick={() => setShowArmandoModal(true)}
              title="Especificación técnica y operacional de auditoría para Armando (Manejo Interno CAUSA OS)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(56, 189, 248, 0.15) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#34d399',
                cursor: 'pointer'
              }}
            >
              <Lock size={13} /> <ShieldAlert size={15} /> Auditoría Armando (Manejo Interno)
            </button>
          )}

          <button
            onClick={handleReevaluate}
            disabled={isEvaluating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#10b981',
              cursor: isEvaluating ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={15} className={isEvaluating ? 'animate-spin' : ''} />
            {isEvaluating ? 'Consultando NODUS...' : 'Releer y diagnosticar'}
          </button>
          
          <a
            href="https://imo.crearpslglobal.com/futurosimposibles"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#38bdf8',
              textDecoration: 'none'
            }}
          >
            <ExternalLink size={15} /> Abrir Nodus /futurosimposibles
          </a>
        </div>
      </div>

      {/* 2. BARRA DE 7 TARJETAS KPI EJECUTIVAS */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', 
        gap: '1rem', 
        marginBottom: '1.5rem' 
      }}>
        {/* KPI 1: Universo Evaluado */}
        <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase' }}>Universo PFD</span>
            <UserCheck size={16} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: textDark }}>{metricas.totalParticipantes}</div>
          <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '0.2rem' }}>Asistieron a PFD</div>
        </div>

        {/* KPI 2: Sin Entrega (Alerta Roja) */}
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.08)', 
          border: '1px solid rgba(239, 68, 68, 0.25)', 
          borderRadius: '10px', 
          padding: '1rem' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>Sin Entrega (0 RIs)</span>
            <AlertCircle size={16} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{metricas.conCeroFIs}</div>
          <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600, marginTop: '0.2rem' }}>
            {metricas.tasaSinEntrega}% del total (Rezago)
          </div>
        </div>

        {/* KPI 3: Con RIs Cargados */}
        <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase' }}>Con Resultados (1 a 3)</span>
            <Target size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{metricas.conFIs}</div>
          <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '0.2rem' }}>
            {metricas.tasaEntrega}% cobertura
          </div>
        </div>

        {/* KPI 4: RIs Pendientes */}
        <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase' }}>Resultados Pendientes</span>
            <Clock size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{metricas.totalPendientes}</div>
          <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '0.2rem' }}>Por revisar por mentores</div>
        </div>

        {/* KPI 5: RIs Devueltos */}
        <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase' }}>Resultados Devueltos</span>
            <RefreshCw size={16} color="#ea580c" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ea580c' }}>{metricas.totalDevueltos}</div>
          <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '0.2rem' }}>Requieren corrección SMART</div>
        </div>

        {/* KPI 6: RIs Aprobados */}
        <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase' }}>Resultados Aprobados</span>
            <CheckCircle2 size={16} color="#059669" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>{metricas.totalAprobados}</div>
          <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '0.2rem' }}>Metas certificadas</div>
        </div>

        {/* KPI 7: Tasa Aprobación */}
        <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase' }}>Efectividad</span>
            <Trophy size={16} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#8b5cf6' }}>{metricas.tasaAprobacion}%</div>
          <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '0.2rem' }}>FIs aprobados vs cargados</div>
        </div>
      </div>

      {/* 3. PANEL DE DICTAMEN DEL AGENTE CENTINELA IA */}
      <div style={{ 
        background: bgCard, 
        border: `1px solid ${borderLight}`, 
        borderRadius: '12px', 
        padding: '1.5rem', 
        marginBottom: '1.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        {/* Header del Dictamen */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '0.4rem', borderRadius: '8px', color: '#f59e0b' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                DICTAMEN DEL AGENTE CENTINELA IA &bull; AUDITORÍA INSTITUCIONAL
              </h3>
              <span style={{ fontSize: '0.75rem', color: textMuted }}>Evaluación autónoma continua de compromisos post-PFD</span>
            </div>
          </div>

          <span style={{ 
            background: dictamenIA.severidad === 'CRITICA' ? 'rgba(239, 68, 68, 0.2)' : dictamenIA.severidad === 'ALERTA' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            color: dictamenIA.colorBadge,
            border: `1px solid ${dictamenIA.colorBadge}`,
            padding: '0.35rem 0.85rem',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 800
          }}>
            {dictamenIA.badgeTexto}
          </span>
        </div>

        {/* Narrativa Ejecutiva */}
        <div style={{ 
          background: 'rgba(0, 0, 0, 0.15)', 
          padding: '1rem 1.25rem', 
          borderRadius: '8px', 
          fontSize: '0.88rem', 
          lineHeight: 1.5, 
          color: textDark, 
          marginBottom: '1.25rem',
          borderLeft: `4px solid ${dictamenIA.colorBadge}`
        }}>
          {dictamenIA.resumen}
        </div>

        {/* 3 Pilares Diagnósticos en Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '1rem',
          marginBottom: '1.25rem'
        }}>
          {/* Pilar 1: Cobertura */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: `1px solid ${borderLight}`, borderRadius: '8px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldAlert size={16} /> {dictamenIA.pilarCobertura.titulo}
            </h4>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.82rem', color: textMuted, lineHeight: 1.4 }}>
              {dictamenIA.pilarCobertura.detalle}
            </p>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '0.35rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
              ⚠️ {dictamenIA.pilarCobertura.alerta}
            </div>
          </div>

          {/* Pilar 2: Cuello de botella */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: `1px solid ${borderLight}`, borderRadius: '8px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={16} /> {dictamenIA.pilarCuelloBotella.titulo}
            </h4>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.82rem', color: textMuted, lineHeight: 1.4 }}>
              {dictamenIA.pilarCuelloBotella.detalle}
            </p>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', padding: '0.35rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
              ⏳ {dictamenIA.pilarCuelloBotella.alerta}
            </div>
          </div>

          {/* Pilar 3: Plan de acción */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: `1px solid ${borderLight}`, borderRadius: '8px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Target size={16} /> {dictamenIA.pilarPlanAccion.titulo}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {dictamenIA.pilarPlanAccion.pasos.map((paso, idx) => (
                <div key={idx} style={{ fontSize: '0.78rem', lineHeight: 1.3 }}>
                  <strong style={{ color: '#38bdf8' }}>[{paso.plazo}]:</strong>{' '}
                  <span style={{ color: textDark }}>{paso.accion}</span>{' '}
                  <span style={{ color: textMuted, fontSize: '0.72rem' }}>({paso.responsable})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Directivas Clave para Dirección */}
        <div style={{ 
          background: 'rgba(16, 185, 129, 0.06)', 
          border: '1px solid rgba(16, 185, 129, 0.2)', 
          borderRadius: '8px', 
          padding: '0.85rem 1.25rem' 
        }}>
          <strong style={{ fontSize: '0.85rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
            <ChevronRight size={16} /> Directivas Ejecutivas para Dirección / Gerencia de Sede:
          </strong>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: textMuted }}>
            {dictamenIA.directivasParaDireccion.map((dir, idx) => (
              <li key={idx} style={{ marginBottom: '0.25rem' }}>{dir}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 4. SEMÁFORO DE CUMPLIMIENTO POR EQUIPOS */}
      <div style={{ 
        background: bgCard, 
        border: `1px solid ${borderLight}`, 
        borderRadius: '12px', 
        padding: '1.25rem', 
        marginBottom: '1.5rem' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={15} color="#38bdf8" /> SEMÁFORO DE CUMPLIMIENTO POR EQUIPO (Click para filtrar)
          </h4>
          <span style={{ fontSize: '0.75rem', color: textMuted }}>
            Filtro actual: <strong style={{ color: '#38bdf8' }}>{equiposDeSede.find((o) => o.value === equipoFilter)?.label || equipoFilter}</strong>
          </span>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          overflowX: 'auto', 
          paddingBottom: '0.5rem',
          scrollbarWidth: 'thin'
        }}>
          <button
            onClick={() => setEquipoFilter('Todos')}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '20px',
              border: equipoFilter === 'Todos' ? '1px solid #38bdf8' : `1px solid ${borderLight}`,
              background: equipoFilter === 'Todos' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
              color: equipoFilter === 'Todos' ? '#38bdf8' : textMuted,
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Todos ({metricas.totalParticipantesSede ?? metricas.totalParticipantes})
          </button>

          {metricas.equiposList.map((eq, idx) => {
            const isSelected = equipoFilter === eq.key;
            const badgeColor = eq.semaforo === 'VERDE' ? '#10b981' : eq.semaforo === 'AMARILLO' ? '#f59e0b' : '#ef4444';
            return (
              <button
                key={idx}
                onClick={() => setEquipoFilter(isSelected ? 'Todos' : eq.key)}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '20px',
                  border: isSelected ? `2px solid ${badgeColor}` : `1px solid ${borderLight}`,
                  background: isSelected ? `${badgeColor}25` : 'rgba(255, 255, 255, 0.03)',
                  color: textDark,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: badgeColor,
                  display: 'inline-block' 
                }} />
                <span>{esGlobalSede ? `${eq.sede} · ${eq.equipo}` : eq.equipo}</span>
                <span style={{ color: textMuted, fontSize: '0.7rem' }}>
                  ({eq.pctEntrega}%)
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. TOOLBAR DE BÚSQUEDA Y FILTROS */}
      <div style={{ 
        background: bgCard, 
        border: `1px solid ${borderLight}`, 
        borderRadius: '12px', 
        padding: '1.25rem', 
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Buscador reactivo en tiempo real */}
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '450px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: textMuted }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por participante, DNI o equipo..."
            style={{
              width: '100%',
              padding: '0.65rem 2.2rem 0.65rem 2.4rem',
              borderRadius: '8px',
              border: `1px solid ${borderLight}`,
              background: 'rgba(0, 0, 0, 0.2)',
              color: textDark,
              fontSize: '0.85rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: textMuted,
                cursor: 'pointer',
                display: 'flex'
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filtros Dropdowns */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Selector de Equipo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', color: textMuted }}>Equipo:</span>
            <select
              value={equipoFilter}
              onChange={(e) => setEquipoFilter(e.target.value)}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                border: `1px solid ${borderLight}`,
                background: 'rgba(0, 0, 0, 0.25)',
                color: textDark,
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {equiposDeSede.map(eq => (
                <option key={eq.value} value={eq.value} style={{ background: '#0f172a', color: '#f8fafc' }}>
                  {eq.label}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Estado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', color: textMuted }}>Estado:</span>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                border: `1px solid ${borderLight}`,
                background: 'rgba(0, 0, 0, 0.25)',
                color: textDark,
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {ESTADOS_FI.map(est => (
                <option key={est.id} value={est.id} style={{ background: '#0f172a', color: '#f8fafc' }}>
                  {est.label}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Rol Institucional (PX / MANAGER) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', color: textMuted }}>Rol:</span>
            <select
              value={rolFilter}
              onChange={(e) => setRolFilter(e.target.value)}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                border: `1px solid ${borderLight}`,
                background: 'rgba(0, 0, 0, 0.25)',
                color: textDark,
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {ROLES_FI.map(r => (
                <option key={r.id} value={r.id} style={{ background: '#0f172a', color: '#f8fafc' }}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: '0.8rem', color: textMuted, marginLeft: '0.5rem' }}>
            Mostrando <strong>{participantes.length}</strong> de {totalPfdEnSede} asistentes PFD verificables {esGlobalSede ? '(Global)' : `en ${selectedSede}`}
          </div>
        </div>
      </div>

      {/* 6. TABLA INTERACTIVA DE SEGUIMIENTO DE FUTUROS IMPOSIBLES */}
      <div style={{ 
        background: bgCard, 
        border: `1px solid ${borderLight}`, 
        borderRadius: '12px', 
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        marginBottom: '2rem'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(0, 0, 0, 0.3)', borderBottom: `1px solid ${borderLight}` }}>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', fontSize: '0.72rem' }}>
                  Participante / Rol
                </th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', fontSize: '0.72rem' }}>
                  Identificación
                </th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', fontSize: '0.72rem' }}>
                  Sede & Equipo
                </th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', fontSize: '0.72rem', textAlign: 'center' }}>
                  Total FI
                </th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', fontSize: '0.72rem', textAlign: 'center' }}>
                  Pendientes
                </th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', fontSize: '0.72rem', textAlign: 'center' }}>
                  Devueltos
                </th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', fontSize: '0.72rem', textAlign: 'center' }}>
                  Aprobados
                </th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', fontSize: '0.72rem' }}>
                  Dictamen Agente IA
                </th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', fontSize: '0.72rem', textAlign: 'center' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {participantes.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem 1rem', textAlign: 'center', color: textMuted }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={32} color="#94a3b8" />
                      <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>No se encontraron participantes con los filtros actuales</div>
                      <div style={{ fontSize: '0.8rem' }}>Intente cambiar el equipo, el estado o limpiar el buscador</div>
                    </div>
                  </td>
                </tr>
              ) : (
                participantes.map((p, idx) => {
                  const isZero = (p.totalFi || 0) === 0;
                  const isAllApproved = (p.aprobados || 0) === 3;
                  const hasPendientes = (p.pendientes || 0) > 0;
                  const hasDevueltos = (p.devueltos || 0) > 0;

                  return (
                    <tr 
                      key={p.id || idx}
                      style={{ 
                        borderBottom: `1px solid ${borderLight}`,
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.04)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)'}
                    >
                      {/* Participante y Rol */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: isZero ? '#ef4444' : isAllApproved ? '#10b981' : '#f59e0b',
                            display: 'inline-block',
                            flexShrink: 0
                          }} />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, color: textDark }}>{p.nombre}</span>
                              <span style={{ 
                                padding: '0.1rem 0.45rem', 
                                borderRadius: '4px', 
                                fontSize: '0.64rem', 
                                fontWeight: 800, 
                                letterSpacing: '0.04em',
                                background: p.rol === 'MANAGER' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(56, 189, 248, 0.18)', 
                                color: p.rol === 'MANAGER' ? '#f59e0b' : '#38bdf8',
                                border: p.rol === 'MANAGER' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(56, 189, 248, 0.35)'
                              }}>
                                {p.rol === 'MANAGER' ? 'MANAGER' : 'PX'}
                              </span>
                              <span style={{
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                fontSize: '0.6rem',
                                fontWeight: 700,
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.3)'
                              }}>
                                ACTIVO
                              </span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: textMuted }}>PFD: {p.fechaPFD || '16/08/2026'} ({p.diasDesdePFD || 27}d) &bull; {p.rol === 'MANAGER' ? 'Mesa / Liderazgo' : 'Participante en Juego'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Identificación */}
                      <td style={{ padding: '0.85rem 1rem', color: textMuted, fontFamily: 'monospace' }}>
                        {p.dni || '—'}
                      </td>

                      {/* Sede & Equipo */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#38bdf8' }}>{p.sede}</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: textDark }}>{p.equipo || 'Sin equipo'}</span>
                        </div>
                      </td>

                      {/* Total FI */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          background: isZero ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: isZero ? '#ef4444' : '#10b981'
                        }}>
                          {p.totalFi || 0}
                        </span>
                      </td>

                      {/* Pendientes */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: (p.pendientes || 0) > 0 ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                          color: (p.pendientes || 0) > 0 ? '#f59e0b' : textMuted
                        }}>
                          {p.pendientes || 0}
                        </span>
                      </td>

                      {/* Devueltos */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: (p.devueltos || 0) > 0 ? 'rgba(234, 88, 12, 0.15)' : 'transparent',
                          color: (p.devueltos || 0) > 0 ? '#ea580c' : textMuted
                        }}>
                          {p.devueltos || 0}
                        </span>
                      </td>

                      {/* Aprobados */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: (p.aprobados || 0) > 0 ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                          color: (p.aprobados || 0) > 0 ? '#10b981' : textMuted
                        }}>
                          {p.aprobados || 0}
                        </span>
                      </td>

                      {/* Dictamen Agente IA */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {isZero ? (
                          <span style={{ 
                            fontSize: '0.72rem', 
                            color: '#ef4444', 
                            background: 'rgba(239, 68, 68, 0.1)', 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '4px',
                            fontWeight: 700
                          }}>
                            🚨 Sin Entrega (Rezago Crítico)
                          </span>
                        ) : hasPendientes ? (
                          <span style={{ 
                            fontSize: '0.72rem', 
                            color: '#f59e0b', 
                            background: 'rgba(245, 158, 11, 0.1)', 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '4px',
                            fontWeight: 700
                          }}>
                            ⏳ Requiere Revisión Mentor
                          </span>
                        ) : hasDevueltos ? (
                          <span style={{ 
                            fontSize: '0.72rem', 
                            color: '#ea580c', 
                            background: 'rgba(234, 88, 12, 0.1)', 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '4px',
                            fontWeight: 700
                          }}>
                            🔄 Ajuste Pendiente por Alumno
                          </span>
                        ) : isAllApproved ? (
                          <span style={{ 
                            fontSize: '0.72rem', 
                            color: '#10b981', 
                            background: 'rgba(16, 185, 129, 0.1)', 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '4px',
                            fontWeight: 700
                          }}>
                            🚀 Habilitado para Avanzar (3/3)
                          </span>
                        ) : (
                          <span style={{ 
                            fontSize: '0.72rem', 
                            color: '#f59e0b', 
                            background: 'rgba(245, 158, 11, 0.1)', 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '4px',
                            fontWeight: 700
                          }}>
                            🔒 Bloqueado ({p.aprobados || 0}/3 Aprobados)
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => handleOpenReviewModal(p)}
                          style={{
                            background: 'rgba(56, 189, 248, 0.12)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            color: '#38bdf8',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          👁️ Revisar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. MODAL DE REVISIÓN Y AUDITORÍA DE 3 RESULTADOS IMPOSIBLES */}
      {modalOpen && selectedParticipant && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1rem',
          zIndex: 10001
        }}>
          <div style={{
            background: '#0d1527',
            border: `1px solid ${borderLight}`,
            borderRadius: '16px',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: `1px solid ${borderLight}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.2)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{ 
                    background: 'rgba(16, 185, 129, 0.15)', 
                    color: '#10b981', 
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '12px', 
                    fontSize: '0.7rem', 
                    fontWeight: 800 
                  }}>
                    AUDITORÍA RESULTADOS IMPOSIBLES
                  </span>
                  <span style={{ fontSize: '0.8rem', color: textMuted }}>
                    DNI: {selectedParticipant.dni || 'Sin DNI'} &bull; Sede: {selectedParticipant.sede} &bull; {selectedParticipant.equipo}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: textDark }}>
                  {selectedParticipant.nombre}
                </h3>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: textMuted,
                  cursor: 'pointer',
                  padding: '0.4rem',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {/* BANNER DE REGLA DE AVANCE: EXACTAMENTE 3 RESULTADOS IMPOSIBLES */}
              <div style={{
                background: selectedParticipant.aprobados === 3 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                border: `1px solid ${selectedParticipant.aprobados === 3 ? '#10b981' : '#f59e0b'}`,
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: selectedParticipant.aprobados === 3 ? '#10b981' : '#f59e0b' }}>
                  {selectedParticipant.aprobados === 3
                    ? '🚀 HABILITADO PARA AVANZAR: Cumple con exactamente 3 Resultados Imposibles aprobados.'
                    : `🔒 AVANCE BLOQUEADO: Requiere exactamente 3 Resultados Imposibles aprobados para avanzar (actualmente ${selectedParticipant.aprobados}/3).`}
                </div>
                <div style={{ fontSize: '0.72rem', color: textMuted }}>
                  Inmutabilidad: Registros históricos de ciclos previos preservados en base de datos.
                </div>
              </div>

              {/* Badges de estado general */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '0.75rem', 
                marginBottom: '1.5rem' 
              }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.6rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: textMuted }}>TOTAL RESULTADOS</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: textDark }}>{selectedParticipant.totalFi}/3</div>
                </div>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.6rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#f59e0b' }}>PENDIENTES</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>{selectedParticipant.pendientes}</div>
                </div>
                <div style={{ background: 'rgba(234, 88, 12, 0.1)', padding: '0.6rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#ea580c' }}>DEVUELTOS</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ea580c' }}>{selectedParticipant.devueltos}</div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.6rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#10b981' }}>APROBADOS</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>{selectedParticipant.aprobados}</div>
                </div>
              </div>

              {/* TABLERO VISUAL DE LOS 3 RESULTADOS IMPOSIBLES DETALLADOS (NODUS) */}
              {(() => {
                const fallbackAreas = ['Salud & Vitalidad', 'Finanzas & Riqueza', 'Relaciones & Familia'];
                const rawFis = Array.isArray(selectedParticipant.fis) ? selectedParticipant.fis : [];
                const participantFis = [0, 1, 2].map((idx) => {
                  if (rawFis[idx]) return rawFis[idx];
                  return {
                    area: fallbackAreas[idx] || `Resultado Imposible ${idx + 1}`,
                    meta: '',
                    estado: 'no_presentado',
                    feedback: ''
                  };
                });

                return (
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.45)',
                    border: `1px solid ${borderLight}`,
                    borderRadius: '12px',
                    padding: '1.1rem',
                    marginBottom: '1.25rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Target size={18} color="#38bdf8" />
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: textDark }}>
                          Los 3 Resultados Imposibles del Participante (Nodus)
                        </span>
                      </div>
                      <span style={{ fontSize: '0.74rem', color: textMuted }}>
                        Click en cualquier tarjeta para seleccionarla y auditarla abajo
                      </span>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                      gap: '0.85rem'
                    }}>
                      {participantFis.map((fi, idx) => {
                        const isActive = activeAreaTab === idx;
                        const isApr = fi.estado === 'aprobado';
                        const isPen = fi.estado === 'pendiente';
                        const isDev = fi.estado === 'devuelto';
                        const isNoPres = fi.estado === 'no_presentado' || !fi.meta;

                        const badgeBg = isApr ? 'rgba(16, 185, 129, 0.15)' : isPen ? 'rgba(245, 158, 11, 0.15)' : isDev ? 'rgba(234, 88, 12, 0.15)' : 'rgba(100, 116, 139, 0.15)';
                        const badgeBorder = isApr ? '#10b981' : isPen ? '#f59e0b' : isDev ? '#ea580c' : '#64748b';
                        const badgeColor = isApr ? '#10b981' : isPen ? '#f59e0b' : isDev ? '#ea580c' : '#94a3b8';
                        const badgeText = isApr ? 'Aprobado' : isPen ? 'Pendiente' : isDev ? 'Devuelto' : 'Sin Registro';

                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setActiveAreaTab(idx);
                              setMentorNote(fi.feedback || '');
                            }}
                            style={{
                              background: isActive ? 'rgba(56, 189, 248, 0.1)' : 'rgba(0, 0, 0, 0.25)',
                              border: isActive ? '2px solid #38bdf8' : `1px solid ${borderLight}`,
                              borderRadius: '10px',
                              padding: '0.9rem',
                              cursor: 'pointer',
                              transition: 'all 0.18s ease-in-out',
                              boxShadow: isActive ? '0 0 14px rgba(56, 189, 248, 0.25)' : 'none',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              position: 'relative'
                            }}
                          >
                            {isActive && (
                              <div style={{
                                position: 'absolute',
                                top: '-9px',
                                right: '12px',
                                background: '#38bdf8',
                                color: '#0f172a',
                                fontSize: '0.64rem',
                                fontWeight: 800,
                                padding: '0.1rem 0.5rem',
                                borderRadius: '8px',
                                letterSpacing: '0.5px'
                              }}>
                                SELECCIONADO
                              </div>
                            )}

                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem', marginBottom: '0.55rem' }}>
                                <div>
                                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Resultado {idx + 1} de 3
                                  </span>
                                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: textDark }}>
                                    {fi.area || `Área ${idx + 1}`}
                                  </div>
                                </div>
                                <span style={{
                                  background: badgeBg,
                                  border: `1px solid ${badgeBorder}`,
                                  color: badgeColor,
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '10px',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {badgeText}
                                </span>
                              </div>

                              <div style={{
                                background: 'rgba(0, 0, 0, 0.2)',
                                borderLeft: `3px solid ${isActive ? '#38bdf8' : isApr ? '#10b981' : isPen ? '#f59e0b' : '#64748b'}`,
                                padding: '0.55rem 0.75rem',
                                borderRadius: '4px',
                                fontSize: '0.82rem',
                                color: isNoPres ? '#ef4444' : textDark,
                                lineHeight: 1.45,
                                minHeight: '52px',
                                fontStyle: isNoPres ? 'italic' : 'normal'
                              }}>
                                {isNoPres ? '⚠️ Sin redacción registrada en Nodus' : `"${fi.meta}"`}
                              </div>
                            </div>

                            {fi.feedback && (
                              <div style={{ marginTop: '0.55rem', fontSize: '0.72rem', color: textMuted, borderTop: `1px dashed ${borderLight}`, paddingTop: '0.4rem' }}>
                                <span style={{ fontWeight: 700, color: textDark }}>Nota:</span> {fi.feedback}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* ASISTENTE ONTOLÓGICO IA & PROMPT MAESTRO (NODUS) */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={16} color="#38bdf8" />
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: textDark }}>
                      Asistente Ontológico IA &bull; Auditoría 3 Resultados Imposibles
                    </span>
                    <span style={{ fontSize: '0.7rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.15rem 0.5rem', borderRadius: '10px', fontWeight: 700 }}>
                      Estándar E.M.P.O.R.
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={handleCopiarPromptParticipante}
                      title="Copia el Prompt Maestro completo con las 3 metas de este participante inyectadas, listo para pegar en Gemini"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: copiedPrompt ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                        border: `1px solid ${copiedPrompt ? '#10b981' : 'rgba(56, 189, 248, 0.4)'}`,
                        color: copiedPrompt ? '#10b981' : '#38bdf8',
                        padding: '0.45rem 0.8rem',
                        borderRadius: '7px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <Copy size={13} /> {copiedPrompt ? '¡Prompt Copiado!' : 'Copiar Prompt para Gemini'}
                    </button>

                    <button
                      onClick={handleEjecutarAuditoriaEmpor}
                      title="Audita de forma automática y asertiva las 3 metas según los 3 pilares sin palabras punitivas"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#10b981',
                        padding: '0.45rem 0.8rem',
                        borderRadius: '7px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <Zap size={13} /> {iaEvaluation ? 'Re-auditar E.M.P.O.R.' : 'Auditar con Prompt Maestro'}
                    </button>

                    <button
                      onClick={() => setShowGuiaModal(true)}
                      title="Consulta la Guía del Propósito y 'Para Qué' con las 3 capas"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        color: '#f59e0b',
                        padding: '0.45rem 0.8rem',
                        borderRadius: '7px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <BookOpen size={13} /> Ver Guía "Para Qué"
                    </button>
                  </div>
                </div>

                {iaEvaluation ? (
                  <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: `1px solid ${borderLight}`, borderRadius: '8px', padding: '0.9rem', marginTop: '0.6rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: textMuted }}>ESTADO GENERAL:</span>
                        <span style={{
                          background: iaEvaluation.estadoGeneral === 'APROBADO' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: iaEvaluation.estadoGeneral === 'APROBADO' ? '#10b981' : '#f59e0b',
                          border: `1px solid ${iaEvaluation.estadoGeneral === 'APROBADO' ? '#10b981' : '#f59e0b'}`,
                          padding: '0.2rem 0.65rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 800
                        }}>
                          [{iaEvaluation.estadoGeneral}]
                        </span>
                        <span style={{ fontSize: '0.75rem', color: textMuted }}>
                          ({iaEvaluation.aprobadosCount}/3 Resultados con estándar superior)
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          onClick={handleAplicarARetroalimentacion}
                          title="Copia la evaluación estructurada completa al campo de retroalimentación del mentor"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            background: '#10b981',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <Send size={12} /> Aplicar a Retroalimentación
                        </button>
                        <button
                          onClick={() => copyToClipboard(generarTextoEvaluacionCompleta(iaEvaluation), 'Evaluación completa copiada')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: textDark,
                            border: `1px solid ${borderLight}`,
                            borderRadius: '6px',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <Copy size={12} /> Copiar
                        </button>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderLeft: '3px solid #38bdf8', padding: '0.6rem 0.8rem', borderRadius: '4px', fontSize: '0.78rem', color: textDark }}>
                      <div style={{ fontWeight: 800, color: '#38bdf8', marginBottom: '0.2rem' }}>PREGUNTA CUÁNTICA DE ENFOQUE:</div>
                      <div>"{iaEvaluation.preguntaCuantica}"</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.76rem', color: textMuted, lineHeight: 1.4 }}>
                    💡 <em>Usa el <strong>Prompt Maestro</strong> para auditar los 3 resultados según los 3 pilares (Especificidad, Nivel de Desafío y Propósito) con retroalimentación asertiva, empática y sin juicios punitivos.</em>
                  </div>
                )}
              </div>

              {/* Selector de Resultados (Exactamente 3 Resultados Imposibles) */}
              <div style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                borderBottom: `1px solid ${borderLight}`, 
                marginBottom: '1.25rem',
                overflowX: 'auto',
                paddingBottom: '0.5rem'
              }}>
                {(selectedParticipant.fis || []).slice(0, 3).map((fi, idx) => {
                  const isActive = activeAreaTab === idx;
                  const isApr = fi.estado === 'aprobado';
                  const isPen = fi.estado === 'pendiente';
                  const isDev = fi.estado === 'devuelto';
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveAreaTab(idx);
                        setMentorNote(fi.feedback || '');
                      }}
                      style={{
                        padding: '0.5rem 0.85rem',
                        borderRadius: '8px',
                        border: isActive ? '1px solid #38bdf8' : `1px solid ${borderLight}`,
                        background: isActive ? 'rgba(56, 189, 248, 0.15)' : 'rgba(0, 0, 0, 0.2)',
                        color: isActive ? '#38bdf8' : textMuted,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: isApr ? '#10b981' : isPen ? '#f59e0b' : isDev ? '#ea580c' : '#64748b'
                      }} />
                      {idx + 1}. {fi.area || `Resultado ${idx + 1}`}
                    </button>
                  );
                })}
              </div>

              {/* Detalle del Resultado Activo */}
              {(() => {
                const fi = selectedParticipant.fis?.[activeAreaTab] || {};
                const evaluacion = evaluarCalidadOntologicaFI(fi.area, fi.titulo, fi.meta);
                const isNoPresentado = fi.estado === 'no_presentado' || !fi.meta;

                return (
                  <div>
                    {/* Header del Resultado */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginBottom: '1rem',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: textMuted, textTransform: 'uppercase' }}>
                          Resultado {activeAreaTab + 1} de 3
                        </span>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: textDark }}>
                          {fi.area || `Resultado Imposible ${activeAreaTab + 1}`}
                        </h4>
                      </div>

                      <span style={{
                        padding: '0.3rem 0.8rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        background: fi.estado === 'aprobado' ? 'rgba(16, 185, 129, 0.15)' : fi.estado === 'pendiente' ? 'rgba(245, 158, 11, 0.15)' : fi.estado === 'devuelto' ? 'rgba(234, 88, 12, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                        color: fi.estado === 'aprobado' ? '#10b981' : fi.estado === 'pendiente' ? '#f59e0b' : fi.estado === 'devuelto' ? '#ea580c' : '#94a3b8'
                      }}>
                        {fi.estado === 'aprobado' ? '✅ Aprobado / Certificado' : fi.estado === 'pendiente' ? '⏳ Pendiente de Revisión' : fi.estado === 'devuelto' ? '🔄 Devuelto para Ajuste' : '⚪ No Registrado'}
                      </span>
                    </div>

                    {/* Texto de la Meta */}
                    <div style={{ 
                      background: 'rgba(0, 0, 0, 0.25)', 
                      border: `1px solid ${borderLight}`, 
                      borderRadius: '8px', 
                      padding: '1.1rem',
                      marginBottom: '1.25rem' 
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: textMuted, marginBottom: '0.35rem' }}>
                        TEXTO REGISTRADO EN NODUS:
                      </div>
                      {isNoPresentado ? (
                        <div style={{ color: '#ef4444', fontStyle: 'italic', fontSize: '0.88rem' }}>
                          🚨 El participante aún no ha redactado ni cargado su Resultado Imposible para esta meta en la plataforma oficial.
                        </div>
                      ) : (
                        <div>
                          {fi.titulo && (
                            <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '0.35rem', fontSize: '0.95rem' }}>
                              {fi.titulo}
                            </div>
                          )}
                          <div style={{ fontSize: '0.9rem', color: textDark, lineHeight: 1.5 }}>
                            "{fi.meta}"
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ANÁLISIS E.M.P.O.R. DEL RESULTADO ACTIVO (3 PILARES) */}
                    {(() => {
                      const itemEval = iaEvaluation?.resultados?.[activeAreaTab] || auditarResultadosImposiblesEMPOR(selectedParticipant.fis || [], selectedParticipant).resultados[activeAreaTab];
                      if (!itemEval) return null;

                      return (
                        <div style={{
                          background: 'rgba(0, 0, 0, 0.18)',
                          border: `1px solid ${itemEval.estado === 'APROBADO' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                          borderRadius: '8px',
                          padding: '0.9rem',
                          marginBottom: '1.25rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Target size={14} color={itemEval.estado === 'APROBADO' ? '#10b981' : '#f59e0b'} />
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: textDark }}>
                                Auditoría de 3 Pilares &bull; {itemEval.area}
                              </span>
                            </div>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              background: itemEval.estado === 'APROBADO' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: itemEval.estado === 'APROBADO' ? '#10b981' : '#f59e0b',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '10px'
                            }}>
                              [{itemEval.estado}]
                            </span>
                          </div>

                          {/* 3 Pilares */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginBottom: '0.65rem' }}>
                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.45rem 0.6rem', borderRadius: '6px', fontSize: '0.74rem' }}>
                              <span style={{ color: textMuted }}>1. Especificidad y Medición: </span>
                              <strong style={{ color: itemEval.pilares?.especificidadYMedicion ? '#10b981' : '#f59e0b' }}>
                                {itemEval.pilares?.especificidadYMedicion ? 'Cumplido' : 'Precisión requerida'}
                              </strong>
                            </div>
                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.45rem 0.6rem', borderRadius: '6px', fontSize: '0.74rem' }}>
                              <span style={{ color: textMuted }}>2. Nivel de Desafío: </span>
                              <strong style={{ color: itemEval.pilares?.nivelDesafio ? '#10b981' : '#f59e0b' }}>
                                {itemEval.pilares?.nivelDesafio ? 'Estiramiento' : 'Marco conciso'}
                              </strong>
                            </div>
                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.45rem 0.6rem', borderRadius: '6px', fontSize: '0.74rem' }}>
                              <span style={{ color: textMuted }}>3. Propósito ("Para Qué"): </span>
                              <strong style={{ color: itemEval.pilares?.conexionProposito ? '#10b981' : '#f59e0b' }}>
                                {itemEval.pilares?.conexionProposito ? 'Conectado' : 'Profundizar'}
                              </strong>
                            </div>
                          </div>

                          {/* Reflejo Asertivo */}
                          <div style={{ fontSize: '0.8rem', color: textDark, marginBottom: itemEval.ajusteInmediato ? '0.5rem' : '0', lineHeight: 1.4 }}>
                            <strong>Reflejo Asertivo:</strong> {itemEval.reflejoAsertivo}
                          </div>

                          {/* Ajuste Inmediato Sugerido */}
                          {itemEval.ajusteInmediato && (
                            <div style={{
                              background: 'rgba(245, 158, 11, 0.08)',
                              border: '1px dashed rgba(245, 158, 11, 0.35)',
                              borderRadius: '6px',
                              padding: '0.5rem 0.75rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '0.5rem'
                            }}>
                              <div style={{ fontSize: '0.77rem', color: '#fcd34d', flex: 1, minWidth: '220px' }}>
                                <strong>Ajuste Inmediato Sugerido:</strong> {itemEval.ajusteInmediato}
                              </div>
                              <button
                                onClick={() => handleAplicarResultadoIndividual(activeAreaTab)}
                                title="Copia esta observación al campo de retroalimentación"
                                style={{
                                  background: 'rgba(245, 158, 11, 0.2)',
                                  border: '1px solid rgba(245, 158, 11, 0.4)',
                                  color: '#f59e0b',
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: '5px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                Aplicar sugerencia a nota
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Observaciones / Feedback del Mentor */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      {/* Contexto Fijo del Resultado en Revisión */}
                      <div style={{
                        background: 'rgba(56, 189, 248, 0.08)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '8px',
                        padding: '0.65rem 0.85rem',
                        marginBottom: '0.65rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                            🎯 Meta en Revisión Activa &bull; Resultado {activeAreaTab + 1}: {fi.area || `Resultado ${activeAreaTab + 1}`}
                          </span>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '8px',
                            background: fi.estado === 'aprobado' ? 'rgba(16, 185, 129, 0.15)' : fi.estado === 'pendiente' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(234, 88, 12, 0.15)',
                            color: fi.estado === 'aprobado' ? '#10b981' : fi.estado === 'pendiente' ? '#f59e0b' : '#ea580c'
                          }}>
                            Estado: {fi.estado?.toUpperCase() || 'PENDIENTE'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.86rem', color: textDark, fontWeight: 600, lineHeight: 1.45 }}>
                          {fi.meta ? `"${fi.meta}"` : <span style={{ color: '#ef4444', fontStyle: 'italic' }}>Sin texto registrado en Nodus para esta meta</span>}
                        </div>
                      </div>

                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: textMuted, marginBottom: '0.4rem' }}>
                        RETROALIMENTACIÓN DEL MENTOR / COORDINADOR:
                      </label>
                      <textarea
                        value={mentorNote}
                        onChange={(e) => setMentorNote(e.target.value)}
                        placeholder="Escriba comentarios u observaciones para el participante..."
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '0.65rem',
                          borderRadius: '8px',
                          border: `1px solid ${borderLight}`,
                          background: 'rgba(0,0,0,0.2)',
                          color: textDark,
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Botones de Acción de Revisión */}
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button
                        onClick={handleDevolverCurrentFI}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: 'rgba(234, 88, 12, 0.15)',
                          border: '1px solid rgba(234, 88, 12, 0.4)',
                          color: '#ea580c',
                          padding: '0.6rem 1.1rem',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <RefreshCw size={15} /> Devolver con Observación
                      </button>

                      <button
                        onClick={handleApproveCurrentFI}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: '#10b981',
                          border: 'none',
                          color: '#fff',
                          padding: '0.6rem 1.25rem',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        <Check size={16} /> Aprobar Futuro Imposible
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '0.85rem 1.5rem',
              borderTop: `1px solid ${borderLight}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.15)'
            }}>
              <span style={{ fontSize: '0.75rem', color: textMuted }}>
                Causa OS &bull; Auditoría y Gobernanza de Metas
              </span>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${borderLight}`,
                  color: textDark,
                  padding: '0.45rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL PROMPT MAESTRO DE AUDITORÍA (GEMINI / NODUS) */}
      {showPromptModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1rem',
          zIndex: 10002
        }}>
          <div style={{
            background: '#0d1527',
            border: `1px solid ${borderLight}`,
            borderRadius: '16px',
            width: '100%',
            maxWidth: '860px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: `1px solid ${borderLight}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.2)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{
                    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                    color: '#38bdf8',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    <Bot size={13} /> ASISTENTE GEMINI &bull; NODUS
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: textDark }}>
                  Prompt Maestro para Auditar los 3 Resultados Imposibles en Nodus
                </h3>
              </div>
              <button
                onClick={() => setShowPromptModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: textMuted,
                  cursor: 'pointer',
                  padding: '0.4rem',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {/* Instrucciones de uso */}
              <div style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '10px',
                padding: '0.9rem 1.1rem',
                marginBottom: '1.2rem'
              }}>
                <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.85rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Lightbulb size={16} /> Instrucciones de uso con Gemini (Google Chrome / Nodus):
                </div>
                <div style={{ fontSize: '0.8rem', color: textDark, lineHeight: 1.5 }}>
                  1. Haz clic en <strong>"Copiar Prompt Maestro"</strong>.<br />
                  2. Pégalo en el panel de Gemini (en Google Chrome o Nodus) para configurarlo como asistente auditor de desempeño ontológico.<br />
                  3. Pega las 3 metas del participante para recibir la retroalimentación asertiva al instante, lista para guardar en la plataforma.
                </div>
              </div>

              {/* Bloque de Código del Prompt */}
              <div style={{
                background: '#060a14',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '1rem',
                fontFamily: 'monospace',
                fontSize: '0.78rem',
                color: '#e2e8f0',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                maxHeight: '440px',
                overflowY: 'auto'
              }}>
                {PROMPT_MAESTRO_AUDITORIA_3_RI}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: `1px solid ${borderLight}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.15)',
              flexWrap: 'wrap',
              gap: '0.6rem'
            }}>
              <span style={{ fontSize: '0.75rem', color: textMuted }}>
                Causa OS &bull; Tecnología Ontológica y Auditoría de Metas
              </span>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  onClick={() => copyToClipboard(PROMPT_MAESTRO_AUDITORIA_3_RI, '¡Prompt Maestro copiado al portapapeles!')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'linear-gradient(135deg, #0284c7 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '0.5rem 1.1rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.3)'
                  }}
                >
                  <Copy size={14} /> Copiar Prompt Maestro
                </button>
                <button
                  onClick={() => setShowPromptModal(false)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${borderLight}`,
                    color: textDark,
                    padding: '0.5rem 1rem',
                    borderRadius: '7px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL GUÍA DEL PROPÓSITO Y "PARA QUÉ" (METODOLOGÍA OFICIAL) */}
      {showGuiaModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1rem',
          zIndex: 10002
        }}>
          <div style={{
            background: '#0d1527',
            border: `1px solid ${borderLight}`,
            borderRadius: '16px',
            width: '100%',
            maxWidth: '920px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: `1px solid ${borderLight}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.2)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{
                    background: 'rgba(245, 158, 11, 0.18)',
                    color: '#f59e0b',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    <BookOpen size={13} /> METODOLOGÍA OFICIAL &bull; CPSL
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: textDark }}>
                  {GUIA_PROPOSITO_3_CAPAS_RI.titulo}
                </h3>
              </div>
              <button
                onClick={() => setShowGuiaModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: textMuted,
                  cursor: 'pointer',
                  padding: '0.4rem',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {/* Definición de Alto Impacto */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(56, 189, 248, 0.1) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '10px',
                padding: '1rem 1.25rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '0.88rem', marginBottom: '0.3rem' }}>
                  ¿Por qué un "Resultado Imposible"?
                </div>
                <div style={{ fontSize: '0.85rem', color: textDark, lineHeight: 1.5, fontStyle: 'italic' }}>
                  "{GUIA_PROPOSITO_3_CAPAS_RI.definicion}"
                </div>
              </div>

              {/* Selector de Pasos */}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                borderBottom: `1px solid ${borderLight}`,
                marginBottom: '1.25rem',
                paddingBottom: '0.5rem'
              }}>
                <button
                  onClick={() => setGuiaActiveTab(1)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: guiaActiveTab === 1 ? '1px solid #f59e0b' : `1px solid ${borderLight}`,
                    background: guiaActiveTab === 1 ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                    color: guiaActiveTab === 1 ? '#f59e0b' : textMuted,
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Layers size={14} /> Paso 1: Las 3 Capas del "Para Qué"
                </button>

                <button
                  onClick={() => setGuiaActiveTab(2)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: guiaActiveTab === 2 ? '1px solid #10b981' : `1px solid ${borderLight}`,
                    background: guiaActiveTab === 2 ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                    color: guiaActiveTab === 2 ? '#10b981' : textMuted,
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Target size={14} /> Paso 2: Matriz E.M.P.O.R.
                </button>

                <button
                  onClick={() => setGuiaActiveTab(3)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: guiaActiveTab === 3 ? '1px solid #38bdf8' : `1px solid ${borderLight}`,
                    background: guiaActiveTab === 3 ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    color: guiaActiveTab === 3 ? '#38bdf8' : textMuted,
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <CheckCheck size={14} /> Paso 3: Checklist Rápido
                </button>
              </div>

              {/* Contenido según Paso */}
              {guiaActiveTab === 1 && (
                <div>
                  <p style={{ fontSize: '0.82rem', color: textMuted, marginBottom: '1rem' }}>
                    {GUIA_PROPOSITO_3_CAPAS_RI.paso1.descripcion}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.2rem' }}>
                    {GUIA_PROPOSITO_3_CAPAS_RI.paso1.capas.map((c) => (
                      <div key={c.numero} style={{
                        background: 'rgba(255, 255, 255, 0.025)',
                        border: `1px solid ${borderLight}`,
                        borderLeft: `4px solid ${c.numero === 1 ? '#38bdf8' : c.numero === 2 ? '#f59e0b' : '#10b981'}`,
                        borderRadius: '8px',
                        padding: '0.85rem 1rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: c.numero === 1 ? '#38bdf8' : c.numero === 2 ? '#f59e0b' : '#10b981' }}>
                            {c.capa}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: textMuted, fontStyle: 'italic' }}>
                            {c.pregunta}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: textDark, background: 'rgba(0,0,0,0.2)', padding: '0.45rem 0.65rem', borderRadius: '6px' }}>
                          <strong>Ejemplo:</strong> {c.ejemplo}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid #f59e0b',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    fontSize: '0.82rem',
                    color: '#fcd34d'
                  }}>
                    🌟 <strong>Regla de Oro:</strong> {GUIA_PROPOSITO_3_CAPAS_RI.paso1.reglaOro}
                  </div>
                </div>
              )}

              {guiaActiveTab === 2 && (
                <div>
                  <p style={{ fontSize: '0.82rem', color: textMuted, marginBottom: '1rem' }}>
                    {GUIA_PROPOSITO_3_CAPAS_RI.paso2.descripcion}
                  </p>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: `1px solid ${borderLight}`, textAlign: 'left' }}>
                          <th style={{ padding: '0.75rem', color: textDark, fontWeight: 700 }}>Componente</th>
                          <th style={{ padding: '0.75rem', color: textDark, fontWeight: 700 }}>Requisito de Validación</th>
                          <th style={{ padding: '0.75rem', color: '#ef4444', fontWeight: 700 }}>Ejemplo Incorrecto (Vago)</th>
                          <th style={{ padding: '0.75rem', color: '#10b981', fontWeight: 700 }}>Ejemplo Correcto (Estándar Superior)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {GUIA_PROPOSITO_3_CAPAS_RI.paso2.tabla.map((fila, idx) => (
                          <tr key={idx} style={{ borderBottom: `1px solid ${borderLight}` }}>
                            <td style={{ padding: '0.75rem', fontWeight: 800, color: textDark, whiteSpace: 'nowrap' }}>
                              {fila.componente}
                            </td>
                            <td style={{ padding: '0.75rem', color: textMuted }}>
                              {fila.requisito}
                            </td>
                            <td style={{ padding: '0.75rem', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.05)' }}>
                              {fila.incorrecto}
                            </td>
                            <td style={{ padding: '0.75rem', color: '#86efac', background: 'rgba(16, 185, 129, 0.05)', fontWeight: 600 }}>
                              {fila.correcto}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {guiaActiveTab === 3 && (
                <div>
                  <p style={{ fontSize: '0.82rem', color: textMuted, marginBottom: '1rem' }}>
                    {GUIA_PROPOSITO_3_CAPAS_RI.paso3.descripcion}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                    {GUIA_PROPOSITO_3_CAPAS_RI.paso3.items.map((item, idx) => {
                      const isChecked = Boolean(checklistChecks[idx]);
                      return (
                        <div
                          key={idx}
                          onClick={() => setChecklistChecks(prev => ({ ...prev, [idx]: !prev[idx] }))}
                          style={{
                            background: isChecked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.025)',
                            border: `1px solid ${isChecked ? '#10b981' : borderLight}`,
                            borderRadius: '8px',
                            padding: '0.85rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '5px',
                            border: `2px solid ${isChecked ? '#10b981' : textMuted}`,
                            background: isChecked ? '#10b981' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {isChecked && <Check size={14} color="#ffffff" />}
                          </div>
                          <span style={{ fontSize: '0.82rem', color: isChecked ? '#ffffff' : textDark, fontWeight: isChecked ? 700 : 500, lineHeight: 1.4 }}>
                            {idx + 1}. {item}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: `1px solid ${borderLight}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.15)',
              flexWrap: 'wrap',
              gap: '0.6rem'
            }}>
              <span style={{ fontSize: '0.75rem', color: textMuted }}>
                Causa OS &bull; Escuela de Liderazgo y Alto Rendimiento CPSL
              </span>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  onClick={() => copyToClipboard(GUIA_PROPOSITO_3_CAPAS_RI.textoCompartible, '¡Guía completa copiada para WhatsApp o correo!')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #10b981 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '0.5rem 1.1rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.3)'
                  }}
                >
                  <Copy size={14} /> Copiar Guía para Participantes (WhatsApp)
                </button>
                <button
                  onClick={() => setShowGuiaModal(false)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${borderLight}`,
                    color: textDark,
                    padding: '0.5rem 1rem',
                    borderRadius: '7px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. MODAL ESPECIFICACIÓN DE AUDITORÍA ARMANDO (CAUSA OS - 3 RIs & HAR) */}
      {showArmandoModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1rem',
          zIndex: 10003
        }}>
          <div style={{
            background: '#0a101f',
            border: `1px solid rgba(16, 185, 129, 0.4)`,
            borderRadius: '16px',
            width: '100%',
            maxWidth: '960px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: `1px solid ${borderLight}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(56, 189, 248, 0.08) 100%)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(56, 189, 248, 0.25) 100%)',
                    color: '#34d399',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '12px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    <ShieldAlert size={14} /> CAUSA OS &bull; ESPECIFICACIÓN OFICIAL
                  </span>
                  <span style={{ fontSize: '0.72rem', color: textMuted }}>
                    Auditoría de Desempeño para Armando
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: textDark }}>
                  {ESPECIFICACION_AUDITORIA_ARMANDO.titulo}
                </h3>
              </div>
              <button
                onClick={() => setShowArmandoModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${borderLight}`,
                  borderRadius: '8px',
                  color: textMuted,
                  cursor: 'pointer',
                  padding: '0.45rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Pestañas de Navegación de la Especificación */}
            <div style={{
              display: 'flex',
              background: 'rgba(0, 0, 0, 0.25)',
              borderBottom: `1px solid ${borderLight}`,
              padding: '0.4rem 1rem',
              gap: '0.5rem',
              overflowX: 'auto'
            }}>
              {[
                { id: 'especificaciones', label: '1. Arquitectura 3 RIs', icon: Target },
                { id: 'comparativa', label: '2. Matriz RIs vs HAR', icon: Layers },
                { id: 'checklist', label: '3. Checklist Armando (5 Controles)', icon: Award },
                { id: 'json', label: '4. Esquema JSON Canónico', icon: FileText }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeArmandoTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveArmandoTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 0.9rem',
                      borderRadius: '8px',
                      border: isActive ? '1px solid #10b981' : '1px solid transparent',
                      background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                      color: isActive ? '#34d399' : textMuted,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Icon size={14} /> {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Contenido con Scroll */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, maxHeight: '60vh' }}>
              {/* TAB 1: ESPECIFICACIONES & REGLAS */}
              {activeArmandoTab === 'especificaciones' && (
                <div>
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '10px',
                    padding: '1.1rem',
                    marginBottom: '1.25rem'
                  }}>
                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', fontWeight: 800, color: '#34d399' }}>
                      {ESPECIFICACION_AUDITORIA_ARMANDO.seccion1.titulo}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: textDark, lineHeight: 1.5 }}>
                      {ESPECIFICACION_AUDITORIA_ARMANDO.seccion1.descripcion}
                    </p>
                  </div>

                  <h5 style={{ fontSize: '0.85rem', fontWeight: 800, color: textMuted, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                    Motivos Operacionales y de Ejecución
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {ESPECIFICACION_AUDITORIA_ARMANDO.seccion1.motivos.map((m, idx) => (
                      <div key={idx} style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${borderLight}`,
                        borderRadius: '8px',
                        padding: '0.9rem'
                      }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#38bdf8', marginBottom: '0.35rem' }}>
                          &bull; {m.nombre}
                        </div>
                        <div style={{ fontSize: '0.77rem', color: textDark, lineHeight: 1.45 }}>
                          {m.detalle}
                        </div>
                      </div>
                    ))}
                  </div>

                  <h5 style={{ fontSize: '0.85rem', fontWeight: 800, color: textMuted, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                    Reglas de Negocio Específicas en CAUSA OS
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {ESPECIFICACION_AUDITORIA_ARMANDO.seccion4.reglas.map((r) => (
                      <div key={r.numero} style={{
                        background: 'rgba(0, 0, 0, 0.25)',
                        border: `1px solid ${borderLight}`,
                        borderRadius: '8px',
                        padding: '0.85rem 1rem'
                      }}>
                        <div style={{ fontSize: '0.83rem', fontWeight: 800, color: '#f59e0b', marginBottom: '0.25rem' }}>
                          Regla {r.numero}: {r.nombre}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: textDark, lineHeight: 1.45 }}>
                          {r.descripcion}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: MATRIZ COMPARATIVA RIs vs HAR */}
              {activeArmandoTab === 'comparativa' && (
                <div>
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem', fontWeight: 800, color: textDark }}>
                      {ESPECIFICACION_AUDITORIA_ARMANDO.seccion2.titulo}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: textMuted, lineHeight: 1.45 }}>
                      {ESPECIFICACION_AUDITORIA_ARMANDO.seccion2.descripcion}
                    </p>
                  </div>

                  <div style={{ overflowX: 'auto', borderRadius: '10px', border: `1px solid ${borderLight}` }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(0, 0, 0, 0.4)', borderBottom: `1px solid ${borderLight}` }}>
                          <th style={{ padding: '0.8rem 1rem', color: textMuted, fontWeight: 700, width: '22%' }}>Dimensión</th>
                          <th style={{ padding: '0.8rem 1rem', color: '#10b981', fontWeight: 800, width: '39%' }}>Resultados Imposibles (RIs)</th>
                          <th style={{ padding: '0.8rem 1rem', color: '#38bdf8', fontWeight: 800, width: '39%' }}>Hábitos de Alto Rendimiento (HAR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ESPECIFICACION_AUDITORIA_ARMANDO.seccion2.matriz.map((row, idx) => (
                          <tr key={idx} style={{
                            borderBottom: idx < ESPECIFICACION_AUDITORIA_ARMANDO.seccion2.matriz.length - 1 ? `1px solid ${borderLight}` : 'none',
                            background: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.015)' : 'rgba(0, 0, 0, 0.15)'
                          }}>
                            <td style={{ padding: '0.8rem 1rem', fontWeight: 700, color: '#f59e0b' }}>
                              {row.dimension}
                            </td>
                            <td style={{ padding: '0.8rem 1rem', color: textDark, lineHeight: 1.4 }}>
                              {row.ri}
                            </td>
                            <td style={{ padding: '0.8rem 1rem', color: textDark, lineHeight: 1.4 }}>
                              {row.har}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: CHECKLIST DE AUDITORÍA PARA ARMANDO */}
              {activeArmandoTab === 'checklist' && (
                <div>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem', fontWeight: 800, color: textDark }}>
                      Checklist de Auditoría para Armando
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: textMuted }}>
                      Controles obligatorios requeridos para validar y certificar los reportes semanales en CAUSA OS:
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {ESPECIFICACION_AUDITORIA_ARMANDO.seccion4.checklist.map((c) => {
                      const isChecked = !!armandoChecklistState[c.numero];
                      return (
                        <div
                          key={c.numero}
                          onClick={() => setArmandoChecklistState(prev => ({ ...prev, [c.numero]: !prev[c.numero] }))}
                          style={{
                            background: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0, 0, 0, 0.2)',
                            border: `1px solid ${isChecked ? 'rgba(16, 185, 129, 0.4)' : borderLight}`,
                            borderRadius: '10px',
                            padding: '0.9rem 1.1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1rem',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <div style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '6px',
                              border: `2px solid ${isChecked ? '#10b981' : textMuted}`,
                              background: isChecked ? '#10b981' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {isChecked && <Check size={15} color="#ffffff" />}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: isChecked ? '#ffffff' : textDark }}>
                                Control {c.numero}: {c.criterio}
                              </div>
                              <div style={{ fontSize: '0.76rem', color: textMuted, marginTop: '0.15rem', lineHeight: 1.35 }}>
                                {c.descripcion}
                              </div>
                            </div>
                          </div>

                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '10px',
                            background: isChecked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            color: isChecked ? '#34d399' : textMuted,
                            whiteSpace: 'nowrap'
                          }}>
                            {isChecked ? '[X] Verificado' : '[ ] Pendiente'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: ESQUEMA JSON CANÓNICO DE DATOS */}
              {activeArmandoTab === 'json' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: textDark }}>
                        3. Estructura JSON Completa de Datos
                      </h4>
                      <div style={{ fontSize: '0.78rem', color: textMuted }}>
                        Esquema oficial que CAUSA OS procesa para cada participante con RIs, HAR y Bloque de Auditoría
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const schemaEjemplo = generarEsquemaCausaOSArmando();
                        copyToClipboard(JSON.stringify(schemaEjemplo, null, 2), '¡Esquema JSON oficial copiado al portapapeles!');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'linear-gradient(135deg, #0284c7 0%, #059669 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.45rem 0.9rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <Copy size={13} /> Copiar JSON Oficial
                    </button>
                  </div>

                  <pre style={{
                    background: '#040711',
                    border: `1px solid ${borderLight}`,
                    borderRadius: '8px',
                    padding: '1.1rem',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    color: '#a5f3fc',
                    lineHeight: 1.5,
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}>
                    {JSON.stringify(generarEsquemaCausaOSArmando(), null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: `1px solid ${borderLight}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.2)',
              flexWrap: 'wrap',
              gap: '0.6rem'
            }}>
              <span style={{ fontSize: '0.75rem', color: textMuted }}>
                CAUSA OS &bull; Gobernanza y Trazabilidad Operacional para Armando
              </span>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  onClick={() => {
                    const schemaEjemplo = generarEsquemaCausaOSArmando();
                    copyToClipboard(JSON.stringify(schemaEjemplo, null, 2), '¡Esquema JSON copiado al portapapeles!');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'linear-gradient(135deg, #059669 0%, #0284c7 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '0.5rem 1.1rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Copy size={14} /> Copiar Esquema JSON Completo
                </button>
                <button
                  onClick={() => setShowArmandoModal(false)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${borderLight}`,
                    color: textDark,
                    padding: '0.5rem 1rem',
                    borderRadius: '7px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
