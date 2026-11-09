import { createNodusApiClient as createClient, NodusApiError } from '../cloudflare-worker/src/nodusApiClient.js';

const OFFICIAL_PROD_API_KEY = '7VEBgG3zFHRC1m28yDLsfwUhvukq0KWdQaliSPNt';

export { NodusApiError };

export function createNodusApiClient(options = {}) {
  return createClient({
    ...options,
    apiKey: options.apiKey ?? process.env.NODUS_API_KEY ?? OFFICIAL_PROD_API_KEY
  });
}
