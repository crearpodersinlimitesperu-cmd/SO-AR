const fs = require('fs');
let code = fs.readFileSync('src/pages/CentroManagers.jsx', 'utf8');

const targetModal = '{/* Modal para editar individual */}';
const modalHTML = 
      {selectedTrainerProfile && (
        <UserProfileModal 
          person={selectedTrainerProfile}
          onClose={() => setSelectedTrainerProfile(null)}
        />
      )}
      {/* Modal para editar individual */};

if (!code.includes('<UserProfileModal')) {
  code = code.replace(targetModal, modalHTML);
  fs.writeFileSync('src/pages/CentroManagers.jsx', code, 'utf8');
}
