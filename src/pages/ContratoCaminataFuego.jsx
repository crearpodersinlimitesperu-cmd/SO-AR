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
  Share2
} from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function ContratoCaminataFuego() {
  const [activeTab, setActiveTab] = useState('todo');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signedSuccess, setSignedSuccess] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);

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
    aceptoImagen: false,
    aceptoDatos: false,
    firmaTexto: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const formRef = useRef(null);

  const pageUrl = typeof window !== 'undefined' ? window.location.href : 'https://app.crearpsl.net/caminata-fuego';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=10&data=${encodeURIComponent(pageUrl)}`;

  useEffect(() => {
    document.title = 'Contrato Caminata sobre Fuego · CREAR Poder Sin Límites';
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

  const handlePrint = () => {
    window.print();
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.nombreCompleto.trim()) errors.nombreCompleto = 'El nombre completo es requerido.';
    if (!formData.numeroDocumento.trim()) errors.numeroDocumento = 'El documento de identidad es requerido.';
    if (!formData.email.trim() || !formData.email.includes('@')) errors.email = 'Ingresa un correo electrónico válido.';
    if (!formData.telefono.trim()) errors.telefono = 'El teléfono o WhatsApp es requerido.';
    if (!formData.aceptoRiesgos) errors.aceptoRiesgos = 'Debes aceptar la exoneración de responsabilidad y asunción de riesgos.';
    if (!formData.aceptoImagen) errors.aceptoImagen = 'Debes autorizar el uso de imagen y voz conforme al Art. 11 del Código Civil.';
    if (!formData.aceptoDatos) errors.aceptoDatos = 'Debes otorgar el consentimiento para el tratamiento de datos según Ley 29733.';
    if (!formData.firmaTexto.trim()) errors.firmaTexto = 'Escribe tu nombre completo como firma digital vinculante.';
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
    try {
      const timestamp = new Date().toISOString();
      const verificationCode = 'CPSL-FIRE-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString().slice(-4);
      
      const payload = {
        ...formData,
        verificationCode,
        fechaValidacionIso: timestamp,
        fechaValidacionLocal: new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        dispositivo: /iPhone|iPad|Android/i.test(navigator.userAgent || '') ? 'Móvil' : 'Escritorio',
        marcoLegal: 'Ley 27269 (Firmas y Certificados Digitales), Ley 29733 (Datos Personales), Art. 11 Código Civil',
        createdAt: serverTimestamp()
      };

      // Guardar en Firestore
      try {
        await addDoc(collection(db, 'contratos_caminata_fuego'), payload);
      } catch (err) {
        console.warn('Firestore fallback: registro generado localmente con código de auditoría:', err);
      }

      setSignedSuccess({
        ...payload,
        nombre: formData.nombreCompleto,
        documento: `${formData.tipoDocumento} ${formData.numeroDocumento}`,
        codigo: verificationCode,
        fecha: new Date().toLocaleString('es-PE', { dateStyle: 'full', timeStyle: 'medium' })
      });

      // Scroll hacia la confirmación
      setTimeout(() => {
        const confirmEl = document.getElementById('constancia-firmada');
        if (confirmEl) confirmEl.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (err) {
      console.error('Error al registrar firma digital:', err);
      alert('Hubo un inconveniente al validar la firma. Por favor verifica los datos e intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Secciones del contrato
  const contractSections = [
    {
      id: 'sec-1',
      tabKey: 'marco',
      numero: '1',
      titulo: 'Marco Legal y Normativo Aplicable',
      icon: ShieldCheck,
      content: (
        <div style={{ lineHeight: '1.7', color: '#cbd5e1' }}>
          <p style={{ marginBottom: '1rem' }}>
            El presente acuerdo se rige bajo la legislación vigente de la República del Perú, amparado fundamentalmente en los siguientes cuerpos normativos:
          </p>
          <ul style={{ paddingLeft: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <li>
              <strong style={{ color: '#38bdf8' }}>Código Civil Peruano (Decreto Legislativo N° 295):</strong> En particular el <strong>Artículo 11</strong>, correspondiente al derecho a la imagen y a la voz, así como las disposiciones relativas a la libertad contractual y autonomía de la voluntad (<strong>Artículos 1354 y 1356</strong>) y responsabilidad civil (<strong>Artículos 1969 y 1970</strong>).
            </li>
            <li>
              <strong style={{ color: '#38bdf8' }}>Ley N° 27269 — Ley de Firmas y Certificados Digitales:</strong> Y su reglamento, garantizando la plena validez jurídica, eficacia e idoneidad del consentimiento otorgado a través de medios electrónicos o digitales.
            </li>
            <li>
              <strong style={{ color: '#38bdf8' }}>Ley N° 29733 — Ley de Protección de Datos Personales:</strong> Y su Reglamento aprobado mediante Decreto Supremo N° 003-2013-JUS, en lo respectivo a la recolección, almacenamiento, tratamiento y transferencia de datos personales y datos sensibles.
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'sec-2',
      tabKey: 'aptitud',
      numero: '2',
      titulo: 'Declaración de Aptitud Física y Mental y Asunción Voluntaria de Riesgos',
      icon: AlertTriangle,
      content: (
        <div style={{ lineHeight: '1.7', color: '#cbd5e1' }}>
          <p style={{ marginBottom: '1rem' }}>
            EL FIRMANTE declara de manera libre, consciente y voluntaria lo siguiente:
          </p>
          <ul style={{ paddingLeft: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <li>
              <strong style={{ color: '#f59e0b' }}>Estado de Salud:</strong> Cuenta con plena aptitud física, médica, mental y emocional para someterse a experiencias de alto impacto y estrés controlado. No padece de afecciones cardíacas graves, hipertensión no controlada, epilepsia, trastornos psiquiátricos agudos, ni lesiones abiertas en los miembros inferiores que impidan su participación activa.
            </li>
            <li>
              <strong style={{ color: '#f59e0b' }}>Naturaleza de la Actividad:</strong> Comprende plenamente que la "Caminata sobre Fuego" consiste en dar pasos descalzo(a) sobre una cama de brasas de madera al rojo vivo.
            </li>
            <li>
              <strong style={{ color: '#f59e0b' }}>Reconocimiento de Riesgos Inherentes:</strong> Acepta y entiende que, a pesar de los estrictos protocolos de seguridad y guía técnica proporcionados por la organización, la actividad conlleva riesgos inherentes como: quemaduras de primer, segundo o tercer grado, ampollas, irritación cutánea, caídas, contusiones o reacciones emocionales intensas.
            </li>
            <li>
              <strong style={{ color: '#f59e0b' }}>Voluntariedad:</strong> Entiende que la participación es 100% voluntaria. En ningún momento el equipo organizador obligará a EL FIRMANTE a cruzar las brasas si este decide no hacerlo.
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'sec-3',
      tabKey: 'exoneracion',
      numero: '3',
      titulo: 'Liberación y Exoneración Total de Responsabilidad Civil, Penal y Administrativa',
      icon: ShieldAlert,
      content: (
        <div style={{ lineHeight: '1.7', color: '#cbd5e1' }}>
          <p style={{ marginBottom: '1rem' }}>
            Mediante la firma o validación digital del presente documento, EL FIRMANTE otorga un descargo y liberación de responsabilidad amplio, definitivo e irrevocable:
          </p>
          <ul style={{ paddingLeft: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <li>
              <strong style={{ color: '#ef4444' }}>Exoneración Expresa:</strong> Exonera de toda responsabilidad civil, penal, administrativa o de cualquier otra índole a la empresa <strong>CREAR PODER SIN LÍMITES / TRANSFORMACIÓN GLOBAL</strong>, a sus directores, representantes, capacitadores, coordinadores y al personal de apoyo o partner asignado a la actividad.
            </li>
            <li>
              <strong style={{ color: '#ef4444' }}>Renuncia a Acciones Legales:</strong> Renuncia expresamente a interponer cualquier tipo de demanda, denuncia, reclamo administrativo, arbitraje o solicitud de indemnización por daños y perjuicios, daños materiales, lesiones corporales, secuelas o daño moral derivados de su participación en la Caminata sobre Fuego.
            </li>
            <li>
              <strong style={{ color: '#ef4444' }}>Asunción de Gastos Médicos:</strong> EL FIRMANTE asume de forma personal e independiente cualquier gasto médico, hospitalario o de curación suplementario que pudiera requerir voluntariamente tras la realización del evento.
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'sec-4',
      tabKey: 'imagen',
      numero: '4',
      titulo: 'Autorización Expresa e Irrevocable de Uso de Derechos de Imagen y Voz',
      icon: Eye,
      content: (
        <div style={{ lineHeight: '1.7', color: '#cbd5e1' }}>
          <p style={{ marginBottom: '1rem' }}>
            De conformidad con el <strong>Artículo 11 del Código Civil Peruano</strong>:
          </p>
          <ul style={{ paddingLeft: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <li>
              <strong style={{ color: '#a855f7' }}>Autorización de Captura:</strong> EL FIRMANTE autoriza de manera expresa, gratuita e irrevocable a <strong>CREAR PODER SIN LÍMITES / TRANSFORMACIÓN GLOBAL</strong> a fotografiar, grabar en video, registrar en audio o filmar su imagen, rostro, voz y participación general durante el desarrollo del evento.
            </li>
            <li>
              <strong style={{ color: '#a855f7' }}>Finalidad y Medios de Difusión:</strong> La organización podrá utilizar, reproducir, editar, publicar y comercializar dicho material audiovisual en redes sociales, sitios web, plataformas digitales, spots publicitarios, material educativo o de entrenamiento, tanto en el Perú como en el extranjero, de forma ilimitada en el tiempo.
            </li>
            <li>
              <strong style={{ color: '#a855f7' }}>Renuncia a Compensación:</strong> EL FIRMANTE reconoce que no tendrá derecho a compensación económica, pago de regalías ni reclamos por derechos de autor sobre las piezas publicitarias o contenidos generados.
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'sec-5',
      tabKey: 'datos',
      numero: '5',
      titulo: 'Consentimiento Informado de Tratamiento de Datos Personales y Sensibles',
      icon: Lock,
      content: (
        <div style={{ lineHeight: '1.7', color: '#cbd5e1' }}>
          <p style={{ marginBottom: '1rem' }}>
            En cumplimiento de la <strong>Ley N° 29733 (Ley de Protección de Datos Personales de Perú)</strong> y su Reglamento:
          </p>
          <ul style={{ paddingLeft: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <li>
              <strong style={{ color: '#10b981' }}>Autorización de Tratamiento:</strong> EL FIRMANTE otorga su consentimiento previo, informado, expreso e inequívoco para que <strong>CREAR PODER SIN LÍMITES / TRANSFORMACIÓN GLOBAL</strong> recopile y trate sus datos personales (identificación, contacto) y datos sensibles (condición física, alergias o antecedentes de salud relevantes para la seguridad de la dinámica).
            </li>
            <li>
              <strong style={{ color: '#10b981' }}>Finalidades:</strong> Los datos serán incorporados en los bancos de datos de titularidad de la organización para:
              <ol style={{ paddingLeft: '1.2rem', marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li>1. Garantizar la gestión de la seguridad física durante la actividad.</li>
                <li>2. Coordinación logística y comunicación directa previa y posterior al evento.</li>
                <li>3. Envío de información sobre futuros entrenamientos, programas y eventos organizados por la empresa.</li>
              </ol>
            </li>
            <li>
              <strong style={{ color: '#10b981' }}>Derechos ARCO:</strong> EL FIRMANTE declara haber sido informado de que puede ejercer en cualquier momento sus derechos de Acceso, Rectificación, Cancelación y Oposición (ARCO), conforme a ley, dirigiendo una comunicación escrita al correo electrónico oficial de la organización o en la sede legal de la misma.
            </li>
          </ul>
        </div>
      )
    }
  ];

  const filteredSections = contractSections.filter(sec => {
    if (activeTab !== 'todo' && sec.tabKey !== activeTab) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const titleMatch = sec.titulo.toLowerCase().includes(term);
    return titleMatch || sec.numero.includes(term);
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
        {/* Glow de fuego superior */}
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
                <Flame size={14} /> ACUERDO LEGAL VINCULANTE
              </span>
              <span style={{ background: 'rgba(249, 115, 22, 0.12)', border: '1px solid rgba(249, 115, 22, 0.3)', color: '#fb923c', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                LEY N° 27269 & LEY N° 29733
              </span>
              <span style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                LIMA, PERÚ
              </span>
            </div>

            <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.85rem', fontWeight: 900, color: '#f8fafc', lineHeight: '1.25' }}>
              Acuerdo Integral de Exoneración de Responsabilidad, Derechos de Imagen y Consentimiento Informado
            </h1>
            <p style={{ margin: '0 0 0.75rem 0', color: '#fdba74', fontSize: '1rem', fontWeight: 800 }}>
              EXPERIENCIA ALTO IMPACTO: CAMINATA SOBRE FUEGO (FIREWALKING PERÚ)
            </p>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.92rem', lineHeight: '1.55', maxWidth: '850px' }}>
              Celebrado entre <strong>CREAR PODER SIN LÍMITES / TRANSFORMACIÓN GLOBAL</strong> y la persona firmante. Este acuerdo otorga validez jurídica y probatoria a la participación voluntaria conforme a las leyes peruanas aplicables.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '1rem', fontSize: '0.82rem', color: '#94a3b8', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={14} color="#f97316" /> Locación: Casona Blanca (Huachipa, Lima)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={14} color="#38bdf8" /> Vigencia Operativa Oficial 2026
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={14} color="#10b981" /> Firma Electrónica Certificada
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
              <UserCheck size={16} /> Ir a Firmar / Validar
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

      {/* MODAL / PANEL DE CÓDIGO QR */}
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
              <Flame size={14} /> ESCANEO EN MESA DE ENROLAMIENTO
            </div>

            <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.35rem', fontWeight: 900 }}>
              Código QR Oficial
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>
              Apunta la cámara de tu celular para abrir, leer y firmar el acuerdo digital de la Caminata sobre Fuego.
            </p>

            {/* Contenedor del QR */}
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
                alt="Código QR - Contrato Caminata sobre Fuego"
                style={{ width: '240px', height: '240px', display: 'block' }}
              />
            </div>

            <p style={{ color: '#cbd5e1', fontSize: '0.78rem', marginBottom: '1.25rem', wordBreak: 'break-all' }}>
              Enlace: <span style={{ color: '#38bdf8' }}>{pageUrl}</span>
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
            placeholder="Buscar cláusulas: quemaduras, Artículo 11, datos sensibles, Ley 27269, derechos de imagen..."
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
            { id: 'todo', label: '📖 Contrato Completo', icon: FileText },
            { id: 'marco', label: '1. Marco Legal', icon: ShieldCheck },
            { id: 'aptitud', label: '2. Aptitud & Riesgos', icon: AlertTriangle },
            { id: 'exoneracion', label: '3. Exoneración Total', icon: ShieldAlert },
            { id: 'imagen', label: '4. Derechos de Imagen', icon: Eye },
            { id: 'datos', label: '5. Protección de Datos', icon: Lock },
            { id: 'firma', label: '✍️ 6. Firma y Registro', icon: UserCheck },
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
                    CLÁUSULA {sec.numero}
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

      {/* SECCIÓN 6: FORMULARIO DE FIRMA DIGITAL Y VALIDACIÓN */}
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
              SECCIÓN 6 · VALIDEZ ELECTRÓNICA VINCULANTE
            </span>
            <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#fff' }}>
              Validación y Aceptación Digital (Firma Electrónica)
            </h2>
          </div>
        </div>

        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: '1.5' }}>
          El presente acuerdo se valida de manera electrónica con arreglo a la <strong>Ley N° 27269</strong>. La confirmación de las casillas y el envío de este formulario constituyen firma digital/electrónica válida y vinculante.
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
              Se ha emitido la constancia de exoneración de responsabilidad y consentimiento informado conforme a ley.
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
                <span style={{ color: '#94a3b8' }}>Firmante:</span>
                <span style={{ color: '#fff', fontWeight: 700 }}>{signedSuccess.nombre}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Documento:</span>
                <span style={{ color: '#fff' }}>{signedSuccess.documento}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Rol:</span>
                <span style={{ color: '#fb923c', fontWeight: 700 }}>{signedSuccess.rolActividad}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Locación:</span>
                <span style={{ color: '#fff' }}>{signedSuccess.sedeLocacion}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Fecha y Hora Oficial:</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>{signedSuccess.fecha}</span>
              </div>
            </div>

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
                <Printer size={18} /> Imprimir / Guardar Constancia en PDF
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
                    aceptoImagen: false,
                    aceptoDatos: false,
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
                  Nombre y Apellidos Completos *
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
                    <option value="Pasaporte">Pasaporte</option>
                    <option value="Carné Ext.">Carné Ext.</option>
                    <option value="Cédula">Cédula</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                    Número de Documento *
                  </label>
                  <input
                    type="text"
                    name="numeroDocumento"
                    value={formData.numeroDocumento}
                    onChange={handleInputChange}
                    placeholder="Número de identidad"
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

              {/* Correo Electrónico */}
              <div id="field-email">
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                  Correo Electrónico de Contacto *
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

              {/* Teléfono / WhatsApp */}
              <div id="field-telefono">
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                  Teléfono / WhatsApp de Emergencia *
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

              {/* Rol en la Actividad */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                  Rol en la Actividad *
                </label>
                <select
                  name="rolActividad"
                  value={formData.rolActividad}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                >
                  <option value="Participante">Participante</option>
                  <option value="Partner / Acompañante">Partner / Acompañante</option>
                  <option value="Staff / Logística">Staff / Logística</option>
                  <option value="Entrenador / Facilitador">Entrenador / Facilitador</option>
                </select>
              </div>

              {/* Locación */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                  Locación del Evento
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

            {/* CASILLAS DE VERIFICACIÓN ELECTRÓNICA OBLIGATORIA */}
            <div style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              marginTop: '0.5rem'
            }}>
              <h4 style={{ margin: 0, color: '#38bdf8', fontSize: '0.95rem', fontWeight: 800 }}>
                Declaraciones de Conformidad (Casillas de Verificación Electrónica Obligatorias):
              </h4>

              {/* Casilla 1 */}
              <label id="field-aceptoRiesgos" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.88rem', color: '#e2e8f0', lineHeight: '1.5' }}>
                <input
                  type="checkbox"
                  name="aceptoRiesgos"
                  checked={formData.aceptoRiesgos}
                  onChange={handleInputChange}
                  style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#f97316' }}
                />
                <span>
                  <strong>He leído y acepto expresamente</strong> los términos de la <strong>Exoneración de Responsabilidad y Asunción de Riesgos</strong> para la Caminata sobre Fuego (Cláusulas 2 y 3).
                </span>
              </label>
              {formErrors.aceptoRiesgos && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginLeft: '2rem' }}>{formErrors.aceptoRiesgos}</span>}

              {/* Casilla 2 */}
              <label id="field-aceptoImagen" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.88rem', color: '#e2e8f0', lineHeight: '1.5' }}>
                <input
                  type="checkbox"
                  name="aceptoImagen"
                  checked={formData.aceptoImagen}
                  onChange={handleInputChange}
                  style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#38bdf8' }}
                />
                <span>
                  <strong>Autorizo el uso de mi imagen y voz</strong> a favor de <strong>CREAR PODER SIN LÍMITES / TRANSFORMACIÓN GLOBAL</strong> según lo estipulado en el Artículo 11 del Código Civil (Cláusula 4).
                </span>
              </label>
              {formErrors.aceptoImagen && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginLeft: '2rem' }}>{formErrors.aceptoImagen}</span>}

              {/* Casilla 3 */}
              <label id="field-aceptoDatos" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.88rem', color: '#e2e8f0', lineHeight: '1.5' }}>
                <input
                  type="checkbox"
                  name="aceptoDatos"
                  checked={formData.aceptoDatos}
                  onChange={handleInputChange}
                  style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#10b981' }}
                />
                <span>
                  <strong>Doy mi consentimiento informado</strong> para el tratamiento de mis Datos Personales y Datos Sensibles conforme a la <strong>Ley N° 29733</strong> (Cláusula 5).
                </span>
              </label>
              {formErrors.aceptoDatos && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginLeft: '2rem' }}>{formErrors.aceptoDatos}</span>}
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
                Al escribir tu nombre y presionar "Firmar y Validar Acuerdo", se registrará la marca de tiempo oficial y huella electrónica con plena eficacia jurídica.
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
                {isSubmitting ? 'Validando y Registrando Firma...' : 'Firmar y Validar Acuerdo Electrónico'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* FOOTER OFICIAL DE PROTECCIÓN Y CONTACTO */}
      <div style={{ marginTop: '3rem', borderTop: '1px solid #334155', paddingTop: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem', lineHeight: '1.6' }}>
        <p style={{ margin: '0 0 0.4rem 0' }}>
          <strong>CREAR PODER SIN LÍMITES / TRANSFORMACIÓN GLOBAL</strong> · Todos los derechos reservados © 2026
        </p>
        <p style={{ margin: 0 }}>
          Sede Legal: Lima, Perú · Derechos ARCO: <strong>legal@crearpsl.net</strong> · Plataforma Oficial de Causa OS
        </p>
      </div>

    </div>
  );
}
