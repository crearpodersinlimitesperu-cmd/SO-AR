/**
 * src/services/nodusReportSync.js
 * =========================================================================
 * Sincronización Automática Multi-Sede con Nodus para el Centro de Reportes
 * =========================================================================
 * Conecta todas las sedes (Lima, Quito, Cuenca, Guayaquil, Medellín, México)
 * con:
 *   1. API Oficial en Vivo de Nodus (https://imo.crearpslglobal.com/api)
 *   2. Fuentes sincronizadas en Firestore (nodus_report_sources / nodus_coordinadores_c1c2)
 * Sin inventar ni estimar conteos: si Nodus no aporta etiquetas de llamada,
 * muestra el resumen real en vivo del equipo para verificación humana.
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase.js';
import { calendarSede } from '../../functions-imo/calendarModel.mjs';
import { getLiveNodusEquipos, getLiveNodusParticipantes } from './nodusLiveApiService.js';
import {
  buildReportSources,
  currentReportTeams,
  reportSourceStatus
} from './nodusReportModel.js';
import { explicitTeamFromText } from './goalsTimeline.js';

/**
 * Normaliza cualquier nombre de sede de Nodus (ej. "CUENCA CICLO 1", "MÉXICO CICLO 1", "UIO C1")
 * al nombre canónico de Causa OS ("Cuenca", "México", "Quito", etc.).
 */
export function normalizeNodusSede(value = '') {
  const raw = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
  if (!raw) return '';
  if (raw.includes('LIMA') || /\bLIM\b/.test(raw)) return 'Lima';
  if (raw.includes('QUITO') || /\bUIO\b/.test(raw)) return 'Quito';
  if (raw.includes('CUENCA') || /\bCUE\b/.test(raw)) return 'Cuenca';
  if (raw.includes('GUAYAQUIL') || /\bGYE\b/.test(raw)) return 'Guayaquil';
  if (raw.includes('MEDELLIN') || /\bMED\b/.test(raw)) return 'Medellín';
  if (raw.includes('MEXICO') || raw.includes('CDMX') || /\bMEX\b/.test(raw)) return 'México';
  if (raw.includes('BOGOTA') || /\bBOG\b/.test(raw)) return 'Bogotá';
  return calendarSede(value);
}

/**
 * Normaliza el nombre de equipo de Nodus (ej. "EQUIPO 32" -> "32")
 */
export function extractTeamNumber(teamName = '') {
  const raw = String(teamName || '').trim();
  if (/^\d+$/.test(raw)) return String(Number(raw));
  return explicitTeamFromText(raw) || '';
}

/**
 * Resume de forma exacta y determinista los participantes reales de un equipo Nodus.
 */
export function summarizeNodusParticipants(equipo = {}, participantes = []) {
  const list = Array.isArray(participantes) ? participantes : [];
  let pagadosC1 = 0;
  let asistieronC1 = 0;
  let desertoresC1 = 0;
  let pagadosC2 = 0;
  let maestriaC2 = 0;
  const coordMap = new Map();

  for (const p of list) {
    const c1 = p.capitulo1 || {};
    const c2 = p.capitulo2 || {};
    const pagado1 = Boolean(p.pagadoC1 ?? c1.pagado);
    const asistio1 = Boolean(p.asistioC1 ?? c1.asistio);
    const desertor1 = Boolean(p.desertorC1 ?? c1.desertor);
    const pagado2 = Boolean(p.pagadoC2 ?? c2.pagado);
    const maestria = Boolean(c2.maestria);

    if (pagado1) pagadosC1++;
    if (asistio1) asistieronC1++;
    if (desertor1) desertoresC1++;
    if (pagado2) pagadosC2++;
    if (maestria) maestriaC2++;

    const coord = String(p.coordinador || '').trim();
    if (coord) {
      coordMap.set(coord, (coordMap.get(coord) || 0) + 1);
    }
  }

  const coordinadores = [...coordMap.entries()]
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total);

  return {
    equipoId: equipo.id || null,
    equipoNombre: equipo.nombre || '',
    teamNumber: extractTeamNumber(equipo.nombre || ''),
    sedeNodus: equipo.sede || '',
    sedeNormalizada: normalizeNodusSede(equipo.sede || ''),
    etapaVigente: equipo.etapa_vigente || 'PFD',
    fechaInicio: equipo.fecha_inicio || '',
    fechaFin: equipo.fecha_fin || '',
    totalPx: list.length,
    pagadosC1,
    sinPagarC1: Math.max(0, list.length - pagadosC1),
    asistieronC1,
    desertoresC1,
    pagadosC2,
    maestriaC2,
    coordinadores
  };
}

/**
 * Selecciona el mejor equipo activo de Nodus para una sede y número de equipo opcional.
 */
