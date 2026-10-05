const fs = require('fs');
const file = 'src/config/permissions.js';
let content = fs.readFileSync(file, 'utf8');

const newContent = `
// ============================================================
// MÓDULO LEGAL — Administradores de Datos y Permisos
// Implementado: 2026-10-01 — CREAR PSL Legal Onboarding System
// ============================================================

export const DATA_ADMIN_EMAILS = [
  'jose.sanchez@crearpsl.net',
  'contabilidad.global@crearpsl.net', // Elizabeth Escobar CFO
  'legal@crearpsl.net',
];

export const isDataAdmin = (currentUser) => {
  if (!currentUser) return false;
  if (currentUser.isSuperAdmin || isSuperAdminEmail(currentUser?.email)) return true;
  const email = (currentUser.email || '').trim().toLowerCase();
  return DATA_ADMIN_EMAILS.includes(email);
};

export const canViewLegalPanel = (currentUser) => {
  if (!currentUser) return false;
  return isDataAdmin(currentUser);
};

export const canDownloadLegalPDF = (currentUser) => {
  return isDataAdmin(currentUser);
};

export const canSignLegalDocs = (currentUser) => {
  return !!currentUser?.email;
};

export const isLegalDocsPending = (currentUser, legalSignatures) => {
  if (!currentUser?.email) return true;
  const sig = (legalSignatures || []).find(
    s => (s.participant_id || '').toLowerCase() === (currentUser.email || '').toLowerCase()
  );
  return !sig || !sig.terms_accepted || !sig.nda_signed || !sig.privacy_accepted;
};
`;

if (!content.includes('MÓDULO LEGAL')) {
  fs.writeFileSync(file, content + newContent);
  console.log('Permisos legales añadidos');
} else {
  console.log('Permisos legales ya existían');
}
