const fs = require('fs');
let code = fs.readFileSync('src/pages/CentroManagers.jsx', 'utf8');

code = code.replace(
  "if (email === 'marylourdespat@gmail.com') return 'Lourdes Patino';",
  "if (email === 'marylourdespat@gmail.com') return 'María De Lourdes Patiño Galarraga';"
);

fs.writeFileSync('src/pages/CentroManagers.jsx', code, 'utf8');
