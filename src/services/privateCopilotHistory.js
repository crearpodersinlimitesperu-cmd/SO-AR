import { auth } from './firebase';
import { privateViewKey } from '../utils/sessionPrivacy.js';

export function createPrivateCopilotHistory(viewer, { isCurrent = () => true } = {}) {
  const ownerUid = viewer?.uid;
  let authorityKey = null;
  let pendingList = null;
  const assertCurrent = () => {
    if (!ownerUid || viewer.isSimulated || viewer.isRoleSimulationActive || auth.currentUser?.uid !== ownerUid) {
      throw new Error('El historial privado solo está disponible en tu cuenta real, sin simulación.');
    }
    if (!isCurrent()) throw new Error('La identidad o los permisos cambiaron durante la consulta del historial.');
  };
  const request = async input => {
    assertCurrent();
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(privateViewKey(viewer)));
    const viewKey = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
    assertCurrent();
    const token = await auth.currentUser.getIdToken();
    assertCurrent();
    const base = import.meta.env.VITE_COPILOTO_WORKER_URL || 'https://so-ar-copiloto.crearpsl-cpsl.workers.dev';
    const response = await fetch(`${base.replace(/\/$/, '')}/copilot-private-history`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...input, viewKey, ...(authorityKey ? { authorityKey } : {}) }),
      cache: 'no-store', signal: AbortSignal.timeout(15000)
    });
    assertCurrent();
    const data = await response.json();
    assertCurrent();
    if (!response.ok) throw new Error(data.message || `No se pudo verificar el historial privado (${response.status}).`);
    if (!/^[a-f0-9]{64}$/.test(data.authorityKey) || (authorityKey && authorityKey !== data.authorityKey)) {
      throw new Error('El alcance del historial cambió o no pudo verificarse. Recarga la aplicación para verificar tus permisos actuales.');
    }
    authorityKey = data.authorityKey;
    return data;
  };
  const list = () => {
    if (!pendingList) pendingList = request({ action: 'list' }).then(data => {
      if (!Array.isArray(data.sessions)) throw new Error('El servidor no devolvió un historial verificable.');
      return data.sessions;
    }).finally(() => { pendingList = null; });
    return pendingList;
  };
  const ensureAuthority = async () => { if (!authorityKey) await list(); };
  return {
    list,
    get: async chatId => {
      await ensureAuthority();
      const data = await request({ action: 'get', chatId });
      if (data.session?.id !== chatId || !Array.isArray(data.session.messages)) {
        throw new Error('La conversación no tiene un alcance verificable.');
      }
      return data.session;
    },
    save: async (chatId, messages) => {
      await ensureAuthority();
      const data = await request({ action: 'save', ...(chatId ? { chatId } : {}), messages });
      if (typeof data.id !== 'string' || !data.id) throw new Error('No se pudo confirmar el guardado del historial.');
      return data;
    }
  };
}
