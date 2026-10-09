import test from 'node:test';import assert from 'node:assert/strict';
import {buildC1Index,reconcileC1,loadCompleteC1Source} from '../imoC1Reconciliation.mjs';
const inviter={id:1,nombres:'IMO',apellidos:'UNO'};
const row={id:2,id_invitador:1,nombres:'ANA',apellidos:'PEREZ',telefono:'0991234567',asistio_c1:0};
const person={nombre:'Ana Pérez',telefono:'0991234567'};const mission={imoNombre:'IMO UNO'};
test('exact name + full phone + explicit inviter resolves the recorded C1 flag',()=>{
 const r=reconcileC1(person,mission,buildC1Index([inviter,row]),'2026-10-09T00:00:00Z');assert.equal(r.asistio_c1,0);assert.equal(r.nodusParticipantId,'2');assert.equal(r.c1Verification,'verified');
});
test('homonyms, phone suffixes, different inviter and absent source fail closed',()=>{
 for(const rows of [[inviter,{...row,telefono:'51991234567'}],[inviter,row,{...row,id:3}],[inviter,{...row,id_invitador:9}],[inviter]]) assert.equal(reconcileC1(person,mission,buildC1Index(rows),'2026-10-09T00:00:00Z').c1Verification,'unverified');
});
test('stable ID refreshes attendance and revokes old eligibility without guessing flags',()=>{
 const r=reconcileC1({...person,nodusParticipantId:'2',asistenciaC1:false},mission,buildC1Index([inviter,{...row,asistio_c1:1}]),'2026-10-09T00:00:00Z');assert.equal(r.asistio_c1,1);assert.equal(r.asistenciaC1,null);
 const missing=reconcileC1({...person,nodusParticipantId:'2',asistenciaC1:false},mission,buildC1Index([inviter]),'2026-10-09T00:00:00Z');assert.equal(missing.asistenciaC1,null);
});

test('pagination follows actual page size and rejects incomplete or duplicate downloads', async()=>{
 const source=Array.from({length:11},(_,i)=>({id:i+1}));
 const read=async start=>({total:11,filtered:11,rows:source.slice(start,start+3)});
 assert.equal((await loadCompleteC1Source(read)).length,11);
 await assert.rejects(loadCompleteC1Source(async start=>({...await read(start),rows:start===3?[]:source.slice(start,start+3)})));
 await assert.rejects(loadCompleteC1Source(async start=>({...await read(start),total:start===3?12:11})));
 await assert.rejects(loadCompleteC1Source(async start=>({...await read(start),rows:source.slice(0,Math.min(3,11-start))})));
});
