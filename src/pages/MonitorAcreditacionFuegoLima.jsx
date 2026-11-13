import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  QrCode,
  ExternalLink,
  PhoneCall,
  Download,
  Mail,
  Trash2,
  ArrowLeft,
  Users,
  ClipboardCheck,
  BarChart3,
  Copy,
  RefreshCw,
  UserPlus,
  Printer,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Share2
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  setDoc,
  writeBatch,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import padronLima111 from '../data/padron_fuego_lima_111.json';
import capitanesData from '../data/capitanesSedesEquipos.json';
import { generateFirewalkPassCanvas, sendFirewalkConfirmationEmail } from '../utils/maestriaPass';
import { downloadFirewalkContractPdf } from '../utils/contractPdfGenerator';
import {
  deduplicateSignedContracts,
  normalizeLimaDocNumber,
  normalizeLimaPersonName
} from '../utils/limaContractUniqueness';
import {
  getLiveNodusEquipos,
  getLiveNodusParticipantes
} from '../services/nodusLiveApiService';
import {
  EQUIPO_OPTIONS,
  CATEGORIA_REPORTE_OPTIONS,
  BLOQUE_REPORTE_OPTIONS,
  DEFAULT_TEAM_BLOCK_MAP,
  TEAM_MAPPING_PRESETS,
  buildEnrichedFirewalkRoster,
  computeFirewalkAttendanceSummary,
  formatWhatsAppFirewalkReport,
  buildFirewalkAttendanceCsv,
  deriveDefaultCategoriaFromRol
} from '../utils/firewalkAttendanceReport';

const ATTENDANCE_COLLECTION = 'control_asistencia_fuego_lima';
const EVENT_CONFIG_DOC_ID = '_config_evento';
const LOCAL_ATTENDANCE_CACHE_KEY = 'cq_firewalk_attendance_cache_v1';

