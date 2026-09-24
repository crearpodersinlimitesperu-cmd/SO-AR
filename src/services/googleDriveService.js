/**
 * googleDriveService.js
 * Servicio para subir y gestionar documentos de evidencia en Google Drive y almacenamiento Cloud.
 * Organización: CREAR PODER SIN LÍMITES
 * Plataforma: Causa OS
 */

import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const DRIVE_FOLDER_NAME = 'Causa OS - Evidencias';

// Carpeta oficial de pólizas de entrenadores. La consulta es exclusivamente
// de metadatos; esta integración nunca descarga, edita, mueve ni comparte.
export const TRAINER_POLICIES_FOLDER_ID = '1XDkAtrhZcPbInZLQbpQ4DwlQijMLxGbq';

export async function listTrainerPolicyFiles(accessToken, folderId = TRAINER_POLICIES_FOLDER_ID) {
  if (!accessToken) throw new Error('Se requiere autorización de Google Drive.');
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    orderBy: 'modifiedTime desc', pageSize: '100',
    fields: 'files(id,name,mimeType,modifiedTime,webViewLink,size)',
    supportsAllDrives: 'true', includeItemsFromAllDrives: 'true',
  });
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail?.error?.message || `Google Drive respondió HTTP ${response.status}.`);
  }
  const data = await response.json();
  return Array.isArray(data.files) ? data.files : [];
}

/**
 * Obtiene o crea la carpeta de evidencias en Google Drive
 */
async function getOrCreateDriveFolder(accessToken, folderName = DRIVE_FOLDER_NAME) {
  try {
    const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // Si no existe, crear la carpeta
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });

    if (createRes.ok) {
      const folderData = await createRes.json();
      return folderData.id;
    }
  } catch (err) {
    console.warn('No se pudo verificar o crear la carpeta en Google Drive:', err);
  }
  return null;
}

/**
 * Hace que un archivo en Google Drive sea accesible por cualquier miembro con el enlace.
 *
 * FIX (17/09/2026): José pidió que la evidencia subida quede "disponible para los
 * interesados". El código YA intentaba esto (role:'reader', type:'anyone'), pero
 * antes se ignoraba si la llamada fallaba: no se revisaba `res.ok` y el catch solo
 * hacía console.warn, así que si Google Drive rechazaba el permiso (token con
 * alcance insuficiente, límite de la API, error de red), el archivo quedaba
 * PRIVADO en la cuenta de quien subió, pero la app igual mostraba "subido con
 * éxito" y guardaba el enlace como si cualquier interesado pudiera abrirlo — sin
 * que nadie se enterara del fallo. Ahora esta función devuelve true/false para que
 * quien la llama sepa con certeza si el enlace quedó realmente público, y se pueda
 * avisar al usuario en vez de asumir que sí funcionó.
 */
async function makeDriveFilePublic(accessToken, fileId) {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('No se pudo establecer permiso público en Google Drive (respuesta no OK):', res.status, errorData);
      return false;
    }
    return true;
  } catch (err) {
    console.error('No se pudo establecer permiso público en Google Drive (error de red/excepción):', err);
    return false;
  }
}

/**
 * Sube un archivo a Google Drive vía API v3
 * @param {File} file Archivo a subir
 * @param {string} accessToken Token de acceso de Google (OAuth2)
 * @param {string} [subfolderName] Subcarpeta opcional (ej: Sede)
 * @returns {Promise<{ url: string, id: string, name: string, provider: 'google_drive' }>}
 */
export async function uploadToGoogleDrive(file, accessToken, subfolderName = '') {
  if (!accessToken) {
    throw new Error('No se encontró token de acceso de Google. Por favor, reautentica tu cuenta.');
  }

  // 1. Obtener o crear carpeta raíz
  const folderId = await getOrCreateDriveFolder(accessToken, DRIVE_FOLDER_NAME);

  // 2. Preparar cuerpo multipart/related
  const metadata = {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    parents: folderId ? [folderId] : undefined
  };

  const boundary = '-------CausaOSDriveUpload' + Math.random().toString(36).substring(2);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const reader = new FileReader();
  const fileData = await new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

  const metadataPart = delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${file.type || 'application/octet-stream'}\r\n` +
    'Content-Transfer-Encoding: base64\r\n\r\n';

  // Convertir ArrayBuffer a base64
  let binary = '';
  const bytes = new Uint8Array(fileData);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Data = btoa(binary);

  const multipartRequestBody = metadataPart + base64Data + closeDelimiter;

  const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!uploadRes.ok) {
    const errorData = await uploadRes.json().catch(() => ({}));
    const errorMsg = errorData?.error?.message || `HTTP ${uploadRes.status}`;
    throw new Error(`Error en Google Drive: ${errorMsg}`);
  }

  const driveFile = await uploadRes.json();

  // 3. Establecer permisos de lectura para que el equipo pueda abrirlo
  // FIX (17/09/2026): se captura el resultado real (true/false) en vez de asumir
  // éxito, para poder informar honestamente si el enlace quedó público o no.
  let publicAccessConfirmed = false;
  if (driveFile.id) {
    publicAccessConfirmed = await makeDriveFilePublic(accessToken, driveFile.id);
  }

  const finalUrl = driveFile.webViewLink || `https://drive.google.com/file/d/${driveFile.id}/view`;

  return {
    id: driveFile.id,
    name: driveFile.name || file.name,
    url: finalUrl,
    provider: 'google_drive',
    size: file.size,
    type: file.type,
    publicAccessConfirmed
  };
}

/**
 * Respaldo: Sube un archivo a Firebase Storage
 * @param {File} file Archivo a subir
 * @param {string} [taskId] ID de la tarea
 * @returns {Promise<{ url: string, name: string, provider: 'firebase_storage' }>}
 */
export async function uploadToFirebaseStorage(file, taskId = 'general') {
  const timestamp = Date.now();
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `evidencias/${taskId}/${timestamp}_${cleanName}`;
  const storageRef = ref(storage, path);

  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type || 'application/octet-stream',
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString()
    }
  });

  const downloadUrl = await getDownloadURL(snapshot.ref);

  return {
    id: snapshot.ref.fullPath,
    name: file.name,
    url: downloadUrl,
    provider: 'firebase_storage',
    size: file.size,
    type: file.type
  };
}

/**
 * Función principal para subir evidencia:
 * Intenta subir a Google Drive si hay token disponible; si falla o no hay token, sube a Firebase Storage.
 */
export async function uploadEvidenceDocument(file, { accessToken, taskId = 'general' } = {}) {
  // Intentar Google Drive si hay token
  if (accessToken) {
    try {
      return await uploadToGoogleDrive(file, accessToken);
    } catch (driveErr) {
      console.warn('Subida a Google Drive falló o requiere permisos adicionales, recurriendo a almacenamiento en la nube:', driveErr);
      // Fallback a Firebase Storage
      try {
        return await uploadToFirebaseStorage(file, taskId);
      } catch (storageErr) {
        throw new Error(`No se pudo subir a Google Drive (${driveErr.message}) ni a la nube (${storageErr.message}). Por favor verifica tu conexión o pega el enlace directo.`);
      }
    }
  }

  // Si no hay token de Google, intentar directamente Firebase Storage
  try {
    return await uploadToFirebaseStorage(file, taskId);
  } catch (storageErr) {
    throw new Error(`No se pudo subir el archivo: ${storageErr.message}. Puedes ingresar el enlace directo de Google Drive.`);
  }
}
