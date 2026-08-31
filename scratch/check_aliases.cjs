const fs = require('fs');
let code = fs.readFileSync('src/data/managersData.js', 'utf8');
const search = '\"Freddy Sosa\"';
const start = code.indexOf('const TRAINER_ALIASES');
console.log(code.substring(start, start + 300));
