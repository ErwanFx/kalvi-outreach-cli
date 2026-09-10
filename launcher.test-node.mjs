import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('launcher preserves JSON and exit status, honours pins, and ignores incompatible cached versions', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'outreach-launcher-test-'));
  const cache = join(directory, '.cache/kalvi-outreach/updates');
  const run = (args, extra = {}) => spawnSync(process.execPath, ['outreach.mjs', ...args], {
    cwd: import.meta.dirname, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: directory, OUTREACH_AUTO_UPDATE: '0', ...extra },
  });
  try {
    let result = run(['profiles']);
    assert.equal(result.stdout, '[]\n'); assert.equal(result.stderr, ''); assert.equal(result.status, 0);
    result = run(['whoami']);
    assert.equal(result.status, 1); assert.equal(JSON.parse(result.stderr).error, 'LOGIN_REQUIRED');
    const target = join(cache, '1.2.0/lib/node_modules/@kalvi/outreach-cli');
    await mkdir(target, { recursive: true });
    await writeFile(join(target, 'commands.mjs'), 'console.log("cached-version")');
    await writeFile(join(cache, 'current.json'), JSON.stringify({ version: '1.2.0' }));
    assert.equal(run(['--help']).stdout, 'cached-version\n');
    assert.match(run(['--help'], { OUTREACH_CLI_VERSION: '1.1.2' }).stdout, /^Outreach CLI 1.1.2/);
    assert.equal(run(['--help'], { OUTREACH_CLI_VERSION: '9.0.0' }).status, 1);
    await writeFile(join(cache, 'current.json'), JSON.stringify({ version: '2.0.0' }));
    assert.match(run(['--help']).stdout, /^Outreach CLI 1.1.2/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
