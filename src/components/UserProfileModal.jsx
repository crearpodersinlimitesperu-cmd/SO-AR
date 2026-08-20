import { getWhatsAppUrl } from '../utils/phoneUtils';
import { useState, useEffect } from 'react';
import { 
  X, User, CheckCircle2, Clock, AlertTriangle, 
  FileText, Link2, Plus, Trash2, ExternalLink, Calendar, 
  Building2, Mail, Shield, PlusCircle, CheckSquare, Eye
} from 'lucide-react';
import { db } from '../services/firebase';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useChecklist } from '../context/ChecklistContext';
import { normalizeRole, normalizeSede, getRoleDisplayName } from '../data/usersData';
import { useUI } from '../context/UIContext';
import { useNavigate } from 'react-router-dom';
import { isSuperAdminEmail, canSimulate } from '../config/permissions';
import { getFlagForSede } from '../utils/flags';
import TaskAssignmentModal from './TaskAssignmentModal';

const ROLE_LABELS = {
  gerente: 'Gerente de Sede',
  coordinador_c1c2: 'Coordinador Capítulo 1 y 2 (C1 / C2)',
  coord_c1: 'Coordinador Capítulo 1 y 2 (C1 / C2)',
  coordinador_mj: 'Coordinador Maestría del Juego (MJ)',
  coord_maestria: 'Coordinador Maestría del Juego (MJ)',
  director_maestria: 'Director Maestría del Juego (MJ)',
  capitan: 'Capitán',
  manager: 'Manager',
  talento_humano: 'Talento Humano',
  legal: 'Legal / Finanzas',
  entrenador: 'Entrenador',
  entrenador_llamadas: 'Entrenador de Llamadas',
  qt: 'Quantum Team',
  corporativo: 'Dirección Corporativa',
  direccion: 'Dirección Global',
  cfo: 'CFO',
  cco: 'CCO',
  ceo: 'CEO',
  admin: 'Administración'
};

const ROLE_COLORS = {
  direccion: '#ef4444',
  director_maestria: '#f97316',
  gerente: '#22c55e',
  coord_maestria: '#a855f7',
  coordinador_mj: '#a855f7',
  coord_c1: '#3b82f6',
  coordinador_c1c2: '#3b82f6',
  capitan: '#eab308',
  manager: '#ec4899',
  qt: '#14b8a6',
  talento_humano: '#06b6d4',
  legal: '#a855f7',
  entrenador: '#fbbf24',
  entrenador_llamadas: '#38bdf8'
};

