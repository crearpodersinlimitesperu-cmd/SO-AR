import fs from 'fs';

const sourceFile = 'C:\\\\Users\\\\josem\\\\Downloads\\\\masterclass-distinciones-liderazgo-v1.md';
const soarDest = 'C:\\\\Users\\\\josem\\\\Downloads\\\\SO-AR\\\\src\\\\pages\\\\MasterclassDistinciones.jsx';
const campusDest = 'C:\\\\Users\\\\josem\\\\Downloads\\\\cpsl-campus-interactivo\\\\src\\\\pages\\\\MasterclassDistinciones.jsx';

const mdContent = fs.readFileSync(sourceFile, 'utf8');

const generateComponent = (content, isTailwind = false) => {
  let html = content
    .replace(/^### (.*$)/gim, '<h3 className="' + (isTailwind ? 'text-xl font-bold mt-6 mb-2 text-blue-300' : 'mc-h3') + '">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 className="' + (isTailwind ? 'text-2xl font-black mt-8 mb-4 border-b border-gray-700 pb-2 text-indigo-400' : 'mc-h2') + '">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 className="' + (isTailwind ? 'text-4xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500' : 'mc-h1') + '">$1</h1>')
    .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
    .replace(/\\*(.*?)\\*/g, '<em>$1</em>')
    .replace(/^> (.*$)/gim, '<blockquote className="' + (isTailwind ? 'border-l-4 border-amber-500 bg-amber-900/20 p-4 my-4 rounded-r italic text-amber-200' : 'mc-quote') + '">$1</blockquote>')
    .replace(/---/g, '<hr className="' + (isTailwind ? 'my-8 border-gray-800' : 'mc-hr') + '" />')
    .replace(/^(?!\\s*<)(?!\\s*$)(.*$)/gim, '<p className="' + (isTailwind ? 'mb-4 text-gray-300 leading-relaxed' : 'mc-p') + '">$1</p>');
    
  html = html.replace(/\\|(.*?)\\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim() !== '');
      if (match.includes('---')) return ''; 
      if (match.includes('Distinción')) return '<thead><tr>' + cells.map(c => '<th className="' + (isTailwind ? 'p-3 bg-gray-800 text-left' : 'mc-th') + '">' + c.trim() + '</th>').join('') + '</tr></thead><tbody>';
      return '<tr>' + cells.map(c => '<td className="' + (isTailwind ? 'p-3 border-t border-gray-800' : 'mc-td') + '">' + c.trim() + '</td>').join('') + '</tr>';
  });
  
  if (html.includes('<tbody>')) html += '</tbody>';
  html = html.replace(/(<thead>.*?<tbody>.*?<\\/tbody>)/gs, '<div className="' + (isTailwind ? 'overflow-x-auto my-6' : 'mc-table-container') + '"><table className="' + (isTailwind ? 'w-full text-sm' : 'mc-table') + '">$1</table></div>');

  html = html.replace(/^\\*   (.*$)/gim, '<li className="' + (isTailwind ? 'ml-6 mb-2 list-disc' : 'mc-li-disc') + '">$1</li>');
  html = html.replace(/^\\d+\\.  (.*$)/gim, '<li className="' + (isTailwind ? 'ml-6 mb-2 list-decimal font-bold text-blue-300' : 'mc-li-decimal') + '">$1</li>');

  html = html.replace(/<p.*?>\\s*<li/g, '<li');
  html = html.replace(/<\\/li>\\s*<\\/p>/g, '</li>');

  const cssStyles = isTailwind ? '' : `
      <style>
        .mc-container { max-width: 1000px; margin: 0 auto; padding: 2rem; color: #e2e8f0; }
        .mc-h1 { font-size: 2.5rem; font-weight: 900; background: linear-gradient(to right, #60a5fa, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 1.5rem; }
        .mc-h2 { font-size: 1.75rem; font-weight: 800; border-bottom: 1px solid #374151; padding-bottom: 0.5rem; margin-top: 2rem; margin-bottom: 1rem; color: #818cf8; }
        .mc-h3 { font-size: 1.25rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #93c5fd; }
        .mc-p { margin-bottom: 1rem; line-height: 1.6; }
        .mc-quote { border-left: 4px solid #f59e0b; background: rgba(245, 158, 11, 0.1); padding: 1rem; margin: 1rem 0; border-radius: 0 8px 8px 0; font-style: italic; color: #fcd34d; }
        .mc-hr { border: none; border-top: 1px solid #374151; margin: 2rem 0; }
        .mc-li-disc { list-style-type: disc; margin-left: 1.5rem; margin-bottom: 0.5rem; display: list-item; }
        .mc-li-decimal { list-style-type: decimal; margin-left: 1.5rem; margin-bottom: 0.5rem; font-weight: bold; color: #93c5fd; display: list-item; }
        .mc-table-container { overflow-x: auto; margin: 1.5rem 0; border: 1px solid #374151; border-radius: 8px; }
        .mc-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        .mc-th { padding: 0.75rem; background: #1f2937; text-align: left; font-weight: bold; color: #fff; }
        .mc-td { padding: 0.75rem; border-top: 1px solid #374151; }
      </style>
  `;

  return [
    "import React from 'react';",
    "",
    "export default function MasterclassDistinciones() {",
    "  return (",
    "    <div className=\"" + (isTailwind ? 'p-8 max-w-5xl mx-auto text-slate-300' : 'mc-container') + "\">",
    isTailwind ? '' : "      <div dangerouslySetInnerHTML={{ __html: `" + cssStyles.replace(/`/g, '\\`') + "` }} />",
    "      <div className=\"glass-panel p-8 rounded-2xl shadow-xl\">",
    "        <div dangerouslySetInnerHTML={{ __html: `" + html.replace(/`/g, '\\`') + "` }} />",
    "      </div>",
    "    </div>",
    "  );",
    "}"
  ].join('\n');
};

fs.writeFileSync(soarDest, generateComponent(mdContent, false));
fs.writeFileSync(campusDest, generateComponent(mdContent, true));

console.log("Masterclass components created.");
