const fs = require('fs');

const path = 'src/services/cmjDataService.js';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/if \(actStats\.entrenador\) \{[\s\S]*?\}/g, '');
code = code.replace(/eq\.entrenador = actStats\.entrenador;/g, '');

fs.writeFileSync(path, code);
