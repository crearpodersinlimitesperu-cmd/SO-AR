import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChecklist } from '../context/ChecklistContext';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useUI } from '../context/UIContext';
import { doc, setDoc, updateDoc, collection, query, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { normalizeRole, normalizeSede, OPERATIONAL_SEDES } from '../data/usersData';
import { getAllCompanyUsers } from '../services/userService';
import { openOrCreateDirectMessage } from '../services/googleChatService';
import { getWhatsAppUrl } from '../utils/phoneUtils';
import { Globe, Building2, Users, ArrowLeft, ChevronDown, ChevronRight, Eye, CheckCircle2, Clock, AlertTriangle, TrendingUp, UserCheck, FileText, Search, X, PlusCircle, Mail, MessageCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { getFlagForSede } from '../utils/flags';
import UserProfileModal from '../components/UserProfileModal';
import IAAuditor from '../components/IAAuditor';
import TaskAssignmentModal from '../components/TaskAssignmentModal';
import { getAllAuditLogs, recordAuditEvent, getAllUserConnections } from '../services/auditService';
import { runRoleIntegrityAuditAndHeal } from '../services/roleIntegritySentinelAgent';

import { USERS_TO_IMPORT } from '../data/usersToImport';


const ROLE_LABELS = {
  direccion: 'Dirección Global',
  cfo: 'CFO (Chief Financial Officer)',
  gerente: 'Gerente de Sede',
  director_maestria: 'Director Maestría del Juego (MJ)',
  coordinador_c1c2: 'Coordinador Capítulo 1 y 2 (C1 / C2)',
  coordinador_mj: 'Coordinador Maestría del Juego (MJ)',
  coord_c1: 'Coordinador Capítulo 1 y 2 (C1 / C2)',
  coord_maestria: 'Coordinador Maestría del Juego (MJ)',
  capitan: 'Capitán',
  manager: 'Manager',
  qt: 'Quantum Team',
  coordinador: 'Coordinación Administrativa',
  finanzas: 'Finanzas',
  asistente_impuestos_quito: 'Impuestos / Tributaria',
  talento_humano: 'Talento Humano',
  legal: 'Legal / Jurídico',
  técnico_sst: 'Seguridad y Salud (SST)',
  entrenador: 'Entrenadores (Coaches)',
  entrenador_llamadas: 'Entrenadores de Llamadas',
  participante: 'Participantes',
  marketing: 'Marketing',
};

const ROLE_COLORS = {
  direccion: '#ef4444',
  cfo: '#eab308',
  gerente: '#f59e0b',
  director_maestria: '#ec4899',
  coordinador_c1c2: '#29abe2',
  coord_c1: '#29abe2',
  coordinador_mj: '#8b5cf6',
  coord_maestria: '#8b5cf6',
  capitan: '#22c55e',
  manager: '#10b981',
  entrenador: '#f59e0b',
  entrenador_llamadas: '#38bdf8',
  qt: '#ec4899',
  coordinador: '#0ea5e9',
  finanzas: '#6b7280',
  asistente_impuestos_quito: '#64748b',
  talento_humano: '#06b6d4',
  legal: '#a855f7',
  técnico_sst: '#14b8a6',
  participante: '#9ca3af',
  marketing: '#ec4899'
};


const ALL_SEDES = [...OPERATIONAL_SEDES, 'Sede Global'];

function ProgressBar({ value, color = 'var(--crear-gold)', height = '8px' }) {
  const pct = Math.min(100, Math.max(0, value));
  const barColor = pct === 100 ? '#22c55e' : (pct >= 50 ? color : pct > 0 ? '#f59e0b' : '#ef4444');
  return (
    <div style={{ width: '100%', height, background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: barColor, transition: 'width 0.5s ease-out' }} />
    </div>
  );
}

function PersonCard({ person, tasks, navigate, onSelectUser, onAssignTask, currentUser, userConnections = {} }) {
  const { showToast } = useUI();
  const [openingChat, setOpeningChat] = useState(false);
  const canonicalRole = normalizeRole(person.role);
  const normalizedSedeName = normalizeSede(person.sede);
  const myTasks = tasks.filter(t => {
    const isAssigned = (t.assignedToEmails && t.assignedToEmails.some(e => e.toLowerCase() === person.email?.toLowerCase())) || (t.assignedToEmail && t.assignedToEmail.toLowerCase() === person.email?.toLowerCase());
    const isCollab = t.collaborators && t.collaborators.includes(person.email);

    if (isAssigned || isCollab) {
      if (!currentUser?.isSuperAdmin) {
        const myRole = currentUser?.appRole;
        const targetRole = normalizeRole(person.role);
        const isManagerRole = r => r === 'gerente' || r === 'director_maestria' || r === 'direccion';

        if (isManagerRole(myRole) && isManagerRole(targetRole) && currentUser.email?.toLowerCase() !== person.email?.toLowerCase()) {
          const iAmCreator = t.createdBy?.toLowerCase() === currentUser?.email?.toLowerCase();
          const iAmCollaborator = t.collaborators?.includes(currentUser?.email);
          if (!iAmCreator && !iAmCollaborator) return false;
        }
      }
      return true;
    }

    if (t.assignedToEmail || (t.assignedToEmails && t.assignedToEmails.length > 0)) return false;
    const tNorm = normalizeRole(t.role);
    const matchesRole = tNorm === canonicalRole || t.role === person.role;
    if (!matchesRole) return false;
    if (t.sede) {
      return t.sede === person.sede || t.sede === 'Global' || person.sede === 'Global';
    }
    return true;
  });

  const completed = myTasks.filter(t => {
    if (t.completions && person.sede && t.completions[person.sede]) {
      return t.completions[person.sede].completed;
    }
    return t.completed || t.status === 'Completada';
  }).length;

  const pct = myTasks.length > 0 ? Math.round((completed / myTasks.length) * 100) : 0;
  const roleColor = ROLE_COLORS[canonicalRole] || '#6b7280';
  const isInactive = person.isActive === false || person.status === 'inactive' || person.active === false;

  // Selector de WhatsApp seguro y canónico: reutiliza la misma función que
  // ya usa el resto de la app (phoneUtils.getWhatsAppUrl), probando los distintos
  // nombres de campo de teléfono que existen según la colección de origen.
  const whatsappUrl = person.whatsappUrl || getWhatsAppUrl(person.whatsapp || person.phone || person.telefono, person.sede);

  return (
    <div
      className="glass-panel hover-glow"
      onClick={() => onSelectUser && onSelectUser(person)}
      style={{
        padding: '1rem 1.2rem', 
        borderLeft: isInactive ? '4px solid #ef4444' : `4px solid ${roleColor}`,
        opacity: isInactive ? 0.75 : 1,
        background: isInactive ? 'rgba(239, 68, 68, 0.05)' : undefined,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: isInactive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.08)',
            border: isInactive ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
          title={`Sede: ${normalizedSedeName}`}
        >
          <div style={{ transform: 'scale(1.2)' }}>{getFlagForSede(person.sede)}</div>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: isInactive ? '#cbd5e1' : 'var(--text-heading)' }}>{person.name}</h4>
            {isInactive && (
              <span style={{
                fontSize: '0.68rem',
                color: '#fff',
                background: '#ef4444',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: 700,
                letterSpacing: '0.3px'
              }} title={person.deactivationReason ? `Motivo: ${person.deactivationReason}` : 'Colaborador inactivo'}>
                INACTIVO
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: isInactive ? '#94a3b8' : roleColor, fontWeight: 600 }}>
              {ROLE_LABELS[canonicalRole] || person.role}
            </span>
            {person.sede && (
              <span style={{
                fontSize: '0.72rem',
                color: 'var(--crear-gold)',
                background: 'rgba(255, 183, 3, 0.1)',
                border: '1px solid rgba(255, 183, 3, 0.25)',
                padding: '1px 6px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontWeight: 700
              }}>
                📍 {normalizedSedeName}
              </span>
            )}
          </div>
          {/* Indicador de Última Conexión en Tarjeta */}
          {(() => {
            const emailKey = (person.email || '').toLowerCase().trim();
            const allEmails = [...new Set([emailKey, ...(person.emails || []).map(e => e.toLowerCase().trim())])];

            let conn = null;
            for (const email of allEmails) {
              if (userConnections[email] && (userConnections[email].hasConnected || userConnections[email].lastLoginFormatted || userConnections[email].lastLoginAt)) {
                conn = userConnections[email];
                break;
              }
            }
            if (!conn) conn = userConnections[emailKey];

            const hasConnected = !!(conn?.hasConnected || conn?.lastLoginFormatted || conn?.lastLoginAt);
            return (
              <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: hasConnected ? '#22c55e' : '#94a3b8',
                  boxShadow: hasConnected ? '0 0 6px #22c55e' : 'none',
                  display: 'inline-block'
                }} />
                <span style={{ color: hasConnected ? '#22c55e' : 'var(--text-muted)', fontWeight: hasConnected ? 600 : 400 }}>
                  {hasConnected ? `Último acceso: ${conn.lastLoginFormatted || 'Conectado'}` : 'Sin conexión'}
                </span>
                {hasConnected && conn?.lastLocation && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>• {conn.lastLocation}</span>
                )}
              </div>
            );
          })()}
        </div>
      </div>
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
        <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: pct === 100 ? '#22c55e' : 'var(--text-heading)' }}>{pct}%</p>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{completed}/{myTasks.length} tareas</p>
        {(person.email || whatsappUrl) && (
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Contactar por WhatsApp"
                className="hover-glow"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  textDecoration: 'none',
                  background: '#25D366',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.845L0 24l6.335-1.508A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.371l-.36-.214-3.727.977.995-3.638-.235-.374A9.818 9.818 0 1112 21.818z"/>
                </svg>
              </a>
            )}
            {person.email && (
              <>
                <a
                  href={`mailto:${person.email}`}
                  onClick={(e) => e.stopPropagation()}
                  title={`Enviar correo a ${person.email}`}
                  className="hover-glow"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    textDecoration: 'none',
                    background: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                >
                  <svg viewBox="0 0 48 48" width="17" height="17" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#4caf50" d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z"/>
                    <path fill="#1e88e5" d="M3,16.2l3.714,1.498L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z"/>
                    <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17"/>
                    <path fill="#c62828" d="M3,12.298V16.2l10,7.5V11.2L9.876,8.859C9.132,8.301,8.228,8,7.298,8h0C4.924,8,3,9.924,3,12.298z"/>
                    <path fill="#fbc02d" d="M45,12.298V16.2l-10,7.5V11.2l3.124-2.341C38.868,8.301,39.772,8,40.702,8h0 C43.076,8,45,9.924,45,12.298z"/>
                  </svg>
                </a>
                <button
                  type="button"
                  disabled={openingChat}
                  onClick={async (e) => {
                    e.stopPropagation();
                    setOpeningChat(true);
                    const result = await openOrCreateDirectMessage(person.email);
                    setOpeningChat(false);
                    if (result.success) {
                      window.open(result.spaceUri, '_blank', 'noopener,noreferrer');
                    } else {
                      showToast(
                        `No se pudo abrir Google Chat con ${person.name} (${result.error}). Usa el botón de correo mientras tanto.`,
                        'error'
                      );
                    }
                  }}
                  title={`Abrir la conversación de Google Chat con ${person.email}`}
                  className="hover-glow"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    cursor: openingChat ? 'wait' : 'pointer',
                    opacity: openingChat ? 0.6 : 1,
                    background: '#ffffff',
                    border: 'none',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                >
                  <svg viewBox="0 0 48 48" width="17" height="17" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#1a73e8" d="M12 35.5L5 42V8c0-1.7 1.3-3 3-3h32c1.7 0 3 1.3 3 3v24.5c0 1.7-1.3 3-3 3H12z"/>
                    <path fill="#ffffff" d="M17 18h14v3H17zm0 6h10v3H17z"/>
                  </svg>
                </button>
              </>
            )}
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onAssignTask && onAssignTask(person); }}
          className="btn-primary hover-glow"
          style={{
            padding: '0.2rem 0.6rem',
            fontSize: '0.75rem',
            borderRadius: '6px',
            background: 'rgba(41, 171, 226, 0.15)',
            color: 'var(--crear-cyan)',
            border: '1px solid rgba(41, 171, 226, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            marginTop: '0.2rem'
          }}
        >
          <PlusCircle size={12} /> Tarea
        </button>
      </div>
    </div>
  );
}