export default function MonitorAcreditacionFuegoLima() {
  const navigate = useNavigate();
  const { currentUser } = useAuth() || {};
  const operatorEmail = currentUser?.email || 'operador@crearpsl.net';

  const [signedContracts, setSignedContracts] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState(() => {
    try {
      const raw = localStorage.getItem(LOCAL_ATTENDANCE_CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [nodusIndex, setNodusIndex] = useState(null);
  const [syncingNodus, setSyncingNodus] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);
  const [savingRowKey, setSavingRowKey] = useState(null);

  const [activeTab, setActiveTab] = useState('REGISTROS'); // 'REGISTROS' | 'REPORTES' | 'PADRON'

  // Filtros Pestaña 1 (Registros + Asignación + Check-in)
  const [regSearch, setRegSearch] = useState('');
  const [regTeamFilter, setRegTeamFilter] = useState('TODOS');
  const [regCatFilter, setRegCatFilter] = useState('TODOS');
  const [regAttendanceFilter, setRegAttendanceFilter] = useState('TODOS'); // 'TODOS' | 'ASISTIERON' | 'PENDIENTES'

  // Configuración del Reporte (sincronizada con Firestore `_config_evento`)
  const [tituloSufijo, setTituloSufijo] = useState('C2');
  const [countMode, setCountMode] = useState('REGISTRADOS'); // 'REGISTRADOS' | 'ASISTIERON'
  const [teamBlockMap, setTeamBlockMap] = useState(DEFAULT_TEAM_BLOCK_MAP);
  const [includeC2Mode, setIncludeC2Mode] = useState('AUTO'); // 'AUTO' | 'YES' | 'NO'
  const [include4toMode, setInclude4toMode] = useState('AUTO'); // 'AUTO' | 'YES' | 'NO'
  const [showTeamNameInHeader, setShowTeamNameInHeader] = useState(false);
  const [includeStaffFooter, setIncludeStaffFooter] = useState(false);
  const [expandedTeamDetail, setExpandedTeamDetail] = useState(null);
  const [copiedReport, setCopiedReport] = useState(false);

  // Modal Contingencia Manual (sin celular)
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    nombre: '',
    numeroDocumento: '',
    categoriaReporte: 'Px',
    equipoAsignado: 'Equipo 32',
    notas: ''
  });

  // Filtros Padrón
  const [padronSearch, setPadronSearch] = useState('');
  const [padronTeamFilter, setPadronTeamFilter] = useState('TODOS');
  const [padronStatusFilter, setPadronStatusFilter] = useState('TODOS');

  const [qrModalType, setQrModalType] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState(null);
  const [emailStatusMap, setEmailStatusMap] = useState({});
  const [mailDeliveryByCode, setMailDeliveryByCode] = useState({});
  const [deletingId, setDeletingId] = useState(null);

  const normalizeStr = (str) => {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  };

  // Cargar índice de equipos de Lima desde Nodus en vivo para auto-asignación inteligente
  const refreshNodusLimaTeams = async (showToast = false) => {
    setSyncingNodus(true);
    try {
      const eqRes = await getLiveNodusEquipos({ sedeId: 7, enActividad: null });
      const equipos = Array.isArray(eqRes?.data) ? eqRes.data.slice(0, 8) : [];
      if (equipos.length === 0) {
        if (showToast) toast.error('No se pudo conectar con Nodus en este momento.');
        return null;
      }

      const byDoc = new Map();
      const byName = new Map();
      const partResults = await Promise.all(
        equipos.map((eq) => getLiveNodusParticipantes(eq.id).catch(() => ({ ok: false })))
      );

      for (const pRes of partResults) {
        if (!pRes?.ok || !Array.isArray(pRes.participantes)) continue;
        const eqName = pRes.equipo?.nombre || '';
        for (const p of pRes.participantes) {
          const cleanDoc = normalizeLimaDocNumber(p.identificacion || p.dni || '');
          const cleanName = normalizeLimaPersonName(p.nombreCompleto || p.nombre || '');
          const info = {
            equipo: eqName,
            equipoId: pRes.equipo?.id || null,
            etapaVigente: pRes.equipo?.etapa_vigente || '',
            tipo: p.tipo_persona || 'px'
          };
          if (cleanDoc && !byDoc.has(cleanDoc)) byDoc.set(cleanDoc, info);
          if (cleanName && !byName.has(cleanName)) byName.set(cleanName, info);
        }
      }

      const built = { byDoc, byName, syncedAt: new Date().toLocaleTimeString('es-PE') };
      setNodusIndex(built);
      if (showToast) {
        toast.success(`Equipos de Lima sincronizados desde Nodus (${byDoc.size} fichas indexadas).`);
      }
      return built;
    } catch (err) {
      console.warn('Aviso al sincronizar índice Nodus Lima:', err);
      if (showToast) toast.error('No se pudo consultar Nodus en vivo.');
      return null;
    } finally {
      setSyncingNodus(false);
    }
  };

  useEffect(() => {
    refreshNodusLimaTeams(false);
  }, []);

  // Escuchar estado de correos enviados
  useEffect(() => {
    if (!db) return;
    try {
      const mailQ = query(collection(db, 'mail'), where('type', '==', 'contrato_fuego_confirmacion'));
      const unsubMail = onSnapshot(
        mailQ,
        (snap) => {
          const bestByKey = {};
          snap.forEach((docSnap) => {
            const d = docSnap.data() || {};
            const codeKey = String(d.codigoRegistro || '').trim();
            const emailKey = String(d.recipientEmail || (Array.isArray(d.to) ? d.to[0] : d.to) || '').trim().toLowerCase();
            const rawTs = d.delivery?.endTime || d.delivery?.startTime || d.createdAt || d.created_at || '';
            const ts = rawTs?.toMillis ? rawTs.toMillis() : (Date.parse(rawTs) || 0);
            const rawState = d.delivery?.state || 'PENDING';
            const mapped =
              rawState === 'SUCCESS'
                ? 'DELIVERED'
                : rawState === 'PENDING' || rawState === 'SENDING'
                ? 'QUEUED'
                : 'ERROR';
            for (const key of [codeKey, emailKey].filter(Boolean)) {
              if (!bestByKey[key] || ts >= bestByKey[key].ts) {
                bestByKey[key] = { status: mapped, ts, rawState };
              }
            }
          });
          setMailDeliveryByCode(bestByKey);
        },
        () => {}
      );
      return () => unsubMail();
    } catch {
      // Ignorar si no hay sesión
    }
  }, []);

  // Escuchar firmas de contratos en tiempo real
  useEffect(() => {
    if (!db) return;
    try {
      const colRef = collection(db, 'contratos_caminata_fuego');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const list = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...d.data() });
          });
          setSignedContracts(deduplicateSignedContracts(list));
        },
        (error) => {
          console.warn('⚠️ Error en listener Firestore contratos_caminata_fuego:', error);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn('Firestore subscription error:', err);
    }
  }, []);

  // Escuchar asignaciones de equipo y asistencias en tiempo real (`control_asistencia_fuego_lima`)
  useEffect(() => {
    if (!db) return;
    try {
      const colRef = collection(db, ATTENDANCE_COLLECTION);
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const nextMap = {};
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() || {};
            if (docSnap.id === EVENT_CONFIG_DOC_ID) {
              if (typeof data.tituloSufijo === 'string') setTituloSufijo(data.tituloSufijo);
              if (data.countMode === 'REGISTRADOS' || data.countMode === 'ASISTIERON') {
                setCountMode(data.countMode);
              }
              if (data.teamBlockMap && typeof data.teamBlockMap === 'object') {
                setTeamBlockMap({ ...DEFAULT_TEAM_BLOCK_MAP, ...data.teamBlockMap });
              }
              if (data.includeC2Mode) setIncludeC2Mode(data.includeC2Mode);
              if (data.include4toMode) setInclude4toMode(data.include4toMode);
              if (typeof data.showTeamNameInHeader === 'boolean') {
                setShowTeamNameInHeader(data.showTeamNameInHeader);
              }
              if (typeof data.includeStaffFooter === 'boolean') {
                setIncludeStaffFooter(data.includeStaffFooter);
              }
            } else {
              nextMap[docSnap.id] = data;
            }
          });
          setAttendanceMap(nextMap);
          try {
            localStorage.setItem(LOCAL_ATTENDANCE_CACHE_KEY, JSON.stringify(nextMap));
          } catch {
            // ignore
          }
        },
        (error) => {
          console.warn('Aviso listener control_asistencia_fuego_lima:', error?.message || error);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn('Error suscribiendo control_asistencia_fuego_lima:', err);
    }
  }, []);

  // Persistir configuración de bloques del reporte en Firestore
  const saveEventConfigPatch = async (patch) => {
    const nextConfig = {
      tituloSufijo,
      countMode,
      teamBlockMap,
      includeC2Mode,
      include4toMode,
      showTeamNameInHeader,
      includeStaffFooter,
      ...patch,
      updatedBy: operatorEmail,
      updatedAt: serverTimestamp()
    };
    try {
      await setDoc(doc(db, ATTENDANCE_COLLECTION, EVENT_CONFIG_DOC_ID), nextConfig, { merge: true });
    } catch (err) {
      console.warn('No se pudo guardar config en Firestore (usando estado local):', err?.message || err);
    }
  };

  // Guardar asignación de equipo, categoría o asistencia de una persona
  const handleUpdatePersonAssignment = async (item, patch) => {
    if (!item?.personKey) return;
    const personKey = item.personKey;
    const nowTime = new Date().toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Lima'
    });

    const prevEntry = attendanceMap[personKey] || {};
    const nextAsistio = patch.asistio !== undefined ? Boolean(patch.asistio) : Boolean(item.asistio);
    const nextEntry = {
      ...prevEntry,
      personKey,
      nombre: item.nombreDisplay || item.nombre || '',
      numeroDocumento: item.numeroDocumento || '',
      rolOriginal: item.rolOriginal || item.rol || 'Participante',
      categoriaReporte: patch.categoriaReporte ?? item.categoriaReporte ?? 'Px',
      equipoAsignado: patch.equipoAsignado !== undefined ? patch.equipoAsignado : (item.equipoAsignado || ''),
      asistio: nextAsistio,
      horaAsistencia:
        patch.asistio === true
          ? nowTime
          : patch.asistio === false
          ? ''
          : prevEntry.horaAsistencia || item.horaAsistencia || '',
      updatedBy: operatorEmail,
      updatedAtLocal: new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })
    };

    // Actualización optimista inmediata
    setAttendanceMap((prev) => {
      const updated = { ...prev, [personKey]: nextEntry };
      try {
        localStorage.setItem(LOCAL_ATTENDANCE_CACHE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    setSavingRowKey(personKey);
    try {
      await setDoc(
        doc(db, ATTENDANCE_COLLECTION, personKey),
        {
          ...nextEntry,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Error guardando asignación en Firestore:', err);
      toast.error('No se pudo guardar en la nube. Verifica tu sesión en Causa OS.');
    } finally {
      setSavingRowKey(null);
    }
  };

  // Padrón enriquecido de todos los registrados + contingencias
  const roster = useMemo(() => {
    return buildEnrichedFirewalkRoster({
      signedContracts,
      attendanceMap,
      padronList: padronLima111,
      capitanesList: capitanesData?.capitanes || [],
      nodusIndex,
      teamBlockMap
    });
  }, [signedContracts, attendanceMap, nodusIndex, teamBlockMap]);

  // Resumen matemático de asistencia y equipos
  const attendanceSummary = useMemo(() => {
    return computeFirewalkAttendanceSummary(roster, {
      countMode,
      teamBlockMap
    });
  }, [roster, countMode, teamBlockMap]);

  // Texto exacto de la plantilla de WhatsApp en vivo
  const whatsappReportText = useMemo(() => {
    const includeC2Block =
      includeC2Mode === 'YES' ? true : includeC2Mode === 'NO' ? false : 'AUTO';
    const include4toFdsBlock =
      include4toMode === 'YES' ? true : include4toMode === 'NO' ? false : 'AUTO';

    return formatWhatsAppFirewalkReport(attendanceSummary, {
      tituloSufijo,
      includeC2Block,
      include4toFdsBlock,
      showTeamNameInHeader,
      includeStaffFooter,
      includeSinAsignarWarning: false
    });
  }, [
    attendanceSummary,
    tituloSufijo,
    includeC2Mode,
    include4toMode,
    showTeamNameInHeader,
    includeStaffFooter
  ]);

  // Guardar todas las auto-asignaciones detectadas desde Nodus/Padrón en Firestore con 1 clic
  const handlePersistAutoAssignments = async () => {
    let currentNodus = nodusIndex;
    if (!currentNodus) {
      currentNodus = await refreshNodusLimaTeams(false);
    }
    const candidates = buildEnrichedFirewalkRoster({
      signedContracts,
      attendanceMap,
      padronList: padronLima111,
      nodusIndex: currentNodus,
      teamBlockMap
    }).filter((r) => r.equipoAsignado && r.equipoSource !== 'MANUAL');

    if (candidates.length === 0) {
      toast.success('Todos los equipos detectados ya están guardados.');
      return;
    }

    setSavingBatch(true);
    try {
      const chunkSize = 400;
      for (let i = 0; i < candidates.length; i += chunkSize) {
        const batch = writeBatch(db);
        for (const r of candidates.slice(i, i + chunkSize)) {
          const ref = doc(db, ATTENDANCE_COLLECTION, r.personKey);
          batch.set(
            ref,
            {
              personKey: r.personKey,
              nombre: r.nombreDisplay,
              numeroDocumento: r.numeroDocumento || '',
              rolOriginal: r.rolOriginal,
              categoriaReporte: r.categoriaReporte,
              equipoAsignado: r.equipoAsignado,
              asistio: Boolean(r.asistio),
              horaAsistencia: r.horaAsistencia || '',
              updatedBy: operatorEmail,
              updatedAt: serverTimestamp()
            },
            { merge: true }
          );
        }
        await batch.commit();
      }
      toast.success(`✓ ${candidates.length} asignaciones de equipo sincronizadas y guardadas en la nube.`);
    } catch (err) {
      console.error('Error guardando lote auto-asignado:', err);
      toast.error('No se pudo guardar el lote en Firestore.');
    } finally {
      setSavingBatch(false);
    }
  };

  // Marcar asistencia masiva a los registros actualmente filtrados
  const handleBulkCheckInFiltered = async (itemsToMark) => {
    const pending = itemsToMark.filter((r) => !r.asistio);
    if (pending.length === 0) {
      toast.success('Todos los registros visibles ya tienen asistencia marcada.');
      return;
    }
    const ok = window.confirm(
      `¿Confirmas marcar ASISTENCIA EN SALA a ${pending.length} persona(s) del listado actual?`
    );
    if (!ok) return;

    const nowTime = new Date().toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Lima'
    });

    setSavingBatch(true);
    try {
      const chunkSize = 400;
      for (let i = 0; i < pending.length; i += chunkSize) {
        const batch = writeBatch(db);
        for (const r of pending.slice(i, i + chunkSize)) {
          batch.set(
            doc(db, ATTENDANCE_COLLECTION, r.personKey),
            {
              personKey: r.personKey,
              nombre: r.nombreDisplay,
              numeroDocumento: r.numeroDocumento || '',
              rolOriginal: r.rolOriginal,
              categoriaReporte: r.categoriaReporte,
              equipoAsignado: r.equipoAsignado || '',
              asistio: true,
              horaAsistencia: nowTime,
              updatedBy: operatorEmail,
              updatedAt: serverTimestamp()
            },
            { merge: true }
          );
        }
        await batch.commit();
      }
      toast.success(`✓ Asistencia marcada para ${pending.length} persona(s).`);
    } catch (err) {
      console.error('Error en check-in masivo:', err);
      toast.error('No se pudo completar el marcado masivo.');
    } finally {
      setSavingBatch(false);
    }
  };

  // Agregar asistente manual de contingencia (sin celular)
  const handleCreateManualAttendee = async (e) => {
    e.preventDefault();
    const nombreClean = manualForm.nombre.trim();
    if (!nombreClean) {
      toast.error('Ingresa el nombre completo de la persona.');
      return;
    }
    const docClean = normalizeLimaDocNumber(manualForm.numeroDocumento);
    const key = docClean && docClean.length >= 4
      ? `doc_${docClean}`
      : `manual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const nowTime = new Date().toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Lima'
    });
    const nowLocal = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });

    try {
      await setDoc(
        doc(db, ATTENDANCE_COLLECTION, key),
        {
          personKey: key,
          isManualContingency: true,
          nombre: nombreClean,
          tipoDocumento: 'DNI',
          numeroDocumento: docClean || 'S/D',
          rolOriginal:
            manualForm.categoriaReporte === 'MG'
              ? 'Manager'
              : manualForm.categoriaReporte === 'Aliados'
              ? 'Aliados'
              : manualForm.categoriaReporte === 'Staff'
              ? 'Staff de Caminata'
              : 'Participante',
          categoriaReporte: manualForm.categoriaReporte,
          equipoAsignado: manualForm.equipoAsignado,
          asistio: true,
          horaAsistencia: nowTime,
          createdAtLocal: nowLocal,
          notas: manualForm.notas.trim(),
          code: `MANUAL-${Date.now().toString().slice(-4)}`,
          updatedBy: operatorEmail,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      toast.success(`✓ ${nombreClean} agregado a ${manualForm.equipoAsignado || 'la asistencia'}.`);
      setManualForm({
        nombre: '',
        numeroDocumento: '',
        categoriaReporte: 'Px',
        equipoAsignado: manualForm.equipoAsignado || 'Equipo 32',
        notas: ''
      });
      setShowManualModal(false);
    } catch (err) {
      console.error('Error creando registro manual:', err);
      toast.error('No se pudo guardar el registro manual.');
    }
  };

  const handleDeleteFirewalkRecord = async (item) => {
    if (item?.isManualContingency) {
      const okManual = window.confirm(
        `¿Eliminar el registro manual en sala de "${item.nombreDisplay}"?`
      );
      if (!okManual) return;
      setDeletingId(item.personKey);
      try {
        await deleteDoc(doc(db, ATTENDANCE_COLLECTION, item.personKey));
        toast.success('Registro manual eliminado.');
      } catch {
        toast.error('No se pudo eliminar el registro manual.');
      } finally {
        setDeletingId(null);
      }
      return;
    }

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
      const idsToDelete = Array.isArray(item._allDocIds) && item._allDocIds.length > 0
        ? item._allDocIds
        : [item.id];
      await Promise.all(idsToDelete.map((docId) => deleteDoc(doc(db, 'contratos_caminata_fuego', docId))));
      if (item.personKey) {
        await deleteDoc(doc(db, ATTENDANCE_COLLECTION, item.personKey)).catch(() => {});
      }
      toast.success(`Registro de ${nombre} eliminado correctamente.`);
    } catch (err) {
      console.error('Error al eliminar registro en contratos_caminata_fuego:', err);
      alert('No se pudo eliminar el registro. Verifica tus permisos en Causa OS.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleResendFirewalkEmail = async (item) => {
    if (!item.email) {
      toast.error('Este registro no cuenta con correo electrónico.');
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
        device: item.dispositivo || item.device || '',
        aceptoImagen: Boolean(item.aceptoImagen),
        firmaTexto: item.firmaTexto || item.nombre || item.nombreCompleto || '',
        sha256Hash: item.sha256Hash || ''
      });

      if (ok) {
        setEmailStatusMap((prev) => ({ ...prev, [rowKey]: 'QUEUED' }));
        toast.success(`Contrato firmado (PDF) y Pase enviados a ${item.email}`);
      } else {
        setEmailStatusMap((prev) => ({ ...prev, [rowKey]: 'ERROR' }));
        toast.error(`No se pudo encolar el correo para ${item.email}.`);
      }
    } catch (e) {
      setEmailStatusMap((prev) => ({ ...prev, [rowKey]: 'ERROR' }));
      toast.error(`Error al reenviar pase: ${e?.message || 'verifica tu conexión'}`);
    } finally {
      setSendingEmailId(null);
    }
  };

  // Matching de firmas contra el padrón oficial de 111 integrantes
  const enrichedPadron = useMemo(() => {
    return padronLima111.map((person) => {
      const normPersonName = normalizeStr(person.nombre);
      const personTokens = normPersonName.split(/\s+/).filter((t) => t.length > 2);

      const matchedRow = roster.find((c) => {
        const normSigName = normalizeStr(c.nombreDisplay || c.nombre || '');
        if (normSigName === normPersonName) return true;
        const matchTokens = personTokens.filter((t) => normSigName.includes(t));
        return matchTokens.length >= 2;
      });

      return {
        ...person,
        isSigned: Boolean(matchedRow),
        signature: matchedRow || null
      };
    });
  }, [roster]);

  // Contadores por equipo para chips rápidos
  const teamChipCounts = useMemo(() => {
    const counts = {
      TODOS: roster.length,
      SIN_EQUIPO: 0,
      'Equipo 32': 0,
      'Equipo 31': 0,
      'Equipo 30': 0,
      'Equipo 29': 0,
      'Equipo 28': 0,
      'Equipo 33': 0,
      Aliados: 0,
      Staff: 0
    };
    for (const r of roster) {
      if (!r.equipoAsignado) {
        counts.SIN_EQUIPO += 1;
      } else if (counts[r.equipoAsignado] !== undefined) {
        counts[r.equipoAsignado] += 1;
      } else {
        counts[r.equipoAsignado] = (counts[r.equipoAsignado] || 0) + 1;
      }
    }
    return counts;
  }, [roster]);

  const stats = useMemo(() => {
    const totalPadron = enrichedPadron.length;
    const firmadosPadron = enrichedPadron.filter((p) => p.isSigned).length;
    const pendientesPadron = totalPadron - firmadosPadron;
    const porcentaje = totalPadron > 0 ? Math.round((firmadosPadron / totalPadron) * 100) : 0;

    const totalPx = roster.filter((r) => r.categoriaReporte === 'Px').length;
    const totalMg = roster.filter((r) => r.categoriaReporte === 'MG').length;
    return {
      totalPadron,
      firmadosPadron,
      pendientesPadron,
      porcentaje,
      totalRegistrados: roster.length,
      totalAsistieron: attendanceSummary.totalAsistieron,
      totalPx,
      totalMg,
      totalAliados: attendanceSummary.aliadosReg,
      totalStaff: attendanceSummary.staffReg,
      sinEquipoCount: teamChipCounts.SIN_EQUIPO
    };
  }, [enrichedPadron, roster, attendanceSummary, teamChipCounts]);

  // Filtrado de Pestaña 1
  const filteredRegistros = useMemo(() => {
    return roster.filter((item) => {
      if (regTeamFilter === 'SIN_EQUIPO') {
        if (item.equipoAsignado) return false;
      } else if (regTeamFilter !== 'TODOS') {
        if (item.equipoAsignado !== regTeamFilter && item.bloqueReporte !== regTeamFilter) {
          return false;
        }
      }

      if (regCatFilter !== 'TODOS') {
        if (['Px', 'MG', 'Aliados', 'Staff'].includes(regCatFilter)) {
          if (item.categoriaReporte !== regCatFilter) return false;
        } else if (item.rolOriginal !== regCatFilter) {
          return false;
        }
      }

      if (regAttendanceFilter === 'ASISTIERON' && !item.asistio) return false;
      if (regAttendanceFilter === 'PENDIENTES' && item.asistio) return false;

      if (regSearch) {
        const term = normalizeStr(regSearch);
        const name = normalizeStr(item.nombreDisplay);
        const docStr = normalizeStr(item.documentoDisplay);
        const code = normalizeStr(item.code || item.verificationCode || '');
        const rol = normalizeStr(item.rolOriginal);
        const eq = normalizeStr(item.equipoAsignado);
        const blk = normalizeStr(item.bloqueReporte);
        const email = normalizeStr(item.email || '');
        const tel = normalizeStr(item.telefono || '');
        return (
          name.includes(term) ||
          docStr.includes(term) ||
          code.includes(term) ||
          rol.includes(term) ||
          eq.includes(term) ||
          blk.includes(term) ||
          email.includes(term) ||
          tel.includes(term)
        );
      }
      return true;
    });
  }, [roster, regTeamFilter, regCatFilter, regAttendanceFilter, regSearch]);

  // Filtrado de Pestaña 3 (Padrón 111)
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

  const handleCopyWhatsAppReport = () => {
    navigator.clipboard.writeText(whatsappReportText).then(() => {
      setCopiedReport(true);
      toast.success('📋 Plantilla de reporte copiada lista para pegar en WhatsApp.');
      setTimeout(() => setCopiedReport(false), 2500);
    });
  };

  const handleDownloadCsv = () => {
    const csv = buildFirewalkAttendanceCsv(roster);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `Asistencia_Caminata_Fuego_Lima_${dateStamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('📊 Reporte Excel (CSV) descargado.');
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
        @media print {
          .no-print-fuego {
            display: none !important;
          }
          .monitor-fuego-root {
            background: #ffffff !important;
            color: #0f172a !important;
          }
        }
      `}</style>
      <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Encabezado con Branding Oficial CREAR */}
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

          <div className="no-print-fuego" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
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
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#e2e8f0', display: 'block' }}>Causa OS · Control de Equipos, Check-in en Sala y Reporte Oficial de Asistencia</span>
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
                  FIRESTORE + NODUS CONECTADOS
                </span>
              </div>
              <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#fff' }}>
                Caminata sobre Fuego · Registro con Fechas y Lugar
              </h1>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.84rem', color: '#94a3b8', fontWeight: 500 }}>
                📍 Casona Blanca (Calle Las Perdices 1126, Huachipa) · Búsqueda, Asignación de Equipos y Reporte Oficial de Asistencia
              </p>
            </div>

            <div className="no-print-fuego" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setActiveTab('REPORTES')}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.65rem 1rem',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                <BarChart3 size={16} /> Ver Asistencia y Reporte WhatsApp
              </button>
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

          {/* Tarjetas KPI Operativas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '0.75rem',
            marginTop: '1.25rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ background: 'rgba(6, 78, 59, 0.3)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
              <span style={{ fontSize: '0.67rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🔥 Total Registrados</span>
              <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#34d399', marginTop: '0.15rem' }}>{stats.totalRegistrados}</div>
              <div style={{ fontSize: '0.7rem', color: '#a7f3d0' }}>Firmas únicas en vivo</div>
            </div>

            <div style={{ background: 'rgba(14, 116, 144, 0.25)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
              <span style={{ fontSize: '0.67rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>✅ Check-in Sala</span>
              <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#38bdf8', marginTop: '0.15rem' }}>
                {stats.totalAsistieron}
                <span style={{ fontSize: '0.8rem', color: '#bae6fd', fontWeight: 700, marginLeft: '0.35rem' }}>
                  ({stats.totalRegistrados > 0 ? Math.round((stats.totalAsistieron / stats.totalRegistrados) * 100) : 0}%)
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#bae6fd' }}>Asistencia verificada</div>
            </div>

            <div style={{ background: '#0f172a', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #334155' }}>
              <span style={{ fontSize: '0.67rem', fontWeight: 800, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>👥 Equipos (Px + MG)</span>
              <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#fff', marginTop: '0.15rem' }}>{stats.totalPx + stats.totalMg}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Px: <strong>{stats.totalPx}</strong> · MG: <strong>{stats.totalMg}</strong></div>
            </div>

            <div style={{ background: 'rgba(88, 28, 135, 0.25)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(192, 132, 252, 0.35)' }}>
              <span style={{ fontSize: '0.67rem', fontWeight: 800, color: '#d8b4fe', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🤝 Aliados y Staff</span>
              <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#f3e8ff', marginTop: '0.15rem' }}>{stats.totalAliados + stats.totalStaff}</div>
              <div style={{ fontSize: '0.7rem', color: '#e9d5ff' }}>Aliados: <strong>{stats.totalAliados}</strong> · Staff: <strong>{stats.totalStaff}</strong></div>
            </div>

            <div
              onClick={() => {
                setActiveTab('REGISTROS');
                setRegTeamFilter(stats.sinEquipoCount > 0 ? 'SIN_EQUIPO' : 'TODOS');
              }}
              style={{
                background: stats.sinEquipoCount > 0 ? 'rgba(120, 53, 15, 0.38)' : 'rgba(6, 78, 59, 0.25)',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: stats.sinEquipoCount > 0 ? '1px solid rgba(245, 158, 11, 0.55)' : '1px solid rgba(16, 185, 129, 0.35)',
                cursor: 'pointer'
              }}
              title="Clic para filtrar los registros pendientes de asignar equipo"
            >
              <span style={{ fontSize: '0.67rem', fontWeight: 800, color: stats.sinEquipoCount > 0 ? '#fbbf24' : '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {stats.sinEquipoCount > 0 ? '⚠️ Sin Equipo' : '✓ Equipos Completos'}
              </span>
              <div style={{ fontSize: '1.55rem', fontWeight: 900, color: stats.sinEquipoCount > 0 ? '#fbbf24' : '#34d399', marginTop: '0.15rem' }}>
                {stats.sinEquipoCount}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#fde68a' }}>
                {stats.sinEquipoCount > 0 ? 'Clic para asignar →' : '100% clasificados'}
              </div>
            </div>
          </div>
        </div>

        {/* SELECTOR DE 3 PESTAÑAS PRINCIPALES */}
        <div className="no-print-fuego" style={{ display: 'flex', gap: '0.5rem', background: '#0f172a', padding: '0.4rem', borderRadius: '14px', border: '1px solid #1e293b', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('REGISTROS')}
            style={{
              flex: '1 1 240px',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              fontSize: '0.83rem',
              fontWeight: 900,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'REGISTROS' ? 'linear-gradient(90deg, #ea580c, #f59e0b)' : '#1e293b',
              color: activeTab === 'REGISTROS' ? '#fff' : '#94a3b8',
              boxShadow: activeTab === 'REGISTROS' ? '0 4px 15px rgba(234, 88, 12, 0.25)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem'
            }}
          >
            <ClipboardCheck size={16} /> 1. Buscar, Asignar Equipo y Check-in ({roster.length})
          </button>

          <button
            onClick={() => setActiveTab('REPORTES')}
            style={{
              flex: '1 1 240px',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              fontSize: '0.83rem',
              fontWeight: 900,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'REPORTES' ? 'linear-gradient(90deg, #059669, #10b981)' : '#1e293b',
              color: activeTab === 'REPORTES' ? '#fff' : '#94a3b8',
              boxShadow: activeTab === 'REPORTES' ? '0 4px 15px rgba(16, 185, 129, 0.28)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem'
            }}
          >
            <BarChart3 size={16} /> 2. Asistencia por Equipo y Plantilla Reporte
          </button>

          <button
            onClick={() => setActiveTab('PADRON')}
            style={{
              flex: '1 1 200px',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              fontSize: '0.83rem',
              fontWeight: 900,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'PADRON' ? 'linear-gradient(90deg, #ea580c, #f59e0b)' : '#1e293b',
              color: activeTab === 'PADRON' ? '#fff' : '#94a3b8',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem'
            }}
          >
            <Users size={16} /> 3. Padrón Oficial ({stats.totalPadron})
          </button>
        </div>

        {/* ========================================================================
            PESTAÑA 1: BUSCAR REGISTRADOS, ASIGNAR EQUIPO Y MARCAR ASISTENCIA
           ======================================================================== */}
        {activeTab === 'REGISTROS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              background: 'rgba(15, 23, 42, 0.96)',
              border: '1px solid #1e293b',
              borderRadius: '14px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              position: 'sticky',
              top: '0.5rem',
              zIndex: 20,
              backdropFilter: 'blur(8px)'
            }}>
              {/* Buscador instantáneo */}
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 320px' }}>
                  <input
                    type="text"
                    value={regSearch}
                    onChange={(e) => setRegSearch(e.target.value)}
                    placeholder="🔍 Buscar registrado por nombre, DNI/CE, equipo, rol, teléfono o código..."
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.2rem 0.75rem 2.6rem',
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

                <button
                  onClick={() => refreshNodusLimaTeams(true)}
                  disabled={syncingNodus}
                  title="Volver a consultar los equipos de Lima en Nodus API"
                  style={{
                    background: '#1e293b',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    borderRadius: '10px',
                    padding: '0.6rem 0.9rem',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: syncingNodus ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <RefreshCw size={14} /> {syncingNodus ? 'Sincronizando...' : 'Auto-Detectar Nodus'}
                </button>

                <button
                  onClick={handlePersistAutoAssignments}
                  disabled={savingBatch}
                  title="Guardar en Firestore todos los equipos detectados automáticamente por DNI/Nombre"
                  style={{
                    background: 'rgba(16, 185, 129, 0.16)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.45)',
                    borderRadius: '10px',
                    padding: '0.6rem 0.9rem',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: savingBatch ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <CheckCircle2 size={14} /> Guardar Auto-Equipos
                </button>

                <button
                  onClick={() => setShowManualModal(true)}
                  style={{
                    background: 'rgba(249, 115, 22, 0.16)',
                    color: '#fb923c',
                    border: '1px solid rgba(249, 115, 22, 0.4)',
                    borderRadius: '10px',
                    padding: '0.6rem 0.9rem',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <UserPlus size={14} /> + Contingencia Manual
                </button>
              </div>

              {/* Filtro por Equipo Asignado */}
              <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.15rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginRight: '0.2rem', whiteSpace: 'nowrap' }}>Equipo:</span>
                {[
                  { id: 'TODOS', label: `Todos (${teamChipCounts.TODOS})` },
                  { id: 'SIN_EQUIPO', label: `⚠️ Sin Equipo (${teamChipCounts.SIN_EQUIPO})` },
                  { id: 'Equipo 32', label: `Equipo 32 (${teamChipCounts['Equipo 32'] || 0})` },
                  { id: 'Equipo 31', label: `Equipo 31 (${teamChipCounts['Equipo 31'] || 0})` },
                  { id: 'Equipo 30', label: `Equipo 30 (${teamChipCounts['Equipo 30'] || 0})` },
                  { id: 'Equipo 29', label: `Equipo 29 (${teamChipCounts['Equipo 29'] || 0})` },
                  { id: 'Equipo 28', label: `Equipo 28 (${teamChipCounts['Equipo 28'] || 0})` },
                  { id: 'Aliados', label: `Aliados (${teamChipCounts.Aliados || 0})` },
                  { id: 'Staff', label: `Staff / Oficina (${teamChipCounts.Staff || 0})` }
                ].map((chip) => {
                  const active = regTeamFilter === chip.id;
                  const isWarn = chip.id === 'SIN_EQUIPO' && teamChipCounts.SIN_EQUIPO > 0;
                  return (
                    <button
                      key={chip.id}
                      onClick={() => setRegTeamFilter(chip.id)}
                      style={{
                        background: active
                          ? '#ea580c'
                          : isWarn
                          ? 'rgba(180, 83, 9, 0.35)'
                          : '#1e293b',
                        color: active ? '#fff' : isWarn ? '#fde68a' : '#cbd5e1',
                        border: active
                          ? 'none'
                          : isWarn
                          ? '1px solid rgba(245, 158, 11, 0.55)'
                          : '1px solid #334155',
                        borderRadius: '8px',
                        padding: '0.35rem 0.68rem',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              {/* Filtro por Rol / Categoría y Estado de Check-in */}
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginRight: '0.2rem' }}>Rol:</span>
                  {[
                    { id: 'TODOS', label: 'Todos' },
                    { id: 'Px', label: 'Px (Participantes)' },
                    { id: 'MG', label: 'MG (Managers/Cap)' },
                    { id: 'Aliados', label: 'Aliados' },
                    { id: 'Staff', label: 'Staff / Oficina' }
                  ].map((r) => {
                    const active = regCatFilter === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => setRegCatFilter(r.id)}
                        style={{
                          background: active ? '#0284c7' : '#1e293b',
                          color: active ? '#fff' : '#cbd5e1',
                          border: active ? 'none' : '1px solid #334155',
                          borderRadius: '7px',
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.71rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          cursor: 'pointer'
                        }}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Asistencia:</span>
                  {[
                    { id: 'TODOS', label: 'Todos' },
                    { id: 'ASISTIERON', label: '✅ Asistieron' },
                    { id: 'PENDIENTES', label: '⏳ Sin Check-in' }
                  ].map((a) => {
                    const active = regAttendanceFilter === a.id;
                    return (
                      <button
                        key={a.id}
                        onClick={() => setRegAttendanceFilter(a.id)}
                        style={{
                          background: active ? '#059669' : '#1e293b',
                          color: active ? '#fff' : '#cbd5e1',
                          border: active ? 'none' : '1px solid #334155',
                          borderRadius: '7px',
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.71rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {a.label}
                      </button>
                    );
                  })}

                  {filteredRegistros.length > 0 && (
                    <button
                      onClick={() => handleBulkCheckInFiltered(filteredRegistros)}
                      disabled={savingBatch}
                      style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.45)',
                        borderRadius: '7px',
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.71rem',
                        fontWeight: 800,
                        cursor: savingBatch ? 'wait' : 'pointer'
                      }}
                    >
                      ✓ Marcar Asistencia a Filtrados ({filteredRegistros.length})
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0.5rem', fontSize: '0.78rem', color: '#94a3b8', flexWrap: 'wrap', gap: '0.4rem' }}>
              <span>
                Mostrando <strong>{filteredRegistros.length}</strong> de {roster.length} registros ·{' '}
                <strong style={{ color: '#34d399' }}>
                  {filteredRegistros.filter((r) => r.asistio).length} con check-in
                </strong>
              </span>
              <span style={{ color: '#10b981' }}>
                ✓ Sincronización en vivo {nodusIndex?.syncedAt ? `· Nodus ${nodusIndex.syncedAt}` : ''}
              </span>
            </div>

            {/* Listado de tarjetas con asignación de equipo y check-in */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredRegistros.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
                  <p style={{ margin: 0, fontWeight: 700, color: '#fff' }}>No hay registros que coincidan con este filtro</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>Prueba limpiando la búsqueda o seleccionando "Todos".</p>
                </div>
              ) : (
                filteredRegistros.map((item, idx) => {
                  const nombre = item.nombreDisplay;
                  const tipoDoc = item.tipoDocDisplay;
                  const numDoc = item.documentoDisplay;
                  const rol = item.rolOriginal;
                  const lugar = item.lugar || item.sedeLocacion || 'Lima - Casona Blanca (Calle Las Perdices 1126, Huachipa)';
                  const fecha = item.fecha || item.timestamp || item.fechaValidacionLocal || 'Fecha registrada';
                  const code = item.code || item.verificationCode || 'CQ-FIRE-VERIFIED';
                  const aceptoImagen = item.aceptoImagen ? '✓ Autorizado' : '— No seleccionado';
                  const isUnassigned = !item.equipoAsignado;

                  return (
                    <div
                      key={item.personKey || item.id || idx}
                      style={{
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                        border: isUnassigned
                          ? '1px solid rgba(245, 158, 11, 0.55)'
                          : item.asistio
                          ? '1px solid rgba(16, 185, 129, 0.6)'
                          : '1px solid rgba(56, 189, 248, 0.35)',
                        borderRadius: '14px',
                        padding: '1.15rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      {/* Fila superior: Estado legal + Rol + Bloque Reporte + Código */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{
                            background: item.isManualContingency ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            color: item.isManualContingency ? '#fbbf24' : '#34d399',
                            border: item.isManualContingency ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                            fontSize: '0.65rem',
                            fontWeight: 900,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px'
                          }}>
                            {item.isManualContingency ? '✍️ CONTINGENCIA MANUAL EN SALA' : '✓ EXONERACIÓN FIRMADA'}
                          </span>
                          <span style={{ background: 'rgba(249, 115, 22, 0.12)', color: '#fb923c', border: '1px solid rgba(249, 115, 22, 0.3)', fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            Rol form: {rol}
                          </span>
                          <span style={{
                            background: isUnassigned ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.16)',
                            color: isUnassigned ? '#fde68a' : '#38bdf8',
                            border: isUnassigned ? '1px solid rgba(245, 158, 11, 0.45)' : '1px solid rgba(56, 189, 248, 0.35)',
                            fontSize: '0.65rem',
                            fontWeight: 900,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px'
                          }}>
                            {isUnassigned
                              ? '⚠️ SIN EQUIPO ASIGNADO'
                              : `🏷️ ${item.equipoAsignado} → Reporte: ${item.bloqueReporte} (${item.categoriaReporte})`}
                          </span>
                          {item.equipoSource && item.equipoSource !== 'UNASSIGNED' && (
                            <span style={{ fontSize: '0.63rem', color: '#94a3b8', fontWeight: 700 }}>
                              [{item.equipoSource === 'MANUAL' ? 'Asignado' : item.equipoSource === 'AUTO_NODUS' ? 'Auto Nodus' : item.equipoSource === 'AUTO_PADRON' ? 'Auto Padrón' : 'Auto Rol'}]
                            </span>
                          )}
                          {isUnassigned && item.graduadoRef && (
                            <span style={{ fontSize: '0.65rem', color: '#fbbf24', fontWeight: 700 }}>
                              (Ref. Nodus: Graduado {item.graduadoRef} — elige qué equipo apoya hoy)
                            </span>
                          )}
                        </div>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700 }}>
                          {code}
                        </span>
                      </div>

                      {/* Nombre + Acciones principales */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 900, color: '#fff' }}>
                          {nombre}
                        </h3>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          {/* Botón 1-Clic de Check-in / Asistencia */}
                          <button
                            onClick={() => handleUpdatePersonAssignment(item, { asistio: !item.asistio })}
                            disabled={savingRowKey === item.personKey}
                            style={{
                              background: item.asistio
                                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                : 'rgba(56, 189, 248, 0.16)',
                              color: item.asistio ? '#fff' : '#38bdf8',
                              border: item.asistio ? 'none' : '1px solid rgba(56, 189, 248, 0.45)',
                              borderRadius: '8px',
                              padding: '0.45rem 0.85rem',
                              fontSize: '0.76rem',
                              fontWeight: 900,
                              cursor: savingRowKey === item.personKey ? 'wait' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              boxShadow: item.asistio ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
                            }}
                          >
                            <CheckCircle2 size={14} />
                            {item.asistio
                              ? `ASISTIÓ EN SALA${item.horaAsistencia ? ` (${item.horaAsistencia})` : ''}`
                              : 'Marcar Asistencia'}
                          </button>

                          {!item.isManualContingency && (
                            <button
                              onClick={() =>
                                downloadFirewalkContractPdf({
                                  ...item,
                                  nombre,
                                  documento: `${tipoDoc}: ${numDoc}`,
                                  rolActividad: rol,
                                  lugar,
                                  codigo: code,
                                  fecha
                                })
                              }
                              style={{
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                borderRadius: '8px',
                                padding: '0.4rem 0.7rem',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              <Download size={13} /> PDF
                            </button>
                          )}

                          {!item.isManualContingency && item.email && (() => {
                            const rowKey = item.id || item.code;
                            const cleanRecordEmail = String(item.email || '').trim().toLowerCase();
                            const liveDelivery =
                              mailDeliveryByCode[code]?.status ||
                              (cleanRecordEmail ? mailDeliveryByCode[cleanRecordEmail]?.status : null);
                            const localStatus = emailStatusMap[rowKey];
                            const effectiveStatus =
                              liveDelivery === 'DELIVERED'
                                ? 'DELIVERED'
                                : localStatus || liveDelivery || null;

                            return (
                              <button
                                onClick={() => handleResendFirewalkEmail(item)}
                                disabled={sendingEmailId === rowKey}
                                style={{
                                  background:
                                    effectiveStatus === 'DELIVERED'
                                      ? 'rgba(16, 185, 129, 0.18)'
                                      : effectiveStatus === 'ERROR'
                                      ? 'rgba(244, 63, 94, 0.2)'
                                      : 'rgba(249, 115, 22, 0.16)',
                                  color:
                                    effectiveStatus === 'DELIVERED'
                                      ? '#34d399'
                                      : effectiveStatus === 'ERROR'
                                      ? '#fb7185'
                                      : '#fb923c',
                                  border: '1px solid rgba(255,255,255,0.14)',
                                  borderRadius: '8px',
                                  padding: '0.4rem 0.7rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  cursor: sendingEmailId === rowKey ? 'wait' : 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}
                              >
                                <Mail size={13} />
                                {sendingEmailId === rowKey
                                  ? 'Enviando...'
                                  : effectiveStatus === 'DELIVERED'
                                  ? '✓ Pase Enviado'
                                  : 'Reenviar Pase'}
                              </button>
                            );
                          })()}

                          <button
                            onClick={() => handleDeleteFirewalkRecord(item)}
                            disabled={deletingId === (item.id || item.personKey)}
                            title="Eliminar registro si ingresó datos errados"
                            style={{
                              background: 'rgba(244, 63, 94, 0.15)',
                              color: '#fb7185',
                              border: '1px solid rgba(244, 63, 94, 0.4)',
                              borderRadius: '8px',
                              padding: '0.4rem 0.7rem',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <Trash2 size={13} /> Eliminar
                          </button>
                        </div>
                      </div>

                      {/* Franja de Asignación de Equipo y Categoría en Reporte */}
                      <div style={{
                        background: 'rgba(2, 6, 23, 0.75)',
                        border: isUnassigned ? '1px solid rgba(245, 158, 11, 0.45)' : '1px solid #334155',
                        borderRadius: '10px',
                        padding: '0.65rem 0.85rem',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '0.65rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: '1 1 230px' }}>
                          <label style={{ fontSize: '0.73rem', fontWeight: 800, color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                            Equipo / Grupo:
                          </label>
                          <select
                            value={item.equipoAsignado || ''}
                            onChange={(e) => handleUpdatePersonAssignment(item, { equipoAsignado: e.target.value })}
                            style={{
                              flex: 1,
                              padding: '0.42rem 0.6rem',
                              borderRadius: '7px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            {EQUIPO_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: '0 1 220px' }}>
                          <label style={{ fontSize: '0.73rem', fontWeight: 800, color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                            En Reporte:
                          </label>
                          <select
                            value={item.categoriaReporte}
                            onChange={(e) => {
                              const nextCat = e.target.value;
                              const patch = { categoriaReporte: nextCat };
                              if (nextCat === 'Aliados' && !item.equipoAsignado) patch.equipoAsignado = 'Aliados';
                              if (nextCat === 'Staff' && !item.equipoAsignado) patch.equipoAsignado = 'Staff';
                              handleUpdatePersonAssignment(item, patch);
                            }}
                            style={{
                              padding: '0.42rem 0.6rem',
                              borderRadius: '7px',
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            {CATEGORIA_REPORTE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Botones rápidos 1-toque */}
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>1-clic:</span>
                          {[
                            { val: 'Equipo 32', short: 'E32' },
                            { val: 'Equipo 31', short: 'E31' },
                            { val: 'Equipo 30', short: 'E30' },
                            { val: 'Equipo 29', short: 'E29' },
                            { val: 'Aliados', short: 'Aliados' },
                            { val: 'Staff', short: 'Staff' }
                          ].map((q) => {
                            const selected = item.equipoAsignado === q.val;
                            return (
                              <button
                                key={q.val}
                                type="button"
                                onClick={() => {
                                  const patch = { equipoAsignado: q.val };
                                  if (q.val === 'Aliados') patch.categoriaReporte = 'Aliados';
                                  if (q.val === 'Staff') patch.categoriaReporte = 'Staff';
                                  handleUpdatePersonAssignment(item, patch);
                                }}
                                style={{
                                  background: selected ? '#ea580c' : '#1e293b',
                                  color: selected ? '#fff' : '#cbd5e1',
                                  border: selected ? 'none' : '1px solid #334155',
                                  borderRadius: '6px',
                                  padding: '0.26rem 0.5rem',
                                  fontSize: '0.69rem',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                              >
                                {q.short}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Datos de fecha, lugar e IP */}
                      <div style={{
                        background: '#0b1120',
                        border: '1px solid #1e293b',
                        borderRadius: '10px',
                        padding: '0.65rem 0.9rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                        gap: '0.45rem',
                        fontSize: '0.76rem'
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
                          <span style={{ color: '#94a3b8', fontWeight: 700 }}>📍 Lugar: </span>
                          <strong style={{ color: '#fde047' }}>{lugar}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8', fontWeight: 700 }}>📸 Imagen: </span>
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

        {/* ========================================================================
            PESTAÑA 2: REVISIÓN DE ASISTENCIA POR EQUIPO, GENERAL Y REPORTE WHATSAPP
           ======================================================================== */}
        {activeTab === 'REPORTES' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Alerta si quedan Px/MG sin equipo asignado */}
            {attendanceSummary.sinAsignarPxMgReg > 0 && (
              <div className="no-print-fuego" style={{
                background: 'rgba(180, 83, 9, 0.22)',
                border: '1px solid rgba(245, 158, 11, 0.55)',
                borderRadius: '12px',
                padding: '0.9rem 1.1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <AlertTriangle size={20} color="#fbbf24" />
                  <div style={{ fontSize: '0.84rem', color: '#fef3c7' }}>
                    Hay <strong>{attendanceSummary.sinAsignarPxMgReg} persona(s) (Px / MG)</strong> aún sin equipo asignado (por ejemplo Managers graduados en equipos anteriores o DNI no encontrado en Nodus). Asígnalos para que sumen en su FDS correspondiente.
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('REGISTROS');
                    setRegTeamFilter('SIN_EQUIPO');
                  }}
                  style={{
                    background: '#f59e0b',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem 0.9rem',
                    fontSize: '0.78rem',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  Asignar los {attendanceSummary.sinAsignarPxMgReg} pendientes →
                </button>
              </div>
            )}

            {/* Barra de Configuración del Reporte */}
            <div className="no-print-fuego" style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '14px',
              padding: '1.15rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900 }}>⚙️ Configuración de Conteo y Equivalencia de Equipos ↔ FDS</h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
                    Elige si el reporte cuenta a todos los firmados o solo check-in en puerta, y cómo se agrupan los equipos en la plantilla.
                  </p>
                </div>

                {/* Selector Base del Conteo */}
                <div style={{ display: 'flex', gap: '0.4rem', background: '#020617', padding: '0.3rem', borderRadius: '10px', border: '1px solid #334155' }}>
                  <button
                    onClick={() => {
                      setCountMode('REGISTRADOS');
                      saveEventConfigPatch({ countMode: 'REGISTRADOS' });
                    }}
                    style={{
                      background: countMode === 'REGISTRADOS' ? '#ea580c' : 'transparent',
                      color: countMode === 'REGISTRADOS' ? '#fff' : '#94a3b8',
                      border: 'none',
                      borderRadius: '7px',
                      padding: '0.45rem 0.8rem',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    🔥 Todos los Registrados ({attendanceSummary.totalRegistrados})
                  </button>
                  <button
                    onClick={() => {
                      setCountMode('ASISTIERON');
                      saveEventConfigPatch({ countMode: 'ASISTIERON' });
                    }}
                    style={{
                      background: countMode === 'ASISTIERON' ? '#059669' : 'transparent',
                      color: countMode === 'ASISTIERON' ? '#fff' : '#94a3b8',
                      border: 'none',
                      borderRadius: '7px',
                      padding: '0.45rem 0.8rem',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    ✅ Solo Check-in Sala ({attendanceSummary.totalAsistieron})
                  </button>
                </div>
              </div>

              {/* Presets rápidos */}
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.73rem', fontWeight: 800, color: '#cbd5e1' }}>Plantilla rápida:</span>
                {TEAM_MAPPING_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setTeamBlockMap(preset.map);
                      saveEventConfigPatch({ teamBlockMap: preset.map });
                      toast.success(`Mapeo aplicado: ${preset.label}`);
                    }}
                    style={{
                      background: '#1e293b',
                      color: '#e2e8f0',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '0.38rem 0.7rem',
                      fontSize: '0.73rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Mapeo individual Equipo -> Bloque FDS */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))',
                gap: '0.6rem',
                background: '#0b1120',
                padding: '0.75rem',
                borderRadius: '10px',
                border: '1px solid #1e293b'
              }}>
                {['Equipo 33', 'Equipo 32', 'Equipo 31', 'Equipo 30', 'Equipo 29', 'Equipo 28'].map((eq) => (
                  <div key={eq} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8' }}>{eq} suma en:</label>
                    <select
                      value={teamBlockMap[eq] || 'Ocultar'}
                      onChange={(e) => {
                        const updated = { ...teamBlockMap, [eq]: e.target.value };
                        setTeamBlockMap(updated);
                        saveEventConfigPatch({ teamBlockMap: updated });
                      }}
                      style={{
                        padding: '0.38rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 800
                      }}
                    >
                      {BLOQUE_REPORTE_OPTIONS.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid Principal: Plantilla Oficial WhatsApp + Resumen General y por Equipos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>

              {/* COLUMNA IZQUIERDA: PLANTILLA OFICIAL DE REPORTE WHATSAPP */}
              <div style={{
                background: 'linear-gradient(160deg, #0f172a 0%, #111827 100%)',
                border: '1px solid rgba(16, 185, 129, 0.45)',
                borderRadius: '16px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.9rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      📲 PLANTILLA OFICIAL WHATSAPP
                    </span>
                    <h3 style={{ margin: '0.15rem 0 0 0', fontSize: '1.1rem', fontWeight: 900 }}>
                      Vista Previa Lista para Enviar
                    </h3>
                  </div>

                  <div className="no-print-fuego" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>Título:</label>
                    <input
                      type="text"
                      value={tituloSufijo}
                      onChange={(e) => {
                        setTituloSufijo(e.target.value);
                        saveEventConfigPatch({ tituloSufijo: e.target.value });
                      }}
                      placeholder="Ej. C2"
                      style={{
                        width: '95px',
                        padding: '0.35rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 800
                      }}
                    />
                  </div>
                </div>

                {/* Burbuja estilo WhatsApp idéntica a la plantilla */}
                <div style={{
                  background: '#ffffff',
                  color: '#111827',
                  borderRadius: '14px',
                  padding: '1.15rem 1.25rem',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontSize: '0.95rem',
                  lineHeight: 1.48,
                  whiteSpace: 'pre-wrap',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.45)',
                  borderLeft: '5px solid #25D366'
                }}>
                  {whatsappReportText.split('\n').map((line, i) => {
                    const boldReplaced = line.split(/(\*[^*]+\*)/g).map((part, j) => {
                      if (part.startsWith('*') && part.endsWith('*')) {
                        return <strong key={j} style={{ color: '#0f172a', fontWeight: 800 }}>{part.slice(1, -1)}</strong>;
                      }
                      return <span key={j}>{part}</span>;
                    });
                    return <div key={i} style={{ minHeight: line === '' ? '0.65rem' : 'auto' }}>{boldReplaced}</div>;
                  })}
                </div>

                {/* Opciones de formato de la plantilla */}
                <div className="no-print-fuego" style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.76rem', color: '#cbd5e1', background: '#0b1120', padding: '0.75rem', borderRadius: '10px', border: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <span>Bloque C2 en reporte:</span>
                    <select
                      value={includeC2Mode}
                      onChange={(e) => {
                        setIncludeC2Mode(e.target.value);
                        saveEventConfigPatch({ includeC2Mode: e.target.value });
                      }}
                      style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.73rem', fontWeight: 700 }}
                    >
                      <option value="AUTO">Automático (si C2 &gt; 0)</option>
                      <option value="YES">Mostrar siempre</option>
                      <option value="NO">Ocultar bloque C2</option>
                    </select>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showTeamNameInHeader}
                      onChange={(e) => {
                        setShowTeamNameInHeader(e.target.checked);
                        saveEventConfigPatch({ showTeamNameInHeader: e.target.checked });
                      }}
                    />
                    Mostrar número de equipo junto a cada FDS (ej. 1er FDS (Equipo 31))
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={includeStaffFooter}
                      onChange={(e) => {
                        setIncludeStaffFooter(e.target.checked);
                        saveEventConfigPatch({ includeStaffFooter: e.target.checked });
                      }}
                    />
                    Incluir Staff / Apoyo y Gran Total General al pie
                  </label>
                </div>

                {/* Botones de Acción del Reporte */}
                <div className="no-print-fuego" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
                  <button
                    onClick={handleCopyWhatsAppReport}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0.7rem 0.9rem',
                      fontSize: '0.8rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Copy size={15} /> {copiedReport ? '✓ ¡Copiado!' : 'Copiar Plantilla'}
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(whatsappReportText)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: '#16a34a',
                      color: '#fff',
                      textDecoration: 'none',
                      borderRadius: '10px',
                      padding: '0.7rem 0.9rem',
                      fontSize: '0.8rem',
                      fontWeight: 900,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Share2 size={15} /> Enviar WhatsApp
                  </a>

                  <button
                    onClick={handleDownloadCsv}
                    style={{
                      background: '#1e293b',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      borderRadius: '10px',
                      padding: '0.65rem 0.9rem',
                      fontSize: '0.77rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <FileSpreadsheet size={15} /> Exportar Excel (CSV)
                  </button>

                  <button
                    onClick={() => window.print()}
                    style={{
                      background: '#1e293b',
                      color: '#e2e8f0',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      padding: '0.65rem 0.9rem',
                      fontSize: '0.77rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Printer size={15} /> Imprimir / PDF
                  </button>
                </div>
              </div>

              {/* COLUMNA DERECHA: AUDITORÍA DE ASISTENCIA POR CADA EQUIPO Y GENERAL */}
              <div style={{
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '16px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    📊 CONTROL CONSOLIDADO EN TIEMPO REAL
                  </span>
                  <h3 style={{ margin: '0.15rem 0 0 0', fontSize: '1.1rem', fontWeight: 900 }}>
                    Asistencia por Cada Equipo, Roles y General
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                    Haz clic en cualquier equipo para desplegar la lista nominal de sus integrantes, revisar quién asistió o ajustar asignaciones.
                  </p>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                        <th style={{ padding: '0.55rem 0.4rem' }}>Equipo / Grupo</th>
                        <th style={{ padding: '0.55rem 0.4rem' }}>FDS</th>
                        <th style={{ padding: '0.55rem 0.4rem', textAlign: 'center' }}>Px</th>
                        <th style={{ padding: '0.55rem 0.4rem', textAlign: 'center' }}>MG</th>
                        <th style={{ padding: '0.55rem 0.4rem', textAlign: 'center' }}>Otros</th>
                        <th style={{ padding: '0.55rem 0.4rem', textAlign: 'center' }}>Reg.</th>
                        <th style={{ padding: '0.55rem 0.4rem', textAlign: 'center' }}>Check-in</th>
                        <th className="no-print-fuego" style={{ padding: '0.55rem 0.4rem', textAlign: 'right' }}>Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceSummary.teams.map((t) => {
                        const isExpanded = expandedTeamDetail === t.equipo;
                        const otrosCount =
                          countMode === 'ASISTIERON'
                            ? t.aliadosAsist + t.staffAsist
                            : t.aliadosReg + t.staffReg;
                        const pxShown = countMode === 'ASISTIERON' ? t.pxAsist : t.pxReg;
                        const mgShown = countMode === 'ASISTIERON' ? t.mgAsist : t.mgReg;

                        return (
                          <React.Fragment key={t.equipo}>
                            <tr
                              onClick={() => setExpandedTeamDetail(isExpanded ? null : t.equipo)}
                              style={{
                                borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
                                cursor: 'pointer',
                                background:
                                  t.equipo === 'Sin Equipo Asignado'
                                    ? 'rgba(180, 83, 9, 0.16)'
                                    : isExpanded
                                    ? 'rgba(56, 189, 248, 0.08)'
                                    : 'transparent'
                              }}
                            >
                              <td style={{ padding: '0.6rem 0.4rem', fontWeight: 800, color: t.equipo === 'Sin Equipo Asignado' ? '#fbbf24' : '#f8fafc' }}>
                                {t.equipo}
                              </td>
                              <td style={{ padding: '0.6rem 0.4rem', color: '#38bdf8', fontWeight: 700, fontSize: '0.72rem' }}>
                                {t.bloque}
                              </td>
                              <td style={{ padding: '0.6rem 0.4rem', textAlign: 'center', fontWeight: 800, color: '#fff' }}>
                                {pxShown}
                              </td>
                              <td style={{ padding: '0.6rem 0.4rem', textAlign: 'center', fontWeight: 800, color: '#fb923c' }}>
                                {mgShown}
                              </td>
                              <td style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: '#cbd5e1' }}>
                                {otrosCount}
                              </td>
                              <td style={{ padding: '0.6rem 0.4rem', textAlign: 'center', fontWeight: 800, color: '#e2e8f0' }}>
                                {t.totalReg}
                              </td>
                              <td style={{ padding: '0.6rem 0.4rem', textAlign: 'center', fontWeight: 800, color: '#34d399' }}>
                                {t.totalAsist}
                              </td>
                              <td className="no-print-fuego" style={{ padding: '0.6rem 0.4rem', textAlign: 'right', color: '#94a3b8' }}>
                                {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr>
                                <td colSpan={8} style={{ padding: '0.65rem', background: '#020617' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '280px', overflowY: 'auto' }}>
                                    {t.members.map((m) => (
                                      <div
                                        key={m.personKey}
                                        style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          gap: '0.5rem',
                                          padding: '0.4rem 0.6rem',
                                          background: '#0f172a',
                                          borderRadius: '7px',
                                          border: '1px solid #1e293b',
                                          flexWrap: 'wrap',
                                          fontSize: '0.74rem'
                                        }}
                                      >
                                        <div>
                                          <strong style={{ color: '#fff' }}>{m.nombreDisplay}</strong>{' '}
                                          <span style={{ color: '#94a3b8' }}>({m.documentoDisplay})</span> ·{' '}
                                          <span style={{ color: '#fb923c', fontWeight: 700 }}>{m.categoriaReporte}</span>
                                        </div>
                                        <div className="no-print-fuego" style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                          <select
                                            value={m.equipoAsignado || ''}
                                            onChange={(e) => handleUpdatePersonAssignment(m, { equipoAsignado: e.target.value })}
                                            style={{ padding: '0.2rem 0.4rem', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 700 }}
                                          >
                                            {EQUIPO_OPTIONS.map((opt) => (
                                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                          </select>
                                          <button
                                            onClick={() => handleUpdatePersonAssignment(m, { asistio: !m.asistio })}
                                            style={{
                                              background: m.asistio ? '#059669' : '#1e293b',
                                              color: '#fff',
                                              border: '1px solid #334155',
                                              borderRadius: '5px',
                                              padding: '0.22rem 0.5rem',
                                              fontSize: '0.68rem',
                                              fontWeight: 800,
                                              cursor: 'pointer'
                                            }}
                                          >
                                            {m.asistio ? '✓ Asistió' : 'Check-in'}
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}

                      {/* Fila Total General */}
                      <tr style={{ borderTop: '2px solid #f59e0b', background: 'rgba(245, 158, 11, 0.1)', fontWeight: 900 }}>
                        <td style={{ padding: '0.7rem 0.4rem', color: '#fbbf24' }}>TOTAL GENERAL</td>
                        <td style={{ padding: '0.7rem 0.4rem', color: '#fbbf24' }}>SALA</td>
                        <td style={{ padding: '0.7rem 0.4rem', textAlign: 'center', color: '#fff' }}>
                          {countMode === 'ASISTIERON'
                            ? roster.filter((r) => r.categoriaReporte === 'Px' && r.asistio).length
                            : stats.totalPx}
                        </td>
                        <td style={{ padding: '0.7rem 0.4rem', textAlign: 'center', color: '#fb923c' }}>
                          {countMode === 'ASISTIERON'
                            ? roster.filter((r) => r.categoriaReporte === 'MG' && r.asistio).length
                            : stats.totalMg}
                        </td>
                        <td style={{ padding: '0.7rem 0.4rem', textAlign: 'center', color: '#e2e8f0' }}>
                          {attendanceSummary.aliadosActive + attendanceSummary.staffActive}
                        </td>
                        <td style={{ padding: '0.7rem 0.4rem', textAlign: 'center', color: '#fff' }}>
                          {attendanceSummary.totalRegistrados}
                        </td>
                        <td style={{ padding: '0.7rem 0.4rem', textAlign: 'center', color: '#34d399' }}>
                          {attendanceSummary.totalAsistieron}
                        </td>
                        <td className="no-print-fuego" />
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Desglose adicional de Aliados y Staff por sub-rol */}
                <div style={{
                  background: '#0b1120',
                  border: '1px solid #1e293b',
                  borderRadius: '10px',
                  padding: '0.8rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  fontSize: '0.76rem'
                }}>
                  <strong style={{ color: '#e2e8f0', fontSize: '0.78rem' }}>Desglose General de Aliados, Staff y Apoyo:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '0.2rem' }}>
                    <span style={{ background: '#1e293b', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #334155' }}>
                      🤝 Aliados: <strong style={{ color: '#fbbf24' }}>{attendanceSummary.aliadosReg} reg.</strong> ({attendanceSummary.aliadosAsist} check-in)
                    </span>
                    {Object.entries(attendanceSummary.staffBySubRole).map(([subRol, val]) => (
                      <span key={subRol} style={{ background: '#1e293b', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #334155' }}>
                        🛡️ {subRol}: <strong style={{ color: '#38bdf8' }}>{val.reg} reg.</strong> ({val.asist} check-in)
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================
            PESTAÑA 3: PADRÓN OFICIAL LIMA (111 MIEMBROS)
           ======================================================================== */}
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
                  const docInfo = `${sig.tipoDocDisplay}: ${sig.documentoDisplay}`;
                  const time = sig.fecha || sig.timestamp || 'Fecha verificada';
                  const lugar = sig.lugar || 'Lima - Casona Blanca (Huachipa)';

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
                            ✓ FIRMADO
                          </span>
                          <span style={{ background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            {item.equipo} · {item.cohorte}
                          </span>
                          <span style={{ background: 'rgba(249, 115, 22, 0.1)', color: '#fb923c', border: '1px solid rgba(249, 115, 22, 0.25)', fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            {sig.rolOriginal || item.rol}
                          </span>
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#fff' }}>{item.nombre}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginTop: '0.35rem', fontSize: '0.75rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                          <span>🆔 <strong style={{ color: '#e2e8f0' }}>{docInfo}</strong></span>
                          <span>📍 <strong style={{ color: '#fde047' }}>{lugar}</strong></span>
                          <span>🕒 <strong style={{ color: '#cbd5e1' }}>{time}</strong></span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleUpdatePersonAssignment(sig, { asistio: !sig.asistio })}
                          style={{
                            background: sig.asistio ? 'rgba(16, 185, 129, 0.22)' : 'rgba(56, 189, 248, 0.16)',
                            color: sig.asistio ? '#34d399' : '#38bdf8',
                            border: sig.asistio ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(56, 189, 248, 0.4)',
                            borderRadius: '8px',
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <CheckCircle2 size={15} /> {sig.asistio ? '✓ Asistió en Sala' : 'Marcar Check-in'}
                        </button>
                      </div>
                    </div>
                  );
                }

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
                      <PhoneCall size={14} /> Recordar por WhatsApp
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Contingencia Manual */}
        {showManualModal && (
          <div
            onClick={() => setShowManualModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.82)',
              backdropFilter: 'blur(6px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
          >
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleCreateManualAttendee}
              style={{
                background: '#0f172a',
                border: '1px solid rgba(249, 115, 22, 0.45)',
                borderRadius: '16px',
                padding: '1.5rem',
                maxWidth: '420px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>
                ➕ Registrar Asistente en Sala (Contingencia)
              </h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#94a3b8' }}>
                Úsalo si una persona asistió físicamente sin celular para que quede asignada a su equipo y cuadre el reporte final.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.3rem' }}>Nombre y Apellidos *</label>
                <input
                  type="text"
                  required
                  value={manualForm.nombre}
                  onChange={(e) => setManualForm((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej. María Gómez"
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.3rem' }}>DNI / Documento</label>
                  <input
                    type="text"
                    value={manualForm.numeroDocumento}
                    onChange={(e) => setManualForm((p) => ({ ...p, numeroDocumento: e.target.value }))}
                    placeholder="Opcional"
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.3rem' }}>Categoría *</label>
                  <select
                    value={manualForm.categoriaReporte}
                    onChange={(e) => setManualForm((p) => ({ ...p, categoriaReporte: e.target.value }))}
                    style={{ width: '100%', padding: '0.6rem 0.5rem', borderRadius: '8px' }}
                  >
                    {CATEGORIA_REPORTE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.3rem' }}>Equipo / Grupo *</label>
                <select
                  value={manualForm.equipoAsignado}
                  onChange={(e) => setManualForm((p) => ({ ...p, equipoAsignado: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px' }}
                >
                  {EQUIPO_OPTIONS.filter((o) => o.value !== '').map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  Guardar y Marcar Asistencia
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  style={{
                    background: '#1e293b',
                    color: '#cbd5e1',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '0.65rem 1rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
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
                position: 'relative'
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
