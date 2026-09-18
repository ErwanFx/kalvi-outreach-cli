import { access, cp, lstat, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const exec = promisify(execFile);
const PACKAGE_NAME = '@kalvi/outreach-cli';

export async function fetchBounded(fetchImpl, url, { maxBytes, timeoutMs = 15_000, headers } = {}) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error('INVALID_UPDATE_SIZE_LIMIT');
  const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error('UPDATE_DOWNLOAD_FAILED');
  const declared = response.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) throw new Error('UPDATE_DOWNLOAD_TOO_LARGE');
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) throw new Error('UPDATE_DOWNLOAD_TOO_LARGE');
      chunks.push(Buffer.from(value));
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }
  return Buffer.concat(chunks, bytes);
}

function semver(value) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value ?? '');
  if (!match) throw new Error('INVALID_SEMVER');
  return match.slice(1).map(Number);
}

export function decideUpdate({ currentVersion, latestVersion, pin }) {
  const current = semver(currentVersion);
  const latest = semver(latestVersion);
  if (pin) {
    semver(pin);
    if (pin !== currentVersion) throw new Error('PIN_DOES_NOT_MATCH_ACTIVE_VERSION');
    return { action: 'keep', reason: 'PINNED' };
  }
  if (current[0] !== latest[0]) return { action: 'keep', reason: 'MAJOR_UPGRADE_REQUIRES_MANUAL_MIGRATION' };
  if (latest[1] < current[1] || (latest[1] === current[1] && latest[2] <= current[2])) return { action: 'keep', reason: 'CURRENT' };
  return { action: 'stage', version: latestVersion };
}

export function validateArchiveEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('INVALID_UPDATE_ARCHIVE');
  for (const entry of entries) {
    const path = String(entry?.path ?? '').replaceAll('\\', '/');
    const segments = path.split('/');
    if (!path.startsWith('package/') || path.startsWith('/') || segments.some(part => part === '..' || part === '.') || !['file', 'directory'].includes(entry?.type)) throw new Error('INVALID_UPDATE_ARCHIVE');
  }
}

export function verifyArchiveChecksum(bytes, expected) {
  if (!/^[a-f0-9]{64}$/i.test(expected ?? '') || createHash('sha256').update(bytes).digest('hex') !== expected.toLowerCase()) throw new Error('UPDATE_CHECKSUM_MISMATCH');
}

export function validatePackageIdentity(packageJson, expectedVersion) {
  if (packageJson?.name !== PACKAGE_NAME || packageJson?.version !== expectedVersion) throw new Error('INVALID_UPDATE_PACKAGE');
}

export async function activateStagedVersion({ active, staged, selfTest }) {
  await access(staged);
  try { await selfTest(staged); } catch { throw new Error('STARTUP_SELF_TEST_FAILED'); }
  const backup = join(dirname(active), `.previous-${process.pid}-${Date.now()}`);
  let movedActive = false;
  try {
    await rename(active, backup); movedActive = true;
    await rename(staged, active);
    await rm(backup, { recursive: true, force: true });
  } catch (error) {
    if (movedActive) {
      await rm(active, { recursive: true, force: true });
      await rename(backup, active);
    }
    throw new Error('ATOMIC_ACTIVATION_FAILED', { cause: error });
  }
}

async function validateExtractedTree(root) {
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      const info = await lstat(path);
      if (info.isSymbolicLink() || (!info.isFile() && !info.isDirectory())) throw new Error('INVALID_UPDATE_ARCHIVE');
      if (info.isDirectory()) await walk(path);
    }
  }
  await walk(root);
}

