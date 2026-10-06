import {test,beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {createAccessService,decryptDelivery,encryptDelivery} from '../../functions-imo/accessService.mjs';
import {nodusDocumentKey} from '../../functions-imo/nodusIdentityModel.mjs';

if(!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST||''))throw new Error('Local emulator required; refusing production');
const project='demo-imo-access';
const app=initializeApp({projectId:project});
const db=getFirestore(app);
const secret='test-only-secret-not-for-production-123456789';
let now=Date.parse('2026-10-06T15:00:00Z');
const document='00123456',campaignId='campaign-test',lookupKey=nodusDocumentKey(secret,document);
const service=createAccessService({db,secret,clock:()=>now,loadCalendar:async()=>[
 {key:'event32',name:'C1',team:32,date:'2026-10-23',sede:'Lima'},
 {key:'foreign-event',name:'C1',team:32,date:'2026-10-23',sede:'Quito'},
]});
beforeEach(async()=>{
 now=Date.parse('2026-10-06T15:00:00Z');
 const response=await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${project}/databases/(default)/documents`,{method:'DELETE'});
 assert.equal(response.ok,true);
 const batch=db.batch();
 batch.set(db.doc('imo_system/control'),{enabled:true,snapshotId:'snapshot-test',sourceUpdatedAt:new Date(now).toISOString()});
 batch.set(db.doc(`imo_campaigns/${campaignId}`),{schemaVersion:3,status:'active',sede:'Lima',targetTeam:32,c1Date:'2026-10-23',allowedImoIds:['1']});
 batch.set(db.doc(`imo_private_snapshots/snapshot-test/identities/${lookupKey}`),{id:'1',active:true,revision:'verified-contact-v1',nombre:'IMO PRUEBA',email:'imo@example.test'});
 for(const row of [{id:'own',imoId:'1',sede:'Lima'},{id:'other-imo',imoId:'2',sede:'Lima'},{id:'other-sede',imoId:'1',sede:'Quito'}]){
  batch.set(db.doc(`imo_private_snapshots/snapshot-test/enrollees/${row.id}`),{...row,nombre:'ENROLADO PRUEBA',sourceUpdatedAt:new Date(now).toISOString(),currentTeam:30,coordinadorId:'5',coordinadorEmail:'coordinator@example.test',telefono:'PRIVATE',documento:'PRIVATE'});
 }
 await batch.commit();
});
after(()=>deleteApp(app));
async function requestSent(ip='test-ip'){
 const result=await service.requestCode({campaignId,document},ip);
 const job=(await db.doc(`imo_private_deliveries/${result.challengeId}`).get()).data();
 const payload=decryptDelivery(secret,result.challengeId,job.encrypted);
 await db.doc(`imo_private_challenges/${result.challengeId}`).update({delivery:'sent'});
 return {...result,code:payload.code};
}
test('delivery is encrypted, tampering is rejected and unknown identities receive the same public response',async()=>{
 const known=await service.requestCode({campaignId,document},'test-ip');
 const unknown=await service.requestCode({campaignId,document:'99123456'},'test-ip');
 assert.deepEqual(Object.keys(known),Object.keys(unknown));assert.equal(known.message,unknown.message);
 const job=(await db.doc(`imo_private_deliveries/${known.challengeId}`).get()).data();
 assert.equal(JSON.stringify(job).includes('imo@example.test'),false);
 assert.throws(()=>decryptDelivery(secret,unknown.challengeId,job.encrypted));
 assert.equal((await db.doc(`imo_private_deliveries/${unknown.challengeId}`).get()).exists,false);
 assert.equal(decryptDelivery(secret,'id',encryptDelivery(secret,'id',{code:'123456'})).code,'123456');
});
test('concurrent use of one OTP issues exactly one session and limits roster ownership',async()=>{
 const challenge=await requestSent();
 const results=await Promise.allSettled([1,2].map(()=>service.verifyCode({campaignId,...challenge},'test-ip')));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const session=results.find(r=>r.status==='fulfilled').value;
 const roster=await service.roster({campaignId,token:session.token});
 assert.deepEqual(roster.enrolados.map(row=>row.id),['own']);
 assert.equal(JSON.stringify(roster).includes('PRIVATE'),false);
 await service.logout({token:session.token});
 await assert.rejects(()=>service.roster({campaignId,token:session.token}),{code:'unauthenticated'});
});
test('wrong attempts persist and exhaust the code even across different IPs',async()=>{
 const challenge=await requestSent();
 const wrong=challenge.code==='000000'?'111111':'000000';
 for(let i=0;i<5;i++)await assert.rejects(()=>service.verifyCode({campaignId,...challenge,code:wrong},`ip-${i}`),{code:'unauthenticated'});
 assert.equal((await db.doc(`imo_private_challenges/${challenge.challengeId}`).get()).data().attempts,5);
 await assert.rejects(()=>service.verifyCode({campaignId,...challenge},'another-ip'),{code:'unauthenticated'});
});
test('disabled campaigns, stale Nodus and changed contact invalidate access',async()=>{
 const challenge=await requestSent();
 const session=await service.verifyCode({campaignId,...challenge},'test-ip');
 await db.doc(`imo_private_snapshots/snapshot-test/identities/${lookupKey}`).update({revision:'changed-contact'});
 await assert.rejects(()=>service.roster({campaignId,token:session.token}),{code:'unauthenticated'});
 now+=25*60*60*1000;
 await assert.rejects(()=>service.requestCode({campaignId,document},'test-ip'),{code:'failed-precondition'});
});
test('concurrent code requests cannot exceed the shared document limit',async()=>{
 const results=await Promise.allSettled(Array.from({length:8},(_,i)=>service.requestCode({campaignId,document},`separate-ip-${i}`)));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,5);
 assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.code==='resource-exhausted').length,3);
});
test('team change is atomic, idempotent and notifies once without altering Nodus',async()=>{
 const challenge=await requestSent();const session=await service.verifyCode({campaignId,...challenge},'test-ip');
 const data={campaignId,token:session.token,requestId:'00000000-0000-4000-8000-000000000001',enrolleeId:'own',type:'team_change',targetEventId:'event32',note:'Prueba sintética'};
 const results=await Promise.all([service.report(data),service.report(data)]);
 assert.equal(results[0].id,results[1].id);assert.equal(results[0].status,'pending_coordinator');
 assert.equal((await db.collection('notifications').get()).size,1);
 assert.equal((await db.collection('imo_private_request_events').get()).size,1);
 assert.equal((await db.doc('imo_private_snapshots/snapshot-test/enrollees/own').get()).data().currentTeam,30);
 assert.equal((await service.requests(data)).requests[0].requested.team,32);
 await assert.rejects(()=>service.report({...data,note:'Changed after retry'}),{code:'already-exists'});
});
test('foreign enrollee, foreign calendar event and unassigned coordinator cannot create requests',async()=>{
 const challenge=await requestSent();const session=await service.verifyCode({campaignId,...challenge},'test-ip');
 const data={campaignId,token:session.token,requestId:'00000000-0000-4000-8000-000000000001',enrolleeId:'own',type:'team_change',targetEventId:'event32'};
 await assert.rejects(()=>service.report({...data,enrolleeId:'other-imo'}),{code:'unauthenticated'});
 await assert.rejects(()=>service.report({...data,targetEventId:'foreign-event'}),{code:'failed-precondition'});
 await db.doc('imo_private_snapshots/snapshot-test/enrollees/own').update({coordinadorEmail:null});
 await assert.rejects(()=>service.report(data),{code:'failed-precondition'});
 assert.equal((await db.collection('notifications').get()).size,0);
});
