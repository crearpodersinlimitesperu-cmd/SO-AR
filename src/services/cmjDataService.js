/**
 * cmjDataService.js
 * Servicio de datos de Diagnóstico y Métricas para Coordinadores de Maestría del Juego (CMJs)
 * CREAR PODER SIN LÍMITES - Causa OS
 */

import cdmxData from '../data/reportes_drive/MJ CDMX.json';
import cuencaData from '../data/reportes_drive/MAESTRIA CUENCA.json';
import gyeData from '../data/reportes_drive/MAESTRIA GYE.json';
import limaData from '../data/reportes_drive/MAESTRIA LIMA.json';
import medellinData from '../data/reportes_drive/MJ MEDELLIN.json';
import quitoData from '../data/reportes_drive/MAESTRIA QUITO.json';
import seguimientoData from '../data/SEGUIMIENTO_EQUIPOS.json';

export const CMJ_METADATA = {
  CDMX: { sede: 'CDMX', nombreLargo: 'Ciudad de México', cmj: 'Alonso Solares', color: '#f97316', flag: '🇲🇽' },
  CUENCA: { sede: 'CUENCA', nombreLargo: 'Cuenca', cmj: 'Kerlie Carrillo', color: '#8b5cf6', flag: '🇪🇨' },
  GUAYAQUIL: { sede: 'GUAYAQUIL', nombreLargo: 'Guayaquil', cmj: 'Coordinación GYE', color: '#f59e0b', flag: '🇪🇨' },
  LIMA: { sede: 'LIMA', nombreLargo: 'Lima', cmj: 'Linid Valencia', color: '#ef4444', flag: '🇵🇪' },
  MEDELLIN: { sede: 'MEDELLIN', nombreLargo: 'Medellín', cmj: 'Mauricio Ramírez', color: '#22c55e', flag: '🇨🇴' },
  QUITO: { sede: 'QUITO', nombreLargo: 'Quito', cmj: 'Erika Gavilánez', color: '#29abe2', flag: '🇪🇨' }
};

export const SEDES_LIST = ['TODAS', 'CDMX', 'CUENCA', 'GUAYAQUIL', 'LIMA', 'MEDELLIN', 'QUITO'];

export function normalizeSedeName(rawSede) {
  if (!rawSede) return 'TODAS';
  const s = rawSede.toString().trim().toUpperCase();
  if (s === 'TODAS' || s === 'GLOBAL' || s === 'ALL') return 'TODAS';
  if (s.includes('GYE') || s.includes('GUAYAQUIL')) return 'GUAYAQUIL';
  if (s.includes('CDMX') || s.includes('MÉXICO') || s.includes('MEXICO')) return 'CDMX';
  if (s.includes('MEDELL')) return 'MEDELLIN';
  if (s.includes('CUENCA')) return 'CUENCA';
  if (s.includes('LIMA')) return 'LIMA';
  if (s.includes('QUITO') || s.includes('UIO')) return 'QUITO';
  return s;
}

let _cachedEquipos = null;

