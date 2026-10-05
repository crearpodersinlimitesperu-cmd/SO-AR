const fs = require('fs');
const path = 'scripts/spiderMaestriaGlobal.mjs';
let code = fs.readFileSync(path, 'utf8');

const regex = /const equipos = new Set\(\);[\s\S]*?return Array\.from\(equipos\);/;

const replacement = `const equiposMap = {};
            links.forEach(a => {
                const parts = a.href.split('/');
                const idIndex = parts.indexOf('equipo') + 1;
                if (idIndex > 0 && idIndex < parts.length) {
                    const id = parts[idIndex];
                    if (!equiposMap[id]) {
                        equiposMap[id] = a.innerText.trim();
                    }
                }
            });
            return Object.keys(equiposMap).map(id => ({ id, nombreCorto: equiposMap[id] }));`;

code = code.replace(regex, replacement);

const loopRegex = /for \(const idEquipo of equiposActivos\) \{/g;
code = code.replace(loopRegex, `for (const equipoObj of equiposActivos) {\n            const idEquipo = equipoObj.id;\n            const nombreNodus = equipoObj.nombreCorto;`);

const resultsInitRegex = /resultadosMaestria\[idEquipo\] = \{\};/g;
code = code.replace(resultsInitRegex, `resultadosMaestria[idEquipo] = { nombreNodus };`);

fs.writeFileSync(path, code);
