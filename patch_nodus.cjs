const fs = require('fs');
let code = fs.readFileSync('scripts/nodusMultiAgentSync.mjs', 'utf8');

const mapLogic = `
    // NUEVO (29/09/2026): Inferir sede de cada equipo para verificar coherencia de asignaciones
    const equipoSedeMap = {};
    if (rawEquiposReporte && Array.isArray(rawEquiposReporte)) {
      rawEquiposReporte.forEach(eq => {
        const sedesTally = {};
        if (eq.participantes && Array.isArray(eq.participantes)) {
          eq.participantes.forEach(p => {
            const coordStr = (p.coordinador || '').toLowerCase();
            let pSede = null;
            if (coordStr.includes('lima')) pSede = 'Lima';
            else if (coordStr.includes('quito')) pSede = 'Quito';
            else if (coordStr.includes('guayaquil') || coordStr.includes('gye')) pSede = 'Guayaquil';
            else if (coordStr.includes('cuenca')) pSede = 'Cuenca';
            else if (coordStr.includes('medellin') || coordStr.includes('medellín')) pSede = 'Medellín';
            else if (coordStr.includes('mexico') || coordStr.includes('méxico')) pSede = 'México';
            else if (coordStr.includes('bogota') || coordStr.includes('bogotá')) pSede = 'Bogotá';
            if (pSede) sedesTally[pSede] = (sedesTally[pSede] || 0) + 1;
          });
        }
        let dominantSede = null;
        let maxCount = 0;
        for (const [s, count] of Object.entries(sedesTally)) {
          if (count > maxCount) {
            maxCount = count;
            dominantSede = s;
          }
        }
        if (!dominantSede) {
          const eqStr = (eq.equipoNombre || '').toUpperCase();
          const matchNum = eqStr.match(/(\\d+)/);
          if (matchNum) {
            const num = parseInt(matchNum[1], 10);
            if (num >= 110 && num <= 140) dominantSede = 'Quito/Guayaquil';
            else if (num >= 10 && num <= 50) dominantSede = 'Lima';
          }
        }
        if (dominantSede) {
          equipoSedeMap[eq.equipoNombre.trim().toLowerCase()] = dominantSede;
        }
      });
    }`;

code = code.replace(
  'Procesando y correlacionando información...");', 
  'Procesando y correlacionando información...");' + mapLogic
);

const itemEquiposLogic = `        equipos: (item.equipos || []).map(eq => {
          const eqKey = (eq.equipo || '').trim().toLowerCase();
          const sedeInferida = equipoSedeMap[eqKey];
          let incoherencia = false;
          if (sedeInferida && sede !== 'Sin Sede') {
            if (sedeInferida === 'Quito/Guayaquil' && !['Quito', 'Guayaquil'].includes(sede)) {
              incoherencia = true;
            } else if (sedeInferida !== 'Quito/Guayaquil' && sedeInferida !== sede) {
              incoherencia = true;
            }
          }
          if (incoherencia) console.warn(\`🚨 [INCOHERENCIA] \${nombre} (\${sede}) tiene asignado \${eq.equipo} (\${sedeInferida}).\`);
          return { ...eq, sedeInferida: sedeInferida || 'Desconocida', incoherenciaSedes: incoherencia };
        })`;

code = code.replace('equipos: item.equipos || []', itemEquiposLogic);

fs.writeFileSync('scripts/nodusMultiAgentSync.mjs', code);
console.log('Patched');
