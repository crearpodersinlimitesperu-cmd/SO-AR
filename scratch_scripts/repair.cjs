const fs = require('fs');

// Repair Home.jsx
const homePath = 'src/pages/Home.jsx';
let homeCode = fs.readFileSync(homePath, 'utf8');

// The `)}` before `<button ... >🎯 Mis Metas` needs to be replaced.
homeCode = homeCode.replace("}\n            {canAccessAgendaTimeBoxing", "            {canAccessAgendaTimeBoxing");
homeCode = homeCode.replace(")}\n            {canAccessAgendaTimeBoxing", "          )}\n            {canAccessAgendaTimeBoxing");
homeCode = homeCode.replace(")\n}\n            {canAccessAgendaTimeBoxing", "          )}\n            {canAccessAgendaTimeBoxing");
homeCode = homeCode.replace("          )}\n          )}\n            {canAccessAgendaTimeBoxing", "          )}\n            {canAccessAgendaTimeBoxing");
fs.writeFileSync(homePath, homeCode);

// Repair EmbudoConversionBoard.jsx
const embudoPath = 'src/pages/EmbudoConversionBoard.jsx';
let embudoCode = fs.readFileSync(embudoPath, 'utf8');
embudoCode = embudoCode.replace("              </tbody>", "              </tbody>");
embudoCode = embudoCode.replace("})) : <tr><td colSpan=\"13\" style={{ textAlign: 'center', padding: '1rem' }}>No hay datos de Nodus</td></tr>}\n              </tbody>", "}))\n: <tr><td colSpan=\"13\" style={{ textAlign: 'center', padding: '1rem' }}>No hay datos de Nodus</td></tr>}\n              </tbody>");

// Actually, let's just find the `))}  </tbody>` directly and replace it.
const embudoLines = embudoCode.split('\n');
for (let i = 0; i < embudoLines.length; i++) {
  if (embudoLines[i].includes('))}')) {
    if (embudoLines[i + 1] && embudoLines[i + 1].includes('</tbody>')) {
      embudoLines[i] = embudoLines[i].replace('))}', '})) : <tr><td colSpan="13">No data</td></tr>}');
    }
  }
}
fs.writeFileSync(embudoPath, embudoLines.join('\n'));

