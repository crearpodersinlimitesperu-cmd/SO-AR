import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  MapPin,
  FileText,
  Sparkles,
  Calendar,
  Mail,
  X,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import padronLima111 from '../data/padron_fuego_lima_111.json';
import { generateFirewalkPassCanvas, sendFirewalkConfirmationEmail } from '../utils/maestriaPass';

export default function MonitorAcreditacionFuegoLima() {
  const navigate = useNavigate();
  const [signedContracts, setSignedContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('REGISTROS'); // 'REGISTROS' | 'PADRON'

  // Filtros Registros
  const [regSearch, setRegSearch] = useState('');
  const [regRoleFilter, setRegRoleFilter] = useState('TODOS');

  // Filtros Padrón
  const [padronSearch, setPadronSearch] = useState('');
  const [padronTeamFilter, setPadronTeamFilter] = useState('TODOS');
  const [padronStatusFilter, setPadronStatusFilter] = useState('TODOS');

  const [qrModalType, setQrModalType] = useState(null); // 'contract' | null
  const [copiedLink, setCopiedLink] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState(null);
  const [emailStatusMap, setEmailStatusMap] = useState({});
  const [deletingId, setDeletingId] = useState(null);

  const handleDeleteFirewalkRecord = async (item) => {
    if (!item?.id) {
      alert('Este registro no tiene un ID válido de Firestore para eliminar.');
      return;
    }
    const nombre = item.nombre || item.nombreCompleto || 'Participante';
    const docNum = item.numeroDocumento || item.doc || '';
    const confirmed = window.confirm(
      `¿Confirmas ELIMINAR el registro de Caminata sobre Fuego de "${nombre}" (${docNum})?\n\nUsa esta opción únicamente si la persona quedó mal registrada o ingresó datos errados. Al eliminarlo, podrá volver a llenar y firmar su acuerdo desde cero.`
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    try {
      await deleteDoc(doc(db, 'contratos_caminata_fuego', item.id));
    } catch (err) {
      console.error('Error al eliminar registro en contratos_caminata_fuego:', err);
      alert('No se pudo eliminar el registro. Verifica tus permisos en Causa OS.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleResendFirewalkEmail = async (item) => {
    if (!item.email) {
      alert('Este registro no cuenta con correo electrónico.');
      return;
    }
    const rowKey = item.id || item.code;
    setSendingEmailId(rowKey);
    try {
      const code = item.code || item.verificationCode || 'CQ-FIRE-VERIFIED';
      const docDisplay = item.doc || `${item.tipoDocumento || 'DNI'}: ${item.numeroDocumento || ''}`;
      const passDataUrl = await generateFirewalkPassCanvas({
        nombre: item.nombre || item.nombreCompleto || 'Participante',
        documento: docDisplay,
        rolActividad: item.rol || item.rolActividad || 'Participante',
        lugar: item.lugar || item.sedeLocacion || 'Lima - Casona Blanca (Huachipa)',
        fecha: item.fecha || item.timestamp || 'Registrado',
        codigo: code,
        ip: item.ip || 'Registrada',
        geoLocation: item.geoLocation || 'Lima, Perú 🇵🇪',
        coordinates: item.coordinates || ''
      });

      const ok = await sendFirewalkConfirmationEmail({
        db,
        toEmail: item.email,
        nombre: item.nombre || item.nombreCompleto,
        documento: docDisplay,
        rolActividad: item.rol || item.rolActividad || 'Participante',
        lugar: item.lugar || item.sedeLocacion || 'Lima - Casona Blanca (Huachipa)',
        codigo: code,
        fecha: item.fecha || item.timestamp || 'Registrado',
        passDataUrl,
        telefono: item.telefono || '',
        ip: item.ip || 'Registrada',
        geoLocation: item.geoLocation || 'Lima, Perú 🇵🇪',
        coordinates: item.coordinates || '',
        device: item.dispositivo || '',
        sha256Hash: item.sha256Hash || ''
      });

      setEmailStatusMap((prev) => ({ ...prev, [rowKey]: ok ? 'SENT' : 'ERROR' }));
    } catch (e) {
      console.error('Error reenviando pase de fuego:', e);
      setEmailStatusMap((prev) => ({ ...prev, [rowKey]: 'ERROR' }));
    } finally {
      setSendingEmailId(null);
    }
  };

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

          // Ordenar por más reciente primero
          list.sort((a, b) => {
            const tA = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
            const tB = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
            return tB - tA;
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
  const enrichedPadron = useMemo(() => {
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
    const totalPadron = enrichedPadron.length;
    const firmadosPadron = enrichedPadron.filter((p) => p.isSigned).length;
    const pendientesPadron = totalPadron - firmadosPadron;
    const porcentaje = totalPadron > 0 ? Math.round((firmadosPadron / totalPadron) * 100) : 0;
    const totalRegistradosFirestore = signedContracts.length;
    return { totalPadron, firmadosPadron, pendientesPadron, porcentaje, totalRegistradosFirestore };
  }, [enrichedPadron, signedContracts]);

  // Lista filtrada de Registros Realizados (Tab 1)
  const filteredRegistros = useMemo(() => {
    return signedContracts.filter((item) => {
      if (regRoleFilter !== 'TODOS') {
        const itemRole = item.rol || item.rolActividad || '';
        if (itemRole !== regRoleFilter) return false;
      }
      if (regSearch) {
        const term = normalizeStr(regSearch);
        const name = normalizeStr(item.nombre || item.nombreCompleto || '');
        const doc = normalizeStr(item.numeroDocumento || item.doc || '');
        const code = normalizeStr(item.code || item.verificationCode || '');
        const rol = normalizeStr(item.rol || item.rolActividad || '');
        return name.includes(term) || doc.includes(term) || code.includes(term) || rol.includes(term);
      }
      return true;
    });
  }, [signedContracts, regRoleFilter, regSearch]);

  // Lista filtrada de Padrón Oficial (Tab 2)
  const filteredPadron = useMemo(() => {
    return enrichedPadron.filter((item) => {
      if (padronTeamFilter !== 'TODOS' && item.equipo !== padronTeamFilter) return false;
      if (padronStatusFilter === 'PENDIENTES' && item.isSigned) return false;
      if (padronStatusFilter === 'FIRMADOS' && !item.isSigned) return false;
      if (padronSearch) {
        const term = normalizeStr(padronSearch);
        const nameNorm = normalizeStr(item.nombre);
        const rolNorm = normalizeStr(item.rol);
        const cohorteNorm = normalizeStr(item.cohorte);
        return nameNorm.includes(term) || rolNorm.includes(term) || cohorteNorm.includes(term);
      }
      return true;
    });
  }, [enrichedPadron, padronTeamFilter, padronStatusFilter, padronSearch]);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://centro-operativo-cpsl.web.app';
  const contractUrl = `${originUrl}/caminata-fuego`;

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <div className="monitor-fuego-root" style={{ minHeight: '100vh', background: '#070b13', color: '#f8fafc', padding: '1.25rem 0.75rem' }}>
      <style>{`
        .monitor-fuego-root {
          color: #f8fafc !important;
        }
        .monitor-fuego-root h1,
        .monitor-fuego-root h2,
        .monitor-fuego-root h3,
        .monitor-fuego-root h4 {
          color: #ffffff !important;
        }
        .monitor-fuego-root p {
          color: #cbd5e1;
        }
        .monitor-fuego-root input,
        .monitor-fuego-root select {
          background-color: #0b1120 !important;
          color: #ffffff !important;
          border-color: #334155 !important;
        }
      `}</style>
      <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Encabezado con Branding Oficial CREAR (Uso Exclusivo Interno Causa OS) */}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                background: '#ffffff',
                padding: '6px 12px',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(249, 115, 22, 0.45)'
              }}>
                <img src="/logo-crear.png" alt="CREAR Poder Sin Límites" style={{ height: '32px', width: 'auto', objectFit: 'contain', display: 'block' }} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.12em', color: '#fbbf24', textTransform: 'uppercase', display: 'block' }}>CREAR PODER SIN LÍMITES · CREACIÓN CUÁNTICA E.I.R.L.</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#e2e8f0', display: 'block' }}>Causa OS · Panel Interno Exclusivo (Oficina Lima, Gerencia, Coordinadores y Contabilidad Local)</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/home')}
              style={{
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '0.5rem 0.85rem',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <ArrowLeft size={14} /> Volver a Causa OS
            </button>
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
                  🔥 LIMA OPERACIONES · EN VIVO
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
                  FIRESTORE CONECTADO
                </span>
              </div>
              <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#fff' }}>
                Caminata sobre Fuego · Registro con Fechas y Lugar
              </h1>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.84rem', color: '#94a3b8', fontWeight: 500 }}>
                📍 Casona Blanca (Calle Las Perdices 1126, Huachipa) · Registro Jurídico en Tiempo Real
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
            <div style={{ background: 'rgba(6, 78, 59, 0.3)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🔥 Registrados en Vivo</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34d399', marginTop: '0.15rem' }}>{stats.totalRegistradosFirestore}</div>
            </div>
            <div style={{ background: '#0f172a', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #334155' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Padrón Oficial MJ</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginTop: '0.15rem' }}>{stats.totalPadron}</div>
            </div>
            <div style={{ background: 'rgba(136, 19, 55, 0.3)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(244, 63, 94, 0.4)' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#fb7185', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚠️ Pendientes Padrón</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fb7185', marginTop: '0.15rem' }}>{stats.pendientesPadron}</div>
            </div>
            <div style={{ background: 'rgba(120, 53, 15, 0.3)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>% Avance Padrón</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fbbf24', marginTop: '0.15rem' }}>{stats.porcentaje}%</div>
            </div>
          </div>

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

        {/* SELECTOR DE PESTAÑAS PRINCIPALES */}
        <div style={{ display: 'flex', gap: '0.5rem', background: '#0f172a', padding: '0.4rem', borderRadius: '14px', border: '1px solid #1e293b' }}>
          <button
            onClick={() => setActiveTab('REGISTROS')}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 900,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'REGISTROS' ? 'linear-gradient(90deg, #ea580c, #f59e0b)' : '#1e293b',
              color: activeTab === 'REGISTROS' ? '#fff' : '#94a3b8',
              boxShadow: activeTab === 'REGISTROS' ? '0 4px 15px rgba(234, 88, 12, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            🔥 Personas Registradas ({signedContracts.length})
          </button>
          <button
            onClick={() => setActiveTab('PADRON')}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 900,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'PADRON' ? 'linear-gradient(90deg, #ea580c, #f59e0b)' : '#1e293b',
              color: activeTab === 'PADRON' ? '#fff' : '#94a3b8',
              boxShadow: activeTab === 'PADRON' ? '0 4px 15px rgba(234, 88, 12, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            👥 Control Padrón Lima ({stats.totalPadron})
          </button>
        </div>

        {/* VISTA 1: REGISTROS REALIZADOS (CON LUGAR Y FECHAS) */}
        {activeTab === 'REGISTROS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
              backdropFilter: 'blur(8px)'
            }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={regSearch}
                  onChange={(e) => setRegSearch(e.target.value)}
                  placeholder="🔍 Buscar por nombre, documento, rol o código..."
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
                {regSearch && (
                  <button
                    onClick={() => setRegSearch('')}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filtro por Rol */}
              <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
                {['TODOS', 'Participante', 'Entrenador', 'Oficina', 'Manager', 'Capitán', 'Aliados', 'Staff de Caminata', 'Staff de Mesa'].map((r) => {
                  const active = regRoleFilter === r;
                  return (
                    <button
                      key={r}
                      onClick={() => setRegRoleFilter(r)}
                      style={{
                        background: active ? '#ea580c' : '#1e293b',
                        color: active ? '#fff' : '#cbd5e1',
                        border: active ? 'none' : '1px solid #334155',
                        borderRadius: '8px',
                        padding: '0.35rem 0.7rem',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0.5rem', fontSize: '0.78rem', color: '#94a3b8' }}>
              <span>Mostrando <strong>{filteredRegistros.length}</strong> de {signedContracts.length} registros</span>
              <span style={{ color: '#10b981' }}>✓ Actualización automática</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredRegistros.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
                  <p style={{ margin: 0, fontWeight: 700, color: '#fff' }}>No hay registros que coincidan con este filtro</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>Los participantes que firmen aparecerán inmediatamente aquí con su lugar y hora.</p>
                </div>
              ) : (
                filteredRegistros.map((item, idx) => {
                  const nombre = item.nombre || item.nombreCompleto || 'Sin nombre registrado';
                  const tipoDoc = item.tipoDocumento || 'DNI';
                  const numDoc = item.numeroDocumento || item.doc || '—';
                  const rol = item.rol || item.rolActividad || 'Participante';
                  const lugar = item.lugar || item.sedeLocacion || 'Lima - Casona Blanca (Calle Las Perdices 1126, Huachipa)';
                  const fecha = item.fecha || item.timestamp || item.fechaValidacionLocal || 'Fecha registrada';
                  const code = item.code || item.verificationCode || 'CQ-FIRE-VERIFIED';
                  const aceptoImagen = item.aceptoImagen ? '✓ Autorizado' : '— No seleccionado';

                  return (
                    <div
                      key={item.id || idx}
                      style={{
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        borderRadius: '14px',
                        padding: '1.25rem',
                        boxShadow: '0 10px 25px -5px rgba(6, 78, 59, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            fontSize: '0.65rem',
                            fontWeight: 900,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px'
                          }}>
                            ✓ EXONERACIÓN FIRMADA Y ACTIVA
                          </span>
                          <span style={{ background: 'rgba(249, 115, 22, 0.12)', color: '#fb923c', border: '1px solid rgba(249, 115, 22, 0.3)', fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            {rol}
                          </span>
                        </div>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700 }}>
                          {code}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#fff' }}>
                          {nombre}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          {item.email && (
                            <button
                              onClick={() => handleResendFirewalkEmail(item)}
                              disabled={sendingEmailId === (item.id || item.code)}
                              style={{
                                background: emailStatusMap[item.id || item.code] === 'SENT' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(249, 115, 22, 0.16)',
                                color: emailStatusMap[item.id || item.code] === 'SENT' ? '#34d399' : '#fb923c',
                                border: '1px solid rgba(249, 115, 22, 0.35)',
                                borderRadius: '8px',
                                padding: '0.4rem 0.75rem',
                                fontSize: '0.73rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}
                            >
                              <Mail size={13} />
                              {sendingEmailId === (item.id || item.code)
                                ? 'Enviando Pase...'
                                : emailStatusMap[item.id || item.code] === 'SENT'
                                ? '✓ Pase Enviado al Correo'
                                : `Reenviar Pase (${item.email})`}
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteFirewalkRecord(item)}
                            disabled={deletingId === item.id}
                            title="Eliminar si quedó mal registrado con datos errados para que pueda volver a registrarse"
                            style={{
                              background: 'rgba(244, 63, 94, 0.15)',
                              color: '#fb7185',
                              border: '1px solid rgba(244, 63, 94, 0.4)',
                              borderRadius: '8px',
                              padding: '0.4rem 0.75rem',
                              fontSize: '0.73rem',
                              fontWeight: 800,
                              cursor: deletingId === item.id ? 'wait' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <Trash2 size={13} />
                            {deletingId === item.id ? 'Eliminando...' : 'Eliminar Registro'}
                          </button>
                        </div>
                      </div>

                      {/* Caja Destacada: Lugar, Fechas, IP y Geolocalización */}
                      <div style={{
                        background: '#0b1120',
                        border: '1px solid #334155',
                        borderRadius: '10px',
                        padding: '0.75rem 1rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '0.5rem',
                        fontSize: '0.78rem'
                      }}>
                        <div>
                          <span style={{ color: '#94a3b8', fontWeight: 700 }}>🆔 Documento: </span>
                          <strong style={{ color: '#f8fafc' }}>{tipoDoc}: {numDoc}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8', fontWeight: 700 }}>🕒 Fecha y Hora: </span>
                          <strong style={{ color: '#34d399' }}>{fecha}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8', fontWeight: 700 }}>🌐 IP Pública: </span>
                          <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{item.ip || 'Registrada'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8', fontWeight: 700 }}>🌎 Geolocalización: </span>
                          <strong style={{ color: '#fde047' }}>{item.geoLocation || 'Lima, Perú 🇵🇪'} {item.coordinates ? `(${item.coordinates})` : ''}</strong>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <span style={{ color: '#94a3b8', fontWeight: 700 }}>📍 Lugar: </span>
                          <strong style={{ color: '#fde047' }}>{lugar}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8', fontWeight: 700 }}>📸 Uso de Imagen: </span>
                          <span style={{ color: '#cbd5e1' }}>{aceptoImagen}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* VISTA 2: PADRÓN OFICIAL LIMA (111 MIEMBROS) */}
        {activeTab === 'PADRON' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
              backdropFilter: 'blur(8px)'
            }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={padronSearch}
                  onChange={(e) => setPadronSearch(e.target.value)}
                  placeholder="🔍 Buscar en padrón por nombre, equipo o rol..."
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
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
                {[
                  { id: 'TODOS', label: `Todos (${padronLima111.length})` },
                  { id: 'Equipo 29', label: 'E29 · Phoenix (16)' },
                  { id: 'Equipo 30', label: 'E30 · Tinkuy (34)' },
                  { id: 'Equipo 31', label: 'E31 · Imperio (19)' },
                  { id: 'Equipo 32', label: 'E32 · C2 Lima (42)' }
                ].map((t) => {
                  const active = padronTeamFilter === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setPadronTeamFilter(t.id)}
                      style={{
                        background: active ? '#ea580c' : '#1e293b',
                        color: active ? '#fff' : '#cbd5e1',
                        border: active ? 'none' : '1px solid #334155',
                        borderRadius: '8px',
                        padding: '0.4rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Estado:</span>
                {[
                  { id: 'TODOS', label: 'Todos' },
                  { id: 'PENDIENTES', label: '🚨 Solo Pendientes' },
                  { id: 'FIRMADOS', label: '✓ Acreditados' }
                ].map((s) => {
                  const active = padronStatusFilter === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setPadronStatusFilter(s.id)}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {filteredPadron.map((item) => {
                if (item.isSigned) {
                  const sig = item.signature;
                  const docInfo = sig.tipoDocumento && sig.numeroDocumento
                    ? `${sig.tipoDocumento}: ${sig.numeroDocumento}`
                    : (sig.doc || 'Registrado');
                  const time = sig.fecha || sig.timestamp || 'Fecha verificada';
                  const lugar = sig.lugar || 'Lima - Casona Blanca (Huachipa)';
                  const code = sig.code || sig.verificationCode || 'CQ-FIRE-VERIFIED';

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
                        gap: '0.75rem'
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
                            {sig.rol || item.rol}
                          </span>
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#fff' }}>{item.nombre}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginTop: '0.35rem', fontSize: '0.75rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                          <span>🆔 <strong style={{ color: '#e2e8f0' }}>{docInfo}</strong></span>
                          <span>📍 <strong style={{ color: '#fde047' }}>{lugar}</strong></span>
                          <span>🕒 <strong style={{ color: '#cbd5e1' }}>{time}</strong></span>
                          <span style={{ color: '#fbbf24', fontFamily: 'monospace', fontSize: '0.72rem' }}>{code}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                        <button
                          onClick={() => handleDeleteFirewalkRecord(sig)}
                          disabled={deletingId === sig.id}
                          title="Eliminar si quedó mal registrado con datos errados"
                          style={{
                            background: 'rgba(244, 63, 94, 0.15)',
                            color: '#fb7185',
                            border: '1px solid rgba(244, 63, 94, 0.4)',
                            borderRadius: '8px',
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: deletingId === sig.id ? 'wait' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <Trash2 size={14} /> {deletingId === sig.id ? 'Eliminando...' : 'Eliminar'}
                        </button>
                      </div>
                    </div>
                  );
                } else {
                  // Pendiente
                  const waMessage = encodeURIComponent(
                    `Hola ${item.nombre}, te escribe el equipo de CREAR PSL Lima. Por favor completa y firma tu exoneración legal obligatoria para la Caminata sobre Fuego en Casona Blanca antes de ingresar aquí: ${contractUrl}`
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
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        )}

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
                Escanear para Firmar Contrato
              </h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                Pide al participante o staff escanear este código con su celular para abrir la exoneración oficial.
              </p>

              <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px', display: 'inline-block', margin: '0 auto 1rem auto' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(contractUrl)}`}
                  alt="QR Code"
                  style={{ width: '190px', height: '190px', display: 'block' }}
                />
              </div>

              <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#94a3b8', wordBreak: 'break-all', marginBottom: '1rem' }}>
                {contractUrl}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => copyUrl(contractUrl)}
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
