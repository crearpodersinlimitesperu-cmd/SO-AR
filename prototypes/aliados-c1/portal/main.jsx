import React, { useEffect, useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  RotateCcw,
  ShieldCheck,
  LogOut,
  Users,
  FileSpreadsheet,
  Lock,
  CheckCircle2,
  Plus,
  ShieldAlert,
  Clock,
  Activity,
  PhoneCall,
  Calendar,
  AlertTriangle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { getPortalFirebase, isAdminEmail } from './firebase.js';
import { OFFICIAL_SEDES, VIGENTES_TEAMS_C1, evaluateAccessValidity } from './vigenciaConfig.js';
import crearLogo from '../logo-crear.png';
import '../style.css';
import './portal.css';

const ADMIN_CONTROL_TOKEN = 'CAUSA_OS_SUPERADMIN_C1_2026';

if (typeof document !== 'undefined' && crearLogo) {
  ['icon', 'shortcut icon', 'apple-touch-icon'].forEach(rel => {
    let link = document.querySelector(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      document.head.appendChild(link);
    }
    link.type = 'image/png';
    link.href = '/logo-crear.png';
  });
}

function detectDeviceLabel() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const platform = typeof navigator !== 'undefined' ? navigator.platform || '' : '';
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
  let browser = 'Navegador';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  return `${isMobile ? 'Móvil' : 'Escritorio'} · ${browser} (${platform || 'SO'})`;
}

async function logSecurityOrSessionEvent(db, user, surveyData, action, details = '') {
  const isAlert = action.includes('BLOQUEADO') || action.includes('INTENTO') || action.includes('CAPTURA') || action.includes('IMPRESION') || action.includes('COPIA');
  const emailLower = user?.email ? String(user.email).trim().toLowerCase() : 'visitante_anonimo@portal.aliados';
  const uid = user?.uid || ('anon_' + Math.random().toString(36).slice(2, 10));
  const device = detectDeviceLabel();
  const nowIso = new Date().toISOString();

  try {
    if (user?.uid) {
      await setDoc(doc(db, 'aliados_sesiones', user.uid), {
        uid: user.uid,
        email: emailLower,
        capitulo: 'C1',
        nombre: surveyData?.nombre || user.displayName || '',
        telefono: surveyData?.telefono || '',
        sede: surveyData?.sede || '',
        equipo: surveyData?.equipo || '',
        partner: surveyData?.partner || '',
        device,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        lastAction: action,
        lastDetails: details,
        lastSeenAt: serverTimestamp(),
        lastSeenIso: nowIso,
        ...(isAlert ? { securityAlertsCount: increment(1), lastAlertAt: serverTimestamp(), lastAlertIso: nowIso } : {}),
        ...(action === 'LOGIN' ? { lastLoginAt: serverTimestamp(), lastLoginIso: nowIso, loginCount: increment(1) } : {}),
      }, { merge: true });
    }

    await addDoc(collection(db, 'aliados_conexiones_log'), {
      uid,
      email: emailLower,
      capitulo: 'C1',
      nombre: surveyData?.nombre || user?.displayName || (user?.uid ? 'Aliado C1' : 'Visitante'),
      sede: surveyData?.sede || '',
      equipo: surveyData?.equipo || '',
      action,
      details,
      device,
      createdAt: serverTimestamp(),
      createdAtIso: nowIso,
      timestampIso: nowIso,
      adminControlToken: ADMIN_CONTROL_TOKEN,
    });
  } catch (err) {
    console.warn('Registro silencioso de seguridad C1:', err);
  }
}

export const innegociablesC1 = [
  {
    id: 'partner',
    title: 'Término Oficial y Significado de Partner',
    desc: 'El término Partner reemplaza oficialmente la denominación anterior de "sombra". Para el Aliado de C1, un Partner es la persona asignada o rol de apoyo en el entrenamiento; es el socio de proceso con quien construyes presencia, sostienes la escucha limpia y mantienes la corresponsabilidad. Eres su espejo y el espacio de apoyo incondicional durante todo el fin de semana.',
  },
  {
    id: 'programa_resultados',
    title: 'Programa de Resultados y Creación',
    desc: 'No somos un curso, evento, show motivacional ni grupo de sanación. Somos un Programa de Resultados donde el foco exclusivo es la creación de evidencias reales en la vida diaria.',
  },
  {
    id: 'enrolamiento_asertivo',
    title: 'Enrolamiento Asertivo: Sí en Acción',
    desc: 'Inspiramos a otro ser humano a ver posibilidades y tomar postura inmediata a través del "Sí en Acción".',
  },
  {
    id: 'principio_relacion',
    title: 'Principio de Relación (Viernes, Sábado y Domingo)',
    desc: 'Viernes y sábado se crea la relación con el participante; el domingo se realiza el llamado contundente a la acción.',
  },
  {
    id: 'acompanamiento_alto_nivel',
    title: 'Acompañamiento de Alto Nivel',
    desc: 'Tratamos al participante como un adulto 100% capaz y responsable de tomar sus decisiones y crear sus resultados.',
  },
  {
    id: 'presentacion_viernes',
    title: 'Presentación Poderosa del Viernes',
    desc: 'Ensayarás y perfeccionarás la presentación personal enérgica y estructurada con la que te dirigirás a tu grupo de Creación el viernes de C1, en el momento preciso en que los participantes te eligen como su Partner.',
  },
  {
    id: 'cambio_cupo',
    title: 'Misión de Cambio de Cupo / Nombre y Enrolamiento Directo',
    desc: 'Todos los Aliados cuentan con la posibilidad activa y la misión de gestionar cambios de cupo o sustitución de nombres para aquellas personas que ellos mismos enrolaron pero que aún no se han sentado o decidieron no asistir a este C1. Este mecanismo es una gran oportunidad para reabrir la conversación, mover la energía e inspirar intensamente a esas personas para que sí ocupen su lugar y se sienten a vivir el salón donde estás sirviendo.',
  },
  {
    id: 'corresponsabilidad',
    title: 'Regla de Corresponsabilidad',
    desc: 'Eres la primera y la última persona del día para tu Partner. Su presencia y permanencia en la sala dependen directamente de tu compromiso y seguimiento.',
  },
  {
    id: 'creacion_contexto',
    title: 'Creación del Contexto',
    desc: 'El Aliado es responsable de crear activamente el contexto para entrenarse en todo lo que está disponible antes, durante y después del C1, aprovechando cada herramienta, reto y espacio de aprendizaje.',
  },
];

