const fs = require('fs');

const filePaths = [
  '../crm/imose30lima/assets/index-BUEJnpaY.js'
];

filePaths.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Para el Equipo 30, forzaremos que el dropdown solo muestre Equipo 30
    // En el script compilado dice: $n.equipos.map(e=>(0,w.jsx)("option",{value:e,children:e},e))
    // Vamos a reemplazar $n.equipos por ["EQUIPO 30"]
    content = content.replace(/\$n\.equipos\.map/g, '["EQUIPO 30"].map');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Parcheado dropdown a SOLO EQUIPO 30 en:', filePath);
  }
});
