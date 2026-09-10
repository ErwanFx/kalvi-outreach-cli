#!/usr/bin/env node
import { readFile, writeFile, mkdir, lstat, chmod, rename } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';
import { request, validateOrigin, handshake } from './client.mjs';

const help = `Outreach CLI 1.1.1 (Node 22+)
outreach login --url https://client.convex.site --profile client
outreach whoami --profile client
outreach profiles
outreach logout --profile client
outreach prospects list [--query 'limit=25&cursor=...']
outreach prospects get EXTERNAL_ID
outreach prospects upsert EXTERNAL_ID --file prospect.json
outreach events send --file events.json
outreach sync status
outreach api GET /api/v1/campaigns
outreach api PATCH /api/v1/prospects/ID --file modification.json
outreach docs
Options: --profile NAME (default), --url HTTPS_ORIGIN (login only), --file JSON, --query QUERY
Cron: OUTREACH_API_URL + OUTREACH_API_KEY, optionally OUTREACH_WORKSPACE_ID.
JSON on stdout; errors on stderr; exit 0 success, 1 error. No automatic write retries.
Documentation: https://github.com/ErwanFx/kalvi-outreach-cli#readme`;

async function readSecret() {
  if (!process.stdin.isTTY) throw new Error('USE_ENV_FOR_NONINTERACTIVE_LOGIN');
  process.stderr.write('Clé API (saisie masquée) : ');
  process.stdin.setRawMode(true); process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error) => {
      process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.off('data', data);
      process.stderr.write('\n'); error ? reject(error) : resolve(value);
    };
    const data = chunk => {
      for (const c of chunk.toString()) {
        if (c === '\u0003') return finish(new Error('CANCELLED'));
        if (c === '\r' || c === '\n') return finish();
        if (c === '\u007f') value = value.slice(0, -1);
        else if (c >= ' ') value += c;
      }
    };
    process.stdin.on('data', data);
  });
}

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { profile: { type: 'string', default: 'default' }, url: { type: 'string' }, file: { type: 'string' }, query: { type: 'string' }, help: { type: 'boolean' } } });
  const [command, verb, id] = positionals;
  if (!command || values.help || command === 'help') { console.log(help); return; }
  const profile = values.profile;
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(profile)) throw new Error('INVALID_PROFILE');
  const directory = join(homedir(), '.config', 'kalvi-outreach');
  const file = join(directory, 'profiles.json');
  let profiles = {};
  try {
    const stat = await lstat(file);
    if (!stat.isFile() || (stat.mode & 0o077) !== 0) throw new Error('INSECURE_CONFIG_PERMISSIONS');
    profiles = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  async function save() {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    if (!(await lstat(directory)).isDirectory()) throw new Error('INVALID_CONFIG_DIRECTORY');
    await chmod(directory, 0o700);
    const temporary = join(directory, `${randomUUID()}.tmp`);
    await writeFile(temporary, JSON.stringify(profiles), { mode: 0o600, flag: 'wx' });
    await rename(temporary, file);
  }
  if (command === 'profiles') { console.log(JSON.stringify(Object.entries(profiles).map(([name, p]) => ({ name, url: p.url, workspaceId: p.workspaceId })))); return; }
  if (command === 'logout') { delete profiles[profile]; await save(); console.log(JSON.stringify({ removed: profile })); return; }
  if (command === 'login') {
    const url = validateOrigin(values.url ?? '');
    const key = process.env.OUTREACH_API_KEY || await readSecret();
    const config = { url, key };
    const info = await handshake(config);
    profiles[profile] = { ...config, workspaceId: info.instance.id };
    await save(); console.log(JSON.stringify({ profile, workspaceId: info.instance.id, scopes: info.scopes })); return;
  }
  if (values.url) throw new Error('URL_ONLY_ALLOWED_DURING_LOGIN');
  const env = process.env;
  if (Boolean(env.OUTREACH_API_KEY) !== Boolean(env.OUTREACH_API_URL)) throw new Error('ENV_URL_AND_KEY_REQUIRED_TOGETHER');
  const config = env.OUTREACH_API_KEY ? { url: env.OUTREACH_API_URL, key: env.OUTREACH_API_KEY, workspaceId: env.OUTREACH_WORKSPACE_ID } : profiles[profile];
  if (!config) throw new Error('LOGIN_REQUIRED');
  const info = await handshake(config);
  if (command === 'whoami') { console.log(JSON.stringify(info)); return; }
  if (command === 'docs') { console.log(await request(config, 'GET', '/api/v1/openapi.json', undefined, true)); return; }
  let method, path;
  if (command === 'api') { method = verb?.toUpperCase(); path = id; }
  else if (command === 'prospects' && verb === 'list') { method = 'GET'; path = '/api/v1/prospects'; }
  else if (command === 'prospects' && ['get', 'upsert'].includes(verb) && id) { method = verb === 'get' ? 'GET' : 'PUT'; path = `/api/v1/prospects/${encodeURIComponent(id)}`; }
  else if (command === 'events' && verb === 'send') { method = 'POST'; path = '/api/v1/events'; }
  else if (command === 'sync' && verb === 'status') { method = 'GET'; path = '/api/v1/sync/status'; }
  else throw new Error('UNKNOWN_COMMAND_USE_HELP');
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method) || !path) throw new Error('INVALID_REQUEST');
  if (values.query) path += `${path.includes('?') ? '&' : '?'}${new URLSearchParams(values.query)}`;
  if (method === 'GET' && values.file) throw new Error('GET_BODY_FORBIDDEN');
  const body = values.file ? JSON.parse(await readFile(values.file, 'utf8')) : undefined;
  if (['PUT', 'PATCH', 'POST'].includes(method) && body === undefined) throw new Error('JSON_FILE_REQUIRED');
  console.log(JSON.stringify(await request(config, method, path, body)));
}

main().catch(error => {
  // Never echo response bodies, input arguments, filesystem content or secrets.
  const safe = /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : 'COMMAND_FAILED_CHECK_INPUT';
  console.error(JSON.stringify({ error: safe })); process.exitCode = 1;
});