export function selectNodusEquipoForSede(equipos = [], sede = '', preferredTeam = '') {
  const targetSede = normalizeNodusSede(sede);
  if (!targetSede) return null;

  const matching = (Array.isArray(equipos) ? equipos : []).filter(
    eq => normalizeNodusSede(eq.sede || '') === targetSede
  );
  if (matching.length === 0) return null;

  if (preferredTeam && preferredTeam !== 'auto') {
    const exact = matching.find(eq => extractTeamNumber(eq.nombre) === String(preferredTeam));
    if (exact) return exact;
  }

  // Priorizar equipos con participantes > 0 y fecha_inicio más reciente
  const sorted = [...matching].sort((a, b) => {
    const aHasPx = (a.participantes || 0) > 0 ? 1 : 0;
    const bHasPx = (b.participantes || 0) > 0 ? 1 : 0;
    if (aHasPx !== bHasPx) return bHasPx - aHasPx;
    return String(b.fecha_inicio || '').localeCompare(String(a.fecha_inicio || ''));
  });

  return sorted[0];
}

/**
 * Extrae automáticamente datos de Nodus para cualquier sede:
 * - Conteos de llamadas verificables (desde nodus_report_sources o nodus_coordinadores_c1c2)
 * - Padrón y métricas en vivo (desde la API oficial de Nodus /equipos + /participantes/:id)
 */
export async function syncNodusForReport({
  sede = '',
  stage = 'C1',
  teamOverride = null,
  events = [],
  includeCallSources = true
} = {}) {
  const normalizedSede = normalizeNodusSede(sede);
  const targets = normalizedSede && stage ? currentReportTeams(events || [], normalizedSede, stage) : [];
  const target = targets.find(t => t.team === teamOverride) || (targets.length === 1 ? targets[0] : null);

  let source = null;
  let sourceStatus = target ? reportSourceStatus(null, target) : { ready: false, message: '' };

  if (includeCallSources && normalizedSede && stage) {
    try {
      const docSnap = await getDoc(doc(db, 'nodus_report_sources', `${normalizedSede}_${stage}`));
      if (docSnap.exists()) {
        source = docSnap.data();
        sourceStatus = reportSourceStatus(source, target);
      }

      if (!sourceStatus.ready) {
        const coordSnap = await getDoc(doc(db, 'nodus_coordinadores_c1c2', 'latest'));
        if (coordSnap.exists()) {
          const derived = buildReportSources(coordSnap.data());
          const matchedSource = derived.find(s => s.sede === normalizedSede && s.stage === stage);
          if (matchedSource) {
            const derivedStatus = reportSourceStatus(matchedSource, target);
            if (derivedStatus.ready || !source) {
              source = matchedSource;
              sourceStatus = derivedStatus;
            }
          }
        }
      }
    } catch (err) {
      console.warn('No se pudo consultar fuentes de llamadas en Firestore:', err?.message || err);
    }
  }

  let liveSummary = null;
  let liveEquiposSede = [];
  let liveError = null;

  if (normalizedSede) {
    try {
      const eqRes = await getLiveNodusEquipos({ enActividad: true });
      if (eqRes.ok && Array.isArray(eqRes.data)) {
        liveEquiposSede = eqRes.data
          .filter(eq => normalizeNodusSede(eq.sede || '') === normalizedSede)
          .map(eq => ({
            id: eq.id,
            nombre: eq.nombre,
            teamNumber: extractTeamNumber(eq.nombre),
            sede: eq.sede,
            etapaVigente: eq.etapa_vigente,
            fechaInicio: eq.fecha_inicio,
            fechaFin: eq.fecha_fin,
            participantes: eq.participantes || 0
          }));

        const preferredTeam = (teamOverride && teamOverride !== 'auto')
          ? teamOverride
          : target?.team || '';

        const chosen = selectNodusEquipoForSede(eqRes.data, normalizedSede, preferredTeam);
        if (chosen?.id) {
          const pRes = await getLiveNodusParticipantes(chosen.id);
          if (pRes.ok) {
            liveSummary = {
              ...summarizeNodusParticipants(chosen, pRes.participantes),
              apiSource: pRes.source || 'LIVE_API',
              syncedAt: new Date().toISOString()
            };
          } else {
            liveError = pRes.error || 'No se pudo leer participantes de Nodus';
          }
        }
      } else {
        liveError = eqRes.error || 'No se pudo conectar con la API de Nodus';
      }
    } catch (err) {
      liveError = err?.message || 'Error de red con Nodus';
    }
  }

  return {
    normalizedSede,
    targets,
    target,
    source,
    sourceStatus,
    liveSummary,
    liveEquiposSede,
    liveError
  };
}
