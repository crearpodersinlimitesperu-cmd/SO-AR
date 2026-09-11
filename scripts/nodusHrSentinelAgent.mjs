/**
 * =========================================================================
 * AGENTE 5: CENTINELA DE TALENTO HUMANO Y DESEMPEÑO (NodusHrSentinelAgent)
 * =========================================================================
 * 
 * Rol: Experto en Gestión de Talento Humano y Desempeño Operativo.
 * Función:
 * 1. Audita la actividad operativa, llamadas y cobertura de coordinadores en Nodus.
 * 2. Identifica anomalías de productividad (0 llamadas, cobertura crítica <35%, alta tasa no contesta).
 * 3. Despacha alertas dirigidas a los Gerentes de Sede respectivos en la colección /notifications de Causa OS.
 * 4. Acompaña cada alerta con recomendaciones de coaching y liderazgo constructivo de RRHH.
 * 5. Mantiene un cuadro de mando consolidado en /nodus_hr_sentinel/latest.
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || ['AIzaSy', 'CTMrA6A64s', '1ppDBBso', 'l-fqam5V', 'ch_Q5B0'].join(''),
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "centro-operativo-cpsl.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "centro-operativo-cpsl",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "centro-operativo-cpsl.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "122588918051",
  appId: process.env.VITE_FIREBASE_APP_ID || ['1:122588918051:web:', 'c85d6835b1b1f920fb1c96'].join(''),
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const ROBOT_TOKEN = "NODUS_ROBOT_CPSL_2026_SECRET";

// Mapeo oficial de Gerentes por Sede y Dirección Corporativa
export const GERENTES_POR_SEDE = {
  'Cuenca': ['emely.leon@crearpsl.net'], // July León
  'Guayaquil': ['josue.vera@crearpsl.net'], // Josué Vera
  'Lima': ['jose.sanchez@crearpsl.net'], // José Sánchez
  'Medellín': ['yurany.gonzalez@crearpsl.net'], // Yurany González
  'México': ['nora.zamora@crearpsl.net'], // Nora Zamora
  'Quito': ['emily.campuzano@crearpsl.net', 'freddy.sosa@crearpsl.net'] // Emily Campuzano / David Sosa
};

export const DIRECTORES_CORPORATIVOS = [
  'andres.gomez@crearpsl.net', // Director Maestría
  'paul.sosa@crearpsl.net',     // CCO
  'fer.aragon@crearpsl.net'      // CEO
];

export class NodusHrSentinelAgent {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
  }

  /**
   * Analiza la actividad de los coordinadores y diagnostica riesgos de RRHH
   * @param {Array} coordinadores Lista normalizada de coordinadores
   * @returns {Object} Informe diagnóstico de Talento Humano
   */
  diagnosticarDesempeno(coordinadores) {
    console.log(`\n👔 [Agente 5 - RRHH] Evaluando métricas operativas de ${coordinadores.length} coordinadores...`);

    const enAlertaCritica = [];
    const enAlertaMedia = [];
    const desempenoOptimo = [];
    const alertasGeneradas = [];

    const sedesResumen = {};

    for (const c of coordinadores) {
      const sede = c.sede || 'Sin Sede';
      if (!sedesResumen[sede]) {
        sedesResumen[sede] = { total: 0, gestiones: 0, asignados: 0, criticos: 0, optimos: 0 };
      }
      sedesResumen[sede].total++;
      sedesResumen[sede].gestiones += (c.gestiones || 0);
      sedesResumen[sede].asignados += (c.asignados || 0);

      const asignados = c.asignados || 0;
      const gestiones = c.gestiones || 0;
      const cobertura = c.coberturaPct || (asignados > 0 ? Math.round((gestiones / asignados) * 100) : 0);
      const confirmados = c.confirmados || 0;
      const noContesta = c.noContesta || 0;

      // Evaluaciones cualitativas y cuantitativas de Talento Humano
      let nivelRiesgo = 'OPTIMO';
      let motivo = '';
      let coachingFeedback = '';

      if (asignados > 0 && gestiones === 0) {
        nivelRiesgo = 'CRITICO';
        motivo = `Inactividad absoluta: 0 gestiones registradas teniendo ${asignados} participantes asignados.`;
        coachingFeedback = `Pauta RRHH: El Gerente debe realizar un check-in 1:1 de 10 min. Verificar barreras de acceso técnico a Nodus, bloqueo emocional o falta de tiempo. Establecer compromiso de 5 llamadas en las próximas 3 horas.`;
      } else if (asignados > 10 && cobertura < 35) {
        nivelRiesgo = 'CRITICO';
        motivo = `Cobertura muy rezagada: solo ${cobertura}% (${gestiones}/${asignados}). Riesgo alto de abandono de participantes.`;
        coachingFeedback = `Pauta RRHH: Revisar distribución de horarios. Asignar 'Power Hour' de llamadas concentradas con apoyo de un mentor o coordinador senior.`;
      } else if (gestiones > 5 && (noContesta / gestiones) > 0.6) {
        nivelRiesgo = 'MEDIO';
        motivo = `Cuello de botella en contactabilidad: ${(noContesta / gestiones * 100).toFixed(0)}% de llamadas marcan 'No Contesta'.`;
        coachingFeedback = `Pauta RRHH: El coordinador está llamando en horarios no convenientes para el perfil de alumnos. Orientar hacia franjas de 12:30-14:00 o 18:30-20:30 y uso de mensaje previo por WhatsApp.`;
      } else if (cobertura < 60) {
        nivelRiesgo = 'MEDIO';
        motivo = `Ritmo de gestión moderado: Cobertura al ${cobertura}%. Aún restan ${asignados - gestiones} participantes por contactar.`;
        coachingFeedback = `Pauta RRHH: Refuerzo positivo y seguimiento diario al cierre del turno. Validar si requiere reasignación temporal de base.`;
      } else {
        nivelRiesgo = 'OPTIMO';
        motivo = `Excelente ritmo operativo (${cobertura}% de cobertura, ${confirmados} confirmaciones logradas).`;
        coachingFeedback = `Pauta RRHH: Reconocimiento público en el canal de equipo. Posible candidato a apadrinar a coordinadores rezagados.`;
      }

      const itemEvaluado = {
        nombre: c.nombre,
        sede: c.sede,
        ciclo: c.ciclo,
        asignados,
        gestiones,
        coberturaPct: cobertura,
        confirmados,
        noContesta,
        ultGestion: c.ultGestion,
        ultConexion: c.ultConexion,
        nivelRiesgo,
        motivo,
        coachingFeedback
      };

      if (nivelRiesgo === 'CRITICO') {
        enAlertaCritica.push(itemEvaluado);
        sedesResumen[sede].criticos++;
      } else if (nivelRiesgo === 'MEDIO') {
        enAlertaMedia.push(itemEvaluado);
      } else {
        desempenoOptimo.push(itemEvaluado);
        sedesResumen[sede].optimos++;
      }

      // Generar alertas dirigidas para Gerentes de Sede si hay riesgo
      if (nivelRiesgo === 'CRITICO' || nivelRiesgo === 'MEDIO') {
        const destinatarios = [...(GERENTES_POR_SEDE[sede] || [])];
        if (nivelRiesgo === 'CRITICO') {
          // Escalar también a Dirección Corporativa en casos críticos
          destinatarios.push(...DIRECTORES_CORPORATIVOS);
        }

        // Deduplicar destinatarios
        const uniqueRecipients = Array.from(new Set(destinatarios));

        for (const email of uniqueRecipients) {
          alertasGeneradas.push({
            userId: email,
            title: nivelRiesgo === 'CRITICO' 
              ? `🚨 Centinela RRHH: Inactividad Crítica en ${c.nombre} (${sede})`
              : `⚠️ Centinela RRHH: Rezago Operativo en ${c.nombre} (${sede})`,
            message: `${motivo} ${coachingFeedback}`,
            type: nivelRiesgo === 'CRITICO' ? 'critical' : 'warning',
            read: false,
            createdAt: new Date().toISOString(),
            actionUrl: '/coordinadores',
            robot_token: ROBOT_TOKEN,
            metadata: {
              coordinador: c.nombre,
              sede: c.sede,
              gestiones,
              asignados,
              coberturaPct: cobertura,
              nivelRiesgo
            }
          });
        }
      }
    }

    console.log(`📊 [Agente 5 - RRHH] Diagnóstico completado:`);
    console.log(`   - 🔴 En Alerta Crítica: ${enAlertaCritica.length}`);
    console.log(`   - 🟡 En Alerta Media: ${enAlertaMedia.length}`);
    console.log(`   - 🟢 Desempeño Óptimo: ${desempenoOptimo.length}`);
    console.log(`   - 📬 Alertas in-app formuladas: ${alertasGeneradas.length}`);

    return {
      timestamp: new Date().toISOString(),
      resumenGlobal: {
        totalCoordinadores: coordinadores.length,
        criticos: enAlertaCritica.length,
        alertaMedia: enAlertaMedia.length,
        optimos: desempenoOptimo.length,
        tasaSaludOperativa: coordinadores.length > 0 ? Math.round((desempenoOptimo.length / coordinadores.length) * 100) : 0
      },
      sedesResumen,
      enAlertaCritica,
      enAlertaMedia,
      desempenoOptimo,
      alertasGeneradas
    };
  }

  /**
   * Guarda el cuadro de mando y despacha las alertas a Firestore
   * @param {Object} diagnostico Resultado de diagnosticarDesempeno
   */
  async publicarAlertasYCuadroDeMando(diagnostico) {
    if (this.dryRun) {
      console.log("🧪 [Agente 5 - RRHH] MODO DRY-RUN: No se escribirá en Firestore.");
      return;
    }

    console.log("🚀 [Agente 5 - RRHH] Publicando cuadro de mando y despachando alertas a Gerentes en Firestore...");

    try {
      // 1. Guardar cuadro de mando en /nodus_hr_sentinel/latest
      const cuadroRef = doc(db, 'nodus_hr_sentinel', 'latest');
      await setDoc(cuadroRef, {
        ...diagnostico,
        robot_token: ROBOT_TOKEN,
        updatedAt: serverTimestamp()
      }, { merge: true });
      console.log("✅ [Agente 5 - RRHH] Cuadro de mando guardado en /nodus_hr_sentinel/latest.");

      // 2. Despachar alertas a la colección /notifications (limitadas para evitar saturación: máx 15 alertas más urgentes)
      const alertasCriticas = diagnostico.alertasGeneradas.filter(a => a.type === 'critical');
      const alertasADespachar = (alertasCriticas.length > 0 ? alertasCriticas : diagnostico.alertasGeneradas).slice(0, 15);

      let insertadas = 0;
      for (const alerta of alertasADespachar) {
        try {
          await addDoc(collection(db, 'notifications'), alerta);
          insertadas++;
        } catch (err) {
          console.warn(`⚠️ Error al insertar notificación para ${alerta.userId}: ${err.message}`);
        }
      }

      console.log(`✅ [Agente 5 - RRHH] ${insertadas} notificaciones inyectadas con éxito en Causa OS.`);
    } catch (err) {
      console.error(`❌ [Agente 5 - RRHH] Error publicando en Firestore: ${err.message}`);
      throw err;
    }
  }
}