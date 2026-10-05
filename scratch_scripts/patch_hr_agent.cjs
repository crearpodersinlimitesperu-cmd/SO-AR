const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'scripts', 'nodusHrSentinelAgent.mjs');
let content = fs.readFileSync(filePath, 'utf8');

// Agregar fs y path a los imports si no existen
if (!content.includes("import fs from 'fs';")) {
  content = content.replace("import { FieldValue }", "import fs from 'fs';\nimport path from 'path';\nimport { fileURLToPath } from 'url';\nimport { FieldValue }");
}

// Inyectar la lógica de envío de emails
const emailLogic = `
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
                
                rowsHtml += \`
                <tr>
                  <td>\${c.nombre}</td>
                  <td>\${c.ultGestion || 'Desconocida'}</td>
                  <td>\${c.asignados}</td>
                  <td><span class="badge-critical">\${c.nivelRiesgo}</span></td>
                </tr>
                \`;
              }
              
              // Evitar enviar a sedes vacías o sin gerentes
              const normalizeSede = (s) => {
                if (!s) return 'GLOBAL';
                const n = String(s).trim().toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
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
                   .replace(/\\{\\{sede\\}\\}/g, sede)
                   .replace('{{coordinadores_inactivos}}', resumen.criticos)
                   .replace('{{total_coordinadores}}', resumen.total)
                   .replace('{{tiempo_promedio_inactividad}}', '24+')
                   .replace('{{participantes_riesgo}}', coordinadoresSede.reduce((acc, curr) => acc + curr.asignados, 0));
                   
                 // Reemplazar la tabla iterativa
                 htmlFinal = htmlFinal.replace(/\\{\\{#each coordinadores_rezagados\\}\\}[\\s\\S]*?\\{\\{\\/each\\}\\}/m, rowsHtml);
                 
                 await this.db.collection('mail').add({
                   to: destinatarios,
                   cc: DIRECTORES_CORPORATIVOS,
                   message: {
                     subject: \`🚨 ALERTA CRÍTICA: Rezago Operativo en \${sede}\`,
                     html: htmlFinal
                   },
                   createdAt: FieldValue.serverTimestamp()
                 });
                 emailsEnviados++;
              }
            }
          }
          console.log(\`✅ [Agente 5 - RRHH] \${emailsEnviados} correos de alerta encolados en /mail.\`);
        } else {
           console.warn("⚠️ [Agente 5] No se encontró la plantilla HTML de email:", templatePath);
        }
      } catch (mailErr) {
        console.error("⚠️ [Agente 5] Error al enviar correos de alerta:", mailErr.message);
      }
`;

content = content.replace("console.log(`✅ [Agente 5 - RRHH] ${insertadas} notificaciones inyectadas con éxito en Causa OS.`);", "console.log(`✅ [Agente 5 - RRHH] ${insertadas} notificaciones inyectadas con éxito en Causa OS.`);\n" + emailLogic);

fs.writeFileSync(filePath, content);
console.log("Patch aplicado correctamente a nodusHrSentinelAgent.mjs");
