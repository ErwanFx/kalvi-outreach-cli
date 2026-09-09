import { mkdir, readFile, writeFile, rename, rmdir, lstat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const exec = promisify(execFile);
const interval = 6 * 60 * 60 * 1000;
export function compatible(next, current) {
  if (!/^\d+\.\d+\.\d+$/.test(next) || !/^\d+\.\d+\.\d+$/.test(current)) return false;
  const a = next.split('.').map(Number), b = current.split('.').map(Number);
  return a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] > b[2]));
}
async function json(path) { return JSON.parse(await readFile(path, 'utf8')); }
async function atomic(path, value) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value), { mode: 0o600, flag: 'wx' });
  await rename(temporary, path);
}
async function latestRelease() {
  const response = await fetch('https://api.github.com/repos/ErwanFx/kalvi-outreach-cli/releases/latest', {
    signal: AbortSignal.timeout(5000), redirect: 'error', headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) throw Error('RELEASE_UNAVAILABLE');
  const release = await response.json();
  if (release.draft || release.prerelease || !/^v\d+\.\d+\.\d+$/.test(release.tag_name)) throw Error('INVALID_RELEASE');
  return release.tag_name.slice(1);
}
async function installVersion(version, directory) {
  const stage = join(directory, `stage-${randomUUID()}`);
  await mkdir(stage, { mode: 0o700 });
  await exec('npm', ['install', '--global', '--prefix', stage, '--ignore-scripts', '--no-audit', '--no-fund', '--engine-strict',
    `https://github.com/ErwanFx/kalvi-outreach-cli/archive/refs/tags/v${version}.tar.gz`], { timeout: 120000, maxBuffer: 1024 * 1024 });
  const root = join(stage, 'lib/node_modules/@kalvi/outreach-cli');
  const pkg = await json(join(root, 'package.json'));
  if (pkg.name !== '@kalvi/outreach-cli' || pkg.version !== version) throw Error('PACKAGE_MISMATCH');
  const result = await exec(process.execPath, [join(root, 'commands.mjs'), '--help'], { timeout: 5000 });
  if (!result.stdout.startsWith(`Outreach CLI ${version} `)) throw Error('SMOKE_TEST_FAILED');
  await rename(stage, join(directory, version));
}
export async function update({ directory, current, latest = latestRelease, install = installVersion, now = Date.now() }) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const stat = await lstat(directory);
  if (!stat.isDirectory() || (stat.mode & 0o077) !== 0) return;
  const lock = join(directory, 'lock');
  try { await mkdir(lock); } catch (error) { if (error.code === 'EEXIST') return; throw error; }
  try {
    const state = await json(join(directory, 'check.json')).catch(() => ({}));
    if (now - state.checkedAt < interval) return;
    await atomic(join(directory, 'check.json'), { checkedAt: now, status: 'checking' });
    try {
      const next = await latest();
      if (!compatible(next, current)) {
        await atomic(join(directory, 'check.json'), { checkedAt: now, status: 'current-or-incompatible' }); return;
      }
      await install(next, directory);
      await atomic(join(directory, 'current.json'), { version: next });
      await atomic(join(directory, 'check.json'), { checkedAt: now, status: 'updated', version: next });
    } catch {
      await atomic(join(directory, 'check.json'), { checkedAt: now, status: 'failed-kept-current' });
    }
  } finally { await rmdir(lock); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await update({ directory: process.argv[2], current: process.argv[3] }).catch(() => {});
}
