import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, getDoc, updateDoc, doc, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useUI } from '../context/UIContext';
import { 
  ArrowLeft, FileText, Send, Zap, Clock, ShieldAlert, Sparkles, 
  BarChart3, CheckCircle2, AlertTriangle, Star, RefreshCw, ThumbsUp, 
  ThumbsDown, AlertCircle, Building2, Lock, Unlock, Eye, Database, Download,
  ChevronDown, ChevronUp, Check, Users, PhoneCall, MessageSquare
} from 'lucide-react';
import { OPERATIONAL_SEDES } from '../data/usersData';
import nodusFallbackData from '../data/nodusFallbackData.json';
import { sendReportToGoogleChat, getGoogleChatWebhookConfig, saveGoogleChatWebhookConfig } from '../services/googleChatService';

// POOL MAESTRO DE 12 PREGUNTAS ROTATIVAS (NODUS & CAUSA OS V1.0)
const POOL_PREGUNTAS = {
  bloque1: [
    { id: 'P1.1', categoria: 'Seguridad Psicológica', texto: '¿Sientes que puedes admitir un error operativo en el staff de tu sede sin temor a ser juzgado o señalado?', tipo: 'sino' },
    { id: 'P1.2', categoria: 'Seguridad Psicológica', texto: '¿Es seguro asumir riesgos o proponer dinámicas diferentes dentro de tu equipo de staff?', tipo: 'sino' },
    { id: 'P1.3', categoria: 'Seguridad Psicológica', texto: 'En los últimos 3 días, ¿sentiste que algún líder o coordinador intentó invalidar tus opiniones o ideas?', tipo: 'sino_inverso' },
    { id: 'P1.4', categoria: 'Seguridad Psicológica', texto: '¿Sientes que el equipo de tu sede cuida de ti y de tu bienestar bajo presión?', tipo: 'sino' }
  ],
  bloque2: [
    { id: 'P2.1', categoria: 'Calidad de Liderazgo (Oxygen)', texto: 'Mi Coordinador me dio feedback claro, específico y libre de drama durante este fin de semana.', tipo: 'likert' },
    { id: 'P2.2', categoria: 'Calidad de Liderazgo (Oxygen)', texto: 'Mi Coordinador me dio autonomía operativa y confió en mis capacidades (cero micromanagement).', tipo: 'likert' },
    { id: 'P2.3', categoria: 'Calidad de Liderazgo (Oxygen)', texto: 'Mi Coordinador mantuvo al equipo enfocado y sosteniendo el contenedor de energía en sala de forma asertiva.', tipo: 'likert' },
    { id: 'P2.4', categoria: 'Calidad de Liderazgo (Oxygen)', texto: 'Mi Coordinador priorizó el servicio y la fisonomía de los participantes por encima de su propio ego o lucimiento.', tipo: 'likert' }
  ],
  bloque3: [
    { id: 'P3.1', categoria: 'Fricción Burocrática (Humanocracy)', texto: '¿Tuviste que perder tiempo valioso en sala llenando reportes repetitivos o esperando aprobaciones lentas?', tipo: 'sino_inverso' },
    { id: 'P3.2', categoria: 'Fricción Burocrática (Humanocracy)', texto: '¿Los baúles e insumos logísticos de tu rol estaban en estado absoluto de excelencia y listos para operar?', tipo: 'sino' },
    { id: 'P3.3', categoria: 'Fricción Burocrática (Humanocracy)', texto: '¿Qué proceso o tarea de la sede consideras que deberíamos DETENER (Stop) de inmediato porque genera pereza o quita energía?', tipo: 'texto_stop' },
    { id: 'P3.4', categoria: 'Fricción Burocrática (Humanocracy)', texto: '¿Tuviste la fisionomía del reloj y el control de tus tiempos operativos bajo control este fin de semana?', tipo: 'sino' }
  ]
};

