#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compatible } from './update.mjs';

const base = dirname(fileURLToPath(import.meta.url));
const bundled = JSON.parse(readFileSync(join(base, 'package.json'), 'utf8')).version;
const directory = join(homedir(), '.cache', 'kalvi-outreach', 'updates');
const pin = process.env.OUTREACH_CLI_VERSION;
const valid = value => /^\d+\.\d+\.\d+$/.test(value);
let version = bundled;
let entry = join(base, 'commands.mjs');
try {
  let cached;
  try { cached = JSON.parse(readFileSync(join(directory, 'current.json'), 'utf8')).version; } catch {}
  const selected = pin || cached;
  if (valid(selected) && selected !== bundled && (pin || compatible(selected, bundled))) {
    const candidate = join(directory, selected, 'lib/node_modules/@kalvi/outreach-cli/commands.mjs');
    if (existsSync(candidate)) { entry = candidate; version = selected; }
  }
} catch { /* No verified update: use the bundled version. */ }
if (pin && (!valid(pin) || pin !== version)) {
  console.error(JSON.stringify({ error: 'PINNED_VERSION_NOT_INSTALLED' }));
  process.exit(1);
}
const result = spawnSync(process.execPath, [entry, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
// Maintenance runs after the command, without its secrets, arguments or streams.
if (!pin && process.env.OUTREACH_AUTO_UPDATE !== '0') {
  try {
    const child = spawn(process.execPath, [join(base, 'update.mjs'), directory, version], {
      detached: true, stdio: 'ignore',
      env: { PATH: process.env.PATH ?? '', HOME: homedir(), OUTREACH_AUTO_UPDATE: '0' },
    });
    child.on('error', () => {}); child.unref();
  } catch { /* Updating must never fail a business command. */ }
}