export const preparationMissionsC1 = [
  { id: 'proposito', title: '1. Declaración del Propósito (4 Meses)', desc: 'Publicar en el chat del grupo la declaración viva e irrazonable sobre qué acción específica tomada hoy altera positivamente tus próximos 4 meses.' },
  { id: 'video_enrolamiento', title: '2. Video de Enrolamiento (15 Segundos)', desc: 'Grabar y subir al chat de aliados un video de 15 segundos enfocado en el para qué de tu participación.' },
  { id: 'cambio_cupo', title: '3. Misión de Cambio de Cupo / Sustitución de Nombre', desc: 'Gestionar activamente sustitución de nombres de personas enroladas que no asistirán, reabriendo la conversación para que sí ocupen su lugar en sala.' },
  { id: 'tecnica', title: '4. Verificación Técnica Previa (Grounding Virtual 20:00 hrs)', desc: 'Cámara encendida, audio, internet estable e iluminación óptima sin distracciones.' },
  { id: 'roleplay_presencial', title: '5. Demostración Presencial de Roleplay (Jueves 18:00 hrs)', desc: 'Ejecutar en vivo tu presentación en sede ante todo el equipo con postura impecable.' }
];

export const roleplaysC1 = [
  {
    id: 'el_si_accion',
    title: '1. El SÍ en Acción (Cierre con Evidencia)',
    situacion: 'El participante declara que sí desea continuar a C2 pero no toma acción inmediata ni abona su ticket.',
    quiebre: 'No aceptamos acuerdos fantasiosos ni tibieza. El "Sí" se valida exclusivamente con evidencia material.',
    pregunta: '«Si estás en un rotundo Sí, ¿qué conversación interna te detiene de plasmar tu firma y tu abono ahora mismo?»',
    formula: 'Confirmación de Postura + Validación con Hechos + Cierre sin postergación.',
    cierre: 'Cerramos esto aquí y ahora. Firmas tu registro en este instante o te haces cargo abiertamente de tu decisión.'
  },
  {
    id: 'el_no_rotundo',
    title: '2. El NO Rotundo y Limpio (Corte de Justificaciones)',
    situacion: 'El participante da explicaciones circulares y excusas largas para no comprometerse.',
    quiebre: 'Un No claro y responsable es infinitamente más poderoso que un Sí tibio o una mentira educada.',
    pregunta: '«¿Prefieres seguir sosteniendo una historia de circunstancias, o tienes la valentía de decirme No sin esconderte detrás del dinero o el tiempo?»',
    formula: 'Respeto al Adulto 100% Responsable + Silencio Operativo + Cierre limpio.',
    cierre: 'Acepto tu No. Te miras al espejo y te adueñas de tu resultado sin víctimas.'
  },
  {
    id: 'el_no_se_indecision',
    title: '3. El NO SÉ (La Mentira de la Indecisión)',
    situacion: 'El participante dice «No sé qué hacer», «déjame pensarlo», «tengo que consultar con la almohada».',
    quiebre: 'El "No sé" es una mentira conveniente para no tomar postura. Sé sincero: ¿qué información mágica vas a encontrar el domingo que no tengas hoy aquí parado conmigo?',
    pregunta: '«¿Desde cuándo postergar tus decisiones más importantes te ha dado la vida que sueñas?»',
    formula: 'Desarme de la fantasía + Interrupción en menos de 90 segundos + Desafío a la acción.',
    cierre: 'O eliges apostar por ti en este instante, o eliges quedarte donde estás. Tú decides en este segundo.'
  },
  {
    id: 'objecion_dinero',
    title: '4. Objeción de Dinero / Liquidez',
    situacion: '«No tengo plata», «el curso está caro», «mis finanzas no me dan».',
    quiebre: 'El dinero nunca es el quiebre real; es la coartada perfecta para no comprometerse con la propia grandeza.',
    pregunta: '«Si quitamos la plata de la mesa por un minuto, ¿cuál es la razón real por la que prefieres no comprometerte hoy?»',
    formula: 'Aislamiento de la objeción + Exigencia de verdad + Compromiso de creación.',
    cierre: 'El dinero se crea cuando la decisión ya está tomada. ¿Cuál es tu postura?'
  }
];

