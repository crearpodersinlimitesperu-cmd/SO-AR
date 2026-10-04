import { useEffect, useState } from 'react';
import { db } from './firebase';
import { doc, collection, onSnapshot, getDoc } from 'firebase/firestore';
import { evaluateEnroladoVerification} from './nodusVerificationService';

// Agente Centinela que procesa y cachead datos operativos para Causa OS
// Mantiene todo pre-calculado en LocalStorage y Memoria para velocidad extrema.

let globalCache = {
  imoMissions: [],
  enroladosConStatus: [],
  nodusTotales: null,
  lastUpdate: null
};

// Listeners activos
let unsubscribeMissions = null;
let unsubscribeNodusC1C2 = null;
let isWatching = false;

export function startCausaNodusAgent() {
  if (isWatching) return;
  isWatching = true;
  console.log("🤖 [CausaNodusAgent] Despertando. Analizando y pre-calculando datos para Causa...");

  // Cargar de caché inicial
  try {
    const saved = localStorage.getItem('CAUSA_FAST_CACHE');
    if (saved) {
      globalCache = JSON.parse(saved);
      console.log("🤖 [CausaNodusAgent] Caché restaurado de LocalStorage.");
    }
  } catch(e) {}

  const recompute = (missions) => {
    let allEnrolados = [];
    missions.forEach(m => {
      const enrolados = getEnroladosList(m);
      enrolados.forEach(enr => {
        // Ejecutamos la validación cruzada pesada AQUI en background, no en UI
        const evalRes = evaluateEnroladoVerification(enr, m.imoNombre, m.equipo);
        allEnrolados.push({
          ...enr,
          imoRef: m.imoNombre,
          equipoRef: m.equipo,
          sedeRef: m.sede,
          statusIA: evalRes.status, 
          statusRazon: evalRes.razon
        });
      });
    });

    globalCache = {
      ...globalCache,
      imoMissions: missions,
      enroladosConStatus: allEnrolados,
      lastUpdate: Date.now()
    };

    localStorage.setItem('CAUSA_FAST_CACHE', JSON.stringify(globalCache));
    
    // Disparar evento global para que las UIs se actualicen instantáneamente
    window.dispatchEvent(new Event('CAUSA_AGENT_UPDATED'));
  };

  // Escuchar Misiones
  unsubscribeMissions = onSnapshot(collection(db, 'imo_missions'), (snap) => {
    const missions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    recompute(missions);
  });

  // Escuchar Nodus
  unsubscribeNodusC1C2 = onSnapshot(doc(db, 'nodus_coordinadores_c1c2', 'latest'), (docSnap) => {
    if (docSnap.exists()) {
      globalCache.nodusTotales = docSnap.data().totales || null;
      // Trigger a recompute to update discrepancy statuses based on new Nodus data
      if (globalCache.imoMissions.length > 0) {
        recompute(globalCache.imoMissions);
      }
    }
  });
}

export function stopCausaNodusAgent() {
  if (unsubscribeMissions) unsubscribeMissions();
  if (unsubscribeNodusC1C2) unsubscribeNodusC1C2();
  isWatching = false;
  console.log("🤖 [CausaNodusAgent] Agente en reposo.");
}

// Hook ultra-rápido para las interfaces (Causa Copilot, MonitorImos)
export function useCausaFastData() {
  const [data, setData] = useState(globalCache);

  useEffect(() => {
    const handler = () => setData({ ...globalCache });
    window.addEventListener('CAUSA_AGENT_UPDATED', handler);
    return () => window.removeEventListener('CAUSA_AGENT_UPDATED', handler);
  }, []);

  return data;
}
