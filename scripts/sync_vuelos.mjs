/**
 * CREAR PODER SIN LIMITES - Sincronizador de Vuelos de Entrenadores
 * Permite monitorear y actualizar el estado de los vuelos en tiempo real.
 * 
 * Uso:
 *   node scripts/sync_vuelos.mjs
 *   node scripts/sync_vuelos.mjs --flight LA1437 --status DELAYED --delay 25
 *   node scripts/sync_vuelos.mjs --flight LA1437 --status LANDED
 *   node scripts/sync_vuelos.mjs --flight LA1437 --status ON_TIME
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRACKER_FILES = [
  path.resolve(__dirname, '../public/vuelos_tracker.json'),
  path.resolve(__dirname, '../public/cartas/vuelos_tracker.json'),
  path.resolve(__dirname, '../../cartas-crear-temp/vuelos_tracker.json'),
  path.resolve(__dirname, '../../cartas-crear-temp/docs/vuelos_tracker.json'),
  path.resolve(__dirname, '../../cpsl-web-ecosystem/vuelos_tracker.json')
];

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    flight: 'LA1437',
    status: null,
    delay: null,
    checkAirborne: false
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--flight' && args[i + 1]) options.flight = args[++i];
    if (args[i] === '--status' && args[i + 1]) options.status = args[++i].toUpperCase();
    if (args[i] === '--delay' && args[i + 1]) options.delay = parseInt(args[++i], 10);
    if (args[i] === '--check-airborne') options.checkAirborne = true;
  }
  return options;
}

async function main() {
  const opts = parseArgs();
  console.log('🛫 Iniciando Sincronizador de Vuelos CREAR PODER SIN LÍMITES...');

  // Read base tracker
  const primaryPath = TRACKER_FILES[0];
  if (!fs.existsSync(primaryPath)) {
    console.error('❌ Archivo base no encontrado:', primaryPath);
    process.exit(1);
  }

  const tracker = JSON.parse(fs.readFileSync(primaryPath, 'utf8'));
  const flight = tracker.flights[opts.flight];

  if (!flight) {
    console.error(`❌ Vuelo ${opts.flight} no registrado en tracker.`);
    process.exit(1);
  }

  console.log(`📌 Vuelo objetivo: ${flight.flightNumber} (${flight.route.origin} → ${flight.route.destination})`);
  console.log(`   Pasajeros: ${flight.passengers.join(', ')}`);
  console.log(`   Estado actual: ${flight.status} (${flight.statusLabel})`);

  let modified = false;

  // Manual status change or delay calculation
  if (opts.status) {
    flight.status = opts.status;
    modified = true;

    if (opts.status === 'DELAYED') {
      const delayMins = opts.delay || 30;
      flight.delayMinutes = delayMins;
      flight.statusLabel = `Demorado (+${delayMins} min)`;
      flight.statusDescription = `Vuelo demorado por aerolínea (+${delayMins} min). Horario de recojo recalculado.`;

      // Recalculate arrival
      const schedArr = new Date(flight.schedule.scheduledArrival);
      const newArr = new Date(schedArr.getTime() + delayMins * 60000);
      flight.schedule.estimatedArrival = newArr.toISOString();

      // Recalculate driver pickup
      const pickupDate = new Date(newArr.getTime() + 25 * 60000);
      let hours = pickupDate.getHours();
      const minutes = pickupDate.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      flight.logistics.driverPickupEstimated = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;

    } else if (opts.status === 'LANDED') {
      flight.delayMinutes = 0;
      flight.statusLabel = 'Aterrizado en Lima';
      flight.statusDescription = 'Vuelo ha tocado tierra en Lima Jorge Chávez. Pasajeros desembarcando.';
      flight.schedule.actualArrival = new Date().toISOString();
      flight.logistics.driverPickupEstimated = 'AHORA (En puerta)';

    } else if (opts.status === 'AIRBORNE') {
      flight.statusLabel = 'En vuelo · En ruta';
      flight.statusDescription = 'Aeronave en el aire hacia Lima.';
      if (!flight.schedule.actualDeparture) {
        flight.schedule.actualDeparture = new Date().toISOString();
      }

    } else if (opts.status === 'ON_TIME') {
      flight.delayMinutes = 0;
      flight.statusLabel = 'A tiempo';
      flight.statusDescription = 'Vuelo confirmado y a tiempo para despegue directo UIO → LIM';
      flight.schedule.estimatedDeparture = flight.schedule.scheduledDeparture;
      flight.schedule.estimatedArrival = flight.schedule.scheduledArrival;
      flight.logistics.driverPickupEstimated = '10:35 AM';
    }
  }

  // Update timestamp
  tracker.updatedAt = new Date().toISOString();

  // Save back to all tracker locations
  const jsonStr = JSON.stringify(tracker, null, 2);
  let savedCount = 0;
  for (const filePath of TRACKER_FILES) {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, jsonStr, 'utf8');
      savedCount++;
    } catch (e) {
      console.warn(`⚠️ Error guardando en ${filePath}:`, e.message);
    }
  }

  console.log(`✅ Sincronización exitosa en ${savedCount} ubicaciones.`);
  console.log(`   Nuevo Estado: ${flight.status} (${flight.statusLabel})`);
  console.log(`   Salida Est.: ${flight.schedule.estimatedDeparture}`);
  console.log(`   Llegada Est.: ${flight.schedule.estimatedArrival}`);
  console.log(`   Recojo Conductor: ${flight.logistics.driverPickupEstimated}`);
}

main().catch(err => {
  console.error('❌ Error en script de sincronización:', err);
  process.exit(1);
});
