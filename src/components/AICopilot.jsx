import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, BrainCircuit, Loader2, Database, MessageSquarePlus, History, ChevronLeft, MessageCircle } from 'lucide-react';
import { doc, getDoc, getDocs, getFirestore, collection, addDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { notebookKnowledge } from '../assets/notebookKnowledge';

export default function AICopilot() {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [nodusContext, setNodusContext] = useState('');
  
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

  // Cargar Contexto de Nodus
  useEffect(() => {
    if (isOpen && !nodusContext) {
      async function fetchNodusContext() {
        try {
          const db = getFirestore();
          const docRef = doc(db, 'nodus_kpis_sincronizados', 'latest_snapshot');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            let contextStr = `CONTEXTO DE BASE DE DATOS (NODUS REAL): Fecha: ${data.timestamp}. \n`;
            
            // Enviar TODOS los KPIs de TODOS los coordinadores y secciones sin truncar
            if(data.secciones) {
               contextStr += "DATOS COMPLETOS DE NODUS (Coordinadores, Entrenadores, KPIs): \n";
               contextStr += JSON.stringify(data.secciones);
            }
            setNodusContext(contextStr);
          }
        } catch (error) {
          console.error("Error cargando contexto para IA:", error);
        }
      }
      fetchNodusContext();
    }
  }, [isOpen, nodusContext]);

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

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // Sin fallback hardcodeado: la key expuesta fue rotada, ver .env.

    if (!apiKey) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '⚠️ Falta configurar la variable de entorno VITE_GEMINI_API_KEY en tu archivo .env.' 
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

      // LLM Request
      const systemPrompt = `Eres el Analista Experto de la PMO de CREAR PODER SIN LIMITES. Responde de forma ultra-profesional y al grano. 
REGLA ABSOLUTA: NO INVENTAR CIFRAS, RESULTADOS, NI DATOS BAJO NINGUNA CIRCUNSTANCIA.
Si te preguntan por un KPI o un dato y no está explícitamente en el contexto proveído abajo, DEBES decir "No tengo esa información en este momento".

Usa ESTA INFORMACIÓN REAL de la base de datos NODUS para responder (Si te preguntan por datos, búscalos AQUÍ):
${nodusContext}

---
BASE DE CONOCIMIENTO (NOTEBOOKLM):
Usa esta base de conocimiento para responder a preguntas sobre procedimientos, reglas, operaciones, manuales y cultura de la organización:
${notebookKnowledge}`;

      // Preparamos los mensajes para Gemini (role: 'user' y 'model')
      const geminiMessages = updatedMessages
        .filter(m => m.role !== 'system' && !m.content.includes('⚠️'))
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

      // gemini-1.5-flash fue retirado por Google (shutdown 29/09/2025) → causaba el error
      // "Hubo un error al conectar con la IA" para todo usuario que usara el Copiloto.
      // Se usa el alias oficial "gemini-flash-latest" para no volver a romperse con
      // futuros retiros de versión (Google lo actualiza automáticamente de su lado).
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          system_instruction: {
            parts: { text: systemPrompt }
          },
          contents: geminiMessages
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude generar una respuesta.';
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
      let errorMsg = 'Hubo un error al conectar con la IA. Verifica tu conexión o tu API Key.';
      if (error.message && (error.message.includes('API key not valid') || error.message.includes('PERMISSION_DENIED'))) {
        errorMsg = '⚠️ Error de Autenticación: La API Key de Gemini es inválida o no tiene permisos. Por favor, asegúrate de configurar una VITE_GEMINI_API_KEY válida (de Google AI Studio) en tu archivo .env y reiniciar el servidor.';
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
                  {msg.content}
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
