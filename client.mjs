import { createHash } from 'node:crypto';

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
    response = await fetch(url, { method, redirect: 'error', signal: AbortSignal.timeout(30000), headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  } catch { throw new Error('NETWORK_ERROR_OR_REDIRECT'); }
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  return raw ? response.text() : response.status === 204 ? null : response.json();
}

export async function handshake(config) {
  const document = await request(config, 'GET', '/api/v1/openapi.json', undefined, true);
  const result = await request(config, 'POST', '/api/v1/agent/handshake', { agentName: 'outreach-cli', agentVersion: '1.1.1', contractVersion: 'v1' });
  if (result.contractVersion !== 'v1' || result.openApiFingerprint !== `sha256:${createHash('sha256').update(document).digest('hex')}`) throw new Error('CONTRACT_MISMATCH');
  if (config.workspaceId && result.instance.id !== config.workspaceId) throw new Error('WORKSPACE_MISMATCH');
  return result;
}