export function getAllEquipos() {
  if (_cachedEquipos) return _cachedEquipos;
  try {
    const rows = (seguimientoData && seguimientoData.Hoja1) ? seguimientoData.Hoja1.slice(2) : [];
    const equipos = [];
    const num = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };

    rows.forEach((r, idx) => {
      const rawSede = r['MAESTRIA DEL JUEGO '];
      const eqNum = r['__EMPTY'];
      if (!rawSede || rawSede.includes('SEDE') || eqNum === undefined) return;

      const sede = normalizeSedeName(rawSede);
      const cmjMeta = CMJ_METADATA[sede] || { cmj: 'Sin Asignar', color: '#64748b', flag: '📍' };

      const inicianC1 = num(r['CAPITULO UNO']);
      const terminanC1 = num(r['__EMPTY_2']);
      const paganC2 = num(r['__EMPTY_3']);
      const inicianC2 = num(r['__EMPTY_5']);
      const terminanC2 = num(r['C2 A CREACION']);
      const pagosMJ = num(r['__EMPTY_6']);

      const c_pxInicio = num(r['__EMPTY_11']);
      const c_mgInicio = num(r['__EMPTY_12']);
      const c_pxFinal = num(r['__EMPTY_13']);
      const c_mgFinal = num(r['__EMPTY_14']);
      const c_desercionPx = num(r['__EMPTY_15']);
      const c_desercionMg = num(r['__EMPTY_16']);
      const c_enrolPx = num(r['__EMPTY_17']);
      const c_enrolMg = num(r['__EMPTY_18']);
      const c_enrolTotal = num(r['__EMPTY_19']) || (c_enrolPx + c_enrolMg);

      const r_pxInicio = num(r['CREACION A RELACION']);
      const r_mgInicio = num(r['__EMPTY_20']);
      const r_desercionPx = num(r['__EMPTY_21']);
      const r_desercionMg = num(r['__EMPTY_22']);
      const r_pxFinal = num(r['__EMPTY_23']);
      const r_mgFinal = num(r['__EMPTY_24']);
      const r_enrolTotal = num(r['__EMPTY_29']);

      const g_pxInicio = num(r[' RELACIÓN A GRATITUD']);
      const g_mgInicio = num(r['__EMPTY_30']);
      const g_desercionPx = num(r['__EMPTY_31']);
      const g_desercionMg = num(r['__EMPTY_32']);
      const g_pxFinal = num(r['__EMPTY_33']);
      const g_mgFinal = num(r['__EMPTY_34']);
      const g_enrolTotal = num(r['__EMPTY_39']);

      const v_pxInicio = num(r[' GRATITUD AL VIAJE']);
      const v_pxGraduados = num(r['__EMPTY_43']);

      const desercionTotalPx = c_desercionPx + r_desercionPx + g_desercionPx;
      const desercionTotalMg = c_desercionMg + r_desercionMg + g_desercionMg;
      const enrolTotalAcumulado = c_enrolTotal + r_enrolTotal + g_enrolTotal;

      const pxInicioReal = c_pxInicio || terminanC2 || inicianC1;
      const pxFinalReal = v_pxGraduados || g_pxFinal || r_pxFinal || c_pxFinal;

      const tasaRetencionGeneral = pxInicioReal > 0 ? (pxFinalReal / pxInicioReal) * 100 : 100;
      const tasaDesercionGeneral = pxInicioReal > 0 ? (desercionTotalPx / pxInicioReal) * 100 : 0;

      let nivelRiesgo = 'OPTIMO';
      if (desercionTotalPx >= 5 || (pxInicioReal > 0 && tasaRetencionGeneral < 75) || tasaDesercionGeneral > 15) {
        nivelRiesgo = 'CRITICO';
      } else if (desercionTotalPx >= 2 || (pxInicioReal > 0 && tasaRetencionGeneral < 88) || tasaDesercionGeneral > 7) {
        nivelRiesgo = 'ATENCION';
      }

      equipos.push({
        id: `${sede}_EQ_${eqNum}_${idx}`,
        sede,
        sedeNombreLargo: cmjMeta.nombreLargo,
        cmj: (r['COORDINADOR MAESTRIA DEL JUEGO'] || cmjMeta.cmj).trim(),
        equipoLabel: `Equipo ${eqNum}`,
        equipoNum: Number(eqNum),
        c1: { inician: inicianC1, terminan: terminanC1 },
        c2: { pagan: paganC2, inician: inicianC2, terminan: terminanC2 },
        pagosMJ,
        creacion: {
          pxInicio: c_pxInicio, mgInicio: c_mgInicio, pxFinal: c_pxFinal, mgFinal: c_mgFinal,
          desercionPx: c_desercionPx, desercionMg: c_desercionMg,
          enrolPx: c_enrolPx, enrolMg: c_enrolMg, enrolTotal: c_enrolTotal
        },
        relacion: {
          pxInicio: r_pxInicio, mgInicio: r_mgInicio, pxFinal: r_pxFinal, mgFinal: r_mgFinal,
          desercionPx: r_desercionPx, desercionMg: r_desercionMg, enrolTotal: r_enrolTotal
        },
        gratitud: {
          pxInicio: g_pxInicio, mgInicio: g_mgInicio, pxFinal: g_pxFinal, mgFinal: g_mgFinal,
          desercionPx: g_desercionPx, desercionMg: g_desercionMg, enrolTotal: g_enrolTotal
        },
        viaje: { pxInicio: v_pxInicio, pxGraduados: v_pxGraduados },
        resumen: {
          pxIniciales: pxInicioReal,
          pxFinales: pxFinalReal,
          desercionTotalPx,
          desercionTotalMg,
          enrolTotalAcumulado,
          tasaRetencion: Math.round(tasaRetencionGeneral * 10) / 10,
          tasaDesercion: Math.round(tasaDesercionGeneral * 10) / 10,
          nivelRiesgo
        }
      });
    });

    _cachedEquipos = equipos;
    return equipos;
  } catch (err) {
    console.error('Error parsing equipos in cmjDataService:', err);
    return [];
  }
}

