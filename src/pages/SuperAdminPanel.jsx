import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChecklist } from '../context/ChecklistContext';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useUI } from '../context/UIContext';
import { doc, setDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { usersData, normalizeRole, normalizeSede, OPERATIONAL_SEDES } from '../data/usersData';
import { Globe, Building2, Users, ArrowLeft, ChevronDown, ChevronRight, Eye, CheckCircle2, Clock, AlertTriangle, TrendingUp, UserCheck, FileText, Search, X, PlusCircle } from 'lucide-react';
import { getFlagForSede } from '../utils/flags';
import UserProfileModal from '../components/UserProfileModal';
import IAAuditor from '../components/IAAuditor';
import TaskAssignmentModal from '../components/TaskAssignmentModal';
import { getAllAuditLogs, recordAuditEvent, getAllUserConnections } from '../services/auditService';

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
  qt: '#ec4899',
  coordinador: '#0ea5e9',
  finanzas: '#6b7280',
  asistente_impuestos_quito: '#64748b',
  talento_humano: '#06b6d4',
  legal: '#a855f7',
  técnico_sst: '#14b8a6'
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
  const roleColor = ROLE_COLORS[canonicalRole] || ROLE_COLORS[person.role] || '#6b7280';

  return (
    <div 
      className="glass-panel hover-glow" 
      onClick={() => onSelectUser && onSelectUser(person)}
      style={{ 
        padding: '1rem 1.2rem', borderLeft: `4px solid ${roleColor}`, 
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div 
          style={{ 
            width: '42px', 
            height: '42px', 
            borderRadius: '50%', 
            background: 'rgba(255,255,255,0.08)', 
            border: '1px solid rgba(255,255,255,0.15)',
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
          <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-heading)' }}>{person.name}</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: roleColor, fontWeight: 600 }}>
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

function SedeBlock({ sede, tasks, navigate, onSelectUser, onAssignTask, currentUser, userConnections = {} }) {
  const [expanded, setExpanded] = useState(false);
  const members = usersData.filter(u => normalizeSede(u.sede) === sede);
  
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
  const groupedMembers = members.reduce((acc, m) => { const k = m.role || 'otro'; if (!acc[k]) acc[k] = []; acc[k].push(m); return acc; }, {});
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
          {Object.entries(groupedMembers).map(([role, pers]) => (
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
            <option value="LOGIN" style={{ color: 'black' }}>🟢 LOGIN (Inicios de sesión reales)</option>
            <option value="CAMBIO_ROL" style={{ color: 'black' }}>🔄 CAMBIO_ROL (Permisos)</option>
            <option value="SIMULACION_ADMIN" style={{ color: 'black' }}>🎭 SIMULACION_ADMIN (Super Admin)</option>
            <option value="LOGOUT" style={{ color: 'black' }}>🔴 LOGOUT</option>
          </select>
          <button 
            onClick={fetchLogs} 
            className="btn-secondary" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            🔄 Actualizar
          </button>
          <button 
            onClick={async () => {
              if (window.confirm('¿Deseas limpiar el caché local de registros de prueba?')) {
                localStorage.removeItem('cpsl_audit_logs');
                localStorage.removeItem('cpsl_user_connections');
                await fetchLogs();
              }
            }} 
            className="btn-secondary" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}
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
                <th style={{ padding: '0.8rem', color: 'var(--crear-cyan)' }}>Fecha y Hora</th>
                <th style={{ padding: '0.8rem', color: 'var(--crear-cyan)' }}>Usuario</th>
                <th style={{ padding: '0.8rem', color: 'var(--crear-cyan)' }}>Rol</th>
                <th style={{ padding: '0.8rem', color: 'var(--crear-cyan)' }}>Acción</th>
                <th style={{ padding: '0.8rem', color: 'var(--crear-cyan)' }}>Detalle</th>
                <th style={{ padding: '0.8rem', color: 'var(--crear-cyan)' }}>Ubicación e IP</th>
                <th style={{ padding: '0.8rem', color: 'var(--crear-cyan)' }}>Dispositivo</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => {
                let dateStr = 'Desconocida';
                try {
                  if (log.timestamp?.toDate) {
                    dateStr = log.timestamp.toDate().toLocaleString('es-ES');
                  } else if (log.timestamp) {
                    dateStr = new Date(log.timestamp).toLocaleString('es-ES');
                  }
                } catch(e) {}

                const actionColor = log.action === 'LOGIN' ? '#22c55e' : (log.action === 'LOGOUT' ? '#ef4444' : (log.action === 'CAMBIO_ROL' ? 'var(--crear-cyan)' : 'var(--crear-gold)'));
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>{dateStr}</td>
                    <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>
                      {log.name || 'Usuario'}
                      <br/>
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
                      <br/>
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

function GlobalView({ tasks, navigate }) {
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
    const members = usersData.filter(u => u.sede === sede);
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
          { icon: <Building2 size={22} color="#29abe2" />, label: 'Sedes Operativas', value: OPERATIONAL_SEDES.length, sub: 'sedes activas', color: '#29abe2', onClick: () => window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'}) },
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
              <span style={{ color: idx === 0 ? '#f59e0b' : idx === 1 ? '#9ca3af' : idx === 2 ? '#cd7f32' : 'var(--text-muted)', fontWeight: 'bold', minWidth: '24px', fontSize: '0.85rem' }}>#{idx+1}</span>
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

function RoleView({ tasks, navigate, onSelectUser, onAssignTask, userConnections = {}, currentUser }) {
  const roles = [
    { id: 'direccion', label: 'Dirección Global' },
    { id: 'cfo', label: 'CFO (Chief Financial Officer)' },
    { id: 'gerente', label: 'Gerentes de Sede' },
    { id: 'director_maestria', label: 'Directores de Maestría' },
    { id: 'coordinador_c1c2', label: 'Coordinadores C1/C2' },
    { id: 'coordinador_mj', label: 'Coordinadores de Maestría' },
    { id: 'capitan', label: 'Capitanes' },
    { id: 'manager', label: 'Managers' },
    { id: 'qt', label: 'Quantum Team' },
    { id: 'coordinador', label: 'Coordinación Administrativa' },
    { id: 'finanzas', label: 'Finanzas' },
    { id: 'asistente_impuestos_quito', label: 'Impuestos / Tributaria' },
    { id: 'talento_humano', label: 'Talento Humano' },
    { id: 'legal', label: 'Legal / Jurídico' },
    { id: 'técnico_sst', label: 'Seguridad y Salud (SST)' },
  ];

  const listedRoleIds = new Set(roles.map(r => r.id));
  const unlistedRoles = [...new Set(usersData.map(u => u.role).filter(r => !listedRoleIds.has(r)))];
  const allDisplayRoles = [
    ...roles,
    ...unlistedRoles.map(r => ({ id: r, label: ROLE_LABELS[r] || r }))
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {allDisplayRoles.map(role => {
        const members = usersData.filter(u => u.role === role.id || normalizeRole(u.role) === role.id);
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
  const [activeView, setActiveView] = useState((currentUser?.isSuperAdmin || currentUser?.appRole === 'direccion' || currentUser?.appRole === 'director_maestria') ? 'global' : 'sede');
  const [selectedUser, setSelectedUser] = useState(null);
  const [assignUser, setAssignUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userConnections, setUserConnections] = useState({});
  const { showToast } = useUI();

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

  const searchFilteredUsers = searchTerm.trim() ? usersData.filter(u => {
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
      </div>

      <TaskAssignmentModal 
        isOpen={!!assignUser} 
        onClose={() => setAssignUser(null)} 
        prefilledUser={assignUser} 
      />

      <div className="glass-panel" style={{ padding: '0.8rem 1.2rem', marginBottom: '1.5rem', border: '1px solid var(--border-subtle)' }}>
        <div style={{
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
            {(currentUser?.isSuperAdmin || currentUser?.appRole === 'direccion' || currentUser?.appRole === 'director_maestria') && (
              <button style={tabStyle('global')} onClick={() => setActiveView('global')}>🌐 Global</button>
            )}
            <button style={tabStyle('sede')} onClick={() => setActiveView('sede')}>🏢 Por Sede</button>
            {(currentUser?.isSuperAdmin || currentUser?.appRole === 'direccion' || currentUser?.appRole === 'director_maestria') && (
              <button style={tabStyle('rol')} onClick={() => setActiveView('rol')}>👥 Por Rol</button>
            )}
            {currentUser?.isSuperAdmin && (
              <button style={tabStyle('auditoria')} onClick={() => setActiveView('auditoria')}>🛡️ Auditoría</button>
            )}
          </div>
          {activeView === 'global' && <GlobalView tasks={tasks} navigate={navigate} />}
          {activeView === 'sede' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p className="text-muted text-sm" style={{ marginBottom: '0.5rem' }}>Clic en una sede para expandir y ver el detalle de cada persona y su avance operativo.</p>
              {ALL_SEDES.filter(sede => {
                if (currentUser?.isSuperAdmin || currentUser?.appRole === 'direccion' || currentUser?.appRole === 'director_maestria') return true;
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
            />
          )}
          {activeView === 'auditoria' && (
            <AuditLogView />
          )}
        </>
      )}

      {/* Modal de Perfil de Usuario Completo */}
      {showUserModal && selectedUser && (
        <UserProfileModal 
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          user={selectedUser}
          allTasks={tasks}
        />
      )}
    </div>
  );
}
