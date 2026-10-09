// Groups Misión IMO v2 campaigns of a sede by C1 target team so each team's
// public link can be picked directly. Active campaigns and later C1 dates first.
export function groupCampaignsByTeam(campaigns) {
  const byTeam = new Map();
  for (const c of campaigns || []) {
    const team = Number(c?.targetTeam);
    if (!Number.isInteger(team) || team <= 0 || !c.id) continue;
    if (!byTeam.has(team)) byTeam.set(team, []);
    byTeam.get(team).push(c);
  }
  const rank = c => (c.status === 'active' ? 0 : 1);
  return [...byTeam.entries()]
    .map(([team, list]) => ({
      team,
      hasActive: list.some(c => c.status === 'active'),
      campaigns: list.sort((a, b) => rank(a) - rank(b) || String(b.c1Date || '').localeCompare(String(a.c1Date || ''))),
    }))
    .sort((a, b) => b.team - a.team);
}
