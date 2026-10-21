import test from 'node:test';
import assert from 'node:assert/strict';
import {c1Eligibility, isAvailableForC1} from '../../functions-imo/c1Eligibility.mjs';
import {projectEnrollee} from '../../functions-imo/controlModel.mjs';
test('only explicit no attendance and C1 dropouts are eligible', () => {
 for (const value of [false,0,'0','NO','No asistió','No sentado']) assert.equal(isAvailableForC1({asistenciaC1:value}),true);
 for (const value of [true,1,'1','Sí','ASISTIÓ','SENTADO','COMPLETADO']) assert.equal(isAvailableForC1({asistio_c1:value}),false);
 assert.equal(isAvailableForC1({asistenciaC1:true,desertorC1:true}),true);
 assert.equal(isAvailableForC1({estadoC1:'Desertor'}),true);
});
test('intention, payment, C2 and missing data never qualify a person', () => {
 for (const row of [{},{asistencia:true},{asistencia:false},{pago:'Pagado'},{asistenciaC2:false},{desertor:true},{asistenciaC1:null},{asistenciaC1:''},{asistenciaC1:'—'},{estadoC1:'Confirmado'}]) assert.equal(c1Eligibility(row),'unverified');
 assert.equal(c1Eligibility({asistenciaC1:false,asistio_c1:true}),'already_attended');
});
test('private projection preserves dropout eligibility without exposing identity documents', () => {
 const row=projectEnrollee({id:'1',asistio_c1:1,desertor_c1:true,documento:'secret'});
 assert.equal(isAvailableForC1(row),true);assert.equal(row.documento,undefined);
});
