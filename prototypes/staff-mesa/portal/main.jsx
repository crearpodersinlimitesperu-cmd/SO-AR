import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  LogOut,
  ChevronDown,
  ChevronRight,
  BookOpen,
  ClipboardList,
  AlertTriangle,
  Building2,
  Users,
  Calendar,
  ExternalLink,
  Lock,
  ArrowRight,
  Sparkles,
  Search,
} from 'lucide-react';
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { getPortalFirebase, isAdminEmail } from './firebase.js';
import { OFFICIAL_SEDES, VIGENTES_TEAMS_C1, VIGENTES_TEAMS_C2, evaluateAccessValidity } from './vigenciaConfig.js';
import crearLogo from './logo-crear.png';
import './portal.css';

const ADMIN_CONTROL_TOKEN = 'CAUSA_OS_SUPERADMIN_STAFF_MESA_2026';

export const ROLES_MESA = [
  'Mesa Capítulo 1 (C1)',
  'Mesa Capítulo 2 (C2)',
  'Mesa Maestría del Juego (MJ)',
  'Capitán General de Mesa',
];

export const checklistMaterialesC1 = [
  { id: 'm_c1_laptops', label: 'Laptops / Tablets con acceso verificado y carga completa al sistema Causa/Nodus' },
  { id: 'm_c1_internet', label: 'Conexión a Internet dedicada (módem / hotspot de respaldo verificado)' },
  { id: 'm_c1_tickets', label: 'Tickets de participación C1 impresos y foliados' },
  { id: 'm_c1_lapiceros', label: 'Lapiceros negros y azules en abundancia' },
  { id: 'm_c1_pulseras', label: 'Cintas / Pulseras de identificación por grupo oficial' },
  { id: 'm_c1_libreria', label: 'Resaltadores, tijeras de uso pesado y cinta adhesiva / embalaje' },
];

export const checklistMaterialesC2 = [
  { id: 'm_c2_pos', label: 'Dispositivos POS de cobro configurados, vinculados y operativos' },
  { id: 'm_c2_laptops', label: 'Colectores de datos y laptops conectadas a Causa / módulo de pagos' },
  { id: 'm_c2_talonarios', label: 'Talonarios oficiales y fichas de registro C2' },
  { id: 'm_c2_utiles', label: 'Lapiceros, resaltadores, clips y carpetas clasificadoras' },
  { id: 'm_c2_corte_rotas', label: 'Protocolo de Corte de Palabras Rotas listo para emisión el viernes 14:01 hrs' },
];

export const checklistMaterialesMJ = [
  { id: 'm_mj_padron', label: 'Padrón oficial impreso y digital de elegibles para Maestría del Juego' },
  { id: 'm_mj_graduados', label: 'Laptops con acceso a la base de datos oficial de graduados Causa/Nodus' },
  { id: 'm_mj_fichas', label: 'Fichas de enrolamiento MJ y credenciales distintivas' },
  { id: 'm_mj_papeleria', label: 'Material de papelería administrativa fina (atención domingo desde 15:00 hrs)' },
];

export const checklistPosturaMesa = [
  { id: 'p_llegada', label: '1. Horario de llegada: Presente 30 a 60 min antes de la citación general' },
  { id: 'p_imagen', label: '2. Código de Imagen: Vestimenta oficial impecable, postura ergónoma y alta energía' },
  { id: 'p_adulto', label: '3. Postura de recibimiento adulto a adulto sin lástima ni paternalismo' },
  { id: 'p_dni', label: '4. Verificación estricta de identidad física (DNI/Pasaporte) vs Causa/Nodus' },
  { id: 'p_tiempo', label: '5. Límite de atención quirúrgico: Máximo 5 minutos por participante' },
  { id: 'p_preguntas', label: '6. Preguntas directas de cancha sin clichés de motivación' },
  { id: 'p_cierre', label: '7. Cierre firme en "Sí en Acción" e indagación asertiva de costo en el NO' },
];

function detectDeviceLabel() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
  let browser = 'Navegador';
  if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edge/i.test(ua)) browser = 'Edge';
  return `${isMobile ? 'Móvil' : 'Escritorio'} · ${browser}`;
}

