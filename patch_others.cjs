const fs = require('fs');

const replaceInFile = (file, oldStr, newStr) => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(new RegExp(oldStr.replace(/[.*+?^$\{()|[\]\\]/g, '\\$&'), 'g'), newStr);
  fs.writeFileSync(file, content);
};

// Files that already have currentUser in scope
const filesToPatch = [
  'src/components/BirthdayAlert.jsx',
  'src/components/UserProfileModal.jsx',
  'src/components/TaskAssignmentModal.jsx',
  'src/pages/AsignadorEntrenadores.jsx',
  'src/pages/SuperAdminPanel.jsx',
  'src/pages/ComunicadosOperativos.jsx',
  'src/pages/Home.jsx',
  'src/Home.jsx' // Just in case
];

filesToPatch.forEach(file => {
  replaceInFile(file, 'getAllCompanyUsers()', 'getAllCompanyUsers(currentUser)');
  console.log('Patched', file);
});
