import { createNodusApiClient as createClient, NodusApiError } from '../cloudflare-worker/src/nodusApiClient.js';

export { NodusApiError };

export function createNodusApiClient(options = {}) {
  return createClient({
    ...options,
    apiKey: options.apiKey ?? process.env.NODUS_API_KEY
  });
}
