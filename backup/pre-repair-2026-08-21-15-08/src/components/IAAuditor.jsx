import React, { useState } from 'react';
import { Bot, RefreshCw } from 'lucide-react';
import { askGroq } from '../services/groqService';
import { useChecklist } from '../context/ChecklistContext';
import { useAuth } from '../context/AuthContext';

export default function IAAuditor() {
  const { tasks } = useChecklist();
  const { currentUser } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const pendingTasks = tasks.filter(t => !t.completed);
      const criticalTasks = pendingTasks.filter(t => t.isCritical || t.priority === '🔴 ROJO');
      
      const prompt = `Eres el Auditor Operativo IA de CREAR PODER SIN LÍMITES. 
Analiza este resumen de la operación actual y genera un reporte de máximo 3 párrafos, directo al punto:
- Sede del solicitante: ${currentUser?.sede || 'Global'}
- Tareas Críticas Atrasadas: ${criticalTasks.length}
- Tareas Totales Pendientes: ${pendingTasks.length}

Detalles de tareas críticas (muestra hasta 5):
${criticalTasks.slice(0, 5).map(t => '- ' + (t.title || t.task) + ' (Responsable: ' + t.role + ')').join('\n')}

Por favor, da 2 recomendaciones clave para destrabar la operación.`;

      const response = await askGroq(prompt, "Eres el Auditor IA de CREAR PODER SIN LÍMITES. Eres analítico, directo y muy perspicaz.");
      setReport(response);
    } catch (error) {
      setReport("Error al generar el reporte de auditoría: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid rgba(212, 175, 55, 0.4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: 'var(--crear-gold)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bot size={20} /> Auditoría Operativa con IA
        </h3>
        <button 
          onClick={generateReport} 
          disabled={loading || !tasks || tasks.length === 0}
          className="btn-gold" 
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          {loading ? <RefreshCw size={14} className="spin" /> : <Bot size={14} />} 
          {loading ? 'Analizando...' : 'Generar Reporte IA'}
        </button>
      </div>

      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', minHeight: '100px', fontSize: '0.9rem', color: 'var(--text-main)', border: '1px solid rgba(255,255,255,0.05)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px', color: 'var(--crear-cyan)' }}>
            <span className="pulse">Procesando datos operativos...</span>
          </div>
        ) : report ? (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
            {report}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '1.5rem' }}>
            Haz clic en "Generar Reporte IA" para analizar el estado de las tareas.
          </div>
        )}
      </div>
    </div>
  );
}