export async function validatePublishedTree(root) {
  await validateExtractedTree(root);
  let manifest;
  try { manifest = JSON.parse(await readFile(join(root, 'publish-manifest.json'), 'utf8')); }
  catch { throw new Error('UPDATE_TREE_MISMATCH'); }
  if (!Array.isArray(manifest.files)) throw new Error('UPDATE_TREE_MISMATCH');
  const actual = [];
  async function walk(directory, prefix = '') {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(join(directory, entry.name), path);
      else if (entry.isFile() && path !== 'publish-manifest.json') {
        const bytes = await readFile(join(directory, entry.name));
        actual.push({ path, bytes: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex') });
      }
    }
  }
  await walk(root);
  if (JSON.stringify(actual) !== JSON.stringify(manifest.files)) throw new Error('UPDATE_TREE_MISMATCH');
}

export function updateRoot(env = process.env) {
  return env.OUTREACH_UPDATE_ROOT || join(homedir(), '.cache', 'kalvi-outreach', 'updates');
}

export async function activatedCliPath(currentVersion, env = process.env) {
  if (env.OUTREACH_ACTIVE_ROOT === '1') return undefined;
  const active = join(updateRoot(env), 'active');
  try {
    const packageJson = JSON.parse(await readFile(join(active, 'package.json'), 'utf8'));
    validatePackageIdentity(packageJson, packageJson.version);
    if (env.OUTREACH_CLI_VERSION) {
      semver(env.OUTREACH_CLI_VERSION);
      if (env.OUTREACH_CLI_VERSION === currentVersion) return undefined;
      if (env.OUTREACH_CLI_VERSION !== packageJson.version) return undefined;
    }
    const decision = decideUpdate({ currentVersion, latestVersion: packageJson.version });
    if (decision.action === 'stage') return join(active, 'cli', 'outreach.mjs');
  } catch { /* The installed launcher remains authoritative. */ }
  return undefined;
}

export async function checkForCompatibleUpdate({ currentVersion, env = process.env, now = Date.now(), fetchImpl = fetch } = {}) {
  if (env.OUTREACH_AUTO_UPDATE === '0') return { action: 'keep', reason: 'DISABLED' };
  const root = updateRoot(env);
  const statePath = join(root, 'check.json');
  const intervalMs = Number(env.OUTREACH_UPDATE_INTERVAL_MS ?? 6 * 60 * 60 * 1000);
  try {
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    if (Number.isFinite(intervalMs) && now - state.checkedAtUtc < Math.max(intervalMs, 60_000)) return { action: 'keep', reason: 'WINDOW' };
  } catch { /* first check */ }
  await mkdir(root, { recursive: true, mode: 0o700 });
  const lock = join(root, 'lock');
  try { await mkdir(lock); } catch { return { action: 'keep', reason: 'LOCKED' }; }
  let transaction;
  let staged;
  try {
    await writeFile(statePath, JSON.stringify({ checkedAtUtc: now }), { mode: 0o600 });
    let release;
    try {
      const bytes = await fetchBounded(fetchImpl, 'https://api.github.com/repos/ErwanFx/kalvi-outreach-cli/releases/latest', {
        maxBytes: 1024 * 1024,
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': `${PACKAGE_NAME}/${currentVersion}` },
      });
      release = JSON.parse(bytes.toString('utf8'));
    } catch { throw new Error('UPDATE_DISCOVERY_FAILED'); }
    const latestVersion = String(release.tag_name ?? '').replace(/^v/, '');
    const decision = decideUpdate({ currentVersion, latestVersion, pin: env.OUTREACH_CLI_VERSION });
    if (decision.action !== 'stage') return decision;
    const archiveName = `kalvi-outreach-cli-v${latestVersion}.tgz`;
    const archiveAsset = release.assets?.find(asset => asset.name === archiveName);
    const checksumAsset = release.assets?.find(asset => asset.name === `${archiveName}.sha256`);
    if (!archiveAsset || !checksumAsset) throw new Error('UPDATE_ASSETS_MISSING');
    const [archive, checksumBytes] = await Promise.all([
      fetchBounded(fetchImpl, archiveAsset.browser_download_url, { maxBytes: 25 * 1024 * 1024 }),
      fetchBounded(fetchImpl, checksumAsset.browser_download_url, { maxBytes: 4096 }),
    ]);
    const checksum = checksumBytes.toString('utf8').trim().split(/\s+/)[0];
    verifyArchiveChecksum(archive, checksum);
    transaction = join(root, `.staging-${randomUUID()}`);
    const archivePath = join(transaction, archiveName);
    const extracted = join(transaction, 'extracted');
    await mkdir(extracted, { recursive: true });
    await writeFile(archivePath, archive, { mode: 0o600 });
    const listing = (await exec('tar', ['-tzf', archivePath])).stdout.trim().split('\n').filter(Boolean).map(path => ({ path, type: path.endsWith('/') ? 'directory' : 'file' }));
    validateArchiveEntries(listing);
    await exec('tar', ['-xzf', archivePath, '-C', extracted, '--no-same-owner', '--no-same-permissions']);
    const packageRoot = join(extracted, 'package');
    await validatePublishedTree(packageRoot);
    validatePackageIdentity(JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8')), latestVersion);
    staged = join(root, `ready-${latestVersion}-${randomUUID()}`);
    await cp(packageRoot, staged, { recursive: true, preserveTimestamps: false });
    await activateStagedVersion({ active: join(root, 'active'), staged, selfTest: async candidate => {
      const result = await exec(process.execPath, [join(candidate, 'cli', 'outreach.mjs'), '--self-test'], { env: { ...env, OUTREACH_ACTIVE_ROOT: '1', OUTREACH_AUTO_UPDATE: '0' } });
      if (result.stdout.trim() !== JSON.stringify({ ok: true, version: latestVersion })) throw new Error('SELF_TEST_OUTPUT_MISMATCH');
    }}).catch(async error => {
      if (error.cause?.code === 'ENOENT') {
        const active = join(root, 'active');
        await rename(staged, active);
        return;
      }
      throw error;
    });
    return { action: 'staged', version: latestVersion };
  } finally {
    if (transaction) await rm(transaction, { recursive: true, force: true });
    if (staged) await rm(staged, { recursive: true, force: true });
    await rm(lock, { recursive: true, force: true });
  }
}
