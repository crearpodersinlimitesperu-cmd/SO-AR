import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Target, TrendingUp, AlertCircle, CheckCircle2, ChevronRight, 
  BarChart2, Briefcase, ChevronDown, ChevronUp, ArrowLeft, Loader2, 
  Sparkles, Bell, AlertTriangle, Zap, ShieldAlert, Clock,
  BrainCircuit, RefreshCw, Copy, Check, DollarSign, Calendar, Users, PhoneCall, Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc } from 'firebase/firestore';
import { auth, db, getDocResilient } from '../services/firebase';
import { OPERATIONAL_SEDES, normalizeSede, usersData } from '../data/usersData';
import { getSedePricing, formatCurrencyAmount } from '../data/sedesPricingData';
import nodusFallbackData from '../data/nodusFallbackData.json';

// =========================================================================
// MOTOR AUTÓNOMO DE ESTRATEGIA OPERATIVA CAUSA OS (ZERO-HALLUCINATION & MATH-GROUNDED)
// =========================================================================
function buildDeterministicStrategy({
  selectedSede,
  meta,
  confirmados,
  deficit,
  diasRestantes,
  totalAsignados,
  totalGestiones,
  totalPorConfirmar,
  totalNoContesta,
  pricing,
  coords,
  staffList
}) {
  const sedeName = selectedSede === 'GLOBAL' ? 'Global' : selectedSede;
  const precioUnitario = pricing?.precioFds || 900;
  const moneda = pricing?.currency || (selectedSede === 'Lima' ? 'PEN' : selectedSede === 'México' ? 'MXN' : selectedSede === 'Medellín' ? 'COP' : 'USD');
  const simbolo = pricing?.symbol || (moneda === 'PEN' ? 'S/.' : '$');

  // Recaudación requerida para cubrir la meta
  const recaudacionMeta = deficit * precioUnitario;
  
  // Potencial oculto en la bolsa "Por Confirmar"
  const recaudacionPorConfirmar = Math.round(totalPorConfirmar * 0.25) * precioUnitario;

  // Gerente de Sede detectado
  const gerente = staffList.find(s => s.role === 'gerente') || { name: `Gerente de ${sedeName}` };
  
  // Tasa de conversión necesaria sobre los "Por Confirmar" para cerrar el déficit
  const conversionPorConfReq = totalPorConfirmar > 0 
    ? Math.min(100, Math.round((deficit / totalPorConfirmar) * 100))
    : 0;

  // Ritmo diario requerido
  const ritmoRequerido = diasRestantes > 0 ? (deficit / diasRestantes).toFixed(1) : deficit;

  // Plan día por día
  const cronogramaDias = [
    {
      dia: 'Día 1 (D-4)',
      foco: 'Operativo Cierre Rápido "Por Confirmar"',
      detalle: `Barrido prioritario sobre los ${totalPorConfirmar || 20} contactos en estado 'Por Confirmar'. Llamada de bienvenida y reserva nominal de silla en sala.`,
      metaDia: `${Math.ceil(deficit * 0.4)} confirmados`,
      responsable: 'Coordinadores C1/C2'
    },
    {
      dia: 'Día 2 (D-3)',
      foco: 'Operación Rescate Quantum Team (No Contesta)',
      detalle: `Despliegue del Quantum Team en bloque nocturno (18:00 - 21:00 hrs) para contactar a los ${totalNoContesta || 30} prospectos que no contestaron de día.`,
      metaDia: `${Math.ceil(deficit * 0.3)} confirmados`,
      responsable: 'Quantum Team + Coordinación'
    },
    {
      dia: 'Día 3 (D-2)',
      foco: 'Mesa Financiera & Validación de Aranceles',
      detalle: `Validación de pagos y comprobantes de FDS C1 (${formatCurrencyAmount(precioUnitario, moneda)} por cupo). Conciliación con el área de finanzas.`,
      metaDia: `${Math.ceil(deficit * 0.2)} confirmados`,
      responsable: 'Finanzas + Gerencia'
    },
    {
      dia: 'Día 4 (D-1)',
      foco: 'Aseguramiento de Sala & Blindaje Anti-Deserción',
      detalle: 'Llamada de confirmación de asistencia, envío de recomendaciones logísticas (vestimenta, puntualidad) y lista definitiva de sala.',
      metaDia: `${Math.ceil(deficit * 0.1)} confirmados`,
      responsable: 'Gerente de Sede + Staff'
    }
  ];

  // Misiones nominales por coordinador
  const misionesCoords = coords.map(c => {
    const asig = Number(c.asignados || c.estados?.asignados || 0);
    const conf = Number(c.confirmados || c.estados?.confirmado || ((c.confirmadosC1 || 0) + (c.confirmadosC2 || 0)) || 0);
    const porConf = Number(c.porConfirmar || c.estados?.porConfirmar || 0);
    const noCont = Number(c.noContesta || c.estados?.noContesta || 0);
    const llam = Number(c.gestiones || c.estados?.llamadas || 0);

    // Meta sugerida por coordinador proporcional a su bolsa de porConfirmar o asignados
    let cuotaSugerida = Math.max(2, Math.ceil(deficit / (coords.length || 1)));
    if (porConf >= 15) {
      cuotaSugerida = Math.min(porConf, Math.max(cuotaSugerida, Math.ceil(porConf * 0.15)));
    }

    return {
      nombre: c.nombre,
      rol: 'Coordinador C1/C2',
      asignados: asig,
      confirmados: conf,
      porConfirmar: porConf,
      noContesta: noCont,
      cuotaSugerida,
      recaudacionAporte: cuotaSugerida * precioUnitario,
      instruccion: porConf >= 10
        ? `Enfocar 100% de esfuerzos en sus ${porConf} contactos 'Por Confirmar'. Con un cierre del 15% aporta ${cuotaSugerida} cupos y ${formatCurrencyAmount(cuotaSugerida * precioUnitario, moneda)} a la sede.`
        : noCont >= 15
        ? `Reagendar sus ${noCont} contactos 'No Contesta' con el Quantum Team para llamadas en franja de 18:00 a 20:30 hrs.`
        : `Completar el primer contacto con su base pendiente para levantar reservas frescas.`
    };
  });

  return {
    sede: sedeName,
    gerente: gerente.name,
    diagnostico: {
      salud: deficit === 0 ? 'Excelente' : deficit <= 10 ? 'Manejable' : 'Atención Inmediata',
      resumen: deficit === 0
        ? `La sede ${sedeName} ha cumplido la meta programada de ${meta} cupos de sala con ${confirmados} confirmados.`
        : `La sede ${sedeName} presenta una brecha de ${deficit} cupos para la meta de ${meta} participantes a ${diasRestantes} días de sala. Sin embargo, cuenta con una reserva de ${totalPorConfirmar} contactos 'Por Confirmar'. Con una tasa de conversión de apenas el ${conversionPorConfReq}%, la sede alcanza la meta segura sin depender de prospectos en frío.`,
      palancaClave: totalPorConfirmar >= deficit
        ? `Mina de oro inmediata: Existen ${totalPorConfirmar} contactos 'Por Confirmar'. No se necesita quemar base fría, solo cerrar esta bolsa caliente.`
        : totalNoContesta >= 20
        ? `Apalancamiento por horario: Existen ${totalNoContesta} contactos sin contestar. Mover el horario de llamadas a la tarde/noche para rescatar entre 8 y 12 cupos.`
        : `Aceleración de primer llamado: Existen prospectos asignados pendientes de primer contacto. Desplegar maratón de llamadas de 2 horas.`,
      ritmoRequerido: `${ritmoRequerido} confirmados/día`
    },
    cronograma: cronogramaDias,
    misiones: misionesCoords,
    financiero: {
      precioUnitario,
      moneda,
      simbolo,
      recaudacionMeta,
      recaudacionMetaFormatted: formatCurrencyAmount(recaudacionMeta, moneda),
      recaudacionPorConfirmarFormatted: formatCurrencyAmount(recaudacionPorConfirmar, moneda),
      retornoPotencial: `Recaudación asegurada al cerrar los ${deficit} cupos faltantes: ${formatCurrencyAmount(recaudacionMeta, moneda)} (${moneda}).`
    },
    speechCierre: {
      etapa1: "1. Distinción y Estatus: 'Hola [Nombre], te saludo directamente de la Dirección de Crear Poder Sin Límites. Tu postulación para el Capítulo 1 fue pre-aprobada por el comité de liderazgo.'",
      etapa2: "2. Urgencia y Valor: 'Estamos completando los últimos lugares de la sala para este fin de semana y por protocolo debemos asignar tu lugar definitivo y tu material formativo antes de las 18:00 hrs.'",
      etapa3: "3. Cierre y Arancel: '¿Cuento con tu compromiso de palabra y asistencia completa el viernes a las 18:00 hrs? Perfecto, te envío por WhatsApp el canal para formalizar el arancel de sala de " + formatCurrencyAmount(precioUnitario, moneda) + " y asegurar tu credencial de acceso.'"
    }
  };
}

