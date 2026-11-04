import { REPORT_SEDES } from '../../src/services/nodusReportModel.js';
import { filterNodusSedes } from './nodusJsonModel.js';

export function privatePulseAccess(profile, scope, verifiedSuperAdmin = false) {
  if (!profile || scope.type === 'denied') return null;
  const roles = [profile.role, profile.appRole, profile.rol, ...(Array.isArray(profile.roles) ? profile.roles : [])]
    .filter(role => typeof role === 'string').map(role => role.trim().toLowerCase());
  if (verifiedSuperAdmin || roles.some(role =>
    ['superadmin', 'direccion', 'cfo', 'cco', 'ceo', 'director_maestria', 'socio'].includes(role))) {
    return { sedes: REPORT_SEDES };
  }
  if (!roles.includes('gerente')) return null;
  const sedes = filterNodusSedes(REPORT_SEDES.map(nombre => ({ nombre })), {
    type: 'sede', sedes: [profile.sede, profile.roleSedes?.gerente]
  }).map(sede => sede.nombre);
  return sedes.length ? { sedes } : null;
}

export function pulseCountQuery(sede) {
  const legacyValues = {
    Lima: ['Lima', 'lima', 'LIM', 'lim', 'SEDE-LIMA-01', 'sede-lima-01'],
    Quito: ['Quito', 'quito', 'UIO', 'uio', 'UIO C1', 'UIO C2', 'uioc1', 'uioc2'],
    Cuenca: ['Cuenca', 'cuenca', 'CUE', 'cue'],
    Guayaquil: ['Guayaquil', 'guayaquil', 'GYE', 'gye'],
    'Medellín': ['Medellín', 'Medellin', 'medellín', 'medellin', 'MED', 'med'],
    'México': ['México', 'Mexico', 'méxico', 'mexico', 'MEX', 'mex', 'CDMX', 'cdmx']
  };
  if (!legacyValues[sede]) throw new TypeError('Sede de Micro-Pulso no autorizada.');
  return {
    structuredAggregationQuery: {
      structuredQuery: {
        from: [{ collectionId: 'reports' }],
        where: { compositeFilter: { op: 'AND', filters: [
          { fieldFilter: { field: { fieldPath: 'type' }, op: 'EQUAL', value: { stringValue: 'MicroPulsoStaff' } } },
          { fieldFilter: { field: { fieldPath: 'sede' }, op: 'IN',
            value: { arrayValue: { values: legacyValues[sede].map(stringValue => ({ stringValue })) } } } }
        ] } }
      },
      aggregations: [{ alias: 'reportCount', count: {} }]
    }
  };
}

export function decodePulseCount(rows) {
  if (!Array.isArray(rows) || rows.length !== 1) throw new TypeError('Conteo de Micro-Pulso no verificable.');
  const raw = rows[0]?.result?.aggregateFields?.reportCount?.integerValue;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
    throw new TypeError('Conteo de Micro-Pulso no verificable.');
  }
  return Number(raw);
}
