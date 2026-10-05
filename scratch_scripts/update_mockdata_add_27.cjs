const fs = require('fs');

const path = '../crm/imose30lima/assets/index-BUEJnpaY.js';
let content = fs.readFileSync(path, 'utf8');

// The original mock array DOES NOT EVEN HAVE anyone from Equipo 27. It's a static JS file! 
// Let's add a dummy entry to it so you can see it.

const newEntry = `,{id:\`DUMMY_EQUIPO_27\`,nombre:\`Dummy Equipo 27\`,equipo:\`EQUIPO 27\`,enrolados:[{id:\`ENROLADO_PRUEBA\`,nombre:\`Enrolado Prueba E27\`,coordinadora_nombre:\`Joyce\`,coordinadora_telefono:\`51933599903\`}]}`;

content = content.replace(/\]\}\]\};function nr\(\)/, newEntry + ']}};function nr()');

fs.writeFileSync(path, content, 'utf8');
console.log('Dummy agregado');
