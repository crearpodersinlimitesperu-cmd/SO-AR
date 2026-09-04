import React, { useState } from 'react';
import { X, Clock, Shirt, Sparkles, CheckCircle2, ShieldCheck, Calendar, Info, Briefcase, Building, UserCheck } from 'lucide-react';

export default function HorariosEntrenamientoModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('todos_equipo'); // 'todos_equipo' | 'oficina' | 'gerentes' | 'coordinadores' | 'sala_c1' | 'sala_c2' | 'sala_mj'

  if (!isOpen) return null;

  return (
    <div 
      className="modal-backdrop" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div 
        className="glass-panel" 
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'var(--bg-card, #0f172a)',
          borderRadius: '16px',
          border: '1px solid rgba(41, 171, 226, 0.3)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(41, 171, 226, 0.15)',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.4rem',
          color: 'var(--text-main, #f8fafc)'
        }}
      >
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
              <Clock size={28} color="var(--crear-cyan, #29abe2)" />
              <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-heading, #fff)', letterSpacing: '-0.5px' }}>
                Horarios y Turnos Operativos del Equipo
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted, #94a3b8)' }}>
              Protocolo de jornadas, turnos, atención y fisionomía para <strong>Equipo de Oficina, Gerentes de Sede y Coordinadores</strong> — <strong>CREAR PODER SIN LÍMITES</strong>.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="btn-icon"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted, #94a3b8)',
              transition: 'all 0.2s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* TABS DE FILTRO */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'todos_equipo', label: '👥 Resumen de Todo el Equipo' },
            { id: 'oficina', label: '🏢 Equipo de Oficina (Soporte)' },
            { id: 'gerentes', label: '👔 Gerentes de Sede (Nivel 8)' },
            { id: 'coordinadores', label: '🎯 Coordinadores (CC1Y2 & CMJ)' },
            { id: 'pulsos_reportes', label: '⚡ Pulsos & Reportes Post-FDS (Nodus & Causa OS)' },
            { id: 'sala_c1', label: '🟣 Sala C1' },
            { id: 'sala_c2', label: '🔵 Sala C2' },
            { id: 'sala_mj', label: '🟡 Sala Maestría' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: activeTab === tab.id ? '1px solid var(--crear-cyan, #29abe2)' : '1px solid rgba(255,255,255,0.1)',
                background: activeTab === tab.id ? 'rgba(41, 171, 226, 0.15)' : 'rgba(255,255,255,0.03)',
                color: activeTab === tab.id ? 'var(--crear-cyan, #29abe2)' : 'var(--text-muted, #94a3b8)'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENEDOR DE SECCIONES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>

          {/* SECCIÓN ESPECIAL: SISTEMA DE PULSOS Y REPORTES POST-FDS */}
          {(activeTab === 'todos_equipo' || activeTab === 'pulsos_reportes') && (
            <div 
              className="glass-panel" 
              style={{ 
                padding: '1.4rem', 
                borderTop: '4px solid #ec4899', 
                borderRadius: '12px',
                background: 'rgba(236, 72, 153, 0.05)',
                gridColumn: activeTab === 'pulsos_reportes' ? '1 / -1' : 'span 1'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ color: '#f472b6', margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={20} /> Sistema de Pulsos & Reportes Post-FDS (Baja Fricción)
                </h3>
                <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', fontWeight: 800 }}>
                  CPSL 2026 • Cero Pereza
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                
                {/* REPORTE RELÁMPAGO GERENTE */}
                <div style={{ background: 'rgba(0,0,0,0.35)', padding: '1rem', borderRadius: '10px', borderLeft: '3px solid #fbbf24' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.85rem' }}>👔 GERENTES DE SEDE</span>
                    <span style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: 'bold' }}>&lt; 3 minutos</span>
                  </div>
                  <h4 style={{ color: '#fff', margin: '0 0 0.5rem 0', fontSize: '0.98rem' }}>Reporte Relámpago Post-FDS</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    <li><strong>Habilitación:</strong> Domingo 21:00 PM (cierre de salón).</li>
                    <li><strong style={{ color: '#ef4444' }}>Deadline Innegociable:</strong> Lunes 12:00 PM (Mediodía).</li>
                    <li><strong>5 Puntos:</strong> Entrenador (1-5), Logística (1-5), Staff (1-5), Retención Real (TRO %) y Quiebres Críticos.</li>
                    <li><strong style={{ color: '#fbbf24' }}>Candado Nodus:</strong> Prerrequisito para liberar flujo contable del siguiente FDS.</li>
                  </ul>
                </div>

                {/* MICRO-PULSOS STAFF */}
                <div style={{ background: 'rgba(0,0,0,0.35)', padding: '1rem', borderRadius: '10px', borderLeft: '3px solid #38bdf8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.85rem' }}>👥 STAFF & VOLUNTARIOS</span>
                    <span style={{ color: '#38bdf8', fontSize: '0.75rem', fontWeight: 'bold' }}>&lt; 30 segundos</span>
                  </div>
                  <h4 style={{ color: '#fff', margin: '0 0 0.5rem 0', fontSize: '0.98rem' }}>Micro-Pulsos Aleatorios (3 Preguntas)</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    <li><strong>Disparador:</strong> Lunes 11:00 AM (mente fría post-descanso).</li>
                    <li><strong style={{ color: '#ef4444' }}>Ventana Activa:</strong> Hasta Martes 18:00 PM (31h, cero prórroga).</li>
                    <li><strong>3 Bloques Rotativos:</strong> 1 pregunta de Seguridad Psicológica, 1 de Liderazgo (Oxygen) y 1 de Fricción (Humanocracy).</li>
                    <li><strong>Trim & Stack:</strong> Campo «Qué detener (Stop)» para eliminar burocracia.</li>
                  </ul>
                </div>

              </div>

              {/* DASHBOARD EVOLUCIÓN */}
              <div style={{ background: 'rgba(236,72,153,0.08)', border: '1px dashed rgba(236,72,153,0.3)', borderRadius: '8px', padding: '0.8rem', fontSize: '0.82rem', color: 'var(--text-main)' }}>
                <strong style={{ color: '#f472b6' }}>📊 Dashboard de Evolución Organizacional en Causa OS:</strong>
                <span style={{ color: 'var(--text-muted)' }}> Alertas automáticas si la Seguridad Psicológica cae por debajo del 85%, cálculo del Rider de Calidad del Entrenador ponderado con Retención (TRO), y optimización continua de procesos en sala.</span>
              </div>
            </div>
          )}

          
          {/* SECCIÓN 1: EQUIPO DE OFICINA */}
          {(activeTab === 'todos_equipo' || activeTab === 'oficina') && (
            <div 
              className="glass-panel" 
              style={{ 
                padding: '1.25rem', 
                borderTop: '4px solid #0ea5e9', 
                borderRadius: '12px',
                background: 'rgba(14, 165, 233, 0.04)' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <h3 style={{ color: '#38bdf8', margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Building size={18} /> Equipo de Oficina
                </h3>
                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8', fontWeight: 'bold' }}>
                  Soporte Back-Office
                </span>
              </div>
              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                    <th style={{ padding: '0.4rem 0' }}>DÍA</th>
                    <th style={{ padding: '0.4rem 0' }}>TURNO / ACTIVIDAD</th>
                    <th style={{ padding: '0.4rem 0', textAlign: 'right' }}>HORARIO</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Lunes a Jueves</td>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Atención, cobranzas, facturación y soporte</td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right', color: 'var(--crear-cyan)', fontWeight: 'bold' }}>09:00 - 18:00</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Jueves</td>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Llegada de oficina, terminales Nodus y caja</td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>15:00 - 20:00</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(14, 165, 233, 0.08)' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Viernes</td>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>
                      Apertura mesas registro (07:45 Llegada)<br/>
                      Reporte nocturno de caja y asistencia
                    </td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right', color: '#38bdf8', fontWeight: 'bold' }}>07:45 - 23:30</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Sábado</td>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Entrega Ticket Naranja y soporte sala</td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>08:00 - 22:30</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Domingo</td>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>
                      Mesas de enrolamiento C2<br/>
                      <strong style={{ color: '#ef4444' }}>Cierre Contable POS (21:00)</strong>
                    </td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right', color: '#ef4444', fontWeight: 'bold' }}>08:00 - 22:00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* SECCIÓN 2: GERENTES DE SEDE */}
          {(activeTab === 'todos_equipo' || activeTab === 'gerentes') && (
            <div 
              className="glass-panel" 
              style={{ 
                padding: '1.25rem', 
                borderTop: '4px solid #f59e0b', 
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.04)' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <h3 style={{ color: '#fbbf24', margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={18} /> Gerentes de Sede
                </h3>
                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontWeight: 'bold' }}>
                  Nivel 8 (Gobernanza)
                </span>
              </div>
              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                    <th style={{ padding: '0.4rem 0' }}>DÍA</th>
                    <th style={{ padding: '0.4rem 0' }}>SUPERVISIÓN / DEADLINE</th>
                    <th style={{ padding: '0.4rem 0', textAlign: 'right' }}>HORARIO</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(239, 68, 68, 0.05)' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold', color: '#fbbf24' }}>Lunes</td>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>
                      <strong style={{ color: '#ef4444' }}>DEADLINE REPORTE RELÁMPAGO (12:00 PM):</strong><br/>
                      Cierre de Caja FDS en Nodus + Reporte de 5 Puntos.<br/>
                      <span style={{ color: '#f87171', fontSize: '0.75rem' }}>🔒 Prerrequisito para liberación presupuestaria del siguiente FDS.</span>
                    </td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right', color: '#ef4444', fontWeight: 'bold' }}>Hasta 12:00 PM (Innegociable)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Martes</td>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Auditoría salones, hotel y honorarios coach</td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>09:00 - 13:00</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Miércoles</td>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>
                      <strong style={{ color: '#ef4444' }}>Deadline Alerta Deserción:</strong> validación de carga de FI en Nodus
                    </td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right', color: '#ef4444', fontWeight: 'bold' }}>Hasta 19:00 PM</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Jueves</td>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Supervisión de montaje (techo mín 4.5m y audio)</td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>14:30 - 20:30</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Viernes a Domingo</td>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>
                      Viernes 14:01 Trigger Palabra Rota C2.<br/>
                      Domingo liderazgo de mesas de enrolamiento.<br/>
                      <strong style={{ color: '#38bdf8' }}>Domingo 21:00 PM: Habilitación Reporte Relámpago Post-FDS en Nodus</strong> (Cierre de puertas y POS).
                    </td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right', color: 'var(--crear-cyan)', fontWeight: 'bold' }}>08:00 - 21:00+</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* SECCIÓN 3: COORDINADORES (CC1Y2 Y CMJ) */}
          {(activeTab === 'todos_equipo' || activeTab === 'coordinadores') && (
            <div 
              className="glass-panel" 
              style={{ 
                padding: '1.25rem', 
                borderTop: '4px solid #8b5cf6', 
                borderRadius: '12px',
                background: 'rgba(139, 92, 246, 0.04)' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <h3 style={{ color: '#a78bfa', margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <UserCheck size={18} /> Coordinadores
                </h3>
                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd', fontWeight: 'bold' }}>
                  CC1Y2 & CMJ (Nivel 5 y 6)
                </span>
              </div>
              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                    <th style={{ padding: '0.4rem 0' }}>DÍA</th>
                    <th style={{ padding: '0.4rem 0' }}>GROUNDINGS & SALAS</th>
                    <th style={{ padding: '0.4rem 0', textAlign: 'right' }}>HORARIO</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Miércoles</td>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>
                      CMJ: Deadline carga de FI (19:00)<br/>
                      CC1Y2: Grounding virtual aliados (20:00)
                    </td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right', color: '#c4b5fd', fontWeight: 'bold' }}>19:00 - 21:00</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Jueves</td>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>
                      15:00 Montaje de sala herradura<br/>
                      18:00 Grounding presencial aliados C1
                    </td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>15:00 - 20:00</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Viernes</td>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>
                      08:00 Grounding aliados C1<br/>
                      22:00 Noche de Confianza con tinas
                    </td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right', color: 'var(--crear-cyan)', fontWeight: 'bold' }}>07:45 - 23:30</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Sábado</td>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Seguridad Caída de Confianza (4 apoyos)</td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>07:45 - 22:30</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Domingo</td>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>
                      Control mesa enrolamiento C2 (Ticket Rojo)<br/>
                      18:00 Pase de Antorcha de Maestría
                    </td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right', color: '#f59e0b', fontWeight: 'bold' }}>08:00 - 21:30</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* SECCIONES DE SALA (C1, C2, MJ) */}
          {(activeTab === 'sala_c1') && (
            <div className="glass-panel" style={{ padding: '1.25rem', borderTop: '4px solid #8b5cf6', borderRadius: '12px' }}>
              <h3 style={{ color: '#a78bfa', margin: '0 0 0.8rem 0' }}>🟣 Horarios de Sala: Capítulo UNO (C1)</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                • Jueves: 4:30 PM - Cierre (Negro)<br/>
                • Viernes: 7:30 AM - 3:00 PM y 5:00 PM - Cierre (Noche de Confianza, Negro formal)<br/>
                • Sábado: 8:00 AM - 4:00 PM y 3:00 PM - Cierre (Polo negro)<br/>
                • Domingo: 8:00 AM - Cierre (Graduación)
              </p>
            </div>
          )}

          {(activeTab === 'sala_c2') && (
            <div className="glass-panel" style={{ padding: '1.25rem', borderTop: '4px solid #29abe2', borderRadius: '12px' }}>
              <h3 style={{ color: 'var(--crear-cyan)', margin: '0 0 0.8rem 0' }}>🔵 Horarios de Sala: Capítulo DOS (C2)</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                • Jueves: 10:30 AM - 4:00 PM y 4:00 PM - Cierre (Negro formal)<br/>
                • Viernes: 7:15 AM - 4:00 PM y 4:00 PM - Cierre (14:01 PM Palabra Rota)<br/>
                • Sábado: 7:30 AM - 3:00 PM y 3:00 PM - Cierre (Polo negro)<br/>
                • Domingo: Inicio - Cierre y 3:00 PM - Cierre
              </p>
            </div>
          )}

          {(activeTab === 'sala_mj') && (
            <div className="glass-panel" style={{ padding: '1.25rem', borderTop: '4px solid #f59e0b', borderRadius: '12px' }}>
              <h3 style={{ color: '#f59e0b', margin: '0 0 0.8rem 0' }}>🟡 Horarios de Sala: Maestría del Juego (MJ)</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                • Viernes: 3:00 PM - 9:00 PM (Alineamiento, Negro formal)<br/>
                • Sábado: 8:30 AM - 12:00 PM y 4:00 PM - 9:00 PM<br/>
                • Domingo: 8:30 AM - 12:00 PM y 4:00 PM - Cierre (FDS 4 El Viaje con Paul Sosa y Pase de Antorcha a las 18:00 PM)
              </p>
            </div>
          )}

        </div>

        {/* NOTA DE VESTIMENTA OFICIAL Y SNEAKERS */}
        <div 
          style={{ 
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(41, 171, 226, 0.05))', 
            border: '1px solid rgba(245, 158, 11, 0.35)', 
            borderRadius: '12px', 
            padding: '1.2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f59e0b', fontWeight: 800, fontSize: '0.92rem' }}>
            <Shirt size={18} />
            <span>CÓDIGO DE VESTIMENTA & AUTORIZACIÓN 2026 — CREAR PODER SIN LÍMITES</span>
          </div>
          <div style={{ fontSize: '0.84rem', lineHeight: '1.5', color: 'var(--text-main)' }}>
            <p style={{ margin: '0 0 0.3rem 0' }}>
              • <strong>Equipo de Oficina:</strong> Jueves y viernes de entrenamiento visten de etiqueta negra formal. Sábados y domingos utilizan polos oficiales combinados con pantalón negro y calzado sobrio.
            </p>
            <p style={{ margin: '0 0 0.3rem 0' }}>
              • <strong>Gerentes y Coordinadores:</strong> Etiqueta negra formal en aperturas, Noches de Confianza y groundings iniciales. Polos oficiales el fin de semana.
            </p>
            <p style={{ margin: 0, color: 'var(--crear-cyan)', fontWeight: 600 }}>
              👟 <strong>Entrenador / Coach:</strong> Autorización formal de utilizar <strong>zapatillas deportivas negras limpias</strong> en tarima y salón para cuidar su postura y rendimiento en jornadas de más de 10 horas.
            </p>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.8rem' }}>
          <button 
            onClick={onClose}
            className="btn-primary"
            style={{
              padding: '0.55rem 1.6rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Entendido / Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
