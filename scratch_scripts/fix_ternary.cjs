const fs = require('fs');
const embudoPath = 'src/pages/EmbudoConversionBoard.jsx';
let embudoCode = fs.readFileSync(embudoPath, 'utf8');
embudoCode = embudoCode.replace(/\}\)\)\}\n\s*<\/tbody>/, '})) : <tr><td colSpan="13">No data</td></tr>}\n              </tbody>');
fs.writeFileSync(embudoPath, embudoCode);
