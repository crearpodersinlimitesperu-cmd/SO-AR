import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import {defineSecret} from 'firebase-functions/params';
import nodemailer from 'nodemailer';
import {createAccessService,AccessError,decryptDelivery} from './accessService.mjs';

initializeApp();
const db=getFirestore();
const secret=defineSecret('IMO_VERIFICATION_SECRET');
const mailUser=defineSecret('IMO_MAIL_USER'),mailPass=defineSecret('IMO_MAIL_PASS');
const options={region:'us-central1',maxInstances:2,minInstances:0,memory:'256MiB',cpu:'gcf_gen1',concurrency:1,timeoutSeconds:30};

export const imoAccess=onCall({...options,secrets:[secret],cors:['https://centro-operativo-cpsl.web.app','https://centro-operativo-cpsl.firebaseapp.com']},async request=>{
  const data=request.data || {};
  if(!['requestCode','verifyCode','roster','events','requests','report','logout'].includes(data.action))throw new HttpsError('invalid-argument','Acción inválida.');
  try{return await createAccessService({db,secret:secret.value()})[data.action](data,String(request.rawRequest.ip || 'unknown'));}
  catch(error){if(error instanceof AccessError)throw new HttpsError(error.code,error.message);throw new HttpsError('internal','No se pudo completar la operación. Intenta más tarde.');}
});

export const imoDeliverCode=onDocumentCreated({...options,document:'imo_private_deliveries/{challengeId}',secrets:[secret,mailUser,mailPass],retry:false},async event=>{
  const ref=event.data.ref,id=event.params.challengeId;
  const challengeRef=db.doc(`imo_private_challenges/${id}`);
  const acquired=await db.runTransaction(async tx=>{
    const [job,challenge]=await Promise.all([tx.get(ref),tx.get(challengeRef)]);
    if(job.data()?.status!=='pending'||!challenge.exists||Date.now()>=challenge.data().expiresAt)return false;
    tx.update(ref,{status:'sending'});return true;
  });
  if(!acquired)return;
  try{
    const payload=decryptDelivery(secret.value(),id,event.data.data().encrypted);
    const transport=nodemailer.createTransport({service:'gmail',auth:{user:mailUser.value(),pass:mailPass.value()}});
    await transport.sendMail({from:mailUser.value(),to:payload.email,subject:'Tu código de acceso a Misión IMO',text:`Tu código de acceso es: ${payload.code}\nVence en 10 minutos desde que lo solicitaste. No lo compartas.\nSi no solicitaste este código, ignora este correo.`});
    const batch=db.batch();batch.update(challengeRef,{delivery:'sent'});batch.set(ref,{status:'sent',sentAt:Date.now()});await batch.commit();
  }catch{
    const batch=db.batch();batch.update(challengeRef,{delivery:'failed'});batch.set(ref,{status:'failed',failedAt:Date.now()});await batch.commit();
    // A retry must be explicitly requested by the person; never expose email or SMTP errors.
  }
});
