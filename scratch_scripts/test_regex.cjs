const fs = require('fs');
let code = fs.readFileSync('../crm/imose30lima/assets/index-BUEJnpaY.js', 'utf8');

// The original file sets:
// $n={equipos:["EQUIPO 28","EQUIPO 29","EQUIPO 30"]

let matches = code.match(/equipos:\[.*?\]/);
console.log(matches);
