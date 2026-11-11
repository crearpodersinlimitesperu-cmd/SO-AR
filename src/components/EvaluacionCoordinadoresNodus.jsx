import { useState, useMemo } from 'react';
import { 
  Award, ShieldCheck, AlertTriangle, CheckCircle2, 
  Clock, MapPin, DollarSign, Copy, Check, ChevronDown, 
  ExternalLink, FileSpreadsheet, Sparkles
} from 'lucide-react';
import { 
  NODUS_TRIMESTRAL_METRICS, 
  NODUS_AUTONOMOUS_TRIGGERS, 
  NODUS_EVALUATION_LEVELS, 
  calculateCoordinatorScore 
} from '../services/nodusKpiDirectory';
import { USERS_TO_IMPORT } from '../data/usersToImport';

// Datos oficiales de ejemplo para auditoría trimestral (Agosto - Octubre 2026) según Documento Nodus
const DEFAULT_AUDIT_DATA = {
  coordinatorName: 'Coordinador General de Operaciones',
  coordinatorId: 'NDS-2026-COORD-08',
  periodo: 'Agosto – Octubre 2026',
  sede: 'Lima',
  evaluator: 'Dirección General de Operaciones',
  evaluationDate: 'Noviembre 2026',
  metrics: {
    'KPI-C1-001': 96.4,
    'KPI-C1-002': 92.1,
    'KPI-C1-003': 53.5,
    'KPI-C2-001': 95.8,
    'KPI-C2-002': 91.2,
    'KPI-C2-003': 1.8,
    'KPI-C2-004': 94.2,
    'KPI-MJ-001': 91.5,
    'KPI-MJ-002': 92.0,
    'PRO-MJ-003': 100.0,
  },
  triggers: {
    'TRG-ADM-001': 'APROBADO',
    'TRG-MJ-002': 'APROBADO',
    'TRG-C2-003': 'APROBADO',
    'TRG-OPS-004': 'APROBADO'
  },
  triggerObservations: {
    'TRG-ADM-001': 'Conciliaciones al 100% sin observaciones contables antes del Lunes 12:00 PM.',
    'TRG-MJ-002': 'Todos los expedientes de Futuros Imposibles validados en tiempo y forma antes de Miércoles 19:00 hrs.',
    'TRG-C2-003': 'Registro de 1.8% al corte de Viernes 14:01 hrs, dentro del rango óptimo (< 2.0%).',
    'TRG-OPS-004': 'Coordenadas en venue Huachipa registradas a < 50m.'
  },
  improvementActions: [
    'Mentores de Apoyo: Mantener la efectividad de los managers en MJ por encima del 95% para el próximo trimestre.',
    'Optimización de Salón: Continuar con la eficiencia operativa en los salones de C2 respetando la estructura presupuestaria de S/ 29,000.',
    'Documentación Adjunta: Archivo de auditoría generado y custodiado en Nodus Vault.'
  ]
};

