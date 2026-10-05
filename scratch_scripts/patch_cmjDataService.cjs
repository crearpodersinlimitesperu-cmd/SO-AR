const fs = require('fs');
const path = 'src/services/cmjDataService.js';
let code = fs.readFileSync(path, 'utf8');

const regex = /if \(matchedEqName && enrolamientoMap\[matchedEqName\]\) \{([\s\S]*?)\} else \{([\s\S]*?)\}/m;

const replacement = `
    let currentStage = 0;
    if (matchedEqName && enrolamientoMap[matchedEqName]) {
      const stats = enrolamientoMap[matchedEqName];
      const currentStageStr = stats.etapa;
      if (currentStageStr === 'TFD') currentStage = 3;
      else if (currentStageStr === 'SFD') currentStage = 2;
      else if (currentStageStr === 'PFD') currentStage = 1;

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
      }
    } else {
      c_pxInicio = eq.creacion.pxInicio;
      c_pxFinal = eq.creacion.pxFinal;
      desercionTotalPx = eq.creacion.desercionPx;
      r_pxInicio = eq.relacion.pxInicio;
      r_pxFinal = eq.relacion.pxFinal;
      g_pxInicio = eq.gratitud.pxInicio;
      g_pxFinal = eq.gratitud.pxFinal;
    }
    
    eq = JSON.parse(JSON.stringify(eq)); // Clone

    // --- INTEGRADOR MAESTRIA DATA RECTIFICADOR (ABSOLUTO) ---
    if (maestriaData) {
      let maestriaEqId = null;
      if (eq.equipoLabel.includes('30') && eq.sede === 'LIMA') maestriaEqId = '134';
      if (eq.equipoLabel.includes('29') && eq.sede === 'LIMA') maestriaEqId = '127';
      if (eq.equipoLabel.includes('28') && eq.sede === 'LIMA') maestriaEqId = '111';

      // Intentar adivinar por iteración si no está mapeado duro (ej. por nombre de coach o número)
      if (!maestriaEqId) {
        // En un futuro el spider puede traer el nombre, por ahora nos limitamos a los duros
      }

      if (maestriaEqId && maestriaData[maestriaEqId]) {
         const md = maestriaData[maestriaEqId];
         
         const pfdPx = md.PFD?.participantes?.length || 0;
         const pfdDes = md.PFD?.desertores?.length || 0;
         const sfdPx = md.SFD?.participantes?.length || 0;
         const sfdDes = md.SFD?.desertores?.length || 0;
         const tfdPx = md.TFD?.participantes?.length || 0;
         const tfdDes = md.TFD?.desertores?.length || 0;

         // Para saber en qué etapa está realmente
         if (tfdPx > 0 || tfdDes > 0) currentStage = 3;
         else if (sfdPx > 0 || sfdDes > 0) currentStage = 2;
         else if (pfdPx > 0 || pfdDes > 0) currentStage = 1;

         c_pxInicio = pfdPx + pfdDes;
         c_pxFinal = pfdPx;
         desercionTotalPx = pfdDes + sfdDes + tfdDes;

         if (currentStage >= 2) {
           r_pxInicio = sfdPx + sfdDes;
           r_pxFinal = sfdPx;
         } else {
           r_pxInicio = 0; r_pxFinal = 0;
         }

         if (currentStage >= 3) {
           g_pxInicio = tfdPx + tfdDes;
           g_pxFinal = tfdPx;
         } else {
           g_pxInicio = 0; g_pxFinal = 0;
         }
      }
    }
    // --- FIN INTEGRADOR ---

    // Asignar al objeto clonado
    eq.creacion.pxInicio = c_pxInicio;
    eq.creacion.pxFinal = c_pxFinal;
    eq.creacion.desercionPx = currentStage === 1 ? desercionTotalPx : (currentStage > 1 ? c_pxInicio - c_pxFinal : 0);
    
    eq.relacion.pxInicio = r_pxInicio;
    eq.relacion.pxFinal = r_pxFinal;
    eq.relacion.desercionPx = currentStage === 2 ? desercionTotalPx : (currentStage > 2 ? r_pxInicio - r_pxFinal : 0);
    
    eq.gratitud.pxInicio = g_pxInicio;
    eq.gratitud.pxFinal = g_pxFinal;
    eq.gratitud.desercionPx = currentStage === 3 ? desercionTotalPx : 0;
`;

code = code.replace(regex, replacement);
fs.writeFileSync(path, code);
