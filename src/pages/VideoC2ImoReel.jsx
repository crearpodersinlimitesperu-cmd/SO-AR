import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useUI } from '../context/UIContext';
import {
  ArrowLeft, Play, Pause, RotateCcw, Download, Share2,
  Sparkles, Video, Volume2, VolumeX, Eye, Flame, Check, Copy, ExternalLink
} from 'lucide-react';

const SEDES_VUELOS = [
  { id: 'lim', ciudad: 'Lima', pais: '🇵🇪', fechaC2: 'Viernes 20 y Sábado 21 de Noviembre', lugar: 'Hotel José Antonio Deluxe' },
  { id: 'uio', ciudad: 'Quito', pais: '🇪🇨', fechaC2: 'Viernes 27 y Sábado 28 de Noviembre', lugar: 'Fortaleza Cuántica CREAR' },
  { id: 'gye', ciudad: 'Guayaquil', pais: '🇪🇨', fechaC2: 'Viernes 4 y Sábado 5 de Diciembre', lugar: 'Centro de Convenciones GYE' },
  { id: 'cue', ciudad: 'Cuenca', pais: '🇪🇨', fechaC2: 'Viernes 11 y Sábado 12 de Diciembre', lugar: 'Campo Abierto Cuenca' },
  { id: 'med', ciudad: 'Medellín', pais: '🇨🇴', fechaC2: 'Viernes 18 y Sábado 19 de Diciembre', lugar: 'Espacio de Transformación Medellín' },
  { id: 'mex', ciudad: 'México', pais: '🇲🇽', fechaC2: 'Viernes 8 y Sábado 9 de Enero', lugar: 'Centro al Aire Libre CDMX' }
];

