import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Download,
  Printer,
  Copy,
  Search,
  MapPin,
  Check,
  Award
} from 'lucide-react';
import { addDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getClientGeoLocation } from '../utils/geoLocator';
import { generateMaestriaPassCanvas, sendMaestriaConfirmationEmail } from '../utils/maestriaPass';

// Generador de Hash SHA-256 usando Web Crypto API
async function computeSha256(message) {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // Fallback
  }
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0, ch; i < message.length; i++) {
    ch = message.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0') + Date.now().toString(16);
}

const SECCIONES_CONTRATO = [
  {
    id: 'sec1',
    numero: 'SECCIÓN I',
    titulo: 'Marco Metodológico, Desarrollo Operacional y Vigencia en la Comunidad',
    resumen: 'Exposición metodológica de inmersión de alto rendimiento, deslinde pedagógico y alcance continuo durante y después de Maestría.',
    articulos: [
      {
        subtitulo: '1.1 Exposición Metodológica del Programa',
        contenido: `El entrenamiento MAESTRÍA DEL JUEGO, perteneciente al Programa de Potencial Humano CREAR PODER SIN LÍMITES, utiliza como pilar de intervención un diseño educativo de inmersión y alto rendimiento contextual conceptualizado para intervenir en la estructura interpretativa, neurológica, lingüística y conductual del Participante. A través de ejercicios vivenciales, dinámicas contextuales e interacción colectiva, la metodología opera sobre los siguientes ejes:
• Reconfiguración del Sistema Nervioso y Autorregulación: Optimización de las respuestas neurobiológicas ante situaciones de alta presión, reduciendo estados de reactividad autómata y expandiendo la capacidad de autorregulación emocional.
• Colapso de Estados de Realidad mediante la Posición del Observador: Transformación del marco de percepción consciente para posibilitar el quiebre de paradigmas limitantes y la asunción de posturas de alto liderazgo.
• Diseño de Futuros sin Narrativas del Pasado: Creación intencional de metas y resultados de alto impacto desligados de condicionamientos históricos individuales.`
      },
      {
        subtitulo: '1.2 Deslinde Pedagógico y Naturaleza del Servicio',
        contenido: `El Participante y el Manager reconocen formalmente que el programa MAESTRÍA DEL JUEGO constituye de manera exclusiva un servicio de entrenamiento, capacitación privada y desarrollo operacional de alto rendimiento contextual.
El presente entrenamiento NO constituye, NO reemplaza y NO equivale a:
• Tratamiento psicológico, psicoterapéutico o psicoanalítico.
• Consulta, evaluación o tratamiento médico, neurológico o psiquiátrico.
• Terapia de salud mental o intervención clínica de ninguna índole.
La participación del Participante y la integración del Manager al equipo de liderazgo es completamente libre, voluntaria e informada.`
      },
      {
        subtitulo: '1.3 Alcance Temporal: Durante Maestría, Después de Maestría como Comunidad y Vigencia Legal Peruana',
        contenido: `Las reglas, principios éticos, acuerdos de confidencialidad y normas de convivencia establecidos en el presente instrumento rigen de manera obligatoria durante todo el desarrollo del programa MAESTRÍA DEL JUEGO, continúan aplicando después de Maestría para todas las personas como miembros e integrantes activos o graduados de la comunidad CREAR, y mantienen su plena exigibilidad jurídica por todo el tiempo que la legislación de la República del Perú lo considere vigente.`
      }
    ]
  },
  {
    id: 'sec2',
    numero: 'SECCIÓN II',
    titulo: 'Código de Conducta, Reglas de Maestría y Acuerdo de Confidencialidad (NDA)',
    resumen: 'Pacto de no divulgación, secreto de comunidad durante y después de Maestría, cero grabaciones, cero sustancias, prohibición de préstamos y relaciones sentimentales nuevas en el proceso, y asistencia >80%.',
    articulos: [
      {
        subtitulo: '2.1 Acuerdo de Confidencialidad Absoluta (NDA) y Secreto de Comunidad',
        contenido: `El Participante y el Manager reconocen que la metodología, dinámicas, guiones, manuales, estructuras operativas y material audiovisual empleados durante el entrenamiento constituyen propiedad intelectual reservada y secreto comercial de CREACIÓN CUÁNTICA E.I.R.L.
• Pacto de No Divulgación del Entrenamiento y Operativa: Tanto Participantes como Managers se comprometen a no reproducir, publicar, compartir o comercializar, de forma total o parcial, los contenidos, protocolos o dinámicas del entrenamiento durante toda Maestría, después de Maestría como integrantes de la comunidad y por todo el plazo máximo de protección que la ley peruana vigente establezca.
• Secreto de Comunidad y Reserva Absoluta: Las vivencias, testimonios, historias personales y declaraciones compartidas entre participantes y el equipo de liderazgo durante las sesiones y dentro de la comunidad son de carácter estrictamente confidencial y reservado de manera indefinida y permanente. Queda expresamente prohibido divulgar fuera del entorno del entrenamiento cualquier vivencia o información personal ajena.`
      },
      {
        subtitulo: '2.2 Prohibición Estricta de Grabación de Audio, Video y Fotografía',
        contenido: `Queda estrictamente prohibido registrar, grabar o fotografiar las actividades, sesiones, ponencias o dinámicas del entrenamiento en cualquier formato físico o digital, salvo por el equipo audiovisual oficial designado por CREACIÓN CUÁNTICA E.I.R.L.`
      },
      {
        subtitulo: '2.3 Reglas Operativas de Sala y Convivencia en Maestría y en la Comunidad',
        contenido: `Para preservar la integridad del contenedor de transformación durante toda Maestría del Juego y en la convivencia posterior como miembros de la comunidad CREAR, tanto Participantes como Managers se obligan a cumplir de forma irrestricta las siguientes normas:
• Cero Alcohol y Sustancias Psicoactivas: Prohibición absoluta de asistir bajo efectos de alcohol, drogas o sustancias no prescritas, así como su consumo durante las actividades y jornadas del programa.
• Prohibición de Préstamos, Negocios y Apuestas: Queda prohibido solicitar u otorgar préstamos de dinero, realizar cobros, transacciones comerciales no autorizadas, esquemas de captación o apuestas aprovechando los espacios o directorios de los equipos y de la comunidad.
• Cero Nuevas Relaciones Sentimentales en el Contenedor: Con el fin de evitar distracciones emocionales o conflictos de interés que vulneren el enfoque del proceso, queda prohibido iniciar vínculos afectivos o relaciones de pareja entre participantes, o entre participantes y managers/staff durante todo el ciclo del programa.
• Puntualidad y Asistencia Mínima (>80%): Es requisito indispensable cumplir con la puntualidad en cada bloque y mantener una asistencia superior al 80% de las sesiones para acreditar el entrenamiento.`
      }
    ]
  },
  {
    id: 'sec3',
    numero: 'SECCIÓN III',
    titulo: 'Declaración Jurada de Salud, Asunción de Riesgos y Exoneración Legal',
    resumen: 'Declaración de aptitud psicofísica, autonomía personal y exoneración irrevocable de responsabilidad a Creación Cuántica E.I.R.L.',
    articulos: [
      {
        subtitulo: '3.1 Declaración Jurada de Aptitud Física y Psicológica',
        contenido: `El Participante / Manager declara bajo juramento encontrarse en plenas facultades físicas, mentales y emocionales para participar en un programa de inmersión de alta exigencia. Asimismo, declara no padecer afecciones cardíacas severas no controladas, cuadros psicóticos agudos, trastornos disociativos graves ni encontrarse bajo prescripción médica que contraindique su participación en dinámicas de alto impacto emocional.`
      },
      {
        subtitulo: '3.2 Asunción de Responsabilidad y Deslinde Legal',
        contenido: `Al amparo del Código Civil Peruano (D.Leg. N° 295), el Participante / Manager asume plena y exclusiva responsabilidad por sus decisiones, acciones, reacciones emocionales y resultados dentro y fuera del salón, otorgando indemne e irrevocable exoneración de responsabilidad civil, contractual o extracontractual a CREACIÓN CUÁNTICA E.I.R.L., sus representantes legales, entrenadores, coordinadores y equipo de apoyo por todo el tiempo que la ley peruana lo considere vigente.`
      }
    ]
  },
  {
    id: 'sec4',
    numero: 'SECCIÓN IV',
    titulo: 'Protección de Datos Personales (Ley N° 29733) y Derechos de Imagen',
    resumen: 'Autorización para tratamiento en banco de datos conforme a la ley peruana y uso institucional/pedagógico de material fotográfico o audiovisual.',
    articulos: [
      {
        subtitulo: '4.1 Consentimiento de Tratamiento de Datos Personales',
        contenido: `De conformidad con la Ley N° 29733 (Ley de Protección de Datos Personales del Perú) y su Reglamento aprobado por el Decreto Supremo N° 016-2024-JUS, el titular otorga su consentimiento libre, previo, expreso, informado e inequívoco para que CREACIÓN CUÁNTICA E.I.R.L. trate sus datos personales con fines de gestión académica, acreditación, seguridad en sala y resguardo legal durante y después del programa conforme a la normativa peruana vigente.`
      },
      {
        subtitulo: '4.2 Autorización de Uso de Imagen Institucional',
        contenido: `El Participante / Manager autoriza de manera gratuita a CREACIÓN CUÁNTICA E.I.R.L. el uso de las fotografías o registros audiovisuales grupales captados por el equipo oficial durante las graduaciones o actividades autorizadas, exclusivamente para fines de memoria institucional, material pedagógico y difusión oficial del programa CREAR PODER SIN LÍMITES.`
      }
    ]
  },
  {
    id: 'sec5',
    numero: 'SECCIÓN V',
    titulo: 'Salida Voluntaria, Separación por Incumplimiento e Invitados a la Comunidad',
    resumen: 'Protocolo de retiro, facultad de separación inmediata por faltas éticas y protección de datos de invitados.',
    articulos: [
      {
        subtitulo: '5.1 Retiro Voluntario y Facultad de Separación por Incumplimiento',
        contenido: `CREACIÓN CUÁNTICA E.I.R.L. se reserva el derecho de separar de manera inmediata y sin derecho a reembolso, tanto del entrenamiento activo como de los espacios de la comunidad CREAR, a cualquier Participante o Manager que transgreda el acuerdo de confidencialidad, asista bajo efectos de sustancias prohibidas, incurra en faltas éticas o vulnere la seguridad física, patrimonial o emocional de cualquier miembro de la comunidad.`
      },
      {
        subtitulo: '5.2 Responsabilidad ética al compartir el Programa con Invitados',
        contenido: `Cuando el Participante o miembro graduado de la comunidad comparta libremente su experiencia o refiera invitados para conocer el programa:
• Respeto y Veracidad: Se compromete a compartir la visión del programa con integridad, sin revelar dinámicas confidenciales de sala.
• Protección de Datos de Invitados: Los datos de contacto compartidos serán tratados únicamente para brindar información oficial del programa por un plazo máximo de treinta (30) días calendario en caso de no concretarse su inscripción.
• Prohibición de Menores de Edad: Queda estrictamente prohibido registrar datos de menores de 18 años en actividades de adultos.`
      }
    ]
  },
  {
    id: 'sec6',
    numero: 'SECCIÓN VI',
    titulo: 'Consentimiento Electrónico Clickwrap y Validez Probatoria (Ley N° 27269)',
    resumen: 'Eficacia jurídica de la firma electrónica, captura obligatoria de IP y Geolocalización, y vigencia conforme a la ley peruana.',
    articulos: [
      {
        subtitulo: '6.1 Consentimiento Digital y Metadatos Probatorios Inalterables',
        contenido: `Conforme a la Ley N° 27269 (Ley de Firmas y Certificados Digitales) y los artículos 141 y 141-A del Código Civil Peruano, la aceptación de las tres (3) casillas obligatorias junto con la firma digital registra de forma inalterable: Marca de Tiempo ISO 8601, Dirección IP Pública, Geolocalización (País, Ciudad y Coordenadas), Identificador de Dispositivo y Huella Criptográfica SHA-256, constituyendo plena prueba de aceptación legal.`
      }
    ]
  }
];

