import { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  limit,
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
} from 'lucide-react';
import NodusLiveModulesDashboard from './NodusLiveModulesDashboard';

const ALIADOS_C2_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAu7Oa19PYgLQJYRb5HAsYgWw2KRqyqcM4',
  authDomain: 'aliados-crear-global.firebaseapp.com',
  projectId: 'aliados-crear-global',
  storageBucket: 'aliados-crear-global.firebasestorage.app',
  messagingSenderId: '803494420111',
  appId: '1:803494420111:web:bb2fd8fcb92bfce9b31afa',
};

const ADMIN_CONTROL_TOKEN = 'CAUSA_OS_SUPERADMIN_C2_2026';

const PREPARATION_LABELS = [
  { id: 'tecnica', title: '1. Verificación técnica (cámara, micrófono, internet e iluminación)' },
  { id: 'espacio', title: '2. Lugar privado, seguro y sin distracciones (Grounding 8:00 p. m.)' },
  { id: 'partner', title: '3. Confirmación de dupla Partner C1 o nuevo Partner C2' },
  { id: 'resultados', title: '4. Envío de Resultados Imposibles antes de las 23:59 hrs' },
  { id: 'coreografia', title: '5. Video de coreografía de equipo + grito antes del miércoles 23:59 hrs' },
  { id: 'angeles', title: '6. Convocatoria de 10 graduados exclusivos para Noche de Vuelos' },
  { id: 'identificacion', title: '7. Cinta negra con iniciales lista para sus 10 Ángeles' },
  { id: 'acapela', title: '8. Coreografía a capela de 30s preparada con sus Ángeles' },
  { id: 'feedback', title: '9. Retroalimentación activa y seguimiento de 3 min (Jueves a Domingo)' },
];

function getAliadosC2Db() {
  const appName = 'aliados-c2-command-bridge';
  const existing = getApps().find((a) => a.name === appName);
  const app = existing || initializeApp(ALIADOS_C2_FIREBASE_CONFIG, appName);
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
      second: '2-digit',
    });
  } catch {
    return String(tsOrIso);
  }
}

function isRecentlyActive(tsOrIso) {
  if (!tsOrIso) return false;
  try {
    const d = tsOrIso?.toDate ? tsOrIso.toDate() : new Date(tsOrIso);
    if (isNaN(d.getTime())) return false;
    return Date.now() - d.getTime() < 5 * 60 * 1000; // últimos 5 minutos
  } catch {
    return false;
  }
}

