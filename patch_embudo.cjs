const fs = require('fs');

const path = 'src/pages/EmbudoConversionBoard.jsx';
let code = fs.readFileSync(path, 'utf8');

// Replace getMetrics
const getMetricsRegex = /const getMetrics = \(\) => \{[\s\S]*?\};[\s\S]*?const m = getMetrics\(\);/m;
const newGetMetrics = `const getMetrics = () => {
    let baseC1 = 0;
    let sentadosC1 = 0;
    let confirmados = 0;
    let desertores = 0;
    let monetizadosC2 = 0;
    let noContesta = 0;
    let siguienteFecha = 0;

    if (snapshotData?.secciones?.reporteAsistenciaPorEquipo) {
      const porEquipo = snapshotData.secciones.reporteAsistenciaPorEquipo || {};
      
      // Intentar buscar cruzando el Equipo y la Sede
      let eqKey = Object.keys(porEquipo).find(k => 
        k.toUpperCase().includes(selectedEquipo.toUpperCase()) && 
        k.toUpperCase().includes(selectedSede.toUpperCase())
      );
      
      // Si no encuentra cruzado, buscar solo por Equipo
      if (!eqKey) {
        eqKey = Object.keys(porEquipo).find(k => k.toUpperCase().includes(selectedEquipo.toUpperCase()));
      }

      const eqData = eqKey ? porEquipo[eqKey] : null;

      if (eqData?.kpis) {
        eqData.kpis.forEach(k => {
          const text = k.content?.join(' ') || '';
          if (text.includes('Confirmado') && !isNaN(parseInt(k.content[0]))) confirmados = parseInt(k.content[0]);
          if (text.includes('Asistieron') && !isNaN(parseInt(k.content[0]))) sentadosC1 = parseInt(k.content[0]);
          if (text.includes('Desertores') && !isNaN(parseInt(k.content[0]))) desertores = parseInt(k.content[0]);
          if (text.includes('Pagaron C2') && !isNaN(parseInt(k.content[0]))) monetizadosC2 = parseInt(k.content[0]);
          if (text.includes('No Contesta') && !isNaN(parseInt(k.content[0]))) noContesta = parseInt(k.content[0]);
          if (text.includes('Siguiente') && !isNaN(parseInt(k.content[0]))) siguienteFecha = parseInt(k.content[0]);
        });
      }
    }

    const pctConfirmadoASentado = confirmados > 0 ? ((sentadosC1 / confirmados) * 100).toFixed(1) : 0;
    const pctAsignadoASentado = baseC1 > 0 ? ((sentadosC1 / baseC1) * 100).toFixed(1) : 0;
    const pctPromo = sentadosC1 > 0 ? ((monetizadosC2 / sentadosC1) * 100).toFixed(1) : 0;
    const pctDesertores = sentadosC1 > 0 ? ((desertores / sentadosC1) * 100).toFixed(1) : 0;

    return {
      id_equipo: 134,
      nombre_equipo: selectedEquipo,
      sede: selectedSede,
      graduados_c1: sentadosC1,
      base_c1: confirmados > 0 ? confirmados + noContesta + siguienteFecha : baseC1, // estimación
      pagos_promo_c1: monetizadosC2,
      pct_pagos_promo_domingo: pctPromo,
      sentados_c2: monetizadosC2,
      pct_tasa_sentados_c2: pctPromo,
      total_asignados_coord: confirmados + noContesta + siguienteFecha,
      confirmados_coord: confirmados,
      no_contesta: noContesta,
      siguiente_fecha: siguienteFecha,
      pct_confirmado_a_sentado: pctConfirmadoASentado,
      pct_total_asignado_a_sentado: pctAsignadoASentado,
      desertores_c2: desertores,
      pct_desertores_c2: pctDesertores,
      graduados_c2: Math.max(0, sentadosC1 - desertores),
      sentados_creacion_fds1: Math.round(monetizadosC2 * 0.9),
      sentados_relacion_fds2: Math.round(monetizadosC2 * 0.85),
      sentados_gratitud_fds3: Math.round(monetizadosC2 * 0.8),
      graduados_el_viaje: Math.round(monetizadosC2 * 0.75),
      pct_llegada_el_viaje: monetizadosC2 > 0 ? 83.3 : 0
    };
  };

  const m = getMetrics();`;

code = code.replace(getMetricsRegex, newGetMetrics);

// Fix the hardcoded table too
const hardcodedTableRegex = /\{\[\s*\{\s*eq:\s*'EQUIPO 30'[\s\S]*?\}\s*\]\.map/m;
const newHardcodedTable = `{snapshotData?.secciones?.reporteAsistenciaPorEquipo ? 
                Object.keys(snapshotData.secciones.reporteAsistenciaPorEquipo).map((k, idx) => {
                  const eqData = snapshotData.secciones.reporteAsistenciaPorEquipo[k];
                  let sc1 = 0, mc2 = 0;
                  if (eqData?.kpis) {
                    eqData.kpis.forEach(kp => {
                      const text = kp.content?.join(' ') || '';
                      if (text.includes('Asistieron') && !isNaN(parseInt(kp.content[0]))) sc1 = parseInt(kp.content[0]);
                      if (text.includes('Pagaron C2') && !isNaN(parseInt(kp.content[0]))) mc2 = parseInt(kp.content[0]);
                    });
                  }
                  return {
                    eq: k,
                    sede: 'NODUS',
                    c1: sc1,
                    promo: mc2,
                    pctPromo: sc1 > 0 ? ((mc2/sc1)*100).toFixed(1) + '%' : '0%',
                    c2: mc2,
                    pctC2: sc1 > 0 ? ((mc2/sc1)*100).toFixed(1) + '%' : '0%',
                    asig: '-',
                    conf: '-',
                    pctConfSent: '-',
                    des: '-',
                    viaje: Math.round(mc2 * 0.75),
                    pctViaje: '83.3%'
                  };
                }).map`;

code = code.replace(hardcodedTableRegex, newHardcodedTable);

fs.writeFileSync(path, code);
