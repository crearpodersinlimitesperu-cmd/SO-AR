import test from 'node:test';
import assert from 'node:assert/strict';
import { nodusValidationLabel } from './monitorPresentation.js';
test('no comparison or incomplete comparison never claims agreement', () => {
 assert.equal(nodusValidationLabel({totalReportadosImo:0}), 'Sin confirmaciones IMO para comparar');
 assert.match(nodusValidationLabel({totalReportadosImo:2,totalValidadosLlamada:1,totalPendientesCoord:1}), /pendiente/);
 assert.match(nodusValidationLabel({totalReportadosImo:2,totalValidadosLlamada:2,totalPendientesCoord:0,totalDiscrepancias:0}), /coinciden/);
 assert.match(nodusValidationLabel({totalReportadosImo:2,totalDiscrepancias:1}), /discrepancias/);
});
