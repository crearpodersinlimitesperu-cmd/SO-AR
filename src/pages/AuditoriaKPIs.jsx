import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useTheme } from '../context/ThemeContext';
import { collection, getDocs, getDoc, updateDoc, doc, query, orderBy, limit } from 'firebase/firestore';
import { db, auth, getDocResilient } from '../services/firebase';
import { CheckCircle2, AlertCircle, ArrowLeft, Users, Target, PhoneCall } from 'lucide-react';
import CountryFlag from '../components/CountryFlag';
import { recordAuditEvent } from '../services/auditService';
import { OPERATIONAL_SEDES } from '../data/usersData';
import DriveDashboard from '../components/DriveDashboard';
import CMJDashboard from '../components/CMJDashboard';
import NodusCoordinadoresC1C2Dashboard from '../components/NodusCoordinadoresC1C2Dashboard';
import ThemeSelector from '../components/ThemeSelector';
import ZenModeSelector from '../components/ZenModeSelector';

export default function AuditoriaKPIs({ defaultTab }) {
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  // (09/09/2026) Vista Zen — pedido de José: "que funcione para todos los usuarios".
  // Antes el toggle Vista Zen (ZenModeSelector) cambiaba currentUser/zenMode en el
  // ThemeContext, pero en esta página ninguna sección lo consultaba — encenderlo no
  // ocultaba nada aquí, solo dentro de NodusCoordinadoresC1C2Dashboard. Ahora se usa
  // como "modo enfoque": oculta filtros/ruido y deja solo las tarjetas y números clave.
  const { zenMode } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [resumenGeneral, setResumenGeneral] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'pending' | 'reviewed'
    
  // Default to 'Todas' for SuperAdmins, Direccion, Consolidado or SuperUser, otherwise user's home sede
  const isSuperUser = Boolean(
    currentUser?.isSuperAdmin ||
    currentUser?.appRole === 'direccion' ||
    currentUser?.appRole === 'superadmin' ||
    currentUser?.appRole === 'consolidado' ||
    currentUser?.isConsolidatedView ||
    currentUser?.email === 'jose.sanchez@crearpsl.net' ||
    (currentUser?.emails && currentUser.emails.includes('jose.sanchez@crearpsl.net'))
  );

  const initialSede = isSuperUser ? 'Todas' : (currentUser?.sede || 'Todas');
  const [filterSede, setFilterSede] = useState(initialSede);
    
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // (09/09/2026) Filtro rápido de fecha — pedido de José: filtrar los reportes que YA
  // están cargados en pantalla, al instante, sin disparar una extracción nueva de Nodus
  // (eso es lo que hacen startDate/endDate + handleLiveFilter, más abajo — un proceso
  // distinto que tarda 1-5 minutos). Estado separado a propósito para no mezclar los dos
  // flujos ni cambiar el comportamiento de "Filtrar" que ya funciona.
  const [quickDateFrom, setQuickDateFrom] = useState('');
  const [quickDateTo, setQuickDateTo] = useState('');
  const [isScrapingLive, setIsScrapingLive] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab || 'coordinadores_nodus'); // 'coordinadores_nodus', 'cmj', 'entrenadores', 'auditoria'
  const sedesDisponibles = ['Todas', ...OPERATIONAL_SEDES];

  // Helper para identificar el envío más reciente por coordinadora y etapa
  // Esto garantiza una sumatoria coherente sin duplicar números si una coordinadora envía varias veces
  const tagLatestReports = (list) => {
    const sorted = [...(list || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const seen = new Set();
    return sorted.map(rep => {
      const coordName = (rep.userName || rep.coordinator || '').trim().toLowerCase();
      const coordSede = (rep.sede || '').trim().toLowerCase();
      const coordStage = (rep.stage || rep.tipoReporte || '').trim().toLowerCase();
      const key = `${coordName}__${coordSede}__${coordStage}`;
      if (!seen.has(key)) {
        seen.add(key);
        return { ...rep, isLatest: true };
      }
      return { ...rep, isLatest: false };
    });
  };

  useEffect(() => {
    fetchReports();
  }, [filterSede, currentUser?.sede]);

  // Vista por defecto inteligente: si no hay pendientes (pendingCount === 0) y el filtro estaba en 'pending',
  // cambia automáticamente a 'all' (Todos) para que el usuario siempre vea los datos por defecto.
  useEffect(() => {
    if (!loading && reports.length > 0) {
      const pendingCount = reports.filter(r => r.status !== 'reviewed').length;
      if (pendingCount === 0 && filterStatus === 'pending') {
        setFilterStatus('all');
      }
    }
  }, [reports, loading]);

  const parseNodusData = (data) => {
    let allData = [];
    if (data.secciones && data.secciones.actividadCoordinadores && data.secciones.actividadCoordinadores.kpis) {
      const kpisList = data.secciones.actividadCoordinadores.kpis;
      kpisList.forEach((kpi, index) => {
        const content = kpi.content;
        if (content && content.length > 5 && content[0].includes(' ')) {
          const nameParts = content[0].split(' ');
          const name = nameParts[0];
          const sede = nameParts.slice(1).join(' ');
          
          const gestiones = content.includes('Gestiones') ? content[content.indexOf('Gestiones') - 1] : '0';
          const asignados = content.includes('Asignados') ? content[content.indexOf('Asignados') - 1] : '0';
          
          const confirmadosStr = content.find(c => c.startsWith('Confirmado:'));
          const confirmados = confirmadosStr ? confirmadosStr.split(': ')[1] : '0';
          
          let roleStr = 'coord_c1';
          const sedeUpper = sede.toUpperCase();
          if (sedeUpper.includes('MAESTR') || sedeUpper.includes('MJ')) {
            roleStr = 'coord_maestria';
          } else if (sedeUpper.includes('QT') || sedeUpper.includes('QUANTUM')) {
            roleStr = 'qt';
          }

          const dynamicMetrics = [];
          const statusPills = [];
          // (02/09/2026) FIX — verificado contra nodus_latest_snapshot.json real:
          // 1) content[1] no siempre empieza con "Últ." (ej. Nodus manda literalmente
          //    "Sin conexiones registradas" para coordinadores sin login reciente).
          //    Antes esto se colaba como una métrica sin sentido ("Sin conexiones
          //    registradas: 0"). Ahora content[1] se salta siempre, sea cual sea su texto.
          // 2) La lista fija de palabras clave (Confirmado/Siguiente/En espera/Cierre)
          //    dejaba fuera estados reales de Nodus como "Por Confirmar", "No Contesta",
          //    "No le Interesa", "Ya Asistiá" y "Devolución", que caían como tarjetas de
          //    métrica plana en vez de pill de estado. En los datos reales, Nodus separa
          //    las "métricas duras" (Gestiones/C1/C2/Asignados/Cobertura) de los "estados
          //    de gestión" (Confirmado, Por Confirmar, No Contesta, etc.) con el marcador
          //    "Últ. gestión: ...". Todo par "Etiqueta: Valor" que aparece DESPUÉS de ese
          //    marcador es, por construcción, un estado de gestión — sin necesitar una
          //    lista de palabras clave que quede desactualizada si Nodus agrega estados.
          let pastUltGestion = false;
          for(let i = 1; i < content.length; i++) {
            const str = content[i];
            if (!str || typeof str !== 'string') continue;
            if (i === 1 || str.startsWith('Últ.')) {
              if (str.startsWith('Últ. gestión')) pastUltGestion = true;
              continue;
            }

            if (str.includes(':')) {
              const parts = str.split(':');
              const label = parts[0].trim();
              const val = parts.slice(1).join(':').trim();

              if (pastUltGestion) {
                statusPills.push({ label, value: val });
              } else {
                dynamicMetrics.push({ label, value: val });
              }
              continue;
            }
            
            if (/[a-zA-Z]/.test(str)) { 
              let val = '';
              if (i > 0 && /^[0-9]/.test(content[i-1]) && !/[a-zA-Z]/.test(content[i-1])) {
                  val = content[i-1];
              } else if (i < content.length - 1 && /^[0-9]/.test(content[i+1])) {
                  val = content[i+1];
              }
              if (val) {
                  let label = str.trim();
                  if (label.includes('Cobertura')) label = 'Cobertura';
                  dynamicMetrics.push({ label, value: val });
              }
            }
          }

          const totalOkParsed = parseInt(confirmados) || 0;
          allData.push({
            id: `nodus_${index}`,
            userName: name,
            team: sede,
            coordinator: name,
            sede: sede,
            role: roleStr,
            stage: roleStr === 'coord_maestria' ? 'MJ' : 'C1',
            gestionesTotal: parseInt(gestiones) || 0,
            asignados: parseInt(asignados) || 0,
            dynamicMetrics: dynamicMetrics,
            statusPills: statusPills,
            totalOk: totalOkParsed,
            nuevosOk: totalOkParsed,
            rezagadosOk: 0,
            status: 'pending',
            createdAt: data.timestamp || new Date().toISOString(),
            rawContent: content
          });
        }
      });
    }
    return allData;
  };

  // (02/09/2026) NUEVO — pedido de José: "ver por ciclos de cada sede... es
  // decir capitulo uno capitulo dos maestria del juego". Verificado contra el
  // archivo real nodus_latest_snapshot.json (exportado por José con
  // scripts/exportarNodusSnapshot.mjs el 02/09/2026): dentro de
  // secciones.dashboardPrincipal.tablas hay una tabla con headers
  // ['Entrenamiento','Participantes'] y 3 filas (Capítulo 1, Capítulo 2,
  // Maestría) — es el ÚNICO desglose C1/C2/MJ que Nodus expone, y es un
  // AGREGADO del alcance completo (no es por coordinador ni por equipo).
  // También hay una tarjeta con content[0]==='Alcance' que indica qué sede ve
  // el robot en esa corrida — en los datos reales revisados siempre aparece
  // "LIMA CICLO 1", etiquetada por Nodus como "Tu sede". No está verificado
  // si la cuenta del robot (NODUS_USER/NODUS_PASSWORD) puede ver otras sedes
  // — por eso este resumen se muestra siempre junto con el "alcance" real
  // devuelto por Nodus, nunca como si cubriera todas las sedes.
  const parseResumenGeneral = (data) => {
    if (!data || !data.secciones || !data.secciones.dashboardPrincipal) return null;

    const dash = data.secciones.dashboardPrincipal;

    let alcance = null;
    const alcanceCard = (dash.kpis || []).find(k => k.content && k.content[0] === 'Alcance');
    if (alcanceCard) alcance = alcanceCard.content[1] || null;

    const tabla = (dash.tablas || []).find(t =>
      t.headers && t.headers.includes('Entrenamiento') && t.headers.includes('Participantes')
    );

    if (!tabla) {
      return alcance ? { alcance, capitulo1: null, capitulo2: null, maestria: null, total: null, timestamp: data.timestamp || null } : null;
    }

    const toNum = (v) => parseInt(String(v || '0').replace(/[^0-9]/g, ''), 10) || 0;
    const porNombre = (nombre) => {
      const fila = tabla.rows.find(r => (r['Entrenamiento'] || '').toUpperCase().includes(nombre));
      return fila ? toNum(fila['Participantes']) : null;
    };

    const capitulo1 = porNombre('CAPÍTULO 1') ?? porNombre('CAPITULO 1');
    const capitulo2 = porNombre('CAPÍTULO 2') ?? porNombre('CAPITULO 2');
    const maestria = porNombre('MAESTR');

    const valores = [capitulo1, capitulo2, maestria];
    const total = valores.some(v => v != null) ? valores.reduce((acc, v) => acc + (v || 0), 0) : null;

    return { alcance, capitulo1, capitulo2, maestria, total, timestamp: data.timestamp || null };
  };

  // Agrupa las tarjetas de coordinadores por el nombre de sede/ciclo tal cual
  // lo devuelve Nodus (hoy: "LIMA CICLO 1"). Si en el futuro el robot alcanza
  // más de una sede en una misma corrida, esto ya las separa automáticamente
  // sin cambios adicionales.
  const groupBySede = (list) => {
    const map = new Map();
    (list || []).forEach(r => {
      const key = r.sede || 'Sin sede';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    return map;
  };

  // (02/09/2026) FIX + pedido de José ("extraer datos en tiempo real de
  // Nodus para saber cómo van los CC1Y2"): esto antes llamaba a
  // 'http://localhost:3001/api/scrape-nodus', una dirección que solo existe
  // en la máquina de quien lo desarrolló — en producción siempre fallaba con
  // "Failed to fetch" (el error de tu captura). El robot de Nodus SÍ soporta
  // scrapear en vivo con rango de fechas (runScraperWithDates en
  // scripts/nodusScraper.js), pero corre con Puppeteer — necesita un
  // navegador real, no puede correr en el Worker de Cloudflare ni en el
  // navegador del usuario. Ahora se dispara vía GitHub Actions (mismo
  // mecanismo que el botón "Extraer Nodus" de Super Admin, mismo endpoint
  // del Worker, con startDate/endDate) y NO es instantáneo: tarda 1-3
  // minutos en loguearse a Nodus y recorrer las páginas. Este flujo espera
  // el resultado con sondeos (polling) al documento
  // nodus_kpis_sincronizados/live_filtered en vez de bloquear con un solo
  // fetch síncrono.
  const handleLiveFilter = async () => {
    if (!startDate || !endDate) {
      showToast("Por favor selecciona Desde y Hasta para filtrar en Nodus", "warning");
      return;
    }

    setIsScrapingLive(true);
    showToast("Disparando extracción en vivo de Nodus (tarda 1-3 minutos)...", "info");

    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('No se detectó sesión activa. Cierra sesión e inicia nuevamente.');
      const idToken = await firebaseUser.getIdToken(true);
      const workerUrl = import.meta.env.VITE_COPILOTO_WORKER_URL || 'https://so-ar-copiloto.crearpsl-cpsl.workers.dev';

      const dispatchStartedAt = Date.now();

      const res = await fetch(`${workerUrl}/trigger-nodus-scraper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ startDate, endDate })
      });
      const dispatchData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dispatchData.message || 'No se pudo disparar la extracción filtrada.');

      showToast("Extracción disparada. Buscando el resultado cada 15 segundos (hasta 5 minutos)...", "info");

      // Polling: hasta 5 minutos, cada 15s, contra el documento que
      // nodusScraper.js escribe SOLO cuando corre con fechas (nunca pisa
      // 'latest_snapshot'). Se compara con dispatchStartedAt para no mostrar
      // por error el resultado de una corrida filtrada anterior.
      const POLL_INTERVAL_MS = 15000;
      const MAX_WAIT_MS = 5 * 60 * 1000;
      const liveRef = doc(db, 'nodus_kpis_sincronizados', 'live_filtered');
      let found = false;

      while (Date.now() - dispatchStartedAt < MAX_WAIT_MS) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
        const snap = await getDoc(liveRef);
        if (snap.exists()) {
          const data = snap.data();
          const dataTime = data.timestamp ? new Date(data.timestamp).getTime() : 0;
          if (dataTime >= dispatchStartedAt) {
            const parsedData = parseNodusData(data);
            setReports(tagLatestReports(parsedData));
            setResumenGeneral(parseResumenGeneral(data));
            showToast("Datos de Nodus (filtrados por fecha) actualizados.", "success");
            found = true;
            break;
          }
        }
      }

      if (!found) {
        showToast("La extracción está tardando más de 5 minutos o el resultado no llegó aún. Espera un momento y vuelve a apretar 'Filtrar' — cada clic dispara una nueva extracción.", "warning");
      }
    } catch (err) {
      console.error(err);
      showToast("Error al extraer datos de Nodus: " + err.message, "error");
    } finally {
      setIsScrapingLive(false);
    }
  };

  const getLocalReports = () => {
    try {
      const saved = localStorage.getItem('cpsl_kpi_reports_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filtrar y purgar cualquier dato falso o de prueba antiguo
          const clean = parsed.filter(r => r && !r.id?.startsWith('kpi_seed_'));
          if (clean.length !== parsed.length) {
            saveLocalReports(clean);
          }
          return clean;
        }
      }
    } catch (e) {
      console.warn("Error leyendo reportes locales:", e);
    }
    return [];
  };

  const saveLocalReports = (list) => {
    try {
      const cleanList = (list || []).filter(r => r && !r.id?.startsWith('kpi_seed_'));
      localStorage.setItem('cpsl_kpi_reports_v1', JSON.stringify(cleanList));
    } catch (e) {}
  };

    const fetchReports = async () => {
    setLoading(true);

    try {
      let allData = [];

      // 1. Cargar reportes operativos reales enviados desde el Centro de Reportes (Firestore 'reports')
      try {
        const reportsSnap = await getDocs(query(collection(db, 'reports'), orderBy('created_at', 'desc'), limit(500)));
        reportsSnap.docs.forEach(docSnap => {
          const r = docSnap.data();
          const data = r.data || {};
          
          const statusPills = [];
          const dynamicMetrics = [];
          let nuevosOk = 0;
          let rezagadosOk = 0;
          let totalOk = 0;
          
          if (r.type === 'Llamadas') {
            nuevosOk = Number(data.nuevos_OK || 0);
            rezagadosOk = Number(data.rezagados_OK || 0);
            totalOk = nuevosOk + rezagadosOk;
            
            dynamicMetrics.push({ label: 'Total OK (Confirmados)', value: String(totalOk) });
            dynamicMetrics.push({ label: 'Nuevos OK', value: String(nuevosOk) });
            dynamicMetrics.push({ label: 'Rezagados OK', value: String(rezagadosOk) });
            
            if (data.rezagados_NC) statusPills.push({ label: 'No Contesta', value: String(data.rezagados_NC) });
            if (data.rezagados_SIG) statusPills.push({ label: 'Siguiente', value: String(data.rezagados_SIG) });
            if (data.nuevos_PENDIENTES || data.rezagados_PENDIENTES) {
              const pend = (Number(data.nuevos_PENDIENTES || 0) + Number(data.rezagados_PENDIENTES || 0));
              statusPills.push({ label: 'Pendientes', value: String(pend) });
            }
          } else {
            Object.entries(data).forEach(([k, v]) => {
              if (typeof v === 'number' || typeof v === 'string') {
                dynamicMetrics.push({ label: k.replace(/_/g, ' '), value: String(v) });
              }
            });
          }

          const isRev = r.status === 'reviewed' || !!r.reviewedBy || !!r.reviewed_by;

          allData.push({
            id: docSnap.id,
            userName: r.submitted_by || 'Coordinadora',
            coordinator: r.submitted_by || 'Coordinadora',
            sede: r.sede || 'Lima',
            stage: r.stage || (r.type === 'Llamadas' ? 'C1' : ''),
            role: r.stage === 'MJ' ? 'coord_maestria' : 'coord_c1',
            status: isRev ? 'reviewed' : (r.status || 'pending'),
            reviewedBy: r.reviewedBy || r.reviewed_by || null,
            reviewedAt: r.reviewedAt || r.reviewed_at || null,
            createdAt: r.created_at || new Date().toISOString(),
            dynamicMetrics,
            statusPills,
            tipoReporte: r.type,
            totalOk,
            nuevosOk,
            rezagadosOk,
            data,
            rawContent: [r.submitted_by, r.sede, r.type]
          });
        });
      } catch (err) {
        console.warn("Aviso: No se pudo leer collection 'reports':", err);
      }

      // 1.1 Cargar reportes individuales de MisKPIs (Firestore 'kpi_reports' y respaldo local)
      try {
        let kpiReportsSnap = null;
        try {
          kpiReportsSnap = await getDocs(query(collection(db, 'kpi_reports'), orderBy('createdAt', 'desc'), limit(500)));
        } catch (_) {}

        let kpiList = [];
        if (kpiReportsSnap && !kpiReportsSnap.empty) {
          kpiList = kpiReportsSnap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate().toISOString() : d.data().createdAt
          }));
        }

        // Combinar con reportes locales de cpsl_kpi_reports_v1
        const localKpi = getLocalReports();
        const existingKpiIds = new Set(kpiList.map(k => k.id));
        localKpi.forEach(lr => {
          if (lr && lr.id && !existingKpiIds.has(lr.id) && !lr.id.startsWith('kpi_seed_')) {
            kpiList.push(lr);
          }
        });

        kpiList.forEach(r => {
          if (!r || r.id?.startsWith('kpi_seed_')) return;
          const data = r.data || {};
          const dynamicMetrics = [];
          Object.entries(data).forEach(([k, v]) => {
            if (typeof v === 'number' || typeof v === 'string') {
              dynamicMetrics.push({ label: k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' '), value: String(v) });
            }
          });

          const isRev = r.status === 'reviewed' || !!r.reviewedBy;
          const personName = r.targetUserName || r.userName || 'Coordinador';
          const personSede = r.targetUserSede || r.userSede || 'Lima';

          allData.push({
            id: r.id,
            userName: personName,
            coordinator: personName,
            submittedBy: r.submittedBy || r.userName,
            sede: personSede,
            stage: r.targetRole === 'coord_maestria' ? 'MJ' : 'C1',
            role: r.targetRole || r.role || 'coord_c1',
            status: isRev ? 'reviewed' : (r.status || 'pending'),
            reviewedBy: r.reviewedBy || null,
            reviewedAt: r.reviewedAt || null,
            createdAt: r.createdAt || new Date().toISOString(),
            dynamicMetrics,
            customMetas: r.customMetas || null,
            statusPills: [],
            tipoReporte: r.targetRoleName || r.roleName || 'Reporte de KPIs Individuales',
            data,
            rawContent: [personName, personSede, r.targetRoleName || r.roleName]
          });
        });
      } catch (err) {
        console.warn("Aviso al cargar 'kpi_reports' en AuditoriaKPIs:", err);
      }

      // 2. Cargar snapshot de Nodus
      const nodusRef = doc(db, 'nodus_kpis_sincronizados', 'latest_snapshot');
      const nodusSnap = await getDocResilient(nodusRef);
      
      if (nodusSnap.exists()) {
        const snapData = nodusSnap.data();
        const nodusParsed = parseNodusData(snapData);
        allData = [...allData, ...nodusParsed];
        setResumenGeneral(parseResumenGeneral(snapData));
      } else {
        setResumenGeneral(null);
      }

      // Filtrar por sede
      const isGlobal = !currentUser?.sede || currentUser?.sede === 'Sede Global' || currentUser?.sede === 'Global' || currentUser?.appRole === 'direccion' || currentUser?.isSuperAdmin;
      const sedeToFilter = isGlobal ? filterSede : currentUser?.sede;

      let filtered = allData;
      if (sedeToFilter && sedeToFilter !== 'Todas') {
        // Adaptación flexible del nombre de la sede
        const searchTerm = sedeToFilter.toUpperCase().replace('SEDE ', '');
        filtered = filtered.filter(r => r.sede && r.sede.toUpperCase().includes(searchTerm));
      }

      // MERGE LOCAL REVIEW STATUS
      const localReviews = getLocalReports();
      filtered = filtered.map(r => {
        const local = localReviews.find(l => l.id === r.id);
        if (local && local.status) {
          return { ...r, status: local.status, reviewedBy: local.reviewedBy, reviewedAt: local.reviewedAt };
        }
        return r;
      });

      // Tag latest report per coordinator and stage for coherent sum
      filtered = tagLatestReports(filtered);

      setReports(filtered);
    } catch (error) {
      if (error.code === 'permission-denied') {
        console.error("Sesión expirada: Firestore rechazó la lectura", error);
        showToast("Sesión expirada. Por favor, cierra sesión y entra de nuevo.", 'error');
      } else {
        console.warn("Aviso: Error cargando Nodus", error);
      }
    }

    setLoading(false);
  };

  const handleToggleReviewed = async (reportId, currentStatus) => {
    const isCurrentlyReviewed = currentStatus === 'reviewed';
    const nextStatus = isCurrentlyReviewed ? 'pending' : 'reviewed';
    const reviewerName = currentUser?.name || currentUser?.displayName || 'Dirección / Gerencia';
    const nowIso = new Date().toISOString();

    // Actualizar localmente de inmediato
    const updated = reports.map(r => r.id === reportId ? {
      ...r,
      status: nextStatus,
      reviewedBy: nextStatus === 'reviewed' ? reviewerName : null,
      reviewedAt: nextStatus === 'reviewed' ? nowIso : null
    } : r);
    setReports(updated);

    let allLocal = getLocalReports();
    const existing = allLocal.find(r => r.id === reportId);
    if (existing) {
      existing.status = nextStatus;
      existing.reviewedBy = nextStatus === 'reviewed' ? reviewerName : null;
      existing.reviewedAt = nextStatus === 'reviewed' ? nowIso : null;
    } else {
      allLocal.push({ id: reportId, status: nextStatus, reviewedBy: nextStatus === 'reviewed' ? reviewerName : null, reviewedAt: nextStatus === 'reviewed' ? nowIso : null });
    }
    saveLocalReports(allLocal);

    showToast(nextStatus === 'reviewed' ? "Reporte marcado como revisado" : "Reporte regresado a pendiente", "success");

    // Intentar sync en Firestore en background
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status: nextStatus,
        reviewedBy: nextStatus === 'reviewed' ? reviewerName : null,
        reviewed_by: nextStatus === 'reviewed' ? reviewerName : null,
        reviewedAt: nextStatus === 'reviewed' ? new Date() : null
      });
    } catch (_) {
      try {
        await updateDoc(doc(db, 'kpi_reports', reportId), {
          status: nextStatus,
          reviewedBy: nextStatus === 'reviewed' ? reviewerName : null,
          reviewedAt: nextStatus === 'reviewed' ? new Date() : null
        });
      } catch (e) {
        console.warn("Aviso Firestore al actualizar reporte:", e);
      }
    }

    try {
      await recordAuditEvent({
        email: currentUser?.email || 'admin',
        name: reviewerName,
        role: currentUser?.appRole || 'gerente',
        sede: currentUser?.sede || 'Global',
        action: nextStatus === 'reviewed' ? 'AUDITORIA_KPI_REVISADO' : 'AUDITORIA_KPI_REABIERTO',
        details: `Reporte ${reportId} ${nextStatus === 'reviewed' ? 'aprobado y auditado' : 'reabierto a pendiente'} por ${reviewerName}`
      });
    } catch (e) {
      console.warn("Aviso auditoría:", e);
    }
  };

  const handleMarkAsReviewed = (reportId) => handleToggleReviewed(reportId, 'pending');

  // Helpers de visualización
  const resolveTargetForMetric = (label, customMetas = {}) => {
    const l = (label || '').toLowerCase();
    if (l.includes('asistencia')) return { target: customMetas.asistencia ?? 95, isInverse: false };
    if (l.includes('retencion') || l.includes('desercion')) return { target: customMetas.retencion ?? 10, isInverse: true };
    if (l.includes('conversion c1') || l.includes('c1 a c2')) return { target: customMetas.conversionC1C2 ?? 50, isInverse: false };
    if (l.includes('c2 a mj') || l.includes('movimiento')) return { target: customMetas.conversionC2MJ ?? 70, isInverse: false };
    if (l.includes('breakthrough')) return { target: customMetas.declaracionBreakthrough ?? 90, isInverse: false };
    if (l.includes('aliados')) return { target: customMetas.declaracionAliados ?? 40, isInverse: false };
    if (l.includes('rotas')) return { target: customMetas.palabrasRotas ?? 5, isInverse: true };
    if (l.includes('eficiencia') || l.includes('gestion')) return { target: customMetas.eficienciaGestion ?? 100, isInverse: false };
    return null;
  };

  // Helpers de visualizaciÃ³n con soporte de metas individuales
  const renderC1Data = (report = {}) => {
    const data = report.data || report;
    const customMetas = report.customMetas || {};
    return (
      <div style={{ marginTop: '1rem' }}>
        {report.customMetas && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--crear-gold, #f59e0b)', background: 'rgba(245, 158, 11, 0.08)', padding: '0.2rem 0.6rem', borderRadius: '6px', marginBottom: '0.8rem', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
            <Target size={14} /> Evaluado con metas personalizadas individuales para {report.userName || 'esta persona'}
          </div>
        )}
        {data.dynamicMetrics && data.dynamicMetrics.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            {data.dynamicMetrics.map((m, i) => {
               const numericVal = parseFloat(String(m.value).replace(/[^0-9.]/g, '')) || 0;
               const resolved = resolveTargetForMetric(m.label, customMetas);
               const isInverse = resolved ? resolved.isInverse : (m.label.toLowerCase().includes('rotas') || m.label.toLowerCase().includes('desercion'));
               const target = resolved ? resolved.target : (numericVal > 0 ? numericVal : 1);
               return (
                 <KPIMetric key={i} label={m.label} value={m.value} actual={numericVal} target={target} isInverse={isInverse} />
               );
            })}
          </div>
        )}
        
        {data.statusPills && data.statusPills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
            {data.statusPills.map((p, i) => {
              let bg = '#f1f5f9';
              let color = '#475569';
              let label = p.label.toLowerCase();
              if (label.includes('confirmado') && !label.includes('por')) { bg = '#10b981'; color = '#fff'; }
              else if (label.includes('por confirmar')) { bg = '#f59e0b'; color = '#fff'; }
              else if (label.includes('no contesta')) { bg = '#64748b'; color = '#fff'; }
              else if (label.includes('siguiente')) { bg = '#0ea5e9'; color = '#fff'; }
              else if (label.includes('interesa')) { bg = '#ef4444'; color = '#fff'; }
              else if (label.includes('asisti')) { bg = '#3b82f6'; color = '#fff'; }

              return (
                <span key={i} style={{ padding: '0.4rem 0.8rem', background: bg, borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, color: color, border: 'none' }}>
                  {p.label}: <strong>{p.value}</strong>
                </span>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderMaestriaData = (report = {}) => {
    const data = report.data || report;
    const custom = report.customMetas || {};
    return (
      <div style={{ marginTop: '1rem' }}>
        {report.customMetas && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#a78bfa', background: 'rgba(167, 139, 250, 0.08)', padding: '0.2rem 0.6rem', borderRadius: '6px', marginBottom: '0.8rem', border: '1px solid rgba(167, 139, 250, 0.25)' }}>
            <Target size={14} /> Evaluado con metas personalizadas de Maestría para {report.userName || 'esta persona'}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
          {data.asistenciaMJ !== undefined && (
            <KPIMetric label="Asistencia MJ" value={`${data.asistenciaMJ}%`} target={custom.asistenciaMJ ?? 90} actual={parseFloat(data.asistenciaMJ || 0)} />
          )}
          {data.retencionMJ !== undefined && (
            <KPIMetric label="Retención MJ" value={`${data.retencionMJ}%`} target={custom.retencionMJ ?? 8} actual={parseFloat(data.retencionMJ || 0)} isInverse />
          )}
          {data.enroladosPorIMO !== undefined && (
            <KPIMetric label="Enrolados por IMO" value={data.enroladosPorIMO} target={custom.enroladosPorIMO ?? 3.0} actual={parseFloat(data.enroladosPorIMO || 0)} />
          )}
          {data.conversionALider !== undefined && (
            <KPIMetric label="Conv. a Líder" value={`${data.conversionALider}%`} target={custom.conversionALider ?? 60} actual={parseFloat(data.conversionALider || 0)} />
          )}
          <KPIMetric label="Graduados Viaje" value={data.graduadosViaje || 0} target={1} actual={parseInt(data.graduadosViaje || 0)} />
          <KPIMetric label="Sentados FDS1" value={data.sentadosFDS1 || 0} target={1} actual={parseInt(data.sentadosFDS1 || 0)} />
          <KPIMetric label="Sentados FDS2" value={data.sentadosFDS2 || 0} target={1} actual={parseInt(data.sentadosFDS2 || 0)} />
          <KPIMetric label="Sentados FDS3" value={data.sentadosFDS3 || 0} target={1} actual={parseInt(data.sentadosFDS3 || 0)} />
          <KPIMetric label="Deserción FDS1-2" value={`${data.desercion1 || 0}%`} target={10} actual={parseFloat(data.desercion1 || 0)} isInverse />
          <KPIMetric label="Deserción FDS2-3" value={`${data.desercion2 || 0}%`} target={10} actual={parseFloat(data.desercion2 || 0)} isInverse />
          <KPIMetric label="Efec. Enrol." value={`${data.efectividadEnrolamiento || 0}%`} target={90} actual={parseFloat(data.efectividadEnrolamiento || 0)} />
          <KPIMetric label="Cump. FI" value={`${data.cumplimientoFI || 0}%`} target={80} actual={parseFloat(data.cumplimientoFI || 0)} />
          <KPIMetric label="Conv. Aliados" value={`${data.conversionAliados || 0}%`} target={1} actual={parseFloat(data.conversionAliados || 0)} />
        </div>
      </div>
    );
  };

  const renderQTData = (report = {}) => {
    const data = report.data || report;
    const custom = report.customMetas || {};
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        {report.customMetas && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#f472b6', background: 'rgba(244, 114, 182, 0.08)', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(244, 114, 182, 0.25)' }}>
            <Target size={14} /> Evaluado con metas personalizadas de Quantum Team para {report.userName || 'esta persona'}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          <KPIMetric label="Efectividad Llamadas" value={`${data.efectividadLlamadas || 0}%`} target={custom.efectividadLlamadas ?? 60} actual={parseFloat(data.efectividadLlamadas || 0)} />
          <KPIMetric label="Futuros Imposibles" value={data.futurosImposibles || 0} target={custom.futurosImposibles ?? 2} actual={parseFloat(data.futurosImposibles || 0)} />
        </div>
        {data.resolucionQuiebres && (
          <div style={{ background: 'var(--bg-card, rgba(0,0,0,0.2))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))' }}>
            <h5 style={{ margin: '0 0 0.5rem', color: 'var(--crear-gold, #f59e0b)', fontWeight: 700 }}>Resolución de Quiebres:</h5>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main, #334155)', whiteSpace: 'pre-wrap' }}>{data.resolucionQuiebres}</p>
          </div>
        )}
      </div>
    );
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return 'Reciente';
    try {
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? 'Reciente' : d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Reciente';
    }
  };

  return (
    <div style={{ maxWidth: activeTab === 'coordinadores_nodus' ? '1420px' : '1080px', margin: '0 auto', padding: '1.5rem 1rem', transition: 'max-width 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/gerente')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={16} /> Volver a Causa OS
          </button>
          {!zenMode && (
            <button
              onClick={() => navigate('/embudo-conversion')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#000',
                fontWeight: 'bold',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              📊 Embudo C1 ➔ C2 ➔ MJ
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {isSuperUser && !zenMode && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--bg-card, rgba(15,23,42,0.6))',
              padding: '0.4rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))'
            }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--crear-gold, #f59e0b)' }}>📍 Sede Global:</span>
              <select
                value={filterSede}
                onChange={(e) => setFilterSede(e.target.value)}
                style={{
                  background: 'transparent',
                  color: 'inherit',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="Todas" style={{ background: '#1e293b', color: '#fff' }}>Todas las Sedes</option>
                {OPERATIONAL_SEDES.map(s => (
                  <option key={s} value={s} style={{ background: '#1e293b', color: '#fff' }}>{s}</option>
                ))}
              </select>
            </div>
          )}
          <ThemeSelector />
          <ZenModeSelector />
        </div>
      </div>

        {/* Dashboards Integrados Tabs */}
        <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('coordinadores_nodus')}
            style={{
              padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold',
              background: activeTab === 'coordinadores_nodus' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
              color: activeTab === 'coordinadores_nodus' ? 'var(--crear-gold)' : 'var(--text-muted)',
              borderBottom: activeTab === 'coordinadores_nodus' ? '2px solid var(--crear-gold)' : '2px solid transparent'
            }}
          >
            <PhoneCall size={16} style={{ display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '6px' }} />
            Coordinadores C1 & C2 (Nodus Live)
          </button>
          <button
            onClick={() => setActiveTab('cmj')}
            style={{
              padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold',
              background: activeTab === 'cmj' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
              color: activeTab === 'cmj' ? 'var(--crear-gold)' : 'var(--text-muted)',
              borderBottom: activeTab === 'cmj' ? '2px solid var(--crear-gold)' : '2px solid transparent'
            }}
          >
            <Target size={16} style={{ display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '6px' }} />
            Diagnóstico CMJ (Maestría)
          </button>
          <button
            onClick={() => setActiveTab('auditoria')}
            style={{
              padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold',
              background: activeTab === 'auditoria' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
              color: activeTab === 'auditoria' ? 'var(--crear-gold)' : 'var(--text-muted)',
              borderBottom: activeTab === 'auditoria' ? '2px solid var(--crear-gold)' : '2px solid transparent'
            }}
          >
            <AlertCircle size={16} style={{ display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '6px' }} />
            Auditoría de KPIs
          </button>
        </div>

        {/* Dashboards Content */}
        {activeTab === 'coordinadores_nodus' && <NodusCoordinadoresC1C2Dashboard globalFilterSede={filterSede} />}
        {activeTab === 'cmj' && <CMJDashboard globalFilterSede={filterSede} />}
  
      {/* Sección Legacy Auditoría de KPIs (solo cuando la tab está activa) */}
      {activeTab === 'auditoria' && (
        <>
          {!zenMode && (
          <div style={{
            background: 'var(--bg-card, #ffffff)',
            padding: '1rem',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            marginBottom: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1.5rem',
            alignItems: 'flex-end',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Sede</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#10b981' }}>📍</span>
                <select
                  value={filterSede}
                  onChange={(e) => setFilterSede(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.2rem', borderRadius: '8px', background: 'var(--bg-dark-alt, #f8fafc)', color: 'var(--text-main, #0f172a)', border: '1px solid var(--border-subtle, #cbd5e1)', fontWeight: 600 }}
                >
                  <option value="Todas">Todas las Sedes</option>
                  {sedesDisponibles.filter(s => s !== 'Todas').map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="Global">Global</option>
                </select>
              </div>
            </div>

            <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Desde</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'var(--bg-dark-alt, #f8fafc)', color: 'var(--text-main, #0f172a)', border: '1px solid var(--border-subtle, #cbd5e1)', fontWeight: 500 }}
              />
            </div>

            <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Hasta</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'var(--bg-dark-alt, #f8fafc)', color: 'var(--text-main, #0f172a)', border: '1px solid var(--border-subtle, #cbd5e1)', fontWeight: 500 }}
              />
            </div>

            <div style={{ flex: '0 1 auto' }}>
              <button
                onClick={handleLiveFilter}
                disabled={isScrapingLive}
                title="Dispara una nueva extracción en vivo de Nodus con este rango de fechas (tarda 1-5 minutos)"
                style={{
                  padding: '0.6rem 2rem',
                  borderRadius: '8px',
                  background: '#ffffff',
                  color: '#0ea5e9',
                  border: '1px solid #0ea5e9',
                  fontWeight: 700,
                  cursor: isScrapingLive ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: isScrapingLive ? 0.7 : 1
                }}
              >
                {isScrapingLive ? (
                  <>⏳ Filtrando...</>
                ) : (
                  <>▽ Re-extraer de Nodus</>
                )}
              </button>
            </div>
            <div style={{ flex: '1 1 100%', fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', marginTop: '-0.8rem' }}>
              ⚠️ "Desde/Hasta" + "Re-extraer de Nodus" dispara una corrida nueva del robot (1-5 min). Para filtrar al instante lo que ya está cargado en pantalla, sin esperar, usa el filtro rápido de abajo.
            </div>

            <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0369a1' }}>⚡ Filtro rápido — Desde</label>
              <input
                type="date"
                value={quickDateFrom}
                onChange={(e) => setQuickDateFrom(e.target.value)}
                style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'var(--bg-dark-alt, #f8fafc)', color: 'var(--text-main, #0f172a)', border: '1px solid #7dd3fc', fontWeight: 500 }}
              />
            </div>
            <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0369a1' }}>⚡ Filtro rápido — Hasta</label>
              <input
                type="date"
                value={quickDateTo}
                onChange={(e) => setQuickDateTo(e.target.value)}
                style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'var(--bg-dark-alt, #f8fafc)', color: 'var(--text-main, #0f172a)', border: '1px solid #7dd3fc', fontWeight: 500 }}
              />
            </div>
            {(quickDateFrom || quickDateTo) && (
              <div style={{ flex: '0 1 auto' }}>
                <button
                  type="button"
                  onClick={() => { setQuickDateFrom(''); setQuickDateTo(''); }}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'transparent', color: 'var(--text-muted, #64748b)', border: '1px solid var(--border-subtle, #cbd5e1)', fontWeight: 600, cursor: 'pointer' }}
                >
                  ✕ Limpiar filtro rápido
                </button>
              </div>
            )}
          </div>
          )}

          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-subtle, #e2e8f0)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        
        {/* GLOBAL DEBUG BLOCK A NIVEL PÁGINA */}
        <div style={{ display: 'none', background: '#1a1a1a', padding: '15px', marginBottom: '20px', borderRadius: '8px', border: '2px solid #00ff00' }}>
            <h4 style={{color: '#00ff00', margin: '0 0 10px 0'}}>🛑 ALERTA PARA SOPORTE (TOMA FOTO DE ESTO): 🛑</h4>
            <pre style={{ fontSize: '11px', color: '#00ff00', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '400px', overflowY: 'auto' }}>
              === KEYS DISPONIBLES EN NODUS ===
              {JSON.stringify(window.__nodusDebugKeys, null, 2)}
              
              === REPORTES DE ENTRENADORES ===
              {JSON.stringify(window.__nodusDebugEntrenadores, null, 2)}
              
              === PRIMER COORDINADOR ===
              {reports.length > 0 ? JSON.stringify(reports[0].rawContent, null, 2) : 'Vacio'}
            </pre>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.7rem', margin: '0 0 0.4rem 0', fontWeight: 800, color: 'var(--text-heading, #0f172a)' }}>
              <Target color="#f59e0b" /> Auditoría de KPIs
            </h2>
            <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '0.95rem' }}>
              Revisión y aprobación de rendimiento operativo de Coordinadores y Quantum Team.
            </p>
          </div>
          <div style={{ background: 'var(--bg-card-hover, #f8fafc)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main, #334155)', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
            {reports.length} {reports.length === 1 ? 'Reporte registrado' : 'Reportes registrados'}
          </div>
        </div>

        {/* Pestañas de Filtrado por Estado: Todos / Pendientes por Revisar / Revisados */}
        {(() => {
          const pendingCount = reports.filter(r => r.status !== 'reviewed').length;
          const reviewedCount = reports.filter(r => r.status === 'reviewed').length;

          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 1.1rem',
                  borderRadius: '24px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: filterStatus === 'all' ? '#3b82f6' : 'var(--border-subtle, #cbd5e1)',
                  background: filterStatus === 'all' ? '#3b82f6' : 'var(--bg-card, #ffffff)',
                  color: filterStatus === 'all' ? '#ffffff' : 'var(--text-main, #334155)',
                  boxShadow: filterStatus === 'all' ? '0 3px 10px rgba(59,130,246,0.35)' : '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>📋 Todos</span>
                <span style={{
                  background: filterStatus === 'all' ? 'rgba(255,255,255,0.25)' : 'var(--bg-card-hover, #f1f5f9)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: 800
                }}>{reports.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('pending')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 1.1rem',
                  borderRadius: '24px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: filterStatus === 'pending' ? '#f59e0b' : 'var(--border-subtle, #cbd5e1)',
                  background: filterStatus === 'pending' ? '#f59e0b' : 'var(--bg-card, #ffffff)',
                  color: filterStatus === 'pending' ? '#ffffff' : 'var(--text-main, #334155)',
                  boxShadow: filterStatus === 'pending' ? '0 3px 10px rgba(245,158,11,0.35)' : '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>⏳ Pendientes por Revisar</span>
                <span style={{
                  background: filterStatus === 'pending' ? 'rgba(255,255,255,0.25)' : '#fef3c7',
                  color: filterStatus === 'pending' ? '#ffffff' : '#92400e',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: 800
                }}>{pendingCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('reviewed')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 1.1rem',
                  borderRadius: '24px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: filterStatus === 'reviewed' ? '#10b981' : 'var(--border-subtle, #cbd5e1)',
                  background: filterStatus === 'reviewed' ? '#10b981' : 'var(--bg-card, #ffffff)',
                  color: filterStatus === 'reviewed' ? '#ffffff' : 'var(--text-main, #334155)',
                  boxShadow: filterStatus === 'reviewed' ? '0 3px 10px rgba(16,185,129,0.35)' : '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>✅ Revisados</span>
                <span style={{
                  background: filterStatus === 'reviewed' ? 'rgba(255,255,255,0.25)' : '#dcfce7',
                  color: filterStatus === 'reviewed' ? '#ffffff' : '#166534',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: 800
                }}>{reviewedCount}</span>
              </button>
            </div>
          );
        })()}

        {/* (02/09/2026) Resumen general Capítulo 1 / Capítulo 2 / Maestría —
            pedido de José. Viene de secciones.dashboardPrincipal (tabla
            Entrenamiento/Participantes), agregado del ALCANCE que el robot
            de Nodus pudo ver en esa corrida (hoy: una sola sede+ciclo). */}
        {resumenGeneral && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '0.8rem', alignItems: 'center',
            background: 'var(--bg-card-hover, #f8fafc)', border: '1px solid var(--border-subtle, #e2e8f0)',
            borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '0.75rem'
          }}>
            <div style={{ fontWeight: 800, color: 'var(--text-heading, #0f172a)', fontSize: '0.9rem' }}>
              Resumen general Nodus{resumenGeneral.alcance ? ` — Alcance: ${resumenGeneral.alcance}` : ''}
            </div>
            {resumenGeneral.capitulo1 != null && (
              <span style={{ padding: '0.35rem 0.8rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
                Capítulo 1: {resumenGeneral.capitulo1.toLocaleString('es-PE')}
              </span>
            )}
            {resumenGeneral.capitulo2 != null && (
              <span style={{ padding: '0.35rem 0.8rem', background: '#fef3c7', color: '#92400e', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
                Capítulo 2: {resumenGeneral.capitulo2.toLocaleString('es-PE')}
              </span>
            )}
            {resumenGeneral.maestria != null && (
              <span style={{ padding: '0.35rem 0.8rem', background: '#dcfce7', color: '#166534', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
                Maestría: {resumenGeneral.maestria.toLocaleString('es-PE')}
              </span>
            )}
            {resumenGeneral.total != null && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                Total en el alcance: {resumenGeneral.total.toLocaleString('es-PE')}
              </span>
            )}
          </div>
        )}
        {resumenGeneral && resumenGeneral.alcance && (
          <p style={{ margin: '0 0 1.5rem', fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
            ⚠️ Nota: esta corrida de Nodus solo cubre el alcance <strong>"{resumenGeneral.alcance}"</strong> (así lo llama el propio Nodus, "Tu sede"). No está verificado si la cuenta del robot puede ver otras sedes — no asumas que este resumen incluye todas las sedes.
          </p>
        )}

        {(() => {
          // Filtro rápido de fecha (instantáneo, sobre lo ya cargado — ver quickDateFrom/quickDateTo).
          // "Hasta" incluye el día completo (23:59:59), no solo las 00:00.
          const quickFromMs = quickDateFrom ? new Date(quickDateFrom + 'T00:00:00').getTime() : null;
          const quickToMs = quickDateTo ? new Date(quickDateTo + 'T23:59:59.999').getTime() : null;

          const displayedReports = reports.filter(r => {
            if (filterStatus === 'pending' && r.status === 'reviewed') return false;
            if (filterStatus === 'reviewed' && r.status !== 'reviewed') return false;

            if (quickFromMs != null || quickToMs != null) {
              const repMs = r.createdAt ? new Date(r.createdAt).getTime() : NaN;
              if (isNaN(repMs)) return false; // sin fecha registrada: no se puede ubicar en el rango, se excluye
              if (quickFromMs != null && repMs < quickFromMs) return false;
              if (quickToMs != null && repMs > quickToMs) return false;
            }

            return true;
          });

          if (loading) {
            return (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--crear-gold, #f59e0b)', fontWeight: 600 }}>
                Cargando reportes de KPIs...
              </div>
            );
          }

          if (reports.length === 0) {
            return (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted, #64748b)' }}>
                No hay reportes de KPIs en la sede seleccionada.
              </div>
            );
          }

          if (displayedReports.length === 0) {
            const dateFilterActive = quickFromMs != null || quickToMs != null;
            return (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted, #64748b)', background: 'var(--bg-card-hover, #f8fafc)', borderRadius: '12px', border: '1px dashed var(--border-subtle, #cbd5e1)', margin: '1rem 0' }}>
                <p style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-heading, #0f172a)' }}>
                  {filterStatus === 'all'
                    ? 'No hay reportes que coincidan con estos filtros'
                    : `No hay reportes en la pestaña "${filterStatus === 'pending' ? 'Pendientes por Revisar' : 'Revisados'}"`}
                  {dateFilterActive ? ' con el filtro rápido de fecha activo' : ''}
                </p>
                <p style={{ margin: '0 0 1rem', fontSize: '0.88rem' }}>
                  {dateFilterActive && (
                    <>Prueba a <strong>limpiar el filtro rápido de fecha</strong>{filterStatus !== 'all' ? ', o ' : '. '}</>
                  )}
                  {filterStatus !== 'all' && (
                    <>cambia a <strong>"📋 Todos"</strong> para revisar el historial completo.</>
                  )}
                </p>
                <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {dateFilterActive && (
                    <button
                      type="button"
                      onClick={() => { setQuickDateFrom(''); setQuickDateTo(''); }}
                      style={{
                        padding: '0.6rem 1.4rem',
                        borderRadius: '8px',
                        background: 'transparent',
                        color: '#0369a1',
                        border: '1px solid #7dd3fc',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ✕ Limpiar filtro rápido de fecha
                    </button>
                  )}
                  {filterStatus !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setFilterStatus('all')}
                      style={{
                        padding: '0.6rem 1.4rem',
                        borderRadius: '8px',
                        background: '#3b82f6',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(59,130,246,0.35)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      📋 Ver Todos los Reportes ({reports.length})
                    </button>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              {Array.from(groupBySede(displayedReports)).map(([sedeLabel, repsInSede]) => {
                // Cálculo de Sumatoria Coherente (solo toma el último envío vigente de cada coordinadora)
                const latestReps = repsInSede.filter(r => r.isLatest);
                const totalOkVigente = latestReps.reduce((acc, r) => acc + (Number(r.totalOk) || 0), 0);
                const nuevosOkVigente = latestReps.reduce((acc, r) => acc + (Number(r.nuevosOk) || 0), 0);
                const rezagadosOkVigente = latestReps.reduce((acc, r) => acc + (Number(r.rezagadosOk) || 0), 0);
                const uniqueCoords = Array.from(new Set(repsInSede.map(r => (r.userName || r.coordinator || '').trim()))).filter(Boolean);

                return (
                  <div key={sedeLabel}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem',
                      borderBottom: '1px solid var(--border-subtle, #e2e8f0)', paddingBottom: '0.6rem', margin: '0 0 1rem'
                    }}>
                      <h3 style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0,
                        fontSize: '1.1rem', fontWeight: 800, color: 'var(--crear-gold, #f59e0b)'
                      }}>
                        <CountryFlag sede={sedeLabel} /> {sedeLabel}
                        <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-muted, #64748b)' }}>
                          ({uniqueCoords.length} {uniqueCoords.length === 1 ? 'coordinadora' : 'coordinadoras'} • {repsInSede.length} {repsInSede.length === 1 ? 'reporte' : 'reportes'})
                        </span>
                      </h3>
                    </div>

                    {/* Banner de Sumatoria Coherente de la Sede */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '12px',
                      padding: '1rem 1.25rem',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-heading, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          📊 Sumatoria Coherente de la Sede
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '10px' }}>
                            Sin duplicar reenvíos
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', marginTop: '0.25rem' }}>
                          Suma automática basada en el último envío vigente de cada coordinadora ({latestReps.length} vigentes, {repsInSede.length - latestReps.length} históricos guardados).
                          {zenMode && repsInSede.length - latestReps.length > 0 && (
                            <> ⚡ Vista Zen: {repsInSede.length - latestReps.length} envíos históricos ocultos — solo se muestran los vigentes.</>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.4rem 0.85rem', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: '#065f46', fontWeight: 800, textTransform: 'uppercase' }}>Total OK (Vigente)</div>
                          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#047857' }}>{totalOkVigente}</div>
                        </div>
                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.4rem 0.85rem', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase' }}>Nuevos OK</div>
                          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1d4ed8' }}>{nuevosOkVigente}</div>
                        </div>
                        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '0.4rem 0.85rem', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: 800, textTransform: 'uppercase' }}>Rezagados OK</div>
                          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#b45309' }}>{rezagadosOkVigente}</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {(zenMode ? latestReps : repsInSede).map(rep => (
                        <div key={rep.id} style={{
                          background: rep.status === 'reviewed' ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-card, #ffffff)',
                          border: '1px solid',
                          borderColor: rep.status === 'reviewed' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)',
                          borderRadius: '12px',
                          padding: '1.5rem',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                          opacity: rep.isLatest ? 1 : 0.88,
                          position: 'relative'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle, #e2e8f0)', paddingBottom: '1rem' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                                <h3 style={{ margin: 0, color: 'var(--text-heading, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.15rem' }}>
                                  <Users size={18} color="#f59e0b" /> {rep.userName} 
                                  <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 700 }}>
                                    <CountryFlag sede={rep.sede} /> {rep.sede}
                                  </span>
                                </h3>
                                {rep.isLatest ? (
                                  <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#166534', border: '1px solid #86efac', padding: '2px 8px', borderRadius: '12px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    ⚡ Envío Vigente
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    📋 Envío Anterior (Histórico)
                                  </span>
                                )}
                              </div>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
                                {rep.role === 'qt' ? 'Quantum Team' : rep.role === 'coord_maestria' ? 'Coordinador de Maestría' : 'Coordinador C1/C2'} • Enviado: {formatDate(rep.createdAt)}
                              </p>
                            </div>

                            <div>
                              {rep.status === 'reviewed' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#10b981', fontWeight: 800, fontSize: '0.9rem' }}>
                                    <CheckCircle2 size={18} /> Revisado
                                  </span>
                                  {rep.reviewedBy && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                                      Por {rep.reviewedBy}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleReviewed(rep.id, rep.status)}
                                    title="Regresar este reporte a pendiente por revisar"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--text-muted, #94a3b8)',
                                      fontSize: '0.72rem',
                                      cursor: 'pointer',
                                      textDecoration: 'underline',
                                      padding: '2px 0',
                                      marginTop: '2px'
                                    }}
                                  >
                                    Desmarcar revisión
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => handleToggleReviewed(rep.id, rep.status)}
                                  className="btn-neon-action" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '8px', background: '#3b82f6', color: '#ffffff', border: 'none', cursor: 'pointer' }}
                                >
                                  <CheckCircle2 size={16} /> Marcar como Revisado
                                </button>
                              )}
                            </div>
                          </div>

                          {rep.role === 'coord_c1' ? renderC1Data(rep) : rep.role === 'coord_maestria' ? renderMaestriaData(rep) : renderQTData(rep)}

                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
      </>
      )}
    </div>
  );
}

// Subcomponente para mostrar una métrica con color según alcance de la meta
function KPIMetric({ label, value, target, actual, isInverse = false }) {
  let isSuccess = false;
  if (isInverse) {
    isSuccess = actual <= target;
  } else {
    isSuccess = actual >= target;
  }

  const color = isSuccess ? '#10b981' : '#ef4444';

  return (
    <div style={{ background: 'var(--bg-card-hover, #f8fafc)', padding: '0.9rem', borderRadius: '8px', borderLeft: `4px solid ${color}`, border: '1px solid var(--border-subtle, #e2e8f0)', borderLeftColor: color }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', marginBottom: '0.3rem', textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-heading, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {value}
        {!isSuccess && <AlertCircle size={15} color={color} title={`Meta no alcanzada (${isInverse ? 'Máx' : 'Min'}: ${target})`} />}
      </div>
    </div>
  );
}
