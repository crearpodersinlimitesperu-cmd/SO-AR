import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { 
  canAddManagers, 
  canAssignTrainer, 
  canChangeManagerStatus, 
  canViewAllManagers, 
  canViewSede,
  DUAL_ROLE_TRAINER_EMAILS
} from '../config/permissions';
import { 
  INITIAL_MANAGERS, 
  INITIAL_LLAMADOS, 
  ENTRENADORES_LIST, 
  COORDINADORES_LIST,
  TRAINER_METADATA
} from '../data/managersData';
import { OPERATIONAL_SEDES, normalizeRole } from '../data/usersData';
import { 
  Users, PhoneCall, CheckCircle, XCircle, Calendar, Plus, 
  Search, Filter, Award, Building, UserCheck, Clock, 
  ChevronLeft, ChevronRight, DollarSign, Layers, ArrowLeft,
  Sparkles, ToggleLeft, ToggleRight, Archive
} from 'lucide-react';

const SEDE_FLAGS = {
  Quito: "🇪🇨", Lima: "🇵🇪", Guayaquil: "🇪🇨", Cuenca: "🇪🇨",
  Medellín: "🇨🇴", Medellin: "🇨🇴", CDMX: "🇲🇽", México: "🇲🇽"
};

const SEDE_COLORS = {
  Quito: "#29abe2", Lima: "#ef4444", Guayaquil: "#f59e0b",
  Cuenca: "#8b5cf6", Medellín: "#22c55e", Medellin: "#22c55e",
  CDMX: "#f97316", México: "#f97316"
};

const MES_LABELS = {
  JULIO2026: "Jul 2026", JUNIO2026: "Jun 2026", MAYO2026: "May 2026",
  ABRIL2026: "Abr 2026", MARZO2026: "Mar 2026", FEBRERO2026: "Feb 2026",
  ENERO2026: "Ene 2026", DICIEMBRE2025: "Dic 2025", NOVIEMBRE2025: "Nov 2025",
  OCTUBRE2025: "Oct 2025"
};

