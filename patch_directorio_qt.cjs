const fs = require('fs');
const file = 'src/pages/DirectorioQT.jsx';
let content = fs.readFileSync(file, 'utf8');

// Ensure import includes canManageUserStatus
content = content.replace(
  "import { \n  isGlobalQTCoordinator, \n  hasQTPrivileges, \n  isDireccionRole, \n  isNonOperationalDirector \n} from '../config/permissions';",
  "import { \n  isGlobalQTCoordinator, \n  hasQTPrivileges, \n  isDireccionRole, \n  isNonOperationalDirector, \n  canManageUserStatus \n} from '../config/permissions';"
);

// Patch loadMembers
const target = `const result = await getQTMembers({ forceRefresh });
      setMembers(result.data || []);`;

const replacement = `const result = await getQTMembers({ forceRefresh });
      let loadedMembers = result.data || [];
      if (!canManageUserStatus(currentUser)) {
        // Ocultar inactivos del directorio QT para quienes no son Talento Humano / Super Admin
        loadedMembers = loadedMembers.filter(m => {
          const s = (m.status || m.estado || '').toLowerCase();
          return !s.includes('inactiv');
        });
      }
      setMembers(loadedMembers);`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log('DirectorioQT patched');
