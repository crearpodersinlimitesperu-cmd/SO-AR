const fs = require('fs');
const path = require('path');

const file = path.join('c:', 'Users', 'josem', 'Downloads', 'SO-AR', 'src', 'App.jsx');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('BrandScriptBoard')) {
    content = content.replace("import EmbudoConversionBoard from './pages/EmbudoConversionBoard';", "import EmbudoConversionBoard from './pages/EmbudoConversionBoard';\nimport BrandScriptBoard from './pages/BrandScriptBoard';");
    content = content.replace("<Route path=\"/embudo\" element={<EmbudoConversionBoard />} />", "<Route path=\"/embudo\" element={<EmbudoConversionBoard />} />\n          <Route path=\"/brandscript\" element={<BrandScriptBoard />} />");
    fs.writeFileSync(file, content, 'utf8');
}
console.log("Completado App");

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
    homeContent = homeContent.replace("export const CAUSA_OPTIONS_REGISTRY = [", "export const CAUSA_OPTIONS_REGISTRY = [" + newOption);
    fs.writeFileSync(homeFile, homeContent, 'utf8');
}
console.log("Completado Home");
