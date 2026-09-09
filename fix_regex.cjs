const fs = require('fs');
const path = 'src/pages/EmbudoConversionBoard.jsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/k\.match\(\/EQUIPOs\+d\+\/i\)/, "k.match(/EQUIPO\\s+\\d+/i)");
fs.writeFileSync(path, code);
