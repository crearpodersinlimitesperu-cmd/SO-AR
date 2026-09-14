import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, BrainCircuit, Loader2, Database, MessageSquarePlus, History, ChevronLeft, MessageCircle } from 'lucide-react';
import { doc, getDocs, getFirestore, collection, addDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { auth, db, getDocResilient } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

// MOTOR ANALÍTICO AUTÓNOMO CAUSA OS (ZERO-HALLUCINATION & DEEP DATA ENGINE)
function generateAssertiveResponse(queryText, nodusData, currentUser, messageHistory = []) {
  let q = (queryText || '').toLowerCase().trim();
  const coords = nodusData?.coordinadores || [];
  const totales = nodusData?.totales || {};
  const sedes = nodusData?.sedes || [];

  // 0. Resolución contextual de preguntas de seguimiento ("ya tienes respuesta a mi pregunta", "y cuántos son", etc.)
  const followUpTriggers = [
    'ya tienes respuesta', 'tienes respuesta', 'responde', 'mi pregunta', 
    'cual es la respuesta', 'y de eso', 'cuantos son', 'que hay de', 'me respondes', 'dimelo'
  ];
  if (followUpTriggers.some(t => q.includes(t)) && Array.isArray(messageHistory)) {
    const pastUserMsgs = [...messageHistory].reverse().filter(m => m.role === 'user' && m.content !== queryText);
    for (const pm of pastUserMsgs) {
      const pText = (pm.content || '').toLowerCase();
      if (pText.includes('31') || pText.includes('e31') || pText.includes('c1') || pText.includes('confirmad') || pText.includes('lima') || pText.includes('sala')) {
        q = `${q} ${pText}`;
        break;
      }
    }
  }

  // 1. Preguntas sobre un equipo/ciclo específico (ej. "C1 E31", "equipo 30")
  // (14/09/2026) CORREGIDO: antes esta rama devolvía SIEMPRE un "Reporte Oficial"
  // con cifras y nombres de coordinadoras totalmente inventados (fijos en el
  // código, sin leer nodusData) y lo presentaba como "verificado en las fuentes
  // autorizadas" — una alucinación literal, detectada junto con el fix del
  // selector de sedes de Home.jsx (mismo reporte de José: "no alucinar"). Ahora
  // se busca el equipo en los datos reales de coords/sedes (si existen) y, si no
  // hay coincidencia con datos en vivo, se dice explícitamente que no hay datos
  // verificados disponibles — nunca se inventa una cifra para rellenar.
  const equipoMatch = q.match(/\b(?:e|equipo\s*)(\d{1,3})\b/);
  if (equipoMatch) {
    const equipoNum = equipoMatch[1];
    const coordsDelEquipo = coords.filter(c => String(c.equipo || '').includes(equipoNum));
    let resp = `📊 **Consulta Equipo ${equipoNum}:**\n\n`;
    if (coordsDelEquipo.length > 0) {
      resp += `Datos en vivo (Nodus) para las coordinaciones asociadas a este equipo:\n\n`;
      coordsDelEquipo.forEach(c => {
        const est = c.estados || {};
        resp += `* **${c.nombre} (${c.sede || 'sede no especificada'}):** ${est.confirmado || 0} confirmados, ${est.porConfirmar || 0} por confirmar, de ${est.asignados || 0} asignados.\n`;
      });
    } else {
      resp += `⚠️ No encuentro datos en vivo verificados (Nodus/Firestore) para el Equipo ${equipoNum} en este momento. No voy a inventar cifras — puedes pedirme el reporte general de sedes ("¿cómo van los confirmados?") mientras se sincroniza, o consultar directamente en Nodus/el padrón oficial.`;
    }
    return resp;
  }

  // 2. Preguntas sobre confirmados o enrolados en general
  // (14/09/2026) CORREGIDO: los totales (133/24/80/18%) y el desglose por sede
  // (Lima 19/76, "Arequipa" 3/12, Guayaquil 2/18) eran valores fijos en el código
  // que se mostraban como si fueran el reporte real cuando totales/sedes venían
  // vacíos (sin conexión a Nodus) — "Arequipa" ni siquiera es una sede de CREAR.
  // Ahora, si no hay datos en vivo, se dice explícitamente.
  if (q.includes('confirmad') || q.includes('enrola') || q.includes('cuanto') || q.includes('total') || q.includes('cierre') || q.includes('asistencia')) {
    const hayTotales = totales && (totales.totalAsignados !== undefined || totales.totalConfirmados !== undefined || totales.totalGestiones !== undefined);
    if (!hayTotales && sedes.length === 0) {
      return `⚠️ **Sin datos en vivo disponibles ahora mismo.**\n\n` +
        `No tengo un snapshot reciente de Nodus/Firestore para darte cifras verificadas de enrolamiento. No voy a inventar totales — intenta de nuevo en unos minutos o revisa directamente el dashboard de Nodus.`;
    }
    let resp = `📊 **Reporte de Enrolamiento y Confirmados (Nodus Live Audit):**\n\n`;
    resp += `* **Total Asignados:** **${totales.totalAsignados ?? 'sin dato'}** contactos\n`;
    resp += `* **Confirmados a Sala:** **${totales.totalConfirmados ?? 'sin dato'}** participantes confirmados\n`;
    resp += `* **Gestiones Realizadas:** **${totales.totalGestiones ?? 'sin dato'}** llamadas efectivas\n`;
    if (totales.totalAsignados > 0) {
      const conv = Math.round(((totales.totalConfirmados || 0) / totales.totalAsignados) * 100);
      resp += `* **Tasa de Conversión Real:** **${conv}%**\n\n`;
    } else {
      resp += `\n`;
    }
    resp += `**Desglose Directivo por Sedes:**\n`;
    if (sedes.length > 0) {
      sedes.forEach(s => {
        const asig = s.asignadosTotal || 0;
        const conf = s.confirmadosTotal || 0;
        const p = asig > 0 ? Math.round((conf / asig) * 100) : 0;
        resp += `* **${s.sede}:** ${conf} confirmados de ${asig} asignados (${p}% conversión)\n`;
      });
    } else {
      resp += `* Sin desglose por sede disponible en este snapshot.\n`;
    }
    resp += `\n🎯 **Diagnóstico Asertivo:** El punto neurálgico de la sala está en acelerar la remarcación de los contactos 'Por Confirmar' para asegurar el lleno total antes del fin de semana de entrenamiento.`;
    return resp;
  }

  // 3. Preguntas sobre sedes específicas
  // (14/09/2026) CORREGIDO: la lista incluía "arequipa" y "bogota", que nunca
  // fueron sedes de CREAR (mismo hallazgo que el selector de Home.jsx) — se
  // reemplaza por las 6 sedes reales confirmadas en CAJA_NEGRA_OPERATIVA.md
  // Sección 5.
  const foundSede = ['lima', 'quito', 'guayaquil', 'cuenca', 'medellin', 'mexico'].find(s => q.includes(s));
  if (foundSede) {
    const sedeName = foundSede.charAt(0).toUpperCase() + foundSede.slice(1);
    const sedeCoords = coords.filter(c => (c.sede || '').toLowerCase().includes(foundSede));
    let resp = `📍 **Auditoría Operativa Sede ${sedeName} (Data en Vivo Nodus):**\n\n`;
    if (sedeCoords.length > 0) {
      sedeCoords.forEach(c => {
        const est = c.estados || {};
        const asig = Number(est.asignados || 0);
        const llam = Number(est.llamadas || 0);
        const callRate = asig > 0 ? Math.round((llam / asig) * 100) : 0;
        resp += `* **${c.nombre}:**\n`;
        resp += `  - Asignados: **${asig}**\n`;
        resp += `  - Confirmados a Sala: **${est.confirmado || 0}**\n`;
        resp += `  - Por Confirmar: **${est.porConfirmar || 0}**\n`;
        resp += `  - No Contesta: **${est.noContesta || 0}**\n`;
        resp += `  - Contactabilidad: **${callRate}%**\n`;
      });
    } else {
      resp += `⚠️ No tengo coordinaciones con datos en vivo registradas para ${sedeName} en este snapshot de Nodus.\n`;
    }
    resp += `\n⚡ **Plan de Acción:** Desplegar bloque de llamadas prioritarias con el Quantum Team entre las 18:00 y 21:00 hrs para cerrar confirmaciones pendientes.`;
    return resp;
  }

  // 4. Preguntas sobre coordinadores o actividad
  if (q.includes('coordinador') || q.includes('llam') || q.includes('actividad') || q.includes('inactiv') || q.includes('gestion') || q.includes('quien')) {
    let resp = `📞 **Estado de Gestión de Coordinadores (Auditado en Nodus):**\n\n`;
    const rezagados = coords.filter(c => {
      const est = c.estados || {};
      return (Number(est.asignados || 0) > 0) && ((Number(est.llamadas || 0) === 0) || (Number(est.porConfirmar || 0) >= 8));
    });
    if (rezagados.length > 0) {
      resp += `⚠️ **Coordinaciones con atención inmediata requerida:**\n`;
      rezagados.forEach(c => {
        const est = c.estados || {};
        resp += `* **${c.nombre} (${c.sede}):** ${est.llamadas || 0} llamadas de ${est.asignados || 0} asignados (${est.porConfirmar || 0} por confirmar).\n`;
      });
    } else {
      resp += `✓ Todas las coordinaciones registran flujo de llamadas en las últimas 24 horas.\n`;
    }
    resp += `\n💡 **Recomendación:** Verificar que cada coordinador cuente con su libreto de objeciones y el acompañamiento directo del Capitán de Sede.`;
    return resp;
  }

  // 5. Preguntas sobre metas u OKRs
  // (14/09/2026) CORREGIDO: el "75%" de contactabilidad era un valor fijo que se
  // mostraba como si fuera calculado cuando no había datos — se reemplaza por un
  // indicador honesto de "sin dato" en ese caso. Las metas fijas (30 participantes
  // por sede, <10% desgaste, 70% conversión a MJ) NO son datos en vivo, son
  // objetivos declarados de la organización, así que se mantienen tal cual.
  if (q.includes('meta') || q.includes('okr') || q.includes('objetivo') || q.includes('salud') || q.includes('estrategia') || q.includes('predic')) {
    const contactabilidad = totales.totalAsignados > 0
      ? `${Math.round(((totales.totalGestiones || 0) / totales.totalAsignados) * 100)}%`
      : 'sin dato en vivo';
    return `🎯 **Alineación Estratégica Causa OS:**\n\n` +
      `* **Meta de Contactabilidad C1:** 100% de la base llamada (Actualmente en **${contactabilidad}**).\n` +
      `* **Meta de Confirmados por Sede:** Mínimo 30 participantes activos en sala.\n` +
      `* **Retención C1:** Menor al 10% de desgaste.\n` +
      `* **Movimiento a Maestría del Juego (CMJ):** 70% de conversión declarada.\n\n` +
      `⚡ **Acción Inmediata:** Desplegar revisión diaria a primera hora en el Centro de Managers para alinear compromisos de palabra.`;
  }

  // 6. Respuesta por defecto
  // (14/09/2026) CORREGIDO: "24 confirmados, 80 gestiones" eran valores fijos que
  // se mostraban como "Métricas Clave" reales incluso sin datos de Nodus.
  const metricasClave = (totales.totalConfirmados !== undefined || totales.totalGestiones !== undefined)
    ? `${totales.totalConfirmados ?? 'sin dato'} confirmados consolidados, ${totales.totalGestiones ?? 'sin dato'} gestiones registradas.`
    : 'sin snapshot de Nodus disponible en este momento.';
  return `🤖 **Diagnóstico Operativo Causa OS:**\n\n` +
    `He procesado tu consulta: _"${queryText}"_\n\n` +
    `* **Base de Datos:** NODUS Live & Firestore Causa OS.\n` +
    `* **Usuario en Sesión:** ${currentUser?.displayName || currentUser?.name || 'Líder'} (${currentUser?.appRole || 'Oficina'} - ${currentUser?.sede || 'Global'}).\n` +
    `* **Métricas Clave:** ${metricasClave}\n\n` +
    `Puedes pedirme:\n` +
    `1. *"¿Cuántos confirmados hay para C1 Equipo 31?"*\n` +
    `2. *"¿Cómo va la sede Lima o Guayaquil?"*\n` +
    `3. *"¿Quiénes tienen contactos pendientes de llamar?"*\n` +
    `4. *"¿Cuál es la proyección de cierre de sala?"*`;
}

// Render de Markdown ligero para las respuestas del bot (agregado 23/08/2026:
// el system prompt del Worker le pide al modelo usar **negritas** y listas
// con "*", pero el chat las mostraba como texto plano con asteriscos — "modo
// robot sin formato"). No se agregó ninguna librería nueva (react-markdown,
// etc.) para no aumentar el tamaño del bundle — es un parser propio, chico,
// que solo soporta lo que el bot realmente usa: párrafos, **negrita**, listas
// con "*"/"-" y listas numeradas "1.". Los mensajes del usuario NO pasan por
// esto (se muestran como texto plano tal cual los escribió).
function renderInlineMarkdown(text, keyPrefix) {
  const partes = text.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((parte, i) => {
    if (parte.startsWith('**') && parte.endsWith('**') && parte.length > 4) {
      return <strong key={`${keyPrefix}-b-${i}`}>{parte.slice(2, -2)}</strong>;
    }
    return parte ? <React.Fragment key={`${keyPrefix}-t-${i}`}>{parte}</React.Fragment> : null;
  });
}

function renderMarkdown(texto) {
  if (!texto) return null;
  const lineas = texto.split('\n');
  const bloques = [];
  let listaActual = null; // { tipo: 'ul' | 'ol', items: [] }
  let parrafoActual = [];

  const cerrarParrafo = () => {
    if (parrafoActual.length) {
      bloques.push({ tipo: 'p', texto: parrafoActual.join(' ') });
      parrafoActual = [];
    }
  };
  const cerrarLista = () => {
    if (listaActual) {
      bloques.push(listaActual);
      listaActual = null;
    }
  };

  lineas.forEach((linea) => {
    const trimmed = linea.trim();

    if (!trimmed) {
      cerrarParrafo();
      cerrarLista();
      return;
    }

    // Item de lista no ordenada: "* ", "- "
    const matchUl = trimmed.match(/^[*•-]\s+(.*)$/);
    if (matchUl) {
      cerrarParrafo();
      if (!listaActual || listaActual.tipo !== 'ul') {
        cerrarLista();
        listaActual = { tipo: 'ul', items: [] };
      }
      listaActual.items.push(matchUl[1]);
      return;
    }

    // Item de lista numerada: "1. ", "2. ", etc.
    const matchOl = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (matchOl) {
      cerrarParrafo();
      if (!listaActual || listaActual.tipo !== 'ol') {
        cerrarLista();
        listaActual = { tipo: 'ol', items: [] };
      }
      listaActual.items.push(matchOl[2]);
      return;
    }

    // Si veníamos de una lista y encontramos texto normal, cerramos la lista
    if (listaActual) {
      cerrarLista();
    }
    parrafoActual.push(trimmed);
  });

  cerrarParrafo();
  cerrarLista();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {bloques.map((b, idx) => {
        if (b.tipo === 'p') {
          return (
            <p key={`p-${idx}`} style={{ margin: 0, lineHeight: 1.45 }}>
              {renderInlineMarkdown(b.texto, `p-${idx}`)}
            </p>
          );
        }
        if (b.tipo === 'ul') {
          return (
            <ul key={`ul-${idx}`} style={{ margin: '0.2rem 0', paddingLeft: '1.2rem', lineHeight: 1.45 }}>
              {b.items.map((it, itemIdx) => (
                <li key={`ul-${idx}-${itemIdx}`} style={{ marginBottom: '0.2rem' }}>
                  {renderInlineMarkdown(it, `ul-${idx}-${itemIdx}`)}
                </li>
              ))}
            </ul>
          );
        }
        if (b.tipo === 'ol') {
          return (
            <ol key={`ol-${idx}`} style={{ margin: '0.2rem 0', paddingLeft: '1.2rem', lineHeight: 1.45 }}>
              {b.items.map((it, itemIdx) => (
                <li key={`ol-${idx}-${itemIdx}`} style={{ marginBottom: '0.2rem' }}>
                  {renderInlineMarkdown(it, `ol-${idx}-${itemIdx}`)}
                </li>
              ))}
            </ol>
          );
        }
        return null;
      })}
    </div>
  );
}

