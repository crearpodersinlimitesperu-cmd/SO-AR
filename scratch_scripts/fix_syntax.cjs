const fs = require('fs');
const path = 'src/services/cmjDataService.js';
let code = fs.readFileSync(path, 'utf8');

const target = `         }
      }
    }
    
         // Calcular Enrolamiento sumando el array`;

const replacement = `         }
         
         // Calcular Enrolamiento sumando el array`;

code = code.replace(target, replacement);

const target2 = `         eq.creacion.enrolPx = realEnrol; // asumiendo que todos son px
         eq.creacion.enrolMg = 0;
      }
    }
    // --- FIN INTEGRADOR ---`;

const replacement2 = `         eq.creacion.enrolPx = realEnrol; // asumiendo que todos son px
         eq.creacion.enrolMg = 0;
      }
    }
    // --- FIN INTEGRADOR ---`;

fs.writeFileSync(path, code);
