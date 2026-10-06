/**
 * Agente Guardián de Genealogía y Linaje CPSL (Multi-Sede)
 * Realiza cruce automatizado entre el CRM Maestro y las bases Nodus C1/C2
 * y catálogo histórico de graduados de Poder Sin Límites.
 */

import nodusFallback from '../data/nodusFallbackData.json';
import limaGraduadosFallback from '../data/limaGraduadosLineage.json';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

export const SEDES_CATALOG = [
  { key: 'ALL', label: 'Todas las Sedes (Global)', flag: '🌐', pais: 'Global' },
  { key: 'Lima', label: 'PE Lima', flag: '🇵🇪', pais: 'Perú' },
  { key: 'Quito', label: 'EC Quito', flag: '🇪🇨', pais: 'Ecuador' },
  { key: 'Guayaquil', label: 'EC Guayaquil', flag: '🇪🇨', pais: 'Ecuador' },
  { key: 'Cuenca', label: 'EC Cuenca', flag: '🇪🇨', pais: 'Ecuador' },
  { key: 'Medellin', label: 'CO Medellín', flag: '🇨🇴', pais: 'Colombia' },
  { key: 'CDMX', label: 'MX México (CDMX)', flag: '🇲🇽', pais: 'México' }
];

/**
 * Normaliza nombres de sede de manera tolerante a variaciones, tildes y codificaciones
 */
export function normalizeSedeName(raw) {
  if (!raw) return 'Lima';
  const clean = String(raw).trim().toLowerCase();
  const s = clean
    .replace(/Ã­|Ã¬|í|ì/g, 'i')
    .replace(/Ã©|Ã¨|é|è/g, 'e')
    .replace(/Ã¡|Ã|á|à/g, 'a')
    .replace(/Ã³|Ã²|ó|ò/g, 'o')
    .replace(/Ãº|Ã¹|ú|ù/g, 'u')
    .replace(/Ã±|ñ/g, 'n')
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (s.includes('medell') || s.includes('mde') || s.includes('colombia')) return 'Medellin';
  if (s.includes('mexic') || s.includes('xico') || s.includes('cdmx') || s.includes('df')) return 'CDMX';
  if (s.includes('quit') || s.includes('uio')) return 'Quito';
  if (s.includes('guaya') || s.includes('gye')) return 'Guayaquil';
  if (s.includes('cuenc') || s.includes('cue')) return 'Cuenca';
  if (s.includes('lim') || s.includes('peru')) return 'Lima';
  return 'Lima';
}

/**
 * Detecta sede inteligentemente a partir de datos del participante o contacto
 */
export function detectItemSede(item) {
  if (!item) return 'Lima';
  if (item.sede || item.ciudad) {
    const fromSede = normalizeSedeName(item.sede || item.ciudad);
    if (fromSede !== 'Lima' || String(item.sede || item.ciudad).toLowerCase().includes('lima')) {
      return fromSede;
    }
  }

  // Detectar por equipo
  const eq = String(item.equipo || item.equipoNumero || '').toLowerCase();
  if (eq.includes('medell') || eq.includes('colombia')) return 'Medellin';
  if (eq.includes('mexic') || eq.includes('cdmx')) return 'CDMX';
  if (eq.includes('quito')) return 'Quito';
  if (eq.includes('guayaquil') || eq.includes('gye')) return 'Guayaquil';
  if (eq.includes('cuenca')) return 'Cuenca';
  if (eq.includes('lima')) return 'Lima';

  // Detectar por coordinador/a
  const coord = String(item.coordinadora || item.coordinador || '').toUpperCase();
  if (coord.includes('VALENTINA') || coord.includes('DAVID') || coord.includes('SOTO') || coord.includes('YURANY')) return 'Medellin';
  if (coord.includes('NAOMI') || coord.includes('NAO CAMPOS') || coord.includes('MONROY') || coord.includes('ZAMORA')) return 'CDMX';
  if (coord.includes('ADRIANNA') || coord.includes('LILIANA') || coord.includes('KARLA') || coord.includes('ADAMS') || coord.includes('DANNA') || coord.includes('MARCELA')) return 'Quito';
  if (coord.includes('MACAS') || coord.includes('BRENDA') || coord.includes('LA ROSA') || coord.includes('JORGE')) return 'Guayaquil';
  if (coord.includes('MARIBEL') || coord.includes('JOAO') || coord.includes('REINOSO') || coord.includes('EVELYN') || coord.includes('FERNANDO')) return 'Cuenca';
  if (coord.includes('JOYCE') || coord.includes('MOSCOSO') || coord.includes('LEYLA') || coord.includes('VALENCIA')) return 'Lima';

  // Detectar por teléfono
  const phone = String(item.telefono || item.celular || '').replace(/\D/g, '');
  if (phone.startsWith('57') || (phone.length === 10 && phone.startsWith('3'))) return 'Medellin';
  if (phone.startsWith('52')) return 'CDMX';
  if (phone.startsWith('593')) return 'Quito';

  return 'Lima';
}

