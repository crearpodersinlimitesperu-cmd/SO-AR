const fs = require('fs');
let str = fs.readFileSync('src/services/userService.js', 'utf8');

const fixFn = 
  const fixEncoding = (str) => {
    if (!str || typeof str !== 'string' || !str.includes('Ã')) return str;
    const map = {
      'Ã¡': 'á', 'Ã©': 'é', 'Ã\\xad': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã±': 'ñ', 'Ã¼': 'ü',
      'Ã ': 'Á', 'Ã‰': 'É', 'Ã\\x8d': 'Í', 'Ã“': 'Ó', 'Ãš': 'Ú', 'Ã‘': 'Ñ', 'Ãœ': 'Ü'
    };
    let fixed = str;
    for (let key in map) {
      fixed = fixed.split(key).join(map[key]);
    }
    return fixed;
  };
;

const target = 'const withCanonicalEmail = (raw) => {';
const replacement = fixFn + '\n  ' + target + '\n    if (raw.name) raw.name = fixEncoding(raw.name);\n    if (raw.nombre) raw.nombre = fixEncoding(raw.nombre);\n    if (raw.displayName) raw.displayName = fixEncoding(raw.displayName);\n';

str = str.replace(target, replacement);
fs.writeFileSync('src/services/userService.js', str, 'utf8');