export default function ContratoMaestriaLima() {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signedSuccess, setSignedSuccess] = useState(null);
  const [duplicateNotice, setDuplicateNotice] = useState('');
  const [passDataUrl, setPassDataUrl] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [geoInfo, setGeoInfo] = useState(null);
  const [loadingGeo, setLoadingGeo] = useState(true);
  const [emailSentStatus, setEmailSentStatus] = useState(false);

  const [formData, setFormData] = useState({
    nombreCompleto: '',
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    email: '',
    telefono: '',
    rolActividad: 'Participante',
    equipoCohorte: 'Equipo 32 — Sede Lima (Cohorte Actual)',
    casilla1_TerminosNDA: false,
    casilla2_SaludExoneracion: false,
    casilla3_DatosImagen: false,
    firmaTexto: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const formRef = useRef(null);

  const pageUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/reglas-maestria`
    : 'https://centro-operativo-cpsl.web.app/reglas-maestria';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=10&data=${encodeURIComponent(pageUrl)}`;

  // Capturar IP y Geolocalización automáticamente y blindar tema oscuro en la página pública
  useEffect(() => {
    document.title = 'Dossier Legal y Reglas de Maestría del Juego (Sede Lima) · Creación Cuántica E.I.R.L.';

    const prevHtmlTheme = document.documentElement.getAttribute('data-theme');
    const prevBodyTheme = document.body.getAttribute('data-theme');
    const enforceDarkTheme = () => {
      if (document.documentElement.getAttribute('data-theme') !== 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
      if (document.body.getAttribute('data-theme') !== 'dark') {
        document.body.setAttribute('data-theme', 'dark');
      }
      document.documentElement.classList.remove('theme-light', 'theme-zen');
      document.body.classList.remove('theme-light', 'theme-zen');
      document.documentElement.classList.add('theme-dark');
      document.body.classList.add('theme-dark');
    };

    enforceDarkTheme();
    const observer = new MutationObserver(enforceDarkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'class'] });

    let mounted = true;
    getClientGeoLocation({ forceFresh: false, tryGps: true }).then((geo) => {
      if (mounted) {
        setGeoInfo(geo);
        setLoadingGeo(false);
      }
    }).catch(() => {
      if (mounted) setLoadingGeo(false);
    });
    return () => {
      mounted = false;
      observer.disconnect();
      if (prevHtmlTheme) document.documentElement.setAttribute('data-theme', prevHtmlTheme);
      if (prevBodyTheme) document.body.setAttribute('data-theme', prevBodyTheme);
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const copyPageLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pageUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.nombreCompleto.trim()) errors.nombreCompleto = 'El nombre completo es obligatorio.';
    if (!formData.numeroDocumento.trim()) errors.numeroDocumento = 'El número de documento (DNI/CE/Pasaporte) es obligatorio.';
    if (!formData.email.trim() || !formData.email.includes('@')) errors.email = 'Ingresa un correo electrónico válido para recibir tu contrato.';
    if (!formData.telefono.trim()) errors.telefono = 'El teléfono o WhatsApp es obligatorio.';
    if (!formData.casilla1_TerminosNDA) {
      errors.casilla1_TerminosNDA = 'Debes marcar la Casilla 1 (Aceptación del Contrato Unificado, Reglas de Maestría y Comunidad, y Confidencialidad NDA).';
    }
    if (!formData.casilla2_SaludExoneracion) {
      errors.casilla2_SaludExoneracion = 'Debes marcar la Casilla 2 (Declaración Jurada de Salud, Asunción de Riesgos y Exoneración).';
    }
    if (!formData.casilla3_DatosImagen) {
      errors.casilla3_DatosImagen = 'Debes marcar la Casilla 3 (Consentimiento de Datos Personales Ley N° 29733 y Derechos de Imagen).';
    }
    if (!formData.firmaTexto.trim()) {
      errors.firmaTexto = 'Escribe tu nombre completo como manifestación de firma electrónica vinculante.';
    }
    return errors;
  };

  const normalizeDocNum = (val) => String(val || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
  const normalizeEmail = (val) => String(val || '').toLowerCase().trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setDuplicateNotice('');
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstErrorKey = Object.keys(errors)[0];
      const el = document.getElementById(`field-${firstErrorKey}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    try {
      const inputDocNorm = normalizeDocNum(formData.numeroDocumento);
      const inputEmailNorm = normalizeEmail(formData.email);

      // 0. VERIFICACIÓN ANTI-DUPLICADOS: Impedir que una misma persona se registre dos veces
      if (db) {
        const snap = await getDocs(collection(db, 'contratos_maestria_lima'));
        let existingRecord = null;
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          const dbDocNorm = normalizeDocNum(d.numeroDocumento || (d.doc ? d.doc.split(':').pop() : ''));
          const dbEmailNorm = normalizeEmail(d.email);
          if ((inputDocNorm && dbDocNorm && inputDocNorm === dbDocNorm) || (inputEmailNorm && dbEmailNorm && inputEmailNorm === dbEmailNorm)) {
            existingRecord = { id: docSnap.id, ...d };
          }
        });

        if (existingRecord) {
          const existingCode = existingRecord.code || existingRecord.verificationCode || 'CQ-MJ-VERIFIED';
          const existingPassUrl = await generateMaestriaPassCanvas({
            nombre: existingRecord.nombre || existingRecord.nombreCompleto || formData.nombreCompleto.trim(),
            doc: existingRecord.doc || `${existingRecord.tipoDocumento || 'DNI'}: ${existingRecord.numeroDocumento || ''}`,
            rol: existingRecord.rol || existingRecord.rolActividad || 'Participante',
            equipo: existingRecord.equipo || existingRecord.equipoCohorte || 'Equipo 32',
            sede: 'Lima',
            fecha: existingRecord.fecha || 'Registrado',
            codigo: existingCode,
            ip: existingRecord.ip || 'Registrada',
            geoLocation: existingRecord.geoLocation || 'Lima, Perú 🇵🇪',
            coordinates: existingRecord.coordinates || '',
            verificationUrl: `${pageUrl}?verify=${existingCode}`
          });

          setPassDataUrl(existingPassUrl);
          setDuplicateNotice(
            '⚠️ Ya cuentas con un registro legal firmado con este número de documento o correo electrónico. No está permitido registrarse dos veces. A continuación te mostramos tu constancia y Pase Oficial vigente. (Si registraste algún dato por error, solicita al equipo en sala eliminar tu registro previo para poder volver a firmar).'
          );
          setSignedSuccess({
            ...existingRecord,
            nombreCompleto: existingRecord.nombreCompleto || existingRecord.nombre,
            codigo: existingCode
          });
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setIsSubmitting(false);
          return;
        }
      }

      // Asegurar IP y Geolocalización fresca sin excepción
      const currentGeo = geoInfo || await getClientGeoLocation({ forceFresh: true, tryGps: true });
      const isoTimestamp = new Date().toISOString();
      const localFecha = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
      const verificationCode = 'CQ-MJ-' + Math.random().toString(36).substring(2, 7).toUpperCase() + '-' + Date.now().toString().slice(-4);

      const rawStringToHash = JSON.stringify({
        nombre: formData.nombreCompleto.trim(),
        doc: `${formData.tipoDocumento}:${formData.numeroDocumento.trim()}`,
        email: formData.email.trim().toLowerCase(),
        rol: formData.rolActividad,
        equipo: formData.equipoCohorte,
        c1: formData.casilla1_TerminosNDA,
        c2: formData.casilla2_SaludExoneracion,
        c3: formData.casilla3_DatosImagen,
        ip: currentGeo?.ip || 'No detectada',
        coords: currentGeo?.coordinates || '',
        ts: isoTimestamp
      });
      const sha256Hash = await computeSha256(rawStringToHash);

      const verificationUrl = `${pageUrl}?verify=${verificationCode}`;

      // 1. Generar imagen oficial de validación con QR, IP y Geolocalización
      const generatedPassUrl = await generateMaestriaPassCanvas({
        nombre: formData.nombreCompleto.trim(),
        doc: `${formData.tipoDocumento}: ${formData.numeroDocumento.trim()}`,
        rol: formData.rolActividad,
        equipo: formData.equipoCohorte,
        sede: 'Lima',
        fecha: localFecha,
        codigo: verificationCode,
        ip: currentGeo?.ip || 'No detectada',
        geoLocation: currentGeo?.locationString || 'Lima, Perú 🇵🇪',
        coordinates: currentGeo?.coordinates || '',
        verificationUrl
      });

      setPassDataUrl(generatedPassUrl);

      // 2. Guardar registro inalterable en Firestore (con IP y Geolocalización obligatorias)
      const payload = {
        nombre: formData.nombreCompleto.trim(),
        nombreCompleto: formData.nombreCompleto.trim(),
        tipoDocumento: formData.tipoDocumento,
        numeroDocumento: formData.numeroDocumento.trim(),
        numeroDocumentoNorm: inputDocNorm,
        doc: `${formData.tipoDocumento}: ${formData.numeroDocumento.trim()}`,
        email: inputEmailNorm,
        telefono: formData.telefono.trim(),
        rol: formData.rolActividad,
        rolActividad: formData.rolActividad,
        equipo: formData.equipoCohorte,
        equipoCohorte: formData.equipoCohorte,
        sede: 'Lima',
        lugar: 'Lima, Perú — Maestría del Juego & Comunidad CREAR',
        alcanceVigencia: 'Durante toda Maestría del Juego, después de Maestría como miembros de la Comunidad CREAR y por todo el tiempo que la ley peruana lo considere vigente',
        casilla1_TerminosNDA: Boolean(formData.casilla1_TerminosNDA),
        casilla2_SaludExoneracion: Boolean(formData.casilla2_SaludExoneracion),
        casilla3_DatosImagen: Boolean(formData.casilla3_DatosImagen),
        firmaTexto: formData.firmaTexto.trim(),
        fecha: localFecha,
        timestamp: localFecha,
        isoTimestamp,
        code: verificationCode,
        verificationCode,
        sha256Hash,
        // Metadatos Forenses Obligatorios (IP y Geolocalización sin excepción)
        ip: currentGeo?.ip || 'No detectada',
        geoLocation: currentGeo?.locationString || 'Lima, Perú 🇵🇪',
        country: currentGeo?.country || 'Perú',
        countryCode: currentGeo?.countryCode || 'PE',
        city: currentGeo?.city || 'Lima',
        region: currentGeo?.region || 'Lima',
        coordinates: currentGeo?.coordinates || '-12.0464, -77.0428',
        lat: currentGeo?.lat ?? -12.0464,
        lng: currentGeo?.lng ?? -77.0428,
        isp: currentGeo?.isp || '',
        timezone: currentGeo?.timezone || 'America/Lima',
        geoSource: currentGeo?.geoSource || 'IP_LOOKUP',
        device: currentGeo?.device || 'Navegador Web',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        versionContrato: 'MJ-LIMA-UNIFICADO-2026-V2-COMUNIDAD',
        empresa: 'CREACIÓN CUÁNTICA E.I.R.L.',
        ruc: '20612592811',
        createdAt: serverTimestamp()
      };

      if (db) {
        await addDoc(collection(db, 'contratos_maestria_lima'), payload);
      }

      // 3. Envío automático inmediato del contrato y pase por correo electrónico
      const sent = await sendMaestriaConfirmationEmail({
        db,
        toEmail: inputEmailNorm,
        nombre: formData.nombreCompleto.trim(),
        doc: `${formData.tipoDocumento}: ${formData.numeroDocumento.trim()}`,
        rol: formData.rolActividad,
        equipo: formData.equipoCohorte,
        codigo: verificationCode,
        fecha: localFecha,
        passDataUrl: generatedPassUrl,
        telefono: formData.telefono.trim(),
        ip: payload.ip,
        geoLocation: payload.geoLocation,
        coordinates: payload.coordinates,
        device: payload.device,
        sha256Hash
      });

      setEmailSentStatus(sent);
      setSignedSuccess({
        ...payload,
        codigo: verificationCode
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error al registrar firma de Maestría:', err);
      alert('Ocurrió un inconveniente al registrar tu firma. Por favor verifica tu conexión e inténtalo nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSections = SECCIONES_CONTRATO.filter(sec => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      sec.titulo.toLowerCase().includes(q) ||
      sec.resumen.toLowerCase().includes(q) ||
      sec.articulos.some(a => a.subtitulo.toLowerCase().includes(q) || a.contenido.toLowerCase().includes(q))
    );
  });

  return (
    <div
      className="maestria-contract-root"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #050914 0%, #0a1224 50%, #070b14 100%)',
        color: '#f8fafc',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        paddingBottom: '4rem'
      }}
    >
      {/* Blindaje de Contraste CSS de Máxima Especificidad (#root) contra overrides globales de Modo Claro */}
      <style>{`
        html body #root .maestria-contract-root h1,
        html body #root .maestria-contract-root h2,
        html body #root .maestria-contract-root h3,
        html body #root .maestria-contract-root [style*="color: rgb(255, 255, 255)"],
        html body #root .maestria-contract-root [style*="color: #ffffff"] {
          color: #ffffff !important;
        }
        html body #root .maestria-contract-root h4 {
          color: #fef08a !important;
        }
        html body #root .maestria-contract-root p,
        html body #root .maestria-contract-root [style*="color: #e2e8f0"],
        html body #root .maestria-contract-root [style*="color: #f1f5f9"],
        html body #root .maestria-contract-root [style*="color: #f8fafc"],
        html body #root .maestria-contract-root [style*="color: #cbd5e1"] {
          color: #f1f5f9 !important;
        }
        html body #root .maestria-contract-root table {
          width: 100% !important;
          border-collapse: collapse !important;
          background: #070d19 !important;
          color: #f8fafc !important;
        }
        html body #root .maestria-contract-root table thead tr,
        html body #root .maestria-contract-root table th {
          background: #13203d !important;
          color: #fbbf24 !important;
          font-weight: 800 !important;
          border-bottom: 2px solid rgba(245, 158, 11, 0.55) !important;
          text-transform: uppercase !important;
          font-size: 0.78rem !important;
          letter-spacing: 0.04em !important;
        }
        html body #root .maestria-contract-root table tbody tr,
        html body #root .maestria-contract-root table tbody td {
          background: #0a1326 !important;
          color: #f8fafc !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.14) !important;
        }
        html body #root .maestria-contract-root table tbody tr:nth-child(even) td {
          background: #0e1930 !important;
          color: #f8fafc !important;
        }
        html body #root .maestria-contract-root table tbody tr td:first-child {
          color: #ffffff !important;
          font-weight: 800 !important;
        }
        html body #root .maestria-contract-root input:not([type="checkbox"]),
        html body #root .maestria-contract-root select {
          color: #ffffff !important;
          background-color: #060b17 !important;
          border: 1px solid rgba(255, 255, 255, 0.25) !important;
        }
        html body #root .maestria-contract-root select option {
          color: #ffffff !important;
          background-color: #0b1428 !important;
        }
        html body #root .maestria-contract-root input::placeholder {
          color: #94a3b8 !important;
        }
      `}</style>

      {/* Barra Superior Institucional sin botones internos de oficina */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(6, 11, 23, 0.96)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(245, 158, 11, 0.35)',
        padding: '0.85rem 1.5rem'
      }}>
        <div style={{
          maxWidth: '1060px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.8rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.95rem' }}>
            {/* Contenedor de Alto Contraste con Logo Blanco Oficial CREAR */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              padding: '6px 12px',
              borderRadius: '10px',
              border: '1.5px solid #f59e0b',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img
                src="/logo_crear_blanco.png"
                alt="CREAR Poder Sin Límites"
                style={{ height: '40px', width: 'auto', objectFit: 'contain', display: 'block' }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.12em', color: '#fbbf24', textTransform: 'uppercase' }}>
                  CREACIÓN CUÁNTICA E.I.R.L. · RUC 20612592811
                </span>
              </div>
              <h1 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 900, color: '#ffffff' }}>
                Dossier Legal y Reglas de Maestría del Juego — Sede Lima
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.95rem',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.18)',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                color: '#fbbf24',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <QrCode size={15} /> Código QR
            </button>
            <button
              type="button"
              onClick={copyPageLink}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.95rem',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.45)',
                color: '#38bdf8',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {copiedLink ? <Check size={15} /> : <Copy size={15} />}
              {copiedLink ? 'Enlace Copiado' : 'Copiar Link'}
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1020px', margin: '0 auto', padding: '2rem 1.25rem' }}>
        {/* VISTA DE ÉXITO O REGISTRO PREVIO EXISTENTE */}
        {signedSuccess && (
          <div style={{
            background: 'linear-gradient(145deg, rgba(6, 78, 59, 0.4) 0%, rgba(15, 23, 42, 0.98) 100%)',
            border: duplicateNotice ? '2px solid #f59e0b' : '2px solid #10b981',
            borderRadius: '18px',
            padding: '2rem',
            marginBottom: '2.5rem',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
          }}>
            {duplicateNotice && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.18)',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                marginBottom: '1.5rem',
                color: '#fef08a',
                fontSize: '0.88rem',
                fontWeight: 700,
                lineHeight: 1.55,
                textAlign: 'center'
              }}>
                {duplicateNotice}
              </div>
            )}

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '2px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <CheckCircle2 size={36} color="#10b981" />
              </div>
              <span style={{
                display: 'inline-block',
                padding: '0.3rem 0.9rem',
                borderRadius: '999px',
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                marginBottom: '0.5rem'
              }}>
                REGISTRO PROBATORIO VÁLIDO · LEY N° 27269
              </span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '0.3rem 0', color: '#ffffff' }}>
                ¡Contrato y Reglas de Maestría Aceptados!
              </h2>
              <p style={{ color: '#e2e8f0', fontSize: '0.95rem', maxWidth: '640px', margin: '0.5rem auto 0' }}>
                {duplicateNotice
                  ? `Registro verificado a nombre de ${signedSuccess.nombreCompleto || signedSuccess.nombre} (${signedSuccess.email}).`
                  : emailSentStatus
                  ? `Se ha enviado automáticamente una copia del contrato y tu imagen de validación al correo ${signedSuccess.email}.`
                  : `Tu aceptación legal e imagen de validación han quedado registradas para ${signedSuccess.email}.`}
              </p>
            </div>

            {/* Resumen de Metadatos Forenses (IP y Geolocalización) */}
            <div style={{
              background: 'rgba(10, 18, 36, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.75rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              fontSize: '0.84rem'
            }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Titular Declarante</div>
                <div style={{ color: '#ffffff', fontWeight: 800, marginTop: '2px' }}>{signedSuccess.nombreCompleto || signedSuccess.nombre}</div>
                <div style={{ color: '#38bdf8', fontSize: '0.78rem' }}>{signedSuccess.doc} · {signedSuccess.rol}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Cohorte / Código</div>
                <div style={{ color: '#fef08a', fontWeight: 800, marginTop: '2px' }}>{signedSuccess.equipo}</div>
                <div style={{ color: '#fbbf24', fontFamily: 'monospace', fontWeight: 700 }}>{signedSuccess.codigo}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Dirección IP y Geolocalización</div>
                <div style={{ color: '#34d399', fontFamily: 'monospace', fontWeight: 800, marginTop: '2px' }}>IP: {signedSuccess.ip}</div>
                <div style={{ color: '#e2e8f0', fontSize: '0.78rem' }}>{signedSuccess.geoLocation} {signedSuccess.coordinates ? `(${signedSuccess.coordinates})` : ''}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Fecha / Huella SHA-256</div>
                <div style={{ color: '#ffffff', fontWeight: 700, marginTop: '2px' }}>{signedSuccess.fecha}</div>
                <div style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.7rem', wordBreak: 'break-all' }}>
                  {(signedSuccess.sha256Hash || '').slice(0, 28)}...
                </div>
              </div>
            </div>

            {/* Imagen Generada del Pase Oficial */}
            {passDataUrl && (
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <img
                    src={passDataUrl}
                    alt="Pase Oficial de Maestría del Juego"
                    style={{
                      maxWidth: '380px',
                      width: '100%',
                      borderRadius: '14px',
                      border: '2px solid #f59e0b',
                      boxShadow: '0 15px 40px rgba(0, 0, 0, 0.7)'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <a
                    href={passDataUrl}
                    download={`PASE_MAESTRIA_LIMA_${signedSuccess.codigo}.png`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.85rem 1.6rem',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: '#050811',
                      fontWeight: 900,
                      fontSize: '0.92rem',
                      textDecoration: 'none',
                      boxShadow: '0 8px 20px rgba(245, 158, 11, 0.35)'
                    }}
                  >
                    <Download size={18} /> Descargar Imagen de Validación (PNG)
                  </a>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.85rem 1.4rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Printer size={18} /> Imprimir Constancia
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BANNER EJECUTIVO DE INTRODUCCIÓN CON ALTO CONTRASTE */}
        <section style={{
          background: 'linear-gradient(135deg, #0d172e 0%, #132247 100%)',
          border: '1.5px solid rgba(245, 158, 11, 0.45)',
          borderRadius: '18px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div style={{ flex: '1 1 540px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.35rem 0.9rem',
                borderRadius: '999px',
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid rgba(245, 158, 11, 0.55)',
                color: '#fde047',
                fontSize: '0.75rem',
                fontWeight: 900,
                letterSpacing: '0.06em',
                marginBottom: '0.9rem'
              }}>
                <Award size={15} /> DOCUMENTO LEGAL VINCULANTE · CREAR PODER SIN LÍMITES · SEDE LIMA
              </div>
              <h2 style={{ fontSize: '1.9rem', fontWeight: 900, margin: '0 0 0.8rem 0', lineHeight: 1.22, color: '#ffffff' }}>
                <span style={{ color: '#ffffff' }}>Contrato Unificado y Reglas de Sala: </span>
                <span style={{ color: '#fbbf24' }}>Maestría del Juego</span>
              </h2>
              <p style={{ color: '#f1f5f9', fontSize: '0.95rem', lineHeight: 1.65, margin: '0 0 1.1rem 0' }}>
                Instrumento jurídico vinculante aplicable a <strong style={{ color: '#ffffff' }}>Participantes y Managers</strong>{' '}
                <strong style={{ color: '#fde047' }}>durante todo el programa de Maestría del Juego, después de Maestría como personas integrantes de la comunidad CREAR y por todo el tiempo que la legislación peruana lo considere vigente</strong>, suscrito con{' '}
                <strong style={{ color: '#ffffff' }}>CREACIÓN CUÁNTICA E.I.R.L. (RUC N° 20612592811)</strong> bajo la Ley N° 29733, Ley N° 27269 y el Código Civil Peruano.
              </p>

              {/* Indicador en Vivo de Auditoría IP + Geolocalización */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.6rem 1rem',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.14)',
                border: '1px solid rgba(16, 185, 129, 0.45)',
                fontSize: '0.8rem',
                color: '#d1fae5'
              }}>
                <MapPin size={16} color="#34d399" />
                <span>
                  <strong style={{ color: '#34d399' }}>Trazabilidad Forense Activa:</strong>{' '}
                  {loadingGeo
                    ? 'Detectando IP pública y geolocalización...'
                    : `IP ${geoInfo?.ip || 'Registrada'} · ${geoInfo?.locationString || 'Lima, Perú'} (${geoInfo?.coordinates || '-12.0464, -77.0428'})`}
                </span>
              </div>
            </div>

            {/* Tarjeta QR Rápido en Cabecera */}
            <div style={{
              background: '#070d19',
              border: '1.5px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '14px',
              padding: '1rem',
              textAlign: 'center',
              minWidth: '170px'
            }}>
              <img
                src={qrUrl}
                alt="QR Contrato Maestría Lima"
                style={{ width: '124px', height: '124px', borderRadius: '8px', background: '#ffffff', padding: '6px', display: 'block', margin: '0 auto' }}
              />
              <div style={{ fontSize: '0.74rem', color: '#e2e8f0', marginTop: '0.5rem', fontWeight: 700 }}>
                Escanea para abrir en móvil
              </div>
            </div>
          </div>
        </section>

        {/* BUSCADOR DE CLÁUSULAS */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Buscar cláusula, regla de sala, NDA, comunidad, datos personales..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.8rem 1rem 0.8rem 2.6rem',
                borderRadius: '10px',
                background: '#0b1326',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                color: '#ffffff',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>
          <a
            href="#formulario-firma"
            style={{
              padding: '0.8rem 1.4rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#050811',
              fontWeight: 900,
              fontSize: '0.88rem',
              textDecoration: 'none',
              whiteSpace: 'nowrap'
            }}
          >
            Ir a Firma Digital ↓
          </a>
        </div>

        {/* CUERPO ÍNTEGRO DEL DOSSIER LEGAL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
          {filteredSections.map((sec) => (
            <div
              key={sec.id}
              style={{
                background: '#0b1428',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: '14px',
                padding: '1.5rem',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.45rem', flexWrap: 'wrap' }}>
                <span style={{
                  padding: '0.25rem 0.7rem',
                  borderRadius: '6px',
                  background: 'rgba(245, 158, 11, 0.22)',
                  border: '1px solid rgba(245, 158, 11, 0.45)',
                  color: '#fde047',
                  fontSize: '0.74rem',
                  fontWeight: 900,
                  letterSpacing: '0.05em'
                }}>
                  {sec.numero}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#ffffff' }}>
                  {sec.titulo}
                </h3>
              </div>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
                {sec.resumen}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {sec.articulos.map((art, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#060c18',
                      borderLeft: '3.5px solid #f59e0b',
                      borderRadius: '0 10px 10px 0',
                      padding: '1.05rem 1.25rem'
                    }}
                  >
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.96rem', fontWeight: 800, color: '#fef08a' }}>
                      {art.subtitulo}
                    </h4>
                    <div style={{
                      margin: 0,
                      fontSize: '0.89rem',
                      lineHeight: 1.68,
                      color: '#f1f5f9',
                      whiteSpace: 'pre-line'
                    }}>
                      {art.contenido}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* TABLA RESUMEN DE OBLIGACIONES CON ALTO CONTRASTE */}
        <section style={{
          background: '#0b1428',
          border: '1.5px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '14px',
          padding: '1.5rem',
          marginBottom: '2.5rem',
          overflowX: 'auto'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 900, color: '#38bdf8' }}>
            📊 Tabla Resumen de Compromisos Legales y de Comunidad (Participantes y Managers)
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', background: '#070d19' }}>
            <thead>
              <tr style={{ background: '#13203d', borderBottom: '2px solid rgba(245, 158, 11, 0.45)', textAlign: 'left' }}>
                <th style={{ padding: '0.85rem 1rem', color: '#fbbf24', fontWeight: 900 }}>Módulo del Contrato</th>
                <th style={{ padding: '0.85rem 1rem', color: '#fbbf24', fontWeight: 900 }}>Normativa Aplicable</th>
                <th style={{ padding: '0.85rem 1rem', color: '#fbbf24', fontWeight: 900 }}>Compromiso Clave y Vigencia</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#ffffff', background: '#0a1326' }}>Metodología de Inmersión</td>
                <td style={{ padding: '0.85rem 1rem', color: '#e2e8f0', background: '#0a1326' }}>Marco Privado de Capacitación</td>
                <td style={{ padding: '0.85rem 1rem', color: '#f1f5f9', background: '#0a1326' }}>Inmersión contextual de alto rendimiento; no equivale a terapia psicológica ni consulta médica.</td>
              </tr>
              <tr>
                <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#ffffff', background: '#0e1930' }}>Confidencialidad NDA y Comunidad</td>
                <td style={{ padding: '0.85rem 1rem', color: '#e2e8f0', background: '#0e1930' }}>Ley N° 29733 / Código Civil Peruano</td>
                <td style={{ padding: '0.85rem 1rem', color: '#f1f5f9', background: '#0e1930' }}>Reserva absoluta de dinámicas y vivencias durante toda Maestría, después de Maestría como miembros de la comunidad y por todo el tiempo que la ley peruana lo considere vigente.</td>
              </tr>
              <tr>
                <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#ffffff', background: '#0a1326' }}>Conducta y Reglas Éticas</td>
                <td style={{ padding: '0.85rem 1rem', color: '#e2e8f0', background: '#0a1326' }}>Reglamento de Maestría y Comunidad CREAR</td>
                <td style={{ padding: '0.85rem 1rem', color: '#f1f5f9', background: '#0a1326' }}>Cero alcohol/drogas, cero grabaciones, prohibición de préstamos/negocios/apuestas entre miembros, no parejas nuevas en el proceso y &gt;80% asistencia.</td>
              </tr>
              <tr>
                <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#ffffff', background: '#0e1930' }}>Exoneración Legal y Salud</td>
                <td style={{ padding: '0.85rem 1rem', color: '#e2e8f0', background: '#0e1930' }}>Código Civil D.Leg. N° 295</td>
                <td style={{ padding: '0.85rem 1rem', color: '#f1f5f9', background: '#0e1930' }}>Declaración jurada de aptitud psicofísica, asunción de riesgos y deslinde irrevocable de responsabilidad a Creación Cuántica E.I.R.L.</td>
              </tr>
              <tr>
                <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#ffffff', background: '#0a1326' }}>Firma Digital y Trazabilidad</td>
                <td style={{ padding: '0.85rem 1rem', color: '#e2e8f0', background: '#0a1326' }}>Ley N° 27269 / D.S. N° 016-2024-JUS</td>
                <td style={{ padding: '0.85rem 1rem', color: '#f1f5f9', background: '#0a1326' }}>Validez jurídica plena con captura obligatoria de IP pública, geolocalización, sello de tiempo y huella SHA-256.</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* FORMULARIO DE ACEPTACIÓN CLICKWRAP Y FIRMA DIGITAL */}
        <section
          id="formulario-firma"
          ref={formRef}
          style={{
            background: 'linear-gradient(180deg, #0d172e 0%, #070d19 100%)',
            border: '2px solid rgba(245, 158, 11, 0.55)',
            borderRadius: '18px',
            padding: '2rem',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
          }}
        >
          <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: '1rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              SUSCRIPCIÓN DIGITAL VINCULANTE · LEY N° 27269 · REGISTRO ÚNICO POR PERSONA
            </span>
            <h2 style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: 900, color: '#ffffff' }}>
              Formulario de Aceptación de Reglas y Emisión de Pase Oficial
            </h2>
            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.88rem', color: '#cbd5e1' }}>
              Al completar y firmar, recibirás de inmediato en tu correo el contrato aceptado y tu imagen oficial de validación con código QR. Cada participante o manager solo puede registrarse una única vez.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.15rem',
              marginBottom: '1.5rem'
            }}>
              {/* Nombre Completo */}
              <div id="field-nombreCompleto">
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.4rem' }}>
                  Nombre y Apellidos Completos *
                </label>
                <input
                  type="text"
                  name="nombreCompleto"
                  value={formData.nombreCompleto}
                  onChange={handleInputChange}
                  placeholder="Ej. Juan Carlos Pérez Gómez"
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.9rem',
                    borderRadius: '10px',
                    background: '#060b17',
                    border: formErrors.nombreCompleto ? '1.5px solid #ef4444' : '1px solid rgba(255,255,255,0.22)',
                    color: '#ffffff',
                    fontSize: '0.9rem'
                  }}
                />
                {formErrors.nombreCompleto && (
                  <p style={{ color: '#f87171', fontSize: '0.76rem', margin: '0.3rem 0 0 0' }}>{formErrors.nombreCompleto}</p>
                )}
              </div>

              {/* Tipo y Número de Documento */}
              <div id="field-numeroDocumento" style={{ display: 'flex', gap: '0.6rem' }}>
                <div style={{ width: '105px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.4rem' }}>
                    Tipo Doc.
                  </label>
                  <select
                    name="tipoDocumento"
                    value={formData.tipoDocumento}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.6rem',
                      borderRadius: '10px',
                      background: '#060b17',
                      border: '1px solid rgba(255,255,255,0.22)',
                      color: '#ffffff',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="DNI">DNI</option>
                    <option value="CE">CE</option>
                    <option value="Pasaporte">Pasaporte</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.4rem' }}>
                    N° de Documento *
                  </label>
                  <input
                    type="text"
                    name="numeroDocumento"
                    value={formData.numeroDocumento}
                    onChange={handleInputChange}
                    placeholder="Ej. 45678912"
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.9rem',
                      borderRadius: '10px',
                      background: '#060b17',
                      border: formErrors.numeroDocumento ? '1.5px solid #ef4444' : '1px solid rgba(255,255,255,0.22)',
                      color: '#ffffff',
                      fontSize: '0.9rem'
                    }}
                  />
                  {formErrors.numeroDocumento && (
                    <p style={{ color: '#f87171', fontSize: '0.76rem', margin: '0.3rem 0 0 0' }}>{formErrors.numeroDocumento}</p>
                  )}
                </div>
              </div>

              {/* Correo Electrónico */}
              <div id="field-email">
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.4rem' }}>
                  Correo Electrónico (Recepción de Contrato y Pase) *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="tucorreo@ejemplo.com"
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.9rem',
                    borderRadius: '10px',
                    background: '#060b17',
                    border: formErrors.email ? '1.5px solid #ef4444' : '1px solid rgba(255,255,255,0.22)',
                    color: '#ffffff',
                    fontSize: '0.9rem'
                  }}
                />
                {formErrors.email && (
                  <p style={{ color: '#f87171', fontSize: '0.76rem', margin: '0.3rem 0 0 0' }}>{formErrors.email}</p>
                )}
              </div>

              {/* Teléfono / WhatsApp */}
              <div id="field-telefono">
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.4rem' }}>
                  Teléfono / WhatsApp *
                </label>
                <input
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  placeholder="Ej. +51 999 888 777"
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.9rem',
                    borderRadius: '10px',
                    background: '#060b17',
                    border: formErrors.telefono ? '1.5px solid #ef4444' : '1px solid rgba(255,255,255,0.22)',
                    color: '#ffffff',
                    fontSize: '0.9rem'
                  }}
                />
                {formErrors.telefono && (
                  <p style={{ color: '#f87171', fontSize: '0.76rem', margin: '0.3rem 0 0 0' }}>{formErrors.telefono}</p>
                )}
              </div>

              {/* Rol en Maestría */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.4rem' }}>
                  Calidad / Rol en Sala *
                </label>
                <select
                  name="rolActividad"
                  value={formData.rolActividad}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.9rem',
                    borderRadius: '10px',
                    background: '#060b17',
                    border: '1px solid rgba(255,255,255,0.22)',
                    color: '#ffffff',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="Participante">Participante de Maestría del Juego</option>
                  <option value="Manager">Manager (Equipo de Liderazgo)</option>
                  <option value="Capitán">Capitán de Equipo</option>
                  <option value="Partner de Soporte">Partner de Soporte en Sala</option>
                </select>
              </div>

              {/* Equipo / Cohorte */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.4rem' }}>
                  Cohorte / Equipo en Lima *
                </label>
                <select
                  name="equipoCohorte"
                  value={formData.equipoCohorte}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.9rem',
                    borderRadius: '10px',
                    background: '#060b17',
                    border: '1px solid rgba(255,255,255,0.22)',
                    color: '#ffffff',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="Equipo 32 — Sede Lima (Cohorte Actual)">Equipo 32 — Sede Lima (Cohorte Actual)</option>
                  <option value="Equipo 31 — Imperio del Éxito">Equipo 31 — Imperio del Éxito</option>
                  <option value="Equipo 30 — Tinkuy Ruray">Equipo 30 — Tinkuy Ruray</option>
                  <option value="Equipo 29 — Quantum Phoenix">Equipo 29 — Quantum Phoenix</option>
                  <option value="Otra Cohorte / Rezagado Autorizado">Otra Cohorte / Rezagado Autorizado</option>
                </select>
              </div>
            </div>

            {/* 3 CASILLAS CLICKWRAP OBLIGATORIAS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem', marginBottom: '1.5rem' }}>
              <div
                id="field-casilla1_TerminosNDA"
                style={{
                  background: formData.casilla1_TerminosNDA ? 'rgba(16, 185, 129, 0.12)' : '#060b17',
                  border: formErrors.casilla1_TerminosNDA
                    ? '1.5px solid #ef4444'
                    : formData.casilla1_TerminosNDA
                    ? '1.5px solid #10b981'
                    : '1px solid rgba(255,255,255,0.18)',
                  borderRadius: '12px',
                  padding: '1rem 1.15rem'
                }}
              >
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="casilla1_TerminosNDA"
                    checked={formData.casilla1_TerminosNDA}
                    onChange={handleInputChange}
                    style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: '#10b981', cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '0.87rem', lineHeight: 1.58, color: '#f8fafc' }}>
                    <strong style={{ color: '#fbbf24' }}>CASILLA 1 (DOC 1) — Aceptación de Términos, Reglas de Maestría, Comunidad y Confidencialidad NDA (Obligatorio):</strong>{' '}
                    Declaro haber leído y acepto íntegramente el Contrato Unificado, el Marco Metodológico de Alto Rendimiento (reconociendo que no equivale a terapia psicológica ni médica), el Pacto de No Divulgación y el Secreto de Comunidad aplicables <strong>durante toda Maestría del Juego, después de Maestría como integrante de la comunidad CREAR y por todo el tiempo que la ley peruana lo considere vigente</strong>; así como la prohibición estricta de grabaciones, cero alcohol/drogas, prohibición de préstamos/negocios/apuestas entre miembros, cero nuevas relaciones de pareja durante el proceso y asistencia mínima &gt;80%.
                  </div>
                </label>
                {formErrors.casilla1_TerminosNDA && (
                  <p style={{ color: '#f87171', fontSize: '0.76rem', margin: '0.4rem 0 0 2rem' }}>{formErrors.casilla1_TerminosNDA}</p>
                )}
              </div>

              <div
                id="field-casilla2_SaludExoneracion"
                style={{
                  background: formData.casilla2_SaludExoneracion ? 'rgba(16, 185, 129, 0.12)' : '#060b17',
                  border: formErrors.casilla2_SaludExoneracion
                    ? '1.5px solid #ef4444'
                    : formData.casilla2_SaludExoneracion
                    ? '1.5px solid #10b981'
                    : '1px solid rgba(255,255,255,0.18)',
                  borderRadius: '12px',
                  padding: '1rem 1.15rem'
                }}
              >
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="casilla2_SaludExoneracion"
                    checked={formData.casilla2_SaludExoneracion}
                    onChange={handleInputChange}
                    style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: '#10b981', cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '0.87rem', lineHeight: 1.58, color: '#f8fafc' }}>
                    <strong style={{ color: '#fbbf24' }}>CASILLA 2 (DOC 2) — Declaración Jurada de Salud, Asunción de Riesgos y Exoneración (Obligatorio):</strong>{' '}
                    Declaro bajo juramento encontrarme en plenas facultades físicas y psicológicas para participar en Maestría del Juego, asumiendo la responsabilidad de mis actos y otorgando exoneración amplia e irrevocable de responsabilidad a CREACIÓN CUÁNTICA E.I.R.L. (RUC 20612592811) conforme a la legislación peruana vigente.
                  </div>
                </label>
                {formErrors.casilla2_SaludExoneracion && (
                  <p style={{ color: '#f87171', fontSize: '0.76rem', margin: '0.4rem 0 0 2rem' }}>{formErrors.casilla2_SaludExoneracion}</p>
                )}
              </div>

              <div
                id="field-casilla3_DatosImagen"
                style={{
                  background: formData.casilla3_DatosImagen ? 'rgba(16, 185, 129, 0.12)' : '#060b17',
                  border: formErrors.casilla3_DatosImagen
                    ? '1.5px solid #ef4444'
                    : formData.casilla3_DatosImagen
                    ? '1.5px solid #10b981'
                    : '1px solid rgba(255,255,255,0.18)',
                  borderRadius: '12px',
                  padding: '1rem 1.15rem'
                }}
              >
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="casilla3_DatosImagen"
                    checked={formData.casilla3_DatosImagen}
                    onChange={handleInputChange}
                    style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: '#10b981', cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '0.87rem', lineHeight: 1.58, color: '#f8fafc' }}>
                    <strong style={{ color: '#fbbf24' }}>CASILLA 3 (DOC 3) — Consentimiento de Tratamiento de Datos Personales e Imagen (Obligatorio):</strong>{' '}
                    Autorizo de manera libre, previa, expresa e informada el tratamiento de mis datos personales conforme a la Ley N° 29733 y D.S. N° 016-2024-JUS, el uso institucional de derechos de imagen grupal y el registro probatorio de mi dirección IP pública y geolocalización.
                  </div>
                </label>
                {formErrors.casilla3_DatosImagen && (
                  <p style={{ color: '#f87171', fontSize: '0.76rem', margin: '0.4rem 0 0 2rem' }}>{formErrors.casilla3_DatosImagen}</p>
                )}
              </div>
            </div>

            {/* FIRMA DIGITAL ESCRITA */}
            <div id="field-firmaTexto" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#fef08a', marginBottom: '0.4rem' }}>
                Firma Electrónica Vinculante (Escribe tu Nombre y Apellidos Completos igual a tu documento) *
              </label>
              <input
                type="text"
                name="firmaTexto"
                value={formData.firmaTexto}
                onChange={handleInputChange}
                placeholder="Escribe aquí tu nombre completo para firmar digitalmente..."
                style={{
                  width: '100%',
                  padding: '0.9rem 1rem',
                  borderRadius: '10px',
                  background: '#060b17',
                  border: formErrors.firmaTexto ? '1.5px solid #ef4444' : '1.5px solid rgba(245, 158, 11, 0.55)',
                  color: '#fbbf24',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  fontFamily: "'Georgia', serif"
                }}
              />
              {formErrors.firmaTexto && (
                <p style={{ color: '#f87171', fontSize: '0.76rem', margin: '0.3rem 0 0 0' }}>{formErrors.firmaTexto}</p>
              )}
            </div>

            {/* Sello de Metadatos Forenses antes de enviar */}
            <div style={{
              background: '#060b17',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              marginBottom: '1.5rem',
              fontSize: '0.78rem',
              color: '#cbd5e1',
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <span>🔒 <strong style={{ color: '#ffffff' }}>IP Pública:</strong> {geoInfo?.ip || 'Detectada al firmar'}</span>
              <span>📍 <strong style={{ color: '#ffffff' }}>Geolocalización:</strong> {geoInfo?.locationString || 'Lima, Perú'} ({geoInfo?.coordinates || '-12.0464, -77.0428'})</span>
              <span>💻 <strong style={{ color: '#ffffff' }}>Entorno:</strong> {geoInfo?.device || 'Navegador Web'}</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '1.05rem 1.5rem',
                borderRadius: '12px',
                background: isSubmitting
                  ? '#475569'
                  : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#050811',
                fontWeight: 900,
                fontSize: '1.02rem',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 10px 25px rgba(245, 158, 11, 0.35)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}
            >
              {isSubmitting
                ? 'Verificando Identidad, Generando Pase y Enviando Contrato por Correo...'
                : '👑 Firmar Contrato, Generar Imagen de Validación y Recibir en mi Correo'}
            </button>
          </form>
        </section>
      </main>

      {/* MODAL QR */}
      {showQrModal && (
        <div
          onClick={() => setShowQrModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0b1428',
              border: '2px solid #f59e0b',
              borderRadius: '18px',
              padding: '2rem',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center'
            }}
          >
            <h3 style={{ margin: '0 0 0.4rem 0', color: '#fbbf24', fontSize: '1.2rem', fontWeight: 800 }}>
              Código QR Oficial — Reglas de Maestría
            </h3>
            <p style={{ margin: '0 0 1.2rem 0', fontSize: '0.84rem', color: '#e2e8f0' }}>
              Escanea este código con la cámara de tu celular para abrir y firmar el Contrato Unificado de Maestría del Juego (Sede Lima).
            </p>
            <div style={{
              background: '#ffffff',
              padding: '1rem',
              borderRadius: '14px',
              display: 'inline-block',
              marginBottom: '1.2rem'
            }}>
              <img src={qrUrl} alt="QR Contrato Maestría" style={{ width: '240px', height: '240px', display: 'block' }} />
            </div>
            <div style={{ fontSize: '0.76rem', color: '#cbd5e1', wordBreak: 'break-all', marginBottom: '1.2rem' }}>
              {pageUrl}
            </div>
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#ffffff',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