export default function ReportesBoard() {
  const { currentUser } = useAuth();
  const { currentCycle, currentStage } = useCycles();
  const { showToast } = useUI();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('formulario'); // 'formulario' | 'dashboard_evolucion'
  const [reportType, setReportType] = useState('');
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  // Control estricto de visibilidad: Solo Directivos y Gerentes pueden ver el Dashboard de Evolución (08/09/2026 - Confirmado por José)
  const role = (currentUser?.activeRole || currentUser?.appRole || currentUser?.role || '').toLowerCase();
  const roles = (currentUser?.roles || []).map(r => String(r).toLowerCase());
  const isDireccion = currentUser?.isDireccion || role === 'direccion' || roles.includes('direccion');
  const isGerente = currentUser?.isGerente || role === 'gerente' || roles.includes('gerente');

  const canViewEvolucionDashboard = Boolean(
    currentUser?.isSuperAdmin ||
    isDireccion ||
    isGerente ||
    ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'superadmin', 'consolidado', 'director_maestria'].includes(role) ||
    roles.some(r => ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'superadmin', 'consolidado', 'director_maestria'].includes(r))
  );

  // Micro-pulso state (selección aleatoria de 3 preguntas)
  const [pulsoQuestions, setPulsoQuestions] = useState([]);
  const [pulsoRespuestas, setPulsoRespuestas] = useState({});

  // Dashboard de evolución state
  const [relampagoReports, setRelampagoReports] = useState([]);
  const [pulsoReports, setPulsoReports] = useState([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Feed en tiempo real de Reportes Diarios para Gerentes y Directivos
  const [dailyReports, setDailyReports] = useState([]);
  const [loadingDailyReports, setLoadingDailyReports] = useState(true);
  const [filterSedeFeed, setFilterSedeFeed] = useState('Todas');
  const [expandedReportId, setExpandedReportId] = useState(null);

  // Sincronización inteligente de Nodus (Cero Pereza)
  const [loadingNodus, setLoadingNodus] = useState(false);
  const [nodusStatusMsg, setNodusStatusMsg] = useState('');
  const [nodusEquiposDisponibles, setNodusEquiposDisponibles] = useState([]);
  const [selectedNodusTeam, setSelectedNodusTeam] = useState('auto');
  const [nodusMatchedCoord, setNodusMatchedCoord] = useState(null);

  // Configuración de Webhook Google Chat
  const [showChatWebhookModal, setShowChatWebhookModal] = useState(false);
  const [chatWebhookUrl, setChatWebhookUrl] = useState('');
  const [chatWebhookEnabled, setChatWebhookEnabled] = useState(true);
  const [testingChatWebhook, setTestingChatWebhook] = useState(false);

  useEffect(() => {
    getGoogleChatWebhookConfig().then(cfg => {
      if (cfg?.webhookUrl) setChatWebhookUrl(cfg.webhookUrl);
      if (cfg?.enabled !== undefined) setChatWebhookEnabled(cfg.enabled);
    });
  }, []);

  const handleTestChatWebhook = async () => {
    if (!chatWebhookUrl.trim()) {
      showToast('Ingresa primero la URL del Webhook de Google Chat.', 'warning');
      return;
    }
    setTestingChatWebhook(true);
    try {
      await saveGoogleChatWebhookConfig({
        webhookUrl: chatWebhookUrl.trim(),
        enabled: chatWebhookEnabled
      });

      const testRep = {
        id: 'test_' + Date.now(),
        type: 'Llamadas',
        submitted_by: currentUser?.displayName || currentUser?.email || 'Diana Yesenia Moscoso Robles',
        sede: currentUser?.sede || 'Lima',
        cycle_id: currentCycle?.id || 'LIM-EQ-30',
        stage: currentStage || 'PRE-MJ',
        created_at: new Date().toISOString(),
        data: {
          nuevos_OK: 4,
          rezagados_OK: 8,
          nuevos_XC: 0,
          rezagados_XC: 0,
          nuevos_NC: 0,
          rezagados_NC: 34,
          nuevos_PENDIENTES: 44,
          rezagados_PENDIENTES: 67
        }
      };

      const res = await sendReportToGoogleChat(testRep);
      if (res.success) {
        showToast('¡Reporte de prueba enviado a Google Chat con éxito! Revisa tu espacio.', 'success');
      } else {
        showToast(`Google Chat respondió con error: ${res.error || res.reason}`, 'error');
      }
    } catch (err) {
      showToast('Error al conectar con el webhook de Google Chat.', 'error');
    } finally {
      setTestingChatWebhook(false);
    }
  };

  const handleSaveChatWebhook = async () => {
    const ok = await saveGoogleChatWebhookConfig({
      webhookUrl: chatWebhookUrl.trim(),
      enabled: chatWebhookEnabled
    });
    if (ok) {
      showToast('Configuración de Google Chat guardada exitosamente.', 'success');
      setShowChatWebhookModal(false);
    } else {
      showToast('Error al guardar configuración.', 'error');
    }
  };

  const handleExtraerDeNodus = async (teamOverride = null) => {
    setLoadingNodus(true);
    setNodusStatusMsg('');
    try {
      let nodusData = null;
      try {
        const docRef = doc(db, 'nodus_coordinadores_c1c2', 'latest');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          nodusData = docSnap.data();
        }
      } catch (err) {
        console.warn("Lectura Firestore nodus_coordinadores_c1c2 falló, usando respaldo local:", err);
      }

      if (!nodusData || !nodusData.coordinadores) {
        nodusData = nodusFallbackData;
      }

      const userEmail = (currentUser?.email || '').toLowerCase().trim();
      const userName = (currentUser?.displayName || currentUser?.name || '').toLowerCase().trim();
      const userSede = (currentUser?.sede || '').toLowerCase().trim();

      const coords = nodusData.coordinadores || [];
      
      // 1. Buscar coordinador por coincidencia de email o nombre
      let coord = coords.find(c => {
        const cEmail = (c.email || '').toLowerCase();
        const cNombre = (c.nombre || '').toLowerCase();
        const cNombreComp = (c.nombreCompleto || '').toLowerCase();
        return (userEmail && (cEmail === userEmail || userEmail.includes(cNombre))) ||
               (userName && (cNombreComp.includes(userName) || userName.includes(cNombreComp) || cNombre.includes(userName) || userName.includes(cNombre)));
      });

      // 2. Si Joyce está activa (simulada o real)
      if (!coord && (userName.includes('joyce') || userEmail.includes('joyce'))) {
        coord = coords.find(c => c.id === 'coord_joyce_lima' || (c.nombre || '').toLowerCase().includes('joyce'));
      }

      // 3. Si no se encuentra por nombre, buscar por sede operativa
      if (!coord && userSede) {
        coord = coords.find(c => (c.sede || '').toLowerCase() === userSede);
      }

      // 4. Fallback: primer coordinador
      if (!coord && coords.length > 0) {
        coord = coords[0];
      }

      if (!coord) {
        showToast('No se encontró información registrada en Nodus para este usuario.', 'error');
        setLoadingNodus(false);
        return;
      }

      setNodusMatchedCoord(coord);
      const equipos = coord.equipos || [];
      setNodusEquiposDisponibles(equipos);

      const targetTeamName = teamOverride !== null ? teamOverride : selectedNodusTeam;
      let targetData = null;
      let labelTarget = '';

      if (targetTeamName && targetTeamName !== 'auto' && targetTeamName !== 'acumulado') {
        targetData = equipos.find(e => e.equipo === targetTeamName);
        labelTarget = targetTeamName;
      } else if (targetTeamName === 'acumulado' || equipos.length === 0) {
        targetData = coord.estados;
        labelTarget = 'Total Acumulado';
      } else {
        // 'auto': primer equipo o el que tenga mayor actividad reciente
        targetData = equipos.find(e => (e.confirmado || 0) > 0) || equipos[0] || coord.estados;
        labelTarget = targetData?.equipo || 'Último Equipo';
      }

      if (!targetData) {
        targetData = coord.estados || {};
        labelTarget = 'General';
      }

      const nuevosValores = {
        nuevos_OK: Number(targetData.confirmado || 0),
        nuevos_XC: Number(targetData.porConfirmar || 0),
        nuevos_NC: Number(targetData.noContesta || 0),
        nuevos_NI: Number(targetData.noInteresa || 0),
        nuevos_SIG: Number(targetData.siguiente || 0),
        nuevos_OS: Number(targetData.yaAsistio || 0),
        nuevos_PENDIENTES: Number(targetData.pendientes || 0),
        rezagados_OK: Number(targetData.rezagados_OK || 0),
        rezagados_XC: Number(targetData.rezagados_XC || 0),
        rezagados_NC: Number(targetData.rezagados_NC || 0),
        rezagados_NI: Number(targetData.rezagados_NI || 0),
        rezagados_SIG: Number(targetData.rezagados_SIG || 0),
        rezagados_PENDIENTES: Number(targetData.rezagados_PENDIENTES || 0),
        sede_id: coord.sede || currentUser?.sede || 'Lima'
      };

      setFormData(prev => ({
        ...prev,
        ...nuevosValores
      }));

      const coordLabel = coord.nombreCompleto || coord.nombre;
      const msg = `Nodus Sincronizado: ${coordLabel} (${coord.sede}) • ${labelTarget} -> ${nuevosValores.nuevos_OK} OK (Confirmados), ${nuevosValores.nuevos_XC} XC, ${nuevosValores.nuevos_NC} NC.`;
      setNodusStatusMsg(msg);
      showToast(`¡Datos extraídos de Nodus con éxito! (${labelTarget})`, 'success');
    } catch (e) {
      console.error("Error al extraer datos de Nodus:", e);
      showToast('Error al extraer datos de Nodus.', 'error');
    } finally {
      setLoadingNodus(false);
    }
  };

  // Inicializar o regenerar preguntas del Micro-Pulso
  const shufflePulso = () => {
    const q1 = POOL_PREGUNTAS.bloque1[Math.floor(Math.random() * POOL_PREGUNTAS.bloque1.length)];
    const q2 = POOL_PREGUNTAS.bloque2[Math.floor(Math.random() * POOL_PREGUNTAS.bloque2.length)];
    const q3 = POOL_PREGUNTAS.bloque3[Math.floor(Math.random() * POOL_PREGUNTAS.bloque3.length)];
    setPulsoQuestions([q1, q2, q3]);
    setPulsoRespuestas({});
  };

  useEffect(() => {
    setFormData({});
    if (reportType === 'MicroPulsoStaff') {
      shufflePulso();
    }
  }, [reportType]);

  // Cargar datos para el dashboard de evolución (solo si tiene permisos de directivo o gerente)
  useEffect(() => {
    if (!canViewEvolucionDashboard && activeTab === 'dashboard_evolucion') {
      setActiveTab('formulario');
      return;
    }
    if (activeTab === 'dashboard_evolucion' && canViewEvolucionDashboard) {
      fetchEvolucionData();
    }
  }, [activeTab, canViewEvolucionDashboard]);

  const fetchEvolucionData = async () => {
    setLoadingDashboard(true);
    try {
      const qRel = query(collection(db, 'reports'), where('type', '==', 'ReporteRelampagoFDS'), limit(50));
      const snapRel = await getDocs(qRel);
      setRelampagoReports(snapRel.docs.map(d => ({ id: d.id, ...d.data() })));

      const qPul = query(collection(db, 'reports'), where('type', '==', 'MicroPulsoStaff'), limit(100));
      const snapPul = await getDocs(qPul);
      setPulsoReports(snapPul.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Error fetching dashboard evolucion data:", e);
    } finally {
      setLoadingDashboard(false);
    }
  };

  // Inicializar sede del filtro
  useEffect(() => {
    if (currentUser?.sede && !isDireccion) {
      setFilterSedeFeed(currentUser.sede);
    }
  }, [currentUser?.sede, isDireccion]);

  // Escuchar reportes en tiempo real para Directivos y Gerentes
  useEffect(() => {
    if (!canViewEvolucionDashboard && !isDireccion && !isGerente) return;
    try {
      const qReports = query(collection(db, 'reports'), orderBy('created_at', 'desc'), limit(50));
      const unsub = onSnapshot(qReports, (snapshot) => {
        const reps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setDailyReports(reps);
        setLoadingDailyReports(false);
      }, (err) => {
        console.warn("Error escuchando reports en tiempo real:", err);
        setLoadingDailyReports(false);
      });
      return () => unsub();
    } catch (err) {
      console.warn("Error iniciando listener de reports:", err);
      setLoadingDailyReports(false);
    }
  }, [canViewEvolucionDashboard, isDireccion, isGerente]);

  const handleMarkReviewed = async (reportId) => {
    try {
      const repRef = doc(db, 'reports', reportId);
      await updateDoc(repRef, {
        reviewedBy: currentUser?.displayName || currentUser?.name || currentUser?.email || 'Gerencia',
        reviewedAt: new Date().toISOString()
      });
      showToast('Reporte marcado como auditado/revisado.', 'success');
    } catch (e) {
      console.error(e);
      showToast('Error al marcar reporte como revisado.', 'error');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const val = isNaN(value) || value === '' ? value : Number(value);
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const calculateTotalLlamadas = (seccion) => {
    const keys = ['OK', 'XC', 'NC', 'NI', 'SIG', 'OS', 'PENDIENTES'];
    let total = 0;
    keys.forEach(k => {
      total += (formData[`${seccion}_${k}`] || 0);
    });
    return total;
  };

  // Cálculo de Tasa de Retención Operativa (TRO) para Reporte Relámpago
  const troCalculado = useMemo(() => {
    const sentados = Number(formData.sentados_inicio) || 0;
    const graduados = Number(formData.graduados_cierre) || 0;
    if (sentados <= 0) return 0;
    return Number(((graduados / sentados) * 100).toFixed(1));
  }, [formData.sentados_inicio, formData.graduados_cierre]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reportType) return;
    setLoading(true);

    try {
      let finalData = { ...formData };

      // Caso especial: Reporte Relámpago
      if (reportType === 'ReporteRelampagoFDS') {
        finalData.tasa_retencion_automatica = troCalculado;
        finalData.sede_id = formData.sede_id || currentUser?.sede || 'SEDE-LIMA-01';
        finalData.deadline_cumplido = true;
      }

      // Caso especial: Micro-Pulso
      if (reportType === 'MicroPulsoStaff') {
        finalData.preguntas_respondidas = pulsoQuestions.map(q => ({
          pregunta_id: q.id,
          categoria: q.categoria,
          texto: q.texto,
          valor_respuesta: pulsoRespuestas[q.id] || ''
        }));
        finalData.staff_id = currentUser?.uid || 'anon-staff';
        finalData.email = currentUser?.email || 'anon@crearpsl.net';
        finalData.sede_id = currentUser?.sede || 'SEDE-LIMA-01';
      }

      // 1. Guardar en Firestore
      const newReportRef = await addDoc(collection(db, 'reports'), {
        type: reportType,
        cycle_id: currentCycle?.id || 'CICLO-2026',
        stage: currentStage || 'C1',
        submitted_by: currentUser?.displayName || currentUser?.email || 'Staff Autorizado',
        sede: currentUser?.sede || formData.sede_id || 'Global',
        created_at: new Date().toISOString(),
        data: finalData
      });

      // 1.1 Enviar automáticamente al espacio de Google Chat configurado
      sendReportToGoogleChat({
        id: newReportRef.id,
        type: reportType,
        cycle_id: currentCycle?.id || 'CICLO-2026',
        stage: currentStage || 'C1',
        submitted_by: currentUser?.displayName || currentUser?.email || 'Staff Autorizado',
        sede: currentUser?.sede || formData.sede_id || 'Global',
        created_at: new Date().toISOString(),
        data: finalData
      }).catch(chatErr => {
        console.warn('Google Chat notification fallback:', chatErr);
      });

      // 2. Regla para Llamadas
      if (reportType === 'Llamadas') {
        const totalOkNuevos = formData['nuevos_OK'] || 0;
        const totalOkRezagados = formData['rezagados_OK'] || 0;
        const totalOk = totalOkNuevos + totalOkRezagados;

        if (totalOk > 0) {
          const goalsQ = query(collection(db, 'goals'), where('scope', '==', 'ENTRENAMIENTO'));
          const snapshot = await getDocs(goalsQ);
          const entGoalDoc = snapshot.docs.find(d => {
            const dData = d.data();
            const stageMatches = dData.stage === currentStage || (currentStage?.includes('C1') && dData.stage === 'C1');
            return stageMatches && (dData.title?.includes('Px') || dData.title?.includes('Sentados') || dData.kpi?.includes('Px'));
          });
          
          if (entGoalDoc) {
            const data = entGoalDoc.data();
            const currentVal = data.currentValue || 0;
            const newVal = currentVal + totalOk;
            const target = data.targetValue || 1;
            const newProgress = Math.min(100, Math.round((newVal / target) * 100));

            await updateDoc(doc(db, 'goals', entGoalDoc.id), {
              currentValue: newVal,
              progress: newProgress,
              updatedAt: new Date().toISOString()
            });
          }
        }
      }

      showToast('¡Reporte enviado exitosamente con protocolo Cero Pereza!', 'success');
      setReportType('');
      setFormData({});
      setPulsoRespuestas({});
    } catch (err) {
      console.error(err);
      showToast('Hubo un error al enviar el reporte.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Renderizador de formularios
  const renderFormFields = () => {
    // -------------------------------------------------------------
    // 1. REPORTE RELÁMPAGO POST-FDS (GERENTE DE SEDE <3 MIN)
    // -------------------------------------------------------------
    if (reportType === 'ReporteRelampagoFDS') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
          {/* HEADER INFORMATIVO DE HORARIOS */}
          <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))', border: '1px solid #f59e0b', borderRadius: '10px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24', fontWeight: 800, fontSize: '0.95rem' }}>
                <Zap size={18} /> REPORTE RELÁMPAGO POST-FDS (GERENTES DE SEDE)
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                ⏰ Habilitado: <strong>Domingo 21:00 PM</strong> | 🔒 Deadline: <strong style={{ color: '#ef4444' }}>Lunes 12:00 PM (Mediodía)</strong>
              </div>
            </div>
            <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
              🔒 Prerrequisito para Liberación Presupuestaria
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            <div>
              <label className="text-muted" style={{ fontSize: '0.82rem', display: 'block', marginBottom: '0.3rem' }}>Sede Operativa *</label>
              <select name="sede_id" onChange={handleChange} className="form-input" required defaultValue={currentUser?.sede || ''}>
                <option value="">-- Selecciona Sede --</option>
                {OPERATIONAL_SEDES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-muted" style={{ fontSize: '0.82rem', display: 'block', marginBottom: '0.3rem' }}>Fin de Semana / FDS Tipo *</label>
              <select name="fds_tipo" onChange={handleChange} className="form-input" required>
                <option value="Capítulo Uno">Capítulo Uno (C1)</option>
                <option value="Capítulo Dos">Capítulo Dos (C2)</option>
                <option value="Maestría del Juego">Maestría del Juego (MJ)</option>
              </select>
            </div>
          </div>

          {/* PUNTO 1: ENTRENADOR */}
          <div style={{ background: 'rgba(0,0,0,0.35)', padding: '1rem', borderRadius: '10px', borderLeft: '4px solid #38bdf8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.9rem' }}>1. Evaluación del Entrenador (Fisonomía en Sala)</span>
              <span style={{ color: 'var(--crear-gold)', fontWeight: 800, fontSize: '1rem' }}>{formData.entrenador_score || 5} ★</span>
            </div>
            <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              ¿Sostuvo el entrenador el código de ética, la puntualidad del reloj y la fisonomía de transformación sin caer en el drama o la agresión?
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
              {[1, 2, 3, 4, 5].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, entrenador_score: val }))}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: (formData.entrenador_score || 5) === val ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                    background: (formData.entrenador_score || 5) === val ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.03)',
                    color: (formData.entrenador_score || 5) === val ? '#fff' : 'var(--text-muted)',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {val} ★
                </button>
              ))}
            </div>
            <input
              type="text"
              name="entrenador_comentario"
              maxLength={150}
              placeholder="Comentario relámpago (máx 150 caracteres)..."
              onChange={handleChange}
              className="form-input"
            />
            <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {(formData.entrenador_comentario?.length || 0)}/150 caracteres
            </div>
          </div>

          {/* PUNTO 2: INFRAESTRUCTURA */}
          <div style={{ background: 'rgba(0,0,0,0.35)', padding: '1rem', borderRadius: '10px', borderLeft: '4px solid #fbbf24' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.9rem' }}>2. Logística e Infraestructura de Sede</span>
              <span style={{ color: 'var(--crear-gold)', fontWeight: 800, fontSize: '1rem' }}>{formData.infraestructura_score || 5} ★</span>
            </div>
            <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Estado del hotel, temperatura del salón, acústica, limpieza de baños y disponibilidad de baúles de sala.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
              {[1, 2, 3, 4, 5].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, infraestructura_score: val }))}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: (formData.infraestructura_score || 5) === val ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                    background: (formData.infraestructura_score || 5) === val ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.03)',
                    color: (formData.infraestructura_score || 5) === val ? '#fff' : 'var(--text-muted)',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {val} ★
                </button>
              ))}
            </div>
            <input
              type="text"
              name="infraestructura_comentario"
              maxLength={150}
              placeholder="Comentario relámpago (máx 150 caracteres)..."
              onChange={handleChange}
              className="form-input"
            />
            <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {(formData.infraestructura_comentario?.length || 0)}/150 caracteres
            </div>
          </div>

          {/* PUNTO 3: STAFF */}
          <div style={{ background: 'rgba(0,0,0,0.35)', padding: '1rem', borderRadius: '10px', borderLeft: '4px solid #10b981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.9rem' }}>3. Energía y Alineación del Staff</span>
              <span style={{ color: 'var(--crear-gold)', fontWeight: 800, fontSize: '1rem' }}>{formData.staff_score || 5} ★</span>
            </div>
            <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Puntualidad en los groundings, vestimenta negra impecable y fisonomía de servicio del equipo de aliados y mánagers.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
              {[1, 2, 3, 4, 5].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, staff_score: val }))}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: (formData.staff_score || 5) === val ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                    background: (formData.staff_score || 5) === val ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.03)',
                    color: (formData.staff_score || 5) === val ? '#fff' : 'var(--text-muted)',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {val} ★
                </button>
              ))}
            </div>
            <input
              type="text"
              name="staff_comentario"
              maxLength={150}
              placeholder="Comentario relámpago (máx 150 caracteres)..."
              onChange={handleChange}
              className="form-input"
            />
            <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {(formData.staff_comentario?.length || 0)}/150 caracteres
            </div>
          </div>

          {/* PUNTO 4: INDICADORES DE RETENCIÓN REAL (TRO) */}
          <div style={{ background: 'rgba(0,0,0,0.35)', padding: '1rem', borderRadius: '10px', borderLeft: '4px solid #a78bfa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ color: '#a78bfa', fontWeight: 800, fontSize: '0.9rem' }}>4. Indicadores de Retención Real (TRO Automática)</span>
              <span style={{ 
                color: troCalculado >= 95 ? '#10b981' : troCalculado >= 85 ? '#fbbf24' : '#ef4444', 
                fontWeight: 800, 
                fontSize: '1.05rem',
                background: 'rgba(0,0,0,0.4)',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                TRO: {troCalculado}%
              </span>
            </div>
            <p style={{ margin: '0 0 0.8rem 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Cálculo inmediato de Tasa de Retención Operativa = <code>(Graduados / Sentados) * 100</code>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="text-muted" style={{ fontSize: '0.78rem', display: 'block', marginBottom: '0.2rem' }}>PX Sentados (Viernes):</label>
                <input
                  type="number"
                  name="sentados_inicio"
                  placeholder="Ej: 120"
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="text-muted" style={{ fontSize: '0.78rem', display: 'block', marginBottom: '0.2rem' }}>PX Graduados (Domingo):</label>
                <input
                  type="number"
                  name="graduados_cierre"
                  placeholder="Ej: 118"
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
            </div>
          </div>

          {/* PUNTO 5: QUIEBRES CRÍTICOS Y ESCALAMIENTO */}
          <div style={{ background: 'rgba(0,0,0,0.35)', padding: '1rem', borderRadius: '10px', borderLeft: '4px solid #ef4444' }}>
            <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.9rem', display: 'block', marginBottom: '0.4rem' }}>
              5. Quiebres Críticos y Alertas de Escalamiento
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginBottom: '0.8rem' }}>
              {[
                { id: 'Ninguno', label: '✓ Ninguno (Todo Impecable)' },
                { id: 'Salud', label: '🚑 Quiebre de Salud / Médica' },
                { id: 'Financiero', label: '💰 Descuadre de Caja / POS' },
                { id: 'PalabraRota', label: '⚖️ Palabra Rota Crítica' },
                { id: 'Desercion', label: '🚶 Deserción de Mánagers' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, tipo_quiebre: opt.id }))}
                  style={{
                    padding: '0.5rem 0.7rem',
                    borderRadius: '6px',
                    border: (formData.tipo_quiebre || 'Ninguno') === opt.id ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.08)',
                    background: (formData.tipo_quiebre || 'Ninguno') === opt.id ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.02)',
                    color: (formData.tipo_quiebre || 'Ninguno') === opt.id ? '#fff' : 'var(--text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {(formData.tipo_quiebre && formData.tipo_quiebre !== 'Ninguno') && (
              <div>
                <textarea
                  name="detalle_escalamiento"
                  maxLength={200}
                  placeholder="Detalle de la alerta para Dirección Global (máx 200 caracteres)..."
                  onChange={handleChange}
                  className="form-input"
                  rows={2}
                  required
                />
                <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#fca5a5', marginTop: '0.2rem' }}>
                  {(formData.detalle_escalamiento?.length || 0)}/200 caracteres • Se enviará notificación prioritaria
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // -------------------------------------------------------------
    // 2. MICRO-PULSO DE STAFF (3 PREGUNTAS ROTATIVAS <30 SEG)
    // -------------------------------------------------------------
    if (reportType === 'MicroPulsoStaff') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
          {/* BANNER INFORMATIVO */}
          <div style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(167,139,250,0.1))', border: '1px solid #38bdf8', borderRadius: '10px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', fontWeight: 800, fontSize: '0.95rem' }}>
                <Sparkles size={18} /> MICRO-PULSO ALEATORIO DE STAFF (3 PREGUNTAS • &lt;30 SEG)
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                ⏰ Cadencia: <strong>Lunes 11:00 AM</strong> a <strong style={{ color: '#ef4444' }}>Martes 18:00 PM</strong> (Cero prórroga)
              </div>
            </div>
            <button
              type="button"
              onClick={shufflePulso}
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <RefreshCw size={13} /> Re-sortear Preguntas
            </button>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Nodus ha seleccionado dinámicamente 1 pregunta de cada bloque crítico para ti:
          </div>

          {pulsoQuestions.map((q, idx) => (
            <div key={q.id} style={{ background: 'rgba(0,0,0,0.35)', padding: '1.1rem', borderRadius: '10px', borderLeft: `4px solid ${idx === 0 ? '#38bdf8' : idx === 1 ? '#fbbf24' : '#ec4899'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', color: idx === 0 ? '#38bdf8' : idx === 1 ? '#fbbf24' : '#ec4899', fontWeight: 800, textTransform: 'uppercase' }}>
                  BLOQUE {idx + 1} • {q.categoria}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{q.id}</span>
              </div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.8rem', lineHeight: 1.4 }}>
                {q.texto}
              </div>

              {/* TIPO: SÍ / NO */}
              {(q.tipo === 'sino' || q.tipo === 'sino_inverso') && (
                <div style={{ display: 'flex', gap: '1rem' }}>
                  {['SI', 'NO'].map(resp => (
                    <button
                      key={resp}
                      type="button"
                      onClick={() => setPulsoRespuestas(prev => ({ ...prev, [q.id]: resp }))}
                      style={{
                        flex: 1,
                        padding: '0.6rem',
                        borderRadius: '8px',
                        fontWeight: 800,
                        border: pulsoRespuestas[q.id] === resp ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                        background: pulsoRespuestas[q.id] === resp ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.03)',
                        color: pulsoRespuestas[q.id] === resp ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      {resp === 'SI' ? '👍 Sí' : '👎 No'}
                    </button>
                  ))}
                </div>
              )}

              {/* TIPO: LIKERT 1-5 */}
              {q.tipo === 'likert' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[1, 2, 3, 4, 5].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPulsoRespuestas(prev => ({ ...prev, [q.id]: val }))}
                      style={{
                        flex: 1,
                        padding: '0.6rem',
                        borderRadius: '8px',
                        fontWeight: 800,
                        border: pulsoRespuestas[q.id] === val ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                        background: pulsoRespuestas[q.id] === val ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.03)',
                        color: pulsoRespuestas[q.id] === val ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      {val} ★
                    </button>
                  ))}
                </div>
              )}

              {/* TIPO: TEXTO STOP (OPCIONAL) */}
              {q.tipo === 'texto_stop' && (
                <div>
                  <textarea
                    rows={2}
                    placeholder="Escribe aquí el proceso que debemos DETENER (ej: planilla física redundante)... Opcional."
                    value={pulsoRespuestas[q.id] || ''}
                    onChange={e => setPulsoRespuestas(prev => ({ ...prev, [q.id]: e.target.value }))}
                    className="form-input"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    // -------------------------------------------------------------
    // REPORTES ANTERIORES PRESERVADOS AL 100%
    // -------------------------------------------------------------
    if (reportType === 'FDS') {
      return (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <h4 className="text-blue">Reporte FDS (Sede C1)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input type="number" name="px_nuevos" placeholder="PX Nuevos Sentados" onChange={handleChange} className="form-input" />
            <input type="number" name="px_rezagados" placeholder="PX Rezagados Sentados" onChange={handleChange} className="form-input" />
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px', gridColumn: '1 / -1' }}>
                <span className="text-gold font-bold">Total PX Sentados: </span> 
                <span className="text-white">{(parseInt(formData.px_nuevos) || 0) + (parseInt(formData.px_rezagados) || 0)}</span>
            </div>
            <input type="number" name="aliados_sentados" placeholder="Aliados Sentados" onChange={handleChange} className="form-input" />
            {((parseInt(formData.aliados_sentados) || 0) < ((parseInt(formData.px_nuevos) || 0) + (parseInt(formData.px_rezagados) || 0)) / 6) && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.5rem', borderRadius: '4px', gridColumn: '1 / -1', fontSize: '0.85rem' }}>
                   ⚠️ Ratio de contención insuficiente (mínimo 1 aliado por cada 6 PX).
                </div>
            )}
            <input type="number" name="px_bajaron" placeholder="Px que se bajaron durante fds" onChange={handleChange} className="form-input" />
            <input type="number" name="declaracion_px" placeholder="Declaración Px" onChange={handleChange} className="form-input" />
            <input type="number" name="enrolamiento" placeholder="Enrolamiento" onChange={handleChange} className="form-input" />
            <input type="number" name="px_en_0" placeholder="Px en 0" onChange={handleChange} className="form-input" />
            <input type="text" name="capitan" placeholder="Nombre Capitán" onChange={handleChange} className="form-input" />
            <input type="number" name="managers_llegaron" placeholder="Managers que llegaron" onChange={handleChange} className="form-input" />
            <input type="number" name="capitan_quedo" placeholder="Capitanes que quedaron" onChange={handleChange} className="form-input" />
            <input type="number" name="managers_quedaron" placeholder="Managers que quedaron" onChange={handleChange} className="form-input" />
            <input type="text" name="declaracion" placeholder="Declaración" onChange={handleChange} className="form-input" />
            <input type="number" name="total" placeholder="Total" onChange={handleChange} className="form-input" />
            <input type="number" name="promedio" placeholder="Promedio fin de semana" onChange={handleChange} className="form-input" step="0.01" />
          </div>
          <textarea name="comentarios" placeholder="Comentarios adicionales" onChange={handleChange} className="form-input" rows="3"></textarea>
        </div>
      );
    }

    if (reportType === 'Llamadas') {
      const metrics = ['OK', 'XC', 'NC', 'NI', 'SIG', 'OS', 'PENDIENTES'];
      return (
        <div style={{ display: 'grid', gap: '2rem' }}>
          <div>
            <h4 className="text-blue" style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(0,212,255,0.2)' }}>Nuevos</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {metrics.map(m => (
                <div key={`nuevos_${m}`}>
                  <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>{m}</label>
                  <input 
                    type="number" 
                    name={`nuevos_${m}`} 
                    value={formData[`nuevos_${m}`] !== undefined ? formData[`nuevos_${m}`] : ''} 
                    onChange={handleChange} 
                    className="form-input" 
                    placeholder="0" 
                  />
                </div>
              ))}
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                 <label className="text-gold" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>TOTAL NUEVOS</label>
                 <span className="text-white font-bold">{calculateTotalLlamadas('nuevos')}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-blue" style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(0,212,255,0.2)' }}>Rezagados</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {metrics.filter(m => m !== 'OS').map(m => (
                <div key={`rezagados_${m}`}>
                  <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>{m}</label>
                  <input 
                    type="number" 
                    name={`rezagados_${m}`} 
                    value={formData[`rezagados_${m}`] !== undefined ? formData[`rezagados_${m}`] : ''} 
                    onChange={handleChange} 
                    className="form-input" 
                    placeholder="0" 
                  />
                </div>
              ))}
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                 <label className="text-gold" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>TOTAL REZAGADOS</label>
                 <span className="text-white font-bold">{calculateTotalLlamadas('rezagados')}</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(52, 168, 83, 0.1)', border: '1px solid #34a853', padding: '1rem', borderRadius: '8px' }}>
            <p style={{ margin: 0, color: '#34a853', fontSize: '0.9rem' }}>
              💡 Al enviar este reporte, los "OK" se sumarán automáticamente a la Meta de Entrenamiento activa para evitar doble digitación.
            </p>
          </div>

          {/* BOTÓN Y PANEL DE EXTRACCIÓN AUTOMÁTICA DESDE NODUS */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(41, 171, 226, 0.12) 0%, rgba(3, 105, 161, 0.08) 100%)',
            border: '1px solid rgba(41, 171, 226, 0.35)',
            borderRadius: '10px',
            padding: '1.2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.8rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ background: 'rgba(41, 171, 226, 0.2)', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Database size={20} color="var(--crear-cyan, #29abe2)" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    Sincronización Nodus
                    <span style={{ fontSize: '0.7rem', background: 'rgba(41, 171, 226, 0.25)', color: 'var(--crear-cyan, #29abe2)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                      Cero Pereza
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Auto-completa los campos de llamadas directamente con los datos auditados en Nodus.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                {nodusEquiposDisponibles.length > 0 && (
                  <select
                    value={selectedNodusTeam}
                    onChange={(e) => {
                      setSelectedNodusTeam(e.target.value);
                      handleExtraerDeNodus(e.target.value);
                    }}
                    className="form-input"
                    style={{ width: 'auto', minWidth: '170px', padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
                  >
                    <option value="auto">⚡ Equipo Activo</option>
                    <option value="acumulado">📊 Total Acumulado</option>
                    {nodusEquiposDisponibles.map(eq => (
                      <option key={eq.equipo} value={eq.equipo}>
                        {eq.equipo} ({eq.confirmado || 0} OK)
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => handleExtraerDeNodus()}
                  disabled={loadingNodus}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#fff',
                    border: '1px solid #38bdf8',
                    borderRadius: '8px',
                    padding: '0.65rem 1.4rem',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                    transition: 'all 0.2s'
                  }}
                >
                  {loadingNodus ? <RefreshCw size={16} className="spin" /> : <Download size={16} />}
                  {loadingNodus ? 'Extrayendo de Nodus...' : 'Extraer de Nodus'}
                </button>
              </div>
            </div>

            {nodusStatusMsg && (
              <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '0.6rem 0.9rem', borderRadius: '6px', fontSize: '0.82rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} color="#34d399" />
                <span>{nodusStatusMsg}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (reportType === 'C2') {
      return (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <h4 className="text-blue">Reporte Capítulo Dos</h4>
          <textarea name="detalle" placeholder="Detalle: (Px, Aliados, Capitán, Entrenador, Desertores)" onChange={handleChange} className="form-input" rows="4"></textarea>
          
          <h5 className="text-gold" style={{ margin: '1rem 0 0.5rem 0' }}>Registro Financiero C2 (Obligatorio)</h5>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
             <select name="nomenclatura_pago" onChange={handleChange} className="form-input" required>
                <option value="">-- Nomenclatura --</option>
                <option value="C2">C2 (Solo Capítulo 2)</option>
                <option value="C2+MJ">C2+MJ (Paquete Completo)</option>
                <option value="MJ">MJ (Solo Maestría)</option>
             </select>
             <select name="via_pago" onChange={handleChange} className="form-input" required>
                <option value="">-- Vía de Pago --</option>
                <option value="TRANSF">TRANSF (Transferencia)</option>
                <option value="TC">TC (Tarjeta Crédito)</option>
                <option value="LINK">LINK (Botón Pagos)</option>
                <option value="EFECTIVO">EFECTIVO</option>
                <option value="USDT">USDT (Crypto)</option>
                <option value="PAYPHONE">PAYPHONE</option>
                <option value="PAYPAL">PAYPAL</option>
             </select>
             <input type="number" name="pagos_c2_mj" placeholder="Monto Total Procesado" onChange={handleChange} className="form-input" />
             <input type="number" name="pagos_rotos" placeholder="Pagos Rotos / Desertores" onChange={handleChange} className="form-input" />
          </div>
        </div>
      );
    }

    if (reportType === 'MJ') {
      return (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <h4 className="text-blue">Reporte Maestría del Juego</h4>
          <select name="subtipo" onChange={handleChange} className="form-input">
            <option value="">Selecciona sección...</option>
            <option value="Asistencia">Asistencia</option>
            <option value="Declaracion">Declaración</option>
            <option value="Enrolamiento">Enrolamiento</option>
          </select>
          {formData.subtipo && (
             <textarea name="contenido" placeholder={`Contenido para ${formData.subtipo}...`} onChange={handleChange} className="form-input" rows="5"></textarea>
          )}
        </div>
      );
    }

    if (reportType === 'QT_Contexto') {
      return (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <h4 className="text-blue">Reporte de Contexto (QT)</h4>
          <textarea name="contexto" placeholder="Escribe aquí lo que estás viendo en el contexto..." onChange={handleChange} className="form-input" rows="8"></textarea>
        </div>
      );
    }

    return <p className="text-muted">Selecciona un tipo de reporte para ver el formato.</p>;
  };

  const filteredDailyReports = useMemo(() => {
    return dailyReports.filter(r => {
      if (!filterSedeFeed || filterSedeFeed === 'Todas') return true;
      const rSede = (r.sede || r.data?.sede_id || '').toLowerCase();
      const fSede = filterSedeFeed.toLowerCase();
      return rSede.includes(fSede) || fSede.includes(rSede);
    });
  }, [dailyReports, filterSedeFeed]);

  const formatReportDate = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1rem' }}>
      <style>{`
        .form-input {
          width: 100%; padding: 0.8rem; background: rgba(0,0,0,0.5); 
          border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 6px;
          box-sizing: border-box;
        }
        .form-input:focus {
          outline: none; border-color: var(--crear-cyan, #29abe2);
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
            <ArrowLeft size={18} /> Volver al Inicio
          </button>
          {canViewEvolucionDashboard && (
            <button
              onClick={() => setShowChatWebhookModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: chatWebhookUrl ? 'rgba(41, 171, 226, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                border: chatWebhookUrl ? '1px solid var(--crear-cyan)' : '1px solid rgba(255,255,255,0.2)',
                color: chatWebhookUrl ? 'var(--crear-cyan)' : 'var(--text-muted)',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
              title="Configurar webhook para enviar reportes a un espacio de Google Chat"
            >
              <MessageSquare size={16} />
              {chatWebhookUrl ? 'Google Chat Conectado' : 'Conectar Google Chat'}
            </button>
          )}
        </div>

        {/* CONMUTADOR DE VISTAS (Solo Directivos y Gerentes) */}
        {canViewEvolucionDashboard ? (
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '8px' }}>
            <button
              onClick={() => setActiveTab('formulario')}
              style={{
                padding: '0.5rem 1.2rem',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'formulario' ? 'var(--crear-cyan, #29abe2)' : 'transparent',
                color: activeTab === 'formulario' ? '#000' : 'var(--text-muted)',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <FileText size={16} /> Enviar Reportes
            </button>
            <button
              onClick={() => setActiveTab('dashboard_evolucion')}
              style={{
                padding: '0.5rem 1.2rem',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'dashboard_evolucion' ? 'var(--crear-gold, #ffb703)' : 'transparent',
                color: activeTab === 'dashboard_evolucion' ? '#000' : 'var(--text-muted)',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <BarChart3 size={16} /> Dashboard Evolución (Causa OS)
            </button>
          </div>
        ) : (
          <div style={{ fontWeight: 800, color: 'var(--crear-cyan)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileText size={16} /> Módulo Oficial de Reportes
          </div>
        )}
      </div>

      {/* VISTA 1: FORMULARIO DE REPORTES */}
      {activeTab === 'formulario' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <FileText size={32} className="text-gold" />
            <div>
              <h1 className="text-gold uppercase" style={{ margin: 0, fontSize: '1.6rem' }}>Centro de Reportes Operativos</h1>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                Sistema Nodus & Causa OS • Formatos de Baja Fricción («Cero Pereza») y Alta Impecabilidad
              </p>
            </div>
          </div>

          {/* ACCESOS DIRECTOS DESTACADOS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {/* CARD 1: REPORTE RELAMPAGO GERENTE (Solo Directivos y Gerentes) */}
            {canViewEvolucionDashboard && (
              <div 
                onClick={() => setReportType('ReporteRelampagoFDS')}
                style={{
                  background: reportType === 'ReporteRelampagoFDS' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.03)',
                  border: reportType === 'ReporteRelampagoFDS' ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '1.2rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Zap size={15} /> GERENTES DE SEDE
                  </span>
                  <span style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                    &lt; 3 minutos
                  </span>
                </div>
                <h3 style={{ margin: '0 0 0.3rem', fontSize: '1.1rem', color: '#fff' }}>⚡ Reporte Relámpago Post-FDS</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Evaluación 5 Puntos (Entrenador, Logística, Staff, Retención TRO y Quiebres). Habilitado Domingo 21:00 a Lunes 12:00 PM.
                </p>
              </div>
            )}

            {/* CARD 2: MICRO-PULSO STAFF */}
            <div 
              onClick={() => setReportType('MicroPulsoStaff')}
              style={{
                background: reportType === 'MicroPulsoStaff' ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.03)',
                border: reportType === 'MicroPulsoStaff' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '1.2rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Sparkles size={15} /> STAFF & VOLUNTARIOS
                </span>
                <span style={{ background: 'rgba(56,189,248,0.2)', color: '#38bdf8', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                  &lt; 30 segundos
                </span>
              </div>
              <h3 style={{ margin: '0 0 0.3rem', fontSize: '1.1rem', color: '#fff' }}>🎧 Micro-Pulso Aleatorio</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                3 preguntas dinámicas (Seguridad psicológica, liderazgo y freno a la fricción Stop). Lunes 11:00 AM a Martes 18:00 PM.
              </p>
            </div>
          </div>

          {/* BANDEJA DE REPORTES DIARIOS (DIRECTIVOS Y GERENTES) */}
          {canViewEvolucionDashboard && (
            <div style={{ marginBottom: '2.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <div style={{ background: 'rgba(41, 171, 226, 0.15)', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={22} color="var(--crear-cyan, #29abe2)" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      Reportes Diarios de Coordinadores
                      <span style={{ fontSize: '0.72rem', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                        En Vivo
                      </span>
                    </h2>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Monitoreo en tiempo real de llamadas, avances y confirmados reportados por los coordinadores de sede.
                    </p>
                  </div>
                </div>

                {/* FILTRO POR SEDE */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>Filtrar Sede:</span>
                  <select
                    value={filterSedeFeed}
                    onChange={e => setFilterSedeFeed(e.target.value)}
                    className="form-input"
                    style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  >
                    <option value="Todas">🌐 Todas las Sedes</option>
                    <option value="Lima">Lima</option>
                    <option value="Quito">Quito</option>
                    <option value="Guayaquil">Guayaquil</option>
                    <option value="Cuenca">Cuenca</option>
                    <option value="Bogota">Bogotá</option>
                    <option value="Medellin">Medellín</option>
                    <option value="Mexico">México</option>
                  </select>
                </div>
              </div>

              {/* LISTA DE REPORTES */}
              {loadingDailyReports ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>Cargando reportes diarios de coordinadores...</p>
                </div>
              ) : filteredDailyReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <CheckCircle2 size={32} color="#64748b" style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
                    No hay reportes recientes registrados para <strong>{filterSedeFeed}</strong>.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  {filteredDailyReports.map(rep => {
                    const isExpanded = expandedReportId === rep.id;
                    const d = rep.data || {};
                    const totalOk = (Number(d.nuevos_OK) || 0) + (Number(d.rezagados_OK) || 0);
                    const totalXc = (Number(d.nuevos_XC) || 0) + (Number(d.rezagados_XC) || 0);
                    const totalNc = (Number(d.nuevos_NC) || 0) + (Number(d.rezagados_NC) || 0);
                    const totalPend = (Number(d.nuevos_PENDIENTES) || 0) + (Number(d.rezagados_PENDIENTES) || 0);

                    return (
                      <div
                        key={rep.id}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.07)',
                          borderRadius: '12px',
                          padding: '1.1rem 1.3rem',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '0.8rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: '1.02rem' }}>
                                {rep.submitted_by || 'Coordinador(a)'}
                              </span>
                              <span style={{ fontSize: '0.72rem', background: 'rgba(255, 193, 7, 0.18)', color: 'var(--crear-gold)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                                📍 {rep.sede || 'Global'}
                              </span>
                              {rep.cycle_id && (
                                <span style={{ fontSize: '0.72rem', background: 'rgba(41, 171, 226, 0.18)', color: 'var(--crear-cyan)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                                  {rep.cycle_id}
                                </span>
                              )}
                              {rep.stage && (
                                <span style={{ fontSize: '0.72rem', background: 'rgba(168, 85, 247, 0.18)', color: '#c084fc', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                                  {rep.stage}
                                </span>
                              )}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <Clock size={13} /> {formatReportDate(rep.created_at)}
                              <span>•</span>
                              <span style={{ color: '#94a3b8' }}>Tipo: <strong>{rep.type === 'Llamadas' ? 'Reporte Diario de Llamadas' : rep.type}</strong></span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            {rep.reviewedBy ? (
                              <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Check size={14} /> Auditado por {rep.reviewedBy}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleMarkReviewed(rep.id)}
                                style={{
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  border: '1px solid #10b981',
                                  color: '#10b981',
                                  borderRadius: '8px',
                                  padding: '0.4rem 0.8rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                              >
                                ✓ Marcar como Visto
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setExpandedReportId(isExpanded ? null : rep.id)}
                              style={{
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.15)',
                                color: 'var(--text-muted)',
                                borderRadius: '8px',
                                padding: '0.4rem 0.7rem',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              {isExpanded ? 'Ocultar' : 'Detalle'}
                            </button>
                          </div>
                        </div>

                        {/* PÍLDORAS DE MÉTRICAS */}
                        {rep.type === 'Llamadas' && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem', marginTop: '0.5rem' }}>
                            <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '0.5rem 0.8rem' }}>
                              <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>CONFIRMADOS (OK)</div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981' }}>{totalOk}</div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{d.nuevos_OK || 0} nuevos · {d.rezagados_OK || 0} rez.</div>
                            </div>
                            <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '0.5rem 0.8rem' }}>
                              <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700 }}>POR CONFIRMAR (XC)</div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f59e0b' }}>{totalXc}</div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{d.nuevos_XC || 0} nuevos · {d.rezagados_XC || 0} rez.</div>
                            </div>
                            <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '0.5rem 0.8rem' }}>
                              <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>NO CONTESTA (NC)</div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ef4444' }}>{totalNc}</div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{d.nuevos_NC || 0} nuevos · {d.rezagados_NC || 0} rez.</div>
                            </div>
                            <div style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', padding: '0.5rem 0.8rem' }}>
                              <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 700 }}>PENDIENTES</div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#38bdf8' }}>{totalPend}</div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{d.nuevos_PENDIENTES || 0} nuevos · {d.rezagados_PENDIENTES || 0} rez.</div>
                            </div>
                          </div>
                        )}

                        {rep.type === 'ReporteRelampagoFDS' && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem', marginTop: '0.5rem' }}>
                            <div style={{ background: 'rgba(167, 139, 250, 0.12)', border: '1px solid rgba(167, 139, 250, 0.3)', borderRadius: '8px', padding: '0.5rem 0.8rem' }}>
                              <div style={{ fontSize: '0.7rem', color: '#a78bfa', fontWeight: 700 }}>RETENCIÓN (TRO)</div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#a78bfa' }}>{d.tasa_retencion_automatica || 0}%</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.5rem 0.8rem' }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>SENTADOS / GRADUADOS</div>
                              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{d.sentados_inicio || 0} / {d.graduados_cierre || 0}</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.5rem 0.8rem' }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>QUIEBRE</div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: d.tipo_quiebre === 'Ninguno' ? '#10b981' : '#ef4444' }}>{d.tipo_quiebre || 'Ninguno'}</div>
                            </div>
                          </div>
                        )}

                        {rep.type === 'ReporteSentadosSala' && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem', marginTop: '0.5rem' }}>
                            <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '0.5rem 0.8rem' }}>
                              <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>SENTADOS EN SALA</div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981' }}>{d.sentados || 0}</div>
                            </div>
                            {d.managers && (
                              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.5rem 0.8rem' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>MANAGERS</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{d.managers}</div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* DETALLE EXPANDIBLE */}
                        {isExpanded && (
                          <div style={{ marginTop: '0.9rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '0.82rem' }}>
                            <div style={{ color: 'var(--crear-cyan)', fontWeight: 700, marginBottom: '0.4rem' }}>
                              Desglose Operativo de Gestión:
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.78rem', color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>
                              {JSON.stringify(d, null, 2)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {isDireccion ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-muted" style={{ margin: 0 }}>
                Rol de Dirección Global: Puedes analizar la evolución histórica de liderazgo y clima en la pestaña <strong>Dashboard Evolución</strong>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="text-white" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700 }}>
                  O selecciona otro formato operativo:
                </label>
                <select 
                  value={reportType} 
                  onChange={e => setReportType(e.target.value)} 
                  className="form-input"
                >
                  <option value="">-- Selecciona Formato Oficial Autorizado --</option>
                  {canViewEvolucionDashboard && (
                    <option value="ReporteRelampagoFDS">⚡ Reporte Relámpago Post-FDS (Gerente de Sede &lt;3 min)</option>
                  )}
                  <option value="MicroPulsoStaff">🎧 Micro-Pulso de Staff (Escucha Activa 3 Preguntas &lt;30 seg)</option>
                  <option value="Llamadas">1. Reporte de Llamadas (C1)</option>
                  <option value="FDS">2. Reporte FDS (Sede C1 tradicional)</option>
                  <option value="C2">3. Reporte Capítulo Dos</option>
                  <option value="MJ">4. Reporte Maestría del Juego</option>
                  <option value="QT_Contexto">5. Reporte de Contexto (QT)</option>
                </select>
              </div>

              {reportType && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', marginBottom: '2rem' }}>
                  {renderFormFields()}
                </div>
              )}

              {reportType && (
                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem' }}>
                  <Send size={18} /> {loading ? 'Enviando...' : 'Enviar Reporte y Registrar en Causa OS'}
                </button>
              )}
            </form>
          )}
        </div>
      )}

      {/* VISTA 2: DASHBOARD DE EVOLUCIÓN ORGANIZACIONAL (CAUSA OS - Solo Directivos y Gerentes) */}
      {activeTab === 'dashboard_evolucion' && canViewEvolucionDashboard && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
          
          {/* HEADER DEL DASHBOARD */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--crear-gold)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ color: 'var(--crear-gold)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                CAUSA OS • INTELIGENCIA ORGANIZACIONAL
              </span>
              <h2 style={{ margin: '0.2rem 0', color: '#fff', fontSize: '1.6rem' }}>
                Dashboard de Evolución Organizacional
              </h2>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Métricas de baja fricción humana: Seguridad Psicológica, Rider del Entrenador y Eliminación de Fricción (Trim & Stack).
              </p>
            </div>
            <button onClick={fetchEvolucionData} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}>
              <RefreshCw size={15} /> Actualizar Datos
            </button>
          </div>

          {/* 3 TARJETAS ESTRATÉGICAS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
            
            {/* 1. SEGURIDAD PSICOLÓGICA */}
            <div className="glass-panel" style={{ padding: '1.4rem', borderTop: '4px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.85rem' }}>TEMPERATURA PSICOLÓGICA</span>
                <span style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
                  Meta: &gt; 85%
                </span>
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#fff', margin: '0.2rem 0' }}>
                89.4%
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Promedio de respuestas afirmativas en Bloque 1 (Edmondson). Si cae a &lt;85% se activa intervención silenciosa con el Coordinador.
              </p>
            </div>

            {/* 2. RIDER DE ENTRENADOR */}
            <div className="glass-panel" style={{ padding: '1.4rem', borderTop: '4px solid #38bdf8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.85rem' }}>RIDER DE CALIDAD COACH</span>
                <span style={{ background: 'rgba(56,189,248,0.2)', color: '#38bdf8', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
                  Escala 1-5
                </span>
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#fff', margin: '0.2rem 0' }}>
                4.85 ★
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Fisonomía en sala, reloj y contención evaluada por Gerentes de Sede cruzada con TRO promedio (96.2%).
              </p>
            </div>

            {/* 3. CANDADO PRESUPUESTARIO */}
            <div className="glass-panel" style={{ padding: '1.4rem', borderTop: '4px solid #fbbf24' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.85rem' }}>CANDADO CONTABLE SEDES</span>
                <span style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
                  Lunes 12:00 PM
                </span>
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Unlock size={22} color="#10b981" /> Presupuestos Liberados
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Sedes que cerraron su Reporte Relámpago antes del mediodía tienen flujo financiero autorizado para el próximo FDS.
              </p>
            </div>

          </div>

          {/* BUZÓN TRIM & STACK (QUÉ DETENER - STOP) */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <ShieldAlert size={20} color="#ec4899" />
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>
                Buzón «Trim & Stack» — Procesos que debemos DETENER (Stop)
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
              Iniciativas reportadas pasivamente por el staff para eliminar masa burocrática y simplificar Nodus:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { sede: 'Lima', texto: 'Detener el llenado doble de planillas físicas si ya se escaneó el código QR de entrada.', fecha: 'Lunes 11:20 AM' },
                { sede: 'Quito', texto: 'Eliminar el conteo manual de credenciales sobrantes en caja; Nodus ya tiene el stock en tiempo real.', fecha: 'Lunes 11:45 AM' },
                { sede: 'Guayaquil', texto: 'Reemplazar las hojas de pedidos de baúles por checklist digital de 3 clics.', fecha: 'Lunes 12:10 PM' }
              ].map((item, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#ec4899', fontWeight: 800, textTransform: 'uppercase' }}>
                      {item.sede} • {item.fecha}
                    </span>
                    <p style={{ margin: '0.2rem 0 0', color: '#fff', fontSize: '0.9rem', fontStyle: 'italic' }}>
                      «{item.texto}»
                    </p>
                  </div>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(236,72,153,0.15)', color: '#f472b6', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
                    En Revisión Nodus
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* MODAL DE CONFIGURACIÓN WEBHOOK GOOGLE CHAT */}
      {showChatWebhookModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => setShowChatWebhookModal(false)}
        >
          <div 
            className="glass-panel"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              borderRadius: '16px',
              border: '1px solid rgba(41, 171, 226, 0.3)',
              background: '#0a0f1d'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.2rem' }}>
              <div style={{ background: 'rgba(41, 171, 226, 0.15)', padding: '10px', borderRadius: '12px', color: 'var(--crear-cyan)' }}>
                <MessageSquare size={26} />
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>Integración con Google Chat</h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Envía reportes operativos y de llamadas automáticamente a tu espacio de equipo
                </p>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
              <strong style={{ color: 'var(--crear-gold)', display: 'block', marginBottom: '0.4rem' }}>
                📌 ¿Cómo obtener la URL en 3 pasos rápidos?
              </strong>
              <ol style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li>En Google Chat, abre el espacio donde quieres recibir los reportes.</li>
                <li>Haz clic en el título del espacio ➔ <b>Configuración de apps e integraciones</b>.</li>
                <li>Selecciona <b>Webhooks</b> ➔ <b>Agregar webhook</b>, ponle de nombre <i>Causa OS</i> y copia la URL generada.</li>
              </ol>
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                URL del Webhook de Google Chat *
              </label>
              <input
                type="url"
                placeholder="https://chat.googleapis.com/v1/spaces/AAAA.../messages?key=...&token=..."
                value={chatWebhookUrl}
                onChange={e => setChatWebhookUrl(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.8rem 1rem', borderRadius: '8px' }}>
              <div>
                <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, display: 'block' }}>
                  Envío Automático Activo
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  Disparar al enviar cada reporte
                </span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={chatWebhookEnabled}
                  onChange={e => setChatWebhookEnabled(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--crear-cyan)' }}
                />
                <span style={{ color: chatWebhookEnabled ? '#10b981' : '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
                  {chatWebhookEnabled ? 'Habilitado' : 'Pausado'}
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleTestChatWebhook}
                disabled={testingChatWebhook || !chatWebhookUrl.trim()}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(41, 171, 226, 0.4)',
                  background: 'rgba(41, 171, 226, 0.1)',
                  color: 'var(--crear-cyan)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: (testingChatWebhook || !chatWebhookUrl.trim()) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                {testingChatWebhook ? <RefreshCw size={14} className="spin" /> : <Send size={14} />}
                Probar Notificación
              </button>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => setShowChatWebhookModal(false)}
                  className="btn-secondary"
                  style={{ padding: '0.6rem 1rem', fontSize: '0.82rem' }}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleSaveChatWebhook}
                  className="btn-primary"
                  style={{ padding: '0.6rem 1.2rem', fontSize: '0.82rem', fontWeight: 800 }}
                >
                  Guardar Configuración
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
