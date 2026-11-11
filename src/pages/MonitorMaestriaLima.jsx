import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crown,
  ShieldCheck,
  Search,
  CheckCircle2,
  QrCode,
  ExternalLink,
  Copy,
  PhoneCall,
  MapPin,
  FileText,
  Download,
  Mail,
  Eye,
  Globe,
  Cpu,
  X,
  Check,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import padronLima111 from '../data/padron_fuego_lima_111.json';
import { generateMaestriaPassCanvas, sendMaestriaConfirmationEmail } from '../utils/maestriaPass';

export default function MonitorMaestriaLima() {
  const navigate = useNavigate();
  const [signedContracts, setSignedContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('REGISTROS'); // 'REGISTROS' | 'PADRON'

  // Filtros Registros
  const [regSearch, setRegSearch] = useState('');
  const [regRoleFilter, setRegRoleFilter] = useState('TODOS');
  const [regTeamFilter, setRegTeamFilter] = useState('TODOS');

  // Filtros Padrón
  const [padronSearch, setPadronSearch] = useState('');
  const [padronTeamFilter, setPadronTeamFilter] = useState('TODOS');
  const [padronStatusFilter, setPadronStatusFilter] = useState('TODOS');

  // Modales y Estados de Acción
  const [qrModalType, setQrModalType] = useState(null); // 'contract' | null
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedRecordForPass, setSelectedRecordForPass] = useState(null);
  const [passPreviewUrl, setPassPreviewUrl] = useState(null);
  const [generatingPass, setGeneratingPass] = useState(false);
  const [selectedRecordForAudit, setSelectedRecordForAudit] = useState(null);
  const [sendingEmailId, setSendingEmailId] = useState(null);
  const [emailStatusMap, setEmailStatusMap] = useState({});
  const [deletingId, setDeletingId] = useState(null);

  const normalizeStr = (str) => {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  };

  useEffect(() => {
    document.title = 'Panel de Supervisión Lima · Reglas de Maestría del Juego | Causa OS';
  }, []);

  // Escuchar firmas en tiempo real desde Firestore
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    try {
      const colRef = collection(db, 'contratos_maestria_lima');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const list = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() });
          });

          list.sort((a, b) => {
            const tA = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : (a.fechaValidacionIso ? new Date(a.fechaValidacionIso).getTime() : 0);
            const tB = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : (b.fechaValidacionIso ? new Date(b.fechaValidacionIso).getTime() : 0);
            return tB - tA;
          });

          setSignedContracts(list);
          setLoading(false);
        },
        (error) => {
          console.warn('⚠️ Error en listener Firestore contratos_maestria_lima:', error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Firestore subscription error:', err);
      setLoading(false);
    }
  }, []);

  // Cruce con el padrón oficial de 111 integrantes de Lima
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

  // Indicadores Ejecutivos para Oficina Lima
  const stats = useMemo(() => {
    const totalPadron = enrichedPadron.length;
    const firmadosPadron = enrichedPadron.filter((p) => p.isSigned).length;
    const pendientesPadron = totalPadron - firmadosPadron;
    const porcentaje = totalPadron > 0 ? Math.round((firmadosPadron / totalPadron) * 100) : 0;
    const totalRegistradosFirestore = signedContracts.length;
    const totalParticipantes = signedContracts.filter((c) => (c.rol || c.rolActividad || '').toLowerCase().includes('participante')).length;
    const totalManagers = signedContracts.filter((c) => (c.rol || c.rolActividad || '').toLowerCase().includes('manager')).length;
    const conGeoIp = signedContracts.filter((c) => Boolean(c.ip && c.geoLocation)).length;

    return {
      totalPadron,
      firmadosPadron,
      pendientesPadron,
      porcentaje,
      totalRegistradosFirestore,
      totalParticipantes,
      totalManagers,
      conGeoIp
    };
  }, [enrichedPadron, signedContracts]);

  // Filtrado Tab 1 (Registros y Auditoría Forense)
  const filteredRegistros = useMemo(() => {
    return signedContracts.filter((item) => {
      if (regRoleFilter !== 'TODOS') {
        const itemRole = item.rol || item.rolActividad || '';
        if (itemRole !== regRoleFilter) return false;
      }
      if (regTeamFilter !== 'TODOS') {
        const itemTeam = item.equipo || item.cohorte || '';
        if (!itemTeam.includes(regTeamFilter)) return false;
      }
      if (regSearch) {
        const term = normalizeStr(regSearch);
        const name = normalizeStr(item.nombre || item.nombreCompleto || '');
        const doc = normalizeStr(item.numeroDocumento || item.doc || '');
        const email = normalizeStr(item.email || '');
        const code = normalizeStr(item.code || item.verificationCode || '');
        const ip = normalizeStr(item.ip || '');
        const geo = normalizeStr(item.geoLocation || '');
        return (
          name.includes(term) ||
          doc.includes(term) ||
          email.includes(term) ||
          code.includes(term) ||
          ip.includes(term) ||
          geo.includes(term)
        );
      }
      return true;
    });
  }, [signedContracts, regRoleFilter, regTeamFilter, regSearch]);

  // Filtrado Tab 2 (Padrón Oficial Lima)
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
  const contractUrl = `${originUrl}/reglas-maestria`;
  const monitorUrl = `${originUrl}/monitor-maestria-lima`;

  const copyUrl = (url) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      });
    }
  };

  // Visualizar Pase Digital de un firmante
  const handleViewPass = async (item) => {
    setSelectedRecordForPass(item);
    setGeneratingPass(true);
    setPassPreviewUrl(null);
    try {
      const code = item.code || item.verificationCode || 'CQ-MJ-VERIFIED';
      const dataUrl = await generateMaestriaPassCanvas({
        nombre: item.nombre || item.nombreCompleto || 'Participante',
        doc: item.doc || `${item.tipoDocumento || 'DNI'}: ${item.numeroDocumento || ''}`,
        rol: item.rol || item.rolActividad || 'Participante',
        equipo: item.equipo || item.cohorte || 'Equipo 32',
        sede: item.sede || 'Lima',
        fecha: item.fecha || item.fechaValidacionLocal || 'Registrado',
        codigo: code,
        ip: item.ip || 'Registrada',
        geoLocation: item.geoLocation || 'Lima, Perú 🇵🇪',
        coordinates: item.coordinates || '',
        verificationUrl: `${originUrl}/reglas-maestria?c=${code}`
      });
      setPassPreviewUrl(dataUrl);
    } catch (e) {
      console.error('Error generando vista previa del pase:', e);
    } finally {
      setGeneratingPass(false);
    }
  };

  // Reenviar Contrato + Pase por Correo
  const handleResendEmail = async (item) => {
    if (!item.email) {
      alert('Este registro no cuenta con un correo electrónico válido.');
      return;
    }
    const rowKey = item.id || item.code;
    setSendingEmailId(rowKey);
    try {
      const code = item.code || item.verificationCode || 'CQ-MJ-VERIFIED';
      const passDataUrl = await generateMaestriaPassCanvas({
        nombre: item.nombre || item.nombreCompleto || 'Participante',
        doc: item.doc || `${item.tipoDocumento || 'DNI'}: ${item.numeroDocumento || ''}`,
        rol: item.rol || item.rolActividad || 'Participante',
        equipo: item.equipo || item.cohorte || 'Equipo 32',
        sede: item.sede || 'Lima',
        fecha: item.fecha || item.fechaValidacionLocal || 'Registrado',
        codigo: code,
        ip: item.ip || 'Registrada',
        geoLocation: item.geoLocation || 'Lima, Perú 🇵🇪',
        coordinates: item.coordinates || '',
        verificationUrl: `${originUrl}/reglas-maestria?c=${code}`
      });

      const ok = await sendMaestriaConfirmationEmail({
        db,
        toEmail: item.email,
        nombre: item.nombre || item.nombreCompleto,
        doc: item.doc || `${item.tipoDocumento || 'DNI'}: ${item.numeroDocumento || ''}`,
        rol: item.rol || item.rolActividad || 'Participante',
        equipo: item.equipo || item.cohorte || 'Equipo 32',
        codigo: code,
        fecha: item.fecha || item.fechaValidacionLocal || 'Registrado',
        passDataUrl,
        telefono: item.telefono || '',
        ip: item.ip || 'Registrada',
        geoLocation: item.geoLocation || 'Lima, Perú 🇵🇪',
        coordinates: item.coordinates || '',
        device: item.dispositivo || '',
        sha256Hash: item.sha256Hash || ''
      });

      if (ok) {
        setEmailStatusMap((prev) => ({ ...prev, [rowKey]: 'SENT' }));
      } else {
        setEmailStatusMap((prev) => ({ ...prev, [rowKey]: 'ERROR' }));
      }
    } catch (e) {
      console.error('Error al reenviar correo:', e);
      setEmailStatusMap((prev) => ({ ...prev, [rowKey]: 'ERROR' }));
    } finally {
      setSendingEmailId(null);
    }
  };

  // Eliminar un registro con datos errados para permitir que el usuario vuelva a registrarse
  const handleDeleteRecord = async (item) => {
    if (!item?.id) {
      alert('Este registro no tiene un ID válido de Firestore para eliminar.');
      return;
    }
    const nombre = item.nombre || item.nombreCompleto || 'Participante';
    const docNum = item.numeroDocumento || item.doc || '';
    const confirmed = window.confirm(
      `¿Confirmas ELIMINAR el registro de "${nombre}" (${docNum})?\n\nUsa esta opción únicamente si la persona quedó mal registrada o ingresó datos errados. Al eliminarlo, podrá volver a llenar y firmar su acuerdo desde cero.`
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    try {
      await deleteDoc(doc(db, 'contratos_maestria_lima', item.id));
    } catch (err) {
      console.error('Error al eliminar registro en contratos_maestria_lima:', err);
      alert('No se pudo eliminar el registro. Verifica tus permisos en Causa OS.');
    } finally {
      setDeletingId(null);
    }
  };

  // Exportar CSV con Auditoría de IP y Geolocalización
  const handleExportCsv = () => {
    const headers = [
      'Codigo_Digital',
      'Nombre_Completo',
      'Documento',
      'Email',
      'Telefono',
      'Rol',
      'Equipo_Cohorte',
      'Casilla1_NDA_Reglas',
      'Casilla2_Salud_Exoneracion',
      'Casilla3_Datos_Imagen',
      'IP_Publica',
      'Geolocalizacion',
      'Coordenadas_GPS',
      'Dispositivo',
      'Hash_SHA256',
      'Fecha_Hora_Lima'
    ];

    const rows = signedContracts.map((c) => [
      c.code || c.verificationCode || '',
      `"${(c.nombre || c.nombreCompleto || '').replace(/"/g, '""')}"`,
      `"${(c.doc || `${c.tipoDocumento || ''} ${c.numeroDocumento || ''}`).replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${(c.telefono || '').replace(/"/g, '""')}"`,
      `"${(c.rol || c.rolActividad || '').replace(/"/g, '""')}"`,
      `"${(c.equipo || c.cohorte || c.equipoCohorte || '').replace(/"/g, '""')}"`,
      (c.casilla1_TerminosNDA || c.aceptoTerminosNda) ? 'ACEPTADO' : 'NO',
      (c.casilla2_SaludExoneracion || c.aceptoSaludExoneracion) ? 'ACEPTADO' : 'NO',
      (c.casilla3_DatosImagen || c.aceptoDatosImagen) ? 'ACEPTADO' : 'NO',
      `"${(c.ip || 'No detectada').replace(/"/g, '""')}"`,
      `"${(c.geoLocation || 'Lima, Peru').replace(/"/g, '""')}"`,
      `"${(c.coordinates || '').replace(/"/g, '""')}"`,
      `"${(c.dispositivo || '').replace(/"/g, '""')}"`,
      `"${(c.sha256Hash || '').replace(/"/g, '""')}"`,
      `"${(c.fecha || c.fechaValidacionLocal || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AUDITORIA_REGLAS_MAESTRIA_LIMA_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="monitor-maestria-root" style={{ minHeight: '100vh', background: '#050811', color: '#f8fafc', padding: '1.25rem 0.85rem' }}>
      <style>{`
        .monitor-maestria-root {
          color: #f8fafc !important;
        }
        .monitor-maestria-root h1,
        .monitor-maestria-root h2,
        .monitor-maestria-root h3,
        .monitor-maestria-root h4 {
          color: #ffffff !important;
        }
        .monitor-maestria-root p {
          color: #cbd5e1;
        }
        .monitor-maestria-root input,
        .monitor-maestria-root select {
          background-color: #050811 !important;
          color: #ffffff !important;
          border-color: #334155 !important;
        }
      `}</style>
      <div style={{ maxWidth: '1140px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Encabezado Ejecutivo — Oficina de Lima (Uso Exclusivo Interno Causa OS) */}
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #091124 0%, #111c38 100%)',
          border: '1px solid rgba(245, 158, 11, 0.38)',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: '0 20px 40px -15px rgba(245, 158, 11, 0.14)'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #f59e0b, #fbbf24, #38bdf8)'
          }} />

          {/* Barra Superior de Identidad */}
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
                border: '1px solid rgba(245, 158, 11, 0.45)'
              }}>
                <img src="/logo-crear.png" alt="CREAR Poder Sin Límites" style={{ height: '32px', width: 'auto', objectFit: 'contain', display: 'block' }} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.12em', color: '#fbbf24', textTransform: 'uppercase', display: 'block' }}>
                  CREACIÓN CUÁNTICA E.I.R.L. · RUC 20612592811
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#e2e8f0', display: 'block' }}>
                  Causa OS · Panel Interno Exclusivo (Oficina Lima, Gerencia, Coordinadores y Contabilidad Local)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
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
              <button
                onClick={handleExportCsv}
                style={{
                  background: 'rgba(56, 189, 248, 0.14)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
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
                <Download size={14} /> Exportar CSV Forense (IP/Geo)
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{
                  background: 'linear-gradient(90deg, #d97706, #f59e0b)',
                  color: '#050811',
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px'
                }}>
                  👑 SUPERVISIÓN LIMA · MAESTRÍA DEL JUEGO
                </span>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  AUDITORÍA IP + GEOLOCALIZACIÓN ACTIVA
                </span>
              </div>
              <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#fff' }}>
                Control de Aceptación de Reglas y Contratos de Maestría
              </h1>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.84rem', color: '#94a3b8', fontWeight: 500 }}>
                Verificación en vivo de las 3 casillas obligatorias (NDA, Salud/Exoneración, Datos/Imagen), IP pública, geolocalización y envío automático de contrato por correo.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setQrModalType('contract')}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#050811',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.65rem 1rem',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                }}
              >
                <QrCode size={16} /> QR Reglas Maestría
              </button>
              <a
                href="/reglas-maestria"
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
                Abrir Landing Contrato <ExternalLink size={14} />
              </a>
            </div>
          </div>

          {/* Tarjetas KPI */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
            gap: '0.75rem',
            marginTop: '1.25rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ background: 'rgba(6, 78, 59, 0.32)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>✓ Contratos Firmados</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34d399', marginTop: '0.15rem' }}>{stats.totalRegistradosFirestore}</div>
            </div>
            <div style={{ background: '#0b1325', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Participantes / Managers</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', marginTop: '0.2rem' }}>
                {stats.totalParticipantes} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Part.</span> · {stats.totalManagers} <span style={{ fontSize: '0.8rem', color: '#fbbf24' }}>Mgr.</span>
              </div>
            </div>
            <div style={{ background: '#0b1325', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Padrón Oficial Lima</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginTop: '0.15rem' }}>{stats.totalPadron}</div>
            </div>
            <div style={{ background: 'rgba(136, 19, 55, 0.28)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(244, 63, 94, 0.4)' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#fb7185', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚠️ Pendientes Padrón</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fb7185', marginTop: '0.15rem' }}>{stats.pendientesPadron}</div>
            </div>
            <div style={{ background: 'rgba(120, 53, 15, 0.3)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🌐 Trazabilidad IP + Geo</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fbbf24', marginTop: '0.15rem' }}>100%</div>
            </div>
          </div>
        </div>

        {/* SELECTOR DE PESTAÑAS */}
        <div style={{ display: 'flex', gap: '0.5rem', background: '#091124', padding: '0.4rem', borderRadius: '14px', border: '1px solid #1e293b' }}>
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
              background: activeTab === 'REGISTROS' ? 'linear-gradient(90deg, #d97706, #f59e0b)' : '#111c38',
              color: activeTab === 'REGISTROS' ? '#050811' : '#94a3b8',
              transition: 'all 0.15s ease'
            }}
          >
            🛡️ Auditoría de Contratos Firmados, IP y Geolocalización ({signedContracts.length})
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
              background: activeTab === 'PADRON' ? 'linear-gradient(90deg, #d97706, #f59e0b)' : '#111c38',
              color: activeTab === 'PADRON' ? '#050811' : '#94a3b8',
              transition: 'all 0.15s ease'
            }}
          >
            👥 Cruce con Padrón Oficial Lima ({stats.firmadosPadron}/{stats.totalPadron})
          </button>
        </div>

        {/* TAB 1: AUDITORÍA DE CONTRATOS FIRMADOS */}
        {activeTab === 'REGISTROS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              background: 'rgba(9, 17, 36, 0.95)',
              border: '1px solid #1e293b',
              borderRadius: '14px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={regSearch}
                  onChange={(e) => setRegSearch(e.target.value)}
                  placeholder="🔍 Buscar por nombre, DNI/CE, correo, código, dirección IP o ciudad..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.6rem',
                    background: '#050811',
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

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto' }}>
                  {['TODOS', 'Participante', 'Manager', 'Capitán', 'Oficina / Staff', 'Entrenador'].map((r) => {
                    const active = regRoleFilter === r;
                    return (
                      <button
                        key={r}
                        onClick={() => setRegRoleFilter(r)}
                        style={{
                          background: active ? '#f59e0b' : '#111c38',
                          color: active ? '#050811' : '#cbd5e1',
                          border: active ? 'none' : '1px solid #334155',
                          borderRadius: '8px',
                          padding: '0.35rem 0.7rem',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          cursor: 'pointer'
                        }}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto' }}>
                  {['TODOS', 'Equipo 29', 'Equipo 30', 'Equipo 31', 'Equipo 32'].map((t) => {
                    const active = regTeamFilter === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setRegTeamFilter(t)}
                        style={{
                          background: active ? '#38bdf8' : '#111c38',
                          color: active ? '#050811' : '#cbd5e1',
                          border: active ? 'none' : '1px solid #334155',
                          borderRadius: '8px',
                          padding: '0.35rem 0.7rem',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          cursor: 'pointer'
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0.5rem', fontSize: '0.78rem', color: '#94a3b8' }}>
              <span>Mostrando <strong>{filteredRegistros.length}</strong> de {signedContracts.length} aceptaciones legales</span>
              <span style={{ color: '#10b981' }}>✓ Sincronizado en tiempo real con Firestore</span>
            </div>

            {filteredRegistros.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: '#091124', borderRadius: '14px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>👑</div>
                <p style={{ margin: 0, fontWeight: 800, color: '#fff' }}>No se encontraron registros con el filtro actual</p>
                <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Cada vez que un Participante o Manager firme el contrato en <code>/reglas-maestria</code>, aparecerá aquí con su IP, geolocalización y pase.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {filteredRegistros.map((item, idx) => {
                  const rowKey = item.id || item.code || idx;
                  const nombre = item.nombre || item.nombreCompleto || 'Sin nombre';
                  const docInfo = item.doc || `${item.tipoDocumento || 'DNI'}: ${item.numeroDocumento || '—'}`;
                  const rol = item.rol || item.rolActividad || 'Participante';
                  const equipo = item.equipo || item.cohorte || 'Equipo 32';
                  const fecha = item.fecha || item.fechaValidacionLocal || 'Registrado';
                  const code = item.code || item.verificationCode || 'CQ-MJ-VERIFIED';
                  const ip = item.ip || 'No detectada';
                  const geo = item.geoLocation || 'Lima, Perú 🇵🇪';
                  const coords = item.coordinates || '';
                  const device = item.dispositivo || 'Web';
                  const emailStatus = emailStatusMap[rowKey];

                  return (
                    <div
                      key={rowKey}
                      style={{
                        background: 'linear-gradient(135deg, #091124 0%, #111c38 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.38)',
                        borderRadius: '14px',
                        padding: '1.2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.85rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.6rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <span style={{
                            background: 'rgba(16, 185, 129, 0.18)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '5px'
                          }}>
                            ✓ 3 CASILLAS CLICKWRAP ACEPTADAS
                          </span>
                          <span style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '5px'
                          }}>
                            {rol}
                          </span>
                          <span style={{
                            background: 'rgba(56, 189, 248, 0.14)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '5px'
                          }}>
                            {equipo}
                          </span>
                        </div>

                        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#fbbf24', fontWeight: 800 }}>
                          {code}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#fff' }}>{nombre}</h3>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.9rem', marginTop: '0.35rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                            <span>🆔 <strong>{docInfo}</strong></span>
                            {item.email && <span>✉️ <strong>{item.email}</strong></span>}
                            {item.telefono && <span>📱 <strong>{item.telefono}</strong></span>}
                            <span>🕒 <strong style={{ color: '#34d399' }}>{fecha}</strong></span>
                          </div>
                        </div>

                        {/* Botones de Acción para Supervisión Lima */}
                        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleViewPass(item)}
                            style={{
                              background: 'rgba(245, 158, 11, 0.16)',
                              color: '#fbbf24',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              borderRadius: '8px',
                              padding: '0.45rem 0.75rem',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <Eye size={14} /> Ver Pase Oficial
                          </button>

                          <button
                            onClick={() => handleResendEmail(item)}
                            disabled={sendingEmailId === rowKey}
                            style={{
                              background: emailStatus === 'SENT' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.16)',
                              color: emailStatus === 'SENT' ? '#34d399' : '#38bdf8',
                              border: emailStatus === 'SENT' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(56, 189, 248, 0.38)',
                              borderRadius: '8px',
                              padding: '0.45rem 0.75rem',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              cursor: sendingEmailId === rowKey ? 'wait' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <Mail size={14} />
                            {sendingEmailId === rowKey
                              ? 'Enviando...'
                              : emailStatus === 'SENT'
                              ? '✓ Contrato y Pase Enviados'
                              : 'Reenviar Contrato + Pase'}
                          </button>

                          <button
                            onClick={() => setSelectedRecordForAudit(item)}
                            style={{
                              background: '#1e293b',
                              color: '#e2e8f0',
                              border: '1px solid #334155',
                              borderRadius: '8px',
                              padding: '0.45rem 0.75rem',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <FileText size={14} /> Expediente Forense
                          </button>

                          <button
                            onClick={() => handleDeleteRecord(item)}
                            disabled={deletingId === item.id}
                            title="Eliminar si quedó mal registrado con datos errados para que pueda volver a registrarse"
                            style={{
                              background: 'rgba(244, 63, 94, 0.15)',
                              color: '#fb7185',
                              border: '1px solid rgba(244, 63, 94, 0.4)',
                              borderRadius: '8px',
                              padding: '0.45rem 0.75rem',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              cursor: deletingId === item.id ? 'wait' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <Trash2 size={14} />
                            {deletingId === item.id ? 'Eliminando...' : 'Eliminar Registro'}
                          </button>
                        </div>
                      </div>

                      {/* Bloque Forense Obligatorio: IP + Geolocalización + Casillas */}
                      <div style={{
                        background: '#050811',
                        border: '1px solid #1e293b',
                        borderRadius: '10px',
                        padding: '0.75rem 1rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                        gap: '0.6rem',
                        fontSize: '0.76rem'
                      }}>
                        <div>
                          <span style={{ color: '#64748b', fontWeight: 700 }}>🌐 IP Pública Registrada: </span>
                          <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{ip}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontWeight: 700 }}>📍 Geolocalización: </span>
                          <strong style={{ color: '#fde047' }}>{geo} {coords ? `(${coords})` : ''}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontWeight: 700 }}>💻 Dispositivo: </span>
                          <span style={{ color: '#cbd5e1' }}>{device}</span>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontWeight: 700 }}>🛡️ Consentimiento: </span>
                          <span style={{ color: '#34d399', fontWeight: 700 }}>DOC 1 (NDA) · DOC 2 (Salud) · DOC 3 (Imagen)</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PADRÓN OFICIAL LIMA (111 MIEMBROS) */}
        {activeTab === 'PADRON' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              background: 'rgba(9, 17, 36, 0.95)',
              border: '1px solid #1e293b',
              borderRadius: '14px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={padronSearch}
                  onChange={(e) => setPadronSearch(e.target.value)}
                  placeholder="🔍 Buscar en el padrón oficial de Lima por nombre, equipo o rol..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.6rem',
                    background: '#050811',
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

              <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto' }}>
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
                        background: active ? '#f59e0b' : '#111c38',
                        color: active ? '#050811' : '#cbd5e1',
                        border: active ? 'none' : '1px solid #334155',
                        borderRadius: '8px',
                        padding: '0.4rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 800,
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
                  { id: 'PENDIENTES', label: '🚨 Pendientes de Firma' },
                  { id: 'FIRMADOS', label: '✓ Reglas Aceptadas' }
                ].map((s) => {
                  const active = padronStatusFilter === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setPadronStatusFilter(s.id)}
                      style={{
                        background: active ? (s.id === 'PENDIENTES' ? '#881337' : s.id === 'FIRMADOS' ? '#064e3b' : '#334155') : '#111c38',
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
                  return (
                    <div
                      key={item.id}
                      style={{
                        background: 'rgba(9, 17, 36, 0.92)',
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
                            ✓ REGLAS Y CONTRATO FIRMADOS
                          </span>
                          <span style={{ background: '#111c38', color: '#cbd5e1', border: '1px solid #334155', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            {item.equipo} · {item.cohorte}
                          </span>
                          <span style={{ background: 'rgba(245, 158, 11, 0.14)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            {sig.rol || item.rol}
                          </span>
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#fff' }}>{item.nombre}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginTop: '0.35rem', fontSize: '0.75rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                          <span>🆔 <strong style={{ color: '#e2e8f0' }}>{sig.doc || sig.numeroDocumento}</strong></span>
                          <span>🌐 IP: <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{sig.ip || 'Registrada'}</strong></span>
                          <span>📍 <strong style={{ color: '#fde047' }}>{sig.geoLocation || 'Lima, Perú'}</strong></span>
                          <span style={{ color: '#fbbf24', fontFamily: 'monospace' }}>{sig.code || sig.verificationCode}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleViewPass(sig)}
                          style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '8px',
                            padding: '0.45rem 0.75rem',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <CheckCircle2 size={14} /> Ver Pase
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(sig)}
                          disabled={deletingId === sig.id}
                          title="Eliminar si quedó mal registrado con datos errados"
                          style={{
                            background: 'rgba(244, 63, 94, 0.15)',
                            color: '#fb7185',
                            border: '1px solid rgba(244, 63, 94, 0.4)',
                            borderRadius: '8px',
                            padding: '0.45rem 0.75rem',
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
                  const waMessage = encodeURIComponent(
                    `Hola ${item.nombre}, te saluda la Oficina de CREAR PSL Lima. Para tu acreditación en Maestría del Juego es obligatorio firmar digitalmente el Contrato Unificado y Reglas de Sala aquí: ${contractUrl}`
                  );

                  return (
                    <div
                      key={item.id}
                      style={{
                        background: 'rgba(9, 17, 36, 0.85)',
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
                            🚨 PENDIENTE DE ACEPTACIÓN
                          </span>
                          <span style={{ background: '#111c38', color: '#cbd5e1', border: '1px solid #334155', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            {item.equipo} · {item.cohorte}
                          </span>
                          <span style={{ background: '#111c38', color: '#94a3b8', border: '1px solid #334155', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            {item.rol}
                          </span>
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f1f5f9' }}>{item.nombre}</h3>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                          Requiere aceptación de las 3 casillas legales (NDA, Salud y Datos) antes de ingresar a sala.
                        </p>
                      </div>

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
                          gap: '0.35rem'
                        }}
                      >
                        <PhoneCall size={14} /> Enviar Link por WhatsApp
                      </a>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        )}

        {/* MODAL: VISTA PREVIA DEL PASE DIGITAL */}
        {selectedRecordForPass && (
          <div
            onClick={() => setSelectedRecordForPass(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.86)',
              backdropFilter: 'blur(6px)',
              zIndex: 110,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#091124',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                borderRadius: '16px',
                padding: '1.5rem',
                maxWidth: '440px',
                width: '100%',
                textAlign: 'center',
                position: 'relative',
                maxHeight: '92vh',
                overflowY: 'auto'
              }}
            >
              <button
                onClick={() => setSelectedRecordForPass(null)}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
              <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}>
                Pase Oficial de Validación · Maestría Lima
              </h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                {selectedRecordForPass.nombre || selectedRecordForPass.nombreCompleto} · {selectedRecordForPass.code || selectedRecordForPass.verificationCode}
              </p>

              {generatingPass ? (
                <div style={{ padding: '3rem 1rem', color: '#fbbf24', fontWeight: 700 }}>Generando imagen criptográfica...</div>
              ) : passPreviewUrl ? (
                <>
                  <img
                    src={passPreviewUrl}
                    alt="Pase Oficial Maestría"
                    style={{ width: '100%', height: 'auto', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.4)', marginBottom: '1rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <a
                      href={passPreviewUrl}
                      download={`PASE_MAESTRIA_${selectedRecordForPass.code || 'LIMA'}.png`}
                      style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: '#050811',
                        textDecoration: 'none',
                        padding: '0.65rem',
                        borderRadius: '8px',
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <Download size={15} /> Descargar Imagen PNG
                    </a>
                    <button
                      onClick={() => setSelectedRecordForPass(null)}
                      style={{
                        background: '#1e293b',
                        color: '#cbd5e1',
                        border: '1px solid #334155',
                        padding: '0.65rem 1rem',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ padding: '2rem', color: '#fb7185' }}>No se pudo generar la vista previa.</div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: EXPEDIENTE FORENSE DETALLADO */}
        {selectedRecordForAudit && (
          <div
            onClick={() => setSelectedRecordForAudit(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.86)',
              backdropFilter: 'blur(6px)',
              zIndex: 110,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#091124',
                border: '1px solid rgba(56, 189, 248, 0.45)',
                borderRadius: '16px',
                padding: '1.5rem',
                maxWidth: '640px',
                width: '100%',
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              <button
                onClick={() => setSelectedRecordForAudit(null)}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem', fontWeight: 900, color: '#fff' }}>
                🛡️ Expediente Probatorio Forense · Ley N° 27269
              </h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.78rem', color: '#38bdf8', fontWeight: 700 }}>
                Creación Cuántica E.I.R.L. (RUC 20612592811) · Auditoría Legal Oficina Lima
              </p>

              <div style={{ background: '#050811', border: '1px solid #1e293b', borderRadius: '12px', padding: '1rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                <div><strong style={{ color: '#94a3b8' }}>Titular Declarante:</strong> <span style={{ color: '#fff', fontWeight: 800 }}>{selectedRecordForAudit.nombre || selectedRecordForAudit.nombreCompleto}</span></div>
                <div><strong style={{ color: '#94a3b8' }}>Documento:</strong> <span style={{ color: '#fff' }}>{selectedRecordForAudit.doc || `${selectedRecordForAudit.tipoDocumento}: ${selectedRecordForAudit.numeroDocumento}`}</span></div>
                <div><strong style={{ color: '#94a3b8' }}>Correo Electrónico:</strong> <span style={{ color: '#38bdf8' }}>{selectedRecordForAudit.email}</span></div>
                <div><strong style={{ color: '#94a3b8' }}>Teléfono / WhatsApp:</strong> <span style={{ color: '#fff' }}>{selectedRecordForAudit.telefono}</span></div>
                <div><strong style={{ color: '#94a3b8' }}>Rol y Cohorte:</strong> <span style={{ color: '#fbbf24', fontWeight: 700 }}>{selectedRecordForAudit.rol || selectedRecordForAudit.rolActividad} · {selectedRecordForAudit.equipo || selectedRecordForAudit.cohorte}</span></div>
                <div><strong style={{ color: '#94a3b8' }}>Firma Electrónica Manuscrita/Texto:</strong> <span style={{ color: '#34d399', fontStyle: 'italic' }}>"{selectedRecordForAudit.firmaTexto}"</span></div>
                <hr style={{ border: 'none', borderTop: '1px solid #1e293b', margin: '0.25rem 0' }} />
                <div><strong style={{ color: '#94a3b8' }}>Dirección IP Pública:</strong> <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 800 }}>{selectedRecordForAudit.ip || 'Registrada'}</span></div>
                <div><strong style={{ color: '#94a3b8' }}>Geolocalización Detectada:</strong> <span style={{ color: '#fde047', fontWeight: 700 }}>{selectedRecordForAudit.geoLocation || 'Lima, Perú 🇵🇪'}</span></div>
                <div><strong style={{ color: '#94a3b8' }}>Coordenadas (Lat/Lng):</strong> <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{selectedRecordForAudit.coordinates || 'No reportadas'}</span></div>
                <div><strong style={{ color: '#94a3b8' }}>Proveedor ISP / Fuente Geo:</strong> <span style={{ color: '#cbd5e1' }}>{selectedRecordForAudit.isp || 'Red Pública'} ({selectedRecordForAudit.geoSource || 'ip-geo'})</span></div>
                <div><strong style={{ color: '#94a3b8' }}>Dispositivo y Navegador (User-Agent):</strong> <span style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block', marginTop: '0.2rem' }}>{selectedRecordForAudit.userAgent}</span></div>
                <div><strong style={{ color: '#94a3b8' }}>Huella Criptográfica SHA-256:</strong> <span style={{ color: '#fbbf24', fontFamily: 'monospace', fontSize: '0.72rem', wordBreak: 'break-all', display: 'block', marginTop: '0.2rem' }}>{selectedRecordForAudit.sha256Hash || 'Verificada'}</span></div>
                <div><strong style={{ color: '#94a3b8' }}>Timestamp Oficial:</strong> <span style={{ color: '#34d399' }}>{selectedRecordForAudit.fecha || selectedRecordForAudit.fechaValidacionLocal} ({selectedRecordForAudit.fechaValidacionIso})</span></div>
              </div>

              <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                <button
                  onClick={() => setSelectedRecordForAudit(null)}
                  style={{
                    background: '#38bdf8',
                    color: '#050811',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.6rem 1.2rem',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Cerrar Expediente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: QR DEL CONTRATO */}
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
                background: '#091124',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                borderRadius: '16px',
                padding: '1.75rem',
                maxWidth: '370px',
                width: '100%',
                textAlign: 'center',
                position: 'relative'
              }}
            >
              <button
                onClick={() => setQrModalType(null)}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 900, color: '#fff' }}>
                QR Oficial · Reglas de Maestría Lima
              </h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                Escanea este código QR para abrir el Contrato Unificado y Reglas de Sala de Maestría del Juego.
              </p>

              <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px', display: 'inline-block', margin: '0 auto 1rem auto' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(contractUrl)}`}
                  alt="QR Reglas Maestría"
                  style={{ width: '200px', height: '200px', display: 'block' }}
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
                    background: '#f59e0b',
                    color: '#050811',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    fontSize: '0.78rem',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  {copiedLink ? '✓ ¡Enlace Copiado!' : '📋 Copiar Enlace'}
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
