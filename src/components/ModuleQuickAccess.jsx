import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useModuleUsage } from '../context/ModuleUsageContext';

export default function ModuleQuickAccess() {
  const { frequent, hasHistory, reset } = useModuleUsage();
  const navigate = useNavigate();
  if (!hasHistory) return null;
  const openModule = mod => navigate(mod.route);
  return (
    <div style={{ marginBottom: '1rem' }}>
      {frequent.length >= 4 && (
        <nav aria-label="Tus accesos rápidos" style={{ marginBottom: '0.5rem' }}>
          <strong>Tus accesos rápidos</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            {frequent.map(mod => (
              <button key={mod.id} type="button" className="btn-secondary" onClick={() => openModule(mod)}>
                {mod.emoji} {mod.label}
              </button>
            ))}
          </div>
        </nav>
      )}
      {frequent.length > 0 && (
        <button type="button" className="btn-secondary" onClick={() => openModule(frequent[0])}>
          Sueles ir a {frequent[0].label} <ArrowRight size={14} />
        </button>
      )}
      <button type="button" className="btn-secondary" onClick={reset} style={{ marginLeft: '0.5rem' }}>
        Restablecer mi espacio
      </button>
    </div>
  );
}
