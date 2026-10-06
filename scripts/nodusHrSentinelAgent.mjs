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

// Mapeo oficial de Gerentes por Sede y Dirección Corporativa
export const GERENTES_POR_SEDE = {
  'Bogotá': [],
  'Cuenca': ['emely.leon@crearpsl.net', 'ricardo.gavilanez@crearpsl.net', 'ricardogavilanez1021@gmail.com'], // July León / Ricardo Gavilánez
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

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import {
  classifyCoordinatorPerformance,
  getCoordinatorMetrics,
  isSnapshotFresh,
  normalizeIdentityName
} from '../shared/rrhhSentinelRules.mjs';

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

export class NodusHrSentinelAgent {
  constructor(adminDb = null, options = {}) {
    this.db = adminDb;
    this.dryRun = options.dryRun || false;
  }

  /**
   * Analiza la actividad de los coordinadores y diagnostica riesgos de RRHH
   * @param {Array} coordinadores Lista normalizada de coordinadores
   * @returns {Object} Informe diagnóstico de Talento Humano
   */
  diagnosticarDesempeno(coordinadores, sourceTimestamp = null) {
    console.log(`\n👔 [Agente 5 - RRHH] Evaluando métricas operativas de ${coordinadores.length} coordinadores...`);

    const enAlertaCritica = [];
    const enAlertaMedia = [];
    const desempenoOptimo = [];
    const sinBase = [];
    const indeterminados = [];
    const alertasGeneradas = [];

    const sedesResumen = {};

    for (const c of coordinadores) {
      const sede = c.sede || 'Sin Sede';
      const metrics = getCoordinatorMetrics(c);
      const { asignados, gestiones, coberturaPct: cobertura, confirmados, noContesta } = metrics;
      const { nivelRiesgo, motivo, coachingFeedback } = classifyCoordinatorPerformance(c);

      if (!sedesResumen[sede]) {
        sedesResumen[sede] = {
          total: 0, gestiones: 0, asignados: 0,
          gestionesConDato: 0, asignadosConDato: 0, criticos: 0, optimos: 0
        };
      }
      sedesResumen[sede].total++;
      if (gestiones !== null) {
        sedesResumen[sede].gestiones += gestiones;
        sedesResumen[sede].gestionesConDato++;
      }
      if (asignados !== null) {
        sedesResumen[sede].asignados += asignados;
        sedesResumen[sede].asignadosConDato++;
      }

      const itemEvaluado = {
        nombre: c.nombre,
        sede: c.sede,
        ciclo: c.ciclo,
        rol: c.rol || 'Coordinador',
        asignados,
        gestiones,
        coberturaPct: cobertura,
        confirmados,
        confirmadosC1: metrics.confirmadosC1,
        confirmadosC2: metrics.confirmadosC2,
        sentadosC1: metrics.sentadosC1,
        sentadosC2: metrics.sentadosC2,
        sentadosTotal: metrics.sentadosTotal,
        gestionesC1: metrics.gestionesC1,
        gestionesC2: metrics.gestionesC2,
        porConfirmar: metrics.porConfirmar,
        noInteresa: metrics.noInteresa,
        devolucion: metrics.devolucion,
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
      } else if (nivelRiesgo === 'OPTIMO') {
        desempenoOptimo.push(itemEvaluado);
        sedesResumen[sede].optimos++;
      } else if (nivelRiesgo === 'SIN_BASE') {
        sinBase.push(itemEvaluado);
      } else {
        indeterminados.push(itemEvaluado);
      }

      // Generar alertas dirigidas para Gerentes de Sede si hay riesgo
      if (nivelRiesgo === 'CRITICO' || nivelRiesgo === 'MEDIO') {
        const normalizeSede = (s) => {
          if (!s) return 'GLOBAL';
          const n = String(s).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (n.includes('quito')) return 'Quito';
          if (n.includes('cuenca')) return 'Cuenca';
          if (n.includes('guayaquil') || n.includes('gye')) return 'Guayaquil';
          if (n.includes('medellin')) return 'Medellín';
          if (n.includes('lima')) return 'Lima';
          if (n.includes('mex') || n.includes('cdmx')) return 'México';
          return s.trim();
        };
        const sedeNorm = normalizeSede(sede);
        const destinatarios = [...(GERENTES_POR_SEDE[sedeNorm] || [])];
        if (nivelRiesgo === 'CRITICO') {
          // Escalar también a Dirección Corporativa en casos críticos
          destinatarios.push(...DIRECTORES_CORPORATIVOS);
        }

        // Deduplicar destinatarios
        const uniqueRecipients = Array.from(new Set(destinatarios));

        for (const email of uniqueRecipients) {
          alertasGeneradas.push({
            userId: email,
            alertKey: `${normalizeIdentityName(c.nombre)}|${normalizeIdentityName(sede)}|${nivelRiesgo}`,
            title: nivelRiesgo === 'CRITICO' 
              ? `🚨 Centinela RRHH: Alerta crítica de gestión en ${c.nombre} (${sede})`
              : `⚠️ Centinela RRHH: Rezago Operativo en ${c.nombre} (${sede})`,
            message: `${motivo} ${coachingFeedback}`,
            type: nivelRiesgo === 'CRITICO' ? 'critical' : 'warning',
            read: false,
            createdAt: new Date().toISOString(),
            actionUrl: '/coordinadores',
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
      sourceTimestamp,
      resumenGlobal: {
        totalCoordinadores: coordinadores.length,
        criticos: enAlertaCritica.length,
        alertaMedia: enAlertaMedia.length,
        optimos: desempenoOptimo.length,
        sinBase: sinBase.length,
        indeterminados: indeterminados.length,
        totalEvaluables: enAlertaCritica.length + enAlertaMedia.length + desempenoOptimo.length,
        tasaSaludOperativa: enAlertaCritica.length + enAlertaMedia.length + desempenoOptimo.length > 0
          ? Math.round((desempenoOptimo.length / (enAlertaCritica.length + enAlertaMedia.length + desempenoOptimo.length)) * 100)
          : null
      },
      sedesResumen,
      enAlertaCritica,
      enAlertaMedia,
      desempenoOptimo,
      sinBase,
      indeterminados,
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
      const cuadroRef = this.db.collection('nodus_hr_sentinel').doc('latest');
      const previousSnapshot = await cuadroRef.get();
      const previousAlertsCandidate = previousSnapshot.exists
        ? previousSnapshot.data().alertasGeneradas
        : [];
      const previousAlerts = Array.isArray(previousAlertsCandidate) ? previousAlertsCandidate : [];
      const previousByKey = new Map();
      for (const alert of previousAlerts) {
        if (alert.alertKey && !previousByKey.has(alert.alertKey)) previousByKey.set(alert.alertKey, alert);
      }

      const alertasGeneradas = diagnostico.alertasGeneradas.map(alert => {
        const previous = previousByKey.get(alert.alertKey);
        return {
          ...alert,
          firstDetectedAt: previous?.firstDetectedAt || diagnostico.timestamp
        };
      });
      const publishedReport = { ...diagnostico, alertasGeneradas };

      // 1. Guardar cuadro de mando en /nodus_hr_sentinel/latest
      await cuadroRef.set({
        ...publishedReport,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      console.log("✅ [Agente 5 - RRHH] Cuadro de mando guardado en /nodus_hr_sentinel/latest.");

      if (!isSnapshotFresh(diagnostico.sourceTimestamp)) {
        console.warn('⚠️ [Agente 5 - RRHH] No se despachan alertas: el corte fuente de Nodus no tiene fecha vigente verificable.');
        return;
      }

      // 2. Crear una notificación por episodio; las ejecuciones horarias no repiten la misma alerta.
      const alertasCriticas = alertasGeneradas.filter(a => a.type === 'critical');
      const alertasNoCriticas = alertasGeneradas.filter(a => a.type !== 'critical');
      const alertasADespachar = [...alertasCriticas, ...alertasNoCriticas].slice(0, 15);

      let insertadas = 0;
      for (const alerta of alertasADespachar) {
        try {
          const notificationId = createHash('sha256')
            .update(`${alerta.userId}|${alerta.alertKey}|${alerta.firstDetectedAt}`)
            .digest('hex');
          const notificationRef = this.db.collection('notifications').doc(`rrhh_${notificationId}`);
          const wasCreated = await this.db.runTransaction(async transaction => {
            const existing = await transaction.get(notificationRef);
            if (existing.exists) return false;
            transaction.create(notificationRef, alerta);
            return true;
          });
          if (wasCreated) insertadas++;
        } catch (err) {
          console.warn(`⚠️ Error al insertar notificación para ${alerta.userId}: ${err.message}`);
        }
      }

      console.log(`✅ [Agente 5 - RRHH] ${insertadas} notificaciones inyectadas con éxito en Causa OS.`);

      // 3. Despachar Correos a Gerentes de Sede (Colección 'mail' para Firebase Trigger Email)
      try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const templatePath = path.join(__dirname, 'templates', 'email_rezago_nodus.html');
        
        if (fs.existsSync(templatePath)) {
          const rawTemplate = fs.readFileSync(templatePath, 'utf8');
          let emailsEnviados = 0;
          
          const newCriticalKeys = new Set(alertasGeneradas
            .filter(alert => alert.type === 'critical' && alert.firstDetectedAt === diagnostico.timestamp)
            .map(alert => alert.alertKey));

          for (const [sede, resumen] of Object.entries(diagnostico.sedesResumen)) {
            const coordinadoresSede = diagnostico.enAlertaCritica.filter(c =>
              c.sede === sede && newCriticalKeys.has(`${normalizeIdentityName(c.nombre)}|${normalizeIdentityName(sede)}|CRITICO`)
            );
            if (coordinadoresSede.length > 0) {
              
              let rowsHtml = '';
              for (const c of coordinadoresSede) {
                rowsHtml += `
                <tr>
                  <td>${escapeHtml(c.nombre)}</td>
                  <td>${escapeHtml(c.ultGestion || 'No disponible')}</td>
                  <td>${c.asignados ?? 'Sin dato'}</td>
                  <td>${c.gestiones ?? 'Sin dato'} / ${c.asignados ?? 'Sin dato'}</td>
                  <td>${escapeHtml(c.motivo)}</td>
                </tr>
                `;
              }
              
              // Evitar enviar a sedes vacías o sin gerentes
              const normalizeSede = (s) => {
                if (!s) return 'GLOBAL';
                const n = String(s).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                if (n.includes('quito')) return 'Quito';
                if (n.includes('cuenca')) return 'Cuenca';
                if (n.includes('guayaquil') || n.includes('gye')) return 'Guayaquil';
                if (n.includes('medellin')) return 'Medellín';
                if (n.includes('lima')) return 'Lima';
                if (n.includes('mex') || n.includes('cdmx')) return 'México';
                return s.trim();
              };
              
              const sedeNorm = normalizeSede(sede);
              const destinatarios = [...(GERENTES_POR_SEDE[sedeNorm] || [])];
              if (destinatarios.length > 0) {
                 let htmlFinal = rawTemplate
                   .replace('{{nombre_gerente}}', 'Equipo Gerencial ' + sedeNorm)
                   .replace(/\{\{sede\}\}/g, escapeHtml(sede))
                   .replace('{{coordinadores_criticos}}', resumen.criticos)
                   .replace('{{total_coordinadores}}', resumen.total)
                   .replace('{{alertas_nuevas}}', coordinadoresSede.length)
                   .replace('{{asignados_reportados}}', coordinadoresSede.reduce((acc, curr) => acc + (curr.asignados ?? 0), 0))
                   .replace('{{corte_nodus}}', escapeHtml(diagnostico.sourceTimestamp));
                   
                 // Reemplazar la tabla iterativa
                 htmlFinal = htmlFinal.replace(/\{\{#each coordinadores_rezagados\}\}[\s\S]*?\{\{\/each\}\}/m, rowsHtml);
                 
                 const mailId = createHash('sha256')
                   .update(`${sede}|${coordinadoresSede.map(c => `${normalizeIdentityName(c.nombre)}:${c.asignados}`).sort().join('|')}|${diagnostico.timestamp}`)
                   .digest('hex');
                 const mailRef = this.db.collection('mail').doc(`rrhh_${mailId}`);
                 const wasQueued = await this.db.runTransaction(async transaction => {
                   const existing = await transaction.get(mailRef);
                   if (existing.exists) return false;
                   transaction.create(mailRef, {
                     to: destinatarios,
                     cc: DIRECTORES_CORPORATIVOS,
                     message: {
                       subject: `🚨 ALERTA CRÍTICA: Gestión operativa registrada en ${sede}`,
                       html: htmlFinal
                     },
                     createdAt: FieldValue.serverTimestamp()
                   });
                   return true;
                 });
                 if (wasQueued) emailsEnviados++;
              }
            }
          }
          console.log(`✅ [Agente 5 - RRHH] ${emailsEnviados} correos de alerta encolados en /mail.`);
        } else {
           console.warn("⚠️ [Agente 5] No se encontró la plantilla HTML de email:", templatePath);
        }
      } catch (mailErr) {
        console.error("⚠️ [Agente 5] Error al enviar correos de alerta:", mailErr.message);
      }

    } catch (err) {
      console.error(`❌ [Agente 5 - RRHH] Error publicando en Firestore: ${err.message}`);
      throw err;
    }
  }
}
