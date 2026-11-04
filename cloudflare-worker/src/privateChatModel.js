import { privateViewKey } from '../../src/utils/sessionPrivacy.js';

export async function chatHash(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function chatAuthorityKey(profile, identity, scope, aliases) {
  return chatHash(JSON.stringify([
    'copilot-authority-v1', privateViewKey({ ...profile, uid: identity.sub, authEmail: identity.email }),
    profile.activeRoleOverride || null,
    [scope.type, [...new Set(scope.sedes || (scope.sede ? [scope.sede] : []))].sort()],
    [...aliases].sort()
  ]));
}

export function validateChatMessages(messages) {
  if (!Array.isArray(messages) || !messages.length || messages.length > 120) {
    throw new TypeError('El historial debe contener entre 1 y 120 mensajes.');
  }
  const projected = messages.map(message => {
    if (!message || !['user', 'assistant'].includes(message.role) ||
        typeof message.content !== 'string' || !message.content.trim() || message.content.length > 24000) {
      throw new TypeError('El historial contiene un mensaje inválido o demasiado largo.');
    }
    return { role: message.role, content: message.content };
  });
  if (new TextEncoder().encode(JSON.stringify(projected)).length > 180000) {
    throw new TypeError('El historial es demasiado grande; inicia una nueva conversación.');
  }
  return projected;
}

export function chatRecordFields(record) {
  return Object.fromEntries(Object.entries(record).map(([field, value]) => [field, field === 'messages'
    ? { arrayValue: { values: value.map(message => ({ mapValue: { fields: {
      role: { stringValue: message.role }, content: { stringValue: message.content }
    } } })) } }
    : typeof value === 'number' ? { integerValue: String(value) } : { stringValue: value }]));
}
