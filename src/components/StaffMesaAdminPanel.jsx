import { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps } from 'firebase/app';
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
  ClipboardList,
} from 'lucide-react';
import { OFFICIAL_SEDES, evaluateAccessValidity } from '../data/aliadosVigenciaConfig';

const STAFF_MESA_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCTMrA6A64s1ppDBBsol-fqam5Vch_Q5B0',
  authDomain: 'centro-operativo-cpsl.firebaseapp.com',
  projectId: 'centro-operativo-cpsl',
  storageBucket: 'centro-operativo-cpsl.firebasestorage.app',
  messagingSenderId: '122588918051',
  appId: '1:122588918051:web:c85d6835b1b1f920fb1c96',
};

const CHECKLIST_LABELS_STAFF_MESA = [
  { id: 'notar_postura', title: '1. Notar: Observación sin juicio ni compra de historias' },
  { id: 'contexto_grandeza', title: '2. Contexto: Sostener la conversación de posibilidad' },
  { id: 'adulto_a_adulto', title: '3. Contacto directo adulto a adulto sin lástima ni condescendencia' },
  { id: 'verif_dni_nodus', title: '4. Cotejo estricto de DNI físico vs Sistema Causa / Nodus' },
  { id: 'escucha_5min', title: '5. Límite de atención de máximo 5 minutos por participante' },
  { id: 'anotaciones_limpias', title: '6. Anotaciones limpias y objetivas (hechos, no juicios)' },
  { id: 'reporte_entrenador', title: '7. Reporte inmediato al Entrenador de sala ante anomalías' },
  { id: 'cierre_arqueo_papeleta', title: '8. Cuadre total de papeletas y entrega formal de mesa' },
];