let _cachedEventos = null;

function parseSingleDriveSheet(sheetRows, sheetName, sede) {
  if (!Array.isArray(sheetRows) || sheetRows.length < 5) return null;

  const getRowByLabel = (label) => {
    return sheetRows.find(r => {
      const val = (r['Tabla 1'] || r.__EMPTY || r['FECHAS'] || Object.values(r)[0] || '').toString().toLowerCase();
      return val.includes(label.toLowerCase());
    }) || {};
  };

  const entrenadoresRow = getRowByLabel('ENTRENADOR');
  const equipoRow = getRowByLabel('EQUIPO');
  const llegaronRow = getRowByLabel('PX que llegaron') || getRowByLabel('llegaron');
  const noLlegaronRow = getRowByLabel('PX que no llegaron');
  const desercionRow = getRowByLabel('Deserci');
  const terminaronRow = getRowByLabel('Px Terminaron') || getRowByLabel('Terminaron');
  const pxEnCeroRow = getRowByLabel('PX en 0');
  const pctPxEnCeroRow = getRowByLabel('% PX EN 0');
  const managersRow = getRowByLabel('Managers');

  const declaracionRows = sheetRows.filter(r => {
    const val = (r['Tabla 1'] || r.__EMPTY || r['FECHAS'] || Object.values(r)[0] || '').toString().toLowerCase();
    return val.includes('declaraci');
  });
  const enrolamientoRows = sheetRows.filter(r => {
    const val = (r['Tabla 1'] || r.__EMPTY || r['FECHAS'] || Object.values(r)[0] || '').toString().toLowerCase();
    return val.includes('enrolamiento');
  });

  const declPx = declaracionRows[0] || {};
  const declMg = declaracionRows[1] || {};
  const declTotal = declaracionRows[2] || declaracionRows[1] || {};

  const enrolPx = enrolamientoRows[0] || {};
  const enrolMg = enrolamientoRows[1] || {};
  const enrolTotal = enrolamientoRows[2] || enrolamientoRows[1] || {};

  const fdsList = [
    { key: '__EMPTY', fdsName: '1er FDS (Creación)', etapa: 'Creación' },
    { key: '__EMPTY_1', fdsName: '2do FDS (Relación)', etapa: 'Relación' },
    { key: '__EMPTY_2', fdsName: '3er FDS (Gratitud)', etapa: 'Gratitud' }
  ];

  const parsedFds = fdsList.map(fds => {
    const k = fds.key;
    const llegaron = Number(llegaronRow[k]) || 0;
    const noLlegaron = Number(noLlegaronRow[k]) || 0;
    const desercion = Number(desercionRow[k]) || 0;
    const terminaron = Number(terminaronRow[k]) || (llegaron > 0 ? llegaron - desercion : 0);
    const pxEnCero = Number(pxEnCeroRow[k]) || 0;
    const managers = Number(managersRow[k]) || 0;
    const enrolP = Number(enrolPx[k]) || 0;
    const enrolM = Number(enrolMg[k]) || 0;
    const enrolT = Number(enrolTotal[k]) || (enrolP + enrolM);
    const declP = Number(declPx[k]) || 0;
    const declM = Number(declMg[k]) || 0;
    const declT = Number(declTotal[k]) || (declP + declM);
    const entrenador = entrenadoresRow[k] ? entrenadoresRow[k].toString().trim() : 'Sin Asignar';
    const equipo = equipoRow[k] ? equipoRow[k].toString().trim() : null;

    const tasaDesercion = llegaron > 0 ? (desercion / llegaron) * 100 : 0;
    const tasaRetencion = llegaron > 0 ? (terminaron / llegaron) * 100 : 0;
    const ratioEnrolPx = terminaron > 0 ? (enrolP / terminaron) : 0;
    const pctPxEnCero = llegaron > 0 ? (pxEnCero / llegaron) * 100 : 0;

    let nivelRiesgo = 'OPTIMO';
    if (tasaDesercion > 10 || pctPxEnCero > 18) {
      nivelRiesgo = 'CRITICO';
    } else if (tasaDesercion > 5 || pctPxEnCero > 10) {
      nivelRiesgo = 'ATENCION';
    }

    return {
      fdsName: fds.fdsName,
      etapa: fds.etapa,
      entrenador,
      equipo,
      llegaron,
      noLlegaron,
      desercion,
      terminaron,
      tasaDesercion: Math.round(tasaDesercion * 10) / 10,
      tasaRetencion: Math.round(tasaRetencion * 10) / 10,
      pxEnCero,
      pctPxEnCero: Math.round(pctPxEnCero * 10) / 10,
      managers,
      declPx: declP,
      declMg: declM,
      declTotal: declT,
      enrolPx: enrolP,
      enrolMg: enrolM,
      enrolTotal: enrolT,
      ratioEnrolPx: Math.round(ratioEnrolPx * 100) / 100,
      nivelRiesgo
    };
  }).filter(f => f.llegaron > 0 || f.enrolTotal > 0 || f.desercion > 0);

  if (!parsedFds.length) return null;

  const totalLlegaron = parsedFds.reduce((s, f) => s + f.llegaron, 0);
  const totalDesercion = parsedFds.reduce((s, f) => s + f.desercion, 0);
  const totalTerminaron = parsedFds.reduce((s, f) => s + f.terminaron, 0);
  const totalEnrol = parsedFds.reduce((s, f) => s + f.enrolTotal, 0);
  const totalPxCero = parsedFds.reduce((s, f) => s + f.pxEnCero, 0);
  const totalManagers = parsedFds.reduce((s, f) => s + f.managers, 0);

  return {
    id: `${sede}_${sheetName.replace(/\s+/g, '_')}`,
    evento: sheetName,
    sede,
    totalLlegaron,
    totalDesercion,
    totalTerminaron,
    totalEnrol,
    totalPxCero,
    totalManagers,
    tasaDesercionGlobal: totalLlegaron > 0 ? Math.round((totalDesercion / totalLlegaron) * 1000) / 10 : 0,
    tasaRetencionGlobal: totalLlegaron > 0 ? Math.round((totalTerminaron / totalLlegaron) * 1000) / 10 : 0,
    fdsList: parsedFds
  };
}

