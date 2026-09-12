import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useUI } from '../context/UIContext';
import { useTheme } from '../context/ThemeContext';
import {
  Sparkles, Download, ArrowLeft, RefreshCw, Plus, Trash2,
  Copy, Sliders, Eye, Terminal, Check,
  Calendar, Zap, CheckCircle2, Award, X
} from 'lucide-react';

// Preset 1: Próximas Fechas de Enrolamiento (Octubre para sedes que ya cerraron Septiembre)
const SEDES_ENROLAMIENTO_PROXIMO = [
  { id: 'mex', ciudad: 'México', fechas: '18, 19 y 20 de septiembre', activo: true, equipo: 'Equipo 8' },
  { id: 'lim', ciudad: 'Lima', fechas: '18, 19 y 20 de septiembre', activo: true, equipo: 'Equipo 31' },
  { id: 'uio', ciudad: 'Quito', fechas: '25, 26 y 27 de septiembre', activo: true, equipo: 'Equipo 128' },
  { id: 'gye', ciudad: 'Guayaquil', fechas: '9, 10 y 11 de octubre', activo: true, equipo: 'Equipo 38' },
  { id: 'cue', ciudad: 'Cuenca', fechas: '16, 17 y 18 de octubre', activo: true, equipo: 'Equipo 24' },
  { id: 'med', ciudad: 'Medellín', fechas: '16, 17 y 18 de octubre', activo: true, equipo: 'Equipo 20' }
];

// Preset 2: Ciclo Inmediato (Septiembre en todas las sedes)
const SEDES_CICLO_INMEDIATO = [
  { id: 'gye', ciudad: 'Guayaquil', fechas: '4, 5 y 6 de septiembre', activo: true, equipo: 'Equipo 37' },
  { id: 'cue', ciudad: 'Cuenca', fechas: '11, 12 y 13 de septiembre', activo: true, equipo: 'Equipo 23' },
  { id: 'med', ciudad: 'Medellín', fechas: '11, 12 y 13 de septiembre', activo: true, equipo: 'Equipo 19' },
  { id: 'mex', ciudad: 'México', fechas: '18, 19 y 20 de septiembre', activo: true, equipo: 'Equipo 8' },
  { id: 'lim', ciudad: 'Lima', fechas: '18, 19 y 20 de septiembre', activo: true, equipo: 'Equipo 31' },
  { id: 'uio', ciudad: 'Quito', fechas: '25, 26 y 27 de septiembre', activo: true, equipo: 'Equipo 128' }
];

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

function getCountryFlag(ciudad = '') {
  const c = ciudad.toLowerCase();
  if (c.includes('lima') || c.includes('arequipa') || c.includes('trujillo') || c.includes('cusco') || c.includes('peru') || c.includes('perú')) return '🇵🇪';
  if (c.includes('quito') || c.includes('guayaquil') || c.includes('cuenca') || c.includes('ecuador')) return '🇪🇨';
  if (c.includes('medell') || c.includes('bogot') || c.includes('cali') || c.includes('colombia')) return '🇨🇴';
  if (c.includes('méx') || c.includes('mex') || c.includes('guadalajara') || c.includes('monterrey')) return '🇲🇽';
  return '🌐';
}

function formatEventDates(startStr, endStr) {
  if (!startStr) return '';
  const dStart = new Date(startStr.replace('Z', ''));
  const dEnd = endStr ? new Date(endStr.replace('Z', '')) : dStart;

  const dayStart = dStart.getDate();
  const dayEnd = dEnd.getDate();
  const mStart = dStart.getMonth();
  const mEnd = dEnd.getMonth();

  if (mStart === mEnd) {
    if (dayEnd - dayStart === 2) {
      return `${dayStart}, ${dayStart + 1} y ${dayEnd} de ${MESES[mStart]}`;
    }
    return `${dayStart} al ${dayEnd} de ${MESES[mStart]}`;
  }
  return `${dayStart} de ${MESES[mStart]} al ${dayEnd} de ${MESES[mEnd]}`;
}

