import fs from 'fs';
const snap = JSON.parse(fs.readFileSync('nodus_latest_snapshot.json', 'utf8'));

console.log('=== AUDITORÍA COMPLETA DE C1 Y C2 PARA TODOS LOS COORDINADORES ===\n');

const totals = {
  sentadosC1: 0,
  sentadosC2: 0,
  sentadosTotal: 0,
  gestionesC1: 0,
  gestionesC2: 0,
  gestionesTotal: 0,
  confirmadosC1: 0,
  confirmadosC2: 0,
  confirmadosTotal: 0
};

const processed = snap.coordinadores.map(c => {
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

  // Si c.c2 > 0 en el card original y los equipos no tenían C2 específico (o al revés):
  // Comprobamos si las llamadas de equipos coinciden con c.gestiones
  const sumEqLlamadas = llamadasC1 + llamadasC2;
  let finalGestionesC1 = llamadasC1;
  let finalGestionesC2 = llamadasC2;

  // Si no tenía equipos o sumEqLlamadas < gestiones, ajustar con card c1/c2
  if (sumEqLlamadas === 0 && (c.gestiones || 0) > 0) {
    finalGestionesC1 = c.c1 || 0;
    finalGestionesC2 = c.c2 || 0;
  } else if (sumEqLlamadas < (c.gestiones || 0)) {
    // Si la suma en equipos difiere levemente de gestiones, mantener coherencia proporcional
    if (c.c2 > 0 && finalGestionesC2 === 0) {
      finalGestionesC2 = c.c2;
      finalGestionesC1 = Math.max(0, c.gestiones - c.c2);
    }
  }

  const finalSentadosTotal = c.asistieron || (sentadosC1 + sentadosC2);
  const finalConfTotal = c.estados?.confirmado || (confC1 + confC2);

  totals.sentadosC1 += sentadosC1;
  totals.sentadosC2 += sentadosC2;
  totals.sentadosTotal += finalSentadosTotal;
  totals.gestionesC1 += finalGestionesC1;
  totals.gestionesC2 += finalGestionesC2;
  totals.gestionesTotal += (c.gestiones || 0);
  totals.confirmadosC1 += confC1;
  totals.confirmadosC2 += confC2;
  totals.confirmadosTotal += finalConfTotal;

  return {
    nombre: c.nombre,
    sede: c.sede,
    sentadosC1,
    sentadosC2,
    totalSentados: finalSentadosTotal,
    gestionesC1: finalGestionesC1,
    gestionesC2: finalGestionesC2,
    totalGestiones: c.gestiones,
    confirmadosC1: confC1,
    confirmadosC2: confC2,
    totalConfirmados: finalConfTotal
  };
});

processed.sort((a,b) => b.totalSentados - a.totalSentados);

console.table(processed.map(p => ({
  Coordinador: p.nombre,
  Sede: p.sede,
  'Sentados C1': p.sentadosC1,
  'Sentados C2': p.sentadosC2,
  'Total Sentados': p.totalSentados,
  'Gest C1': p.gestionesC1,
  'Gest C2': p.gestionesC2,
  'Total Gest': p.totalGestiones
})));

console.log('\n--- TOTALES GLOBALES ---');
console.log(totals);
