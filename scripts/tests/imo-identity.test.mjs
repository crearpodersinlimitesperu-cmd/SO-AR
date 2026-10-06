import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildPrivateIdentitySnapshot,nodusDocumentKey} from '../../functions-imo/nodusIdentityModel.mjs';
const options={secret:'test-only-secret-not-for-production-123456789',sourceUpdatedAt:'2026-10-06T15:00:00Z',sedeById:{1:'Lima'}};
const imo={id:1,identificacion:'00123456',nombres:'MISMO',apellidos:'NOMBRE',email:'imo@example.test'};
const enrollee={id:2,id_invitador:1,id_sede:1,id_coordinador:5,identificacion:'99123456',nombres:'PRUEBA',equipo_participante:'EQUIPO 30',asistio_c1:'0',asistio_c2:'1'};
test('identity and ownership use exact Nodus IDs; projection excludes documents and private medical/payment fields',()=>{
 const result=buildPrivateIdentitySnapshot([imo,{...enrollee,antecedentes_psiquiatricos:'PRIVATE',direccion:'PRIVATE',telefono:'PRIVATE'}],options);
 assert.equal(result.identities[0].lookupKey,nodusDocumentKey(options.secret,'00123456'));
 assert.equal(result.enrollees[0].imoId,'1');
 assert.equal(result.enrollees[0].asistenciaC1,false);
 assert.equal(result.enrollees[0].asistenciaC2,true);
 assert.equal(result.enrollees[0].canReportChange,false);
 assert.equal(JSON.stringify(result).includes('PRIVATE'),false);
 assert.equal(JSON.stringify(result).includes('00123456'),false);
});
test('duplicate documents fail closed even with different names or email addresses',()=>{
 const result=buildPrivateIdentitySnapshot([imo,enrollee,{...imo,id:3,email:'other@example.test'}],options);
 assert.equal(result.identities.length,0);assert.equal(result.enrollees.length,0);assert.equal(result.stats.ambiguousDocument,1);
 assert.throws(()=>buildPrivateIdentitySnapshot([imo,imo],options));
});
test('missing email or sede never falls back to a name match or Lima',()=>{
 assert.equal(buildPrivateIdentitySnapshot([{...imo,email:''},enrollee],options).identities.length,0);
 assert.equal(buildPrivateIdentitySnapshot([imo,{...enrollee,id_sede:99}],options).enrollees.length,0);
});
test('coordinator must have an explicit verified ID, email and the enrollee sede',()=>{
 const coordinatorById={5:{id:'5',email:'coord@example.test',nombre:'PRUEBA',sede:'Lima',verified:true}};
 const result=buildPrivateIdentitySnapshot([imo,enrollee],{...options,coordinatorById});
 assert.equal(result.enrollees[0].canReportChange,true);
 assert.equal(buildPrivateIdentitySnapshot([imo,enrollee],{...options,coordinatorById:{5:{...coordinatorById[5],sede:'Quito'}}}).enrollees[0].canReportChange,false);
});