/**
 * Normaliza nombres de líderes de red / IMO
 */
export function cleanEnrolador(raw) {
  if (!raw) return 'REGISTROS DIRECTOS / SIN ENROLADOR';
  const clean = String(raw).trim().toUpperCase();
  if (['-', '--', '---', '.', '..', 'N/A', 'NA', 'NULL', 'NONE', 'SIN ASIGNAR', 'SIN ENROLADOR', 'S/N', '0', 'SIN IMO'].includes(clean)) {
    return 'REGISTROS DIRECTOS / SIN ENROLADOR';
  }
  if (clean.includes('CREAR PODER SIN LIMITES') || clean.includes('CPSL') || clean.includes('DIRECTA') || clean.includes('WEB') || clean.includes('CORPORATIV')) {
    return 'INSCRIPCIÓN DIRECTA CORPORATIVA';
  }
  return clean;
}

/**
 * Normaliza nombres de personas para matching infalible
 */
export function normalizePersonName(name) {
  if (!name) return '';
  return String(name)
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z\s]/g, '')
    .replace(/\s+/g, ' ');
}

class CRMGenealogyAgent {
  constructor() {
    this.nodusData = null;
    this.graduadosLineage = null;
    this.graduadosLookup = new Map();
    this.lastAudit = null;
  }

  /**
   * Carga los datos maestros de Nodus C1/C2 (desde Firestore o Fallback)
   */
  async getNodusData() {
    if (this.nodusData) return this.nodusData;

    try {
      if (db) {
        const nodusDoc = await getDoc(doc(db, 'nodus_coordinadores_c1c2', 'latest'));
        if (nodusDoc.exists()) {
          this.nodusData = nodusDoc.data();
          return this.nodusData;
        }
      }
    } catch (e) {
      console.warn("Aviso: usando fallback local para Nodus C1/C2", e);
    }

    this.nodusData = nodusFallback;
    return this.nodusData;
  }

  /**
   * Carga catálogo de linaje histórico de graduados CPSL
   */
  async getGraduadosLineageData() {
    if (this.graduadosLineage) return this.graduadosLineage;

    try {
      if (db) {
        const docRef = await getDoc(doc(db, 'graduados_lineage_master', 'latest'));
        if (docRef.exists()) {
          this.graduadosLineage = docRef.data();
          this.buildLookup();
          return this.graduadosLineage;
        }
      }
    } catch (e) {
      console.warn("Aviso: usando catálogo local para linaje de graduados", e);
    }

    this.graduadosLineage = limaGraduadosFallback;
    this.buildLookup();
    return this.graduadosLineage;
  }

  /**
   * Construye mapa hash para búsqueda O(1) de linaje
   */
  buildLookup() {
    this.graduadosLookup.clear();
    const list = this.graduadosLineage?.graduados || [];
    list.forEach(item => {
      const norm = normalizePersonName(item.nombre);
      if (norm) {
        this.graduadosLookup.set(norm, item);
        const tokens = norm.split(' ');
        if (tokens.length >= 2) {
          const shortKey = `${tokens[0]} ${tokens[tokens.length - 1]}`;
          if (!this.graduadosLookup.has(shortKey)) {
            this.graduadosLookup.set(shortKey, item);
          }
        }
      }
    });
  }

  /**
   * Identifica el linaje de un IMO / Participante
   */
  findGraduado(rawName) {
    if (!rawName) return null;
    const norm = normalizePersonName(rawName);
    if (!norm) return null;

    if (this.graduadosLookup.has(norm)) {
      return this.graduadosLookup.get(norm);
    }

    const tokens = norm.split(' ');
    if (tokens.length >= 2) {
      const shortKey = `${tokens[0]} ${tokens[tokens.length - 1]}`;
      if (this.graduadosLookup.has(shortKey)) {
        return this.graduadosLookup.get(shortKey);
      }
    }

    for (const [key, item] of this.graduadosLookup.entries()) {
      if (norm.length > 5 && (key.includes(norm) || norm.includes(key))) {
        return item;
      }
    }

    return null;
  }

