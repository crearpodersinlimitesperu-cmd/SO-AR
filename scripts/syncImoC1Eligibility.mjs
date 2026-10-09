// Source is read-only. Only minimum C1 evidence is written back to existing IMO
// projections; no enrollee, identity, attendance or confirmation is created in Nodus.
import puppeteer from 'puppeteer';
import {initializeApp,cert} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {buildC1Index,reconcileC1} from './imoC1Reconciliation.mjs';
import {c1Eligibility} from '../functions-imo/c1Eligibility.mjs';
const apply=process.argv.includes('--apply');
const credentials=JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');
if(credentials.project_id!=='centro-operativo-cpsl') throw new Error('Unexpected project');
const db=getFirestore(initializeApp({credential:cert(credentials)}));
const browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN,headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});
try {
 const page=await browser.newPage();
 await page.goto('https://imo.crearpslglobal.com/auth/login',{waitUntil:'networkidle2',timeout:60000});
 if(/captcha|challenge/i.test(page.url()) || await page.$('iframe[src*="captcha"]')) throw new Error('Human verification required');
 await page.locator('input[name="usuario"]').fill(process.env.NODUS_USER);
 await page.locator('input[name="password"]').fill(process.env.NODUS_PASSWORD);
 await Promise.all([page.waitForNavigation({waitUntil:'networkidle2',timeout:60000}),page.locator('button[type="submit"]').click()]);
 if(/login|captcha|challenge/i.test(page.url())) throw new Error('Authorized session unavailable');
 const rows=[];let total=null;
 for(let start=0;start<100000;) {
  const result=await page.evaluate(async start=>{
   const response=await fetch(`/participantessede/datosTabla?draw=1&start=${start}&length=500&id_sede=0&id_equipo=0`);
   if(!response.ok) throw new Error('Read failed');
   const payload=await response.json();
   if(!Array.isArray(payload.data)) throw new Error('Unexpected contract');
   const keys=['id','nombres','apellidos','telefono','id_invitador','asistio_c1','asistenciaC1','estadoC1','estado_c1','desertorC1','desertor_c1'];
   return {total:payload.recordsTotal,filtered:payload.recordsFiltered,rows:payload.data.map(row=>Object.fromEntries(keys.filter(key=>row[key]!==undefined).map(key=>[key,row[key]])))};
  },start);
  const count=Number(result.total);
  if(!Number.isInteger(count)||count<1||count>100000||(total!==null&&count!==total))throw new Error('Source total missing or changed');
  if(result.filtered!==undefined && Number(result.filtered)!==count)throw new Error('Incomplete source filter');
  total=count;rows.push(...result.rows);start=rows.length;
  if(start===total)break;
  if(!result.rows.length||start>total)throw new Error('Incomplete source pagination');
 }
 if(rows.length!==total)throw new Error('Source incomplete');
 const index=buildC1Index(rows),sourceUpdatedAt=new Date().toISOString();
 const missions=await db.collection('imo_missions').get();
 const stats={sourceRows:rows.length,missions:missions.size,eligible:0,already_attended:0,unverified:0,profilesUpdated:0,writes:0,apply};
 // Transact per mission so concurrent human confirmations are never overwritten.
 for(const snapshot of missions.docs) {
  if(!snapshot.data().enrolados?.length)continue;
  const ref=snapshot.ref;
  const outcome=await db.runTransaction(async tx=>{
   const doc=await tx.get(ref),m=doc.data();if(!m?.enrolados?.length)return;
   const profileRef=m.schemaVersion===2&&m.campaignId?db.doc(`imo_campaigns/${m.campaignId}/profiles/${doc.id}`):null;
   const profile=profileRef?await tx.get(profileRef):null;
   const enrolados=m.enrolados.map(e=>({...e,...reconcileC1(e,m,index,sourceUpdatedAt)}));
   // Only publish source status fields. Keep the original mission, owners and checks.
   const outcome={statuses:enrolados.map(c1Eligibility),profile:false};
   if(!apply)return outcome;
   tx.update(ref,{enrolados,c1SourceUpdatedAt:sourceUpdatedAt});
   if(profile?.exists){
    const evidence=new Map(enrolados.map(e=>[e.id,e]));
    const publicFields=['asistenciaC1','asistio_c1','estadoC1','estado_c1','desertorC1','desertor_c1','c1SourceUpdatedAt','c1Verification'];
    tx.update(profileRef,{enrolados:(profile.data().enrolados || []).map(e=>{const verified=evidence.get(e.id)||{};return {...e,...Object.fromEntries(publicFields.map(k=>[k,verified[k]??null]))};})});outcome.profile=true;
   }
   return outcome;
  });
  if(outcome){for(const status of outcome.statuses)stats[status]++;if(apply)stats.writes++;if(outcome.profile)stats.profilesUpdated++;}
 }
 if(apply)await db.collection('imo_c1_sync_history').add({...stats,sourceUpdatedAt});
 console.log('IMO_C1_SYNC '+JSON.stringify(stats));
} catch(error){console.error('IMO_C1_SYNC_FAILED '+JSON.stringify({type:error.name,message:['Source incomplete','Incomplete source pagination','Source total missing or changed','Incomplete source filter','Human verification required','Authorized session unavailable','Incomplete or duplicate Nodus IDs'].includes(error.message)?error.message:'Source or publication failed; private details suppressed'}));process.exitCode=1;}
finally{await browser.close();}
