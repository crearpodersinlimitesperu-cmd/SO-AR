const fs = require('fs');
const file = 'src/pages/Login.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "Bienvenido al Programa de Creación",
  "Plataforma Oficial de Firmas y Accesos"
);

content = content.replace(
  "Este es el portal oficial para participantes del programa.",
  ""
); // wait, did I even have this?

content = content.replace(
  "Para iniciar tu proceso de revisión y firma de documentos legales",
  "Para iniciar el proceso de revisión y firma digital de tus documentos legales (Aliados, Participantes y Equipo)"
);

fs.writeFileSync(file, content);
console.log('Login updated for all roles');
