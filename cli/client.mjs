import { createHash } from 'node:crypto';
import {
  CONTRACT_V1 as contract,
  REQUEST_METADATA_FIXTURE,
  validateRequestMetadata,
} from './contract.mjs';
import { CLI_VERSION } from './version.mjs';

export { REQUEST_METADATA_FIXTURE, validateRequestMetadata };

export function validateOrigin(input) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('HTTPS_ORIGIN_REQUIRED');
  return url.origin;
}

export async function request(config, method, path, body, raw = false) {
  const origin = validateOrigin(config.url);
  const url = new URL(path, origin);
  if (!path.startsWith('/api/v1/') || url.origin !== origin || !url.pathname.startsWith('/api/v1/') || path.includes('..') || url.hash) throw new Error('INVALID_API_PATH');
  let response;
  try {
    response = await fetch(url, { method, redirect: 'error', signal: AbortSignal.timeout(30000), headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json', 'User-Agent': `outreach-cli/${CLI_VERSION}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  } catch { throw new Error('NETWORK_ERROR_OR_REDIRECT'); }
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  return raw ? response.text() : response.status === 204 ? null : response.json();
}

export async function handshake(config) {
  return (await loadVerifiedContract(config)).handshake;
}

export async function loadVerifiedContract(config) {
  const document = await request(config, 'GET', '/api/v1/openapi.json', undefined, true);
  let openApi;
  try { openApi = JSON.parse(document); } catch { throw new Error('INVALID_OPENAPI_DOCUMENT'); }
  const result = await request(config, 'POST', '/api/v1/agent/handshake', { agentName: 'outreach-cli', agentVersion: CLI_VERSION, contractVersion: contract.version });
  if (result.contractVersion !== contract.version || result.openApiFingerprint !== `sha256:${createHash('sha256').update(document).digest('hex')}`) throw new Error('CONTRACT_MISMATCH');
  if (config.workspaceId && result.instance.id !== config.workspaceId) throw new Error('WORKSPACE_MISMATCH');
  return { handshake: result, openApi, document };
}
