const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.jsx', 'utf8');

const regex = /\(currentUser\?\.isSuperAdmin \|\| currentUser\?\.appRole === 'gerente' \|\| currentUser\?\.isDireccion \|\| currentUser\?\.appRole === 'director_maestria'\) && \(/g;
const replacement = "(currentUser?.isSuperAdmin || currentUser?.appRole === 'gerente' || currentUser?.isDireccion || currentUser?.appRole === 'director_maestria' || ['coordinador', 'coord_c1', 'coord_c2', 'coordinador_c1c2'].includes(currentUser?.appRole)) && (";

code = code.replace(regex, replacement);
fs.writeFileSync('src/pages/Home.jsx', code, 'utf8');