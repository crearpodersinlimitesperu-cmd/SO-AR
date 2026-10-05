import { mergeNodusDataIntoEquipos } from './src/services/cmjDataService.js';
import fs from 'fs';

const eqBase = [
  { equipoLabel: '28', sede: 'LIMA CICLO 1', creacion: {pxInicio: 19, pxFinal: 3, desercionPx: 3}, c1: {terminan: 19}, relacion: {}, gratitud: {}, resumen: {} },
  { equipoLabel: '29', sede: 'LIMA CICLO 1', creacion: {}, c1: {}, relacion: {}, gratitud: {}, resumen: {} },
  { equipoLabel: '30', sede: 'LIMA CICLO 1', creacion: {}, c1: {}, relacion: {}, gratitud: {}, resumen: {} }
];

const snap = JSON.parse(fs.readFileSync('./nodus_latest_snapshot.json', 'utf8'));
const enriched = mergeNodusDataIntoEquipos(eqBase, snap);
console.log(JSON.stringify(enriched.map(e => ({ name: e.equipoLabel, Inician: e.resumen.pxIniciales, Terminan: e.resumen.pxFinales, Desercion: e.resumen.desercionTotalPx, Etapa: e.resumen.nivelRiesgo })), null, 2));
