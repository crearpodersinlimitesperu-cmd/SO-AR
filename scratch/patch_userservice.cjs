const fs = require('fs');
let content = fs.readFileSync('src/services/userService.js', 'utf8');

const fixFunction = 
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

const replaceTarget =   const withCanonicalEmail = (raw) => {;
const replaceWith = fixFunction + "\n" +   const withCanonicalEmail = (raw) => {
    if (raw.name) raw.name = fixEncoding(raw.name);
    if (raw.nombre) raw.nombre = fixEncoding(raw.nombre);
    if (raw.displayName) raw.displayName = fixEncoding(raw.displayName);
;

content = content.replace(replaceTarget, replaceWith);
fs.writeFileSync('src/services/userService.js', content, 'utf8');