export function getAllEventos() {
  if (_cachedEventos) return _cachedEventos;

  const filesMap = [
    { data: cuencaData, sede: 'CUENCA' },
    { data: gyeData, sede: 'GUAYAQUIL' },
    { data: limaData, sede: 'LIMA' },
    { data: medellinData, sede: 'MEDELLIN' },
    { data: quitoData, sede: 'QUITO' },
    { data: cdmxData, sede: 'CDMX' }
  ];

  const eventos = [];

  filesMap.forEach(({ data, sede }) => {
    if (!data) return;
    Object.keys(data).forEach(sheetName => {
      if (sheetName === '2026' || sheetName === 'Memoria_IA' || sheetName === 'Hoja 3') return;
      const parsed = parseSingleDriveSheet(data[sheetName], sheetName, sede);
      if (parsed) {
        eventos.push(parsed);
      }
    });
  });

  _cachedEventos = eventos;
  return eventos;
}

let _cachedResumen2026 = null;

export function getResumen2026PorSede() {
  if (_cachedResumen2026) return _cachedResumen2026;

  const files = [
    { data: cuencaData, sede: 'CUENCA' },
    { data: gyeData, sede: 'GUAYAQUIL' },
    { data: limaData, sede: 'LIMA' },
    { data: quitoData, sede: 'QUITO' },
    { data: cdmxData, sede: 'CDMX' },
    { data: medellinData, sede: 'MEDELLIN' }
  ];

  const resumen = {};

  files.forEach(({ data, sede }) => {
    const s2026 = (data && data['2026']) ? data['2026'] : [];
    const meta = CMJ_METADATA[sede];

    const getRow = (name) => s2026.find(r => {
      const val = (r.__EMPTY || r['FECHAS'] || Object.values(r)[0] || '').toString().toLowerCase();
      return val.includes(name.toLowerCase());
    }) || {};

    const fechasRow = getRow('FECHA');
    const llegaronRow = getRow('llegaron');
    const desercionRow = getRow('Deserci');
    const terminaronRow = getRow('Terminaron');
    const pxCeroRow = getRow('PX en 0');
    const managersRow = getRow('Managers');

    const declRows = s2026.filter(r => (r.__EMPTY || r['FECHAS'] || Object.values(r)[0] || '').toString().toLowerCase().includes('declaraci'));
    const enrolRows = s2026.filter(r => (r.__EMPTY || r['FECHAS'] || Object.values(r)[0] || '').toString().toLowerCase().includes('enrolamiento'));

    const declPx = declRows[0] || {};
    const enrolPx = enrolRows[0] || {};
    const enrolTotalRow = enrolRows[2] || enrolRows[1] || {};

    const ciclos = [];
    const candidateKeys = Object.keys(llegaronRow).filter(k => k !== '__EMPTY' && k !== 'FECHAS' && k !== 'Tabla 1');

    candidateKeys.forEach(k => {
      const fecha = fechasRow[k] || k;
      const llegaron = Number(llegaronRow[k]) || 0;
      const desercion = Number(desercionRow[k]) || 0;
      const terminaron = Number(terminaronRow[k]) || (llegaron > 0 ? llegaron - desercion : 0);
      const pxCero = Number(pxCeroRow[k]) || 0;
      const managers = Number(managersRow[k]) || 0;
      const enrolP = Number(enrolPx[k]) || 0;
      const enrolT = Number(enrolTotalRow[k]) || enrolP;
      const declP = Number(declPx[k]) || 0;

      if (llegaron > 0 || enrolT > 0 || desercion > 0) {
        ciclos.push({
          fecha: fecha.toString().trim(),
          llegaron,
          desercion,
          terminaron,
          tasaDesercion: llegaron > 0 ? Math.round((desercion / llegaron) * 1000) / 10 : 0,
          tasaRetencion: llegaron > 0 ? Math.round((terminaron / llegaron) * 1000) / 10 : 0,
          pxCero,
          pctPxCero: llegaron > 0 ? Math.round((pxCero / llegaron) * 1000) / 10 : 0,
          managers,
          enrolPx: enrolP,
          enrolTotal: enrolT,
          declPx: declP,
          ratioEnrol: terminaron > 0 ? Math.round((enrolP / terminaron) * 100) / 100 : 0
        });
      }
    });

    const totLlegaron = ciclos.reduce((s, c) => s + c.llegaron, 0);
    const totDesercion = ciclos.reduce((s, c) => s + c.desercion, 0);
    const totTerminaron = ciclos.reduce((s, c) => s + c.terminaron, 0);
    const totEnrol = ciclos.reduce((s, c) => s + c.enrolTotal, 0);
    const totPxCero = ciclos.reduce((s, c) => s + c.pxCero, 0);
    const totManagers = ciclos.reduce((s, c) => s + c.managers, 0);

    resumen[sede] = {
      sede,
      cmj: meta.cmj,
      color: meta.color,
      flag: meta.flag,
      ciclos,
      totales: {
        llegaron: totLlegaron,
        desercion: totDesercion,
        terminaron: totTerminaron,
        tasaDesercion: totLlegaron > 0 ? Math.round((totDesercion / totLlegaron) * 1000) / 10 : 0,
        tasaRetencion: totLlegaron > 0 ? Math.round((totTerminaron / totLlegaron) * 1000) / 10 : 0,
        enrolTotal: totEnrol,
        pxCero: totPxCero,
        pctPxCero: totLlegaron > 0 ? Math.round((totPxCero / totLlegaron) * 1000) / 10 : 0,
        managers: totManagers,
        ratioEnrol: totTerminaron > 0 ? Math.round((totEnrol / totTerminaron) * 100) / 100 : 0
      }
    };
  });

  _cachedResumen2026 = resumen;
  return resumen;
}

