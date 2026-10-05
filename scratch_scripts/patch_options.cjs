const fs = require('fs');
const path = 'src/pages/ReportesBoard.jsx';
let code = fs.readFileSync(path, 'utf8');

const oldOptions = `                <option value="FDS">2. Reporte FDS (Sede C1 tradicional)</option>
                <option value="C2">3. Reporte Capítulo Dos</option>
                <option value="MJ">4. Reporte Maestría del Juego</option>
                <option value="QT_Contexto">5. Reporte de Contexto (QT)</option>`;

const newOptions = `                {canViewLlamadasForm && <option value="FDS">2. Reporte FDS (Sede C1 tradicional)</option>}
                {(canViewLlamadasForm || roles.includes('coord_c2')) && <option value="C2">3. Reporte Capítulo Dos</option>}
                {(isGerente || isDireccion || roles.includes('coord_maestria') || roles.includes('director_maestria') || role === 'coord_maestria' || role === 'director_maestria' || currentUser?.isSuperAdmin) && <option value="MJ">4. Reporte Maestría del Juego</option>}
                {(isGerente || isDireccion || roles.includes('qt') || role === 'qt' || currentUser?.isSuperAdmin) && <option value="QT_Contexto">5. Reporte de Contexto (QT)</option>}`;

code = code.replace(oldOptions, newOptions);
fs.writeFileSync(path, code);
