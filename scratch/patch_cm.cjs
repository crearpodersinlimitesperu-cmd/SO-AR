const fs = require('fs');
let code = fs.readFileSync('src/pages/CentroManagers.jsx', 'utf8');
code = code.replace(
  "if (email === 'carlos.brunis@crearpsl.net' || email === 'brunische66@gmail.com') return 'Carlos Brunis';",
  "if (email === 'carlos.brunis@crearpsl.net' || email === 'brunische66@gmail.com') return 'Carlos Brunis';\n    if (email === 'marylourdespat@gmail.com') return 'Lourdes Patino';\n    if (email === 'linid.valencia@crearpsl.net') return 'Linid Valencia';"
);
fs.writeFileSync('src/pages/CentroManagers.jsx', code, 'utf8');
