const fs = require('fs');
let code = fs.readFileSync('src/pages/DirectorioQT.jsx', 'utf8');

let start = code.indexOf("const userSede = currentUser?.sede || '';");
let end = code.indexOf("// 1. Filtro por Sede", start);
let conditionBlock = code.substring(start, end);
console.log(conditionBlock);