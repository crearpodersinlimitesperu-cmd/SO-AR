import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useUI } from '../context/UIContext';
import {
  Sparkles, Download, ArrowLeft, RefreshCw, Plus, Trash2,
  Copy, Image as ImageIcon, Sliders, Eye, Terminal, Check,
  Calendar, Zap, CheckCircle2
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
      // Filtrar eventos de Capítulo 1 futuros para esta sede
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

      // Si no hay evento futuro, mantener el valor actual o próximo ciclo
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

  // Sincronizar contorno cuando cambia el programa si tiene patrón "CAPÍTULO X"
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
    setSedes(prev => [...prev, { id: newId, ciudad: 'Nueva Sede', fechas: 'Próximamente', activo: true }]);
  };

  // Helper para cargar imagen
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
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');

      const [bgImg, logoImg, flagsImg] = await Promise.all([
        loadImage('/flyer_earth_bg_1080.png'),
        loadImage('/logo_crear_blanco.png'),
        loadImage('/flags_badges_hd.png')
      ]);

      await document.fonts.ready;

      // 1. Fondo csmico
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

      // 5. Ttulo Principal con resplandor dorado (Primer Plano)
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

      // Texto slido frontal
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

        // Nombre de la Ciudad (dorado/mbar)
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

      // 7. Banderas Metlicas Circulares Oficiales
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Canvas oculto para exportar a 1080x1920 */}
      <canvas ref={canvasRef} className="hidden" />

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-yellow-500/20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-all border border-gray-700"
            title="Volver al panel"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                Oficial CREAR Poder sin Límites
              </span>
              <span className="text-xs text-gray-400 font-semibold">&bull; Capítulos Uno de Cada Sede</span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1 flex items-center gap-2">
              <Sparkles className="text-yellow-400" size={24} />
              Generador de Flyers Oficiales HD
            </h1>
            <p className="text-xs text-gray-400">
              Modifica únicamente las fechas de los Capítulos Uno más próximos para que la gente pueda enrolarse.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={sincronizarConCalendario}
            className="px-3.5 py-2 rounded-xl bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 font-bold text-xs border border-yellow-500/40 flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)]"
            title="Obtener fechas de los próximos Capítulos 1 directamente del calendario oficial de Causa OS"
          >
            <Zap size={14} className="text-yellow-400 fill-yellow-400" /> Sincronizar Calendario Causa OS
          </button>
          <button
            onClick={() => setShowCliModal(true)}
            className="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-semibold text-xs border border-gray-700 flex items-center gap-1.5 transition-all"
          >
            <Terminal size={14} /> Bot CLI
          </button>
        </div>
      </div>

      {/* SELECTOR RÁPIDO DE PRESETS DE ENROLAMIENTO */}
      <div className="glass-panel p-4 rounded-2xl border border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-gray-300">
          <Calendar size={16} className="text-yellow-400" />
          <span className="font-bold">Estrategia de Enrolamiento:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => aplicarPreset('enrolamiento')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              presetActivo === 'enrolamiento'
                ? 'bg-yellow-500 text-black shadow-[0_0_12px_rgba(234,179,8,0.4)]'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {presetActivo === 'enrolamiento' && <CheckCircle2 size={13} />}
            Próximo Enrolamiento (Oficial)
          </button>

          <button
            onClick={() => aplicarPreset('inmediato')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              presetActivo === 'inmediato'
                ? 'bg-yellow-500 text-black shadow-[0_0_12px_rgba(234,179,8,0.4)]'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {presetActivo === 'inmediato' && <CheckCircle2 size={13} />}
            Ciclo Inmediato (Septiembre)
          </button>
        </div>
      </div>

      {/* GRID PRINCIPAL: CONTROLES + PREVIEW EXACTO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* COLUMNA IZQUIERDA: CONTROLES */}
        <div className="lg:col-span-6 space-y-5">
          
          {/* Tarjeta de Fechas por Sede */}
          <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={16} /> Fechas de Capítulos Uno por Sede
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Edita la fecha de cualquier sede. El diseño mantiene la tipografía y posición original sin cajas.
                </p>
              </div>
              <button
                onClick={addSede}
                className="px-2.5 py-1.5 rounded-lg bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25 border border-yellow-500/30 text-xs font-bold flex items-center gap-1 transition-all"
              >
                <Plus size={14} /> Agregar Sede
              </button>
            </div>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {sedes.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    s.activo ? 'bg-gray-900/80 border-gray-700' : 'bg-gray-950/40 border-gray-900 opacity-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={s.activo}
                    onChange={() => toggleSedeActiva(s.id)}
                    className="accent-yellow-500 w-4 h-4 cursor-pointer rounded"
                    title={s.activo ? 'Desactivar de flyer' : 'Activar en flyer'}
                  />
                  <div className="w-28 flex-shrink-0">
                    <input
                      type="text"
                      value={s.ciudad}
                      disabled={!s.activo}
                      onChange={(e) => updateSede(s.id, 'ciudad', e.target.value)}
                      placeholder="Ciudad"
                      className="w-full bg-black/60 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-yellow-400 focus:border-yellow-400 focus:outline-none"
                    />
                    {s.equipo && (
                      <span className="block text-[9px] text-gray-400 mt-0.5 pl-0.5">
                        {s.equipo}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={s.fechas}
                    disabled={!s.activo}
                    onChange={(e) => updateSede(s.id, 'fechas', e.target.value)}
                    placeholder="Fechas (ej: 18, 19 y 20 de septiembre)"
                    className="flex-1 bg-black/60 border border-gray-700 rounded-lg px-3 py-1.5 text-xs font-medium text-white focus:border-yellow-400 focus:outline-none"
                  />
                  <button
                    onClick={() => removeSede(s.id)}
                    className="text-gray-500 hover:text-red-400 p-1 transition-all"
                    title="Eliminar sede"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tarjeta de Títulos y Jerarquía Visual */}
          <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
            <h3 className="text-sm font-black text-yellow-400 uppercase tracking-wider flex items-center gap-2">
              <Sliders size={16} /> Título y Marca de Agua
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                  Título Principal (Frente)
                </label>
                <input
                  type="text"
                  value={programa}
                  onChange={(e) => handleProgramaChange(e.target.value)}
                  placeholder="CAPÍTULO UNO"
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2 text-xs font-bold text-yellow-400 focus:border-yellow-400 focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                  Marca de Agua Contorno (Fondo)
                </label>
                <input
                  type="text"
                  value={outline}
                  onChange={(e) => setOutline(e.target.value)}
                  placeholder="UNO"
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-300 focus:border-yellow-400 focus:outline-none uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                  Subtítulo Superior
                </label>
                <input
                  type="text"
                  value={eyebrow}
                  onChange={(e) => setEyebrow(e.target.value)}
                  placeholder="FECHAS"
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:border-yellow-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                  Hashtag Inferior
                </label>
                <input
                  type="text"
                  value={hashtag}
                  onChange={(e) => setHashtag(e.target.value)}
                  placeholder="#SOYCREADOR"
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:border-yellow-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA: PREVIEW IDÉNTICO AL ORIGINAL */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-3 max-w-[360px]">
            <span className="text-xs font-bold text-gray-300 uppercase flex items-center gap-1.5">
              <Eye size={14} className="text-yellow-400" /> Previsualización Fiel (9:16)
            </span>
            <span className="text-[10px] px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-full font-bold">
              1080 x 1920 HD
            </span>
          </div>

          {/* MOCKUP VERTICAL CINEMÁTICO 100% FIEL (SIN CAJAS NI BORDES) */}
          <div
            className="w-full max-w-[360px] h-[640px] rounded-3xl overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.95)] border border-white/10 relative flex flex-col justify-between select-none"
            style={{
              backgroundImage: "url('/flyer_earth_bg_1080.png')",
              backgroundSize: '100% 100%',
              backgroundPosition: 'center bottom',
              backgroundColor: '#010308',
              fontFamily: "'Montserrat', sans-serif"
            }}
          >
            {/* TOP LOGO OFICIAL */}
            <div className="pt-7 flex justify-center">
              <img
                src="/logo_crear_blanco.png"
                alt="CREAR Poder sin límites"
                className="w-[64px] h-auto object-contain"
              />
            </div>

            {/* EYEBROW & MAIN TITLE */}
            <div className="text-center relative -mt-3">
              <p className="text-[8px] font-light tracking-[0.42em] pl-[0.42em] text-white/80 uppercase mb-1 drop-shadow">
                {eyebrow}
              </p>
              
              <div className="relative flex items-center justify-center">
                {/* Outline Watermark (Fondo) */}
                <span
                  className="absolute font-black tracking-[0.18em] pl-[0.18em] text-transparent select-none pointer-events-none"
                  style={{
                    fontSize: '56px',
                    WebkitTextStroke: '1px rgba(255, 255, 255, 0.12)'
                  }}
                >
                  {outline}
                </span>

                {/* Título Principal con Halo Luminous */}
                <h2
                  className="relative z-10 text-[16px] font-black tracking-[0.20em] pl-[0.20em] text-white uppercase whitespace-nowrap"
                  style={{
                    textShadow: '0 0 10px rgba(255, 240, 200, 0.9), 0 0 20px rgba(245, 180, 70, 0.5), 0 2px 4px rgba(0, 0, 0, 0.9)'
                  }}
                >
                  {programa}
                </h2>
              </div>
            </div>

            {/* LISTA FLOTANTE DE CIUDADES Y FECHAS (SIN CAJAS, ESTILO ORIGINAL) */}
            <div className="flex flex-col items-center justify-center space-y-3.5 my-auto px-4">
              {sedes.filter(s => s.activo).map(s => (
                <div key={s.id} className="text-center">
                  <p
                    className="text-[13.5px] font-bold text-[#f29e2e] leading-tight"
                    style={{
                      textShadow: '0 0 10px rgba(242, 164, 59, 0.45), 0 1px 4px rgba(0,0,0,0.8)'
                    }}
                  >
                    {s.ciudad}
                  </p>
                  <p
                    className="text-[10px] font-light text-white tracking-wide mt-0.5"
                    style={{
                      textShadow: '0 0 8px rgba(255, 255, 255, 0.35), 0 1px 4px rgba(0,0,0,0.9)'
                    }}
                  >
                    {s.fechas}
                  </p>
                </div>
              ))}
            </div>

            {/* BANDERAS METÁLICAS Y HASHTAG (FONDO INFERIOR) */}
            <div className="pb-6 flex flex-col items-center gap-2.5">
              <img
                src="/flags_badges_hd.png"
                alt="Banderas Oficiales"
                className="w-[148px] h-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
              />
              <p
                className="text-[7.5px] font-normal tracking-[0.38em] pl-[0.38em] text-white/90 drop-shadow"
              >
                {hashtag}
              </p>
            </div>

          </div>

          {/* BOTÓN DE DESCARGA */}
          <button
            onClick={descargarFlyerHD}
            disabled={descargando}
            className="mt-5 w-full max-w-[360px] py-3.5 px-4 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_25px_rgba(245,158,11,0.45)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
          >
            <Download size={18} /> {descargando ? 'Generando 1080x1920...' : 'Descargar Flyer Oficial en 1080x1920 (PNG)'}
          </button>
        </div>

      </div>

      {/* MODAL CLI PUPPETEER BOT */}
      {showCliModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl max-w-lg w-full border border-yellow-500/30 space-y-4">
            <h3 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
              <Terminal size={22} /> Bot Autónomo de Flyers (Puppeteer)
            </h3>
            <p className="text-sm text-gray-300">
              También puedes generar el flyer automáticamente con fidelidad 100% desde la terminal o integrarlo en pipelines automáticos de mensajería usando el script de Node.js:
            </p>
            <div className="bg-black/90 p-4 rounded-xl font-mono text-xs text-green-400 border border-gray-800 select-all overflow-x-auto">
              node scripts/generar_flyer.mjs --programa="CAPÍTULO UNO"
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText('node scripts/generar_flyer.mjs --programa="CAPÍTULO UNO"');
                  showToast?.('Comando copiado al portapapeles', 'info');
                }}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <Copy size={14} /> Copiar Comando
              </button>
              <button
                onClick={() => setShowCliModal(false)}
                className="btn-primary bg-yellow-500 text-black font-bold text-xs"
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