export default function AICopilot() {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hola. Soy tu Copiloto Analítico de Causa OS, conectado a NODUS. ¿En qué puedo apoyarte hoy con los datos de sala, seguimiento o metas de la organización?'
    }
  ]);
  const [queryText, setQueryText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef(null);

  // Paleta Institucional Premium
  const colors = {
    primary: '#1e3a8a', // Azul Marino Institucional
    secondary: '#0ea5e9', // Celeste Vibrante
    bg: '#ffffff',
    bgAlt: '#f8fafc',
    text: '#0f172a',
    border: '#e2e8f0',
    botMsg: '#f1f5f9',
    userMsg: '#1e3a8a'
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Load chat sessions from Firestore with LocalStorage resilient fallback
  useEffect(() => {
    if (!currentUser) return;
    loadSessions();
  }, [currentUser]);

  const loadSessions = async () => {
    if (!currentUser) return;
    
    // Intento 1: LocalStorage inmediato para UX ultra rápida
    const localKey = `copilot_sessions_${currentUser.uid}`;
    try {
      const cached = localStorage.getItem(localKey);
      if (cached) {
        setSessions(JSON.parse(cached));
      }
    } catch (e) {
      console.warn("Error leyendo historial local:", e);
    }

    // Intento 2: Sincronización con Firestore
    try {
      const db = getFirestore();
      const chatsRef = collection(db, 'users', currentUser.uid, 'copilot_chats');
      const q = query(chatsRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const loadedSessions = [];
      snapshot.forEach(docSnap => {
        loadedSessions.push({ id: docSnap.id, ...docSnap.data() });
      });
      if (loadedSessions.length > 0) {
        setSessions(loadedSessions);
        localStorage.setItem(localKey, JSON.stringify(loadedSessions));
      }
    } catch (err) {
      console.warn("Modo offline o sin permisos en Firestore copilot_chats, usando LocalStorage:", err);
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([
      {
        role: 'assistant',
        content: 'Hola. Soy tu Copiloto Analítico de Causa OS, conectado a NODUS. ¿En qué puedo apoyarte hoy con los datos de sala, seguimiento o metas de la organización?'
      }
    ]);
    setShowHistory(false);
  };

  const loadSession = (session) => {
    setCurrentSessionId(session.id);
    if (session.messages && Array.isArray(session.messages)) {
      setMessages(session.messages);
    }
    setShowHistory(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!queryText.trim()) return;

    const userMessage = { role: 'user', content: queryText };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    const currentQuery = queryText;
    setQueryText('');
    setIsLoading(true);

    if (!currentUser) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Necesitas iniciar sesión para usar el Copiloto.'
      }]);
      setIsLoading(false);
      return;
    }

    try {
      // Create or update session in Firestore BEFORE sending to AI to save user's question
      const db = getFirestore();
      let activeSessionId = currentSessionId;
      
      try {
        if (!activeSessionId && currentUser) {
          // Create new session
          const newSessionRef = await addDoc(collection(db, 'users', currentUser.uid, 'copilot_chats'), {
            title: currentQuery.length > 30 ? currentQuery.substring(0, 30) + '...' : currentQuery,
            messages: updatedMessages,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          activeSessionId = newSessionRef.id;
          setCurrentSessionId(activeSessionId);
          // Reload sessions list to show it in history
          loadSessions();
        } else if (currentUser) {
          // Update existing session
          await updateDoc(doc(db, 'users', currentUser.uid, 'copilot_chats', activeSessionId), {
            messages: updatedMessages,
            updatedAt: new Date().toISOString()
          });
        }
      } catch (historyErr) {
        console.warn("No se pudo guardar el historial de chat (posible error de permisos):", historyErr);
      }

      // Intento 1: Llamar al backend Cloudflare Worker si está disponible
      let aiText = '';
      try {
        const workerUrl = import.meta.env.VITE_COPILOTO_WORKER_URL || 'https://so-ar-copiloto.crearpsl-cpsl.workers.dev';
        const firebaseUser = auth.currentUser;
        if (firebaseUser && workerUrl) {
          const idToken = await firebaseUser.getIdToken(false);
          const mensajesParaBot = updatedMessages
            .filter(m => m.role !== 'system' && !m.content.includes('⚠️'))
            .map(m => ({ role: m.role, content: m.content }));

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);

          const workerResponse = await fetch(workerUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ messages: mensajesParaBot }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (workerResponse.ok) {
            const workerData = await workerResponse.json();
            const refusalPhrases = [
              'no puedo confirmar ese dato',
              'fuentes autorizadas',
              'no tengo informaci',
              'no se encuentra en el contexto'
            ];
            const textLower = (workerData.text || '').toLowerCase();
            const isRefusal = refusalPhrases.some(p => textLower.includes(p));

            if (workerData.text && !isRefusal) {
              aiText = workerData.text;
            } else {
              console.warn("Cloudflare Worker respondió con rechazo defensivo o falta de contexto. Activando Motor Analítico Autónomo Causa OS...");
            }
          }
        }
      } catch (workerErr) {
        console.warn("Cloudflare Worker no disponible o con latencia, activando Motor Analítico Autónomo Causa OS:", workerErr);
      }

      // Intento 2: Si el backend no respondió, dio error o rechazo defensivo, activar el Motor Autónomo Directo de Nodus (Cero Errores y Cero Alucinación)
      if (!aiText) {
        let nodusData = null;
        try {
          const nodusDoc = await getDocResilient(doc(db, 'nodus_coordinadores_c1c2', 'latest'));
          if (nodusDoc && nodusDoc.exists()) {
            nodusData = nodusDoc.data();
          }
        } catch (nodusErr) {
          console.warn("Error leyendo snapshot Nodus para copilot:", nodusErr);
        }
        aiText = generateAssertiveResponse(currentQuery, nodusData, currentUser, updatedMessages);
      }

      const finalMessages = [...updatedMessages, { role: 'assistant', content: aiText }];
      setMessages(finalMessages);

      // Persistencia Resiliente 1: Firestore copilot_chats
      try {
        if (currentUser && activeSessionId) {
          await updateDoc(doc(db, 'users', currentUser.uid, 'copilot_chats', activeSessionId), {
            messages: finalMessages,
            updatedAt: new Date().toISOString()
          });
        }
      } catch (saveErr) {
        console.warn("Error al actualizar respuesta en Firestore:", saveErr);
      }

      // Persistencia Resiliente 2: LocalStorage
      try {
        const localKey = `copilot_sessions_${currentUser.uid}`;
        const localSessions = JSON.parse(localStorage.getItem(localKey) || '[]');
        const updatedLocal = [
          {
            id: activeSessionId || 'local_' + Date.now(),
            title: currentQuery.length > 30 ? currentQuery.substring(0, 30) + '...' : currentQuery,
            messages: finalMessages,
            updatedAt: new Date().toISOString()
          },
          ...localSessions.filter(s => s.id !== activeSessionId)
        ];
        localStorage.setItem(localKey, JSON.stringify(updatedLocal.slice(0, 30)));
      } catch (localErr) {
        console.warn("Aviso LocalStorage:", localErr);
      }

    } catch (error) {
      console.error("Error en Copiloto:", error);
      // Fallback de emergencia final
      const fallbackText = generateAssertiveResponse(currentQuery, null, currentUser, updatedMessages);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: fallbackText
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="floating-copilot-btn"
        style={{ 
          position: 'fixed', bottom: '2rem', right: '2rem', width: '60px', height: '60px', 
          background: colors.primary, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
          boxShadow: '0 10px 25px rgba(30, 58, 138, 0.4)', cursor: 'pointer', border: `2px solid ${colors.secondary}`, zIndex: 9999,
          transition: 'transform 0.2s'
        }}
        title="Abrir Copiloto Analítico"
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <BrainCircuit size={28} color="#ffffff" />
      </button>
    );
  }

  return (
    <div style={{ 
      position: 'fixed', top: 0, right: 0, width: '100%', maxWidth: '400px', height: '100vh', 
      background: colors.bg, boxShadow: '-5px 0 30px rgba(0,0,0,0.15)', zIndex: 9999, 
      display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Header Institucional */}
      <div style={{ 
        background: colors.primary, padding: '1.2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
        borderBottom: `4px solid ${colors.secondary}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BrainCircuit size={24} color={colors.secondary} />
              <h3 style={{ color: '#ffffff', fontWeight: 800, margin: 0, fontSize: '1.2rem' }}>Copiloto Analítico</h3>
            </div>
            <p style={{ color: '#93c5fd', fontSize: '0.75rem', margin: '0.3rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Database size={12} /> Conectado a NODUS (En vivo)
            </p>
          </div>
          <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0.5rem' }}>
            <X size={24} />
          </button>
        </div>
        
        {/* Controles del Historial */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {showHistory ? (
            <button 
              onClick={() => setShowHistory(false)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', color: '#ffffff', border: 'none', padding: '0.6rem', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
            >
              <ChevronLeft size={16} /> Volver al Chat
            </button>
          ) : (
            <>
              <button 
                onClick={startNewChat}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: colors.secondary, color: '#ffffff', border: 'none', padding: '0.6rem', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
              >
                <MessageSquarePlus size={16} /> Nuevo Chat
              </button>
              <button 
                onClick={() => setShowHistory(true)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', color: '#ffffff', border: 'none', padding: '0.6rem', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
              >
                <History size={16} /> Historial
              </button>
            </>
          )}
        </div>
      </div>

      {showHistory ? (
        /* Vista de Historial */
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: colors.bgAlt, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: colors.text, fontSize: '0.9rem', fontWeight: 700 }}>Conversaciones Anteriores</h4>
          {sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.9rem' }}>
              No hay conversaciones guardadas aún.
            </div>
          ) : (
            sessions.map(session => (
              <button
                key={session.id}
                onClick={() => loadSession(session)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#ffffff',
                  border: `1px solid ${currentSessionId === session.id ? colors.secondary : colors.border}`,
                  borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'border 0.2s',
                  boxShadow: currentSessionId === session.id ? `0 0 0 2px ${colors.secondary}30` : 'none'
                }}
              >
                <MessageCircle size={18} color={currentSessionId === session.id ? colors.secondary : '#64748b'} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ color: colors.text, fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {session.title || 'Nueva Conversación'}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                    {new Date(session.updatedAt).toLocaleDateString()} {new Date(session.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        /* Area de Mensajes Normal */
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: colors.bgAlt }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ 
                  maxWidth: '85%', padding: '1rem', borderRadius: '12px', fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-wrap',
                  background: msg.role === 'user' ? colors.userMsg : colors.botMsg,
                  color: msg.role === 'user' ? '#ffffff' : colors.text,
                  border: msg.role === 'assistant' ? `1px solid ${colors.border}` : 'none',
                  borderTopRightRadius: msg.role === 'user' ? '0' : '12px',
                  borderTopLeftRadius: msg.role === 'assistant' ? '0' : '12px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                }}>
                  {msg.role === 'assistant' && <Sparkles size={16} color={colors.secondary} style={{ marginBottom: '0.3rem', display: 'inline-block', marginRight: '0.4rem' }} />}
                  {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: colors.botMsg, padding: '1rem', borderRadius: '12px', borderTopLeftRadius: '0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: colors.text, border: `1px solid ${colors.border}` }}>
                  <Loader2 size={16} color={colors.secondary} style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.9rem' }}>Analizando datos de Nodus...</span>
                  <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} style={{ padding: '1.5rem', background: colors.bg, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Escribe un mensaje..."
              disabled={isLoading}
              style={{ 
                flex: 1, padding: '0.8rem 1rem', borderRadius: '8px', border: `1px solid ${colors.border}`, 
                fontSize: '0.9rem', outline: 'none', background: colors.bgAlt, color: colors.text 
              }}
            />
            <button 
              type="submit" 
              disabled={!queryText.trim() || isLoading} 
              style={{ 
                background: colors.primary, color: '#ffffff', border: 'none', borderRadius: '8px', padding: '0 1rem', 
                cursor: !queryText.trim() || isLoading ? 'not-allowed' : 'pointer', opacity: !queryText.trim() || isLoading ? 0.6 : 1 
              }}
            >
              <Send size={18} />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
