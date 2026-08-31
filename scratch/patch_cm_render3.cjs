const fs = require('fs');
let code = fs.readFileSync('src/pages/CentroManagers.jsx', 'utf8');

const t2 = '                                {mTrainers.map(t => (\n                                  <span key={t} style={{ display: \\'inline-flex\\', alignItems: \\'center\\', gap: \\'0.2rem\\', background: \\'#eff6ff\\', color: \\'#1d4ed8\\', border: \\'1px solid #bfdbfe\\', padding: \\'0.2rem 0.5rem\\', borderRadius: \\'6px\\', fontSize: \\'0.75rem\\', fontWeight: 600 }}>\n                                    ?? {t}\n                                  </span>\n                                ))}';

const r2 = '                                {mTrainers.map(t => (\n                                  <button key={t} onClick={() => handleTrainerClick(t)} style={{ display: \\'inline-flex\\', alignItems: \\'center\\', gap: \\'0.2rem\\', background: \\'#eff6ff\\', color: \\'#1d4ed8\\', border: \\'1px solid #bfdbfe\\', padding: \\'0.2rem 0.5rem\\', borderRadius: \\'6px\\', fontSize: \\'0.75rem\\', fontWeight: 600, cursor: \\'pointer\\' }}>\n                                    ?? {t}\n                                  </button>\n                                ))}';

code = code.replace(t2, r2);
fs.writeFileSync('src/pages/CentroManagers.jsx', code, 'utf8');
