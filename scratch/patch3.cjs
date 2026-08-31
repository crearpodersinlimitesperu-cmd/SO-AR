const fs = require('fs');
let c = fs.readFileSync('src/services/userService.js', 'utf8');
const searchStr = 'const withCanonicalEmail = (raw) => {';
const fix = 'const fixEncoding = (s) => { if (!s || typeof s !== \"string\" || !s.includes(\"Ã\")) return s; const m = {\"Ã¡\":\"á\",\"Ã©\":\"é\",\"Ã\\\\xad\":\"í\",\"Ã³\":\"ó\",\"Ãº\":\"ú\",\"Ã±\":\"ñ\",\"Ã¼\":\"ü\",\"Ã \":\"Á\",\"Ã‰\":\"É\",\"Ã\\\\x8d\":\"Í\",\"Ã“\":\"Ó\",\"Ãš\":\"Ú\",\"Ã‘\":\"Ñ\",\"Ãœ\":\"Ü\"}; let r = s; for (let k in m) r = r.split(k).join(m[k]); return r; };\\n\\n  const withCanonicalEmail = (raw) => {\\n    if (raw.name) raw.name = fixEncoding(raw.name);\\n    if (raw.nombre) raw.nombre = fixEncoding(raw.nombre);\\n    if (raw.displayName) raw.displayName = fixEncoding(raw.displayName);';
c = c.replace(searchStr, fix);
fs.writeFileSync('src/services/userService.js', c, 'utf8');