function SedeBlock({ sede, tasks, navigate, onSelectUser, onAssignTask, currentUser, userConnections = {}, realUsersData = [] }) {
  const [expanded, setExpanded] = useState(false);
  const members = (realUsersData || []).filter(u => normalizeSede(u.sede) === sede);

  let totalSedeTasks = 0;
  let totalSedeCompleted = 0;

  // Reutilizar la lógica de PersonCard para obtener números exactos por persona
  members.forEach(person => {
    const canonicalRole = normalizeRole(person.role);
    const myTasks = tasks.filter(t => {
      const isAssigned = (t.assignedToEmails && t.assignedToEmails.some(e => e.toLowerCase() === person.email?.toLowerCase())) || (t.assignedToEmail && t.assignedToEmail.toLowerCase() === person.email?.toLowerCase());
      const isCollab = t.collaborators && t.collaborators.includes(person.email);

      if (isAssigned || isCollab) {
        if (!currentUser?.isSuperAdmin) {
          const myRole = currentUser?.appRole;
          const targetRole = normalizeRole(person.role);
          const isManagerRole = r => r === 'gerente' || r === 'director_maestria' || r === 'direccion';

          if (isManagerRole(myRole) && isManagerRole(targetRole) && currentUser.email?.toLowerCase() !== person.email?.toLowerCase()) {
            const iAmCreator = t.createdBy?.toLowerCase() === currentUser?.email?.toLowerCase();
            const iAmCollaborator = t.collaborators?.includes(currentUser?.email);
            if (!iAmCreator && !iAmCollaborator) return false;
          }
        }
        return true;
      }

      if (t.assignedToEmail || (t.assignedToEmails && t.assignedToEmails.length > 0)) return false;
      const tNorm = normalizeRole(t.role);
      const matchesRole = tNorm === canonicalRole || t.role === person.role;
      if (!matchesRole) return false;
      if (t.sede) {
        return t.sede === person.sede || t.sede === 'Global' || person.sede === 'Global';
      }
      return true;
    });

    const completed = myTasks.filter(t => {
      if (t.completions && person.sede && t.completions[person.sede]) {
        return t.completions[person.sede].completed;
      }
      return t.completed || t.status === 'Completada';
    }).length;

    totalSedeTasks += myTasks.length;
    totalSedeCompleted += completed;
  });

  const sedePct = totalSedeTasks > 0 ? Math.round((totalSedeCompleted / totalSedeTasks) * 100) : 0;
  const groupedMembers = members.reduce((acc, m) => { const k = normalizeRole(m.role || 'otro'); if (!acc[k]) acc[k] = []; acc[k].push(m); return acc; }, {});
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <Building2 size={20} color="var(--crear-gold)" />
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-heading)', fontWeight: 'bold' }}>{sede}</h3>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>👥 {members.length} personas</span>
              <span>✅ {totalSedeCompleted}/{totalSedeTasks} tareas</span>
            </div>
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: sedePct === 100 ? '#22c55e' : 'var(--crear-gold)', marginRight: '1rem' }}>{sedePct}%</span>
        </div>
        {expanded ? <ChevronDown size={18} color="var(--text-muted)" /> : <ChevronRight size={18} color="var(--text-muted)" />}
      </div>
      <div style={{ marginTop: '0.8rem' }}><ProgressBar value={sedePct} height="6px" /></div>
      {expanded && (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Object.entries(groupedMembers).filter(x => x[0] !== "participante" && x[0] !== "student").map(([role, pers]) => (
            <div key={role}>
              <h5 style={{ margin: '0 0 0.5rem 0', color: ROLE_COLORS[normalizeRole(role)] || 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                {ROLE_LABELS[normalizeRole(role)] || role}
              </h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {pers.map(p => <PersonCard key={p.email || p.name} person={p} tasks={tasks} navigate={navigate} onSelectUser={onSelectUser} onAssignTask={onAssignTask} currentUser={currentUser} userConnections={userConnections} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function AuditLogView() {
  const { currentUser } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('TODAS');
  // (02/09/2026) Ordenamiento por columna, pedido explícito de José: por
  // defecto se ve el último ingreso primero (más reciente arriba), y cada
  // columna se puede ordenar haciendo clic en su encabezado.
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState('desc');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let data = await getAllAuditLogs();
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching real audit logs", error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentUser]);

  const filteredLogs = logs.filter(log => {
    if (filterAction === 'TODAS') return true;
    return log.action === filterAction;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // Fecha empieza en descendente (más reciente primero); el resto de
      // columnas empieza en ascendente (A-Z), que es lo que se espera al
      // ordenar texto por primera vez.
      setSortDirection(field === 'timestamp' ? 'desc' : 'asc');
    }
  };

  const getSortValue = (log, field) => {
    switch (field) {
      case 'timestamp': {
        const t = new Date(log.timestamp);
        return isNaN(t.getTime()) ? 0 : t.getTime();
      }
      case 'usuario':
        return `${log.name || ''} ${log.email || ''}`.toLowerCase();
      case 'rol':
        return (ROLE_LABELS[log.role] || log.role || '').toLowerCase();
      case 'accion':
        return (log.action || '').toLowerCase();
      case 'detalle':
        return (log.details || '').toLowerCase();
      case 'ubicacion':
        return `${log.sede || ''} ${log.location || ''} ${log.ip || ''}`.toLowerCase();
      case 'dispositivo':
        return (log.userAgent || '').toLowerCase();
      default:
        return '';
    }
  };

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    const va = getSortValue(a, sortField);
    const vb = getSortValue(b, sortField);
    if (va < vb) return sortDirection === 'asc' ? -1 : 1;
    if (va > vb) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const thSortStyle = { padding: '0.8rem', color: 'var(--crear-cyan)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };
  const sortArrow = (field) => (sortField === field ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : '');

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ color: 'var(--crear-gold)', margin: 0 }}>🛡️ Auditoría de Accesos y Movimientos</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0.3rem 0 0 0', fontSize: '0.9rem' }}>Registro en tiempo real de inicios de sesión, cambios de rol y actividad operativa.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              fontSize: '0.85rem'
            }}
          >
            <option value="TODAS" style={{ color: 'black' }}>🔍 Todas las Acciones</option>
            <option value="USER_DEACTIVATED" style={{ color: 'black' }}>🚫 USER_DEACTIVATED (Bajas de Colaboradores)</option>
            <option value="USER_REACTIVATED" style={{ color: 'black' }}>✅ USER_REACTIVATED (Reactivaciones)</option>
            <option value="LOGIN" style={{ color: 'black' }}>🟢 LOGIN (Inicios de sesión reales)</option>
            <option value="CAMBIO_ROL" style={{ color: 'black' }}>🔄 CAMBIO_ROL (Permisos)</option>
            <option value="SIMULACION_ADMIN" style={{ color: 'black' }}>🎭 SIMULACION_ADMIN (Super Admin)</option>
            <option value="LOGOUT" style={{ color: 'black' }}>🔴 LOGOUT</option>
          </select>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="btn-secondary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? '⏳ Cargando...' : '🔄 Actualizar'}
          </button>
          <button
            onClick={async () => {
              if (loading) return;
              if (window.confirm('¿Deseas limpiar el caché local de registros de prueba?')) {
                localStorage.removeItem('cpsl_audit_logs');
                localStorage.removeItem('cpsl_user_connections');
                await fetchLogs();
              }
            }}
            disabled={loading}
            className="btn-secondary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: 'var(--text-muted)', opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            title="Limpia registros residuales de simulación local"
          >
            🧹 Limpiar Caché Local
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Cargando registros...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                <th onClick={() => handleSort('timestamp')} style={thSortStyle} title="Ordenar por fecha y hora">Fecha y Hora{sortArrow('timestamp')}</th>
                <th onClick={() => handleSort('usuario')} style={thSortStyle} title="Ordenar por usuario">Usuario{sortArrow('usuario')}</th>
                <th onClick={() => handleSort('rol')} style={thSortStyle} title="Ordenar por rol">Rol{sortArrow('rol')}</th>
                <th onClick={() => handleSort('accion')} style={thSortStyle} title="Ordenar por acción">Acción{sortArrow('accion')}</th>
                <th onClick={() => handleSort('detalle')} style={thSortStyle} title="Ordenar por detalle">Detalle{sortArrow('detalle')}</th>
                <th onClick={() => handleSort('ubicacion')} style={thSortStyle} title="Ordenar por ubicación">Ubicación e IP{sortArrow('ubicacion')}</th>
                <th onClick={() => handleSort('dispositivo')} style={thSortStyle} title="Ordenar por dispositivo">Dispositivo{sortArrow('dispositivo')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedLogs.map(log => {
                let dateStr = 'Desconocida';
                try {
                  if (log.timestamp?.toDate) {
                    dateStr = log.timestamp.toDate().toLocaleString('es-ES');
                  } else if (log.timestamp) {
                    dateStr = new Date(log.timestamp).toLocaleString('es-ES');
                  }
                } catch (e) { }

                const actionColor = log.action === 'LOGIN' ? '#22c55e' : (log.action === 'LOGOUT' ? '#ef4444' : (log.action === 'CAMBIO_ROL' ? 'var(--crear-cyan)' : 'var(--crear-gold)'));
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>{dateStr}</td>
                    <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>
                      {log.name || 'Usuario'}
                      <br />
                      <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>{log.email}</span>
                    </td>
                    <td style={{ padding: '0.8rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(255,255,255,0.06)',
                        color: ROLE_COLORS[log.role] || 'var(--text-heading)'
                      }}>
                        {ROLE_LABELS[log.role] || log.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.8rem', color: actionColor, fontWeight: 'bold' }}>{log.action}</td>
                    <td style={{ padding: '0.8rem', fontSize: '0.8rem', color: 'var(--text-main)', maxWidth: '220px' }}>
                      {log.details || '—'}
                    </td>
                    <td style={{ padding: '0.8rem' }}>
                      <strong>{log.sede || 'Global'}</strong>
                      <br />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.location || 'Acceso Seguro'} ({log.ip || '127.0.0.1'})</span>
                    </td>
                    <td style={{ padding: '0.8rem', fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.userAgent}>
                      {log.userAgent || 'Web Browser'}
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No hay registros de auditoría que coincidan con el filtro seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SuggestionsView() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('TODAS'); // 'TODAS' | 'Pendiente' | 'En Revisión' | 'Resuelto'
  const [selectedImg, setSelectedImg] = useState(null);
  const { showToast } = useUI();

  useEffect(() => {
    try {
      const q = query(collection(db, 'sugerencias_soporte'), orderBy('createdAt', 'desc'), limit(100));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSuggestions(list);
        setLoading(false);
      }, (err) => {
        console.error("Error escuchando sugerencias:", err);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'sugerencias_soporte', id), {
        status: newStatus
      });
      showToast(`Estado actualizado a: ${newStatus}`, 'success');
    } catch (err) {
      console.error("Error actualizando estado:", err);
      showToast('Error al actualizar estado', 'error');
    }
  };

  const filtered = suggestions.filter(item => {
    if (filterStatus === 'TODAS') return true;
    return item.status === filterStatus;
  });

  const getStatusBadge = (status) => {
    if (status === 'Resuelto') {
      return { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '#22c55e', text: '✅ Resuelto' };
    }
    if (status === 'En Revisión') {
      return { bg: 'rgba(234,179,8,0.15)', color: '#eab308', border: '#eab308', text: '⏳ En Revisión' };
    }
    return { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '#ef4444', text: '🔴 Pendiente' };
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ color: 'var(--crear-cyan)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            💡 Buzón de Sugerencias y Reportes de Usuarios
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: '0.3rem 0 0 0', fontSize: '0.9rem' }}>
            Retroalimentación, ideas y reportes enviados por colaboradores desde el Centro de Ayuda Causa OS en tiempo real.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              fontSize: '0.85rem'
            }}
          >
            <option value="TODAS" style={{ color: 'black' }}>🔍 Todos los Estados ({suggestions.length})</option>
            <option value="Pendiente" style={{ color: 'black' }}>🔴 Pendientes ({suggestions.filter(s => s.status === 'Pendiente' || !s.status).length})</option>
            <option value="En Revisión" style={{ color: 'black' }}>⏳ En Revisión ({suggestions.filter(s => s.status === 'En Revisión').length})</option>
            <option value="Resuelto" style={{ color: 'black' }}>✅ Resueltos ({suggestions.filter(s => s.status === 'Resuelto').length})</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Cargando sugerencias en tiempo real...</p>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ margin: 0 }}>No hay sugerencias registradas con el filtro seleccionado.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map((item) => {
            const badge = getStatusBadge(item.status);
            const dateStr = item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : (item.createdAtIso ? new Date(item.createdAtIso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : 'Reciente');
            return (
              <div
                key={item.id}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '1.2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.8rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-heading)' }}>{item.userName || 'Usuario'}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--crear-gold)', background: 'rgba(212,175,55,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        {item.userRole || 'Colaborador'}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        📍 {item.userSede || 'Global'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      ✉️ {item.userEmail || 'Sin correo'} • 🕒 {dateStr}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '12px',
                      fontSize: '0.78rem',
                      fontWeight: 'bold',
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}44`
                    }}>
                      {badge.text}
                    </span>
                    <select
                      value={item.status || 'Pendiente'}
                      onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-subtle)',
                        color: '#fff',
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Pendiente" style={{ color: 'black' }}>Marcar Pendiente</option>
                      <option value="En Revisión" style={{ color: 'black' }}>Marcar En Revisión</option>
                      <option value="Resuelto" style={{ color: 'black' }}>Marcar Resuelto</option>
                    </select>
                  </div>
                </div>

                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '1rem',
                  borderRadius: '6px',
                  color: 'var(--text-main)',
                  fontSize: '0.92rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap'
                }}>
                  {item.suggestion}
                </div>

                {item.imageUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Evidencia adjunta:</span>
                    <button
                      onClick={() => setSelectedImg(item.imageUrl)}
                      style={{ background: 'transparent', border: '1px solid var(--crear-cyan)', color: 'var(--crear-cyan)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      🔍 Ver Captura
                    </button>
                    <a
                      href={item.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}
                    >
                      Abrir enlace
                    </a>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginTop: '0.2rem' }}>
                  {item.userEmail && (
                    <a
                      href={`mailto:${item.userEmail}?subject=${encodeURIComponent(`Respuesta a tu reporte en Causa OS`)}`}
                      className="btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <Mail size={12} /> Responder por Correo
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedImg && (
        <div
          onClick={() => setSelectedImg(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 100000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img src={selectedImg} alt="Evidencia" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }} />
            <button
              onClick={() => setSelectedImg(null)}
              style={{ position: 'absolute', top: '-15px', right: '-15px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GlobalView({ tasks, navigate, realUsersData = [] }) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed || t.status === 'Completada').length;
  const criticalTasks = tasks.filter(t => !t.completed && t.status !== 'Completada' && (t.isCritical || t.priority === '🔴 ROJO' || t.priority?.includes('ROJO'))).length;
  const globalPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const roleGroups = [
    { id: 'gerente', alias: 'gerencia', label: 'Gerentes de Sede' },
    { id: 'coordinador_c1c2', alias: 'coord_c1', label: 'Coordinadores C1/C2' },
    { id: 'coordinador_mj', alias: 'coord_maestria', label: 'Coordinadores MJ' },
    { id: 'capitan', alias: 'capitán', label: 'Capitanes' },
    { id: 'qt', alias: 'quantum_team', label: 'Quantum Team' }
  ];

  const sedesRanking = OPERATIONAL_SEDES.map(sede => {
    const members = (realUsersData || []).filter(u => u.sede === sede);
    const sRoles = [...new Set(members.map(m => m.role))];
    const sedeTasks = tasks.filter(t => sRoles.includes(t.role));
    const sedeCompleted = sedeTasks.filter(t => {
      if (t.completions && t.completions[sede]) return t.completions[sede].completed;
      return t.completed || t.status === 'Completada';
    }).length;
    const sedePct = sedeTasks.length > 0 ? Math.round((sedeCompleted / sedeTasks.length) * 100) : 0;
    return { sede, sedePct, sedeCompleted, total: sedeTasks.length };
  }).sort((a, b) => b.sedePct - a.sedePct);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {[
          { icon: <CheckCircle2 size={22} color="#22c55e" />, label: 'Tareas Completadas', value: completedTasks, sub: `de ${totalTasks} totales`, color: '#22c55e', path: '/reportes' },
          { icon: <Clock size={22} color="var(--crear-gold)" />, label: 'Avance Global', value: `${globalPct}%`, sub: 'Causa OS del ciclo', color: 'var(--crear-gold)', path: '/reportes' },
          { icon: <AlertTriangle size={22} color="#ef4444" />, label: 'Alertas Críticas', value: criticalTasks, sub: 'requieren acción HOY', color: '#ef4444', path: '/reportes' },
          { icon: <Building2 size={22} color="#29abe2" />, label: 'Sedes Operativas', value: OPERATIONAL_SEDES.length, sub: 'sedes activas', color: '#29abe2', onClick: () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }) },
        ].map((kpi, i) => (
          <div
            key={i}
            className="glass-panel hover-glow"
            style={{ padding: '1.2rem', textAlign: 'center', border: `1px solid ${kpi.color}33`, cursor: 'pointer', transition: 'all 0.3s' }}
            onClick={() => kpi.path ? navigate(kpi.path) : kpi.onClick?.()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>{kpi.icon}</div>
            <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold', color: kpi.color }}>{kpi.value}</p>
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-heading)' }}>{kpi.label}</p>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{kpi.sub}</p>
          </div>
        ))}
      </div>
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginTop: 0, color: 'var(--crear-gold)' }}>Avance por Rol — Global</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1 }}><ProgressBar value={globalPct} height="12px" /></div>
          <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--crear-gold)', minWidth: '48px' }}>{globalPct}% total</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {roleGroups.map(role => {
            const roleTasks = tasks.filter(t => t.role === role.id || t.role === role.alias);
            const roleCompleted = roleTasks.filter(t => t.completed || t.status === 'Completada').length;
            const rolePct = roleTasks.length > 0 ? Math.round((roleCompleted / roleTasks.length) * 100) : 0;
            const roleColor = ROLE_COLORS[role.id] || '#6b7280';
            return (
              <div
                key={role.id}
                onClick={() => navigate(`/checklist/${role.id}`)}
                className="hover-glow"
                style={{ cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'background 0.3s' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                  <span style={{ color: 'var(--text-heading)', fontWeight: '500' }}>{role.label}</span>
                  <span style={{ color: roleColor, fontWeight: 'bold' }}>{rolePct}% ({roleCompleted}/{roleTasks.length})</span>
                </div>
                <ProgressBar value={rolePct} color={roleColor} height="6px" />
              </div>
            );
          })}
        </div>
      </div>
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginTop: 0, color: 'var(--crear-gold)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={20} /> Ranking Oficial de Sedes Operativas
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {sedesRanking.map(({ sede, sedePct, sedeCompleted, total }, idx) => (
            <div key={sede} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: idx === 0 ? '#f59e0b' : idx === 1 ? '#9ca3af' : idx === 2 ? '#cd7f32' : 'var(--text-muted)', fontWeight: 'bold', minWidth: '24px', fontSize: '0.85rem' }}>#{idx + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                  <span style={{ color: 'var(--text-heading)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {getFlagForSede(sede)} {sede}
                  </span>
                  <span style={{ color: sedePct >= 70 ? '#22c55e' : sedePct >= 40 ? 'var(--crear-gold)' : '#ef4444', fontWeight: 'bold' }}>{sedePct}%</span>
                </div>
                <ProgressBar value={sedePct} color={sedePct >= 70 ? '#22c55e' : sedePct >= 40 ? 'var(--crear-gold)' : '#ef4444'} height="6px" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoleView({ tasks, navigate, onSelectUser, onAssignTask, userConnections = {}, currentUser, realUsersData = [] }) {
  const roles = [
    { id: 'direccion', label: 'Dirección Global' },
    { id: 'cfo', label: 'CFO (Chief Financial Officer)' },
    { id: 'gerente', label: 'Gerentes de Sede' },
    { id: 'director_maestria', aliases: ['director_mj'], label: 'Directores de Maestría' },
    { id: 'coord_c1', aliases: ['coordinador_c1c2', 'coord_c1', 'coord_c2', 'coordinador_c1', 'coordinador_c2'], label: 'Coordinadores C1/C2' },
    { id: 'coord_maestria', aliases: ['coordinador_mj', 'coord_maestria', 'coordinador_maestria'], label: 'Coordinadores de Maestría' },
    { id: 'capitan', label: 'Capitanes' },
    { id: 'manager', label: 'Managers' },
    { id: 'entrenador', aliases: ['entrenador'], label: 'Entrenadores (Coaches)' },
    { id: 'entrenador_llamadas', aliases: ['entrenador_llamadas'], label: 'Entrenadores de Llamadas' },
    { id: 'qt', label: 'Quantum Team' },
    { id: 'coordinador', aliases: ['coordinador_administrativo'], label: 'Coordinación Administrativa' },
    { id: 'finanzas', label: 'Finanzas' },
    { id: 'asistente_impuestos_quito', label: 'Impuestos / Tributaria' },
    { id: 'talento_humano', label: 'Talento Humano' },
    { id: 'legal', label: 'Legal / Jurídico' },
    { id: 'técnico_sst', label: 'Seguridad y Salud (SST)' },
    { id: 'participante', label: 'Participantes' },
  ];

  const allKnownIds = new Set();
  roles.forEach(r => {
    allKnownIds.add(r.id);
    (r.aliases || []).forEach(a => allKnownIds.add(a));
  });

  const unlistedRoles = [...new Set((realUsersData || []).map(u => normalizeRole(u.role)).filter(r => r && !allKnownIds.has(r)))];
  const allDisplayRoles = [
    ...roles,
    ...unlistedRoles.map(r => ({ id: r, label: ROLE_LABELS[r] || r }))
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {allDisplayRoles.map(role => {
        const members = (realUsersData || []).filter(u => {
          const canonical = normalizeRole(u.role);
          if (canonical === role.id || u.role === role.id) return true;
          if (role.aliases && (role.aliases.includes(canonical) || role.aliases.includes(u.role))) return true;
          return false;
        });
        if (members.length === 0) return null;
        const roleColor = ROLE_COLORS[role.id] || '#6b7280';
        return (
          <div key={role.id}>
            <h3 style={{ color: roleColor, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} /> {role.label} <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'normal' }}>({members.length} persona{members.length > 1 ? 's' : ''})</span>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.8rem' }}>
              {members.map(person => (
                <PersonCard
                  key={person.id || person.email}
                  person={person}
                  tasks={tasks}
                  navigate={navigate}
                  onSelectUser={onSelectUser}
                  onAssignTask={onAssignTask}
                  currentUser={currentUser}
                  userConnections={userConnections}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SuperAdminPanel() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { tasks } = useChecklist();
  const { currentStage } = useCycles();
  const canAccessGlobal = currentUser?.isSuperAdmin || currentUser?.appRole === 'direccion' || currentUser?.appRole === 'director_maestria' || currentUser?.appRole === 'talento_humano' || (currentUser?.roles || []).includes('talento_humano');
  const [activeView, setActiveView] = useState(canAccessGlobal ? 'global' : 'sede');
  const [selectedUser, setSelectedUser] = useState(null);
  const [assignUser, setAssignUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [userConnections, setUserConnections] = useState({});
  const [realUsersData, setRealUsersData] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { showToast } = useUI();

  // NOTA (28/08/2026): este botón antes llamaba a 'http://localhost:3001/...',
  // una dirección que solo existe en una máquina de desarrollo local — por eso
  // siempre fallaba con "Failed to fetch" en producción. Ahora dispara el
  // workflow real de GitHub Actions (.github/workflows/nodus-daily.yml, el
  // mismo que corre automático a mediodía) bajo demanda, a través de un
  // endpoint nuevo en el mismo Worker del Copiloto SO-AR
  // (POST /trigger-nodus-scraper). No ejecuta el scraper aquí mismo: solo lo
  // dispara y GitHub Actions hace el trabajo real en 2-5 minutos.
  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      showToast("Disparando extracción de Nodus vía GitHub Actions...", "info");
      const workerUrl = import.meta.env.VITE_COPILOTO_WORKER_URL || 'https://so-ar-copiloto.crearpsl-cpsl.workers.dev';
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('No se detectó sesión activa. Cierra sesión e inicia nuevamente.');
      const idToken = await firebaseUser.getIdToken(true);
      const res = await fetch(`${workerUrl}/trigger-nodus-scraper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({})
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'No se pudo disparar la extracción.');
      showToast("¡Extracción de Nodus disparada! Corre en GitHub Actions (2-5 min) y actualiza el snapshot al terminar.", "success");
    } catch (e) {
      console.error(e);
      showToast("Error al iniciar Nodus: " + e.message, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const [isHealingRoles, setIsHealingRoles] = useState(false);
  const [roleAuditModalData, setRoleAuditModalData] = useState(null);

  const handleRunRoleIntegrityAgent = async () => {
    try {
      setIsHealingRoles(true);
      showToast("🛡️ Agente Supervisor de Roles analizando la base de datos...", "info");
      const report = await runRoleIntegrityAuditAndHeal({ dryRun: false });
      if (report.status === 'success') {
        const refreshed = await getAllCompanyUsers();
        setRealUsersData(refreshed);
        setRoleAuditModalData(report);
        if (report.rolesRepaired > 0) {
          showToast(`✅ Se sanaron y restauraron ${report.rolesRepaired} cargos alterados o duplicados sin colapsos.`, "success");
        } else {
          showToast(`✅ Integridad de roles perfecta: ${report.totalUsersScanned} usuarios analizados, cero colapsos.`, "success");
        }
      } else {
        showToast("Error en auditoría de roles: " + (report.error || 'Error desconocido'), "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error ejecutando agente de roles: " + err.message, "error");
    } finally {
      setIsHealingRoles(false);
    }
  };


  // HOTFIX temporal para corregir el rol de José Sánchez en la base de datos
  useEffect(() => {
    if (currentUser?.email === 'jose.sanchez@crearpsl.net' && currentUser?.dbId) {
      const fixRole = async () => {
        try {
          const { doc, updateDoc } = await import('firebase/firestore');
          const userRef = doc(db, 'users', currentUser.dbId);
          await updateDoc(userRef, {
            role: 'gerente',
            roles: ['gerente', 'qt', 'superadmin'],
            sede: 'Lima'
          });
          console.log("Rol de José Sánchez corregido en DB.");
        } catch (err) {
          console.error("Error corrigiendo rol:", err);
        }
      };
      fixRole();
    }
  }, [currentUser]);

  // Saneamiento y sincronización de identidad de Alex Zapata (redes sociales -> Alex Zapata)
  useEffect(() => {
    const healAlexZapata = async () => {
      try {
        const { collection, query, where, getDocs, updateDoc, doc, setDoc } = await import('firebase/firestore');
        const q = query(collection(db, 'users'), where('email', '==', 'redessociales@crearpsl.net'));
        const snap = await getDocs(q);
        snap.forEach(async (d) => {
          const data = d.data();
          if (data.name !== 'Alex Zapata' || data.displayName !== 'Alex Zapata') {
            await updateDoc(doc(db, 'users', d.id), {
              name: 'Alex Zapata',
              displayName: 'Alex Zapata'
            });
            console.log("Nombre de Alex Zapata sincronizado en Firestore (users).");
          }
        });

        // Asegurar consistencia en user_profiles
        const profileRef = doc(db, 'user_profiles', 'redessociales@crearpsl.net');
        await setDoc(profileRef, {
          name: 'Alex Zapata',
          displayName: 'Alex Zapata',
          email: 'redessociales@crearpsl.net',
          role: 'marketing',
          sede: 'Global'
        }, { merge: true });
      } catch (err) {
        console.warn("Saneamiento de perfil Alex Zapata:", err);
      }
    };
    healAlexZapata();
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function fetchUsers() {
      try {
        const users = await getAllCompanyUsers();
        if (isMounted) setRealUsersData(users);
      } catch (err) {
        console.error("Error cargando usuarios:", err);
      } finally {
        if (isMounted) setUsersLoading(false);
      }
    }
    fetchUsers();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function fetchConnections() {
      try {
        const conns = await getAllUserConnections();
        if (isMounted && conns) {
          setUserConnections(conns);
        }
      } catch (err) {
        console.warn("Error loading user connections in SuperAdminPanel:", err);
      }
    }
    fetchConnections();
    return () => { isMounted = false; };
  }, [currentUser]);

  const handleOpenUserModal = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const tabStyle = (view) => ({
    padding: '0.6rem 1.2rem',
    borderRadius: '8px',
    border: 'none',
    background: activeView === view ? 'var(--crear-gold)' : 'var(--bg-card)',
    color: activeView === view ? '#000' : 'var(--text-muted)',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 0.2s',
  });

  const displayedUsersData = (realUsersData || []).filter(u => {
    const isInactive = u.isActive === false || u.status === 'inactive' || u.active === false;
    if (statusFilter === 'ACTIVE') return !isInactive;
    if (statusFilter === 'INACTIVE') return isInactive;
    return true;
  });

  const searchFilteredUsers = searchTerm.trim() ? displayedUsersData.filter(u => {
    const term = searchTerm.toLowerCase().trim();
    const nameMatch = u.name?.toLowerCase().includes(term);
    const emailMatch = u.email?.toLowerCase().includes(term);
    const roleMatch = (ROLE_LABELS[u.role] || u.role)?.toLowerCase().includes(term);
    const sedeMatch = u.sede?.toLowerCase().includes(term);
    return nameMatch || emailMatch || roleMatch || sedeMatch;
  }) : [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      <button onClick={() => navigate('/home')} className="btn-secondary" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
        <ArrowLeft size={16} /> Volver al Inicio
      </button>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-gold uppercase" style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>{currentUser?.isSuperAdmin ? 'Panel Super Admin' : 'Directorio de Equipo'} — Monitoreo Global</h1>
          <p className="text-muted" style={{ margin: 0 }}>Visibilidad total del sistema Causa OS en todas las sedes y roles.</p>
        </div>
        {currentUser?.isSuperAdmin && (
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            <button 
              onClick={handleRunRoleIntegrityAgent}
              disabled={isHealingRoles}
              className="btn-secondary" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: isHealingRoles ? '#6b7280' : 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid #38bdf8', borderRadius: '8px', cursor: isHealingRoles ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
              title="Supervisa en línea que los roles no estén alterados, perdidos, inválidos ni colapsados en Coordinación Administrativa"
            >
              <ShieldCheck size={18} />
              {isHealingRoles ? 'Sanando Roles...' : '🛡️ Integridad de Roles'}
            </button>
            <button 
              onClick={handleManualSync}
              disabled={isSyncing}
              className="btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: isSyncing ? '#6b7280' : 'linear-gradient(135deg, #10b981, #047857)', color: '#fff', border: 'none', borderRadius: '8px', cursor: isSyncing ? 'not-allowed' : 'pointer' }}>
              <Globe size={18} />
              {isSyncing ? 'Sincronizando Nodus...' : 'Extraer Nodus'}
            </button>
          </div>
        )}

      </div>

      <TaskAssignmentModal
        isOpen={!!assignUser}
        onClose={() => setAssignUser(null)}
        prefilledUser={assignUser}
      />

      <div className="glass-panel" style={{ padding: '0.8rem 1.2rem', marginBottom: '1.5rem', border: '1px solid var(--border-subtle)', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          flex: 1,
          minWidth: '260px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'rgba(0, 0, 0, 0.05)',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)'
        }}>
          <Search size={20} color={searchTerm ? "var(--crear-gold)" : "var(--text-muted)"} />
          <input
            type="text"
            placeholder="🔍 Buscar persona por nombre, email, rol o sede (ej. Leyla, Darkwin, Quito, Quantum Team, Gerente)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none', color: 'var(--text-heading)',
              fontSize: '0.95rem', outline: 'none'
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                background: 'var(--border-subtle)', border: 'none', color: 'var(--text-muted)',
                borderRadius: '50%', width: '24px', height: '24px', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}
              title="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Selector de Filtro de Estado (Bajas / Activos) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Estado:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: statusFilter === 'INACTIVE' ? '#ef4444' : statusFilter === 'ACTIVE' ? '#22c55e' : 'var(--text-heading)',
              border: '1px solid var(--border-subtle)',
              padding: '0.45rem 0.8rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <option value="ALL" style={{ color: 'black' }}>👥 Todos ({realUsersData.length})</option>
            <option value="ACTIVE" style={{ color: 'black' }}>🟢 Solo Activos ({realUsersData.filter(u => !(u.isActive === false || u.status === 'inactive' || u.active === false)).length})</option>
            <option value="INACTIVE" style={{ color: 'black' }}>🔴 Solo Inactivos / Bajas ({realUsersData.filter(u => u.isActive === false || u.status === 'inactive' || u.active === false).length})</option>
          </select>
        </div>
      </div>

      {searchTerm.trim() ? (
        <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: 'var(--crear-gold)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <Users size={20} /> Resultados de Búsqueda ({searchFilteredUsers.length})
            </h3>
            <button
              onClick={() => setSearchTerm('')}
              style={{ background: 'transparent', border: 'none', color: 'var(--crear-cyan)', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Cerrar búsqueda
            </button>
          </div>

          {searchFilteredUsers.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Search size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p style={{ margin: 0 }}>No se encontraron colaboradores que coincidan con "<strong>{searchTerm}</strong>".</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.8rem' }}>
              {searchFilteredUsers.map(person => (
                <PersonCard
                  key={person.id || person.email}
                  person={person}
                  tasks={tasks}
                  navigate={navigate}
                  onSelectUser={handleOpenUserModal}
                  onAssignTask={setAssignUser}
                  currentUser={currentUser}
                  userConnections={userConnections}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Vistas normales por pestañas */
        <>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            {canAccessGlobal && (
              <button style={tabStyle('global')} onClick={() => setActiveView('global')}>🌐 Global</button>
            )}
            <button style={tabStyle('sede')} onClick={() => setActiveView('sede')}>🏢 Por Sede</button>
            {canAccessGlobal && (
              <button style={tabStyle('rol')} onClick={() => setActiveView('rol')}>👥 Por Rol</button>
            )}
            {(currentUser?.isSuperAdmin || currentUser?.appRole === 'talento_humano' || (currentUser?.roles || []).includes('talento_humano')) && (
              <button style={tabStyle('auditoria')} onClick={() => setActiveView('auditoria')}>🛡️ Auditoría</button>
            )}
            {(currentUser?.isSuperAdmin || currentUser?.appRole === 'direccion') && (
              <button style={tabStyle('sugerencias')} onClick={() => setActiveView('sugerencias')}>💡 Buzón Sugerencias</button>
            )}
          </div>
          {activeView === 'global' && <GlobalView tasks={tasks} navigate={navigate} realUsersData={displayedUsersData} />}
          {activeView === 'sede' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p className="text-muted text-sm" style={{ marginBottom: '0.5rem' }}>Clic en una sede para expandir y ver el detalle de cada persona y su avance operativo.</p>
              {ALL_SEDES.filter(sede => {
                if (canAccessGlobal) return true;
                return normalizeSede(currentUser?.sede) === sede;
              }).map(sede => (
                <SedeBlock
                  key={sede}
                  sede={sede}
                  tasks={tasks}
                  navigate={navigate}
                  onSelectUser={handleOpenUserModal}
                  onAssignTask={setAssignUser}
                  currentUser={currentUser}
                  userConnections={userConnections}
                  realUsersData={displayedUsersData}
                />
              ))}
            </div>
          )}
          {activeView === 'rol' && (
            <RoleView
              tasks={tasks}
              navigate={navigate}
              onSelectUser={handleOpenUserModal}
              onAssignTask={setAssignUser}
              currentUser={currentUser}
              userConnections={userConnections}
              realUsersData={displayedUsersData}
            />
          )}
          {activeView === 'auditoria' && (
            <AuditLogView />
          )}
          {activeView === 'sugerencias' && (
            <SuggestionsView />
          )}
        </>
      )}

      {/* Modal del Agente de Integridad de Roles */}
      {roleAuditModalData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '650px', width: '100%', maxHeight: '85vh', overflowY: 'auto',
            background: '#0f172a', border: '1px solid #38bdf8', padding: '1.5rem', borderRadius: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ShieldCheck size={24} color="#38bdf8" />
                <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '1.2rem' }}>Informe de Integridad de Roles</h3>
              </div>
              <button onClick={() => setRoleAuditModalData(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem', marginBottom: '1.2rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#f8fafc' }}>{roleAuditModalData.totalUsersScanned}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Escaneados</div>
              </div>
              <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '0.8rem', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#38bdf8' }}>{roleAuditModalData.rolesRepaired}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cargos Sanados</div>
              </div>
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '0.8rem', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#22c55e' }}>{roleAuditModalData.duplicatesRemoved}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Depurados</div>
              </div>
            </div>

            {roleAuditModalData.rolesRepaired === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(34, 197, 94, 0.08)', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)', marginBottom: '1.2rem' }}>
                <CheckCircle2 size={32} color="#22c55e" style={{ margin: '0 auto 0.5rem auto' }} />
                <p style={{ margin: 0, fontWeight: 'bold', color: '#22c55e' }}>¡Estructura de Roles Impecable!</p>
                <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>Todos los roles coinciden con el catálogo operativo. Cero colapsos indebidos.</p>
              </div>
            ) : (
              <div style={{ marginBottom: '1.2rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: '#f8fafc', marginBottom: '0.6rem' }}>Detalle de Colaboradores Reparados en Línea:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '240px', overflowY: 'auto' }}>
                  {roleAuditModalData.healedUsers.map((u, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.8rem', borderRadius: '6px', borderLeft: '3px solid #38bdf8' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#f8fafc' }}>{u.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                          {ROLE_LABELS[u.repairedRole] || u.repairedRole}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>{u.email}</div>
                      <ul style={{ margin: '0.3rem 0 0 0', paddingLeft: '1.2rem', fontSize: '0.72rem', color: '#cbd5e1' }}>
                        {u.issues.map((iss, i) => (
                          <li key={i}>{iss}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button 
                onClick={() => setRoleAuditModalData(null)}
                className="btn-primary"
                style={{ padding: '0.5rem 1.2rem', background: '#38bdf8', color: '#0f172a', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Perfil de Usuario Completo */}
      {showUserModal && selectedUser && (
        <UserProfileModal
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          user={selectedUser}
          allTasks={tasks}
          onStatusUpdated={(updated) => {
            setRealUsersData(prev => prev.map(u => (u.id === updated.id || u.email?.toLowerCase() === updated.email?.toLowerCase()) ? { ...u, ...updated } : u));
            setSelectedUser(prev => ({ ...prev, ...updated }));
          }}
        />
      )}

    </div>
  );
}
