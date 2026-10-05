const fs = require('fs');

const path = 'src/services/cmjDataService.js';
let code = fs.readFileSync(path, 'utf8');

const targetRegex = /export function mergeNodusDataIntoEquipos[\s\S]*?if \(currentStage >= 3\) \{[\s\S]*?g_pxFinal = totalActivos;\n      \}/m;

const replacement = `export function mergeNodusDataIntoEquipos(baseEquipos, nodusSnap, maestriaData) {
  if (!nodusSnap) return baseEquipos;

  // Extraer datos usando reporteAsistenciaPorEquipo (la misma fuente que usa el Embudo)
  let enrolamientoMap = {};
  
  if (nodusSnap.secciones?.reporteAsistenciaPorEquipo) {
    const reportes = nodusSnap.secciones.reporteAsistenciaPorEquipo;
    Object.keys(reportes).forEach(key => {
      const kpis = reportes[key].kpis || [];
      let baseC1 = 0;
      let sentados = 0;
      let desercion = 0;
      let etapa = 'PFD';

      kpis.forEach(k => {
        const text = k.content?.join(' ') || '';
        if (text.includes('Asistieron') && !isNaN(parseInt(k.content[0]))) sentados = parseInt(k.content[0]);
        if (text.includes('Desertores') && !isNaN(parseInt(k.content[0]))) desercion = parseInt(k.content[0]);
      });
      
      // Heurística simple para etapa
      if (key.includes('FDS 3') || key.includes('TFD')) etapa = 'TFD';
      else if (key.includes('FDS 2') || key.includes('SFD')) etapa = 'SFD';

      enrolamientoMap[key.toUpperCase()] = { sentados, desercion, etapa };
    });
  }

  const enriched = baseEquipos.map(eq => {
    let c_pxInicio = 0, c_pxFinal = 0;
    let r_pxInicio = 0, r_pxFinal = 0;
    let g_pxInicio = 0, g_pxFinal = 0;
    let desercionTotalPx = 0;
    
    // Intentar cruzar nombre de equipo y sede (ej. "EQUIPO 30" y "LIMA")
    let matchedEqName = Object.keys(enrolamientoMap).find(key => 
      key.includes(eq.equipoLabel.toUpperCase()) && key.includes(eq.sede.split(' ')[0].toUpperCase())
    );
    
    if (!matchedEqName) {
      matchedEqName = Object.keys(enrolamientoMap).find(key => key.includes(eq.equipoLabel.toUpperCase()));
    }

    if (matchedEqName && enrolamientoMap[matchedEqName]) {
      const stats = enrolamientoMap[matchedEqName];
      const currentStageStr = stats.etapa;
      let currentStage = 0;
      if (currentStageStr === 'TFD') currentStage = 3;
      else if (currentStageStr === 'SFD') currentStage = 2;
      else if (currentStageStr === 'PFD') currentStage = 1;

      // Inician = Sentados (los que llegaron)
      const totalInician = stats.sentados + stats.desercion; 
      const totalActivos = stats.sentados;
      desercionTotalPx = stats.desercion;

      if (currentStage >= 1) {
        c_pxInicio = totalInician;
        if (currentStage === 1) c_pxFinal = totalActivos;
        else c_pxFinal = totalInician; 
      }
      if (currentStage >= 2) {
        r_pxInicio = c_pxFinal;
        if (currentStage === 2) r_pxFinal = totalActivos;
        else r_pxFinal = c_pxFinal; 
      }
      if (currentStage >= 3) {
        g_pxInicio = r_pxFinal;
        g_pxFinal = totalActivos;
      }`;

code = code.replace(targetRegex, replacement);
fs.writeFileSync(path, code);