export default function AliadosC2AdminPanel({ currentUser }) {
  const [autorizados, setAutorizados] = useState([]);
  const [encuestas, setEncuestas] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [records, setRecords] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ONLINE, AUTHORIZED, DENIED, ALERTS
  const [expandedRow, setExpandedRow] = useState(null);
  const [bulkEmails, setBulkEmails] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [actionBanner, setActionBanner] = useState('');
  const [processingEmail, setProcessingEmail] = useState(null);

  useEffect(() => {
    const c2Db = getAliadosC2Db();
    let loadedCount = 0;
    const markLoaded = () => {
      loadedCount += 1;
      if (loadedCount >= 3) setLoading(false);
    };

    const unsubAuth = onSnapshot(
      collection(c2Db, 'aliados_autorizados'),
      (snap) => {
        setAutorizados(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        markLoaded();
      },
      () => markLoaded()
    );

    const unsubEncuestas = onSnapshot(
      collection(c2Db, 'encuestas_aliados'),
      (snap) => {
        setEncuestas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        markLoaded();
      },
      () => markLoaded()
    );

    const unsubSesiones = onSnapshot(
      collection(c2Db, 'aliados_sesiones'),
      (snap) => {
        setSesiones(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        markLoaded();
      },
      () => markLoaded()
    );

    const unsubRecords = onSnapshot(
      collection(c2Db, 'records'),
      (snap) => {
        setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      () => {}
    );

    const unsubLogs = onSnapshot(
      query(collection(c2Db, 'aliados_conexiones_log'), orderBy('timestampIso', 'desc'), limit(120)),
      (snap) => {
        setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      () => {}
    );

    return () => {
      unsubAuth();
      unsubEncuestas();
      unsubSesiones();
      unsubRecords();
      unsubLogs();
    };
  }, []);

  // Unificar toda la información por correo electrónico / UID
  const unifiedRows = useMemo(() => {
    const byEmail = new Map();

    const ensureEntry = (rawEmail, uid = '') => {
      const email = (rawEmail || '').trim().toLowerCase();
      const key = email || uid;
      if (!key) return null;
      if (!byEmail.has(key)) {
        byEmail.set(key, {
          key,
          email: email || 'sin-correo',
          uid: uid || '',
          nombre: '',
          telefono: '',
          sede: '',
          equipo: '',
          partner: '',
          compromiso: false,
          enabled: true,
          hasExplicitAuthDoc: false,
          completed: [],
          lastSeenAt: null,
          lastSeenIso: '',
          lastLoginAt: null,
          lastLoginIso: '',
          lastAction: '',
          lastDetail: '',
          device: '',
          securityAlertsCount: 0,
          securityAlerts: [],
        });
      }
      const item = byEmail.get(key);
      if (uid && !item.uid) item.uid = uid;
      return item;
    };

    autorizados.forEach((a) => {
      const item = ensureEntry(a.email || a.id, a.uid);
      if (!item) return;
      item.hasExplicitAuthDoc = true;
      item.enabled = a.enabled !== false;
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
      // Buscar por email o por uid
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
      const isAlert = String(l.action || '').includes('BLOQUEADO');
      if (!isAlert) return;
      const item = ensureEntry(l.email, l.uid);
      if (!item) return;
      item.securityAlertsCount += 1;
      item.securityAlerts.push(l);
    });

    return Array.from(byEmail.values()).sort((a, b) => {
      const aTime = a.lastSeenIso || a.lastLoginIso || '';
      const bTime = b.lastSeenIso || b.lastLoginIso || '';
      return bTime.localeCompare(aTime);
    });
  }, [autorizados, encuestas, sesiones, records, logs]);

  const filteredRows = useMemo(() => {
    return unifiedRows.filter((r) => {
      if (statusFilter === 'ONLINE' && !isRecentlyActive(r.lastSeenAt || r.lastSeenIso)) return false;
      if (statusFilter === 'AUTHORIZED' && r.enabled === false) return false;
      if (statusFilter === 'DENIED' && r.enabled !== false) return false;
      if (statusFilter === 'ALERTS' && r.securityAlertsCount === 0) return false;

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
  }, [unifiedRows, statusFilter, searchTerm]);

  const handleToggleAccess = async (row, nextEnabled) => {
    if (!row.email || row.email === 'sin-correo') return;
    const emailKey = row.email.trim().toLowerCase();
    setProcessingEmail(emailKey);
    try {
      const c2Db = getAliadosC2Db();
      await setDoc(
        doc(c2Db, 'aliados_autorizados', emailKey),
        {
          email: emailKey,
          uid: row.uid || '',
          nombre: row.nombre || '',
          telefono: row.telefono || '',
          sede: row.sede || '',
          equipo: row.equipo || '',
          partner: row.partner || '',
          enabled: nextEnabled,
          updatedByAdmin: currentUser?.email || 'superadmin@causaos',
          adminControlToken: ADMIN_CONTROL_TOKEN,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await addDoc(collection(c2Db, 'aliados_conexiones_log'), {
        uid: row.uid || 'admin-control',
        email: emailKey,
        nombre: row.nombre || emailKey,
        sede: row.sede || '',
        action: nextEnabled ? 'ADMIN_ACCESO_OTORGADO' : 'ADMIN_ACCESO_DENEGADO',
        detail: `${nextEnabled ? 'Acceso habilitado' : 'Acceso DENEGADO'} desde Causa OS Centro de Mando por ${currentUser?.email || 'SuperAdmin'}`,
        timestampIso: new Date().toISOString(),
        adminControlToken: ADMIN_CONTROL_TOKEN,
        createdAt: serverTimestamp(),
      });

      setActionBanner(
        nextEnabled
          ? `✅ Acceso habilitado en tiempo real para ${emailKey}`
          : `🚫 Acceso DENEGADO inmediatamente para ${emailKey}. Su pantalla de la guía ha quedado bloqueada.`
      );
      setTimeout(() => setActionBanner(''), 5000);
    } catch (err) {
      setActionBanner(`⚠️ Error al cambiar acceso de ${emailKey}: ${err?.message || err}`);
    } finally {
      setProcessingEmail(null);
    }
  };

  const handleBulkAuthorize = async (enableFlag = true) => {
    const emails = bulkEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes('@') && e.length > 4);

    if (emails.length === 0) {
      setActionBanner('⚠️ Pega al menos un correo válido separado por coma o salto de línea.');
      return;
    }

    const c2Db = getAliadosC2Db();
    let count = 0;
    for (const email of emails) {
      await setDoc(
        doc(c2Db, 'aliados_autorizados', email),
        {
          email,
          enabled: enableFlag,
          source: 'causa_os_centro_de_mando',
          updatedByAdmin: currentUser?.email || 'superadmin@causaos',
          adminControlToken: ADMIN_CONTROL_TOKEN,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      count += 1;
    }
    setBulkEmails('');
    setShowBulkModal(false);
    setActionBanner(
      enableFlag
        ? `✅ ${count} correo(s) autorizados para la Guía Aliados C2.`
        : `🚫 ${count} correo(s) bloqueados/denegados en la Guía Aliados C2.`
    );
    setTimeout(() => setActionBanner(''), 5000);
  };

  const handleExportCsv = () => {
    const header = [
      'Correo',
      'Nombre Completo',
      'Telefono',
      'Sede',
      'Equipo',
      'Partner',
      'Estado Acceso',
      'Progreso Preparacion (de 9)',
      'Items Completados',
      'Ultima Conexion',
      'Ultimo Ingreso',
      'Ultima Accion',
      'Dispositivo',
      'Alertas Anti-Captura/Impresion',
    ];
    const rows = unifiedRows.map((r) => [
      `"${(r.email || '').replace(/"/g, '""')}"`,
      `"${(r.nombre || '').replace(/"/g, '""')}"`,
      `"${(r.telefono || '').replace(/"/g, '""')}"`,
      `"${(r.sede || '').replace(/"/g, '""')}"`,
      `"${(r.equipo || '').replace(/"/g, '""')}"`,
      `"${(r.partner || '').replace(/"/g, '""')}"`,
      `"${r.enabled === false ? 'DENEGADO' : 'AUTORIZADO'}"`,
      `"${(r.completed || []).length}/9"`,
      `"${(r.completed || []).join('; ')}"`,
      `"${formatDateTime(r.lastSeenAt || r.lastSeenIso)}"`,
      `"${formatDateTime(r.lastLoginAt || r.lastLoginIso)}"`,
      `"${(r.lastAction || '').replace(/"/g, '""')}"`,
      `"${(r.device || '').replace(/"/g, '""')}"`,
      `"${r.securityAlertsCount || 0}"`,
    ]);
    const csv = '\uFEFF' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_aliados_c2_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalAliados = unifiedRows.length;
  const onlineNow = unifiedRows.filter((r) => isRecentlyActive(r.lastSeenAt || r.lastSeenIso)).length;
  const deniedCount = unifiedRows.filter((r) => r.enabled === false).length;
  const completedAllCount = unifiedRows.filter((r) => (r.completed || []).length === 9).length;
  const totalSecurityAlerts = logs.filter((l) => String(l.action || '').includes('BLOQUEADO')).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Cabecera Ejecutiva */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85))',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <ShieldCheck size={24} color="var(--crear-gold)" />
              <h2 style={{ margin: 0, color: 'var(--crear-gold)', fontSize: '1.35rem' }}>
                TORRE DE CONTROL — GUÍA OPERATIVA ALIADOS C2
              </h2>
              <span
                style={{
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#22c55e',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                }}
              >
                PROTECCIÓN ANTI-CAPTURA Y ANTI-IMPRESIÓN ACTIVA
              </span>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Monitoreo en tiempo real de quién se ha conectado, en qué momento exacto, datos de su encuesta, avance de preparación (9 misiones) y revocación inmediata de acceso.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <a
              href="https://aliados-crear-global.web.app"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                padding: '0.5rem 0.9rem',
                textDecoration: 'none',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#38bdf8',
              }}
            >
              <ExternalLink size={15} /> Abrir Guía Aliados C2
            </a>
            <button
              onClick={() => setShowBulkModal((v) => !v)}
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                padding: '0.5rem 0.9rem',
                border: '1px solid rgba(212, 175, 55, 0.5)',
                color: 'var(--crear-gold)',
              }}
            >
              <Upload size={15} /> Autorizar / Bloquear Correos (Sheets)
            </button>
            <button
              onClick={handleExportCsv}
              className="btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                padding: '0.5rem 0.9rem',
                background: 'linear-gradient(135deg, #10b981, #047857)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Download size={15} /> Descargar CSV Completo
            </button>
          </div>
        </div>

        {actionBanner && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: actionBanner.includes('🚫')
                ? 'rgba(239, 68, 68, 0.18)'
                : 'rgba(16, 185, 129, 0.18)',
              border: `1px solid ${actionBanner.includes('🚫') ? '#ef4444' : '#10b981'}`,
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.88rem',
            }}
          >
            {actionBanner}
          </div>
        )}

        {/* Modal / Panel desplegable para importar o bloquear correos desde Google Sheets */}
        {showBulkModal && (
          <div
            style={{
              marginTop: '1.2rem',
              padding: '1.2rem',
              borderRadius: '10px',
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
            }}
          >
            <h4 style={{ margin: '0 0 0.4rem 0', color: 'var(--crear-gold)' }}>
              Pegar correos desde Google Sheets (Autorizar o Denegar en bloque)
            </h4>
            <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Pega uno o varios correos separados por salto de línea o coma. Puedes autorizarles el acceso o denegárselo instantáneamente.
            </p>
            <textarea
              rows={4}
              value={bulkEmails}
              onChange={(e) => setBulkEmails(e.target.value)}
              placeholder="ejemplo1@gmail.com&#10;ejemplo2@crearpsl.net"
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.9)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                padding: '0.7rem',
                fontSize: '0.88rem',
                marginBottom: '0.8rem',
              }}
            />
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleBulkAuthorize(true)}
                style={{
                  background: '#10b981',
                  color: '#0f172a',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                }}
              >
                ✅ Autorizar Correos
              </button>
              <button
                onClick={() => handleBulkAuthorize(false)}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                }}
              >
                🚫 Denegar Acceso a estos Correos
              </button>
              <button
                onClick={() => setShowBulkModal(false)}
                style={{
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* KPIs en vivo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
        {[
          {
            label: 'Total Aliados / Correos',
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
            label: 'Preparación 9/9 Lista',
            value: completedAllCount,
            sub: 'Misiones completadas',
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
            sub: 'Bloqueados por el escudo',
            color: '#f59e0b',
            filter: 'ALERTS',
            icon: <ShieldAlert size={20} color="#f59e0b" />,
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
      <div
        className="glass-panel"
        style={{
          padding: '0.9rem 1.2rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: '250px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            background: 'rgba(0,0,0,0.25)',
            padding: '0.5rem 0.9rem',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Search size={18} color="var(--crear-gold)" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar Aliado por nombre, correo, sede, equipo, teléfono o Partner..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#fff',
              outline: 'none',
              fontSize: '0.9rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: `Todos (${unifiedRows.length})` },
            { id: 'ONLINE', label: `🟢 En línea (${onlineNow})` },
            { id: 'AUTHORIZED', label: `✅ Autorizados (${unifiedRows.length - deniedCount})` },
            { id: 'DENIED', label: `🚫 Denegados (${deniedCount})` },
            { id: 'ALERTS', label: `⚠️ Con Alertas (${unifiedRows.filter((r) => r.securityAlertsCount > 0).length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '0.45rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: statusFilter === tab.id ? 'var(--crear-gold)' : 'rgba(255,255,255,0.05)',
                color: statusFilter === tab.id ? '#000' : 'var(--text-heading)',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla Principal de Aliados Conectados y Control de Acceso */}
      <div className="glass-panel" style={{ padding: '1.2rem', overflowX: 'auto' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--crear-gold)', fontSize: '1.05rem' }}>
          📋 Registro Completo por Usuario (Encuesta + Conexiones + Avance + Control de Acceso)
        </h3>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>
            Conectando en tiempo real con el servidor de Aliados C2...
          </p>
        ) : filteredRows.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No hay registros que coincidan con el filtro actual.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', textAlign: 'left', color: 'var(--crear-gold)' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>Aliado / Correo</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Sede / Equipo / Partner</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Última Conexión / Actividad</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Avance Guía (9 Misiones)</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Estado</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Control de Acceso</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const isOnline = isRecentlyActive(row.lastSeenAt || row.lastSeenIso);
                const completedCount = (row.completed || []).length;
                const pct = Math.round((completedCount / 9) * 100);
                const isExpanded = expandedRow === row.key;
                const isDenied = row.enabled === false;

                return (
                  <>
                    <tr
                      key={row.key}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.07)',
                        background: isDenied
                          ? 'rgba(239, 68, 68, 0.08)'
                          : isOnline
                          ? 'rgba(34, 197, 94, 0.05)'
                          : 'transparent',
                      }}
                    >
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : row.key)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--crear-gold)',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'flex',
                            }}
                            title="Ver detalle completo de misiones y dispositivo"
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                          <span
                            style={{
                              width: '9px',
                              height: '9px',
                              borderRadius: '50%',
                              display: 'inline-block',
                              background: isDenied ? '#ef4444' : isOnline ? '#22c55e' : '#64748b',
                              boxShadow: isOnline ? '0 0 8px #22c55e' : 'none',
                            }}
                            title={isOnline ? 'Conectado ahora mismo' : 'Desconectado'}
                          />
                          <div>
                            <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.9rem' }}>
                              {row.nombre || 'Sin encuesta completada aún'}
                            </div>
                            <div style={{ color: '#38bdf8', fontSize: '0.78rem' }}>{row.email}</div>
                            {row.telefono && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                📞 {row.telefono}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        <div style={{ fontWeight: 700, color: '#e2e8f0' }}>
                          📍 {row.sede || '—'} {row.equipo ? `• ${row.equipo}` : ''}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          🤝 Partner: <strong style={{ color: '#cbd5e1' }}>{row.partner || 'No especificado'}</strong>
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        <div style={{ fontWeight: 700, color: isOnline ? '#22c55e' : '#e2e8f0' }}>
                          🕒 {formatDateTime(row.lastSeenAt || row.lastSeenIso || row.lastLoginAt || row.lastLoginIso)}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {row.lastAction ? `${row.lastAction}: ${row.lastDetail || ''}` : 'Sin actividad registrada'}
                        </div>
                        {row.securityAlertsCount > 0 && (
                          <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 800, marginTop: '2px' }}>
                            ⚠️ {row.securityAlertsCount} intento(s) de captura/impresión bloqueados
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 0.5rem', minWidth: '150px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, color: completedCount === 9 ? '#22c55e' : 'var(--crear-gold)' }}>
                            {completedCount} de 9 misiones
                          </span>
                          <span>{pct}%</span>
                        </div>
                        <div style={{ width: '100%', height: '7px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: completedCount === 9 ? '#22c55e' : 'var(--crear-gold)',
                            }}
                          />
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        {isDenied ? (
                          <span
                            style={{
                              background: 'rgba(239, 68, 68, 0.2)',
                              color: '#fca5a5',
                              border: '1px solid #ef4444',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                            }}
                          >
                            🚫 DENEGADO
                          </span>
                        ) : (
                          <span
                            style={{
                              background: 'rgba(16, 185, 129, 0.18)',
                              color: '#6ee7b7',
                              border: '1px solid #10b981',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                            }}
                          >
                            ✅ AUTORIZADO
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : row.key)}
                            style={{
                              background: 'rgba(255,255,255,0.07)',
                              color: '#e2e8f0',
                              border: '1px solid rgba(255,255,255,0.15)',
                              padding: '0.38rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            {isExpanded ? 'Ocultar Ficha' : 'Ver Todo'}
                          </button>

                          {isDenied ? (
                            <button
                              disabled={processingEmail === row.email}
                              onClick={() => handleToggleAccess(row, true)}
                              style={{
                                background: '#10b981',
                                color: '#0f172a',
                                border: 'none',
                                padding: '0.38rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Unlock size={13} /> Permitir Acceso
                            </button>
                          ) : (
                            <button
                              disabled={processingEmail === row.email}
                              onClick={() => handleToggleAccess(row, false)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#fca5a5',
                                border: '1px solid #ef4444',
                                padding: '0.38rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Ban size={13} /> Denegar Acceso
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${row.key}-detail`} style={{ background: 'rgba(15, 23, 42, 0.75)' }}>
                        <td colSpan={6} style={{ padding: '1rem 1.2rem', borderBottom: '1px solid rgba(212,175,55,0.3)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
                            <div>
                              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--crear-gold)', fontSize: '0.88rem' }}>
                                👤 Ficha Completa del Aliado y Conexión
                              </h4>
                              <div style={{ fontSize: '0.8rem', lineHeight: 1.7, color: '#cbd5e1' }}>
                                <div><strong>Nombre:</strong> {row.nombre || '—'}</div>
                                <div><strong>Correo:</strong> {row.email}</div>
                                <div><strong>Teléfono:</strong> {row.telefono || '—'}</div>
                                <div><strong>Sede:</strong> {row.sede || '—'}</div>
                                <div><strong>Equipo:</strong> {row.equipo || '—'}</div>
                                <div><strong>Partner C1/C2:</strong> {row.partner || '—'}</div>
                                <div><strong>Último Ingreso:</strong> {formatDateTime(row.lastLoginAt || row.lastLoginIso)}</div>
                                <div><strong>Último Latido (En línea):</strong> {formatDateTime(row.lastSeenAt || row.lastSeenIso)}</div>
                                <div><strong>Dispositivo / Navegador:</strong> <span style={{ fontSize: '0.73rem', color: '#94a3b8' }}>{row.device || '—'}</span></div>
                              </div>
                            </div>

                            <div>
                              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--crear-gold)', fontSize: '0.88rem' }}>
                                ✅ Estado de las 9 Misiones de Preparación C2 ({completedCount}/9)
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {PREPARATION_LABELS.map((item) => {
                                  const done = (row.completed || []).includes(item.id);
                                  return (
                                    <div
                                      key={item.id}
                                      style={{
                                        fontSize: '0.78rem',
                                        color: done ? '#4ade80' : '#94a3b8',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                      }}
                                    >
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

      {/* Contraste en Tiempo Real: Nodus (/aliados?id_equipo=<ID>) vs Google Sheet Oficial QT & Aliados + Matriz Graduados E4-E39 */}
      <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#34d399', fontSize: '1.1rem', fontWeight: 800 }}>
          📊 Contraste Multiequipo Nodus vs. Google Sheet (QT & Aliados) + 🎓 Matriz Histórica de Graduados (E4–E39 & Staff Elite)
        </h3>
        <NodusLiveModulesDashboard />
      </div>

      {/* Bitácora en Vivo de Conexiones y Alertas Anti-Captura */}
      <div className="glass-panel" style={{ padding: '1.2rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '0.8rem', color: 'var(--crear-gold)', fontSize: '1.05rem' }}>
          🕒 Bitácora en Tiempo Real: Conexiones, Avances y Bloqueos de Captura/Impresión
        </h3>
        {logs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Aún no hay eventos registrados en la bitácora. Aparecerán en cuanto un Aliado inicie sesión o interactúe con la guía.
          </p>
        ) : (
          <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {logs.map((log) => {
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
                      {log.detail}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                    <div>🕒 {formatDateTime(log.createdAt || log.timestampIso)}</div>
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
