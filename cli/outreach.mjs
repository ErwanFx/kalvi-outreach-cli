#!/usr/bin/env node
import { readFile, writeFile, mkdir, lstat, chmod, rename } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { request, validateOrigin, handshake, loadVerifiedContract } from './client.mjs';
import { assertOperationScope, discoverOperation, listOpenApiOperations, validateOperationRequest } from './openapi.mjs';
import { activatedCliPath, checkForCompatibleUpdate } from './update.mjs';
import { CLI_VERSION, RELEASE_MANIFEST } from './version.mjs';

const help = `Outreach CLI ${CLI_VERSION} (Node 22+)
outreach login --url https://client.convex.site --profile client
outreach whoami --profile client
outreach profiles
outreach logout --profile client
outreach operations [RESOURCE]
outreach run OPERATION_ID [--param publicId=ID] [--query 'limit=25'] [--file body.json]
outreach prospects list [--query 'limit=25&cursor=...']
outreach prospects get EXTERNAL_ID
outreach prospects upsert EXTERNAL_ID --file prospect.json
outreach events send --file events.json
outreach sync status
outreach privacy request --file request.json
outreach privacy confirm REQUEST_ID --file confirmation.json
outreach privacy status JOB_ID
outreach api GET /api/v1/campaigns
outreach api PATCH /api/v1/prospects/ID --file modification.json
outreach docs
Options: --profile NAME (default), --url HTTPS_ORIGIN (login only), --file JSON, --query QUERY, --param NAME=VALUE
Cron: OUTREACH_API_URL + OUTREACH_API_KEY, optionally OUTREACH_WORKSPACE_ID.
JSON on stdout; errors on stderr; exit 0 success, 1 internal, 2 usage, 3 auth/scope, 4 contract/workspace, 5 network/server. No automatic write retries.
See platform/docs/cli.md in the repository.`;

function exitCode(error) {
  if (error.message === 'MISSING_OPERATION_SCOPE') return 3;
  if (/^HTTP_(400|404|409|413)$/.test(error.message)) return 2;
  if (/^(INVALID_|UNKNOWN_|JSON_FILE_REQUIRED|GET_BODY_FORBIDDEN|REQUEST_|QUERY_|PATH_|OPERATION_|URL_|ENV_|LOGIN_|USE_ENV_|USE_PRIVACY_|PRIVACY_SECRET_|PIN_)/.test(error.message)) return 2;
  if (/^(HTTP_401|HTTP_403)/.test(error.message)) return 3;
  if (/^(CONTRACT_|WORKSPACE_|INVALID_OPENAPI)/.test(error.message)) return 4;
  if (/^(NETWORK_|HTTP_429|HTTP_5)/.test(error.message)) return 5;
  return 1;
}

function operationCatalog(document) {
  return listOpenApiOperations(document)
    .map(operation => ({ operationId: operation.operationId, method: operation.method, path: operation.path, scope: operation['x-required-scope'] ?? null, summary: operation.summary ?? '' }))
    .sort((left, right) => left.operationId.localeCompare(right.operationId));
}

