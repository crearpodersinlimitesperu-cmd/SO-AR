import 'dotenv/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { USERS_TO_IMPORT } from '../src/data/usersToImport.js';

const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!raw) throw new Error('Falta la credencial de servicio; no se importó ninguna tarea.');
const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(raw)) });
const db = getFirestore(app);
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const task = (id, owner, title, description, collaborators, sla, status = 'Pendiente', deadline = null) => ({ id, owner, title, description, collaborators, sla, status, deadline });

// Acta "Reunión Madrid". Los SLA sin fecha cierta se conservan literalmente.
const tasks = [
 task('FER-01','Fer Aragón','Despliegue de Lenguaje NEC™','Liderar la transición oficial e implementación de los conceptos, marco conceptual y materiales del Programa de Creación con Tecnología NEC™.',['Paul Sosa'],'01/10/2026','Pendiente','2026-10-01'),
 task('FER-02','Fer Aragón','Estructura de Talento Humano Global','Diseñar e implementar la estructura del área de Talento Humano alineada con el modelo corporativo internacional.',['Paul Sosa'],'En 1 mes (martes)'),
 task('FER-03','Fer Aragón','Independencia Operativa CDMX','Sostener reunión con Paola para delimitar competencias, otorgar autonomía a la oficina de Santa Fe y definir acuerdos societarios/pagos.',['Paul Sosa'],'Próxima semana'),
 task('FER-04','Fer Aragón','Directriz Interna de Graduación','Redactar y emitir la directriz que elimina el requisito obligatorio de enrolamiento para graduación en Maestría y prohíbe las bajas por cuotas.',['Andrés Gómez'],'Inmediato'),
 task('FER-05','Fer Aragón','Renuncia Externa Mauricio Pérez','Sostener reunión individual con Mauricio Pérez para solicitar su renuncia formal a proyectos externos en Lima (centro SLS).',[],'Por definir'),
 task('PAU-01','Paul Sosa','Despliegue de Lenguaje NEC™','Coordinar el despliegue del nuevo marco institucional de Creación y sustitución de terminología obsoleta en todas las sedes.',['Fer Aragón'],'01/10/2026','Pendiente','2026-10-01'),
 task('PAU-02','Paul Sosa','Estructura de Talento Humano Global','Formular la definición del perfil y manuales de Talento Humano bajo la estructura corporativa global.',['Fer Aragón'],'En 1 mes (martes)'),
 task('PAU-03','Paul Sosa','Independencia Operativa CDMX','Delimitar funciones con Paola en Ciudad de México para la transición del equipo operativo hacia Santa Fe.',['Fer Aragón'],'Próxima semana'),
 task('PAU-04','Paul Sosa','Ajuste Salarial en Guayaquil','Revisar, evaluar y ejecutar el ajuste a la escala salarial y compensaciones de Josué en la sede Guayaquil.',['Elizabeth (Eli)'],'Por definir'),
 task('PAU-05','Paul Sosa','Validación de Uniformes Globales','Revisar y aprobar los diseños finales y proveedores para la estandarización de polos monocromáticos de equipos y ropa negra de staff.',['Alex'],'Por definir'),
 task('PAU-06','Paul Sosa','Observación de Orientación','Asistir en calidad de evaluador a una sesión de orientación de viernes impartida por Andrés Gómez.',['Leandro Brunis'],'Por definir'),
 task('AND-01','Andrés Gómez','Directriz Interna de Graduación','Elaborar el documento normativo que prohíbe a coordinadores y entrenadores dar de baja a participantes por métricas de enrolamiento.',['Fer Aragón'],'Inmediato'),
 task('AND-02','Andrés Gómez','Contratación Oficina Medellín','Seleccionar y contratar el personal operativo para la oficina de Medellín encargado de Capítulos 1, 2 y Maestría.',[],'05/10/2026','En progreso','2026-10-05'),
 task('AND-03','Andrés Gómez','Ultimátum Mauricio Ramírez','Notificar formalmente la fecha límite para cumplir los objetivos de salud/peso y preparación de salón para la coordinación del 3er fin de semana.',[],'15/01/2027','Pendiente','2027-01-15'),
 task('AND-04','Andrés Gómez','Montaje Sede Bogotá','Dirigir el plan operativo y logístico para la apertura de la nueva sede en Bogotá.',['Narda','Yurani'],'Marzo de 2027'),
 task('AND-05','Andrés Gómez','Retroalimentación Alejandro Díaz','Realizar sesión presencial de feedback sobre imagen personal, reducción de ejercicios exclusivamente físicos y cercanía con participantes.',[],'Por definir'),
 task('AND-06','Andrés Gómez','Alineación Operativa Linid Valencia','Sostener conversación explícita con Linid sobre integración, relacionamiento con pares y trabajo colaborativo en Lima.',[],'Por definir'),
 task('AND-07','Andrés Gómez','Alineación María Lourdes Patiño','Entrevistar a María Lourdes para gestionar demandas operativas durante visitas e integración con gerencias.',[],'Por definir'),
 task('AND-08','Andrés Gómez','Mentorías Técnicas Alonso Solares','Diseñar y dar seguimiento al plan de mentorías en comunicación y estructura para Alonso Solares.',['Chui Acosta'],'Por definir'),
 task('AND-09','Andrés Gómez','Estandarización Flujos Capítulo 2','Homologar los flujos de conversación, entregables y guiones del Capítulo 2 para todas las sedes.',['Ana Elena Monroy'],'Por definir'),
 task('JOS-01','José Sánchez','Centralización Digital Causa','Erradicar reportes manuales en Excel o WhatsApp e ingresar el 100% de datos de asistencia y confirmaciones en Causa.',[],'Inmediato','En progreso'),
 task('JOS-02','José Sánchez','Auditoría 3 Resultados Imposibles','Configurar y supervisar el módulo automatizado en Causa para auditar las evidencias de los 3 Resultados Imposibles por alumno.',[],'Inmediato','En progreso'),
 task('JOS-03','José Sánchez','Lineamientos y Contrato Entrenadores','Redactar y enviar por correo electrónico los contratos de confidencialidad y lineamientos metodológicos para el cuerpo de entrenadores.',['Armando'],'Prioritario'),
 task('JOS-04','José Sánchez','Prueba de Coordinación Gina','Asignar la gestión de llamadas de rezagados a Gina para coordinar Capítulos 1 y 2, promoviendo el liderazgo de Joyce Marín.',['Joyce Marín'],'Por definir'),
 task('JOS-05','José Sánchez','Optimización de Sonido Lima','Reestructurar la contratación y logística del servicio de sonido en Lima para reducir los costos fijos por ciclo.',[],'Por definir'),
 task('JOS-06','José Sánchez','Auditoría en Video de Facilitación','Grabar en video las orientaciones y sesiones complementarias (Rompimiento y Vuelos) para el control de calidad metodológico.',[],'Próximas fechas'),
 task('LEA-01','Leandro Brunis','Observación de Orientación','Acompañar a Paul Sosa en la evaluación presencial de la orientación de viernes liderada por Andrés Gómez.',['Paul Sosa'],'Por definir'),
 task('LEA-02','Leandro Brunis','Ajuste de Contenido en Salón','Reforzar la presencia profesional en salón reduciendo la mezcla musical y el uso excesivo de anécdotas personales.',[],'Inmediato / Continuo','En progreso'),
 task('LEA-03','Leandro Brunis','Integración en Reuniones de Gestión','Participar de forma continua en las sesiones de alineación gerencial para coordinar criterios operativos globales.',[],'No especificado en el acta'),
];

