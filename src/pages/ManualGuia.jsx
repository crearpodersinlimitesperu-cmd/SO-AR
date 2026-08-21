import { FlagIcon, getFlagForSede } from '../utils/flags';
import React, { useState } from 'react';
import { 
  BookOpen, Target, CheckCircle2, Shield, Flame, Users, 
  Sparkles, Award, ArrowLeft, Clock, Zap, PhoneCall, Compass,
  AlertOctagon, CheckSquare, BarChart3, HelpCircle, Activity,
  Globe, ChevronRight, Layers, HeartHandshake, CheckCheck,
  FileText, Calendar, Radio, ShieldAlert, Sparkle, Milestone,
  Briefcase, UserCheck, AlertTriangle, Eye, RefreshCw, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ManualGuia() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('brochure'); // 'brochure' | 'operaciones' | 'roles' | 'seguridad'

  const role = currentUser?.appRole || 'staff';
  const isQT = role === 'qt' || (currentUser?.roles || []).includes('qt');
  const isCoord = ['coord_c1', 'coord_c2', 'coordinador_c1c2', 'coordinador', 'coord_maestria', 'coordinador_mj'].includes(role);
  const isGerente = role === 'gerente' || currentUser?.isGerente;
  const isDireccion = role === 'direccion' || currentUser?.isDireccion || currentUser?.isSuperAdmin;
  const isCapitan = role === 'capitan_salon' || role === 'capitan';
  const isEntrenador = ['entrenador', 'entrenador_llamadas', 'director_maestria'].includes(role);

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '2rem 1rem' }}>
      
      {/* Botón Volver */}
      <button 
        onClick={() => navigate('/')} 
        className="btn-secondary" 
        style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', fontWeight: 600 }}
      >
        <ArrowLeft size={16} /> Volver al Centro Operativo
      </button>

      {/* Hero Banner Transformacional */}
      <div className="glass-panel" style={{ 
        padding: '2.5rem 2rem', 
        marginBottom: '2rem', 
        position: 'relative', 
        overflow: 'hidden',
        border: '2px solid var(--crear-gold)',
        borderRadius: '16px'
      }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.08, pointerEvents: 'none' }}>
          <Flame size={220} color="var(--crear-gold)" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ 
            width: '52px', height: '52px', borderRadius: '12px', 
            background: 'var(--crear-gold-light)', border: '1px solid var(--crear-gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Flame size={30} className="text-gold" />
          </div>
          <div>
            <span style={{ 
              fontSize: '0.75rem', fontWeight: 800, letterSpacing: '2px', 
              color: 'var(--crear-gold)', textTransform: 'uppercase' 
            }}>
              CREAR PODER SIN LÍMITES GLOBAL • DOCUMENTO MAESTRO
            </span>
            <h1 style={{ margin: 0, fontSize: '1.85rem', color: 'var(--text-heading)', fontWeight: 900, letterSpacing: '-0.5px' }}>
              Brochure Corporativo y Hoja de Ruta Operativa de Talento Humano
            </h1>
          </div>
        </div>

        <p style={{ fontSize: '1.05rem', lineHeight: '1.6', color: 'var(--text-main)', margin: 0, maxWidth: '880px' }}>
          En <strong>CREAR PODER SIN LÍMITES</strong> no gestionamos eventos; forjamos líderes y equipos de alto rendimiento pasando de la teoría a la acción masiva bajo presión.
        </p>

        {/* Cita de Activación */}
        <div style={{ 
          marginTop: '1.5rem', 
          padding: '1.1rem 1.4rem', 
          background: 'var(--crear-gold-light)', 
          borderLeft: '4px solid var(--crear-gold)',
          borderRadius: '0 10px 10px 0',
          fontSize: '1rem',
          fontStyle: 'italic',
          color: 'var(--text-main)',
          fontWeight: 600
        }}>
          "El conocimiento te muestra el camino. El entrenamiento rompe tus barreras."
        </div>
      </div>

      {/* Navegación por Pestañas Principales */}
      <div style={{ 
        display: 'flex', 
        gap: '0.75rem', 
        marginBottom: '2rem', 
        borderBottom: '1px solid var(--border-subtle)', 
        paddingBottom: '0.75rem',
        overflowX: 'auto'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('brochure')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.4rem',
            borderRadius: '10px',
            border: activeTab === 'brochure' ? '1px solid var(--crear-gold)' : '1px solid var(--border-subtle)',
            background: activeTab === 'brochure' ? 'var(--crear-gold-light)' : 'transparent',
            color: activeTab === 'brochure' ? 'var(--crear-gold)' : 'var(--text-muted)',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <Sparkles size={18} /> PARTE I: Brochure Corporativo & Valor
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('operaciones')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.4rem',
            borderRadius: '10px',
            border: activeTab === 'operaciones' ? '1px solid var(--crear-blue)' : '1px solid var(--border-subtle)',
            background: activeTab === 'operaciones' ? 'rgba(0, 210, 255, 0.12)' : 'transparent',
            color: activeTab === 'operaciones' ? 'var(--crear-blue)' : 'var(--text-muted)',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <Briefcase size={18} /> PARTE II: Hoja de Ruta Interna & Roles
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roles')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.4rem',
            borderRadius: '10px',
            border: activeTab === 'roles' ? '1px solid #a855f7' : '1px solid var(--border-subtle)',
            background: activeTab === 'roles' ? 'rgba(168, 85, 247, 0.12)' : 'transparent',
            color: activeTab === 'roles' ? '#a855f7' : 'var(--text-muted)',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <Compass size={18} /> Guía Detallada por Rol
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('seguridad')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.4rem',
            borderRadius: '10px',
            border: activeTab === 'seguridad' ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
            background: activeTab === 'seguridad' ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
            color: activeTab === 'seguridad' ? '#ef4444' : 'var(--text-muted)',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <AlertOctagon size={18} /> Seguridad & Gestión de Crisis
        </button>
      </div>

      {/* ========================================================= */}
      {/* PESTAÑA 1: PARTE I - BROCHURE CORPORATIVO & VALOR         */}
      {/* ========================================================= */}
      {activeTab === 'brochure' && (
        <div style={{ display: 'grid', gap: '2.25rem' }}>
          
          <div className="glass-panel" style={{ padding: '2.5rem 2rem', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--crear-gold-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={24} className="text-gold" />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--crear-gold)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                  PARTE I • PROPUESTA DE VALOR
                </span>
                <h2 style={{ margin: 0, fontSize: '1.45rem', color: 'var(--text-heading)', fontWeight: 900 }}>
                  1. Nuestro Estándar de Alto Rendimiento
                </h2>
              </div>
            </div>

            <p style={{ margin: '0 0 1.5rem 0', lineHeight: '1.7', color: 'var(--text-main)', fontSize: '1rem' }}>
              En <strong>Crear Poder Sin Límites Global</strong> no gestionamos eventos; forjamos líderes y equipos de alto rendimiento. Nuestra metodología exige pasar de la teoría a la acción masiva, reconfigurando la toma de decisiones bajo presión e instalando un sentido de responsabilidad absoluta en cada participante y miembro del Staff.
            </p>

            {/* 2. EL EJE DE DESARROLLO DE LIDERAZGO */}
            <h3 style={{ margin: '2rem 0 1rem 0', color: 'var(--crear-gold)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Milestone size={20} /> 2. El Eje de Desarrollo de Liderazgo
            </h3>

            <p style={{ margin: '0 0 1.25rem 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Nuestro sistema opera bajo una progresión estricta orientada a resultados tangibles y medibles:
            </p>

            <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
              
              <div style={{ padding: '1.25rem', background: 'var(--bg-card)', borderRadius: '12px', borderLeft: '4px solid var(--crear-blue)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <strong style={{ color: 'var(--crear-blue)', fontSize: '1.1rem' }}>Capítulo Uno (C1)</strong>
                  <span style={{ fontSize: '0.78rem', background: 'rgba(0, 210, 255, 0.1)', color: 'var(--crear-blue)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 800 }}>FASE 1</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                  Inmersión, erradicación de excusas y alineamiento de mentalidad (mente en página en blanco y responsabilidad radical).
                </p>
              </div>

              <div style={{ padding: '1.25rem', background: 'var(--bg-card)', borderRadius: '12px', borderLeft: '4px solid var(--crear-gold)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <strong style={{ color: 'var(--crear-gold)', fontSize: '1.1rem' }}>Capítulo Dos (C2)</strong>
                  <span style={{ fontSize: '0.78rem', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--crear-gold)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 800 }}>FASE 2</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                  Ejecución bajo presión, trabajo en equipo y rompimiento de barreras limitantes (autoconfianza inquebrantable y erradicación del individualismo).
                </p>
              </div>

              <div style={{ padding: '1.25rem', background: 'var(--bg-card)', borderRadius: '12px', borderLeft: '4px solid #a855f7', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <strong style={{ color: '#a855f7', fontSize: '1.1rem' }}>Maestría del Juego (MJ) — Ciclo de 100 Días</strong>
                  <span style={{ fontSize: '0.78rem', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 800 }}>FASE 3</span>
                </div>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                  100 días de ejecución sostenida de metas (Futuros Imposibles o FI) auditada mediante 4 Fines de Semana de Calibración:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.6rem' }}>
                  <div style={{ padding: '0.6rem 0.8rem', background: 'var(--bg-card-hover)', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <strong style={{ color: '#a855f7' }}>1FDS — Creación:</strong> Visión y EAI.
                  </div>
                  <div style={{ padding: '0.6rem 0.8rem', background: 'var(--bg-card-hover)', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <strong style={{ color: '#a855f7' }}>2FDS — Relación:</strong> Dinámica y Clima.
                  </div>
                  <div style={{ padding: '0.6rem 0.8rem', background: 'var(--bg-card-hover)', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <strong style={{ color: '#a855f7' }}>3FDS — Gratitud:</strong> Servicio y Avance.
                  </div>
                  <div style={{ padding: '0.6rem 0.8rem', background: 'var(--bg-card-hover)', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <strong style={{ color: '#a855f7' }}>4FDS — El Viaje:</strong> Consolidación y Legado.
                  </div>
                </div>
              </div>

            </div>

            {/* SIMULADORES ESTRATÉGICOS DE MAESTRÍA */}
            <h3 style={{ margin: '1.5rem 0 1rem 0', color: '#ef4444', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={20} /> Entrenamientos Complementarios (Simuladores de Presión)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: 'var(--crear-gold)' }}>🤝 Caída de Confianza / FI:</strong> Círculo de Limpieza, caída en silencio y auditoría de metas.
              </div>
              <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: 'var(--crear-blue)' }}>📻 Tanque:</strong> Navegación a ciegas por walkie-talkie y códigos sonoros; auditoría de ego.
              </div>
              <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: '#ef4444' }}>🔥 Rompimiento de Barreras:</strong> "El Monje y el Florero" e impacto físico destructivo sobre la limitación.
              </div>
              <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: '#a855f7' }}>👥 Caminata de Equipos:</strong> Valla de honor, contacto visual y traspaso formal de legado.
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* PESTAÑA 2: PARTE II - HOJA DE RUTA INTERNA & ROLES        */}
      {/* ========================================================= */}
      {activeTab === 'operaciones' && (
        <div style={{ display: 'grid', gap: '2.25rem' }}>
          
          <div className="glass-panel" style={{ padding: '2.5rem 2rem', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(0, 210, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Briefcase size={24} color="var(--crear-blue)" />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--crear-blue)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                  PARTE II • OPERACIONES Y ROLES DEL STAFF
                </span>
                <h2 style={{ margin: 0, fontSize: '1.45rem', color: 'var(--text-heading)', fontWeight: 900 }}>
                  Hoja de Ruta Interna y Cadena de Mando
                </h2>
              </div>
            </div>

            <p style={{ margin: '0 0 1.75rem 0', lineHeight: '1.7', color: 'var(--text-main)', fontSize: '0.98rem' }}>
              Para sostener el estándar de <strong>"Cero Pérdida de Información"</strong> y excelencia operativa, la estructura interna funciona bajo una matriz de responsabilidades clara y auditable a través de Checklists rigurosos.
            </p>

            {/* 1. CADENA DE MANDO Y EJECUCIÓN OPERATIVA (TABLA UNIFICADA) */}
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--crear-blue)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={20} /> 1. Cadena de Mando y Ejecución Operativa
            </h3>

            <div style={{ overflowX: 'auto', marginBottom: '2.25rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-card-hover)', borderBottom: '2px solid var(--border-subtle)' }}>
                    <th style={{ padding: '0.9rem 1rem', color: 'var(--crear-gold)', fontWeight: 800, width: '22%' }}>Rol Estratégico</th>
                    <th style={{ padding: '0.9rem 1rem', color: 'var(--text-heading)', fontWeight: 800, width: '56%' }}>Responsabilidades Clave (Operaciones y RRHH)</th>
                    <th style={{ padding: '0.9rem 1rem', color: 'var(--crear-blue)', fontWeight: 800, width: '22%' }}>Documento Base & Módulo</th>
                  </tr>
                </thead>
                <tbody>
                  
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '1.1rem 1rem', fontWeight: 800, color: 'var(--crear-gold)' }}>
                      Gerente de Sede
                    </td>
                    <td style={{ padding: '1.1rem 1rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                      Dirige la planeación estratégica, audita el cumplimiento de metas de enrolamiento y supervisa la salud financiera y operativa de la plaza. Garantiza la ejecución impecable de los checklists globales.
                    </td>
                    <td style={{ padding: '1.1rem 1rem' }}>
                      <button 
                        onClick={() => navigate('/gerente')}
                        className="btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', width: '100%', justifyContent: 'center' }}
                      >
                        📋 Checklist Gerencia <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '1.1rem 1rem', fontWeight: 800, color: 'var(--crear-blue)' }}>
                      Coordinador C1 y C2
                    </td>
                    <td style={{ padding: '1.1rem 1rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                      Custodio de la logística de los primeros niveles. Maneja el registro, la trazabilidad de datos, la preparación de la sala y asegura el <em>Grounding</em> del equipo de apoyo para mantener el contexto intacto.
                    </td>
                    <td style={{ padding: '1.1rem 1rem' }}>
                      <button 
                        onClick={() => navigate('/coordinador')}
                        className="btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', width: '100%', justifyContent: 'center' }}
                      >
                        📋 Checklist C1/C2 <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '1.1rem 1rem', fontWeight: 800, color: '#a855f7' }}>
                      Coordinador de Maestría
                    </td>
                    <td style={{ padding: '1.1rem 1rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                      Lidera la ejecución de los 100 días. Supervisa métricas semanales, valida las metas y gestiona la estructura de los Equipos de Alto Impacto (EAI) para minimizar la deserción.
                    </td>
                    <td style={{ padding: '1.1rem 1rem' }}>
                      <button 
                        onClick={() => navigate('/centro-managers')}
                        className="btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', width: '100%', justifyContent: 'center' }}
                      >
                        👥 Centro Managers <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '1.1rem 1rem', fontWeight: 800, color: '#eab308' }}>
                      Capitanes
                    </td>
                    <td style={{ padding: '1.1rem 1rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                      Actúan como mentores directos en la trinchera. Auditan el progreso diario de los participantes, reportan el estado anímico y aseguran el cumplimiento de tareas.
                    </td>
                    <td style={{ padding: '1.1rem 1rem' }}>
                      <button 
                        onClick={() => navigate('/checklist/capitan_salon')}
                        className="btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', width: '100%', justifyContent: 'center' }}
                      >
                        📋 Checklist Capitán <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>

                  <tr>
                    <td style={{ padding: '1.1rem 1rem', fontWeight: 800, color: '#10b981' }}>
                      Quantum Team (Staff)
                    </td>
                    <td style={{ padding: '1.1rem 1rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                      Equipo operativo de soporte en sala. Encargados de las dinámicas físicas, control de tiempos, seguridad perimetral y ejecución de logística durante los entrenamientos.
                    </td>
                    <td style={{ padding: '1.1rem 1rem' }}>
                      <a 
                        href="https://crearpsl.net/manual_quantum_team.html" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn-primary"
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none', width: '100%', justifyContent: 'center' }}
                      >
                        ⚡ Manual QT ↗
                      </a>
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>

            {/* 2. ESTANDARIZACIÓN A TRAVÉS DE CHECKLISTS */}
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--color-success)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckSquare size={20} /> 2. Estandarización a través de Checklists
            </h3>

            <p style={{ margin: '0 0 1.25rem 0', color: 'var(--text-main)', fontSize: '0.95rem' }}>
              La base de nuestro alto rendimiento es la estandarización. <strong>Ningún proceso se deja a la memoria o a la improvisación.</strong>
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2.25rem' }}>
              
              <div style={{ padding: '1.25rem', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: 'var(--crear-gold)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Globe size={16} /> Auditoría Global:
                </strong>
                <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  Se implementa un Checklist Global para unificar criterios entre todas las sedes, asegurando que la calidad de la entrega sea idéntica en cualquier país.
                </p>
              </div>

              <div style={{ padding: '1.25rem', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: 'var(--crear-blue)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCheck size={16} /> Control de Calidad:
                </strong>
                <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  Cada rol (Gerencia, Coordinación, Capitanes) debe firmar y validar el cumplimiento de su propio Checklist antes, durante y después de cada evento.
                </p>
              </div>

              <div style={{ padding: '1.25rem', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: 'var(--color-success)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <RefreshCw size={16} /> Contingencia y Trazabilidad:
                </strong>
                <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  El uso riguroso de estos manuales garantiza que ante cualquier cambio de personal, el sistema siga operando sin pérdida de información ni caída de calidad.
                </p>
              </div>

            </div>

            {/* 3. CULTURA ORGANIZACIONAL Y GROUNDING */}
            <div style={{ 
              padding: '1.5rem', 
              background: 'var(--bg-card-hover)', 
              borderRadius: '12px', 
              borderLeft: '4px solid var(--crear-gold)',
              border: '1px solid var(--border-subtle)'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--crear-gold)', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HeartHandshake size={20} /> 3. Cultura Organizacional y Grounding
              </h3>
              
              <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                El talento humano de <strong>Crear Poder Sin Límites</strong> no solo ejecuta tareas; modela el liderazgo:
              </p>

              <div style={{ padding: '0.85rem 1rem', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <strong style={{ color: 'var(--crear-gold)' }}>⚖️ Regla de Grounding:</strong> <span style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>Todo el equipo (desde el Gerente hasta el Quantum Team) debe pasar por un proceso de alineamiento antes de tener contacto con los participantes, garantizando que operen bajo una sola visión, rigor y protocolo de excelencia.</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* PESTAÑA 3: GUÍA DETALLADA POR ROL                        */}
      {/* ========================================================= */}
      {activeTab === 'roles' && (
        <div style={{ display: 'grid', gap: '1.75rem' }}>

          {/* 1. SECCIÓN EXCLUSIVA: QUANTUM TEAM (QT) */}
          {isQT && (
            <div className="glass-panel" style={{ 
              padding: '2rem', 
              border: '2px solid var(--crear-gold)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, background: 'var(--crear-gold)', color: '#000', padding: '0.2rem 0.6rem', borderRadius: '4px', letterSpacing: '1px' }}>
                    RECURSO OFICIAL EXCLUSIVO QT
                  </span>
                  <h3 style={{ color: 'var(--crear-gold)', margin: '0.6rem 0 0 0', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <BookOpen size={24} /> Manual Cuántico Digital para Salas de Entrenamiento
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <a 
                    href="/directorio-qt" 
                    className="btn-secondary" 
                    style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem', 
                      padding: '0.8rem 1.4rem', textDecoration: 'none', fontWeight: 800, 
                      fontSize: '0.95rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--crear-gold)', borderColor: 'var(--crear-gold)'
                    }}
                  >
                    ⚡ Directorio QT
                  </a>
                  <a 
                    href="https://crearpsl.net/manual_quantum_team.html" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn-primary" 
                    style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '0.6rem', 
                      padding: '0.8rem 1.6rem', textDecoration: 'none', fontWeight: 800, 
                      fontSize: '0.95rem', borderRadius: '8px'
                    }}
                  >
                    <BookOpen size={18} /> Abrir Manual QT Completo ↗
                  </a>
                </div>
              </div>
              
              <p style={{ lineHeight: '1.6', color: 'var(--text-main)', marginBottom: '1rem' }}>
                Como integrante del <strong>Quantum Team (QT)</strong>, representas el servicio más puro y la presencia silenciosa de máximo poder. 
                En el manual interactivo encontrarás los protocolos de sala, postura, atención a dinámicas, logística de materiales, apoyo al entrenador y custodia de la energía sin interrupciones.
              </p>
            </div>
          )}

          {/* VISTA COORDINACIÓN CAPÍTULO 1 Y 2 */}
          {['coord_c1', 'coord_c2', 'coordinador_c1c2', 'coordinador'].includes(role) && (
            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '5px solid var(--crear-blue)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Compass size={24} color="var(--crear-blue)" />
                <h3 style={{ color: 'var(--crear-blue)', margin: 0, fontSize: '1.3rem' }}>
                  Guía de Liderazgo para Coordinación Capítulo 1 y 2 (C1 / C2)
                </h3>
              </div>

              <p style={{ lineHeight: '1.6', color: 'var(--text-main)' }}>
                Como <strong>Coordinador(a) Capítulo 1 y 2</strong>, lideras la manifestación del entrenamiento junto a tus <strong>Capitanes de Salón</strong> y el <strong>Quantum Team (QT)</strong>. Tu foco absoluto está en los participantes (Px Sentados), Aliados y Apoyos en Mesa:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
                <div style={{ padding: '1rem', background: 'var(--bg-card-hover)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ color: 'var(--crear-blue)', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                    <Target size={16} /> Participantes & Enrolamiento
                  </h4>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
                    Tu foco está en Px Sentados, Aliados y Apoyos en Mesa. Divide las metas y actualiza los avances en el panel de metas.
                  </p>
                </div>

                <div style={{ padding: '1rem', background: 'var(--bg-card-hover)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ color: 'var(--crear-blue)', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                    <Users size={16} /> Liderazgo de QT & Capitanes
                  </h4>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
                    Sincronízate con tus Capitanes de Salón y Quantum Team para que la sala esté impecable en tiempo, logística y acústica.
                  </p>
                </div>

                <div style={{ padding: '1rem', background: 'var(--bg-card-hover)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ color: 'var(--crear-blue)', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                    <Clock size={16} /> Tiempos & Checklist
                  </h4>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
                    La puntualidad crea respeto. Revisa tu checklist antes de cada etapa, completa las verificaciones previas y sube tus evidencias con link para validación.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* VISTA COORDINACIÓN MAESTRÍA DEL JUEGO */}
          {['coord_maestria', 'coordinador_mj'].includes(role) && (
            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '5px solid #8b5cf6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Users size={24} color="#8b5cf6" />
                <h3 style={{ color: '#8b5cf6', margin: 0, fontSize: '1.3rem' }}>
                  Guía para Coordinación de Maestría del Juego (MJ)
                </h3>
              </div>

              <p style={{ lineHeight: '1.6', color: 'var(--text-main)' }}>
                Como <strong>Coordinador(a) de Maestría del Juego</strong>, lideras el <strong>Centro de Managers</strong> en tu sede, asignando entrenadores y monitoreando el cumplimiento de llamadas semanales y metas de retención de 100 días.
              </p>
            </div>
          )}

          {/* VISTA GERENCIA DE SEDE */}
          {isGerente && (
            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '5px solid var(--crear-gold)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Shield size={24} color="var(--crear-gold)" />
                <h3 style={{ color: 'var(--crear-gold)', margin: 0, fontSize: '1.3rem' }}>
                  Guía de Comando para Gerentes de Sede
                </h3>
              </div>

              <p style={{ lineHeight: '1.6', color: 'var(--text-main)' }}>
                Como <strong>Gerente de Sede</strong>, eres el líder estratégico y custodio absoluto del éxito financiero, operativo y humano de tu ciudad:
              </p>

              <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8', color: 'var(--text-muted)', margin: '1rem 0' }}>
                <li><strong>Setup de Ciclo & Metas:</strong> Configura desde el primer día las metas de cada fase (C1, C2, MJ) en el panel de Metas y asígnalas equitativamente a las coordinadoras.</li>
                <li><strong>Supervisión de Sedes y Salones:</strong> Verifica que la sede física de tu ciudad cuente con los contratos, salones y protocolos de emergencia listos antes del inicio.</li>
                <li><strong>Auditoría & Tareas:</strong> Monitorea el avance de checklists de tus coordinadores y capitanes. Si una tarea crítica se atrasa, interviene de inmediato para asegurar el 100%.</li>
              </ul>
            </div>
          )}

          {/* VISTA DIRECCIÓN GLOBAL & SUPER ADMIN */}
          {isDireccion && (
            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '5px solid #ec4899' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Award size={24} color="#ec4899" />
                <h3 style={{ color: '#ec4899', margin: 0, fontSize: '1.3rem' }}>
                  Gobierno y Visión para Dirección Global & Super Admin
                </h3>
              </div>

              <p style={{ lineHeight: '1.6', color: 'var(--text-main)' }}>
                Como <strong>Dirección Global</strong>, tienes la perspectiva macro de todas las sedes oficiales internacionales (Quito, Guayaquil, Cuenca, Lima, Medellín, México y Global):
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ padding: '1rem', background: 'var(--bg-card-hover)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <strong style={{ color: '#ec4899' }}>🛡️ Auditoría en Tiempo Real:</strong> Revisa el log de accesos, conexiones y movimientos para garantizar transparencia total.
                </div>
                <div style={{ padding: '1rem', background: 'var(--bg-card-hover)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <strong style={{ color: '#ec4899' }}>👥 Simulación de Roles:</strong> Entra a la plataforma con la vista de cualquier colaborador para auditar su experiencia de usuario y resolver dudas.
                </div>
                <div style={{ padding: '1rem', background: 'var(--bg-card-hover)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <strong style={{ color: '#ec4899' }}>🌍 Consistencia Internacional:</strong> Asegura que todas las ciudades operen bajo los mismos estándares de marca y rigor metodológico.
                </div>
              </div>
            </div>
          )}

          {/* VISTA CAPITANES DE SALÓN */}
          {isCapitan && (
            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '5px solid #eab308' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Zap size={24} color="#eab308" />
                <h3 style={{ color: '#eab308', margin: 0, fontSize: '1.3rem' }}>
                  Guía de Excelencia para Capitanes de Salón
                </h3>
              </div>

              <p style={{ lineHeight: '1.6', color: 'var(--text-main)' }}>
                El <strong>Capitán de Salón</strong> es el guardián de la sala de entrenamiento:
              </p>

              <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8', color: 'var(--text-muted)', margin: '1rem 0' }}>
                <li><strong>Sincronía con el Entrenador:</strong> Conoce la agenda minuto a minuto, anticipa cambios de dinámicas, pausas y tiempos de baño.</li>
                <li><strong>Audio, Iluminación y Video:</strong> La música es una herramienta emocional vital; mantén el volumen calibrado y transiciones fluidas.</li>
                <li><strong>Protocolo de Emergencias:</strong> Ten siempre ubicado el botiquín, salidas de evacuación y el manual de contingencias actualizado.</li>
              </ul>
            </div>
          )}

          {/* VISTA ENTRENADORES */}
          {isEntrenador && (
            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '5px solid #10b981' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <PhoneCall size={24} color="#10b981" />
                <h3 style={{ color: '#10b981', margin: 0, fontSize: '1.3rem' }}>
                  Guía Operativa para Entrenadores & Seguimiento de Managers
                </h3>
              </div>

              <p style={{ lineHeight: '1.6', color: 'var(--text-main)' }}>
                En el <strong>Centro de Managers</strong>, mantén el seguimiento semanal de tus líderes asignados:
              </p>

              <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8', color: 'var(--text-muted)', margin: '1rem 0' }}>
                <li><strong>Registro de Llamadas Individuales & Grupales:</strong> Marca con un clic la asistencia a las llamadas de maestría para que el sistema calcule los KPIs de retención.</li>
                <li><strong>Alineación con Coordinación:</strong> Comunica cualquier eventualidad o alerta sobre participantes a tu Coordinador de Maestría.</li>
              </ul>
            </div>
          )}

          {/* MÓDULOS CLAVE DE SO-AR */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: 0, fontSize: '1.2rem' }}>
              <CheckSquare size={20} color="var(--crear-gold)" /> Módulos Clave de SO-AR
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: 'var(--crear-gold)' }}>📋 Checklist Operativo:</strong> Registro de cumplimiento diario y semanal con subida de evidencia y comentarios.
              </div>
              <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: 'var(--crear-blue)' }}>🎯 Metas & KPIs:</strong> Seguimiento de participantes sentados, balance financiero y porcentaje de avance en vivo.
              </div>
              <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: '#8b5cf6' }}>👥 Centro de Managers:</strong> Control de los 690 registros maestros, llamadas de seguimiento y asignación de coaches.
              </div>
              <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: '#10b981' }}>⚡ Directorio QT en Vivo:</strong> Consulta directa sincronizada con el Google Sheet maestro corporativo.
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* PESTAÑA 4: SEGURIDAD & GESTIÓN DE CRISIS                  */}
      {/* ========================================================= */}
      {activeTab === 'seguridad' && (
        <div className="glass-panel" style={{ 
          padding: '2.5rem 2rem', 
          border: '2px solid rgba(239, 68, 68, 0.5)',
          borderRadius: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertOctagon size={26} color="#ef4444" />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ef4444', letterSpacing: '1px', textTransform: 'uppercase' }}>
                DIRECTIVA INSTITUCIONAL OBLIGATORIA
              </span>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-heading)', fontWeight: 800 }}>
                Protocolo de Seguridad & Manejo de Emergencias en Salón
              </h2>
            </div>
            <button 
              onClick={() => navigate('/protocolo-emergencias')}
              className="btn-primary"
              style={{
                marginLeft: 'auto',
                background: '#ef4444',
                borderColor: '#ef4444',
                color: '#fff',
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              🚨 Módulo Interactivo & Checklist ↗
            </button>
          </div>

          <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
            Guía oficial e inviolable para la gestión de contingencias médicas, contención emocional, evacuación de salones, quiebres mayores y seguridad integral durante entrenamientos presenciales (Capítulo 1, Capítulo 2, Maestría del Juego) en todas las sedes oficiales internacionales.
          </p>

          <div style={{ display: 'grid', gap: '1.5rem' }}>
            
            {/* 1. Procedimiento Paso a Paso */}
            <div>
              <h3 style={{ color: 'var(--crear-gold)', margin: '0 0 1rem 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={20} /> 1. Procedimiento de Actuación en Sala (Paso a Paso)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {[
                  { step: '1', title: 'Detectar y Avisar', desc: 'El entrenador o capitán detecta el suceso y comunica en voz baja/seña: "Emergencia en [punto de sala], coordinador requerido".' },
                  { step: '2', title: 'Asumir el Salón', desc: 'El coordinador o capitán designado toma el mando absoluto. Asigna funciones directas para evitar el caos.' },
                  { step: '3', title: 'Proteger la Escena', desc: 'Se crea un perímetro de seguridad alrededor del paciente, evitando aglomeraciones, fotos o exposiciones innecesarias.' },
                  { step: '4', title: 'Evaluar y Solicitar Apoyo', desc: 'El coordinador convoca de inmediato a enfermería, brigadista o servicio médico. Las maniobras corresponden únicamente a personal capacitado.' },
                  { step: '5', title: 'Retirar al Paciente (Si Procede)', desc: 'Si el paciente puede movilizarse de forma segura, se traslada a la enfermería o zona privada. ⚠️ Si hay sospecha de golpe en cabeza, cuello o columna, NO se moviliza hasta llegada médica.' },
                  { step: '6', title: 'Continuar el Entrenamiento', desc: 'Aislada la situación, el entrenador retoma la dinámica manteniendo la calma del grupo sin divulgar datos médicos confidenciales.' },
                  { step: '7', title: 'Trasladar, Notificar y Registrar', desc: 'El personal de salud define traslado. Logística avisa al contacto de emergencia, activa seguro y llena el Reporte de Incidentes.' }
                ].map((item) => (
                  <div key={item.step} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--crear-gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem', flexShrink: 0 }}>
                      {item.step}
                    </div>
                    <div>
                      <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>{item.title}: </strong>
                      <span style={{ color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.5' }}>{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Matriz de Escalamiento */}
            <div>
              <h3 style={{ color: 'var(--crear-gold)', margin: '0 0 1rem 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={20} /> 2. Matriz de Escalamiento y Criterio de Gravedad
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: 'rgba(52, 168, 83, 0.05)', borderRadius: '8px', border: '1px solid rgba(52, 168, 83, 0.3)' }}>
                  <h4 style={{ color: 'var(--color-success)', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>🟢 1. Atención en Sede</h4>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                    Malestar leve, mareo pasajero, golpe menor o herida superficial. Manejo interno con hidratación, descanso y autorización de enfermería.
                  </p>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  <h4 style={{ color: '#ffb347', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>🟡 2. Derivación Médica</h4>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                    Desmayo, esguince severo, fractura probable, herida cortante profunda, golpe en la cabeza o dolor intenso. Traslado a centro asistencial de referencia.
                  </p>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                  <h4 style={{ color: '#ef4444', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>🔴 3. Código Rojo (Emergencia Vital)</h4>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                    Inconsciencia, ausencia de respiración, sangrado abundante no contenido, convulsión prolongada o dolor torácico intenso. <strong>Llamada inmediata al 911 / 106 / 123</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Reglas Inviolables de Seguridad */}
            <div style={{ padding: '1.25rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <h3 style={{ color: '#ef4444', margin: '0 0 0.8rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertOctagon size={18} /> 3. Reglas Inviolables de Seguridad (Cero Excepciones)
              </h3>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                <li><strong>NO suministrar medicamentos</strong> (ni analgésicos) sin prescripción médica o autorización profesional directa.</li>
                <li><strong>NO levantar ni trasladar</strong> a una persona con posible traumatismo de cabeza, cuello o columna.</li>
                <li><strong>NO permitir grabaciones, fotos ni comentarios</strong> sobre el estado de salud del participante.</li>
                <li><strong>NO prometer coberturas económicas</strong> ni emitir diagnósticos médicos; todo se tramita con el seguro y la dirección.</li>
                <li><strong>Existe una ÚNICA voz de mando:</strong> el coordinador o capitán designado. Cero discrepancias frente al salón.</li>
              </ul>
            </div>

            {/* 4. Teléfonos de Emergencia por Sede */}
            <div style={{ padding: '1.25rem', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ color: 'var(--crear-gold)', margin: '0 0 0.75rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PhoneCall size={18} /> Directorio Oficial de Emergencias por Sede
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', fontSize: '0.88rem' }}>
                <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                  <div style={{ color: '#ffffff', fontWeight: 700 }}><FlagIcon country="Ecuador" size={16} /> Quito, Guayaquil, Cuenca:</div>
                  <strong style={{ color: '#ef4444', fontSize: '1rem' }}>911 (ECU 911)</strong>
                </div>
                <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                  <div style={{ color: '#ffffff', fontWeight: 700 }}><FlagIcon country="Peru" size={16} /> Lima:</div>
                  <strong style={{ color: '#ef4444', fontSize: '1rem' }}>106 (SAMU) / 116 / 105</strong>
                </div>
                <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                  <div style={{ color: '#ffffff', fontWeight: 700 }}><FlagIcon country="Colombia" size={16} /> Medellín:</div>
                  <strong style={{ color: '#ef4444', fontSize: '1rem' }}>123 (Emergencias)</strong>
                </div>
                <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                  <div style={{ color: '#ffffff', fontWeight: 700 }}><FlagIcon country="Mexico" size={16} /> México (CDMX):</div>
                  <strong style={{ color: '#ef4444', fontSize: '1rem' }}>911 (Emergencias)</strong>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Footer Institucional de Soporte */}
      <div className="glass-panel" style={{ 
        marginTop: '2rem', 
        padding: '2rem', 
        borderRadius: '16px', 
        textAlign: 'center',
        border: '1px solid var(--border-subtle)'
      }}>
        <h4 style={{ color: 'var(--crear-gold)', margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>
          ¿Requieres Soporte Técnico o Tienes Sugerencias?
        </h4>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 1.25rem 0' }}>
          El equipo de tecnología y sistemas está a tu disposición para optimizar continuamente la plataforma.
        </p>
        <a 
          href="mailto:sistemas@crearpsl.net?subject=Soporte%20y%20Mejora%20Plataforma%20CREAR%20PSL"
          className="btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.75rem 1.75rem', fontWeight: 700, borderRadius: '8px' }}
        >
          <HelpCircle size={18} /> Contactar a Sistemas (sistemas@crearpsl.net)
        </a>
      </div>

    </div>
  );
}
