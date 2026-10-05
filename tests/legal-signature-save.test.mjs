import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const source = fs.readFileSync(new URL('../src/services/legalSignatureService.js', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?from ['"][^'"]+['"];\s*/gm, '').replace(/export const /g, 'const ');
const contractSource = fs.readFileSync(new URL('../src/data/legalContracts.js', import.meta.url), 'utf8');
function harness({signedIn = true, denied = false} = {}) {
  const writes = [];
  const context = vm.createContext({console:{log(){},warn(){},error(){}},TextEncoder,crypto:webcrypto,AbortSignal,navigator:{userAgent:'test'},
    auth:{currentUser:signedIn?{uid:'test-uid',email:'owner@example.test'}:null},db:{},storage:{},
    getContractsByCountry:()=>({documents:[{id:'privacy',version:'2026-10-04-pe-v2'}]}),
    doc:(_db,collection,id)=>({collection,id}),serverTimestamp:()=> 'SERVER_TIME',
    setDoc:async(ref,data)=>{if(denied)throw Object.assign(new Error('Missing or insufficient permissions.'),{code:'permission-denied'});writes.push({ref,data});},
    fetch:async()=>({json:async()=>({ip:'test'}),ok:true}),ref:()=>({}),uploadString:async()=>{},getDownloadURL:async()=> 'test-url'
  });
  vm.runInContext(source+'\nthis.process = processFullLegalSignature;',context);
  return {context,writes};
}
const params={participantId:'owner@example.test',participantName:'Test',countryCode:'PE',docsAccepted:['privacy'],signatureDataUrl:'data:image/png;base64,TEST',privacyAccepted:true};
test('firma propia guarda propietario y versión corregida',async()=>{
  const h=harness();const result=await h.context.process(params);assert.equal(result.success,true);
  const record=h.writes[0].data;assert.equal(record.owner_uid,'test-uid');assert.equal(record.participant_id,params.participantId);
  assert.equal(record.privacy_policy_version,'2026-10-04-pe-v2');assert.equal(record.document_versions.privacy,'2026-10-04-pe-v2');
});
test('sin sesión o suplantando otro correo no escribe',async()=>{
  for(const [options,p] of [[{signedIn:false},params],[{}, {...params,participantId:'other@example.test'}]]){
    const h=harness(options);assert.equal((await h.context.process(p)).success,false);assert.equal(h.writes.length,0);
  }
});
test('fallo de permisos no reporta éxito',async()=>{
  const h=harness({denied:true});const result=await h.context.process(params);assert.equal(result.success,false);assert.match(result.error,/No se pudo guardar/);
});
test('las cuatro plantillas peruanas usan la empresa y versión corregidas',()=>{
  const pe=contractSource.slice(contractSource.indexOf('  PE: {'),contractSource.indexOf('  CO: {'));
  assert.doesNotMatch(pe,/CREAR PSL Peru S\.A\.C\.|CREAR PSL PERU S\.A\.C\./);
  assert.match(pe,/CREACIÓN CUÁNTICA E\.I\.R\.L\. \(RUC 20612592811\)/);
  assert.equal((pe.match(/version: '2026-10-04-pe-v2'/g)||[]).length,4);
});

test('persistencia y normalizacion completa de datos KYC', async () => {
  const kycParams = {
    ...params,
    fullName: 'Juan Perez',
    docType: 'DNI',
    docNumber: '12345678',
    birthDate: '1990-01-01',
    phone: '+51987654321',
    sede: 'Lima'
  };
  const h = harness();
  const res = await h.context.process(kycParams);
  assert.equal(res.success, true);
  const record = h.writes[0].data;
  assert.equal(record.participant_name, 'Juan Perez');
  assert.equal(record.doc_number, '12345678');
  assert.equal(record.doc_type, 'DNI');
  assert.equal(record.phone, '+51987654321');
  assert.equal(record.sede, 'Lima');
  assert.equal(record.kyc_data.fullName, 'Juan Perez');
  assert.equal(record.kycData.docNumber, '12345678');
});

test('normalizeSignatureDoc reconstituye nombre desde email cuando viene Sin Nombre', () => {
  const h = harness();
  vm.runInContext('this.normalize = normalizeSignatureDoc;', h.context);
  const raw = {
    id: 'sig-test-123',
    participant_id: 'carlos.mendoza@crearpsl.net',
    participant_name: 'Sin Nombre',
    sede: 'Global',
    status: 'COMPLETED'
  };
  const norm = h.context.normalize(raw);
  assert.equal(norm.participantName, 'Carlos Mendoza');
  assert.equal(norm.participant_name, 'Carlos Mendoza');
  assert.equal(norm.kycData.fullName, 'Carlos Mendoza');
});

