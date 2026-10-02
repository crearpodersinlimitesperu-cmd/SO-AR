/**
 * legalContracts.js — CREAR PSL Global
 * Plantillas de documentos legales por país para el Módulo de Onboarding Legal.
 * Versión: 2026-v1 | Implementado: Octubre 2026
 *
 * AVISO: Los textos legales contenidos en este archivo han sido adaptados según la
 * legislación vigente de cada país indicado. Consultar con el área legal corporativa
 * ante cualquier actualización normativa.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TEXTOS LEGALES POR PAÍS
// ─────────────────────────────────────────────────────────────────────────────

const TEXTO_CONFIDENCIALIDAD_SALON = `
CLÁUSULA DE CONFIDENCIALIDAD DEL SALÓN Y NO DIVULGACIÓN DE METODOLOGÍA

El/La participante acepta y reconoce que toda la metodología, contenidos, materiales,
dinámicas, ejercicios, testimonios de otros participantes, técnicas de transformación
personal y de negocio compartidos durante el Programa de Creación de CREAR PSL Global
son ESTRICTAMENTE CONFIDENCIALES.

En consecuencia, el/la participante se COMPROMETE a:
1. No grabar, fotografiar, ni reproducir por ningún medio el contenido del programa
   sin autorización escrita previa de CREAR PSL Global.
2. No compartir, enseñar, revender ni transmitir la metodología propia del programa
   a terceros, ya sea de forma gratuita u onerosa.
3. Guardar confidencialidad absoluta sobre los testimonios, datos personales, situaciones
   financieras y emocionales compartidas por otros participantes dentro del salón.
4. No utilizar el contenido del programa para crear productos, servicios o capacitaciones
   competidoras con CREAR PSL Global durante un período de 5 (cinco) años.

El incumplimiento de estas obligaciones facultará a CREAR PSL Global para ejercer las
acciones legales correspondientes por daños y perjuicios.
`;


// ─────────────────────────────────────────────────────────────────────────────
// TEXTO BASE: AUTORIZACIÓN GRABACIÓN VIDEO/VOZ/FOTO EN ACTIVIDADES
// Se reutiliza en todos los países adaptando la referencia legal local.
// ─────────────────────────────────────────────────────────────────────────────
const TEXTO_GRABACION_BASE = `
OBJETO Y ALCANCE DE LA AUTORIZACIÓN:
El/La participante autoriza expresamente a CREAR PSL Global y a sus empresas asociadas
a realizar grabaciones de audio, video y fotografía durante:
  • Sesiones presenciales y virtuales del Programa de Creación.
  • Eventos, talleres, ceremonias de graduación y actividades corporativas.
  • Transmisiones en vivo (webinars, streams) y grabaciones de clases.
  • Actividades de seguimiento, entrevistas y testimonios post-programa.

USOS AUTORIZADOS:
  1. Material educativo interno y archivos históricos del programa.
  2. Publicaciones en redes sociales (Instagram, Facebook, YouTube, TikTok, LinkedIn).
  3. Material publicitario y promocional del Programa de Creación.
  4. Testimoniales en formato video para captación de nuevos participantes.
  5. Producción de contenido editorial (libros, revistas, newsletters).
  6. Presentaciones corporativas y pitches ante inversores o aliados.

CONDICIONES Y LÍMITES:
  • El material NO será utilizado en contextos que atenten contra la dignidad del participante.
  • El material NO será cedido a terceros ajenos al grupo CREAR PSL Global con fines comerciales.
  • El material NO será utilizado en campañas de naturaleza política, religiosa o ideológica.
  • Las grabaciones de sesiones donde otros participantes compartan información personal
    solo se utilizarán previa anonimización o con su consentimiento explícito.

CARÁCTER DE LA AUTORIZACIÓN:
La autorización se otorga de forma VOLUNTARIA, EXPRESA E INFORMADA, sin contraprestación
económica. Puede ser revocada en cualquier momento enviando solicitud escrita a
privacidad@crearpsl.com, sin que ello afecte el material ya publicado con anterioridad.
`;


// ─────────────────────────────────────────────────────────────────────────────
// CONTRATOS POR PAÍS
// ─────────────────────────────────────────────────────────────────────────────

export const LEGAL_CONTRACTS = {

  // ════════════════════════════════════════════════════════
  // MÉXICO — LFPDPPP
  // ════════════════════════════════════════════════════════
  MX: {
    countryCode: 'MX',
    countryName: 'México',
    flag: '🇲🇽',
    lawReference: 'LFPDPPP (DOF 05-Jul-2010)',
    documents: [
      {
        id: 'aviso_privacidad_mx',
        title: 'Aviso de Privacidad Integral',
        type: 'privacy',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'He leído y acepto el Aviso de Privacidad Integral conforme a la LFPDPPP.',
        content: `
AVISO DE PRIVACIDAD INTEGRAL
CREAR PSL Global, S.A. de C.V.

En cumplimiento con lo establecido en la Ley Federal de Protección de Datos Personales en
Posesión de los Particulares (LFPDPPP) y su Reglamento, CREAR PSL Global, S.A. de C.V.
(en adelante "el Responsable"), con domicilio en Santa Fe, Ciudad de México, C.P. 05109,
hace de su conocimiento el presente Aviso de Privacidad.

DATOS PERSONALES QUE SE RECABAN:
El Responsable recabará los siguientes datos personales: nombre completo, correo electrónico,
número de teléfono, fecha de nacimiento, domicilio, RFC, datos financieros de referencia
(solo para programas con pago aplazado), y fotografía o imagen cuando aplique.

FINALIDADES DEL TRATAMIENTO (Art. 13 y 15 LFPDPPP):
- Primarias: Gestión e inscripción al Programa de Creación; seguimiento del proceso de
  aprendizaje; comunicación de actividades y eventos del programa.
- Secundarias: Envío de información promocional sobre nuevos programas (con posibilidad
  de cancelar mediante solicitud expresa).

TRANSFERENCIA DE DATOS (Art. 36 LFPDPPP):
El Responsable podrá transferir sus datos a empresas filiales de CREAR PSL Global
ubicadas en Perú, Colombia, Ecuador y España, para fines de coordinación operativa del
programa, conforme al Art. 37, fracción I de la LFPDPPP.

DERECHOS ARCO (Art. 28-36 LFPDPPP):
Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse (ARCO) al tratamiento de
sus datos personales enviando solicitud a: privacidad@crearpsl.net

USO DE COOKIES: El sitio web emplea cookies de sesión con fines de autenticación y
analítica. Puede desactivarlas desde la configuración de su navegador.

CAMBIOS AL AVISO: Cualquier modificación al presente Aviso de Privacidad será notificada
a través del correo electrónico registrado y publicada en https://crearpsl.com/privacidad
        `
      },
      {
        id: 'nda_salon_mx',
        title: 'Acuerdo de Confidencialidad y No Divulgación (NDA) de Salón',
        type: 'nda',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'Firmo el Acuerdo de Confidencialidad y No Divulgación (NDA) del Programa.',
        content: `
ACUERDO DE CONFIDENCIALIDAD Y NO DIVULGACIÓN
Programa de Creación — CREAR PSL Global, S.A. de C.V.

El presente Acuerdo de Confidencialidad y No Divulgación ("Acuerdo") se celebra entre
CREAR PSL Global, S.A. de C.V. ("la Empresa") y el participante que suscribe ("el
Participante"), conforme al Código Civil Federal de los Estados Unidos Mexicanos.

OBJETO: Proteger la información confidencial, metodología propietaria, contenidos,
técnicas y materiales del Programa de Creación, así como la privacidad de los demás
participantes del programa.

OBLIGACIONES DE CONFIDENCIALIDAD:
El Participante se obliga a mantener confidencialidad absoluta respecto de:
a) Metodología y contenidos propietarios del Programa de Creación.
b) Información personal compartida por otros participantes dentro del programa.
c) Estrategias, técnicas y herramientas de transformación personal y empresarial.
d) Identidad de otros participantes y circunstancias compartidas en el salón.

${TEXTO_CONFIDENCIALIDAD_SALON}

VIGENCIA: El presente Acuerdo tendrá vigencia indefinida y permanecerá en vigor
aún después de la conclusión del programa.

JURISDICCIÓN: Ante cualquier controversia, las partes se someten a la jurisdicción
de los Tribunales competentes de la Ciudad de México, renunciando a cualquier otro
fuero que pudiera corresponderles por razón de sus domicilios presentes o futuros.
        `
      },
      {
        id: 'autorizacion_grabacion_mx',
        title: 'Autorización de Grabación de Video, Voz e Imagen en Actividades',
        type: 'media_auth',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'Autorizo a CREAR PSL Global a grabar mi imagen, voz y video durante sesiones y actividades del programa, conforme a la LFPDPPP.',
        content: `
AUTORIZACIÓN DE GRABACIÓN DE VIDEO, VOZ E IMAGEN EN ACTIVIDADES DE SALA
CREAR PSL Global, S.A. de C.V. — Fundamento: Arts. 8, 9 y 10 LFPDPPP

Yo, el/la participante que suscribe, con pleno conocimiento y consentimiento, AUTORIZO
EXPRESAMENTE a CREAR PSL Global, S.A. de C.V. a realizar grabaciones de audio, video
y fotografía de mi imagen y voz durante el Programa de Creación, en los términos
establecidos por la Ley Federal de Protección de Datos Personales en Posesión de los
Particulares (LFPDPPP) y su Reglamento.

BASE LEGAL: Artículo 8 LFPDPPP — Consentimiento expreso por escrito para datos sensibles.
Artículo 9 LFPDPPP — Tratamiento de datos con finalidad específica, compatible y lícita.
Artículo 10 LFPDPPP — Excepción de consentimiento para datos accesibles al público general.

${TEXTO_GRABACION_BASE}

AVISO DE PRIVACIDAD APLICABLE: El tratamiento de imagen y voz se rige por el Aviso de
Privacidad Integral de CREAR PSL Global, disponible en https://crearpsl.com/privacidad
        `
      }
    ]
  },

  // ════════════════════════════════════════════════════════
  // PERÚ — LEY N.º 29733 (ANPD)
  // ════════════════════════════════════════════════════════
  PE: {
    countryCode: 'PE',
    countryName: 'Perú',
    flag: '🇵🇪',
    lawReference: 'Ley N.º 29733 y R.D. 016-2024-JUS/ANPD',
    documents: [
      {
        id: 'consentimiento_datos_pe',
        title: 'Consentimiento Expreso para Banco de Datos Personales',
        type: 'privacy',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'Otorgo mi consentimiento expreso para el tratamiento de mis datos personales conforme a la Ley N.º 29733.',
        content: `
CONSENTIMIENTO EXPRESO PARA TRATAMIENTO DE DATOS PERSONALES
CREAR PSL PERU S.A.C. — Banco de Datos Personales: "PARTICIPANTES PROGRAMA CREACIÓN"

Conforme a lo dispuesto en la Ley N.º 29733, Ley de Protección de Datos Personales, su
Reglamento aprobado por D.S. N.º 003-2013-JUS, y la Resolución Directoral N.º 016-2024-JUS/ANPD
de la Autoridad Nacional de Protección de Datos Personales (ANPD), CREAR PSL Peru S.A.C.
(en adelante "el Titular del Banco"), con domicilio en Lima, Perú, le informa lo siguiente:

TITULAR DEL BANCO DE DATOS: CREAR PSL Peru S.A.C., Lima, Perú.
NOMBRE DEL BANCO: "PARTICIPANTES PROGRAMA CREACIÓN — CPSL PERU"
FINALIDAD DEL TRATAMIENTO: Gestión del programa de transformación personal y empresarial,
comunicación con participantes, seguimiento de avance, facturación y cobro.

DATOS PERSONALES OBJETO DE TRATAMIENTO:
- Datos identificativos: nombre, DNI, correo electrónico, teléfono.
- Datos de contacto: dirección, ciudad, departamento.
- Datos de facturación: RUC (si aplica), datos bancarios para facilitar pagos.

FLUJO TRANSFRONTERIZO (Art. 15 Ley 29733):
Sus datos podrán ser transferidos a empresas del grupo CREAR PSL Global ubicadas en México,
Colombia, Ecuador y España, únicamente para fines operativos del programa. Dichos países
cuentan con marcos legales de protección equiparables al peruano.

DERECHOS DEL TITULAR: Acceso, Rectificación, Cancelación y Oposición conforme al
Capítulo V de la Ley N.º 29733. Solicitudes a: datos@crearpsl.com.pe
PLAZO DE CONSERVACIÓN: Los datos se conservarán durante la vigencia del programa y
hasta 5 años posteriores para cumplimiento de obligaciones legales.
        `
      },
      {
        id: 'nda_pe',
        title: 'Acuerdo de Confidencialidad y No Divulgación',
        type: 'nda',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'Firmo el Acuerdo de Confidencialidad y No Divulgación del Programa.',
        content: `
ACUERDO DE CONFIDENCIALIDAD Y NO DIVULGACIÓN
Programa de Creación — CREAR PSL Peru S.A.C.

Regulado conforme al Código Civil del Perú (D. Legislativo N.º 295) y la Ley de la
Empresa Individual de Responsabilidad Limitada aplicable.

${TEXTO_CONFIDENCIALIDAD_SALON}

JURISDICCIÓN: Cualquier controversia será resuelta por los Juzgados Civiles
de Lima Cercado, Perú, renunciando al fuero de domicilio.
        `
      },
      {
        id: 'autorizacion_grabacion_pe',
        title: 'Autorización de Grabación de Video, Voz e Imagen en Actividades',
        type: 'media_auth',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'Autorizo a CREAR PSL a grabar mi imagen, voz y video durante las actividades del programa, conforme a la Ley N.º 29733.',
        content: `
AUTORIZACIÓN DE GRABACIÓN DE VIDEO, VOZ E IMAGEN EN ACTIVIDADES DE SALA
CREAR PSL Peru S.A.C. — Fundamento: Ley N.º 29733, Art. 5 y Art. 13

Yo, el/la participante que suscribe, AUTORIZO EXPRESAMENTE a CREAR PSL Peru S.A.C.
a realizar grabaciones de audio, video y fotografía de mi imagen y voz durante las
actividades del Programa de Creación.

BASE LEGAL: Artículo 5 Ley 29733 — Consentimiento libre, previo, expreso e informado.
Artículo 13 Ley 29733 — Datos sensibles: imagen y voz requieren consentimiento explícito.
Reglamento D.S. N.º 003-2013-JUS: Artículo 8 — Finalidades del tratamiento.

${TEXTO_GRABACION_BASE}

Banco de Datos Personal afectado: "PARTICIPANTES PROGRAMA CREACIÓN — CPSL PERU"
Titular del Banco: CREAR PSL Peru S.A.C.
        `,
      },
      {
        id: 'flujo_transfronterizo_pe',
        title: 'Cláusula de Flujo Transfronterizo de Datos',
        type: 'terms',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'Acepto la transferencia internacional de mis datos para fines operativos del programa.',
        content: `
CLÁUSULA DE FLUJO TRANSFRONTERIZO DE DATOS PERSONALES
Art. 15 Ley N.º 29733 — Perú

CREAR PSL Peru S.A.C. informa que, para la correcta operación del Programa de Creación,
sus datos personales podrán ser transferidos a las siguientes entidades internacionales
del grupo CREAR PSL Global:

- CREAR PSL Global, S.A. de C.V. — México (LFPDPPP)
- CREAR PSL Colombia S.A.S. — Colombia (Ley 1581/2012)
- CREAR PSL Ecuador Cía. Ltda. — Ecuador (LOPDP)

Estas transferencias se realizan bajo protocolos de seguridad equivalentes al marco
peruano, con acuerdos de procesamiento de datos que garantizan el mismo nivel de
protección que la Ley N.º 29733 otorga en el Perú.

El participante manifiesta su CONSENTIMIENTO EXPRESO E INFORMADO para dicha transferencia,
pudiendo revocarlo en cualquier momento sin afectar la vigencia del programa.
        `
      }
    ]
  },

  // ════════════════════════════════════════════════════════
  // COLOMBIA — LEY ESTATUTARIA 1581/2012 (SIC)
  // ════════════════════════════════════════════════════════
  CO: {
    countryCode: 'CO',
    countryName: 'Colombia',
    flag: '🇨🇴',
    lawReference: 'Ley Estatutaria 1581 de 2012 (SIC)',
    documents: [
      {
        id: 'autorizacion_datos_co',
        title: 'Autorización Previa, Expresa e Informada de Tratamiento de Datos',
        type: 'privacy',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'Autorizo el tratamiento de mis datos personales conforme a la Ley 1581 de 2012.',
        content: `
AUTORIZACIÓN PREVIA, EXPRESA E INFORMADA PARA EL TRATAMIENTO DE DATOS PERSONALES
CREAR PSL Colombia S.A.S. — NIT: [000.000.000-0]

En cumplimiento de la Ley Estatutaria 1581 de 2012, el Decreto 1074 de 2015 y las
instrucciones de la Superintendencia de Industria y Comercio (SIC), CREAR PSL Colombia
S.A.S. (en adelante "el Responsable"), solicita su Autorización PREVIA, EXPRESA e
INFORMADA para el tratamiento de sus datos personales.

FINALIDADES DEL TRATAMIENTO:
1. Inscripción, administración y seguimiento del Programa de Creación.
2. Comunicaciones operativas (recordatorios, actualizaciones, material de estudio).
3. Facturación y gestión de pagos del programa.
4. Análisis estadístico de resultados del programa (datos anonimizados).
5. Comunicaciones comerciales sobre nuevos programas (con opción de opt-out).

DATOS A TRATAR: Nombre completo, cédula de ciudadanía, correo electrónico, teléfono,
ciudad de residencia, y datos de contacto de emergencia.

DERECHOS DEL TITULAR (Art. 8 Ley 1581/2012): Conocer, actualizar, rectificar y
suprimir sus datos; solicitar prueba de la autorización; ser informado del uso de sus
datos; presentar quejas ante la SIC. Contacto: datos@crearpsl.com.co

RESPONSABLE: CREAR PSL Colombia S.A.S., Medellín, Colombia.
TRANSFERENCIAS INTERNACIONALES: Conforme al Capítulo IV de la Ley 1581/2012,
sus datos podrán ser transferidos a entidades del grupo CREAR PSL Global con estándares
equivalentes de protección de datos.
        `
      },
      {
        id: 'contrato_confidencialidad_co',
        title: 'Contrato de Confidencialidad del Programa',
        type: 'nda',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'Firmo el Contrato de Confidencialidad del Programa de Creación.',
        content: `
CONTRATO DE CONFIDENCIALIDAD
Programa de Creación — CREAR PSL Colombia S.A.S.

El presente contrato se suscribe al tenor del Código Civil colombiano (Ley 57 de 1887)
y la Ley 256 de 1996 sobre competencia desleal.

${TEXTO_CONFIDENCIALIDAD_SALON}

CLÁUSULA PENAL: En caso de incumplimiento, el Participante se obliga a pagar a
CREAR PSL Colombia S.A.S. una suma equivalente a 50 SMMLV (Salarios Mínimos Mensuales
Legales Vigentes) como estimación anticipada de perjuicios, sin perjuicio de las
acciones adicionales que correspondan.

JURISDICCIÓN: Centro de Arbitraje y Conciliación de la Cámara de Comercio de Medellín.
        `
      },
      {
        id: 'autorizacion_grabacion_co',
        title: 'Autorización de Grabación de Video, Voz e Imagen en Actividades',
        type: 'media_auth',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'Autorizo a CREAR PSL Colombia a grabar mi imagen, voz y video en actividades del programa, conforme a la Ley 1581/2012.',
        content: `
AUTORIZACIÓN PARA GRABACIÓN DE IMAGEN, VOZ Y VIDEO EN ACTIVIDADES DE SALA
CREAR PSL Colombia S.A.S. — Fundamento: Ley Estatutaria 1581 de 2012, SIC

Yo, el/la participante que suscribe, otorgo mi AUTORIZACIÓN PREVIA, EXPRESA E INFORMADA
a CREAR PSL Colombia S.A.S. para realizar grabaciones de audio, video y fotografía
de mi imagen y voz durante el Programa de Creación.

BASE LEGAL: Artículo 3, literal b Ley 1581/2012 — Definición de dato personal (imagen y voz).
Artículo 7 Ley 1581/2012 — Autorización del titular para tratamiento de datos.
Concepto SIC 15-182866-2: La imagen como dato personal de carácter sensible.

${TEXTO_GRABACION_BASE}

Responsable: CREAR PSL Colombia S.A.S., Medellín, Colombia.
Contacto DPD: datos@crearpsl.com.co
        `,
      },
      {
        id: 'terminos_programa_co',
        title: 'Términos y Condiciones del Programa',
        type: 'terms',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'Acepto los Términos y Condiciones del Programa de Creación.',
        content: `
TÉRMINOS Y CONDICIONES DEL PROGRAMA DE CREACIÓN
CREAR PSL Colombia S.A.S.

Al inscribirse al Programa de Creación, el Participante acepta los siguientes términos:

1. NATURALEZA DEL PROGRAMA: El Programa de Creación es un programa de desarrollo personal
   y empresarial, NO una garantía de resultados financieros específicos. Los resultados
   dependen del compromiso y esfuerzo personal de cada participante.

2. POLÍTICA DE PAGOS Y REEMBOLSOS: Los pagos realizados no son reembolsables una vez
   iniciado el programa, salvo causas de fuerza mayor debidamente documentadas.

3. COMPROMISOS DEL PARTICIPANTE: Asistir puntualmente a las sesiones, completar las
   tareas asignadas, mantener una actitud respetuosa con el equipo y demás participantes.

4. DERECHOS DE PROPIEDAD INTELECTUAL: Todos los materiales, metodologías y contenidos
   del programa son propiedad exclusiva de CREAR PSL Global y están protegidos por las
   leyes de propiedad intelectual colombianas e internacionales.

5. DESLINDE DE RESPONSABILIDAD: CREAR PSL Colombia S.A.S. no se hace responsable
   por decisiones de negocio o personales tomadas por el participante basadas en el
   contenido del programa.
        `
      }
    ]
  },

  // ════════════════════════════════════════════════════════
  // ECUADOR — LOPDP
  // ════════════════════════════════════════════════════════
  EC: {
    countryCode: 'EC',
    countryName: 'Ecuador',
    flag: '🇪🇨',
    lawReference: 'LOPDP (R.O. Sup. 459 — 26-May-2021)',
    documents: [
      {
        id: 'consentimiento_lopdp_ec',
        title: 'Consentimiento Informado LOPDP',
        type: 'privacy',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'Otorgo mi consentimiento informado para el tratamiento de mis datos conforme a la LOPDP.',
        content: `
CONSENTIMIENTO INFORMADO PARA EL TRATAMIENTO DE DATOS PERSONALES
TRANSFORMACIÓN GLOBAL TG-BVS CÍA. LTDA. / CREAR PSL Ecuador
RUC: [1792xxxxxx001]

Conforme a la Ley Orgánica de Protección de Datos Personales (LOPDP, R.O. Sup. 459
del 26 de mayo de 2021) y su Reglamento General (D.E. 864, 2022), TRANSFORMACIÓN GLOBAL
TG-BVS CÍA. LTDA. (en adelante "el Responsable del Tratamiento"), le informa:

RESPONSABLE: Transformación Global TG-BVS Cía. Ltda., con domicilio en Quito, Ecuador.
DELEGADO DE PROTECCIÓN DE DATOS (DPD): datos@crearpsl.ec

DATOS QUE SE TRATARÁN:
- Datos de identificación: nombre, cédula de identidad, correo electrónico.
- Datos de contacto: teléfono, ciudad, provincia.
- Datos de imagen: fotografías y grabaciones en eventos (con consentimiento adicional).

FINALIDAD Y BASE LEGAL:
Tratamiento necesario para la ejecución del contrato de participación en el Programa
de Creación (Art. 7, literal b, LOPDP). Las comunicaciones comerciales se basan en
su consentimiento explícito (Art. 7, literal a, LOPDP).

PLAZO DE CONSERVACIÓN: Duración del programa + 5 años para obligaciones legales.
TRANSFERENCIAS INTERNACIONALES (Art. 43 LOPDP): Sus datos podrán ser transferidos
a entidades CREAR PSL en México, Perú, Colombia y España bajo garantías adecuadas.

DERECHOS (Art. 9-22 LOPDP): Acceso, Rectificación, Eliminación, Oposición,
Portabilidad, Limitación y No Decisión Automatizada. Ejercicio: datos@crearpsl.ec
AUTORIDAD DE CONTROL: Superintendencia de Protección de Datos Personales.
        `
      },
      {
        id: 'nda_ec',
        title: 'Acuerdo de Confidencialidad del Programa',
        type: 'nda',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'Firmo el Acuerdo de Confidencialidad del Programa de Creación.',
        content: `
ACUERDO DE CONFIDENCIALIDAD
Programa de Creación — Transformación Global TG-BVS Cía. Ltda.

Regulado conforme al Código Civil del Ecuador (Codificación N.º 10, R.O. Sup. 46,
24-Jun-2005) y la Ley de Propiedad Intelectual ecuatoriana.

${TEXTO_CONFIDENCIALIDAD_SALON}

JURISDICCIÓN: Juzgados de lo Civil y Mercantil de Quito, Ecuador.
        `
      },
      {
        id: 'autorizacion_grabacion_ec',
        title: 'Autorización de Grabación de Video, Voz e Imagen en Actividades',
        type: 'media_auth',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'Autorizo a CREAR PSL Ecuador a grabar mi imagen, voz y video durante actividades del programa, conforme a la LOPDP.',
        content: `
AUTORIZACIÓN DE GRABACIÓN DE IMAGEN, VOZ Y VIDEO EN ACTIVIDADES
Transformación Global TG-BVS Cía. Ltda. — Fundamento: LOPDP, Arts. 7, 9 y 26

Yo, el/la participante que suscribe, AUTORIZO LIBREMENTE Y DE FORMA INFORMADA a
Transformación Global TG-BVS Cía. Ltda. a realizar grabaciones de audio, video y
fotografía de mi imagen y voz durante las actividades del Programa de Creación.

BASE LEGAL: Artículo 7 LOPDP — Consentimiento: libre, específico, informado e inequívoco.
Artículo 9 LOPDP — Datos sensibles: imagen biométrica y voz requieren consentimiento explícito.
Artículo 26 LOPDP — Uso de imagen y datos de audio/video de personas identificables.

${TEXTO_GRABACION_BASE}

Responsable: Transformación Global TG-BVS Cía. Ltda.
Delegado de Protección de Datos: datos@crearpsl.ec
Autoridad de Control: Superintendencia de Protección de Datos Personales — Ecuador.
        `,
      },
      {
        id: 'terminos_ec',
        title: 'Términos y Condiciones de Participación',
        type: 'terms',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'Acepto los Términos y Condiciones de Participación en el Programa.',
        content: `
TÉRMINOS Y CONDICIONES DE PARTICIPACIÓN
Programa de Creación — Transformación Global TG-BVS Cía. Ltda.

1. INSCRIPCIÓN Y ACEPTACIÓN: La inscripción al Programa de Creación implica la aceptación
   total de los presentes Términos y Condiciones, así como del Acuerdo de Confidencialidad
   y la Política de Privacidad conforme a la LOPDP.

2. COMPROMISOS DE PARTICIPACIÓN: El/La participante se compromete a:
   - Asistir puntualmente a todas las sesiones del programa.
   - Mantener confidencialidad sobre los contenidos y participantes.
   - Respetar las normas de convivencia establecidas por el equipo facilitador.
   - Completar las asignaciones y ejercicios del programa.

3. POLÍTICA FINANCIERA: Los valores cancelados por concepto de inscripción al programa
   no son reembolsables. En caso de fuerza mayor debidamente documentada, se analizará
   cada caso particular.

4. PROPIEDAD INTELECTUAL: Los materiales, metodologías y contenidos del programa están
   protegidos por la Ley de Propiedad Intelectual del Ecuador (Ley N.º 83). Su reproducción
   total o parcial sin autorización expresa constituye infracción legal.

5. LIMITACIÓN DE RESPONSABILIDAD: Transformación Global TG-BVS Cía. Ltda. no garantiza
   resultados económicos específicos derivados de la participación en el programa.
        `
      }
    ]
  },

  // ════════════════════════════════════════════════════════
  // ESPAÑA — RGPD (UE 2016/679) + LOPDGDD
  // ════════════════════════════════════════════════════════
  ES: {
    countryCode: 'ES',
    countryName: 'España',
    flag: '🇪🇸',
    lawReference: 'RGPD (UE 2016/679) y LOPDGDD (LO 3/2018)',
    documents: [
      {
        id: 'clausulas_rgpd_es',
        title: 'Cláusulas Informativas RGPD e Información del Responsable',
        type: 'privacy',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'He leído y entendido las Cláusulas Informativas RGPD y la política de privacidad.',
        content: `
CLÁUSULAS INFORMATIVAS RGPD — ART. 13 Y 14 RGPD (UE) 2016/679
CREAR PSL SPAIN S.L. / CREAR PSL Global

RESPONSABLE DEL TRATAMIENTO: CREAR PSL Spain S.L., Madrid, España.
DELEGADO DE PROTECCIÓN DE DATOS: dpo@crearpsl.es

FINALIDADES Y BASE JURÍDICA (Art. 6 RGPD):
- Gestión del contrato de participación (Art. 6.1.b RGPD): inscripción, administración
  y seguimiento del Programa de Creación.
- Interés legítimo (Art. 6.1.f RGPD): mejora de los programas formativos.
- Consentimiento (Art. 6.1.a RGPD): comunicaciones comerciales sobre nuevos programas.

PLAZO DE CONSERVACIÓN: Los datos se conservarán durante la vigencia del programa y
hasta 5 años posteriores conforme al principio de limitación del plazo (Art. 5.1.e RGPD).

DESTINATARIOS Y TRANSFERENCIAS INTERNACIONALES (Art. 44-49 RGPD):
Sus datos podrán ser transferidos a entidades CREAR PSL Global en México, Perú, Colombia
y Ecuador mediante Cláusulas Contractuales Tipo (CCT/CCM) aprobadas por la Comisión
Europea (Decisión 2021/914/UE), garantizando un nivel de protección equivalente al RGPD.

DERECHOS (Art. 15-22 RGPD): Acceso, Rectificación, Supresión ("derecho al olvido"),
Portabilidad, Oposición, Limitación del Tratamiento y a No ser objeto de decisiones
automatizadas. Ejercicio: datos@crearpsl.es
RECLAMACIONES: Agencia Española de Protección de Datos (AEPD) — www.aepd.es
        `
      },
      {
        id: 'consentimiento_optin_es',
        title: 'Consentimiento Explícito (Opt-in Activo)',
        type: 'privacy',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'Doy mi consentimiento EXPLÍCITO (opt-in activo) para el tratamiento de mis datos con las finalidades indicadas.',
        content: `
CONSENTIMIENTO EXPLÍCITO PARA TRATAMIENTO DE DATOS PERSONALES
Art. 6.1.a y Art. 7 RGPD (UE) 2016/679

Yo, el/la participante que suscribe, mediante el presente acto PRESTO MI CONSENTIMIENTO
LIBRE, ESPECÍFICO, INFORMADO E INEQUÍVOCO para que CREAR PSL Spain S.L. trate mis
datos personales con las siguientes finalidades específicas:

☐ COMUNICACIONES COMERCIALES: Recibir información sobre nuevos programas, eventos y
  servicios de CREAR PSL. (Puede revocar en cualquier momento desde datos@crearpsl.es)

CARÁCTER VOLUNTARIO: Este consentimiento es completamente voluntario. Su negativa no
afectará a la ejecución del contrato de participación principal.

REVOCACIÓN: El titular del dato podrá revocar este consentimiento en cualquier momento
sin que ello afecte a la licitud del tratamiento previo a su retirada (Art. 7.3 RGPD).

BASE JURÍDICA DEL TRATAMIENTO: Consentimiento explícito del interesado (Art. 6.1.a RGPD).
        `
      },
      {
        id: 'autorizacion_grabacion_es',
        title: 'Autorización de Grabación de Imagen, Voz y Video en Actividades (RGPD)',
        type: 'media_auth',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'Doy mi consentimiento explícito para que CREAR PSL grabe mi imagen, voz y video durante actividades del programa, conforme al RGPD y la LOPDGDD.',
        content: `
CONSENTIMIENTO EXPLÍCITO PARA GRABACIÓN DE IMAGEN, VOZ Y VIDEO EN ACTIVIDADES
CREAR PSL Spain S.L. — Fundamento: Art. 6.1.a y Art. 9 RGPD (UE) 2016/679

Yo, el/la participante que suscribe, presto mi CONSENTIMIENTO LIBRE, ESPECÍFICO,
INFORMADO E INEQUÍVOCO a CREAR PSL Spain S.L. para el tratamiento de mi imagen y voz
mediante grabaciones de audio, video y fotografía durante las actividades del Programa
de Creación, conforme al Reglamento General de Protección de Datos (RGPD) y la Ley
Orgánica 3/2018 de Protección de Datos Personales y Garantía de los Derechos Digitales
(LOPDGDD).

BASE LEGAL RGPD: Artículo 6.1.a — Consentimiento explícito del interesado.
Art. 9.2.a RGPD — Consentimiento explícito para categorías especiales de datos (imagen biométrica).
LOPDGDD Art. 9 — Tratamiento de datos de identificación personal en el ámbito civil.
Considerando 51 RGPD — Los datos biométricos (imagen y voz) que permitan identificación única.

${TEXTO_GRABACION_BASE}

TRANSFERENCIAS INTERNACIONALES DE MATERIAL AUDIOVISUAL (Art. 44-46 RGPD):
El material audiovisual podrá ser transferido a entidades del grupo CREAR PSL Global
ubicadas fuera del Espacio Económico Europeo mediante Cláusulas Contractuales Tipo
(CCT/CCM) aprobadas por la Comisión Europea (Decisión 2021/914/UE).

RESPONSABLE: CREAR PSL Spain S.L., Madrid.
DELEGADO DE PROTECCIÓN DE DATOS: dpo@crearpsl.es
RECLAMACIONES: Agencia Española de Protección de Datos (AEPD) — www.aepd.es
        `,
      },
      {
        id: 'nda_es',
        title: 'Acuerdo de Confidencialidad (NDA)',
        type: 'nda',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'Firmo el Acuerdo de Confidencialidad y No Divulgación del Programa.',
        content: `
ACUERDO DE CONFIDENCIALIDAD Y NO DIVULGACIÓN
Programa de Creación — CREAR PSL Spain S.L.

Conforme al Código Civil español (Real Decreto de 24 de julio de 1889) y la Ley de
Competencia Desleal (Ley 3/1991, de 10 de enero), se suscribe el presente Acuerdo.

${TEXTO_CONFIDENCIALIDAD_SALON}

TRANSFERENCIAS CON GARANTÍAS ADECUADAS (Art. 46 RGPD):
Toda transferencia internacional de datos personales del participante se realizará
conforme a Cláusulas Contractuales Tipo (CCT) aprobadas por la Comisión Europea,
Decisión de Ejecución (UE) 2021/914.

JURISDICCIÓN: Juzgados y Tribunales de Madrid, España.
        `
      }
    ]
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MAPEADORES Y UTILIDADES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mapeo de nombres de sede a código de país
 */