export default function UserProfileModal({ isOpen, onClose, user, allTasks = [] }) {
  const { currentUser, originalAdminUser, simulateUser } = useAuth();
  const navigate = useNavigate();
  const { toggleTask } = useChecklist();
  const { showToast } = useUI();

  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'notes' | 'documents'
  const [profileData, setProfileData] = useState({ notes: [], documents: [] });
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Form states for Notes & Documents
  const [newNoteText, setNewNoteText] = useState('');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isSavingDoc, setIsSavingDoc] = useState(false);

  // Task assignment submodal
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Firestore sync for user meta
  useEffect(() => {
    if (!isOpen || !user?.email) return;

    const userDocId = user.email.toLowerCase().trim();
    const userDocRef = doc(db, 'user_profiles', userDocId);

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      let localConns = {};
      try {
        localConns = JSON.parse(localStorage.getItem('cpsl_user_connections') || '{}');
      } catch(e) {}
      const localUserConn = localConns[userDocId];

      if (docSnap.exists()) {
        const data = docSnap.data();
        let lastLoginFormatted = null;
        if (data.lastLoginAt?.toDate) {
          lastLoginFormatted = data.lastLoginAt.toDate().toLocaleString('es-ES');
        } else if (data.lastLoginAtIso) {
          lastLoginFormatted = new Date(data.lastLoginAtIso).toLocaleString('es-ES');
        } else if (localUserConn?.lastLoginAt) {
          lastLoginFormatted = new Date(localUserConn.lastLoginAt).toLocaleString('es-ES');
        }

        setProfileData({
          notes: data.notes || [],
          documents: data.documents || [],
          lastLoginAt: lastLoginFormatted,
          lastIp: data.lastIp || localUserConn?.ip || null,
          lastLocation: data.lastLocation || localUserConn?.location || null,
          lastUserAgent: data.lastUserAgent || localUserConn?.userAgent || null,
          hasConnected: !!(lastLoginFormatted || data.lastLoginAt || localUserConn?.lastLoginAt)
        });
      } else {
        const lastLoginFormatted = localUserConn?.lastLoginAt ? new Date(localUserConn.lastLoginAt).toLocaleString('es-ES') : null;
        setProfileData({
          notes: [],
          documents: [],
          lastLoginAt: lastLoginFormatted,
          lastIp: localUserConn?.ip || null,
          lastLocation: localUserConn?.location || null,
          lastUserAgent: localUserConn?.userAgent || null,
          hasConnected: !!lastLoginFormatted
        });
      }
      setLoadingMeta(false);
    }, (err) => {
      console.error("Error fetching user profile meta:", err);
      setLoadingMeta(false);
    });

    return () => unsubscribe();
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const canonicalRole = normalizeRole(user.role);
  const roleColor = ROLE_COLORS[canonicalRole] || ROLE_COLORS[user.role] || '#29abe2';
  const roleLabel = ROLE_LABELS[canonicalRole] || ROLE_LABELS[user.role] || user.role;

  // Filter tasks belonging to this user:
  // 1. Base tasks of this user's role and sede
  // 2. Direct assigned custom tasks (assignedToEmail)
  const userTasks = allTasks.filter(t => {
    const isAssigned = t.assignedToEmail && t.assignedToEmail.toLowerCase() === user.email?.toLowerCase();
    const isCollab = t.collaborators && t.collaborators.includes(user.email);
    
    if (isAssigned || isCollab) {
      // Regla de Privacidad: Si yo (currentUser) soy gerente/director y estoy viendo el perfil de otro gerente/director
      if (!currentUser?.isSuperAdmin) {
        const myRole = currentUser?.appRole;
        const targetRole = normalizeRole(user.role);
        const isManagerRole = r => r === 'gerente' || r === 'director_maestria' || r === 'direccion';
        
        if (isManagerRole(myRole) && isManagerRole(targetRole) && currentUser.email?.toLowerCase() !== user.email?.toLowerCase()) {
          const iAmCreator = t.createdBy?.toLowerCase() === currentUser?.email?.toLowerCase();
          const iAmCollaborator = t.collaborators?.includes(currentUser?.email);
          if (!iAmCreator && !iAmCollaborator) return false;
        }
      }
      return true;
    }

    if (t.assignedToEmail) return false; // Is a specific task for someone else

    const tRoleNorm = normalizeRole(t.role);
    const roleMatches = tRoleNorm === canonicalRole || t.role === user.role;
    if (!roleMatches) return false;

    // Check sede match
    if (t.sede) {
      return t.sede === user.sede || t.sede === 'Global' || user.sede === 'Global';
    }
    return true;
  });

  const completedTasks = userTasks.filter(t => {
    if (t.completions && user.sede && t.completions[user.sede]) {
      return t.completions[user.sede].completed;
    }
    return t.completed || t.status === 'Completada';
  });

  const criticalPending = userTasks.filter(t => {
    const isComp = t.completions && user.sede && t.completions[user.sede]
      ? t.completions[user.sede].completed
      : (t.completed || t.status === 'Completada');
    return !isComp && (t.isCritical || t.priority?.includes('ROJO'));
  });

  const pct = userTasks.length > 0 ? Math.round((completedTasks.length / userTasks.length) * 100) : 0;

  // Handler: Add Note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    setIsSavingNote(true);
    try {
      const userDocId = user.email.toLowerCase().trim();
      const userDocRef = doc(db, 'user_profiles', userDocId);

      const noteItem = {
        id: 'note_' + Date.now(),
        text: newNoteText.trim(),
        authorName: currentUser?.name || currentUser?.email || 'SuperAdmin',
        authorEmail: currentUser?.email || '',
        createdAt: new Date().toISOString()
      };

      await setDoc(userDocRef, {
        notes: arrayUnion(noteItem),
        userId: user.id || user.email,
        name: user.name,
        email: user.email,
        role: user.role,
        sede: user.sede,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setNewNoteText('');
      showToast("Nota guardada con éxito", "success");
    } catch (err) {
      console.error("Error saving note:", err);
      showToast("Error al guardar la nota", "error");
    } finally {
      setIsSavingNote(false);
    }
  };

  // Handler: Delete Note
  const handleDeleteNote = async (noteItem) => {
    try {
      const userDocId = user.email.toLowerCase().trim();
      const userDocRef = doc(db, 'user_profiles', userDocId);
      await updateDoc(userDocRef, {
        notes: arrayRemove(noteItem)
      });
      showToast("Nota eliminada", "info");
    } catch (err) {
      console.error("Error deleting note:", err);
      showToast("Error al eliminar la nota", "error");
    }
  };

  // Handler: Add Document Link
  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !newDocUrl.trim()) return;

    let formattedUrl = newDocUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    setIsSavingDoc(true);
    try {
      const userDocId = user.email.toLowerCase().trim();
      const userDocRef = doc(db, 'user_profiles', userDocId);

      const docItem = {
        id: 'doc_' + Date.now(),
        title: newDocTitle.trim(),
        url: formattedUrl,
        addedBy: currentUser?.name || currentUser?.email || 'SuperAdmin',
        createdAt: new Date().toISOString()
      };

      await setDoc(userDocRef, {
        documents: arrayUnion(docItem),
        userId: user.id || user.email,
        name: user.name,
        email: user.email,
        role: user.role,
        sede: user.sede,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setNewDocTitle('');
      setNewDocUrl('');
      showToast("Documento enlazado con éxito", "success");
    } catch (err) {
      console.error("Error saving document:", err);
      showToast("Error al guardar el enlace del documento", "error");
    } finally {
      setIsSavingDoc(false);
    }
  };

  // Handler: Delete Document
  const handleDeleteDocument = async (docItem) => {
    try {
      const userDocId = user.email.toLowerCase().trim();
      const userDocRef = doc(db, 'user_profiles', userDocId);
      await updateDoc(userDocRef, {
        documents: arrayRemove(docItem)
      });
      showToast("Enlace de documento eliminado", "info");
    } catch (err) {
      console.error("Error deleting document:", err);
      showToast("Error al eliminar documento", "error");
    }
  };

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(5, 10, 25, 0.85)', backdropFilter: 'blur(8px)',
        zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
      }}>
        <div className="glass-panel" style={{
          width: '100%', maxWidth: '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          position: 'relative', border: `1px solid ${roleColor}40`, boxShadow: `0 10px 40px rgba(0,0,0,0.8), 0 0 20px ${roleColor}20`,
          borderRadius: '16px', overflow: 'hidden'
        }}>
          {/* Close button */}
          <button 
            onClick={onClose}
            style={{
              position: 'absolute', top: '1.2rem', right: '1.2rem', background: 'rgba(255,255,255,0.08)',
              border: 'none', color: '#fff', borderRadius: '50%', width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10,
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            <X size={20} />
          </button>

          {/* User Header Profile Card */}
          <div style={{
            padding: '1.8rem 2rem 1.2rem 2rem',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: `linear-gradient(135deg, ${roleColor}40, ${roleColor}10)`,
                border: `2px solid ${roleColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', boxShadow: `0 0 15px ${roleColor}40`
              }}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>

              <div style={{ flex: 1, minWidth: '240px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, color: 'var(--text-heading)', fontSize: '1.5rem', fontWeight: 'bold' }}>{user.name}</h2>
                  {(user.roles && user.roles.length > 0 ? user.roles : [user.role]).map(r => {
                    const rNorm = normalizeRole(r);
                    const rCol = ROLE_COLORS[rNorm] || roleColor;
                    const rLab = getRoleDisplayName(r);
                    return (
                      <span key={r} style={{
                        padding: '0.3rem 0.8rem',
                        borderRadius: '9999px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-heading)',
                        letterSpacing: '0.3px',
                        background: `${rCol}25`,
                        color: rCol,
                        border: `1px solid ${rCol}60`,
                        boxShadow: `0 2px 8px ${rCol}15`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        {rLab}
                      </span>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '1.2rem', marginTop: '0.6rem', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Building2 size={15} color="var(--crear-gold)" /> Sede: <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{getFlagForSede(user.sede)} <strong style={{ color: 'var(--text-heading)' }}>{normalizeSede(user.sede)}</strong></span>
                  </span>
                  {user.corporateEmail && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }} title="Correo Corporativo Oficial">
                      <Mail size={14} color="var(--crear-gold)" /> Corp: {user.corporateEmail}
                    </span>
                  )}
                  {user.personalEmail && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }} title="Gmail Personal">
                      <Mail size={14} color="var(--crear-cyan)" /> Personal: {user.personalEmail}
                    </span>
                  )}
                  {!user.corporateEmail && !user.personalEmail && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Mail size={14} color="var(--crear-cyan)" /> {user.email}
                    </span>
                  )}
                  {user.phone && (
                    <a
                      href={getWhatsAppUrl(user.phone, user.sede)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: '#25D366',
                        background: 'rgba(37, 211, 102, 0.12)',
                        border: '1px solid rgba(37, 211, 102, 0.35)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      title="Abrir chat directo en WhatsApp"
                    >
                      <span style={{ fontSize: '0.95rem' }}>💬</span>
                      <span>{user.phone}</span>
                      <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.2)', padding: '1px 4px', borderRadius: '4px' }}>WhatsApp</span>
                    </a>
                  )}

                  {/* Última Conexión Visible para Directorio y Super Admin */}
                  <span 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '2px 10px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      background: profileData.hasConnected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: profileData.hasConnected ? '#22c55e' : 'var(--text-muted)',
                      border: profileData.hasConnected ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: profileData.hasConnected ? '0 0 10px rgba(34, 197, 94, 0.2)' : 'none'
                    }}
                    title={profileData.hasConnected ? `IP: ${profileData.lastIp || 'N/A'} • ${profileData.lastLocation || ''}` : 'Sin inicios de sesión registrados'}
                  >
                    <span style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: profileData.hasConnected ? '#22c55e' : '#94a3b8',
                      boxShadow: profileData.hasConnected ? '0 0 6px #22c55e' : 'none'
                    }} />
                    <span>{profileData.hasConnected ? `🟢 Último acceso: ${profileData.lastLoginAt}` : '⚪ Sin conexión'}</span>
                    {profileData.lastLocation && (
                      <span style={{ fontSize: '0.75rem', opacity: 0.85, color: '#e2e8f0' }}>({profileData.lastLocation})</span>
                    )}
                  </span>
                </div>
              </div>

              {/* KPI metrics */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: pct === 100 ? '#22c55e' : 'var(--crear-gold)' }}>{pct}%</span>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Progreso</p>
                </div>
                <div style={{ height: '28px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' }}>{completedTasks.length}/{userTasks.length}</span>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tareas</p>
                </div>
                {criticalPending.length > 0 && (
                  <>
                    <div style={{ height: '28px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ef4444' }}>{criticalPending.length}</span>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: '#ef4444' }}>Críticas</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Estado de Conexión del Usuario */}
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              background: profileData.hasConnected ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.03)',
              border: profileData.hasConnected ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.8rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  width: '12px', height: '12px', borderRadius: '50%',
                  background: profileData.hasConnected ? '#22c55e' : '#94a3b8',
                  boxShadow: profileData.hasConnected ? '0 0 10px #22c55e' : 'none',
                  display: 'inline-block'
                }} />
                <div>
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    color: profileData.hasConnected ? '#22c55e' : 'var(--text-muted)'
                  }}>
                    {profileData.hasConnected ? '✅ Usuario Conectado a SO-AR' : '⚪ Sin Conexión Registrada'}
                  </span>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {profileData.hasConnected 
                      ? `Último acceso: ${profileData.lastLoginAt} ${profileData.lastLocation ? `• ${profileData.lastLocation}` : ''} ${profileData.lastIp ? `(${profileData.lastIp})` : ''}`
                      : 'Este colaborador aún no ha iniciado sesión en la plataforma'}
                  </p>
                </div>
              </div>
              {profileData.hasConnected && profileData.lastUserAgent && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={profileData.lastUserAgent}>
                  🖥️ {profileData.lastUserAgent}
                </span>
              )}
            </div>

            {/* Botón de Simulación — SOLO Super Administradores */}
            {canSimulate(currentUser, originalAdminUser) && (
              <div style={{ marginTop: '0.8rem' }}>
                <button
                  onClick={() => {
                    simulateUser(user);
                    onClose();
                    navigate('/home');
                  }}
                  style={{
                    width: '100%',
                    padding: '0.6rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                    background: 'rgba(251, 191, 36, 0.08)',
                    color: 'var(--crear-gold)',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(251, 191, 36, 0.2)';
                    e.currentTarget.style.borderColor = 'var(--crear-gold)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(251, 191, 36, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.4)';
                  }}
                >
                  <Eye size={16} /> Simular como {user.name.split(' ')[0]}
                </button>
              </div>
            )}

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
              <button 
                onClick={() => setActiveTab('tasks')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: activeTab === 'tasks' ? 'var(--crear-gold)' : 'rgba(255,255,255,0.05)',
                  color: activeTab === 'tasks' ? '#000' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                <CheckSquare size={16} /> Tareas ({userTasks.length})
              </button>

              <button 
                onClick={() => setActiveTab('notes')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: activeTab === 'notes' ? 'var(--crear-gold)' : 'rgba(255,255,255,0.05)',
                  color: activeTab === 'notes' ? '#000' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                <FileText size={16} /> Notas y Bitácora ({profileData.notes.length})
              </button>

              <button 
                onClick={() => setActiveTab('documents')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: activeTab === 'documents' ? 'var(--crear-gold)' : 'rgba(255,255,255,0.05)',
                  color: activeTab === 'documents' ? '#000' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                <Link2 size={16} /> Documentos y Enlaces ({profileData.documents.length})
              </button>
            </div>
          </div>

          {/* Modal Body with scroll */}
          <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: 1 }}>

            {/* TAB 1: TASKS */}
            {activeTab === 'tasks' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, color: '#fff', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckSquare size={18} color="var(--crear-cyan)" /> Matriz Operativa de {user.name}
                  </h4>
                  <div style={{ display: 'flex', gap: '0.8rem' }}>
                    {canSimulate(currentUser, originalAdminUser) && (
                      <button 
                        onClick={() => {
                          onClose();
                          navigate('/home');
                          setTimeout(() => {
                            simulateUser(user);
                          }, 50);
                        }}
                        className="btn-secondary"
                        style={{
                          padding: '0.4rem 0.9rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                          background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 'bold', borderRadius: '8px'
                        }}
                      >
                        <Eye size={16} /> Simular Vista
                      </button>
                    )}
                    <button 
                      onClick={() => setShowAssignModal(true)}
                      className="btn-primary"
                      style={{
                        padding: '0.4rem 0.9rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                        background: 'var(--crear-cyan)', color: '#000', border: 'none', fontWeight: 'bold', borderRadius: '8px'
                      }}
                    >
                      <PlusCircle size={16} /> Asignar Nueva Tarea
                    </button>
                  </div>
                </div>

                {userTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <CheckCircle2 size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p>No hay tareas asignadas para este usuario o rol en la sede {user.sede}.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {userTasks.map(task => {
                      const isCompleted = task.completions && user.sede && task.completions[user.sede]
                        ? task.completions[user.sede].completed
                        : (task.completed || task.status === 'Completada');
                      const isCrit = task.isCritical || task.priority?.includes('ROJO');

                      return (
                        <div 
                          key={task.id}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.8rem 1rem', borderRadius: '10px',
                            background: isCompleted ? 'rgba(34, 197, 94, 0.05)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isCompleted ? 'rgba(34, 197, 94, 0.3)' : isCrit ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.06)'}`,
                            gap: '0.8rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flex: 1 }}>
                            <input 
                              type="checkbox"
                              checked={isCompleted}
                              onChange={() => toggleTask(task.id, isCompleted)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--crear-gold)' }}
                            />
                            <div style={{ flex: 1 }}>
                              <p style={{
                                margin: 0, fontSize: '0.9rem', color: isCompleted ? 'var(--text-muted)' : '#fff',
                                textDecoration: isCompleted ? 'line-through' : 'none', fontWeight: isCrit ? '600' : 'normal'
                              }}>
                                {task.task || task.title}
                              </p>
                              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.2rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {task.cyclePhase && <span>Fase: <strong style={{ color: '#29abe2' }}>{task.cyclePhase}</strong></span>}
                                {task.deadline && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--crear-gold)' }}>
                                    <Clock size={11} /> Límite: {new Date(task.deadline).toLocaleDateString()} {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                                {task.assignedToEmail && (
                                  <span style={{ color: 'var(--crear-cyan)' }}>Personalizada (Directa)</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold',
                              background: isCompleted ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: isCompleted ? '#22c55e' : '#f59e0b',
                              border: `1px solid ${isCompleted ? '#22c55e40' : '#f59e0b40'}`
                            }}>
                              {isCompleted ? 'Completada' : 'Pendiente'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: NOTES & BITÁCORA */}
            {activeTab === 'notes' && (
              <div>
                <form onSubmit={handleAddNote} style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--crear-gold)', fontWeight: 'bold', marginBottom: '0.4rem' }}>
                    📝 Añadir Nota / Feedback para {user.name}:
                  </label>
                  <textarea 
                    value={newNoteText}
                    onChange={e => setNewNoteText(e.target.value)}
                    placeholder="Escribe observaciones de desempeño, compromisos de reunión, acuerdos o puntos a auditar..."
                    rows={3}
                    className="input-field"
                    style={{ width: '100%', marginBottom: '0.6rem', resize: 'vertical' }}
                    disabled={isSavingNote}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      type="submit" 
                      className="btn-primary" 
                      disabled={isSavingNote || !newNoteText.trim()}
                      style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Plus size={16} /> {isSavingNote ? 'Guardando...' : 'Guardar Nota'}
                    </button>
                  </div>
                </form>

                <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.8rem' }}>Historial de Notas ({profileData.notes.length})</h4>

                {profileData.notes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    <FileText size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p>Aún no hay notas registradas para este usuario.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {profileData.notes.slice().reverse().map((note) => (
                      <div 
                        key={note.id || note.createdAt}
                        style={{
                          padding: '1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)', position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--crear-cyan)' }}>
                            <Shield size={13} />
                            <strong>{note.authorName || 'SuperAdmin'}</strong>
                            <span style={{ color: 'var(--text-muted)' }}>• {new Date(note.createdAt).toLocaleString()}</span>
                          </div>
                          <button 
                            onClick={() => handleDeleteNote(note)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7, padding: '2px' }}
                            title="Eliminar nota"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.88rem', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                          {note.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DOCUMENTS & LINKS */}
            {activeTab === 'documents' && (
              <div>
                <form onSubmit={handleAddDocument} style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--crear-cyan)', fontWeight: 'bold', marginBottom: '0.6rem' }}>
                    🔗 Enlazar Documento / Enlace Externo (Google Drive, Docs, Reportes):
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '0.6rem', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Título del Documento:</label>
                      <input 
                        type="text"
                        placeholder="Ej. Plan Operativo Q3"
                        value={newDocTitle}
                        onChange={e => setNewDocTitle(e.target.value)}
                        className="input-field"
                        style={{ width: '100%' }}
                        disabled={isSavingDoc}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Enlace URL (Drive, Dropbox, Notion, Web):</label>
                      <input 
                        type="url"
                        placeholder="https://drive.google.com/..."
                        value={newDocUrl}
                        onChange={e => setNewDocUrl(e.target.value)}
                        className="input-field"
                        style={{ width: '100%' }}
                        disabled={isSavingDoc}
                        required
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="btn-primary" 
                      disabled={isSavingDoc || !newDocTitle.trim() || !newDocUrl.trim()}
                      style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', height: '40px' }}
                    >
                      <Plus size={16} /> {isSavingDoc ? '...' : 'Enlazar'}
                    </button>
                  </div>
                </form>

                <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.8rem' }}>Documentos y Enlaces Guardados ({profileData.documents.length})</h4>

                {profileData.documents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    <Link2 size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p>No hay documentos ni enlaces guardados para este usuario.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.8rem' }}>
                    {profileData.documents.map((docItem) => (
                      <div 
                        key={docItem.id || docItem.createdAt}
                        style={{
                          padding: '1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column',
                          justifyContent: 'space-between', gap: '0.8rem'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h5 style={{ margin: 0, color: '#fff', fontSize: '0.95rem', fontWeight: 'bold' }}>{docItem.title}</h5>
                            <button 
                              onClick={() => handleDeleteDocument(docItem)}
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7 }}
                              title="Eliminar documento"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                          <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Subido por: {docItem.addedBy || 'Admin'} • {new Date(docItem.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        <a 
                          href={docItem.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                            padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--crear-cyan)', textDecoration: 'none',
                            borderRadius: '6px', border: '1px solid var(--crear-cyan)40'
                          }}
                        >
                          <ExternalLink size={14} /> Abrir Documento
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Embedded Task Assignment Modal for this specific user */}
      {showAssignModal && (
        <TaskAssignmentModal 
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          prefilledUser={user}
        />
      )}
    </>
  );
}
