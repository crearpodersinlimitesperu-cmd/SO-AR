import React, { useState } from 'react';
import {
  Users,
  Compass,
  Calendar,
  PhoneCall,
  Clock,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Search,
  Sparkles,
  HelpCircle,
  Copy,
  ChevronRight,
  Volume2,
  FileText,
  UserCheck,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function GuiaAliadosC1() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('postura');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedText, setCopiedText] = useState('');

  const copyToClipboard = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(''), 2500);
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem', color: '#f8fafc' }}>
      {/* Banner Superior de Identidad de Marca */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
        border: '1px solid #334155',
        borderRadius: '14px',
        padding: '1.75rem',
        marginBottom: '1.75rem',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1.25rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{
              background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)',
              color: '#031726',
              fontWeight: 900,
              fontSize: '0.75rem',
              padding: '3px 10px',
              borderRadius: '6px',
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}>
              DOCUMENTO OPERATIVO OFICIAL
            </span>
            <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
              PROGRAMA DE RESULTADOS
            </span>
          </div>

          <h1 style={{ margin: '0 0 0.4rem 0', fontSize: '1.85rem', fontWeight: 900, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Compass size={28} color="#38bdf8" />
            Guía Práctica Operativa: Aliado de Capítulo Uno (C1)
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', maxWidth: '850px', lineHeight: '1.5' }}>
            Reglas, postura innegociable, secuencia paso a paso (<strong>Antes, Durante y Después</strong>) y herramientas de acompañamiento para Aliados que eligen entrenarse y servir en <strong>Capítulo Uno (C1)</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <a
            href="/aliados-c1/"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: '#0284c7',
              color: '#fff',
              padding: '0.65rem 1.15rem',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.86rem',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(14, 165, 233, 0.35)',
              transition: 'all 0.2s'
            }}
          >
            <ExternalLink size={16} /> Abrir Portal Standalone Protegido (/aliados-c1/)
          </a>

          <a
            href="/aliados-c2/"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: '#1e293b',
              border: '1px solid #475569',
              color: '#fbbf24',
              padding: '0.65rem 1.05rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.86rem',
              textDecoration: 'none'
            }}
          >
            🛡️ Ir a Guía Aliados C2
          </a>
        </div>
      </div>

      {/* Buscador y Pestañas de Navegación */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '10px',
          padding: '0.6rem 1rem'
        }}>
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar en la guía: preguntas de quiebre, llamada 30/70, grounding, Ticket de Posibilidad..."
            style={{
              background: 'transparent',
              border: 'none',
              color: '#f8fafc',
              fontSize: '0.9rem',
              outline: 'none',
              width: '100%'
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              Limpiar ✕
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
          {[
            { id: 'postura', label: '1. Marco de Postura & Innegociables', icon: Compass },
            { id: 'fase1', label: '2. Fase 1: Antes de C1 (Leader Team & Groundings)', icon: Calendar },
            { id: 'fase2', label: '3. Fase 2: Durante C1 (Fin de Semana)', icon: Users },
            { id: 'fase3', label: '4. Fase 3: Después de C1 (El Puente & Llamadas)', icon: PhoneCall },
            { id: 'roleplay', label: '5. Tácticas: El SÍ, el NO y el NO SÉ', icon: Zap },
            { id: 'legal', label: '6. Confidencialidad & Propiedad Intelectual', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  border: isSelected ? '1px solid #38bdf8' : '1px solid transparent',
                  background: isSelected ? 'rgba(14, 165, 233, 0.18)' : '#1e293b',
                  color: isSelected ? '#38bdf8' : '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENIDO 1: MARCO DE POSTURA & LOS INNEGOCIABLES DEL ALIADO */}
      {activeTab === 'postura' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Compass size={22} />
              1. Marco de Postura: Los Innegociables del Aliado de C1
            </h2>
            <p style={{ lineHeight: '1.6', color: '#cbd5e1', fontSize: '0.94rem' }}>
              El Aliado de C1 opera desde la firmeza, la claridad y el cumplimiento de la palabra dada. El programa no es para vivir lo posible, sino para crear lo imposible. En Capítulo Uno, el Aliado se entrena para convertirse en un <strong>experto en crear relación</strong> con los participantes. C1 es el espacio diseñado para construir un contexto de confianza, sostener una escucha limpia e intervenir como un espacio de seguridad y posibilidad incondicional.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
              {[
                {
                  title: 'Término Oficial y Significado de Partner',
                  desc: 'El término Partner reemplaza oficialmente la denominación anterior de "sombra". Es el socio de proceso con quien construyes presencia, sostienes la escucha limpia y mantienes la corresponsabilidad. Eres su espejo y el espacio de apoyo incondicional durante todo el fin de semana.',
                  tag: 'Distinción Clave'
                },
                {
                  title: 'Programa de Resultados y Creación',
                  desc: 'No somos un curso, evento, show motivacional ni grupo de sanación. Somos un Programa de Resultados donde el foco exclusivo es la creación de evidencias reales en la vida diaria.',
                  tag: 'Identidad de Programa'
                },
                {
                  title: 'Principio de Relación',
                  desc: 'Viernes y sábado se crea la relación con el participante; el domingo se realiza el llamado contundente a la acción.',
                  tag: 'Regla de Oro C1'
                },
                {
                  title: 'Enrolamiento Asertivo',
                  desc: 'Inspiramos a otro ser humano a ver posibilidades y tomar postura inmediata a través del "Sí en Acción".',
                  tag: 'Metodología'
                },
                {
                  title: 'Acompañamiento de Alto Nivel',
                  desc: 'Tratamos al participante como un adulto 100% capaz y responsable de tomar sus decisiones y crear sus resultados.',
                  tag: 'Cero Paternalismo'
                },
                {
                  title: 'Presentación Poderosa del Viernes',
                  desc: 'Ensayarás y perfeccionarás la presentación personal enérgica y estructurada con la que te dirigirás a tu grupo de Creación el viernes de C1, en el momento preciso en que los participantes te eligen como su Partner.',
                  tag: 'Momento Clave Viernes'
                },
                {
                  title: 'Misión de Cambio de Cupo / Nombre',
                  desc: 'Todos los Aliados cuentan con la posibilidad activa y la misión de gestionar cambios de cupo o sustitución de nombres para aquellas personas que ellos mismos enrolaron pero que aún no se han sentado o decidieron no asistir a este C1.',
                  tag: 'Gestión Proactiva'
                },
                {
                  title: 'Regla de Corresponsabilidad',
                  desc: 'Eres la primera y la última persona del día para tu Partner. Su presencia y permanencia en la sala dependen directamente de tu compromiso y seguimiento.',
                  tag: 'Presencia Absoluta'
                },
                {
                  title: 'Creación del Contexto',
                  desc: 'El Aliado es responsable de crear activamente el contexto para entrenarse en todo lo que está disponible antes, durante y después del C1, aprovechando cada herramienta, reto y espacio de aprendizaje.',
                  tag: 'Alineación Total'
                }
              ].map((item, idx) => (
                <div key={idx} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '1.15rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc' }}>{item.title}</h3>
                    <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 7px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                      {item.tag}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.5' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Reconocimiento Orgánico al Aliado */}
          <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(30, 41, 59, 0.95) 100%)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 0.8rem 0', fontSize: '1.25rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={22} />
              2. Reconocimiento Orgánico al Aliado: Honor al Liderazgo y al Servicio
            </h2>
            <p style={{ margin: '0 0 1rem 0', color: '#cbd5e1', fontSize: '0.92rem' }}>
              Servir como Aliado en Capítulo Uno es una elección consciente de alto valor, liderazgo y entrega. Al asumir este rol, tu propia transformación se acelera a través del servicio a otros:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.35)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #fbbf24' }}>
                <strong style={{ color: '#fde68a', display: 'block', marginBottom: '0.3rem' }}>Reconocimiento Directo en la Experiencia</strong>
                <span style={{ fontSize: '0.84rem', color: '#cbd5e1' }}>Tu mayor reconocimiento nace de ver a los participantes despertar a su propio potencial y tomar decisiones valientes para su vida gracias a tu escucha limpia y tu capacidad de crear relación.</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.35)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #38bdf8' }}>
                <strong style={{ color: '#7dd3fc', display: 'block', marginBottom: '0.3rem' }}>Valor del Entrenamiento Personal</strong>
                <span style={{ fontSize: '0.84rem', color: '#cbd5e1' }}>Cada espacio de exigencia, cada llamada y cada intervención en sala son el espejo directo de tu propio nivel de compromiso. Entrenar a otros es el vehículo más potente para entrenar tu propia grandeza.</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.35)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #34d399' }}>
                <strong style={{ color: '#6ee7b7', display: 'block', marginBottom: '0.3rem' }}>Celebración del Legado e Impacto</strong>
                <span style={{ fontSize: '0.84rem', color: '#cbd5e1' }}>Al cierre de C1, la comunidad y el equipo reconocen de forma limpia y transparente tu entrega impecable, tu puntualidad y el cumplimiento de tu palabra, celebrando las vidas impactadas.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO 2: FASE 1: ANTES DE C1 */}
      {activeTab === 'fase1' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem', color: '#38bdf8' }}>
              3. FASE 1: ANTES DE C1 (Alineamiento y Prácticas Previas)
            </h2>
            <p style={{ margin: '0 0 1.25rem 0', color: '#cbd5e1', fontSize: '0.92rem' }}>
              Tras el grounding virtual del miércoles, el Aliado debe entrenarse a diario, sin excusas ni evasiones, junto a su <strong>Leader Team</strong>.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#f8fafc', fontWeight: 800 }}>
                  A. Entrenamiento Diario Post-Grounding (Leader Team)
                </h3>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#cbd5e1', fontSize: '0.86rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', lineHeight: '1.5' }}>
                  <li><strong>Afinar la Presentación Personal:</strong> Perfeccionar el mensaje del viernes para que sea fluido, firme y magnético.</li>
                  <li><strong>Manejo de Escenarios del Domingo:</strong> Ensayar la guía para que el participante cree su Ticket de Posibilidad (llave de ingreso a C2).</li>
                  <li><strong>Abordaje del SÍ, el NO y el NO SÉ:</strong> Velocidad para el Sí, firmeza y dignidad para el No, y quiebre del No Sé (disfraz de no elegir).</li>
                  <li><strong>Escucha Quirúrgica (&lt; 90 segundos):</strong> Cortar relatos victimizantes en menos de 90s a 3 min. Erradicar llamadas circulares de 15 a 30 min.</li>
                  <li><strong>Manejo de Objeciones (Dinero y Tiempo):</strong> No comprar la excusa de escasez; el compromiso es lo que genera los recursos.</li>
                </ul>
              </div>

              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#f8fafc', fontWeight: 800 }}>
                  B. Reglas del Grounding Virtual (Estándar de Excelencia)
                </h3>
                <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: '0 0 0.75rem 0' }}>
                  Miércoles posterior a Maestría del Juego (una semana antes de C1) a las <strong>20:00 hrs (máx. 90 min)</strong>.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={16} color="#34d399" />
                    <span><strong>Cámara Encendida:</strong> Mantener el video encendido toda la sesión.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={16} color="#34d399" />
                    <span><strong>Espacio Seguro y Adecuado:</strong> Lugar privado, libre de distracciones.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={16} color="#34d399" />
                    <span><strong>Verificación Técnica Previa:</strong> Internet, computadora, micrófono e iluminación.</span>
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem', borderTop: '1px solid #334155', paddingTop: '0.85rem' }}>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.9rem', color: '#fbbf24' }}>
                    C. Grounding Presencial en Sede
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
                    <strong>Jueves previo (un día antes de C1 a las 18:00 hrs / 6:00 p. m.):</strong> Demostración de roleplays del SÍ, el NO y el NO SÉ, ejecución de la presentación en vivo y asignación de funciones operativas en sala (tiempo, puertas, sillas).
                  </p>
                </div>
              </div>
            </div>

            {/* Misiones Estándar de los Groundings en C1 */}
            <div style={{ marginTop: '1.25rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.8rem 0', fontSize: '1rem', color: '#38bdf8', fontWeight: 800 }}>
                D. Misiones Estándar de los Groundings en C1
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: '3px solid #38bdf8' }}>
                  <strong style={{ color: '#f8fafc', display: 'block', fontSize: '0.88rem' }}>1. Declaración del Propósito (4 Meses)</strong>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Publicar en el chat del grupo la declaración viva e irrazonable sobre qué acción específica tomada hoy colapsa la realidad y altera positivamente sus próximos 4 meses de vida personal.</span>
                </div>
                <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: '3px solid #34d399' }}>
                  <strong style={{ color: '#f8fafc', display: 'block', fontSize: '0.88rem' }}>2. Video de Enrolamiento (15 Segundos)</strong>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Grabar y subir al chat de aliados un video de 15 segundos enfocado en el para qué de su participación.</span>
                </div>
                <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: '3px solid #fbbf24' }}>
                  <strong style={{ color: '#f8fafc', display: 'block', fontSize: '0.88rem' }}>3. Gestión y Cambio de Cupo / Nombre</strong>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Responsabilidad activa y misión de gestionar cambios de cupo o sustitución de nombres de personas enroladas que no asistirán, reabriendo la conversación para inspirar a nuevos participantes.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO 3: FASE 2: DURANTE C1 (FIN DE SEMANA) */}
      {activeTab === 'fase2' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: '#38bdf8' }}>
              4. FASE 2: DURANTE C1 (Fin de Semana del Entrenamiento)
            </h2>

            {/* Secuencia Visual de Ejecución */}
            <div style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '10px',
              padding: '1.25rem',
              overflowX: 'auto',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', gap: '0.75rem', minWidth: '780px', justifyContent: 'space-between' }}>
                {[
                  {
                    header: 'MIÉRCOLES (POST-MJ)',
                    sub: 'Una semana antes',
                    color: '#38bdf8',
                    items: ['20:00 Grounding Virtual Post-MJ', 'Inicio de Entrenamiento Diario con Leader Team']
                  },
                  {
                    header: 'JUEVES PREVIO',
                    sub: 'Un día antes',
                    color: '#fbbf24',
                    items: ['18:00 (6 PM) Grounding Presencial en Sede', 'Muestreo con Leader Team', 'Asignación de funciones en sala']
                  },
                  {
                    header: 'VIERNES C1',
                    sub: 'Día 1 de Creación',
                    color: '#34d399',
                    items: ['08:00 Grounding presencial', '09:00 Inicio de C1', 'Presentación Grupo Creación', 'Creación de Relación']
                  },
                  {
                    header: 'SÁBADO C1',
                    sub: 'Día 2 de Creación',
                    color: '#c084fc',
                    items: ['08:00 Grounding presencial', '09:00 Profundización de Confianza', 'Acompañamiento en Dinámicas']
                  },
                  {
                    header: 'DOMINGO C1',
                    sub: 'Día 3 · Llamado a la Acción',
                    color: '#f43f5e',
                    items: ['08:00 Grounding presencial', '09:00 Preparación de Sala', '15:00 Presentación Siguiente Nivel', 'Llamado a la Acción / Ticket de Posibilidad']
                  }
                ].map((col, idx) => (
                  <div key={idx} style={{
                    flex: 1,
                    background: '#1e293b',
                    border: `1px solid ${col.color}`,
                    borderRadius: '8px',
                    padding: '0.9rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <div style={{ borderBottom: '1px solid #334155', paddingBottom: '0.4rem' }}>
                      <strong style={{ color: col.color, fontSize: '0.82rem', display: 'block' }}>{col.header}</strong>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{col.sub}</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                      {col.items.map((it, iIdx) => (
                        <li key={iIdx}>{it}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Posicionamiento en el Acompañamiento de Acuerdos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#f8fafc', fontWeight: 800 }}>
                  🚫 Sin Acuerdos Fantasiosos
                </h3>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                  Erradicar los compromisos tibios como <em>«luego te aviso»</em> o ilusiones de <em>«lo veré la otra semana»</em>. Toda interacción concluye en una decisión clara: un <strong>Sí</strong> con acción inmediata y Ticket de Posibilidad, o un <strong>No</strong> transparente donde la persona asume plenamente la responsabilidad de su elección.
                </p>
              </div>

              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#f8fafc', fontWeight: 800 }}>
                  ⚡ La Ecuación de Movimiento
                </h3>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                  Toda confrontación o llamado a la acción va acompañado de una conversación de posibilidad e inspiración. No confrontamos para juzgar; confrontamos para liberar la grandeza que el participante tiene dormida.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO 4: FASE 3: DESPUÉS DE C1 (EL PUENTE & LLAMADAS) */}
      {activeTab === 'fase3' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 0.6rem 0', fontSize: '1.25rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PhoneCall size={22} />
              5. FASE 3: DESPUÉS DE C1 (El Puente de los 8 Días C1 a C2)
            </h2>
            <p style={{ margin: '0 0 1.25rem 0', color: '#cbd5e1', fontSize: '0.92rem' }}>
              Los Aliados cuentan con el mapa operativo de llamadas para sostener el contexto y abrir posibilidades hacia Capítulo Dos (C2).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '1.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <Clock size={18} color="#fbbf24" />
                  <strong style={{ color: '#fbbf24', fontSize: '0.95rem' }}>Horario de Llamadas</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                  Realizadas <strong>obligatoriamente en la mañana</strong>. Esto le da al participante todo el día para ejecutar sus retos diarios. Por la noche, el Aliado ingresa al grupo de WhatsApp de Creación para validar la evidencia diaria.
                </p>
              </div>

              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '1.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <Volume2 size={18} color="#34d399" />
                  <strong style={{ color: '#34d399', fontSize: '0.95rem' }}>La Regla del 30/70</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                  El Aliado habla como máximo el <strong>30% del tiempo</strong> y el participante habla el <strong>70% restante</strong>. Tu rol es lanzar la pregunta poderosa, hacer silencio y escuchar con apertura.
                </p>
              </div>

              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '1.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <UserCheck size={18} color="#38bdf8" />
                  <strong style={{ color: '#38bdf8', fontSize: '0.95rem' }}>Liderazgo Presente</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                  Si termina el bloque de la mañana y alguien no llamó, el Aliado lo busca directamente. Si llama tarde, se le atiende pero se le hace notar qué espacio de postergación está abriendo.
                </p>
              </div>
            </div>

            {/* Estructura de 5 Minutos de la Llamada */}
            <div style={{ background: '#0f172a', border: '1px solid #0ea5e9', borderRadius: '10px', padding: '1.35rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: '#38bdf8', fontWeight: 800 }}>
                ⏱️ Estructura Innegociable de 5 Minutos por Llamada
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem' }}>
                <div style={{ background: '#1e293b', padding: '0.9rem', borderRadius: '8px', borderTop: '3px solid #38bdf8' }}>
                  <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 800 }}>MINUTO 1</span>
                  <strong style={{ display: 'block', margin: '0.2rem 0', fontSize: '0.88rem' }}>Saludo y Encuadre</strong>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Saludo cálido, conexión rápida y acuerdo explícito del tiempo límite.</span>
                </div>
                <div style={{ background: '#1e293b', padding: '0.9rem', borderRadius: '8px', borderTop: '3px solid #34d399' }}>
                  <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 800 }}>MINUTOS 2 Y 3</span>
                  <strong style={{ display: 'block', margin: '0.2rem 0', fontSize: '0.88rem' }}>Pregunta Poderosa</strong>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Pregunta quirúrgica, silencio del Aliado y escucha activa (70% habla el participante).</span>
                </div>
                <div style={{ background: '#1e293b', padding: '0.9rem', borderRadius: '8px', borderTop: '3px solid #fbbf24' }}>
                  <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 800 }}>MINUTO 4</span>
                  <strong style={{ display: 'block', margin: '0.2rem 0', fontSize: '0.88rem' }}>Diseño del Reto</strong>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Definición del reto diario concreto, medible y con horario de ejecución.</span>
                </div>
                <div style={{ background: '#1e293b', padding: '0.9rem', borderRadius: '8px', borderTop: '3px solid #c084fc' }}>
                  <span style={{ fontSize: '0.72rem', color: '#c084fc', fontWeight: 800 }}>MINUTO 5</span>
                  <strong style={{ display: 'block', margin: '0.2rem 0', fontSize: '0.88rem' }}>Cierre y Evidencia</strong>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Cierre en visión y compromiso formal de subir evidencia al grupo de WhatsApp.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO 5: TÁCTICAS: EL SÍ, EL NO Y EL NO SÉ (PREGUNTAS DE QUIEBRE) */}
      {activeTab === 'roleplay' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: '#38bdf8' }}>
              Abordaje Asertivo del SÍ, el NO y el NO SÉ
            </h2>
            <p style={{ margin: '0 0 1.25rem 0', color: '#94a3b8', fontSize: '0.9rem' }}>
              En C1 se entrena la velocidad de respuesta para sostener la postura ante cualquier reacción del participante:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#0f172a', borderLeft: '4px solid #10b981', borderRadius: '8px', padding: '1.2rem' }}>
                <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                  EL SÍ EN ACCIÓN
                </span>
                <h3 style={{ margin: '0.6rem 0 0.3rem 0', color: '#f8fafc', fontSize: '1.05rem' }}>Acompañamiento Inmediato</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                  Acompañamiento de máxima velocidad para consolidar la acción y asegurar la llave de ingreso (Ticket de Posibilidad) en minutos, sin abrir espacios de enfriamiento.
                </p>
              </div>

              <div style={{ background: '#0f172a', borderLeft: '4px solid #ef4444', borderRadius: '8px', padding: '1.2rem' }}>
                <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                  EL NO
                </span>
                <h3 style={{ margin: '0.6rem 0 0.3rem 0', color: '#f8fafc', fontSize: '1.05rem' }}>Respeto con Firmeza y Dignidad</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                  Respetar la elección sin engancharse en discusiones ni rogar, permitiendo que el participante se haga cargo 100% de la consecuencia de su postura.
                </p>
              </div>

              <div style={{ background: '#0f172a', borderLeft: '4px solid #f59e0b', borderRadius: '8px', padding: '1.2rem' }}>
                <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                  EL NO SÉ (DUBITATIVO)
                </span>
                <h3 style={{ margin: '0.6rem 0 0.3rem 0', color: '#f8fafc', fontSize: '1.05rem' }}>Interrupción del Refugio de la Duda</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                  Interrumpir con claridad asertiva. Mostrarle que el «no sé» es un disfraz para no elegir, retándolo a tomar postura clara hacia la creación o la renuncia.
                </p>
              </div>
            </div>

            {/* Banco de Preguntas Quirúrgicas en Lenguaje Sencillo */}
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '1.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', fontWeight: 800 }}>
                  🎯 Preguntas Directas en Lenguaje Sencillo (Prohibido Preguntas Trilladas)
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 700 }}>
                  ⛔ PROHIBIDO: «¿En qué otras áreas de tu vida pasa esto?»
                </span>
              </div>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.84rem', color: '#94a3b8' }}>
                Usa estas preguntas cotidianas y contundentes durante el viernes, sábado, domingo y el puente de 8 días:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  {
                    id: 'q_dinero',
                    categoria: 'Frente a la excusa del dinero / liquidez',
                    pregunta: '«Si quitamos la plata de la mesa por un minuto, ¿cuál es la razón real por la que prefieres no comprometerte hoy?»',
                    efecto: 'Desarticula el argumento financiero y revela el miedo o falta de compromiso interno.'
                  },
                  {
                    id: 'q_pareja',
                    categoria: 'Frente a la excusa de la pareja o familia',
                    pregunta: '«¿Si tu familia es tu motor, por qué la usas como el freno para no tomar tus propias decisiones?»',
                    efecto: 'Rompe la proyección victimizante y responsabiliza al participante por su crecimiento.'
                  },
                  {
                    id: 'q_almohada',
                    categoria: 'Frente a la postergación fantástica («déjame pensarlo»)',
                    pregunta: '«Sé sincero: ¿qué información mágica vas a encontrar el domingo debajo de tu almohada que no tengas hoy aquí parado conmigo?»',
                    efecto: 'Evidencia la mentira educada que disfraza la indecisión y fuerza a una elección aquí y ahora.'
                  }
                ].map((item) => (
                  <div key={item.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                        {item.categoria}
                      </span>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.35rem', fontStyle: 'italic' }}>
                        {item.pregunta}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                        💡 {item.efecto}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(item.pregunta, item.id)}
                      style={{
                        background: copiedText === item.id ? '#10b981' : '#334155',
                        border: 'none',
                        color: '#fff',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      {copiedText === item.id ? '¡Copiado!' : <><Copy size={13} /> Copiar</>}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO 6: CONFIDENCIALIDAD & PROPIEDAD INTELECTUAL */}
      {activeTab === 'legal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={22} />
              Aviso de Propiedad Intelectual y Confidencialidad Global
            </h2>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '1.25rem' }}>
              CREAR PODER SIN LÍMITES · PROGRAMA DE RESULTADOS
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: '#0f172a', borderLeft: '4px solid #38bdf8', padding: '1rem', borderRadius: '6px' }}>
                <strong style={{ color: '#38bdf8', display: 'block', marginBottom: '0.3rem', fontSize: '0.92rem' }}>
                  Propiedad Exclusiva
                </strong>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                  Todo el contenido, metodología, estructura operativa, nombres de dinámicas, procesos, marcas y material pedagógico contenidos en esta guía son propiedad intelectual exclusiva de <strong>Crear Poder Sin Límites</strong>.
                </p>
              </div>

              <div style={{ background: '#0f172a', borderLeft: '4px solid #ef4444', padding: '1rem', borderRadius: '6px' }}>
                <strong style={{ color: '#fca5a5', display: 'block', marginBottom: '0.3rem', fontSize: '0.92rem' }}>
                  Prohibición de Copia y Difusión
                </strong>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                  Queda estrictamente prohibida la reproducción total o parcial, copia, modificación, distribución, divulgación, publicación o transmisión de este material por cualquier medio sin la autorización previa y por escrito de la dirección de <strong>Crear Poder Sin Límites</strong>.
                </p>
              </div>

              <div style={{ background: '#0f172a', borderLeft: '4px solid #fbbf24', padding: '1rem', borderRadius: '6px' }}>
                <strong style={{ color: '#fde68a', display: 'block', marginBottom: '0.3rem', fontSize: '0.92rem' }}>
                  Protección Internacional de Datos
                </strong>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                  En cumplimiento de las normativas internacionales de protección de datos personales y privacidad, la información a la que se tenga acceso durante el programa es de carácter <strong>estrictamente confidencial</strong>. Está prohibido usar, compartir o comercializar dichos datos para fines ajenos al desarrollo del programa. El incumplimiento de estas disposiciones dará lugar a las acciones legales correspondientes.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
