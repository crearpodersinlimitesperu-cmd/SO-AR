const fs = require('fs');
const path = 'src/pages/EmbudoConversionBoard.jsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /\}\)\)\}\n              <\/tbody>/;
const replacement = `})) : <tr><td colSpan="13" style={{ textAlign: 'center', padding: '1rem' }}>No hay datos de Nodus</td></tr>}\n              </tbody>`;

code = code.replace(regex, replacement);
fs.writeFileSync(path, code);
