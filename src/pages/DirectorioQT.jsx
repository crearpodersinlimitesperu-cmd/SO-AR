import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { 
  getQTMembers, 
  clearQTCache,
  normalizeQTSede
} from '../services/qtSheetService';
import { 
  isGlobalQTCoordinator, 
  hasQTPrivileges, 
  isDireccionRole, 
  isNonOperationalDirector 
} from '../config/permissions';
import CountryFlag from '../components/CountryFlag';
import { 
  Users, 
  RefreshCw, 
  ExternalLink, 
  Search, 
  ArrowLeft, 
  Award, 
  Phone, 
  Mail, 
  CheckCircle2, 
  ShieldCheck,
  Grid,
  List,
  Flame,
  FileSpreadsheet,
  MessageSquare
} from 'lucide-react';

function InstagramIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

export default function DirectorioQT() {
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  
  const userSede = normalizeQTSede(currentUser?.sede || '');

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSede, setSelectedSede] = useState('Todas');
  const [selectedEdicion, setSelectedEdicion] = useState('Todas');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  useEffect(() => {
    loadMembers(false);
  }, []);

  const handleOpenGoogleChat = (email) => {
    if (!email) {
      window.open('https://chat.google.com/u/0/', '_blank');
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email)
        .then(() => showToast(`Email copiado: ${email}. Pégalo en Google Chat.`, 'success'))
        .catch(() => showToast(`No se pudo copiar automáticamente. Busca a: ${email}`, 'error'));
    } else {
      showToast(`Busca en Google Chat a: ${email}`, 'success');
    }
    window.open('https://chat.google.com/u/0/', '_blank');
  };

  const loadMembers = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
      clearQTCache();
    } else {
      setLoading(true);
    }

    try {
      const result = await getQTMembers({ forceRefresh });
      setMembers(result.data || []);
      setLastUpdated(result.lastUpdated);
      
      if (forceRefresh) {
        showToast(`¡Sincronización exitosa! ${result.total} integrantes de Quantum Team normalizados y actualizados.`, 'success');
      }
    } catch (err) {
      console.error("Error cargando directorio QT:", err);
      showToast("Error al cargar los datos desde Google Sheets.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filtrado reactivo
  const filteredMembers = useMemo(() => {
    const userRole = currentUser?.appRole || '';
    
    // Si es superadmin, dirección (operativa o no), o gerente
    const isSuper = currentUser?.isSuperAdmin || userRole === 'director_maestria' || isDireccionRole(userRole) || currentUser?.email === 'jose.sanchez@crearpsl.net' || currentUser?.email === 'armando.pilacuan@gmail.com';
    const isGerente = userRole === 'gerente';
    
    // Usamos las nuevas banderas de permisos
    const isQTGlobal = isGlobalQTCoordinator(currentUser);
    const hasQT = hasQTPrivileges(currentUser);
    
    return members.filter(m => {
      // 0. Reglas de Jerarquía Corporativa
      const userSede = currentUser?.sede || '';
      const isGlobalUser = userSede.toLowerCase().includes('global');
      
      if (!isSuper && !isQTGlobal) {
        if (isGlobalUser) {
          // Global users see everything
        } else if (isGerente) {
          if (m.sede !== userSede && m.sede !== 'Global') return false;
        } else if (hasQT) {
          // Un QT normal ve solo su sede y al Coordinador Global
          const isTargetQTGlobal = m.sede === 'Global' || m.email?.toLowerCase().includes('brunis') || m.email?.toLowerCase().includes('cardenas');
          if (m.sede !== userSede && !isTargetQTGlobal) return false;
        } else {
          // Cualquier otro rol (manager, capitan, etc.) ve su sede
          if (m.sede !== userSede) return false;
        }
      }

      // Filtro por sede manual de la UI
      if (selectedSede !== 'Todas' && m.sede !== selectedSede) {
        return false;
      }

      // Filtro por experiencia / edición
      if (selectedEdicion !== 'Todas') {
        if (selectedEdicion === 'senior' && !m.isSenior) return false;
        if (selectedEdicion === 'reciente' && !m.ediciones.toLowerCase().includes('primera')) return false;
        if (selectedEdicion === 'intermedio' && !(m.ediciones.includes('1 a 3') || m.ediciones.includes('4 a 8'))) return false;
      }

      // Búsqueda libre con normalización sin tildes y multi-palabra
      if (searchQuery.trim()) {
        const normalize = (str = '') => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const qTokens = normalize(searchQuery).split(/\s+/).filter(Boolean);
        
        const targetString = normalize(
          `${m.nombre || ''} ${m.docNumero || ''} ${m.email || ''} ${m.instagram || ''} ${m.sede || ''} ${m.talla || ''} ${m.ediciones || ''} ${m.whatsapp || ''} ${m.declaracion || ''}`
        );

        // Debe coincidir con todos los términos buscados (búsqueda flexible en cualquier orden)
        return qTokens.every(token => targetString.includes(token));
      }

      return true;
    });
  }, [members, selectedSede, selectedEdicion, searchQuery]);

  // Estadísticas rápidas
  const stats = useMemo(() => {
    const total = members.length;
    const seniors = members.filter(m => m.isSenior).length;
    const sedesCount = new Set(members.map(m => m.sede)).size;
    const activos = members.filter(m => m.esActivo).length;
    return { total, seniors, sedesCount, activos };
  }, [members]);

  const formatLastUpdated = (isoDate) => {
    if (!isoDate) return 'Desconocido';
    try {
      const d = new Date(isoDate);
      return isNaN(d.getTime()) ? 'Reciente' : d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' (' + d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) + ')';
    } catch (e) {
      return 'Reciente';
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem', color: 'var(--text-main, #0f172a)' }}>
      {/* HEADER SUPERIOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button 
          onClick={() => navigate('/home')} 
          className="btn-secondary" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}
        >
          <ArrowLeft size={16} /> Volver a Causa OS
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {currentUser?.isSuperAdmin && !isNonOperationalDirector(currentUser) && (
            <button 
              onClick={() => loadMembers(true)}
              disabled={refreshing || loading}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              {refreshing ? 'Sincronizando...' : 'Sincronizar Google Sheets'}
            </button>
          )}

        </div>
      </div>

      {/* TITULAR Y BANNER */}
      <div className="glass-panel" style={{ padding: '1.8rem 2rem', borderRadius: '16px', border: '1px solid var(--border-subtle, #cbd5e1)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.6rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '0.6rem', borderRadius: '12px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Flame size={28} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 900, color: 'var(--text-heading, #0f172a)' }}>
              Directorio Oficial Quantum Team (QT)
            </h1>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted, #64748b)' }}>
              Sincronización en vivo con la base oficial • Última sincronización: <strong>{formatLastUpdated(lastUpdated)}</strong>
            </p>
          </div>
        </div>

        {/* METRICAS RAPIDAS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
          <div style={{ background: 'var(--bg-card-hover, rgba(255,255,255,0.03))', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Total QT Activos</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-heading, #0f172a)' }}>{stats.total}</div>
          </div>
          <div style={{ background: 'var(--bg-card-hover, rgba(255,255,255,0.03))', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Líderes Senior (+15 ed.)</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--crear-gold, #f59e0b)' }}>{stats.seniors}</div>
          </div>
          <div style={{ background: 'var(--bg-card-hover, rgba(255,255,255,0.03))', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Sedes Cubiertas</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#3b82f6' }}>{stats.sedesCount}</div>
          </div>
          <div style={{ background: 'var(--bg-card-hover, rgba(255,255,255,0.03))', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Perfiles Verificados</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#10b981' }}>{stats.activos}</div>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS Y CONTROLES */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', borderRadius: '14px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
          {/* Buscador */}
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #64748b)' }} />
            <input 
              type="text"
              placeholder="Buscar por nombre, cédula/DNI, email, instagram..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 1rem 0.55rem 2.25rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                background: 'var(--bg-card, #ffffff)',
                color: 'var(--text-main, #0f172a)',
                fontSize: '0.9rem'
              }}
            />
          </div>

          {/* Filtro Sede */}
          <select
            value={selectedSede}
            onChange={(e) => setSelectedSede(e.target.value)}
            style={{ 
              padding: '0.55rem 0.9rem', 
              borderRadius: '8px', 
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.2))', 
              background: 'var(--bg-dark-alt, #0d152d)', 
              color: 'var(--text-heading, #ffffff)', 
              fontWeight: 700, 
              fontSize: '0.85rem',
              cursor: 'pointer',
              colorScheme: 'dark'
            }}
          >
            <option value="Todas" style={{ background: '#0d152d', color: '#ffffff' }}>Todas las Sedes Permitidas</option>
            {(!currentUser || currentUser.isSuperAdmin || currentUser.appRole === 'director_maestria' || currentUser.appRole === 'direccion' || currentUser.appRole === 'gerente' || userSede === 'Quito') && <option value="Quito" style={{ background: '#0d152d', color: '#ffffff' }}>Quito</option>}
            {(!currentUser || currentUser.isSuperAdmin || currentUser.appRole === 'director_maestria' || currentUser.appRole === 'direccion' || currentUser.appRole === 'gerente' || userSede === 'Guayaquil') && <option value="Guayaquil" style={{ background: '#0d152d', color: '#ffffff' }}>Guayaquil</option>}
            {(!currentUser || currentUser.isSuperAdmin || currentUser.appRole === 'director_maestria' || currentUser.appRole === 'direccion' || currentUser.appRole === 'gerente' || userSede === 'Cuenca') && <option value="Cuenca" style={{ background: '#0d152d', color: '#ffffff' }}>Cuenca</option>}
            {(!currentUser || currentUser.isSuperAdmin || currentUser.appRole === 'director_maestria' || currentUser.appRole === 'direccion' || currentUser.appRole === 'gerente' || userSede === 'Lima') && <option value="Lima" style={{ background: '#0d152d', color: '#ffffff' }}>Lima</option>}
            {(!currentUser || currentUser.isSuperAdmin || currentUser.appRole === 'director_maestria' || currentUser.appRole === 'direccion' || currentUser.appRole === 'gerente' || userSede === 'Medellín') && <option value="Medellín" style={{ background: '#0d152d', color: '#ffffff' }}>Medellín</option>}
            {(!currentUser || currentUser.isSuperAdmin || currentUser.appRole === 'director_maestria' || currentUser.appRole === 'direccion' || currentUser.appRole === 'gerente' || userSede === 'México') && <option value="México" style={{ background: '#0d152d', color: '#ffffff' }}>México</option>}
          </select>

          {/* Filtro Experiencia */}
          <select
            value={selectedEdicion}
            onChange={(e) => setSelectedEdicion(e.target.value)}
            style={{ 
              padding: '0.55rem 0.9rem', 
              borderRadius: '8px', 
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.2))', 
              background: 'var(--bg-dark-alt, #0d152d)', 
              color: 'var(--text-heading, #ffffff)', 
              fontWeight: 700, 
              fontSize: '0.85rem',
              cursor: 'pointer',
              colorScheme: 'dark'
            }}
          >
            <option value="Todas" style={{ background: '#0d152d', color: '#ffffff' }}>Toda Experiencia</option>
            <option value="senior" style={{ background: '#0d152d', color: '#ffffff' }}>🏆 Líderes Senior (+9 a +15 ed.)</option>
            <option value="intermedio" style={{ background: '#0d152d', color: '#ffffff' }}>✨ 1 a 8 Ediciones</option>
            <option value="reciente" style={{ background: '#0d152d', color: '#ffffff' }}>🌱 Graduados Recientes</option>
          </select>
        </div>

        {/* Vista Toggle & Contador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
            Mostrando {filteredMembers.length} de {members.length}
          </span>
          <div style={{ display: 'flex', border: '1px solid var(--border-subtle, #cbd5e1)', borderRadius: '8px', overflow: 'hidden' }}>
            <button 
              onClick={() => setViewMode('grid')}
              style={{ background: viewMode === 'grid' ? 'var(--crear-blue, #29abe2)' : 'transparent', color: viewMode === 'grid' ? '#fff' : 'var(--text-muted, #64748b)', border: 'none', padding: '0.45rem 0.75rem', cursor: 'pointer' }}
              title="Vista de Cuadrícula"
            >
              <Grid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              style={{ background: viewMode === 'table' ? 'var(--crear-blue, #29abe2)' : 'transparent', color: viewMode === 'table' ? '#fff' : 'var(--text-muted, #64748b)', border: 'none', padding: '0.45rem 0.75rem', cursor: 'pointer' }}
              title="Vista de Tabla"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--crear-gold, #f59e0b)', fontWeight: 700 }}>
          <RefreshCw size={32} className="animate-spin" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <div>Cargando e integrando directorio de Quantum Team desde Google Sheets...</div>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--bg-card, #ffffff)', borderRadius: '16px', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
          <Users size={48} style={{ color: 'var(--text-muted, #64748b)', marginBottom: '1rem' }} />
          <h3 style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>No se encontraron integrantes de Quantum Team</h3>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '0.9rem' }}>Intenta cambiando los filtros o la búsqueda.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* VISTA DE CUADRÍCULA (CARDS) */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {filteredMembers.map((m) => (
            <div 
              key={m.id}
              className="glass-panel"
              style={{
                borderRadius: '14px',
                border: '1px solid',
                borderColor: m.isSenior ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-subtle, rgba(255,255,255,0.08))',
                padding: '1.4rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative'
              }}
            >
              {m.isSenior && (
                <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Award size={11} /> SENIOR
                </div>
              )}

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', paddingRight: m.isSenior ? '65px' : '0' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-heading, #ffffff)' }}>
                    {m.nombre}
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(41, 171, 226, 0.15)', color: 'var(--crear-cyan, #29abe2)', border: '1px solid rgba(41, 171, 226, 0.3)', padding: '2px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 700 }}>
                    <CountryFlag sede={m.sede} /> {m.sede}
                  </span>
                  {m.docNumero && (
                    <span style={{ fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted, #94a3b8)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                      {m.docTipo}: {m.docNumero}
                    </span>
                  )}
                  {m.talla && (
                    <span style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--crear-gold, #f59e0b)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                      Talla: {m.talla}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)', marginBottom: '0.85rem' }}>
                  <strong style={{ color: 'var(--text-main, #ffffff)' }}>Ediciones:</strong> {m.ediciones}
                </div>

                {m.declaracion && (
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem', borderRadius: '8px', borderLeft: '3px solid var(--crear-gold, #f59e0b)', marginBottom: '1rem', fontStyle: 'italic', fontSize: '0.82rem', color: 'var(--text-main, #e2e8f0)', lineHeight: '1.45' }}>
                    "{m.declaracion}"
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.08))', paddingTop: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {m.whatsappUrl && (
                    <a 
                      href={m.whatsappUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.78rem', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', fontWeight: 700, textDecoration: 'none' }}
                      title="Abrir chat de WhatsApp"
                    >
                      <Phone size={13} /> WhatsApp
                    </a>
                  )}

                  {m.instagram && m.instagramUrl && (
                    <a 
                      href={m.instagramUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.78rem', background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', border: '1px solid rgba(236, 72, 153, 0.3)', fontWeight: 700, textDecoration: 'none' }}
                      title="Ver perfil de Instagram"
                    >
                      <InstagramIcon size={13} /> {m.instagram}
                    </a>
                  )}
                </div>

                  {!m.whatsappUrl && m.email && (
                    <a 
                      href={`mailto:${m.email}`}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--crear-blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      title={`Enviar correo a ${m.email}`}
                    >
                      <Mail size={13} /> Correo
                    </a>
                  )}
                  {m.email && (
                    <a 
                      href={`https://mail.google.com/chat/u/0/#chat/dm/${m.email}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#10b981', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      title={`Google Chat con ${m.email}`}
                    >
                      <MessageSquare size={13} /> G. Chat
                    </a>
                  )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* VISTA DE TABLA */
        <div className="glass-panel" style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '2px solid var(--border-subtle, rgba(255,255,255,0.08))' }}>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 700, color: 'var(--text-heading, #ffffff)' }}>#</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 700, color: 'var(--text-heading, #ffffff)' }}>Nombre & Sede</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 700, color: 'var(--text-heading, #ffffff)' }}>Documento</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 700, color: 'var(--text-heading, #ffffff)' }}>Ediciones en QT</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 700, color: 'var(--text-heading, #ffffff)' }}>Talla</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 700, color: 'var(--text-heading, #ffffff)' }}>Instagram</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 700, color: 'var(--text-heading, #ffffff)' }}>Contacto</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m, idx) => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.05))' }}>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted, #94a3b8)' }}>{idx + 1}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-heading, #ffffff)' }}>{m.nombre}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
                      <CountryFlag sede={m.sede} /> {m.sede}
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-main, #e2e8f0)' }}>
                    {m.docTipo}: {m.docNumero}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ fontSize: '0.8rem', background: m.isSenior ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.05)', color: m.isSenior ? 'var(--crear-gold, #f59e0b)' : 'var(--text-muted, #94a3b8)', border: m.isSenior ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '10px', fontWeight: m.isSenior ? 700 : 500 }}>
                      {m.ediciones}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: m.talla ? 'var(--crear-gold)' : 'var(--text-muted)' }}>{m.talla || '-'}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {m.instagram ? (
                      <a href={m.instagramUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#ec4899', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <InstagramIcon size={12} /> {m.instagram}
                      </a>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', flexDirection: 'column' }}>
                      {m.whatsappUrl && (
                        <a href={m.whatsappUrl} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '4px 8px', borderRadius: '6px', textDecoration: 'none', fontWeight: 700, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Phone size={11} /> WhatsApp
                        </a>
                      )}
                      {!m.whatsappUrl && m.email && (
                        <a href={`mailto:${m.email}`} style={{ background: 'rgba(0, 210, 255, 0.15)', color: 'var(--crear-blue)', border: '1px solid rgba(0, 210, 255, 0.3)', padding: '4px 8px', borderRadius: '6px', textDecoration: 'none', fontWeight: 700, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }} title={`Enviar correo a ${m.email}`}>
                          <Mail size={11} /> Correo
                        </a>
                      )}
                      {m.email && (
                        <a href={`https://mail.google.com/chat/u/0/#chat/dm/${m.email}`} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 8px', borderRadius: '6px', textDecoration: 'none', fontWeight: 700, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }} title={`Google Chat con ${m.email}`}>
                          <MessageSquare size={11} /> G. Chat
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
