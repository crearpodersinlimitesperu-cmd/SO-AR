const fs = require('fs');
const file = 'src/data/legalContracts.js';
let content = fs.readFileSync(file, 'utf8');

// ─── TEXTO BASE COMPARTIDO ───────────────────────────────────────────────────
// Se inyectará una variable de texto base al inicio del archivo, luego de TEXTO_CONFIDENCIALIDAD_SALON

const TEXTO_BASE = `
// ─────────────────────────────────────────────────────────────────────────────
// TEXTO BASE: AUTORIZACIÓN GRABACIÓN VIDEO/VOZ/FOTO EN ACTIVIDADES
// Se reutiliza en todos los países adaptando la referencia legal local.
// ─────────────────────────────────────────────────────────────────────────────
const TEXTO_GRABACION_BASE = \`
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
\`;
`;

// Insertar TEXTO_GRABACION_BASE justo después del bloque TEXTO_CONFIDENCIALIDAD_SALON
const anchorAfter = 'Regulado conforme al Código Civil Federal de los Estados Unidos Mexicanos.';
// Find the end of TEXTO_CONFIDENCIALIDAD_SALON const declaration
const confEnd = content.indexOf('`;\n\n// ────────────────────────────────────────────────────────────────────────────\n// CONTRATOS POR PAÍS');
if (confEnd === -1) {
  // try alternate
  const confEnd2 = content.indexOf('`;\r\n\r\n// ────');
  console.log('confEnd2:', confEnd2);
}

// Use regex approach
content = content.replace(
  /(const TEXTO_CONFIDENCIALIDAD_SALON = `[\s\S]*?`;\n)/,
  `$1\n${TEXTO_BASE}\n`
);

// ─── MX: Reemplazar el doc de imagen opcional por uno nuevo más completo de grabación REQUERIDO ───
content = content.replace(
  `      {
        id: 'autorizacion_imagen_mx',
        title: 'Autorización de Uso de Imagen',
        type: 'image_auth',
        version: '2026-v1',
        required: false,
        checkboxLabel: 'Autorizo el uso de mi imagen y voz para material promocional del programa (opcional).',
        content: \`
AUTORIZACIÓN DE USO DE IMAGEN Y VOZ

Yo, el/la participante que suscribe, mediante el presente instrumento y en pleno ejercicio
de mis derechos, AUTORIZO de manera voluntaria, expresa e informada a CREAR PSL Global,
S.A. de C.V., para que utilice mi imagen, voz y declaraciones captadas durante el
Programa de Creación en los siguientes términos:

ALCANCE DE LA AUTORIZACIÓN:
- Fotografías y grabaciones de video realizadas durante sesiones, talleres y eventos.
- Uso en plataformas digitales, redes sociales y material promocional de la empresa.
- Uso en testimoniales para promover el Programa de Creación en México y en el extranjero.

LIMITACIONES: No se utilizará mi imagen en contextos que atenten contra mi dignidad
o en campañas de naturaleza política o religiosa.

REVOCACIÓN: Podrá revocar esta autorización en cualquier momento mediante solicitud
escrita a privacidad@crearpsl.net, sin que ello afecte el material ya publicado.

Esta autorización se otorga SIN contraprestación económica y de forma gratuita.
        \`
      }`,
  `      {
        id: 'autorizacion_grabacion_mx',
        title: 'Autorización de Grabación de Video, Voz e Imagen en Actividades',
        type: 'media_auth',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'Autorizo a CREAR PSL Global a grabar mi imagen, voz y video durante sesiones y actividades del programa, conforme a la LFPDPPP.',
        content: \`
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

\${TEXTO_GRABACION_BASE}

AVISO DE PRIVACIDAD APLICABLE: El tratamiento de imagen y voz se rige por el Aviso de
Privacidad Integral de CREAR PSL Global, disponible en https://crearpsl.com/privacidad
        \`
      }`
);

// ─── PE: Agregar doc de grabación ───
content = content.replace(
  `      {
        id: 'flujo_transfronterizo_pe',`,
  `      {
        id: 'autorizacion_grabacion_pe',
        title: 'Autorización de Grabación de Video, Voz e Imagen en Actividades',
        type: 'media_auth',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'Autorizo a CREAR PSL a grabar mi imagen, voz y video durante las actividades del programa, conforme a la Ley N.º 29733.',
        content: \`
AUTORIZACIÓN DE GRABACIÓN DE VIDEO, VOZ E IMAGEN EN ACTIVIDADES DE SALA
CREAR PSL Peru S.A.C. — Fundamento: Ley N.º 29733, Art. 5 y Art. 13

Yo, el/la participante que suscribe, AUTORIZO EXPRESAMENTE a CREAR PSL Peru S.A.C.
a realizar grabaciones de audio, video y fotografía de mi imagen y voz durante las
actividades del Programa de Creación.

BASE LEGAL: Artículo 5 Ley 29733 — Consentimiento libre, previo, expreso e informado.
Artículo 13 Ley 29733 — Datos sensibles: imagen y voz requieren consentimiento explícito.
Reglamento D.S. N.º 003-2013-JUS: Artículo 8 — Finalidades del tratamiento.

\${TEXTO_GRABACION_BASE}

Banco de Datos Personal afectado: "PARTICIPANTES PROGRAMA CREACIÓN — CPSL PERU"
Titular del Banco: CREAR PSL Peru S.A.C.
        \`,
      },
      {
        id: 'flujo_transfronterizo_pe',`
);

