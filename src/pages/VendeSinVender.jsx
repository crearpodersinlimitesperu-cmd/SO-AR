import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Sparkles, Brain, Scale, Shield, ArrowRight, CheckCircle2, 
  AlertTriangle, Flame, Compass, Copy, Check, Heart, Eye, Target, 
  Zap, RotateCcw, Award, Layers, TrendingUp, ChevronDown, ChevronRight, 
  ArrowLeft, CheckSquare, Clock, ShieldAlert, Users, MessageSquare, ExternalLink
} from 'lucide-react';
import { useUI } from '../context/UIContext';

export default function VendeSinVender() {
  const navigate = useNavigate();
  const { showToast } = useUI ? useUI() : { showToast: (m) => alert(m) };

  // Capítulo activo: 'bienvenida' | 'cap1' | 'cap2' | 'cap3' | 'cap4' | 'cap5' | 'cap6' | 'epilogo'
  const [activeChapter, setActiveChapter] = useState('bienvenida');
  const [copiedQuote, setCopiedQuote] = useState(null);

  // Estados interactivos para las gráficas narrativas
  // Gráfica 3: Estado del Perro Guardián (false = Calma, true = Alerta)
  const [dogAlertMode, setDogAlertMode] = useState(false);

  // Gráfica 4: Sliders interactivos de la Balanza de Hormozi
  const [valSueno, setValSueno] = useState(9);
  const [valCerteza, setValCerteza] = useState(8);
  const [valTiempo, setValTiempo] = useState(2);
  const [valEsfuerzo, setValEsfuerzo] = useState(2);

  // Gráfica 5: Simulador de Ticket Verde
  const [ticketPxName, setTicketPxName] = useState('Carlos Mendoza');
  const [ticketIssued, setTicketIssued] = useState(false);

  // Gráfica 7: Conmutador Arena vs Contexto (false = Contexto/Causa, true = Arena/Efecto)
  const [arenaMode, setArenaMode] = useState(false);

  // Helper para copiar texto con feedback
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedQuote(id);
    if (showToast) showToast('✓ Frase copiada al portapapeles', 'success');
    setTimeout(() => setCopiedQuote(null), 2500);
  };

  const calculatedValue = ((valSueno * valCerteza) / Math.max(0.5, (valTiempo * valEsfuerzo) / 2)).toFixed(1);

  const chapters = [
    { id: 'bienvenida', num: 'INTRO', title: 'Bienvenida al Contexto', subtitle: '¿Por qué este libro sí lo vas a terminar?', icon: <Sparkles size={18} /> },
    { id: 'cap1', num: 'CAP 1', title: 'El Despertar del Guía', subtitle: 'No eres Luke, eres Yoda', icon: <Compass size={18} /> },
    { id: 'cap2', num: 'CAP 2', title: 'Anatomía de la Mente Humana', subtitle: 'Cómo amansar al Perro Guardián', icon: <Brain size={18} /> },
    { id: 'cap3', num: 'CAP 3', title: 'La Ecuación de Valor en Plastilina', subtitle: 'Alex Hormozi y el Deseo Irresistible', icon: <Scale size={18} /> },
    { id: 'cap4', num: 'CAP 4', title: 'El Mapa de Ruta en 3 Pasos', subtitle: 'Del Sueño al Ticket Verde de Integridad', icon: <Target size={18} /> },
    { id: 'cap5', num: 'CAP 5', title: 'El Rescate de los Olvidados', subtitle: 'Protocolo de Rezagados de C1', icon: <ShieldAlert size={18} /> },
    { id: 'cap6', num: 'CAP 6', title: 'La Bitácora del Guerrero Cuántico', subtitle: 'Causa vs. Espectador en la Arena', icon: <Zap size={18} /> },
    { id: 'epilogo', num: 'FINAL', title: 'Epílogo & Manifiesto IMO', subtitle: 'La Promesa del Líder Transformacional', icon: <Award size={18} /> },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark, #070d1f)', color: '#fff', padding: '1.5rem', paddingBottom: '6rem' }}>
      
      {/* HEADER DE NAVEGACIÓN Y MARCA OFICIAL */}
      <div style={{ maxWidth: '1200px', margin: '0 auto 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => navigate(-1)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={16} /> Volver
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: 'rgba(255, 183, 3, 0.15)', color: 'var(--crear-gold, #ffb703)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em' }}>
                CREAR PODER SIN LÍMITES
              </span>
              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                CAUSA OS BEST-SELLER
              </span>
            </div>
            <h1 style={{ margin: '4px 0 0', fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
              Vende Sin Vender: El Arte de Enrolar y Despertar Gigantes
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted, #9ca3af)' }}>
            Edición Oficial 2026 • Modo Lector Interactivo
          </span>
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL: ÍNDICE LATERAL + CONTENIDO */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(260px, 310px) 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* BARRA LATERAL: ÍNDICE DE CAPÍTULOS */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.2rem', position: 'sticky', top: '1.5rem', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <BookOpen size={18} color="var(--crear-gold, #ffb703)" />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fff' }}>
              Índice de la Obra
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {chapters.map((ch) => {
              const isActive = activeChapter === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChapter(ch.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--crear-gold, #ffb703)' : 'transparent',
                    background: isActive ? 'rgba(255, 183, 3, 0.12)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--text-muted, #9ca3af)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    width: '100%'
                  }}
                >
                  <div style={{ color: isActive ? 'var(--crear-gold, #ffb703)' : 'inherit' }}>
                    {ch.icon}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: isActive ? 'var(--crear-gold, #ffb703)' : 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                      {ch.num}
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ch.title}
                    </div>
                  </div>
                  {isActive && <ChevronRight size={14} color="var(--crear-gold, #ffb703)" />}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.78rem', color: 'var(--text-muted, #9ca3af)', lineHeight: '1.5' }}>
            💡 <strong>Rigor Causa OS:</strong> «Enrolar no es convencer; es sostener el contenedor sagrado para que otro ser humano elija despertar».
          </div>
        </div>

        {/* CONTENIDO DEL CAPÍTULO ACTIVO CON SUS GRÁFICAS NARRATIVAS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* ============================================================== */}
          {/* BIENVENIDA AL CONTEXTO                                         */}
          {/* ============================================================== */}
          {activeChapter === 'bienvenida' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(255,183,3,0.1) 0%, rgba(0,0,0,0.4) 100%)', border: '1px solid rgba(255,183,3,0.25)', borderRadius: '16px', padding: '2rem' }}>
                <span style={{ background: 'var(--crear-gold, #ffb703)', color: '#000', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 900 }}>
                  INTRODUCCIÓN OFICIAL
                </span>
                <h2 style={{ fontSize: '2.2rem', margin: '0.8rem 0 0.4rem', fontWeight: 800, color: '#fff' }}>
                  BIENVENIDA AL CONTEXTO: ¿POR QUÉ ESTE LIBRO SÍ LO VAS A TERMINAR?
                </h2>
                <p style={{ fontSize: '1.1rem', color: '#e5e7eb', lineHeight: '1.8', margin: '1rem 0 0' }}>
                  Si alguna vez has intentado "convencer" a alguien de tomar una decisión de vida, sabes lo agotador que es. Terminas sudando, con la garganta seca, sintiéndote como un vendedor de enciclopedias de los años noventa, mientras la otra persona te mira con sospecha y retrocede lentamente.
                </p>
                <div style={{ marginTop: '1.2rem', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderLeft: '4px solid var(--crear-gold, #ffb703)', borderRadius: '8px' }}>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--crear-gold, #ffb703)' }}>
                    Tenemos una noticia para ti: vender presionando es de la era de piedra. Enrolar desde el Ser es el futuro.
                  </strong>
                </div>
              </div>

              {/* GRÁFICA NARRATIVA 1: LA TRÍADA DE SUPERPODERES (NEXUS SVG ANIMADO) */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                  <Sparkles size={18} color="var(--crear-gold, #ffb703)" />
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>
                    Infografía Narrativa: La Tríada del Enrolamiento Ético
                  </h4>
                </div>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-muted, #9ca3af)', marginBottom: '1.5rem' }}>
                  Este manual fusiona tres superpoderes del mundo moderno para que logres que la gente te diga <em>«¡Sí, por favor!»</em> de forma voluntaria, alegre y con el corazón encendido:
                </p>

                {/* Diagrama de 3 Pilares */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem' }}>
                  <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '12px', padding: '1.4rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧠</div>
                    <strong style={{ color: '#38bdf8', fontSize: '1rem', display: 'block', marginBottom: '0.4rem' }}>
                      1. Neuromarketing Ético
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                      Para que entiendas de una vez por todas cómo decide el cerebro humano (y dejes de asustar a la gente con discursos agresivos).
                    </p>
                  </div>

                  <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '12px', padding: '1.4rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚖️</div>
                    <strong style={{ color: '#fbbf24', fontSize: '1rem', display: 'block', marginBottom: '0.4rem' }}>
                      2. La Ecuación de Alex Hormozi
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                      El secreto matemático para que tu propuesta parezca un oasis en el desierto y no una roca pesada sobre la espalda del otro.
                    </p>
                  </div>

                  <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '12px', padding: '1.4rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚡</div>
                    <strong style={{ color: '#c084fc', fontSize: '1rem', display: 'block', marginBottom: '0.4rem' }}>
                      3. Causa OS
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                      El interruptor mental para salir de la queja ("la arena" de la vida) y asumir que tú eres la fuente absoluta de tus resultados.
                    </p>
                  </div>
                </div>
              </div>

              {/* TEXTO CONTINUO */}
              <div style={{ fontSize: '1.05rem', lineHeight: '1.8', color: '#cbd5e1' }}>
                <p>
                  Prepárate para reírte de tus propios errores, desaprender viejos paradigmas y convertirte en un <strong>Líder IMO (Identidad Institucional)</strong>: ese mentor impecable que no manipula, sino que despierta gigantes.
                </p>
                <div style={{ textAlign: 'center', margin: '2rem 0 1rem' }}>
                  <button 
                    onClick={() => setActiveChapter('cap1')}
                    className="btn-primary"
                    style={{ background: 'linear-gradient(135deg, var(--crear-gold, #ffb703) 0%, #d97706 100%)', color: '#000', fontWeight: 800, padding: '12px 30px', borderRadius: '30px', border: 'none', cursor: 'pointer', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <span>Comenzar Capítulo 1: El Despertar del Guía</span> <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* CAPÍTULO 1: EL DESPERTAR DEL GUÍA (NO ERES LUKE, ERES YODA)    */}
          {/* ============================================================== */}
          {activeChapter === 'cap1' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
              <div>
                <span style={{ color: 'var(--crear-gold, #ffb703)', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  CAPÍTULO 1
                </span>
                <h2 style={{ fontSize: '2rem', margin: '0.3rem 0', fontWeight: 800, color: '#fff' }}>
                  EL DESPERTAR DEL GUÍA (No eres Luke, eres Yoda)
                </h2>
              </div>

              {/* SÍNDROME DEL HÉROE EGOCÉNTRICO */}
              <div style={{ fontSize: '1.05rem', lineHeight: '1.8', color: '#cbd5e1' }}>
                <h3 style={{ color: 'var(--crear-gold, #ffb703)', fontSize: '1.3rem', margin: '0 0 0.8rem' }}>
                  El síndrome del "Héroe Egocéntrico"
                </h3>
                <p>
                  Imagina que vas a ver una película de <em>Star Wars</em>. En los primeros cinco minutos, aparece un personaje llamado Yoda. Yoda se para frente a la cámara, saca sus medallas, muestra su sable de luz y empieza a hablar durante dos horas sobre lo increíble que es, lo fuerte que maneja la fuerza y cuántos imperios ha destruido él solo. Al final de la película, Luke Skywalker no hace nada y Yoda se lleva todos los aplausos.
                </p>
                <p>
                  ¿Irías a ver la secuela? ¡Claro que no! Sería una película espantosa.
                </p>
                <p>
                  Sin embargo, <strong>así es exactamente como la mayoría de los negocios y líderes intentan enrolar</strong>. Llegan frente al participante (o cliente) y le dicen: <em>«Mira mis certificaciones, mira mi salón de entrenamiento, mira lo grandioso que soy»</em>. Se posicionan como el héroe de la historia.
                </p>
              </div>

              {/* GRÁFICA NARRATIVA 2: DUELO ARQUETÍPICO LUKE VS YODA */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.8rem' }}>
                <h4 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Compass size={18} color="var(--crear-gold, #ffb703)" />
                  Duelo Arquetípico: Posicionamiento StoryBrand (SB7)
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  {/* LUKE: EL CLIENTE / PARTICIPANTE */}
                  <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(0,0,0,0.4) 100%)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '14px', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.8rem' }}>
                      <span style={{ fontSize: '2rem' }}>⚔️</span>
                      <div>
                        <strong style={{ color: '#f87171', fontSize: '1.1rem' }}>Luke Skywalker</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #9ca3af)', textTransform: 'uppercase' }}>El Participante (El Héroe)</div>
                      </div>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', color: '#e2e8f0', lineHeight: '1.7' }}>
                      <li>Tiene un problema interno (miedo, quiebre, incertidumbre).</li>
                      <li>Tiene que enfrentarse a su propio Imperio y destruir su Estrella de la Muerte.</li>
                      <li>Es el verdadero protagonista de la victoria.</li>
                      <li><strong>No busca a otro héroe desorientado en la sala.</strong></li>
                    </ul>
                  </div>

                  {/* YODA: EL GUÍA / ENROLADOR */}
                  <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(0,0,0,0.4) 100%)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '14px', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.8rem' }}>
                      <span style={{ fontSize: '2rem' }}>🧙‍♂️</span>
                      <div>
                        <strong style={{ color: '#34d399', fontSize: '1.1rem' }}>Maestro Yoda</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #9ca3af)', textTransform: 'uppercase' }}>Tu Marca / El Enrolador Causa OS (El Guía)</div>
                      </div>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', color: '#e2e8f0', lineHeight: '1.7' }}>
                      <li><strong>Empatía:</strong> Demuestra que comprende su dolor en "la arena".</li>
                      <li><strong>Autoridad:</strong> Provee el mapa probado, las herramientas y la sabiduría.</li>
                      <li>No compite por ser el más importante ni se lleva el aplauso.</li>
                      <li><strong>Sostiene el contenedor seguro para que el héroe triunfe.</strong></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* LA REGLA DE ORO DE STORYBRAND */}
              <div style={{ fontSize: '1.05rem', lineHeight: '1.8', color: '#cbd5e1' }}>
                <h3 style={{ color: 'var(--crear-gold, #ffb703)', fontSize: '1.3rem', margin: '0 0 0.8rem' }}>
                  La regla de oro de StoryBrand: El cliente es el héroe
                </h3>
                <p>
                  El <strong>StoryBrand Framework</strong> nos enseña una ley innegociable: <strong>tu cliente o participante es Luke Skywalker; tu marca o tu staff es Yoda.</strong>
                </p>
                <p>
                  El cliente es quien tiene que enfrentarse al Imperio, tomar las decisiones difíciles y destruir la Estrella de la Muerte. Él es el protagonista. Tu único trabajo es ser el <strong>Guía</strong>:
                </p>
                <ul>
                  <li><strong>Empatía:</strong> Demostrar que entiendes su dolor en "la arena" de la vida cotidiana.</li>
                  <li><strong>Autoridad:</strong> Proveer las herramientas, el andamiaje y el mapa seguro para que él logre su victoria.</li>
                </ul>
                <p>
                  Cuando dejas de competir con tu cliente por ver quién es el más importante de la sala, su resistencia se desarma. El participante no busca a otro héroe desorientado; busca desesperadamente un mentor con un plan.
                </p>

                {/* Tarjeta de Cita Copiable */}
                <div style={{ marginTop: '1.5rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontStyle: 'italic', color: '#fde047', fontSize: '0.95rem' }}>
                    «El participante no busca a otro héroe desorientado en la sala; busca desesperadamente un mentor empático con un mapa claro».
                  </div>
                  <button 
                    onClick={() => handleCopy('El participante no busca a otro héroe desorientado en la sala; busca desesperadamente un mentor empático con un mapa claro.', 'quote_yoda')}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                  >
                    {copiedQuote === 'quote_yoda' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    {copiedQuote === 'quote_yoda' ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                <button onClick={() => setActiveChapter('bienvenida')} className="btn-secondary" style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', cursor: 'pointer' }}>
                  ← Anterior
                </button>
                <button onClick={() => setActiveChapter('cap2')} className="btn-primary" style={{ padding: '8px 24px', borderRadius: '20px', background: 'var(--crear-gold, #ffb703)', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                  Capítulo 2: El Perro Guardián →
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* CAPÍTULO 2: ANATOMÍA DE LA MENTE HUMANA (EL PERRO GUARDIÁN)   */}
          {/* ============================================================== */}
          {activeChapter === 'cap2' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
              <div>
                <span style={{ color: 'var(--crear-gold, #ffb703)', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  CAPÍTULO 2
                </span>
                <h2 style={{ fontSize: '2rem', margin: '0.3rem 0', fontWeight: 800, color: '#fff' }}>
                  ANATOMÍA DE LA MENTE HUMANA (Cómo amansar al Perro Guardián)
                </h2>
              </div>

              <div style={{ fontSize: '1.05rem', lineHeight: '1.8', color: '#cbd5e1' }}>
                <p>
                  Para influir de manera ética, primero debemos comprender cómo está cableado el cerebro de la persona que tenemos enfrente. Olvídate de la neurociencia compleja; veámoslo como una casa con tres habitantes muy particulares.
                </p>
              </div>

              {/* GRÁFICA NARRATIVA 3: EL TEMPLO DE LA DECISIÓN Y SELECTOR DE ALARMA */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Brain size={18} color="var(--crear-gold, #ffb703)" />
                    El Templo de la Decisión: 3 Cerebros en Acción
                  </h4>

                  {/* Interruptor Interactivo: Discurso Agresivo vs Fisonomía de Calma */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '0.8rem', color: dogAlertMode ? 'var(--text-muted)' : '#34d399', fontWeight: !dogAlertMode ? 800 : 400 }}>
                      🐶 Fisonomía de Calma
                    </span>
                    <button
                      onClick={() => setDogAlertMode(!dogAlertMode)}
                      style={{
                        width: '46px',
                        height: '24px',
                        borderRadius: '12px',
                        background: dogAlertMode ? '#ef4444' : '#10b981',
                        border: 'none',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: '#fff',
                        position: 'absolute',
                        top: '3px',
                        left: dogAlertMode ? '25px' : '3px',
                        transition: 'all 0.2s ease'
                      }} />
                    </button>
                    <span style={{ fontSize: '0.8rem', color: dogAlertMode ? '#f87171' : 'var(--text-muted)', fontWeight: dogAlertMode ? 800 : 400 }}>
                      🚨 Discurso que Altera
                    </span>
                  </div>
                </div>

                {/* Visualización de los 3 Cerebros */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* 1. Neocórtex */}
                  <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px', padding: '1.2rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '2rem' }}>🔬</div>
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: '#38bdf8', fontSize: '1rem' }}>3. El Científico (Neocórtex) — 5% de la decisión</strong>
                      <p style={{ margin: '0.3rem 0 0', fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                        Lógico, lento, busca datos fríos y calcula estadísticas. Solo se activa cuando los otros dos ya decidieron emocionalmente y le piden: <em>«Oye, busca argumentos lógicos para justificar por qué pagamos esto»</em>.
                      </p>
                    </div>
                  </div>

                  {/* 2. Límbico */}
                  <div style={{ background: 'rgba(236, 72, 153, 0.05)', border: '1px solid rgba(236, 72, 153, 0.2)', borderRadius: '12px', padding: '1.2rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '2rem' }}>💙</div>
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: '#f472b6', fontSize: '1rem' }}>2. El Lector Emocional (Cerebro Límbico) — Conexión y Vínculo</strong>
                      <p style={{ margin: '0.3rem 0 0', fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                        Procesa los sentimientos, el estatus y la confianza. No entiende de números ni palabras técnicas, pero <strong>siente la fisonomía de tu voz y tu mirada</strong>. Decide con base en la empatía y la seguridad transmitida.
                      </p>
                    </div>
                  </div>

                  {/* 3. Reptiliano / Perro Guardián con estado dinámico */}
                  <div style={{
                    background: dogAlertMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.08)',
                    border: `1px solid ${dogAlertMode ? '#ef4444' : '#10b981'}`,
                    borderRadius: '12px',
                    padding: '1.4rem',
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'flex-start',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ fontSize: '2.5rem' }}>
                      {dogAlertMode ? '🐺💢' : '🐶💤'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: dogAlertMode ? '#f87171' : '#34d399', fontSize: '1.05rem' }}>
                          1. El Perro Guardián (Cerebro Reptiliano) — Puerta de Entrada
                        </strong>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: dogAlertMode ? '#ef4444' : '#10b981', color: '#000' }}>
                          {dogAlertMode ? 'MODO ALERTA ACTIVADO' : 'ESTADO: CALMA Y SEGURIDAD'}
                        </span>
                      </div>
                      <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', color: '#e2e8f0', lineHeight: '1.6' }}>
                        {dogAlertMode ? (
                          <span style={{ color: '#fca5a5' }}>
                            <strong>¡AMENAZA DETECTADA!</strong> El tono agresivo o la exigencia de pago disparan la alarma: <em>«¡Me van a quitar mi dinero y me están presionando!»</em>. El perro muerde o huye con excusas automáticas («tengo que pensarlo», «no tengo tiempo»).
                          </span>
                        ) : (
                          <span style={{ color: '#a7f3d0' }}>
                            <strong>SEGURIDAD BIOLÓGICA CONFIRMADA.</strong> Con tono calmado, mirada limpia y respeto absoluto por su libre albedrío, el guardián ahorra energía y se echa a dormir. La puerta queda abierta para que el cerebro límbico escuche con el corazón.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* LA FISONOMÍA DE LA CALMA */}
              <div style={{ fontSize: '1.05rem', lineHeight: '1.8', color: '#cbd5e1' }}>
                <h3 style={{ color: 'var(--crear-gold, #ffb703)', fontSize: '1.3rem', margin: '0 0 0.8rem' }}>
                  La fisonomía de la calma: Cómo hablarles en sala
                </h3>
                <p>
                  Si te acercas a un participante el viernes de Capítulo Dos con un tono tenso, exigiéndole el pago de su Maestría de manera agresiva, el <strong>Perro Guardián</strong> se despierta asustado: <em>«¡Peligro! Me van a quitar mi dinero y me están presionando»</em>. Se activa su modo defensivo y te dirá cualquier excusa con tal de huir.
                </p>
                <p>
                  Para calmar al guardián, debes aplicar la <strong>Mente de Principiante</strong> de Rick Rubin:
                </p>
                <ul>
                  <li><strong>Baja el tono de voz:</strong> Habla con calma y ritmo (fisonomía de seguridad).</li>
                  <li><strong>Usa la mirada limpia:</strong> Sin juicios, sin la expectativa tensa de «tengo que cerrarlo».</li>
                  <li><strong>Dales seguridad:</strong> Hazles saber que respetas su libre albedrío y que su decisión de asistir o no es 100% libre. Al saber que no hay una soga en su cuello, el perro guardián se echa a dormir y el corazón (cerebro límbico) se abre para escuchar la propuesta.</li>
                </ul>

                <div style={{ marginTop: '1.5rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontStyle: 'italic', color: '#fde047', fontSize: '0.95rem' }}>
                    «Al saber que no hay una soga en su cuello, el perro guardián se echa a dormir y el corazón se abre para escuchar la propuesta».
                  </div>
                  <button 
                    onClick={() => handleCopy('Al saber que no hay una soga en su cuello, el perro guardián se echa a dormir y el corazón se abre para escuchar la propuesta.', 'quote_perro')}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                  >
                    {copiedQuote === 'quote_perro' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    {copiedQuote === 'quote_perro' ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                <button onClick={() => setActiveChapter('cap1')} className="btn-secondary" style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', cursor: 'pointer' }}>
                  ← Capítulo 1
                </button>
                <button onClick={() => setActiveChapter('cap3')} className="btn-primary" style={{ padding: '8px 24px', borderRadius: '20px', background: 'var(--crear-gold, #ffb703)', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                  Capítulo 3: La Ecuación de Valor →
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* CAPÍTULO 3: LA ECUACIÓN DE VALOR EN PLASTILINA (HORMOZI)       */}
          {/* ============================================================== */}
          {activeChapter === 'cap3' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
              <div>
                <span style={{ color: 'var(--crear-gold, #ffb703)', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  CAPÍTULO 3
                </span>
                <h2 style={{ fontSize: '2rem', margin: '0.3rem 0', fontWeight: 800, color: '#fff' }}>
                  LA ECUACIÓN DE VALOR EN PLASTILINA
                </h2>
              </div>

              <div style={{ fontSize: '1.05rem', lineHeight: '1.8', color: '#cbd5e1' }}>
                <p>
                  El genio de los negocios Alex Hormozi resumió por qué la gente compra (o se enrola) en una fórmula matemática brillante. Si aprendes a dominar esta balanza, nunca más tendrás que suplicar una inscripción.
                </p>
              </div>

              {/* GRÁFICA NARRATIVA 4: BALANZA INTERACTIVA DE HORMOZI */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Scale size={18} color="var(--crear-gold, #ffb703)" />
                    Balanza Matemática del Valor Percibido
                  </h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Fórmula Oficial Alex Hormozi ($100M Offers)
                  </div>
                </div>

                {/* Display Central del Valor */}
                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ fontFamily: 'monospace', color: '#fbbf24', fontSize: '1rem', marginBottom: '0.5rem' }}>
                    Valor = (Resultado [{valSueno}] × Certeza [{valCerteza}]) / (Retraso [{valTiempo}] × Esfuerzo [{valEsfuerzo}])
                  </div>
                  <div style={{ fontSize: '2.8rem', fontWeight: 900, color: calculatedValue >= 20 ? '#34d399' : calculatedValue >= 8 ? 'var(--crear-gold, #ffb703)' : '#f87171' }}>
                    {calculatedValue}x
                  </div>
                  <span style={{ fontSize: '0.78rem', padding: '3px 12px', borderRadius: '12px', background: calculatedValue >= 20 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: calculatedValue >= 20 ? '#34d399' : '#fbbf24', fontWeight: 800 }}>
                    {calculatedValue >= 20 ? '💎 OFERTA IRRESISTIBLE (VALOR INFINITO)' : '⚖️ BALANCE EQUILIBRADO'}
                  </span>
                </div>

                {/* 4 Controles de Plastilina */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                      <strong style={{ color: '#34d399' }}>🍲 Resultado Anhelado</strong>
                      <span>{valSueno}/10</span>
                    </div>
                    <input type="range" min="1" max="10" value={valSueno} onChange={e => setValSueno(Number(e.target.value))} style={{ width: '100%', accentColor: '#10b981' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Vender el destino, no el boleto.</span>
                  </div>

                  <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                      <strong style={{ color: '#38bdf8' }}>🌉 Certeza de Logro</strong>
                      <span>{valCerteza}/10</span>
                    </div>
                    <input type="range" min="1" max="10" value={valCerteza} onChange={e => setValCerteza(Number(e.target.value))} style={{ width: '100%', accentColor: '#38bdf8' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Garantía Condicionada de Integridad.</span>
                  </div>

                  <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                      <strong style={{ color: '#fbbf24' }}>🍎 Retraso Temporal</strong>
                      <span>{valTiempo}/10</span>
                    </div>
                    <input type="range" min="1" max="10" value={valTiempo} onChange={e => setValTiempo(Number(e.target.value))} style={{ width: '100%', accentColor: '#f59e0b' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Fast Win en menos de 24 horas.</span>
                  </div>

                  <div style={{ background: 'rgba(236, 72, 153, 0.05)', border: '1px solid rgba(236, 72, 153, 0.2)', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                      <strong style={{ color: '#f472b6' }}>💊 Esfuerzo & Sacrificio</strong>
                      <span>{valEsfuerzo}/10</span>
                    </div>
                    <input type="range" min="1" max="10" value={valEsfuerzo} onChange={e => setValEsfuerzo(Number(e.target.value))} style={{ width: '100%', accentColor: '#ec4899' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Nodus absorbe la fricción técnica.</span>
                  </div>
                </div>
              </div>

              {/* DETALLE DEL NUMERADOR Y DENOMINADOR */}
              <div style={{ fontSize: '1.05rem', lineHeight: '1.8', color: '#cbd5e1' }}>
                <h3 style={{ color: 'var(--crear-gold, #ffb703)', fontSize: '1.3rem', margin: '0 0 0.8rem' }}>
                  El Numerador (¡Multiplícalo por 100!)
                </h3>
                <ul>
                  <li>
                    <strong>Resultado Anhelado (Dream Outcome):</strong> Deja de vender "fines de semana en un hotel". Vende el destino: recuperar la paz familiar, duplicar las ventas de su negocio o liberarse de la ansiedad financiera. Pinta esa imagen con palabras vivas.
                  </li>
                  <li>
                    <strong>Probabilidad Percibida de Logro (Certeza):</strong> Al participante le aterra pagar y volver a fallar. Para elevar la certeza, muéstrale los testimonios reales del equipo y la infraestructura de soporte tecnológico de la <strong>Plataforma Nodus</strong>. Introduce la poderosa <strong>Garantía Condicionada de Integridad</strong>: <em>«Si tú sigues el sistema al 100% y no logras tu meta, te devolvemos tu dinero. El riesgo es nuestro, no tuyo»</em>.
                  </li>
                </ul>

                <h3 style={{ color: 'var(--crear-gold, #ffb703)', fontSize: '1.3rem', margin: '1.5rem 0 0.8rem' }}>
                  El Denominador (¡Redúcelo a Cero!)
                </h3>
                <ul>
                  <li>
                    <strong>Retraso Temporal (Time Delay):</strong> ¿Cuánto tiempo pasa entre que pago e inicio a experimentar el valor? Si es mucho, la mente se enfría. Ofrece un <strong>Fast Win (Victoria Rápida)</strong> instantáneo: una llamada de onboarding en menos de 24 horas o un kit digital de herramientas de Causa OS el mismo domingo en su celular.
                  </li>
                  <li>
                    <strong>Esfuerzo y Sacrificio:</strong> El enemigo silencioso. Si el participante piensa que la Maestría será un calvario de tareas difíciles, su cerebro reptil huirá. Muéstrale que la <strong>Plataforma Nodus</strong> simplifica todo: registrará sus evidencias y metas de los <em>28 Entrenamientos Sustentables</em> en un par de toques rápidos desde su teléfono móvil. No le pedimos más esfuerzo, le damos un andamiaje que absorbe la fricción cotidiana.
                  </li>
                </ul>

                <div style={{ marginTop: '1.5rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontStyle: 'italic', color: '#fde047', fontSize: '0.95rem' }}>
                    «No le pedimos más esfuerzo al participante; le damos un andamiaje tecnológico que absorbe la fricción cotidiana».
                  </div>
                  <button 
                    onClick={() => handleCopy('No le pedimos más esfuerzo al participante; le damos un andamiaje tecnológico que absorbe la fricción cotidiana.', 'quote_hormozi')}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                  >
                    {copiedQuote === 'quote_hormozi' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    {copiedQuote === 'quote_hormozi' ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                <button onClick={() => setActiveChapter('cap2')} className="btn-secondary" style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', cursor: 'pointer' }}>
                  ← Capítulo 2
                </button>
                <button onClick={() => setActiveChapter('cap4')} className="btn-primary" style={{ padding: '8px 24px', borderRadius: '20px', background: 'var(--crear-gold, #ffb703)', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                  Capítulo 4: El Mapa en 3 Pasos →
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* CAPÍTULO 4: EL MAPA DE RUTA EN 3 PASOS                         */}
          {/* ============================================================== */}
          {activeChapter === 'cap4' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
              <div>
                <span style={{ color: 'var(--crear-gold, #ffb703)', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  CAPÍTULO 4
                </span>
                <h2 style={{ fontSize: '2rem', margin: '0.3rem 0', fontWeight: 800, color: '#fff' }}>
                  EL MAPA DE RUTA EN 3 PASOS
                </h2>
              </div>

              <div style={{ fontSize: '1.05rem', lineHeight: '1.8', color: '#cbd5e1' }}>
                <p>
                  Para enrolar a un participante de forma fluida y profesional, el staff de mánagers debe guiarlo a través de un puente invisible de <strong>tres pasos sencillos</strong>. Si te saltas uno, la conversión se desploma.
                </p>
              </div>

              {/* GRÁFICA NARRATIVA 5: EL MAPA DE RUTA EN 3 PASOS Y TICKET VERDE */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.8rem' }}>
                <h4 style={{ margin: '0 0 1.2rem', fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={18} color="var(--crear-gold, #ffb703)" />
                  El Puente Invisible de Conversión Ética
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.2rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '12px', padding: '1.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                      <span style={{ background: '#38bdf8', color: '#000', fontWeight: 900, borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>1</span>
                      <strong style={{ color: '#38bdf8' }}>Calibrar el Sueño</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                      Conecta con su «Para Qué» profundo mediante preguntas abiertas. Identifica su quiebre y qué transformaría en 90 días.
                    </p>
                  </div>

                  <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '12px', padding: '1.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                      <span style={{ background: '#c084fc', color: '#000', fontWeight: 900, borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>2</span>
                      <strong style={{ color: '#c084fc' }}>Mostrar el Andamiaje</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                      Disuelve el miedo a fallar solo. Presenta al Mánager de alineación, al Buddy y a Nodus como andamiaje libre de drama.
                    </p>
                  </div>

                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '1.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                      <span style={{ background: '#34d399', color: '#000', fontWeight: 900, borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>3</span>
                      <strong style={{ color: '#34d399' }}>Sellar la Palabra</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                      Acción física en caja. El abono o reserva emite el Ticket Verde en el sistema activando el principio de consistencia.
                    </p>
                  </div>
                </div>

                {/* Simulador Interactivo del Ticket Verde de la Integridad */}
                <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '1.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <strong style={{ color: '#34d399', fontSize: '0.95rem' }}>
                        Simulador del «Ticket Verde de la Integridad»
                      </strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Prueba en vivo la emisión de palabra y compromiso para caja
                      </div>
                    </div>
                    <button
                      onClick={() => setTicketIssued(true)}
                      style={{ background: '#10b981', color: '#000', fontWeight: 800, padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.82rem' }}
                    >
                      Emitir Ticket Verde
                    </button>
                  </div>

                  {ticketIssued && (
                    <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(0,0,0,0.6) 100%)', border: '2px dashed #10b981', borderRadius: '10px', padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 800, letterSpacing: '0.05em' }}>
                          CREAR PODER SIN LÍMITES • PLATAFORMA NODUS
                        </div>
                        <h4 style={{ margin: '0.2rem 0', color: '#fff', fontSize: '1.2rem' }}>
                          TICKET VERDE: COMPROMISO OFICIAL SELLADO
                        </h4>
                        <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                          Participante: <strong>{ticketPxName}</strong> | Estado: <span style={{ color: '#34d399', fontWeight: 800 }}>RESERVA VALIDADA EN CAJA</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '2rem' }}>🎟️✅</div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Código: VERDE-MJ-2026</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* FRASES MÁGICAS DEL PLAN */}
              <div style={{ fontSize: '1.05rem', lineHeight: '1.8', color: '#cbd5e1' }}>
                <h3 style={{ color: 'var(--crear-gold, #ffb703)', fontSize: '1.3rem', margin: '0 0 0.8rem' }}>
                  Las Frases Mágicas del Plan de 3 Pasos
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', borderLeft: '4px solid #38bdf8', padding: '1rem', borderRadius: '8px' }}>
                    <strong style={{ color: '#38bdf8', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>
                      Paso 1 (Calibración del Sueño):
                    </strong>
                    <div style={{ fontStyle: 'italic', color: '#fff', fontSize: '0.95rem' }}>
                      «Si tuvieras la certeza absoluta de que el tiempo o el dinero no fueran un obstáculo, ¿qué resultado extraordinario diseñarías para ti en los siguientes 3 meses?»
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', borderLeft: '4px solid #c084fc', padding: '1rem', borderRadius: '8px' }}>
                    <strong style={{ color: '#c084fc', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>
                      Paso 2 (Andamiaje sin Fricción):
                    </strong>
                    <div style={{ fontStyle: 'italic', color: '#fff', fontSize: '0.95rem' }}>
                      «Sostener una meta grande solo es casi imposible. Por eso diseñamos un andamiaje digital. Con Nodus y tu buddy, reportarás tus retos en segundos desde tu celular, asegurando que tu avance sea constante y libre de frustración.»
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', borderLeft: '4px solid #34d399', padding: '1rem', borderRadius: '8px' }}>
                    <strong style={{ color: '#34d399', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>
                      Paso 3 (El Ticket Verde de la Integridad):
                    </strong>
                    <div style={{ fontStyle: 'italic', color: '#fff', fontSize: '0.95rem' }}>
                      «Sellar tu reserva hoy en caja es la acción física concreta que le demuestra a tu mente que estás jugando en serio con tu palabra. Registremos tu abono para que el sistema emita tu Ticket Verde y el juego de tu transformación comience oficialmente hoy.»
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                <button onClick={() => setActiveChapter('cap3')} className="btn-secondary" style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', cursor: 'pointer' }}>
                  ← Capítulo 3
                </button>
                <button onClick={() => setActiveChapter('cap5')} className="btn-primary" style={{ padding: '8px 24px', borderRadius: '20px', background: 'var(--crear-gold, #ffb703)', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                  Capítulo 5: Rescate de Rezagados →
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* CAPÍTULO 5: EL RESCATE DE LOS OLVIDADOS (REZAGADOS C1)         */}
          {/* ============================================================== */}
          {activeChapter === 'cap5' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
              <div>
                <span style={{ color: 'var(--crear-gold, #ffb703)', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  CAPÍTULO 5
                </span>
                <h2 style={{ fontSize: '2rem', margin: '0.3rem 0', fontWeight: 800, color: '#fff' }}>
                  EL RESCATE DE LOS OLVIDADOS (Los Rezagados de C1)
                </h2>
              </div>

              <div style={{ fontSize: '1.05rem', lineHeight: '1.8', color: '#cbd5e1' }}>
                <h3 style={{ color: 'var(--crear-gold, #ffb703)', fontSize: '1.3rem', margin: '0 0 0.8rem' }}>
                  ¿Quiénes son y por qué están congelados?
                </h3>
                <p>
                  Los <strong>Rezagados de C1</strong> son participantes que ya pagaron su entrenamiento pero, por miedo o inercia, no se han sentado en el salón de Capítulo Uno. Se encuentran atrapados en "la arena" de la rutina diaria. Su cerebro reptil ha congelado su acción.
                </p>
              </div>

              {/* GRÁFICA NARRATIVA 6: PROTOCOLO OPERATIVO MILITAR Y AMOROSO */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.8rem' }}>
                <h4 style={{ margin: '0 0 1.2rem', fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={18} color="#ef4444" />
                  Protocolo Militar y Amoroso de Rescate de Rezagados
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.2rem' }}>
                  <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', padding: '1.2rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f87171', textTransform: 'uppercase', marginBottom: '4px' }}>
                      1. Cronograma
                    </div>
                    <strong style={{ color: '#fff', fontSize: '1rem', display: 'block', marginBottom: '6px' }}>
                      La Llamada del Martes
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                      El Coordinador de C1/C2 (CC1Y2) debe realizar las llamadas de recuperación los <strong>martes de la Semana de Preparación</strong> y los <strong>martes de la Semana de Ejecución</strong> de C1.
                    </p>
                  </div>

                  <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '12px', padding: '1.2rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '4px' }}>
                      2. Deadline Innegociable
                    </div>
                    <strong style={{ color: '#fff', fontSize: '1rem', display: 'block', marginBottom: '6px' }}>
                      Miércoles 13:00 PM
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                      Todas las confirmaciones deben registrarse en Nodus antes de los <strong>miércoles a las 13:00 PM</strong>. Pasada esa hora, las listas se cierran para cuidar la fisonomía y logística del salón.
                    </p>
                  </div>

                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '1.2rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', marginBottom: '4px' }}>
                      3. Código de Honor
                    </div>
                    <strong style={{ color: '#fff', fontSize: '1rem', display: 'block', marginBottom: '6px' }}>
                      No Hay Devoluciones
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                      Sostén con firmeza y amor la inversión ya realizada. El dinero ya está trabajando en su transformación; reubica su fecha sin ceder a la postergación.
                    </p>
                  </div>
                </div>
              </div>

              {/* GUIÓN OFICIAL DE NO DEVOLUCIONES */}
              <div style={{ fontSize: '1.05rem', lineHeight: '1.8', color: '#cbd5e1' }}>
                <h3 style={{ color: 'var(--crear-gold, #ffb703)', fontSize: '1.3rem', margin: '0 0 0.8rem' }}>
                  El Guión de Firmeza y Amor ante Solicitudes de Reembolso
                </h3>
                <div style={{ background: 'rgba(0,0,0,0.4)', borderLeft: '4px solid var(--crear-gold, #ffb703)', borderRadius: '10px', padding: '1.2rem', position: 'relative' }}>
                  <div style={{ fontStyle: 'italic', color: '#fde047', fontSize: '1rem', lineHeight: '1.7' }}>
                    «Por políticas de sustentabilidad, no realizamos devoluciones de dinero. Sin embargo, mi mayor compromiso de servicio es ayudarte a honrar la inversión que ya hiciste. El dinero ya está trabajando para ti, busquemos de inmediato la fecha que mejor se adapte para que dejes de postergar tu liderazgo.»
                  </div>
                  <div style={{ marginTop: '0.8rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => handleCopy('Por políticas de sustentabilidad, no realizamos devoluciones de dinero. Sin embargo, mi mayor compromiso de servicio es ayudarte a honrar la inversión que ya hiciste. El dinero ya está trabajando para ti, busquemos de inmediato la fecha que mejor se adapte para que dejes de postergar tu liderazgo.', 'quote_rezagados')}
                      style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                    >
                      {copiedQuote === 'quote_rezagados' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      {copiedQuote === 'quote_rezagados' ? 'Copiado' : 'Copiar Guión'}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                <button onClick={() => setActiveChapter('cap4')} className="btn-secondary" style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', cursor: 'pointer' }}>
                  ← Capítulo 4
                </button>
                <button onClick={() => setActiveChapter('cap6')} className="btn-primary" style={{ padding: '8px 24px', borderRadius: '20px', background: 'var(--crear-gold, #ffb703)', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                  Capítulo 6: La Bitácora Cuántica →
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* CAPÍTULO 6: LA BITÁCORA DEL GUERRERO CUÁNTICO (CAUSA VS EFECTO) */}
          {/* ============================================================== */}
          {activeChapter === 'cap6' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
              <div>
                <span style={{ color: 'var(--crear-gold, #ffb703)', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  CAPÍTULO 6
                </span>
                <h2 style={{ fontSize: '2rem', margin: '0.3rem 0', fontWeight: 800, color: '#fff' }}>
                  LA BITÁCORA DEL GUERRERO CUÁNTICO (Causa vs. Espectador)
                </h2>
              </div>

              <div style={{ fontSize: '1.05rem', lineHeight: '1.8', color: '#cbd5e1' }}>
                <h3 style={{ color: 'var(--crear-gold, #ffb703)', fontSize: '1.3rem', margin: '0 0 0.8rem' }}>
                  La Distinción Fundamental: Causa vs. Efecto
                </h3>
                <p>
                  En la cultura de alto rendimiento de <strong>CREAR PODER SIN LÍMITES</strong>, eliminamos las excusas del vocabulario:
                </p>
                <ul>
                  <li>
                    <strong>El Espectador (Efecto):</strong> Se queja en "la arena" de la vida. Culpa al tráfico, al clima, al participante indeciso o al sistema por su falta de resultados. Vive en la resignación.
                  </li>
                  <li>
                    <strong>El Creador (Causa):</strong> Se asume como la <strong>fuente absoluta de su realidad</strong>. Si un participante no se inscribe, el enrolador no dice <em>«es que el cliente es difícil»</em>; se pregunta: <em>¿Qué faltó en mi fisonomía de voz, en mi escucha o en mi nivel de presencia para despertar su compromiso?</em>
                  </li>
                </ul>
              </div>

              {/* GRÁFICA NARRATIVA 7: EL TABLERO CUÁNTICO ARENA VS CONTEXTO */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={18} color="var(--crear-gold, #ffb703)" />
                    El Tablero de Control de la Realidad
                  </h4>

                  {/* Toggle Arena vs Contexto */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setArenaMode(true)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: arenaMode ? '#ef4444' : 'rgba(255,255,255,0.1)',
                        background: arenaMode ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                        color: arenaMode ? '#f87171' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 700
                      }}
                    >
                      🌫️ La Arena (Efecto)
                    </button>
                    <button
                      onClick={() => setArenaMode(false)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: !arenaMode ? '#10b981' : 'rgba(255,255,255,0.1)',
                        background: !arenaMode ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                        color: !arenaMode ? '#34d399' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 700
                      }}
                    >
                      ⚡ El Contexto (Causa OS)
                    </button>
                  </div>
                </div>

                {/* Display Dinámico */}
                {arenaMode ? (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '1.5rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f87171', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                      ESTADO ONTOLÓGICO: MODO EFECTO / VÍCTIMA
                    </div>
                    <h4 style={{ margin: '0 0 0.8rem', color: '#fff', fontSize: '1.2rem' }}>
                      «La Arena de la Vida» — Quejas, Drama y Suposiciones
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.92rem', color: '#fca5a5', lineHeight: '1.7' }}>
                      • Culpa al clima, a la economía o al prospecto por no contestar.<br />
                      • Conclusiones basadas en el estado emocional del momento («la gente no tiene plata»).<br />
                      • Cero registro en plataforma: las metas se pierden en el olvido.<br />
                      • <strong>Resultado:</strong> Desgaste biológico masivo, fricción y estancamiento.
                    </p>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '1.5rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                      ESTADO ONTOLÓGICO: MODO CAUSA / CREADOR
                    </div>
                    <h4 style={{ margin: '0 0 0.8rem', color: '#fff', fontSize: '1.2rem' }}>
                      «El Contexto» — Hechos Duros y Datos Registrados en Nodus
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.92rem', color: '#a7f3d0', lineHeight: '1.7' }}>
                      • <strong>Sin datos registrados, no hay conclusiones.</strong> Cero drama.<br />
                      • Asistencias validadas con QR, transacciones monetarias frías y evidencias auditadas.<br />
                      • Si algo no funciona, el líder pregunta: <em>¿Qué diseño en mi fisonomía y en mi oferta para cambiar el resultado hoy?</em><br />
                      • <strong>Resultado:</strong> Transformación continua, certeza matemática y enrolamiento fluido.
                    </p>
                  </div>
                )}
              </div>

              {/* INTEGRACIÓN EN SEDE */}
              <div style={{ fontSize: '1.05rem', lineHeight: '1.8', color: '#cbd5e1' }}>
                <h3 style={{ color: 'var(--crear-gold, #ffb703)', fontSize: '1.3rem', margin: '0 0 0.8rem' }}>
                  Integración en la Sede: Datos vs. Suposiciones
                </h3>
                <p>
                  Para operar como verdaderos guerreros cuánticos, todo el staff debe regirse por la premisa de que <strong>"sin datos registrados, no hay conclusiones"</strong>:
                </p>
                <ul>
                  <li>La <strong>Plataforma Nodus</strong> registra los hechos fríos y objetivos (asistencias con código QR, transacciones monetarias reales, evidencias cargadas de Futuros Imposibles).</li>
                  <li><strong>Causa OS</strong> organiza las acciones y las conversaciones de coaching basándose únicamente en esos datos reales, erradicando el drama y las interpretaciones subjetivas.</li>
                </ul>
                <p>
                  Cuando un líder une la precisión de la tecnología con la responsabilidad radical de su Ser, se convierte en un imán de abundancia y transformación, logrando resultados extraordinarios de manera predecible y constante.
                </p>

                <div style={{ marginTop: '1.5rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontStyle: 'italic', color: '#fde047', fontSize: '0.95rem' }}>
                    «Cuando un líder une la precisión de la tecnología con la responsabilidad radical de su Ser, se convierte en un imán de abundancia y transformación».
                  </div>
                  <button 
                    onClick={() => handleCopy('Cuando un líder une la precisión de la tecnología con la responsabilidad radical de su Ser, se convierte en un imán de abundancia y transformación.', 'quote_causa')}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                  >
                    {copiedQuote === 'quote_causa' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    {copiedQuote === 'quote_causa' ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                <button onClick={() => setActiveChapter('cap5')} className="btn-secondary" style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', cursor: 'pointer' }}>
                  ← Capítulo 5
                </button>
                <button onClick={() => setActiveChapter('epilogo')} className="btn-primary" style={{ padding: '8px 24px', borderRadius: '20px', background: 'var(--crear-gold, #ffb703)', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                  Epílogo: El Manifiesto IMO →
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* EPÍLOGO: LA PROMESA DEL LÍDER IMO                              */}
          {/* ============================================================== */}
          {activeChapter === 'epilogo' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
              <div>
                <span style={{ color: 'var(--crear-gold, #ffb703)', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  EPÍLOGO
                </span>
                <h2 style={{ fontSize: '2rem', margin: '0.3rem 0', fontWeight: 800, color: '#fff' }}>
                  LA PROMESA DEL LÍDER IMO
                </h2>
              </div>

              {/* GRÁFICA NARRATIVA 8: EL MEDALLÓN Y MANIFIESTO DEL LÍDER IMO */}
              <div style={{ background: 'linear-gradient(135deg, rgba(255, 183, 3, 0.15) 0%, rgba(0,0,0,0.8) 100%)', border: '2px solid var(--crear-gold, #ffb703)', borderRadius: '20px', padding: '2.5rem', textAlign: 'center', boxShadow: '0 15px 40px rgba(255, 183, 3, 0.2)' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏆✨</div>
                <span style={{ background: 'var(--crear-gold, #ffb703)', color: '#000', padding: '4px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 900, letterSpacing: '0.05em' }}>
                  CREAR PODER SIN LÍMITES
                </span>
                <h3 style={{ fontSize: '1.8rem', margin: '1rem 0 0.5rem', fontWeight: 800, color: '#fff' }}>
                  MANIFIESTO DEL LÍDER DE ALTO RENDIMIENTO
                </h3>
                <p style={{ maxWidth: '780px', margin: '0 auto', fontSize: '1.15rem', color: '#fef08a', lineHeight: '1.8', fontStyle: 'italic' }}>
                  «Enrolar es el acto de amor y servicio más grande que existe. No estás vendiendo un producto; estás sosteniendo un contenedor seguro para que otro ser humano despierte del sueño anestésico de la víctima y se adueñe de su propio destino.»
                </p>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ background: 'rgba(0,0,0,0.5)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ color: '#34d399', fontWeight: 800 }}>🐶 PERRO CALMO</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cero Fricción Biológica</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.5)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ color: '#fbbf24', fontWeight: 800 }}>⚖️ VALOR HORMOZI</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Oferta Irresistible</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.5)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ color: '#38bdf8', fontWeight: 800 }}>🗺️ 3 PASOS</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ticket Verde en Caja</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.5)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ color: '#c084fc', fontWeight: 800 }}>⚡ CAUSA OS</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>100% Creador</div>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '1.05rem', lineHeight: '1.8', color: '#cbd5e1' }}>
                <p>
                  Calma al Perro Guardián, diseña con la Ecuación de Valor, guía con el Plan de 3 Pasos y opera siempre desde la Causa. El salón está listo, las luces están bajas, la música está en fisonomía de poder...
                </p>
                <div style={{ margin: '1.5rem 0', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '1.6rem', color: 'var(--crear-gold, #ffb703)', fontWeight: 900 }}>
                    ¿Estás listo para salir al salón y crear magia?
                  </h3>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <div>
                  *Este libro forma parte del estándar de capacitación unificado de Crear Poder Sin Límites Global.*<br />
                  *Edición 2026 | Clasificación: REVELACIÓN - PARA USO OPERATIVO DE SEDES.*
                </div>
                <button
                  onClick={() => setActiveChapter('bienvenida')}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RotateCcw size={14} /> Volver al Inicio
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
