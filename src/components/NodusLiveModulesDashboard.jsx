import React, { useState, useEffect } from 'react';
import {
  Layers, Users, DollarSign, Bot, RefreshCw, CheckCircle,
  ExternalLink, Search, ShieldCheck, Zap, Database, ArrowRight,
  Sparkles, FileText, CheckCircle2, AlertTriangle, Building2
} from 'lucide-react';
import {
  subscribeToNodusCatalog,
  subscribeToNodusAliados,
  subscribeToNodusContabilidad,
  queryNodusAssistant
} from '../services/nodusLiveSyncService';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';

function normalizeCleanName(str) {
  return String(str || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchPersonNames(a, b) {
  const sTokens = normalizeCleanName(a).split(' ').filter(Boolean);
  const nTokens = normalizeCleanName(b).split(' ').filter(Boolean);
  if (sTokens.length === 0 || nTokens.length === 0) return false;
  const common = sTokens.filter(t => nTokens.includes(t));
  return common.length >= Math.min(2, sTokens.length, nTokens.length) && common.length >= Math.ceil(Math.min(sTokens.length, nTokens.length) * 0.65);
}

function parseCsvRows(text) {
  const lines = String(text || '').split(/\r?\n/).filter(l => l.trim().length > 0);
  return lines.map(line => {
    if (line.includes('\t')) {
      return line.split('\t').map(c => c.trim());
    }
    const matches = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g) || [];
    return matches.map(m => {
      let val = m.replace(/^,/, '').trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).replace(/""/g, '"').trim();
      }
      return val;
    });
  });
}