  /**
   * Ejecuta auditoría genealógica completa por sede y global
   */
  async auditGenealogy(participants = [], targetSede = 'ALL') {
    const nodus = await this.getNodusData();
    const coordinadores = nodus?.coordinadores || [];
    await this.getGraduadosLineageData();

    // 1. Filtrar participantes por sede si no es 'ALL'
    const realParticipants = participants.filter(p => !p.isManager);
    let filteredList = realParticipants;
    if (targetSede && targetSede !== 'ALL') {
      const targetNorm = normalizeSedeName(targetSede);
      filteredList = realParticipants.filter(p => normalizeSedeName(p.sede || p.ciudad) === targetNorm);
    }

    // 2. Detección de duplicados (intra-sede e inter-sede)
    const dniMap = new Map();
    const phoneMap = new Map();
    const nameMap = new Map();
    const crossSedeDuplicates = [];

    realParticipants.forEach(p => {
      const dni = (p.dni || p.documento || '').trim();
      const phone = (p.telefono || p.celular || '').replace(/\D/g, '');
      const name = (p.nombreCompleto || p.nombre || '').trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const sede = normalizeSedeName(p.sede || p.ciudad);

      if (dni && dni.length >= 6 && dni !== '00000000' && dni !== '12345678') {
        if (!dniMap.has(dni)) dniMap.set(dni, []);
        dniMap.get(dni).push({ ...p, normalizedSede: sede });
      }

      if (phone && phone.length >= 7) {
        if (!phoneMap.has(phone)) phoneMap.set(phone, []);
        phoneMap.get(phone).push({ ...p, normalizedSede: sede });
      }

      if (name && name.length >= 7) {
        if (!nameMap.has(name)) nameMap.set(name, []);
        nameMap.get(name).push({ ...p, normalizedSede: sede });
      }
    });

    // Detectar duplicados que cruzan sedes
    const addCrossSedeDuplicates = (recordsMap, tipo) => {
      recordsMap.forEach((list, valor) => {
        if (list.length <= 1) return;
        const sedesEncontradas = new Set(list.map(x => x.normalizedSede));
        if (sedesEncontradas.size > 1) {
          crossSedeDuplicates.push({
            tipo,
            valor,
            sedes: Array.from(sedesEncontradas),
            registros: list
          });
        }
      });
    };

    addCrossSedeDuplicates(dniMap, 'DNI');
    addCrossSedeDuplicates(phoneMap, 'Teléfono');

    // 3. Auditoría de Linaje de Graduados CPSL
    const imosGraduadosSet = new Set();
    const participantsGraduadosSet = new Set();
    const teamCounter = {};

    filteredList.forEach(p => {
      const imo = cleanEnrolador(p.imoEnrolador || p.imo);
      if (!imo.includes('DIRECTOS') && !imo.includes('CORPORATIV')) {
        const gImo = this.findGraduado(imo);
        if (gImo) {
          imosGraduadosSet.add(imo);
          const eq = 'E' + (gImo.equipoOriginal || '?');
          teamCounter[eq] = (teamCounter[eq] || 0) + 1;
        }
      }

      const pName = p.nombreCompleto || p.nombre;
      if (pName) {
        const gPart = this.findGraduado(pName);
        if (gPart) {
          participantsGraduadosSet.add(pName);
        }
      }
    });

    const topTeamsLineage = Object.entries(teamCounter)
      .map(([team, count]) => ({ team, count }))
      .sort((a, b) => b.count - a.count);

    // 4. Métricas por sede
    const sedesMetrics = {};
    SEDES_CATALOG.forEach(s => {
      if (s.key === 'ALL') return;
      const normKey = normalizeSedeName(s.key);
      const partsSede = realParticipants.filter(p => normalizeSedeName(p.sede || p.ciudad) === normKey);
      const coordsSede = coordinadores.filter(c => normalizeSedeName(c.sede) === normKey);
      const nodusSede = (nodus?.sedes || []).find(ns => normalizeSedeName(ns.sede) === normKey);

      const totalParts = partsSede.length;
      const sentados = partsSede.filter(p => String(p.estadoC1 || '').toUpperCase().includes('SENTADO')).length;
      const pendientes = partsSede.filter(p => String(p.estadoC1 || '').toUpperCase().includes('PENDIENTE')).length;

      // Cruce con totales de coordinadoras y sedes Nodus
      const sumCoordinatorMetric = values => {
        const presentValues = values.filter(value => value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value)));
        return presentValues.length ? presentValues.reduce((sum, value) => sum + Number(value), 0) : undefined;
      };
      const nodusAsignados = nodusSede?.asignadosTotal ?? sumCoordinatorMetric(coordsSede.map(c => c.asignados));
      const nodusSentados = nodusSede?.asistieronTotal
        ?? nodusSede?.sentadosC1Total
        ?? sumCoordinatorMetric(coordsSede.map(c => c.sentadosTotal ?? c.asistieron));
      const nodusPendientes = nodusSede?.porConfirmarTotal
        ?? sumCoordinatorMetric(coordsSede.map(c => c.estados?.porConfirmar));
      const metricTotal = nodusAsignados ?? totalParts;
      const metricSentados = nodusSentados ?? sentados;
      const metricPendientes = nodusPendientes ?? pendientes;

      // Agrupación de IMOs para esta sede
      const imosSet = new Set();
      partsSede.forEach(p => {
        const imo = cleanEnrolador(p.imoEnrolador || p.imo);
        if (!imo.includes('DIRECTOS') && !imo.includes('CORPORATIV')) {
          imosSet.add(imo);
        }
      });

      const conversion = metricTotal > 0 ? Math.round((metricSentados / metricTotal) * 100) : 0;

      sedesMetrics[normKey] = {
        sede: normKey,
        label: s.label,
        flag: s.flag,
        pais: s.pais,
        totalParticipantes: metricTotal,
        sentados: metricSentados,
        pendientes: metricPendientes,
        conversionPorcentaje: conversion,
        imosActivos: imosSet.size,
        coordinadorasNodus: coordsSede.map(c => c.nombre || c.name),
        saludEstructural: metricTotal > 0
          ? (conversion >= 50 ? 'EXCELENTE' : (conversion >= 30 ? 'REGULAR' : 'EN_SEGUIMIENTO'))
          : 'SIN_DATOS'
      };
    });

    // Métricas del conjunto filtrado actual
    let currentTotal;
    let currentSentados;
    let currentPendientes;

    if (targetSede !== 'ALL') {
      const sNorm = normalizeSedeName(targetSede);
      const sMetric = sedesMetrics[sNorm];
      if (sMetric) {
        currentTotal = sMetric.totalParticipantes;
        currentSentados = sMetric.sentados;
        currentPendientes = sMetric.pendientes;
      }
    } else {
      currentTotal = nodus?.totales?.totalAsignados ?? filteredList.length;
      currentSentados = nodus?.totales?.totalAsistieron
        ?? nodus?.totales?.totalSentadosC1
        ?? filteredList.filter(p => String(p.estadoC1 || '').toUpperCase().includes('SENTADO')).length;
      currentPendientes = nodus?.totales?.totalPorConfirmar
        ?? filteredList.filter(p => String(p.estadoC1 || '').toUpperCase().includes('PENDIENTE')).length;
    }

    const currentConversion = currentTotal > 0 ? ((currentSentados / currentTotal) * 100).toFixed(1) : null;

    const auditResult = {
      timestamp: new Date().toISOString(),
      targetSede,
      totalRegistros: currentTotal,
      sentados: currentSentados,
      pendientes: currentPendientes,
      conversionPct: currentConversion,
      sedesMetrics,
      crossSedeDuplicates,
      totalDuplicadosGlobal: Array.from(dniMap.values()).filter(l => l.length > 1).length
        + Array.from(phoneMap.values()).filter(l => l.length > 1).length
        + Array.from(nameMap.values()).filter(l => l.length > 1).length,
      coordinadoresTotalesNodus: coordinadores.length,
      coherenciaEstructural: null,
      lineageAudit: {
        totalGraduadosEnCatalogo: limaGraduadosFallback?.graduados?.length || 0,
        imosGraduadosActivos: imosGraduadosSet.size,
        participantesGraduadosActivos: participantsGraduadosSet.size,
        topTeamsLineage
      }
    };

    this.lastAudit = auditResult;
    return auditResult;
  }
}

export const crmGenealogyAgent = new CRMGenealogyAgent();

export function findGraduadoLineage(name) {
  return crmGenealogyAgent.findGraduado(name);
}