const people = [];
for (const person of USERS_TO_IMPORT) {
  const email = person.email || person.corporateEmail || person.emails?.[0];
  if (person.name && email) people.push({ name: person.name, email: String(email).trim().toLowerCase(), sede: person.sede || 'Global' });
}
for (const collectionName of ['users', 'qt_directory']) {
  const snapshot = await db.collection(collectionName).get();
  snapshot.forEach(doc => {
    const data = doc.data();
    const name = data.name || data.displayName || data.fullName || '';
    const email = data.email || data.corporateEmail || data.correo || '';
    if (name && email) people.push({ name, email: String(email).trim().toLowerCase(), sede: data.sede || 'Global' });
  });
}
const uniquePeople = [...new Map(people.map(person => [`${normalize(person.name)}__${person.email}`, person])).values()];
const resolvePerson = name => {
  const key = normalize(name);
  const exact = uniquePeople.filter(person => normalize(person.name) === key);
  if (exact.length === 1) return exact[0];
  const tokens = key.split(' ').filter(Boolean);
  if (tokens.length < 2) return null;
  const candidates = uniquePeople.filter(person => tokens.every(token => normalize(person.name).split(' ').includes(token)));
  return candidates.length === 1 ? candidates[0] : null;
};
const existing = await db.collection('tasks').get();
const existingIds = new Set(existing.docs.map(doc => doc.data().sourceTaskId).filter(Boolean));
const existingKeys = new Set(existing.docs.map(doc => `${normalize(doc.data().task || doc.data().title)}__${String(doc.data().assignedToEmail || '').toLowerCase()}`));
const report = { imported: [], skipped: [], unresolved: [] };
let batch = db.batch(); let count = 0;
for (const item of tasks) {
  const owner = resolvePerson(item.owner);
  if (!owner) { report.unresolved.push({ id: item.id, person: item.owner, reason: 'responsable principal no localizado de forma única' }); continue; }
  const duplicate = existingIds.has(item.id) || existingKeys.has(`${normalize(item.title)}__${owner.email}`);
  if (duplicate) { report.skipped.push({ id: item.id, reason: 'ya existe una tarea equivalente' }); continue; }
  const unresolvedCollaborators = item.collaborators.filter(name => !resolvePerson(name));
  const collaboratorEmails = item.collaborators.map(resolvePerson).filter(Boolean).map(person => person.email);
  const recipients = [...new Set([owner.email, ...collaboratorEmails])];
  const now = new Date().toISOString();
  batch.set(db.collection('tasks').doc(`madrid_${item.id.toLowerCase()}`), {
    id: `madrid_${item.id.toLowerCase()}`, task: item.title, title: item.title, description: item.description,
    assignedToEmail: owner.email, assignedToEmails: recipients, assignedByName: 'Reunión Madrid', createdBy: 'reunion_madrid',
    source: 'reunion_madrid', sourceTaskId: item.id, coResponsibleNames: item.collaborators, unresolvedCoResponsibleNames: unresolvedCollaborators,
    assignedSede: owner.sede, deadline: item.deadline, deadlineLabel: item.sla, status: item.status, completed: false,
    progressPercentage: 0, priority: item.sla.toLowerCase().includes('inmediato') || item.sla.toLowerCase().includes('prioritario') ? '🟠 NARANJA' : '🟡 AMARILLO', created_at: now,
  });
  report.imported.push(item.id); count++;
}
batch.set(db.collection('task_import_audit').doc(`reunion_madrid_${Date.now()}`), { source: 'Reunión Madrid', occurredAt: FieldValue.serverTimestamp(), immutable: true, ...report, taskCount: tasks.length });
await batch.commit();
console.log(JSON.stringify({ ...report, total: tasks.length }, null, 2));