async function logSecurityOrSessionEvent(db, user, surveyData, action, details = '') {
  const isAlert = action.includes('BLOQUEADO') || action.includes('INTENTO') || action.includes('CAPTURA') || action.includes('IMPRESION') || action.includes('COPIA');
  const emailLower = user?.email ? String(user.email).trim().toLowerCase() : 'visitante_mesa@portal.crear';
  const uid = user?.uid || ('anon_' + Math.random().toString(36).slice(2, 10));
  const device = detectDeviceLabel();
  const nowIso = new Date().toISOString();

  try {
    if (user?.uid) {
      await setDoc(doc(db, 'staff_mesa_sesiones', user.uid), {
        uid: user.uid,
        email: emailLower,
        nombre: surveyData?.nombre || user.displayName || '',
        telefono: surveyData?.telefono || '',
        sede: surveyData?.sede || '',
        equipo: surveyData?.equipo || '',
        mesaRol: surveyData?.mesaRol || '',
        capitan: surveyData?.capitan || '',
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

    await addDoc(collection(db, 'staff_mesa_conexiones_log'), {
      uid,
      email: emailLower,
      nombre: surveyData?.nombre || user?.displayName || (user?.uid ? 'Staff de Mesa' : 'Visitante'),
      sede: surveyData?.sede || '',
      equipo: surveyData?.equipo || '',
      mesaRol: surveyData?.mesaRol || '',
      action,
      details,
      device,
      createdAt: serverTimestamp(),
      createdAtIso: nowIso,
      timestampIso: nowIso,
      adminControlToken: ADMIN_CONTROL_TOKEN,
    });
  } catch (err) {
    console.warn('Registro silencioso de seguridad Staff Mesa:', err);
  }
}

export function SurveyGateMesa({ user, existingSurvey, onCompleted, onLogout }) {
  const initialSede = (existingSurvey?.sede && OFFICIAL_SEDES.includes(existingSurvey.sede)) ? existingSurvey.sede : 'Lima';
  const c1Teams = VIGENTES_TEAMS_C1[initialSede] || [];
  const c2Teams = VIGENTES_TEAMS_C2[initialSede] || [];
  const combinedTeams = [...c1Teams, ...c2Teams];

  const [nombre, setNombre] = useState(existingSurvey?.nombre || user?.displayName || '');
  const [telefono, setTelefono] = useState(existingSurvey?.telefono || '');
  const [sede, setSede] = useState(initialSede);
  const [equipo, setEquipo] = useState(existingSurvey?.equipo || combinedTeams[0]?.id || 'C1E33');
  const [mesaRol, setMesaRol] = useState(existingSurvey?.mesaRol || ROLES_MESA[0]);
  const [capitan, setCapitan] = useState(existingSurvey?.capitan || '');
  const [compromiso, setCompromiso] = useState(existingSurvey?.compromiso ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  function handleSedeChange(newSede) {
    setSede(newSede);
    const teams = [...(VIGENTES_TEAMS_C1[newSede] || []), ...(VIGENTES_TEAMS_C2[newSede] || [])];
    setEquipo(teams[0]?.id || '');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');

    if (!nombre || nombre.trim().length < 3) {
      setErrorMsg('El Nombre Completo es obligatorio (mínimo 3 caracteres).');
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
    if (!mesaRol) {
      setErrorMsg('Debes seleccionar la Mesa o Rol en el que vas a servir.');
      return;
    }
    if (!capitan || capitan.trim().length < 3) {
      setErrorMsg('El nombre de tu Capitán de Mesa o Coordinador es obligatorio (mínimo 3 caracteres).');
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
        capitulo: 'STAFF_MESA',
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        sede: sede.trim(),
        equipo: equipo.trim(),
        mesaRol: mesaRol.trim(),
        capitan: capitan.trim(),
        compromiso: Boolean(compromiso),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'encuestas_staff_mesa', user.uid), surveyData, { merge: true });
      await setDoc(doc(db, 'staff_mesa_autorizados', emailLower), {
        email: emailLower,
        uid: user.uid,
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        sede: sede.trim(),
        equipo: equipo.trim(),
        mesaRol: mesaRol.trim(),
        capitan: capitan.trim(),
        enabled: true,
        capitulo: 'STAFF_MESA',
        source: 'encuesta_staff_mesa_web',
        updatedAt: serverTimestamp(),
      }, { merge: true });

      await logSecurityOrSessionEvent(db, user, surveyData, 'ENCUESTA_COMPLETADA_MESA', `Sede ${sede.trim()} · ${mesaRol} · Equipo ${equipo.trim()}`);
      onCompleted(surveyData);
    } catch (err) {
      setErrorMsg(`Error al guardar tu encuesta: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const currentTeams = [...(VIGENTES_TEAMS_C1[sede] || []), ...(VIGENTES_TEAMS_C2[sede] || [])];

  return (
    <div className="portal-auth-wrap">
      <div className="portal-card">
        <div className="portal-card-header">
          <div>
            <span className="portal-badge" style={{ background: '#fef3c7', color: '#92400e' }}>
              Staff de Mesa de Registro · Acreditación Oficial
            </span>
            <h2>Encuesta de Inducción y Acuerdo de Confidencialidad</h2>
            <p>
              Bienvenido, <strong>{user.email}</strong>. Para acceder a la Guía Práctica Operativa del Staff de Mesa (C1, C2 y MJ), completa tus datos oficiales. Todos los campos son obligatorios.
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
              <span>Nombre y Apellidos Completos *</span>
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

          <div className="portal-grid-2">
            <label>
              <span>Mesa Asignada a Servir *</span>
              <select
                required
                value={mesaRol}
                onChange={e => setMesaRol(e.target.value)}
              >
                {ROLES_MESA.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label>
              <span>Capitán de Mesa o Coordinador Asignado *</span>
              <input
                type="text"
                required
                maxLength={160}
                placeholder="Nombre de tu Capitán de Mesa"
                value={capitan}
                onChange={e => setCapitan(e.target.value)}
              />
            </label>
          </div>

          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '0.65rem 0.85rem', marginBottom: '0.5rem' }}>
            <small style={{ color: '#0369a1', fontSize: '0.82rem', display: 'block', fontWeight: 600 }}>
              ⚡ Regla Oficial: Los datos recolectados en Mesa son de Confidencialidad Global. La verificación frente a Causa/Nodus debe ser física con DNI o documento oficial.
            </small>
          </div>

          <label className="portal-checkbox-row">
            <input type="checkbox" checked={compromiso} onChange={e => setCompromiso(e.target.checked)} required />
            <span>
              <strong>Acuerdo de confidencialidad y protección de datos:</strong> Confirmo que soy integrante acreditado del Staff de Mesa de Registro (C1, C2 y MJ), que usaré esta guía únicamente para mi entrenamiento y servicio operativo, y me comprometo a no copiar, imprimir, capturar pantalla ni divulgar datos de participantes ni este material confidencial de Crear Poder Sin Límites.
            </span>
          </label>

          <div className="portal-form-actions">
            <button type="submit" className="primary-link portal-submit" disabled={submitting}>
              <CheckCircle2 size={18} />
              <span>{submitting ? 'Guardando y validando acceso...' : 'Guardar encuesta y entrar a la Guía de Mesa'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AuthBoxMesa({ onError, errorMsg }) {
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
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, emailInput.trim(), passInput);
      } else {
        await createUserWithEmailAndPassword(auth, emailInput.trim(), passInput);
      }
    } catch (err) {
      onError(err.message || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="portal-auth-wrap">
      <div className="portal-card">
        <div className="portal-card-header">
          <div>
            <span className="portal-badge" style={{ background: '#fef3c7', color: '#92400e' }}>
              Acceso Protegido · Staff de Mesa
            </span>
            <h2>Ingreso a la Guía Operativa de Mesa</h2>
            <p>
              Inicia sesión con tu cuenta oficial de Staff / Aliado de Crear Poder Sin Límites para acceder a la guía de Mesa de Registro (C1, C2 y MJ).
            </p>
          </div>
        </div>

        {errorMsg && <div className="portal-alert-error" role="alert">{errorMsg}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.25rem' }}>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="portal-btn-google"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '0.85rem',
              borderRadius: '6px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.96rem',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span>{loading ? 'Verificando...' : 'Continuar con Google'}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>o con correo y contraseña</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
          </div>

          <form onSubmit={handleEmailAuth} className="portal-form">
            <label>
              <span>Correo Electrónico *</span>
              <input
                type="email"
                required
                placeholder="tu.correo@ejemplo.com"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
              />
            </label>
            <label>
              <span>Contraseña *</span>
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={passInput}
                onChange={e => setPassInput(e.target.value)}
              />
            </label>
            <button type="submit" className="primary-link portal-submit" disabled={loading} style={{ width: '100%' }}>
              <Lock size={16} />
              <span>{loading ? 'Accediendo...' : (authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta')}</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              style={{ background: 'transparent', border: 'none', color: '#0284c7', fontSize: '0.85rem', cursor: 'pointer', marginTop: '0.5rem' }}
            >
              {authMode === 'login' ? '¿Primera vez? Crea tu contraseña aquí' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function StaffMesaApp() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [survey, setSurvey] = useState(null);
  const [isDenied, setIsDenied] = useState(false);
  const [completedItems, setCompletedItems] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('c1');

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (
        e.key === 'PrintScreen' ||
        (isCmdOrCtrl && ['p', 'P', 'u', 'U', 's', 'S'].includes(e.key)) ||
        (isCmdOrCtrl && e.shiftKey && ['3', '4', '5', 'i', 'I', 'c', 'C', 'j', 'J'].includes(e.key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        const { db } = getPortalFirebase();
        logSecurityOrSessionEvent(db, user, survey, 'INTENTO_CAPTURA_BLOQUEADO_MESA', `Tecla ${e.key} interceptada`);
        alert('🛡️ Escudo de Seguridad Activo: La captura, copia e impresión de esta guía están estrictamente restringidas por políticas de confidencialidad de Crear Poder Sin Límites.');
      }
    };

    const handleBeforePrint = (e) => {
      e.preventDefault();
      const { db } = getPortalFirebase();
      logSecurityOrSessionEvent(db, user, survey, 'INTENTO_IMPRESION_BLOQUEADO_MESA', 'Diálogo de impresión bloqueado');
      alert('🛡️ Documento Confidencial: La impresión de la Guía de Mesa está prohibida.');
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('beforeprint', handleBeforePrint);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  }, [user, survey]);

  useEffect(() => {
    const { auth, db, onAuthStateChanged } = getPortalFirebase();
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setCheckingAuth(false);
        setSurvey(null);
        return;
      }

      const emailLower = String(currentUser.email || '').trim().toLowerCase();

      try {
        const authDoc = await getDoc(doc(db, 'staff_mesa_autorizados', emailLower));
        if (authDoc.exists() && authDoc.data().enabled === false) {
          setIsDenied(true);
          setCheckingAuth(false);
          logSecurityOrSessionEvent(db, currentUser, null, 'ACCESO_DENEGADO_BLOQUEADO_MESA', 'Intento de ingreso por cuenta denegada');
          return;
        }

        const surveyDoc = await getDoc(doc(db, 'encuestas_staff_mesa', currentUser.uid));
        if (surveyDoc.exists()) {
          const sData = surveyDoc.data();
          setSurvey(sData);
          logSecurityOrSessionEvent(db, currentUser, sData, 'LOGIN', `Dispositivo ${detectDeviceLabel()}`);
        }

        const recordDoc = await getDoc(doc(db, 'staff_mesa_records', currentUser.uid));
        if (recordDoc.exists() && Array.isArray(recordDoc.data().completed)) {
          setCompletedItems(recordDoc.data().completed);
        }
      } catch (err) {
        console.warn('Error verificando usuario Staff Mesa:', err);
      } finally {
        setCheckingAuth(false);
      }
    });

    return () => unsub();
  }, []);

  async function handleToggleCheck(itemId) {
    if (!user) return;
    const { db } = getPortalFirebase();
    const nextCompleted = completedItems.includes(itemId)
      ? completedItems.filter(id => id !== itemId)
      : [...completedItems, itemId];

    setCompletedItems(nextCompleted);

    try {
      await setDoc(doc(db, 'staff_mesa_records', user.uid), {
        uid: user.uid,
        email: user.email,
        completed: nextCompleted,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      logSecurityOrSessionEvent(
        db,
        user,
        survey,
        completedItems.includes(itemId) ? 'UNCHECK_MESA' : 'CHECK_MESA',
        `Item: ${itemId} (${nextCompleted.length} listos)`
      );
    } catch (err) {
      console.warn('Error guardando checklist Mesa:', err);
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
          <p style={{ marginTop: '1rem', fontWeight: 700 }}>Validando credenciales y escudo de seguridad de Mesa...</p>
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
          <span className="guide-label">Programa de Resultados · Guía Staff de Mesa</span>
        </header>
        <AuthBoxMesa onError={setErrorMsg} errorMsg={errorMsg} />
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
            Tu correo <strong>{user.email}</strong> no cuenta con autorización activa para ingresar a la Guía de Staff de Mesa.
            Si consideras que esto es un error, contacta a la Dirección de tu Sede o a tu Capitán de Mesa en Causa OS.
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
          <span className="guide-label">Programa de Resultados · Guía Staff de Mesa</span>
        </header>
        <SurveyGateMesa user={user} existingSurvey={survey} onCompleted={setSurvey} onLogout={handleLogout} />
      </>
    );
  }

  const accessValidity = evaluateAccessValidity(survey, survey.mesaRol?.includes('C2') ? 'C2' : 'C1');
  const userIsAdmin = isAdminEmail(user?.email);

  if (!userIsAdmin && accessValidity.isExpired) {
    return (
      <>
        <header className="brand-bar">
          <div className="brand">
            <img src={crearLogo} alt="CREAR Poder Sin Límites" />
            <span>CREAR · PODER SIN LÍMITES</span>
          </div>
          <span className="guide-label">Programa de Resultados · Guía Staff de Mesa</span>
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
              Ciclo de Servicio de Mesa Finalizado
            </h2>
            <p style={{ color: '#475569', fontSize: '0.96rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
              Hola, <strong>{survey.nombre || user.displayName || user.email}</strong>. Tu servicio como Staff de Mesa en <strong>{accessValidity.equipoLabel || survey.equipo}</strong> ({survey.sede}) ha finalizado su ciclo oficial.
            </p>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', lineHeight: '1.55' }}>
                🔒 <strong>Políticas de Confidencialidad y Retiro Automático:</strong> El acceso a los manuales, checklists y protocolos de registro se cierra de forma automática e irrevocable al culminar el entrenamiento. Agradecemos tu impecabilidad y liderazgo en la Mesa.
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
                Registrarme en Nueva Generación
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const allChecklistItems = [
    ...checklistPosturaMesa,
    ...checklistMaterialesC1,
    ...checklistMaterialesC2,
    ...checklistMaterialesMJ,
  ];
  const completedTotal = completedItems.length;
  const progressPercent = Math.round((completedTotal / allChecklistItems.length) * 100);

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
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <span
            key={i}
            style={{
              transform: 'rotate(-25deg)',
              fontSize: '1.1rem',
              fontWeight: 800,
              color: '#000',
              padding: '1.5rem',
            }}
          >
            CREAR · STAFF DE MESA · {user.email} · CONFIDENCIAL
          </span>
        ))}
      </div>

      <header className="brand-bar">
        <div className="brand">
          <img src={crearLogo} alt="CREAR Poder Sin Límites" />
          <span>CREAR · PODER SIN LÍMITES</span>
        </div>
        <span className="guide-label">Programa de Resultados · Guía Staff de Mesa</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'none', smDisplay: 'inline' }}>
            📍 {survey.sede} · {survey.mesaRol} · {survey.equipo}
          </span>
          <button type="button" onClick={handleLogout} className="portal-btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}>
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      <div className="portal-container" style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem' }}>
        {/* Banner de bienvenida al Staff de Mesa */}
        <div className="portal-hero-card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', padding: '2rem', borderRadius: '12px', marginBottom: '2rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="portal-badge" style={{ background: '#38bdf8', color: '#0f172a', fontWeight: 800, marginBottom: '0.75rem', display: 'inline-block' }}>
                Estándar Operativo · Mesa de Registro y Seguimiento
              </span>
              <h1 style={{ fontSize: '1.85rem', margin: '0 0 0.5rem 0', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Guía Práctica Operativa: Staff de Mesa (C1, C2 y MJ)
              </h1>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '1rem', maxWidth: '750px', lineHeight: 1.6 }}>
                Líder en servicio: <strong>{survey.nombre}</strong> · Sede: <strong>{survey.sede}</strong> · Rol: <strong>{survey.mesaRol}</strong> ({survey.equipo}) · Capitán: <strong>{survey.capitan}</strong>.
              </p>
            </div>
            <a
              href="https://docs.google.com/document/d/1zbupeWc8eI__oOTB-7kemhJTmse1mjWWnXACLr_W718/edit"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.1)',
                color: '#38bdf8',
                padding: '0.5rem 0.9rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                textDecoration: 'none',
                border: '1px solid rgba(56,189,248,0.3)',
              }}
            >
              <ExternalLink size={14} /> Doc Oficial Google Drive
            </a>
          </div>

          {/* Barra de progreso de preparación */}
          <div style={{ marginTop: '1.75rem', background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0' }}>
                Checklist de Postura y Materiales de Mesa
              </span>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#38bdf8' }}>
                {completedTotal} de {allChecklistItems.length} completados ({progressPercent}%)
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: progressPercent === 100 ? '#22c55e' : 'linear-gradient(90deg, #38bdf8, #2563eb)',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* Sección 1: Filosofía del Servicio y Liderazgo en Mesa */}
        <section className="portal-section" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '10px', padding: '1.75rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.45rem', color: 'var(--blue)', borderBottom: '2px solid var(--line)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
            1. Filosofía del Servicio y Liderazgo en Mesa
          </h2>
          <p style={{ lineHeight: 1.7, color: '#334155', fontSize: '0.98rem' }}>
            Estar al frente de la <strong>Mesa de Registro y Seguimiento</strong> es el privilegio del servicio y un reconocimiento al liderazgo. Los integrantes del Staff de Mesa son convocados directamente de los equipos en juego o de la comunidad de graduados por haber destacado y marcado la diferencia en su congruencia, compromiso e impecabilidad.
          </p>
          <div style={{ background: '#f8fafc', borderLeft: '4px solid var(--blue)', padding: '1rem', borderRadius: '4px', margin: '1rem 0' }}>
            <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '0.98rem' }}>
              Es fundamental tener absoluta claridad sobre nuestro marco de trabajo: No somos motivación, desarrollo personal ni sanación. Somos un Programa de Resultados y Creación.
            </p>
          </div>
          <p style={{ lineHeight: 1.7, color: '#334155', fontSize: '0.98rem' }}>
            En este espacio, <strong>un líder entrena a otros líderes y la vara está más alta</strong>. Los integrantes del Staff de Mesa no son secretarios de papeleo ni de escritorio; representan el primer estándar de excelencia, firmeza y postura que el participante experimenta al ingresar al entrenamiento. La Mesa es la puerta de entrada a la creación y la <strong>primera línea de interrupción del programa</strong>.
          </p>
        </section>

        {/* Sección 2: Nivel de Entrenamiento: Notar y Contexto */}
        <section className="portal-section" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '10px', padding: '1.75rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.45rem', color: 'var(--blue)', borderBottom: '2px solid var(--line)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
            2. Nivel de Entrenamiento: Notar y Contexto
          </h2>
          <p style={{ lineHeight: 1.7, color: '#334155', fontSize: '0.98rem' }}>
            El Staff de Mesa no realiza un trabajo administrativo pasivo; opera en un nivel de entrenamiento continuo basado en dos pilares fundamentales:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#0369a1', fontSize: '1.15rem' }}>👁️ Notar</h3>
              <p style={{ margin: 0, color: '#334155', fontSize: '0.92rem', lineHeight: 1.6 }}>
                Capacidad de observar sin juicio, de manera quirúrgica y limpia, la postura del participante, sus patrones de evasión, lenguaje corporal, titubeos, tono de voz y victimización antes de que emita una sola palabra.
              </p>
            </div>
            <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '8px', padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#854d0e', fontSize: '1.15rem' }}>🌟 Contexto</h3>
              <p style={{ margin: 0, color: '#334155', fontSize: '0.92rem', lineHeight: 1.6 }}>
                Sostener una conversación de posibilidad y abundancia. El Staff de Mesa altera el contexto desde su presencia, marcando la pauta de que el entrenamiento ya comenzó. No se compra la narrativa del participante ni se valida su historia limitante; se sostiene la visión de su grandeza.
              </p>
            </div>
          </div>
        </section>

        {/* Sección 3: Guía de Entrenamiento en 5 Puntos Clave */}
        <section className="portal-section" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '10px', padding: '1.75rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.45rem', color: 'var(--blue)', borderBottom: '2px solid var(--line)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
            3. Guía de Entrenamiento en 5 Puntos Clave
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '1.1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 0.4rem 0', color: '#0f172a', fontSize: '1.05rem' }}>
                1. Postura de recibimiento adulto a adulto sin lástima ni paternalismo
              </h3>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.92rem', lineHeight: 1.6 }}>
                El contacto visual debe ser directo, firme y respetuoso. Se recibe al participante reconociendo su capacidad completa como un adulto responsable. Está prohibido asumir posturas de lástima, condescendencia, consuelo o paternalismo. Tratar al participante con compasión mal entendida debilita su compromiso; tratarlo como un adulto completo le devuelve su poder personal.
              </p>
            </div>

            <div style={{ padding: '1.1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 0.4rem 0', color: '#0f172a', fontSize: '1.05rem' }}>
                2. Verificación estricta de identidad frente al sistema Causa/Nodus
              </h3>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.92rem', lineHeight: 1.6 }}>
                La validación del participante requiere la verificación estricta de su identidad mediante un documento físico oficial (DNI, Carné de Extranjería o Pasaporte) cotejado directamente contra el sistema Causa/Nodus, siempre y sin excepción. No se permiten registros por aproximación, suposiciones ni favores personales.
              </p>
            </div>

            <div style={{ padding: '1.1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 0.4rem 0', color: '#0f172a', fontSize: '1.05rem' }}>
                3. Escucha fina y límite de atención de máximo 5 minutos
              </h3>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.92rem', lineHeight: 1.6 }}>
                El Staff debe mantener una escucha fina para detectar la historia, la excusa o la justificación. El límite máximo de atención por participante es de <strong>5 minutos</strong>. Bajo ninguna circunstancia se debe comprar la narrativa victimizante del participante ("no tengo tiempo", "el tráfico", "mi familia no me apoya"). Se escucha la información, no el drama.
              </p>
            </div>

            <div style={{ padding: '1.1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 0.4rem 0', color: '#0f172a', fontSize: '1.05rem' }}>
                4. Preguntas directas de cancha sin clichés
              </h3>
              <p style={{ margin: '0 0 0.75rem 0', color: '#475569', fontSize: '0.92rem', lineHeight: 1.6 }}>
                Cuando un participante presenta dudas, frenos o resistencia, la Mesa interrumpe utilizando preguntas de cancha limpias y confrontativas, evitando cualquier fórmula vacía o cliché. Ejemplos obligatorios de abordaje:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.65rem' }}>
                <div style={{ background: '#fff', borderLeft: '3px solid #0284c7', padding: '0.65rem', borderRadius: '4px', fontStyle: 'italic', color: '#0f172a', fontWeight: 600, fontSize: '0.9rem' }}>
                  "Si dejamos la plata a un lado..."
                </div>
                <div style={{ background: '#fff', borderLeft: '3px solid #0284c7', padding: '0.65rem', borderRadius: '4px', fontStyle: 'italic', color: '#0f172a', fontWeight: 600, fontSize: '0.9rem' }}>
                  "¿Vas a ir a pedir permiso o a contar la decisión que ya tomaste?"
                </div>
                <div style={{ background: '#fff', borderLeft: '3px solid #0284c7', padding: '0.65rem', borderRadius: '4px', fontStyle: 'italic', color: '#0f172a', fontWeight: 600, fontSize: '0.9rem' }}>
                  "¿Qué información nueva vas a encontrar el domingo?"
                </div>
              </div>
            </div>

            <div style={{ padding: '1.1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 0.4rem 0', color: '#0f172a', fontSize: '1.05rem' }}>
                5. Cierre firme en el "Sí en Acción" y manejo asertivo del NO
              </h3>
              <p style={{ margin: '0 0 0.5rem 0', color: '#475569', fontSize: '0.92rem', lineHeight: 1.6 }}>
                El objetivo de la Mesa es llevar al participante a un enrolamiento puro traducido en acción concreta:
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#334155', fontSize: '0.92rem', lineHeight: 1.6 }}>
                <li><strong>Si la respuesta es SÍ:</strong> Se formaliza el registro inmediato y el compromiso con sus evidencias.</li>
                <li><strong>Si la respuesta es NO:</strong> Se realiza una indagación asertiva marcando que no le está diciendo "no" al Staff ni al programa, sino al vehículo que lo llevará a su vida imposible. El participante debe asumir conscientemente el costo y la consecuencia de su renuncia (Palabras Rotas).</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Sección 4: Organización, Horarios y Roles en Mesa */}
        <section className="portal-section" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '10px', padding: '1.75rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.45rem', color: 'var(--blue)', borderBottom: '2px solid var(--line)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
            4. Organización, Horarios y Roles en Mesa
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.2rem' }}>
              <h3 style={{ margin: '0 0 0.4rem 0', color: '#0f172a', fontSize: '1.05rem' }}>⏰ Horario de Llegada</h3>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.92rem', lineHeight: 1.6 }}>
                Llegada obligatoria de <strong>30 a 60 minutos antes</strong> de la hora de citación general, según lo dictamine la convocatoria oficial en el grupo de WhatsApp del evento. La Mesa debe estar 100% montada y probada antes de abrir puertas.
              </p>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.2rem' }}>
              <h3 style={{ margin: '0 0 0.4rem 0', color: '#0f172a', fontSize: '1.05rem' }}>🎖️ Capitanía de Mesa</h3>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.92rem', lineHeight: 1.6 }}>
                La operación completa está guiada por un <strong>Capitán de Mesa designado</strong>, quien distribuye roles, supervisa la carga del sistema Causa/Nodus, resuelve quiebres de nivel superior y reporta directamente a la Coordinación General.
              </p>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.2rem' }}>
              <h3 style={{ margin: '0 0 0.4rem 0', color: '#0f172a', fontSize: '1.05rem' }}>👔 Código de Imagen</h3>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.92rem', lineHeight: 1.6 }}>
                Presentación impecable, vestimenta oficial de Staff/Aliados alineada a los estándares de la organización, postura ergónoma y actitud de alta energía sostenida.
              </p>
            </div>
          </div>
        </section>

        {/* Sección 5: Operativa por Mesa y Checklists Interactivos */}
        <section className="portal-section" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '10px', padding: '1.75rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.45rem', color: 'var(--blue)', borderBottom: '2px solid var(--line)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
            5. Operativa por Mesa y Checklists de Materiales
          </h2>

          {/* Tabla Comparativa de Mesas */}
          <div style={{ overflowX: 'auto', marginBottom: '1.75rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#fff' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Mesa</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Enfoque Principal</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Límite de Tiempo</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Material Clave</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0284c7' }}>Capítulo 1 (C1)</td>
                  <td style={{ padding: '0.75rem 1rem' }}>Bienvenida, Verificación de Identidad e Integración</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>2 - 5 min</td>
                  <td style={{ padding: '0.75rem 1rem' }}>Tickets C1 y Laptops Causa</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#d97706' }}>Capítulo 2 (C2)</td>
                  <td style={{ padding: '0.75rem 1rem' }}>Validación Financiera, Cierre de Compromiso y Palabras Rotas</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>&lt; 3 min (SÍ) / Max 5 min (NO SÉ)</td>
                  <td style={{ padding: '0.75rem 1rem' }}>POS, Fichas C2 y Reporte Palabras Rotas (Viernes 14:01)</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#16a34a' }}>Maestría del Juego (MJ)</td>
                  <td style={{ padding: '0.75rem 1rem' }}>Registro de Managers y Verificación de Liderazgo</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Domingo desde las 15:00 hrs</td>
                  <td style={{ padding: '0.75rem 1rem' }}>Padrón de Graduados y Fichas de Enrolamiento MJ</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Navegación por Pestañas de Mesa */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveTab('postura')}
              style={{
                padding: '0.65rem 1.1rem',
                border: 'none',
                background: activeTab === 'postura' ? 'var(--blue)' : 'transparent',
                color: activeTab === 'postura' ? '#fff' : '#64748b',
                fontWeight: 700,
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Postura de Mesa ({checklistPosturaMesa.filter(i => completedItems.includes(i.id)).length}/{checklistPosturaMesa.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('c1')}
              style={{
                padding: '0.65rem 1.1rem',
                border: 'none',
                background: activeTab === 'c1' ? 'var(--blue)' : 'transparent',
                color: activeTab === 'c1' ? '#fff' : '#64748b',
                fontWeight: 700,
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Materiales C1 ({checklistMaterialesC1.filter(i => completedItems.includes(i.id)).length}/{checklistMaterialesC1.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('c2')}
              style={{
                padding: '0.65rem 1.1rem',
                border: 'none',
                background: activeTab === 'c2' ? 'var(--blue)' : 'transparent',
                color: activeTab === 'c2' ? '#fff' : '#64748b',
                fontWeight: 700,
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Materiales C2 ({checklistMaterialesC2.filter(i => completedItems.includes(i.id)).length}/{checklistMaterialesC2.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mj')}
              style={{
                padding: '0.65rem 1.1rem',
                border: 'none',
                background: activeTab === 'mj' ? 'var(--blue)' : 'transparent',
                color: activeTab === 'mj' ? '#fff' : '#64748b',
                fontWeight: 700,
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Materiales MJ ({checklistMaterialesMJ.filter(i => completedItems.includes(i.id)).length}/{checklistMaterialesMJ.length})
            </button>
          </div>

          {/* Contenido de la Pestaña Activa */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeTab === 'postura' && (
              <>
                <p style={{ margin: '0 0 0.5rem 0', color: '#64748b', fontSize: '0.9rem' }}>
                  Marca cada estándar conforme lo asumes e integras en tu servicio:
                </p>
                {checklistPosturaMesa.map((item) => (
                  <label
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      background: completedItems.includes(item.id) ? '#f0fdf4' : '#f8fafc',
                      border: `1px solid ${completedItems.includes(item.id) ? '#86efac' : '#e2e8f0'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={completedItems.includes(item.id)}
                      onChange={() => handleToggleCheck(item.id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.92rem', color: completedItems.includes(item.id) ? '#15803d' : '#0f172a', fontWeight: completedItems.includes(item.id) ? 700 : 500 }}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </>
            )}

            {activeTab === 'c1' && (
              <>
                <div style={{ background: '#f0f9ff', padding: '0.85rem', borderRadius: '6px', marginBottom: '0.5rem' }}>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#0369a1', lineHeight: 1.5 }}>
                    <strong>Mesa Capítulo 1 (C1):</strong> Dar la bienvenida al programa, ejecutar la verificación de identidad siempre y sostener un ritmo ágil de 2 a 5 minutos por persona para evitar cuellos de botella. Coordinar la asignación de roles de seguimiento como el rol de partner cuando corresponda.
                  </p>
                </div>
                {checklistMaterialesC1.map((item) => (
                  <label
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      background: completedItems.includes(item.id) ? '#f0fdf4' : '#f8fafc',
                      border: `1px solid ${completedItems.includes(item.id) ? '#86efac' : '#e2e8f0'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={completedItems.includes(item.id)}
                      onChange={() => handleToggleCheck(item.id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.92rem', color: completedItems.includes(item.id) ? '#15803d' : '#0f172a', fontWeight: completedItems.includes(item.id) ? 700 : 500 }}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </>
            )}

            {activeTab === 'c2' && (
              <>
                <div style={{ background: '#fffbeb', padding: '0.85rem', borderRadius: '6px', marginBottom: '0.5rem' }}>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#92400e', lineHeight: 1.5 }}>
                    <strong>Mesa Capítulo 2 (C2):</strong> Validar comprobantes de pago e inscripciones en la plataforma Causa. Entrega de tickets de participación C2.<br />
                    • <strong>Manejo del SÍ:</strong> Procesamiento y validación en menos de 3 minutos.<br />
                    • <strong>Manejo del NO SÉ:</strong> Atención máxima de 5 minutos mediante interrupción asertiva.<br />
                    • <strong>Corte de Palabras Rotas:</strong> Emisión y entrega formal del reporte de Palabras Rotas el día <strong>viernes a las 14:01 hrs exactamente</strong>, cerrando el padrón oficial sin excepciones.
                  </p>
                </div>
                {checklistMaterialesC2.map((item) => (
                  <label
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      background: completedItems.includes(item.id) ? '#f0fdf4' : '#f8fafc',
                      border: `1px solid ${completedItems.includes(item.id) ? '#86efac' : '#e2e8f0'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={completedItems.includes(item.id)}
                      onChange={() => handleToggleCheck(item.id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.92rem', color: completedItems.includes(item.id) ? '#15803d' : '#0f172a', fontWeight: completedItems.includes(item.id) ? 700 : 500 }}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </>
            )}

            {activeTab === 'mj' && (
              <>
                <div style={{ background: '#f0fdf4', padding: '0.85rem', borderRadius: '6px', marginBottom: '0.5rem' }}>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#166534', lineHeight: 1.5 }}>
                    <strong>Mesa Maestría del Juego (MJ):</strong> Registro especializado de Managers para el entrenamiento de Maestría del Juego. La atención opera únicamente el día <strong>domingo a partir de las 15:00 hrs</strong>. Verificación del cumplimiento de acuerdos previos, revisión de evidencias y confirmación de la alineación al programa de graduados.
                  </p>
                </div>
                {checklistMaterialesMJ.map((item) => (
                  <label
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      background: completedItems.includes(item.id) ? '#f0fdf4' : '#f8fafc',
                      border: `1px solid ${completedItems.includes(item.id) ? '#86efac' : '#e2e8f0'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={completedItems.includes(item.id)}
                      onChange={() => handleToggleCheck(item.id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.92rem', color: completedItems.includes(item.id) ? '#15803d' : '#0f172a', fontWeight: completedItems.includes(item.id) ? 700 : 500 }}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </>
            )}
          </div>
        </section>

        {/* Sección 6: Propiedad Intelectual, Confidencialidad y Protección de Datos */}
        <section className="portal-section" style={{ background: '#f8fafc', border: '1px solid var(--line)', borderRadius: '10px', padding: '1.75rem', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.3rem', color: 'var(--blue)', marginBottom: '0.75rem' }}>
            6. Propiedad Intelectual, Confidencialidad y Protección de Datos
          </h2>
          <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.65, margin: '0 0 0.85rem 0' }}>
            Todo el material, metodologías, dinámicas, nomenclaturas, marcos teóricos y procesos operativos descritos en esta guía pertenecen de manera exclusiva a <strong>Crear Poder Sin Límites</strong> y están protegidos por las leyes internacionales de Propiedad Intelectual. Queda prohibida la reproducción, comercialización, adaptación o uso no autorizado de este documento fuera del marco oficial de la organización.
          </p>
          <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.65, margin: 0 }}>
            Asimismo, la información personal, financiera y de contacto recolectada a través de las mesas en el sistema Causa/Nodus o en formato físico tiene carácter de <strong>Confidencialidad Global</strong>. Todo integrante del Staff de Mesa está sujeto al estricto cumplimiento de la normativa de Protección de Datos Personales, garantizando el uso exclusivo de la información para los fines propios del Programa de Resultados.
          </p>
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Sesión activa y auditada para: <strong>{user.email}</strong>
            </span>
            <a
              href="https://docs.google.com/document/d/1zbupeWc8eI__oOTB-7kemhJTmse1mjWWnXACLr_W718/edit"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              Documento Oficial en Google Drive <ExternalLink size={13} />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<StaffMesaApp />);
}
