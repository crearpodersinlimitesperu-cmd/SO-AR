import fs from 'fs';
const snap = JSON.parse(fs.readFileSync('nodus_latest_snapshot.json', 'utf8'));

console.log('--- CÁLCULO DE SENTADOS C1 vs C2 POR COORDINADOR ---');

snap.coordinadores.filter(c => c.asistieron > 0).forEach(c => {
  let sentadosC1 = 0;
  let sentadosC2 = 0;
  let llamadasC1 = 0;
  let llamadasC2 = 0;
  let confC1 = 0;
  let confC2 = 0;

  (c.equipos || []).forEach(eq => {
    const num = parseInt(eq.equipo.replace(/[^0-9]/g, '')) || 0;
    const isC2 = num >= 100;
    if (isC2) {
      sentadosC2 += (eq.asistieron || 0);
      llamadasC2 += (eq.llamadas || 0);
      confC2 += (eq.confirmado || 0);
    } else {
      sentadosC1 += (eq.asistieron || 0);
      llamadasC1 += (eq.llamadas || 0);
      confC1 += (eq.confirmado || 0);
    }
  });

  console.log(`${c.nombre.padEnd(20)} (${c.sede.padEnd(10)}) -> Total Sentados: ${String(c.asistieron).padStart(4)} | Sentados C1: ${String(sentadosC1).padStart(4)} | Sentados C2: ${String(sentadosC2).padStart(3)} | Llamadas C1(eq): ${String(llamadasC1).padStart(4)} vs card.c1: ${String(c.c1).padStart(4)} | Llamadas C2(eq): ${String(llamadasC2).padStart(4)} vs card.c2: ${String(c.c2).padStart(4)}`);
});
