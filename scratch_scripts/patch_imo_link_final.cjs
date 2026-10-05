const fs = require('fs');

const path = './src/pages/MonitorImos.jsx';
let content = fs.readFileSync(path, 'utf8');

// The screenshot shows the user hitting a 404 on "crearpsl.net/imose30lima/"
// Which means the user's site is hosted on GitHub Pages and doesn't actually have dynamic routing for those URLs,
// OR the landing pages are generated separately and "imose31lima" exists, but "imose30lima" doesn't.
// Let's replace the link generator to use query parameters which is the standard way to do this in SPAs/React,
// unless the user literally deploys separate HTML folders for every team on GitHub Pages.

const regexModal = /<span style={{ color: '#10b981', fontFamily: 'monospace', fontSize: '1\.05rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis' }}>\s*\{dynamicLink\}\s*<\/span>/g;

const replacement = `<span style={{ color: '#10b981', fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {dynamicLink}
                      </span>
                      <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#ffb703' }}>
                        (Asegúrate de que la landing <strong>/{eqStr}{sedeStr}/</strong> esté creada en tu servidor, de lo contrario dará error 404).
                      </div>`;

content = content.replace(regexModal, replacement);
fs.writeFileSync(path, content, 'utf8');
console.log("Nota de advertencia 404 añadida al modal.");
