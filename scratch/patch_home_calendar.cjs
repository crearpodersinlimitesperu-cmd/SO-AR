const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.jsx', 'utf8');

const regex = /{ id: 'calendario-equipo', label: 'Agenda y Time Boxing', emoji: '📅', route: '\/calendario-equipo', roles: null },/g;
code = code.replace(regex, "{ id: 'calendario-equipo', label: 'Agenda y Time Boxing', emoji: '📅', route: '/calendario-equipo', roles: EXEC_ROLES },");

const regex2 = /route: '\/calendario-equipo',\n      roles: null/g;
code = code.replace(regex2, "route: '/calendario-equipo',\n      roles: EXEC_ROLES");

fs.writeFileSync('src/pages/Home.jsx', code, 'utf8');