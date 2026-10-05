const fs = require('fs');
let code = fs.readFileSync('src/pages/ReportesBoard.jsx', 'utf8');

code = code.replace('<option value="FDS">2. Reporte FDS (Sede C1 tradicional)</option>', '{canViewLlamadasForm && <option value="FDS">2. Reporte FDS (Sede C1 tradicional)</option>}');
code = code.replace('<option value="C2">3. Reporte Capítulo Dos</option>', '{(canViewLlamadasForm || roles.includes("coord_c2")) && <option value="C2">3. Reporte Capítulo Dos</option>}');
code = code.replace('<option value="MJ">4. Reporte Maestría del Juego</option>', '{(isGerente || isDireccion || roles.includes("coord_maestria") || roles.includes("director_maestria") || role === "coord_maestria" || role === "director_maestria" || currentUser?.isSuperAdmin) && <option value="MJ">4. Reporte Maestría del Juego</option>}');
code = code.replace('<option value="QT_Contexto">5. Reporte de Contexto (QT)</option>', '{(isGerente || isDireccion || roles.includes("qt") || role === "qt" || currentUser?.isSuperAdmin) && <option value="QT_Contexto">5. Reporte de Contexto (QT)</option>}');

fs.writeFileSync('src/pages/ReportesBoard.jsx', code);
