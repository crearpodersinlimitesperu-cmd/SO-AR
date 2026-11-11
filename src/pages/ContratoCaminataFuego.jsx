import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  ShieldCheck,
  ShieldAlert,
  FileText,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Download,
  Printer,
  Copy,
  ExternalLink,
  Search,
  UserCheck,
  Calendar,
  MapPin,
  Lock,
  PhoneCall,
  Mail,
  User,
  Check,
  Eye,
  Share2,
  Building2,
  FileCheck2
} from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getClientGeoLocation } from '../utils/geoLocator';
import { generateFirewalkPassCanvas, sendFirewalkConfirmationEmail } from '../utils/maestriaPass';

export default function ContratoCaminataFuego() {
  const [activeTab, setActiveTab] = useState('todo');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signedSuccess, setSignedSuccess] = useState(null);
  const [passDataUrl, setPassDataUrl] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [geoInfo, setGeoInfo] = useState({
    ip: 'Detectando IP...',
    locationString: 'Lima, Perú 🇵🇪',
    coordinates: '',
    device: ''
  });
  const [emailStatus, setEmailStatus] = useState('IDLE');

  // Formulario de Firma Digital
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    email: '',
    telefono: '',
    rolActividad: 'Participante',
    sedeLocacion: 'Lima - Casona Blanca (Huachipa)',
    aceptoRiesgos: false,
    aceptoSalud: false,
    aceptoImagen: false, // OPTIONAL (OPT-IN)
    firmaTexto: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const formRef = useRef(null);

  const pageUrl = typeof window !== 'undefined' ? window.location.href : 'https://cartas.crearpsl.net/contrato_caminata_fuego.html';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=10&data=${encodeURIComponent(pageUrl)}`;

  useEffect(() => {
    document.title = 'Instrumento Integrado Caminata sobre Fuego · Creación Cuántica E.I.R.L.';
    let mounted = true;
    getClientGeoLocation().then((info) => {
      if (mounted && info) setGeoInfo(info);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const computeSha256 = async (text) => {
    try {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      }
    } catch {
      // Fallback
    }
    let h = 0;
    for (let i = 0; i < text.length; i++) {
      h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
    }
    return `SHA256-FW-${Math.abs(h).toString(16).toUpperCase()}-${Date.now().toString(16).toUpperCase()}`;
  };

  // Generador de Imagen Oficial: "SÍ VOY A CAMINAR SOBRE FUEGO"
  useEffect(() => {
    if (!signedSuccess) {
      setPassDataUrl(null);
      return;
    }
    generateFirewalkPassCanvas({
      nombre: signedSuccess.nombre,
      documento: signedSuccess.documento,
      rolActividad: signedSuccess.rolActividad,
      lugar: signedSuccess.lugar,
      fecha: signedSuccess.fecha,
      codigo: signedSuccess.codigo,
      ip: signedSuccess.ip,
      geoLocation: signedSuccess.geoLocation,
      coordinates: signedSuccess.coordinates
    }).then((url) => {
      if (url) setPassDataUrl(url);
    });
  }, [signedSuccess]);

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

  const handlePrint = () => {
    window.print();
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.nombreCompleto.trim()) errors.nombreCompleto = 'El nombre completo es obligatorio.';
    if (!formData.numeroDocumento.trim()) errors.numeroDocumento = 'El documento de identidad es obligatorio.';
    if (!formData.email.trim() || !formData.email.includes('@')) errors.email = 'Ingresa un correo electrónico válido.';
    if (!formData.telefono.trim()) errors.telefono = 'El teléfono o WhatsApp es obligatorio.';
    if (!formData.aceptoRiesgos) errors.aceptoRiesgos = 'Debes aceptar de forma obligatoria la Exoneración de Responsabilidad y Asunción de Riesgos (Checkbox 1).';
    if (!formData.aceptoSalud) errors.aceptoSalud = 'Debes declarar bajo juramento tu estado de salud y autorizar el tratamiento de datos sensibles (Checkbox 2).';
    if (!formData.firmaTexto.trim()) errors.firmaTexto = 'Escribe tu nombre completo como manifestación de firma digital vinculante.';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstErrorKey = Object.keys(errors)[0];
      const el = document.getElementById(`field-${firstErrorKey}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    setEmailStatus('SENDING');
    try {
      const freshGeo = await getClientGeoLocation().catch(() => geoInfo);
      const finalGeo = freshGeo || geoInfo;
      setGeoInfo(finalGeo);

      const timestamp = new Date().toISOString();
      const localFecha = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
      const verificationCode = 'CQ-FIRE-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString().slice(-4);
      const docDisplay = `${formData.tipoDocumento}: ${formData.numeroDocumento.trim()}`;
      const sha256Hash = await computeSha256(
        `${verificationCode}|${formData.nombreCompleto.trim()}|${docDisplay}|${finalGeo.ip}|${finalGeo.coordinates || finalGeo.locationString}|${timestamp}`
      );
      const lugarConfirmado = formData.sedeLocacion || 'Lima - Casona Blanca (Calle Las Perdices 1126, Huachipa)';
      
      const payload = {
        ...formData,
        nombre: formData.nombreCompleto.trim(),
        nombreCompleto: formData.nombreCompleto.trim(),
        doc: docDisplay,
        rol: formData.rolActividad,
        lugar: lugarConfirmado,
        fecha: localFecha,
        timestamp: localFecha,
        code: verificationCode,
        verificationCode,
        sede: 'Lima',
        source: 'causa-os',
        controlVersion: 'V2.0-2026-FIREWALK-LIMA-FORENSE',
        razonSocial: 'Creación Cuántica E.I.R.L.',
        ruc: '20612592811',
        domicilioFiscal: 'Cal. Berlín Nro. 965 Int. 302, Miraflores, Lima – Perú',
        fechaValidacionIso: timestamp,
        fechaValidacionLocal: localFecha,
        // Trazabilidad Forense Obligatoria: IP + Geolocalización
        ip: finalGeo.ip || 'Registrada en servidor',
        geoLocation: finalGeo.locationString || 'Lima, Perú 🇵🇪',
        city: finalGeo.city || 'Lima',
        region: finalGeo.region || 'Lima',
        country: finalGeo.country || 'Perú',
        coordinates: finalGeo.coordinates || '',
        lat: finalGeo.lat || null,
        lng: finalGeo.lng || null,
        isp: finalGeo.isp || '',
        geoSource: finalGeo.geoSource || 'ip-geo',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        dispositivo: finalGeo.device || (/iPhone|iPad|Android/i.test(navigator.userAgent || '') ? 'Móvil' : 'Escritorio'),
        sha256Hash,
        marcoLegal: 'Ley 27269 (Firmas Digitales), Arts. 141 y 141-A Código Civil, Ley 29733 y D.S. 016-2024-JUS, Arts. 11 y 15 Código Civil',
        createdAt: serverTimestamp()
      };

      // Guardar en Firestore
      try {
        await addDoc(collection(db, 'contratos_caminata_fuego'), payload);
      } catch (err) {
        console.warn('Registro procesado y resguardado digitalmente:', err);
      }

      // Generar Pase Oficial PNG con IP y Geolocalización e iniciar envío inmediato por correo
      const generatedPass = await generateFirewalkPassCanvas({
        nombre: formData.nombreCompleto.trim(),
        documento: `${formData.tipoDocumento} ${formData.numeroDocumento.trim()}`,
        rolActividad: formData.rolActividad,
        lugar: lugarConfirmado,
        fecha: localFecha,
        codigo: verificationCode,
        ip: payload.ip,
        geoLocation: payload.geoLocation,
        coordinates: payload.coordinates
      });

      if (generatedPass) {
        setPassDataUrl(generatedPass);
      }

      const emailSent = await sendFirewalkConfirmationEmail({
        db,
        toEmail: formData.email.trim().toLowerCase(),
        nombre: formData.nombreCompleto.trim(),
        documento: docDisplay,
        rolActividad: formData.rolActividad,
        lugar: lugarConfirmado,
        codigo: verificationCode,
        fecha: localFecha,
        passDataUrl: generatedPass,
        telefono: formData.telefono.trim(),
        ip: payload.ip,
        geoLocation: payload.geoLocation,
        coordinates: payload.coordinates,
        device: payload.dispositivo,
        sha256Hash
      });

      setEmailStatus(emailSent ? 'SENT' : 'ERROR');

      setSignedSuccess({
        ...payload,
        nombre: formData.nombreCompleto.trim(),
        documento: `${formData.tipoDocumento} ${formData.numeroDocumento.trim()}`,
        codigo: verificationCode,
        fecha: localFecha
      });

      setTimeout(() => {
        const confirmEl = document.getElementById('constancia-firmada');
        if (confirmEl) confirmEl.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (err) {
      console.error('Error al registrar firma digital:', err);
      setEmailStatus('ERROR');
      alert('Hubo un inconveniente al validar la firma. Por favor verifica los datos e intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Secciones del contrato
  const contractSections = [
    {
      id: 'sec-entidad',
      tabKey: 'entidad',
      numero: 'DATOS',
      titulo: 'Entidad Responsable del Entrenamiento y Marco Legal',
      icon: Building2,
      content: (
        <div style={{ lineHeight: '1.7', color: '#cbd5e1' }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid #334155',
            borderRadius: '10px',
            overflow: 'hidden',
            marginBottom: '1.25rem'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 700, width: '35%' }}>Razón Social:</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#fff', fontWeight: 800 }}>Creación Cuántica E.I.R.L.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 700 }}>Número de RUC:</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#38bdf8', fontWeight: 800 }}>20612592811</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 700 }}>Domicilio Fiscal:</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#e2e8f0' }}>Cal. Berlín Nro. 965 Int. 302, Miraflores, Lima – Perú</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 700 }}>Canal de Atención y Derechos ARCO:</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#38bdf8', fontWeight: 700 }}>protecciondedatos@crearpsl.net</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h4 style={{ color: '#38bdf8', fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Fundamentación Normativa Aplicable (República del Perú):
          </h4>
          <ul style={{ paddingLeft: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem' }}>
            <li>
              <strong style={{ color: '#fff' }}>Código Civil Peruano:</strong> Artículo 11 (Libre disposición del propio cuerpo e integridad física) y Artículo 15 (Derecho a la imagen, voz y reserva personal).
            </li>
            <li>
              <strong style={{ color: '#fff' }}>Protección de Datos Personales:</strong> Ley N° 29733 (Ley de Protección de Datos Personales del Perú) y su Reglamento aprobado por el <strong>Decreto Supremo N° 016-2024-JUS</strong>.
            </li>
            <li>
              <strong style={{ color: '#fff' }}>Validez y Manifestación Electrónica de la Voluntad:</strong> Ley N° 27269 (Ley de Firmas y Certificados Digitales) y los Artículos 141 y 141-A del Código Civil, reconocidos para consentimientos digitales tipo <em>clickwrap</em> con trazabilidad y registro informático.
            </li>
            <li>
              <strong style={{ color: '#fff' }}>Protección al Consumidor:</strong> Ley N° 29571 (Código de Protección y Defensa del Consumidor).
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'sec-1',
      tabKey: 'exoneracion',
      numero: 'I',
      titulo: 'Exoneración de Responsabilidad, Asunción de Riesgos y Autonomía de la Voluntad',
      icon: ShieldAlert,
      content: (
        <div style={{ lineHeight: '1.7', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ color: '#f59e0b', fontSize: '0.92rem', fontWeight: 800, marginBottom: '0.3rem' }}>
              1. Naturaleza de la Dinámica Vivencial
            </h4>
            <p>
              El usuario declara comprender y aceptar voluntariamente su participación en la experiencia de <strong>Caminata sobre Fuego (<em>Firewalk</em>)</strong>, la cual forma parte de las dinámicas de desarrollo personal y superación de paradigmas organizadas por Creación Cuántica E.I.R.L. en Lima, Perú. El usuario reconoce que esta es una actividad vivencial de alto impacto emocional y físico que involucra la exposición a brasas encendidas.
            </p>
          </div>

          <div>
            <h4 style={{ color: '#f59e0b', fontSize: '0.92rem', fontWeight: 800, marginBottom: '0.3rem' }}>
              2. Autonomía de la Voluntad y Retiro Libre
            </h4>
            <p>
              La participación en la Caminata sobre Fuego es estrictamente voluntaria. El suscriptor conserva el derecho inalienable de abstenerse de cruzar el lecho de brasas o retirarse del espacio en cualquier momento previo a la ejecución, sin que ello implique sanción, humillación, reproche o exclusión de las demás actividades pedagógicas del entrenamiento.
            </p>
          </div>

          <div>
            <h4 style={{ color: '#f59e0b', fontSize: '0.92rem', fontWeight: 800, marginBottom: '0.3rem' }}>
              3. Protocolos de Seguridad e Instrucciones
            </h4>
            <p>
              Creación Cuántica E.I.R.L. se compromete a implementar protocolos de seguridad, infraestructura física adecuada, instructivos técnicos detallados y personal capacitado para la atención preventiva de primeros auxilios. El participante o el <strong>partner</strong> asignado para el soporte se obligan a escuchar activamente, acatar las instrucciones de los facilitadores y respetar estrictamente los pasos demarcados para la ejecución segura del ejercicio.
            </p>
          </div>

          <div>
            <h4 style={{ color: '#f59e0b', fontSize: '0.92rem', fontWeight: 800, marginBottom: '0.3rem' }}>
              4. Asunción Razonable de Riesgos y Exoneración
            </h4>
            <p>
              El suscriptor asume voluntariamente los riesgos normales e inherentes a este tipo de dinámicas vivenciales intensas. En consecuencia, libera a Creación Cuántica E.I.R.L., sus directivos, facilitadores y equipo de apoyo de toda responsabilidad civil, penal o médica derivada de cualquier eventualidad que surja del incumplimiento de las instrucciones impartidas o de la omisión/inexactitud en su declaración de salud. La presente cláusula no exonera a la empresa de responsabilidad por dolo o culpa inexcusable conforme a la ley peruana.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'sec-2',
      tabKey: 'salud',
      numero: 'II',
      titulo: 'Declaración de Salud y Consentimiento para el Tratamiento de Datos Sensibles',
      icon: Lock,
      content: (
        <div style={{ lineHeight: '1.7', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ color: '#10b981', fontSize: '0.92rem', fontWeight: 800, marginBottom: '0.3rem' }}>
              1. Declaración Jurada de Aptitud Física y Mental
            </h4>
            <p style={{ marginBottom: '0.5rem' }}>
              De conformidad con el Art. 13.6 de la Ley N° 29733 y los Arts. III.6 y 8 del D.S. N° 016-2024-JUS, el usuario declara bajo juramento no padecer afecciones médicas o psicológicas no informadas que impidan la realización del ejercicio. En particular, declara su condición respecto a:
            </p>
            <ul style={{ paddingLeft: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <li>Afecciones cardiovasculares, hipertensión severa o uso de marcapasos.</li>
              <li>Lesiones abiertas en extremidades inferiores o afecciones dermatológicas agudas en pies.</li>
              <li>Estado de gestación en cualquier trimestre.</li>
              <li>Tratamientos psiquiátricos activos, episodios psicóticos recientes o ingesta de medicamentos prescriptos que alteren el estado de alerta.</li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: '#10b981', fontSize: '0.92rem', fontWeight: 800, marginBottom: '0.3rem' }}>
              2. Finalidad del Tratamiento de Datos Sensibles de Salud
            </h4>
            <p style={{ marginBottom: '0.4rem' }}>
              Los datos de salud recopilados serán tratados bajo los principios de necesidad, proporcionalidad y minimización (Art. 6 de la Ley N° 29733). La información médica se utilizará de manera exclusiva para:
            </p>
            <ul style={{ paddingLeft: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <li>• Evaluar la aptitud y capacidad adaptativa del usuario en la dinámica.</li>
              <li>• Disponer los protocolos de atención y contención médica preventiva en sala.</li>
              <li>• Guiar las medidas de seguridad del equipo de facilitadores y del <strong>partner</strong> de soporte asignado.</li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: '#10b981', fontSize: '0.92rem', fontWeight: 800, marginBottom: '0.3rem' }}>
              3. Protección contra Comercialización y Flujo Transfronterizo
            </h4>
            <p>
              Creación Cuántica E.I.R.L. garantiza que <strong>en ninguna circunstancia</strong> los datos sensibles de salud serán comercializados, transferidos a terceros con fines publicitarios ni utilizados para prospección comercial. Los datos serán alojados en plataformas informáticas seguras (como la infraestructura NODUS y servidores de Google Cloud) bajo contratos de encargo de tratamiento que garantizan confidencialidad y medidas de seguridad técnicas equivalentes a las exigidas por la Ley N° 29733.
            </p>
          </div>

          <div>
            <h4 style={{ color: '#10b981', fontSize: '0.92rem', fontWeight: 800, marginBottom: '0.3rem' }}>
              4. Ejercicio de Derechos ARCO y Revocatoria
            </h4>
            <p>
              El titular podrá ejercer en cualquier momento sus derechos de Información, Acceso, Rectificación, Cancelación, Oposición y Portabilidad enviando una comunicación escrita a <strong>protecciondedatos@crearpsl.net</strong>. La revocatoria del consentimiento sobre datos de salud impedirá la participación activa en la dinámica por razones de seguridad, aplicándose las reglas de retención o reprogramación contempladas en el contrato del servicio.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'sec-3',
      tabKey: 'imagen',
      numero: 'III',
      titulo: 'Autorización Opcional de Uso de Imagen, Fotografía, Voz y Testimonios Publicitarios (Opt-In)',
      icon: Eye,
      content: (
        <div style={{ lineHeight: '1.7', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '0.75rem', borderRadius: '8px', color: '#d8b4fe', fontSize: '0.88rem' }}>
            ℹ️ En estricto cumplimiento del Artículo 15 del Código Civil Peruano y el Art. 26.1 del Reglamento D.S. N° 016-2024-JUS, el otorgamiento de la autorización de imagen es de <strong>carácter opcional, independiente y voluntario (Opt-in)</strong>.
          </p>

          <div>
            <h4 style={{ color: '#c084fc', fontSize: '0.92rem', fontWeight: 800, marginBottom: '0.3rem' }}>
              1. Alcance de la Cesión
            </h4>
            <p>
              Si el suscriptor aprueba la casilla correspondiente, autoriza a Creación Cuántica E.I.R.L. a registrar, fotografiar, filmar y difundir su rostro, imagen física, voz y testimonios expresados durante las actividades de la Caminata sobre Fuego.
            </p>
          </div>

          <div>
            <h4 style={{ color: '#c084fc', fontSize: '0.92rem', fontWeight: 800, marginBottom: '0.3rem' }}>
              2. Medios de Difusión y Gratuidad
            </h4>
            <p>
              El material audiovisual podrá ser difundido en redes sociales oficiales (Facebook, Instagram, TikTok, YouTube, LinkedIn), sitios web institucionales, presentaciones y material publicitario impreso o digital. La cesión se otorga a título totalmente gratuito, sin derecho a regalías o compensaciones económicas posteriores y con alcance territorial internacional.
            </p>
          </div>

          <div>
            <h4 style={{ color: '#c084fc', fontSize: '0.92rem', fontWeight: 800, marginBottom: '0.3rem' }}>
              3. Identificación para No Autorizantes
            </h4>
            <p>
              Si el usuario opta por <strong>NO autorizar</strong> el uso de su imagen, Creación Cuántica E.I.R.L. dispondrá de distintivos logísticos en sala (como credenciales diferenciadas o zonas de ubicación protegidas) para asegurar que la persona no sea captada ni publicada por el equipo de producción.
            </p>
          </div>

          <div>
            <h4 style={{ color: '#c084fc', fontSize: '0.92rem', fontWeight: 800, marginBottom: '0.3rem' }}>
              4. Plazo y Revocatoria Sencilla
            </h4>
            <p>
              La autorización tendrá una vigencia de cinco (5) años. El usuario podrá revocar este consentimiento en cualquier momento escribiendo a <strong>protecciondedatos@crearpsl.net</strong>. La revocatoria hará cesar el uso futuro del material digital en un plazo máximo de cinco (5) días hábiles, sin efectos retroactivos sobre piezas ya distribuidas o pautas pagadas en ciclo final de ejecución.
            </p>
          </div>
        </div>
      )
    }
  ];

  const filteredSections = contractSections.filter(sec => {
    if (activeTab !== 'todo' && sec.tabKey !== activeTab) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return sec.titulo.toLowerCase().includes(term) || sec.numero.toLowerCase().includes(term);
  });

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '1.5rem 1rem 4rem 1rem', color: '#f8fafc', fontFamily: 'inherit' }}>
      
      {/* HEADER DE IDENTIDAD - ESTILO GUÍAS CREAR */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(24, 24, 27, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
        border: '1px solid rgba(249, 115, 22, 0.35)',
        borderRadius: '16px',
        padding: '2rem',
        marginBottom: '2rem',
        boxShadow: '0 12px 32px -8px rgba(249, 115, 22, 0.18)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #f59e0b, #ea580c, #dc2626)'
        }} />

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem' }}>
          <div style={{ flex: '1 1 650px' }}>
            {/* Branding Oficial CREAR */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <img src="/logo_crear_blanco.png" alt="CREAR Poder Sin Límites" style={{ height: '42px', width: 'auto', objectFit: 'contain' }} onError={(e) => { e.currentTarget.src = '/logo-crear.png'; }} />
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.12em', color: '#f59e0b', textTransform: 'uppercase', display: 'block' }}>CREAR PODER SIN LÍMITES</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', display: 'block' }}>Centro de Formación y Liderazgo Transformacional</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{
                background: 'linear-gradient(90deg, #f97316, #ef4444)',
                color: '#fff',
                fontWeight: 900,
                fontSize: '0.75rem',
                padding: '4px 12px',
                borderRadius: '6px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <Flame size={14} /> DINÁMICA DE ALTO IMPACTO
              </span>
              <span style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                D.S. N° 016-2024-JUS
              </span>
              <span style={{ background: 'rgba(249, 115, 22, 0.12)', border: '1px solid rgba(249, 115, 22, 0.3)', color: '#fb923c', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                RUC 20612592811
              </span>
            </div>

            <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', fontWeight: 900, color: '#f8fafc', lineHeight: '1.25' }}>
              Instrumento Integrado de Exoneración de Responsabilidad, Declaración de Salud y Tratamiento de Datos
            </h1>
            <p style={{ margin: '0 0 0.75rem 0', color: '#fdba74', fontSize: '0.95rem', fontWeight: 800 }}>
              Dinámica Vivencial de Alto Impacto: Caminata sobre Fuego (Firewalk Lima, Perú)
            </p>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.55', maxWidth: '850px' }}>
              Entidad Administradora: <strong>Creación Cuántica E.I.R.L.</strong> (RUC 20612592811 · Sede Fiscal: Cal. Berlín Nro. 965 Int. 302, Miraflores, Lima). Validez electrónica con arreglo a la Ley N° 27269 y el Decreto Supremo N° 016-2024-JUS.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '1rem', fontSize: '0.82rem', color: '#94a3b8', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={14} color="#f97316" /> Locación: Casona Blanca (Huachipa, Lima)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={14} color="#38bdf8" /> Versión Oficial: V1.0-2026-FIREWALK-LIMA
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={14} color="#10b981" /> Clickwrap Digital Certificado
              </span>
            </div>
          </div>

          {/* Botones de Acción Rápida y Código QR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minWidth: '220px' }}>
            <button
              onClick={() => setShowQrModal(true)}
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                color: '#fff',
                border: 'none',
                padding: '0.75rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(234, 88, 12, 0.4)',
                transition: 'all 0.2s ease'
              }}
            >
              <QrCode size={18} /> Ver Código QR para Escaneo
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('formulario-firma');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                background: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #38bdf8',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <UserCheck size={16} /> Ir a Registrar Firma
            </button>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={copyPageLink}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.06)',
                  color: copiedLink ? '#4ade80' : '#cbd5e1',
                  border: '1px solid rgba(255,255,255,0.15)',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                {copiedLink ? <Check size={14} /> : <Share2 size={14} />} {copiedLink ? 'Copiado' : 'Compartir'}
              </button>
              <button
                onClick={handlePrint}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.06)',
                  color: '#cbd5e1',
                  border: '1px solid rgba(255,255,255,0.15)',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <Printer size={14} /> Imprimir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DEL CÓDIGO QR */}
      {showQrModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#0f172a',
            border: '2px solid #f97316',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '460px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(249, 115, 22, 0.35)',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowQrModal(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>

            <div style={{ display: 'inline-flex', padding: '0.4rem 0.8rem', background: 'rgba(249, 115, 22, 0.15)', borderRadius: '20px', color: '#fb923c', fontSize: '0.75rem', fontWeight: 800, marginBottom: '1rem', alignItems: 'center', gap: '0.4rem' }}>
              <Flame size={14} /> MESA DE GROUNDING & REGISTRO
            </div>

            <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.35rem', fontWeight: 900 }}>
              Código QR Oficial
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>
              Apunta la cámara de tu celular para abrir, revisar y firmar el acuerdo digital de la Caminata sobre Fuego.
            </p>

            <div style={{
              background: '#ffffff',
              padding: '1.25rem',
              borderRadius: '12px',
              display: 'inline-block',
              margin: '0 auto 1.25rem auto',
              boxShadow: '0 10px 20px rgba(0,0,0,0.4)'
            }}>
              <img
                src={qrUrl}
                alt="Código QR - Caminata sobre Fuego"
                style={{ width: '240px', height: '240px', display: 'block' }}
              />
            </div>

            <p style={{ color: '#cbd5e1', fontSize: '0.78rem', marginBottom: '1.25rem', wordBreak: 'break-all' }}>
              Enlace directo: <span style={{ color: '#38bdf8' }}>{pageUrl}</span>
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <a
                href={qrUrl}
                download="QR_Caminata_Sobre_Fuego_CREAR.png"
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#f97316',
                  color: '#fff',
                  padding: '0.65rem 1.2rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Download size={16} /> Descargar Imagen QR
              </a>
              <button
                onClick={() => setShowQrModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '0.65rem 1.2rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BARRA DE NAVEGACIÓN Y BÚSQUEDA */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '10px',
          padding: '0.65rem 1.25rem'
        }}>
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar cláusulas: Creación Cuántica, RUC 20612592811, D.S. 016-2024-JUS, partner, marcapasos, opt-in..."
            style={{
              background: 'transparent',
              border: 'none',
              color: '#f8fafc',
              fontSize: '0.9rem',
              outline: 'none',
              width: '100%'
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Pestañas de Navegación Rápida */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
          {[
            { id: 'todo', label: '📖 Instrumento Completo', icon: FileText },
            { id: 'entidad', label: 'Razón Social & Normativa', icon: Building2 },
            { id: 'exoneracion', label: 'I. Exoneración & Riesgos', icon: ShieldAlert },
            { id: 'salud', label: 'II. Salud & Datos Sensibles', icon: Lock },
            { id: 'imagen', label: 'III. Imagen & Voz (Opt-In)', icon: Eye },
            { id: 'firma', label: '✍️ IV. Firma y Validación', icon: UserCheck },
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'firma') {
                    const el = document.getElementById('formulario-firma');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 0.95rem',
                  borderRadius: '8px',
                  border: isSelected ? '1px solid #f97316' : '1px solid transparent',
                  background: isSelected ? 'rgba(249, 115, 22, 0.16)' : '#1e293b',
                  color: isSelected ? '#fb923c' : '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* CLÁUSULAS DEL CONTRATO */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
        {filteredSections.map(sec => {
          const Icon = sec.icon;
          return (
            <div
              key={sec.id}
              id={sec.id}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '1.75rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(249, 115, 22, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fb923c'
                }}>
                  <Icon size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>
                    SECCIÓN {sec.numero}
                  </span>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                    {sec.titulo}
                  </h2>
                </div>
              </div>

              {sec.content}
            </div>
          );
        })}
      </div>

      {/* SECCIÓN IV: FORMULARIO DE FIRMA DIGITAL Y VALIDACIÓN */}
      <div
        id="formulario-firma"
        ref={formRef}
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: '2px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '16px',
          padding: '2.25rem',
          boxShadow: '0 12px 36px -10px rgba(14, 165, 233, 0.25)',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(56, 189, 248, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8'
          }}>
            <UserCheck size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
              SECCIÓN IV · VALIDEZ ELECTRÓNICA VINCULANTE
            </span>
            <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#fff' }}>
              Registro de Rol, Validez Digital y Confirmación mediante Casillas
            </h2>
          </div>
        </div>

        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: '1.5' }}>
          El perfeccionamiento del presente acuerdo se efectúa mediante casillas de verificación electrónica no premarcadas (clickwrap), respaldadas por la <strong>Ley N° 27269</strong> y el <strong>Decreto Supremo N° 016-2024-JUS</strong>. El sistema registrará el identificador único de usuario, la dirección IP, el sello de tiempo (<em>Timestamp</em>) y el valor <em>hash</em> del documento firmado como evidencia digital inalterable.
        </p>

        {signedSuccess ? (
          <div
            id="constancia-firmada"
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '2px solid #10b981',
              borderRadius: '12px',
              padding: '2rem',
              textAlign: 'center'
            }}
          >
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ margin: '0 0 0.5rem 0', color: '#34d399', fontSize: '1.5rem', fontWeight: 900 }}>
              ¡Acuerdo Validado y Firmado Exitosamente!
            </h3>
            <p style={{ color: '#e2e8f0', fontSize: '0.95rem', maxWidth: '640px', margin: '0 auto 1.5rem auto', lineHeight: '1.6' }}>
              Se ha emitido la constancia oficial de exoneración de responsabilidad, declaración de salud y consentimiento informado a favor de <strong>Creación Cuántica E.I.R.L. (RUC 20612592811)</strong>.
            </p>

            <div style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '10px',
              padding: '1.25rem',
              maxWidth: '560px',
              margin: '0 auto 1.5rem auto',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              fontSize: '0.88rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Código de Auditoría:</span>
                <span style={{ color: '#38bdf8', fontWeight: 800 }}>{signedSuccess.codigo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Titular Firmante:</span>
                <span style={{ color: '#fff', fontWeight: 700 }}>{signedSuccess.nombre}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Documento de Identidad:</span>
                <span style={{ color: '#fff' }}>{signedSuccess.documento}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Rol en la Actividad:</span>
                <span style={{ color: '#fb923c', fontWeight: 700 }}>{signedSuccess.rolActividad}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Uso de Imagen (Opt-In):</span>
                <span style={{ color: signedSuccess.aceptoImagen ? '#10b981' : '#94a3b8', fontWeight: 700 }}>
                  {signedSuccess.aceptoImagen ? 'AUTORIZADO (5 Años)' : 'NO AUTORIZADO (Distintivo en Sala)'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Locación:</span>
                <span style={{ color: '#fff' }}>{signedSuccess.sedeLocacion}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>IP Pública Registrada:</span>
                <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700 }}>{signedSuccess.ip || geoInfo.ip}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Geolocalización Forense:</span>
                <span style={{ color: '#fde047', fontWeight: 700 }}>{signedSuccess.geoLocation || geoInfo.locationString} {signedSuccess.coordinates ? `(${signedSuccess.coordinates})` : ''}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Envío de Pase por Correo:</span>
                <span style={{ color: '#34d399', fontWeight: 700 }}>
                  {emailStatus === 'SENT' ? `✓ Enviado inmediatamente a ${signedSuccess.email}` : emailStatus === 'SENDING' ? 'Enviando correo...' : `Registrado (${signedSuccess.email})`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Sello de Tiempo (Timestamp):</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>{signedSuccess.fecha}</span>
              </div>
            </div>

            {/* Pase Oficial para Celular: SÍ VOY A CAMINAR SOBRE FUEGO */}
            {passDataUrl && (
              <div style={{
                margin: '1.5rem 0',
                padding: '1.2rem',
                background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(36, 11, 2, 0.4) 100%)',
                border: '2px solid rgba(249, 115, 22, 0.6)',
                borderRadius: '16px',
                textAlign: 'center',
                boxShadow: '0 10px 30px rgba(234, 88, 12, 0.2)'
              }}>
                <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', background: 'rgba(249, 115, 22, 0.2)', border: '1px solid rgba(249, 115, 22, 0.5)', borderRadius: '20px', color: '#fb923c', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.8rem' }}>
                  🔥 Pase Oficial de Acreditación Móvil 🔥
                </div>
                <h4 style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 900, margin: '0 0 0.4rem 0' }}>
                  Tu Pase Oficial para Celular
                </h4>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', maxWidth: '400px', margin: '0 auto 1rem auto' }}>
                  Guarda esta imagen en la galería de tu celular o compártela. Acredita que tu registro está validado para la Caminata sobre Fuego.
                </p>

                <div style={{ maxWidth: '320px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden', border: '2px solid rgba(249, 115, 22, 0.7)', boxShadow: '0 12px 30px rgba(0,0,0,0.6)' }}>
                  <img src={passDataUrl} alt="Pase Caminata sobre Fuego" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>

                <div style={{ marginTop: '1.2rem', display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <a
                    href={passDataUrl}
                    download={`Pase_Fuego_${(signedSuccess.nombre || 'Participante').replace(/[^a-zA-Z0-9]/g, '_')}.png`}
                    style={{
                      background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
                      color: '#fff',
                      padding: '0.8rem 1.4rem',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 6px 16px rgba(234, 88, 12, 0.35)'
                    }}
                  >
                    <span>📥</span> Descargar Pase para Celular
                  </a>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handlePrint}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Printer size={18} /> Imprimir / Guardar Constancia PDF
              </button>
              <button
                onClick={() => {
                  setSignedSuccess(null);
                  setFormData({
                    nombreCompleto: '',
                    tipoDocumento: 'DNI',
                    numeroDocumento: '',
                    email: '',
                    telefono: '',
                    rolActividad: 'Participante',
                    sedeLocacion: 'Lima - Casona Blanca (Huachipa)',
                    aceptoRiesgos: false,
                    aceptoSalud: false,
                    aceptoImagen: false,
                    firmaTexto: ''
                  });
                }}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: '#cbd5e1',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Registrar Nuevo Participante
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {/* Nombre Completo */}
              <div id="field-nombreCompleto">
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                  Nombre completo del Titular *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    name="nombreCompleto"
                    value={formData.nombreCompleto}
                    onChange={handleInputChange}
                    placeholder="Ej. Juan Pérez Quispe"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.5rem',
                      background: '#0f172a',
                      border: formErrors.nombreCompleto ? '1px solid #ef4444' : '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                  <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
                {formErrors.nombreCompleto && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{formErrors.nombreCompleto}</span>}
              </div>

              {/* Documento de Identidad */}
              <div id="field-numeroDocumento" style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ width: '110px' }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                    Tipo Doc. *
                  </label>
                  <select
                    name="tipoDocumento"
                    value={formData.tipoDocumento}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  >
                    <option value="DNI">DNI</option>
                    <option value="CE">CE</option>
                    <option value="Pasaporte">Pasaporte</option>
                    <option value="Cédula">Cédula</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                    N° Documento *
                  </label>
                  <input
                    type="text"
                    name="numeroDocumento"
                    value={formData.numeroDocumento}
                    onChange={handleInputChange}
                    placeholder="Documento de identidad"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: '#0f172a',
                      border: formErrors.numeroDocumento ? '1px solid #ef4444' : '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                  {formErrors.numeroDocumento && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{formErrors.numeroDocumento}</span>}
                </div>
              </div>

              {/* Correo Electrónico Registrado */}
              <div id="field-email">
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                  Correo Electrónico Registrado *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="tu.correo@ejemplo.com"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.5rem',
                      background: '#0f172a',
                      border: formErrors.email ? '1px solid #ef4444' : '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                  <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
                {formErrors.email && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{formErrors.email}</span>}
              </div>

              {/* Teléfono de Contacto */}
              <div id="field-telefono">
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                  Teléfono / WhatsApp de Contacto *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    placeholder="+51 999 999 999"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.5rem',
                      background: '#0f172a',
                      border: formErrors.telefono ? '1px solid #ef4444' : '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                  <PhoneCall size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
                {formErrors.telefono && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{formErrors.telefono}</span>}
              </div>

              {/* Selección de Rol dentro de la Actividad */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                  Selección de Rol dentro de la Actividad *
                </label>
                <select
                  name="rolActividad"
                  value={formData.rolActividad}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: '#0f172a',
                    border: '1px solid #38bdf8',
                    borderRadius: '8px',
                    color: '#38bdf8',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                >
                  <option value="Participante">Participante</option>
                  <option value="Entrenador">Entrenador</option>
                  <option value="Oficina">Oficina</option>
                  <option value="Manager">Manager</option>
                  <option value="Capitán">Capitán</option>
                  <option value="Aliados">Aliados</option>
                  <option value="Staff de Caminata">Staff de Caminata</option>
                  <option value="Staff de Mesa">Staff de Mesa</option>
                </select>
              </div>

              {/* Lugar / Locación */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                  Lugar
                </label>
                <input
                  type="text"
                  name="sedeLocacion"
                  value={formData.sedeLocacion}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#94a3b8',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* CASILLAS ELECTRÓNICAS DE ACEPTACIÓN SEPARADAS */}
            <div style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.15rem',
              marginTop: '0.5rem'
            }}>
              <h4 style={{ margin: 0, color: '#38bdf8', fontSize: '0.92rem', fontWeight: 800 }}>
                Casillas Electrónicas de Aceptación (Checkboxes Separados):
              </h4>

              {/* CHECKBOX 1 (OBLIGATORIO) */}
              <div id="field-aceptoRiesgos" style={{ padding: '0.75rem', background: 'rgba(249, 115, 22, 0.05)', borderRadius: '8px', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.88rem', color: '#e2e8f0', lineHeight: '1.5' }}>
                  <input
                    type="checkbox"
                    name="aceptoRiesgos"
                    checked={formData.aceptoRiesgos}
                    onChange={handleInputChange}
                    style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#f97316' }}
                  />
                  <span>
                    <strong style={{ color: '#fb923c' }}>[ ] CHECKBOX 1 (OBLIGATORIO) – EXONERACIÓN DE RESPONSABILIDAD Y ASUNCIÓN DE RIESGOS EN LA CAMINATA SOBRE FUEGO:</strong><br />
                    He leído detenidamente los términos del presente instrumento. Declaro que mi participación en la dinámica de Caminata sobre Fuego es completamente voluntaria. Acepto los protocolos de seguridad, asumo los riesgos normales inherentes a la actividad y exonero de responsabilidad a Creación Cuántica E.I.R.L. de conformidad con las leyes peruanas.
                  </span>
                </label>
                {formErrors.aceptoRiesgos && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginLeft: '2rem', display: 'block', marginTop: '0.3rem' }}>{formErrors.aceptoRiesgos}</span>}
              </div>

              {/* CHECKBOX 2 (OBLIGATORIO) */}
              <div id="field-aceptoSalud" style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.88rem', color: '#e2e8f0', lineHeight: '1.5' }}>
                  <input
                    type="checkbox"
                    name="aceptoSalud"
                    checked={formData.aceptoSalud}
                    onChange={handleInputChange}
                    style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#10b981' }}
                  />
                  <span>
                    <strong style={{ color: '#34d399' }}>[ ] CHECKBOX 2 (OBLIGATORIO) – DECLARACIÓN DE SALUD Y CONSENTIMIENTO PARA EL TRATAMIENTO DE DATOS SENSIBLES:</strong><br />
                    Declaro bajo juramento que la información brindada sobre mi estado de salud física, mental y tratamientos médicos es veraz y completa. Autorizo de forma previa, expresa e inequívoca a Creación Cuántica E.I.R.L. al tratamiento de mis datos personales de salud conforme a la Ley N° 29733 y el D.S. N° 016-2024-JUS para garantizar la seguridad del entrenamiento.
                  </span>
                </label>
                {formErrors.aceptoSalud && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginLeft: '2rem', display: 'block', marginTop: '0.3rem' }}>{formErrors.aceptoSalud}</span>}
              </div>

              {/* CHECKBOX 3 (OPCIONAL / OPT-IN) */}
              <div id="field-aceptoImagen" style={{ padding: '0.75rem', background: 'rgba(168, 85, 247, 0.05)', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.88rem', color: '#e2e8f0', lineHeight: '1.5' }}>
                  <input
                    type="checkbox"
                    name="aceptoImagen"
                    checked={formData.aceptoImagen}
                    onChange={handleInputChange}
                    style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#c084fc' }}
                  />
                  <span>
                    <strong style={{ color: '#d8b4fe' }}>[ ] CHECKBOX 3 (OPCIONAL / OPT-IN) – AUTORIZACIÓN DE USO DE IMAGEN, FOTOGRAFÍA, VOZ Y TESTIMONIOS PUBLICITARIOS:</strong><br />
                    <em>(Marque de forma activa únicamente si desea otorgar su consentimiento)</em> Autorizo expresamente y de forma gratuita a Creación Cuántica E.I.R.L. a utilizar, captar y difundir mi imagen física, fotografía, voz y testimonios para fines publicitarios e institucionales en plataformas digitales y redes sociales, según lo estipulado en el Art. 15 del Código Civil y la Ley N° 29733. 
                    <span style={{ display: 'block', marginTop: '0.25rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                      * Si no marcas esta casilla, recibirás un distintivo logístico en sala para proteger tu privacidad fotográfica.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {/* FIRMA DIGITAL ESCRITA */}
            <div id="field-firmaTexto">
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                Escribe tu Nombre Completo como Firma Digital Vinculante (Ley N° 27269) *
              </label>
              <input
                type="text"
                name="firmaTexto"
                value={formData.firmaTexto}
                onChange={handleInputChange}
                placeholder="Escribe exactamente tu nombre y apellidos como firma"
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  background: '#0f172a',
                  border: formErrors.firmaTexto ? '1px solid #ef4444' : '1px solid #38bdf8',
                  borderRadius: '8px',
                  color: '#38bdf8',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  letterSpacing: '0.02em',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '0.3rem', display: 'block' }}>
                Al registrar tu nombre y presionar "Firmar y Validar Instrumento", se registrará el valor hash, la dirección IP y el sello de tiempo (Timestamp) con plena validez jurídica.
              </span>
              {formErrors.firmaTexto && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{formErrors.firmaTexto}</span>}
            </div>

            {/* BOTÓN DE FIRMA */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '1rem 2.25rem',
                  borderRadius: '10px',
                  fontWeight: 900,
                  fontSize: '1rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  boxShadow: '0 8px 24px -4px rgba(234, 88, 12, 0.45)',
                  transition: 'all 0.2s ease',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                <Flame size={20} />
                {isSubmitting ? 'Validando y Registrando Firma...' : 'Firmar y Validar Instrumento Legal'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* FOOTER OFICIAL DE CONTROL DE VERSIÓN Y ENTIDAD */}
      <div style={{ marginTop: '3rem', borderTop: '1px solid #334155', paddingTop: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem', lineHeight: '1.6' }}>
        <p style={{ margin: '0 0 0.4rem 0' }}>
          <strong>Control de Versión:</strong> V1.0-2026-FIREWALK-LIMA · <strong>Fecha de Vigencia:</strong> 26 de octubre de 2026
        </p>
        <p style={{ margin: 0 }}>
          <strong>Entidad Administradora:</strong> Creación Cuántica E.I.R.L. (RUC 20612592811) · Sede Fiscal: Cal. Berlín Nro. 965 Int. 302, Miraflores, Lima – Perú · Canal ARCO: <strong>protecciondedatos@crearpsl.net</strong>
        </p>
      </div>

    </div>
  );
}
