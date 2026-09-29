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

const ROBOT_TOKEN = process.env.ROBOT_TOKEN;
if (!ROBOT_TOKEN) {
  throw new Error('❌ Falta la variable de entorno ROBOT_TOKEN. Configúrala antes de ejecutar este script (ver GitHub Secrets: ROBOT_TOKEN).');
}

// Mapeo oficial de Gerentes por Sede y Dirección Corporativa
export const GERENTES_POR_SEDE = {
  'Bogotá': ['gerencia.bogota@crearpsl.net'], // Placeholder Bogotá
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

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FieldValue } from 'firebase-admin/firestore';

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
  diagnosticarDesempeno(coordinadores, equiposReporte = []) {
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

      const isCMJ = c.rol === 'Coordinador Maestría' || c.rol === 'Coordinador MJ';
      if (asignados > 0 && gestiones === 0) {
        nivelRiesgo = 'CRITICO';
        motivo = `Inactividad absoluta: 0 gestiones registradas teniendo ${asignados} participantes asignados.`;
        coachingFeedback = isCMJ ? `Pauta RRHH (Maestría): Check-in urgente. Verificar si hay retención de base PFD/SFD/TFD y por qué no hay llamadas de rescate.` : `Pauta RRHH: El Gerente debe realizar un check-in 1:1 de 10 min. Verificar barreras de acceso técnico a Nodus, bloqueo emocional o falta de tiempo. Establecer compromiso de 5 llamadas en las próximas 3 horas.`;
      } else if (asignados > 10 && cobertura < 35) {
        nivelRiesgo = 'CRITICO';
        motivo = `Cobertura muy rezagada: solo ${cobertura}% (${gestiones}/${asignados}). Riesgo alto de abandono de participantes.`;
        coachingFeedback = isCMJ ? `Pauta RRHH (Maestría): Revisar flujo de Maestría. Un CMJ debe tener contacto estrecho. Requerir barrido inmediato de rezagados.` : `Pauta RRHH: Revisar distribución de horarios. Asignar 'Power Hour' de llamadas concentradas con apoyo de un mentor o coordinador senior.`;
      } else if (gestiones > 5 && (noContesta / gestiones) > 0.6) {
        nivelRiesgo = 'MEDIO';
        motivo = `Cuello de botella en contactabilidad: ${(noContesta / gestiones * 100).toFixed(0)}% de llamadas marcan 'No Contesta'.`;
        coachingFeedback = isCMJ ? `Pauta RRHH (Maestría): Revisar horarios de contacto. Maestría requiere seguimiento ejecutivo, intentar contacto asíncrono (WhatsApp) primero.` : `Pauta RRHH: El coordinador está llamando en horarios no convenientes para el perfil de alumnos. Orientar hacia franjas de 12:30-14:00 o 18:30-20:30 y uso de mensaje previo por WhatsApp.`;
      } else if (cobertura < 60) {
        nivelRiesgo = 'MEDIO';
        motivo = `Ritmo de gestión moderado: Cobertura al ${cobertura}%. Aún restan ${asignados - gestiones} participantes por contactar.`;
        coachingFeedback = isCMJ ? `Pauta RRHH (Maestría): Reforzar seguimiento de alumnos en etapa avanzada.` : `Pauta RRHH: Refuerzo positivo y seguimiento diario al cierre del turno. Validar si requiere reasignación temporal de base.`;
      } else {
        nivelRiesgo = 'OPTIMO';
        const metricaLograda = isCMJ ? `${c.mj || c.sentadosTotal || 0} sentados (Maestría)` : `${confirmados} confirmaciones logradas`;
        motivo = `Excelente ritmo operativo (${cobertura}% de cobertura, ${metricaLograda}).`;
        coachingFeedback = isCMJ ? `Pauta RRHH (Maestría): Excelente retención y contacto de Maestría.` : `Pauta RRHH: Reconocimiento público en el canal de equipo. Posible candidato a apadrinar a coordinadores rezagados.`;
      }

      
      const pxList = [];
      if (equiposReporte && equiposReporte.length > 0) {
        for (const equipo of equiposReporte) {
          if (!equipo.participantes) continue;
          for (const p of equipo.participantes) {
            // El nombre del coordinador en equiposReporte puede estar en otro formato, usamos match parcial
            if (p.coordinador && c.nombre && p.coordinador.toLowerCase().includes(c.nombre.toLowerCase().split(' ')[0])) {
               // Consideramos "sin gestionar" a todos si el nivel es CRITICO, o solo los que tienen llamada1 vacío (si existe la lógica)
               // Como Nodus no da el status individual fácilmente, enviamos la lista de asignados para este coord en riesgo.
               if (!p.llamada1 || p.llamada1.trim() === '' || nivelRiesgo === 'CRITICO') {
                 pxList.push(`${p.nombres || ''} ${p.apellidos || ''}`.trim());
               }
            }
          }
        }
      }
      
      const pxUnicos = Array.from(new Set(pxList)).slice(0, 15); // limit to 15 names
      const pxNamesStr = pxUnicos.length > 0 ? pxUnicos.join(', ') + (pxList.length > 15 ? '...' : '') : 'No listados';

      const itemEvaluado = {
        nombre: c.nombre,
        sede: c.sede,
        ciclo: c.ciclo,
        rol: c.rol || 'Coordinador',
        asignados,
        gestiones,
        coberturaPct: cobertura,
        confirmados,
        confirmadosC1: c.confirmadosC1 || 0,
        confirmadosC2: c.confirmadosC2 || 0,
        sentadosC1: c.sentadosC1 || 0,
        sentadosC2: c.sentadosC2 || 0,
        sentadosTotal: c.sentadosTotal || (c.sentadosC1 || 0) + (c.sentadosC2 || 0) || c.asistieron || 0,
        gestionesC1: c.gestionesC1 || 0,
        gestionesC2: c.gestionesC2 || 0,
        porConfirmar: c.porConfirmar || 0,
        noInteresa: c.noInteresa || 0,
        devolucion: c.devolucion || 0,
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
      const cuadroRef = this.db.collection('nodus_hr_sentinel').doc('latest');
      await cuadroRef.set({
        ...diagnostico,
        robot_token: ROBOT_TOKEN,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      console.log("✅ [Agente 5 - RRHH] Cuadro de mando guardado en /nodus_hr_sentinel/latest.");

      // 2. Despachar alertas a la colección /notifications (limitadas para evitar saturación: máx 15 alertas más urgentes)
      const alertasCriticas = diagnostico.alertasGeneradas.filter(a => a.type === 'critical');
      const alertasADespachar = (alertasCriticas.length > 0 ? alertasCriticas : diagnostico.alertasGeneradas).slice(0, 15);

      let insertadas = 0;
      for (const alerta of alertasADespachar) {
        try {
          await this.db.collection('notifications').add(alerta);
          insertadas++;
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
          
          for (const [sede, resumen] of Object.entries(diagnostico.sedesResumen)) {
            if (resumen.criticos > 0) {
              const coordinadoresSede = diagnostico.enAlertaCritica.filter(c => c.sede === sede);
              
              let rowsHtml = '';
              for (const c of coordinadoresSede) {
                // Cálculo aproximado de horas inactivo
                let horasInactivo = '>24';
                if (c.ultGestion) {
                   // c.ultGestion viene en formato DD/MM/YYYY HH:mm si es hoy o días pasados.
                   // Lo simplificamos o dejamos vacío si no es parseable fácil
                   horasInactivo = 'Varias'; 
                }
                
                rowsHtml += `
                <tr>
                  <td>${c.nombre}</td>
                  <td>${c.ultGestion || 'Desconocida'}</td>
                  <td>${c.asignados}</td>
                  <td><span style="font-size: 12px; color: #52525b; display: block; max-width: 150px; word-wrap: break-word;">${c.pxSinGestionar || 'Ninguno'}</span></td>
                  <td><span class="badge-critical">${c.nivelRiesgo}</span></td>
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
                   .replace(/\{\{sede\}\}/g, sede)
                   .replace('{{coordinadores_inactivos}}', resumen.criticos)
                   .replace('{{total_coordinadores}}', resumen.total)
                   .replace('{{tiempo_promedio_inactividad}}', '24+')
                   .replace('{{participantes_riesgo}}', coordinadoresSede.reduce((acc, curr) => acc + curr.asignados, 0));
                   
                 // Reemplazar la tabla iterativa
                 htmlFinal = htmlFinal.replace(/\{\{#each coordinadores_rezagados\}\}[\s\S]*?\{\{\/each\}\}/m, rowsHtml);
                 
                 await this.db.collection('mail').add({
                   to: destinatarios,
                   cc: DIRECTORES_CORPORATIVOS,
                   message: {
                     subject: `🚨 ALERTA CRÍTICA: Rezago Operativo en ${sede}`,
                     html: htmlFinal
                   },
                   createdAt: FieldValue.serverTimestamp()
                 });
                 emailsEnviados++;
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
