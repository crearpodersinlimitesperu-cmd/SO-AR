const fs = require('fs');
let code = fs.readFileSync('src/pages/CentroManagers.jsx', 'utf8');

const target1 = 'export default function CentroManagers() {';
const replacement1 = export default function CentroManagers() {
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [selectedTrainerProfile, setSelectedTrainerProfile] = useState(null);

  useEffect(() => {
    getAllCompanyUsers().then(users => {
      setDirectoryUsers(users);
    }).catch(console.error);
  }, []);

  const handleTrainerClick = (trainerName) => {
    if (!trainerName || trainerName === 'Sin Asignar') return;
    
    // Attempt to match trainer to a global user profile
    const normSearch = trainerName.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();
    const match = directoryUsers.find(u => {
      const uName = (u.name || u.displayName || u.nombre || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();
      return uName === normSearch || uName.includes(normSearch) || normSearch.includes(uName);
    });
    
    if (match) {
      setSelectedTrainerProfile(match);
    } else {
      // Fallback: create a mock profile for modal
      setSelectedTrainerProfile({
        name: trainerName,
        role: 'entrenador',
        roles: ['entrenador'],
        sede: 'Global'
      });
    }
  };;

if (!code.includes('selectedTrainerProfile')) {
  code = code.replace(target1, replacement1);
}

fs.writeFileSync('src/pages/CentroManagers.jsx', code, 'utf8');
