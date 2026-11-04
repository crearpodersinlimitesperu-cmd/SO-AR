import { chatAuthorityKey, chatHash, validateChatMessages } from './privateChatModel.js';

const hashPattern = /^[a-f0-9]{64}$/;
const idPattern = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;

export function createPrivateChatHandler({ verifyToken, accessToken, store, scopeFor, aliasesFor, json }) {
  return async function handlePrivateChat(request, env, origin) {
    const header = request.headers.get('Authorization') || '';
    if (!header.startsWith('Bearer ')) return json({ message: 'Inicia sesión para consultar el historial privado.' }, 401, origin);
    let identity;
    try {
      identity = await verifyToken(header.slice(7));
      if (typeof identity.sub !== 'string' || !identity.sub || identity.sub.includes('/')) throw new Error('UID inválido');
    } catch {
      return json({ message: 'La sesión del historial privado expiró.' }, 401, origin);
    }
    let input;
    try {
      const raw = await request.text();
      if (raw.length > 200000) return json({ message: 'El historial excede el tamaño permitido.' }, 413, origin);
      input = JSON.parse(raw);
      if (!input || !['list', 'get', 'save'].includes(input.action) || !hashPattern.test(input.viewKey) ||
          Object.keys(input).some(key => !['action', 'viewKey', 'authorityKey', 'chatId', 'messages'].includes(key)) ||
          (input.authorityKey !== undefined && !hashPattern.test(input.authorityKey)) ||
          (input.action !== 'list' && !hashPattern.test(input.authorityKey)) ||
          (input.action === 'get' && !idPattern.test(input.chatId)) ||
          (input.chatId !== undefined && !idPattern.test(input.chatId))) {
        throw new TypeError('Solicitud de historial inválida.');
      }
      if (input.action === 'save') input.messages = validateChatMessages(input.messages);
    } catch (error) {
      return json({ message: error.message || 'Solicitud de historial inválida.' }, 400, origin);
    }
    try {
      const token = await accessToken(env);
      const authority = async () => {
        const profile = await store.profile(identity.sub, token);
        if (!profile || scopeFor(profile, identity.email).type === 'denied') return null;
        try {
          const aliases = aliasesFor(profile, identity.email, identity.sub);
          return await chatAuthorityKey(profile, identity, scopeFor(profile, identity.email), aliases);
        } catch (error) {
          console.error('[private-chat] Identidad contradictoria:', error.message);
          return null;
        }
      };
      const authorityKey = await authority();
      if (!authorityKey) return json({ message: 'No hay un alcance administrativo válido para este historial.' }, 403, origin);
      if (input.authorityKey !== undefined && input.authorityKey !== authorityKey) {
        return json({ message: 'El alcance de esta vista cambió; no se copiará su conversación a los nuevos permisos.' }, 403, origin);
      }
      const partition = await chatHash(`${authorityKey}:${input.viewKey}`);
      const owns = record => record?.schemaVersion === 1 && record.ownerUid === identity.sub &&
        record.authorityKey === authorityKey && record.viewKey === input.viewKey;
      const unchanged = async () => await authority() === authorityKey;
      if (input.action === 'list') {
        const sessions = await store.list(identity.sub, partition, token);
        if (!sessions.every(owns)) throw new Error('El historial contiene un registro sin procedencia verificable.');
        if (!await unchanged()) return json({ message: 'Tus permisos cambiaron durante la consulta; vuelve a abrir el historial.' }, 403, origin);
        return json({ authorityKey, sessions: sessions.map(({ id, title, updatedAt }) => ({ id, title, updatedAt })), legacyPolicy: 'quarantined' }, 200, origin);
      }
      const existing = input.chatId ? await store.get(identity.sub, partition, input.chatId, token) : null;
      if (input.chatId && (!existing || !owns(existing.data))) {
        return json({ message: 'La conversación no pertenece a tu alcance autorizado actual.' }, 403, origin);
      }
      if (!await unchanged()) return json({ message: 'Tus permisos cambiaron durante la consulta; vuelve a abrir el historial.' }, 403, origin);
      if (input.action === 'get') {
        return json({ authorityKey, session: { id: input.chatId, title: existing.data.title,
          updatedAt: existing.data.updatedAt, messages: validateChatMessages(existing.data.messages) } }, 200, origin);
      }
      const id = input.chatId || crypto.randomUUID();
      const now = new Date().toISOString();
      const record = {
        schemaVersion: 1, ownerUid: identity.sub, authorityKey, viewKey: input.viewKey,
        title: (input.messages.find(message => message.role === 'user')?.content || 'Conversación').slice(0, 60),
        messages: input.messages, createdAt: existing?.data.createdAt || now, updatedAt: now
      };
      await store.put(identity.sub, partition, id, record, existing ? existing.version : null, token);
      if (!await unchanged()) return json({ message: 'Tus permisos cambiaron; la conversación quedó conservada bajo su alcance anterior.' }, 403, origin);
      return json({ authorityKey, id, title: record.title, updatedAt: now }, 200, origin);
    } catch (error) {
      console.error('[private-chat] Error del historial autorizado:', error.message);
      return json({ message: 'No se pudo verificar o guardar el historial privado. No se usaron copias locales ni conversaciones antiguas.' }, 503, origin);
    }
  };
}
