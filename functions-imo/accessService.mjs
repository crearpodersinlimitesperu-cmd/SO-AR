import { createHmac, randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';
import { newChallenge, verifyChallenge, issueSession, sessionKey, validSession, consumeRateWindow } from './authModel.mjs';
import { nodusDocumentKey } from './nodusIdentityModel.mjs';
import { projectEnrollee, buildImoRequest } from './controlModel.mjs';
import { OFFICIAL_CALENDAR_URL, parseOfficialCalendar, applyCalendarChanges, findC1Dates } from './calendarModel.mjs';

const MAX_SOURCE_AGE=24*60*60*1000;
const safeId=value=>typeof value==='string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
export class AccessError extends Error {constructor(code,message){super(message);this.code=code;}}
const unavailable=()=>new AccessError('failed-precondition','La verificación de Nodus todavía no está disponible.');
const unauthorized=()=>new AccessError('unauthenticated','Código o sesión no válidos. Solicita un nuevo código.');
const fingerprint=(secret,kind,value)=>createHmac('sha256',secret).update(`${kind}:${value}`).digest('hex');
export function encryptDelivery(secret,id,payload){
  const iv=randomBytes(12), key=createHash('sha256').update(secret).digest();
  const cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(id));
  const content=Buffer.concat([cipher.update(JSON.stringify(payload),'utf8'),cipher.final()]);
  return {iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),content:content.toString('base64')};
}
export function decryptDelivery(secret,id,payload){
  const decipher=createDecipheriv('aes-256-gcm',createHash('sha256').update(secret).digest(),Buffer.from(payload.iv,'base64'));
  decipher.setAAD(Buffer.from(id));decipher.setAuthTag(Buffer.from(payload.tag,'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(payload.content,'base64')),decipher.final()]).toString('utf8'));
}

export function createAccessService({db,secret,clock=Date.now,loadCalendar}){
  if(typeof secret!=='string'||secret.length<32)throw new Error('IMO verification secret unavailable');
  async function scope(campaignId){
    if(!safeId(campaignId))throw unavailable();
    const [settings,campaign]=await Promise.all([db.doc('imo_system/control').get(),db.doc(`imo_campaigns/${campaignId}`).get()]);
    const config=settings.data(),c=campaign.data(),age=clock()-Date.parse(config?.sourceUpdatedAt);
    if(config?.enabled!==true || !safeId(config.snapshotId) || !Number.isFinite(age) || age<0 || age>MAX_SOURCE_AGE || c?.schemaVersion!==3 || c.status!=='active' || !Array.isArray(c.allowedImoIds))throw unavailable();
    return {config,campaign:c,campaignId,root:db.doc(`imo_private_snapshots/${config.snapshotId}`)};
  }
  async function limits(tx,keys){
    const refs=keys.map(([kind,key])=>db.doc(`imo_private_limits/${fingerprint(secret,kind,key)}`));
    const docs=await Promise.all(refs.map(ref=>tx.get(ref)));
    const results=docs.map((doc,i)=>consumeRateWindow(doc.data(),{now:clock(),limit:keys[i][0]==='reportIdentity'?50:keys[i][0]==='ip'?20:5}));
    if(results.some(result=>!result.allowed))throw new AccessError('resource-exhausted','Espera unos minutos antes de volver a intentarlo.');
    results.forEach((result,i)=>tx.set(refs[i],result.record));
  }
  async function authorized({campaignId,token}){
    const current=await scope(campaignId);
    let key;try{key=sessionKey(secret,token);}catch{throw unauthorized();}
    const session=(await db.doc(`imo_private_sessions/${key}`).get()).data();
    const identity=session?.lookupKey?(await current.root.collection('identities').doc(session.lookupKey).get()).data():null;
    if(identity?.active!==true || !current.campaign.allowedImoIds.includes(identity.id) || !validSession(session,{campaignId,revision:identity.revision,now:clock()}))throw unauthorized();
    return {...current,identity};
  }
  async function calendar(sede){
    let events;
    if(loadCalendar)events=await loadCalendar();
    else{
      const response=await fetch(OFFICIAL_CALENDAR_URL,{signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw unavailable();
      const changes=await db.collection('calendario_operativo_publico').get();
      events=applyCalendarChanges(parseOfficialCalendar(await response.text()),changes.docs.map(doc=>({...doc.data(),id:doc.id})));
    }
    const teams=[...new Set(events.filter(event=>event.sede===sede).map(event=>event.team))];
    return teams.flatMap(team=>findC1Dates(events,sede,team)).filter(event=>event.date>=new Date(clock()).toISOString().slice(0,10)).map(event=>({...event,id:event.key,stage:'C1'}));
  }
  return {
    async requestCode({campaignId,document},ip){
      if(typeof document!=='string'||document.length>40)throw new AccessError('invalid-argument','Revisa el documento.');
      const current=await scope(campaignId);
      let lookupKey;try{lookupKey=nodusDocumentKey(secret,document);}catch{throw new AccessError('invalid-argument','Revisa el documento.');}
      const identity=(await current.root.collection('identities').doc(lookupKey).get()).data();
      const eligible=identity?.active===true && current.campaign.allowedImoIds.includes(identity.id);
      const challenge=eligible?newChallenge({secret,imoId:identity.id,campaignId,revision:identity.revision,now:clock()}):null;
      const challengeId=challenge?.record.id || randomBytes(24).toString('hex');
      await db.runTransaction(async tx=>{
        await limits(tx,[['ip',ip],['identity',lookupKey]]);
        if(challenge){
          tx.create(db.doc(`imo_private_challenges/${challengeId}`),{...challenge.record,lookupKey});
          tx.create(db.doc(`imo_private_deliveries/${challengeId}`),{encrypted:encryptDelivery(secret,challengeId,{email:identity.email,code:challenge.code}),status:'pending',createdAt:clock()});
        }
      });
      return {challengeId,message:'Si el documento está habilitado para este equipo, recibirás un código en el correo registrado en Nodus.'};
    },
    async verifyCode({campaignId,challengeId,code},ip){
      if(!/^[a-f0-9]{48}$/.test(String(challengeId)) || !/^\d{6}$/.test(String(code)))throw unauthorized();
      const current=await scope(campaignId);
      const result=await db.runTransaction(async tx=>{
        const ref=db.doc(`imo_private_challenges/${challengeId}`),doc=await tx.get(ref),challenge=doc.data();
        const identity=challenge?.lookupKey?(await tx.get(current.root.collection('identities').doc(challenge.lookupKey))).data():null;
        // All reads precede writes, including the distributed rate window.
        await limits(tx,[['verifyIp',ip]]);
        if(identity?.active!==true || !current.campaign.allowedImoIds.includes(identity.id))return null;
        const checked=verifyChallenge(challenge,code,{secret,campaignId,revision:identity.revision,now:clock()});
        if(checked.record)tx.set(ref,checked.record);
        if(!checked.ok)return null;
        const session=issueSession(secret,checked.record,clock());
        tx.create(db.doc(`imo_private_sessions/${session.key}`),{...session.record,lookupKey:challenge.lookupKey});
        return {token:session.token,expiresAt:session.record.expiresAt};
      });
      // Throw only AFTER committing a failed attempt, never roll it back.
      if(!result)throw unauthorized();
      return result;
    },
    async roster(data){
      const current=await authorized(data),{identity}=current;
      const rows=await current.root.collection('enrollees').where('imoId','==',identity.id).get();
      return {nombre:identity.nombre,sede:current.campaign.sede,targetTeam:current.campaign.targetTeam,c1Date:current.campaign.c1Date,sourceUpdatedAt:current.config.sourceUpdatedAt,
        enrolados:rows.docs.map(doc=>doc.data()).filter(row=>row.sede===current.campaign.sede).map(projectEnrollee)};
    },
    async events(data){const current=await authorized(data);return {events:await calendar(current.campaign.sede)};},
    async requests(data){
      const current=await authorized(data);
      const docs=await db.collection('imo_private_requests').where('imoId','==',current.identity.id).get();
      return {requests:docs.docs.map(doc=>doc.data()).filter(row=>row.campaignId===data.campaignId).map(({id,enrolleeId,type,status,createdAt,updatedAt,requested,reviewNote})=>({id,enrolleeId,type,status,createdAt,updatedAt,requested,reviewNote:reviewNote||''}))};
    },
    async report(data){
      const current=await authorized(data);
      if(!safeId(data.enrolleeId)||!/^[a-f0-9-]{36}$/.test(String(data.requestId)))throw new AccessError('invalid-argument','Solicitud inválida.');
      const targetEvent=data.type==='team_change'?(await calendar(current.campaign.sede)).find(event=>event.id===data.targetEventId):null;
      const id=fingerprint(secret,'request',`${current.identity.id}:${data.requestId}`);
      const payloadFingerprint=fingerprint(secret,'payload',JSON.stringify([data.campaignId,data.enrolleeId,data.type,data.targetEventId||'',data.attendance??null,data.note||'']));
      return db.runTransaction(async tx=>{
        const ref=db.doc(`imo_private_requests/${id}`);
        const [existing,person]=await Promise.all([tx.get(ref),tx.get(current.root.collection('enrollees').doc(data.enrolleeId))]);
        if(existing.exists){if(existing.data().payloadFingerprint!==payloadFingerprint)throw new AccessError('already-exists','El identificador ya corresponde a otra solicitud.');return {id,status:existing.data().status};}
        const enrollee=person.data();
        if(enrollee?.imoId!==current.identity.id||enrollee.sede!==current.campaign.sede)throw unauthorized();
        await limits(tx,[['reportIdentity',current.identity.id]]);
        let request;
        try{request=buildImoRequest({requestId:id,actorId:current.identity.id,enrollee,type:data.type,targetEvent,attendance:data.attendance,note:data.note,at:new Date(clock()).toISOString()});}
        catch(error){throw new AccessError('failed-precondition',error.message);}
        tx.create(ref,{...request,campaignId:data.campaignId,payloadFingerprint});
        tx.create(db.doc(`imo_private_request_events/${id}_reported`),{requestId:id,actorId:current.identity.id,identity:'document-otp',action:'reported',before:request.before,requested:request.requested,at:request.createdAt});
        tx.create(db.doc(`notifications/imo_${id}`),{userId:request.assignedCoordinatorEmail,title:'Nueva solicitud de Misión IMO',message:`Revisa la novedad de ${enrollee.nombre} en Misión IMO. El estado oficial de Nodus no ha cambiado.`,type:'imo_request',sede:request.sede,requestId:id,read:false,created_at:request.createdAt,timestamp:clock()});
        return {id,status:request.status};
      });
    },
    async logout({token}){
      let key;try{key=sessionKey(secret,token);}catch{return {ok:true};}
      await db.runTransaction(async tx=>{const ref=db.doc(`imo_private_sessions/${key}`);if((await tx.get(ref)).exists)tx.update(ref,{revoked:true});});
      return {ok:true};
    }
  };
}
