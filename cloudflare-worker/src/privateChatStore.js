import { chatRecordFields } from './privateChatModel.js';

export function createPrivateChatStore(projectId, decode, fetcher = fetch) {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const headers = token => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
  const collectionPath = (uid, partition) => `users/${encodeURIComponent(uid)}/copilot_scopes/${partition}/chats`;
  const checked = async response => {
    if (!response.ok) throw new Error(`Firestore del historial privado no disponible (${response.status}).`);
    return response.json();
  };
  const get = async (path, token) => {
    const response = await fetcher(`${base}/${path}`, { headers: headers(token) });
    if (response.status === 404) return null;
    const document = await checked(response);
    return { data: decode(document.fields), version: document.updateTime };
  };
  return {
    profile: async (uid, token) => (await get(`users/${encodeURIComponent(uid)}`, token))?.data || null,
    get: (uid, partition, id, token) => get(`${collectionPath(uid, partition)}/${id}`, token),
    list: async (uid, partition, token) => {
      const path = collectionPath(uid, partition).replace(/\/chats$/, '');
      const rows = await checked(await fetcher(`${base}/${path}:runQuery`, {
        method: 'POST', headers: headers(token),
        body: JSON.stringify({ structuredQuery: {
          from: [{ collectionId: 'chats' }], limit: 30,
          select: { fields: ['ownerUid', 'authorityKey', 'viewKey', 'schemaVersion', 'title', 'updatedAt']
            .map(fieldPath => ({ fieldPath })) },
          orderBy: [{ field: { fieldPath: 'updatedAt' }, direction: 'DESCENDING' }]
        } })
      }));
      return rows.filter(row => row.document).map(({ document }) => ({
        id: document.name.split('/').pop(), ...decode(document.fields)
      }));
    },
    put: async (uid, partition, id, record, version, token) => {
      const path = collectionPath(uid, partition);
      if (version === undefined) throw new Error('El historial no tiene una versión verificable.');
      const url = version === null
        ? `${base}/${path}?documentId=${id}`
        : `${base}/${path}/${id}?currentDocument.updateTime=${encodeURIComponent(version)}`;
      await checked(await fetcher(url, {
        method: version === null ? 'POST' : 'PATCH',
        headers: headers(token), body: JSON.stringify({ fields: chatRecordFields(record) })
      }));
    }
  };
}
