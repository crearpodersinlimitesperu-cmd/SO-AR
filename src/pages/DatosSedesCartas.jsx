import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { canEditSedeDatos } from '../utils/sedeDatosPermissions';
import sedes from '../data/sedesInstitucionales.json';

const fields = {razonSocial:'Razón social',identificacionFiscal:'Identificación fiscal (RUC, RFC o NIT)',direccionFiscal:'Dirección fiscal completa',correoContacto:'Correo institucional de contacto',telefonoContacto:'Teléfono de contacto con código de país'};
export default function DatosSedesCartas() {
  const { currentUser } = useAuth();
  const email=(currentUser?.email || '').toLowerCase();
  const admin=Boolean(currentUser?.isSuperAdmin);
  const initial=Object.keys(sedes).find(id=>sedes[id].gerentes.some(g=>g.email===email) || canEditSedeDatos(currentUser,sedes[id].sede)) || 'lima';
  const [id,setId]=useState(new URLSearchParams(location.search).get('sede') in sedes ? new URLSearchParams(location.search).get('sede') : initial);
  const [draft,setDraft]=useState({}); const [busy,setBusy]=useState(false); const [loading,setLoading]=useState(true); const [message,setMessage]=useState('');
  const sede=sedes[id]; const editable=canEditSedeDatos(currentUser,sede.sede);
  useEffect(()=>{
    let active=true;setLoading(true);setMessage('');
    getDoc(doc(db,'sedes_institucionales',id)).then(snapshot=>{if(active){setDraft({...sede,...(snapshot.exists()?snapshot.data():{})});setLoading(false);}}).catch(()=>{if(active){setMessage('No se pudieron cargar los datos. Recarga antes de guardar.');setLoading(true);}});
    return()=>{active=false;};
  },[id,sede]);
  async function save(event){
    event.preventDefault();if(!editable||busy||loading)return;setBusy(true);setMessage('');
    try{
      const data=Object.fromEntries(Object.keys(fields).map(key=>[key,String(draft[key]||'').trim()]));
      await setDoc(doc(db,'sedes_institucionales',id),data);
      setMessage('Datos guardados. Se usarán al abrir las cartas de esta sede. Adjunta en tu tarea el respaldo y marca su avance.');
    }catch{setMessage('No se pudo guardar. Revisa tu acceso e inténtalo de nuevo.');}finally{setBusy(false);}
  }
  async function requestData(){
    if(!admin||busy)return;setBusy(true);setMessage('');
    try{
      const created=await runTransaction(db,async transaction=>{
        const entries=Object.entries(sedes);
        const refs=entries.map(([key])=>doc(db,'tasks',`custom_datos_carta_sede_${key}_20261001`));
        const existing=await Promise.all(refs.map(ref=>transaction.get(ref)));let count=0;
        entries.forEach(([key,data],index)=>{
          if(existing[index].exists())return;
          const title=`Completar datos institucionales para cartas — ${data.sede}`;
          const notes=`Responsables: ${[...new Set(data.gerentes.map(g=>g.nombre))].join(' y ')}. Completar razón social legal, identificación fiscal (RUC/RFC/NIT), dirección fiscal completa, correo institucional y teléfono con código de país. Confirmar nombres/cargos y autorización de los responsables; adjuntar respaldo y, si corresponde, firma autorizada en la evidencia de esta tarea. No adjuntar documentos personales de invitados. Formulario: https://centro-operativo-cpsl.web.app/datos-sedes-cartas?sede=${key} . Hasta completar los datos, la carta mostrará solo los nombres de gerencia. No se deben reutilizar los datos fiscales de otra sede.`;
          transaction.set(refs[index],{id:refs[index].id,task:title,title,notes,description:notes,role:'gerente',assignedRoles:['gerente'],assignedSede:data.sede,assignedToEmails:data.gerentes.map(g=>g.email),createdBy:email,assignedByEmail:email,assignedByName:currentUser.name||'José Sánchez',created_at:new Date().toISOString(),priority:'🟡 AMARILLO',isCritical:false,completed:false,status:'Pendiente',deadline:null,assigneeProgress:Object.fromEntries(data.gerentes.map(g=>[g.email,{name:g.nombre,role:'gerente',sede:data.sede,completed:false,completedAt:null,progress:0}]))});count++;
        });return count;
      });setMessage(`${created} tareas creadas. Las tareas existentes se conservaron sin duplicarlas.`);
    }catch{setMessage('No se pudieron crear las tareas. No se guardó ningún cambio parcial.');}finally{setBusy(false);}
  }
  return <main className="glass-panel" style={{maxWidth:850,margin:'2rem auto',padding:'2rem'}}>
    <Link to="/home">← Volver al inicio</Link>
    <h1>Datos de las sedes para cartas</h1>
    <p>Los datos guardados se mostrarán en las cartas públicas de invitación. Incluye únicamente información institucional autorizada para ese fin.</p>
    <label>Sede <select value={id} onChange={e=>setId(e.target.value)} disabled={busy}>{Object.entries(sedes).map(([key,data])=><option key={key} value={key}>{data.sede}</option>)}</select></label>
    <p><strong>Responsables:</strong> {[...new Set(sede.gerentes.map(g=>g.nombre))].join(' y ')}</p>
    <p>Si falta algún dato institucional, la carta conservará únicamente los nombres de los responsables. No se colocará una imagen de firma sin autorización.</p>
    <form onSubmit={save}>
      {Object.entries(fields).map(([key,label])=><label key={key} style={{display:'block',margin:'1rem 0'}}>{label}<input style={{display:'block',width:'100%',padding:10}} type={key==='correoContacto'?'email':'text'} maxLength={500} value={draft[key]||''} disabled={busy||loading||!editable} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}
      {editable?<button className="btn-primary" disabled={busy||loading} type="submit">Guardar datos de la sede</button>:<p>Esta ficha la completan los gerentes de la sede o Super Admin.</p>}
    </form>
    <p><a href={`/cartas/carta_invitacion_migraciones.html?sede=${id}`} target="_blank" rel="noreferrer">Ver plantilla de esta sede</a></p>
    {admin&&<button disabled={busy} onClick={requestData}>Crear tareas para los gerentes de las 6 sedes</button>}
    <p role="status">{message|| (loading?'Cargando datos…':'')}</p>
  </main>;
}
