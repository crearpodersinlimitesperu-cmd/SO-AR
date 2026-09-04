const fs = require('fs');
const path = require('path');
const homeFile = path.join('c:', 'Users', 'josem', 'Downloads', 'SO-AR', 'src', 'pages', 'Home.jsx');
let homeContent = fs.readFileSync(homeFile, 'utf8');

if (!homeContent.includes('opt-brandscript')) {
    const importReplacement = "import { FileText, ";
    homeContent = homeContent.replace("import { ", importReplacement);

    const newOption = `
  {
    id: 'opt-brandscript',
    title: 'BrandScript & Guiones MJ',
    description: 'Manual Oficial de Enrolamiento Narrativo para Mánagers',
    icon: FileText,
    path: '/brandscript',
    tags: ['guiones', 'brandscript', 'storybrand', 'neuromarketing', 'conversion', 'ventas', 'enrolamiento']
  },`;
    homeContent = homeContent.replace("const CAUSA_OPTIONS_REGISTRY = [", "const CAUSA_OPTIONS_REGISTRY = [" + newOption);
    fs.writeFileSync(homeFile, homeContent, 'utf8');
}
console.log("Fixed Home");
