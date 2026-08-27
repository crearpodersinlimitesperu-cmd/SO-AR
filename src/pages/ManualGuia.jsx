import { FlagIcon } from '../utils/flags';
import React, { useState } from 'react';
import {
  BookOpen, Target, CheckCircle2, Shield, Flame, Users,
  Sparkles, Award, ArrowLeft, Clock, Zap, PhoneCall, Compass,
  AlertOctagon, CheckSquare, BarChart3, HelpCircle, Activity,
  Globe, ChevronRight, Layers, HeartHandshake, CheckCheck,
  FileText, Calendar, Radio, ShieldAlert, Milestone,
  Briefcase, UserCheck, AlertTriangle, Eye, RefreshCw, ExternalLink,
  TrendingUp, Star, Lock, Cpu, MessageSquare, Bell, Search,
  Sun, Moon, Monitor, LayoutDashboard, PieChart, BookMarked
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { id: 'brochure',    label: 'PARTE I: Brochure & Valor',       icon: <Sparkles size={17} />,      color: 'var(--crear-gold)',  bg: 'var(--crear-gold-light)' },
  { id: 'operaciones', label: 'PARTE II: Operaciones & Roles',    icon: <Briefcase size={17} />,     color: 'var(--crear-blue)', bg: 'rgba(0,210,255,0.12)' },
  { id: 'plataforma',  label: 'PARTE III: Causa OS — Plataforma', icon: <Cpu size={17} />,           color: '#10b981',           bg: 'rgba(16,185,129,0.1)' },
  { id: 'roles',       label: 'Guia por Rol',                     icon: <Compass size={17} />,       color: '#a855f7',           bg: 'rgba(168,85,247,0.12)' },
  { id: 'seguridad',   label: 'Seguridad & Crisis',               icon: <AlertOctagon size={17} />,  color: '#ef4444',           bg: 'rgba(239,68,68,0.12)' },
];

function TabBtn({ tab, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.45rem',
        padding: '0.65rem 1.2rem', borderRadius: '10px', whiteSpace: 'nowrap',
        border: active ? `1px solid ${tab.color}` : '1px solid var(--border-subtle)',
        background: active ? tab.bg : 'transparent',
        color: active ? tab.color : 'var(--text-muted)',
        fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', transition: 'all 0.2s'
      }}
    >
      {tab.icon} {tab.label}
    </button>
  );
}

