/**
 * legalSignatureService.js — CREAR PSL Legal Onboarding System
 * Orquestador del flujo de firma legal digital.
 * Versión: 2026-v1
 */

import { getContractsByCountry, getSedePais } from '../data/legalContracts';
import { findUserByAnyEmail } from '../data/usersData';
import googleWorkspaceUsers from '../data/googleWorkspaceUsers.json';
import nodusEnroladosFallback from '../data/nodusEnroladosRecords.json';
import { INITIAL_MANAGERS } from '../data/managersData.js';
import { db, storage, auth } from './firebase';
import {
  collection, doc, setDoc, getDoc, getDocs, query, where,
  serverTimestamp, orderBy
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

const safeGetSedePais = (sede) => {
  try {
    return typeof getSedePais === 'function' ? (getSedePais(sede) || 'PE') : 'PE';
  } catch {
    return 'PE';
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. UTILIDADES CRIPTOGRÁFICAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Genera un hash SHA-256 de una cadena usando la Web Crypto API nativa del browser.
 * @param {string} input - Cadena a hashear
 * @returns {Promise<string>} - Hash en formato hex
 */
export const sha256Hex = async (input) => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    console.error('[LegalSignature] Error generando SHA-256:', e);
    // Fallback: hash simple usando timestamp + participantId
    return `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

/**
 * Genera un UUID v4 aleatorio
 */
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
};

/**
 * Genera el hash de firma a partir de los datos del participante y los documentos aceptados.
 */
export const generateSignatureHash = async (signatureDataUrl, participantId, timestamp, docsAccepted) => {
  const payload = `${participantId}|${timestamp}|${(docsAccepted || []).join(',')}|${(signatureDataUrl || '').slice(0, 100)}`;
  return sha256Hex(payload);
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. CAPTURA DE METADATOS DE AUDITORÍA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Captura IP pública, User-Agent y timestamp para auditoría.
 * @returns {Promise<{ipAddress: string, userAgent: string, timestamp: string}>}
 */
export const captureAuditMetadata = async () => {
  let ipAddress = 'Unknown';
  try {
    const resp = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(4000) });
    const data = await resp.json();
    ipAddress = data.ip || 'Unknown';
  } catch {
    ipAddress = 'IP-Unavailable';
  }

  return {
    ipAddress,
    userAgent: navigator.userAgent || 'Unknown',
    timestamp: new Date().toISOString(),
  };
};

export const formatEmailToName = (email) => {
  if (!email || !email.includes('@')) return '';
  const prefix = email.split('@')[0];
  const cleaned = prefix.replace(/[\._\-]+/g, ' ').replace(/\d+/g, '').trim();
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

export const resolveParticipantKYC = (emailOrId) => {
  if (!emailOrId) return null;
  const search = emailOrId.toLowerCase().trim();

  // 1. usersData (Personal institucional, directivos, coordinadores)
  try {
    if (typeof findUserByAnyEmail === 'function') {
      const u = findUserByAnyEmail(search);
      if (u) {
        const sede = u.sede && u.sede !== 'Global' && u.sede !== 'ALL' ? u.sede : '';
        return {
          source: 'usersData',
          fullName: (u.name || u.displayName || '').trim(),
          docType: u.docType || u.documentType || 'DNI',
          docNumber: (u.document || u.docNumber || '').toString().trim(),
          phone: (u.phone || u.contacto || '').toString().trim(),
          sede: sede,
          countryCode: sede ? safeGetSedePais(sede) : 'PE',
          email: search,
        };
      }
    }
  } catch {}

  // 2. Google Workspace Users (Directorio institucional corporativo)
  try {
    if (typeof googleWorkspaceUsers !== 'undefined' && Array.isArray(googleWorkspaceUsers)) {
      const gw = googleWorkspaceUsers.find(g => g.email?.toLowerCase().trim() === search);
      if (gw && gw.name) {
        return {
          source: 'googleWorkspace',
          fullName: gw.name.trim(),
          docType: 'DNI',
          docNumber: '',
          phone: '',
          sede: '',
          countryCode: 'PE',
          email: search,
        };
      }
    }
  } catch {}

  // 3. Nodus Enrolados (CRM Base de participantes)
  try {
    if (typeof nodusEnroladosFallback !== 'undefined' && Array.isArray(nodusEnroladosFallback)) {
      const nodus = nodusEnroladosFallback.find(n => n.email?.toLowerCase().trim() === search);
      if (nodus && nodus.nombre) {
        let s = '';
        if (nodus.equipo?.includes('LIMA')) s = 'Lima';
        else if (nodus.equipo?.includes('QUITO')) s = 'Quito';
        else if (nodus.equipo?.includes('CUENCA')) s = 'Cuenca';
        else if (nodus.equipo?.includes('GUAYAQUIL')) s = 'Guayaquil';
        else if (nodus.equipo?.includes('MEDELLIN')) s = 'Medellín';
        else if (nodus.equipo?.includes('CDMX') || nodus.equipo?.includes('MEXICO')) s = 'CDMX';
        return {
          source: 'nodus',
          fullName: nodus.nombre.trim(),
          docType: 'DNI',
          docNumber: '',
          phone: (nodus.telefono || '').toString().trim(),
          sede: s,
          countryCode: s ? safeGetSedePais(s) : 'PE',
          email: search,
        };
      }
    }
  } catch {}

  // 4. Managers Directory (Directorio de managers y coordinadores en campo)
  try {
    if (typeof INITIAL_MANAGERS !== 'undefined' && Array.isArray(INITIAL_MANAGERS)) {
      const mgr = INITIAL_MANAGERS.find(m => m.email?.toLowerCase().trim() === search);
      if (mgr && mgr.nombre) {
        return {
          source: 'managersData',
          fullName: mgr.nombre.trim(),
          docType: 'DNI',
          docNumber: '',
          phone: (mgr.telefono || '').toString().trim(),
          sede: mgr.sede || '',
          countryCode: mgr.sede ? safeGetSedePais(mgr.sede) : 'PE',
          email: search,
        };
      }
    }
  } catch {}

  // 5. Inferencia heurística por email (nombre.apellido@dominio.com -> Nombre Apellido)
  const heurName = formatEmailToName(search);
  if (heurName) {
    return {
      source: 'email_heuristic',
      fullName: heurName,
      docType: 'DOC',
      docNumber: '',
      phone: '',
      sede: '',
      countryCode: 'PE',
      email: search,
    };
  }

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. GUARDAR EN FIRESTORE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Guarda el registro de firma en la colección `px_legal_signatures`.
 * @param {object} payload
 * @returns {Promise<string>} signatureId
 */
export const saveLegalSignature = async (payload) => {
  const signatureId = payload.signatureId || generateUUID();
  const docRef = doc(db, 'px_legal_signatures', signatureId);

  const rawKyc = payload.kycData || payload.kyc_data || {};
  let participantName = (payload.participantName || payload.participant_name || rawKyc.fullName || rawKyc.full_name || payload.fullName || '').trim();
  const participantId = (payload.participantId || payload.participant_id || rawKyc.email || payload.email || '').toLowerCase().trim();
  let sede = payload.sede || rawKyc.sede || '';
  let countryCode = payload.countryCode || payload.country_code || (sede ? safeGetSedePais(sede) : 'PE');
  let docType = rawKyc.docType || rawKyc.doc_type || payload.docType || payload.doc_type || 'DNI';
  let docNumber = (rawKyc.docNumber || rawKyc.doc_number || payload.docNumber || payload.doc_number || '').toString().trim();
  let birthDate = rawKyc.birthDate || rawKyc.birth_date || payload.birthDate || payload.birth_date || '';
  let phone = (rawKyc.phone || payload.phone || '').toString().trim();

  // Enriquecer automáticamente usando la bóveda multi-fuente si falta algún dato
  if (participantId) {
    const kyc = resolveParticipantKYC(participantId);
    if (kyc) {
      if (!participantName || participantName.toLowerCase() === 'sin nombre' || participantName.toLowerCase() === 'colaborador crear' || participantName.toLowerCase() === 'participante') {
        participantName = kyc.fullName || participantName;
      }
      if (!sede || sede === 'Global' || sede === 'ALL') {
        sede = kyc.sede || sede;
        if (sede && sede !== 'Global' && sede !== 'ALL') countryCode = safeGetSedePais(sede);
      }
      if (!docNumber || docNumber === 'No reg.') {
        docNumber = kyc.docNumber || docNumber;
        docType = kyc.docType || docType;
      }
      if (!phone) {
        phone = kyc.phone || phone;
      }
    }
  }

  const finalName = participantName || (participantId ? formatEmailToName(participantId) : '') || 'Participante';

  const record = {
    id: signatureId,
    participant_id: participantId,
    participantId: participantId,
    email: participantId,
    owner_uid: auth.currentUser?.uid || '',
    document_versions: payload.documentVersions || {},
    participant_name: finalName,
    participantName: finalName,
    full_name: finalName,
    country_code: countryCode,
    countryCode: countryCode,
    sede: sede,
    doc_type: docType,
    docType: docType,
    doc_number: docNumber,
    docNumber: docNumber,
    birth_date: birthDate,
    birthDate: birthDate,
    phone: phone,
    kyc_data: {
      fullName: finalName,
      full_name: finalName,
      docType: docType,
      doc_type: docType,
      docNumber: docNumber,
      doc_number: docNumber,
      birthDate: birthDate,
      birth_date: birthDate,
      phone: phone,
      email: participantId
    },
    kycData: {
      fullName: finalName,
      full_name: finalName,
      docType: docType,
      doc_type: docType,
      docNumber: docNumber,
      doc_number: docNumber,
      birthDate: birthDate,
      birth_date: birthDate,
      phone: phone,
      email: participantId
    },
    terms_accepted: payload.termsAccepted || false,
    nda_signed: payload.ndaSigned || false,
    privacy_accepted: payload.privacyAccepted || false,
    docs_accepted: payload.docsAccepted || [],
    privacy_policy_version: payload.policyVersion || '2026-v1',
    ip_address: payload.ipAddress || '',
    user_agent: payload.userAgent || '',
    signature_data_url: payload.signatureDataUrl || '', // base64 del canvas
    pdf_storage_path: payload.pdfStoragePath || '',
    pdf_download_url: payload.pdfDownloadUrl || '',
    hash_sha256: payload.hashSha256 || '',
    audit_hash: payload.hashSha256 || '',
    hashSha256: payload.hashSha256 || '',
    signed_at: serverTimestamp(),
    nodus_synced: false,
    nodus_synced_at: null,
    status: 'COMPLETED',
  };

  await setDoc(docRef, record, { merge: true });
  return signatureId;
};

/**
 * Actualiza el registro con la URL del PDF una vez generado.
 */
export const updateSignatureWithPDF = async (signatureId, pdfStoragePath, pdfDownloadUrl) => {
  const docRef = doc(db, 'px_legal_signatures', signatureId);
  await setDoc(docRef, { pdf_storage_path: pdfStoragePath, pdf_download_url: pdfDownloadUrl }, { merge: true });
};

/**
 * Marca el registro como sincronizado con Nodus.
 */
export const markNodusSync = async (signatureId) => {
  const docRef = doc(db, 'px_legal_signatures', signatureId);
  await setDoc(docRef, { nodus_synced: true, nodus_synced_at: serverTimestamp() }, { merge: true });
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. GENERACIÓN Y SUBIDA DE PDF
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Genera el contenido HTML del PDF de firma y lo sube a Firebase Storage.
 * IMPORTANTE: En el browser no podemos usar Puppeteer. Se genera un HTML
 * completo que representa el contrato firmado como comprobante.
 *
 * @param {string} signatureId
 * @param {object} signatureData
 * @returns {Promise<{storagePath: string, downloadUrl: string}>}
 */
export const uploadSignaturePDF = async (signatureId, signatureData) => {
  const now = new Date();
  const year = now.getFullYear();
  const sede = (signatureData.sede || 'sede').replace(/\s+/g, '_').toLowerCase();

  const storagePath = `legal-contracts/${sede}/${year}/${signatureId}.html`;

  const htmlContent = generateSignedContractHTML(signatureData);

  // Subir como string HTML a Firebase Storage
  const storageRef = ref(storage, storagePath);
  await uploadString(storageRef, htmlContent, 'raw', { contentType: 'text/html; charset=utf-8' });

  const downloadUrl = await getDownloadURL(storageRef);

  return { storagePath, downloadUrl };
};

/**
 * Genera el HTML del contrato firmado con todos los datos de auditoría y KYC.
 */
export const generateSignedContractHTML = (data) => {
  const norm = normalizeSignatureDoc ? normalizeSignatureDoc(data) : data;
  const now = norm.signed_at?.toDate ? norm.signed_at.toDate() : (norm.signed_at ? new Date(norm.signed_at) : new Date());
  const docsText = (norm.docsAccepted || norm.docs_accepted || []).join(', ');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante Legal de Firma Digital — ${norm.participantName || ''}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 900px; margin: 40px auto; color: #1a1a2e; padding: 20px; }
    .header { text-align: center; border-bottom: 3px solid #001f5b; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #001f5b; font-size: 1.4rem; }
    .badge { display: inline-block; background: #dcfce7; color: #15803d; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 0.85rem; }
    .section { margin: 24px 0; padding: 16px; background: #f8fafc; border-left: 4px solid #001f5b; border-radius: 4px; }
    .section h3 { color: #001f5b; margin-top: 0; }
    .metadata { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .meta-item { background: white; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 0.85rem; }
    .meta-item strong { display: block; color: #64748b; margin-bottom: 3px; font-size: 0.75rem; text-transform: uppercase; }
    .signature-img { border: 2px solid #001f5b; border-radius: 8px; background: white; padding: 10px; }
    .hash-box { font-family: monospace; font-size: 0.75rem; background: #1a1a2e; color: #10b981; padding: 12px; border-radius: 6px; word-break: break-all; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; opacity: 0.05; color: #001f5b; font-weight: 900; pointer-events: none; z-index: 0; }
    .footer { text-align: center; margin-top: 40px; font-size: 0.8rem; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    .doc-list { list-style: none; padding: 0; }
    .doc-list li::before { content: "✅ "; }
    .doc-list li { padding: 6px 0; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="watermark">CREAR PSL</div>
  <div class="header">
    <h1>🔐 COMPROBANTE DE FIRMA DIGITAL LEGAL</h1>
    <p>Programa de Creación — CREAR PSL Global</p>
    <span class="badge">✅ FIRMA COMPLETADA Y VÁLIDA</span>
  </div>

  <div class="section">
    <h3>📋 Datos de Identidad del Participante (KYC)</h3>
    <div class="metadata">
      <div class="meta-item"><strong>Nombre Completo</strong>${norm.kycData?.fullName || norm.participantName || 'N/A'}</div>
      <div class="meta-item"><strong>Documento de Identidad</strong>${norm.kycData?.docType || 'DOC'}: ${norm.kycData?.docNumber || 'N/A'}</div>
      <div class="meta-item"><strong>Correo Electrónico</strong>${norm.kycData?.email || norm.participantId || 'N/A'}</div>
      <div class="meta-item"><strong>Teléfono / WhatsApp</strong>${norm.kycData?.phone || 'N/A'}</div>
      <div class="meta-item"><strong>Fecha de Nacimiento</strong>${norm.kycData?.birthDate || 'N/A'}</div>
      <div class="meta-item"><strong>Sede</strong>${norm.sede || 'N/A'}</div>
      <div class="meta-item"><strong>País / Marco Legal</strong>${norm.countryCode || 'N/A'}</div>
      <div class="meta-item"><strong>Fecha y Hora de Firma</strong>${now.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })} (Hora México)</div>
      <div class="meta-item"><strong>ID de Firma</strong>${norm.signatureId || norm.id || 'N/A'}</div>
    </div>
  </div>

  <div class="section">
    <h3>📝 Documentos Aceptados</h3>
    <ul class="doc-list">
      ${(norm.docsAccepted || norm.docs_accepted || []).map(d => `<li>${d}</li>`).join('')}
    </ul>
  </div>

  <div class="section">
    <h3>🔒 Metadatos de Auditoría</h3>
    <div class="metadata">
      <div class="meta-item"><strong>Dirección IP</strong>${norm.ipAddress || norm.ip_address || 'N/A'}</div>
      <div class="meta-item"><strong>Dispositivo / Navegador</strong>${(norm.userAgent || norm.user_agent || '').slice(0, 80)}...</div>
      <div class="meta-item"><strong>Versión de Política</strong>${norm.policyVersion || norm.privacy_policy_version || '2026-v1'}</div>
      <div class="meta-item"><strong>Timestamp UTC</strong>${norm.timestamp || now.toISOString()}</div>
    </div>
    <div style="margin-top:12px;">
      <strong style="font-size:0.8rem; color:#64748b; display:block; margin-bottom:6px;">HASH SHA-256 DE INTEGRIDAD:</strong>
      <div class="hash-box">${norm.hashSha256 || norm.hash_sha256 || norm.audit_hash || 'N/A'}</div>
    </div>
  </div>

  ${(norm.signatureDataUrl || norm.signature_data_url) ? `
  <div class="section">
    <h3>✍️ Firma Manuscrita Digital</h3>
    <div class="signature-img">
      <img src="${norm.signatureDataUrl || norm.signature_data_url}" alt="Firma del participante" style="max-width:100%; max-height:200px;" />
    </div>
  </div>
  ` : ''}

  <div class="footer">
    <p>Este documento tiene valor legal como comprobante de aceptación de contratos digitales.</p>
    <p>CREAR PSL Global | legal@crearpsl.com | https://crearpsl.com</p>
    <p>Generado el ${now.toISOString()} | ID: ${norm.signatureId || norm.id || generateUUID()}</p>
  </div>
</body>
</html>`;
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. WEBHOOK A NODUS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envía webhook a Nodus para marcar al participante como LEGAL_DOCS_COMPLETED.
 * Si falla, solo hace log y no bloquea el flujo principal.
 */
export const sendNodusWebhook = async (participantId, status = 'LEGAL_DOCS_COMPLETED') => {
  try {
    const payload = {
      participant_id: participantId,
      status,
      timestamp: new Date().toISOString(),
      source: 'CAUSA_OS_LEGAL_MODULE',
    };

    await fetch('https://nodus.crearpsl.com/api/webhook/legal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    console.log(`[LegalSignature] Webhook Nodus enviado para ${participantId}`);
  } catch (e) {
    console.warn('[LegalSignature] Webhook Nodus falló (no crítico):', e.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. NORMALIZACIÓN Y CONSULTAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normaliza cualquier documento de firma legal (legado o nuevo)
 * garantizando compatibilidad total snake_case / camelCase, enriquecimiento KYC
 * y resolución de nombres/sedes para evitar registros anónimos o vacíos.
 */
export const normalizeSignatureDoc = (raw) => {
  if (!raw) return null;
  const kyc = raw.kycData || raw.kyc_data || {};
  let participantId = (raw.participantId || raw.participant_id || kyc.email || raw.email || '').toLowerCase().trim();
  let participantName = (raw.participantName || raw.participant_name || kyc.fullName || kyc.full_name || raw.full_name || '').trim();
  let sede = raw.sede || '';
  let countryCode = raw.countryCode || raw.country_code || (sede ? safeGetSedePais(sede) : 'PE');
  let docType = kyc.docType || kyc.doc_type || raw.docType || raw.doc_type || 'DOC';
  let docNumber = (kyc.docNumber || kyc.doc_number || raw.docNumber || raw.doc_number || '').toString().trim();
  let birthDate = kyc.birthDate || kyc.birth_date || raw.birthDate || raw.birth_date || '';
  let phone = (kyc.phone || raw.phone || '').toString().trim();

  // Enriquecer automáticamente usando la bóveda multi-fuente si falta el nombre o KYC
  if (participantId) {
    const resolved = resolveParticipantKYC(participantId);
    if (resolved) {
      if (!participantName || participantName.toLowerCase() === 'sin nombre' || participantName.toLowerCase() === 'colaborador crear' || participantName.toLowerCase() === 'participante') {
        participantName = resolved.fullName || participantName;
      }
      if (!sede || sede === 'Global' || sede === 'ALL') {
        sede = resolved.sede || sede;
        if (sede && sede !== 'Global' && sede !== 'ALL') countryCode = safeGetSedePais(sede);
      }
      if (!docNumber || docNumber === 'No reg.') {
        docNumber = resolved.docNumber || docNumber;
        docType = resolved.docType || docType;
      }
      if (!phone) {
        phone = resolved.phone || phone;
      }
    }
  }

  // Si la sede sigue siendo Global / ALL / vacía pero tenemos countryCode
  if (!sede || sede === 'Global' || sede === 'ALL') {
    if (countryCode === 'MX') sede = 'CDMX';
    else if (countryCode === 'EC') sede = 'Quito';
    else if (countryCode === 'CO') sede = 'Medellín';
    else if (countryCode === 'ES') sede = 'Madrid';
    else if (countryCode === 'PE') sede = 'Lima';
    else sede = 'Global';
  }

  const finalName = participantName || (participantId ? formatEmailToName(participantId) : '') || 'Participante';

  return {
    ...raw,
    participantName: finalName,
    participant_name: finalName,
    full_name: finalName,
    participantId: participantId,
    participant_id: participantId,
    email: participantId,
    countryCode: countryCode,
    country_code: countryCode,
    sede: sede,
    docType: docType || 'DOC',
    doc_type: docType || 'DOC',
    docNumber: docNumber || 'No reg.',
    doc_number: docNumber || 'No reg.',
    birthDate: birthDate,
    birth_date: birthDate,
    phone: phone,
    hashSha256: raw.hashSha256 || raw.hash_sha256 || raw.audit_hash || raw.id,
    audit_hash: raw.hashSha256 || raw.hash_sha256 || raw.audit_hash || raw.id,
    kycData: {
      fullName: finalName,
      full_name: finalName,
      docType: docType || 'DOC',
      doc_type: docType || 'DOC',
      docNumber: docNumber || 'No reg.',
      doc_number: docNumber || 'No reg.',
      birthDate: birthDate,
      birth_date: birthDate,
      phone: phone,
      email: participantId,
      sede: sede
    },
    kyc_data: {
      fullName: finalName,
      full_name: finalName,
      docType: docType || 'DOC',
      doc_type: docType || 'DOC',
      docNumber: docNumber || 'No reg.',
      doc_number: docNumber || 'No reg.',
      birthDate: birthDate,
      birth_date: birthDate,
      phone: phone,
      email: participantId,
      sede: sede
    }
  };
};

/**
 * Retorna el estado legal de un participante por su email.
 */
export const getLegalStatusByParticipant = async (participantId) => {
  try {
    const q = query(
      collection(db, 'px_legal_signatures'),
      where('participant_id', '==', (participantId || '').toLowerCase().trim())
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return normalizeSignatureDoc({ id: snap.docs[0].id, ...snap.docs[0].data() });
  } catch (e) {
    console.error('[LegalSignature] Error getLegalStatusByParticipant:', e);
    return null;
  }
};

/**
 * Retorna todas las firmas (para Dirección / SuperAdmin / Data Admin).
 * Auto-sana registros huérfanos o desactualizados en Firestore silenciosamente.
 * @param {object} filters - { sede, countryCode, status }
 */
export const getAllLegalSignatures = async (filters = {}) => {
  try {
    let q = collection(db, 'px_legal_signatures');

    const constraints = [];
    if (filters.sede) constraints.push(where('sede', '==', filters.sede));
    if (filters.countryCode) constraints.push(where('country_code', '==', filters.countryCode));
    if (filters.status) constraints.push(where('status', '==', filters.status));

    if (constraints.length > 0) {
      q = query(q, ...constraints, orderBy('signed_at', 'desc'));
    } else {
      q = query(q, orderBy('signed_at', 'desc'));
    }

    const snap = await getDocs(q);
    const list = [];
    for (const d of snap.docs) {
      const raw = { id: d.id, ...d.data() };
      const normalized = normalizeSignatureDoc(raw);
      list.push(normalized);

      // Auto-reparación permanente en Firestore: si en BD faltaban campos o decía "Sin Nombre"
      // y hemos resuelto el nombre real, persistimos el parche sin bloquear la interfaz.
      if (
        auth.currentUser &&
        ((!raw.participant_name || raw.participant_name === 'Sin Nombre' || !raw.kycData || !raw.participantName) &&
         normalized.participantName && normalized.participantName !== 'Sin Nombre' && normalized.participantName !== 'Participante')
      ) {
        setDoc(doc(db, 'px_legal_signatures', d.id), {
          participant_name: normalized.participantName,
          participantName: normalized.participantName,
          full_name: normalized.participantName,
          participant_id: normalized.participantId,
          participantId: normalized.participantId,
          email: normalized.participantId,
          sede: normalized.sede,
          country_code: normalized.countryCode,
          countryCode: normalized.countryCode,
          doc_type: normalized.docType,
          docType: normalized.docType,
          doc_number: normalized.docNumber,
          docNumber: normalized.docNumber,
          phone: normalized.phone,
          kyc_data: normalized.kycData,
          kycData: normalized.kycData,
          healed_at: serverTimestamp()
        }, { merge: true }).catch(err => {
          console.warn('[LegalSignature] Auto-heal notice:', err.message);
        });
      }
    }
    return list;
  } catch (e) {
    console.error('[LegalSignature] Error getAllLegalSignatures:', e);
    return [];
  }
};

/**
 * Actualiza y blinda manualmente los datos KYC de un participante en Firestore.
 */
export const updateLegalSignatureKYC = async (signatureId, kycUpdates) => {
  try {
    const docRef = doc(db, 'px_legal_signatures', signatureId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error(`Firma ${signatureId} no encontrada.`);
    }
    const currentData = snap.data();
    const finalName = (kycUpdates.fullName || kycUpdates.participantName || currentData.participant_name || currentData.participantName || '').trim();
    const finalDocType = kycUpdates.docType || currentData.doc_type || currentData.docType || 'DOC';
    const finalDocNumber = (kycUpdates.docNumber || currentData.doc_number || currentData.docNumber || '').trim();
    const finalPhone = (kycUpdates.phone || currentData.phone || '').trim();
    const finalEmail = (kycUpdates.email || currentData.participant_id || currentData.participantId || '').toLowerCase().trim();
    const finalSede = kycUpdates.sede || currentData.sede || 'Global';
    const finalCountryCode = kycUpdates.countryCode || currentData.country_code || currentData.countryCode || (finalSede ? safeGetSedePais(finalSede) : 'PE');
    const finalBirthDate = kycUpdates.birthDate || currentData.birth_date || currentData.birthDate || '';

    const patch = {
      participant_name: finalName,
      participantName: finalName,
      full_name: finalName,
      doc_type: finalDocType,
      docType: finalDocType,
      doc_number: finalDocNumber,
      docNumber: finalDocNumber,
      phone: finalPhone,
      participant_id: finalEmail,
      participantId: finalEmail,
      email: finalEmail,
      sede: finalSede,
      country_code: finalCountryCode,
      countryCode: finalCountryCode,
      birth_date: finalBirthDate,
      birthDate: finalBirthDate,
      kyc_data: {
        fullName: finalName,
        full_name: finalName,
        docType: finalDocType,
        doc_type: finalDocType,
        docNumber: finalDocNumber,
        doc_number: finalDocNumber,
        phone: finalPhone,
        email: finalEmail,
        birthDate: finalBirthDate,
        birth_date: finalBirthDate,
        sede: finalSede,
      },
      kycData: {
        fullName: finalName,
        full_name: finalName,
        docType: finalDocType,
        doc_type: finalDocType,
        docNumber: finalDocNumber,
        doc_number: finalDocNumber,
        phone: finalPhone,
        email: finalEmail,
        birthDate: finalBirthDate,
        birth_date: finalBirthDate,
        sede: finalSede,
      },
      updated_at: serverTimestamp(),
      healed_at: serverTimestamp(),
    };

    await setDoc(docRef, patch, { merge: true });
    return patch;
  } catch (err) {
    console.error('[LegalSignature] Error updateLegalSignatureKYC:', err);
    throw err;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. ORQUESTADOR PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Procesa la firma completa del participante.
 * Orden: metadata → hash → save → PDF async → webhook async
 *
 * @param {object} params
 * @param {string} params.participantId - Email del participante
 * @param {string} params.participantName - Nombre completo
 * @param {string} params.countryCode - MX | PE | CO | EC | ES
 * @param {string} params.sede - Sede del participante
 * @param {string} params.signatureDataUrl - Base64 del canvas de firma
 * @param {string[]} params.docsAccepted - IDs de documentos aceptados
 * @param {boolean} params.termsAccepted
 * @param {boolean} params.ndaSigned
 * @param {boolean} params.privacyAccepted
 * @returns {Promise<{success: boolean, signatureId: string, error?: string}>}
 */
export const processFullLegalSignature = async (params) => {
  const signatureId = generateUUID();

  try {
    if (!auth.currentUser || auth.currentUser.email?.toLowerCase() !== (params.participantId || '').toLowerCase().trim()) {
      throw new Error('Inicia sesión con tu propia cuenta antes de guardar la firma.');
    }
    // (a) Capturar metadatos de auditoría
    const { ipAddress, userAgent, timestamp } = await captureAuditMetadata();

    // (b) Generar hash de integridad
    const hashSha256 = await generateSignatureHash(
      params.signatureDataUrl,
      params.participantId,
      timestamp,
      params.docsAccepted
    );

    const finalParticipantName = (params.fullName || params.participantName || '').trim();

    const fullPayload = {
      signatureId,
      participantId: (params.participantId || '').toLowerCase().trim(),
      participantName: finalParticipantName,
      countryCode: params.countryCode || 'PE',
      sede: params.sede || '',
      termsAccepted: !!params.termsAccepted,
      ndaSigned: !!params.ndaSigned,
      privacyAccepted: !!params.privacyAccepted,
      docsAccepted: params.docsAccepted || [],
      policyVersion: params.countryCode === 'PE' ? '2026-10-04-pe-v2' : '2026-v1',
      documentVersions: Object.fromEntries(getContractsByCountry(params.countryCode).documents.filter(d => (params.docsAccepted || []).includes(d.id)).map(d => [d.id, d.version])),
      signatureDataUrl: params.signatureDataUrl || '',
      kycData: {
        fullName: finalParticipantName,
        docType: params.docType || '',
        docNumber: params.docNumber || '',
        birthDate: params.birthDate || '',
        phone: params.phone || '',
        email: params.email || params.participantId || ''
      },
      ipAddress,
      userAgent,
      timestamp,
      hashSha256,
      pdfStoragePath: '',
      pdfDownloadUrl: '',
    };

    // (c) Guardar en Firestore (optimistic save — sin esperar PDF)
    await saveLegalSignature(fullPayload);

    // (d) Generar y subir PDF de forma asíncrona (no bloquea)
    uploadSignaturePDF(signatureId, fullPayload)
      .then(({ storagePath, downloadUrl }) => {
        updateSignatureWithPDF(signatureId, storagePath, downloadUrl);
      })
      .catch(e => console.warn('[LegalSignature] PDF upload error (no crítico):', e));

    // (e) Webhook Nodus de forma asíncrona
    sendNodusWebhook(params.participantId)
      .then(() => markNodusSync(signatureId))
      .catch(e => console.warn('[LegalSignature] Nodus sync error (no crítico):', e));

    return { success: true, signatureId };
  } catch (error) {
    console.error('[LegalSignature] Error en processFullLegalSignature:', error);
    return { success: false, signatureId: null, error: error.code === 'permission-denied' ? 'No se pudo guardar la firma por falta de permisos. Tu firma sigue preparada en esta pantalla; vuelve a intentarlo tras actualizar el acceso.' : error.message };
  }
};

/**
 * Regenera URL temporal de descarga del PDF (válida mientras exista en Storage).
 */
export const generateTemporaryDownloadURL = async (storagePath) => {
  try {
    const storageRef = ref(storage, storagePath);
    return await getDownloadURL(storageRef);
  } catch (e) {
    console.error('[LegalSignature] Error generando download URL:', e);
    return null;
  }
};
