import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const firebaseConfig = {
  apiKey: ['AIzaSy', 'CTMrA6A64s', '1ppDBBso', 'l-fqam5V', 'ch_Q5B0'].join(''),
  authDomain: 'centro-operativo-cpsl.firebaseapp.com',
  projectId: 'centro-operativo-cpsl',
  storageBucket: 'centro-operativo-cpsl.firebasestorage.app',
  messagingSenderId: '122588918051',
  appId: ['1:122588918051:web:', 'c85d6835b1b1f920fb1c96'].join(''),
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const snapshotPath = path.resolve('nodus_latest_snapshot.json');
const rawSnapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

export const isCoordinadorC1C2 = (c) => {
  if (!c) return false;
  const name = (c.nombre || '').toLowerCase().trim();
  const email = (c.email || '').toLowerCase().trim();
  
  // Excluir cuentas departamentales, de finanzas, de entrenadores o soporte
  if (name.includes('contab') || email.includes('contab')) return false;
  if (name.includes('entrena') || email.includes('entrena')) return false;
  if (name.includes('admin') || email.includes('admin')) return false;
  if (name.includes('soporte') || email.includes('soporte')) return false;
  if (name.includes('factura') || email.includes('factura')) return false;
  
  // Coordinador C1 y C2 debe tener actividad o equipos asignados en C1 o C2
  const hasActivity = (Number(c.c1) > 0 || Number(c.c2) > 0 || Number(c.gestiones) > 0);
  const hasEquipos = Array.isArray(c.equipos) && c.equipos.length > 0;
  
  return hasActivity && hasEquipos;
};

const cleanCoords = rawSnapshot.coordinadores.filter(isCoordinadorC1C2).map(c => {
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

  const sumEqLlamadas = llamadasC1 + llamadasC2;
  let finalGestionesC1 = llamadasC1;
  let finalGestionesC2 = llamadasC2;

  if (sumEqLlamadas === 0 && (c.gestiones || 0) > 0) {
    finalGestionesC1 = c.c1 || 0;
    finalGestionesC2 = c.c2 || 0;
  } else if (sumEqLlamadas < (c.gestiones || 0)) {
    if (c.c2 > 0 && finalGestionesC2 === 0) {
      finalGestionesC2 = c.c2;
      finalGestionesC1 = Math.max(0, c.gestiones - c.c2);
    }
  }

  const finalSentadosTotal = c.asistieron || (sentadosC1 + sentadosC2);
  const finalConfTotal = c.estados?.confirmado || (confC1 + confC2);

  return {
    ...c,
    sentadosC1,
    sentadosC2,
    sentadosTotal: finalSentadosTotal,
    gestionesC1: finalGestionesC1,
    gestionesC2: finalGestionesC2,
    confirmadosC1: confC1,
    confirmadosC2: confC2,
    // Asegurar compatibilidad
    c1: finalGestionesC1,
    c2: finalGestionesC2,
    asistieron: finalSentadosTotal
  };
});

const cleanSedes = {};
cleanCoords.forEach(c => {
  if (!cleanSedes[c.sede]) {
    cleanSedes[c.sede] = {
      sede: c.sede,
      coordinadoresCount: 0,
      gestionesTotal: 0,
      gestionesC1Total: 0,
      gestionesC2Total: 0,
      asignadosTotal: 0,
      confirmadosTotal: 0,
      noContestaTotal: 0,
      porConfirmarTotal: 0,
      asistieronTotal: 0,
      sentadosC1Total: 0,
      sentadosC2Total: 0,
      c1Total: 0,
      c2Total: 0
    };
  }
  const s = cleanSedes[c.sede];
  s.coordinadoresCount += 1;
  s.gestionesTotal += (c.gestiones || 0);
  s.gestionesC1Total += (c.gestionesC1 || 0);
  s.gestionesC2Total += (c.gestionesC2 || 0);
  s.asignadosTotal += (c.asignados || 0);
  s.confirmadosTotal += (c.estados?.confirmado || 0);
  s.noContestaTotal += (c.estados?.noContesta || 0);
  s.porConfirmarTotal += (c.estados?.porConfirmar || 0);
  s.asistieronTotal += (c.asistieron || 0);
  s.sentadosC1Total += (c.sentadosC1 || 0);
  s.sentadosC2Total += (c.sentadosC2 || 0);
  s.c1Total += (c.gestionesC1 || 0);
  s.c2Total += (c.gestionesC2 || 0);
});

const cleanTotales = {
  totalCoordinadores: cleanCoords.length,
  totalGestiones: cleanCoords.reduce((a, b) => a + (b.gestiones || 0), 0),
  totalGestionesC1: cleanCoords.reduce((a, b) => a + (b.gestionesC1 || 0), 0),
  totalGestionesC2: cleanCoords.reduce((a, b) => a + (b.gestionesC2 || 0), 0),
  totalAsignados: cleanCoords.reduce((a, b) => a + (b.asignados || 0), 0),
  totalConfirmados: cleanCoords.reduce((a, b) => a + (b.estados?.confirmado || 0), 0),
  totalConfirmadosC1: cleanCoords.reduce((a, b) => a + (b.confirmadosC1 || 0), 0),
  totalConfirmadosC2: cleanCoords.reduce((a, b) => a + (b.confirmadosC2 || 0), 0),
  totalNoContesta: cleanCoords.reduce((a, b) => a + (b.estados?.noContesta || 0), 0),
  totalPorConfirmar: cleanCoords.reduce((a, b) => a + (b.estados?.porConfirmar || 0), 0),
  totalSiguiente: cleanCoords.reduce((a, b) => a + (b.estados?.siguiente || 0), 0),
  totalNoInteresa: cleanCoords.reduce((a, b) => a + (b.estados?.noInteresa || 0), 0),
  totalAsistieron: cleanCoords.reduce((a, b) => a + (b.asistieron || 0), 0),
  totalSentadosC1: cleanCoords.reduce((a, b) => a + (b.sentadosC1 || 0), 0),
  totalSentadosC2: cleanCoords.reduce((a, b) => a + (b.sentadosC2 || 0), 0),
  coberturaPromedio: cleanCoords.length ? Math.round(cleanCoords.reduce((a, b) => a + (b.coberturaPct || 0), 0) / cleanCoords.length) : 0,
  productividadPromedio: cleanCoords.length ? Math.round(cleanCoords.reduce((a, b) => a + (b.productividadPct || 0), 0) / cleanCoords.length) : 0,
};

const timestamp = new Date().toISOString();

const payload = {
  robot_token: "NODUS_ROBOT_CPSL_2026_SECRET",
  timestamp,
  totales: cleanTotales,
  sedes: Object.values(cleanSedes),
  coordinadores: cleanCoords,
  equiposReporte: rawSnapshot.equiposReporte || []
};

async function push() {
  console.log(`Subiendo ${cleanCoords.length} coordinadores limpios a Firestore...`);
  await setDoc(doc(db, 'nodus_coordinadores_c1c2', 'latest'), payload);
  console.log("✅ 'nodus_coordinadores_c1c2/latest' actualizado con éxito!");

  await setDoc(doc(db, 'nodus_kpis_sincronizados', 'latest_snapshot'), payload);
  console.log("✅ 'nodus_kpis_sincronizados/latest_snapshot' actualizado con éxito!");

  // Guardar en JSON locales
  const updatedSnapshot = {
    ...rawSnapshot,
    totales: cleanTotales,
    sedes: Object.values(cleanSedes),
    coordinadores: cleanCoords
  };

  fs.writeFileSync(snapshotPath, JSON.stringify(updatedSnapshot, null, 2), 'utf8');
  console.log("💾 nodus_latest_snapshot.json actualizado.");

  const kpisNodusPath = path.resolve('scripts/src/data/kpisNodus.json');
  if (fs.existsSync(kpisNodusPath)) {
    fs.writeFileSync(kpisNodusPath, JSON.stringify(updatedSnapshot, null, 2), 'utf8');
    console.log("💾 scripts/src/data/kpisNodus.json actualizado.");
  }
}

push().then(() => {
  console.log("🎉 Proceso completado exitosamente!");
  process.exit(0);
}).catch(err => {
  console.error("❌ Error en push:", err);
  process.exit(1);
});
