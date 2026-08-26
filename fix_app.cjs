const fs = require('fs');
const path = 'c:/Users/josem/Downloads/SO-AR/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/, 'superadmin'\]/g, ", 'superadmin', 'consolidado']");
fs.writeFileSync(path, content);
console.log("Replaced 'superadmin' with 'superadmin', 'consolidado' in App.jsx");