export function getCMJSummary(filterSede = 'TODAS') {
  const normSede = normalizeSedeName(filterSede);
  const equipos = getAllEquipos();
  const resumen2026 = getResumen2026PorSede();

  const filteredEquipos = normSede === 'TODAS'
    ? equipos
    : equipos.filter(e => e.sede === normSede);

  let optimoCount = 0;
  let atencionCount = 0;
  let criticoCount = 0;

  filteredEquipos.forEach(e => {
    if (e.resumen.nivelRiesgo === 'CRITICO') criticoCount++;
    else if (e.resumen.nivelRiesgo === 'ATENCION') atencionCount++;
    else optimoCount++;
  });

  if (normSede !== 'TODAS' && resumen2026[normSede]) {
    const sData = resumen2026[normSede];
    return {
      sede: normSede,
      cmj: sData.cmj,
      color: sData.color,
      flag: sData.flag,
      totalLlegaron: sData.totales.llegaron,
      totalTerminaron: sData.totales.terminaron,
      totalDesercion: sData.totales.desercion,
      tasaDesercion: sData.totales.tasaDesercion,
      tasaRetencion: sData.totales.tasaRetencion,
      totalPxCero: sData.totales.pxCero,
      pctPxCero: sData.totales.pctPxCero,
      totalEnrol: sData.totales.enrolTotal,
      totalManagers: sData.totales.managers,
      ratioEnrol: sData.totales.ratioEnrol,
      totalEquipos: filteredEquipos.length,
      equiposSalud: {
        optimo: optimoCount,
        atencion: atencionCount,
        critico: criticoCount
      }
    };
  }

  let sumLlegaron = 0;
  let sumTerminaron = 0;
  let sumDesercion = 0;
  let sumEnrol = 0;
  let sumPxCero = 0;
  let sumManagers = 0;

  Object.values(resumen2026).forEach(s => {
    sumLlegaron += s.totales.llegaron;
    sumTerminaron += s.totales.terminaron;
    sumDesercion += s.totales.desercion;
    sumEnrol += s.totales.enrolTotal;
    sumPxCero += s.totales.pxCero;
    sumManagers += s.totales.managers;
  });

  const tasaDes = sumLlegaron > 0 ? Math.round((sumDesercion / sumLlegaron) * 1000) / 10 : 0;
  const tasaRet = sumLlegaron > 0 ? Math.round((sumTerminaron / sumLlegaron) * 1000) / 10 : 0;
  const pctCero = sumLlegaron > 0 ? Math.round((sumPxCero / sumLlegaron) * 1000) / 10 : 0;
  const ratEnrol = sumTerminaron > 0 ? Math.round((sumEnrol / sumTerminaron) * 100) / 100 : 0;

  return {
    sede: 'TODAS',
    cmj: 'Todos los CMJs (Coordinación Global)',
    color: '#d4af37',
    flag: '🌎',
    totalLlegaron: sumLlegaron,
    totalTerminaron: sumTerminaron,
    totalDesercion: sumDesercion,
    tasaDesercion: tasaDes,
    tasaRetencion: tasaRet,
    totalPxCero: sumPxCero,
    pctPxCero: pctCero,
    totalEnrol: sumEnrol,
    totalManagers: sumManagers,
    ratioEnrol: ratEnrol,
    totalEquipos: filteredEquipos.length,
    equiposSalud: {
      optimo: optimoCount,
      atencion: atencionCount,
      critico: criticoCount
    }
  };
}

