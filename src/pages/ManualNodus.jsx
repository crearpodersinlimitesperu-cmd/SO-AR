import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, Search, ShieldCheck, Users, 
  BarChart3, Settings, TrendingUp, CheckCircle, Zap,
  FileText, Anchor, Activity, Server,
  MousePointer2, ExternalLink, Sparkles, AlertTriangle,
  Clock, Flame, Award, HelpCircle, Layers, CheckSquare,
  BookOpen, ChevronRight, Copy, Check
} from 'lucide-react';
import {
  MANIFIESTO_GOBERNANZA,
  ESTRUCTURA_DIRECTIVA_GLOBAL,
  NIVELES_EXCELENCIA,
  VESTIMENTA_2026,
  SOP_OPERATIVO_SEMANAL,
  CATALOGO_KPIS_NODUS,
  TRIGGERS_BACKEND,
  PALANCAS_PX,
  FILOSOFIA_RUBIN,
  NODUS_CAPITULOS_PASO_A_PASO,
  CHECKLISTS_POR_PUESTO
} from '../data/nodusIntegratedKnowledge';

export default function ManualNodus() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState('gobernanza');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPuesto, setSelectedPuesto] = useState('Mesa de Registro');
  const [copiedId, setCopiedId] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtro de búsqueda unificado
  const normalizedSearch = searchTerm.toLowerCase().trim();

  // Búsqueda en Capítulos de Nodus
  const filteredCapitulos = useMemo(() => {
    if (!normalizedSearch) return NODUS_CAPITULOS_PASO_A_PASO;
    return NODUS_CAPITULOS_PASO_A_PASO.filter(cap => 
      cap.titulo.toLowerCase().includes(normalizedSearch) ||
      cap.modulo.toLowerCase().includes(normalizedSearch) ||
      cap.descripcion.toLowerCase().includes(normalizedSearch) ||
      cap.pasos.some(p => p.toLowerCase().includes(normalizedSearch)) ||
      cap.tags.some(t => t.toLowerCase().includes(normalizedSearch))
    );
  }, [normalizedSearch]);

  // Búsqueda en KPIs
  const filteredKPIs = useMemo(() => {
    if (!normalizedSearch) return CATALOGO_KPIS_NODUS;
    return CATALOGO_KPIS_NODUS.filter(kpi => 
      kpi.id.toLowerCase().includes(normalizedSearch) ||
      kpi.nombre.toLowerCase().includes(normalizedSearch) ||
      kpi.formula.toLowerCase().includes(normalizedSearch) ||
      kpi.origen.toLowerCase().includes(normalizedSearch)
    );
  }, [normalizedSearch]);

  // Búsqueda en Triggers
  const filteredTriggers = useMemo(() => {
    if (!normalizedSearch) return TRIGGERS_BACKEND;
    return TRIGGERS_BACKEND.filter(tr => 
      tr.nombre.toLowerCase().includes(normalizedSearch) ||
      tr.condicion.toLowerCase().includes(normalizedSearch) ||
      tr.accion.toLowerCase().includes(normalizedSearch) ||
      tr.explicacion.toLowerCase().includes(normalizedSearch)
    );
  }, [normalizedSearch]);

  // Búsqueda en Niveles
  const filteredNiveles = useMemo(() => {
    if (!normalizedSearch) return NIVELES_EXCELENCIA;
    return NIVELES_EXCELENCIA.filter(niv => 
      niv.rol.toLowerCase().includes(normalizedSearch) ||
      niv.jerarquia.toLowerCase().includes(normalizedSearch) ||
      niv.descripcion.toLowerCase().includes(normalizedSearch)
    );
  }, [normalizedSearch]);

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '5rem', minHeight: '100vh' }}>
      
      {/* BOTÓN REGRESAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => navigate('/')} 
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
        >
          <ArrowLeft size={18} /> Volver al Tablero Principal
        </button>

        <a 
          href="https://imo.crearpslglobal.com/auth/login" 
          target="_blank" 
          rel="noreferrer"
          className="btn-primary"
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.6rem', 
            padding: '0.6rem 1.2rem', 
            fontSize: '0.95rem',
            background: 'linear-gradient(135deg, #10b981, #047857)',
            border: 'none',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
          }}
        >
          <ExternalLink size={18} /> Abrir Plataforma Nodus (imo.crearpslglobal.com)
        </a>
      </div>

      {/* HEADER PRINCIPAL */}
      <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '16px', marginBottom: '2rem', borderTop: '4px solid var(--crear-gold)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <span style={{ 
            background: 'rgba(212, 175, 55, 0.15)', 
            color: 'var(--crear-gold)', 
            padding: '0.35rem 0.85rem', 
            borderRadius: '20px', 
            fontSize: '0.85rem', 
            fontWeight: 'bold',
            border: '1px solid rgba(212, 175, 55, 0.4)'
          }}>
            CREAR PODER SIN LÍMITES • EDICIÓN OFICIAL 2026
          </span>
          <span style={{ 
            background: 'rgba(16, 185, 129, 0.15)', 
            color: '#10b981', 
            padding: '0.35rem 0.85rem', 
            borderRadius: '20px', 
            fontSize: '0.85rem', 
            fontWeight: 'bold' 
          }}>
            GOBERNANZA SISTÉMICA V1.0 + 18 CAPÍTULOS NODUS
          </span>
        </div>

        <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '2.3rem', fontWeight: 800 }}>
          Centro de Operaciones y Gobernanza Nodus + Causa OS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.15rem', maxWidth: '900px', lineHeight: 1.6, margin: 0 }}>
          Manual unificado de directrices, flujos y gobernanza para la operación de sala y plataforma en toda Latinoamérica.
          Trazabilidad matemática en Nodus y dirección estratégica en Causa OS.
        </p>

        {/* BUSCADOR UNIVERSAL */}
        <div style={{ 
          marginTop: '2rem', 
          display: 'flex', 
          gap: '1rem', 
          alignItems: 'center', 
          background: 'rgba(0,0,0,0.5)', 
          padding: '0.9rem 1.3rem', 
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Search className="text-gold" size={24} />
          <input 
            type="text" 
            placeholder="Buscar por procedimiento, rol, KPI, trigger (ej: palabra rota, zapatillas, arqueo, 4.5m, Paul Sosa)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '1.05rem',
              outline: 'none'
            }}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              style={{ background: 'transparent', border: 'none', color: 'var(--crear-gold)', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* PESTAÑAS PRINCIPALES */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {[
          { id: 'gobernanza', label: '🏛️ Gobernanza & Manifiesto', desc: 'Principios y Filosofía' },
          { id: 'estructura', label: '👥 9 Niveles & Vestimenta 2026', desc: 'Jerarquía y Dress Code' },
          { id: 'sop', label: '⏱️ SOP Semanal & El Viaje', desc: 'Cronograma y Sala' },
          { id: 'kpis', label: '📊 14 KPIs & Triggers', desc: 'Metas y Automatizaciones' },
          { id: 'operativo', label: '💻 Manual Nodus (18 Caps)', desc: 'Paso a paso en plataforma' },
          { id: 'checklists', label: '📋 Checklists & Flujos', desc: 'Listas de cotejo por puesto' }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.9rem 1.4rem',
                borderRadius: '12px',
                border: isActive ? '2px solid var(--crear-gold)' : '1px solid rgba(255,255,255,0.08)',
                background: isActive ? 'rgba(212, 175, 55, 0.12)' : 'rgba(0,0,0,0.3)',
                color: isActive ? 'var(--crear-gold)' : '#fff',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{tab.label}</div>
              <div style={{ fontSize: '0.78rem', color: isActive ? 'var(--crear-gold)' : 'rgba(255,255,255,0.5)', marginTop: '0.2rem' }}>{tab.desc}</div>
            </button>
          );
        })}
      </div>

      {/* CONTENIDO DE CADA PESTAÑA */}

      {/* TAB 1: GOBERNANZA & MANIFIESTO */}
      {activeTab === 'gobernanza' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Manifiesto y Capas */}
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', borderLeft: '4px solid var(--crear-gold)' }}>
            <h2 style={{ color: 'var(--crear-gold)', margin: '0 0 0.5rem 0', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={22} /> {MANIFIESTO_GOBERNANZA.titulo}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', marginBottom: '1.5rem' }}>
              {MANIFIESTO_GOBERNANZA.subtitulo} • <em>"{MANIFIESTO_GOBERNANZA.principioRector}"</em>
            </p>

            <div style={{ background: 'rgba(212, 175, 55, 0.08)', padding: '1rem 1.5rem', borderRadius: '10px', border: '1px solid rgba(212, 175, 55, 0.2)', marginBottom: '1.5rem', fontWeight: 600, color: 'var(--crear-gold)' }}>
              Fórmula Simbiótica: {MANIFIESTO_GOBERNANZA.formula}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {MANIFIESTO_GOBERNANZA.capas.map((capa, idx) => (
                <div key={idx} style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 style={{ color: idx === 0 ? '#10b981' : 'var(--crear-blue)', margin: '0 0 0.75rem 0', fontSize: '1.2rem' }}>
                    {capa.nombre}
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                    {capa.rol}
                  </p>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '8px', borderLeft: '3px solid var(--crear-gold)' }}>
                    <strong style={{ color: 'var(--crear-gold)', fontSize: '0.85rem', display: 'block', marginBottom: '0.3rem' }}>REGLA DE ORO:</strong>
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.88rem', lineHeight: 1.5 }}>{capa.reglaDeOro}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 10 Palancas de PX */}
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', borderLeft: '4px solid var(--crear-blue)' }}>
            <h2 style={{ color: 'var(--crear-blue)', margin: '0 0 0.5rem 0', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={22} /> Las 10 Palancas de la Experiencia del Cliente (PX)
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Protocolos de servicio de alto impacto para sostener la energía y el contenedor emocional.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {PALANCAS_PX.map(p => (
                <div key={p.num} style={{ background: 'rgba(0,0,0,0.25)', padding: '1.2rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                    <span style={{ background: 'var(--crear-blue)', color: '#000', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      {p.num}
                    </span>
                    <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{p.titulo}</strong>
                  </div>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                    {p.detalle}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Filosofía Rick Rubin */}
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', borderLeft: '4px solid #a855f7' }}>
            <h2 style={{ color: '#a855f7', margin: '0 0 0.5rem 0', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame size={22} /> Filosofía de Creación de Rick Rubin en CPSL
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Principios de producción creativa y rigor militar aplicados al liderazgo transformacional.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {FILOSOFIA_RUBIN.map((item, idx) => (
                <div key={idx} style={{ background: 'rgba(0,0,0,0.25)', padding: '1.2rem', borderRadius: '10px', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
                  <h4 style={{ color: 'var(--crear-gold)', margin: '0 0 0.4rem 0', fontSize: '1.05rem' }}>
                    {item.pilar}
                  </h4>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                    {item.descripcion}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: ESTRUCTURA 9 NIVELES & VESTIMENTA */}
      {activeTab === 'estructura' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Estructura Directiva Global y Aviso de Subdirector */}
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', borderLeft: '4px solid var(--crear-gold)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ color: 'var(--crear-gold)', margin: 0, fontSize: '1.5rem' }}>
                  Estructura Directiva Global — {ESTRUCTURA_DIRECTIVA_GLOBAL.empresa}
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', margin: '0.3rem 0 0 0' }}>
                  Liderazgo corporativo y toma de decisiones a nivel regional.
                </p>
              </div>

              <div style={{ 
                background: 'rgba(239, 68, 68, 0.15)', 
                border: '1px solid rgba(239, 68, 68, 0.4)', 
                padding: '0.75rem 1.25rem', 
                borderRadius: '10px',
                maxWidth: '480px'
              }}>
                <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                  <AlertTriangle size={16} /> RESOLUCIÓN ESTRUCTURAL 2026:
                </div>
                <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                  {ESTRUCTURA_DIRECTIVA_GLOBAL.reglaSubdirector}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {ESTRUCTURA_DIRECTIVA_GLOBAL.directiva.map((dir, idx) => (
                <div key={idx} style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ color: 'var(--crear-gold)', fontWeight: 'bold', fontSize: '1.1rem' }}>{dir.titular}</div>
                  <div style={{ color: 'var(--crear-blue)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>{dir.cargo}</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>{dir.alcance}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Los 9 Niveles de Excelencia */}
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', borderLeft: '4px solid #10b981' }}>
            <h2 style={{ color: '#10b981', margin: '0 0 0.5rem 0', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={22} /> Los 9 Niveles de Excelencia Organizacional (2026)
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Jerarquía operativa unificada de sala, seguimiento y soporte administrativo.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredNiveles.map(niv => (
                <div key={niv.nivel} style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  padding: '1.25rem 1.5rem', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1.2rem'
                }}>
                  <div style={{ 
                    background: niv.nivel >= 7 ? 'var(--crear-gold)' : niv.nivel >= 5 ? 'var(--crear-blue)' : '#10b981', 
                    color: '#000', 
                    fontWeight: 800, 
                    fontSize: '1.1rem',
                    minWidth: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {niv.nivel}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                      <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>{niv.rol}</h3>
                      <span style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem' }}>
                        {niv.jerarquia}
                      </span>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 0.5rem 0' }}>
                      {niv.descripcion}
                    </p>
                    <div style={{ fontSize: '0.82rem', color: 'var(--crear-gold)' }}>
                      <strong>Requisitos / Selección:</strong> {niv.requisitos}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Códigos de Vestimenta 2026 */}
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', borderLeft: '4px solid var(--crear-gold)' }}>
            <h2 style={{ color: 'var(--crear-gold)', margin: '0 0 0.5rem 0', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={22} /> Protocolo de Impecabilidad Visual (Códigos de Vestimenta 2026)
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Especificación oficial por día y por función. La pulcritud externa manifiesta el orden interno.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              
              {/* Entrenador */}
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                <div style={{ color: 'var(--crear-gold)', fontWeight: 'bold', fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                  {VESTIMENTA_2026.entrenador.rol}
                </div>
                <p style={{ color: '#fff', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                  {VESTIMENTA_2026.entrenador.norma}
                </p>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.85rem', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                  <strong style={{ color: '#10b981', fontSize: '0.82rem', display: 'block', marginBottom: '0.2rem' }}>
                    AUTORIZACIÓN DE CALZADO (CUIDADO DE ENERGÍA):
                  </strong>
                  <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                    {VESTIMENTA_2026.entrenador.calzadoPermitido}
                  </span>
                </div>
              </div>

              {/* Aliados */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ color: 'var(--crear-blue)', fontWeight: 'bold', fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                  {VESTIMENTA_2026.aliados.rol}
                </div>
                <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                  <div style={{ marginBottom: '0.5rem' }}><strong style={{ color: 'var(--crear-gold)' }}>Viernes:</strong> {VESTIMENTA_2026.aliados.viernes}</div>
                  <div style={{ marginBottom: '0.5rem' }}><strong style={{ color: 'var(--crear-gold)' }}>Sábado:</strong> {VESTIMENTA_2026.aliados.sabado}</div>
                  <div><strong style={{ color: 'var(--crear-gold)' }}>Domingo:</strong> {VESTIMENTA_2026.aliados.domingo}</div>
                </div>
              </div>

              {/* Capitanes */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ color: '#a855f7', fontWeight: 'bold', fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                  {VESTIMENTA_2026.capitanes.rol}
                </div>
                <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                  <div style={{ marginBottom: '0.5rem' }}><strong style={{ color: 'var(--crear-gold)' }}>Jueves/Viernes:</strong> {VESTIMENTA_2026.capitanes.juevesViernes}</div>
                  <div style={{ marginBottom: '0.5rem' }}><strong style={{ color: 'var(--crear-gold)' }}>Sábado:</strong> {VESTIMENTA_2026.capitanes.sabado}</div>
                  <div><strong style={{ color: 'var(--crear-gold)' }}>Domingo:</strong> {VESTIMENTA_2026.capitanes.domingo}</div>
                </div>
              </div>

              {/* Quantum Team (QT) */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ color: '#0ea5e9', fontWeight: 'bold', fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                  {VESTIMENTA_2026.qt.rol}
                </div>
                <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                  <div style={{ marginBottom: '0.5rem' }}><strong style={{ color: 'var(--crear-gold)' }}>Viernes:</strong> {VESTIMENTA_2026.qt.viernes}</div>
                  <div style={{ marginBottom: '0.5rem' }}><strong style={{ color: 'var(--crear-gold)' }}>Sábado:</strong> {VESTIMENTA_2026.qt.sabado}</div>
                  <div><strong style={{ color: 'var(--crear-gold)' }}>Domingo:</strong> {VESTIMENTA_2026.qt.domingo}</div>
                </div>
              </div>

              {/* Mánagers */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                  {VESTIMENTA_2026.managers.rol}
                </div>
                <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                  <div style={{ marginBottom: '0.5rem' }}><strong style={{ color: 'var(--crear-gold)' }}>Viernes:</strong> {VESTIMENTA_2026.managers.viernes}</div>
                  <div style={{ marginBottom: '0.5rem' }}><strong style={{ color: 'var(--crear-gold)' }}>Sábado:</strong> {VESTIMENTA_2026.managers.sabado}</div>
                  <div><strong style={{ color: 'var(--crear-gold)' }}>Domingo:</strong> {VESTIMENTA_2026.managers.domingo}</div>
                </div>
              </div>

              {/* Oficina y Soporte */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                  {VESTIMENTA_2026.oficina.rol}
                </div>
                <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                  <div style={{ marginBottom: '0.5rem' }}><strong style={{ color: 'var(--crear-gold)' }}>Eventos:</strong> {VESTIMENTA_2026.oficina.eventos}</div>
                  <div><strong style={{ color: 'var(--crear-gold)' }}>Diario:</strong> {VESTIMENTA_2026.oficina.diario}</div>
                </div>
              </div>

            </div>
          </div>

          {/* MATRIZ DE HORARIOS DE SALA Y VESTIMENTAS POR DÍA */}
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', borderLeft: '4px solid var(--crear-cyan)' }}>
            <h2 style={{ color: 'var(--crear-cyan)', margin: '0 0 0.5rem 0', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={24} /> Matriz Oficial de Horarios de Sala y Código de Vestimenta
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Horarios innegociables de ingreso, recesos, noches de quiebre y vestimenta obligatoria por día para cada nivel de la experiencia CPSL.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '1.5rem' }}>
              
              {/* C1 */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.4rem', borderRadius: '12px', borderTop: '4px solid #8b5cf6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                  <h3 style={{ color: '#a78bfa', margin: 0, fontSize: '1.15rem' }}>Capítulo UNO (C1)</h3>
                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd', fontWeight: 'bold' }}>Descubrimiento</span>
                </div>
                <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                      <th style={{ padding: '0.4rem 0' }}>DÍA</th>
                      <th style={{ padding: '0.4rem 0' }}>HORARIO</th>
                      <th style={{ padding: '0.4rem 0', textAlign: 'right' }}>VESTIMENTA</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Jueves</td>
                      <td style={{ padding: '0.5rem 0', color: 'rgba(255,255,255,0.7)' }}>4:30 PM - Cierre</td>
                      <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>Negro</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Viernes</td>
                      <td style={{ padding: '0.5rem 0', color: 'rgba(255,255,255,0.7)' }}>7:30 AM - 3 PM<br/><span style={{ color: '#a78bfa' }}>5 PM - Cierre (Noche Confianza)</span></td>
                      <td style={{ padding: '0.5rem 0', textAlign: 'right', color: '#f59e0b', fontWeight: 'bold' }}>Negro formal</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Sábado</td>
                      <td style={{ padding: '0.5rem 0', color: 'rgba(255,255,255,0.7)' }}>8:00 AM - 4 PM<br/>3:00 PM - Cierre</td>
                      <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>Polo / pantalón negro</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Domingo</td>
                      <td style={{ padding: '0.5rem 0', color: 'rgba(255,255,255,0.7)' }}>8:00 AM - Cierre (Graduación)</td>
                      <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>Polo / pantalón negro</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* C2 */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.4rem', borderRadius: '12px', borderTop: '4px solid #29abe2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                  <h3 style={{ color: 'var(--crear-cyan)', margin: 0, fontSize: '1.15rem' }}>Capítulo DOS (C2)</h3>
                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(41, 171, 226, 0.2)', color: '#7dd3fc', fontWeight: 'bold' }}>Avanzado</span>
                </div>
                <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                      <th style={{ padding: '0.4rem 0' }}>DÍA</th>
                      <th style={{ padding: '0.4rem 0' }}>HORARIO</th>
                      <th style={{ padding: '0.4rem 0', textAlign: 'right' }}>VESTIMENTA</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Jueves</td>
                      <td style={{ padding: '0.5rem 0', color: 'rgba(255,255,255,0.7)' }}>10:30 AM - 4 PM<br/>4:00 PM - Cierre</td>
                      <td style={{ padding: '0.5rem 0', textAlign: 'right', color: '#f59e0b', fontWeight: 'bold' }}>Negro formal</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Viernes</td>
                      <td style={{ padding: '0.5rem 0', color: 'rgba(255,255,255,0.7)' }}>7:15 AM - 4 PM<br/>4:00 PM - Cierre</td>
                      <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>Polo / pantalón negro</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Sábado</td>
                      <td style={{ padding: '0.5rem 0', color: 'rgba(255,255,255,0.7)' }}>7:30 AM - 3 PM<br/>3:00 PM - Cierre</td>
                      <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>Polo / pantalón negro</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Domingo</td>
                      <td style={{ padding: '0.5rem 0', color: 'rgba(255,255,255,0.7)' }}>Inicio - Cierre<br/>3:00 PM - Cierre</td>
                      <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>Polo / pantalón negro</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* MJ */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.4rem', borderRadius: '12px', borderTop: '4px solid #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                  <h3 style={{ color: '#f59e0b', margin: 0, fontSize: '1.15rem' }}>Maestría del Juego</h3>
                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.2)', color: '#fde68a', fontWeight: 'bold' }}>Liderazgo</span>
                </div>
                <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                      <th style={{ padding: '0.4rem 0' }}>DÍA</th>
                      <th style={{ padding: '0.4rem 0' }}>HORARIO</th>
                      <th style={{ padding: '0.4rem 0', textAlign: 'right' }}>VESTIMENTA</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Viernes</td>
                      <td style={{ padding: '0.5rem 0', color: 'rgba(255,255,255,0.7)' }}>3:00 PM - 9:00 PM (Alineamiento)</td>
                      <td style={{ padding: '0.5rem 0', textAlign: 'right', color: '#f59e0b', fontWeight: 'bold' }}>Negro formal</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Sábado</td>
                      <td style={{ padding: '0.5rem 0', color: 'rgba(255,255,255,0.7)' }}>8:30 AM - 12 PM<br/>4:00 PM - 9:00 PM</td>
                      <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>Camiseta / pantalón negro</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Domingo</td>
                      <td style={{ padding: '0.5rem 0', color: 'rgba(255,255,255,0.7)' }}>8:30 AM - 12 PM<br/>4:00 PM - Cierre (FDS 4 El Viaje)</td>
                      <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>Camiseta / pantalón negro</td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* TAB 3: SOP OPERATIVO SEMANAL & EL VIAJE */}
      {activeTab === 'sop' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Ritmo Semanal */}
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', borderLeft: '4px solid var(--crear-blue)' }}>
            <h2 style={{ color: 'var(--crear-blue)', margin: '0 0 0.5rem 0', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={22} /> Ritmo Operativo Semanal del Coordinador de Maestría (CMJ)
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Cronograma de control de evidencias, groundings y montajes logísticos.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {SOP_OPERATIVO_SEMANAL.semanal.map((paso, idx) => (
                <div key={idx} style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  padding: '1.25rem', 
                  borderRadius: '12px', 
                  borderLeft: paso.dia.includes('Miércoles') ? '4px solid #ef4444' : '4px solid var(--crear-gold)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong style={{ color: paso.dia.includes('Miércoles') ? '#ef4444' : 'var(--crear-gold)', fontSize: '1.05rem' }}>
                      {paso.dia}
                    </strong>
                    {paso.dia.includes('Miércoles') && (
                      <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 'bold' }}>
                        DEADLINE DE ORO (19:00 PM)
                      </span>
                    )}
                    {paso.dia.includes('Jueves') && (
                      <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 'bold' }}>
                        ALTURA SALA MÍN. 4.5M
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                    {paso.detalle}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Fin de Semana 4: El Viaje */}
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', borderLeft: '4px solid var(--crear-gold)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Flame size={24} className="text-gold" />
              <h2 style={{ color: 'var(--crear-gold)', margin: 0, fontSize: '1.5rem' }}>
                {SOP_OPERATIVO_SEMANAL.fds4ElViaje.nombre}
              </h2>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Cierre cumbre de los 90 días de Maestría: hostería campestre, retiro de celulares, visiones de vida y Pase de Antorcha.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 style={{ color: '#0ea5e9', margin: '0 0 0.5rem 0', fontSize: '1.15rem' }}>Viernes — Auditoría y Sigilo</h3>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {SOP_OPERATIVO_SEMANAL.fds4ElViaje.viernes}
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 style={{ color: '#10b981', margin: '0 0 0.5rem 0', fontSize: '1.15rem' }}>Sábado — Hostería y Vuelos</h3>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {SOP_OPERATIVO_SEMANAL.fds4ElViaje.sabado}
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 style={{ color: 'var(--crear-gold)', margin: '0 0 0.5rem 0', fontSize: '1.15rem' }}>Domingo — Visiones y Antorcha</h3>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {SOP_OPERATIVO_SEMANAL.fds4ElViaje.domingo}
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: 14 KPIS & TRIGGERS */}
      {activeTab === 'kpis' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Triggers de Backend Nodus */}
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', borderLeft: '4px solid #ef4444' }}>
            <h2 style={{ color: '#ef4444', margin: '0 0 0.5rem 0', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Server size={22} /> Triggers Técnicos Autónomos en Backend de Nodus
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Automatizaciones que se disparan en el servidor para proteger la integridad del contenedor y las finanzas.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {filteredTriggers.map((tr, idx) => (
                <div key={idx} style={{ background: 'rgba(0,0,0,0.35)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>{tr.nombre}</h3>
                    <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      {tr.momento}
                    </span>
                  </div>

                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                    {tr.explicacion}
                  </p>

                  <div style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'Consolas, monospace', fontSize: '0.85rem' }}>
                    <div style={{ color: '#10b981', marginBottom: '0.3rem' }}>// LÓGICA DE CONDICIÓN:</div>
                    <div style={{ color: '#0ea5e9', marginBottom: '0.6rem' }}>{tr.condicion}</div>
                    <div style={{ color: 'var(--crear-gold)', marginBottom: '0.3rem' }}>// ACCIÓN DISPARADA:</div>
                    <div style={{ color: '#f87171' }}>{tr.accion}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Catálogo de 14 KPIs */}
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', borderLeft: '4px solid #10b981' }}>
            <h2 style={{ color: '#10b981', margin: '0 0 0.5rem 0', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={22} /> Catálogo Oficial de los 14 KPIs Reales en Nodus
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Metas matemáticas oficiales 2026, fórmulas de cálculo, origen de datos y deadlines de registro en sistema.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--crear-gold)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '0.85rem' }}>Código</th>
                    <th style={{ padding: '0.85rem' }}>Nombre del KPI</th>
                    <th style={{ padding: '0.85rem' }}>Meta Oficial</th>
                    <th style={{ padding: '0.85rem' }}>Fórmula Matemática</th>
                    <th style={{ padding: '0.85rem' }}>Origen</th>
                    <th style={{ padding: '0.85rem' }}>Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKPIs.map(kpi => (
                    <tr key={kpi.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.85rem', fontWeight: 'bold', color: 'var(--crear-blue)' }}>{kpi.id}</td>
                      <td style={{ padding: '0.85rem', color: '#fff', fontWeight: 600 }}>{kpi.nombre}</td>
                      <td style={{ padding: '0.85rem', color: '#10b981', fontWeight: 'bold' }}>{kpi.meta}</td>
                      <td style={{ padding: '0.85rem', color: 'rgba(255,255,255,0.75)', fontFamily: 'Consolas, monospace', fontSize: '0.82rem' }}>{kpi.formula}</td>
                      <td style={{ padding: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>{kpi.origen}</td>
                      <td style={{ padding: '0.85rem', color: 'var(--crear-gold)', fontWeight: 600 }}>{kpi.deadline}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 5: MANUAL NODUS (18 CAPÍTULOS) */}
      {activeTab === 'operativo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid var(--crear-gold)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, color: '#fff', fontSize: '1.3rem' }}>
                  Manual Técnico de Operaciones NODUS (18 Capítulos)
                </h2>
                <p style={{ margin: '0.3rem 0 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                  Flujos literales paso a paso sobre los botones y menús reales de <a href="https://imo.crearpslglobal.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--crear-gold)' }}>imo.crearpslglobal.com</a>.
                </p>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--crear-gold)', fontWeight: 'bold' }}>
                Mostrando {filteredCapitulos.length} de 18 capítulos
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {filteredCapitulos.map(cap => (
              <div key={cap.capitulo} className="glass-panel hover-scale" style={{ 
                padding: '1.75rem', 
                borderRadius: '14px',
                borderLeft: '4px solid var(--crear-blue)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ background: 'rgba(0, 210, 255, 0.12)', color: 'var(--crear-blue)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      CAPÍTULO {cap.capitulo} • {cap.modulo.toUpperCase()}
                    </span>
                    <h3 style={{ margin: '0.4rem 0 0.3rem 0', color: '#fff', fontSize: '1.25rem' }}>
                      {cap.titulo}
                    </h3>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.92rem' }}>
                      {cap.descripcion}
                    </p>
                  </div>

                  <a 
                    href="https://imo.crearpslglobal.com/auth/login" 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
                  >
                    <ExternalLink size={14} /> Ir a este módulo
                  </a>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ color: 'var(--crear-gold)', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                    <MousePointer2 size={16} /> Pasos Exactos de Navegación:
                  </div>
                  <ol style={{ margin: 0, paddingLeft: '1.25rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.7, fontSize: '0.92rem' }}>
                    {cap.pasos.map((paso, idx) => (
                      <li key={idx} style={{ marginBottom: '0.35rem' }}>{paso}</li>
                    ))}
                  </ol>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  {cap.tags.map(t => (
                    <span key={t} style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', padding: '0.15rem 0.55rem', borderRadius: '10px', fontSize: '0.75rem' }}>
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* TAB 6: CHECKLISTS & FLUJOS */}
      {activeTab === 'checklists' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', borderLeft: '4px solid var(--crear-gold)' }}>
            <h2 style={{ color: 'var(--crear-gold)', margin: '0 0 0.5rem 0', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckSquare size={22} /> Listas de Cotejo por Puesto de Trabajo (Capítulo 16)
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Tareas innegociables antes, durante y después del evento para cada colaborador.
            </p>

            {/* Selector de Puesto */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {CHECKLISTS_POR_PUESTO.map(p => (
                <button
                  key={p.puesto}
                  onClick={() => setSelectedPuesto(p.puesto)}
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '10px',
                    border: selectedPuesto === p.puesto ? `2px solid ${p.color}` : '1px solid rgba(255,255,255,0.1)',
                    background: selectedPuesto === p.puesto ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.3)',
                    color: selectedPuesto === p.puesto ? '#fff' : 'rgba(255,255,255,0.7)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {p.puesto}
                </button>
              ))}
            </div>

            {/* Contenido del puesto seleccionado */}
            {(() => {
              const p = CHECKLISTS_POR_PUESTO.find(item => item.puesto === selectedPuesto) || CHECKLISTS_POR_PUESTO[0];
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #0ea5e9' }}>
                    <h3 style={{ color: '#0ea5e9', margin: '0 0 0.75rem 0', fontSize: '1.15rem' }}>Antes del Evento (Preparación)</h3>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, fontSize: '0.9rem' }}>
                      {p.antes.map((tarea, i) => <li key={i} style={{ marginBottom: '0.4rem' }}>{tarea}</li>)}
                    </ul>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
                    <h3 style={{ color: '#10b981', margin: '0 0 0.75rem 0', fontSize: '1.15rem' }}>Durante el Evento (Ejecución)</h3>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, fontSize: '0.9rem' }}>
                      {p.durante.map((tarea, i) => <li key={i} style={{ marginBottom: '0.4rem' }}>{tarea}</li>)}
                    </ul>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid var(--crear-gold)' }}>
                    <h3 style={{ color: 'var(--crear-gold)', margin: '0 0 0.75rem 0', fontSize: '1.15rem' }}>Después del Evento (Cierre)</h3>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, fontSize: '0.9rem' }}>
                      {p.despues.map((tarea, i) => <li key={i} style={{ marginBottom: '0.4rem' }}>{tarea}</li>)}
                    </ul>
                  </div>

                </div>
              );
            })()}
          </div>

          {/* Flujos Operativos y Ejercicios */}
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', borderLeft: '4px solid var(--crear-blue)' }}>
            <h2 style={{ color: 'var(--crear-blue)', margin: '0 0 0.5rem 0', fontSize: '1.4rem' }}>
              Flujos Operativos de Entrada y Contingencia
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '10px' }}>
                <strong style={{ color: '#10b981', display: 'block', marginBottom: '0.4rem' }}>1. Flujo de Llegada Ordinaria</strong>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                  Participante presenta DNI → Búsqueda en Nodus → Estado 'Completo' comprobado → Entrega de Gafete → Clic en 'Marcar en Sala' → Ingreso a Salón.
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '10px' }}>
                <strong style={{ color: '#ef4444', display: 'block', marginBottom: '0.4rem' }}>2. Flujo de Saldo Pendiente</strong>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                  Búsqueda en Nodus → Estado 'Pendiente' → Derivación inmediata a Caja → Pago total o abono → Registro de comprobante → Retorno a mesa → Marcación en sala.
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '10px' }}>
                <strong style={{ color: 'var(--crear-gold)', display: 'block', marginBottom: '0.4rem' }}>3. Flujo Alumno Nuevo (Walk-In)</strong>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                  DNI no registrado → 'Participantes' → 'Nuevo Participante' → Registro de datos completos → Asentar cobro en 'Contabilidad' → Gafete provisional → 'Marcar en Sala'.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
