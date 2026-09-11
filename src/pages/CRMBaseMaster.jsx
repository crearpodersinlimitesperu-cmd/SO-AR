import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, limit, getDocs, where, getCountFromServer } from 'firebase/firestore';
import { Search, RefreshCw, ArrowLeft, Users, CheckCircle, XCircle, Clock, ChevronDown, ChevronRight, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { canViewCRMMaestro } from '../config/permissions';

export default function CRMBaseMaster() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const hasAccess = canViewCRMMaestro(currentUser);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, sentados: 0, pendientes: 0 });
  const [expandedNodes, setExpandedNodes] = useState({});

  useEffect(() => {
    if (!hasAccess) return;
    fetchStats();
    fetchData();
  }, [hasAccess]);

  const fetchStats = async () => {
    try {
      const coll = collection(db, 'participants');
      const totalSnap = await getCountFromServer(coll);
      const sentadosQ = query(coll, where('estadoC1', '==', 'SENTADO'));
      const sentadosSnap = await getCountFromServer(sentadosQ);
      const pendientesQ = query(coll, where('estadoC1', '==', 'PENDIENTE'));
      const pendientesSnap = await getCountFromServer(pendientesQ);

      setStats({
        total: totalSnap.data().count,
        sentados: sentadosSnap.data().count,
        pendientes: pendientesSnap.data().count
      });
    } catch (e) {
      console.error("Error fetching stats:", e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Pedimos mas registros para un arbol rico en datos (limit 500)
      const q = query(collection(db, 'participants'), limit(500));
      const snap = await getDocs(q);
      const docs = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
      setData(docs);
    } catch (e) {
      toast.error('Error al cargar la base de datos');
    }
    setLoading(false);
  };

  const bgPage = '#0d152d';
  const bgCard = 'rgba(255,255,255,0.03)';
  const bgCardHeader = 'rgba(255,255,255,0.02)';
  const bgInput = 'rgba(0,0,0,0.25)';
  const borderSubtle = 'rgba(255,255,255,0.08)';
  const gold = 'var(--crear-gold, #f59e0b)';
  const textMain = '#f1f5f9';
  const textMuted = '#94a3b8';

  const STATUS_STYLES = {
    SENTADO: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', Icon: CheckCircle },
    DESERTOR: { bg: 'rgba(244,63,94,0.15)', color: '#fb7185', Icon: XCircle },
    REZAGADO: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', Icon: Clock },
    PENDIENTE: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', Icon: Clock }
  };

  const getStatusBadge = (statusStr) => {
    const s = String(statusStr || '').toUpperCase().trim();
    let style = STATUS_STYLES[s] || STATUS_STYLES.PENDIENTE;
    if (s.includes('DESERTOR')) style = STATUS_STYLES.DESERTOR;
    if (s.includes('REZAGADO')) style = STATUS_STYLES.REZAGADO;
    if (s.includes('SENTADO')) style = STATUS_STYLES.SENTADO;

    const { bg, color, Icon } = style;
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: bg, color: color, padding: '0.25rem 0.6rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800 }}>
        <Icon size={12} />
        {s || 'PENDIENTE'}
      </div>
    );
  };

  // Construccion del arbol
  const treeData = useMemo(() => {
    let list = data;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(p => 
        (p.nombreCompleto || '').toLowerCase().includes(term) ||
        (p.dni || '').toLowerCase().includes(term) ||
        (p.imoEnrolador || '').toLowerCase().includes(term)
      );
    }

    const grouped = {};
    list.forEach(p => {
      const enrolador = (p.imoEnrolador && p.imoEnrolador.trim() !== '') ? p.imoEnrolador.trim().toUpperCase() : 'SIN ENROLADOR ASIGNADO';
      if (!grouped[enrolador]) {
        grouped[enrolador] = [];
      }
      grouped[enrolador].push(p);
    });

    const arr = Object.keys(grouped).map(key => ({
      imoName: key,
      participants: grouped[key],
      totalSentados: grouped[key].filter(p => (p.estadoC1 || '').toUpperCase().includes('SENTADO')).length,
      totalPendientes: grouped[key].filter(p => (p.estadoC1 || '').toUpperCase().includes('PENDIENTE')).length,
    }));

    // Ordenar: mayor cantidad de participantes primero
    arr.sort((a, b) => b.participants.length - a.participants.length);
    return arr;
  }, [data, searchTerm]);

  const toggleNode = (imoName) => {
    setExpandedNodes(prev => ({ ...prev, [imoName]: !prev[imoName] }));
  };

  if (!hasAccess) {
    return (
      <div style={{ minHeight: '100vh', background: bgPage, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.2rem' }}>
        <div style={{ color: textMuted }}>Acceso restringido. Nivel insuficiente de administrador.</div>
        {/* (09/09/2026) José reportó (con captura) que a esta pantalla le faltaba el botón
            de regreso que sí tienen las demás pantallas de acceso restringido de la
            plataforma (ChecklistBoard.jsx, NodusDataMap.jsx) — quedó fuera cuando este
            archivo fue reescrito por otro agente. Se añade aquí el mismo patrón. */}
        <button
          onClick={() => navigate('/')}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: bgCard, border: `1px solid ${borderSubtle}`, color: textMain, borderRadius: '8px', cursor: 'pointer' }}
        >
          <ArrowLeft size={16} /> Volver a Causa OS
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: bgPage, fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* HEADER COHERENTE */}
      <header style={{ background: bgCardHeader, borderBottom: `1px solid ${borderSubtle}`, padding: '1.2rem 2rem', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(10px)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <button onClick={() => navigate('/')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: bgCard, border: `1px solid ${borderSubtle}`, color: textMain, borderRadius: '8px', cursor: 'pointer' }}>
              <ArrowLeft size={16} /> Volver a Causa OS
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.4rem', color: gold, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Users size={24} /> Red Genealógica de Enrolamiento (CRM)
              </h1>
              <p style={{ margin: 0, fontSize: '0.85rem', color: textMuted }}>
                Base Maestra Estructurada: Árbol interactivo cruzado con Nodus
              </p>
            </div>
          </div>
          <button onClick={() => { fetchStats(); fetchData(); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f59e0b', color: '#000', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            <RefreshCw size={16} /> Refrescar Árbol
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 2rem' }}>
        
        {/* STATS GLOBALES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: bgCard, border: `1px solid ${borderSubtle}`, borderRadius: '12px', padding: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#3b82f6', fontWeight: 800, marginBottom: '0.3rem' }}>Total Registros Sincronizados</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: textMain }}>{stats.total}</div>
          </div>
          <div style={{ background: bgCard, border: `1px solid ${borderSubtle}`, borderRadius: '12px', padding: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#10b981', fontWeight: 800, marginBottom: '0.3rem' }}>Total Sentados</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: textMain }}>{stats.sentados}</div>
          </div>
          <div style={{ background: bgCard, border: `1px solid ${borderSubtle}`, borderRadius: '12px', padding: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 800, marginBottom: '0.3rem' }}>Total Pendientes / Otros</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: textMain }}>{stats.pendientes}</div>
          </div>
        </div>

        {/* CONTAINER DEL ARBOL */}
        <div style={{ background: bgCard, border: `1px solid ${borderSubtle}`, borderRadius: '12px', overflow: 'hidden' }}>
          
          <div style={{ padding: '1.5rem', borderBottom: `1px solid ${borderSubtle}` }}>
            <div style={{ position: 'relative', maxWidth: '600px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: textMuted }} />
              <input 
                type="text" 
                placeholder="Buscar por DNI, Nombre de IMO o Enrolado..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', background: bgInput, border: `1px solid ${borderSubtle}`, color: textMain, borderRadius: '8px', fontSize: '0.95rem', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ padding: '1rem' }}>
            {loading ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: textMuted }}>
                <RefreshCw size={32} style={{ display: 'block', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                Estructurando Árbol Genealógico...
              </div>
            ) : treeData.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: textMuted }}>
                No se encontraron conexiones en la red para esta búsqueda.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {treeData.map((node) => {
                  const isExpanded = expandedNodes[node.imoName] || searchTerm !== '';
                  const isNoAsignado = node.imoName === 'SIN ENROLADOR ASIGNADO';

                  return (
                    <div key={node.imoName} style={{ border: `1px solid ${borderSubtle}`, borderRadius: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.01)' }}>
                      {/* RAÍZ DEL IMO */}
                      <div 
                        onClick={() => toggleNode(node.imoName)}
                        style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: isExpanded ? 'rgba(255,255,255,0.04)' : 'transparent', transition: 'background 0.2s' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <div style={{ color: isExpanded ? gold : textMuted }}>
                            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                          </div>
                          <Award size={20} color={isNoAsignado ? '#94a3b8' : gold} />
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', color: isNoAsignado ? '#94a3b8' : textMain }}>{node.imoName}</h3>
                            <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '0.2rem' }}>
                              Líder de Red (IMO)
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                            {node.participants.length} TOTAL
                          </span>
                          <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                            {node.totalSentados} SENTADOS
                          </span>
                          <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                            {node.totalPendientes} PENDIENTES
                          </span>
                        </div>
                      </div>

                      {/* HOJAS (ENROLADOS) */}
                      {isExpanded && (
                        <div style={{ borderTop: `1px solid ${borderSubtle}`, padding: 'clamp(0.5rem, 2vw, 1rem) clamp(0.5rem, 2vw, 1rem) clamp(0.5rem, 2vw, 1rem) clamp(0.75rem, 3vw, 2rem)', background: 'rgba(0,0,0,0.15)' }}>
                          <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
                              <thead>
                                <tr style={{ color: textMuted, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  <th style={{ padding: '0.5rem 1rem', borderBottom: `1px solid ${borderSubtle}` }}>Enrolado (Participante)</th>
                                  <th style={{ padding: '0.5rem 1rem', borderBottom: `1px solid ${borderSubtle}` }}>Contacto</th>
                                  <th style={{ padding: '0.5rem 1rem', borderBottom: `1px solid ${borderSubtle}` }}>Estado C1</th>
                                  <th style={{ padding: '0.5rem 1rem', borderBottom: `1px solid ${borderSubtle}` }}>Coordinadora</th>
                                </tr>
                              </thead>
                              <tbody>
                                {node.participants.map((p, idx) => (
                                  <tr key={p.id} style={{ borderBottom: idx === node.participants.length - 1 ? 'none' : `1px solid ${borderSubtle}` }}>
                                    <td style={{ padding: '0.8rem 1rem' }}>
                                      <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.9rem' }}>{p.nombreCompleto}</div>
                                      <div style={{ fontSize: '0.7rem', color: textMuted, marginTop: '0.15rem' }}>DNI: {p.dni || '-'}</div>
                                    </td>
                                    <td style={{ padding: '0.8rem 1rem' }}>
                                      <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{p.telefono || 'Sin teléfono'}</div>
                                      <div style={{ fontSize: '0.75rem', color: textMuted }}>{p.email || 'Sin correo'}</div>
                                    </td>
                                    <td style={{ padding: '0.8rem 1rem' }}>
                                      {getStatusBadge(p.estadoC1)}
                                    </td>
                                    <td style={{ padding: '0.8rem 1rem', fontSize: '0.8rem', color: textMuted }}>
                                      {p.coordinadora || 'Sin Asignar'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

