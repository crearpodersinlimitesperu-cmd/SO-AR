// Recover only the non-operational stub left by a failed first deployment.
// A working function or a function with an event trigger is never removed.
import { GoogleAuth } from 'google-auth-library';
const project = 'centro-operativo-cpsl';
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');
if (credentials.project_id !== project) throw new Error('Unexpected project');
const client = await new GoogleAuth({credentials, scopes:['https://www.googleapis.com/auth/cloud-platform']}).getClient();
const base = 'https://cloudfunctions.googleapis.com/v2/';
async function call(options){
 try{return await client.request(options);}
 catch(error){const safe=new Error(`Google API request failed (${error.response?.status || 'unavailable'})`);safe.status=error.response?.status;throw safe;}
}
const name = `projects/${project}/locations/us-central1/functions/imoDeliverCode`;
let fn;
try { fn = (await call({url:base+name})).data; }
catch (error) { if(error.status===404){console.log('No failed delivery stub to recover.');process.exit(0);} throw new Error('Cannot inspect delivery function'); }
console.log(JSON.stringify({name:'imoDeliverCode',state:fn.state,hasEventTrigger:!!fn.eventTrigger,codebase:fn.labels?.['firebase-functions-codebase']}));
if(fn.state!=='FAILED'||fn.eventTrigger){console.log('Keeping existing function.');process.exit(0);}
if(fn.labels?.['firebase-functions-codebase']!=='imo'||fn.buildConfig?.entryPoint!=='imoDeliverCode')throw new Error('Unexpected function ownership; recovery refused');
if(!process.argv.includes('--repair'))throw new Error('Failed first-deployment stub found; explicit repair required');
const op=(await call({url:base+name,method:'DELETE'})).data;
if(!op.name?.startsWith(`projects/${project}/locations/us-central1/operations/`))throw new Error('Unexpected operation');
for(let i=0;i<60;i++){
 const result=(await call({url:base+op.name})).data;
 if(result.done){if(result.error)throw new Error('Stub recovery failed');console.log('Failed stub removed; deployment will recreate the declared event trigger.');process.exit(0);}
 await new Promise(resolve=>setTimeout(resolve,5000));
}
throw new Error('Recovery did not finish within five minutes');
