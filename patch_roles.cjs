const fs = require('fs');
const file = 'src/components/LegalOnboardingModal.jsx';
let content = fs.readFileSync(file, 'utf8');

// Title Update in Welcome Step
content = content.replace(
  "Bienvenido/a al nivel premium, <span style={{ color: 'var(--crear-gold)' }}>{currentUser?.name?.split(' ')[0] || 'Líder'}</span>",
  "Bienvenido/a a la plataforma oficial, <span style={{ color: 'var(--crear-gold)' }}>{currentUser?.name?.split(' ')[0] || 'Líder'}</span>"
);

content = content.replace(
  "Estás a un paso de iniciar el <strong>Programa de Creación</strong>. Para garantizar tu seguridad",
  "Para garantizar tu seguridad, privacidad y el blindaje de datos de alto valor en <strong>{contracts.countryName}</strong>, todos los miembros (participantes, aliados, entrenadores y equipo interno) deben confirmar los siguientes acuerdos"
);

content = content.replace(
  "Tu acceso al <strong>Programa de Creación</strong> es oficial.",
  "Tu acceso a la <strong>Plataforma Oficial (Causa OS / Campus)</strong> ha sido habilitado."
);

fs.writeFileSync(file, content);
console.log('LegalOnboardingModal updated for all roles');
