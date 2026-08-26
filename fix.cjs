const fs = require('fs');
const path = 'c:/Users/josem/Downloads/SO-AR/src/pages/Home.jsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/, 'superadmin'\]/g, ", 'superadmin', 'consolidado']");
content = content.replace(/, 'qt'\]/g, ", 'qt', 'consolidado']");
content = content.replace(/, 'director_maestria'\]/g, ", 'director_maestria', 'consolidado']");
fs.writeFileSync(path, content);
console.log("Replaced 'superadmin' with 'superadmin', 'consolidado' in Home.jsx");
