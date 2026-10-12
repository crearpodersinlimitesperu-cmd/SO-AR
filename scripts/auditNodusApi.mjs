import { createNodusApiClient, NodusApiError } from './nodusApiClient.mjs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function auditNodusApi(client) {
  const [sedesResult, teamsResult] = await Promise.all([
    client.getSedes(),
    client.getEquipos({ activeOnly: true }),
  ]);
  const sedes = sedesResult.data;
  const teams = teamsResult.data;
  const sedeIds = new Set(sedes.map(s => Number(s.id)));
  const teamIds = new Set();
  for (const team of teams) {
    if (!sedeIds.has(Number(team.id_sede)) || teamIds.has(Number(team.id))) {
      throw new NodusApiError('cross_endpoint_scope_mismatch');
    }
    teamIds.add(Number(team.id));
  }
  const nestedTeamSedes = new Map();
  for (const sede of sedes) {
    for (const team of sede.equipos) {
      const teamId = Number(team.id);
      if (nestedTeamSedes.has(teamId)) throw new NodusApiError('cross_endpoint_team_mismatch');
      nestedTeamSedes.set(teamId, Number(sede.id));
    }
  }
  if (nestedTeamSedes.size !== teams.length || teams.some(team =>
    nestedTeamSedes.get(Number(team.id)) !== Number(team.id_sede))) {
    throw new NodusApiError('cross_endpoint_team_mismatch');
  }
  return {
    source: 'NODUS_API',
    generatedAt: [sedesResult.meta.generado, teamsResult.meta.generado]
      .sort((a, b) => Date.parse(a) - Date.parse(b))[0],
    sedeCount: sedes.length,
    activeTeamCount: teams.length,
    integrity: 'verified',
    writes: 0,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const client = createNodusApiClient();
    const result = await auditNodusApi(client);
    console.log(`NODUS_API_AUDIT ${JSON.stringify(result)}`);
  } catch (error) {
    const code = error instanceof NodusApiError ? error.code : 'unexpected_error';
    console.error(`NODUS_API_AUDIT_FAILED ${JSON.stringify({ code })}`);
    process.exitCode = 1;
  }
}
