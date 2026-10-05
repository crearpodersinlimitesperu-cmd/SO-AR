import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('./nodus_dump.json', 'utf8'));

console.log('================================================================');
console.log('AUDITORÍA PROFUNDA Y DETALLADA DE DATOS EXTRAÍDOS DE NODUS');
console.log('================================================================');

console.log('\n--- 1. TABLAS DE REPORTE DE ENTRENADORES ---');
if (data.secciones.reporteEntrenadores?.tablas) {
  data.secciones.reporteEntrenadores.tablas.forEach((tabla, idx) => {
    console.log(`\n>>> TABLA ${idx + 1} - Headers: ${tabla.headers?.join(' | ')} (Filas: ${tabla.rows?.length})`);
    if (tabla.rows && tabla.rows.length <= 6) {
      console.log(JSON.stringify(tabla.rows, null, 2));
    } else if (tabla.rows) {
      console.log('Muestra primeras 3 filas:');
      console.log(JSON.stringify(tabla.rows.slice(0, 3), null, 2));
    }
  });
}

console.log('\n--- 2. TODAS LAS TARJETAS DE ACTIVIDAD DE COORDINADORES ---');
if (data.secciones.actividadCoordinadores?.kpis) {
  data.secciones.actividadCoordinadores.kpis.forEach((kpi, idx) => {
    if (kpi.content.length > 2) {
      console.log(`[Tarjeta ${idx + 1}]`, kpi.content.join(' | '));
    }
  });
}

console.log('\n--- 3. COMPARATIVA DE REPORTES DE ASISTENCIA POR EQUIPO ---');
if (data.secciones.reporteAsistenciaPorEquipo) {
  for (const [equipo, eqData] of Object.entries(data.secciones.reporteAsistenciaPorEquipo)) {
    console.log(`\n>>> ${equipo}:`);
    if (eqData?.kpis) {
      const summary = eqData.kpis.slice(0, 15).map(k => k.content.join(' | '));
      console.log(summary.join('\n'));
    }
  }
}
