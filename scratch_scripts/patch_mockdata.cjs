const fs = require('fs');

const filePaths = [
  '../crm/imose30lima/assets/index-BUEJnpaY.js',
  '../crm/imose31lima/assets/index-BUEJnpaY.js'
];

filePaths.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // We must find the drop-down logic
    content = content.replace(/-- Buscar equipo --\`\}\),\$n\.equipos\.map/g, '-- Buscar equipo --`}),$n.equipos.filter(eq => eq.includes("30") || eq.includes("29") || eq.includes("28") || eq.includes("31")).map');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Parcheado dropdown en:', filePath);
  }
});
