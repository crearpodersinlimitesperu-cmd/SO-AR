const fs = require('fs');

const path = 'src/pages/GoalsBoard.jsx';
let code = fs.readFileSync(path, 'utf8');

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
      showToast('Acceso Restringido. Las metas son información exclusiva para gerencias, dirección y coordinaciones.', 'error');
      navigate('/');
    }
  }, [currentUser, canViewGoals, navigate, showToast]);
`;

const target = `  const { showToast, showPrompt } = useUI();
  const navigate = useNavigate();`;

if (!code.includes('canViewGoals')) {
    code = code.replace(target, target + injection);
}
fs.writeFileSync(path, code);