export default function VideoC2ImoReel() {
  const navigate = useNavigate();
  const { currentUser, user: legacyUser } = useAuth();
  const user = currentUser || legacyUser;
  const { showToast } = useUI();

  let activeTheme = 'dark';
  try {
    const themeContext = useTheme();
    if (themeContext?.activeTheme) activeTheme = themeContext.activeTheme;
  } catch (e) {
    activeTheme = 'dark';
  }
  const isLight = activeTheme === 'light';

  // Sede inicial según usuario
  const defaultSede = (() => {
    const s = (user?.sede || '').toLowerCase();
    if (s.includes('quito') || s.includes('uio')) return 'uio';
    if (s.includes('guayaquil') || s.includes('gye')) return 'gye';
    if (s.includes('cuenca') || s.includes('cue')) return 'cue';
    if (s.includes('medell') || s.includes('med')) return 'med';
    if (s.includes('mex') || s.includes('méx')) return 'mex';
    return 'lim';
  })();

  const [sedeId, setSedeId] = useState(defaultSede);
  const [nombreImo, setNombreImo] = useState('');
  const [nombreEnrolado, setNombreEnrolado] = useState('');
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0); // 0 a 23 segundos
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [vistaTab, setVistaTab] = useState('moderno'); // 'moderno' | 'original'

  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const animationFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  const particlesRef = useRef([]);

  const currentSedeObj = SEDES_VUELOS.find(s => s.id === sedeId) || SEDES_VUELOS[0];
  const DURATION = 23.0; // 23 segundos exactos

  // Inicializar partículas cósmicas
  useEffect(() => {
    const particles = [];
    for (let i = 0; i < 110; i++) {
      particles.push({
        x: Math.random() * 1080,
        y: Math.random() * 1920,
        radius: Math.random() * 2.8 + 0.8,
        speedY: -(Math.random() * 1.8 + 0.5),
        speedX: (Math.random() - 0.5) * 0.8,
        opacity: Math.random() * 0.7 + 0.3,
        pulseSpeed: Math.random() * 0.05 + 0.02,
        isSpark: Math.random() > 0.65
      });
    }
    particlesRef.current = particles;
  }, []);

  // Control de audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isMuted]);

  // Motor de animación en Canvas 1080x1920
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let lastTimestamp = performance.now();

    const render = (now) => {
      if (!startTimeRef.current) startTimeRef.current = now;
      const delta = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      if (isPlaying && !isRecording) {
        setCurrentTime(prev => {
          const next = prev + delta;
          if (next >= DURATION) {
            return 0; // Loop continuo
          }
          return next;
        });
      }

      drawFrame(ctx, currentTime);
      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isPlaying, currentTime, isRecording, sedeId, nombreImo, nombreEnrolado]);

  // Función de renderizado cinemático
  const drawFrame = (ctx, t) => {
    ctx.clearRect(0, 0, 1080, 1920);

    // 1. FONDO CÓSMICO PROFUNDO CON GRADIENTE DINÁMICO
    const bgPulse = Math.sin(t * 1.5) * 0.08;
    const grad = ctx.createRadialGradient(540, 960, 100, 540, 960, 1100);
    grad.addColorStop(0, `rgba(20, 32, 65, ${0.95 + bgPulse})`);
    grad.addColorStop(0.45, `rgba(10, 16, 35, ${0.98 + bgPulse})`);
    grad.addColorStop(0.85, '#040711');
    grad.addColorStop(1, '#000206');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);

    // 2. NEBULOSA ENERGÉTICA DORADA / CIAN
    const nebX = 540 + Math.cos(t * 0.8) * 60;
    const nebY = 820 + Math.sin(t * 0.6) * 40;
    const nebGrad = ctx.createRadialGradient(nebX, nebY, 40, nebX, nebY, 420);
    nebGrad.addColorStop(0, 'rgba(245, 158, 11, 0.18)');
    nebGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.12)');
    nebGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = nebGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // 3. PARTÍCULAS Y CHISPAS FLOTANTES (60 FPS)
    particlesRef.current.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      if (p.y < 0) p.y = 1920;
      if (p.x < 0) p.x = 1080;
      if (p.x > 1080) p.x = 0;

      const alpha = p.opacity + Math.sin(t * 5 + p.x) * 0.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.isSpark
        ? `rgba(255, 193, 7, ${Math.max(0.1, alpha)})`
        : `rgba(255, 255, 255, ${Math.max(0.1, alpha * 0.8)})`;
      ctx.shadowColor = p.isSpark ? 'rgba(255, 193, 7, 0.8)' : 'rgba(255, 255, 255, 0.5)';
      ctx.shadowBlur = p.isSpark ? 10 : 4;
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // 4. HEADER COMÚN: LOGO OFICIAL CREAR PODER SIN LÍMITES
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '800 32px "Montserrat", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
    ctx.fillText('CREAR', 540, 130);
    ctx.font = '400 16px "Montserrat", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('Poder sin límites', 540, 160);
    ctx.restore();

    // 5. BARRA DE PROGRESO DE STORIES (TOP)
    const progressW = (t / DURATION) * 960;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(60, 50, 960, 6);
    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
    ctx.shadowBlur = 8;
    ctx.fillRect(60, 50, progressW, 6);
    ctx.shadowBlur = 0;

    // 6. CONTROL SECUENCIAL DE ESCENAS
    if (t < 4.5) {
      renderEscena1(ctx, t);
    } else if (t < 9.0) {
      renderEscena2(ctx, t - 4.5);
    } else if (t < 14.0) {
      renderEscena3(ctx, t - 9.0);
    } else if (t < 18.5) {
      renderEscena4(ctx, t - 14.0);
    } else {
      renderEscena5(ctx, t - 18.5);
    }

    // 7. FOOTER COMÚN: HASHTAG Y SEDE
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '600 22px "Montserrat", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '8px';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowColor = 'rgba(245, 158, 11, 0.4)';
    ctx.shadowBlur = 10;
    ctx.fillText('#SOYCREADORCUÁNTICO', 540, 1820);

    ctx.font = '700 17px "Montserrat", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    ctx.fillStyle = '#f59e0b';
    ctx.shadowBlur = 0;
    ctx.fillText(`${currentSedeObj.pais} SEDE ${currentSedeObj.ciudad.toUpperCase()} • CPSL GLOBAL`, 540, 1855);
    ctx.restore();
  };

  // ESCENA 1: EL LLAMADO DEL CREADOR CUÁNTICO
  const renderEscena1 = (ctx, t) => {
    const scale = Math.min(1, t * 1.5);
    const alpha = Math.min(1, t * 2);

    ctx.save();
    ctx.globalAlpha = alpha;

    // Badge superior
    ctx.font = '700 20px "Inter", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ MENSAJE URGENTE PARA EL IMO ⚡', 540, 580);

    // Saludo Personalizado
    const imoGreeting = nombreImo ? `¡${nombreImo.toUpperCase()}!` : '¡CREADOR CUÁNTICO!';
    ctx.font = '900 68px "Montserrat", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 20;
    ctx.fillText(imoGreeting, 540, 700);

    // Subtítulo Impactante
    ctx.font = '800 48px "Montserrat", sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = 'rgba(245, 158, 11, 0.7)';
    ctx.shadowBlur = 24;
    ctx.fillText('TU VISIÓN SE HIZO REALIDAD', 540, 810);

    // Párrafo emotivo
    ctx.font = '500 32px "Inter", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0.5px';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.shadowBlur = 0;
    const enroladoText = nombreEnrolado ? `a ${nombreEnrolado}` : 'a alguien muy importante en tu vida';
    ctx.fillText(`Enrolaste ${enroladoText}`, 540, 930);
    ctx.fillText('y hoy su transformación está en marcha.', 540, 980);

    // Línea de fuego decorativa
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(340, 1050);
    ctx.lineTo(740, 1050);
    ctx.stroke();

    ctx.restore();
  };

  // ESCENA 2: EL SIGUIENTE NIVEL — CAPÍTULO DOS
  const renderEscena2 = (ctx, t) => {
    const pulse = Math.sin(t * 4) * 6;
    ctx.save();

    ctx.font = '700 22px "Inter", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
    ctx.fillStyle = '#f59e0b';
    ctx.textAlign = 'center';
    ctx.fillText('ESTE FIN DE SEMANA CRUZA EL UMBRAL', 540, 560);

    // Contorno FUEGO
    ctx.font = '900 150px "Montserrat", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '18px';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeText('FUEGO', 540, 780);

    // Título CAPÍTULO DOS
    ctx.font = '900 82px "Montserrat", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '8px';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(245, 158, 11, 0.9)';
    ctx.shadowBlur = 30 + pulse;
    ctx.fillText('CAPÍTULO DOS', 540, 770);

    ctx.font = '800 44px "Montserrat", sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.shadowBlur = 15;
    ctx.fillText('PODER SIN LÍMITES', 540, 860);

    // Descripción
    ctx.font = '500 32px "Inter", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0.5px';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = 0;
    ctx.fillText('El entrenamiento donde se rompen', 540, 970);
    ctx.fillText('todos los patrones del pasado.', 540, 1020);

    // Fecha de sede
    ctx.font = '700 30px "Inter", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`📅 ${currentSedeObj.fechaC2}`, 540, 1120);

    ctx.restore();
  };

  // ESCENA 3: LA DINÁMICA DE VUELOS
  const renderEscena3 = (ctx, t) => {
    ctx.save();

    ctx.font = '700 22px "Inter", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText('EL MOMENTO CUMBRE DE SU PROCESO', 540, 550);

    ctx.font = '800 46px "Montserrat", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('TÚ ENCENDISTE SU FUEGO', 540, 650);

    // Titulo VUELOS con Glow Cósmico
    ctx.font = '900 96px "Montserrat", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '12px';
    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = 'rgba(245, 158, 11, 0.95)';
    ctx.shadowBlur = 35;
    ctx.fillText('VUELOS C2', 540, 780);

    ctx.font = '800 38px "Montserrat", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.fillText('Y TÚ SERÁS QUIEN LO LLEVE EN ESE VUELO', 540, 870);

    // Texto de fondo espiritual / transformacional
    ctx.font = '500 31px "Inter", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0.5px';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.shadowBlur = 0;
    ctx.fillText('Tu amor, tu creencia y tu respaldo', 540, 980);
    ctx.fillText('lo sostendrán en el momento más sublime.', 540, 1030);

    ctx.restore();
  };

  // ESCENA 4: LA CONVOCATORIA EN SALA
  const renderEscena4 = (ctx, t) => {
    const pulse = Math.sin(t * 6) * 4;
    ctx.save();

    ctx.font = '700 22px "Inter", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
    ctx.fillStyle = '#f59e0b';
    ctx.textAlign = 'center';
    ctx.fillText('CONVOCATORIA OBLIGATORIA', 540, 540);

    ctx.font = '900 70px "Montserrat", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 20;
    ctx.fillText('¡ESTÁS CONVOCADO', 540, 660);
    ctx.fillText('A SALA!', 540, 740);

    ctx.font = '800 38px "Montserrat", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
    ctx.shadowBlur = 20 + pulse;
    ctx.fillText('NO DEJES QUE TE LO CUENTEN', 540, 840);

    ctx.font = '500 32px "Inter", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0.5px';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = 0;
    ctx.fillText('Tu presencia física en la sala', 540, 950);
    ctx.fillText('es el regalo más sagrado para tu enrolado.', 540, 1000);

    // Lugar de Sede
    ctx.font = '700 30px "Inter", sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`📍 ${currentSedeObj.lugar}`, 540, 1100);

    ctx.restore();
  };

  // ESCENA 5: CLÍMAX — LEONES CON LEONES
  const renderEscena5 = (ctx, t) => {
    ctx.save();

    ctx.font = '800 26px "Inter", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText('¡NOS VEMOS ESTE FIN DE SEMANA!', 540, 550);

    // Titulo Legendario LEONES CON LEONES
    ctx.font = '900 92px "Montserrat", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '10px';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(245, 158, 11, 0.95)';
    ctx.shadowBlur = 40;
    ctx.fillText('LEONES', 540, 700);

    ctx.font = '700 48px "Montserrat", sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('— CON —', 540, 780);

    ctx.font = '900 92px "Montserrat", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '10px';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(245, 158, 11, 0.95)';
    ctx.shadowBlur = 40;
    ctx.fillText('LEONES', 540, 890);

    // Frase final de gratitud
    ctx.font = '600 32px "Inter", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0.5px';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.shadowBlur = 0;
    ctx.fillText('Gracias por ser ese IMO', 540, 1010);
    ctx.fillText('que todos anhelamos tener.', 540, 1060);

    ctx.restore();
  };

  // GRABAR Y DESCARGAR VIDEO HD (1080x1920) CON MediaRecorder
  const handleDownloadVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!window.MediaRecorder) {
      showToast?.('MediaRecorder no disponible en este navegador.', 'error');
      return;
    }

    try {
      setIsRecording(true);
      setIsPlaying(false);
      setCurrentTime(0);
      showToast?.('Preparando grabación en Alta Definición 1080x1920 (23s)...', 'info');

      const stream = canvas.captureStream(60);
      const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
        ? 'video/mp4;codecs=avc1'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000 });
      const chunks = [];

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reel_Vuelos_C2_IMO_${currentSedeObj.ciudad}_1080x1920.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
        setIsRecording(false);
        setIsPlaying(true);
        showToast?.('¡Video descargado exitosamente listo para WhatsApp y Stories!', 'success');
      };

      recorder.start();

      const ctx = canvas.getContext('2d');
      const totalFrames = Math.floor(DURATION * 60);
      let frame = 0;

      const recordStep = () => {
        const t = frame / 60;
        drawFrame(ctx, t);
        setRecordingProgress(Math.round((frame / totalFrames) * 100));
        frame++;

        if (frame <= totalFrames) {
          requestAnimationFrame(recordStep);
        } else {
          recorder.stop();
        }
      };

      requestAnimationFrame(recordStep);

    } catch (err) {
      console.error('Error al grabar video:', err);
      setIsRecording(false);
      showToast?.('Error al generar archivo de video: ' + err.message, 'error');
    }
  };

  // COMPARTIR POR WHATSAPP
  const handleShareWhatsApp = () => {
    const enroladoNombre = nombreEnrolado ? `a ${nombreEnrolado}` : 'a tu enrolado';
    const text = `🦁 *CONVOCATORIA OFICIAL VUELOS C2 — CREAR PODER SIN LÍMITES* 🦁\n\n` +
      `¡Felicidades Creador Cuántico!\n` +
      `Enrolaste ${enroladoNombre} y este fin de semana cruzará el umbral más desafiante de su proceso en *Capítulo Dos*.\n\n` +
      `Tú encendiste su fuego; ahora te toca ser el viento bajo sus alas en el momento cumbre: la sagrada *Dinámica de Vuelos*.\n\n` +
      `📍 *Sede:* ${currentSedeObj.ciudad} (${currentSedeObj.lugar})\n` +
      `📅 *Fecha:* ${currentSedeObj.fechaC2}\n\n` +
      `¡No dejes que te lo cuenten! Tu presencia física en sala es su mayor regalo y ancla sagrada.\n\n` +
      `*¡LEONES CON LEONES!* 🦁🔥\n` +
      `#SOYCREADORCUÁNTICO`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    showToast?.('Mensaje oficial de convocatoria copiado a WhatsApp', 'success');
  };

  const copiarMensaje = () => {
    const enroladoNombre = nombreEnrolado ? `a ${nombreEnrolado}` : 'a tu enrolado';
    const text = `🦁 *CONVOCATORIA OFICIAL VUELOS C2 — CREAR PODER SIN LÍMITES* 🦁\n\n` +
      `¡Felicidades Creador Cuántico!\n` +
      `Enrolaste ${enroladoNombre} y este fin de semana cruzará el umbral más desafiante de su proceso en *Capítulo Dos*.\n\n` +
      `Tú encendiste su fuego; ahora te toca ser el viento bajo sus alas en el momento cumbre: la sagrada *Dinámica de Vuelos*.\n\n` +
      `📍 *Sede:* ${currentSedeObj.ciudad} (${currentSedeObj.lugar})\n` +
      `📅 *Fecha:* ${currentSedeObj.fechaC2}\n\n` +
      `¡No dejes que te lo cuenten! Tu presencia física en sala es su mayor regalo y ancla sagrada.\n\n` +
      `*¡LEONES CON LEONES!* 🦁🔥\n` +
      `#SOYCREADORCUÁNTICO`;

    navigator.clipboard.writeText(text);
    showToast?.('Texto de convocatoria copiado al portapapeles', 'info');
  };

  const themeStyles = {
    bgPage: isLight ? '#f8fafc' : '#040813',
    cardBg: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(11, 23, 44, 0.85)',
    cardBorder: isLight ? 'rgba(217, 119, 6, 0.28)' : 'rgba(255, 193, 7, 0.25)',
    textTitle: isLight ? '#0f172a' : '#ffffff',
    textMuted: isLight ? '#64748b' : '#94a3b8',
    inputBg: isLight ? '#f1f5f9' : 'rgba(6, 14, 28, 0.85)',
    inputBorder: isLight ? 'rgba(203, 213, 225, 0.8)' : 'rgba(255, 255, 255, 0.12)'
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: themeStyles.bgPage,
      color: themeStyles.textTitle,
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      padding: '1.5rem 2rem 4rem 2rem'
    }}>
      {/* Audio ambiental */}
      <audio ref={audioRef} loop src="/lion-roar.mp3" preload="auto" />

      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

        {/* HEADER COCKPIT */}
        <header style={{
          background: themeStyles.cardBg,
          backdropFilter: 'blur(16px)',
          border: `1px solid ${themeStyles.cardBorder}`,
          borderRadius: '20px',
          padding: '1.25rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          boxShadow: '0 16px 40px rgba(0,0,0,0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <button
              onClick={() => navigate('/monitor-imos')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.95rem',
                background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.06)',
                border: `1px solid ${themeStyles.cardBorder}`,
                borderRadius: '12px',
                color: themeStyles.textTitle,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              <ArrowLeft size={16} /> Volver a IMOs
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
                  VUELOS CAPÍTULO DOS • REEL OFICIAL
                </span>
                <span style={{ fontSize: '0.78rem', color: themeStyles.textMuted, fontWeight: 600 }}>
                  &bull; Convocatoria Dinámica para IMOs
                </span>
              </div>

              <h1 style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: themeStyles.textTitle,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Video size={22} style={{ color: '#f59e0b' }} />
                Video Reel Dinámico: Convocatoria Vuelos C2
              </h1>
            </div>
          </div>

          {/* Toggle de vistas: Moderno vs Original */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)', padding: '4px', borderRadius: '12px' }}>
            <button
              onClick={() => setVistaTab('moderno')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '10px',
                border: 'none',
                background: vistaTab === 'moderno' ? 'linear-gradient(135deg, #FFC107 0%, #d97706 100%)' : 'transparent',
                color: vistaTab === 'moderno' ? '#000000' : themeStyles.textMuted,
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              ✨ Versión Moderna 60FPS
            </button>
            <button
              onClick={() => setVistaTab('original')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '10px',
                border: 'none',
                background: vistaTab === 'original' ? 'linear-gradient(135deg, #FFC107 0%, #d97706 100%)' : 'transparent',
                color: vistaTab === 'original' ? '#000000' : themeStyles.textMuted,
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              📼 Video Original (WhatsApp)
            </button>
          </div>
        </header>

        {/* SELECTOR DE SEDES RÁPIDO */}
        <div style={{
          background: themeStyles.cardBg,
          border: `1px solid ${themeStyles.cardBorder}`,
          borderRadius: '16px',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 800, color: '#f59e0b' }}>
            <Sparkles size={16} /> SEDE DEL CICLO C2:
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {SEDES_VUELOS.map(s => (
              <button
                key={s.id}
                onClick={() => setSedeId(s.id)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: sedeId === s.id ? 'none' : `1px solid ${themeStyles.cardBorder}`,
                  cursor: 'pointer',
                  background: sedeId === s.id ? 'linear-gradient(135deg, #FFC107 0%, #d97706 100%)' : (isLight ? '#ffffff' : 'rgba(255,255,255,0.05)'),
                  color: sedeId === s.id ? '#000000' : themeStyles.textTitle,
                  boxShadow: sedeId === s.id ? '0 0 12px rgba(255,193,7,0.4)' : 'none'
                }}
              >
                <span>{s.pais}</span> {s.ciudad}
              </button>
            ))}
          </div>
        </div>

        {/* GRID PRINCIPAL: CONTROLES EDITORIALES (IZQ) + SMARTPHONE 9:16 (DER) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.25fr) minmax(380px, 420px)',
          gap: '2rem',
          alignItems: 'start'
        }}>

          {/* COLUMNA IZQUIERDA: PERSONALIZACIÓN Y ACCIONES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* CARD 1: PERSONALIZACIÓN */}
            <div style={{
              background: themeStyles.cardBg,
              backdropFilter: 'blur(16px)',
              border: `1px solid ${themeStyles.cardBorder}`,
              borderRadius: '20px',
              padding: '1.5rem',
              boxShadow: '0 16px 40px rgba(0,0,0,0.3)'
            }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f59e0b', margin: '0 0 1rem 0', textTransform: 'uppercase' }}>
                Personalización para el Enrolador (IMO)
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: themeStyles.textMuted, marginBottom: '0.35rem' }}>
                    NOMBRE DEL IMO (OPCIONAL)
                  </label>
                  <input
                    type="text"
                    value={nombreImo}
                    onChange={e => setNombreImo(e.target.value)}
                    placeholder="Ej: Carlos / Andrea (o vacío para Creador Cuántico)"
                    style={{
                      width: '100%', boxSizing: 'border-box', background: themeStyles.inputBg,
                      border: `1px solid ${themeStyles.inputBorder}`, borderRadius: '10px',
                      padding: '0.65rem 0.95rem', color: themeStyles.textTitle, fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: themeStyles.textMuted, marginBottom: '0.35rem' }}>
                    NOMBRE DEL ENROLADO EN C2 (OPCIONAL)
                  </label>
                  <input
                    type="text"
                    value={nombreEnrolado}
                    onChange={e => setNombreEnrolado(e.target.value)}
                    placeholder="Ej: María / tu hermano (o vacío para general)"
                    style={{
                      width: '100%', boxSizing: 'border-box', background: themeStyles.inputBg,
                      border: `1px solid ${themeStyles.inputBorder}`, borderRadius: '10px',
                      padding: '0.65rem 0.95rem', color: themeStyles.textTitle, fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: isLight ? '#f1f5f9' : 'rgba(245, 158, 11, 0.08)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>
                  📍 Sede: {currentSedeObj.ciudad} &bull; {currentSedeObj.fechaC2}
                </div>
                <div style={{ fontSize: '0.74rem', color: themeStyles.textMuted, marginTop: '2px' }}>
                  Lugar de Convocatoria: {currentSedeObj.lugar}
                </div>
              </div>
            </div>

            {/* CARD 2: MENSAJE OFICIAL PARA WHATSAPP */}
            <div style={{
              background: themeStyles.cardBg,
              border: `1px solid ${themeStyles.cardBorder}`,
              borderRadius: '20px',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f59e0b', margin: 0, textTransform: 'uppercase' }}>
                  Invitación Oficial para WhatsApp
                </h2>
                <button
                  onClick={copiarMensaje}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.4rem 0.75rem',
                    background: 'transparent',
                    border: `1px solid ${themeStyles.cardBorder}`,
                    borderRadius: '8px',
                    color: '#f59e0b',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Copy size={13} /> Copiar Texto
                </button>
              </div>

              <div style={{
                background: isLight ? '#f8fafc' : 'rgba(5, 10, 20, 0.7)',
                padding: '1rem',
                borderRadius: '12px',
                border: `1px solid ${themeStyles.inputBorder}`,
                fontSize: '0.82rem',
                lineHeight: 1.5,
                color: themeStyles.textTitle,
                whiteSpace: 'pre-line'
              }}>
                {`🦁 *CONVOCATORIA OFICIAL VUELOS C2 — CREAR PODER SIN LÍMITES* 🦁

¡Felicidades Creador Cuántico!
Enrolaste ${nombreEnrolado ? `a ${nombreEnrolado}` : 'a tu enrolado'} y este fin de semana cruzará el umbral más desafiante de su proceso en *Capítulo Dos*.

Tú encendiste su fuego; ahora te toca ser el viento bajo sus alas en el momento cumbre: la sagrada *Dinámica de Vuelos*.

📍 *Sede:* ${currentSedeObj.ciudad} (${currentSedeObj.lugar})
📅 *Fecha:* ${currentSedeObj.fechaC2}

¡No dejes que te lo cuenten! Tu presencia física en sala es su mayor ancla sagrada.

*¡LEONES CON LEONES!* 🦁🔥
#SOYCREADORCUÁNTICO`}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleShareWhatsApp}
                  style={{
                    flex: 1,
                    minWidth: '200px',
                    padding: '0.8rem 1.2rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 15px rgba(37, 211, 102, 0.35)'
                  }}
                >
                  <Share2 size={16} /> Compartir por WhatsApp
                </button>

                <button
                  onClick={handleDownloadVideo}
                  disabled={isRecording}
                  style={{
                    flex: 1,
                    minWidth: '200px',
                    padding: '0.8rem 1.2rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: isRecording ? '#64748b' : 'linear-gradient(135deg, #FFC107 0%, #d97706 100%)',
                    color: '#000000',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: isRecording ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: isRecording ? 'none' : '0 4px 15px rgba(255, 193, 7, 0.4)'
                  }}
                >
                  <Download size={16} />
                  {isRecording ? `Grabando Video (${recordingProgress}%)...` : 'Grabar y Descargar Video HD (1080x1920)'}
                </button>
              </div>
            </div>

          </div>

          {/* COLUMNA DERECHA: REPRODUCTOR SMARTPHONE 9:16 */}
          <div style={{
            position: 'sticky',
            top: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '100%',
              maxWidth: '380px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 0.5rem'
            }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: themeStyles.textTitle, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Eye size={14} style={{ color: '#f59e0b', verticalAlign: 'middle', marginRight: '4px' }} />
                {vistaTab === 'moderno' ? 'Reel 60FPS (9:16)' : 'Video Original (2026)'}
              </span>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.2rem 0.65rem', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                1080 × 1920 HD
              </span>
            </div>

            {/* MOCKUP SMARTPHONE */}
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
              {/* Notch */}
              <div style={{
                position: 'absolute', top: '18px', left: '50%', transform: 'translateX(-50%)',
                width: '90px', height: '14px', background: '#050a14', borderRadius: '12px', zIndex: 40
              }} />

              {/* Pantalla Interna */}
              <div style={{
                width: '100%', height: '100%', borderRadius: '26px', overflow: 'hidden',
                position: 'relative', backgroundColor: '#000000'
              }}>
                {vistaTab === 'moderno' ? (
                  <>
                    <canvas
                      ref={canvasRef}
                      width={1080}
                      height={1920}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    {/* Controles de reproducción superpuestos */}
                    <div style={{
                      position: 'absolute', bottom: '15px', right: '15px', zIndex: 30,
                      display: 'flex', gap: '0.4rem'
                    }}>
                      <button
                        onClick={() => setIsMuted(prev => !prev)}
                        style={{
                          width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)',
                          border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                      </button>
                      <button
                        onClick={() => setIsPlaying(prev => !prev)}
                        style={{
                          width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.85)',
                          border: 'none', color: '#000000', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                      </button>
                    </div>
                  </>
                ) : (
                  <video
                    src="/videos/video_vuelos_imo_creador_cuantico.mp4"
                    controls
                    autoPlay
                    loop
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </div>
            </div>

            {/* Barra de Tiempo del Reel */}
            {vistaTab === 'moderno' && (
              <div style={{ width: '100%', maxWidth: '380px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={() => { setCurrentTime(0); setIsPlaying(true); }}
                  style={{
                    padding: '0.4rem 0.7rem', borderRadius: '8px', background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${themeStyles.cardBorder}`, color: themeStyles.textTitle, cursor: 'pointer',
                    fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem'
                  }}
                >
                  <RotateCcw size={13} /> Reiniciar
                </button>
                <input
                  type="range"
                  min={0}
                  max={DURATION}
                  step={0.1}
                  value={currentTime}
                  onChange={e => setCurrentTime(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: '#f59e0b' }}
                />
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b' }}>
                  {Math.round(currentTime)}s / 23s
                </span>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