export default function EvaluacionCoordinadoresNodus({ globalFilterSede }) {
  const [selectedCoordinatorEmail, setSelectedCoordinatorEmail] = useState('');
  const [metricValues, setMetricValues] = useState(DEFAULT_AUDIT_DATA.metrics);
  const [triggerStatus, setTriggerStatus] = useState(DEFAULT_AUDIT_DATA.triggers);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState('rubrica'); // 'rubrica' | 'triggers' | 'prompt_ia' | 'calificacion'

  // Lista de coordinadores disponibles en directorio
  const coordinatorsList = useMemo(() => {
    return USERS_TO_IMPORT.filter(u => {
      const r = (u.role || '').toLowerCase();
      const s = (u.sede || '').toLowerCase();
      const matchesSede = !globalFilterSede || globalFilterSede === 'Todas' || s.includes(globalFilterSede.toLowerCase());
      return matchesSede && (r.includes('coord') || r.includes('gerente') || r.includes('maestr') || r.includes('c1'));
    });
  }, [globalFilterSede]);

  // Cálculo en tiempo real del puntaje y nivel de desempeño
  const scoreResult = useMemo(() => {
    return calculateCoordinatorScore(metricValues, triggerStatus);
  }, [metricValues, triggerStatus]);

  const handleMetricChange = (code, val) => {
    setMetricValues(prev => ({
      ...prev,
      [code]: val === '' ? '' : parseFloat(val) || 0
    }));
  };

  const handleTriggerChange = (trgId, status) => {
    setTriggerStatus(prev => ({
      ...prev,
      [trgId]: status
    }));
  };

  const promptMaestroText = `[ROL Y CONTEXTO]
Actúa como el Auditor Principal de Operaciones y Rendimiento de Nodus. Tu objetivo es realizar una evaluación cuantitativa y cualitativa rigurosa del desempeño de los Coordinadores durante el trimestre Agosto - Octubre 2026, validando el cumplimiento estricto de los estándares de excelencia, conversión, asistencia, rigor operativo e impecabilidad contable.

[ENTRADAS DE DATOS]
1. Datos de Asistencia y Retención (Capítulo Uno, Capítulo Dos y Maestría del Juego).
2. Reportes de Conversión de Módulo (C1 -> C2 y C2 -> MJ).
3. Logs del Sistema de Impecabilidad y Registro de Palabras Rotas.
4. Logs de Auditoría Operativa con marcas de tiempo (Geofencing y Deadlines innegociables).
5. Estados de Cierre Financiero e Inventarios por Módulo.

[REGLAS DE AUDITORÍA Y VALORACIÓN]
- Asistencia y Retención C1: Verificar meta mínima de 95% en Apertura C1 y >90% en Retención global C1.
- Conversión C1 -> C2: Evaluar Meta Base = 50%, Meta Reto > 52%.
- Asistencia y Breakthrough C2: Validar Asistencia C2 del 95% y Tasa de Breakthrough >= 90%.
- Palabras Rotas C2: Confirmar que la tasa sea < 5%. Ejecutar trigger estricto al Viernes 14:01 hrs.
- Conversión C2 -> MJ: Evaluar Meta Base = 70%, Meta Reto > 93%.
- Maestría del Juego (MJ): Retención en MJ >= 90%, Efectividad de Managers >= 90% y auditoría de Futuros Imposibles finalizada antes del Miércoles 19:00 hrs.
- Operaciones y Geofencing: Validar check-in en venue (coordenadas a < 50m).
- Impecabilidad Contable: Cierre contable y conciliación de pagos ejecutado sin excepción antes del Lunes 12:00 PM.

[ESTRUCTURA DE SALIDA REQUERIDA]
1. Resumen Ejecutivo del Coordinador Evaluado.
2. Matriz de Cumplimiento de KPIs (Valor Real vs. Meta Base vs. Meta Reto).
3. Estatus de Triggers Autónomos y Auditoría de Deadlines.
4. Calificación Final (Ciclo de Oro / Reto Alcanzado / Base Cumplida / Plan de Acción).
5. Plan de Mejora Concreto e Inmediato (máximo 3 acciones operativas).`;

  const copyPromptToClipboard = () => {
    navigator.clipboard.writeText(promptMaestroText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* BANNER PRINCIPAL CON DOBLE LOGO Y TITULAR OFICIAL */}
      <div 
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 183, 3, 0.35)',
          padding: '1.75rem',
          boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #ffb703, #fb8500, #ef4444)' }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <span style={{ 
                background: 'rgba(255, 183, 3, 0.15)', 
                color: 'var(--crear-gold, #ffb703)', 
                border: '1px solid rgba(255, 183, 3, 0.4)', 
                fontSize: '0.72rem', 
                fontWeight: 800, 
                padding: '0.2rem 0.6rem', 
                borderRadius: '6px',
                letterSpacing: '0.05em'
              }}>
                RÚBRICA OFICIAL NODUS · AGOSTO – OCTUBRE 2026
              </span>
              <span style={{ 
                background: 'rgba(56, 189, 248, 0.15)', 
                color: '#38bdf8', 
                border: '1px solid rgba(56, 189, 248, 0.3)', 
                fontSize: '0.72rem', 
                fontWeight: 700, 
                padding: '0.2rem 0.6rem', 
                borderRadius: '6px' 
              }}>
                🏛️ IMPECABILIDAD CONTABLE & AUDITORÍA
              </span>
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#ffffff', margin: '0 0 0.35rem 0' }}>
              Evaluación Integral de Coordinadores en Nodus
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', maxWidth: '750px', lineHeight: 1.5 }}>
              Auditoría Cuantitativa y Cualitativa Trimestral. Rúbrica de 10 Métricas Relacionales, Triggers de Seguridad Operativa, Presupuesto Base de Salón (S/ 29,000) y Calificación del Ciclo de Oro.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={copyPromptToClipboard}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: copiedPrompt ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 183, 3, 0.12)',
                color: copiedPrompt ? '#4ade80' : 'var(--crear-gold, #ffb703)',
                border: `1px solid ${copiedPrompt ? '#22c55e' : 'rgba(255, 183, 3, 0.4)'}`,
                padding: '0.5rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {copiedPrompt ? <Check size={16} /> : <Sparkles size={16} />}
              {copiedPrompt ? '¡Prompt IA Copiado!' : 'Copiar Prompt Nodus IA'}
            </button>
          </div>
        </div>

        {/* SELECTOR DE COORDINADOR Y PARÁMETROS */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>👤 Coordinador:</span>
            <select
              value={selectedCoordinatorEmail}
              onChange={(e) => {
                const email = e.target.value;
                setSelectedCoordinatorEmail(email);
              }}
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255, 183, 3, 0.4)',
                color: '#ffffff',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <option value="">Coordinador General de Operaciones (Muestra Auditada)</option>
              {coordinatorsList.map(c => (
                <option key={c.email} value={c.email}>
                  {c.name} · {c.role} ({c.sede || 'Global'})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.04)', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <DollarSign size={14} style={{ color: '#ffb703' }} />
            <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
              Presupuesto Base Salón C2 (Lima): <strong>S/ 29,000</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.04)', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Clock size={14} style={{ color: '#38bdf8' }} />
            <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
              Trimestre: <strong>Agosto – Octubre 2026</strong>
            </span>
          </div>
        </div>
      </div>

      {/* DICTAMEN DE NIVEL DE DESEMPEÑO DEL COORDINADOR */}
      <div 
        style={{
          background: scoreResult.levelInfo.bg,
          border: `1px solid ${scoreResult.levelInfo.border}`,
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            background: 'rgba(0,0,0,0.3)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: scoreResult.levelInfo.color
          }}>
            <Award size={28} />
          </div>
          <div>
            <span style={{ 
              fontSize: '0.72rem', 
              fontWeight: 900, 
              color: scoreResult.levelInfo.color, 
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}>
              DICTAMEN DE EVALUACIÓN OFICIAL
            </span>
            <h3 style={{ margin: '0.15rem 0', fontSize: '1.25rem', fontWeight: 900, color: '#ffffff' }}>
              {scoreResult.levelInfo.badge}
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1', maxWidth: '680px' }}>
              {scoreResult.levelInfo.criteria}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.25)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Metas Base</span>
            <strong style={{ fontSize: '1.1rem', color: scoreResult.basePassedCount === scoreResult.totalMetrics ? '#4ade80' : '#f87171' }}>
              {scoreResult.basePassedCount}/{scoreResult.totalMetrics}
            </strong>
          </div>
          <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.25)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Metas Reto</span>
            <strong style={{ fontSize: '1.1rem', color: '#ffb703' }}>
              {scoreResult.retoPassedCount}/{scoreResult.totalMetrics}
            </strong>
          </div>
        </div>
      </div>

      {/* PESTAÑAS DE VISTA: RÚBRICA Y KPIS / TRIGGERS / ESCALA DE NIVELES / PROMPT IA */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('rubrica')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'rubrica' ? 'var(--crear-gold, #ffb703)' : 'transparent',
            color: activeTab === 'rubrica' ? '#000000' : 'var(--text-muted, #94a3b8)',
            border: 'none'
          }}
        >
          📊 Matriz de 10 KPIs y Métricas
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('triggers')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'triggers' ? 'var(--crear-gold, #ffb703)' : 'transparent',
            color: activeTab === 'triggers' ? '#000000' : 'var(--text-muted, #94a3b8)',
            border: 'none'
          }}
        >
          ⚡ Triggers Autónomos & Geofencing
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('niveles')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'niveles' ? 'var(--crear-gold, #ffb703)' : 'transparent',
            color: activeTab === 'niveles' ? '#000000' : 'var(--text-muted, #94a3b8)',
            border: 'none'
          }}
        >
          🏆 Niveles Operativos (Ciclo de Oro)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('prompt_ia')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'prompt_ia' ? 'var(--crear-gold, #ffb703)' : 'transparent',
            color: activeTab === 'prompt_ia' ? '#000000' : 'var(--text-muted, #94a3b8)',
            border: 'none'
          }}
        >
          🤖 Prompt Maestro Nodus IA
        </button>
      </div>

      {/* CONTENIDO TAB 1: MATRIZ DE KPIS */}
      {activeTab === 'rubrica' && (
        <div 
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.08)',
            overflow: 'hidden'
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.4)', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Módulo</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Código</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Nombre del KPI</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Fórmula Oficial</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Meta Base</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Meta Reto</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Ponderación</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Resultado Real</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Estado Auditado</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Deadline Innegociable</th>
                </tr>
              </thead>
              <tbody>
                {scoreResult.evaluatedMetrics.map(m => {
                  return (
                    <tr 
                      key={m.code}
                      style={{ 
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: m.retoPassed ? 'rgba(255, 183, 3, 0.04)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#38bdf8' }}>
                        {m.module}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', color: '#ffb703', fontWeight: 700 }}>
                        {m.code}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#ffffff' }}>
                        {m.name}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.74rem' }}>
                        {m.formula}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#cbd5e1', fontWeight: 600 }}>
                        {m.isLowerBetter ? `< ${m.metaBase}%` : `${m.metaBase}%`}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#ffb703', fontWeight: 800 }}>
                        {m.isLowerBetter ? `< ${m.metaReto}%` : `> ${m.metaReto}%`}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                        {(m.weight * 100).toFixed(0)}%
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <input
                          type="number"
                          step="0.1"
                          value={m.val !== null ? m.val : ''}
                          onChange={(e) => handleMetricChange(m.code, e.target.value)}
                          style={{
                            width: '72px',
                            background: 'rgba(0,0,0,0.5)',
                            border: `1px solid ${m.retoPassed ? '#ffb703' : m.basePassed ? '#22c55e' : '#ef4444'}`,
                            color: '#ffffff',
                            padding: '0.25rem 0.4rem',
                            borderRadius: '4px',
                            textAlign: 'center',
                            fontSize: '0.82rem',
                            fontWeight: 700
                          }}
                        />
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span 
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: m.retoPassed ? 'rgba(255, 183, 3, 0.15)' : m.basePassed ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: m.retoPassed ? '#ffb703' : m.basePassed ? '#4ade80' : '#f87171',
                            border: `1px solid ${m.retoPassed ? 'rgba(255, 183, 3, 0.4)' : m.basePassed ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                          }}
                        >
                          {m.statusLabel}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1', fontSize: '0.75rem' }}>
                        {m.deadline}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENIDO TAB 2: TRIGGERS AUTÓNOMOS */}
      {activeTab === 'triggers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scoreResult.triggerResults.map(trg => {
            const isApproved = trg.status === 'APROBADO';
            return (
              <div 
                key={trg.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  borderRadius: '12px',
                  border: `1px solid ${isApproved ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.4)'}`,
                  padding: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', fontWeight: 700 }}>
                      {trg.id} · {trg.module}
                    </span>
                    <h4 style={{ margin: '0.2rem 0', fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
                      {trg.name}
                    </h4>
                  </div>

                  <select
                    value={trg.status}
                    onChange={(e) => handleTriggerChange(trg.id, e.target.value)}
                    style={{
                      background: isApproved ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: isApproved ? '#4ade80' : '#f87171',
                      border: `1px solid ${isApproved ? '#22c55e' : '#ef4444'}`,
                      borderRadius: '6px',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    <option value="APROBADO">✓ APROBADO</option>
                    <option value="ALERTA_ROJA">⚠️ ALERTA ROJA</option>
                    <option value="FALLIDO">❌ INCUMPLIDO</option>
                  </select>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                  <strong>Regla Operativa:</strong> {trg.rule}
                </div>

                <div style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={13} style={{ color: '#ffb703' }} />
                  <span>Corte / Deadline: <strong>{trg.dayTime}</strong></span>
                </div>

                <div style={{ fontSize: '0.74rem', color: '#f87171', marginTop: '0.4rem' }}>
                  <strong>Escalamiento por fallo:</strong> {trg.actionOnFail}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CONTENIDO TAB 3: NIVELES Y CICLO DE ORO */}
      {activeTab === 'niveles' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {NODUS_EVALUATION_LEVELS.map(lvl => (
              <div
                key={lvl.level}
                style={{
                  background: lvl.bg,
                  border: `1px solid ${lvl.border}`,
                  borderRadius: '12px',
                  padding: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                  <span style={{ 
                    background: lvl.color, 
                    color: '#000000', 
                    fontWeight: 900, 
                    fontSize: '0.7rem', 
                    padding: '0.15rem 0.5rem', 
                    borderRadius: '4px' 
                  }}>
                    NIVEL {lvl.level}
                  </span>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
                    {lvl.title}
                  </h4>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                  {lvl.criteria}
                </p>
              </div>
            ))}
          </div>

          {/* MATRIZ COMPARATIVA DE PONDERACIONES */}
          <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.92rem', fontWeight: 800, color: 'var(--crear-gold)' }}>
              Matriz Ponderada Oficial de Evaluación Global
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Conversión C2 → MJ</span>
                <strong style={{ fontSize: '1.1rem', color: '#ffb703' }}>30%</strong>
                <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Meta Reto: &gt; 93%</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Conversión C1 → C2</span>
                <strong style={{ fontSize: '1.1rem', color: '#ffb703' }}>25%</strong>
                <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Meta Reto: &gt; 52%</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Palabras Rotas C2</span>
                <strong style={{ fontSize: '1.1rem', color: '#4ade80' }}>15%</strong>
                <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Meta Reto: &lt; 2%</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Asistencia C1 / C2</span>
                <strong style={{ fontSize: '1.1rem', color: '#38bdf8' }}>15%</strong>
                <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Meta Reto: 98%</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Retención MJ / Mgrs</span>
                <strong style={{ fontSize: '1.1rem', color: '#a78bfa' }}>15%</strong>
                <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Meta Reto: 95%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO TAB 4: PROMPT MAESTRO NODUS IA */}
      {activeTab === 'prompt_ia' && (
        <div style={{ background: 'rgba(15, 23, 42, 0.9)', borderRadius: '12px', border: '1px solid rgba(255, 183, 3, 0.3)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--crear-gold)' }}>
                Prompt Maestro para Auditoría Autónoma de Coordinadores en Nodus IA
              </h4>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                Copia este prompt para alimentar el motor analítico de Nodus o LLMs en evaluaciones de fin de ciclo.
              </p>
            </div>
            <button
              type="button"
              onClick={copyPromptToClipboard}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: copiedPrompt ? '#22c55e' : 'var(--crear-gold)',
                color: '#000000',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {copiedPrompt ? <Check size={14} /> : <Copy size={14} />}
              {copiedPrompt ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <pre style={{
            background: 'rgba(0, 0, 0, 0.6)',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.78rem',
            color: '#cbd5e1',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.5,
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            {promptMaestroText}
          </pre>
        </div>
      )}

      {/* ACCIONES DE MEJORA Y DICTAMEN DE CONFORMIDAD */}
      <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>
          📌 Plan de Consolidación y Mejora Inmediata
        </h4>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.6 }}>
          {DEFAULT_AUDIT_DATA.improvementActions.map((act, i) => (
            <li key={i}>{act}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
