import { readFileSync } from 'fs';

const d = JSON.parse(readFileSync('./coordinadoras_por_c1.json', 'utf8'));

console.log('======================================================');
console.log('DESGLOSE OFICIAL DE COORDINADORAS POR CADA C1');
console.log('======================================================');

for (const [eqName, data] of Object.entries(d)) {
  console.log(`\n📌 ${eqName} (${data.label}) - Total Base: ${data.totalParticipantes}`);
  for (const [coord, m] of Object.entries(data.coordinadoras)) {
    if (m.asignados >= 3 || m.asistieron_sentados >= 3) {
      const pctConf = m.asignados > 0 ? ((m.confirmados_1ra / m.asignados) * 100).toFixed(1) : 0;
      const pctSent = m.confirmados_1ra > 0 ? ((m.asistieron_sentados / m.confirmados_1ra) * 100).toFixed(1) : 0;
      console.log(`  👩‍💼 ${coord}:`);
      console.log(`     • Asignados: ${m.asignados} | Confirmaron 1ra: ${m.confirmados_1ra} (${pctConf}%) | No Contesta: ${m.no_contesta_1ra} | Siguiente: ${m.siguiente_1ra}`);
      console.log(`     • Se Sentaron en Sala: ${m.asistieron_sentados} (Conversión Conf ➔ Sentado: ${pctSent}%)`);
      console.log(`     • Desertores: ${m.desertores} | Pagaron C2/MJ: ${m.pagaron_c2 + m.pagaron_c2_mj} | Abonos: ${m.con_abono}`);
    }
  }
}
