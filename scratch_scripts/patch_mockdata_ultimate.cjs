const fs = require('fs');

const filePaths = [
  '../crm/imose30lima/assets/index-BUEJnpaY.js'
];

filePaths.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace the array of equipos
    content = content.replace(/equipos:\["EQUIPO 28","EQUIPO 29","EQUIPO 30"\]/, 'equipos:["EQUIPO 30"]');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Parcheado equipos array en:', filePath);
  }
});
