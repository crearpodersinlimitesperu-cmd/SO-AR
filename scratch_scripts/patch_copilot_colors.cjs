const fs = require('fs');
const path = './src/components/AICopilot.jsx';
let content = fs.readFileSync(path, 'utf8');

// Replace color palette
const oldColors = `  // Paleta Institucional Premium
  const colors = {
    primary: '#1e3a8a', // Azul Marino Institucional
    secondary: '#0ea5e9', // Celeste Vibrante
    bg: '#ffffff',
    bgAlt: '#f8fafc',
    text: '#0f172a',
    border: '#e2e8f0',
    botMsg: '#f1f5f9',
    userMsg: '#1e3a8a'
  };`;

const newColors = `  // Paleta Premium "Caja Negra" (Dark Mode)
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

content = content.replace(oldColors, newColors);
fs.writeFileSync(path, content, 'utf8');
console.log("Colores premium aplicados a la caja negra");
