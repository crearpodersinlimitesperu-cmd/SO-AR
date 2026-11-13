/**
 * reelSoundtrackEngine.js
 * Motor de audio cinemático en tiempo real (Web Audio API) + Locución personalizada
 * para los Reels de Enrolamiento de CREAR Poder Sin Límites.
 */

const SCENE_NOTES = {
  // Progresión emocional Cmaj9 -> Am9 -> Fmaj7 -> G6 -> Cmaj9
  1: [130.81, 196.0, 246.94, 293.66], // C3, G3, B3, D4
  2: [110.0, 164.81, 220.0, 261.63, 329.63], // Am9
  3: [87.31, 174.61, 220.0, 261.63, 329.63], // Fmaj7
  4: [98.0, 196.0, 246.94, 293.66, 392.0], // G6 épico
  5: [130.81, 196.0, 261.63, 329.63, 392.0, 523.25] // Cmaj clímax
};

export function getSceneForTime(t) {
  if (t < 4.5) return 1;
  if (t < 9.0) return 2;
  if (t < 14.0) return 3;
  if (t < 18.5) return 4;
  return 5;
}

export class ReelSoundtrackEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.analyser = null;
    this.mediaDest = null;
    this.delayNode = null;
    this.isMuted = false;
    this.isPlaying = false;
    this.lastStepIndex = -1;
    this.lastScene = -1;
    this.dataArray = null;
  }

  ensureContext() {
    if (this.ctx) return true;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;

    this.ctx = new AudioCtx();
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.isMuted ? 0 : 0.85;

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.72;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    // Delay estéreo sutil tipo sala épica
    this.delayNode = this.ctx.createDelay(1.0);
    this.delayNode.delayTime.value = 0.28;
    const delayFeedback = this.ctx.createGain();
    delayFeedback.gain.value = 0.32;
    const delayFilter = this.ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 2200;

    this.delayNode.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(this.delayNode);
    delayFilter.connect(this.musicGain);

    this.musicGain.connect(compressor);
    compressor.connect(this.analyser);
    this.analyser.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    if (typeof this.ctx.createMediaStreamDestination === 'function') {
      this.mediaDest = this.ctx.createMediaStreamDestination();
      this.analyser.connect(this.mediaDest);
    }

    return true;
  }

  async resume() {
    if (!this.ensureContext()) return false;
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        return false;
      }
    }
    return this.ctx.state === 'running';
  }

  setMuted(muted) {
    this.isMuted = Boolean(muted);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime, 0.05);
    }
  }

  setDucking(duck) {
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(duck ? 0.34 : 0.72, this.ctx.currentTime, 0.15);
    }
  }

  setPlaying(playing) {
    this.isPlaying = Boolean(playing);
    if (!playing) {
      this.lastStepIndex = -1;
      this.lastScene = -1;
    }
  }

  getAudioStreamTrack() {
    if (!this.mediaDest) return null;
    const tracks = this.mediaDest.stream.getAudioTracks();
    return tracks[0] || null;
  }

  getEnergy() {
    if (!this.analyser || !this.dataArray || this.isMuted || !this.isPlaying) return 0;
    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i += 1) {
      sum += this.dataArray[i];
    }
    return Math.min(1, sum / (this.dataArray.length * 140));
  }

  getSpectrumBars(count = 16) {
    if (!this.analyser || !this.dataArray || this.isMuted || !this.isPlaying) {
      return new Array(count).fill(0.08);
    }
    this.analyser.getByteFrequencyData(this.dataArray);
    const bars = [];
    const step = Math.max(1, Math.floor(this.dataArray.length / count));
    for (let i = 0; i < count; i += 1) {
      const val = this.dataArray[Math.min(this.dataArray.length - 1, i * step)] || 0;
      bars.push(Math.max(0.08, Math.min(1, val / 210)));
    }
    return bars;
  }

  // Dispara pulso musical sincronizado con el tiempo `t` (0..23s)
  tick(t, style = 'epico') {
    if (!this.isPlaying || !this.ctx || this.ctx.state !== 'running') return;

    const scene = getSceneForTime(t);
    const stepDuration = style === 'emotivo' ? 0.5 : 0.375; // 120 vs 160 corcheas/min
    const stepIndex = Math.floor(t / stepDuration);

    if (scene !== this.lastScene) {
      this.lastScene = scene;
      this.triggerScenePad(scene, style);
      if (scene === 4 || scene === 5) {
        this.triggerImpactBoom(scene === 5 ? 0.48 : 0.35);
      }
    }

    if (stepIndex !== this.lastStepIndex) {
      this.lastStepIndex = stepIndex;
      const chord = SCENE_NOTES[scene] || SCENE_NOTES[1];
      const noteFreq = chord[stepIndex % chord.length];
      this.triggerArpNote(noteFreq * 2, scene >= 4 ? 0.14 : 0.10, style);

      if (scene >= 3 && stepIndex % 2 === 0) {
        this.triggerPulseKick(scene === 5 ? 0.34 : 0.22);
      }
    }
  }

  triggerScenePad(scene, style) {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const chord = SCENE_NOTES[scene] || SCENE_NOTES[1];
    const duration = scene === 3 ? 4.8 : 4.3;

    chord.slice(0, 4).forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = idx === 0 ? 'triangle' : (style === 'epico' && scene >= 4 ? 'sawtooth' : 'sine');
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.value = idx % 2 === 0 ? -5 : 5;

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(style === 'emotivo' ? 900 : 1200, now);
      filter.frequency.exponentialRampToValueAtTime(scene >= 4 ? 2400 : 1500, now + duration * 0.6);

      const peak = idx === 0 ? 0.15 : 0.065;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(peak, now + 0.65);
      gain.gain.setValueAtTime(peak * 0.85, now + duration - 0.8);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      gain.connect(this.delayNode);

      osc.start(now);
      osc.stop(now + duration + 0.05);
    });
  }

  triggerArpNote(freq, volume = 0.1, style = 'epico') {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = style === 'emotivo' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    osc.connect(gain);
    gain.connect(this.musicGain);
    gain.connect(this.delayNode);

    osc.start(now);
    osc.stop(now + 0.6);
  }

  triggerPulseKick(volume = 0.25) {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.18);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + 0.28);
  }

  triggerImpactBoom(volume = 0.42) {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.65);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + 0.95);
  }

  dispose() {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

/**
 * Construye el guion hablado personalizado por escena para locución estratégica.
 */
export function buildSceneVoiceScript(scene, { nombreImo, nombreEnrolado, ciudad }) {
  const imo = nombreImo?.trim() || 'Creador Cuántico';
  const enrolado = nombreEnrolado?.trim() || 'tu enrolado';
  const sede = ciudad?.trim() || 'tu sede';

  switch (scene) {
    case 1:
      return `${imo}, tu visión se hizo realidad. Confiaste en ${enrolado} antes de que el mundo lo viera.`;
    case 2:
      return `Este fin de semana en ${sede}, cruza su umbral más poderoso en Capítulo Dos.`;
    case 3:
      return `En los Vuelos de C2, nada reemplaza tu mirada en sala. Tú encendiste su fuego.`;
    case 4:
      return `Estás convocado a sala. Tu presencia física es el regalo más sagrado para ${enrolado}.`;
    case 5:
      return `Nos vemos en sala. Leones con Leones. Gracias, ${imo}.`;
    default:
      return '';
  }
}

export function speakSpanishLine(text, { onStart, onEnd } = {}) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices() || [];
    const esVoice = voices.find(v => /es-(PE|EC|CO|MX|419|ES)/i.test(v.lang)) || voices.find(v => /^es/i.test(v.lang));
    if (esVoice) utter.voice = esVoice;
    utter.lang = esVoice?.lang || 'es-PE';
    utter.rate = 0.96;
    utter.pitch = 0.94;
    utter.onstart = () => onStart?.();
    utter.onend = () => onEnd?.();
    utter.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utter);
  } catch {
    onEnd?.();
  }
}

export function stopSpanishSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}
