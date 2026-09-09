const fs = require('fs');

const path = 'src/pages/PortfolioBoard.jsx';
let code = fs.readFileSync(path, 'utf8');

// Replace the fake cycles logic with a single real consolidated cycle
const targetRegex = /let ciclosReales = \[\];[\s\S]*?if \(ciclosReales\.length === 0\) \{/g;
const newCode = `let ciclosReales = [
              { 
                id: 1, 
                name: \`\${selectedSede} - Consolidado Nodus (Datos Reales)\`, 
                progress: progress || 0, 
                health: health, 
                date: new Date().toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' }), 
                action: health === 'critical' ? 'Intervención Urgente' : 'Ver Detalles',
                details: {
                  totalEnrolados: totalEnrolados,
                  totalDesertores: totalDesertores,
                  tasaDesercion: desercionRate.toFixed(1),
                  totalParticipantes: totalParticipantes
                }
              }
          ];

          if (false) {`;

code = code.replace(targetRegex, newCode);
fs.writeFileSync(path, code);
