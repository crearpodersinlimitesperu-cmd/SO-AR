import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, limit, getDocs, where, getCountFromServer } from 'firebase/firestore';
import { Search, RefreshCw, ArrowLeft, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { canViewCRMMaestro } from '../config/permissions';

// BUG REAL encontrado y corregido (08/09/2026, reportado por José: "esta base de
// datos esta horrible"). Esta página usaba clases de Tailwind CSS (bg-emerald-500/20,
// px-2 py-1 rounded, grid grid-cols-4, etc.) pero el proyecto NO tiene Tailwind
// instalado — no existe tailwind.config, no está en package.json, y no hay
// directivas @tailwind en ningún CSS de la plataforma. Era la ÚNICA página de toda
// la app usando ese framework, así que ninguna de esas clases hacía nada — de ahí
// el texto plano sin estilo que se veía. Reescrita aquí con estilos en línea,
// siguiendo el mismo lenguaje visual (fondo oscuro, acentos dorados, tarjetas con
// borde sutil) que ya usan el resto de páginas de la plataforma (ej. DirectorioQT.jsx).
// La lógica de datos (fetchStats, fetchData, búsqueda) no se tocó — es exactamente
// la misma que ya estaba.

export default function CRMBaseMaster() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // BUG REAL corregido (08/09/2026, pedido explícito de José: "esta base solo la
  // puedo ver yo"). Antes esta página no tenía NINGÚN control de acceso propio —
  // la ruta /crm-maestro en App.jsx solo exige <PrivateRoute> (cualquier usuario
  // autenticado), así que cualquier colaborador logueado podía ver los 2999
  // registros de participantes (nombre, DNI, teléfono, IMO enrolador) de toda la
  // plataforma. Ver canViewCRMMaestro() en permissions.js — por ahora solo
  // restringe la INTERFAZ; la colección "participants" en firestore.rules sigue
  // permitiendo lectura a cualquier SuperAdmin o Gerente/Dirección a nivel de
  // base de datos, y estrecharla ahí requiere autorización explícita antes de
  // tocar firestore.rules.
  const hasAccess = canViewCRMMaestro(currentUser);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, sentados: 0, pendientes: 0 });

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
      const q = query(collection(db, 'participants'), limit(150));
      const snap = await getDocs(q);
      const docs = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
      setData(docs);
    } catch (e) {
      toast.error('Error al cargar la base de datos');
    }
    setLoading(false);
  };

  // Paleta consistente con el resto de la plataforma (ver DirectorioQT.jsx, Home.jsx)
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

  const getStatusBadge = (estado) => {
    const key = estado && STATUS_STYLES[estado] ? estado : 'PENDIENTE';
    const { bg, color, Icon } = STATUS_STYLES[key];
    return (
      <span style={{ background: bg, color, padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
        <Icon size={12} /> {estado || 'PENDIENTE'}
      </span>
    );
  };

  const filteredData = data.filter(p =>
    p.nombreCompleto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.dni?.includes(searchTerm)
  );

  if (!hasAccess) {
    return (
      <div style={{ minHeight: '100vh', background: bgPage, color: textMain, padding: '1.5rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '440px', textAlign: 'center', background: bgCard, border: `1px solid ${borderSubtle}`, borderRadius: '16px', padding: '2.5rem 2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ margin: '0 0 0.6rem 0', color: gold, fontSize: '1.3rem' }}>Acceso Restringido</h2>
          <p style={{ margin: '0 0 1.5rem 0', color: textMuted, fontSize: '0.9rem' }}>
            Esta base de datos (Base Maestra CRM / Nodus) es de acceso exclusivo. No tienes permiso para verla.
          </p>
          <button
            onClick={() => navigate('/home')}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} /> Volver a Causa OS
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: bgPage, color: textMain, padding: '1.5rem', fontFamily: 'inherit' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: `1px solid ${borderSubtle}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => navigate(-1)}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}
            >
              <ArrowLeft size={16} /> Volver a Causa OS
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 900, color: gold, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Users size={26} color={gold} /> Base Maestra CRM (Nodus)
              </h1>
              <p style={{ margin: '0.3rem 0 0 0', color: textMuted, fontSize: '0.88rem' }}>
                Conexión directa con todos los registros sincronizados de tu CRM
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.1rem', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <RefreshCw size={16} /> Refrescar
          </button>
        </div>

        {/* TARJETAS DE ESTADÍSTICAS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: bgCard, border: `1px solid ${borderSubtle}`, borderRadius: '12px', padding: '1.1rem' }}>
            <div style={{ color: textMuted, fontSize: '0.8rem', marginBottom: '0.3rem', fontWeight: 600 }}>Total Registros</div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: textMain }}>{stats.total}</div>
          </div>
          <div style={{ background: bgCard, border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', padding: '1.1rem' }}>
            <div style={{ color: textMuted, fontSize: '0.8rem', marginBottom: '0.3rem', fontWeight: 600 }}>Sentados</div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#34d399' }}>{stats.sentados}</div>
          </div>
          <div style={{ background: bgCard, border: `1px solid ${borderSubtle}`, borderRadius: '12px', padding: '1.1rem' }}>
            <div style={{ color: textMuted, fontSize: '0.8rem', marginBottom: '0.3rem', fontWeight: 600 }}>Pendientes</div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#cbd5e1' }}>{stats.pendientes}</div>
          </div>
        </div>

        {/* TABLA */}
        <div style={{ background: bgCard, border: `1px solid ${borderSubtle}`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: `1px solid ${borderSubtle}`, background: bgCardHeader, display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: textMuted }} />
              <input
                type="text"
                placeholder="Buscar por DNI o Nombres..."
                style={{ width: '100%', background: bgInput, border: `1px solid ${borderSubtle}`, borderRadius: '8px', padding: '0.55rem 1rem 0.55rem 2.3rem', color: textMain, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.2)', color: textMuted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.9rem 1rem', borderBottom: `1px solid ${borderSubtle}`, fontWeight: 700 }}>Participante</th>
                  <th style={{ padding: '0.9rem 1rem', borderBottom: `1px solid ${borderSubtle}`, fontWeight: 700 }}>Contacto</th>
                  <th style={{ padding: '0.9rem 1rem', borderBottom: `1px solid ${borderSubtle}`, fontWeight: 700 }}>Estado C1</th>
                  <th style={{ padding: '0.9rem 1rem', borderBottom: `1px solid ${borderSubtle}`, fontWeight: 700 }}>Coordinadora</th>
                  <th style={{ padding: '0.9rem 1rem', borderBottom: `1px solid ${borderSubtle}`, fontWeight: 700 }}>IMO Enrolador</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '2.5rem', textAlign: 'center', color: textMuted }}>
                      <RefreshCw size={22} style={{ display: 'block', margin: '0 auto 0.5rem', animation: 'spin 1s linear infinite' }} />
                      Cargando base de datos...
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '2.5rem', textAlign: 'center', color: textMuted }}>
                      No se encontraron resultados en la vista actual.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((p, idx) => (
                    <tr key={p.id} style={{ borderBottom: idx === filteredData.length - 1 ? 'none' : `1px solid rgba(255,255,255,0.05)` }}>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: textMain }}>{p.nombreCompleto}</div>
                        <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: '0.15rem' }}>DNI: {p.dni || 'Sin DNI'}</div>
                      </td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ fontSize: '0.85rem' }}>{p.telefono || '-'}</div>
                        <div style={{ fontSize: '0.72rem', color: textMuted, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email || '-'}</div>
                      </td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        {getStatusBadge(p.estadoC1)}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
                        {p.coordinadora || '-'}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', color: textMuted }}>
                        {p.imoEnrolador || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '0.9rem', borderTop: `1px solid ${borderSubtle}`, textAlign: 'center', fontSize: '0.72rem', color: textMuted }}>
            Mostrando hasta 150 registros recientes. Usa la barra de búsqueda para filtrar localmente.
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