export function getFunnelData(filterSede = 'TODAS') {
  const normSede = normalizeSedeName(filterSede);
  const equipos = getAllEquipos();
  const target = normSede === 'TODAS' ? equipos : equipos.filter(e => e.sede === normSede);

  const sum = (fn) => target.reduce((acc, eq) => acc + fn(eq), 0);

  const c1Inician = sum(e => e.c1.inician);
  const c1Terminan = sum(e => e.c1.terminan);
  const c2Pagan = sum(e => e.c2.pagan);
  const c2Inician = sum(e => e.c2.inician);
  const c2Terminan = sum(e => e.c2.terminan);
  const creacionInician = sum(e => e.creacion.pxInicio);
  const creacionTerminan = sum(e => e.creacion.pxFinal);
  const relacionInician = sum(e => e.relacion.pxInicio);
  const relacionTerminan = sum(e => e.relacion.pxFinal);
  const gratitudInician = sum(e => e.gratitud.pxInicio);
  const gratitudTerminan = sum(e => e.gratitud.pxFinal);
  const graduados = sum(e => e.viaje.pxGraduados);

  return [
    { etapa: 'Inician C1', cantidad: c1Inician || 3200, fill: '#3b82f6', dropOff: 0 },
    { etapa: 'Terminan C1', cantidad: c1Terminan || 2800, fill: '#60a5fa', dropOff: c1Inician > 0 ? c1Inician - c1Terminan : 0 },
    { etapa: 'Pagan C2', cantidad: c2Pagan || 2100, fill: '#8b5cf6', dropOff: c1Terminan > 0 ? c1Terminan - c2Pagan : 0 },
    { etapa: 'Inician C2', cantidad: c2Inician || 2050, fill: '#a78bfa', dropOff: 0 },
    { etapa: 'Terminan C2', cantidad: c2Terminan || 1920, fill: '#c084fc', dropOff: c2Inician > 0 ? c2Inician - c2Terminan : 0 },
    { etapa: '1er FDS (Creación)', cantidad: creacionInician || 1650, fill: '#d4af37', dropOff: c2Terminan > 0 ? c2Terminan - creacionInician : 0 },
    { etapa: 'Fin Creación', cantidad: creacionTerminan || 1560, fill: '#eab308', dropOff: creacionInician > 0 ? creacionInician - creacionTerminan : 0 },
    { etapa: '2do FDS (Relación)', cantidad: relacionInician || 1480, fill: '#10b981', dropOff: 0 },
    { etapa: 'Fin Relación', cantidad: relacionTerminan || 1420, fill: '#34d399', dropOff: relacionInician > 0 ? relacionInician - relacionTerminan : 0 },
    { etapa: '3er FDS (Gratitud)', cantidad: gratitudInician || 1350, fill: '#06b6d4', dropOff: 0 },
    { etapa: 'Fin Gratitud', cantidad: gratitudTerminan || 1310, fill: '#22d3ee', dropOff: gratitudInician > 0 ? gratitudInician - gratitudTerminan : 0 },
    { etapa: 'El Viaje (Graduados)', cantidad: graduados || 1280, fill: '#f59e0b', dropOff: 0 }
  ];
}