export function SurveyGateC1({ user, existingSurvey, onCompleted, onLogout }) {
  const initialSede = (existingSurvey?.sede && OFFICIAL_SEDES.includes(existingSurvey.sede)) ? existingSurvey.sede : 'Lima';
  const availableTeams = VIGENTES_TEAMS_C1[initialSede] || [];
  const initialEquipo = (existingSurvey?.equipo && availableTeams.some(t => t.id === existingSurvey.equipo || t.code === existingSurvey.equipo))
    ? existingSurvey.equipo
    : (availableTeams[0]?.id || 'C1E33');

  const [nombre, setNombre] = useState(existingSurvey?.nombre || user?.displayName || '');
  const [telefono, setTelefono] = useState(existingSurvey?.telefono || '');
  const [sede, setSede] = useState(initialSede);
  const [equipo, setEquipo] = useState(initialEquipo);
  const [partner, setPartner] = useState(existingSurvey?.partner || '');
  const [compromiso, setCompromiso] = useState(existingSurvey?.compromiso ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  function handleSedeChange(newSede) {
    setSede(newSede);
    const teams = VIGENTES_TEAMS_C1[newSede] || [];
    setEquipo(teams[0]?.id || '');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');

    // Validaciones estrictas de campos obligatorios
    if (!nombre || nombre.trim().length < 3) {
      setErrorMsg('El Nombre Completo es obligatorio (debe contener al menos 3 caracteres).');
      return;
    }
    if (!telefono || telefono.trim().length < 7) {
      setErrorMsg('El WhatsApp / Teléfono es obligatorio (mínimo 7 dígitos con código de país).');
      return;
    }
    if (!sede || !OFFICIAL_SEDES.includes(sede)) {
      setErrorMsg('Debes seleccionar una Sede Oficial válida.');
      return;
    }
    if (!equipo) {
      setErrorMsg('Debes seleccionar un Equipo Vigente.');
      return;
    }
    if (!partner || partner.trim().length < 3) {
      setErrorMsg('El nombre de tu Partner asignado en C1 es obligatorio (mínimo 3 caracteres).');
      return;
    }
    if (!compromiso) {
      setErrorMsg('Debes confirmar el acuerdo de confidencialidad y compromiso para continuar.');
      return;
    }

    setSubmitting(true);
    try {
      const { db } = getPortalFirebase();
      const emailLower = String(user.email || '').trim().toLowerCase();
      const surveyData = {
        uid: user.uid,
        email: emailLower,
        capitulo: 'C1',
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        sede: sede.trim(),
        equipo: equipo.trim(),
        partner: partner.trim(),
        compromiso: Boolean(compromiso),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'encuestas_aliados', user.uid), surveyData, { merge: true });
      await setDoc(doc(db, 'aliados_autorizados', emailLower), {
        email: emailLower,
        uid: user.uid,
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        sede: sede.trim(),
        equipo: equipo.trim(),
        partner: partner.trim(),
        enabled: true,
        capitulo: 'C1',
        source: 'encuesta_c1_web',
        updatedAt: serverTimestamp(),
      }, { merge: true });

      await logSecurityOrSessionEvent(db, user, surveyData, 'ENCUESTA_COMPLETADA_C1', `Sede ${sede.trim()} · Equipo ${equipo.trim()}`);
      onCompleted(surveyData);
    } catch (err) {
      setErrorMsg(`Error al guardar tu encuesta: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const currentTeams = VIGENTES_TEAMS_C1[sede] || [];

  return (
    <div className="portal-auth-wrap">
      <div className="portal-card">
        <div className="portal-card-header">
          <div>
            <span className="portal-badge">Capítulo Uno (C1) · Registro Oficial de Aliado</span>
            <h2>Encuesta Inicial y Acuerdo de Confidencialidad</h2>
            <p>
              Bienvenido, <strong>{user.email}</strong>. Para acceder a la Guía Práctica Operativa de C1, completa tus datos oficiales y confirma tu postura de confidencialidad. Todos los campos son obligatorios.
            </p>
          </div>
          <button type="button" onClick={onLogout} className="portal-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>

        {errorMsg && <div className="portal-alert-error" role="alert">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="portal-form">
          <div className="portal-grid-2">
            <label>
              <span>Nombre Completo *</span>
              <input
                type="text"
                required
                maxLength={160}
                placeholder="Tu nombre y apellido"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
              />
            </label>
            <label>
              <span>WhatsApp / Teléfono *</span>
              <input
                type="tel"
                required
                maxLength={40}
                placeholder="+51 999 999 999"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
              />
            </label>
          </div>

          <div className="portal-grid-2">
            <label>
              <span>Sede Oficial *</span>
              <select
                required
                value={sede}
                onChange={e => handleSedeChange(e.target.value)}
              >
                {OFFICIAL_SEDES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>
              <span>Equipo Vigente Oficial *</span>
              <select
                required
                value={equipo}
                onChange={e => setEquipo(e.target.value)}
              >
                {currentTeams.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '0.65rem 0.85rem', marginBottom: '0.5rem' }}>
            <small style={{ color: '#0369a1', fontSize: '0.82rem', display: 'block', fontWeight: 600 }}>
              {sede === 'Lima'
                ? '⚡ Regla Oficial: En Lima únicamente está habilitado el registro para C1E33 (27 al 29 de Noviembre 2026). Las generaciones anteriores ya concluyeron su ciclo.'
                : `⚡ Equipos oficiales vigentes programados para la sede de ${sede}.`}
            </small>
          </div>

          <label>
            <span>Nombre de tu Partner asignado en C1 *</span>
            <input
              type="text"
              required
              maxLength={160}
              placeholder="Nombre completo de tu Partner en C1"
              value={partner}
              onChange={e => setPartner(e.target.value)}
            />
          </label>

          <label className="portal-checkbox-row">
            <input type="checkbox" checked={compromiso} onChange={e => setCompromiso(e.target.checked)} required />
            <span>
              <strong>Acuerdo de propiedad intelectual y confidencialidad C1:</strong> Confirmo que soy Aliado acreditado de Capítulo Uno (C1), que usaré esta guía únicamente para consulta y preparación personal, y me comprometo a no copiar, imprimir, capturar pantalla ni difundir este material confidencial de Crear Poder Sin Límites.
            </span>
          </label>

          <div className="portal-form-actions">
            <button type="submit" className="primary-link portal-submit" disabled={submitting}>
              <CheckCircle2 size={18} />
              <span>{submitting ? 'Guardando y validando acceso...' : 'Guardar encuesta y entrar a la Guía C1'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AuthBoxC1({ onError, errorMsg }) {
  const [authMode, setAuthMode] = useState('login');
  const [emailInput, setEmailInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setLoading(true);
    onError('');
    try {
      const { auth, GoogleAuthProvider, signInWithPopup } = getPortalFirebase();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err) {
      onError(err.message || 'Error al autenticar con Google');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailAuth(e) {
    e.preventDefault();
    setLoading(true);
    onError('');
    try {
      const { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = getPortalFirebase();
      const cleanEmail = emailInput.trim().toLowerCase();
      if (authMode === 'register') {
        await createUserWithEmailAndPassword(auth, cleanEmail, passInput);
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, passInput);
      }
    } catch (err) {
      onError(err.message || 'Error de credenciales');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="portal-auth-wrap">
      <div className="portal-card">
        <span className="portal-badge">Acceso Protegido · Aliados C1</span>
        <h2>Ingreso a la Guía Práctica Operativa de C1</h2>
        <p>Inicia sesión con tu cuenta oficial de Aliado de Crear Poder Sin Límites para acceder al material.</p>

        {errorMsg && <div className="portal-alert-error" role="alert">{errorMsg}</div>}

        <button type="button" onClick={handleGoogleLogin} className="google-auth-button" disabled={loading} style={{ width: '100%', marginBottom: '18px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Continuar con Google
        </button>

        <div style={{ textAlign: 'center', color: '#94a3b8', margin: '14px 0', fontSize: '13px' }}>— O con correo y contraseña —</div>

        <form onSubmit={handleEmailAuth} className="portal-form">
          <label>
            <span>Correo Electrónico</span>
            <input type="email" required placeholder="tu.correo@crearpsl.com" value={emailInput} onChange={e => setEmailInput(e.target.value)} />
          </label>
          <label>
            <span>Contraseña</span>
            <input type="password" required minLength={6} placeholder="••••••••" value={passInput} onChange={e => setPassInput(e.target.value)} />
          </label>

          <div className="portal-form-actions">
            <button type="submit" className="primary-link portal-submit" disabled={loading}>
              <Lock size={16} />
              <span>{loading ? 'Verificando...' : authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}</span>
            </button>
            <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="portal-btn-secondary">
              {authMode === 'login' ? '¿Primera vez? Crear cuenta' : '¿Ya tienes cuenta? Iniciar sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AliadosC1PortalApp() {
  const [user, setUser] = useState(null);
  const [survey, setSurvey] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isDenied, setIsDenied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [screenShielded, setScreenShielded] = useState(false);
  const [securityWarning, setSecurityWarning] = useState('');
  const [completedMissions, setCompletedMissions] = useState([]);

  // Escudo de seguridad (Anti-print, Anti-screenshot, Anti-copy)
  useEffect(() => {
    const { db } = getPortalFirebase();

    const triggerProtectionWarning = (reason, code) => {
      setSecurityWarning(reason);
      setScreenShielded(true);
      logSecurityOrSessionEvent(db, user, survey, code, reason);
      setTimeout(() => setScreenShielded(false), 3500);
    };

    const onKeyDown = e => {
      const key = (e.key || '').toLowerCase();
      const isPrint = (e.ctrlKey || e.metaKey) && key === 'p';
      const isSave = (e.ctrlKey || e.metaKey) && key === 's';
      const isCopy = (e.ctrlKey || e.metaKey) && (key === 'c' || key === 'u');
      const isPrintScreen = e.key === 'PrintScreen' || e.keyCode === 44;
      const isMacShot = e.metaKey && e.shiftKey && ['3', '4', '5'].includes(key);
      const isWinSnip = e.metaKey && e.shiftKey && key === 's';

      if (isPrint || isSave) {
        e.preventDefault();
        e.stopPropagation();
        triggerProtectionWarning('La impresión y descarga de esta guía están deshabilitadas por protección de propiedad intelectual.', 'INTENTO_IMPRESION_BLOQUEADO');
      } else if (isPrintScreen || isMacShot || isWinSnip) {
        e.preventDefault();
        e.stopPropagation();
        triggerProtectionWarning('Las capturas de pantalla están prohibidas. Este intento ha quedado registrado con tu correo.', 'INTENTO_CAPTURA_BLOQUEADO');
      } else if (isCopy && e.target?.tagName !== 'INPUT' && e.target?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        triggerProtectionWarning('La copia y duplicación del texto de la guía están deshabilitadas.', 'INTENTO_COPIA_BLOQUEADO');
      }
    };

    const onKeyUp = e => {
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText('Documento confidencial protegido — Crear Poder Sin Límites').catch(() => {});
        }
        triggerProtectionWarning('Las capturas de pantalla están prohibidas. Este evento ha sido registrado.', 'INTENTO_CAPTURA_BLOQUEADO');
      }
    };

    const onCopyOrCut = e => {
      if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return;
      e.preventDefault();
      triggerProtectionWarning('No está permitido copiar ni duplicar el contenido de la guía.', 'INTENTO_COPIA_BLOQUEADO');
    };

    const onContextMenu = e => {
      if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return;
      e.preventDefault();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setScreenShielded(true);
      } else {
        setTimeout(() => setScreenShielded(false), 300);
      }
    };

    window.print = () => {
      triggerProtectionWarning('La función de imprimir está deshabilitada para proteger el material.', 'INTENTO_IMPRESION_BLOQUEADO');
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    document.addEventListener('copy', onCopyOrCut, true);
    document.addEventListener('cut', onCopyOrCut, true);
    document.addEventListener('contextmenu', onContextMenu, true);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      document.removeEventListener('copy', onCopyOrCut, true);
      document.removeEventListener('cut', onCopyOrCut, true);
      document.removeEventListener('contextmenu', onContextMenu, true);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user, survey]);

  // Auth listener & Firestore sync
  useEffect(() => {
    const { auth, db, onAuthStateChanged } = getPortalFirebase();
    const unsub = onAuthStateChanged(auth, async currentUser => {
      setUser(currentUser);
      if (!currentUser) {
        setSurvey(null);
        setIsDenied(false);
        setCheckingAuth(false);
        return;
      }

      const emailLower = String(currentUser.email || '').trim().toLowerCase();

      // Verificar lista blanca de autorización
      try {
        const authDoc = await getDoc(doc(db, 'aliados_autorizados', emailLower));
        if (authDoc.exists() && authDoc.data().enabled === false) {
          setIsDenied(true);
          setCheckingAuth(false);
          logSecurityOrSessionEvent(db, currentUser, null, 'ACCESO_DENEGADO_BLOQUEADO', 'Intento de ingreso por cuenta denegada');
          return;
        }

        const surveyDoc = await getDoc(doc(db, 'encuestas_aliados', currentUser.uid));
        if (surveyDoc.exists()) {
          const sData = surveyDoc.data();
          setSurvey(sData);
          logSecurityOrSessionEvent(db, currentUser, sData, 'LOGIN', `Dispositivo ${detectDeviceLabel()}`);
        }

        // Cargar progreso del checklist
        const recordDoc = await getDoc(doc(db, 'records', currentUser.uid));
        if (recordDoc.exists() && Array.isArray(recordDoc.data().completed)) {
          setCompletedMissions(recordDoc.data().completed);
        }
      } catch (err) {
        console.warn('Error verificando usuario C1:', err);
      } finally {
        setCheckingAuth(false);
      }
    });

    return () => unsub();
  }, []);

  async function handleToggleMission(missionId) {
    if (!user) return;
    const { db } = getPortalFirebase();
    const nextCompleted = completedMissions.includes(missionId)
      ? completedMissions.filter(id => id !== missionId)
      : [...completedMissions, missionId];

    setCompletedMissions(nextCompleted);

    try {
      await setDoc(doc(db, 'records', user.uid), {
        uid: user.uid,
        email: user.email,
        capitulo: 'C1',
        completed: nextCompleted,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      logSecurityOrSessionEvent(
        db,
        user,
        survey,
        completedMissions.includes(missionId) ? 'UNCHECK_MISION_C1' : 'CHECK_MISION_C1',
        `Misión: ${missionId} (${nextCompleted.length}/${preparationMissionsC1.length})`
      );
    } catch (err) {
      console.warn('Error guardando checklist C1:', err);
    }
  }

  async function handleLogout() {
    const { auth } = getPortalFirebase();
    await auth.signOut();
  }

  if (checkingAuth) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0a0f1d', color: '#38bdf8' }}>
        <div style={{ textAlign: 'center' }}>
          <ShieldCheck size={48} className="spin-slow" />
          <p style={{ marginTop: '1rem', fontWeight: 700 }}>Validando credenciales y escudo de seguridad C1...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <header className="brand-bar">
          <div className="brand">
            <img src={crearLogo} alt="CREAR Poder Sin Límites" />
            <span>CREAR · PODER SIN LÍMITES</span>
          </div>
          <span className="guide-label">Programa de Resultados · Guía Aliados C1</span>
        </header>
        <AuthBoxC1 onError={setErrorMsg} errorMsg={errorMsg} />
      </>
    );
  }

  if (isDenied) {
    return (
      <div className="portal-auth-wrap" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="portal-card" style={{ borderTop: '4px solid #ef4444' }}>
          <ShieldAlert size={56} color="#ef4444" style={{ margin: '0 auto 1.5rem' }} />
          <h2 style={{ color: '#ef4444' }}>Acceso Temporalmente Restringido</h2>
          <p>
            Tu correo <strong>{user.email}</strong> no cuenta con autorización activa para ingresar a la Guía de Aliados de Capítulo Uno.
            Si consideras que esto es un error, contacta a la Dirección de tu Sede o al Administrador en Causa OS.
          </p>
          <button type="button" onClick={handleLogout} className="portal-btn-secondary">
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <>
        <header className="brand-bar">
          <div className="brand">
            <img src={crearLogo} alt="CREAR Poder Sin Límites" />
            <span>CREAR · PODER SIN LÍMITES</span>
          </div>
          <span className="guide-label">Programa de Resultados · Guía Aliados C1</span>
        </header>
        <SurveyGateC1 user={user} existingSurvey={survey} onCompleted={setSurvey} onLogout={handleLogout} />
      </>
    );
  }

  const accessValidity = evaluateAccessValidity(survey, 'C1');
  const userIsAdmin = isAdminEmail(user?.email);

  if (!userIsAdmin && accessValidity.isExpired) {
    return (
      <>
        <header className="brand-bar">
          <div className="brand">
            <img src={crearLogo} alt="CREAR Poder Sin Límites" />
            <span>CREAR · PODER SIN LÍMITES</span>
          </div>
          <span className="guide-label">Programa de Resultados · Guía Aliados C1</span>
        </header>
        <div className="portal-auth-wrap" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div className="portal-card" style={{ borderTop: '4px solid #f59e0b', maxWidth: '640px' }}>
            <div style={{ display: 'inline-flex', padding: '16px', background: '#fef3c7', borderRadius: '50%', marginBottom: '1.25rem' }}>
              <Clock size={48} color="#d97706" />
            </div>
            <div>
              <span className="portal-badge" style={{ background: '#fef3c7', color: '#92400e', marginBottom: '0.75rem', display: 'inline-block' }}>
                Entrenamiento Concluido · Retiro Automático
              </span>
            </div>
            <h2 style={{ color: '#0f172a', fontSize: '1.45rem', marginBottom: '0.75rem' }}>
              Ciclo Operativo Finalizado
            </h2>
            <p style={{ color: '#475569', fontSize: '0.96rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
              Hola, <strong>{survey.nombre || user.displayName || user.email}</strong>. Tu servicio como Aliado en <strong>{accessValidity.equipoLabel || survey.equipo}</strong> ({survey.sede}) culminó su ciclo oficial de entrenamiento.
            </p>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', lineHeight: '1.55' }}>
                🔒 <strong>Políticas de Confidencialidad y Retiro Automático:</strong> El acceso a los manuales, roleplays y checklists de Capítulo Uno se cierra de manera automática al concluir el fin de semana del entrenamiento. Agradecemos tu entrega y liderazgo impecable durante este ciclo.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleLogout}
                className="portal-btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <LogOut size={16} /> Cerrar Sesión
              </button>
              <button
                type="button"
                onClick={() => setSurvey(null)}
                className="primary-link"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.65rem 1.25rem' }}
              >
                Registrarme para Siguiente Generación (C1E33)
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const completedCount = completedMissions.length;
  const progressPercent = Math.round((completedCount / preparationMissionsC1.length) * 100);

  return (
    <div style={{ position: 'relative' }}>
      {/* Marca de agua flotante de seguridad */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 9999,
          opacity: 0.045,
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'space-around',
          justifyContent: 'space-around',
          userSelect: 'none',
          fontSize: '15px',
          fontWeight: 900,
          color: '#ffffff',
          transform: 'rotate(-25deg) scale(1.15)',
        }}
      >
        {Array.from({ length: 30 }).map((_, i) => (
          <span key={i} style={{ margin: '30px 40px' }}>
            {user.email} · CONFIDENCIAL C1 · CREAR PSL
          </span>
        ))}
      </div>

      {/* Escudo visual de seguridad anti-captura */}
      {screenShielded && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#030712',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            color: '#f8fafc',
          }}
        >
          <ShieldAlert size={64} color="#f59e0b" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ color: '#fbbf24', fontSize: '1.75rem', margin: '0 0 1rem' }}>Material Oficial Confidencial Protegido</h2>
          <p style={{ maxWidth: '600px', fontSize: '1rem', color: '#94a3b8', lineHeight: 1.6 }}>
            {securityWarning || 'Las capturas de pantalla, impresiones y copias están deshabilitadas por las políticas de propiedad intelectual de Crear Poder Sin Límites.'}
          </p>
          <span style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
            Evento registrado en el Centro de Mando · Sesión activa: {user.email}
          </span>
        </div>
      )}

      {/* Barra de Marca y Sesión */}
      <header className="brand-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src={crearLogo} alt="CREAR Poder Sin Límites" style={{ height: '70px' }} />
          <div>
            <div style={{ fontWeight: 900, letterSpacing: '0.05em', color: '#122c48' }}>CREAR PODER SIN LÍMITES</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Guía Práctica Operativa: Aliado de Capítulo Uno (C1)</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right', fontSize: '0.82rem' }}>
            <div style={{ fontWeight: 800, color: 'var(--blue)' }}>{survey.nombre || user.email}</div>
            <div style={{ color: 'var(--muted)' }}>{survey.sede} · {survey.equipo}</div>
          </div>
          <button type="button" onClick={handleLogout} className="portal-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={16} /> Salir
          </button>
        </div>
      </header>

      {/* Portada Ejecutiva */}
      <div className="opening" style={{ background: 'linear-gradient(135deg, #0b1120 0%, #1e293b 100%)', color: '#fff', padding: '3.5rem 4vw' }}>
        <div style={{ maxWidth: '1000px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '999px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontSize: '0.8rem', fontWeight: 800, marginBottom: '1rem' }}>
            <ShieldCheck size={16} /> PORTAL OFICIAL DE ENTRENAMIENTO · C1
          </div>
          <h1 style={{ fontSize: 'clamp(2.2rem, 4vw, 3.8rem)', fontWeight: 900, lineHeight: 1.1, margin: '0 0 1rem' }}>
            Guía Práctica Operativa: <br />
            <span style={{ color: '#fbbf24' }}>Aliado de Capítulo Uno (C1)</span>
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#cbd5e1', lineHeight: 1.6, maxWidth: '850px', margin: 0 }}>
            Marco de postura, innegociables, cronograma operativo fin de semana, tácticas quirúrgicas de quiebre y herramientas de acompañamiento para Aliados en el Programa de Resultados.
          </p>

          {/* Barra de Progreso de Misiones C1 */}
          <div style={{ marginTop: '2rem', padding: '1.25rem', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', maxWidth: '650px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fbbf24' }}>
                ✅ Misiones de Preparación C1: {completedCount} de {preparationMissionsC1.length} Completadas
              </span>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: progressPercent === 100 ? '#4ade80' : '#38bdf8' }}>
                {progressPercent}%
              </span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: progressPercent === 100 ? '#22c55e' : 'linear-gradient(90deg, #38bdf8, #fbbf24)', transition: 'width 0.4s ease' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="page-shell" style={{ padding: '2.5rem 4vw 4rem' }}>
        <aside className="wayfinding">
          <h3 className="nav-title">Navegación C1</h3>
          <nav className="secondary-nav" style={{ marginTop: 0 }}>
            <a href="#misiones"><span>1. Misiones de Preparación</span> <strong>({completedCount}/5)</strong></a>
            <a href="#postura"><span>2. Marco de Postura</span></a>
            <a href="#cronograma"><span>3. Cronograma C1</span></a>
            <a href="#puente"><span>4. El Puente & Llamadas</span></a>
            <a href="#roleplays"><span>5. Tácticas de Quiebre</span></a>
            <a href="#legal"><span>6. Confidencialidad</span></a>
          </nav>
        </aside>

        <main>
          {/* SECCIÓN 1: Checklist de Misiones C1 */}
          <section id="misiones" className="checklist-card" style={{ marginBottom: '3rem', padding: '2rem', background: '#fff', border: '1px solid var(--line)', borderTop: '4px solid #38bdf8', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--blue)' }}>Misiones Innegociables de Groundings C1</h2>
                <p style={{ margin: '0.3rem 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
                  Tu avance se sincroniza en tiempo real con el Centro de Mando de Causa OS.
                </p>
              </div>
              <span style={{ padding: '0.4rem 0.8rem', background: '#e0f2fe', color: '#0369a1', fontWeight: 800, borderRadius: '4px', fontSize: '0.85rem' }}>
                {completedCount} / {preparationMissionsC1.length} LISTAS
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {preparationMissionsC1.map(m => {
                const isDone = completedMissions.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => handleToggleMission(m.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      padding: '1rem 1.25rem',
                      border: isDone ? '1px solid #86efac' : '1px solid var(--line)',
                      background: isDone ? '#f0fdf4' : '#f8fafc',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '4px',
                        border: isDone ? '2px solid #22c55e' : '2px solid #94a3b8',
                        background: isDone ? '#22c55e' : '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      {isDone && <Check size={16} color="#fff" strokeWidth={3} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: isDone ? '#15803d' : 'var(--blue)', fontSize: '0.98rem' }}>
                        {m.title}
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '0.25rem', lineHeight: 1.5 }}>
                        {m.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECCIÓN 2: Marco de Postura */}
          <section id="postura" style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--blue)', borderBottom: '2px solid var(--line)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
              Los Innegociables del Aliado de C1
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {innegociablesC1.map(item => (
                <div key={item.id} style={{ background: '#fff', border: '1px solid var(--line)', padding: '1.25rem', borderRadius: '6px' }}>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', color: '#0369a1' }}>{item.title}</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* SECCIÓN 3: Cronograma C1 */}
          <section id="cronograma" style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--blue)', borderBottom: '2px solid var(--line)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
              Cronograma Operativo de Fin de Semana (C1)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: '#fff', border: '1px solid var(--line)', borderLeft: '4px solid #38bdf8', padding: '1.25rem', borderRadius: '4px' }}>
                <strong style={{ color: '#0369a1', fontSize: '1.1rem' }}>Viernes C1 · Grounding 08:00 hrs & Creación de Relación</strong>
                <p style={{ margin: '0.5rem 0 0', color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Llegada puntual al 100%. Ensayar la presentación poderosa ante el grupo. Elección de duplas de Partner y contención de contexto desde la presencia.
                </p>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--line)', borderLeft: '4px solid #f59e0b', padding: '1.25rem', borderRadius: '4px' }}>
                <strong style={{ color: '#b45309', fontSize: '1.1rem' }}>Sábado C1 · Grounding 08:30 hrs & Profundización de Relación</strong>
                <p style={{ margin: '0.5rem 0 0', color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Sostener la escucha limpia (menos de 90 segundos) y verificar la presencia física de tu Partner antes de que inicie la sala. Cero acuerdos fantasiosos.
                </p>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--line)', borderLeft: '4px solid #22c55e', padding: '1.25rem', borderRadius: '4px' }}>
                <strong style={{ color: '#15803d', fontSize: '1.1rem' }}>Domingo C1 · Grounding 08:30 hrs & Llamado Contundente a la Acción</strong>
                <p style={{ margin: '0.5rem 0 0', color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Espacio del Ticket de Posibilidad hacia C2. Desafiar excusas de dinero y tiempo. Conducir al Sí en Acción con evidencia material o al No rotundo y limpio.
                </p>
              </div>
            </div>
          </section>

          {/* SECCIÓN 4: El Puente de los 8 Días y Llamadas Matutinas */}
          <section id="puente" style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--blue)', borderBottom: '2px solid var(--line)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
              El Puente de los 8 Días · Llamadas Matutinas (Regla 30/70)
            </h2>
            <div style={{ background: '#fff', border: '1px solid var(--line)', padding: '1.5rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem', color: '#0f172a' }}>Reglas de las Llamadas Matutinas</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                <strong>Horario Obligatorio:</strong> Realizadas siempre por la mañana para otorgar al participante el día completo para ejecutar sus retos. Las evidencias se validan de noche en el chat de WhatsApp.
              </p>
              <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                <strong>Regla 30/70:</strong> El Aliado habla un máximo del 30% del tiempo; el participante habla el 70%. Lanzar la pregunta poderosa, guardar silencio y sostener la escucha.
              </p>

              <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  <strong>Minuto 1:</strong> Saludo cálido y encuadre del límite de 5 min.
                </div>
                <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  <strong>Minutos 2-3:</strong> Pregunta quirúrgica y escucha (70% habla él).
                </div>
                <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  <strong>Minuto 4:</strong> Diseño del reto diario medible.
                </div>
                <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  <strong>Minuto 5:</strong> Cierre en visión y compromiso de evidencia.
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN 5: Tácticas de Quiebre Quirúrgicas */}
          <section id="roleplays" style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--blue)', borderBottom: '2px solid var(--line)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
              Tácticas de Quiebre Quirúrgicas (Escenarios Prácticos)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {roleplaysC1.map(rp => (
                <div key={rp.id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '6px', padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem', color: 'var(--blue)', fontSize: '1.15rem' }}>{rp.title}</h3>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: 'var(--muted)' }}>
                    <strong>Situación:</strong> {rp.situacion}
                  </p>

                  <div style={{ background: '#f8fafc', borderLeft: '3px solid #38bdf8', padding: '0.85rem', borderRadius: '4px', marginBottom: '0.75rem' }}>
                    <strong style={{ fontSize: '0.78rem', color: '#0284c7', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      ⚡ Quiebre y Pregunta Quirúrgica
                    </strong>
                    <div style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 700 }}>{rp.pregunta}</div>
                  </div>

                  <div style={{ background: '#f0fdf4', borderLeft: '3px solid #22c55e', padding: '0.85rem', borderRadius: '4px' }}>
                    <strong style={{ fontSize: '0.78rem', color: '#16a34a', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      🔒 Cierre Concreto
                    </strong>
                    <div style={{ fontSize: '0.92rem', color: '#15803d', fontWeight: 600 }}>{rp.cierre}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECCIÓN 6: Aviso Legal */}
          <section id="legal" style={{ background: '#f8fafc', border: '1px solid var(--line)', borderRadius: '6px', padding: '1.75rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', color: 'var(--blue)' }}>Aviso de Propiedad Intelectual y Confidencialidad Global</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 0.75rem' }}>
              Todo el contenido, metodología, estructura operativa, nombres de dinámicas, procesos, marcas y material pedagógico contenidos en esta guía son propiedad intelectual exclusiva de Crear Poder Sin Límites.
            </p>
            <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
              Queda estrictamente prohibida la reproducción total o parcial, copia, modificación, distribución, divulgación, publicación o transmisión de este material por cualquier medio. Esta sesión está firmada digitalmente para <strong>{user.email}</strong>.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<AliadosC1PortalApp />);
}
