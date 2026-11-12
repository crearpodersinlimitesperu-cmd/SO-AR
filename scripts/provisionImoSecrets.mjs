// Uses existing CI secrets in memory; never persists or prints their values.
import {GoogleAuth} from 'google-auth-library';
import {randomBytes} from 'node:crypto';
const project='centro-operativo-cpsl';
const credentials=JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON||'{}');
if(credentials.project_id!==project)throw new Error('Unexpected project');
if(!process.env.GMAIL_USER||!process.env.GMAIL_PASS)throw new Error('Missing existing Gmail service configuration');
const client=await new GoogleAuth({credentials,scopes:['https://www.googleapis.com/auth/cloud-platform']}).getClient();
const base=`https://secretmanager.googleapis.com/v1/projects/${project}/secrets`;
const syncMailSecrets = process.env.SYNC_MAIL_SECRETS === 'true';
for(const [name,generate,rotatable] of [
 ['IMO_VERIFICATION_SECRET',()=>randomBytes(48).toString('base64url'),false],
 ['IMO_MAIL_USER',()=>process.env.GMAIL_USER,true],
 ['IMO_MAIL_PASS',()=>process.env.GMAIL_PASS,true],
]){
 let exists=true;
 try{await client.request({url:`${base}/${name}`});}catch(error){if(error.response?.status===404)exists=false;else throw new Error(`Cannot inspect ${name}`);}
 if(exists && !(rotatable && syncMailSecrets)){console.log(`${name}: existing secret retained`);continue;}
 try{
  if(!exists){
   await client.request({url:base,method:'POST',params:{secretId:name},data:{replication:{automatic:{}}}});
  }
  await client.request({url:`${base}/${name}:addVersion`,method:'POST',data:{payload:{data:Buffer.from(generate(),'utf8').toString('base64')}}});
  console.log(`${name}: ${exists ? 'synchronized new version' : 'configured'}`);
 }catch{throw new Error(`Cannot configure ${name}; values suppressed`);}
}
