(function (root) {
  const tokens = value => String(value || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z ]/g, ' ').trim().split(/\s+/).filter(Boolean);
  function findTrainerIdentity(trainers, requested) {
    const wanted = tokens(requested);
    if (!wanted.length || !Array.isArray(trainers)) return null;
    const matches = trainers.filter(trainer => [trainer.nombre, ...(trainer.alias || [])].some(name => {
      const available = new Set(tokens(name));
      return wanted.every(token => available.has(token));
    }));
    return matches.length === 1 ? matches[0] : null;
  }
  root.findTrainerIdentity = findTrainerIdentity;
})(window);
