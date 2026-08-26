import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, BrainCircuit, Loader2, Database, MessageSquarePlus, History, ChevronLeft, MessageCircle } from 'lucide-react';
import { doc, getDocs, getFirestore, collection, addDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';

// NOTA (23/08/2026): Antes este componente llamaba directo a la API de Gemini
// desde el navegador, con la API Key incrustada en el bundle público (primero
// hardcodeada, luego vía import.meta.env.VITE_GEMINI_API_KEY — el mismo riesgo,
// solo que la key vivía en .env en vez de en el código). Ahora llama a un backend
// cerrado propio (Cloudflare Worker, ver /cloudflare-worker/src/index.js) que:
//   - verifica el login real de Firebase Auth,
//   - calcula el rol/sede del lado del servidor y filtra Nodus por permisos,
//   - llama a Groq con una key que nunca sale del servidor.
// Se eligió Cloudflare Workers (en vez de Firebase Cloud Functions) porque el
// proyecto está en el plan gratuito Spark de Firebase, y Cloud Functions
// requiere el plan Blaze (de pago) sin excepción. Queda también preparado
// /functions/index.js por si en el futuro se decide subir a Blaze.
// Requiere VITE_COPILOTO_WORKER_URL en .env (URL del Worker ya desplegado —
// no es secreta, es solo la dirección pública del backend).

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

  for (const linea of lineas) {
    const l = linea.trim();
    if (l === '') {
      cerrarParrafo();
      cerrarLista();
      continue;
    }
    const bullet = l.match(/^[*-]\s+(.*)/);
    const numerada = l.match(/^\d+[.)]\s+(.*)/);
    if (bullet) {
      cerrarParrafo();
      if (!listaActual || listaActual.tipo !== 'ul') { cerrarLista(); listaActual = { tipo: 'ul', items: [] }; }
      listaActual.items.push(bullet[1]);
    } else if (numerada) {
      cerrarParrafo();
      if (!listaActual || listaActual.tipo !== 'ol') { cerrarLista(); listaActual = { tipo: 'ol', items: [] }; }
      listaActual.items.push(numerada[1]);
    } else {
      cerrarLista();
      parrafoActual.push(l);
    }
  }
  cerrarParrafo();
  cerrarLista();

  return bloques.map((bloque, idx) => {
    if (bloque.tipo === 'p') {
      return (
        <p key={idx} style={{ margin: idx === 0 ? '0' : '0.6rem 0 0 0' }}>
          {renderInlineMarkdown(bloque.texto, idx)}
        </p>
      );
    }
    const Tag = bloque.tipo;
    return (
      <Tag key={idx} style={{ margin: '0.4rem 0', paddingLeft: '1.2rem' }}>
        {bloque.items.map((item, i) => (
          <li key={i} style={{ marginBottom: '0.25rem' }}>{renderInlineMarkdown(item, `${idx}-${i}`)}</li>
        ))}
      </Tag>
    );
  });
}

export default function AICopilot() {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const defaultMessages = [
    { role: 'assistant', content: '¡Hola! Soy tu Copiloto Analítico. Estoy conectado en vivo a la base de datos de NODUS. Puedes preguntarme sobre enrolamientos, asistencias, coordinadores o facturación.' }
  ];
  
  const [messages, setMessages] = useState(defaultMessages);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  
  const messagesEndRef = useRef(null);

  const colors = {
    primary: '#1e3a8a',
    secondary: '#d97706',
    bg: '#ffffff',
    bgAlt: '#f8fafc',
    text: '#0f172a',
    border: '#e2e8f0',
    botMsg: '#f1f5f9',
    userMsg: '#1e3a8a'
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!showHistory) {
      scrollToBottom();
    }
  }, [messages, showHistory]);

  // El contexto de Nodus ya NO se carga aquí: lo arma el backend (Cloudflare
  // Worker) del lado del servidor, filtrado según el rol/sede real del
  // usuario (antes este componente pedía TODAS las secciones de Nodus sin
  // filtrar por rol, lo cual no respetaba la Matriz de Permisos documentada).

  // Cargar Historial de Chats
  useEffect(() => {
    if (isOpen && currentUser) {
      loadSessions();
    }
  }, [isOpen, currentUser]);

  const loadSessions = async () => {
    if (!currentUser) return;
    try {
      const db = getFirestore();
      const q = query(collection(db, 'users', currentUser.uid, 'copilot_chats'), orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const loadedSessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(loadedSessions);
    } catch (error) {
      console.error("Error cargando historial de chats:", error);
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages(defaultMessages);
    setShowHistory(false);
  };

  const loadSession = (session) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages || defaultMessages);
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

      // LLM Request — vía backend cerrado (Cloudflare Worker).
      // El system prompt, el filtrado de Nodus por rol/sede y la key de Groq
      // viven en el servidor (cloudflare-worker/src/index.js), nunca en el navegador.
      const workerUrl = import.meta.env.VITE_COPILOTO_WORKER_URL || 'https://so-ar-copiloto.crearpsl-cpsl.workers.dev';
      if (!workerUrl) {
        throw Object.assign(new Error('Falta VITE_COPILOTO_WORKER_URL'), { code: 'worker/not-configured' });
      }

      const mensajesParaBot = updatedMessages
        .filter(m => m.role !== 'system' && !m.content.includes('⚠️'))
        .map(m => ({ role: m.role, content: m.content }));

      const idToken = await getAuth().currentUser.getIdToken();
      const workerResponse = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ messages: mensajesParaBot })
      });
      const workerData = await workerResponse.json();
      if (!workerResponse.ok) {
        throw Object.assign(new Error(workerData.message || 'Error del backend'), { code: `worker/${workerData.error || 'unknown'}` });
      }

      const aiText = workerData.text || 'No pude generar una respuesta.';
      const finalMessages = [...updatedMessages, { role: 'assistant', content: aiText }];
      
      setMessages(finalMessages);

      // Save AI answer to Firestore
      if (activeSessionId && currentUser) {
        await updateDoc(doc(db, 'users', currentUser.uid, 'copilot_chats', activeSessionId), {
          messages: finalMessages,
          updatedAt: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error("Error AI:", error);
      let errorMsg = 'Hubo un error al conectar con el Copiloto. Intenta de nuevo en unos segundos.';
      // Códigos que puede devolver el Worker (ver cloudflare-worker/src/index.js)
      if (error.code === 'worker/not-configured') {
        errorMsg = '⚠️ El Copiloto todavía no está configurado (falta VITE_COPILOTO_WORKER_URL en .env).';
      } else if (error.code === 'worker/unauthenticated') {
        errorMsg = '⚠️ Tu sesión expiró. Vuelve a iniciar sesión e intenta de nuevo.';
      } else if (error.code === 'worker/permission-denied') {
        errorMsg = '⚠️ Tu usuario no está registrado correctamente en el sistema. Contacta a un administrador.';
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMsg
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
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
      position: 'fixed', top: 0, right: 0, width: '400px', height: '100vh', 
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