function SectionHeader({ icon, sup, title, color = 'var(--crear-gold)', bg = 'var(--crear-gold-light)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {React.cloneElement(icon, { size: 24, color })}
      </div>
      <div>
        {sup && <span style={{ fontSize: '0.72rem', fontWeight: 800, color, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{sup}</span>}
        <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-heading)', fontWeight: 900, lineHeight: 1.2 }}>{title}</h2>
      </div>
    </div>
  );
}

function InfoCard({ color, title, children }) {
  return (
    <div style={{ padding: '1.1rem', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
      <strong style={{ color, fontSize: '0.93rem' }}>{title}</strong>
      <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.87rem', color: 'var(--text-muted)', lineHeight: '1.55' }}>{children}</p>
    </div>
  );
}

function ModuleCard({ icon, title, desc, color, onClick, badge }) {
  return (
    <div
      onClick={onClick}
      className="hover-glow"
      style={{
        padding: '1.2rem', background: 'var(--bg-card)', borderRadius: '12px',
        border: '1px solid var(--border-subtle)', cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '0.5rem',
        position: 'relative', overflow: 'hidden'
      }}
    >
      {badge && (
        <span style={{
          position: 'absolute', top: '0.6rem', right: '0.6rem',
          fontSize: '0.65rem', fontWeight: 800, background: color,
          color: '#000', padding: '0.15rem 0.45rem', borderRadius: '4px', letterSpacing: '0.5px'
        }}>{badge}</span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {React.cloneElement(icon, { size: 20, color })}
        </div>
        <strong style={{ color, fontSize: '0.95rem' }}>{title}</strong>
      </div>
      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{desc}</p>
      {onClick && <span style={{ fontSize: '0.78rem', color, fontWeight: 700, marginTop: '0.2rem' }}>Abrir modulo</span>}
    </div>
  );
}

export default function ManualGuia() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('brochure');

  const role = currentUser?.appRole || 'staff';
  const isQT = role === 'qt' || (currentUser?.roles || []).includes('qt');
  const isCoord = ['coord_c1', 'coord_c2', 'coordinador_c1c2', 'coordinador', 'coord_maestria', 'coordinador_mj'].includes(role);
  const isGerente = role === 'gerente' || currentUser?.isGerente;
  const isDireccion = role === 'direccion' || currentUser?.isDireccion || currentUser?.isSuperAdmin;
  const isCapitan = role === 'capitan_salon' || role === 'capitan';
  const isEntrenador = ['entrenador', 'entrenador_llamadas', 'director_maestria'].includes(role);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem' }}>

      <button
        onClick={() => navigate('/')}
        className="btn-secondary"
        style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontWeight: 600 }}
      >
        <ArrowLeft size={16} /> Volver al Centro Operativo
      </button>

      {/* Hero */}
      <div className="glass-panel" style={{
        padding: '2.5rem 2rem', marginBottom: '2rem', position: 'relative',
        overflow: 'hidden', border: '2px solid var(--crear-gold)', borderRadius: '16px'
      }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.06, pointerEvents: 'none' }}>
          <Flame size={240} color="var(--crear-gold)" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ width: '54px', height: '54px', borderRadius: '12px', background: 'var(--crear-gold-light)', border: '1px solid var(--crear-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Flame size={30} color="var(--crear-gold)" />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '2px', color: 'var(--crear-gold)', textTransform: 'uppercase' }}>
              CREAR PODER SIN LIMITES GLOBAL • DOCUMENTO MAESTRO v2.0
            </span>
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-heading)', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
              Manual Institucional & Guia Operativa — Causa OS
            </h1>
          </div>
        </div>
        <p style={{ fontSize: '1rem', lineHeight: '1.65', color: 'var(--text-main)', margin: '0 0 1.25rem 0', maxWidth: '860px' }}>
          En <strong>CREAR PODER SIN LIMITES</strong> no gestionamos eventos; forjamos lideres y equipos de alto rendimiento
          que pasan de la teoria a la accion masiva bajo presion. Este documento unifica el brochure corporativo,
          la hoja de ruta operativa y la guia completa de la plataforma digital <strong>Causa OS</strong>.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ padding: '0.6rem 1.1rem', background: 'var(--crear-gold-light)', borderLeft: '3px solid var(--crear-gold)', borderRadius: '0 8px 8px 0', fontSize: '0.92rem', fontStyle: 'italic', color: 'var(--text-main)', fontWeight: 600 }}>
            "El conocimiento te muestra el camino. El entrenamiento rompe tus barreras."
          </div>
          <div style={{ padding: '0.6rem 1.1rem', background: 'rgba(16,185,129,0.1)', borderLeft: '3px solid #10b981', borderRadius: '0 8px 8px 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Actualizado: Agosto 2026 — 7 Sedes Operativas — Plataforma Causa OS activa
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', overflowX: 'auto' }}>
        {TABS.map(t => (
          <TabBtn key={t.id} tab={t} active={activeTab === t.id} onClick={() => setActiveTab(t.id)} />
        ))}
      </div>

      {/* PARTE I — BROCHURE */}
      {activeTab === 'brochure' && (
        <div style={{ display: 'grid', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2.25rem 2rem', borderRadius: '16px' }}>
            <SectionHeader icon={<Target />} sup="PARTE I - PROPUESTA DE VALOR" title="1. Nuestro Estandar de Alto Rendimiento" />
            <p style={{ margin: '0 0 1.5rem 0', lineHeight: '1.75', color: 'var(--text-main)', fontSize: '1rem' }}>
              En <strong>CREAR PODER SIN LIMITES Global</strong> no gestionamos eventos; forjamos lideres y equipos de alto rendimiento.
              Nuestra metodologia exige pasar de la teoria a la accion masiva, reconfigurando la toma de decisiones bajo presion
              e instalando un sentido de <strong>responsabilidad absoluta</strong> en cada participante y miembro del Staff.
              El resultado no es aprendizaje pasivo: es transformacion medible y auditada.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { icon: 'FIRE', label: 'Accion Masiva', desc: 'Cada dinamica esta disenada para generar un quiebre real, no reflexiones superficiales.' },
                { icon: 'CHART', label: 'Resultados Medibles', desc: 'Metas auditables: Px sentados, retencion al 100 dias y avance por sede en tiempo real.' },
                { icon: 'GLOBE', label: '7 Sedes Internacionales', desc: 'Quito, Guayaquil, Cuenca, Lima, Medellin, Mexico y Sede Global con estandares unificados.' },
                { icon: 'ZAP', label: 'Causa OS Digital', desc: 'Plataforma propia de monitoreo, checklists y gestion operativa para todo el staff.' },
              ].map((item, i) => (
                <div key={item.label} style={{ padding: '1.1rem', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <strong style={{ color: 'var(--crear-gold)', fontSize: '0.95rem', display: 'block', marginBottom: '0.3rem' }}>{item.label}</strong>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{item.desc}</p>
                </div>
              ))}
            </div>

            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--crear-gold)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Milestone size={20} color="var(--crear-gold)" /> 2. El Eje de Desarrollo de Liderazgo — 3 Fases
            </h3>
            <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { title: 'Capitulo Uno (C1)', phase: 'FASE 1', color: 'var(--crear-blue)', bg: 'rgba(0,210,255,0.08)', desc: 'Inmersion, erradicacion de excusas y alineamiento de mentalidad. El participante opera con mente en pagina en blanco y asume responsabilidad radical sobre sus resultados, sin justificaciones.' },
                { title: 'Capitulo Dos (C2)', phase: 'FASE 2', color: 'var(--crear-gold)', bg: 'rgba(245,158,11,0.08)', desc: 'Ejecucion bajo presion, trabajo en equipo y rompimiento de barreras limitantes. Se instala autoconfianza inquebrantable y se erradica el individualismo mediante dinamicas de alto impacto.' },
                { title: 'Maestria del Juego (MJ) — Ciclo de 100 Dias', phase: 'FASE 3', color: '#a855f7', bg: 'rgba(168,85,247,0.08)', desc: '100 dias de ejecucion sostenida de Futuros Imposibles (FI), auditada mediante 4 Fines de Semana de Calibracion: 1FDS Creacion (Vision y EAI), 2FDS Relacion (Dinamica y Clima), 3FDS Gratitud (Servicio y Avance), 4FDS El Viaje (Consolidacion y Legado).' },
              ].map(item => (
                <div key={item.title} style={{ padding: '1.2rem', background: item.bg, borderRadius: '12px', borderLeft: `4px solid ${item.color}`, border: `1px solid var(--border-subtle)` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <strong style={{ color: item.color, fontSize: '1.05rem' }}>{item.title}</strong>
                    <span style={{ fontSize: '0.75rem', background: `${item.color}22`, color: item.color, padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 800 }}>{item.phase}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.6' }}>{item.desc}</p>
                </div>
              ))}
            </div>

            <h3 style={{ margin: '0 0 1rem 0', color: '#ef4444', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={20} color="#ef4444" /> 3. Simuladores de Presion (Entrenamientos Complementarios)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
              {[
                { color: 'var(--crear-gold)', title: 'Caida de Confianza / FI', desc: 'Circulo de Limpieza, caida en silencio y auditoria de metas en vivo.' },
                { color: 'var(--crear-blue)', title: 'Tanque', desc: 'Navegacion a ciegas por walkie-talkie y codigos sonoros; auditoria de ego y liderazgo.' },
                { color: '#ef4444', title: 'Rompimiento de Barreras', desc: '"El Monje y el Florero" e impacto fisico destructivo sobre la limitacion instalada.' },
                { color: '#a855f7', title: 'Caminata de Equipos', desc: 'Valla de honor, contacto visual profundo y traspaso formal de legado entre generaciones.' },
              ].map(item => (
                <div key={item.title} style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <strong style={{ color: item.color, display: 'block', marginBottom: '0.3rem' }}>{item.title}</strong>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PARTE II — OPERACIONES */}
      {activeTab === 'operaciones' && (
        <div style={{ display: 'grid', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2.25rem 2rem', borderRadius: '16px' }}>
            <SectionHeader icon={<Briefcase />} sup="PARTE II - OPERACIONES Y ROLES DEL STAFF" title="Hoja de Ruta Interna y Cadena de Mando" color="var(--crear-blue)" bg="rgba(0,210,255,0.12)" />
            <p style={{ margin: '0 0 1.75rem 0', lineHeight: '1.7', color: 'var(--text-main)', fontSize: '0.97rem' }}>
              Para sostener el estandar de <strong>"Cero Perdida de Informacion"</strong> y excelencia operativa, la estructura interna
              funciona bajo una matriz de responsabilidades clara, auditable y trazable a traves de Checklists rigurosos en Causa OS.
              <strong> Ningun proceso se deja a la memoria o a la improvisacion.</strong>
            </p>

            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--crear-blue)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={20} color="var(--crear-blue)" /> 1. Cadena de Mando y Ejecucion Operativa
            </h3>
            <div style={{ overflowX: 'auto', marginBottom: '2.25rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-card-hover)', borderBottom: '2px solid var(--border-subtle)' }}>
                    <th style={{ padding: '0.9rem 1rem', color: 'var(--crear-gold)', fontWeight: 800, minWidth: '160px' }}>Rol Estrategico</th>
                    <th style={{ padding: '0.9rem 1rem', color: 'var(--text-heading)', fontWeight: 800 }}>Responsabilidades Clave</th>
                    <th style={{ padding: '0.9rem 1rem', color: 'var(--crear-blue)', fontWeight: 800, minWidth: '170px' }}>Acceso en Causa OS</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { rol: 'Direccion Global', color: '#ec4899', resps: 'Gobierno estrategico de las 7 sedes. Audita en tiempo real accesos, KPIs y movimientos. Visibilidad total del sistema y puede simular cualquier rol para auditoria.', route: '/superadmin', btn: 'Panel Super Admin' },
                    { rol: 'Gerente de Sede', color: 'var(--crear-gold)', resps: 'Dirige la planeacion estrategica de su ciudad. Audita el cumplimiento de metas de enrolamiento, la salud financiera y los checklists globales. Primera autoridad en contingencias.', route: '/gerente', btn: 'Dashboard Gerencia' },
                    { rol: 'Coordinador C1 y C2', color: 'var(--crear-blue)', resps: 'Custodio de la logistica de Capitulos 1 y 2. Maneja registro, trazabilidad de datos, preparacion de sala y asegura el Grounding del equipo de apoyo.', route: '/checklist/coordinador_c1c2', btn: 'Checklist C1/C2' },
                    { rol: 'Director de Maestria', color: '#a855f7', resps: 'Lidera la ejecucion de los 100 dias de Maestria. Supervisa entrenadores, valida metas, gestiona EAIs y minimiza la desercion.', route: '/centro-managers', btn: 'Centro Managers' },
                    { rol: 'Capitan de Salon', color: '#eab308', resps: 'Guardian de la sala de entrenamiento. Audita el progreso diario de participantes, reporta estado animico, controla audio/video/logistica minuto a minuto.', route: '/checklist/capitan', btn: 'Checklist Capitan' },
                    { rol: 'Quantum Team (Staff)', color: '#10b981', resps: 'Equipo operativo de soporte en sala. Responsables de dinamicas fisicas, control de tiempos, seguridad perimetral y logistica durante los entrenamientos.', route: '/directorio-qt', btn: 'Directorio QT' },
                    { rol: 'CFO / Finanzas', color: '#f97316', resps: 'Custodia de los flujos financieros por sede. Reporta al Gerente y Direccion Global sobre balances, ingresos de enrolamiento y cumplimiento de metas economicas.', route: '/reportes', btn: 'Reportes' },
                  ].map(item => (
                    <tr key={item.rol} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '1rem', fontWeight: 800, color: item.color }}>{item.rol}</td>
                      <td style={{ padding: '1rem', color: 'var(--text-main)', lineHeight: '1.55', fontSize: '0.88rem' }}>{item.resps}</td>
                      <td style={{ padding: '1rem' }}>
                        <button onClick={() => navigate(item.route)} className="btn-secondary"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', width: '100%', justifyContent: 'center' }}>
                          {item.btn} <ExternalLink size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 style={{ margin: '0 0 1rem 0', color: '#22c55e', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckSquare size={20} color="#22c55e" /> 2. Estandarizacion a traves de Checklists
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <InfoCard color="var(--crear-gold)" title="Auditoria Global">
                Checklist Global que unifica criterios entre todas las sedes. La calidad de entrega es identica en cualquier pais, auditada en tiempo real desde Causa OS.
              </InfoCard>
              <InfoCard color="var(--crear-blue)" title="Control de Calidad por Fase">
                Cada rol firma y valida su propio Checklist antes, durante y despues de cada evento. Sin firma, no hay cierre de etapa.
              </InfoCard>
              <InfoCard color="#22c55e" title="Contingencia y Trazabilidad">
                El uso riguroso garantiza que ante cualquier cambio de personal, el sistema siga operando sin perdida de informacion ni caida de calidad.
              </InfoCard>
              <InfoCard color="#a855f7" title="Evidencias y Validacion">
                Cada tarea completada permite adjuntar enlace de evidencia (Google Drive, foto, formulario). Esto genera un rastro auditable completo de la operacion.
              </InfoCard>
            </div>

            <div style={{ padding: '1.5rem', background: 'var(--bg-card-hover)', borderRadius: '12px', borderLeft: '4px solid var(--crear-gold)', border: '1px solid var(--border-subtle)' }}>
              <h3 style={{ margin: '0 0 0.6rem 0', color: 'var(--crear-gold)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HeartHandshake size={20} color="var(--crear-gold)" /> 3. Cultura Organizacional — La Regla de Grounding
              </h3>
              <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.65' }}>
                El talento humano de <strong>CREAR PODER SIN LIMITES</strong> no solo ejecuta tareas; modela el liderazgo en cada interaccion.
              </p>
              <div style={{ padding: '0.85rem 1rem', background: 'rgba(245,158,11,0.08)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)' }}>
                <strong style={{ color: 'var(--crear-gold)' }}>Regla de Grounding:</strong>{' '}
                <span style={{ color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  Todo el equipo, desde el Gerente hasta el ultimo integrante del Quantum Team, debe pasar por un proceso de alineamiento
                  antes de tener contacto con los participantes. Esto garantiza que el 100% del staff opere bajo una sola vision,
                  rigor y protocolo de excelencia. <strong>No existen excepciones.</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PARTE III — PLATAFORMA CAUSA OS */}
      {activeTab === 'plataforma' && (
        <div style={{ display: 'grid', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2.25rem 2rem', borderRadius: '16px', border: '1px solid rgba(16,185,129,0.3)' }}>
            <SectionHeader icon={<Cpu />} sup="PARTE III - SISTEMA DIGITAL INTERNO" title="Causa OS — Centro Operativo Digital" color="#10b981" bg="rgba(16,185,129,0.12)" />
            <p style={{ margin: '0 0 1.5rem 0', lineHeight: '1.75', color: 'var(--text-main)', fontSize: '0.97rem' }}>
              <strong>Causa OS</strong> es la plataforma digital interna de CREAR PODER SIN LIMITES. Centraliza toda la gestion
              operativa del staff en tiempo real: checklists, metas, reportes, directorio de personas, auditoria de accesos
              y comunicacion entre roles. <strong>No es opcional: es el estandar operativo de todas las sedes.</strong>
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { icon: <Lock size={16} />, color: '#10b981', title: 'Acceso y Login', desc: 'Acceso exclusivo con correo corporativo (@crearpsl.net). Al ingresar, el sistema detecta automaticamente tu rol y sede, mostrando solo las herramientas de tu funcion.' },
                { icon: <Monitor size={16} />, color: '#10b981', title: 'Modo Dia / Noche / Auto', desc: 'La plataforma se adapta automaticamente al modo de pantalla (claro, oscuro o automatico). Todos los elementos son visibles en cualquier modo sin excepcion.' },
                { icon: <Bell size={16} />, color: '#10b981', title: 'Notificaciones y Alertas', desc: 'Alertas en tiempo real sobre tareas vencidas, mensajes del equipo, cambios de rol y actualizaciones de participantes. Las criticas se marcan en rojo para accion inmediata.' },
                { icon: <MessageSquare size={16} />, color: '#10b981', title: 'Comunicacion Directa', desc: 'Desde cualquier tarjeta de usuario puedes contactar directamente por Gmail, Google Chat o WhatsApp con un clic. Sin salir de la plataforma.' },
              ].map(item => (
                <div key={item.title} style={{ padding: '1.1rem', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <strong style={{ color: item.color, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>{item.icon} {item.title}</strong>
                  <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: '1.55' }}>{item.desc}</p>
                </div>
              ))}
            </div>

            <h3 style={{ margin: '0 0 1rem 0', color: '#10b981', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LayoutDashboard size={20} color="#10b981" /> Modulos Principales de Causa OS
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <ModuleCard icon={<LayoutDashboard />} color="var(--crear-gold)" title="Centro Operativo (Home)" badge="PRINCIPAL"
                desc="Panel de inicio con KPIs en vivo, resumen de tareas, accesos rapidos a todos los modulos y estado de conexion de tu equipo por sede."
                onClick={() => navigate('/')} />
              <ModuleCard icon={<CheckSquare />} color="var(--crear-blue)" title="Checklists Operativos"
                desc="Registro de cumplimiento diario y semanal con subida de evidencias, comentarios y porcentaje de avance por tarea, rol y sede."
                onClick={() => navigate('/checklist/coordinador_c1c2')} />
              <ModuleCard icon={<Target />} color="#f97316" title="Metas & KPIs"
                desc="Seguimiento de participantes sentados, aliados, apoyos en mesa, balance financiero y porcentaje de avance de enrolamiento en vivo."
                onClick={() => navigate('/metas')} />
              <ModuleCard icon={<Users />} color="#a855f7" title="Centro de Managers"
                desc="Control completo de los registros de Maestria del Juego: llamadas de seguimiento semanales, asignacion de entrenadores y metricas de retencion."
                onClick={() => navigate('/centro-managers')} />
              <ModuleCard icon={<BarChart3 />} color="#22c55e" title="Reportes & Analitica"
                desc="Dashboards de avance global, progreso por sede, cumplimiento de roles y tendencias del ciclo. Exportable para Direccion."
                onClick={() => navigate('/reportes')} />
              <ModuleCard icon={<TrendingUp />} color="#06b6d4" title="Embudo de Conversion"
                desc="Trazabilidad del funnel de enrolamiento: prospectos, citados, sentados y financiados. Vista en tiempo real por sede y etapa del ciclo."
                onClick={() => navigate('/embudo')} />
              <ModuleCard icon={<Shield />} color="#ec4899" title="Panel Super Admin"
                desc="Vista global de todas las sedes, roles y personas. Auditoria de accesos, cambios de rol e historial de conexiones. Solo para Direccion Global."
                onClick={() => navigate('/superadmin')} />
              <ModuleCard icon={<Zap />} color="var(--crear-gold)" title="Directorio QT"
                desc="Directorio oficial del Quantum Team en tiempo real, sincronizado con el Google Sheet maestro corporativo."
                onClick={() => navigate('/directorio-qt')} />
              <ModuleCard icon={<BookMarked />} color="#8b5cf6" title="Portafolio & Estrategia"
                desc="Repositorio de proyectos estrategicos, OKRs de ciclo y documentos de alineamiento institucional. Acceso por rol y sede."
                onClick={() => navigate('/portafolio')} />
              <ModuleCard icon={<Star />} color="#f59e0b" title="Dashboard de Excelencia"
                desc="Indicadores de desempeno individual y de equipo. Muestra quien esta en zona verde, amarilla o roja segun sus metricas del ciclo."
                onClick={() => navigate('/excelencia')} />
              <ModuleCard icon={<Calendar />} color="#10b981" title="Calendario de Equipo"
                desc="Vista mensual de eventos, entrenamientos, Fines de Semana de Calibracion y fechas clave del ciclo por sede."
                onClick={() => navigate('/calendario')} />
              <ModuleCard icon={<AlertOctagon />} color="#ef4444" title="Protocolo de Emergencias"
                desc="Modulo interactivo con los 7 pasos de oro, cadena de mando en crisis, matriz de gravedad y checklist de seguridad por sede."
                onClick={() => navigate('/protocolo-emergencias')} />
            </div>

            <div style={{ padding: '1.4rem', background: 'rgba(16,185,129,0.07)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)' }}>
              <h4 style={{ color: '#10b981', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} color="#10b981" /> Principios de Uso Obligatorio de Causa OS
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.6rem', fontSize: '0.87rem' }}>
                {[
                  'Completar tu checklist antes de finalizar cada jornada operativa.',
                  'Reportar cualquier incidente en el modulo de emergencias dentro de las 2 horas siguientes.',
                  'Actualizar el avance de metas al terminar cada sesion de enrolamiento.',
                  'No compartir credenciales ni acceder desde dispositivos no autorizados.',
                  'Subir evidencias en formato link (Google Drive) para validacion de tareas criticas.',
                  'Consultar el Directorio QT antes de cada entrenamiento para verificar asignaciones.',
                ].map(item => (
                  <div key={item} style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-card)', borderRadius: '6px', color: 'var(--text-main)', lineHeight: '1.5' }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GUIA POR ROL */}
      {activeTab === 'roles' && (
        <div style={{ display: 'grid', gap: '1.75rem' }}>
          {isQT && (
            <div className="glass-panel" style={{ padding: '2rem', border: '2px solid var(--crear-gold)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'var(--crear-gold)', color: '#000', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>RECURSO OFICIAL EXCLUSIVO QT</span>
                  <h3 style={{ color: 'var(--crear-gold)', margin: '0.6rem 0 0 0', fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <BookOpen size={22} color="var(--crear-gold)" /> Manual Cuantico Digital para Salas de Entrenamiento
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button onClick={() => navigate('/directorio-qt')} className="btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.2rem', fontWeight: 800, fontSize: '0.9rem', borderRadius: '8px', background: 'rgba(245,158,11,0.15)', color: 'var(--crear-gold)' }}>
                    Directorio QT
                  </button>
                  <a href="https://crearpsl.net/manual_quantum_team.html" target="_blank" rel="noopener noreferrer"
                    className="btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.4rem', textDecoration: 'none', fontWeight: 800, fontSize: '0.9rem', borderRadius: '8px' }}>
                    <BookOpen size={16} /> Manual QT Completo
                  </a>
                </div>
              </div>
              <p style={{ lineHeight: '1.65', color: 'var(--text-main)', margin: '0 0 1rem 0' }}>
                Como integrante del <strong>Quantum Team (QT)</strong>, representas el servicio mas puro y la presencia silenciosa de maximo poder.
                En el manual interactivo encontraras los protocolos de sala, postura correcta, atencion a dinamicas, logistica de materiales,
                apoyo al entrenador y custodia de la energia sin interrupciones.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', fontSize: '0.87rem' }}>
                {[
                  { title: 'Silencio Activo', desc: 'Cero conversaciones durante dinamicas. Tu presencia es poder silencioso.' },
                  { title: 'Control de Tiempos', desc: 'Sincroniza con el entrenador minuto a minuto. Nunca improvises.' },
                  { title: 'Perimetro de Sala', desc: 'Conoce y custodia cada salida. Nadie entra sin autorizacion del Coordinador.' },
                  { title: 'Logistica de Audio', desc: 'El volumen y las transiciones de musica son responsabilidad tuya.' },
                ].map(item => (
                  <div key={item.title} style={{ padding: '0.8rem', background: 'rgba(245,158,11,0.06)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <strong style={{ color: 'var(--crear-gold)', display: 'block', marginBottom: '0.2rem' }}>{item.title}</strong>
                    <span style={{ color: 'var(--text-muted)' }}>{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {['coord_c1', 'coord_c2', 'coordinador_c1c2', 'coordinador'].includes(role) && (
            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '5px solid var(--crear-blue)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Compass size={24} color="var(--crear-blue)" />
                <h3 style={{ color: 'var(--crear-blue)', margin: 0, fontSize: '1.3rem' }}>Guia para Coordinacion Capitulo 1 y 2</h3>
              </div>
              <p style={{ lineHeight: '1.65', color: 'var(--text-main)', marginBottom: '1.25rem' }}>
                Como <strong>Coordinador(a) C1/C2</strong>, lideras la manifestacion del entrenamiento junto a tus Capitanes de Salon y el Quantum Team.
                Tu foco absoluto esta en los participantes (Px Sentados), Aliados y Apoyos en Mesa. El sistema espera resultados auditables, no intenciones.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                {[
                  { icon: <Target size={16} />, color: 'var(--crear-blue)', title: 'Enrolamiento & Metas', desc: 'Divide las metas de Px sentados, aliados y apoyos. Actualiza el avance en el panel de metas despues de cada gestion.' },
                  { icon: <Users size={16} />, color: 'var(--crear-blue)', title: 'Liderazgo de QT & Capitanes', desc: 'Sincronizate con tus Capitanes y QT para que la sala este impecable en tiempo, logistica y acustica antes del inicio.' },
                  { icon: <Clock size={16} />, color: 'var(--crear-blue)', title: 'Tiempos & Checklist', desc: 'La puntualidad crea respeto. Completa tu checklist en Causa OS y sube evidencias con link para validacion de cada etapa.' },
                  { icon: <FileText size={16} />, color: 'var(--crear-blue)', title: 'Reportes e Incidentes', desc: 'Cualquier novedad debe reportarse en el sistema dentro de las 2 horas: baja de participante, incidente o cambio logistico.' },
                ].map(item => (
                  <div key={item.title} style={{ padding: '1rem', background: 'var(--bg-card-hover)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <h4 style={{ color: item.color, margin: '0 0 0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.93rem' }}>{item.icon} {item.title}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {['coord_maestria', 'coordinador_mj'].includes(role) && (
            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '5px solid #8b5cf6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Users size={24} color="#8b5cf6" />
                <h3 style={{ color: '#8b5cf6', margin: 0, fontSize: '1.3rem' }}>Guia para Coordinacion de Maestria del Juego</h3>
              </div>
              <p style={{ lineHeight: '1.65', color: 'var(--text-main)', marginBottom: '1.25rem' }}>
                Como <strong>Coordinador(a) de Maestria del Juego</strong>, lideras el Centro de Managers en tu sede.
                Asignas entrenadores, monitoreas el cumplimiento de llamadas semanales y garantizas las metricas de retencion durante los 100 dias.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', fontSize: '0.87rem' }}>
                {[
                  { title: 'Llamadas Semanales', desc: 'Verifica que cada entrenador registre las llamadas individuales y grupales. Sin registro, no hay metricas.' },
                  { title: 'Metricas de Retencion', desc: 'Monitor de asistencia a los 4 FDS de calibracion. Alerta al Director si un participante acumula 2 ausencias.' },
                  { title: 'Gestion de EAIs', desc: 'Supervisa los Equipos de Alto Impacto. Redistribuye participantes si un equipo esta en riesgo de desercion.' },
                  { title: 'Reportes a Direccion', desc: 'Entrega reporte semanal de avance al Director de Maestria y Gerente. Causa OS genera el resumen automaticamente.' },
                ].map(item => (
                  <div key={item.title} style={{ padding: '0.8rem', background: 'rgba(139,92,246,0.06)', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.2)' }}>
                    <strong style={{ color: '#8b5cf6', display: 'block', marginBottom: '0.2rem' }}>{item.title}</strong>
                    <span style={{ color: 'var(--text-muted)' }}>{item.desc}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '1.25rem' }}>
                <button onClick={() => navigate('/centro-managers')} className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.4rem', fontWeight: 700 }}>
                  Centro de Managers <ExternalLink size={14} />
                </button>
              </div>
            </div>
          )}

          {isGerente && (
            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '5px solid var(--crear-gold)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Shield size={24} color="var(--crear-gold)" />
                <h3 style={{ color: 'var(--crear-gold)', margin: 0, fontSize: '1.3rem' }}>Guia de Comando para Gerentes de Sede</h3>
              </div>
              <p style={{ lineHeight: '1.65', color: 'var(--text-main)', marginBottom: '1rem' }}>
                Como <strong>Gerente de Sede</strong>, eres el lider estrategico y custodio absoluto del exito financiero, operativo y humano de tu ciudad.
                Tu mirada es macro y tu intervencion es quirurgica cuando el sistema lo requiere.
              </p>
              <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.9', color: 'var(--text-muted)', margin: '0 0 1.25rem 0', fontSize: '0.92rem' }}>
                <li><strong>Setup de Ciclo & Metas:</strong> Configura desde el primer dia las metas de C1, C2 y MJ en el Panel de Metas. Distribuye equitativamente a las coordinadoras.</li>
                <li><strong>Supervision de Operaciones:</strong> Verifica que la sede cuente con contratos de sala, protocolos de emergencia y checklists activos antes del inicio de cada capitulo.</li>
                <li><strong>Auditoria en Tiempo Real:</strong> Monitorea el avance de checklists de coordinadores y capitanes en Causa OS. Si una tarea critica se atrasa, interviene de inmediato.</li>
                <li><strong>Salud Financiera:</strong> Revisa el balance de enrolamiento con el CFO semanal. Alerta a Direccion si se proyecta desviacion mayor al 15% de la meta economica.</li>
                <li><strong>Gestion de Crisis:</strong> Eres la primera autoridad en contingencias de tu sede. Activa el Protocolo de Emergencias y notifica a Direccion Global dentro de los primeros 30 minutos.</li>
              </ul>
              <button onClick={() => navigate('/gerente')} className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.4rem', fontWeight: 700 }}>
                Dashboard Gerencia <ExternalLink size={14} />
              </button>
            </div>
          )}

          {isDireccion && (
            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '5px solid #ec4899' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Award size={24} color="#ec4899" />
                <h3 style={{ color: '#ec4899', margin: 0, fontSize: '1.3rem' }}>Gobierno y Vision — Direccion Global & Super Admin</h3>
              </div>
              <p style={{ lineHeight: '1.65', color: 'var(--text-main)', marginBottom: '1.25rem' }}>
                Como <strong>Direccion Global</strong>, tienes la perspectiva macro de todas las sedes internacionales.
                Tu acceso es sin restricciones: puedes ver, auditar, simular y corregir cualquier aspecto del sistema en tiempo real.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                {[
                  { title: 'Auditoria en Tiempo Real', desc: 'Revisa el log de accesos, conexiones y movimientos. Cada login, cambio de rol y accion critica queda registrada con IP, dispositivo y timestamp.' },
                  { title: 'Simulacion de Roles', desc: 'Entra a la plataforma con la vista de cualquier colaborador para auditar su experiencia, resolver dudas o verificar que sus modulos funcionen correctamente.' },
                  { title: 'Consistencia Internacional', desc: 'Asegura que las 7 sedes operen bajo los mismos estandares de marca y rigor metodologico en cada ciclo.' },
                  { title: 'Contacto Directo', desc: 'Desde el Panel Super Admin puedes contactar a cualquier persona del equipo global via Gmail, Google Chat o WhatsApp con un solo clic.' },
                ].map(item => (
                  <div key={item.title} style={{ padding: '1rem', background: 'var(--bg-card-hover)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <strong style={{ color: '#ec4899', display: 'block', marginBottom: '0.3rem' }}>{item.title}</strong>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{item.desc}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '1.25rem' }}>
                <button onClick={() => navigate('/superadmin')} className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.4rem', fontWeight: 700 }}>
                  Panel Super Admin <ExternalLink size={14} />
                </button>
              </div>
            </div>
          )}

          {isCapitan && (
            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '5px solid #eab308' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Zap size={24} color="#eab308" />
                <h3 style={{ color: '#eab308', margin: 0, fontSize: '1.3rem' }}>Guia de Excelencia para Capitanes de Salon</h3>
              </div>
              <p style={{ lineHeight: '1.65', color: 'var(--text-main)', marginBottom: '1rem' }}>
                El <strong>Capitan de Salon</strong> es el guardian de la sala de entrenamiento. Su presencia sostenida y su lectura del ambiente
                marcan la diferencia entre una dinamica transformacional y una experiencia ordinaria.
              </p>
              <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.9', color: 'var(--text-muted)', margin: '0 0 1rem 0', fontSize: '0.92rem' }}>
                <li><strong>Sincronia con el Entrenador:</strong> Conoce la agenda minuto a minuto. Anticipa cambios de dinamicas, pausas y tiempos de bano sin interrupciones.</li>
                <li><strong>Audio, Iluminacion y Video:</strong> La musica es una herramienta emocional vital. Mantene el volumen calibrado y las transiciones fluidas y oportunas.</li>
                <li><strong>Protocolo de Emergencias:</strong> Ten siempre ubicado el botiquin, salidas de evacuacion y el checklist de seguridad. Accede desde Causa OS antes de cada sesion.</li>
                <li><strong>Reporte Diario:</strong> Al cerrar cada jornada, completa tu checklist en Causa OS e informa el estado animico del grupo al Coordinador.</li>
              </ul>
              <button onClick={() => navigate('/protocolo-emergencias')} className="btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.1rem', fontWeight: 700, fontSize: '0.88rem' }}>
                Revisar Protocolo de Emergencias <ExternalLink size={13} />
              </button>
            </div>
          )}

          {isEntrenador && (
            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '5px solid #10b981' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <PhoneCall size={24} color="#10b981" />
                <h3 style={{ color: '#10b981', margin: 0, fontSize: '1.3rem' }}>Guia para Entrenadores & Seguimiento de Managers</h3>
              </div>
              <p style={{ lineHeight: '1.65', color: 'var(--text-main)', marginBottom: '1rem' }}>
                En el <strong>Centro de Managers</strong>, mantene el seguimiento semanal de tus lideres asignados con rigor y constancia.
                Tu relacion con cada participante es el motor de retencion de los 100 dias.
              </p>
              <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.9', color: 'var(--text-muted)', margin: '0 0 1.25rem 0', fontSize: '0.92rem' }}>
                <li><strong>Registro de Llamadas:</strong> Marca con un clic la asistencia a llamadas individuales y grupales para que el sistema calcule los KPIs de retencion automaticamente.</li>
                <li><strong>Alineacion con Coordinacion:</strong> Comunica cualquier eventualidad o alerta sobre participantes a tu Coordinador de Maestria dentro del dia.</li>
                <li><strong>Reporte de Avance de FI:</strong> Actualiza semanalmente el estado de los Futuros Imposibles de tus managers en el Centro de Managers.</li>
              </ul>
              <button onClick={() => navigate('/centro-managers')} className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.4rem', fontWeight: 700 }}>
                Centro de Managers <ExternalLink size={14} />
              </button>
            </div>
          )}

          {/* Accesos rapidos para todos */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: 0, fontSize: '1.15rem' }}>
              <CheckSquare size={20} color="var(--crear-gold)" /> Accesos Rapidos a Modulos de Causa OS
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.9rem', marginTop: '1rem' }}>
              {[
                { icon: '📋', color: 'var(--crear-gold)', label: 'Mi Checklist', route: '/checklist/coordinador_c1c2', desc: 'Cumplimiento diario/semanal con evidencias.' },
                { icon: '🎯', color: '#f97316', label: 'Mis Metas & KPIs', route: '/metas', desc: 'Avance de participantes y enrolamiento.' },
                { icon: '👥', color: '#a855f7', label: 'Centro Managers', route: '/centro-managers', desc: 'Maestria, llamadas y retencion 100 dias.' },
                { icon: '📈', color: '#22c55e', label: 'Reportes', route: '/reportes', desc: 'Dashboards por sede, rol y ciclo.' },
                { icon: '⚡', color: 'var(--crear-gold)', label: 'Directorio QT', route: '/directorio-qt', desc: 'Equipo Quantum en tiempo real.' },
                { icon: '🚨', color: '#ef4444', label: 'Protocolo Crisis', route: '/protocolo-emergencias', desc: '7 pasos de actuacion en emergencias.' },
              ].map(item => (
                <button key={item.label} onClick={() => navigate(item.route)} className="hover-glow"
                  style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-subtle)', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{item.icon}</div>
                  <strong style={{ color: item.color, display: 'block', fontSize: '0.92rem' }}>{item.label}</strong>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEGURIDAD & CRISIS */}
      {activeTab === 'seguridad' && (
        <div className="glass-panel" style={{ padding: '2.5rem 2rem', border: '2px solid rgba(239,68,68,0.4)', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertOctagon size={26} color="#ef4444" />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ef4444', letterSpacing: '1px', textTransform: 'uppercase' }}>DIRECTIVA INSTITUCIONAL OBLIGATORIA</span>
              <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--text-heading)', fontWeight: 800 }}>
                Protocolo de Seguridad & Manejo de Emergencias en Salon
              </h2>
            </div>
            <button onClick={() => navigate('/protocolo-emergencias')} className="btn-primary"
              style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff', padding: '0.55rem 1rem', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
              Modulo Interactivo
            </button>
          </div>

          <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.65' }}>
            Guia oficial e inviolable para la gestion de contingencias medicas, contencion emocional, evacuacion de salones y seguridad integral
            durante entrenamientos presenciales (C1, C2, MJ) en todas las sedes internacionales.
            <strong> Conocerla es obligatorio. Aplicarla es tu responsabilidad.</strong>
          </p>

          <div style={{ display: 'grid', gap: '1.75rem' }}>
            <div>
              <h3 style={{ color: 'var(--crear-gold)', margin: '0 0 1rem 0', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={20} color="var(--crear-gold)" /> 1. Los 7 Pasos de Actuacion en Sala
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {[
                  { step: '1', title: 'Detectar y Avisar', desc: 'El entrenador o capitan detecta el suceso y comunica en voz baja o senal: "Emergencia en [punto de sala], coordinador requerido".' },
                  { step: '2', title: 'Asumir el Mando', desc: 'El coordinador o capitan designado toma el mando absoluto. Asigna funciones directas a cada integrante del staff para evitar el caos.' },
                  { step: '3', title: 'Proteger la Escena', desc: 'Se crea un perimetro de seguridad alrededor del participante. Cero aglomeraciones, cero fotos y cero exposicion publica del estado del afectado.' },
                  { step: '4', title: 'Evaluar y Solicitar Apoyo', desc: 'El coordinador convoca inmediatamente a enfermeria o brigadista. Las maniobras corresponden UNICAMENTE a personal capacitado y certificado.' },
                  { step: '5', title: 'Retirar al Participante (Si Procede)', desc: 'Si puede movilizarse con seguridad, se traslada a la enfermeria. Si hay sospecha de trauma craneal, cervical o columnar: NO se mueve hasta llegada medica.' },
                  { step: '6', title: 'Continuar el Entrenamiento', desc: 'Aislada la situacion, el entrenador retoma la dinamica manteniendo la calma del grupo. Prohibido divulgar datos medicos confidenciales.' },
                  { step: '7', title: 'Trasladar, Notificar y Registrar', desc: 'El personal de salud define el traslado. Logistica avisa al contacto de emergencia, activa el seguro y completa el Reporte de Incidentes en Causa OS.' },
                ].map(item => (
                  <div key={item.step} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--crear-gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem', flexShrink: 0 }}>
                      {item.step}
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-heading)', fontSize: '0.93rem' }}>{item.title}: </strong>
                      <span style={{ color: 'var(--text-main)', fontSize: '0.88rem', lineHeight: '1.55' }}>{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 style={{ color: 'var(--crear-gold)', margin: '0 0 1rem 0', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={20} color="var(--crear-gold)" /> 2. Matriz de Escalamiento por Gravedad
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                {[
                  { level: '1. Atencion en Sede', dot: '🟢', color: '#22c55e', bg: 'rgba(52,168,83,0.06)', border: 'rgba(52,168,83,0.3)', desc: 'Malestar leve, mareo pasajero, golpe menor o herida superficial. Manejo interno con hidratacion, descanso y autorizacion de enfermeria.' },
                  { level: '2. Derivacion Medica', dot: '🟡', color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.3)', desc: 'Desmayo, esguince severo, fractura probable, herida profunda, golpe en cabeza o dolor intenso. Traslado a centro asistencial de referencia.' },
                  { level: '3. Codigo Rojo — Emergencia Vital', dot: '🔴', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.4)', desc: 'Inconsciencia, ausencia de respiracion, sangrado abundante, convulsion prolongada o dolor toracico. Llamada inmediata al 911 / 106 / 123.' },
                ].map(item => (
                  <div key={item.level} style={{ padding: '1rem', background: item.bg, borderRadius: '8px', border: `1px solid ${item.border}` }}>
                    <h4 style={{ color: item.color, margin: '0 0 0.5rem 0', fontSize: '0.97rem' }}>{item.dot} {item.level}</h4>
                    <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-main)', lineHeight: '1.55' }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '1.3rem', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)' }}>
              <h3 style={{ color: '#ef4444', margin: '0 0 0.8rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertOctagon size={18} color="#ef4444" /> 3. Reglas Inviolables de Seguridad (Cero Excepciones)
              </h3>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.55' }}>
                <li><strong>NO suministrar medicamentos</strong> (ni analgesicos) sin prescripcion medica o autorizacion profesional directa.</li>
                <li><strong>NO levantar ni trasladar</strong> a una persona con posible traumatismo de cabeza, cuello o columna.</li>
                <li><strong>NO permitir grabaciones, fotos ni comentarios</strong> sobre el estado de salud del participante afectado.</li>
                <li><strong>NO prometer coberturas economicas</strong> ni emitir diagnosticos; todo se tramita con el seguro y la Direccion.</li>
                <li><strong>UNICA voz de mando:</strong> el coordinador o capitan designado. Cero discrepancias frente al salon.</li>
                <li><strong>REGISTRAR todo en Causa OS</strong> dentro de las 2 horas del incidente con los datos del afectado y las acciones tomadas.</li>
              </ul>
            </div>

            <div style={{ padding: '1.25rem', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ color: 'var(--crear-gold)', margin: '0 0 0.75rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PhoneCall size={18} color="var(--crear-gold)" /> Directorio Oficial de Emergencias por Sede
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem', fontSize: '0.87rem' }}>
                {[
                  { flag: 'Ecuador', label: 'Quito, Guayaquil, Cuenca', number: '911 (ECU 911)' },
                  { flag: 'Peru', label: 'Lima', number: '106 (SAMU) / 116 / 105' },
                  { flag: 'Colombia', label: 'Medellin', number: '123 (Emergencias)' },
                  { flag: 'Mexico', label: 'Mexico (CDMX)', number: '911 (Emergencias)' },
                ].map(item => (
                  <div key={item.label} style={{ padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                    <div style={{ color: 'var(--text-heading)', fontWeight: 700, marginBottom: '0.2rem' }}>
                      <FlagIcon country={item.flag} size={15} /> {item.label}:
                    </div>
                    <strong style={{ color: '#ef4444', fontSize: '1rem' }}>{item.number}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="glass-panel" style={{ marginTop: '2.5rem', padding: '2rem', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
        <h4 style={{ color: 'var(--crear-gold)', margin: '0 0 0.4rem 0', fontSize: '1.1rem' }}>
          Requieres Soporte Tecnico o Tienes Sugerencias?
        </h4>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0 0 1.25rem 0' }}>
          El equipo de Tecnologia & Sistemas esta a tu disposicion para optimizar continuamente la plataforma Causa OS.
        </p>
        <a href="mailto:sistemas@crearpsl.net?subject=Soporte%20y%20Mejora%20Plataforma%20Causa%20OS"
          className="btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.75rem 1.75rem', fontWeight: 700, borderRadius: '8px' }}>
          <HelpCircle size={18} /> Contactar a Sistemas (sistemas@crearpsl.net)
        </a>
      </div>

    </div>
  );
}
