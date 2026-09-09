const fs = require('fs');
let code = fs.readFileSync('src/pages/GoalsBoard.jsx', 'utf8');

const injection = `
  const role = (currentUser?.activeRole || currentUser?.appRole || currentUser?.role || '').toLowerCase();
  const roles = (currentUser?.roles || []).map(r => String(r).toLowerCase());
  const canViewGoals = Boolean(
    currentUser?.isSuperAdmin ||
    currentUser?.isDireccion ||
    currentUser?.isGerente ||
    ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'director_maestria', 'superadmin', 'consolidado', 'coord_c1', 'coordinador_c1c2', 'coord_c2', 'coord_maestria', 'coordinador_mj'].includes(role) ||
    roles.some(r => ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'director_maestria', 'superadmin', 'consolidado', 'coord_c1', 'coordinador_c1c2', 'coord_c2', 'coord_maestria', 'coordinador_mj'].includes(r))
  );

  useEffect(() => {
    if (currentUser && !canViewGoals) {
      showToast('Acceso Restringido. Las metas son exclusivas para directivos, gerentes y coordinadores.', 'error');
      navigate('/');
    }
  }, [currentUser, canViewGoals, navigate, showToast]);
`;

code = code.replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(true);' + injection);
fs.writeFileSync('src/pages/GoalsBoard.jsx', code);
