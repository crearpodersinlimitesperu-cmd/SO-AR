/**
 * neuroFeedback.js
 * Utilidades de Neuromarketing, Dopamina y Neuro-recompensas para CREAR PODER SIN LÍMITES
 * Plataforma: Causa OS
 */

// 1. SÍNTESIS DE AUDIO NEUROLÓGICO (Web Audio API Nativo)
// Genera un acorde armónico brillante y gratificante (C5 - E5 - G5 - C6) con envolvente exponencial
export function playCompletionChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Frecuencias áureas de victoria: Do5 (523.25Hz), Mi5 (659.25Hz), Sol5 (783.99Hz), Do6 (1046.50Hz)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const now = ctx.currentTime;

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = index === notes.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.06);

      // Envolvente de volumen (ataque rápido, decaimiento suave y satisfactorio)
      const noteStart = now + index * 0.06;
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.18, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + 0.5);
    });
  } catch (e) {
    console.debug('Audio context feedback non-critical bypass:', e);
  }
}

// 2. MICRO-CELEBRACIÓN VISUAL (Partículas / Confeti Ultraligero Canvas)
export function triggerCompletionConfetti() {
  try {
    const canvas = document.createElement('canvas');
    canvas.id = 'neuro-confetti-canvas';
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '99999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    // Paleta de identidad: Dorado CREAR, Cian Eléctrico, Verde Victoria, Blanco Puro
    const colors = ['#ffb703', '#fb8500', '#29abe2', '#10b981', '#ffffff'];
    const particleCount = 42;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: width * 0.5 + (Math.random() - 0.5) * 200,
        y: height * 0.45 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 1.4) * 10,
        size: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
        alpha: 1,
        shape: Math.random() > 0.5 ? 'circle' : 'rect'
      });
    }

    let animationFrame;
    const startTime = performance.now();

    function render(currentTime) {
      const elapsed = currentTime - startTime;
      ctx.clearRect(0, 0, width, height);

      let alive = false;
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // Gravedad
        p.vx *= 0.98; // Resistencia al aire
        p.rotation += p.vRot;
        p.alpha = Math.max(0, 1 - elapsed / 1200);

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;

          if (p.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          }
          ctx.restore();
        }
      });

      if (alive && elapsed < 1300) {
        animationFrame = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(animationFrame);
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
      }
    }

    requestAnimationFrame(render);
  } catch (e) {
    console.debug('Confetti feedback non-critical bypass:', e);
  }
}

// 3. COMBINADO: CELEBRACIÓN DE VICTORIA COMPLETA
export function celebrateVictory() {
  playCompletionChime();
  triggerCompletionConfetti();
}
