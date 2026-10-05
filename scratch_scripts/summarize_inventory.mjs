import { readFileSync } from 'fs';

const inv = JSON.parse(readFileSync('./nodus_full_inventory.json', 'utf8'));

console.log('================================================================');
console.log('MAPA COMPLETO Y DETALLADO DE LOS 35 MÓDULOS DE NODUS GLOBAL');
console.log('================================================================');

for (const [key, m] of Object.entries(inv.modulos)) {
  console.log(`\n🔹 [${m.nombre}] (${m.url})`);
  console.log(`   - Tablas: ${m.tablasCount} | KPIs: ${m.kpisCount} | Filtros: ${Object.keys(m.filtros || {}).join(', ') || 'Ninguno'}`);
  if (m.tablas && m.tablas.length > 0) {
    m.tablas.slice(0, 3).forEach((t, ti) => {
      console.log(`     * Tabla ${ti + 1}: [${t.headers?.slice(0, 6).join(' | ')}] (${t.totalFilas} filas)`);
    });
  }
  if (m.kpis && m.kpis.length > 0) {
    const cleanKpis = m.kpis.slice(0, 2).map(k => k.replace(/\n+/g, ' '));
    console.log(`     * KPIs: ${cleanKpis.join(' || ')}`);
  }
}
