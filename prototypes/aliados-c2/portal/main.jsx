import React, { useEffect, useState } from 'react';
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
import { guideIntro, phases, roleplays, preparation, reference, legalNotice } from '../content.js';
import { nextRecord } from '../private/recordModel.js';
import { getPortalFirebase, isAdminEmail } from './firebase.js';
import { OFFICIAL_SEDES, VIGENTES_TEAMS_C2, evaluateAccessValidity } from './vigenciaConfig.js';
import crearLogo from '../logo-crear.png';
import '../style.css';
import './portal.css';

if (typeof document !== 'undefined' && crearLogo) {
  ['icon', 'shortcut icon', 'apple-touch-icon'].forEach(rel => {
    let link = document.querySelector(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      document.head.appendChild(link);
    }
    link.type = 'image/png';
    link.href = crearLogo;
  });
}

const phaseFromHash = () => {
  const hash = window.location.hash.slice(1);
  return phases.some(phase => phase.id === hash) ? hash : 'todo';
};

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
      nombre: surveyData?.nombre || user?.displayName || (user?.uid ? 'Aliado' : 'Visitante'),
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
    console.warn('Registro silencioso de seguridad:', err);
  }
}

function exportRowsToCsv(filename, headers, rows) {
  const escapeCsv = val => {
    const str = String(val ?? '');
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const content = [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatHumanName(rawName, email = '') {
  if (rawName && typeof rawName === 'string') {
    const trimmed = rawName.trim();
    if (trimmed && trimmed.toLowerCase() !== 'sin nombre' && trimmed.toLowerCase() !== 'no especificado') {
      return trimmed;
    }
  }
  if (!email) return '';
  const prefix = String(email).split('@')[0] || '';
  const cleaned = prefix.replace(/[._-]+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function SurveyGate({ user, existingSurvey, onCompleted, onLogout }) {
  const initialSede = (existingSurvey?.sede && OFFICIAL_SEDES.includes(existingSurvey.sede)) ? existingSurvey.sede : 'Lima';
  const availableTeams = VIGENTES_TEAMS_C2[initialSede] || [];
  const initialEquipo = (existingSurvey?.equipo && availableTeams.some(t => t.id === existingSurvey.equipo || t.code === existingSurvey.equipo))
    ? existingSurvey.equipo
    : (availableTeams[0]?.id || 'C2E32');

  const initialNombre = existingSurvey?.nombre || existingSurvey?.nombreCompleto || user?.displayName || formatHumanName('', user?.email) || '';
  const [nombre, setNombre] = useState(initialNombre);
  const [telefono, setTelefono] = useState(existingSurvey?.telefono || existingSurvey?.whatsapp || '');
  const [sede, setSede] = useState(initialSede);
  const [equipo, setEquipo] = useState(initialEquipo);
  const [partner, setPartner] = useState(existingSurvey?.partner || '');
  const [compromiso, setCompromiso] = useState(existingSurvey?.compromiso ?? false);
  const [sheetWebhook, setSheetWebhook] = useState(() => {
    try { return localStorage.getItem('c2_sheets_webhook_url') || ''; } catch { return ''; }
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  function handleSedeChange(newSede) {
    setSede(newSede);
    const teams = VIGENTES_TEAMS_C2[newSede] || [];
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
    if (!partner || partner.trim().length < 3) {
      setErrorMsg('El nombre de tu Partner asignado en C2 es obligatorio (mínimo 3 caracteres).');
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
        nombre: nombre.trim(),
        nombreCompleto: nombre.trim(),
        displayName: nombre.trim(),
        telefono: telefono.trim(),
        whatsapp: telefono.trim(),
        sede: sede.trim(),
        sedeOficial: sede.trim(),
        equipo: equipo.trim(),
        equipoGeneracion: equipo.trim(),
        partner: partner.trim(),
        compromiso: Boolean(compromiso),
        updatedAt: serverTimestamp(),
      };

      // 1. Guardar la encuesta principal
      await setDoc(doc(db, 'encuestas_aliados', user.uid), surveyData, { merge: true });

      // 2. Sincronizar autorización si tiene permisos
      try {
        await setDoc(doc(db, 'aliados_autorizados', emailLower), {
          ...surveyData,
          isAuthorized: true,
          enabled: true,
          source: 'encuesta_web',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (authErr) {
        console.warn('aliados_autorizados setDoc omitido o sin permisos:', authErr);
      }

      try {
        await logSecurityOrSessionEvent(db, user, surveyData, 'ENCUESTA_COMPLETADA', `Sede ${sede.trim()} · Equipo ${equipo.trim()}`);
      } catch (logErr) {
        console.warn('logSecurityOrSessionEvent omitido:', logErr);
      }

      if (sheetWebhook && sheetWebhook.startsWith('https://script.google.com/')) {
        try {
          await fetch(sheetWebhook, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: emailLower,
              uid: user.uid,
              nombre: nombre.trim(),
              telefono: telefono.trim(),
              sede: sede.trim(),
              equipo: equipo.trim(),
              partner: partner.trim(),
              timestamp: new Date().toISOString(),
            }),
          });
        } catch {
          // Webhook opcional a Google Sheets
        }
      }

      onCompleted(surveyData);
    } catch (err) {
      setErrorMsg(err?.message || 'No se pudo guardar la encuesta. Verifica tu conexión o permisos.');
    } finally {
      setSubmitting(false);
    }
  }

  const currentTeams = VIGENTES_TEAMS_C2[sede] || [];

  return (
    <div className="portal-auth-wrap">
      <div className="portal-card">
        <div className="portal-card-header">
          <div>
            <span className="portal-badge">Paso 2 de 2 · Registro de Aliado C2</span>
            <h2>Encuesta de Acreditación y Acceso</h2>
            <p>Completa tus datos operativos para activar tu acceso a la Guía de Aliados C2 y habilitar el guardado de tu progreso personal bajo tu correo <strong>{user.email}</strong>. Todos los campos son obligatorios.</p>
          </div>
          <button type="button" className="portal-btn-secondary" onClick={onLogout}>
            <LogOut size={15} /> Salir
          </button>
        </div>

        {errorMsg && <div role="alert" className="portal-alert-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="portal-form">
          <div className="portal-grid-2">
            <label>
              <span>Nombre y Apellidos completos *</span>
              <input
                type="text"
                required
                minLength={3}
                maxLength={160}
                placeholder="Ej. María José Pérez López"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
              />
            </label>
            <label>
              <span>Teléfono / WhatsApp (con código de país) *</span>
              <input
                type="tel"
                required
                minLength={7}
                maxLength={40}
                placeholder="Ej. +51 987 654 321"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
              />
            </label>
            <label>
              <span>Sede Oficial *</span>
              <select value={sede} onChange={e => handleSedeChange(e.target.value)} required>
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
                ? '⚡ Regla Oficial: En Lima el equipo activo para C2 es C2E32.'
                : `⚡ Equipos oficiales vigentes programados para la sede de ${sede}.`}
            </small>
          </div>

          <label>
            <span>Nombre de tu Partner (Dupla de C1 / C2) *</span>
            <input
              type="text"
              required
              minLength={3}
              maxLength={160}
              placeholder="Nombre completo de tu Partner"
              value={partner}
              onChange={e => setPartner(e.target.value)}
            />
          </label>

          {isAdminEmail(user.email) && (
            <label>
              <span>URL de Google Apps Script Webhook (Opcional · Sincronización directa a Google Sheets)</span>
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={sheetWebhook}
                onChange={e => {
                  setSheetWebhook(e.target.value);
                  try { localStorage.setItem('c2_sheets_webhook_url', e.target.value); } catch {}
                }}
              />
            </label>
          )}

          <label className="portal-checkbox-row">
            <input
              type="checkbox"
              checked={compromiso}
              onChange={e => setCompromiso(e.target.checked)}
              required
            />
            <span>
              <strong>Acuerdo de propiedad intelectual y confidencialidad:</strong> Confirmo que soy Aliado acreditado de Capítulo Dos (C2), que usaré esta guía únicamente para consulta y preparación personal, y me comprometo a no copiar, imprimir, capturar pantalla ni difundir este material confidencial de Crear Poder Sin Límites.
            </span>
          </label>

          <div className="portal-form-actions">
            <button type="submit" className="primary-link portal-submit" disabled={submitting}>
              <CheckCircle2 size={18} />
              <span>{submitting ? 'Guardando y activando acceso...' : 'Guardar encuesta y abrir mi Guía C2'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminSheetsPanel({ user }) {
  const [surveys, setSurveys] = useState([]);
  const [authorized, setAuthorized] = useState([]);
  const [sessionsMap, setSessionsMap] = useState({});
  const [logs, setLogs] = useState([]);
  const [recordsMap, setRecordsMap] = useState({});
  const [bulkEmails, setBulkEmails] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadAdminData() {
    setLoading(true);
    try {
      const { db } = getPortalFirebase();
      const [survSnap, authSnap, recSnap, sesSnap, logSnap] = await Promise.all([
        getDocs(collection(db, 'encuestas_aliados')),
        getDocs(collection(db, 'aliados_autorizados')),
        getDocs(collection(db, 'records')),
        getDocs(collection(db, 'aliados_sesiones')),
        getDocs(query(collection(db, 'aliados_conexiones_log'), orderBy('createdAtIso', 'desc'), limit(60))),
      ]);
      setSurveys(survSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setAuthorized(authSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const rMap = {};
      recSnap.docs.forEach(d => { rMap[d.id] = d.data(); });
      setRecordsMap(rMap);
      const sMap = {};
      sesSnap.docs.forEach(d => { sMap[d.id] = d.data(); });
      setSessionsMap(sMap);
      setLogs(logSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      setStatusMsg(`Error cargando datos admin: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  async function handleBulkAuthorize(e) {
    e.preventDefault();
    const emails = bulkEmails
      .split(/[\n,;]+/)
      .map(s => s.trim().toLowerCase())
      .filter(s => s.includes('@') && s.length > 3);
    if (emails.length === 0) {
      setStatusMsg('Pega al menos un correo válido desde tu Google Sheet.');
      return;
    }
    setLoading(true);
    try {
      const { db } = getPortalFirebase();
      const batch = writeBatch(db);
      emails.forEach(email => {
        batch.set(doc(db, 'aliados_autorizados', email), {
          email,
          enabled: true,
          source: 'google_sheets_import',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      });
      await batch.commit();
      setBulkEmails('');
      setStatusMsg(`Se autorizaron ${emails.length} correo(s) desde Sheets correctamente.`);
      await loadAdminData();
    } catch (err) {
      setStatusMsg(`Error al importar correos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function toggleEmailAccess(emailId, currentEnabled) {
    try {
      const { db } = getPortalFirebase();
      await setDoc(doc(db, 'aliados_autorizados', emailId), {
        email: emailId,
        enabled: !currentEnabled,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      await loadAdminData();
    } catch (err) {
      setStatusMsg(`No se pudo actualizar ${emailId}: ${err.message}`);
    }
  }

  function handleExportSheetsCsv() {
    const headers = ['Correo', 'Nombre', 'Telefono', 'Sede', 'Equipo', 'Partner', 'Checks_Completados', 'Total_Checks', 'Detalle_Checks', 'Ultimo_Acceso', 'Dispositivo', 'Estado'];
    const rows = authorized.map(item => {
      const surv = surveys.find(s => s.email === item.email || s.uid === item.uid) || {};
      const uid = surv.uid || item.uid;
      const rec = (uid && recordsMap[uid]) || {};
      const ses = (uid && sessionsMap[uid]) || {};
      const comp = Array.isArray(rec.completed) ? rec.completed : [];
      return [
        item.email || item.id,
        surv.nombre || item.nombre || '',
        surv.telefono || item.telefono || '',
        surv.sede || item.sede || '',
        surv.equipo || item.equipo || '',
        surv.partner || item.partner || '',
        comp.length,
        preparation.length,
        comp.join(' | '),
        ses.lastSeenIso ? new Date(ses.lastSeenIso).toLocaleString('es-PE') : '—',
        ses.device || '—',
        item.enabled !== false ? 'AUTORIZADO' : 'DENEGADO',
      ];
    });
    exportRowsToCsv(`aliados-c2-encuestas-y-accesos-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  return (
    <section className="portal-admin-panel" aria-labelledby="admin-panel-title">
      <div className="section-heading">
        <h2 id="admin-panel-title"><Users size={22} /> Panel de Control · Conexiones, Encuestas y Denegación de Acceso</h2>
        <span>Admin: {user.email}</span>
      </div>
      <p className="schedule-note">
        También tienes este panel integrado directamente en <strong>Causa OS → Centro de Mando → Pestaña «🛡️ Aliados C2»</strong>. Desde cualquiera de los dos puedes monitorear quién se conecta en tiempo real y denegar o habilitar el acceso al instante.
      </p>

      {statusMsg && <p role="status" className="portal-status-banner">{statusMsg}</p>}

      <div className="portal-grid-2">
        <form onSubmit={handleBulkAuthorize} className="portal-subcard">
          <h3><Plus size={16} /> Importar correos desde Google Sheets</h3>
          <p>Copia la columna de correos de tu hoja de Google Sheets y pégala aquí (uno por línea o separados por coma):</p>
          <textarea
            rows={4}
            placeholder="aliado1@correo.com&#10;aliado2@correo.com"
            value={bulkEmails}
            onChange={e => setBulkEmails(e.target.value)}
          />
          <button type="submit" className="primary-link" disabled={loading}>
            Autorizar correos en Firebase
          </button>
        </form>

        <div className="portal-subcard">
          <h3><FileSpreadsheet size={16} /> Sincronización con Google Sheets</h3>
          <p>
            <strong>Encuestas registradas:</strong> {surveys.length} Aliados<br />
            <strong>Correos autorizados:</strong> {authorized.filter(a => a.enabled !== false).length} activos · {authorized.filter(a => a.enabled === false).length} denegados
          </p>
          <div className="portal-btn-group">
            <button type="button" className="primary-link" onClick={handleExportSheetsCsv}>
              <FileSpreadsheet size={16} /> Descargar CSV para Google Sheets
            </button>
            <button type="button" className="portal-btn-secondary" onClick={loadAdminData} disabled={loading}>
              Actualizar tabla
            </button>
          </div>
        </div>
      </div>

      <div className="portal-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th>Correo</th>
              <th>Nombre / Teléfono</th>
              <th>Sede / Equipo</th>
              <th>Partner</th>
              <th>Última Conexión / Dispositivo</th>
              <th>Preparación</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {authorized.map(item => {
              const surv = surveys.find(s => s.email === item.email || s.uid === item.uid);
              const uid = surv?.uid || item.uid;
              const rec = (uid && recordsMap[uid]) || null;
              const ses = (uid && sessionsMap[uid]) || null;
              const count = Array.isArray(rec?.completed) ? rec.completed.length : 0;
              const isEnabled = item.enabled !== false;
              return (
                <tr key={item.id}>
                  <td><strong>{item.email || item.id}</strong></td>
                  <td>
                    {surv?.nombre || item.nombre || 'Pendiente de encuesta'}
                    {surv?.telefono && <small>{surv.telefono}</small>}
                  </td>
                  <td>{surv ? `${surv.sede} · ${surv.equipo}` : (item.sede || '—')}</td>
                  <td>{surv?.partner || item.partner || '—'}</td>
                  <td>
                    {ses?.lastSeenIso ? (
                      <>
                        <strong>{new Date(ses.lastSeenIso).toLocaleString('es-PE')}</strong>
                        <small>{ses.device || ''} · {ses.lastAction || ''}</small>
                      </>
                    ) : 'Sin conexión'}
                  </td>
                  <td><strong>{count}/{preparation.length}</strong> {rec?.revision ? `(rev. ${rec.revision})` : ''}</td>
                  <td>
                    <span className={isEnabled ? 'badge-ok' : 'badge-revoked'}>
                      {isEnabled ? 'Autorizado' : 'Denegado'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="portal-btn-small"
                      onClick={() => toggleEmailAccess(item.id, isEnabled)}
                    >
                      {isEnabled ? 'Denegar acceso' : 'Permitir acceso'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {authorized.length === 0 && (
              <tr>
                <td colSpan={8}>Aún no hay correos registrados. Completa la encuesta o importa correos arriba.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {logs.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h3><Activity size={16} /> Bitácora en Vivo de Conexiones y Alertas Anti-Captura ({logs.length})</h3>
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Correo / Nombre</th>
                  <th>Sede / Equipo</th>
                  <th>Evento</th>
                  <th>Detalle / Dispositivo</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 25).map(l => (
                  <tr key={l.id}>
                    <td>{l.createdAtIso ? new Date(l.createdAtIso).toLocaleString('es-PE') : '—'}</td>
                    <td><strong>{l.email}</strong><small>{l.nombre}</small></td>
                    <td>{l.sede ? `${l.sede} · ${l.equipo || ''}` : '—'}</td>
                    <td>
                      <span className={String(l.action || '').includes('INTENTO') ? 'badge-revoked' : 'badge-ok'}>
                        {l.action}
                      </span>
                    </td>
                    <td>{l.details} <small>{l.device}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export function LoginScreen({ onError, errorMsg }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleGoogleLogin() {
    setBusy(true);
    onError('');
    try {
      const { auth, GoogleAuthProvider, signInWithPopup } = getPortalFirebase();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err) {
      onError(explainAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setBusy(true);
    onError('');
    try {
      const { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = getPortalFirebase();
      const cleanEmail = email.trim().toLowerCase();
      if (mode === 'register') {
        await createUserWithEmailAndPassword(auth, cleanEmail, password);
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
    } catch (err) {
      onError(explainAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="portal-auth-wrap">
      <div className="portal-card">
        <span className="portal-badge"><Lock size={13} /> Acceso exclusivo para Aliados C2</span>
        <h2>Ingresa con tu correo para abrir tu Guía y guardar tu avance</h2>
        <p>
          Al ingresar por primera vez completarás la breve encuesta de acreditación de Aliado C2. Tu progreso en las 9 misiones de preparación quedará guardado de forma segura bajo tu correo para que puedas consultarlo desde cualquier dispositivo.
        </p>

        {errorMsg && <div role="alert" className="portal-alert-error">{errorMsg}</div>}

        <div className="portal-google-box">
          <button type="button" className="primary-link portal-google-btn" onClick={handleGoogleLogin} disabled={busy}>
            <span>Continuar con cuenta de Google (@gmail / @crearpsl.net)</span>
            <ArrowUpRight size={18} />
          </button>
        </div>

        <div className="portal-divider"><span>o ingresa con tu correo y contraseña</span></div>

        <div className="portal-mode-tabs">
          <button
            type="button"
            aria-pressed={mode === 'login'}
            onClick={() => { setMode('login'); onError(''); }}
          >
            Ya tengo cuenta
          </button>
          <button
            type="button"
            aria-pressed={mode === 'register'}
            onClick={() => { setMode('register'); onError(''); }}
          >
            Primera vez (Crear acceso)
          </button>
        </div>

        <form onSubmit={handleEmailSubmit} className="portal-form">
          <label>
            <span>Correo electrónico</span>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={busy}
            />
          </label>
          <label>
            <span>Contraseña (mínimo 6 caracteres)</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={busy}
            />
          </label>
          <button type="submit" className="primary-link portal-submit" disabled={busy}>
            <span>{busy ? 'Verificando...' : (mode === 'register' ? 'Registrar mi correo y continuar a la encuesta' : 'Entrar a mi Guía C2')}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

function explainAuthError(err) {
  const code = err?.code || '';
  if (code === 'auth/unauthorized-domain' || (err?.message && err.message.includes('auth/unauthorized-domain'))) {
    return `⚠️ Dominio no autorizado en Firebase (${typeof window !== 'undefined' ? window.location.hostname : 'este dominio'}). Para ingresar con Google, este dominio debe agregarse en Firebase Console > Authentication > Settings > Authorized domains. Mientras tanto, puedes iniciar sesión o crear tu contraseña en el formulario inferior.`;
  }
  if (code.includes('configuration-not-found') || code.includes('operation-not-allowed')) {
    return 'Falta activar el proveedor de acceso (Google / Correo) en Firebase Console -> Authentication -> Sign-in method.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Correo o contraseña incorrectos. Si es tu primera vez, pulsa en "Primera vez (Crear acceso)".';
  }
  if (code === 'auth/email-already-in-use') {
    return 'Este correo ya está registrado. Cambia a la pestaña "Ya tengo cuenta" para entrar.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Se cerró la ventana de Google antes de completar el ingreso.';
  }
  return err?.message || 'Error al autenticar. Intenta nuevamente.';
}

export function PortalApp() {
  const [phaseId, setPhaseId] = useState(phaseFromHash);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [survey, setSurvey] = useState(null);
  const [authorizedDoc, setAuthorizedDoc] = useState(null);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [securityWarning, setSecurityWarning] = useState('');
  const [screenShielded, setScreenShielded] = useState(false);

  const [record, setRecord] = useState(null);
  const [events, setEvents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [message, setMessage] = useState('');
  const [openReferences, setOpenReferences] = useState([]);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const update = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'todo' || phases.some(phase => phase.id === hash)) setPhaseId(hash);
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  useEffect(() => {
    if (window.location.hash === `#${phaseId}`) {
      document.getElementById(phaseId)?.scrollIntoView();
    }
  }, [phaseId]);

  // Protección anti-impresión, anti-copia y anti-captura de pantalla
  useEffect(() => {
    const { db } = getPortalFirebase();

    const triggerProtectionWarning = (reason, code) => {
      setSecurityWarning(reason);
      setScreenShielded(true);
      if (user) {
        logSecurityOrSessionEvent(db, user, survey, code, reason);
      }
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

  useEffect(() => {
    const { auth, db, onAuthStateChanged } = getPortalFirebase();
    let unsubRecord = null;
    let unsubEvents = null;
    let unsubAuthDoc = null;
    let heartbeatTimer = null;

    const unsubAuth = onAuthStateChanged(auth, async currentUser => {
      unsubRecord?.();
      unsubEvents?.();
      unsubAuthDoc?.();
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      unsubRecord = null;
      unsubEvents = null;
      unsubAuthDoc = null;
      setRecord(null);
      setEvents([]);
      setSurvey(null);
      setAuthorizedDoc(null);
      setUser(currentUser);
      setAuthReady(true);

      if (!currentUser) {
        setCheckingProfile(false);
        return;
      }

      setCheckingProfile(true);
      try {
        const emailLower = String(currentUser.email || '').trim().toLowerCase();
        const [survSnap, authSnap] = await Promise.all([
          getDoc(doc(db, 'encuestas_aliados', currentUser.uid)).catch(() => null),
          emailLower ? getDoc(doc(db, 'aliados_autorizados', emailLower)).catch(() => null) : Promise.resolve(null),
        ]);

        const survData = survSnap?.exists() ? survSnap.data() : null;
        const authData = authSnap?.exists() ? authSnap.data() : null;
        setSurvey(survData);
        setAuthorizedDoc(authData);

        await logSecurityOrSessionEvent(db, currentUser, survData, 'LOGIN', 'Ingreso a Guía de Aliados C2');

        // Escucha en vivo de autorización (si el admin deniega acceso en Centro de Mando, se bloquea en tiempo real)
        if (emailLower) {
          unsubAuthDoc = onSnapshot(doc(db, 'aliados_autorizados', emailLower), snap => {
            if (snap.exists()) {
              setAuthorizedDoc(snap.data());
            }
          }, () => {});
        }

        let localCached = [];
        try {
          const raw = localStorage.getItem(`c2_checklist_${currentUser.uid}`);
          if (raw) localCached = JSON.parse(raw);
        } catch {}

        unsubRecord = onSnapshot(doc(db, 'records', currentUser.uid), snap => {
          if (snap.exists()) {
            const data = snap.data();
            const serverCompleted = Array.isArray(data.completed) ? data.completed : [];
            const bestCompleted = serverCompleted.length > 0 ? serverCompleted : (localCached.length > 0 ? localCached : serverCompleted);
            setRecord({ ...data, completed: bestCompleted });
          } else {
            setRecord({ uid: currentUser.uid, completed: localCached, revision: 0 });
          }
        }, () => {
          setRecord({ uid: currentUser.uid, completed: localCached, revision: 0 });
        });

        unsubEvents = onSnapshot(
          query(collection(db, 'records', currentUser.uid, 'events'), orderBy('revision', 'desc')),
          snap => {
            setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          },
          () => {}
        );

        heartbeatTimer = setInterval(() => {
          setDoc(doc(db, 'aliados_sesiones', currentUser.uid), {
            uid: currentUser.uid,
            email: emailLower,
            lastSeenAt: serverTimestamp(),
            lastSeenIso: new Date().toISOString(),
          }, { merge: true }).catch(() => {});
        }, 60000);
      } finally {
        setCheckingProfile(false);
      }
    });

    return () => {
      unsubRecord?.();
      unsubEvents?.();
      unsubAuthDoc?.();
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      unsubAuth();
    };
  }, []);

  async function handleLogout() {
    const { auth, db, signOut } = getPortalFirebase();
    if (user) {
      await logSecurityOrSessionEvent(db, user, survey, 'LOGOUT', 'Cierre de sesión manual');
    }
    await signOut(auth);
    setMessage('');
  }

  async function performAction(action, optimisticCompleted, optimisticRevision) {
    if (!user) return;
    setMessage('Sincronizando...');
    try {
      const { db } = getPortalFirebase();
      const uid = user.uid;
      const emailLower = String(user.email || '').trim().toLowerCase();
      const eventId = doc(collection(db, 'records', uid, 'events')).id;

      const finalCompleted = optimisticCompleted !== undefined
        ? optimisticCompleted
        : (action.kind === 'reset' ? [] : (record?.completed ?? []));
      const finalRevision = optimisticRevision !== undefined
        ? optimisticRevision
        : ((record?.revision ?? 0) + 1);

      if (action.kind === 'reset') {
        setRecord(prev => ({
          ...(prev || {}),
          uid,
          email: emailLower,
          completed: [],
          revision: finalRevision,
        }));
        try {
          localStorage.setItem(`c2_checklist_${uid}`, JSON.stringify([]));
        } catch {}
      }

      await setDoc(doc(db, 'records', uid), {
        uid,
        email: emailLower,
        completed: finalCompleted,
        revision: finalRevision,
        lastEventId: eventId,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setDoc(doc(db, 'records', uid, 'events', eventId), {
        uid,
        completed: finalCompleted,
        revision: finalRevision,
        kind: action.kind,
        target: action.target,
        createdAt: serverTimestamp(),
      }).catch(err => console.warn('Evento de checklist en segundo plano:', err));

      logSecurityOrSessionEvent(
        db,
        user,
        survey,
        action.kind === 'check' ? 'CHECK_MISION' : action.kind === 'uncheck' ? 'UNCHECK_MISION' : 'RESET_MISIONES',
        `${action.target} (${finalCompleted.length}/${preparation.length})`
      );

      setMessage(`Guardado en tu cuenta (${finalCompleted.length}/${preparation.length}).`);
    } catch (err) {
      console.warn('Error sincronizando checklist C2 en la nube:', err);
      setMessage(`Guardado localmente (${record?.completed?.length || 0}/${preparation.length}).`);
    }
  }

  function toggle(id) {
    if (!user) return;
    const completedList = record?.completed ?? [];
    const isChecked = completedList.includes(id);
    const nextCompleted = isChecked
      ? completedList.filter(item => item !== id)
      : [...completedList, id];

    const nextRevision = (record?.revision ?? 0) + 1;

    // Actualización optimista inmediata en UI sin demoras
    setRecord(prev => ({
      ...(prev || {}),
      uid: user.uid,
      email: user.email,
      completed: nextCompleted,
      revision: nextRevision,
    }));

    // Respaldo en localStorage inmediato
    try {
      localStorage.setItem(`c2_checklist_${user.uid}`, JSON.stringify(nextCompleted));
    } catch {}

    performAction({ kind: isChecked ? 'uncheck' : 'check', target: id }, nextCompleted, nextRevision);
  }

  const completed = record?.completed ?? [];
  const count = completed.length;
  const currentPhase = phases.find(phase => phase.id === phaseId);
  const isRevoked = authorizedDoc && authorizedDoc.enabled === false && !isAdminEmail(user?.email);

  return (
    <div className={`portal-protected-root ${screenShielded ? 'portal-screen-shielded' : ''}`}>
      {/* Marca de agua dinámica anti-captura con el correo del usuario conectado */}
      {user && (
        <div className="portal-watermark" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, idx) => (
            <span key={idx}>
              CONFIDENCIAL CREAR · {user.email} · {survey?.nombre || 'ALIADO C2'} · PROHIBIDA SU COPIA O CAPTURA
            </span>
          ))}
        </div>
      )}

      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <div id="todo" className="preview-notice">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>
          Guía Oficial Protegida de Aliados C2 · {user ? `Sesión auditada: ${user.email}` : 'Acceso con Encuesta y Guardado Personal por Correo'} · Prohibida su impresión o captura
        </span>
      </div>

      {securityWarning && (
        <div role="alert" className="portal-security-toast">
          <ShieldAlert size={18} />
          <span>{securityWarning}</span>
          <button type="button" onClick={() => setSecurityWarning('')}>Entendido</button>
        </div>
      )}

      <header className="brand-bar">
        <a className="brand" href="#todo" aria-label="CREAR Poder sin límites, ver agenda completa">
          <img src={crearLogo} alt="CREAR · Poder sin límites" width="270" height="360" onError={() => setLogoError(true)} hidden={logoError} />
          {logoError && <span role="alert">CREAR · No se pudo cargar el logo. Recarga la página.</span>}
        </a>
        <span className="guide-label">Guía del Partner · C2 (Solo Lectura en Pantalla)</span>

        <div className="portal-header-actions">
          {user && isAdminEmail(user.email) && (
            <button type="button" className="print-button" onClick={() => setShowAdmin(v => !v)}>
              <FileSpreadsheet size={17} aria-hidden="true" />
              <span>{showAdmin ? 'Ocultar Panel Admin' : 'Panel Conexiones / Accesos'}</span>
            </button>
          )}
          {user && survey && (
            <button type="button" className="print-button" onClick={() => setEditingSurvey(true)}>
              <span>Mi encuesta ({survey.sede})</span>
            </button>
          )}
          {user && (
            <button type="button" className="print-button" onClick={handleLogout}>
              <LogOut size={17} aria-hidden="true" /><span>Salir</span>
            </button>
          )}
        </div>
      </header>

      {!authReady || checkingProfile ? (
        <main className="portal-auth-wrap">
          <div className="portal-card">
            <h2>Verificando tu acceso y progreso guardado...</h2>
            <p>Conectando de forma segura con el servidor de Aliados C2.</p>
          </div>
        </main>
      ) : !user ? (
        <main id="contenido">
          <LoginScreen onError={setAuthError} errorMsg={authError} />
        </main>
      ) : isRevoked ? (
        <main className="portal-auth-wrap">
          <div className="portal-card">
            <h2>🚫 Acceso Denegado por Administración</h2>
            <p>Tu correo <strong>{user.email}</strong> tiene el acceso revocado o denegado en el Centro de Mando de Causa OS. No tienes autorización para visualizar esta guía.</p>
            <button type="button" className="print-button" onClick={handleLogout}>Cerrar sesión</button>
          </div>
        </main>
      ) : (!survey || editingSurvey) ? (
        <main id="contenido">
          <SurveyGate
            user={user}
            existingSurvey={survey}
            onCompleted={saved => {
              setSurvey(saved);
              setAuthorizedDoc({ email: saved.email, enabled: true });
              setEditingSurvey(false);
            }}
            onLogout={handleLogout}
          />
        </main>
      ) : (!isAdminEmail(user?.email) && evaluateAccessValidity(survey, 'C2').isExpired) ? (
        <main className="portal-auth-wrap" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
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
              Hola, <strong>{survey.nombre || user.displayName || user.email}</strong>. Tu servicio como Aliado en <strong>{evaluateAccessValidity(survey, 'C2').equipoLabel || survey.equipo}</strong> ({survey.sede}) ha finalizado su ciclo oficial de entrenamiento.
            </p>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', lineHeight: '1.55' }}>
                🔒 <strong>Políticas de Confidencialidad y Retiro Automático:</strong> El acceso a los manuales, roleplays y checklists de Capítulo Dos se cierra de manera automática al concluir el fin de semana del entrenamiento. Agradecemos tu entrega y liderazgo impecable durante este ciclo.
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
                onClick={() => setEditingSurvey(true)}
                className="primary-link"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.65rem 1.25rem' }}
              >
                Registrarme en Siguiente Generación
              </button>
            </div>
          </div>
        </main>
      ) : (
        <div className="page-shell">
          <aside className="wayfinding" aria-label="Índice de la guía">
            <nav aria-label="Cronograma por fase">
              <p className="nav-title">Tu recorrido</p>
              <a className="all-phases" href="#todo" aria-current={phaseId === 'todo' ? 'location' : undefined}>Agenda completa <ArrowUpRight size={16} aria-hidden="true" /></a>
              {phases.map((phase, index) => (
                <a key={phase.id} href={`#${phase.id}`} aria-current={phaseId === phase.id ? 'location' : undefined} className="phase-link">
                  <span className="phase-index">{index + 1}</span><span>{phase.short}<small>{phase.period}</small></span>
                </a>
              ))}
            </nav>
            <nav className="secondary-nav" aria-label="Recursos de preparación">
              <a href="#roleplays">5. Manejo de Conversaciones</a>
              <a href="#agenda">6. Cronograma de Ejecución</a>
              <a href="#preparacion">Mi preparación <span>{count}/{preparation.length}</span></a>
              <a href="#consulta">Consulta rápida <ArrowDown size={15} aria-hidden="true" /></a>
              <a href="#criterios">Fuente y cuidados</a>
              <a href="#privacidad">Privacidad y derechos</a>
            </nav>
            <p className="sidebar-note">
              Aliado: <strong>{survey.nombre}</strong><br />
              Equipo: {survey.equipo}<br />
              Partner: {survey.partner}<br />
              🔒 Documento protegido contra impresión y capturas.
            </p>
          </aside>

          <main id="contenido" tabIndex="-1">
            {showAdmin && isAdminEmail(user.email) && <AdminSheetsPanel user={user} />}

            <section className="opening" aria-labelledby="page-title">
              <div className="opening-copy">
                <h1 id="page-title">Guía Práctica Operativa:<br /><span>Aliado de Capítulo Dos (C2).</span></h1>
                <p>{guideIntro.lead}</p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                  <a className="primary-link" href="#roleplays">5. Manejo de Conversaciones <ArrowDown size={17} aria-hidden="true" /></a>
                  <a className="primary-link" href="#agenda" style={{ background: '#334155' }}>6. Cronograma de Ejecución <ArrowDown size={17} aria-hidden="true" /></a>
                  <a className="primary-link" href="https://docs.google.com/document/d/1ubNOKNuMYk5tZkUJwygQG7cs3haUb_oHqgA4U5Dmb6A/edit" target="_blank" rel="noreferrer" style={{ background: 'rgba(56,189,248,0.18)', border: '1px solid #38bdf8' }}>Doc Oficial Drive (v2) <ExternalLink size={16} /></a>
                </div>
              </div>
              <div className="chapter-mark" aria-hidden="true"><span>C</span><span>2</span><div className="chapter-line" /></div>
              <div className="route-strip" aria-label="Secuencia de fases">
                {phases.map((phase, i) => <a key={phase.id} href={`#${phase.id}`}><span>Fase {i + 1}</span>{phase.short}<ArrowUpRight size={16} aria-hidden="true" /></a>)}
              </div>
            </section>

            <section className="service-status" aria-labelledby="service-status-title">
              <h2 id="service-status-title">Tu progreso personal está sincronizado con tu correo ({user.email})</h2>
              <p>
                Hola <strong>{survey.nombre}</strong> ({survey.sede} · {survey.equipo} · Partner: {survey.partner}). Como <strong>Partner Motor de Riesgo</strong>, tu palabra es ley. Marca y lleva el control de tus {preparation.length} acuerdos de preparación y misiones estándar de los groundings aquí; tu progreso queda guardado en tiempo real bajo tu correo.
              </p>
              <a href="#preparacion">Ir a mis Misiones y Preparación ({count}/{preparation.length}) <ArrowDown size={16} aria-hidden="true" /></a>
            </section>

            <div className="working-spread">
              <section id="agenda" className="agenda" aria-labelledby="agenda-title">
                <div className="section-heading"><h2 id="agenda-title">6. Cronograma Operativo de Ejecución</h2><span>Secuencia paso a paso</span></div>
                <p className="schedule-note">Todos los Aliados deben estar en tiempo y forma en todos los momentos, groundings y citas iniciales, sin excusas y sin excepciones.</p>
                <p className="filter-status" aria-live="polite">{currentPhase ? `Mostrando: ${currentPhase.short}.` : 'Mostrando las cuatro fases.'} {currentPhase && <a href="#todo">Ver agenda completa</a>}</p>
                {phases.map((phase, index) => (
                  <section key={phase.id} id={phase.id} className={`schedule-phase ${phaseId !== 'todo' && phaseId !== phase.id ? 'phase-hidden' : ''}`} aria-labelledby={`${phase.id}-title`}>
                    <div className="phase-heading"><span className="phase-number">{index + 1}</span><div><h3 id={`${phase.id}-title`}>{phase.title}</h3><p>{phase.period}</p></div></div>
                    <p className="phase-description">{phase.description}</p>
                    <ol className="events">
                      {phase.events.map(([day, time, title, detail], eventIndex) => (
                        <li key={`${phase.id}-${eventIndex}`}>
                          <div className="event-time"><span>{time}</span><small>{day}</small></div>
                          <div className="event-body"><h4>{title}</h4><p>{detail}</p></div>
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
              </section>

              <aside id="preparacion" className="preparation" aria-labelledby="preparation-title">
                <h2 id="preparation-title">Mi preparación</h2>
                <p>Marca tus acuerdos conforme los completes. Se guardan asociados a <strong>{user.email}</strong> (Revisión #{record?.revision ?? 0}).</p>
                <div className="progress-label"><strong>{count} de {preparation.length}</strong><span>{count === preparation.length ? 'Todo completado' : 'completado'}</span></div>
                <progress value={count} max={preparation.length} aria-label="Preparación completada" />
                <p role="status" className="save-status">{message}</p>
                <ul className="checklist">
                  {preparation.map(item => (
                    <li key={item.id}>
                      <label style={{ cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={completed.includes(item.id)}
                          onChange={() => toggle(item.id)}
                          aria-describedby="preparation-mode"
                          style={{ cursor: 'pointer' }}
                        />
                        <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                      </label>
                    </li>
                  ))}
                </ul>
                <p id="preparation-mode" className="local-note">
                  Sincronización en tiempo real activa. Historial de eventos auditados: {events.length}.
                </p>
                {!resetPending ? (
                  <button className="reset-button" disabled={count === 0} onClick={() => setResetPending(true)}>
                    <RotateCcw size={15} aria-hidden="true" />Reiniciar mis marcas
                  </button>
                ) : (
                  <div className="reset-confirm">
                    <p>¿Reiniciar todas tus casillas de preparación? (El historial de revisiones se conserva).</p>
                    <button onClick={() => { performAction({ kind: 'reset', target: 'preparation' }); setResetPending(false); }}>
                      Sí, reiniciar marcas
                    </button>
                    <button onClick={() => setResetPending(false)}>Conservar marcas</button>
                  </div>
                )}
                <div className="complete-message" hidden={count !== preparation.length}>
                  <Check size={18} aria-hidden="true" />¡Preparación {count}/{preparation.length} completada y guardada en tu cuenta!
                </div>
              </aside>
            </div>

            {/* SECCIÓN 5: TIPS DE MANEJO DE CONVERSACIONES Y LLAMADO A LA ACCIÓN (C2 Y MJ) */}
            <section id="roleplays" className="quick-reference" style={{ marginTop: '2.5rem' }}>
              <div className="section-heading">
                <h2 id="roleplay-title">5. Tips de Manejo de Conversaciones y Llamado a la Acción (Mesa y Seguimiento C2)</h2>
                <span>Interrupción Asertiva, Entrega Limpia en Mesa y Cierre Adulto a Adulto</span>
              </div>
              <p>
                El Aliado de C2 no compra historias ni valida justificaciones. En el llamado a la acción del domingo, superamos el pánico dominical siendo irrazonables de manera coherente y contextual: si es un SÍ, llevar de inmediato a Mesa (¡allí se ocupan!); si es un NO rotundo, dignidad y adueñamiento 100%; y ante conversaciones de tiempo o dinero, aislar la variable y confrontar la postergación en menos de 90 segundos:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
                {roleplays.map((rp) => (
                  <div key={rp.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                      <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                        ESCENARIO {rp.numero}
                      </span>
                      <h3 style={{ margin: '0.5rem 0 0.2rem 0', color: '#f8fafc', fontSize: '1.05rem', fontWeight: 800 }}>
                        «{rp.titulo}»
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                        <strong>Contexto:</strong> {rp.contexto}
                      </p>
                    </div>

                    <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderLeft: '3px solid #ef4444', padding: '0.75rem', borderRadius: '4px' }}>
                      <strong style={{ fontSize: '0.75rem', color: '#fca5a5', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                        ⚡ Interrupción Asertiva
                      </strong>
                      <div style={{ fontSize: '0.85rem', color: '#f8fafc', fontStyle: 'italic' }}>
                        {rp.interrupcion}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(14, 165, 233, 0.08)', borderLeft: '3px solid #0ea5e9', padding: '0.75rem', borderRadius: '4px' }}>
                      <strong style={{ fontSize: '0.75rem', color: '#7dd3fc', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                        🎯 Fórmula de Movimiento
                      </strong>
                      <div style={{ fontSize: '0.85rem', color: '#f8fafc' }}>
                        {rp.formula}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderLeft: '3px solid #10b981', padding: '0.75rem', borderRadius: '4px' }}>
                      <strong style={{ fontSize: '0.75rem', color: '#6ee7b7', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                        🔒 Cierre Concreto
                      </strong>
                      <div style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 600 }}>
                        {rp.cierre}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section id="consulta" className="quick-reference" aria-labelledby="reference-title">
              <div className="section-heading"><h2 id="reference-title">1–4 y 7–8 · Marco Operativo, Grounding, Misiones y Socios de Vida</h2><span>Partner Motor de Riesgo · Programa de Resultados</span></div>
              <p>Despliega cada sección para revisar el marco completo de postura, reconocimiento orgánico, estándares del Grounding Virtual, herramientas de conversación, misiones estándar y Socios de Vida.</p>
              {reference.map((item, index) => (
                <details key={item.title} open={openReferences.includes(index)} onToggle={event => {
                  const isOpen = event.currentTarget.open;
                  setOpenReferences(items => isOpen ? [...new Set([...items, index])] : items.filter(itemIndex => itemIndex !== index));
                }}>
                  <summary>{item.title}<span className="details-sign" aria-hidden="true">+</span></summary>
                  <div className="reference-body">
                    {item.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                    <div className="care-note"><strong>Distinción Clave</strong><p>{item.care}</p></div>
                  </div>
                </details>
              ))}
            </section>

            <section id="privacidad" className="privacy-section" aria-labelledby="privacy-title">
              <div className="section-heading"><h2 id="privacy-title">{legalNotice.heading}</h2><span>{legalNotice.subtitle}</span></div>
              {legalNotice.clauses.map(clause => (
                <div key={clause.title}>
                  <h3>{clause.title}</h3>
                  <p>{clause.body}</p>
                </div>
              ))}
              <h3>Protección Técnica Contra Duplicación, Impresión y Capturas</h3>
              <p>Esta guía cuenta con marca de agua identificatoria vinculada a tu sesión ({user.email}), bloqueo de impresión y registro automático de intentos de copia o captura en el Centro de Mando de Causa OS.</p>
            </section>

            <footer id="criterios">
              <h2>Ser Tu Palabra.<br />Partner Motor de Riesgo · Capítulo Dos (C2).</h2>
              <p>Guía Práctica Operativa: Aliado de Capítulo Dos (C2) dentro del Programa de Resultados · Crear Poder Sin Límites.</p>
              <div className="footer-line"><span>CREAR · Aliados C2 · Programa de Resultados</span><a href="#privacidad">Aviso de Propiedad Intelectual y Confidencialidad</a><a href="#todo">Volver al inicio <ArrowUpRight size={16} aria-hidden="true" /></a></div>
            </footer>
          </main>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<PortalApp />);
