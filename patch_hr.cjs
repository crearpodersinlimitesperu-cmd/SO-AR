const fs = require('fs');

let content = fs.readFileSync('scripts/nodusHrSentinelAgent.mjs', 'utf8');

// 1. Add pxSinGestionar to itemEvaluado
if (!content.includes('pxSinGestionar: pxNamesStr')) {
  content = content.replace(
    'motivo,\n        coachingFeedback\n      };',
    'motivo,\n        coachingFeedback,\n        pxSinGestionar: pxNamesStr\n      };'
  );
}

// 2. Update the rowsHtml to include the px column
const oldRow = `                <tr>
                  <td>\${c.nombre}</td>
                  <td>\${c.ultGestion || 'Desconocida'}</td>
                  <td>\${c.asignados}</td>
                  <td><span class="badge-critical">\${c.nivelRiesgo}</span></td>
                </tr>`;

const newRow = `                <tr>
                  <td>\${c.nombre}</td>
                  <td>\${c.ultGestion || 'Desconocida'}</td>
                  <td>\${c.asignados}</td>
                  <td><span style="font-size: 12px; color: #52525b; display: block; max-width: 150px; word-wrap: break-word;">\${c.pxSinGestionar || 'Ninguno'}</span></td>
                  <td><span class="badge-critical">\${c.nivelRiesgo}</span></td>
                </tr>`;

content = content.replace(oldRow, newRow);

fs.writeFileSync('scripts/nodusHrSentinelAgent.mjs', content);
console.log("Patched hr agent.");
