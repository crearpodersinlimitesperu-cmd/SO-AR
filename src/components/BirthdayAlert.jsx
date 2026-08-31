// src/components/BirthdayAlert.jsx
//
// Alerta de cumpleaños, montada a nivel de App (fuera de las rutas) para que
// aparezca sin importar en qué página esté el usuario al iniciar sesión.
//
// Qué hace: al cargar (una vez por sesión de navegador por día, para no repetir
// la alerta en cada cambio de página), consulta getAllCompanyUsers() y compara
// el mes/día de cada colaborador con "cumpleanos" (campo YYYY-MM-DD, ver
// UserProfileModal.jsx y scripts/importBirthdays.mjs) contra la fecha de hoy.
// Si hay coincidencias, muestra un aviso visual + un tono sonoro corto (generado
// con la Web Audio API, sin depender de ningún archivo de audio externo) con el
// nombre de cada persona, un botón para abrir su chat 1 a 1 de Google Chat
// (openOrCreateDirectMessage — requiere clic real del usuario por el popup de
// permiso OAuth, ver googleChatService.js) y un enlace mailto a su correo.
//
// HECHO vs INFERENCIA: "cumpleanos" solo existe si (a) alguien lo cargó a mano
// en el perfil desde UserProfileModal.jsx, o (b) se corrió el script de
// importación scripts/importBirthdays.mjs. Si el campo no existe para nadie
// todavía, este componente simplemente no mostrará ninguna alerta — no inventa
// fechas.

import { useEffect, useState, useCallback, useRef } from 'react';
import { Cake, X, MessageSquare, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAllCompanyUsers } from '../services/userService';
import { openOrCreateDirectMessage } from '../services/googleChatService';

const SESSION_FLAG_PREFIX = 'birthdayAlertShown_';

function todayMonthDay() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${m}-${d}`;
}

// Extrae "MM-DD" de un valor "YYYY-MM-DD" guardado en cumpleanos. Si el valor
// no tiene ese formato, se ignora (no se intenta adivinar otro formato).
function monthDayOf(cumpleanos) {
  if (!cumpleanos || typeof cumpleanos !== 'string') return null;
  const m = cumpleanos.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return m ? `${m[1]}-${m[2]}` : null;
}

// Tono corto de aviso con Web Audio API (dos notas ascendentes), para no
// depender de ningún archivo .mp3/.wav que haya que entregar aparte.
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [523.25, 659.25, 784.0]; // Do-Mi-Sol
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch (e) {
    console.warn('No se pudo reproducir el tono de cumpleaños:', e.message);
  }
}

export default function BirthdayAlert() {
  const { currentUser } = useAuth();
  const [celebrants, setCelebrants] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const [chatStatus, setChatStatus] = useState({}); // email -> 'loading'|'error'
  const checkedRef = useRef(false);

  const checkBirthdays = useCallback(async () => {
    if (!currentUser?.email) return;

    const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const flagKey = `${SESSION_FLAG_PREFIX}${currentUser.email.toLowerCase()}_${todayKey}`;
    let alreadyShownToday = false;
    try {
      alreadyShownToday = sessionStorage.getItem(flagKey) === '1';
    } catch (e) {
      // sessionStorage no disponible (modo incógnito restringido, etc.) — se
      // seguirá mostrando en cada carga, lo cual es un fallback aceptable.
    }

    try {
      const allUsers = await getAllCompanyUsers();
      const todayMD = todayMonthDay();
      const matches = allUsers.filter(u => monthDayOf(u.cumpleanos) === todayMD);

      if (matches.length > 0) {
        setCelebrants(matches);
        if (!alreadyShownToday) {
          playChime();
          try { sessionStorage.setItem(flagKey, '1'); } catch (e) { /* no-op */ }
        } else {
          // Ya se avisó hoy en esta sesión: se deja disponible el detalle pero
          // sin volver a sonar ni forzar el panel abierto de nuevo.
          setDismissed(true);
        }
      }
    } catch (error) {
      console.error('Error verificando cumpleaños del día:', error);
    }
  }, [currentUser?.email]);

  useEffect(() => {
    if (!currentUser?.email || checkedRef.current) return;
    checkedRef.current = true;
    checkBirthdays();
  }, [currentUser?.email, checkBirthdays]);

  const handleOpenChat = async (email) => {
    setChatStatus(prev => ({ ...prev, [email]: 'loading' }));
    const result = await openOrCreateDirectMessage(email);
    if (result.success) {
      window.open(result.spaceUri, '_blank', 'noopener,noreferrer');
      setChatStatus(prev => ({ ...prev, [email]: null }));
    } else {
      setChatStatus(prev => ({ ...prev, [email]: 'error' }));
    }
  };

  if (celebrants.length === 0 || dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 10000,
        maxWidth: '360px',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2010 100%)',
        border: '1px solid var(--crear-gold, #d4af37)',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        padding: '1rem 1.1rem',
        color: '#fff',
        fontFamily: 'var(--font-body, inherit)'
      }}
      role="alert"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--crear-gold, #d4af37)' }}>
          <Cake size={18} />
          <span>{celebrants.length === 1 ? '¡Hoy es su cumpleaños!' : '¡Hoy hay cumpleaños!'}</span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer' }}
          title="Cerrar"
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {celebrants.map((p) => (
          <div
            key={p.email || p.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              padding: '0.5rem 0.6rem',
              borderRadius: '8px',
              background: 'rgba(212, 175, 55, 0.08)',
              border: '1px solid rgba(212, 175, 55, 0.25)'
            }}
          >
            <strong style={{ fontSize: '0.95rem' }}>🎉 {p.name || p.nombre || p.email}</strong>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {p.email && (
                <button
                  onClick={() => handleOpenChat(p.email)}
                  disabled={chatStatus[p.email] === 'loading'}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    fontSize: '0.78rem', padding: '3px 8px', borderRadius: '6px',
                    border: '1px solid #4285F4', background: 'rgba(66,133,244,0.15)',
                    color: '#8ab4ff', cursor: 'pointer'
                  }}
                  title="Abrir chat 1 a 1 en Google Chat"
                >
                  <MessageSquare size={13} />
                  {chatStatus[p.email] === 'loading' ? 'Abriendo...' : 'Chat'}
                </button>
              )}
              {p.email && (
                <a
                  href={`mailto:${p.email}?subject=${encodeURIComponent('¡Feliz cumpleaños!')}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    fontSize: '0.78rem', padding: '3px 8px', borderRadius: '6px',
                    border: '1px solid #25D366', background: 'rgba(37,211,102,0.12)',
                    color: '#7fe0a8', textDecoration: 'none'
                  }}
                  title={p.email}
                >
                  <Mail size={13} />
                  Correo
                </a>
              )}
            </div>
            {chatStatus[p.email] === 'error' && (
              <span style={{ fontSize: '0.72rem', color: '#f87171' }}>
                No se pudo abrir Google Chat (usa el botón de Correo).
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
