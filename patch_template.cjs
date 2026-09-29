const fs = require('fs');

let content = fs.readFileSync('scripts/templates/email_rezago_nodus.html', 'utf8');

// Update table headers to include Px sin gestión
const oldHeader = `          <tr>
            <th>Coordinador</th>
            <th>Última Gestión</th>
            <th>Participantes Asignados</th>
            <th>Estado</th>
          </tr>`;

const newHeader = `          <tr>
            <th>Coordinador</th>
            <th>Última Gestión</th>
            <th>Asignados</th>
            <th>Px sin gestión</th>
            <th>Estado</th>
          </tr>`;

if (!content.includes('Px sin gestión')) {
  content = content.replace(oldHeader, newHeader);
  // Also we must update the example loop in case it's used elsewhere
  const oldExample = `          <tr>
            <td>{{nombre}}</td>
            <td>Hace {{horas_inactivo}} hrs</td>
            <td>{{asignados}}</td>
            <td><span class="badge-critical">Bloqueo Operativo</span></td>
          </tr>`;
  const newExample = `          <tr>
            <td>{{nombre}}</td>
            <td>Hace {{horas_inactivo}} hrs</td>
            <td>{{asignados}}</td>
            <td><span style="font-size: 12px; color: #52525b; display: block; max-width: 150px; word-wrap: break-word;">{{px_sin_gestionar}}</span></td>
            <td><span class="badge-critical">Bloqueo Operativo</span></td>
          </tr>`;
  content = content.replace(oldExample, newExample);
  fs.writeFileSync('scripts/templates/email_rezago_nodus.html', content);
  console.log("Patched email template.");
} else {
  console.log("Email template already patched.");
}