export const SEDE_TO_COUNTRY = {
  'cdmx': 'MX', 'mexico': 'MX', 'méxico': 'MX', 'santa fe': 'MX', 'cdmx ciclo 1': 'MX',
  'méxico ciclo 1': 'MX', 'mexico ciclo 1': 'MX',
  'lima': 'PE', 'lima ciclo 1': 'PE', 'lima ciclo 2': 'PE',
  'medellín': 'CO', 'medellin': 'CO', 'medellín ciclo 1': 'CO',
  'quito': 'EC', 'quito ciclo 1': 'EC', 'quito ciclo 2': 'EC',
  'cuenca': 'EC', 'cuenca ciclo 1': 'EC',
  'guayaquil': 'EC', 'gye': 'EC', 'guayaquil ciclo 1': 'EC',
  'madrid': 'ES', 'españa': 'ES', 'spain': 'ES',
};

/**
 * Retorna el código de país para una sede dada
 * @param {string} sedeNombre - Nombre de la sede
 * @returns {string} Código de país (MX | PE | CO | EC | ES)
 */
export const getSedePais = (sedeNombre) => {
  if (!sedeNombre) return 'PE'; // Default Perú (sede principal)
  const normalized = (sedeNombre || '').toLowerCase().trim();
  return SEDE_TO_COUNTRY[normalized] || 'PE';
};

/**
 * Retorna los documentos del país dado
 * @param {string} countryCode - Código de país
 * @returns {object} Objeto con countryCode, documents, etc.
 */
export const getContractsByCountry = (countryCode) => {
  return LEGAL_CONTRACTS[countryCode] || LEGAL_CONTRACTS['PE'];
};

/**
 * Retorna todos los documentos REQUERIDOS de un país
 */
export const getRequiredDocuments = (countryCode) => {
  const contracts = getContractsByCountry(countryCode);
  return contracts.documents.filter(d => d.required);
};

export default LEGAL_CONTRACTS;
