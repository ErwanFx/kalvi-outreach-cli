import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compatible, update } from './update.mjs';

test('only newer stable versions in the same major are eligible', () => {
  assert.equal(compatible('1.1.0', '1.0.3'), true);
  for (const version of ['2.0.0', '1.0.2', '1.1.0-beta', '../evil', 'v1.1.0']) assert.equal(compatible(version, '1.0.3'), false);
});

test('publishes only a verified install, throttles checks, and keeps the active version on failure', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'outreach-update-test-'));
  let checks = 0;
  const latest = async () => { checks++; return '1.1.0'; };
  try {
    await update({ directory, current: '1.0.3', latest, install: async () => { throw Error('offline'); }, now: 1_000_000 });
    await assert.rejects(readFile(join(directory, 'current.json')));
    await update({ directory, current: '1.0.3', latest, install: async () => {}, now: 1_000_001 });
    assert.equal(checks, 1);
    await update({ directory, current: '1.0.3', latest, install: async () => {}, now: 30_000_000 });
    assert.equal(JSON.parse(await readFile(join(directory, 'current.json'))).version, '1.1.0');
    await update({ directory, current: '1.1.0', latest: async () => '1.2.0', install: async () => { throw Error('broken'); }, now: 60_000_000 });
    assert.equal(JSON.parse(await readFile(join(directory, 'current.json'))).version, '1.1.0');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('concurrent updater never enters installation while another holds the lock', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'outreach-update-test-'));
  try {
    await mkdir(join(directory, 'lock'));
    await update({ directory, current: '1.0.3', latest: async () => { assert.fail('locked'); }, install: async () => { assert.fail('locked'); } });
  } finally { await rm(directory, { recursive: true, force: true }); }
});
