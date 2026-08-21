import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Loader2 } from 'lucide-react';
import { askGroq } from '../services/groqService';
import { useAuth } from '../context/AuthContext';
import { useChecklist } from '../context/ChecklistContext';
import { usersData } from '../data/usersData';

export default function AIAssistant() {
  const { currentUser } = useAuth();
  const { tasks, addCustomTask } = useChecklist();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '¡Hola! Soy tu asistente de IA del Sistema Operativo SO-AR. ¿En qué te puedo ayudar hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const pendingTasks = tasks ? tasks.filter(t => !t.completed).map(t => `- ${t.title || t.task} (Fase: ${t.cyclePhase || 'Global'}, Prioridad: ${t.priority || 'Normal'})`).join('\n') : 'Ninguna';
      
      const contextPrompt = `Contexto Operativo del Usuario:
- Nombre: ${currentUser?.name || 'Desconocido'}
- Rol: ${currentUser?.appRole || 'Ninguno'}
- Sede: ${currentUser?.sede || 'Global'}

El usuario te dirá algo. Tienes dos modos de operación:
MODO 1 (Conversacional): Si el usuario hace una pregunta, resúmenes o dudas, respóndele normalmente de forma breve y profesional.
MODO 2 (Acción): Si el usuario te pide EXPLÍCITAMENTE asignar, delegar o crear una tarea para alguien (ej. "Asigna a Fernando y a Lourdes la tarea X", "Crea la tarea Y para mí"), DEBES incluir obligatoriamente en tu respuesta un bloque de código JSON con este formato exacto:
\`\`\`json
{
  "action": "CREATE_TASK",
  "task": "Nombre de la tarea",
  "assigneesNames": ["Fernando", "Lourdes"],
  "priority": "🔴 ROJO" // o 🟡 AMARILLO o 🟢 VERDE
}
\`\`\`
Puedes agregar texto antes o después del JSON confirmando la acción. Trata de extraer los nombres de pila o apellidos a asignar. Si es el mismo usuario, pon "yo".

El usuario dice: ${userMessage.content}`;

      const response = await askGroq(contextPrompt);
      
      // Parsear posible JSON oculto en la respuesta
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const actionData = JSON.parse(jsonMatch[1]);
          if (actionData.action === "CREATE_TASK") {
             // Buscar correos de los asignados
             let emails = [];
             let assignedSede = currentUser?.sede || 'Global';
             
             // Compatibilidad con la versión anterior si la IA devuelve string o array
             const namesToProcess = actionData.assigneesNames || (actionData.assigneeName ? [actionData.assigneeName] : []);
             
             namesToProcess.forEach(name => {
                 const targetName = name.toLowerCase();
                 if (targetName && targetName !== 'yo' && targetName !== 'mi') {
                    const foundUser = usersData.find(u => u.name.toLowerCase().includes(targetName) || u.email.toLowerCase().includes(targetName));
                    if (foundUser) {
                       emails.push(foundUser.email);
                    }
                 } else {
                    emails.push(currentUser?.email);
                 }
             });

             // Remover duplicados si los hay
             emails = [...new Set(emails.filter(Boolean))];
             
             // Si no hay asignado, por defecto va al creador
             if (emails.length === 0) emails.push(currentUser?.email);
             
             // Ejecutar la creación
             const success = await addCustomTask({
                task: actionData.task,
                title: actionData.task,
                assignedToEmails: emails, // Usamos el nuevo formato array
                assignedToEmail: emails[0], // Guardamos el primero como fallback legacy por seguridad
                assignedSede: assignedSede,
                priority: actionData.priority || '🟡 AMARILLO',
                role: 'coordinador_c1c2',
                cyclePhase: 'Global'
             });

             if (success) {
                // Modificar la respuesta de la IA para quitar el bloque JSON bruto
                const cleanResponse = response.replace(/```json\n[\s\S]*?\n```/, '').trim();
                const finalMessage = cleanResponse + `\n\n✅ **ACCIÓN AUTOMÁTICA**: Tarea "${actionData.task}" asignada a ${emails.join(', ')}.`;
                setMessages(prev => [...prev, { role: 'assistant', content: finalMessage }]);
                return;
             }
          }
        } catch(e) {
           console.error("Error parseando acción del bot:", e);
        }
      }

      // Si no hubo acción o falló, mostrar respuesta normal
      setMessages(prev => [...prev, { role: 'assistant', content: response.replace(/```json\n[\s\S]*?\n```/, '') }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, hubo un error de conexión con mi sistema. Inténtalo más tarde.' }]);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-[#d4af37] text-white p-4 rounded-full shadow-lg hover:bg-yellow-600 transition-colors z-40"
        style={{ display: isOpen ? 'none' : 'flex' }}
      >
        <Bot size={28} />
      </button>

      {/* Panel del Chat */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 h-[32rem] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bot className="text-[#d4af37]" />
              <h3 className="text-[#d4af37] font-bold">Asistente SO-AR</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl p-3 text-sm ${msg.role === 'user' ? 'bg-[#d4af37] text-gray-900 rounded-tr-none' : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 text-gray-400 rounded-xl rounded-tl-none p-3 border border-gray-700">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 border-t border-gray-700 bg-gray-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu mensaje..."
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37]"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-[#d4af37] text-gray-900 p-2 rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
