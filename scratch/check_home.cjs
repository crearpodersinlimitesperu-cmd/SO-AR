const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.jsx', 'utf8');

if (code.includes('🎨 Generador Flyers')) {
  console.log('Found button in Home.jsx');
}

// Ensure the button is only shown for gerentes and coordinadores
// (Currently we need to check how it's gated)
