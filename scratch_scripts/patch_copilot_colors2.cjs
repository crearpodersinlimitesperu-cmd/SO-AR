const fs = require('fs');
const path = './src/components/AICopilot.jsx';
let content = fs.readFileSync(path, 'utf8');

const oldColors = `  // Paleta Premium "Caja Negra" (Dark Mode)
  const colors = {
    primary: '#0ea5e9',
    secondary: '#38bdf8',
    bg: '#0f172a', // Deep black/slate
    bgAlt: '#1e293b',
    text: '#f8fafc',
    border: 'rgba(255, 255, 255, 0.1)',
    botMsg: 'rgba(30, 41, 59, 0.8)',
    userMsg: 'rgba(14, 165, 233, 0.2)'
  };`;

const newColors = `  // Paleta Premium "Caja Negra" (Dark Mode con toques Crear Gold)
  const colors = {
    primary: '#fbbf24', // Crear Gold / Premium Amber
    secondary: '#f59e0b',
    bg: '#09090b', // Ultra Deep Black
    bgAlt: '#18181b', // Slightly lighter black for contrast
    text: '#f8fafc',
    border: 'rgba(251, 191, 36, 0.15)', // Gold glowing border
    botMsg: 'rgba(24, 24, 27, 0.9)',
    userMsg: 'rgba(251, 191, 36, 0.1)'
  };`;

content = content.replace(oldColors, newColors);
fs.writeFileSync(path, content, 'utf8');
console.log("Colores premium (Ultra Black + Gold) aplicados a la caja negra");