export default function GeneradorFlyer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { events } = useCycles();
  const { showToast } = useUI();
  const canvasRef = useRef(null);

  // Safe fallback for ThemeContext
  let activeTheme = 'dark';
  try {
    const themeContext = useTheme();
    if (themeContext?.activeTheme) activeTheme = themeContext.activeTheme;
  } catch (e) {
    activeTheme = 'dark';
  }

  const isLight = activeTheme === 'light';

  // Tokens de estilo consistentes con Causa OS
  const themeStyles = {
    bgPage: isLight ? '#f8fafc' : '#060d19',
    cardBg: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(11, 23, 44, 0.85)',
    cardBorder: isLight ? 'rgba(217, 119, 6, 0.28)' : 'rgba(255, 193, 7, 0.25)',
    cardShadow: isLight ? '0 10px 30px rgba(0,0,0,0.06)' : '0 16px 40px rgba(0,0,0,0.5)',
    rowBg: isLight ? '#ffffff' : 'rgba(15, 28, 52, 0.75)',
    rowBorder: isLight ? 'rgba(226, 232, 240, 0.9)' : 'rgba(255, 255, 255, 0.08)',
    textTitle: isLight ? '#0f172a' : '#ffffff',
    textMuted: isLight ? '#64748b' : '#94a3b8',
    inputBg: isLight ? '#f1f5f9' : 'rgba(6, 14, 28, 0.85)',
    inputBorder: isLight ? 'rgba(203, 213, 225, 0.8)' : 'rgba(255, 255, 255, 0.12)',
    inputColor: isLight ? '#0f172a' : '#ffffff',
    goldAccent: '#FFC107',
    goldHover: '#FFD54F',
    goldSubtle: isLight ? 'rgba(217, 119, 6, 0.12)' : 'rgba(255, 193, 7, 0.15)'
  };

  // Estados del flyer
  const [programa, setPrograma] = useState('CAPÍTULO UNO');
  const [outline, setOutline] = useState('UNO');
  const [eyebrow, setEyebrow] = useState('FECHAS');
  const [hashtag, setHashtag] = useState('#SOYCREADOR');
  const [sedes, setSedes] = useState(SEDES_ENROLAMIENTO_PROXIMO);
  const [descargando, setDescargando] = useState(false);
  const [presetActivo, setPresetActivo] = useState('enrolamiento');
  const [showCliModal, setShowCliModal] = useState(false);

  // Sincronizar automáticamente con eventos del calendario de Causa OS
  const sincronizarConCalendario = () => {
    if (!events || !events.length) {
      showToast?.('Cargando eventos del calendario... intenta de nuevo en unos segundos.', 'info');
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const sedesConfig = [
      { id: 'mex', ciudad: 'México', patterns: ['MEX', 'CDMX', 'MÉXICO', 'MEXICO'] },
      { id: 'lim', ciudad: 'Lima', patterns: ['LIM', 'LIMA'] },
      { id: 'uio', ciudad: 'Quito', patterns: ['UIO', 'QUITO'] },
      { id: 'gye', ciudad: 'Guayaquil', patterns: ['GYE', 'GUAYAQUIL'] },
      { id: 'cue', ciudad: 'Cuenca', patterns: ['CUE', 'CUENCA'] },
      { id: 'med', ciudad: 'Medellín', patterns: ['MED', 'MEDELL'] }
    ];

    const nuevasSedes = sedesConfig.map(sc => {
      const c1Events = events.filter(e => {
        const evName = (e.nombre || e.name || '').toUpperCase();
        const evSede = (e.sede || e.place || e.sedeTag || '').toUpperCase();
        const start = (e.fecha_inicio || e.start || '').slice(0, 10);

        const isC1 = evName.includes('CAPITULO UNO') || evName.includes('CAPÍTULO UNO') || evName.startsWith('C1 ');
        const isSede = sc.patterns.some(p => evSede.includes(p));
        return isC1 && isSede && start >= todayStr;
      });

      c1Events.sort((a, b) => new Date(a.fecha_inicio || a.start) - new Date(b.fecha_inicio || b.start));

      if (c1Events.length > 0) {
        const nextEv = c1Events[0];
        const fechaFormateada = formatEventDates(nextEv.fecha_inicio || nextEv.start, nextEv.fecha_fin || nextEv.end);
        return {
          id: sc.id,
          ciudad: sc.ciudad,
          fechas: fechaFormateada || 'Próximamente',
          activo: true,
          equipo: nextEv.equipo ? `Equipo ${nextEv.equipo}` : ''
        };
      }

      const actual = sedes.find(s => s.id === sc.id);
      return actual || { id: sc.id, ciudad: sc.ciudad, fechas: 'Próximamente', activo: true };
    });

    setSedes(nuevasSedes);
    setPresetActivo('calendario');
    showToast?.('¡Fechas sincronizadas con los próximos Capítulos 1 de Causa OS!', 'success');
  };

  const aplicarPreset = (tipo) => {
    setPresetActivo(tipo);
    if (tipo === 'enrolamiento') {
      setSedes(SEDES_ENROLAMIENTO_PROXIMO);
      showToast?.('Fechas configuradas para Enrolamiento Próximo (Octubre para sedes que cerraron Septiembre)', 'info');
    } else if (tipo === 'inmediato') {
      setSedes(SEDES_CICLO_INMEDIATO);
      showToast?.('Fechas configuradas para Ciclo Inmediato de Septiembre', 'info');
    }
  };

  const handleProgramaChange = (val) => {
    setPrograma(val);
    const upper = val.toUpperCase().trim();
    if (upper.startsWith('CAPÍTULO')) {
      const rest = upper.replace(/^CAPÍTULO\s*/, '').trim();
      if (rest) setOutline(rest);
    } else if (upper.includes('MAESTRÍA')) {
      setOutline('MJ');
    }
  };

  const toggleSedeActiva = (id) => {
    setSedes(prev => prev.map(s => s.id === id ? { ...s, activo: !s.activo } : s));
  };

  const updateSede = (id, field, value) => {
    setSedes(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeSede = (id) => {
    setSedes(prev => prev.filter(s => s.id !== id));
  };

  const addSede = () => {
    const newId = 'sede_' + Date.now();
    setSedes(prev => [...prev, { id: newId, ciudad: 'Nueva Sede', fechas: 'Próximamente', activo: true, equipo: '' }]);
  };

  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo cargar: ' + src));
      img.src = src;
    });
  };

  // Descarga en Alta Resolución 1080x1920 (PNG Oficial)
  const descargarFlyerHD = async () => {
    setDescargando(true);
    showToast?.('Generando Flyer Oficial HD (1080x1920) sin alterar el diseño original...', 'info');

    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');

      const [bgImg, logoImg, flagsImg] = await Promise.all([
        loadImage('/flyer_earth_bg_1080.png'),
        loadImage('/logo_crear_blanco.png'),
        loadImage('/flags_badges_hd.png')
      ]);

      await document.fonts.ready;

      // 1. Fondo cósmico
      ctx.clearRect(0, 0, 1080, 1920);
      ctx.drawImage(bgImg, 0, 0, 1080, 1920);

      // 2. Logo oficial blanco centrado
      const logoW = 190;
      const logoH = (logoImg.height / logoImg.width) * logoW;
      ctx.drawImage(logoImg, 540 - logoW / 2, 90, logoW, logoH);

      // 3. Eyebrow FECHAS
      ctx.save();
      ctx.font = '300 22px "Montserrat", sans-serif';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '9px';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
      ctx.shadowBlur = 10;
      ctx.fillText(eyebrow, 540, 440);
      ctx.restore();

      // 4. Marca de agua en contorno (Fondo)
      ctx.save();
      ctx.font = '800 168px "Montserrat", sans-serif';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '28px';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(outline, 540, 565);
      ctx.restore();

      // 5. Título Principal con resplandor dorado (Primer Plano)
      ctx.save();
      ctx.font = '800 49px "Montserrat", sans-serif';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '10px';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Glow suave amarillo/dorado
      ctx.shadowColor = 'rgba(245, 180, 70, 0.4)';
      ctx.shadowBlur = 32;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(programa, 540, 565);

      // Glow intenso central
      ctx.shadowColor = 'rgba(255, 240, 200, 0.85)';
      ctx.shadowBlur = 15;
      ctx.fillText(programa, 540, 565);

      // Texto sólido frontal
      ctx.shadowBlur = 0;
      ctx.fillText(programa, 540, 565);
      ctx.restore();

      // 6. Lista flotante de Sedes y Fechas
      const activeSedes = sedes.filter(s => s.activo);
      const totalSedes = activeSedes.length;
      const startY = 726;
      const step = totalSedes > 5 ? 122 : 140;

      activeSedes.forEach((s, idx) => {
        const y = startY + idx * step;

        // Nombre de la Ciudad (dorado/ámbar)
        ctx.save();
        ctx.font = '700 41px "Montserrat", sans-serif';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '1.5px';
        ctx.fillStyle = '#f29e2e';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(242, 164, 59, 0.45)';
        ctx.shadowBlur = 16;
        ctx.fillText(s.ciudad, 540, y);
        ctx.restore();

        // Fechas (blanco elegante)
        ctx.save();
        ctx.font = '300 30px "Montserrat", sans-serif';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0.5px';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.35)';
        ctx.shadowBlur = 12;
        ctx.fillText(s.fechas, 540, y + 46);
        ctx.restore();
      });

      // 7. Banderas Metálicas Circulares Oficiales
      const flagsW = 445;
      const flagsH = (flagsImg.height / flagsImg.width) * flagsW;
      ctx.drawImage(flagsImg, 540 - flagsW / 2, 1685, flagsW, flagsH);

      // 8. Hashtag oficial #SOYCREADOR
      ctx.save();
      ctx.font = '400 21px "Montserrat", sans-serif';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '8px';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.45)';
      ctx.shadowBlur = 15;
      ctx.fillText(hashtag, 540, 1800);
      ctx.restore();

      // Generar link de descarga
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `Flyer_Oficial_CPSL_${programa.replace(/\s+/g, '_')}_1080x1920.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        showToast?.('¡Flyer Oficial descargado con éxito en 1080x1920!', 'success');
        setDescargando(false);
      }, 'image/png');

    } catch (err) {
      console.error('Error generando flyer:', err);
      showToast?.('Error al generar flyer: ' + err.message, 'error');
      setDescargando(false);
    }
  };

  const activeSedesList = sedes.filter(s => s.activo);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: themeStyles.bgPage,
      color: themeStyles.textTitle,
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      padding: '1.5rem 2rem 4rem 2rem'
    }}>
      
      {/* Canvas oculto para exportar a 1080x1920 */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

        {/* HEADER COCKPIT DE ALTO NIVEL */}
        <header style={{
          background: themeStyles.cardBg,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${themeStyles.cardBorder}`,
          borderRadius: '20px',
          padding: '1.25rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          boxShadow: themeStyles.cardShadow
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.95rem',
                background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.06)',
                border: `1px solid ${themeStyles.rowBorder}`,
                borderRadius: '12px',
                color: themeStyles.textTitle,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                transition: 'all 0.2s'
              }}
              title="Volver al inicio"
            >
              <ArrowLeft size={16} /> Inicio
            </button>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '20px',
                  background: 'rgba(255, 193, 7, 0.15)',
                  color: '#f59e0b',
                  border: '1px solid rgba(255, 193, 7, 0.35)'
                }}>
                  OFICIAL CREAR PODER SIN LÍMITES
                </span>
                <span style={{ fontSize: '0.78rem', color: themeStyles.textMuted, fontWeight: 600 }}>
                  &bull; Capítulos Uno de Cada Sede
                </span>
              </div>

              <h1 style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: themeStyles.textTitle,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                letterSpacing: '-0.3px'
              }}>
                <Sparkles size={22} style={{ color: '#f59e0b' }} />
                Generador de Flyers Oficiales HD
              </h1>
              <p style={{ fontSize: '0.82rem', color: themeStyles.textMuted, margin: '0.2rem 0 0 0' }}>
                Modifica únicamente las fechas de los Capítulos Uno más próximos para que la gente pueda enrolarse.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={sincronizarConCalendario}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.2rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.25) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                color: '#f59e0b',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(245, 158, 11, 0.25)',
                transition: 'all 0.2s'
              }}
              title="Obtener fechas de los próximos Capítulos 1 directamente del calendario oficial de Causa OS"
            >
              <Zap size={15} style={{ fill: '#f59e0b' }} /> Sincronizar Calendario Causa OS
            </button>

            <button
              onClick={() => setShowCliModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 1rem',
                borderRadius: '12px',
                background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${themeStyles.rowBorder}`,
                color: themeStyles.textMuted,
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <Terminal size={15} /> Bot CLI
            </button>
          </div>
        </header>

        {/* ESTRATEGIA DE ENROLAMIENTO SEGMENTADA */}
        <div style={{
          background: themeStyles.cardBg,
          backdropFilter: 'blur(12px)',
          border: `1px solid ${themeStyles.rowBorder}`,
          borderRadius: '16px',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: themeStyles.textTitle, fontWeight: 700 }}>
            <Calendar size={17} style={{ color: '#f59e0b' }} />
            <span>Estrategia de Enrolamiento:</span>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => aplicarPreset('enrolamiento')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s',
                background: presetActivo === 'enrolamiento' ? 'linear-gradient(135deg, #FFC107 0%, #d97706 100%)' : (isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)'),
                color: presetActivo === 'enrolamiento' ? '#000000' : themeStyles.textMuted,
                boxShadow: presetActivo === 'enrolamiento' ? '0 0 14px rgba(255, 193, 7, 0.4)' : 'none'
              }}
            >
              {presetActivo === 'enrolamiento' && <CheckCircle2 size={14} />}
              Próximo Enrolamiento (Oficial)
            </button>

            <button
              onClick={() => aplicarPreset('inmediato')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s',
                background: presetActivo === 'inmediato' ? 'linear-gradient(135deg, #FFC107 0%, #d97706 100%)' : (isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)'),
                color: presetActivo === 'inmediato' ? '#000000' : themeStyles.textMuted,
                boxShadow: presetActivo === 'inmediato' ? '0 0 14px rgba(255, 193, 7, 0.4)' : 'none'
              }}
            >
              {presetActivo === 'inmediato' && <CheckCircle2 size={14} />}
              Ciclo Inmediato (Septiembre)
            </button>
          </div>
        </div>

        {/* GRID DE 2 COLUMNAS: ESTUDIO DE CONTROL (IZQUIERDA) + PREVIEW FLYER STICKY (DERECHA) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.25fr) minmax(380px, 420px)',
          gap: '2rem',
          alignItems: 'start'
        }}>

          {/* COLUMNA IZQUIERDA: CONTROLES EDITORIALES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* CARD 1: CALENDARIO DE SEDES */}
            <div style={{
              background: themeStyles.cardBg,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: `1px solid ${themeStyles.cardBorder}`,
              borderRadius: '20px',
              padding: '1.5rem',
              boxShadow: themeStyles.cardShadow
            }}>
              {/* Card Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                paddingBottom: '1rem',
                borderBottom: `1px solid ${themeStyles.rowBorder}`,
                marginBottom: '1.25rem'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(255, 193, 7, 0.15)',
                      color: '#f59e0b',
                      border: '1px solid rgba(255, 193, 7, 0.35)'
                    }}>
                      <Award size={16} />
                    </span>
                    <h2 style={{
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      color: '#f59e0b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      margin: 0
                    }}>
                      Calendario Oficial de Capítulos Uno
                    </h2>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: themeStyles.textMuted, margin: 0 }}>
                    Control de fechas por ciudad, heráldica de equipos y visibilidad en flyer oficial.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.3rem 0.75rem',
                    borderRadius: '20px',
                    background: 'rgba(245, 158, 11, 0.12)',
                    color: '#f59e0b',
                    border: '1px solid rgba(245, 158, 11, 0.3)'
                  }}>
                    {sedes.filter(s => s.activo).length} de {sedes.length} Visibles
                  </span>

                  <button
                    onClick={addSede}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.3) 100%)',
                      border: '1px solid rgba(245, 158, 11, 0.45)',
                      color: '#f59e0b',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Plus size={14} /> Nueva Sede
                  </button>
                </div>
              </div>

              {/* Lista de Filas de Sedes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {sedes.map((s) => {
                  const flag = getCountryFlag(s.ciudad);
                  return (
                    <div
                      key={s.id}
                      style={{
                        background: s.activo ? themeStyles.rowBg : (isLight ? '#f1f5f9' : 'rgba(10, 18, 33, 0.4)'),
                        border: s.activo ? `1px solid ${themeStyles.cardBorder}` : `1px solid ${themeStyles.rowBorder}`,
                        borderRadius: '14px',
                        padding: '0.85rem 1.1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        opacity: s.activo ? 1 : 0.45,
                        transition: 'all 0.25s',
                        boxShadow: s.activo ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      {/* Switch iOS Style de Visibilidad */}
                      <button
                        type="button"
                        onClick={() => toggleSedeActiva(s.id)}
                        style={{
                          width: '42px',
                          height: '24px',
                          borderRadius: '24px',
                          background: s.activo ? '#f59e0b' : (isLight ? '#cbd5e1' : '#334155'),
                          border: 'none',
                          padding: '2px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: s.activo ? 'flex-end' : 'flex-start',
                          transition: 'background 0.25s ease',
                          flexShrink: 0
                        }}
                        title={s.activo ? 'Visible en Flyer (Clic para ocultar)' : 'Oculto (Clic para mostrar)'}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                        }} />
                      </button>

                      {/* Bandera y Ciudad */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', width: '170px', flexShrink: 0 }}>
                        <div style={{
                          fontSize: '1.25rem',
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.06)',
                          border: `1px solid ${themeStyles.rowBorder}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {flag}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <input
                            type="text"
                            value={s.ciudad}
                            disabled={!s.activo}
                            onChange={(e) => updateSede(s.id, 'ciudad', e.target.value)}
                            placeholder="Ciudad"
                            style={{
                              width: '100%',
                              background: 'transparent',
                              border: 'none',
                              borderBottom: '1px solid rgba(245, 158, 11, 0.35)',
                              color: s.activo ? '#f59e0b' : themeStyles.textMuted,
                              fontWeight: 800,
                              fontSize: '0.88rem',
                              outline: 'none',
                              padding: '2px 0',
                              letterSpacing: '0.3px'
                            }}
                          />
                          <input
                            type="text"
                            value={s.equipo || ''}
                            disabled={!s.activo}
                            onChange={(e) => updateSede(s.id, 'equipo', e.target.value)}
                            placeholder="Ej: Equipo 31"
                            style={{
                              width: '100%',
                              background: 'transparent',
                              border: 'none',
                              color: themeStyles.textMuted,
                              fontSize: '0.72rem',
                              outline: 'none',
                              padding: '2px 0'
                            }}
                          />
                        </div>
                      </div>

                      {/* Campo Fechas de Capítulo */}
                      <div style={{ flex: 1, position: 'relative' }}>
                        <div style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#f59e0b',
                          pointerEvents: 'none',
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          <Calendar size={14} />
                        </div>
                        <input
                          type="text"
                          value={s.fechas}
                          disabled={!s.activo}
                          onChange={(e) => updateSede(s.id, 'fechas', e.target.value)}
                          placeholder="Fechas (ej: 18, 19 y 20 de septiembre)"
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            background: themeStyles.inputBg,
                            border: `1px solid ${themeStyles.inputBorder}`,
                            borderRadius: '10px',
                            padding: '0.6rem 0.85rem 0.6rem 2.2rem',
                            color: themeStyles.inputColor,
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                          }}
                        />
                      </div>

                      {/* Botón Eliminar */}
                      <button
                        onClick={() => removeSede(s.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: isLight ? '#94a3b8' : '#64748b',
                          cursor: 'pointer',
                          padding: '0.4rem',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 0.2s',
                          flexShrink: 0
                        }}
                        title="Eliminar sede"
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = isLight ? '#94a3b8' : '#64748b'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CARD 2: BRANDING, TEXTOS Y MARCA DE AGUA */}
            <div style={{
              background: themeStyles.cardBg,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: `1px solid ${themeStyles.cardBorder}`,
              borderRadius: '20px',
              padding: '1.5rem',
              boxShadow: themeStyles.cardShadow
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <Sliders size={18} style={{ color: '#f59e0b' }} />
                <h2 style={{
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: '#f59e0b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  margin: 0
                }}>
                  Personalización Editorial y Jerarquía Visual
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: themeStyles.textMuted, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Título Principal (Frente)
                  </label>
                  <input
                    type="text"
                    value={programa}
                    onChange={(e) => handleProgramaChange(e.target.value)}
                    placeholder="CAPÍTULO UNO"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: themeStyles.inputBg,
                      border: `1px solid ${themeStyles.inputBorder}`,
                      borderRadius: '10px',
                      padding: '0.65rem 0.95rem',
                      color: '#f59e0b',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      outline: 'none',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: themeStyles.textMuted, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Marca de Agua Contorno (Fondo)
                  </label>
                  <input
                    type="text"
                    value={outline}
                    onChange={(e) => setOutline(e.target.value)}
                    placeholder="UNO"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: themeStyles.inputBg,
                      border: `1px solid ${themeStyles.inputBorder}`,
                      borderRadius: '10px',
                      padding: '0.65rem 0.95rem',
                      color: themeStyles.textTitle,
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      outline: 'none',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: themeStyles.textMuted, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Subtítulo Superior
                  </label>
                  <input
                    type="text"
                    value={eyebrow}
                    onChange={(e) => setEyebrow(e.target.value)}
                    placeholder="FECHAS"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: themeStyles.inputBg,
                      border: `1px solid ${themeStyles.inputBorder}`,
                      borderRadius: '10px',
                      padding: '0.65rem 0.95rem',
                      color: themeStyles.inputColor,
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      outline: 'none',
                      textTransform: 'uppercase'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: themeStyles.textMuted, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Hashtag Inferior
                  </label>
                  <input
                    type="text"
                    value={hashtag}
                    onChange={(e) => setHashtag(e.target.value)}
                    placeholder="#SOYCREADOR"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: themeStyles.inputBg,
                      border: `1px solid ${themeStyles.inputBorder}`,
                      borderRadius: '10px',
                      padding: '0.65rem 0.95rem',
                      color: themeStyles.inputColor,
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* COLUMNA DERECHA: PREVISUALIZADOR MOCKUP STICKY */}
          <div style={{
            position: 'sticky',
            top: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}>
            {/* Header del Mockup */}
            <div style={{
              width: '100%',
              maxWidth: '380px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 0.5rem'
            }}>
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                color: themeStyles.textTitle,
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                letterSpacing: '0.5px'
              }}>
                <Eye size={15} style={{ color: '#f59e0b' }} /> Previsualización Fiel (9:16)
              </span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '0.2rem 0.65rem',
                borderRadius: '20px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.35)'
              }}>
                1080 × 1920 HD
              </span>
            </div>

            {/* SMARTPHONE CINEMÁTICO REALISTA CON BEZEL METÁLICO */}
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: '380px',
              height: '675px',
              borderRadius: '34px',
              padding: '10px',
              background: 'linear-gradient(145deg, #2a3b5c, #0d1527)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(255, 193, 7, 0.3)'
            }}>
              {/* Notch superior del smartphone */}
              <div style={{
                position: 'absolute',
                top: '18px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '90px',
                height: '14px',
                background: '#050a14',
                borderRadius: '12px',
                zIndex: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1e293b' }} />
                <div style={{ width: '32px', height: '3px', borderRadius: '3px', background: '#1e293b' }} />
              </div>

              {/* Pantalla Interna del Flyer (Aspecto 9:16) */}
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '26px',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                backgroundImage: "url('/flyer_earth_bg_1080.png')",
                backgroundSize: '100% 100%',
                backgroundPosition: 'center bottom',
                backgroundColor: '#010308',
                fontFamily: "'Montserrat', sans-serif",
                userSelect: 'none'
              }}>
                
                {/* 1. TOP LOGO OFICIAL CREAR */}
                <div style={{ paddingTop: '2.5rem', display: 'flex', justifyContent: 'center' }}>
                  <img
                    src="/logo_crear_blanco.png"
                    alt="CREAR Poder sin límites"
                    style={{ width: '68px', height: 'auto', objectFit: 'contain' }}
                  />
                </div>

                {/* 2. EYEBROW & MAIN TITLE */}
                <div style={{ textAlign: 'center', position: 'relative', marginTop: '-0.5rem' }}>
                  <p style={{
                    fontSize: '9px',
                    fontWeight: 300,
                    letterSpacing: '0.42em',
                    paddingLeft: '0.42em',
                    color: 'rgba(255, 255, 255, 0.85)',
                    textTransform: 'uppercase',
                    margin: '0 0 4px 0',
                    textShadow: '0 1px 4px rgba(0,0,0,0.8)'
                  }}>
                    {eyebrow}
                  </p>
                  
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Outline Watermark (Fondo) */}
                    <span style={{
                      position: 'absolute',
                      fontWeight: 900,
                      letterSpacing: '0.18em',
                      paddingLeft: '0.18em',
                      color: 'transparent',
                      userSelect: 'none',
                      pointerEvents: 'none',
                      fontSize: '58px',
                      WebkitTextStroke: '1px rgba(255, 255, 255, 0.15)'
                    }}>
                      {outline}
                    </span>

                    {/* Título Principal con Halo Luminous */}
                    <h2 style={{
                      position: 'relative',
                      zIndex: 10,
                      fontSize: '17px',
                      fontWeight: 900,
                      letterSpacing: '0.20em',
                      paddingLeft: '0.20em',
                      color: '#ffffff',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      margin: 0,
                      textShadow: '0 0 10px rgba(255, 240, 200, 0.95), 0 0 20px rgba(245, 180, 70, 0.6), 0 2px 4px rgba(0, 0, 0, 0.9)'
                    }}>
                      {programa}
                    </h2>
                  </div>
                </div>

                {/* 3. LISTA FLOTANTE DE CIUDADES Y FECHAS (ESTILO ORIGINAL FIEL) */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: activeSedesList.length > 5 ? '0.65rem' : '0.95rem',
                  margin: 'auto 0',
                  padding: '0 1.5rem'
                }}>
                  {activeSedesList.map(s => (
                    <div key={s.id} style={{ textAlign: 'center' }}>
                      <p style={{
                        fontSize: activeSedesList.length > 5 ? '13px' : '14.5px',
                        fontWeight: 700,
                        color: '#f29e2e',
                        lineHeight: 1.15,
                        margin: 0,
                        textShadow: '0 0 10px rgba(242, 164, 59, 0.45), 0 1px 4px rgba(0,0,0,0.8)'
                      }}>
                        {s.ciudad}
                      </p>
                      <p style={{
                        fontSize: activeSedesList.length > 5 ? '9.5px' : '10.5px',
                        fontWeight: 300,
                        color: '#ffffff',
                        letterSpacing: '0.3px',
                        margin: '2px 0 0 0',
                        textShadow: '0 0 8px rgba(255, 255, 255, 0.35), 0 1px 4px rgba(0,0,0,0.9)'
                      }}>
                        {s.fechas}
                      </p>
                    </div>
                  ))}
                </div>

                {/* 4. BANDERAS METÁLICAS Y HASHTAG (FONDO INFERIOR) */}
                <div style={{
                  paddingBottom: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <img
                    src="/flags_badges_hd.png"
                    alt="Banderas Oficiales"
                    style={{
                      width: '155px',
                      height: 'auto',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.9))'
                    }}
                  />
                  <p style={{
                    fontSize: '8px',
                    fontWeight: 400,
                    letterSpacing: '0.38em',
                    paddingLeft: '0.38em',
                    color: 'rgba(255, 255, 255, 0.95)',
                    margin: 0,
                    textShadow: '0 1px 4px rgba(0,0,0,0.9)'
                  }}>
                    {hashtag}
                  </p>
                </div>

              </div>
            </div>

            {/* BOTÓN DE DESCARGA EJECUTIVO */}
            <div style={{ width: '100%', maxWidth: '380px' }}>
              <button
                onClick={descargarFlyerHD}
                disabled={descargando}
                style={{
                  width: '100%',
                  padding: '0.9rem 1.25rem',
                  background: 'linear-gradient(135deg, #FFC107 0%, #FF9800 100%)',
                  color: '#000000',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  borderRadius: '14px',
                  border: 'none',
                  cursor: descargando ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  boxShadow: '0 0 25px rgba(255, 193, 7, 0.45)',
                  transition: 'all 0.2s',
                  opacity: descargando ? 0.6 : 1
                }}
              >
                <Download size={18} />
                {descargando ? 'Generando 1080x1920 HD...' : 'Descargar Flyer Oficial (1080×1920 PNG)'}
              </button>
              <p style={{ fontSize: '0.72rem', color: themeStyles.textMuted, textAlign: 'center', margin: '0.5rem 0 0 0' }}>
                Formato 9:16 listo para Instagram Stories, Estados de WhatsApp y Redes Oficiales.
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* MODAL CLI PUPPETEER BOT */}
      {showCliModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: themeStyles.cardBg,
            border: `1px solid ${themeStyles.cardBorder}`,
            borderRadius: '20px',
            maxWidth: '540px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                margin: 0
              }}>
                <Terminal size={20} /> Bot Autónomo de Flyers (Puppeteer)
              </h3>
              <button
                onClick={() => setShowCliModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: themeStyles.textMuted,
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: themeStyles.textMuted, margin: 0, lineHeight: 1.5 }}>
              También puedes generar el flyer automáticamente con fidelidad 100% desde la terminal o integrarlo en pipelines automáticos de mensajería usando el script de Node.js:
            </p>

            <div style={{
              background: '#040914',
              padding: '1rem',
              borderRadius: '12px',
              fontFamily: 'monospace',
              fontSize: '0.82rem',
              color: '#34d399',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              userSelect: 'all',
              overflowX: 'auto'
            }}>
              node scripts/generar_flyer.mjs --programa="CAPÍTULO UNO"
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('node scripts/generar_flyer.mjs --programa="CAPÍTULO UNO"');
                  showToast?.('Comando copiado al portapapeles', 'info');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 1rem',
                  borderRadius: '10px',
                  background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)',
                  border: `1px solid ${themeStyles.rowBorder}`,
                  color: themeStyles.textTitle,
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                <Copy size={14} /> Copiar Comando
              </button>

              <button
                onClick={() => setShowCliModal(false)}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #FFC107 0%, #d97706 100%)',
                  border: 'none',
                  color: '#000000',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
