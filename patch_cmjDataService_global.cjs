const fs = require('fs');

const path = 'src/services/cmjDataService.js';
let code = fs.readFileSync(path, 'utf8');

// The block has this string exactly: "if (maestriaData && eq.sede.includes('Lima')) {"
code = code.replace("if (maestriaData && eq.sede.includes('Lima')) {", "if (maestriaData) {");
fs.writeFileSync(path, code);
