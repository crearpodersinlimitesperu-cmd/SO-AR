const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'scripts', 'nodusHrSentinelAgent.mjs');
let content = fs.readFileSync(filePath, 'utf8');

// Añadir lógica para extraer pxAsignados
const searchString = `const itemEvaluado = {`;
const injectPx = `
      const pxList = [];
      if (equiposReporte && equiposReporte.length > 0) {
        for (const equipo of equiposReporte) {
          if (!equipo.participantes) continue;
          for (const p of equipo.participantes) {
            // El nombre del coordinador en equiposReporte puede estar en otro formato, usamos match parcial
            if (p.coordinador && c.nombre && p.coordinador.toLowerCase().includes(c.nombre.toLowerCase().split(' ')[0])) {
               // Consideramos "sin gestionar" a todos si el nivel es CRITICO, o solo los que tienen llamada1 vacío (si existe la lógica)
               // Como Nodus no da el status individual fácilmente, enviamos la lista de asignados para este coord en riesgo.
               if (!p.llamada1 || p.llamada1.trim() === '' || nivelRiesgo === 'CRITICO') {
                 pxList.push(\`\${p.nombres || ''} \${p.apellidos || ''}\`.trim());
               }
            }
          }
        }
      }
      
      const pxUnicos = Array.from(new Set(pxList)).slice(0, 15); // limit to 15 names
      const pxNamesStr = pxUnicos.length > 0 ? pxUnicos.join(', ') + (pxList.length > 15 ? '...' : '') : 'No listados';
`;
content = content.replace(searchString, injectPx + "\n      " + searchString);

// Y agregar pxNamesStr al itemEvaluado
content = content.replace("coachingFeedback\n      };", "coachingFeedback,\n        pxNombresRiesgo: pxNamesStr\n      };");

// Modificar el HTML inyectado en el correo para mostrar los Px
content = content.replace(/<td><span class="badge-critical">\\\$\\{c.nivelRiesgo\\}<\/span><\/td>/g, `<td><span class="badge-critical">\${c.nivelRiesgo}</span><br><small style="color:#64748b; font-size:11px; display:block; margin-top:6px;">Px Sin Gestionar: \${c.pxNombresRiesgo}</small></td>`);

fs.writeFileSync(filePath, content);
console.log("Patch 2 aplicado");
