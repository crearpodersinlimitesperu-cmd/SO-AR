const fs = require('fs');
const file = 'src/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

const target2 = `            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => navigate('/gerente-dashboard')}`;

const replacement2 = `            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                  {hasRoleAccess(['gerente']) && (
                  <button 
                    onClick={() => navigate('/gerente')}`; // Changed to /gerente as well!

const target3 = `                    <span>
                      💼 Causa OS Gerencial
                    </span>
                  </button>
              <button `;

const replacement3 = `                    <span>
                      💼 Causa OS Gerencial
                    </span>
                  </button>
                  )}
              <button `;

content = content.replace(target2, replacement2).replace(target3, replacement3);
fs.writeFileSync(file, content);
console.log('Patch 2 done');