function pathForOperation(document, operationId, parameters) {
  const matches = operationCatalog(document).filter(operation => operation.operationId === operationId);
  if (matches.length !== 1) throw new Error('UNKNOWN_OPERATION_ID');
  const parameterMap = Object.fromEntries((parameters ?? []).map(value => {
    const separator = value.indexOf('=');
    if (separator < 1) throw new Error('INVALID_PATH_PARAMETER');
    return [value.slice(0, separator), value.slice(separator + 1)];
  }));
  const path = matches[0].path.replace(/\{([^}]+)\}/g, (_, name) => {
    if (!(name in parameterMap)) throw new Error('MISSING_PATH_PARAMETER');
    return encodeURIComponent(parameterMap[name]);
  });
  if (Object.keys(parameterMap).some(name => !matches[0].path.includes(`{${name}}`))) throw new Error('UNKNOWN_PATH_PARAMETER');
  return { ...matches[0], path };
}

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
  const active = await activatedCliPath(CLI_VERSION);
  if (active) {
    const child = spawnSync(process.execPath, [active, ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, OUTREACH_ACTIVE_ROOT: '1' } });
    process.exitCode = child.status ?? 1;
    return;
  }
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { profile: { type: 'string', default: 'default' }, url: { type: 'string' }, file: { type: 'string' }, query: { type: 'string' }, param: { type: 'string', multiple: true }, help: { type: 'boolean' }, version: { type: 'boolean' }, 'self-test': { type: 'boolean' } } });
  const [command, verb, id] = positionals;
  if (values['self-test']) { console.log(JSON.stringify({ ok: true, version: CLI_VERSION })); return; }
  if (values.version || command === 'version') { console.log(JSON.stringify({ version: CLI_VERSION, contractVersion: RELEASE_MANIFEST.contractVersion })); return; }
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
  const verified = await loadVerifiedContract(config);
  const info = verified.handshake;
  if (command === 'whoami') { console.log(JSON.stringify(info)); await checkForCompatibleUpdate({ currentVersion: CLI_VERSION }).catch(() => undefined); return; }
  if (command === 'docs') { console.log(verified.document); return; }
  if (command === 'operations') {
    const resource = verb;
    const operations = operationCatalog(verified.openApi).filter(operation => !resource || operation.path.split('/')[3] === resource);
    console.log(JSON.stringify(operations));
    return;
  }
  let method, path;
  if (command === 'api') { method = verb?.toUpperCase(); path = id; }
  else if (command === 'run' && verb) ({ method, path } = pathForOperation(verified.openApi, verb, values.param));
  else if (command === 'privacy' && verb === 'request') { method = 'POST'; path = '/api/v1/privacy/erasures'; }
  else if (command === 'privacy' && verb === 'confirm' && id) { method = 'POST'; path = `/api/v1/privacy/erasures/${encodeURIComponent(id)}/confirm`; }
  else if (command === 'privacy' && verb === 'status' && id) { method = 'GET'; path = `/api/v1/privacy/erasures/jobs/${encodeURIComponent(id)}`; }
  else if (command === 'prospects' && verb === 'list') { method = 'GET'; path = '/api/v1/prospects'; }
  else if (command === 'prospects' && ['get', 'upsert'].includes(verb) && id) { method = verb === 'get' ? 'GET' : 'PUT'; path = `/api/v1/prospects/${encodeURIComponent(id)}`; }
  else if (command === 'events' && verb === 'send') { method = 'POST'; path = '/api/v1/events'; }
  else if (command === 'sync' && verb === 'status') { method = 'GET'; path = '/api/v1/sync/status'; }
  else throw new Error('UNKNOWN_COMMAND_USE_HELP');
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method) || !path) throw new Error('INVALID_REQUEST');
  if (path.startsWith('/api/v1/privacy/') && command !== 'privacy') throw new Error('USE_PRIVACY_COMMAND');
  if (values.query) path += `${path.includes('?') ? '&' : '?'}${new URLSearchParams(values.query)}`;
  if (method === 'GET' && values.file) throw new Error('GET_BODY_FORBIDDEN');
  if (command === 'privacy' && ['request', 'confirm'].includes(verb) && !values.file) throw new Error('JSON_FILE_REQUIRED');
  let body = values.file ? JSON.parse(await readFile(values.file, 'utf8')) : undefined;
  if (command === 'privacy' && verb === 'confirm') {
    if (Object.hasOwn(body ?? {}, 'confirmationSecret')) throw new Error('PRIVACY_SECRET_MUST_NOT_BE_IN_FILE');
    const confirmationSecret = process.env.OUTREACH_PRIVACY_CONFIRMATION_SECRET || await readSecret();
    body = { ...body, confirmationSecret };
  }
  const operation = discoverOperation(verified.openApi, method, path);
  assertOperationScope(operation, info.scopes ?? []);
  const url = new URL(path, 'https://contract.invalid');
  validateOperationRequest(verified.openApi, operation, { body, query: url.searchParams });
  console.log(JSON.stringify(await request(config, method, path, body)));
  await checkForCompatibleUpdate({ currentVersion: CLI_VERSION }).catch(() => undefined);
}

main().catch(error => {
  // Never echo response bodies, input arguments, filesystem content or secrets.
  const safe = /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : 'COMMAND_FAILED_CHECK_INPUT';
  console.error(JSON.stringify({ error: safe, exitCode: exitCode(error) })); process.exitCode = exitCode(error);
});
