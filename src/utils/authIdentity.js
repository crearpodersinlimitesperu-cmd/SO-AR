const emailKey = value => String(value || '').trim().toLowerCase();

export const identityEmails = record => [...new Set([
  record?.email, record?.authEmail, record?.correo, record?.corporateEmail, record?.personalEmail,
  ...(Array.isArray(record?.emails) ? record.emails : [])
].map(emailKey).filter(Boolean))];

export function selectAuthenticatedProfile(documents, authenticatedUser, lookupEmail) {
  const matching = documents.filter(document => identityEmails(document.data()).includes(emailKey(lookupEmail)));
  const own = matching.find(document => document.id === authenticatedUser?.uid);
  if (own) {
    if (own.data().uid && own.data().uid !== authenticatedUser?.uid) {
      throw new Error('Identidad ambigua: el UID del perfil no coincide con la sesión.');
    }
    return own;
  }
  const eligible = matching.filter(document => {
    const uid = document.data().uid;
    return !uid || uid === authenticatedUser?.uid;
  });
  if (eligible.length > 1 || matching.length !== eligible.length) {
    throw new Error('Identidad ambigua: requiere verificación administrativa.');
  }
  return eligible[0] || null;
}

// An imported alias must not bridge two different entries in the trusted catalogue.
export function assertAuthenticatedIdentity(record, authenticatedEmail, findOfficial, authenticatedUid) {
  if (authenticatedUid && record?.uid && record.uid !== authenticatedUid) {
    throw new Error('Identidad ambigua: el UID del perfil no coincide con la sesión.');
  }
  const official = findOfficial(authenticatedEmail);
  const linked = identityEmails(record).map(findOfficial).filter(Boolean);
  if (linked.some(profile => !official || profile !== official)) {
    throw new Error('El perfil contiene correos de otra identidad. Requiere revisión administrativa.');
  }
}
