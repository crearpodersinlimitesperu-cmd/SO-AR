const fs = require('fs');
let code = fs.readFileSync('src/pages/CentroManagers.jsx', 'utf8');

const target1 = 'export default function CentroManagers() {';
const replacement1 = export default function CentroManagers() {\n  const [directoryUsers, setDirectoryUsers] = useState([]);\n  const [selectedTrainerProfile, setSelectedTrainerProfile] = useState(null);\n\n  useEffect(() => {\n    getAllCompanyUsers().then(users => {\n      setDirectoryUsers(users);\n    }).catch(console.error);\n  }, []);\n\n  const handleTrainerClick = (trainerName) => {\n    if (!trainerName || trainerName === 'Sin Asignar') return;\n    const normSearch = trainerName.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();\n    const match = directoryUsers.find(u => {\n      const uName = (u.name || u.displayName || u.nombre || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();\n      return uName === normSearch || uName.includes(normSearch) || normSearch.includes(uName);\n    });\n    if (match) {\n      setSelectedTrainerProfile(match);\n    } else {\n      setSelectedTrainerProfile({ name: trainerName, role: 'entrenador', roles: ['entrenador'], sede: 'Global' });\n    }\n  };;

if (!code.includes('selectedTrainerProfile')) {
  code = code.replace(target1, replacement1);
}

fs.writeFileSync('src/pages/CentroManagers.jsx', code, 'utf8');
