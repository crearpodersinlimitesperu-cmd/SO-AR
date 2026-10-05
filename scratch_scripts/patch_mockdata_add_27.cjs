const fs = require('fs');

const path = '../crm/imose30lima/assets/index-BUEJnpaY.js';
let content = fs.readFileSync(path, 'utf8');

// The string we previously replaced was `equipos:[`EQUIPO 30`,`EQUIPO 28`,`EQUIPO 29`]` 
// BUT what if we just search for the regex `equipos:\[[^\]]*\]` and replace it with ALL the teams.
content = content.replace(/equipos:\[[^\]]*\]/g, 'equipos:[`EQUIPO 30`,`EQUIPO 29`,`EQUIPO 28`,`EQUIPO 27`,`EQUIPO 26`,`EQUIPO 25`,`EQUIPO 24`]');

fs.writeFileSync(path, content, 'utf8');
console.log('Parcheado E30 con EQUIPO 27');