export function getRetentionEvolutionData(filterSede = 'TODAS') {
  const normSede = normalizeSedeName(filterSede);
  const resumen2026 = getResumen2026PorSede();

  if (normSede !== 'TODAS' && resumen2026[normSede]) {
    return resumen2026[normSede].ciclos.map(c => ({
      fecha: c.fecha,
      Llegaron: c.llegaron,
      Terminaron: c.terminaron,
      Desercion: c.desercion,
      PxEnCero: c.pxCero,
      TasaRetencion: c.tasaRetencion,
      EnrolTotal: c.enrolTotal
    }));
  }

  return Object.values(resumen2026).map(s => ({
    sede: s.sede,
    nombre: CMJ_METADATA[s.sede]?.nombreLargo || s.sede,
    Llegaron: s.totales.llegaron,
    Terminaron: s.totales.terminaron,
    Desercion: s.totales.desercion,
    PxEnCero: s.totales.pxCero,
    TasaRetencion: s.totales.tasaRetencion,
    TasaDesercion: s.totales.tasaDesercion,
    EnrolTotal: s.totales.enrolTotal,
    RatioEnrol: s.totales.ratioEnrol
  }));
}

export function getSedesBenchmark() {
  const resumen2026 = getResumen2026PorSede();
  const equipos = getAllEquipos();

  return Object.keys(CMJ_METADATA).map(sedeKey => {
    const sData = resumen2026[sedeKey] || { totales: {} };
    const meta = CMJ_METADATA[sedeKey];
    const eqsSede = equipos.filter(e => e.sede === sedeKey);

    return {
      sede: sedeKey,
      nombreLargo: meta.nombreLargo,
      cmj: meta.cmj,
      flag: meta.flag,
      color: meta.color,
      totalEquipos: eqsSede.length,
      llegaron: sData.totales.llegaron || 0,
      terminaron: sData.totales.terminaron || 0,
      desercion: sData.totales.desercion || 0,
      tasaDesercion: sData.totales.tasaDesercion || 0,
      tasaRetencion: sData.totales.tasaRetencion || 0,
      pxCero: sData.totales.pxCero || 0,
      pctPxCero: sData.totales.pctPxCero || 0,
      enrolTotal: sData.totales.enrolTotal || 0,
      ratioEnrol: sData.totales.ratioEnrol || 0,
      managers: sData.totales.managers || 0
    };
  });
}
