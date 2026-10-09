import { c1Evidence } from './c1Eligibility.mjs';
import { createHmac } from 'node:crypto';
import { documentKey } from './authModel.mjs';

const id = value => /^\d+$/.test(String(value)) && Number(value) > 0 ? String(value) : null;
const email = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim()) ? String(value).trim().toLowerCase() : null;
const teamNumber = value => { const match=/^(?:EQUIPO\s+)?(\d+)(?:\s|$)/i.exec(String(value || '').trim()); return match && Number(match[1]) > 0 ? Number(match[1]) : null; };
const attendance = value => value === 1 || value === '1' ? true : value === 0 || value === '0' ? false : null;

// ZZ is an INTERNAL namespace for a unique Nodus document, not nationality or
// issuing country. If the same document belongs to two IDs, neither may log in.
export const nodusDocumentKey = (secret, document) => documentKey(secret, 'ZZ', document);

export function buildPrivateIdentitySnapshot(rows, { secret, sourceUpdatedAt, sedeById, coordinatorById = {} }) {
  if (!Array.isArray(rows) || !rows.length || !Number.isFinite(Date.parse(sourceUpdatedAt))) throw new Error('Incomplete Nodus source');
  const people = new Map();
  const documents = new Map();
  const inviters = new Set();
  for (const row of rows) {
    const personId = id(row.id);
    if (!personId || people.has(personId)) throw new Error('Nodus IDs missing or duplicated; previous snapshot must be retained');
    people.set(personId,row);
    if (id(row.id_invitador)) inviters.add(id(row.id_invitador));
    try {
      const key=nodusDocumentKey(secret,row.identificacion);
      documents.set(key,[...(documents.get(key)||[]),personId]);
    } catch { /* Invalid documents are never authentication identities. */ }
  }
  const identities=[];
  const enrollees=[];
  const stats={total:rows.length,missingInviter:0,missingContact:0,ambiguousDocument:0,invalidDocument:0,missingSede:0,missingCoordinator:0};
  for (const imoId of inviters) {
    const person=people.get(imoId);
    if(!person){stats.missingInviter++;continue;}
    let lookupKey;
    try{lookupKey=nodusDocumentKey(secret,person.identificacion);}catch{stats.invalidDocument++;continue;}
    if(documents.get(lookupKey)?.length!==1){stats.ambiguousDocument++;continue;}
    const contact=email(person.email);
    if(!contact){stats.missingContact++;continue;}
    identities.push({id:imoId,lookupKey,email:contact,nombre:[person.nombres,person.apellidos].filter(Boolean).join(' ').trim(),active:true,
      revision:createHmac('sha256',secret).update(`${imoId}:${lookupKey}:${contact}`).digest('hex'),sourceUpdatedAt});
  }
  const eligible=new Set(identities.map(row=>row.id));
  for(const row of rows){
    const imoId=id(row.id_invitador);
    if(!eligible.has(imoId))continue;
    const sede=sedeById[String(row.id_sede)];
    if(!sede){stats.missingSede++;continue;}
    const coordinatorId=id(row.id_coordinador);
    const coord=coordinatorById[coordinatorId];
    const validCoord=coord?.verified===true && String(coord.id)===coordinatorId && coord.sede===sede && email(coord.email);
    if(!validCoord)stats.missingCoordinator++;
    enrollees.push({id:id(row.id),imoId,nombre:[row.nombres,row.apellidos].filter(Boolean).join(' ').trim(),sede,
      originTeam:teamNumber(row.equipo_origen),currentTeam:teamNumber(row.equipo_participante),nodusTeamId:id(row.id_equipo),
      ...c1Evidence(row),
      asistenciaC1:attendance(row.asistio_c1),asistenciaC2:attendance(row.asistio_c2),sourceUpdatedAt,
      coordinadorId:validCoord?coordinatorId:null,coordinadorEmail:validCoord?email(coord.email):null,coordinadorNombre:validCoord?coord.nombre:'',
      canReportChange:!!validCoord});
  }
  return {identities,enrollees,stats};
}
