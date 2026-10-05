const fs = require('fs');

const filePaths = [
  '../crm/imose30lima/assets/index-BUEJnpaY.js',
  '../crm/imose31lima/assets/index-BUEJnpaY.js'
];

filePaths.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Deshacer el parche anterior
    content = content.replace(/-- Buscar equipo --\`\}\),\$n\.equipos\.filter\([^)]*\)\.map/g, '-- Buscar equipo --`}),$n.equipos.map');
    
    // Parche real: Si la URL dice "imose30lima", el dropdown por defecto se tiene que bloquear a Equipo 30, o solo mostrar las opciones del linaje.
    // En este caso, la usuaria espera que en "imose30lima" solo se vean 27, 28, 29, o tal vez espera que la IA sea completamente dinámica leyendo de Firestore y no de mockData
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Deshecho parche anterior en:', filePath);
  }
});
