const fs = require('fs');
const path = 'src/pages/ReportesBoard.jsx';
let code = fs.readFileSync(path, 'utf8');

const oldCard = `            {/* CARD 3: REPORTE DIARIO DE LLAMADAS (COORDINADORES C1 & C2) */}
            <div 
              onClick={() => {
                setReportType('Llamadas');`;
const newCard = `            {/* CARD 3: REPORTE DIARIO DE LLAMADAS (COORDINADORES C1 & C2) */}
            {canViewLlamadasForm && (
            <div 
              onClick={() => {
                setReportType('Llamadas');`;

const oldEnd = `Revisión diaria a las 12:00 M (Nuevos y Rezagados). Precarga automática del último reporte y enlace directo a Nodus.
              </p>
            </div>
          </div>`;
const newEnd = `Revisión diaria a las 12:00 M (Nuevos y Rezagados). Precarga automática del último reporte y enlace directo a Nodus.
              </p>
            </div>
            )}
          </div>`;

code = code.replace(oldCard, newCard);
code = code.replace(oldEnd, newEnd);
fs.writeFileSync(path, code);
