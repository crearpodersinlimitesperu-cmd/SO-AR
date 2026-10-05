const fs = require('fs');

const path = '../crm/imose30lima/assets/index-BUEJnpaY.js';
let content = fs.readFileSync(path, 'utf8');

// The ultimate ultimate hack:
// We just force the filter to ONLY return equipo 30 regardless of what the user selects, 
// OR we force the dropdown to only map over ["EQUIPO 30"]

// Current code: tr.equipos.map(e=>(0,S.jsx)(`option`,{value:e,children:e},e))
// We will replace tr.equipos.map with ["EQUIPO 30"].map

content = content.replace(/tr\.equipos\.map/g, '["EQUIPO 30"].map');

fs.writeFileSync(path, content, 'utf8');
console.log('Dropdown de equipos forzado a EQUIPO 30 en E30');

const path31 = '../crm/imose31lima/assets/index-BUEJnpaY.js';
if(fs.existsSync(path31)) {
    let content31 = fs.readFileSync(path31, 'utf8');
    content31 = content31.replace(/tr\.equipos\.map/g, '["EQUIPO 31"].map');
    fs.writeFileSync(path31, content31, 'utf8');
    console.log('Dropdown de equipos forzado a EQUIPO 31 en E31');
}
