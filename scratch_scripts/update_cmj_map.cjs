const fs = require('fs');
const path = 'src/services/cmjDataService.js';
let code = fs.readFileSync(path, 'utf8');

const regex = /\/\/ Intentar adivinar por iteración si no está mapeado duro \(ej\. por nombre de coach o número\)[\s\S]*?if \(!maestriaEqId\) \{[\s\S]*?\}/m;

const replacement = `// Intentar adivinar por iteración cruzando Sede y Equipo
      if (!maestriaEqId) {
        Object.keys(maestriaData).forEach(key => {
          const md = maestriaData[key];
          if (md && md.nombreNodus) {
             const nodusUpper = md.nombreNodus.toUpperCase();
             const expectedLabel = eq.equipoLabel.toUpperCase();
             const expectedSede = eq.sede.split(' ')[0].toUpperCase();
             if (nodusUpper.includes(expectedLabel) && nodusUpper.includes(expectedSede)) {
                 maestriaEqId = key;
             }
          }
        });
      }`;

code = code.replace(regex, replacement);
fs.writeFileSync(path, code);