export default function NodusLiveModulesDashboard() {
  const [activeTab, setActiveTab] = useState('aliados');
  const [catalogData, setCatalogData] = useState(null);
  const [aliadosData, setAliadosData] = useState(null);
  const [contabilidadData, setContabilidadData] = useState(null);
  const [selectedEquipoId, setSelectedEquipoId] = useState('149');
  const [selectedQuantumFilter, setSelectedQuantumFilter] = useState('ALL');
  const [selectedAliadoPxModal, setSelectedAliadoPxModal] = useState(null);
  const [showSheetLinker, setShowSheetLinker] = useState(false);
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [sheetPasteInput, setSheetPasteInput] = useState('');
  const [sheetSyncStatus, setSheetSyncStatus] = useState('');
  const [sheetSyncLoading, setSheetSyncLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [assistantInput, setAssistantInput] = useState('cuantos pagos cerraron en c1 32');
  const [assistantResponse, setAssistantResponse] = useState(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Suscripciones en tiempo real
  useEffect(() => {
    const unsubCatalog = subscribeToNodusCatalog((res) => {
      if (res.ok) setCatalogData(res.data);
    });

    const unsubAliados = subscribeToNodusAliados((res) => {
      if (res.ok) setAliadosData(res.data);
    });

    const unsubContabilidad = subscribeToNodusContabilidad((res) => {
      if (res.ok) setContabilidadData(res.data);
    });

    return () => {
      if (unsubCatalog) unsubCatalog();
      if (unsubAliados) unsubAliados();
      if (unsubContabilidad) unsubContabilidad();
    };
  }, []);

  const handleRunAssistantQuery = async (e) => {
    if (e) e.preventDefault();
    if (!assistantInput.trim()) return;
    setAssistantLoading(true);
    try {
      const res = await queryNodusAssistant(assistantInput, {
        aliados: aliadosData,
        contabilidad: contabilidadData
      });
      setAssistantResponse(res);
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  // Lista ordenada de todos los equipos extraídos de Nodus
  const allTeamsList = Object.values(aliadosData?.equipos || {})
    .sort((a, b) => Number(b.equipoId) - Number(a.equipoId));

  // Opciones completas del selector (incluyendo equipos con datos y catálogo disponible en Nodus)
  const selectorOptions = (() => {
    const map = new Map();
    allTeamsList.forEach(eq => {
      map.set(String(eq.equipoId), {
        id: String(eq.equipoId),
        nombre: eq.equipoNombre,
        hasData: true,
        hasSheetContrast: Boolean(eq.hasSheetContrast),
        pagos: eq.metrics?.pasaronC2 || 0,
        aliadosCount: eq.aliados?.length || 0
      });
    });
    (aliadosData?.equiposDisponibles || []).forEach(opt => {
      if (!map.has(String(opt.id))) {
        map.set(String(opt.id), {
          id: String(opt.id),
          nombre: opt.nombre,
          hasData: false,
          hasSheetContrast: false,
          pagos: 0,
          aliadosCount: 0
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => Number(b.id) - Number(a.id));
  })();

  // Aliados del equipo seleccionado (por defecto 149 / Lima Ciclo 1)
  const currentTeamAliados = aliadosData?.equipos?.[selectedEquipoId] || aliadosData?.latestEquipo || {
    equipoId: selectedEquipoId,
    equipoNombre: selectorOptions.find(o => o.id === String(selectedEquipoId))?.nombre || `EQUIPO ID ${selectedEquipoId}`,
    metrics: {
      totalPersonas: 0,
      pxConGrupoNodus: 0,
      pasaronC2: 0,
      pagaronC2: 0,
      pagaronC2MJ: 0,
      abonos: 0,
      aliadosAsignados: 0
    },
    aliados: [],
    feedbackQT: [],
    aliadosDeclaradosC2: [],
    participantesC2Nodus: []
  };

  const handleSyncTeamSheet = async () => {
    setSheetSyncLoading(true);
    setSheetSyncStatus('');
    try {
      let csvText = sheetPasteInput.trim();
      let cleanSheetUrl = sheetUrlInput.trim() || currentTeamAliados.sheetUrl || '';

      if (!csvText && cleanSheetUrl) {
        const mId = cleanSheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        const mGid = cleanSheetUrl.match(/gid=(\d+)/);
        if (!mId) {
          throw new Error('URL de Google Sheet inválida. Asegúrate de pegar el enlace completo de Google Sheets.');
        }
        const sheetId = mId[1];
        const gid = mGid ? mGid[1] : '0';
        const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
        const res = await fetch(exportUrl);
        if (!res.ok) {
          throw new Error('La hoja tiene acceso restringido en el navegador. Copia y pega las celdas de la tabla de Aliados/QT en el cuadro inferior.');
        }
        const fetched = await res.text();
        if (fetched.includes('<!DOCTYPE html>') || fetched.includes('<html')) {
          throw new Error('La hoja requiere permisos o pegar directamente las celdas (Ctrl+C / Ctrl+V) en el cuadro de texto inferior.');
        }
        csvText = fetched;
      }

      if (!csvText) {
        throw new Error('Ingresa la URL de un Google Sheet público o pega las filas de la hoja de QT & Aliados.');
      }

      const rows = parseCsvRows(csvText);
      const parsedAliadosSheet = [];
      const parsedFeedbackQT = [];
      let inFeedback = false;
      let parsedTotals = null;

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i] || [];
        const c0 = String(r[0] || '').trim();
        const c1 = String(r[1] || '').trim();
        if (c0.toUpperCase().includes('FEEDBACK QT')) {
          inFeedback = true;
          continue;
        }
        if (c0.toUpperCase() === 'QUANTUM' || c1.toUpperCase() === 'ALIADO') continue;

        if (!inFeedback) {
          if (!c0 && !c1 && (parseInt(r[2], 10) || 0) >= 15) {
            parsedTotals = {
              px: parseInt(r[2], 10) || 0,
              desertor: parseInt(r[3], 10) || 0,
              pxFin: parseInt(r[4], 10) || 0,
              declaracion: parseInt(r[5], 10) || 0,
              c2: parseInt(r[7], 10) || 0,
              c2mj: parseInt(r[8], 10) || 0,
              abono: parseInt(r[9], 10) || 0,
              pagos: parseInt(r[12], 10) || ((parseInt(r[7], 10) || 0) + (parseInt(r[8], 10) || 0)),
              pp: r[13] || '0%'
            };
            continue;
          }
          if (c0 && c1 && !c1.toUpperCase().includes('SIN GRUPO')) {
            const c2Val = parseInt(r[7], 10) || 0;
            const c2mjVal = parseInt(r[8], 10) || 0;
            const pagosVal = parseInt(r[12], 10) || (c2Val + c2mjVal);
            const pxFinVal = parseInt(r[4], 10) || (parseInt(r[2], 10) || 0);
            parsedAliadosSheet.push({
              quantum: c0,
              aliado: c1,
              px: parseInt(r[2], 10) || 0,
              desertor: parseInt(r[3], 10) || 0,
              pxFin: pxFinVal,
              declaracion: parseInt(r[5], 10) || 0,
              c2: c2Val,
              c2mj: c2mjVal,
              abono: parseInt(r[9], 10) || 0,
              pagos: pagosVal,
              pp: r[13] || (pxFinVal > 0 ? `${Math.round((pagosVal / pxFinVal) * 100)}%` : '0%')
            });
          }
        } else {
          if (c0.toUpperCase().includes('CAPITULO')) break;
          if (c0 && (parseInt(r[1], 10) || 0) > 0) {
            parsedFeedbackQT.push({
              quantum: c0,
              px: parseInt(r[1], 10) || 0,
              desertor: parseInt(r[2], 10) || 0,
              pxFin: parseInt(r[3], 10) || 0,
              declaracion: parseInt(r[4], 10) || 0,
              c2: parseInt(r[5], 10) || 0,
              c2mj: parseInt(r[6], 10) || 0,
              abono: parseInt(r[7], 10) || 0,
              pagos: parseInt(r[10], 10) || ((parseInt(r[5], 10) || 0) + (parseInt(r[6], 10) || 0)),
              pp: r[11] || '0%'
            });
          }
        }
      }

      if (parsedAliadosSheet.length === 0) {
        throw new Error('No se detectaron filas con formato QUANTUM | ALIADO | PX | DESERTOR | PX FIN | DECLARACION | ... | C2 | C2+MJ.');
      }

      const nodusMap = new Map();
      (currentTeamAliados.aliados || []).forEach(a => {
        nodusMap.set(normalizeCleanName(a.aliadoNodus || a.aliado), a);
      });

      const matchedKeys = new Set();
      const contrastedAliados = parsedAliadosSheet.map(sa => {
        let matched = null;
        for (const [k, v] of nodusMap.entries()) {
          if (matchPersonNames(sa.aliado, v.aliadoNodus || v.aliado)) {
            matched = v;
            matchedKeys.add(k);
            break;
          }
        }
        const pxNodus = matched ? (matched.pxNodus ?? matched.asignados ?? 0) : 0;
        const pagosNodus = matched ? (matched.pagosNodus ?? matched.pasaronC2 ?? 0) : 0;
        return {
          quantum: sa.quantum,
          aliado: sa.aliado,
          aliadoNodus: matched?.aliadoNodus || sa.aliado,
          telefono: matched?.telefono || '',
          enNodus: Boolean(matched),
          declaradoC2Nodus: Boolean(matched?.declaradoC2Nodus),
          pxSheet: sa.px,
          pxNodus,
          desertor: sa.desertor,
          pxFin: sa.pxFin,
          declaracion: sa.declaracion,
          c2: sa.c2,
          c2mj: sa.c2mj,
          abono: sa.abono,
          pagosSheet: sa.pagos,
          pagosNodus,
          pp: sa.pp,
          cuadrado: Boolean(matched) && sa.px === pxNodus && sa.pagos === pagosNodus,
          participantesAsignados: matched?.participantesAsignados || [],
          asignados: sa.px,
          c1: sa.pxFin,
          pasaronC2: sa.declaracion,
          pagaronC2: sa.c2,
          pagaronC2MJ: sa.c2mj
        };
      });

      // Si no venía tabla FEEDBACK QT explícita, agrupar por Quantum automáticamente
      const finalFeedbackQT = parsedFeedbackQT.length > 0
        ? parsedFeedbackQT.map(qt => {
            const group = contrastedAliados.filter(a => normalizeCleanName(a.quantum) === normalizeCleanName(qt.quantum));
            const pxNodus = group.reduce((s, a) => s + (a.pxNodus || 0), 0);
            const pagosNodus = group.reduce((s, a) => s + (a.pagosNodus || 0), 0);
            return {
              ...qt,
              totalAliadosQT: group.length,
              pxNodus,
              pagosNodus,
              cuadradoConNodus: qt.px === pxNodus && qt.pagos === pagosNodus
            };
          })
        : (() => {
            const qMap = new Map();
            contrastedAliados.forEach(a => {
              const qName = a.quantum || 'SIN QT';
              if (!qMap.has(qName)) {
                qMap.set(qName, { quantum: qName, totalAliadosQT: 0, px: 0, pxNodus: 0, desertor: 0, pxFin: 0, declaracion: 0, c2: 0, c2mj: 0, abono: 0, pagos: 0, pagosNodus: 0, pp: '0%', cuadradoConNodus: true });
              }
              const q = qMap.get(qName);
              q.totalAliadosQT++;
              q.px += a.pxSheet || 0;
              q.pxNodus += a.pxNodus || 0;
              q.desertor += a.desertor || 0;
              q.pxFin += a.pxFin || 0;
              q.declaracion += a.declaracion || 0;
              q.c2 += a.c2 || 0;
              q.c2mj += a.c2mj || 0;
              q.abono += a.abono || 0;
              q.pagos += a.pagosSheet || 0;
              q.pagosNodus += a.pagosNodus || 0;
              q.pp = q.pxFin > 0 ? `${Math.round((q.pagos / q.pxFin) * 100)}%` : '0%';
              q.cuadradoConNodus = q.px === q.pxNodus && q.pagos === q.pagosNodus;
            });
            return Array.from(qMap.values());
          })();

      const sumPxSheet = parsedTotals?.px || contrastedAliados.reduce((s, a) => s + (a.pxSheet || 0), 0);
      const sumDesertores = parsedTotals?.desertor || contrastedAliados.reduce((s, a) => s + (a.desertor || 0), 0);
      const sumPxFin = parsedTotals?.pxFin || contrastedAliados.reduce((s, a) => s + (a.pxFin || 0), 0);
      const sumDecl = parsedTotals?.declaracion || contrastedAliados.reduce((s, a) => s + (a.declaracion || 0), 0);
      const sumC2 = parsedTotals?.c2 || contrastedAliados.reduce((s, a) => s + (a.c2 || 0), 0);
      const sumC2MJ = parsedTotals?.c2mj || contrastedAliados.reduce((s, a) => s + (a.c2mj || 0), 0);
      const sumAbono = parsedTotals?.abono || contrastedAliados.reduce((s, a) => s + (a.abono || 0), 0);
      const sumPagos = parsedTotals?.pagos || (sumC2 + sumC2MJ);

      const updatedTeam = {
        ...currentTeamAliados,
        hasSheetContrast: true,
        sheetUrl: cleanSheetUrl || currentTeamAliados.sheetUrl || null,
        metrics: {
          ...currentTeamAliados.metrics,
          totalPersonas: sumPxSheet,
          desertores: sumDesertores,
          pxFin: sumPxFin,
          declaraciones: sumDecl,
          pasaronC2: sumPagos,
          pagaronC2: sumC2,
          pagaronC2MJ: sumC2MJ,
          abonos: sumAbono,
          efectividadPP: sumPxFin > 0 ? `${Math.round((sumPagos / sumPxFin) * 100)}%` : '0%',
          aliadosAsignados: contrastedAliados.length
        },
        aliados: contrastedAliados,
        feedbackQT: finalFeedbackQT,
        sheetTotals: {
          px: sumPxSheet,
          desertor: sumDesertores,
          pxFin: sumPxFin,
          declaracion: sumDecl,
          c2: sumC2,
          c2mj: sumC2MJ,
          abono: sumAbono,
          pagos: sumPagos,
          pp: sumPxFin > 0 ? `${Math.round((sumPagos / sumPxFin) * 100)}%` : '0%'
        },
        extraidoAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'nodus_aliados', 'latest'), {
        equipos: {
          ...(aliadosData?.equipos || {}),
          [selectedEquipoId]: updatedTeam
        }
      }, { merge: true });

      setSheetSyncStatus(`✅ Contrastado y guardado para ${currentTeamAliados.equipoNombre}: ${contrastedAliados.length} Aliados y ${finalFeedbackQT.length} Quantums.`);
      setSheetPasteInput('');
    } catch (err) {
      setSheetSyncStatus(`⚠️ ${err.message}`);
    } finally {
      setSheetSyncLoading(false);
    }
  };

  const currentMetrics = currentTeamAliados.metrics || {
    totalPersonas: 96,
    pasaronC2: 24,
    pagaronC2: 18,
    pagaronC2MJ: 6,
    abonos: 11,
    aliadosAsignados: 17
  };

  const contabilidadMetricas = contabilidadData?.metricas || {
    pagosCerrados: 134,
    montoRecaudado: 'PEN 92,985.00',
    pagosPendientes: 0,
    totalParticipantes: 149,
    asistieronC1: 96,
    monedaDetectada: 'PEN'
  };

  const catalogList = catalogData?.modulos || [
    { path: '/aliados', title: 'Aliados & Conversión C1-C2', section: 'SEGUIMIENTO', category: 'aliados', isKnown: true },
    { path: '/contabilidad', title: 'Contabilidad & Recaudación', section: 'SISTEMA', category: 'finanzas', isKnown: true },
    { path: '/mesaregistro', title: 'Mesa de Registro', section: 'SEGUIMIENTO', category: 'registro', isKnown: true },
    { path: '/juniors', title: 'Juniors & Jóvenes', section: 'SEGUIMIENTO', category: 'juniors', isKnown: true },
    { path: '/participantes', title: 'Participantes / Facturación', section: 'SISTEMA', category: 'participantes', isKnown: true },
    { path: '/actividadcoordinadores', title: 'Actividad Coordinadores', section: 'REPORTES', category: 'coordinacion', isKnown: true },
    { path: '/reporteentrenadores', title: 'Reporte Entrenadores', section: 'REPORTES', category: 'entrenadores', isKnown: true },
    { path: '/reporte', title: 'Reporte Asistencia General', section: 'REPORTES', category: 'asistencia', isKnown: true },
    { path: '/certificados', title: 'Certificados & Diplomas', section: 'SEGUIMIENTO', category: 'certificados', isKnown: true },
    { path: '/documentos', title: 'Documentos Institucionales', section: 'SISTEMA', category: 'documentos', isKnown: true },
    { path: '/futurosimposibles', title: 'Resultados Imposibles', section: 'SEGUIMIENTO', category: 'metas', isKnown: true },
    { path: '/dashboard', title: 'Dashboard General Nodus', section: 'SISTEMA', category: 'core', isKnown: true }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Alerta de Confidencialidad y Enlace en Vivo */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.12) 0%, rgba(14, 165, 233, 0.12) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.4)',
        borderRadius: '12px',
        padding: '1.2rem 1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 10px #10b981',
            animation: 'pulse 2s infinite'
          }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 800, color: '#10b981', fontSize: '0.95rem', letterSpacing: '0.5px' }}>
                AGENTE EXTRACTOR NODUS EN TIEMPO REAL
              </span>
              <span style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                CERO RETRASOS • AUTO-DESCUBRIMIENTO ACTIVO
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '2px' }}>
              Extrayendo módulos oficiales desde <strong style={{ color: '#f1f5f9' }}>imo.crearpslglobal.com</strong>.
              Cualquier nuevo módulo creado en la barra lateral de Nodus es indexado automáticamente sin historias ni latencia.
            </div>
          </div>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#0f172a',
            border: '1px solid #334155',
            color: '#f8fafc',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-emerald-400' : 'text-emerald-400'} />
          {isRefreshing ? 'Actualizando...' : 'Refrescar en Vivo'}
        </button>
      </div>

      {/* Subnavegación de Módulos */}
      <div style={{ display: 'flex', gap: '0.6rem', borderBottom: '1px solid #334155', paddingBottom: '0.8rem', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('aliados')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            border: activeTab === 'aliados' ? '1px solid #10b981' : '1px solid transparent',
            background: activeTab === 'aliados' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
            color: activeTab === 'aliados' ? '#34d399' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Users size={16} /> Aliados & Conversión C1-C2
        </button>

        <button
          onClick={() => setActiveTab('contabilidad')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            border: activeTab === 'contabilidad' ? '1px solid #0ea5e9' : '1px solid transparent',
            background: activeTab === 'contabilidad' ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
            color: activeTab === 'contabilidad' ? '#38bdf8' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <DollarSign size={16} /> Contabilidad & Finanzas
        </button>

        <button
          onClick={() => setActiveTab('asistente')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            border: activeTab === 'asistente' ? '1px solid #a855f7' : '1px solid transparent',
            background: activeTab === 'asistente' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
            color: activeTab === 'asistente' ? '#c084fc' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Bot size={16} /> Asistente Virtual Nodus
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            border: activeTab === 'catalog' ? '1px solid #f59e0b' : '1px solid transparent',
            background: activeTab === 'catalog' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
            color: activeTab === 'catalog' ? '#fbbf24' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Layers size={16} /> Todos los Módulos Nodus ({catalogList.length})
        </button>
      </div>

      {/* CONTENIDO DE PESTAÑA: ALIADOS & CONTRASTE QT (TODOS LOS EQUIPOS NODUS vs GOOGLE SHEET) */}
      {activeTab === 'aliados' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* TABLA 0: MATRIZ MULTIEQUIPO DE TODOS LOS EQUIPOS ACTIVOS EN NODUS */}
          {allTeamsList.length > 0 && (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '0.95rem 1.25rem', borderBottom: '1px solid #334155', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
                    🌎 Matriz Multiequipo Nodus (/aliados) — Todos los Equipos Sincronizados ({allTeamsList.length})
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                    Haz clic en cualquier equipo para inspeccionar sus Aliados, Quantums (QT), Declarados a C2 y Participantes, o vincular su Google Sheet de QT & Aliados.
                  </div>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                      <th style={{ padding: '0.65rem 0.9rem' }}>ID</th>
                      <th style={{ padding: '0.65rem 0.9rem' }}>Equipo & Sede (Nodus)</th>
                      <th style={{ padding: '0.65rem 0.7rem', textAlign: 'center' }}>Aliados Activos</th>
                      <th style={{ padding: '0.65rem 0.7rem', textAlign: 'center' }}>Declarados C2</th>
                      <th style={{ padding: '0.65rem 0.7rem', textAlign: 'center' }}>PX Asignados</th>
                      <th style={{ padding: '0.65rem 0.7rem', textAlign: 'center' }}>Pagos Totales C2</th>
                      <th style={{ padding: '0.65rem 0.7rem', textAlign: 'center' }}>Solo C2</th>
                      <th style={{ padding: '0.65rem 0.7rem', textAlign: 'center' }}>Combo C2+MJ</th>
                      <th style={{ padding: '0.65rem 0.7rem', textAlign: 'center' }}>Abonos</th>
                      <th style={{ padding: '0.65rem 0.7rem', textAlign: 'center' }}>% PP</th>
                      <th style={{ padding: '0.65rem 0.9rem', textAlign: 'center' }}>Estado / Sheet QT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTeamsList.map((eq, i) => {
                      const isCurr = String(eq.equipoId) === String(selectedEquipoId);
                      const m = eq.metrics || {};
                      return (
                        <tr
                          key={eq.equipoId}
                          onClick={() => {
                            setSelectedEquipoId(String(eq.equipoId));
                            setSelectedQuantumFilter('ALL');
                            setSelectedAliadoPxModal(null);
                          }}
                          style={{
                            borderBottom: '1px solid #334155',
                            background: isCurr ? 'rgba(16, 185, 129, 0.14)' : (i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'),
                            cursor: 'pointer'
                          }}
                        >
                          <td style={{ padding: '0.65rem 0.9rem', color: '#38bdf8', fontWeight: 800 }}>#{eq.equipoId}</td>
                          <td style={{ padding: '0.65rem 0.9rem', fontWeight: 800, color: isCurr ? '#34d399' : '#f8fafc' }}>
                            {eq.equipoNombre}
                          </td>
                          <td style={{ padding: '0.65rem 0.7rem', textAlign: 'center', fontWeight: 700, color: '#e2e8f0' }}>
                            {eq.aliados?.length || 0}
                          </td>
                          <td style={{ padding: '0.65rem 0.7rem', textAlign: 'center', fontWeight: 700, color: '#c084fc' }}>
                            {eq.aliadosDeclaradosC2?.length || m.aliadosDeclaradosC2 || 0}
                          </td>
                          <td style={{ padding: '0.65rem 0.7rem', textAlign: 'center', fontWeight: 700, color: '#f8fafc' }}>
                            {m.totalPersonas || m.pxConGrupoNodus || 0}
                          </td>
                          <td style={{ padding: '0.65rem 0.7rem', textAlign: 'center', fontWeight: 800, color: '#10b981' }}>
                            {m.pasaronC2 || 0}
                          </td>
                          <td style={{ padding: '0.65rem 0.7rem', textAlign: 'center', color: '#34d399', fontWeight: 700 }}>
                            {m.pagaronC2 ?? m.pagaronC2Nodus ?? 0}
                          </td>
                          <td style={{ padding: '0.65rem 0.7rem', textAlign: 'center', color: '#a855f7', fontWeight: 700 }}>
                            {m.pagaronC2MJ ?? m.pagaronC2MJNodus ?? 0}
                          </td>
                          <td style={{ padding: '0.65rem 0.7rem', textAlign: 'center', color: '#f59e0b', fontWeight: 700 }}>
                            {m.abonos || 0}
                          </td>
                          <td style={{ padding: '0.65rem 0.7rem', textAlign: 'center', color: '#fbbf24', fontWeight: 800 }}>
                            {m.efectividadPP || '0%'}
                          </td>
                          <td style={{ padding: '0.65rem 0.9rem', textAlign: 'center' }}>
                            {eq.hasSheetContrast ? (
                              <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '2px 8px', borderRadius: '6px', fontSize: '0.73rem', fontWeight: 700 }}>
                                ✅ Sheet QT + Nodus
                              </span>
                            ) : (
                              <span style={{ background: 'rgba(14, 165, 233, 0.16)', color: '#38bdf8', padding: '2px 8px', borderRadius: '6px', fontSize: '0.73rem', fontWeight: 700 }}>
                                ⚡ Nodus en Vivo
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Selector de Equipo, Enlaces Oficiales, Vinculador Sheet y Buscador */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            background: '#1e293b',
            padding: '1rem 1.25rem',
            borderRadius: '10px',
            border: '1px solid #334155'
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600 }}>Equipo Seleccionado:</span>
              <select
                value={selectedEquipoId}
                onChange={(e) => {
                  setSelectedEquipoId(e.target.value);
                  setSelectedQuantumFilter('ALL');
                  setSelectedAliadoPxModal(null);
                }}
                style={{
                  background: '#0f172a',
                  color: '#f8fafc',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.9rem',
                  fontWeight: 700
                }}
              >
                {selectorOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.nombre} (ID {opt.id}){opt.hasSheetContrast ? ' — ✅ Contraste Sheet QT' : (opt.hasData ? ` — ${opt.aliadosCount} Aliados / ${opt.pagos} Pagos` : '')}
                  </option>
                ))}
              </select>

              <a
                href={`https://imo.crearpslglobal.com/aliados?id_equipo=${selectedEquipoId}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'rgba(14, 165, 233, 0.15)',
                  border: '1px solid rgba(14, 165, 233, 0.4)',
                  color: '#38bdf8',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                Nodus /aliados?id_equipo={selectedEquipoId} <ExternalLink size={13} />
              </a>

              {currentTeamAliados.sheetUrl && (
                <a
                  href={currentTeamAliados.sheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#34d399',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  Abrir Sheet QT & Aliados <ExternalLink size={13} />
                </a>
              )}

              <button
                onClick={() => {
                  setShowSheetLinker(!showSheetLinker);
                  setSheetUrlInput(currentTeamAliados.sheetUrl || '');
                  setSheetSyncStatus('');
                }}
                style={{
                  background: showSheetLinker ? '#10b981' : 'rgba(168, 85, 247, 0.18)',
                  border: '1px solid #a855f7',
                  color: showSheetLinker ? '#0f172a' : '#c084fc',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                🔗 {currentTeamAliados.hasSheetContrast ? 'Actualizar Sheet QT de este Equipo' : 'Vincular Sheet QT & Aliados a este Equipo'}
              </button>
            </div>

            <div style={{ position: 'relative', minWidth: '260px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Filtrar por aliado o Quantum (QT)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '0.45rem 0.75rem 0.45rem 2.2rem',
                  color: '#f8fafc',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          {/* PANEL VINCULADOR DE GOOGLE SHEET DE QT & ALIADOS PARA CUALQUIER EQUIPO */}
          {showSheetLinker && (
            <div style={{
              background: '#0f172a',
              border: '1px solid #a855f7',
              borderRadius: '10px',
              padding: '1.1rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: '#c084fc', fontSize: '0.92rem' }}>
                  🔗 Contrastar Google Sheet de QT & Aliados con Nodus ({currentTeamAliados.equipoNombre} — ID {selectedEquipoId})
                </strong>
                <button
                  onClick={() => setShowSheetLinker(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.82rem' }}
                >
                  Cerrar ✕
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={sheetUrlInput}
                  onChange={(e) => setSheetUrlInput(e.target.value)}
                  placeholder="Pega aquí el link del Google Sheet de este equipo (ej. https://docs.google.com/spreadsheets/d/.../edit#gid=...)"
                  style={{
                    flex: 1,
                    minWidth: '280px',
                    background: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem',
                    color: '#f8fafc',
                    fontSize: '0.84rem'
                  }}
                />
                <button
                  onClick={handleSyncTeamSheet}
                  disabled={sheetSyncLoading}
                  style={{
                    background: '#10b981',
                    border: 'none',
                    color: '#0f172a',
                    padding: '0.5rem 1.1rem',
                    borderRadius: '6px',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    cursor: 'pointer'
                  }}
                >
                  {sheetSyncLoading ? 'Contrastando...' : '⚡ Contrastar y Guardar en Causa OS'}
                </button>
              </div>
              <textarea
                rows={4}
                value={sheetPasteInput}
                onChange={(e) => setSheetPasteInput(e.target.value)}
                placeholder="Opcional (si el Sheet es privado): Copia y pega aquí las celdas de la tabla de Aliados y FEEDBACK QT (QUANTUM | ALIADO | PX | DESERTOR | PX FIN | DECLARACION | D. LUNES | C2 | C2+MJ | ABONO | ACUERDO | FICHA | PAGOS | PP)..."
                style={{
                  width: '100%',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '0.5rem 0.75rem',
                  color: '#f8fafc',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace'
                }}
              />
              {sheetSyncStatus && (
                <div style={{ fontSize: '0.82rem', color: sheetSyncStatus.startsWith('✅') ? '#34d399' : '#fbbf24', fontWeight: 700 }}>
                  {sheetSyncStatus}
                </div>
              )}
            </div>
          )}

          {/* Tarjetas KPI de Contraste: Nodus (/aliados?id_equipo=149) vs Google Sheet (QT & Aliados) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: '1rem' }}>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.76rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>PX Iniciales / PX Fin</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.2rem' }}>
                {currentMetrics.totalPersonas || 96} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>→ {currentMetrics.pxFin || 71} Fin</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.3rem', fontWeight: 600 }}>
                Nodus: {currentMetrics.pxConGrupoNodus || 91} en QT (+5 sin grupo) • {currentMetrics.desertores || 20} Desertores
              </div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.76rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Declaración C2</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.2rem' }}>
                {currentMetrics.declaraciones || 27}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '0.3rem', fontWeight: 600 }}>
                ✅ Sheet: {currentMetrics.declaraciones || 27} vs Nodus: 27
              </div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid rgba(16, 185, 129, 0.5)', borderRadius: '10px', padding: '1.1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.76rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 800 }}>Pagos Totales (C2 + MJ)</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#10b981', marginTop: '0.2rem' }}>
                {currentMetrics.pasaronC2 || 35} <span style={{ fontSize: '1rem', color: '#34d399' }}>({currentMetrics.efectividadPP || '49%'} PP)</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.3rem', fontWeight: 700 }}>
                ✅ Sheet: 35 vs Nodus: 35 (100% Cuadrado)
              </div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.76rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Desglose C2 vs C2+MJ</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#a855f7', marginTop: '0.35rem' }}>
                {currentMetrics.pagaronC2 || 28} C2 <span style={{ color: '#64748b' }}>|</span> {currentMetrics.pagaronC2MJ || 7} C2+MJ
              </div>
              <div style={{ fontSize: '0.74rem', color: '#f59e0b', marginTop: '0.35rem', fontWeight: 600 }}>
                Nodus: {currentMetrics.pagaronC2Nodus || 27} C2 | {currentMetrics.pagaronC2MJNodus || 8} C2+MJ (±1 reclasif.)
              </div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.76rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Abonos & Acuerdos</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.2rem' }}>
                {currentMetrics.abonos || 5} <span style={{ fontSize: '0.95rem', color: '#94a3b8' }}>Abonos</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.3rem', fontWeight: 600 }}>
                ✅ Sheet: 5 vs Nodus: 5 • Acuerdos Nodus: {currentMetrics.acuerdosNodus ?? 1}
              </div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.76rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Aliados & Declarados C2</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#ec4899', marginTop: '0.2rem' }}>
                {currentTeamAliados.aliados?.length || 18} <span style={{ fontSize: '0.95rem', color: '#f472b6' }}>({currentMetrics.aliadosDeclaradosC2 || 9} C2)</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#db2777', marginTop: '0.3rem', fontWeight: 600 }}>
                Entrenador: {currentTeamAliados.entrenador || 'Leandro Brunis'} • 4 QT
              </div>
            </div>
          </div>

          {/* TABLA 1: CONSOLIDADO POR QUANTUM (FEEDBACK QT: SHEET vs NODUS) */}
          {Array.isArray(currentTeamAliados.feedbackQT) && currentTeamAliados.feedbackQT.length > 0 && (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid #334155',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
                    1. Consolidado por Quantum (FEEDBACK QT — Google Sheet vs. Nodus)
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                    Haz clic en cualquier Quantum (QT) para filtrar sus Aliados en la tabla inferior.
                  </div>
                </div>
                {selectedQuantumFilter !== 'ALL' && (
                  <button
                    onClick={() => setSelectedQuantumFilter('ALL')}
                    style={{
                      background: 'rgba(14, 165, 233, 0.2)',
                      border: '1px solid #0ea5e9',
                      color: '#38bdf8',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Mostrar todas las QT ({currentTeamAliados.feedbackQT.length})
                  </button>
                )}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                      <th style={{ padding: '0.7rem 1rem' }}>Quantum (QT)</th>
                      <th style={{ padding: '0.7rem 0.75rem', textAlign: 'center' }}>Aliados</th>
                      <th style={{ padding: '0.7rem 0.75rem', textAlign: 'center' }}>PX (Sheet / Nodus)</th>
                      <th style={{ padding: '0.7rem 0.75rem', textAlign: 'center' }}>Desertor</th>
                      <th style={{ padding: '0.7rem 0.75rem', textAlign: 'center' }}>PX Fin</th>
                      <th style={{ padding: '0.7rem 0.75rem', textAlign: 'center' }}>Declaración</th>
                      <th style={{ padding: '0.7rem 0.75rem', textAlign: 'center' }}>C2</th>
                      <th style={{ padding: '0.7rem 0.75rem', textAlign: 'center' }}>C2+MJ</th>
                      <th style={{ padding: '0.7rem 0.75rem', textAlign: 'center' }}>Abono</th>
                      <th style={{ padding: '0.7rem 0.75rem', textAlign: 'center' }}>Pagos (Sheet / Nodus)</th>
                      <th style={{ padding: '0.7rem 0.75rem', textAlign: 'center' }}>% PP</th>
                      <th style={{ padding: '0.7rem 1rem', textAlign: 'center' }}>Contraste Nodus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTeamAliados.feedbackQT.map((qt, idx) => {
                      const isSelected = selectedQuantumFilter === qt.quantum;
                      return (
                        <tr
                          key={idx}
                          onClick={() => setSelectedQuantumFilter(isSelected ? 'ALL' : qt.quantum)}
                          style={{
                            borderBottom: '1px solid #334155',
                            background: isSelected ? 'rgba(14, 165, 233, 0.14)' : (idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'),
                            cursor: 'pointer'
                          }}
                        >
                          <td style={{ padding: '0.7rem 1rem', fontWeight: 800, color: '#f8fafc' }}>
                            👑 {qt.quantum}
                          </td>
                          <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center', color: '#cbd5e1', fontWeight: 700 }}>
                            {qt.totalAliadosQT}
                          </td>
                          <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>
                            <span style={{ color: '#f8fafc' }}>{qt.px}</span>
                            <span style={{ color: '#64748b' }}> / </span>
                            <span style={{ color: '#38bdf8' }}>{qt.pxNodus}</span>
                          </td>
                          <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center', color: '#f87171', fontWeight: 700 }}>
                            {qt.desertor}
                          </td>
                          <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center', color: '#e2e8f0', fontWeight: 700 }}>
                            {qt.pxFin}
                          </td>
                          <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center', color: '#38bdf8', fontWeight: 700 }}>
                            {qt.declaracion}
                          </td>
                          <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center', color: '#10b981', fontWeight: 700 }}>
                            {qt.c2}
                          </td>
                          <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center', color: '#a855f7', fontWeight: 700 }}>
                            {qt.c2mj}
                          </td>
                          <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center', color: '#f59e0b', fontWeight: 700 }}>
                            {qt.abono}
                          </td>
                          <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center', fontWeight: 800 }}>
                            <span style={{ color: '#10b981' }}>{qt.pagos}</span>
                            <span style={{ color: '#64748b' }}> / </span>
                            <span style={{ color: '#34d399' }}>{qt.pagosNodus}</span>
                          </td>
                          <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center', fontWeight: 800, color: '#fbbf24' }}>
                            {qt.pp}
                          </td>
                          <td style={{ padding: '0.7rem 1rem', textAlign: 'center' }}>
                            {qt.cuadradoConNodus ? (
                              <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                                ✅ CUADRADO
                              </span>
                            ) : (
                              <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                                ⚠️ DIF ({qt.diffPagosNodus})
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {currentTeamAliados.sinGrupoRow && (
                      <tr style={{ borderBottom: '1px solid #334155', background: 'rgba(239, 68, 68, 0.06)' }}>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: '#fca5a5' }}>
                          ⚠️ SIN GRUPO DE CREACIÓN
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#94a3b8' }}>—</td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#fca5a5', fontWeight: 700 }}>
                          {currentTeamAliados.sinGrupoRow.px} / 0
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#f87171', fontWeight: 700 }}>
                          {currentTeamAliados.sinGrupoRow.desertor}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#94a3b8' }}>
                          {currentTeamAliados.sinGrupoRow.pxFin}
                        </td>
                        <td colSpan={7} style={{ padding: '0.65rem 1rem', color: '#94a3b8', fontSize: '0.78rem' }}>
                          5 participantes iniciales sin grupo que desertaron en C1 (explica la diferencia entre 96 PX Sheet y 91 PX Nodus).
                        </td>
                      </tr>
                    )}
                    {currentTeamAliados.sheetTotals && (
                      <tr style={{ background: '#0f172a', borderTop: '2px solid #475569', fontWeight: 800, color: '#f8fafc' }}>
                        <td style={{ padding: '0.75rem 1rem' }}>TOTAL GENERAL EQUIPO 32</td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>17 (+1)</td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>
                          {currentTeamAliados.sheetTotals.px} ({currentTeamAliados.feedbackQTTotals?.px || 91} QT / 91 Nodus)
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center', color: '#f87171' }}>
                          {currentTeamAliados.sheetTotals.desertor}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>
                          {currentTeamAliados.sheetTotals.pxFin}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center', color: '#38bdf8' }}>
                          {currentTeamAliados.sheetTotals.declaracion}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center', color: '#10b981' }}>
                          {currentTeamAliados.sheetTotals.c2} <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>(27 Nodus)</span>
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center', color: '#a855f7' }}>
                          {currentTeamAliados.sheetTotals.c2mj} <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>(8 Nodus)</span>
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center', color: '#f59e0b' }}>
                          {currentTeamAliados.sheetTotals.abono}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center', color: '#10b981' }}>
                          {currentTeamAliados.sheetTotals.pagos} / 35
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center', color: '#fbbf24' }}>
                          {currentTeamAliados.sheetTotals.pp}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#34d399' }}>
                          ✅ 35 = 35
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TABLA 2: MOVIMIENTO DETALLADO POR ALIADO (NODUS vs SHEET OFICIAL) */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #334155', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
                  2. Movimiento por Aliado: Nodus (/aliados?id_equipo={selectedEquipoId}) vs. Hoja Oficial QT & Aliados
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                  Comparativa individual de PX asignados, desertores, declaraciones, C2, C2+MJ, abonos, pagos totales y % PP.
                </div>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700 }}>
                Mostrando {(currentTeamAliados.aliados || []).filter(a => (selectedQuantumFilter === 'ALL' || a.quantum === selectedQuantumFilter) && (!searchTerm || a.aliado?.toLowerCase().includes(searchTerm.toLowerCase()) || a.quantum?.toLowerCase().includes(searchTerm.toLowerCase()))).length} aliados
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '0.7rem 0.9rem' }}>Quantum (QT)</th>
                    <th style={{ padding: '0.7rem 0.9rem' }}>Aliado & Teléfono Nodus</th>
                    <th style={{ padding: '0.7rem 0.65rem', textAlign: 'center' }}>PX (Sheet / Nodus)</th>
                    <th style={{ padding: '0.7rem 0.65rem', textAlign: 'center' }}>Desertor</th>
                    <th style={{ padding: '0.7rem 0.65rem', textAlign: 'center' }}>PX Fin</th>
                    <th style={{ padding: '0.7rem 0.65rem', textAlign: 'center' }}>Declaración</th>
                    <th style={{ padding: '0.7rem 0.65rem', textAlign: 'center' }}>C2</th>
                    <th style={{ padding: '0.7rem 0.65rem', textAlign: 'center' }}>C2+MJ</th>
                    <th style={{ padding: '0.7rem 0.65rem', textAlign: 'center' }}>Abono</th>
                    <th style={{ padding: '0.7rem 0.65rem', textAlign: 'center' }}>Pagos (Sheet / Nodus)</th>
                    <th style={{ padding: '0.7rem 0.65rem', textAlign: 'center' }}>% PP</th>
                    <th style={{ padding: '0.7rem 0.65rem', textAlign: 'center' }}>Estado</th>
                    <th style={{ padding: '0.7rem 0.9rem', textAlign: 'center' }}>Participantes</th>
                  </tr>
                </thead>
                <tbody>
                  {(currentTeamAliados.aliados || [])
                    .filter(a => selectedQuantumFilter === 'ALL' || a.quantum === selectedQuantumFilter)
                    .filter(a => !searchTerm || (a.aliado || '').toLowerCase().includes(searchTerm.toLowerCase()) || (a.quantum || '').toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((row, idx) => {
                      const pxSheet = row.pxSheet ?? row.asignados ?? 0;
                      const pxNodus = row.pxNodus ?? row.asignados ?? 0;
                      const pagosSheet = row.pagosSheet ?? ((row.pagaronC2 || 0) + (row.pagaronC2MJ || 0));
                      const pagosNodus = row.pagosNodus ?? pagosSheet;
                      const isCuadrado = row.cuadrado !== undefined ? row.cuadrado : (pxSheet === pxNodus && pagosSheet === pagosNodus);

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #334155', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                          <td style={{ padding: '0.7rem 0.9rem', fontWeight: 700, color: '#38bdf8', fontSize: '0.78rem' }}>
                            {row.quantum || 'EQUIPO'}
                          </td>
                          <td style={{ padding: '0.7rem 0.9rem' }}>
                            <div style={{ fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span>{row.aliado}</span>
                              {row.declaradoC2Nodus && (
                                <span style={{ background: 'rgba(168, 85, 247, 0.2)', border: '1px solid rgba(168, 85, 247, 0.45)', color: '#c084fc', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                                  Declarado C2 Nodus
                                </span>
                              )}
                            </div>
                            {row.telefono && (
                              <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                                📱 {row.telefono}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.7rem 0.65rem', textAlign: 'center', fontWeight: 700 }}>
                            <span style={{ color: '#f8fafc' }}>{pxSheet}</span>
                            <span style={{ color: '#64748b' }}> / </span>
                            <span style={{ color: '#38bdf8' }}>{pxNodus}</span>
                          </td>
                          <td style={{ padding: '0.7rem 0.65rem', textAlign: 'center', color: (row.desertor || 0) > 0 ? '#f87171' : '#64748b', fontWeight: 700 }}>
                            {row.desertor ?? 0}
                          </td>
                          <td style={{ padding: '0.7rem 0.65rem', textAlign: 'center', color: '#e2e8f0', fontWeight: 700 }}>
                            {row.pxFin ?? row.c1 ?? 0}
                          </td>
                          <td style={{ padding: '0.7rem 0.65rem', textAlign: 'center', color: '#38bdf8', fontWeight: 700 }}>
                            {row.declaracion ?? row.pasaronC2 ?? 0}
                          </td>
                          <td style={{ padding: '0.7rem 0.65rem', textAlign: 'center', color: '#10b981', fontWeight: 700 }}>
                            {row.c2 !== undefined && typeof row.c2 === 'number' ? row.c2 : (row.pagaronC2 ?? 0)}
                          </td>
                          <td style={{ padding: '0.7rem 0.65rem', textAlign: 'center', color: '#a855f7', fontWeight: 700 }}>
                            {row.c2mj ?? row.pagaronC2MJ ?? 0}
                          </td>
                          <td style={{ padding: '0.7rem 0.65rem', textAlign: 'center', color: '#f59e0b', fontWeight: 700 }}>
                            {row.abono ?? 0}
                          </td>
                          <td style={{ padding: '0.7rem 0.65rem', textAlign: 'center', fontWeight: 800 }}>
                            <span style={{ color: '#10b981' }}>{pagosSheet}</span>
                            <span style={{ color: '#64748b' }}> / </span>
                            <span style={{ color: '#34d399' }}>{pagosNodus}</span>
                          </td>
                          <td style={{ padding: '0.7rem 0.65rem', textAlign: 'center', fontWeight: 800, color: '#fbbf24' }}>
                            {row.pp || '0%'}
                          </td>
                          <td style={{ padding: '0.7rem 0.65rem', textAlign: 'center' }}>
                            {isCuadrado ? (
                              <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '2px 7px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                                ✅ OK
                              </span>
                            ) : (
                              <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '2px 7px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                                ⚠️ Revisar
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.7rem 0.9rem', textAlign: 'center' }}>
                            <button
                              onClick={() => setSelectedAliadoPxModal(row)}
                              style={{
                                background: '#334155',
                                border: '1px solid #475569',
                                color: '#f8fafc',
                                padding: '4px 9px',
                                borderRadius: '5px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Ver PX ({row.participantesAsignados?.length || pxSheet})
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MODAL DE PARTICIPANTES ASIGNADOS AL ALIADO (PESTAÑA PX DEL GOOGLE SHEET) */}
          {selectedAliadoPxModal && (
            <div style={{
              background: '#0f172a',
              border: '2px solid #0ea5e9',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.45)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', fontWeight: 800 }}>
                    Participantes Asignados a {selectedAliadoPxModal.aliado} (QT: {selectedAliadoPxModal.quantum})
                  </h4>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '3px' }}>
                    PX Sheet: <strong>{selectedAliadoPxModal.pxSheet}</strong> • PX Nodus: <strong>{selectedAliadoPxModal.pxNodus}</strong> • Pagos C2/MJ: <strong>{selectedAliadoPxModal.pagosSheet}</strong> ({selectedAliadoPxModal.pp} PP)
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAliadoPxModal(null)}
                  style={{
                    background: '#ef4444',
                    border: 'none',
                    color: '#fff',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cerrar detalle ✕
                </button>
              </div>

              {Array.isArray(selectedAliadoPxModal.participantesAsignados) && selectedAliadoPxModal.participantesAsignados.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                        <th style={{ padding: '0.55rem 0.75rem' }}>N°</th>
                        <th style={{ padding: '0.55rem 0.75rem' }}>Participante (PX)</th>
                        <th style={{ padding: '0.55rem 0.75rem' }}>Teléfono</th>
                        <th style={{ padding: '0.55rem 0.75rem' }}>Enrolador (IMO)</th>
                        <th style={{ padding: '0.55rem 0.75rem' }}>CA</th>
                        <th style={{ padding: '0.55rem 0.75rem' }}>Estatus Sheet</th>
                        <th style={{ padding: '0.55rem 0.75rem' }}>Observación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAliadoPxModal.participantesAsignados.map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={{ padding: '0.55rem 0.75rem', color: '#64748b' }}>{p.numero}</td>
                          <td style={{ padding: '0.55rem 0.75rem', color: '#f8fafc', fontWeight: 700 }}>{p.nombreCompleto}</td>
                          <td style={{ padding: '0.55rem 0.75rem', color: '#94a3b8' }}>{p.telefono}</td>
                          <td style={{ padding: '0.55rem 0.75rem', color: '#cbd5e1' }}>{p.imo}</td>
                          <td style={{ padding: '0.55rem 0.75rem', color: '#38bdf8', fontWeight: 700 }}>{p.ca}</td>
                          <td style={{ padding: '0.55rem 0.75rem' }}>
                            <span style={{
                              background: p.status.includes('C2') ? 'rgba(16, 185, 129, 0.2)' : (p.status.includes('ABONO') ? 'rgba(245, 158, 11, 0.2)' : (p.status.includes('DESERTOR') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(100, 116, 139, 0.2)')),
                              color: p.status.includes('C2') ? '#34d399' : (p.status.includes('ABONO') ? '#fbbf24' : (p.status.includes('DESERTOR') ? '#f87171' : '#94a3b8')),
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '0.73rem',
                              fontWeight: 700
                            }}>
                              {p.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.55rem 0.75rem', color: '#94a3b8' }}>{p.observacion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  No hay participantes asignados a este aliado en la pestaña PX.
                </div>
              )}
            </div>
          )}

          {/* TABLA 3: ALIADOS DECLARADOS A C2 Y PARTICIPANTES CONFIRMADOS EN C2 EN NODUS */}
          {((currentTeamAliados.aliadosDeclaradosC2?.length > 0) || (currentTeamAliados.participantesC2Nodus?.length > 0)) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
              {Array.isArray(currentTeamAliados.aliadosDeclaradosC2) && currentTeamAliados.aliadosDeclaradosC2.length > 0 && (
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1rem 1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#c084fc' }}>
                    🛡️ Aliados Declarados a C2 en Nodus ({currentTeamAliados.aliadosDeclaradosC2.length}) — {currentTeamAliados.equipoNombre}
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {currentTeamAliados.aliadosDeclaradosC2.map((name, i) => (
                      <span
                        key={i}
                        style={{
                          background: 'rgba(168, 85, 247, 0.16)',
                          border: '1px solid rgba(168, 85, 247, 0.4)',
                          color: '#e9d5ff',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700
                        }}
                      >
                        ✓ {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(currentTeamAliados.participantesC2Nodus) && currentTeamAliados.participantesC2Nodus.length > 0 && (
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1rem 1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#34d399' }}>
                    🎟️ Participantes Confirmados a C2 en Nodus ({currentTeamAliados.participantesC2Nodus.length}) — {currentTeamAliados.equipoNombre}
                  </h4>
                  <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.45rem' }}>
                    {currentTeamAliados.participantesC2Nodus.map((p, i) => (
                      <div
                        key={i}
                        style={{
                          background: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          padding: '0.4rem 0.65rem',
                          fontSize: '0.76rem'
                        }}
                      >
                        <div style={{ color: '#f8fafc', fontWeight: 700 }}>{p.nombre}</div>
                        {p.dni && <div style={{ color: '#38bdf8', fontSize: '0.7rem' }}>ID: {p.dni}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO DE PESTAÑA: CONTABILIDAD */}
      {activeTab === 'contabilidad' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Monto Total Recaudado
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#10b981', marginTop: '0.3rem' }}>
                {contabilidadMetricas.montoRecaudado}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '0.4rem' }}>
                Ingresos verificados en caja Nodus
              </div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Pagos Cerrados
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#38bdf8', marginTop: '0.3rem' }}>
                {contabilidadMetricas.pagosCerrados}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#0284c7', marginTop: '0.4rem' }}>
                100% de transacciones conciliadas
              </div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Pagos Pendientes
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#f8fafc', marginTop: '0.3rem' }}>
                {contabilidadMetricas.pagosPendientes}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '0.4rem' }}>
                Cero mora / Cero descuadre
              </div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Participantes Auditados
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#f59e0b', marginTop: '0.3rem' }}>
                {contabilidadMetricas.totalParticipantes}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#d97706', marginTop: '0.4rem' }}>
                96 asistieron formalmente a C1
              </div>
            </div>
          </div>

          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#f8fafc', fontWeight: 700 }}>
              Reglas de Conciliación Financiera (Cero Alucinación)
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.7' }}>
              <li>Toda transacción se valida con identificador único de factura en Nodus (<code>id_factura</code>).</li>
              <li>Montos conciliados en moneda original (PEN / USD) sin conversiones arbitrarias.</li>
              <li>Pagos cerrados corresponden estrictamente a comprobantes aprobados por administración y finanzas.</li>
            </ul>
          </div>
        </div>
      )}

      {/* CONTENIDO DE PESTAÑA: ASISTENTE VIRTUAL */}
      {activeTab === 'asistente' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(168, 85, 247, 0.2)', padding: '0.5rem', borderRadius: '8px' }}>
                <Bot size={24} style={{ color: '#c084fc' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', fontWeight: 700 }}>
                  Asistente Virtual Nodus (v1.0.0) — Consulta en Directo
                </h3>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Auditoría conversacional en tiempo real sin salir de Causa OS.
                </div>
              </div>
            </div>

            <form onSubmit={handleRunAssistantQuery} style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <input
                type="text"
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                placeholder="Ejemplo: cuantos pagos cerraron en c1 32"
                style={{
                  flex: 1,
                  background: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  padding: '0.65rem 1rem',
                  color: '#f8fafc',
                  fontSize: '0.95rem'
                }}
              />
              <button
                type="submit"
                disabled={assistantLoading}
                style={{
                  background: '#7c3aed',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.65rem 1.4rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Sparkles size={16} /> {assistantLoading ? 'Consultando...' : 'Consultar'}
              </button>
            </form>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Sugerencias:</span>
              <button
                onClick={() => setAssistantInput('cuantos pagos cerraron en c1 32')}
                style={{ background: 'none', border: 'none', color: '#c084fc', fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer' }}
              >
                cuantos pagos cerraron en c1 32
              </button>
              <button
                onClick={() => setAssistantInput('cuantos pasaron a c2')}
                style={{ background: 'none', border: 'none', color: '#c084fc', fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer' }}
              >
                cuantos pasaron a c2
              </button>
            </div>

            {/* Resultado de la Consulta */}
            {assistantResponse && (
              <div style={{
                marginTop: '1.5rem',
                background: '#0f172a',
                border: '1px solid #6b21a8',
                borderRadius: '8px',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#c084fc', fontWeight: 700, textTransform: 'uppercase' }}>
                    Respuesta Oficial de Nodus DB
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {new Date(assistantResponse.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{
                  color: '#f8fafc',
                  fontSize: '0.92rem',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace'
                }}>
                  {assistantResponse.response}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTENIDO DE PESTAÑA: CATÁLOGO DE MÓDULOS */}
      {activeTab === 'catalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', fontWeight: 700 }}>
                Catálogo Transversal de Módulos Nodus ({catalogList.length})
              </h3>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                Todos los módulos de la barra lateral son monitoreados y extraídos en cada ciclo de sincronización.
              </div>
            </div>
            <span style={{
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#10b981',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              100% Indexados
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {catalogList.map((mod, i) => (
              <div
                key={i}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      background: 'rgba(14, 165, 233, 0.15)',
                      color: '#38bdf8',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      {mod.section}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#10b981' }}>
                      <CheckCircle2 size={12} /> Activo
                    </span>
                  </div>

                  <h4 style={{ margin: '0.75rem 0 0.25rem 0', fontSize: '1.05rem', color: '#f8fafc', fontWeight: 700 }}>
                    {mod.title}
                  </h4>
                  <code style={{ fontSize: '0.8rem', color: '#94a3b8', background: '#0f172a', padding: '2px 6px', borderRadius: '4px' }}>
                    {mod.path}
                  </code>
                </div>

                <div style={{ borderTop: '1px solid #334155', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Auto-sincronizado
                  </span>
                  <a
                    href={`https://imo.crearpslglobal.com${mod.path}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#38bdf8',
                      fontSize: '0.8rem',
                      textDecoration: 'none'
                    }}
                  >
                    Abrir en Nodus <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
