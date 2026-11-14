import { useState, useEffect, useMemo } from 'react';
import { isLimaOnlyScopedUser } from '../config/permissions';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  CheckCircle2,
  Clock,
  Ban,
  Unlock,
  Download,
  Upload,
  Search,
  ExternalLink,
  Activity,
  Phone,
  Building2,
  UserCheck,
  AlertTriangle,
  Eye,
  ChevronDown,
  ChevronRight,
  Lock,
  BookOpen,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OFFICIAL_SEDES, evaluateAccessValidity } from '../data/aliadosVigenciaConfig';

const ALIADOS_C1_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCTMrA6A64s1ppDBBsol-fqam5Vch_Q5B0',
  authDomain: 'centro-operativo-cpsl.firebaseapp.com',
  projectId: 'centro-operativo-cpsl',
  storageBucket: 'centro-operativo-cpsl.firebasestorage.app',
  messagingSenderId: '122588918051',
  appId: '1:122588918051:web:c85d6835b1b1f920fb1c96',
};

const ADMIN_CONTROL_TOKEN = 'CAUSA_OS_SUPERADMIN_C1_2026';

const PREPARATION_LABELS_C1 = [
  { id: 'proposito', title: '1. Declaración del Propósito (1 a 2 Meses / Corto Plazo) en WhatsApp' },
  { id: 'video_enrolamiento', title: '2. Video de Enrolamiento (15s) en chat de Aliados' },
  { id: 'cambio_cupo', title: '3. Gestión y Cambio de Cupo / Nombre' },
  { id: 'tecnica', title: '4. Verificación Técnica Previa (Grounding Virtual 20:00 hrs)' },
  { id: 'roleplay_presencial', title: '5. Demostración Presencial de Roleplay (Jueves 18:00 hrs)' },
];

