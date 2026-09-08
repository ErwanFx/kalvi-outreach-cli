import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateOrigin, request, handshake } from './client.mjs';
import { createHash } from 'node:crypto';

test('rejects insecure origins and off-origin paths before sending a secret', async () => {
  for (const url of ['http://example.com', 'https://user:pass@example.com', 'https://example.com/path', 'https://example.com?x=1']) assert.throws(() => validateOrigin(url));
  assert.equal(validateOrigin('https://client.convex.site/'), 'https://client.convex.site');
  for (const path of ['https://evil.com', '//evil.com', '/api/v1/../../evil', '/api/v1/x#fragment']) await assert.rejects(request({ url: 'https://example.com', key: 'secret' }, 'GET', path));
});

test('handshake verifies exact contract bytes and pins the workspace', async () => {
  const original = globalThis.fetch;
  const document = '{"openapi":"3.1.0"}';
  const result = { contractVersion: 'v1', openApiFingerprint: `sha256:${createHash('sha256').update(document).digest('hex')}`, instance: { id: 'client-a' } };
  try {
    globalThis.fetch = async url => new Response(String(url).endsWith('openapi.json') ? document : JSON.stringify(result));
    assert.deepEqual(await handshake({ url: 'https://example.com', key: 'secret', workspaceId: 'client-a' }), result);
    await assert.rejects(handshake({ url: 'https://example.com', key: 'secret', workspaceId: 'client-b' }), /WORKSPACE_MISMATCH/);
    result.openApiFingerprint = 'sha256:wrong';
    await assert.rejects(handshake({ url: 'https://example.com', key: 'secret' }), /CONTRACT_MISMATCH/);
  } finally { globalThis.fetch = original; }
});

test('sends scoped bearer and payload, refuses redirects, keeps errors free of secrets', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(String(url), 'https://example.com/api/v1/events');
      assert.equal(options.headers.Authorization, 'Bearer secret');
      assert.equal(options.redirect, 'error');
      assert.equal(options.body, '{"events":[]}');
      return new Response('{"ok":true}', { status: 200 });
    };
    assert.deepEqual(await request({ url: 'https://example.com', key: 'secret' }, 'POST', '/api/v1/events', { events: [] }), { ok: true });
    globalThis.fetch = async () => new Response('secret', { status: 401 });
    await assert.rejects(request({ url: 'https://example.com', key: 'secret' }, 'GET', '/api/v1/prospects'), error => error.message === 'HTTP_401');
  } finally { globalThis.fetch = original; }
});
