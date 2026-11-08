import { getWhatsAppUrl } from './phoneUtils.js';

/**
 * Limpia y normaliza un teléfono a formato internacional E.164 con '+' (ej. +51997213218)
 */
export function formatInternationalPhone(phone, sede = '') {
  if (!phone) return '';
  const url = getWhatsAppUrl(phone, sede);
  if (!url) return '';
  const digits = url.replace('https://wa.me/', '').trim();
  return digits ? `+${digits}` : '';
}

/**
 * Genera el contenido de una tarjeta individual vCard 3.0 compatible con iPhone, Android, Mac y Windows
 */
export function generateSingleVCard(m) {
  if (!m) return '';
  const phone = formatInternationalPhone(m.telefono, m.sede);
  const fullName = (m.nombre || 'Sin Nombre').trim();
  const parts = fullName.split(/\s+/);
  const firstName = parts[0] || fullName;
  const lastName = parts.slice(1).join(' ') || '';
  const rol = m.rol || 'Manager';
  const equipo = m.equipo ? String(m.equipo).replace(/\s*\(#\d+\)\s*/g, '').trim() : '';
  const numEq = m.numEquipo ? `#${m.numEquipo}` : '';
  const sede = m.sede || '';
  const estado = m.estado || 'Activo';
  const entrenador = m.entrenador || 'Sin Asignar';

  const titleParts = [rol];
  if (numEq || equipo) titleParts.push(`${numEq} ${equipo}`.trim());
  if (sede) titleParts.push(`(${sede})`);
  const title = titleParts.join(' · ');

  const noteLines = [
    `Rol: ${rol}`,
    equipo ? `Equipo: ${numEq} ${equipo}`.trim() : null,
    sede ? `Sede: ${sede}` : null,
    `Estado: ${estado}`,
    entrenador ? `Entrenador: ${entrenador}` : null,
    `Organización: Crear Poder Sin Límites`
  ].filter(Boolean).join('\\n');

  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${fullName}`,
    `N:${lastName};${firstName};;;`,
    'ORG:Crear Poder Sin Límites',
    `TITLE:${title}`,
    phone ? `TEL;TYPE=CELL,VOICE,PREF:${phone}` : null,
    `NOTE:${noteLines}`,
    `CATEGORIES:CPSL,${rol}${sede ? `,${sede}` : ''}`,
    'END:VCARD'
  ].filter(Boolean).join('\r\n');
}

/**
 * Genera un archivo multi-contacto vCard 3.0 (.vcf)
 */
export function generateVCardBundle(managers = []) {
  const valid = managers.filter(m => m && (m.telefono || '').trim().length > 5);
  return valid.map(generateSingleVCard).join('\r\n\r\n');
}

/**
 * Genera un archivo CSV estándar listo para importar en Google Contacts (contacts.google.com)
 */
export function generateGoogleContactsCSV(managers = []) {
  const headers = [
    'Name',
    'Given Name',
    'Family Name',
    'Group Membership',
    'Phone 1 - Type',
    'Phone 1 - Value',
    'Organization 1 - Name',
    'Organization 1 - Title',
    'Notes'
  ];

  const escapeCSV = (val) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = managers
    .filter(m => m && (m.telefono || '').trim().length > 5)
    .map(m => {
      const fullName = (m.nombre || 'Sin Nombre').trim();
      const parts = fullName.split(/\s+/);
      const firstName = parts[0] || fullName;
      const lastName = parts.slice(1).join(' ') || '';
      const phone = formatInternationalPhone(m.telefono, m.sede);
      const rol = m.rol || 'Manager';
      const equipo = m.equipo ? String(m.equipo).replace(/\s*\(#\d+\)\s*/g, '').trim() : '';
      const numEq = m.numEquipo ? `#${m.numEquipo}` : '';
      const sede = m.sede || '';
      const estado = m.estado || 'Activo';
      const entrenador = m.entrenador || 'Sin Asignar';

      const titleParts = [rol];
      if (numEq || equipo) titleParts.push(`${numEq} ${equipo}`.trim());
      if (sede) titleParts.push(`(${sede})`);
      const title = titleParts.join(' · ');

      const notes = `Rol: ${rol} | Equipo: ${numEq} ${equipo} | Sede: ${sede} | Estado: ${estado} | Entrenador: ${entrenador} | CPSL`;

      return [
        escapeCSV(fullName),
        escapeCSV(firstName),
        escapeCSV(lastName),
        escapeCSV(`CPSL Managers ::: * myContacts`),
        'Mobile',
        escapeCSV(phone),
        'Crear Poder Sin Límites',
        escapeCSV(title),
        escapeCSV(notes)
      ].join(',');
    });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Dispara la descarga de un archivo de texto en el navegador del cliente
 */
export function triggerFileDownload(content, filename, mimeType = 'text/plain') {
  if (typeof window === 'undefined' || !window.Blob) return;
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