// ─── CO: Agregar doc de grabación ───
content = content.replace(
  `      {
        id: 'terminos_programa_co',`,
  `      {
        id: 'autorizacion_grabacion_co',
        title: 'Autorización de Grabación de Video, Voz e Imagen en Actividades',
        type: 'media_auth',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'Autorizo a CREAR PSL Colombia a grabar mi imagen, voz y video en actividades del programa, conforme a la Ley 1581/2012.',
        content: \`
AUTORIZACIÓN PARA GRABACIÓN DE IMAGEN, VOZ Y VIDEO EN ACTIVIDADES DE SALA
CREAR PSL Colombia S.A.S. — Fundamento: Ley Estatutaria 1581 de 2012, SIC

Yo, el/la participante que suscribe, otorgo mi AUTORIZACIÓN PREVIA, EXPRESA E INFORMADA
a CREAR PSL Colombia S.A.S. para realizar grabaciones de audio, video y fotografía
de mi imagen y voz durante el Programa de Creación.

BASE LEGAL: Artículo 3, literal b Ley 1581/2012 — Definición de dato personal (imagen y voz).
Artículo 7 Ley 1581/2012 — Autorización del titular para tratamiento de datos.
Concepto SIC 15-182866-2: La imagen como dato personal de carácter sensible.

\${TEXTO_GRABACION_BASE}

Responsable: CREAR PSL Colombia S.A.S., Medellín, Colombia.
Contacto DPD: datos@crearpsl.com.co
        \`,
      },
      {
        id: 'terminos_programa_co',`
);

// ─── EC: Agregar doc de grabación ───
content = content.replace(
  `      {
        id: 'terminos_ec',`,
  `      {
        id: 'autorizacion_grabacion_ec',
        title: 'Autorización de Grabación de Video, Voz e Imagen en Actividades',
        type: 'media_auth',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'Autorizo a CREAR PSL Ecuador a grabar mi imagen, voz y video durante actividades del programa, conforme a la LOPDP.',
        content: \`
AUTORIZACIÓN DE GRABACIÓN DE IMAGEN, VOZ Y VIDEO EN ACTIVIDADES
Transformación Global TG-BVS Cía. Ltda. — Fundamento: LOPDP, Arts. 7, 9 y 26

Yo, el/la participante que suscribe, AUTORIZO LIBREMENTE Y DE FORMA INFORMADA a
Transformación Global TG-BVS Cía. Ltda. a realizar grabaciones de audio, video y
fotografía de mi imagen y voz durante las actividades del Programa de Creación.

BASE LEGAL: Artículo 7 LOPDP — Consentimiento: libre, específico, informado e inequívoco.
Artículo 9 LOPDP — Datos sensibles: imagen biométrica y voz requieren consentimiento explícito.
Artículo 26 LOPDP — Uso de imagen y datos de audio/video de personas identificables.

\${TEXTO_GRABACION_BASE}

Responsable: Transformación Global TG-BVS Cía. Ltda.
Delegado de Protección de Datos: datos@crearpsl.ec
Autoridad de Control: Superintendencia de Protección de Datos Personales — Ecuador.
        \`,
      },
      {
        id: 'terminos_ec',`
);

// ─── ES: Agregar doc de grabación (RGPD requiere tratamiento especial de imagen) ───
content = content.replace(
  `      {
        id: 'nda_es',`,
  `      {
        id: 'autorizacion_grabacion_es',
        title: 'Autorización de Grabación de Imagen, Voz y Video en Actividades (RGPD)',
        type: 'media_auth',
        version: '2026-v1',
        required: true,
        checkboxLabel: 'Doy mi consentimiento explícito para que CREAR PSL grabe mi imagen, voz y video durante actividades del programa, conforme al RGPD y la LOPDGDD.',
        content: \`
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

\${TEXTO_GRABACION_BASE}

TRANSFERENCIAS INTERNACIONALES DE MATERIAL AUDIOVISUAL (Art. 44-46 RGPD):
El material audiovisual podrá ser transferido a entidades del grupo CREAR PSL Global
ubicadas fuera del Espacio Económico Europeo mediante Cláusulas Contractuales Tipo
(CCT/CCM) aprobadas por la Comisión Europea (Decisión 2021/914/UE).

RESPONSABLE: CREAR PSL Spain S.L., Madrid.
DELEGADO DE PROTECCIÓN DE DATOS: dpo@crearpsl.es
RECLAMACIONES: Agencia Española de Protección de Datos (AEPD) — www.aepd.es
        \`,
      },
      {
        id: 'nda_es',`
);

fs.writeFileSync(file, content);
console.log('✅ Patch grabación completado');

// Verificar que todos los países tienen el doc media_auth
const result = fs.readFileSync(file, 'utf8');
const matches = result.match(/id: 'autorizacion_grabacion_/g);
console.log('Docs de grabación encontrados:', matches ? matches.length : 0, matches);