function formatHumanName(rawName, email = '') {
  if (rawName && typeof rawName === 'string') {
    const trimmed = rawName.trim();
    if (trimmed && trimmed.toLowerCase() !== 'sin nombre' && trimmed.toLowerCase() !== 'no especificado' && trimmed.toLowerCase() !== 'pendiente') {
      return trimmed;
    }
  }
  if (!email) return 'Aliado C1';
  const cleanEmail = String(email).toLowerCase().trim();
  if (cleanEmail === 'comunidadcrearpsl@gmail.com') return 'José Sánchez';
  if (cleanEmail === 'diana.moscoso@crearpsl.net') return 'Diana Moscoso';
  if (cleanEmail === 'joyce.marin@crearpsl.net') return 'Joyce Marín';

  const prefix = cleanEmail.split('@')[0] || '';
  const cleaned = prefix.replace(/[._-]+/g, ' ').trim();
  if (!cleaned) return 'Aliado C1';
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function getAliadosC1Db() {
  const appName = 'aliados-c1-command-bridge';
  const existing = getApps().find((a) => a.name === appName);
  const app = existing || initializeApp(ALIADOS_C1_FIREBASE_CONFIG, appName);
  return getFirestore(app);
}

function formatDateTime(tsOrIso) {
  if (!tsOrIso) return 'Sin registro';
  try {
    const d = tsOrIso?.toDate ? tsOrIso.toDate() : new Date(tsOrIso);
    if (isNaN(d.getTime())) return String(tsOrIso);
    return d.toLocaleString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(tsOrIso);
  }
}

function isRecentlyActive(tsOrIso, minutes = 5) {
  if (!tsOrIso) return false;
  try {
    const d = tsOrIso?.toDate ? tsOrIso.toDate() : new Date(tsOrIso);
    if (isNaN(d.getTime())) return false;
    return Date.now() - d.getTime() <= minutes * 60 * 1000;
  } catch {
    return false;
  }
}

export default function AliadosC1AdminPanel({ currentUser, onToggleGuideView }) {
  const navigate = useNavigate();
  const [autorizados, setAutorizados] = useState([]);
  const [encuestas, setEncuestas] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [records, setRecords] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const limaOnly = isLimaOnlyScopedUser(currentUser);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sedeFilter, setSedeFilter] = useState(limaOnly ? 'Lima' : 'ALL');
  const [expandedRow, setExpandedRow] = useState(null);
  const [bulkEmails, setBulkEmails] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [actionBanner, setActionBanner] = useState('');
  const [processingEmail, setProcessingEmail] = useState(null);

  useEffect(() => {
    const c1Db = getAliadosC1Db();
    let loadedCount = 0;
    const markLoaded = () => {
      loadedCount += 1;
      if (loadedCount >= 3) setLoading(false);
    };

    const unsubAuth = onSnapshot(
      collection(c1Db, 'aliados_autorizados'),
      (snap) => {
        setAutorizados(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        markLoaded();
      },
      () => markLoaded()
    );

    const unsubEncuestas = onSnapshot(
      collection(c1Db, 'encuestas_aliados'),
      (snap) => {
        setEncuestas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        markLoaded();
      },
      () => markLoaded()
    );

    const unsubSesiones = onSnapshot(
      collection(c1Db, 'aliados_sesiones'),
      (snap) => {
        setSesiones(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        markLoaded();
      },
      () => markLoaded()
    );

    const unsubRecords = onSnapshot(
      collection(c1Db, 'records'),
      (snap) => {
        setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      () => {}
    );

    const unsubLogs = onSnapshot(
      collection(c1Db, 'aliados_conexiones_log'),
      (snap) => {
        const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        raw.sort((a, b) => {
          const tA = new Date(a.createdAtIso || a.timestampIso || (a.createdAt?.toDate ? a.createdAt.toDate() : 0)).getTime();
          const tB = new Date(b.createdAtIso || b.timestampIso || (b.createdAt?.toDate ? b.createdAt.toDate() : 0)).getTime();
          return tB - tA;
        });
        setLogs(raw.slice(0, 150));
      },
      (err) => {
        console.warn('Error escuchando logs de C1:', err);
      }
    );

    return () => {
      unsubAuth();
      unsubEncuestas();
      unsubSesiones();
      unsubRecords();
      unsubLogs();
    };
  }, []);

  // Unificar toda la información por correo electrónico
  const unifiedRows = useMemo(() => {
    const byEmail = new Map();

    const ensureEntry = (rawEmail, uid = '') => {
      const email = (rawEmail || '').trim().toLowerCase();
      if (!email && !uid) return null;
      const key = email || uid;
      if (!byEmail.has(key)) {
        byEmail.set(key, {
          email: email || 'sin-correo',
          uid: uid || '',
          nombre: '',
          telefono: '',
          sede: '',
          equipo: '',
          partner: '',
          enabled: true,
          compromiso: false,
          surveyCompletedAt: null,
          lastSeenAt: null,
          lastSeenIso: null,
          lastLoginAt: null,
          lastLoginIso: null,
          lastAction: '',
          lastDetail: '',
          device: '',
          completed: [],
          recordUpdatedAt: null,
          securityAlertsCount: 0,
          securityAlerts: [],
        });
      }
      return byEmail.get(key);
    };

    autorizados.forEach((a) => {
      const item = ensureEntry(a.email || a.id, a.uid);
      if (!item) return;
      if (a.enabled === false) item.enabled = false;
      if (a.nombre && !item.nombre) item.nombre = a.nombre;
      if (a.telefono && !item.telefono) item.telefono = a.telefono;
      if (a.sede && !item.sede) item.sede = a.sede;
      if (a.equipo && !item.equipo) item.equipo = a.equipo;
      if (a.partner && !item.partner) item.partner = a.partner;
    });

    encuestas.forEach((e) => {
      const item = ensureEntry(e.email, e.uid || e.id);
      if (!item) return;
      item.nombre = e.nombre || item.nombre;
      item.telefono = e.telefono || item.telefono;
      item.sede = e.sede || item.sede;
      item.equipo = e.equipo || item.equipo;
      item.partner = e.partner || item.partner;
      item.compromiso = Boolean(e.compromiso);
      item.surveyCompletedAt = e.updatedAt || e.createdAt || null;
    });

    sesiones.forEach((s) => {
      const item = ensureEntry(s.email, s.uid || s.id);
      if (!item) return;
      if (s.nombre && !item.nombre) item.nombre = s.nombre;
      if (s.telefono && !item.telefono) item.telefono = s.telefono;
      if (s.sede && !item.sede) item.sede = s.sede;
      if (s.equipo && !item.equipo) item.equipo = s.equipo;
      if (s.partner && !item.partner) item.partner = s.partner;
      item.lastSeenAt = s.lastSeenAt || item.lastSeenAt;
      item.lastSeenIso = s.lastSeenIso || item.lastSeenIso;
      item.lastLoginAt = s.lastLoginAt || item.lastLoginAt;
      item.lastLoginIso = s.lastLoginIso || item.lastLoginIso;
      item.lastAction = s.lastAction || item.lastAction;
      item.lastDetail = s.lastDetail || item.lastDetail;
      item.device = s.device || item.device;
      if (Array.isArray(s.completed) && s.completed.length > item.completed.length) {
        item.completed = s.completed;
      }
    });

    records.forEach((r) => {
      let item = null;
      if (r.email) {
        item = ensureEntry(r.email, r.uid || r.id);
      } else {
        for (const candidate of byEmail.values()) {
          if (candidate.uid === (r.uid || r.id)) {
            item = candidate;
            break;
          }
        }
      }
      if (item && Array.isArray(r.completed)) {
        item.completed = r.completed;
        item.recordUpdatedAt = r.updatedAt || null;
      }
    });

    logs.forEach((l) => {
      const act = String(l.action || '').toUpperCase();
      const isAlert = act.includes('BLOQUEADO') || act.includes('INTENTO') || act.includes('CAPTURA') || act.includes('IMPRESION') || act.includes('COPIA');
      if (!isAlert) return;
      const item = ensureEntry(l.email, l.uid);
      if (!item) return;
      item.securityAlertsCount += 1;
      item.securityAlerts.push(l);
    });

    const rows = Array.from(byEmail.values()).map((item) => ({
      ...item,
      nombre: formatHumanName(item.nombre, item.email),
    })).sort((a, b) => {
      const aTime = a.lastSeenIso || a.lastLoginIso || '';
      const bTime = b.lastSeenIso || b.lastLoginIso || '';
      return bTime.localeCompare(aTime);
    });
    return limaOnly ? rows.filter((item) => String(item.sede || '').toLowerCase().includes('lima')) : rows;
  }, [autorizados, encuestas, sesiones, records, logs, limaOnly]);

  const visibleLogs = useMemo(() => {
    if (!limaOnly) return logs;
    return logs.filter((log) => String(log.sede || '').toLowerCase().includes('lima'));
  }, [logs, limaOnly]);

  const filteredRows = useMemo(() => {
    return unifiedRows.filter((r) => {
      if (statusFilter === 'ONLINE' && !isRecentlyActive(r.lastSeenAt || r.lastSeenIso)) return false;
      if (statusFilter === 'AUTHORIZED' && r.enabled === false) return false;
      if (statusFilter === 'DENIED' && r.enabled !== false) return false;
      if (statusFilter === 'ALERTS' && r.securityAlertsCount === 0) return false;

      if (sedeFilter !== 'ALL' && (r.sede || '').toLowerCase() !== sedeFilter.toLowerCase()) return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase().trim();
      return (
        (r.nombre || '').toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q) ||
        (r.sede || '').toLowerCase().includes(q) ||
        (r.equipo || '').toLowerCase().includes(q) ||
        (r.partner || '').toLowerCase().includes(q) ||
        (r.telefono || '').toLowerCase().includes(q)
      );
    });
  }, [unifiedRows, statusFilter, sedeFilter, searchTerm]);

  const handleToggleAccess = async (row, nextEnabled) => {
    if (!row.email || row.email === 'sin-correo') return;
    const emailKey = row.email.trim().toLowerCase();
    setProcessingEmail(emailKey);
    try {
      const c1Db = getAliadosC1Db();
      await setDoc(
        doc(c1Db, 'aliados_autorizados', emailKey),
        {
          email: emailKey,
          uid: row.uid || '',
          nombre: row.nombre || '',
          telefono: row.telefono || '',
          sede: row.sede || '',
          equipo: row.equipo || '',
          partner: row.partner || '',
          enabled: nextEnabled,
          adminControlToken: ADMIN_CONTROL_TOKEN,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await addDoc(collection(c1Db, 'aliados_conexiones_log'), {
        uid: row.uid || 'admin-control',
        email: emailKey,
        capitulo: 'C1',
        nombre: row.nombre || emailKey,
        sede: row.sede || '',
        action: nextEnabled ? 'ADMIN_ACCESO_C1_OTORGADO' : 'ADMIN_ACCESO_C1_DENEGADO',
        details: `${nextEnabled ? 'Acceso C1 habilitado' : 'Acceso C1 DENEGADO'} desde Causa OS por ${currentUser?.email || 'SuperAdmin'}`,
        timestampIso: new Date().toISOString(),
        createdAtIso: new Date().toISOString(),
        adminControlToken: ADMIN_CONTROL_TOKEN,
        createdAt: serverTimestamp(),
      });

      setActionBanner(
        nextEnabled
          ? `✅ Acceso C1 habilitado en tiempo real para ${emailKey}`
          : `🚫 Acceso C1 DENEGADO inmediatamente para ${emailKey}. Su pantalla ha quedado bloqueada.`
      );
      setTimeout(() => setActionBanner(''), 5000);
    } catch (err) {
      setActionBanner(`⚠️ Error al cambiar acceso de ${emailKey}: ${err?.message || err}`);
    } finally {
      setProcessingEmail(null);
    }
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    const emails = bulkEmails
      .split(/[\n,;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.includes('@') && s.length > 5);

    if (emails.length === 0) {
      setActionBanner('⚠️ No se detectaron correos válidos en el texto ingresado.');
      return;
    }

    setProcessingEmail('bulk');
    try {
      const c1Db = getAliadosC1Db();
      for (const email of emails) {
        await setDoc(
          doc(c1Db, 'aliados_autorizados', email),
          {
            email,
            enabled: true,
            capitulo: 'C1',
            source: 'bulk_import_causa_os',
            adminControlToken: ADMIN_CONTROL_TOKEN,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      await addDoc(collection(c1Db, 'aliados_conexiones_log'), {
        uid: 'admin-bulk',
        email: currentUser?.email || 'superadmin',
        capitulo: 'C1',
        action: 'ADMIN_IMPORT_BULK_C1',
        details: `Importados ${emails.length} correos de Aliados C1 desde Causa OS`,
        timestampIso: new Date().toISOString(),
        createdAtIso: new Date().toISOString(),
        adminControlToken: ADMIN_CONTROL_TOKEN,
        createdAt: serverTimestamp(),
      });

      setBulkEmails('');
      setShowBulkModal(false);
      setActionBanner(`🎉 ${emails.length} correos de Aliados C1 autorizados exitosamente en Firebase.`);
      setTimeout(() => setActionBanner(''), 6000);
    } catch (err) {
      setActionBanner(`⚠️ Error en importación masiva: ${err?.message || err}`);
    } finally {
      setProcessingEmail(null);
    }
  };

  const totalAliados = unifiedRows.length;
  const onlineNow = unifiedRows.filter((r) => isRecentlyActive(r.lastSeenAt || r.lastSeenIso)).length;
  const deniedCount = unifiedRows.filter((r) => r.enabled === false).length;
  const completedAllCount = unifiedRows.filter((r) => (r.completed || []).length === PREPARATION_LABELS_C1.length).length;
  const totalSecurityAlerts = useMemo(() => {
    const fromLogs = logs.filter((l) => {
      const act = String(l.action || '').toUpperCase();
      return act.includes('BLOQUEADO') || act.includes('INTENTO') || act.includes('CAPTURA') || act.includes('IMPRESION') || act.includes('COPIA');
    }).length;

    const fromSesiones = sesiones.reduce((sum, s) => {
      const act = String(s.lastAction || '').toUpperCase();
      const isBlocked = act.includes('BLOQUEADO') || act.includes('INTENTO') || act.includes('CAPTURA') || act.includes('IMPRESION') || act.includes('COPIA');
      return sum + Number(s.securityAlertsCount || (isBlocked ? 1 : 0));
    }, 0);

    return Math.max(fromLogs, fromSesiones);
  }, [logs, sesiones]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Cabecera Ejecutiva Torre C1 */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.88))',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <ShieldCheck size={26} color="#38bdf8" />
              <h2 style={{ margin: 0, color: '#38bdf8', fontSize: '1.35rem', fontWeight: 900 }}>
                TORRE DE CONTROL — GUÍA OPERATIVA ALIADOS C1
              </h2>
              <span
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                }}
              >
                ESCUDO ANTI-CAPTURA & ANTI-IMPRESIÓN ACTIVO
              </span>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Monitoreo en tiempo real de conexiones, datos de encuesta, avance de las 5 misiones de C1, bloqueo inmediato de acceso y alertas de seguridad.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {onToggleGuideView && (
              <button
                onClick={onToggleGuideView}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', padding: '0.5rem 0.9rem' }}
              >
                <BookOpen size={16} /> Ver Guía de Estudio C1
              </button>
            )}
            <a
              href="/aliados-c1/"
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                padding: '0.5rem 0.9rem',
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={16} /> Abrir Portal Standalone C1 ↗
            </a>
            <button
              onClick={() => setShowBulkModal(true)}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', padding: '0.5rem 0.9rem' }}
            >
              <Upload size={16} /> Importar Correos C1
            </button>
          </div>
        </div>

        {actionBanner && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              background: actionBanner.includes('🚫') || actionBanner.includes('⚠️') ? 'rgba(239, 68, 68, 0.18)' : 'rgba(34, 197, 94, 0.18)',
              border: `1px solid ${actionBanner.includes('🚫') || actionBanner.includes('⚠️') ? '#ef4444' : '#22c55e'}`,
              color: '#fff',
              fontSize: '0.88rem',
              fontWeight: 700,
            }}
          >
            {actionBanner}
          </div>
        )}

        {/* Modal de Importación Masiva */}
        {showBulkModal && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '1.25rem',
              background: 'rgba(0,0,0,0.45)',
              borderRadius: '8px',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
          >
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#38bdf8', fontSize: '0.95rem' }}>
              📋 Autorización Masiva de Aliados C1 desde Google Sheets
            </h4>
            <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Pega la columna de correos de los Aliados de Capítulo Uno (separados por salto de línea, coma o punto y coma):
            </p>
            <textarea
              rows={4}
              value={bulkEmails}
              onChange={(e) => setBulkEmails(e.target.value)}
              placeholder="aliado1@crearpsl.com&#10;aliado2@gmail.com&#10;aliado3@outlook.com"
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                padding: '0.6rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button
                onClick={handleBulkImport}
                disabled={processingEmail === 'bulk'}
                className="btn-primary"
                style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}
              >
                {processingEmail === 'bulk' ? 'Autorizando...' : 'Autorizar en Firebase C1'}
              </button>
              <button
                onClick={() => setShowBulkModal(false)}
                className="btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Reactivas en Vivo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
        {[
          {
            label: 'Total Aliados C1',
            value: totalAliados,
            sub: `${encuestas.length} con encuesta llena`,
            color: '#38bdf8',
            filter: 'ALL',
            icon: <Users size={20} color="#38bdf8" />,
          },
          {
            label: 'Conectados Ahora',
            value: onlineNow,
            sub: 'Activos últimos 5 min',
            color: '#22c55e',
            filter: 'ONLINE',
            icon: <Activity size={20} color="#22c55e" />,
          },
          {
            label: 'Preparación 5/5 Lista',
            value: completedAllCount,
            sub: 'Misiones C1 completadas',
            color: 'var(--crear-gold)',
            filter: 'AUTHORIZED',
            icon: <CheckCircle2 size={20} color="var(--crear-gold)" />,
          },
          {
            label: 'Accesos Denegados',
            value: deniedCount,
            sub: 'Bloqueados por Admin',
            color: '#ef4444',
            filter: 'DENIED',
            icon: <Ban size={20} color="#ef4444" />,
          },
          {
            label: 'Intentos Captura/Impresión',
            value: totalSecurityAlerts,
            sub: totalSecurityAlerts > 0 ? '⚠️ Bloqueados (En vivo)' : 'Bloqueados por el escudo',
            color: totalSecurityAlerts > 0 ? '#ef4444' : '#f59e0b',
            filter: 'ALERTS',
            icon: <ShieldAlert size={20} color={totalSecurityAlerts > 0 ? '#ef4444' : '#f59e0b'} />,
          },
        ].map((kpi, idx) => (
          <div
            key={idx}
            onClick={() => setStatusFilter(kpi.filter)}
            className="glass-panel hover-glow"
            style={{
              padding: '1.1rem',
              cursor: 'pointer',
              border: statusFilter === kpi.filter ? `2px solid ${kpi.color}` : `1px solid ${kpi.color}33`,
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.4rem' }}>{kpi.icon}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)' }}>{kpi.label}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Buscador y Filtros */}
      <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, correo, sede, equipo o partner C1..."
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: '0.88rem',
            }}
          />
        </div>

        {/* Selector de Sedes Oficiales */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Building2 size={15} color="var(--text-muted)" />
          <select
            value={limaOnly ? 'Lima' : sedeFilter}
            onChange={(e) => { if (!limaOnly) setSedeFilter(e.target.value); }}
            disabled={limaOnly}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-subtle)',
              color: '#fff',
              padding: '0.35rem 0.65rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              outline: 'none',
            }}
          >
            {limaOnly ? (
              <option value="Lima" style={{ background: '#0f172a' }}>Lima (Solo Sede)</option>
            ) : (
              <>
                <option value="ALL" style={{ background: '#0f172a' }}>Todas las Sedes</option>
                {OFFICIAL_SEDES.map(s => (
                  <option key={s} value={s} style={{ background: '#0f172a' }}>{s}</option>
                ))}
              </>
            )}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {['ALL', 'ONLINE', 'AUTHORIZED', 'DENIED', 'ALERTS'].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                fontSize: '0.75rem',
                padding: '0.3rem 0.65rem',
                borderRadius: '4px',
                border: '1px solid var(--border-subtle)',
                background: statusFilter === f ? '#38bdf8' : 'transparent',
                color: statusFilter === f ? '#000' : 'var(--text-muted)',
                fontWeight: statusFilter === f ? 800 : 500,
                cursor: 'pointer',
              }}
            >
              {f === 'ALL' ? 'Todos' : f === 'ONLINE' ? 'En Línea' : f === 'AUTHORIZED' ? '5/5 Listos' : f === 'DENIED' ? 'Denegados' : 'Con Alertas'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Aliados C1 */}
      <div className="glass-panel" style={{ padding: '1rem', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#38bdf8' }}>
            <Clock size={24} className="spin-slow" />
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Cargando registros de Aliados C1...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
            <Users size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>No se encontraron Aliados C1 con el filtro seleccionado.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.65rem' }}>Aliado / Correo</th>
                <th style={{ padding: '0.65rem' }}>Nombre / Teléfono</th>
                <th style={{ padding: '0.65rem' }}>Sede / Equipo</th>
                <th style={{ padding: '0.65rem' }}>Partner C1</th>
                <th style={{ padding: '0.65rem' }}>Último Acceso / Dispositivo</th>
                <th style={{ padding: '0.65rem' }}>Preparación</th>
                <th style={{ padding: '0.65rem' }}>Estado</th>
                <th style={{ padding: '0.65rem', textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const isOnline = isRecentlyActive(row.lastSeenAt || row.lastSeenIso);
                const isExpanded = expandedRow === row.email;
                const completedCount = (row.completed || []).length;
                const isDenied = row.enabled === false;
                const isProcessing = processingEmail === row.email;

                return (
                  <>
                    <tr
                      key={row.email}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: isDenied ? 'rgba(239, 68, 68, 0.06)' : isOnline ? 'rgba(34, 197, 94, 0.04)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '0.65rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: isDenied ? '#ef4444' : isOnline ? '#22c55e' : '#64748b',
                            }}
                          />
                          <div>
                            <strong style={{ color: '#fff', display: 'block' }}>{row.email}</strong>
                            {row.securityAlertsCount > 0 && (
                              <span style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 800 }}>
                                🛡️ {row.securityAlertsCount} intento(s) bloqueado(s)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        <div>{row.nombre || <span style={{ color: 'var(--text-muted)' }}>Pendiente</span>}</div>
                        {row.telefono && <small style={{ color: 'var(--text-muted)' }}>📞 {row.telefono}</small>}
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        {row.sede ? (
                          <div>
                            <span>📍 {row.sede}</span>
                            {row.equipo && <small style={{ display: 'block', color: 'var(--text-muted)' }}>{row.equipo}</small>}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        {row.partner ? <span>👥 {row.partner}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        <div>{row.lastSeenIso ? formatDateTime(row.lastSeenIso) : <span style={{ color: 'var(--text-muted)' }}>Sin conexión</span>}</div>
                        {row.device && <small style={{ color: 'var(--text-muted)', display: 'block' }}>{row.device}</small>}
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontWeight: 800, color: completedCount === PREPARATION_LABELS_C1.length ? '#4ade80' : '#fbbf24' }}>
                            {completedCount}/{PREPARATION_LABELS_C1.length}
                          </span>
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : row.email)}
                            style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: 0 }}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        {(() => {
                          const validity = evaluateAccessValidity(row, 'C1');
                          if (isDenied) {
                            return (
                              <span
                                style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  background: 'rgba(239, 68, 68, 0.2)',
                                  color: '#ef4444',
                                  border: '1px solid #ef4444',
                                }}
                              >
                                DENEGADO
                              </span>
                            );
                          }
                          if (validity.isExpired) {
                            return (
                              <span
                                title={validity.reason}
                                style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  background: 'rgba(245, 158, 11, 0.2)',
                                  color: '#fbbf24',
                                  border: '1px solid #f59e0b',
                                }}
                              >
                                EXPIRADO AUTOM.
                              </span>
                            );
                          }
                          return (
                            <span
                              style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                background: 'rgba(34, 197, 94, 0.2)',
                                color: '#22c55e',
                                border: '1px solid #22c55e',
                              }}
                            >
                              VIGENTE
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '0.65rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleToggleAccess(row, isDenied)}
                          disabled={isProcessing}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: isDenied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: isDenied ? '#4ade80' : '#f87171',
                            border: `1px solid ${isDenied ? '#22c55e' : '#ef4444'}`,
                          }}
                        >
                          {isProcessing ? '...' : isDenied ? 'Permitir Acceso' : 'Denegar Acceso'}
                        </button>
                      </td>
                    </tr>

                    {/* Detalle desplegable de misiones */}
                    {isExpanded && (
                      <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                        <td colSpan={8} style={{ padding: '0.85rem 1.25rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                            <div>
                              <h4 style={{ margin: '0 0 0.5rem 0', color: '#38bdf8', fontSize: '0.88rem' }}>
                                ✅ Estado de las 5 Misiones de Preparación C1 ({completedCount}/{PREPARATION_LABELS_C1.length})
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {PREPARATION_LABELS_C1.map((item) => {
                                  const done = (row.completed || []).includes(item.id);
                                  return (
                                    <div key={item.id} style={{ fontSize: '0.78rem', color: done ? '#4ade80' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span>{done ? '☑️' : '⬜'}</span>
                                      <span>{item.title}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Bitácora en Vivo de Conexiones y Alertas Anti-Captura C1 */}
      <div className="glass-panel" style={{ padding: '1.2rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '0.8rem', color: '#38bdf8', fontSize: '1.05rem', fontWeight: 800 }}>
          🕒 Bitácora en Tiempo Real C1: Conexiones, Avances y Bloqueos de Captura/Impresión
        </h3>
        {visibleLogs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Aún no hay eventos registrados en la bitácora C1. Aparecerán en cuanto un Aliado inicie sesión o interactúe con la guía C1.
          </p>
        ) : (
          <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {visibleLogs.map((log) => {
              const isAlert = String(log.action || '').includes('BLOQUEADO') || String(log.action || '').includes('DENEGADO');
              return (
                <div
                  key={log.id}
                  style={{
                    padding: '0.55rem 0.85rem',
                    borderRadius: '6px',
                    background: isAlert ? 'rgba(239, 68, 68, 0.14)' : 'rgba(255, 255, 255, 0.03)',
                    borderLeft: `3px solid ${isAlert ? '#ef4444' : '#38bdf8'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    fontSize: '0.8rem',
                  }}
                >
                  <div>
                    <strong style={{ color: isAlert ? '#fca5a5' : '#f8fafc' }}>{log.nombre || log.email}</strong>{' '}
                    <span style={{ color: '#38bdf8' }}>({log.email})</span>
                    {log.sede ? <span style={{ color: 'var(--text-muted)' }}> • 📍 {log.sede}</span> : null}
                    <div style={{ color: '#cbd5e1', marginTop: '2px' }}>
                      <strong style={{ color: isAlert ? '#f87171' : 'var(--crear-gold)' }}>[{log.action}]</strong>{' '}
                      {log.details || log.detail || 'Evento registrado'}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                    <div>🕒 {formatDateTime(log.createdAt || log.createdAtIso || log.timestampIso)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
