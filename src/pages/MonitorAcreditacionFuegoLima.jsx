import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ExternalLink,
  Copy,
  Users,
  Check,
  PhoneCall,
  Clock,
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import padronLima111 from '../data/padron_fuego_lima_111.json';

export default function MonitorAcreditacionFuegoLima() {
  const [signedContracts, setSignedContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState('TODOS');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [qrModalType, setQrModalType] = useState(null); // 'contract' | 'monitor' | null
  const [copiedLink, setCopiedLink] = useState(false);

  // Normalizar strings para búsqueda y matching
  const normalizeStr = (str) => {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  };

  // Escuchar firmas en tiempo real desde Firestore
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    try {
      const colRef = collection(db, 'contratos_caminata_fuego');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const list = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() });
          });
          setSignedContracts(list);
          setLoading(false);
        },
        (error) => {
          console.warn('⚠️ Error en listener Firestore contratos_caminata_fuego:', error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Firestore subscription error:', err);
      setLoading(false);
    }
  }, []);

  // Matching de firmas contra el padrón oficial de 111 integrantes
  const enrichedList = useMemo(() => {
    return padronLima111.map((person) => {
      const normPersonName = normalizeStr(person.nombre);
      const personTokens = normPersonName.split(/\s+/).filter((t) => t.length > 2);

      const signature = signedContracts.find((c) => {
        const normSigName = normalizeStr(c.nombre || c.nombreCompleto || '');
        if (normSigName === normPersonName) return true;
        const matchTokens = personTokens.filter((t) => normSigName.includes(t));
        return matchTokens.length >= 2;
      });

      return {
        ...person,
        isSigned: !!signature,
        signature
      };
    });
  }, [signedContracts]);

  // Contadores KPI
  const stats = useMemo(() => {
    const total = enrichedList.length;
    const firmados = enrichedList.filter((p) => p.isSigned).length;
    const pendientes = total - firmados;
    const porcentaje = total > 0 ? Math.round((firmados / total) * 100) : 0;
    return { total, firmados, pendientes, porcentaje };
  }, [enrichedList]);

  // Filtrado reactivo
  const filteredList = useMemo(() => {
    return enrichedList.filter((item) => {
      if (teamFilter !== 'TODOS' && item.equipo !== teamFilter) {
        return false;
      }
      if (statusFilter === 'PENDIENTES' && item.isSigned) {
        return false;
      }
      if (statusFilter === 'FIRMADOS' && !item.isSigned) {
        return false;
      }
      if (searchTerm) {
        const term = normalizeStr(searchTerm);
        const nameNorm = normalizeStr(item.nombre);
        const rolNorm = normalizeStr(item.rol);
        const cohorteNorm = normalizeStr(item.cohorte);
        const docNum = item.signature ? normalizeStr(item.signature.numeroDocumento || item.signature.doc) : '';
        return (
          nameNorm.includes(term) ||
          rolNorm.includes(term) ||
          cohorteNorm.includes(term) ||
          docNum.includes(term)
        );
      }
      return true;
    });
  }, [enrichedList, teamFilter, statusFilter, searchTerm]);

  const contractUrl = 'https://cartas.crearpsl.net/contrato_caminata_fuego.html';
  const monitorUrl = 'https://cartas.crearpsl.net/monitor_fuego_lima.html';

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#070b13', color: '#f8fafc', padding: '1.25rem 0.75rem' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Encabezado Operativo */}
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          border: '1px solid rgba(249, 115, 22, 0.35)',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: '0 20px 40px -15px rgba(249, 115, 22, 0.15)'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #f59e0b, #ea580c, #dc2626)'
          }} />

          {/* Logo Oficial CREAR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <img src="/logo_crear_blanco.png" alt="CREAR Poder Sin Límites" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} onError={(e) => { e.currentTarget.src = '/logo-crear.png'; }} />
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.12em', color: '#f59e0b', textTransform: 'uppercase', display: 'block' }}>CREAR PODER SIN LÍMITES</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', display: 'block' }}>Causa OS · Centro de Acreditación y Operaciones</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{
                  background: 'linear-gradient(90deg, #ea580c, #dc2626)',
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '6px'
                }}>
                  🔥 CAUSA OS · LIMA OPERACIONES
                </span>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  EN VIVO
                </span>
              </div>
              <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#fff' }}>
                Monitor de Acreditación · Caminata sobre Fuego
              </h1>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.84rem', color: '#94a3b8', fontWeight: 500 }}>
                📍 Casona Blanca (Calle Las Perdices 1126, Huachipa) · Control de Firmas de Exoneración
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setQrModalType('contract')}
                style={{
                  background: '#ea580c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.65rem 1rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)'
                }}
              >
                <QrCode size={16} /> QR Contrato
              </button>
              <a
                href={contractUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#1e293b',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '0.65rem 1rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  textDecoration: 'none'
                }}
              >
                Abrir Formulario <ExternalLink size={14} />
              </a>
            </div>
          </div>

          {/* Tarjetas KPI */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.75rem',
            marginTop: '1.25rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ background: '#0f172a', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #334155' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Padrón Lima</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginTop: '0.15rem' }}>{stats.total}</div>
            </div>
            <div style={{ background: 'rgba(6, 78, 59, 0.3)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>✓ Acreditados</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34d399', marginTop: '0.15rem' }}>{stats.firmados}</div>
            </div>
            <div style={{ background: 'rgba(136, 19, 55, 0.3)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(244, 63, 94, 0.4)' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#fb7185', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚠️ Pendientes</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fb7185', marginTop: '0.15rem' }}>{stats.pendientes}</div>
            </div>
            <div style={{ background: 'rgba(120, 53, 15, 0.3)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>% Aceptación</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fbbf24', marginTop: '0.15rem' }}>{stats.porcentaje}%</div>
            </div>
          </div>

          {/* Barra de Progreso */}
          <div style={{ marginTop: '0.85rem' }}>
            <div style={{ width: '100%', height: '8px', background: '#0f172a', borderRadius: '9999px', overflow: 'hidden', padding: '1px', border: '1px solid #334155' }}>
              <div style={{
                height: '100%',
                width: `${stats.porcentaje}%`,
                background: 'linear-gradient(90deg, #f59e0b, #ea580c, #10b981)',
                borderRadius: '9999px',
                transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
            </div>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid #1e293b',
          borderRadius: '14px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          position: 'sticky',
          top: '0.75rem',
          zIndex: 20,
          backdropFilter: 'blur(8px)',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)'
        }}>
          {/* Buscador */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Buscar por nombre, apellido, DNI o rol..."
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.6rem',
                background: '#0b1120',
                border: '1px solid #334155',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '0.86rem',
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 800
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtros por Equipo */}
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
            {[
              { id: 'TODOS', label: `Todos (${padronLima111.length})` },
              { id: 'Equipo 29', label: 'E29 · Phoenix (16)' },
              { id: 'Equipo 30', label: 'E30 · Tinkuy (34)' },
              { id: 'Equipo 31', label: 'E31 · Imperio (19)' },
              { id: 'Equipo 32', label: 'E32 · C2 Lima (42)' }
            ].map((t) => {
              const active = teamFilter === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTeamFilter(t.id)}
                  style={{
                    background: active ? '#ea580c' : '#1e293b',
                    color: active ? '#fff' : '#cbd5e1',
                    border: active ? 'none' : '1px solid #334155',
                    borderRadius: '8px',
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Filtro por Estado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginRight: '0.25rem' }}>Estado:</span>
            {[
              { id: 'TODOS', label: 'Todos' },
              { id: 'PENDIENTES', label: '🚨 Solo Pendientes' },
              { id: 'FIRMADOS', label: '✓ Acreditados' }
            ].map((s) => {
              const active = statusFilter === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setStatusFilter(s.id)}
                  style={{
                    background: active ? (s.id === 'PENDIENTES' ? '#881337' : s.id === 'FIRMADOS' ? '#064e3b' : '#334155') : '#1e293b',
                    color: active ? '#fff' : '#94a3b8',
                    border: active ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid #334155',
                    borderRadius: '6px',
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Indicador de Conteo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
          <span>Mostrando <strong>{filteredList.length}</strong> de {enrichedList.length} integrantes</span>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Sincronización en vivo con Firestore</span>
        </div>

        {/* Lista de Integrantes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {filteredList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
              <p style={{ margin: 0, fontWeight: 700, color: '#fff' }}>No se encontraron integrantes con este filtro</p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>Prueba limpiando el buscador o cambiando de equipo.</p>
            </div>
          ) : (
            filteredList.map((item) => {
              if (item.isSigned) {
                const sig = item.signature;
                const docText = sig.tipoDocumento && sig.numeroDocumento
                  ? `${sig.tipoDocumento}: ${sig.numeroDocumento}`
                  : (sig.doc || 'Registrado');
                const time = sig.timestamp || 'Fecha verificada';
                const code = sig.code || 'CQ-FIRE-VERIFIED';
                const rolFirmado = sig.rol || item.rol;

                return (
                  <div
                    key={item.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem',
                      boxShadow: '0 4px 12px rgba(6, 78, 59, 0.15)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        <span style={{
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#34d399',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          fontSize: '0.65rem',
                          fontWeight: 900,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px'
                        }}>
                          ✓ ACREDITADO / FIRMADO
                        </span>
                        <span style={{ background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                          {item.equipo} · {item.cohorte}
                        </span>
                        <span style={{ background: 'rgba(249, 115, 22, 0.1)', color: '#fb923c', border: '1px solid rgba(249, 115, 22, 0.25)', fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                          {rolFirmado}
                        </span>
                      </div>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#fff' }}>{item.nombre}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginTop: '0.35rem', fontSize: '0.75rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                        <span>🆔 <strong style={{ color: '#e2e8f0' }}>{docText}</strong></span>
                        <span>🕒 <strong style={{ color: '#cbd5e1' }}>{time}</strong></span>
                        <span style={{ color: '#fbbf24', fontFamily: 'monospace', fontSize: '0.72rem' }}>{code}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '8px',
                        padding: '0.4rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        <CheckCircle2 size={15} color="#34d399" /> Listo para Ingreso
                      </span>
                    </div>
                  </div>
                );
              } else {
                // Pendiente de firma
                const waMessage = encodeURIComponent(
                  `Hola ${item.nombre}, te escribe el equipo de CREAR PSL Lima. Por favor completa y firma tu exoneración legal obligatoria para la Caminata sobre Fuego en Casona Blanca antes de ingresar aquí: https://cartas.crearpsl.net/contrato_caminata_fuego.html`
                );

                return (
                  <div
                    key={item.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1px solid rgba(244, 63, 94, 0.35)',
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        <span style={{
                          background: 'rgba(244, 63, 94, 0.2)',
                          color: '#fb7185',
                          border: '1px solid rgba(244, 63, 94, 0.4)',
                          fontSize: '0.65rem',
                          fontWeight: 900,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px'
                        }}>
                          🚨 PENDIENTE DE FIRMA
                        </span>
                        <span style={{ background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                          {item.equipo} · {item.cohorte}
                        </span>
                        <span style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                          {item.rol}
                        </span>
                      </div>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f1f5f9' }}>{item.nombre}</h3>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                        {item.detalle || 'Requiere firma digital antes del ingreso a la actividad'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <a
                        href={`https://wa.me/?text=${waMessage}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: '#16a34a',
                          color: '#fff',
                          textDecoration: 'none',
                          borderRadius: '8px',
                          padding: '0.5rem 0.85rem',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          boxShadow: '0 4px 10px rgba(22, 163, 74, 0.25)'
                        }}
                      >
                        <PhoneCall size={14} /> Recordar por WhatsApp
                      </a>
                      <button
                        onClick={() => copyUrl(contractUrl)}
                        title="Copiar enlace del contrato"
                        style={{
                          background: '#1e293b',
                          color: '#cbd5e1',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          padding: '0.5rem 0.65rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {copiedLink ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                );
              }
            })
          )}
        </div>

        {/* Modal QR Code */}
        {qrModalType && (
          <div
            onClick={() => setQrModalType(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(6px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#0f172a',
                border: '1px solid rgba(249, 115, 22, 0.4)',
                borderRadius: '16px',
                padding: '1.75rem',
                maxWidth: '360px',
                width: '100%',
                textAlign: 'center',
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
              }}
            >
              <button
                onClick={() => setQrModalType(null)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.25rem',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>

              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 900, color: '#fff' }}>
                {qrModalType === 'contract' ? 'Escanear para Firmar Contrato' : 'Escanear para Abrir Monitor'}
              </h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                {qrModalType === 'contract'
                  ? 'Pide al participante o staff escanear este código con su celular para abrir la exoneración oficial.'
                  : 'Comparte este monitor en vivo con el equipo de staff y capitanía.'}
              </p>

              <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px', display: 'inline-block', margin: '0 auto 1rem auto' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    qrModalType === 'contract' ? contractUrl : monitorUrl
                  )}`}
                  alt="QR Code"
                  style={{ width: '190px', height: '190px', display: 'block' }}
                />
              </div>

              <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#94a3b8', wordBreak: 'break-all', marginBottom: '1rem' }}>
                {qrModalType === 'contract' ? contractUrl : monitorUrl}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => copyUrl(qrModalType === 'contract' ? contractUrl : monitorUrl)}
                  style={{
                    flex: 1,
                    background: '#ea580c',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {copiedLink ? '✓ ¡Copiado!' : '📋 Copiar Enlace'}
                </button>
                <button
                  onClick={() => setQrModalType(null)}
                  style={{
                    flex: 1,
                    background: '#1e293b',
                    color: '#cbd5e1',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