export default function StrategyBoard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  const isGlobalStrategyRole = (() => {
    if (currentUser?.isSuperAdmin) return true;
    const exec = ['direccion', 'cfo', 'ceo', 'cco'];
    if (currentUser?.appRole === 'consolidado') {
      return (currentUser?.roles || []).some(r => exec.includes(r));
    }
    return exec.includes(currentUser?.appRole);
  })();

  const [selectedSede, setSelectedSede] = useState(() => isGlobalStrategyRole ? 'GLOBAL' : normalizeSede(currentUser?.sede));
  const sedesDisponibles = isGlobalStrategyRole ? ['GLOBAL', ...OPERATIONAL_SEDES] : [normalizeSede(currentUser?.sede)];

  const [loading, setLoading] = useState(true);
  const [globalHealth, setGlobalHealth] = useState(0);
  const [okrs, setOkrs] = useState([]);
  const [errorObj, setErrorObj] = useState(null);
  const [predictionData, setPredictionData] = useState(null);
  const [managerAlerts, setManagerAlerts] = useState([]);
  const [coordinadoresList, setCoordinadoresList] = useState([]);

  // ESTADO DEL AGENTE ESTRATÉGICO IA
  const [aiStrategy, setAiStrategy] = useState(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [activeStrategyTab, setActiveStrategyTab] = useState('diagnostico'); // 'diagnostico' | 'plan' | 'coordinadores' | 'financiero' | 'speech'
  const [copiedStrategy, setCopiedStrategy] = useState(false);

  const bgLight = "#f8fafc";
  const bgCard = "#ffffff";
  const textDark = "#0f172a";
  const textMuted = "#64748b";
  const borderLight = "#e2e8f0";

  // Tarifas de la sede
  const pricing = useMemo(() => getSedePricing(selectedSede), [selectedSede]);

  // Staff de la sede en usersData
  const staffSede = useMemo(() => {
    return usersData.filter(u => {
      if (selectedSede === 'GLOBAL') return true;
      return normalizeSede(u.sede) === normalizeSede(selectedSede);
    });
  }, [selectedSede]);

  // Carga y Sincronización de Datos en Tiempo Real
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const docRef = doc(db, 'nodus_coordinadores_c1c2', 'latest');
        const docSnap = await getDocResilient(docRef);
        
        let data = null;
        if (docSnap.exists()) {
          data = docSnap.data();
        } else {
          console.warn("Usando nodusFallbackData para StrategyBoard");
          data = nodusFallbackData;
        }

        let totalAsignados = 0;
        let totalGestiones = 0;
        let totalConfirmados = 0;
        let totalPorConfirmar = 0;
        let totalNoContesta = 0;
        let totalNoInteresa = 0;

        const coords = (data.coordinadores || nodusFallbackData?.coordinadores || []);
        const filteredCoords = selectedSede === 'GLOBAL'
          ? coords
          : coords.filter(c => normalizeSede(c.sede) === normalizeSede(selectedSede));

        setCoordinadoresList(filteredCoords);

        if (selectedSede === 'GLOBAL') {
          if (data.totales) {
            totalAsignados = data.totales.totalAsignados || 0;
            totalGestiones = data.totales.totalGestiones || 0;
            totalConfirmados = data.totales.totalConfirmados || 0;
            totalPorConfirmar = data.totales.totalPorConfirmar || 0;
            totalNoContesta = data.totales.totalNoContesta || 0;
            totalNoInteresa = data.totales.totalNoInteresa || 0;
          }
        } else {
          // 1. Buscar en data.sedes
          if (data.sedes) {
            const sedeData = data.sedes.find(s => normalizeSede(s.sede) === normalizeSede(selectedSede));
            if (sedeData) {
              totalAsignados = sedeData.asignadosTotal || 0;
              totalGestiones = sedeData.gestionesTotal || 0;
              totalConfirmados = sedeData.confirmadosTotal || 0;
              totalPorConfirmar = sedeData.porConfirmarTotal || 0;
              totalNoContesta = sedeData.noContestaTotal || 0;
            }
          }
          // 2. Resiliencia: Si confirmados o asignados es 0, sumar directamente de los coordinadores de la sede
          if (totalConfirmados === 0 && filteredCoords.length > 0) {
            totalConfirmados = filteredCoords.reduce((acc, c) => {
              const conf = Number(c.estados?.confirmado ?? c.confirmados ?? ((c.confirmadosC1 || 0) + (c.confirmadosC2 || 0)) ?? 0);
              return acc + conf;
            }, 0);
          }
          if (totalAsignados === 0 && filteredCoords.length > 0) {
            totalAsignados = filteredCoords.reduce((acc, c) => acc + Number(c.estados?.asignados ?? c.asignados ?? 0), 0);
          }
          if (totalGestiones === 0 && filteredCoords.length > 0) {
            totalGestiones = filteredCoords.reduce((acc, c) => acc + Number(c.estados?.llamadas ?? c.gestiones ?? 0), 0);
          }
          if (totalPorConfirmar === 0 && filteredCoords.length > 0) {
            totalPorConfirmar = filteredCoords.reduce((acc, c) => acc + Number(c.estados?.porConfirmar ?? 0), 0);
          }
          if (totalNoContesta === 0 && filteredCoords.length > 0) {
            totalNoContesta = filteredCoords.reduce((acc, c) => acc + Number(c.estados?.noContesta ?? 0), 0);
          }
        }

        // Construir OKRs
        let okrGenerales = [];
        let contactabilidadRate = totalAsignados > 0 ? Math.round((totalGestiones / totalAsignados) * 100) : 0;
        if (contactabilidadRate > 100) contactabilidadRate = 100;

        okrGenerales.push({
          id: 1,
          owner: 'Mesa de Registro',
          objective: 'Maximizar Tasa de Contactabilidad Base C1',
          progress: contactabilidadRate || 0,
          keyResults: [
            { id: 'kr1', text: 'Total Gestiones Realizadas (Coordinadores)', current: totalGestiones, target: totalAsignados, unit: 'llamadas' }
          ]
        });

        let enrolRate = totalAsignados > 0 ? Math.round((totalConfirmados / totalAsignados) * 100) : 0;
        if (enrolRate > 100) enrolRate = 100;

        okrGenerales.push({
          id: 2,
          owner: 'Staff Elite',
          objective: 'Cumplimiento de Metas de Enrolamiento (Participantes)',
          progress: enrolRate || 0,
          keyResults: [
            { id: 'kr2', text: 'Enrolamiento de Participantes Base Asignados', current: totalConfirmados, target: totalAsignados, unit: 'enrolados' }
          ]
        });

        setOkrs(okrGenerales);

        let prom = 0;
        if (okrGenerales.length > 0) {
          prom = Math.round(okrGenerales.reduce((acc, curr) => acc + curr.progress, 0) / okrGenerales.length);
        }
        setGlobalHealth(prom || 0);

        // Agente de Predicción Operativa
        const diasCampanaTranscurridos = 8;
        const diasRestantesSala = 4;
        const metaSalaSede = selectedSede === 'GLOBAL' ? 180 : 32;
        const deficitSala = Math.max(0, metaSalaSede - totalConfirmados);
        const ritmoDiario = totalConfirmados > 0 ? (totalConfirmados / diasCampanaTranscurridos) : 0;
        const proyeccionFinal = Math.round(totalConfirmados + (ritmoDiario * diasRestantesSala));
        const probabilidadCumplimiento = Math.min(100, Math.round((proyeccionFinal / metaSalaSede) * 100));

        setPredictionData({
          confirmados: totalConfirmados,
          asignados: totalAsignados,
          porConfirmar: totalPorConfirmar,
          noContesta: totalNoContesta,
          ritmoDiario: ritmoDiario.toFixed(1),
          diasRestantes: diasRestantesSala,
          proyeccionFinal,
          meta: metaSalaSede,
          deficit: deficitSala,
          probabilidad: probabilidadCumplimiento,
          tendencia: ritmoDiario >= 2.5 ? 'ACELERANDO' : ritmoDiario >= 1.0 ? 'ESTABLE' : 'LENTO'
        });

        // Alertas a Gerentes
        const generatedAlerts = [];
        filteredCoords.forEach(c => {
          const est = c.estados || {};
          const asig = Number(c.asignados || est.asignados || 0);
          const llam = Number(c.gestiones || est.llamadas || 0);
          const porConf = Number(est.porConfirmar || 0);
          const pend = Math.max(0, asig - llam);

          if (asig > 0 && llam === 0) {
            generatedAlerts.push({
              id: `alt_zero_${c.id || c.nombre}`,
              tipo: 'CRITICA',
              color: '#ef4444',
              coordinador: c.nombre,
              sede: c.sede,
              mensaje: `Sin actividad registrada: 0 de ${asig} contactos llamados.`,
              accionRecomendada: 'Comunicarse inmediatamente con el coordinador para verificar bloqueo o reasignar base.'
            });
          } else if (asig > 15 && pend > (asig * 0.6)) {
            generatedAlerts.push({
              id: `alt_pend_${c.id || c.nombre}`,
              tipo: 'ADVERTENCIA',
              color: '#f59e0b',
              coordinador: c.nombre,
              sede: c.sede,
              mensaje: `Ritmo rezagado: ${pend} contactos pendientes de gestión (${Math.round((pend/asig)*100)}% de su base).`,
              accionRecomendada: 'Habilitar apoyo telefónico con Quantum Team en bloque vespertino.'
            });
          }

          if (porConf >= 8) {
            generatedAlerts.push({
              id: `alt_close_${c.id || c.nombre}`,
              tipo: 'OPORTUNIDAD',
              color: '#3b82f6',
              coordinador: c.nombre,
              sede: c.sede,
              mensaje: `Alta reserva de cierre: ${porConf} contactos 'Por Confirmar' listos para pase a sala.`,
              accionRecomendada: 'Realizar llamada de cierre con speech de bienvenida y confirmación de cupo.'
            });
          }
        });

        setManagerAlerts(generatedAlerts);
        setErrorObj(null);

        // Generar Estrategia IA Inicial
        const estrategiaGenerada = buildDeterministicStrategy({
          selectedSede,
          meta: metaSalaSede,
          confirmados: totalConfirmados,
          deficit: deficitSala,
          diasRestantes: diasRestantesSala,
          totalAsignados,
          totalGestiones,
          totalPorConfirmar,
          totalNoContesta,
          pricing,
          coords: filteredCoords,
          staffList: staffSede
        });
        setAiStrategy(estrategiaGenerada);

      } catch (err) {
        console.error("Error cargando estrategia:", err);
        setErrorObj(err.message || "Error al sincronizar datos.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedSede, pricing, staffSede]);

  // Manejador para regenerar la estrategia con IA (con llamada opcional al worker de Gemini)
  const handleRegenerateStrategy = async () => {
    if (!predictionData) return;
    setIsGeneratingAi(true);

    try {
      // Intentar llamada al worker de Gemini
      const workerUrl = import.meta.env.VITE_COPILOTO_WORKER_URL || 'https://so-ar-copiloto.crearpsl-cpsl.workers.dev';
      const firebaseUser = auth.currentUser;
      let aiText = '';

      if (firebaseUser && workerUrl) {
        try {
          const idToken = await firebaseUser.getIdToken(false);
          const prompt = `Actúa como el Agente Estratégico Senior de Causa OS (Crear Poder Sin Límites).
Analiza los datos de la sede ${selectedSede}:
- Meta de sala: ${predictionData.meta}
- Confirmados actuales: ${predictionData.confirmados}
- Déficit: ${predictionData.deficit}
- Contactos Por Confirmar: ${predictionData.porConfirmar}
- Precio FDS C1: ${pricing.currency} ${pricing.precioFds} (${pricing.symbol})
- Coordinadores: ${coordinadoresList.map(c => `${c.nombre} (Por confirmar: ${c.estados?.porConfirmar || 0})`).join(', ')}

Genera una estrategia de cierre para los próximos 4 días con metas nominales e impacto financiero.`;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(workerUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const json = await res.json();
            if (json.text) aiText = json.text;
          }
        } catch (wErr) {
          console.warn("Worker timeout/skip, fallback al motor analítico Causa OS:", wErr);
        }
      }

      // Motor analítico determinístico con data en vivo
      const updatedStrategy = buildDeterministicStrategy({
        selectedSede,
        meta: predictionData.meta,
        confirmados: predictionData.confirmados,
        deficit: predictionData.deficit,
        diasRestantes: predictionData.diasRestantes,
        totalAsignados: predictionData.asignados,
        totalGestiones: predictionData.gestiones || 0,
        totalPorConfirmar: predictionData.porConfirmar,
        totalNoContesta: predictionData.noContesta,
        pricing,
        coords: coordinadoresList,
        staffList: staffSede
      });

      if (aiText) {
        updatedStrategy.diagnostico.resumenIA = aiText;
      }

      setAiStrategy(updatedStrategy);
    } catch (err) {
      console.error("Error al regenerar estrategia:", err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCopyStrategy = () => {
    if (!aiStrategy) return;
    const txt = `🎯 ESTRATEGIA OPERATIVA CAUSA OS • SEDE ${aiStrategy.sede.toUpperCase()}\n\n` +
      `📌 DIAGNÓSTICO:\n${aiStrategy.diagnostico.resumen}\n\n` +
      `⚡ ACCIÓN CLAVE: ${aiStrategy.diagnostico.palancaClave}\n\n` +
      `💰 IMPACTO FINANCIERO: ${aiStrategy.financiero.retornoPotencial}\n\n` +
      `📅 PLAN DE 4 DÍAS:\n` +
      aiStrategy.cronograma.map(c => `* ${c.dia}: ${c.foco} (Meta: ${c.metaDia})`).join('\n') + `\n\n` +
      `👥 MISIONES POR COORDINADOR:\n` +
      aiStrategy.misiones.map(m => `* ${m.nombre}: Meta de ${m.cuotaSugerida} cupos (${formatCurrencyAmount(m.recaudacionAporte, aiStrategy.financiero.moneda)})`).join('\n');

    navigator.clipboard.writeText(txt);
    setCopiedStrategy(true);
    setTimeout(() => setCopiedStrategy(false), 2500);
  };

  return (
    <div style={{ minHeight: '100vh', background: bgLight, color: textDark, paddingBottom: '4rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* HEADER COHERENTE */}
      <header style={{ background: bgCard, borderBottom: `1px solid ${borderLight}`, padding: '1.2rem 2rem', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => navigate('/home')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: textDark, border: `1px solid ${borderLight}`, background: 'transparent', borderRadius: '6px', cursor: 'pointer' }}>
              <ArrowLeft size={16} /> Inicio
            </button>
            <div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Target size={24} /> Estrategia y OKRs (Cascade)
              </h1>
              <p style={{ fontSize: '0.75rem', color: textMuted, margin: 0 }}>Alineación entre Objetivos y Nodus (Data en Vivo)</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: textMuted }}>SEDE:</span>
              <select
                value={selectedSede}
                onChange={(e) => setSelectedSede(e.target.value)}
                disabled={!isGlobalStrategyRole}
                style={{ padding: '0.4rem 2rem 0.4rem 0.8rem', borderRadius: '6px', border: `1px solid ${borderLight}`, background: bgCard, color: textDark, fontWeight: 700, fontSize: '0.85rem', cursor: isGlobalStrategyRole ? 'pointer' : 'not-allowed', opacity: isGlobalStrategyRole ? 1 : 0.7, appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem top 50%', backgroundSize: '0.65rem auto' }}
              >
                {sedesDisponibles.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button onClick={() => window.print()} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: `1px solid ${borderLight}`, background: 'transparent', color: textMuted, fontWeight: 700, cursor: 'pointer' }}>Exportar PDF</button>
            <button className="btn-primary" style={{ padding: '0.5rem 1rem', borderRadius: '8px' }}>+ Nuevo OKR</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1.5rem' }}>
        
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: textMuted }}>
            <Loader2 size={40} className="animate-spin text-green-500 mb-4" />
            <p>Calculando Estrategia e Inteligencia Nodus en Vivo...</p>
          </div>
        ) : errorObj ? (
          <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
            <AlertCircle size={40} style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Error de Sincronización</h2>
            <p>{errorObj}</p>
          </div>
        ) : (
          <>
            {/* RESUMEN GLOBAL */}
            <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>{`Salud Estratégica ${selectedSede === 'GLOBAL' ? 'Global' : selectedSede}`}</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>{globalHealth}%</span>
                  <span style={{ color: textMuted, fontSize: '0.9rem', marginBottom: '0.3rem' }}>{`Cumplimiento ${selectedSede === 'GLOBAL' ? 'Global' : 'Sede'} (Calculado en Vivo)`}</span>
                </div>
              </div>
              <div style={{ padding: '1rem', background: '#ecfdf5', borderRadius: '50%', color: '#10b981' }}>
                <TrendingUp size={32} />
              </div>
            </div>

            {/* =========================================================================
                NUEVO: AGENTE ESTRATÉGICO IA (CAUSA OS STRATEGIC ADVISOR)
                ========================================================================= */}
            {aiStrategy && (
              <div style={{ 
                background: '#ffffff', 
                border: '2px solid #3b82f6', 
                borderRadius: '16px', 
                padding: '1.75rem', 
                marginBottom: '2rem', 
                boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.12)' 
              }}>
                {/* ENCABEZADO DEL AGENTE */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: `1px solid ${borderLight}`, paddingBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                    <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', display: 'flex', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)' }}>
                      <BrainCircuit size={28} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                        <span style={{ background: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800 }}>
                          AGENTE ESTRATÉGICO IA &bull; GEMINI + CAUSA OS
                        </span>
                        <span style={{ fontSize: '0.75rem', color: textMuted, fontWeight: 600 }}>
                          Sede {aiStrategy.sede} ({formatCurrencyAmount(aiStrategy.financiero.precioUnitario, aiStrategy.financiero.moneda)} / cupo)
                        </span>
                      </div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: textDark, margin: 0 }}>
                        Estrategia Operativa de Cierre de Sala
                      </h2>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <button
                      onClick={handleCopyStrategy}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '8px',
                        border: `1px solid ${borderLight}`,
                        background: '#f8fafc',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: textDark,
                        cursor: 'pointer'
                      }}
                    >
                      {copiedStrategy ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      {copiedStrategy ? 'Copiado' : 'Copiar Plan'}
                    </button>

                    <button
                      onClick={handleRegenerateStrategy}
                      disabled={isGeneratingAi}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.45rem 1rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#2563eb',
                        color: '#fff',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: isGeneratingAi ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
                      }}
                    >
                      <RefreshCw size={14} className={isGeneratingAi ? 'animate-spin' : ''} />
                      {isGeneratingAi ? 'Analizando...' : '⚡ Actualizar Análisis IA'}
                    </button>
                  </div>
                </div>

                {/* TABS DE NAVEGACIÓN ESTRATÉGICA */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                  {[
                    { id: 'diagnostico', label: '🧭 Diagnóstico & Brecha' },
                    { id: 'plan', label: '🚀 Plan de 4 Días' },
                    { id: 'coordinadores', label: '👥 Misiones por Coordinador' },
                    { id: 'financiero', label: '💰 Impacto Financiero FDS C1' },
                    { id: 'speech', label: '🎙️ Speech de Cierre' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveStrategyTab(tab.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: activeStrategyTab === tab.id ? '1px solid #2563eb' : `1px solid ${borderLight}`,
                        background: activeStrategyTab === tab.id ? '#eff6ff' : '#ffffff',
                        color: activeStrategyTab === tab.id ? '#1d4ed8' : textMuted,
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* CONTENIDO TAB 1: DIAGNÓSTICO & BRECHA */}
                {activeStrategyTab === 'diagnostico' && (
                  <div>
                    <div style={{ 
                      background: '#f8fafc', 
                      borderLeft: '4px solid #2563eb', 
                      padding: '1rem 1.25rem', 
                      borderRadius: '8px', 
                      marginBottom: '1.25rem' 
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                        DICTAMEN ESTRATÉGICO DEL AGENTE
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5, color: textDark }}>
                        {aiStrategy.diagnostico.resumen}
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                      <div style={{ background: '#ecfdf5', border: '1px solid #10b981', padding: '1.2rem', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#047857', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                          <Zap size={18} /> PALANCA DE ACCIÓN INMEDIATA
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#065f46', lineHeight: 1.4 }}>
                          {aiStrategy.diagnostico.palancaClave}
                        </p>
                      </div>

                      <div style={{ background: '#f0f9ff', border: '1px solid #38bdf8', padding: '1.2rem', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0369a1', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                          <Target size={18} /> RITMO REQUERIDO DE CIERRE
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0284c7', marginBottom: '0.2rem' }}>
                          {aiStrategy.diagnostico.ritmoRequerido}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#075985' }}>
                          Para alcanzar {predictionData?.meta || 32} cupos en los {predictionData?.diasRestantes || 4} días restantes.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* CONTENIDO TAB 2: PLAN DE 4 DÍAS */}
                {activeStrategyTab === 'plan' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {aiStrategy.cronograma.map((item, idx) => (
                      <div 
                        key={idx}
                        style={{
                          background: '#f8fafc',
                          border: `1px solid ${borderLight}`,
                          borderRadius: '10px',
                          padding: '1.2rem',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '1rem',
                          position: 'relative'
                        }}
                      >
                        <div style={{
                          background: '#2563eb',
                          color: '#fff',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '8px',
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          whiteSpace: 'nowrap'
                        }}>
                          {item.dia}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.3rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: textDark }}>{item.foco}</h4>
                            <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #10b981', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                              Meta: {item.metaDia}
                            </span>
                          </div>
                          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: textMuted, lineHeight: 1.4 }}>
                            {item.detalle}
                          </p>
                          <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700 }}>
                            👤 Responsable: {item.responsable}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* CONTENIDO TAB 3: MISIONES POR COORDINADOR */}
                {activeStrategyTab === 'coordinadores' && (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: textMuted, marginBottom: '1rem' }}>
                      Asignación táctica de metas nominales para los coordinadores de la sede {aiStrategy.sede}:
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {aiStrategy.misiones.map((coord, idx) => (
                        <div 
                          key={idx}
                          style={{
                            background: '#f8fafc',
                            border: `1px solid ${borderLight}`,
                            borderRadius: '10px',
                            padding: '1.1rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            flexWrap: 'wrap',
                            gap: '1rem'
                          }}
                        >
                          <div style={{ flex: 1, minWidth: '260px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: textDark }}>{coord.nombre}</span>
                              <span style={{ background: '#f1f5f9', color: textMuted, padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>{coord.rol}</span>
                            </div>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: textMuted }}>
                              {coord.instruccion}
                            </p>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: textDark }}>
                              <span><strong>Asignados:</strong> {coord.asignados}</span>
                              <span><strong>Por Confirmar:</strong> <span style={{ color: '#2563eb', fontWeight: 700 }}>{coord.porConfirmar}</span></span>
                              <span><strong>No Contesta:</strong> {coord.noContesta}</span>
                              <span><strong>Confirmados:</strong> <span style={{ color: '#10b981', fontWeight: 700 }}>{coord.confirmados}</span></span>
                            </div>
                          </div>

                          <div style={{ background: '#fff', border: `1px solid ${borderLight}`, padding: '0.75rem 1rem', borderRadius: '8px', textAlign: 'right', minWidth: '130px' }}>
                            <div style={{ fontSize: '0.7rem', color: textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Cuota Recomendada</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2563eb' }}>
                              {coord.cuotaSugerida} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>cupos</span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>
                              {formatCurrencyAmount(coord.recaudacionAporte, aiStrategy.financiero.moneda)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CONTENIDO TAB 4: IMPACTO FINANCIERO FDS C1 */}
                {activeStrategyTab === 'financiero' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '10px', border: `1px solid ${borderLight}` }}>
                        <div style={{ fontSize: '0.72rem', color: textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Arancel Oficial FDS C1</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981' }}>
                          {formatCurrencyAmount(aiStrategy.financiero.precioUnitario, aiStrategy.financiero.moneda)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: textMuted }}>Tarifa por participante sede {aiStrategy.sede}</div>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '10px', border: `1px solid ${borderLight}` }}>
                        <div style={{ fontSize: '0.72rem', color: textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Recaudación para Meta (Déficit)</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#2563eb' }}>
                          {aiStrategy.financiero.recaudacionMetaFormatted}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: textMuted }}>Ingreso al cerrar los {predictionData?.deficit || 0} cupos</div>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '10px', border: `1px solid ${borderLight}` }}>
                        <div style={{ fontSize: '0.72rem', color: textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Potencial Bolsa 'Por Confirmar'</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#d97706' }}>
                          {aiStrategy.financiero.recaudacionPorConfirmarFormatted}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: textMuted }}>Convirtiendo el 25% de los contactos en seguimiento</div>
                      </div>
                    </div>

                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '1.25rem' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 800, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <DollarSign size={18} /> Retorno Directo de la Estrategia
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#1e3a8a', lineHeight: 1.5 }}>
                        {aiStrategy.financiero.retornoPotencial} Cada llamada de confirmación exitosa representa un ingreso directo de <strong>{formatCurrencyAmount(aiStrategy.financiero.precioUnitario, aiStrategy.financiero.moneda)}</strong> para el sostenimiento del evento. La validación temprana de pagos en coordinación con el área financiera elimina cancelaciones de último minuto.
                      </p>
                    </div>
                  </div>
                )}

                {/* CONTENIDO TAB 5: SPEECH DE CIERRE */}
                {activeStrategyTab === 'speech' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', color: textMuted }}>
                      Guión táctico sugerido para coordinadores al contactar a la base 'Por Confirmar':
                    </div>

                    <div style={{ background: '#f8fafc', borderLeft: '4px solid #3b82f6', padding: '1rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1d4ed8', marginBottom: '0.25rem' }}>PASO 1: DISTINCIÓN Y POSTULACIÓN</div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: textDark, fontStyle: 'italic' }}>
                        {aiStrategy.speechCierre.etapa1}
                      </p>
                    </div>

                    <div style={{ background: '#f8fafc', borderLeft: '4px solid #f59e0b', padding: '1rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b45309', marginBottom: '0.25rem' }}>PASO 2: SENTIDO DE URGENCIA & AFORO</div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: textDark, fontStyle: 'italic' }}>
                        {aiStrategy.speechCierre.etapa2}
                      </p>
                    </div>

                    <div style={{ background: '#f8fafc', borderLeft: '4px solid #10b981', padding: '1rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#047857', marginBottom: '0.25rem' }}>PASO 3: COMPROMISO Y FORMALIZACIÓN</div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: textDark, fontStyle: 'italic' }}>
                        {aiStrategy.speechCierre.etapa3}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 1. AGENTE DE PREDICCIÓN OPERATIVA */}
            {predictionData && (
              <div style={{ background: bgCard, border: '1px solid #10b981', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ padding: '0.4rem', borderRadius: '8px', background: '#ecfdf5', color: '#10b981', display: 'flex' }}>
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: textDark, margin: 0 }}>
                        Agente de Predicción Operativa (Causa OS Engine)
                      </h3>
                      <p style={{ fontSize: '0.75rem', color: textMuted, margin: 0 }}>
                        Proyección algorítmica de confirmados al día de apertura de sala
                      </p>
                    </div>
                  </div>
                  <span style={{ padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, background: predictionData.probabilidad >= 80 ? '#ecfdf5' : predictionData.probabilidad >= 50 ? '#fffbeb' : '#fef2f2', color: predictionData.probabilidad >= 80 ? '#10b981' : predictionData.probabilidad >= 50 ? '#f59e0b' : '#ef4444', border: `1px solid ${predictionData.probabilidad >= 80 ? '#10b981' : predictionData.probabilidad >= 50 ? '#f59e0b' : '#ef4444'}` }}>
                    Probabilidad de Meta: {predictionData.probabilidad}%
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: `1px solid ${borderLight}` }}>
                    <div style={{ fontSize: '0.72rem', color: textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Confirmados Actuales</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>{predictionData.confirmados}</div>
                    <div style={{ fontSize: '0.68rem', color: textMuted }}>Enrolados auditados</div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: `1px solid ${borderLight}` }}>
                    <div style={{ fontSize: '0.72rem', color: textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Ritmo de Enrolamiento</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#3b82f6' }}>{predictionData.ritmoDiario} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>/día</span></div>
                    <div style={{ fontSize: '0.68rem', color: textMuted }}>Tendencia: {predictionData.tendencia}</div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: `1px solid ${borderLight}` }}>
                    <div style={{ fontSize: '0.72rem', color: textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Proyección al Cierre</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: predictionData.proyeccionFinal >= predictionData.meta ? '#10b981' : '#f59e0b' }}>
                      {predictionData.proyeccionFinal} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>/ {predictionData.meta}</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: textMuted }}>En {predictionData.diasRestantes} días restantes</div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: `1px solid ${borderLight}` }}>
                    <div style={{ fontSize: '0.72rem', color: textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Déficit a Cubrir</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: predictionData.deficit === 0 ? '#10b981' : '#ef4444' }}>
                      {predictionData.deficit}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: textMuted }}>Cupos para meta segura</div>
                  </div>
                </div>

                {/* BARRA PREDICTIVA */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                    <span>Progreso Proyectado vs Meta de Sala ({predictionData.meta} pax)</span>
                    <span style={{ color: '#10b981' }}>{predictionData.probabilidad}% esperado</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: borderLight, borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, predictionData.probabilidad)}%`, height: '100%', background: predictionData.probabilidad >= 80 ? '#10b981' : predictionData.probabilidad >= 50 ? '#f59e0b' : '#ef4444', borderRadius: '6px' }} />
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: textDark, background: '#f1f5f9', padding: '0.75rem 1rem', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                  🎯 <strong>Dictamen Algorítmico:</strong> Al ritmo actual de {predictionData.ritmoDiario} confirmaciones/día, la proyección de cierre es de {predictionData.proyeccionFinal} participantes. {predictionData.proyeccionFinal >= predictionData.meta ? 'La sede alcanzará la cuota programada de sala con holgura operativa.' : `Se requiere elevar el ritmo a ${predictionData.deficit > 0 ? (predictionData.deficit / predictionData.diasRestantes).toFixed(1) : '0.0'} confirmados/día para garantizar sala completa.`}
                </div>
              </div>
            )}

            {/* 2. AGENTE DE ALERTAS A GERENTES DE ACTIVIDAD EN NODUS */}
            <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ padding: '0.4rem', borderRadius: '8px', background: '#fee2e2', color: '#ef4444', display: 'flex' }}>
                    <Bell size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: textDark, margin: 0 }}>
                      Agente de Alertas a Gerentes (Monitoreo Nodus en Vivo)
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: textMuted, margin: 0 }}>
                      Detección automática de rezagos de gestión, cuellos de botella y oportunidades
                    </p>
                  </div>
                </div>

                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.3rem 0.6rem', borderRadius: '6px', background: '#f1f5f9', color: textDark }}>
                  {managerAlerts.length} Alerta{managerAlerts.length === 1 ? '' : 's'} Activa{managerAlerts.length === 1 ? '' : 's'}
                </span>
              </div>

              {managerAlerts.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#10b981', background: '#ecfdf5', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                  ✓ Sin anomalías operativas: Todos los coordinadores registran gestión activa y flujo normal en Nodus.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {managerAlerts.map(alert => (
                    <div 
                      key={alert.id}
                      style={{ 
                        padding: '1rem', 
                        borderRadius: '8px', 
                        border: `1px solid ${alert.color}40`, 
                        background: `${alert.color}08`,
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flex: 1, minWidth: '280px' }}>
                        <div style={{ color: alert.color, marginTop: '2px' }}>
                          {alert.tipo === 'CRITICA' ? <AlertTriangle size={18} /> : alert.tipo === 'OPORTUNIDAD' ? <Zap size={18} /> : <Clock size={18} />}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: alert.color, textTransform: 'uppercase' }}>
                              [{alert.tipo}] {alert.sede}: {alert.coordinador}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: textDark, marginBottom: '0.3rem' }}>
                            {alert.mensaje}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: textMuted }}>
                            ⚡ <strong>Acción Sugerida para Gerente:</strong> {alert.accionRecomendada}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate('/portafolio')}
                        style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', background: bgCard, border: `1px solid ${borderLight}`, fontSize: '0.75rem', fontWeight: 700, color: textDark, cursor: 'pointer' }}
                      >
                        Auditar en Nodus →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. LISTA DE OKRS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: textDark, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Briefcase size={20} color="#10b981" /> Objetivos Clave Operativos
              </h2>
              
              {okrs.map(okr => (
                <div key={okr.id} style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  
                  {/* HEADER DEL OKR */}
                  <div style={{ padding: '1.5rem', borderBottom: `1px solid ${borderLight}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', background: '#f1f5f9', color: '#3b82f6', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{okr.owner}</span>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: textDark, margin: 0 }}>{okr.objective}</h3>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: textMuted, fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>{`Progreso ${selectedSede === 'GLOBAL' ? 'Global' : 'Sede'}`}</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3b82f6' }}>{okr.progress}%</div>
                      </div>
                    </div>
                    
                    {/* BARRA DE PROGRESO */}
                    <div style={{ width: '100%', height: '8px', background: borderLight, borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ width: `${okr.progress}%`, height: '100%', background: '#3b82f6', borderRadius: '10px' }}></div>
                    </div>
                  </div>

                  {/* KEY RESULTS */}
                  <div style={{ background: '#f8fafc', padding: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <BarChart2 size={14} /> Resultados Clave Extraídos de Nodus
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {okr.keyResults.map(kr => {
                        const isGood = kr.unit === 'inc' ? kr.current <= kr.target : kr.current >= (kr.target * 0.8);
                        const krColor = isGood ? '#10b981' : '#f59e0b';
                        const krPercent = kr.unit === 'inc' ? 100 : Math.min(100, (kr.current / (kr.target || 1)) * 100);

                        return (
                          <div key={kr.id} style={{ background: bgCard, border: `1px solid ${borderLight}`, padding: '1rem', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.85rem', color: textDark, fontWeight: 600 }}>{kr.text}</span>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '1rem', fontWeight: 800, color: krColor }}>{kr.current} <span style={{ fontSize: '0.7rem' }}>{kr.unit}</span></span>
                                <div style={{ fontSize: '0.65rem', color: textMuted }}>Meta: {kr.target}</div>
                              </div>
                            </div>
                            <div style={{ width: '100%', height: '4px', background: borderLight, borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${krPercent}%`, height: '100%', background: krColor }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
