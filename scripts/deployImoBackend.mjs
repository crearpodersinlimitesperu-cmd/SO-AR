import {spawn} from 'node:child_process';
import {GoogleAuth} from 'google-auth-library';
const child=spawn('npx',['--yes','firebase-tools@latest','deploy','--config','firebase.imo.json','--only','functions:imo','--project','centro-operativo-cpsl','--non-interactive'],{stdio:['ignore','pipe','pipe']});
let output='';
for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{output+=chunk.toString();process.stdout.write(chunk);});
const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});
const clean=output.replace(/\u001b\[[0-9;]*m/g,'');
const cleanupOnly=code!==0&&clean.includes('Functions successfully deployed but could not set up cleanup policy')&&!clean.includes('Functions deploy had errors')&&['imoAccess','imoDeliverCode'].every(name=>new RegExp(`functions\\[imo:${name}\\(us-central1\\)\\].*(Successful|Skipped)`).test(clean));
if(code!==0&&!cleanupOnly)process.exit(code||1);
const client=await new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']}).getClient();
for(const name of ['imoAccess','imoDeliverCode']){
 let fn;
 try{fn=(await client.request({url:`https://cloudfunctions.googleapis.com/v2/projects/centro-operativo-cpsl/locations/us-central1/functions/${name}`})).data;}
 catch{throw new Error(`Cannot verify deployed function ${name}`);}
 if(fn.state!=='ACTIVE'||fn.labels?.['firebase-functions-codebase']!=='imo'||fn.buildConfig?.entryPoint!==name)throw new Error(`Function ${name} not active or unexpected ownership`);
 if(name==='imoDeliverCode'&&fn.eventTrigger?.eventType!=='google.cloud.firestore.document.v1.created')throw new Error('Delivery trigger is not configured');
 console.log(JSON.stringify({function:name,state:fn.state,hasEventTrigger:!!fn.eventTrigger}));
}
// Exercise request validation only: never send an OTP or use participant data.
const response=await fetch('https://us-central1-centro-operativo-cpsl.cloudfunctions.net/imoAccess',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:{action:'healthcheck_invalid'}}),signal:AbortSignal.timeout(30000)});
let body;try{body=await response.json();}catch{throw new Error(`Public callable unavailable: HTTP ${response.status}`);}
if(response.status!==400||body.error?.status!=='INVALID_ARGUMENT')throw new Error(`Unexpected callable response: HTTP ${response.status}`);
console.log('IMO callable reachable and rejects invalid actions. No participant data accessed.');
if(cleanupOnly)console.warn('Deployment verified ACTIVE. Artifact cleanup remains unconfigured; no retention or deletion settings were changed.');
