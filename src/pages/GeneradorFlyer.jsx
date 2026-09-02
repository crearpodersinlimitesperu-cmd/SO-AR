import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useUI } from '../context/UIContext';
import {
  Sparkles, Download, ArrowLeft, RefreshCw, Calendar, Check,
  Copy, Image as ImageIcon, Sliders, Eye, Share2, Terminal
} from 'lucide-react';

// Sedes y banderas oficiales
const SEDES_INICIALES = [
  { id: 'lim', ciudad: 'LIMA', pais: 'Perú', codigo: 'PE', bandera: '🇵🇪', fechas: '04 - 06 SEPTIEMBRE', activo: true },
  { id: 'uio', ciudad: 'QUITO', pais: 'Ecuador', codigo: 'EC', bandera: '🇪🇨', fechas: '11 - 13 SEPTIEMBRE', activo: true },
  { id: 'mex', ciudad: 'MÉXICO', pais: 'México', codigo: 'MX', bandera: '🇲🇽', fechas: '18 - 20 SEPTIEMBRE', activo: true },
  { id: 'gye', ciudad: 'GUAYAQUIL', pais: 'Ecuador', codigo: 'EC', bandera: '🇪🇨', fechas: '25 - 27 SEPTIEMBRE', activo: true },
  { id: 'cue', ciudad: 'CUENCA', pais: 'Ecuador', codigo: 'EC', bandera: '🇪🇨', fechas: '02 - 04 OCTUBRE', activo: true },
  { id: 'med', ciudad: 'MEDELLÍN', pais: 'Colombia', codigo: 'CO', bandera: '🇨🇴', fechas: '09 - 11 OCTUBRE', activo: true },
];

