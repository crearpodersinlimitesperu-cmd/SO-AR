const fs = require('fs');
const path = 'src/services/cmjDataService.js';
let code = fs.readFileSync(path, 'utf8');

const regex = /\/\/ --- FIN INTEGRADOR ---/m;

const replacement = `
         // Calcular Enrolamiento sumando el array
         let enrolTotal = 0;
         [md.PFD?.participantes, md.SFD?.participantes, md.TFD?.participantes].forEach(pxArr => {
           if (pxArr) pxArr.forEach(px => enrolTotal += (px.enrolados || 0));
         });
         // Solo lo sumamos de la etapa actual o del acumulado, pero spider guarda el acumulado en la etapa que extrajo
         
         // Para no duplicar si está en múltiples etapas, tomamos el array de la etapa actual:
         let pxList = [];
         if (currentStage === 3) pxList = md.TFD?.participantes || [];
         else if (currentStage === 2) pxList = md.SFD?.participantes || [];
         else if (currentStage === 1) pxList = md.PFD?.participantes || [];
         
         const realEnrol = pxList.reduce((acc, curr) => acc + (curr.enrolados || 0), 0);
         eq.creacion.enrolTotal = realEnrol;
         eq.creacion.enrolPx = realEnrol; // asumiendo que todos son px
         eq.creacion.enrolMg = 0;
      }
    }
    // --- FIN INTEGRADOR ---`;

code = code.replace(regex, replacement);
fs.writeFileSync(path, code);