export default function CentroManagers() {
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();

  // Permisos avanzados
  const canViewAll = canViewAllManagers(currentUser);
  const canViewOwnSede = canViewSede(currentUser);
  const canChangeStatus = canChangeManagerStatus(currentUser);
  const userCanAdd = canAddManagers(currentUser);
  const userCanAssign = canAssignTrainer(currentUser);
  
  // Dual Role Toggle para QT y Corporativos que también son entrenadores
  const isDualRole = currentUser && DUAL_ROLE_TRAINER_EMAILS.includes(currentUser.email);
  const [viewAsTrainer, setViewAsTrainer] = useState(isDualRole ? true : !canViewAll && !canViewOwnSede);

  // Estados de datos
  const [managers, setManagers] = useState(() => {
    try {
      const saved = localStorage.getItem('cpsl_managers_data_v3');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_MANAGERS;
  });

  const [llamadosData, setLlamadosData] = useState(() => {
    try {
      const saved = localStorage.getItem('cpsl_llamados_data_v3');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_LLAMADOS;
  });

  useEffect(() => {
    try { localStorage.setItem('cpsl_managers_data_v3', JSON.stringify(managers)); } catch (e) {}
  }, [managers]);

  useEffect(() => {
    try { localStorage.setItem('cpsl_llamados_data_v3', JSON.stringify(llamadosData)); } catch (e) {}
  }, [llamadosData]);

  // UI State
  const [activeTab, setActiveTab] = useState('directorio');
  const [search, setSearch] = useState('');
  const [filterSede, setFilterSede] = useState('');
  const [showArchived, setShowArchived] = useState(false); // Toggle para activos vs graduados/desertores

  // Determinar el entrenador actual para filtrado
  const currentTrainerName = useMemo(() => {
    if (!currentUser) return '';
    const match = ENTRENADORES_LIST.find(e => 
      e.toLowerCase().includes(currentUser.name?.toLowerCase() || '') || 
      (currentUser.name && currentUser.name.toLowerCase().includes(e.toLowerCase()))
    );
    return match || currentUser.name;
  }, [currentUser]);

  const [filterEntrenador, setFilterEntrenador] = useState(viewAsTrainer ? currentTrainerName : '');

  // Efecto para actualizar el filtro si cambia el toggle de dual role
  useEffect(() => {
    if (viewAsTrainer) {
      setFilterEntrenador(currentTrainerName);
    } else {
      setFilterEntrenador('');
    }
  }, [viewAsTrainer, currentTrainerName]);


  // Modales
  const [showModal, setShowModal] = useState(false);
  const [newManager, setNewManager] = useState({
    nombre: '', rol: 'Manager', telefono: '', sede: 'Quito',
    equipo: '', numEquipo: '', entrenador: ENTRENADORES_LIST[0] || '',
    coordinador: COORDINADORES_LIST[0] || '', estado: 'Activo'
  });

  const [groupModal, setGroupModal] = useState(null);
  const [groupCallDate, setGroupCallDate] = useState(new Date().toISOString().split('T')[0]);
  const [groupCallAttendance, setGroupCallAttendance] = useState({}); // { managerId: boolean }

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 40;
  const [activeMes, setActiveMes] = useState('JULIO2026');

  // Filtrado principal
  const filteredManagers = useMemo(() => {
    return managers.filter(m => {
      // 1. Filtrado de Visibilidad (Seguridad)
      if (viewAsTrainer) {
        // Solo ve los suyos
        if (m.entrenador !== currentTrainerName) return false;
      } else if (!canViewAll) {
        if (canViewOwnSede) {
          // Coordinadores de maestría ven su sede
          if (m.sede !== currentUser?.sede) return false;
        } else {
          // Por defecto, si no es dual role ni puede ver todo/sede, solo ve lo suyo
          if (m.entrenador !== currentTrainerName) return false;
        }
      }

      // 2. Filtro de Entrenador (UI dropdown)
      if (filterEntrenador && m.entrenador !== filterEntrenador) return false;

      // 3. Filtro Sede (UI dropdown)
      if (filterSede && m.sede !== filterSede) return false;

      // 4. Filtro Archivo (Activos vs Graduados/Desertores)
      if (!showArchived && m.estado !== 'Activo') return false;
      if (showArchived && m.estado === 'Activo') return false;

      // 5. Búsqueda texto
      if (search.trim()) {
        const q = search.toLowerCase();
        const str = `${m.nombre} ${m.equipo || ''} ${m.entrenador || ''} ${m.telefono || ''}`.toLowerCase();
        if (!str.includes(q)) return false;
      }

      return true;
    });
  }, [managers, search, filterSede, filterEntrenador, showArchived, viewAsTrainer, canViewAll, canViewOwnSede, currentTrainerName, currentUser]);

  // Agrupación de equipos
  const groupTeams = useMemo(() => {
    const teams = {};
    filteredManagers.forEach(m => {
      if (!m.equipo || m.estado === 'Desertor') return; // Excluir desertores o sin equipo de la vista de grupo
      const key = `${m.sede}_${m.equipo}`;
      if (!teams[key]) {
        teams[key] = {
          sede: m.sede, equipo: m.equipo, numEquipo: m.numEquipo,
          managers: [], entrenadores: new Set()
        };
      }
      teams[key].managers.push(m);
      if (m.entrenador) teams[key].entrenadores.add(m.entrenador);
    });

    return Object.values(teams)
      .filter(t => t.managers.length >= 2 && t.entrenadores.size === 1)
      .map(t => ({ ...t, entrenadorUnico: Array.from(t.entrenadores)[0] }));
  }, [filteredManagers]);


  const stats = useMemo(() => {
    // Si la vista está restringida, calcular stats solo de lo que puede ver
    const baseList = (viewAsTrainer || (!canViewAll && !canViewOwnSede)) 
      ? managers.filter(m => m.entrenador === currentTrainerName)
      : (canViewOwnSede && !canViewAll) ? managers.filter(m => m.sede === currentUser?.sede)
      : managers;

    const total = baseList.length;
    const graduados = baseList.filter(m => m.estado === 'Graduado').length;
    const desertores = baseList.filter(m => m.estado === 'Desertor').length;
    const activos = baseList.filter(m => m.estado === 'Activo').length;
    const pct = total > 0 ? Math.round((graduados / total) * 100) : 0;
    return { total, graduados, desertores, activos, pct };
  }, [managers, viewAsTrainer, canViewAll, canViewOwnSede, currentTrainerName, currentUser]);

  // Acciones
  const handleUpdateManagerField = (id, field, value) => {
    setManagers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    showToast(`Actualizado: ${field}`, 'info');
  };

  const handleUpdateLlamada = (id, fecha, asistio) => {
    setManagers(prev => prev.map(m => m.id === id ? { ...m, llamadaFecha: fecha, llamadaAsistio: asistio } : m));
    showToast(`Registro guardado: ${asistio === 'SI' ? 'Asistió' : 'No asistió'}`, 'success');
  };

  const openGroupModal = (team) => {
    const initialAttendance = {};
    team.managers.forEach(m => initialAttendance[m.id] = true); // Todos asisten por defecto
    setGroupCallAttendance(initialAttendance);
    setGroupModal(team);
  };

  const handleSaveGroupCall = () => {
    if (!groupModal) return;
    setManagers(prev => prev.map(m => {
      if (groupCallAttendance.hasOwnProperty(m.id)) {
        return {
          ...m,
          llamadaFecha: groupCallDate,
          llamadaAsistio: groupCallAttendance[m.id] ? 'SI' : 'NO'
        };
      }
      return m;
    }));
    showToast(`Llamada grupal registrada para el equipo ${groupModal.equipo}`, 'success');
    setGroupModal(null);
  };

  const handleSaveNewManager = (e) => {
    e.preventDefault();
    if (!newManager.nombre.trim()) return showToast('Nombre obligatorio', 'error');
    const created = { ...newManager, id: Date.now(), tieneEntrenador: newManager.entrenador ? 'Si' : 'No', llamadaFecha: '', llamadaAsistio: '' };
    setManagers(prev => [created, ...prev]);
    showToast('Manager agregado', 'success');
    setShowModal(false);
  };

  const totalPages = Math.ceil(filteredManagers.length / PAGE_SIZE) || 1;
  const paginatedManagers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredManagers.slice(start, start + PAGE_SIZE);
  }, [filteredManagers, currentPage]);

  // Tema Claro Estilos
  const bgLight = "#f8fafc";
  const bgCard = "#ffffff";
  const textDark = "#0f172a";
  const textMuted = "#64748b";
  const borderLight = "#e2e8f0";

  return (
    <div style={{ minHeight: '100vh', background: bgLight, color: textDark, paddingBottom: '4rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* HEADER TEMA CLARO */}
      <header style={{ background: bgCard, borderBottom: `1px solid ${borderLight}`, padding: '1.2rem 2rem', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => navigate('/home')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: textDark, borderColor: borderLight }}>
              <ArrowLeft size={16} /> Inicio
            </button>
            <div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#d97706', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={24} /> Centro de Managers
              </h1>
              <p style={{ fontSize: '0.75rem', color: textMuted, margin: 0 }}>Gestión de Asignaciones y Encuentros</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            {isDualRole && (
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                 <span style={{ fontSize: '0.8rem', fontWeight: 600, color: textMuted }}>Vista:</span>
                 <button onClick={() => setViewAsTrainer(!viewAsTrainer)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: viewAsTrainer ? '#3b82f6' : '#64748b', fontWeight: 'bold' }}>
                   {viewAsTrainer ? <ToggleRight size={24} color="#3b82f6" /> : <ToggleLeft size={24} />}
                   {viewAsTrainer ? 'Entrenador' : 'Corporativo'}
                 </button>
               </div>
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706' }}>{stats.total}</div>
              <div style={{ fontSize: '0.65rem', color: textMuted, fontWeight: 700 }}>TOTAL</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{stats.graduados}</div>
              <div style={{ fontSize: '0.65rem', color: textMuted, fontWeight: 700 }}>GRADUADOS</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6' }}>{stats.activos}</div>
              <div style={{ fontSize: '0.65rem', color: textMuted, fontWeight: 700 }}>ACTIVOS</div>
            </div>
          </div>
        </div>
      </header>

      {/* TABS */}
      <div style={{ background: bgCard, borderBottom: `1px solid ${borderLight}`, padding: '0 2rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '1.5rem', overflowX: 'auto' }}>
          {[
            { id: 'directorio', icon: Users, label: `Directorio (${filteredManagers.length})` },
            { id: 'grupales', icon: Layers, label: `Grupales (${groupTeams.length})` },
            ...(canViewAll ? [
              { id: 'dashboard', icon: Award, label: 'Sedes' },
              { id: 'entrenadores', icon: UserCheck, label: 'Entrenadores' }
            ] : [])
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: '1rem 0.5rem', border: 'none', background: 'transparent',
              color: activeTab === t.id ? '#d97706' : textMuted,
              borderBottom: activeTab === t.id ? '3px solid #d97706' : '3px solid transparent',
              fontWeight: activeTab === t.id ? 700 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'
            }}>
              <t.icon size={18} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <main style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 1.5rem' }}>

        {/* DIRECTORIO */}
        {activeTab === 'directorio' && (
          <div style={{ background: bgCard, borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: `1px solid ${borderLight}` }}>
            
            <div style={{ padding: '1.5rem', borderBottom: `1px solid ${borderLight}`, display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.8rem', flex: 1, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', minWidth: '240px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: textMuted }} />
                  <input type="text" placeholder="Buscar manager..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} style={{ width: '100%', padding: '0.5rem 1rem 0.5rem 2.2rem', borderRadius: '6px', border: `1px solid ${borderLight}`, fontSize: '0.9rem' }} />
                </div>
                
                {canViewAll && (
                  <select value={filterSede} onChange={e => { setFilterSede(e.target.value); setCurrentPage(1); }} style={{ padding: '0.5rem', borderRadius: '6px', border: `1px solid ${borderLight}` }}>
                    <option value="">Todas las Sedes</option>
                    {OPERATIONAL_SEDES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}

                {(canViewAll || canViewOwnSede) && !viewAsTrainer && (
                  <select value={filterEntrenador} onChange={e => { setFilterEntrenador(e.target.value); setCurrentPage(1); }} style={{ padding: '0.5rem', borderRadius: '6px', border: `1px solid ${borderLight}` }}>
                    <option value="">Todos los Entrenadores</option>
                    {ENTRENADORES_LIST.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                )}

                <button onClick={() => { setShowArchived(!showArchived); setCurrentPage(1); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '6px', border: `1px solid ${showArchived ? '#3b82f6' : borderLight}`, background: showArchived ? '#eff6ff' : 'transparent', color: showArchived ? '#2563eb' : textMuted, fontWeight: 600, cursor: 'pointer' }}>
                  <Archive size={16} /> {showArchived ? "Viendo Archivo" : "Ver Archivo"}
                </button>
              </div>

              {userCanAdd && (
                <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.2rem', borderRadius: '6px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                  <Plus size={16} /> Nuevo Manager
                </button>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#475569', borderBottom: `2px solid ${borderLight}` }}>
                    <th style={{ padding: '1rem' }}>Manager & Sede</th>
                    <th style={{ padding: '1rem' }}>Equipo</th>
                    <th style={{ padding: '1rem' }}>Entrenador</th>
                    <th style={{ padding: '1rem' }}>Estado</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Confirmación de Llamada</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedManagers.map(m => (
                    <tr key={m.id} style={{ borderBottom: `1px solid ${borderLight}` }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 700, color: textDark, fontSize: '0.95rem' }}>{m.nombre}</div>
                        <div style={{ color: textMuted, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                          <span title={m.sede}>{SEDE_FLAGS[m.sede]}</span> {m.rol} 
                          {m.telefono && <a href={`https://wa.me/${m.telefono.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{ color: '#10b981', textDecoration: 'none', marginLeft: '0.5rem' }}>📱</a>}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600, color: '#475569' }}>
                        {m.equipo || '—'} {m.numEquipo ? `(#${m.numEquipo})` : ''}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {userCanAssign ? (
                          <select value={m.entrenador || ''} onChange={e => handleUpdateManagerField(m.id, 'entrenador', e.target.value)} style={{ padding: '0.3rem', borderRadius: '4px', border: `1px solid ${borderLight}`, fontSize: '0.8rem' }}>
                            <option value="">Sin Asignar</option>
                            {ENTRENADORES_LIST.map(e => <option key={e} value={e}>{e}</option>)}
                          </select>
                        ) : <span style={{ fontWeight: 600, color: '#3b82f6' }}>{m.entrenador || '—'}</span>}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {canChangeStatus ? (
                          <select value={m.estado} onChange={e => handleUpdateManagerField(m.id, 'estado', e.target.value)} style={{ padding: '0.3rem', borderRadius: '4px', border: 'none', background: m.estado==='Activo'?'#dbeafe':m.estado==='Graduado'?'#dcfce7':'#fee2e2', color: m.estado==='Activo'?'#2563eb':m.estado==='Graduado'?'#16a34a':'#dc2626', fontWeight: 700, fontSize: '0.8rem' }}>
                            <option value="Activo">Activo</option><option value="Graduado">Graduado</option><option value="Desertor">Desertor</option>
                          </select>
                        ) : (
                           <span style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', background: m.estado==='Activo'?'#dbeafe':m.estado==='Graduado'?'#dcfce7':'#fee2e2', color: m.estado==='Activo'?'#2563eb':m.estado==='Graduado'?'#16a34a':'#dc2626', fontWeight: 700, fontSize: '0.8rem' }}>{m.estado}</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <input type="date" value={m.llamadaFecha || ''} onChange={e => handleUpdateLlamada(m.id, e.target.value, m.llamadaAsistio || 'SI')} style={{ padding: '0.4rem', borderRadius: '6px', border: `1px solid ${borderLight}`, fontSize: '0.8rem' }} />
                          <button onClick={() => handleUpdateLlamada(m.id, m.llamadaFecha || new Date().toISOString().split('T')[0], 'SI')} style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #10b981', background: m.llamadaAsistio === 'SI' ? '#10b981' : '#fff', color: m.llamadaAsistio === 'SI' ? '#fff' : '#10b981', fontWeight: 700, cursor: 'pointer' }}>SÍ</button>
                          <button onClick={() => handleUpdateLlamada(m.id, m.llamadaFecha || new Date().toISOString().split('T')[0], 'NO')} style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #ef4444', background: m.llamadaAsistio === 'NO' ? '#ef4444' : '#fff', color: m.llamadaAsistio === 'NO' ? '#fff' : '#ef4444', fontWeight: 700, cursor: 'pointer' }}>NO</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedManagers.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: textMuted }}>No hay managers en esta vista.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${borderLight}` }}>
               <span style={{ fontSize: '0.85rem', color: textMuted }}>Página {currentPage} de {totalPages}</span>
               <div style={{ display: 'flex', gap: '0.5rem' }}>
                 <button disabled={currentPage===1} onClick={() => setCurrentPage(p=>p-1)} style={{ padding: '0.3rem 0.8rem', borderRadius: '4px', border: `1px solid ${borderLight}`, background: '#fff', cursor: 'pointer' }}>Ant</button>
                 <button disabled={currentPage>=totalPages} onClick={() => setCurrentPage(p=>p+1)} style={{ padding: '0.3rem 0.8rem', borderRadius: '4px', border: `1px solid ${borderLight}`, background: '#fff', cursor: 'pointer' }}>Sig</button>
               </div>
            </div>
          </div>
        )}

        {/* GRUPALES */}
        {activeTab === 'grupales' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {groupTeams.map((t, idx) => (
              <div key={idx} style={{ background: bgCard, borderRadius: '12px', padding: '1.5rem', border: `1px solid ${borderLight}`, borderTop: `4px solid ${SEDE_COLORS[t.sede] || '#3b82f6'}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, color: textDark, fontSize: '1.1rem' }}>{t.equipo} {t.numEquipo?`(#${t.numEquipo})`:''}</h3>
                    <div style={{ fontSize: '0.8rem', color: textMuted }}>🎓 {t.entrenadorUnico}</div>
                  </div>
                  <div style={{ background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>{t.managers.length} Mngrs</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.5rem' }}>
                  {t.managers.map(m => (
                    <span key={m.id} style={{ background: '#f8fafc', border: `1px solid ${borderLight}`, padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: '#64748b' }}>
                      {m.nombre} {m.llamadaAsistio==='SI'?'✅':m.llamadaAsistio==='NO'?'❌':''}
                    </span>
                  ))}
                </div>
                <button onClick={() => openGroupModal(t)} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: 'none', background: '#d97706', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                  <PhoneCall size={16} /> Registrar Llamada Grupal
                </button>
              </div>
            ))}
            {groupTeams.length === 0 && <p style={{ color: textMuted }}>No hay equipos agrupados bajo un solo entrenador en tu vista actual.</p>}
          </div>
        )}

      </main>

      {/* MODAL GRUPAL CON EXCEPCIONES */}
      {groupModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(2px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: bgCard, width: '100%', maxWidth: '500px', borderRadius: '12px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 0.5rem 0', color: textDark, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} color="#d97706" /> Equipo: {groupModal.equipo}
            </h2>
            <p style={{ margin: '0 0 1.5rem 0', color: textMuted, fontSize: '0.9rem' }}>Selecciona la fecha y desmarca a quienes <strong>no</strong> asistieron.</p>
            
            <input type="date" value={groupCallDate} onChange={e => setGroupCallDate(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: `1px solid ${borderLight}`, marginBottom: '1.5rem' }} />
            
            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1.5rem', display: 'grid', gap: '0.5rem' }}>
              {groupModal.managers.map(m => (
                <label key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem', background: '#f8fafc', borderRadius: '6px', border: `1px solid ${borderLight}`, cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500, color: textDark }}>{m.nombre}</span>
                  <input type="checkbox" checked={groupCallAttendance[m.id]} onChange={e => setGroupCallAttendance({...groupCallAttendance, [m.id]: e.target.checked})} style={{ width: '18px', height: '18px', accentColor: '#10b981' }} />
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setGroupModal(null)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: `1px solid ${borderLight}`, background: '#fff', color: textDark, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSaveGroupCall} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Guardar Asistencia</button>
            </div>
          </div>
        </div>
      )}
      
      {/* MODAL NUEVO MANAGER (Solo para Coord/Director Maestría y SuperAdmin) */}
      {showModal && userCanAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(2px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: bgCard, width: '100%', maxWidth: '600px', borderRadius: '12px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', color: textDark, fontSize: '1.2rem' }}>+ Nuevo Manager</h2>
            <form onSubmit={handleSaveNewManager} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ gridColumn: '1 / -1' }}><input required placeholder="Nombre Completo" value={newManager.nombre} onChange={e=>setNewManager({...newManager, nombre: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: `1px solid ${borderLight}` }}/></div>
              <div><input placeholder="Teléfono" value={newManager.telefono} onChange={e=>setNewManager({...newManager, telefono: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: `1px solid ${borderLight}` }}/></div>
              <div>
                <select value={newManager.sede} onChange={e=>setNewManager({...newManager, sede: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: `1px solid ${borderLight}` }}>
                  {OPERATIONAL_SEDES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><input placeholder="Equipo" value={newManager.equipo} onChange={e=>setNewManager({...newManager, equipo: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: `1px solid ${borderLight}` }}/></div>
              <div><input placeholder="Número Eq." value={newManager.numEquipo} onChange={e=>setNewManager({...newManager, numEquipo: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: `1px solid ${borderLight}` }}/></div>
              <div style={{ gridColumn: '1 / -1' }}>
                <select value={newManager.entrenador} onChange={e=>setNewManager({...newManager, entrenador: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: `1px solid ${borderLight}` }}>
                  <option value="">Sin Entrenador Asignado</option>
                  {ENTRENADORES_LIST.map(e => <option key={e} value={e}>🎓 {e}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: `1px solid ${borderLight}`, background: '#fff', color: textDark, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