function getStaffMesaDb() {
  const appName = 'staff-mesa-command-bridge';
  const existing = getApps().find((a) => a.name === appName);
  const app = existing || initializeApp(STAFF_MESA_FIREBASE_CONFIG, appName);
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

function formatHumanName(rawName, email = '') {
  if (rawName && typeof rawName === 'string') {
    const trimmed = rawName.trim();
    if (trimmed && trimmed.toLowerCase() !== 'sin nombre' && trimmed.toLowerCase() !== 'no especificado') {
      return trimmed;
    }
  }
  if (!email) return 'Staff de Mesa';
  const cleanEmail = String(email).toLowerCase().trim();
  if (cleanEmail === 'comunidadcrearpsl@gmail.com') return 'José Sánchez';
  if (cleanEmail === 'diana.moscoso@crearpsl.net') return 'Diana Moscoso';
  if (cleanEmail === 'joyce.marin@crearpsl.net') return 'Joyce Marín';

  const prefix = cleanEmail.split('@')[0] || '';
  const cleaned = prefix.replace(/[._-]+/g, ' ').trim();
  if (!cleaned) return 'Staff de Mesa';
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function StaffMesaAdminPanel({ currentUser }) {
  const [autorizados, setAutorizados] = useState([]);
  const [encuestas, setEncuestas] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [records, setRecords] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [sedeFilter, setSedeFilter] = useState('todas');
  const [expandedEmail, setExpandedEmail] = useState(null);
  const [showHorarios, setShowHorarios] = useState(false);

  // Modal para agregar autorizado
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newSede, setNewSede] = useState('Lima');
  const [newRole, setNewRole] = useState('Mesa de Registro Principal');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  useEffect(() => {
    const db = getStaffMesaDb();

    const unsubAutorizados = onSnapshot(
      collection(db, 'staff_mesa_autorizados'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAutorizados(list);
      },
      (err) => console.warn('[StaffMesaAdmin] Error autorizados:', err)
    );

    const unsubEncuestas = onSnapshot(
      collection(db, 'encuestas_staff_mesa'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEncuestas(list);
      },
      (err) => console.warn('[StaffMesaAdmin] Error encuestas:', err)
    );

    const unsubSesiones = onSnapshot(
      collection(db, 'staff_mesa_sesiones'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSesiones(list);
      },
      (err) => console.warn('[StaffMesaAdmin] Error sesiones:', err)
    );

    const unsubRecords = onSnapshot(
      collection(db, 'staff_mesa_records'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRecords(list);
      },
      (err) => console.warn('[StaffMesaAdmin] Error records:', err)
    );

    const unsubLogs = onSnapshot(
      collection(db, 'staff_mesa_conexiones_log'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setLogs(list);
        setLoading(false);
      },
      (err) => {
        console.warn('[StaffMesaAdmin] Error logs:', err);
        setLoading(false);
      }
    );

    return () => {
      unsubAutorizados();
      unsubEncuestas();
      unsubSesiones();
      unsubRecords();
      unsubLogs();
    };
  }, []);

  // Consolidar usuarios Staff de Mesa
  const consolidatedStaff = useMemo(() => {
    const map = new Map();

    autorizados.forEach((a) => {
      const email = a.email?.toLowerCase().trim();
      if (!email) return;
      const rawName = a.nombre || a.displayName || a.nombreCompleto;
      const rawSede = a.sede || a.sedeOficial;
      const rawPuesto = a.mesaRol || a.puestoMesa || a.rol;
      const rawEquipo = a.equipo || a.equipoGeneracion;

      map.set(email, {
        email,
        autorizadoDocId: a.id,
        isAuthorized: a.isAuthorized !== false && a.enabled !== false,
        autorizadoData: a,
        nombre: formatHumanName(rawName, email),
        sede: rawSede || 'Lima',
        whatsapp: a.telefono || a.whatsapp || '',
        puestoMesa: rawPuesto || 'Staff General',
        equipoGeneracion: rawEquipo || 'TODOS_DISPONIBLES',
      });
    });

    encuestas.forEach((e) => {
      const email = e.email?.toLowerCase().trim();
      if (!email) return;
      const prev = map.get(email) || { email, isAuthorized: true };
      const rawName = e.nombre || e.nombreCompleto || e.displayName || prev.nombre;
      const rawSede = e.sede || e.sedeOficial || prev.sede;
      const rawWhatsapp = e.telefono || e.whatsapp || prev.whatsapp || '';
      const rawPuesto = e.mesaRol || e.puestoMesa || prev.puestoMesa || 'Staff General';
      const rawEquipo = e.equipo || e.equipoGeneracion || prev.equipoGeneracion || 'TODOS_DISPONIBLES';

      map.set(email, {
        ...prev,
        encuestaDocId: e.id,
        encuestaData: e,
        nombre: formatHumanName(rawName, email),
        sede: rawSede || 'Lima',
        whatsapp: rawWhatsapp,
        puestoMesa: rawPuesto,
        equipoGeneracion: rawEquipo,
      });
    });

    sesiones.forEach((s) => {
      const email = s.email?.toLowerCase().trim() || s.id?.toLowerCase().trim();
      if (!email) return;
      const prev = map.get(email) || { email, isAuthorized: true };
      const rawName = s.nombre || s.displayName || prev.nombre;
      map.set(email, {
        ...prev,
        sesionData: s,
        lastActive: s.lastActiveAt || s.loginAt,
        nombre: formatHumanName(rawName, email),
      });
    });

    records.forEach((r) => {
      const email = r.email?.toLowerCase().trim() || r.id?.toLowerCase().trim();
      if (!email) return;
      const prev = map.get(email) || { email, isAuthorized: true };
      map.set(email, {
        ...prev,
        checklistData: r.checklist || r.items || {},
      });
    });

    return Array.from(map.values()).map((user) => {
      const email = user.email;
      const userLogs = logs.filter(
        (l) => l.userEmail?.toLowerCase().trim() === email || l.email?.toLowerCase().trim() === email
      );
      const securityIncidents = userLogs.filter(
        (l) => l.eventType === 'SECURITY_SHIELD_TRIGGERED' || l.eventType === 'SECURITY_EVENT' || l.action === 'screenshot_blocked'
      );
      const isOnline = isRecentlyActive(user.lastActive, 5);

      const validity = evaluateAccessValidity(user.encuestaData || {}, 'staff_mesa');

      return {
        ...user,
        logs: userLogs,
        securityCount: securityIncidents.length,
        isOnline,
        isExpired: validity.isExpired,
        expirationReason: validity.reason,
        validityEvaluation: validity,
      };
    });
  }, [autorizados, encuestas, sesiones, records, logs]);

  // Filtrado
  const filteredStaff = useMemo(() => {
    return consolidatedStaff.filter((u) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        u.email?.toLowerCase().includes(q) ||
        u.nombre?.toLowerCase().includes(q) ||
        u.sede?.toLowerCase().includes(q) ||
        u.whatsapp?.includes(q) ||
        u.puestoMesa?.toLowerCase().includes(q) ||
        u.equipoGeneracion?.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (sedeFilter !== 'todas' && u.sede !== sedeFilter) {
        return false;
      }

      if (statusFilter === 'activos') return u.isOnline;
      if (statusFilter === 'autorizados') return u.isAuthorized && !u.isExpired;
      if (statusFilter === 'revocados') return !u.isAuthorized;
      if (statusFilter === 'expirados') return u.isExpired;
      if (statusFilter === 'con_alertas') return u.securityCount > 0;
      return true;
    });
  }, [consolidatedStaff, searchTerm, statusFilter, sedeFilter]);

  // KPIs
  const metrics = useMemo(() => {
    const total = consolidatedStaff.length;
    const activosEnVivo = consolidatedStaff.filter((u) => u.isOnline).length;
    const autorizadosCount = consolidatedStaff.filter((u) => u.isAuthorized && !u.isExpired).length;
    const revocadosCount = consolidatedStaff.filter((u) => !u.isAuthorized).length;
    const expiradosCount = consolidatedStaff.filter((u) => u.isExpired).length;
    const alertasTotales = consolidatedStaff.reduce((acc, u) => acc + (u.securityCount || 0), 0);
    const encuestasCompletadas = consolidatedStaff.filter((u) => !!u.encuestaData).length;

    return {
      total,
      activosEnVivo,
      autorizadosCount,
      revocadosCount,
      expiradosCount,
      alertasTotales,
      encuestasCompletadas,
    };
  }, [consolidatedStaff]);

  // Toggle Autorización
  const handleToggleAuthorization = async (user) => {
    try {
      setActionLoading(true);
      const db = getStaffMesaDb();
      const newStatus = !user.isAuthorized;
      const docId = user.autorizadoDocId || user.email.replace(/[@.]/g, '_');

      await setDoc(
        doc(db, 'staff_mesa_autorizados', docId),
        {
          email: user.email.toLowerCase().trim(),
          nombre: user.nombre || 'Staff Mesa',
          isAuthorized: newStatus,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser?.email || 'superadmin',
          reason: newStatus ? 'Acceso habilitado manualmente desde SuperAdmin' : 'Acceso revocado por SuperAdmin',
        },
        { merge: true }
      );

      setFeedbackMsg({
        type: 'success',
        text: `Acceso ${newStatus ? 'HABILITADO' : 'REVOCADO'} para ${user.email}`,
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      console.error('Error toggling auth:', err);
      setFeedbackMsg({ type: 'error', text: `Error: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  // Agregar nuevo autorizado
  const handleAddAutorizado = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    try {
      setActionLoading(true);
      const db = getStaffMesaDb();
      const cleanEmail = newEmail.toLowerCase().trim();
      const docId = cleanEmail.replace(/[@.]/g, '_');

      await setDoc(
        doc(db, 'staff_mesa_autorizados', docId),
        {
          email: cleanEmail,
          nombre: newName.trim() || 'Staff de Mesa Registrado',
          sede: newSede,
          puestoMesa: newRole,
          isAuthorized: true,
          createdAt: serverTimestamp(),
          createdBy: currentUser?.email || 'superadmin',
          notes: 'Pre-autorizado desde Panel de SuperAdmin',
        },
        { merge: true }
      );

      setFeedbackMsg({
        type: 'success',
        text: `Staff pre-autorizado con éxito: ${cleanEmail}`,
      });
      setShowAddModal(false);
      setNewEmail('');
      setNewName('');
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      console.error('Error adding autorizado:', err);
      setFeedbackMsg({ type: 'error', text: `Error: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Email', 'Nombre', 'Sede', 'Puesto Mesa', 'Equipo Generacion', 'WhatsApp', 'Autorizado', 'Expirado', 'En Vivo', 'Alertas Escudo', 'Fecha Registro'];
    const rows = consolidatedStaff.map((u) => [
      u.email,
      `"${u.nombre || ''}"`,
      u.sede || '',
      `"${u.puestoMesa || ''}"`,
      `"${u.equipoGeneracion || ''}"`,
      u.whatsapp || '',
      u.isAuthorized ? 'SI' : 'NO',
      u.isExpired ? 'SI' : 'NO',
      u.isOnline ? 'SI' : 'NO',
      u.securityCount || 0,
      u.encuestaData?.createdAt ? formatDateTime(u.encuestaData.createdAt) : '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `staff_mesa_cpsl_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: '#f8fafc' }}>
      {/* Banner Superior de Identidad de Mando */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '16px',
          padding: '1.5rem 2rem',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              Torre de Control · Staff de Mesa
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '0.25rem 0.6rem',
                borderRadius: '9999px',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              <Activity size={12} className="animate-pulse" /> Sincronizado en Tiempo Real
            </span>
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Control de Acceso y Operación: Staff de Mesa de Registro (C1, C2 y MJ)
          </h2>
          <p style={{ margin: '0.35rem 0 0', color: '#94a3b8', fontSize: '0.9rem', maxWidth: '720px' }}>
            Auditoría contextual, encuestas de compromiso, validación de DNI físico vs Nodus, control de sesiones en vivo y escudo perimetral anti-captura.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a
            href="https://centro-operativo-cpsl.web.app/staff-mesa/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#0f172a',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.875rem',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
              transition: 'transform 0.15s ease',
            }}
          >
            <ClipboardList size={16} /> Abrir Portal de Staff de Mesa <ExternalLink size={14} />
          </a>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            <UserCheck size={16} /> Pre-autorizar Staff
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#cbd5e1',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '0.65rem 1rem',
              borderRadius: '10px',
              fontWeight: 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            <Download size={15} /> Exportar CSV
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 600,
            background: feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: feedbackMsg.type === 'success' ? '1px solid #10b981' : '1px solid #ef4444',
            color: feedbackMsg.type === 'success' ? '#34d399' : '#f87171',
          }}
        >
          {feedbackMsg.text}
        </div>
      )}

      {/* Grid de KPIs Operativos */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Staff Registrado</span>
            <Users size={18} color="#60a5fa" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: '#ffffff' }}>
            {metrics.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            {metrics.encuestasCompletadas} con encuesta completada
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '14px',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>En Vivo (Últimos 5 min)</span>
            <Activity size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: '#10b981' }}>
            {metrics.activosEnVivo}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6ee7b7', marginTop: '0.25rem' }}>
            Sesiones activas en la mesa
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '14px',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Vigentes</span>
            <CheckCircle2 size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: '#60a5fa' }}>
            {metrics.autorizadosCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#93c5fd', marginTop: '0.25rem' }}>
            Acceso operativo habilitado
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '14px',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Expirados Autom.</span>
            <Clock size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: '#f59e0b' }}>
            {metrics.expiradosCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#fcd34d', marginTop: '0.25rem' }}>
            Fin de ciclo de entrenamiento
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '14px',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Alertas de Escudo</span>
            <ShieldAlert size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: '#ef4444' }}>
            {metrics.alertasTotales}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: '0.25rem' }}>
            Intentos de captura/impresión bloqueados
          </div>
        </div>
      </div>

      {/* Acordeón de Horarios Oficiales Staff de Mesa */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1rem',
        }}
      >
        <div
          onClick={() => setShowHorarios(!showHorarios)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⏱️</span>
            <div>
              <strong style={{ color: '#38bdf8', fontSize: '0.98rem' }}>
                Horarios Oficiales del Staff de Mesa (C1, C2 y MJ)
              </strong>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Pautas de asistencia obligatoria y bloques operativos en sede
              </div>
            </div>
          </div>
          <button
            type="button"
            style={{
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              borderRadius: '6px',
              padding: '0.35rem 0.75rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {showHorarios ? 'Ocultar Horarios' : 'Ver Horarios Oficiales'}
          </button>
        </div>

        {showHorarios && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {/* C1 */}
            <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.4rem' }}>
                <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.92rem' }}>Mesa Capítulo 1 (C1)</span>
                <span style={{ fontSize: '0.7rem', color: '#7dd3fc', background: 'rgba(56, 189, 248, 0.15)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>4 Bloques</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Viernes:</span> <strong style={{ color: '#f8fafc' }}>8:00 AM – 1:00 PM</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Sábado:</span> <strong style={{ color: '#f8fafc' }}>8:30 AM – 12:00 PM</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Domingo (Mañana):</span> <strong style={{ color: '#f8fafc' }}>8:30 AM – 11:00 AM</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Domingo (Cierre):</span> <strong style={{ color: '#f8fafc' }}>6:00 PM – 8:00 PM</strong></div>
              </div>
            </div>

            {/* C2 */}
            <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.4rem' }}>
                <span style={{ fontWeight: 800, color: '#fbbf24', fontSize: '0.92rem' }}>Mesa Capítulo 2 (C2)</span>
                <span style={{ fontSize: '0.7rem', color: '#fde68a', background: 'rgba(245, 158, 11, 0.15)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>3 Bloques</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Jueves:</span> <strong style={{ color: '#f8fafc' }}>11:00 AM – 3:00 PM</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Viernes:</span> <strong style={{ color: '#f8fafc' }}>7:30 AM – 2:00 PM</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Sábado:</span> <strong style={{ color: '#f8fafc' }}>7:30 AM – 12:00 PM</strong></div>
              </div>
            </div>

            {/* MJ */}
            <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.4rem' }}>
                <span style={{ fontWeight: 800, color: '#c084fc', fontSize: '0.92rem' }}>Maestría del Juego (MJ)</span>
                <span style={{ fontSize: '0.7rem', color: '#e9d5ff', background: 'rgba(168, 85, 247, 0.15)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>5 Bloques</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Viernes:</span> <strong style={{ color: '#f8fafc' }}>3:20 PM – 8:00 PM</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Sábado (Mañana):</span> <strong style={{ color: '#f8fafc' }}>8:30 AM – 11:00 AM</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Sábado (Tarde):</span> <strong style={{ color: '#f8fafc' }}>4:30 PM – 7:30 PM</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Domingo (Mañana):</span> <strong style={{ color: '#f8fafc' }}>8:30 AM – 11:00 AM</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Domingo (Cierre):</span> <strong style={{ color: '#f8fafc' }}>4:30 PM – 8:00 PM</strong></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 300px' }}>
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            placeholder="Buscar por nombre, email, teléfono, sede o puesto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '0.55rem 0.85rem',
              color: '#ffffff',
              fontSize: '0.875rem',
              width: '100%',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Selector de Sede Oficial */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Building2 size={16} color="#f59e0b" />
            <select
              value={sedeFilter}
              onChange={(e) => setSedeFilter(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '8px',
                padding: '0.55rem 0.85rem',
                color: '#ffffff',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            >
              <option value="todas">Todas las Sedes (6 oficiales)</option>
              {OFFICIAL_SEDES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '0.55rem 0.85rem',
              color: '#ffffff',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          >
            <option value="todos">Todos los Estados</option>
            <option value="activos">🟢 En Vivo Ahora</option>
            <option value="autorizados">🔵 Vigentes</option>
            <option value="expirados">⏳ Expirados Autom.</option>
            <option value="revocados">🚫 Revocados</option>
            <option value="con_alertas">⚠️ Con Alertas de Escudo</option>
          </select>
        </div>
      </div>

      {/* Tabla de Staff de Mesa */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'rgba(0, 0, 0, 0.3)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                <th style={{ padding: '0.9rem 1.25rem', fontWeight: 600 }}>Staff / Email</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Sede & Puesto</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Generación</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Estado de Acceso</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Checklist Mesa</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Alertas Escudo</th>
                <th style={{ padding: '0.9rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                    <Activity size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                    Cargando bitácora y sesiones de Staff de Mesa...
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                    No se encontraron registros de Staff de Mesa con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((user) => {
                  const isExpanded = expandedEmail === user.email;
                  const checklistObj = user.checklistData || {};
                  const checkedCount = Object.values(checklistObj).filter(Boolean).length;
                  const checklistTotal = CHECKLIST_LABELS_STAFF_MESA.length;
                  const checklistPct = Math.round((checkedCount / checklistTotal) * 100);

                  return (
                    <tr
                      key={user.email}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: isExpanded ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Staff / Email */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => setExpandedEmail(isExpanded ? null : user.email)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                          <div>
                            <div style={{ fontWeight: 600, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              {user.nombre}
                              {user.isOnline && (
                                <span
                                  style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: '#10b981',
                                    display: 'inline-block',
                                  }}
                                  title="En vivo en la Mesa"
                                />
                              )}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{user.email}</div>
                            {user.whatsapp && (
                              <div style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                                <Phone size={11} color="#10b981" /> {user.whatsapp}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Sede & Puesto */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{user.sede || 'Lima'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>{user.puestoMesa || 'Staff de Mesa'}</div>
                      </td>

                      {/* Generación / Disponibilidad */}
                      <td style={{ padding: '1rem' }}>
                        <span
                          style={{
                            background: (!user.equipoGeneracion || user.equipoGeneracion === 'TODOS_DISPONIBLES') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                            color: (!user.equipoGeneracion || user.equipoGeneracion === 'TODOS_DISPONIBLES') ? '#34d399' : '#cbd5e1',
                            border: (!user.equipoGeneracion || user.equipoGeneracion === 'TODOS_DISPONIBLES') ? '1px solid rgba(16, 185, 129, 0.3)' : 'none',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {(!user.equipoGeneracion || user.equipoGeneracion === 'TODOS_DISPONIBLES')
                            ? '⭐ Todos Disponibles (C1, C2, MJ)'
                            : user.equipoGeneracion}
                        </span>
                      </td>

                      {/* Estado de Acceso */}
                      <td style={{ padding: '1rem' }}>
                        {!user.isAuthorized ? (
                          <span
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            🚫 REVOCADO
                          </span>
                        ) : user.isExpired ? (
                          <span
                            style={{
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#f59e0b',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                            title={user.expirationReason}
                          >
                            ⏳ EXPIRADO AUTOM.
                          </span>
                        ) : (
                          <span
                            style={{
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            🟢 VIGENTE
                          </span>
                        )}
                      </td>

                      {/* Checklist Mesa */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, minWidth: '70px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${checklistPct}%`, background: checklistPct === 100 ? '#10b981' : '#f59e0b' }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: checklistPct === 100 ? '#10b981' : '#cbd5e1' }}>
                            {checkedCount}/{checklistTotal}
                          </span>
                        </div>
                      </td>

                      {/* Alertas Escudo */}
                      <td style={{ padding: '1rem' }}>
                        {user.securityCount > 0 ? (
                          <span
                            style={{
                              background: 'rgba(239, 68, 68, 0.2)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.35)',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                            }}
                          >
                            <ShieldAlert size={12} /> {user.securityCount} Bloqueos
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>0</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleToggleAuthorization(user)}
                          disabled={actionLoading}
                          style={{
                            background: user.isAuthorized ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: user.isAuthorized ? '#ef4444' : '#10b981',
                            border: `1px solid ${user.isAuthorized ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                            padding: '0.4rem 0.75rem',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {user.isAuthorized ? 'Revocar Acceso' : 'Reactivar Acceso'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Pre-autorizar Staff */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '16px',
              padding: '2rem',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#ffffff' }}>
              Pre-autorizar Nuevo Integrante de Staff de Mesa
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 1.25rem' }}>
              El usuario podrá iniciar sesión con este correo Google institucional o personal y completar su encuesta y acuerdos para ingresar a la Guía de Staff de Mesa.
            </p>

            <form onSubmit={handleAddAutorizado} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Correo Electrónico (Google) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Nombre Completo
                </label>
                <input
                  type="text"
                  placeholder="Nombre y Apellidos"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Sede Oficial *
                </label>
                <select
                  value={newSede}
                  onChange={(e) => setNewSede(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {OFFICIAL_SEDES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Puesto en Mesa *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Mesa de Registro Principal">Mesa de Registro Principal</option>
                  <option value="Mesa de Verificación DNI / Nodus">Mesa de Verificación DNI / Nodus</option>
                  <option value="Mesa de Pagos y Acuerdos">Mesa de Pagos y Acuerdos</option>
                  <option value="Mesa de Entrega de Credenciales">Mesa de Entrega de Credenciales</option>
                  <option value="Líder Coordinador de Mesa">Líder Coordinador de Mesa</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    background: '#f59e0b',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.65rem 1.25rem',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  {actionLoading ? 'Guardando...' : 'Pre-autorizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
