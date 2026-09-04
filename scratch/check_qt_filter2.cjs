const fs = require('fs');
let code = fs.readFileSync('src/pages/DirectorioQT.jsx', 'utf8');
let start = code.indexOf("// 0. Reglas de Jerarqu");
let end = code.indexOf("// 1. Filtro por Sede", start);
console.log(code.substring(start, end));