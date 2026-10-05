import { collection, doc, getDocs, query, where, serverTimestamp, runTransaction, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { validateCampaign } from './missionModel';

export async function createCampaign(input) {
  validateCampaign(input);
  const user = auth.currentUser;
  if (!user) throw new Error('Inicia sesión para generar la campaña.');
  // A stable campaign key prevents duplicate campaigns on retries/double clicks.
  const key = `${input.sede.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')}_${Number(input.targetTeam)}_${input.c1Date}`;
  const ref = doc(collection(db, 'imo_campaigns'));
  const registry = doc(db, 'imo_campaign_keys', key);
  await runTransaction(db, async tx => {
    const existing = await tx.get(registry);
    if (existing.exists()) throw new Error('Ya existe una campaña para esta sede, equipo y fecha. Abre su enlace en Campañas generadas.');
    tx.set(registry, { campaignId: ref.id, createdBy: user.uid, createdAt: serverTimestamp() });
    tx.set(ref, { schemaVersion: 2, sede: input.sede, targetTeam: Number(input.targetTeam), c1Date: input.c1Date, status: 'active', createdAt: serverTimestamp(), createdBy: user.uid, count: input.assignments.length });
    for (const a of input.assignments) {
      const mission = doc(collection(db, 'imo_missions'));
      const data = {
        schemaVersion: 2, campaignId: ref.id, imoNombre: a.nombre,
        originTeam: Number(a.originTeam), targetTeam: Number(input.targetTeam), sede: input.sede,
        equipo: `EQUIPO ${Number(input.targetTeam)} - ${input.sede.toUpperCase()} C1`, c1Date: input.c1Date,
        sourceMissionId: a.sourceMissionId, createdBy: user.uid, createdByEmail: user.email.toLowerCase(),
        createdAt: serverTimestamp(), lastUpdated: serverTimestamp(),
        enrolados: a.enrolados.map(e => ({ id: e.id, nombre: e.nombre, coordinadora_nombre: e.coordinadora_nombre || '', coordinadora_telefono: e.coordinadora_telefono || '', telefono: e.telefono || '' })),
        enroladoIds: a.enrolados.map(e => e.id), checks: {},
      };
      tx.set(mission, data);
      tx.set(doc(db, 'imo_campaigns', ref.id, 'profiles', mission.id), {
        schemaVersion: 2, campaignId: ref.id, imoNombre: a.nombre, originTeam: data.originTeam, targetTeam: data.targetTeam, sede: input.sede, c1Date: input.c1Date,
        enroladoIds: data.enroladoIds, enrolados: data.enrolados.map(({ telefono: _telefono, ...e }) => e),
      });
    }
  });
  return ref.id;
}
export const listenCampaignMissions = (campaignId, next, error) => onSnapshot(collection(db, 'imo_campaigns', campaignId, 'profiles'), snap => next(snap.docs.map(d => ({ ...d.data(), id: d.id }))), error);
export const listenConfirmations = (campaignId, id, next, error) => onSnapshot(collection(db, 'imo_campaigns', campaignId, 'profiles', id, 'imo_confirmations'), { includeMetadataChanges: true }, snap => next(Object.fromEntries(snap.docs.map(d => [d.id, { ...d.data(), pending: d.metadata.hasPendingWrites }]))), error);
export async function saveConfirmation(campaignId, missionId, enroladoId, field, value, reportedName, sessionId) {
  if (!['contacto', 'asistencia'].includes(field) || typeof value !== 'boolean') throw new Error('Confirmación inválida.');
  const ref = doc(db, 'imo_campaigns', campaignId, 'profiles', missionId, 'imo_confirmations', enroladoId);
  const eventRef = doc(collection(db, 'imo_campaigns', campaignId, 'profiles', missionId, 'imo_events'));
  await runTransaction(db, async tx => {
    const previous = await tx.get(ref);
    const before = previous.exists() ? { contacto: previous.data().contacto, asistencia: previous.data().asistencia } : { contacto: false, asistencia: false };
    const after = { ...before, [field]: value };
    tx.set(ref, { ...after, reportedName, sessionId, updatedAt: serverTimestamp(), eventId: eventRef.id });
    tx.set(eventRef, { enroladoId, before, after, reportedName, sessionId, identity: 'self-selected', at: serverTimestamp(), source: 'mision-imo-v2' });
  });
}
export async function getSedeCampaigns(sede) {
  const snap = await getDocs(query(collection(db, 'imo_campaigns'), where('sede', '==', sede)));
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

export const closeCampaign = id => updateDoc(doc(db, 'imo_campaigns', id), { status: 'closed' });
