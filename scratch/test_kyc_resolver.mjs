import googleWorkspaceUsers from '../src/data/googleWorkspaceUsers.json' with { type: 'json' };
import nodusEnroladosFallback from '../src/data/nodusEnroladosRecords.json' with { type: 'json' };
import { INITIAL_MANAGERS } from '../src/data/managersData.js';
import { USERS_TO_IMPORT } from '../src/data/usersToImport.js';

function formatEmailToName(email) {
  if (!email || !email.includes('@')) return '';
  const prefix = email.split('@')[0];
  const cleaned = prefix.replace(/[\._\-]+/g, ' ').replace(/\d+/g, '').trim();
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function resolveParticipantKYC(emailOrId) {
  if (!emailOrId) return null;
  const search = emailOrId.toLowerCase().trim();

  // 1. usersData
  const u = USERS_TO_IMPORT.find(user => {
    if (user.email?.toLowerCase().trim() === search) return true;
    if (user.corporateEmail?.toLowerCase().trim() === search) return true;
    if (user.personalEmail?.toLowerCase().trim() === search) return true;
    if (user.emails && user.emails.some(e => e.toLowerCase().trim() === search)) return true;
    return false;
  });
  if (u) {
    return { source: 'usersToImport', fullName: u.name, sede: u.sede, email: search };
  }

  // 2. Google Workspace
  const gw = googleWorkspaceUsers.find(g => g.email?.toLowerCase().trim() === search);
  if (gw) {
    return { source: 'googleWorkspace', fullName: gw.name, email: search };
  }

  // 3. Nodus Enrolados
  const nodus = nodusEnroladosFallback.find(n => n.email?.toLowerCase().trim() === search);
  if (nodus) {
    return { source: 'nodus', fullName: nodus.nombre, telefono: nodus.telefono, email: search };
  }

  // 4. Managers Directory
  const mgr = INITIAL_MANAGERS.find(m => m.email?.toLowerCase().trim() === search);
  if (mgr) {
    return { source: 'managersData', fullName: mgr.nombre, sede: mgr.sede, email: search };
  }

  // 5. Heuristic
  const parsed = formatEmailToName(search);
  if (parsed) {
    return { source: 'email_heuristic', fullName: parsed, email: search };
  }

  return null;
}

console.log("Test 1 (jose.sanchez@crearpsl.net):", resolveParticipantKYC("jose.sanchez@crearpsl.net"));
console.log("Test 2 (asistente.facturacion@crearpsl.net):", resolveParticipantKYC("asistente.facturacion@crearpsl.net"));
console.log("Test 3 (consultora@jcalderon.net):", resolveParticipantKYC("consultora@jcalderon.net"));
console.log("Test 4 (chuyacostar88@gmail.com):", resolveParticipantKYC("chuyacostar88@gmail.com"));
console.log("Test 5 (desconocido.prueba@empresa.com):", resolveParticipantKYC("desconocido.prueba@empresa.com"));