export default function GeneradorFlyer() {
  const { currentUser } = useAuth();
  const { events } = useCycles();
  const { showToast } = useUI();
  const navigate = useNavigate();

  const [programa, setPrograma] = useState('MAESTRÍA EN CREACIÓN');
  const [subtitulo, setSubtitulo] = useState('GIRA INTERNACIONAL');
  const [sedes, setSedes] = useState(SEDES_INICIALES);
  const [descargando, setDescargando] = useState(false);
  const [showCliModal, setShowCliModal] = useState(false);

  const canvasRef = useRef(null);

  // Sincronizar fechas del calendario oficial de Causa OS
  const sincronizarFechasCalendario = () => {
    if (!events || events.length === 0) {
      showToast?.('No hay eventos cargados aún en el calendario local', 'warning');
      return;
    }

    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

    const sedesActualizadas = sedes.map(s => {
      // Buscar el próximo evento para esta sede
      const ev = events.find(e => {
        const evSede = (e.sede || '').toUpperCase();
        const evNombre = (e.nombre || '').toUpperCase();
        const fecha = new Date(e.fecha_inicio);
        const hoy = new Date();
        return evSede.includes(s.id.toUpperCase()) && fecha >= hoy;
      });

      if (ev && ev.fecha_inicio) {
        const dInicio = new Date(ev.fecha_inicio);
        const dFin = ev.fecha_fin ? new Date(ev.fecha_fin) : new Date(dInicio.getTime() + 2 * 86400000);
        const diaI = String(dInicio.getDate()).padStart(2, '0');
        const diaF = String(dFin.getDate()).padStart(2, '0');
        const mesStr = meses[dInicio.getMonth()];
        return {
          ...s,
          fechas: `${diaI} - ${diaF} ${mesStr}`
        };
      }
      return s;
    });

    setSedes(sedesActualizadas);
    showToast?.('Fechas sincronizadas con el calendario oficial', 'success');
  };

  const updateSedeFecha = (id, fechas) => {
    setSedes(prev => prev.map(s => s.id === id ? { ...s, fechas } : s));
  };

  const toggleSedeActiva = (id) => {
    setSedes(prev => prev.map(s => s.id === id ? { ...s, activo: !s.activo } : s));
  };

  // Función para dibujar y descargar el Flyer a 1080 x 1920
  const descargarFlyerHD = async () => {
    setDescargando(true);
    showToast?.('Generando Flyer en Alta Resolución 1080x1920...', 'info');

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // 1. Cargar fondo cósmico
      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      bgImg.src = '/flyer_earth_bg.png';
      await new Promise((resolve, reject) => {
        bgImg.onload = resolve;
        bgImg.onerror = reject;
      });

      // 2. Cargar logo oficial blanco
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = '/logo_crear_blanco.png';
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
      });

      // Asegurar fuentes
      await document.fonts.ready;

      // Dibujar fondo
      ctx.clearRect(0, 0, 1080, 1920);
      ctx.drawImage(bgImg, 0, 0, 1080, 1920);

      // Gradiente de oscurecimiento superior e inferior para legibilidad
      const grad = ctx.createRadialGradient(540, 300, 50, 540, 960, 900);
      grad.addColorStop(0, 'rgba(13, 27, 42, 0.45)');
      grad.addColorStop(0.6, 'rgba(3, 7, 18, 0.78)');
      grad.addColorStop(1, 'rgba(3, 7, 18, 0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Top flags (círculos)
      const flags = [
        { code: 'EC', color1: '#FFDD00', color2: '#034EA2', color3: '#ED1C24' },
        { code: 'PE', color1: '#D91023', color2: '#FFFFFF', color3: '#D91023' },
        { code: 'CO', color1: '#FCD116', color2: '#003893', color3: '#CE1126' },
        { code: 'MX', color1: '#006847', color2: '#FFFFFF', color3: '#CE1126' }
      ];

      const startX = 540 - ((flags.length * 52 + (flags.length - 1) * 20) / 2);
      flags.forEach((f, idx) => {
        const cx = startX + idx * 72 + 26;
        const cy = 110;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, 24, 0, Math.PI * 2);
        ctx.clip();

        if (f.code === 'PE' || f.code === 'MX') {
          ctx.fillStyle = f.color1; ctx.fillRect(cx - 24, cy - 24, 16, 48);
          ctx.fillStyle = f.color2; ctx.fillRect(cx - 8, cy - 24, 16, 48);
          ctx.fillStyle = f.color3; ctx.fillRect(cx + 8, cy - 24, 16, 48);
        } else {
          ctx.fillStyle = f.color1; ctx.fillRect(cx - 24, cy - 24, 48, 24);
          ctx.fillStyle = f.color2; ctx.fillRect(cx - 24, cy, 48, 12);
          ctx.fillStyle = f.color3; ctx.fillRect(cx - 24, cy + 12, 48, 12);
        }
        ctx.restore();

        // Borde dorado de la bandera
        ctx.beginPath();
        ctx.arc(cx, cy, 24, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      });

      // Dibujar logo oficial
      const logoW = 220;
      const logoH = (logoImg.height / logoImg.width) * logoW;
      ctx.drawImage(logoImg, 540 - (logoW / 2), 170, logoW, logoH);

      // Marca
      ctx.font = '800 20px Montserrat, sans-serif';
      ctx.fillStyle = '#f59e0b';
      ctx.textAlign = 'center';
      ctx.letterSpacing = '6px';
      ctx.fillText('CREAR PODER SIN LÍMITES', 540, 170 + logoH + 45);

      // Programa
      ctx.font = '900 52px Montserrat, sans-serif';
      const gradTitle = ctx.createLinearGradient(300, 0, 780, 0);
      gradTitle.addColorStop(0, '#ffffff');
      gradTitle.addColorStop(0.5, '#fef08a');
      gradTitle.addColorStop(1, '#eab308');
      ctx.fillStyle = gradTitle;
      ctx.letterSpacing = '3px';
      ctx.fillText(programa.toUpperCase(), 540, 170 + logoH + 115);

      // Subtítulo Pill
      const subTxt = subtitulo.toUpperCase();
      ctx.font = '700 16px Montserrat, sans-serif';
      ctx.letterSpacing = '4px';
      const subW = ctx.measureText(subTxt).width + 60;
      const subY = 170 + logoH + 150;

      ctx.beginPath();
      ctx.roundRect(540 - (subW / 2), subY, subW, 38, 19);
      ctx.fillStyle = 'rgba(255, 183, 3, 0.15)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 183, 3, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.fillText(subTxt, 540, subY + 25);

      // Lista de Sedes
      const sedesActivas = sedes.filter(s => s.activo);
      const startSedesY = 480;
      const cardH = 92;
      const gap = 20;

      sedesActivas.forEach((s, idx) => {
        const cy = startSedesY + idx * (cardH + gap);

        // Card glassmorphic
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(75, cy, 930, cardH, 20);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Bandera redonda
        const flagX = 135;
        const flagY = cy + cardH / 2;
        ctx.beginPath();
        ctx.arc(flagX, flagY, 22, 0, Math.PI * 2);
        ctx.save();
        ctx.clip();

        if (s.codigo === 'PE') {
          ctx.fillStyle = '#D91023'; ctx.fillRect(flagX - 22, flagY - 22, 14, 44);
          ctx.fillStyle = '#FFFFFF'; ctx.fillRect(flagX - 8, flagY - 22, 16, 44);
          ctx.fillStyle = '#D91023'; ctx.fillRect(flagX + 8, flagY - 22, 14, 44);
        } else if (s.codigo === 'MX') {
          ctx.fillStyle = '#006847'; ctx.fillRect(flagX - 22, flagY - 22, 14, 44);
          ctx.fillStyle = '#FFFFFF'; ctx.fillRect(flagX - 8, flagY - 22, 16, 44);
          ctx.fillStyle = '#CE1126'; ctx.fillRect(flagX + 8, flagY - 22, 14, 44);
        } else {
          ctx.fillStyle = '#FFDD00'; ctx.fillRect(flagX - 22, flagY - 22, 44, 22);
          ctx.fillStyle = '#034EA2'; ctx.fillRect(flagX - 22, flagY, 44, 11);
          ctx.fillStyle = '#ED1C24'; ctx.fillRect(flagX - 22, flagY + 11, 44, 11);
        }
        ctx.restore();

        ctx.beginPath();
        ctx.arc(flagX, flagY, 22, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Nombre de ciudad y país
        ctx.textAlign = 'left';
        ctx.letterSpacing = '2px';
        ctx.font = '900 32px Montserrat, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(s.ciudad, 180, cy + 45);

        ctx.font = '600 14px Montserrat, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.letterSpacing = '3px';
        ctx.fillText(s.pais.toUpperCase(), 182, cy + 72);

        // Badge de Fecha
        const badgeW = 340;
        const badgeH = 54;
        const badgeX = 930 - badgeW;
        const badgeY = cy + (cardH - badgeH) / 2;

        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 14);
        const bGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
        bGrad.addColorStop(0, 'rgba(245, 158, 11, 0.2)');
        bGrad.addColorStop(1, 'rgba(217, 119, 6, 0.35)');
        ctx.fillStyle = bGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.font = '800 21px Montserrat, sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.letterSpacing = '1px';
        ctx.fillText(s.fechas.toUpperCase(), badgeX + badgeW / 2, badgeY + 35);

        ctx.restore();
      });

      // Footer Hashtag
      ctx.textAlign = 'center';
      ctx.font = 'italic 900 42px Montserrat, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.letterSpacing = '8px';
      ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
      ctx.shadowBlur = 25;
      ctx.fillText('#SOYCREADOR', 540, 1780);
      ctx.shadowBlur = 0;

      // Contacto oficial
      ctx.font = '700 16px Montserrat, sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('CREARPSL.COM', 440, 1825);
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('•', 540, 1825);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('WHATSAPP: +51 981 237 577', 670, 1825);

      // Exportar como PNG y descargar
      const link = document.createElement('a');
      link.download = `Flyer_${programa.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();

      showToast?.('¡Flyer 1080x1920 descargado con éxito!', 'success');
    } catch (err) {
      console.error(err);
      showToast?.('Error al generar la imagen: ' + err.message, 'error');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen text-white">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2 text-sm font-semibold"
          >
            <ArrowLeft size={16} /> Volver a Causa OS
          </button>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-crear-gold via-yellow-400 to-amber-500 flex items-center gap-3">
            <Sparkles className="text-yellow-400" size={32} />
            Bot Generador de Flyers Oficiales
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            CREAR PODER SIN LÍMITES &bull; Generación automatizada 1080x1920 con fechas actualizadas por sede
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={sincronizarFechasCalendario}
            className="btn-secondary flex items-center gap-2 border-yellow-500/30 hover:border-yellow-400 text-yellow-400"
          >
            <RefreshCw size={16} /> Sincronizar Calendario
          </button>
          <button
            onClick={() => setShowCliModal(true)}
            className="btn-secondary flex items-center gap-2 text-cyan-400 border-cyan-500/30 hover:border-cyan-400"
          >
            <Terminal size={16} /> Bot Puppeteer CLI
          </button>
          <button
            onClick={descargarFlyerHD}
            disabled={descargando}
            className="btn-primary flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-extrabold px-5 py-2.5 rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-50"
          >
            <Download size={18} /> {descargando ? 'Generando PNG...' : 'Descargar Flyer HD (1080x1920)'}
          </button>
        </div>
      </div>

      {/* CANVAS OCULTO PARA EXPORTACIÓN EN ALTA DEFINICIÓN */}
      <canvas
        ref={canvasRef}
        width={1080}
        height={1920}
        style={{ display: 'none' }}
      />

      {/* GRID PRINCIPAL: CONFIGURACIÓN A LA IZQUIERDA / PREVIEW A LA DERECHA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* PANEL DE CONFIGURACIÓN */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Tarjeta Programa */}
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
            <h3 className="text-lg font-bold text-crear-gold flex items-center gap-2">
              <Sliders size={20} /> Parámetros del Flyer
            </h3>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                Programa / Entrenamiento
              </label>
              <select
                value={programa}
                onChange={(e) => setPrograma(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white font-bold focus:border-crear-gold focus:outline-none"
              >
                <option value="MAESTRÍA EN CREACIÓN">MAESTRÍA EN CREACIÓN</option>
                <option value="CREACIÓN 1">CREACIÓN 1</option>
                <option value="CREACIÓN 2">CREACIÓN 2</option>
                <option value="EL VIAJE">EL VIAJE</option>
                <option value="GIRA INTERNACIONAL">GIRA INTERNACIONAL</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                Subtítulo / Etiqueta Superior
              </label>
              <input
                type="text"
                value={subtitulo}
                onChange={(e) => setSubtitulo(e.target.value)}
                placeholder="GIRA INTERNACIONAL 2026"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white font-semibold focus:border-crear-gold focus:outline-none"
              />
            </div>
          </div>

          {/* Tarjeta Sedes y Fechas */}
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-crear-gold flex items-center gap-2">
                <Calendar size={20} /> Sedes y Fechas Oficiales
              </h3>
              <span className="text-xs text-gray-400">{sedes.filter(s => s.activo).length} activas</span>
            </div>

            <div className="space-y-3">
              {sedes.map(s => (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                    s.activo ? 'bg-gray-900/80 border-gray-700' : 'bg-gray-950/40 border-gray-900 opacity-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={s.activo}
                    onChange={() => toggleSedeActiva(s.id)}
                    className="accent-yellow-500 w-5 h-5 cursor-pointer rounded"
                  />
                  <span className="text-2xl">{s.bandera}</span>
                  <div className="w-28 flex-shrink-0">
                    <p className="font-extrabold text-sm text-white">{s.ciudad}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">{s.pais}</p>
                  </div>
                  <input
                    type="text"
                    value={s.fechas}
                    disabled={!s.activo}
                    onChange={(e) => updateSedeFecha(s.id, e.target.value)}
                    className="flex-1 bg-black/60 border border-gray-700 rounded-lg px-3 py-2 text-xs font-bold text-yellow-400 uppercase focus:border-yellow-400 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* PREVIEW EN TIEMPO REAL */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-3 max-w-sm">
            <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1.5">
              <Eye size={14} className="text-yellow-400" /> Previsualización en Vivo (9:16)
            </span>
            <span className="text-[10px] px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-full font-bold">
              1080 x 1920
            </span>
          </div>

          {/* MOCKUP VERTICAL ESTILO FLYER */}
          <div
            className="w-full max-w-sm rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.9)] border-2 border-yellow-500/30 relative flex flex-col justify-between"
            style={{
              aspectRatio: '9/16',
              backgroundImage: "url('/flyer_earth_bg.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center bottom',
              backgroundColor: '#030712'
            }}
          >
            {/* Overlay gradiente */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,_rgba(13,27,42,0.45)_0%,_rgba(3,7,18,0.8)_60%,_rgba(3,7,18,0.95)_100%)] pointer-events-none" />

            {/* Contenido */}
            <div className="relative z-10 p-5 flex flex-col h-full justify-between">
              
              {/* Top flags */}
              <div>
                <div className="flex justify-center gap-2 mb-3">
                  <span className="text-lg">🇪🇨</span>
                  <span className="text-lg">🇵🇪</span>
                  <span className="text-lg">🇨🇴</span>
                  <span className="text-lg">🇲🇽</span>
                </div>

                <div className="text-center mb-2">
                  <img src="/logo_crear_blanco.png" alt="CREAR" className="h-10 mx-auto object-contain drop-shadow-[0_0_12px_rgba(255,183,3,0.4)]" />
                </div>

                <div className="text-center">
                  <p className="text-[9px] font-black tracking-[0.25em] text-yellow-500 uppercase mb-1">
                    CREAR PODER SIN LÍMITES
                  </p>
                  <h2 className="text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-yellow-200 to-yellow-500 uppercase leading-tight">
                    {programa}
                  </h2>
                  <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase bg-yellow-500/15 border border-yellow-500/40 text-yellow-300">
                    {subtitulo}
                  </span>
                </div>
              </div>

              {/* Lista Sedes */}
              <div className="space-y-2 my-auto">
                {sedes.filter(s => s.activo).map(s => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/70 border border-yellow-500/25 shadow-lg backdrop-blur-md"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{s.bandera}</span>
                      <div>
                        <p className="text-xs font-black text-white leading-none">{s.ciudad}</p>
                        <p className="text-[8px] font-semibold text-gray-400 uppercase mt-0.5">{s.pais}</p>
                      </div>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-yellow-500/20 to-amber-600/30 border border-yellow-500/50">
                      <span className="text-[10px] font-black text-yellow-400 whitespace-nowrap">
                        {s.fechas}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="text-center mt-3">
                <p className="text-lg font-black italic tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]">
                  #SOYCREADOR
                </p>
                <p className="text-[8px] font-bold text-gray-300 tracking-wider mt-0.5">
                  <span className="text-cyan-400">CREARPSL.COM</span> &bull; WHATSAPP: +51 981 237 577
                </p>
              </div>

            </div>
          </div>

          <button
            onClick={descargarFlyerHD}
            disabled={descargando}
            className="mt-5 w-full max-w-sm py-3 px-4 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2"
          >
            <Download size={18} /> Descargar en 1080x1920 (PNG)
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
              También puedes generar el flyer automáticamente desde la terminal o integrarlo en tus pipelines y bots de Telegram/WhatsApp usando el script de Node.js:
            </p>
            <div className="bg-black/90 p-4 rounded-xl font-mono text-xs text-green-400 border border-gray-800 select-all overflow-x-auto">
              node scripts/generar_flyer.mjs --programa="MAESTRÍA EN CREACIÓN"
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText('node scripts/generar_flyer.mjs --programa="MAESTRÍA EN CREACIÓN"');
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
