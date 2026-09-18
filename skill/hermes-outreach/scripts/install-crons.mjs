#!/usr/bin/env node
import { cp, mkdir, readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { buildCronPlan } from "./cron-plan.mjs";

function run(args, options = {}) {
  const result = spawnSync("hermes", args, { encoding: "utf8", ...options });
  if (result.status !== 0) throw new Error(`hermes ${args.join(" ")} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

function flags(job) {
  const result = ["--name", job.name, "--workdir", job.workdir, "--deliver", job.delivery.target];
  if (job.mode === "no-agent") return [...result, "--no-agent", "--script", job.script];
  for (const skill of [job.skill]) result.push("--skill", skill);
  result.push("--provider", job.provider, "--model", job.model);
  return result;
}

function resolveNativeCronPython() {
  if (process.env.HERMES_CRON_PYTHON) return process.env.HERMES_CRON_PYTHON;
  const located = spawnSync("which", ["hermes"], { encoding: "utf8" });
  if (located.status !== 0) throw new Error("Hermès CLI not found for native schedule validation");
  const launcher = located.stdout.trim();
  const candidates = [join(dirname(launcher), "python")];
  try {
    const wrapper = readFileSync(launcher, "utf8");
    const target = wrapper.match(/exec\s+["']([^"']*\/bin\/hermes)["']/)?.[1];
    if (target) candidates.unshift(join(dirname(target), "python"));
  } catch { /* Native binary/entrypoint: sibling python remains the fallback. */ }
  const python = candidates.find((candidate) => existsSync(candidate));
  if (!python) throw new Error("Hermès native parser Python not found; set HERMES_CRON_PYTHON to the Hermès venv Python");
  return python;
}

export function validateSchedulesWithNativeHermes(plan) {
  const python = resolveNativeCronPython();
  const source = [
    "import json,sys",
    "from cron.jobs import parse_schedule",
    "for item in json.loads(sys.argv[1]):",
    " parsed=parse_schedule(item['schedule'])",
    " if parsed.get('kind') not in ('interval','cron'): raise ValueError(f\"{item['name']}: schedule must repeat\")",
  ].join("\n");
  const result = spawnSync(python, ["-c", source, JSON.stringify(plan.map(({ name, schedule }) => ({ name, schedule })))], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`native Hermes schedule validation failed: ${result.stderr.trim()}`);
}

export function parseCronList(output) {
  const jobs = [];
  const blocks = output.split(/\n\s*\n/);
  for (const block of blocks) {
    const id = block.match(/^\s*([a-f0-9]{12})\s+\[(?:active|paused)\]/m)?.[1];
    const name = block.match(/^\s*Name:\s+(.+)$/m)?.[1]?.trim();
    if (id && name) jobs.push({ id, name });
  }
  return jobs;
}

async function main() {
  const [configPath, authorization] = process.argv.slice(2);
  if (!configPath || authorization !== "--authorized") {
    throw new Error("usage: install-crons.mjs <config.json> --authorized");
  }
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const plan = buildCronPlan(config);
  // Load-bearing all-or-nothing boundary: parse every schedule and confirm the
  // global timezone before the first native cron create/edit mutation.
  validateSchedulesWithNativeHermes(plan);
  const configuredTimezone = JSON.parse(run(["config", "get", "timezone", "--json"]));
  if (configuredTimezone !== config.client.timezone) {
    throw new Error(`Hermès timezone must be explicitly configured as ${config.client.timezone} before cron installation`);
  }
  run(["cron", "status"]);

  const scriptsDir = process.env.HERMES_HOME
    ? join(process.env.HERMES_HOME, "scripts")
    : join(homedir(), ".hermes", "scripts");
  await mkdir(scriptsDir, { recursive: true });
  const sourceDir = dirname(fileURLToPath(import.meta.url));
  for (const name of ["outreach-refresh-dispatcher.sh", "outreach-heartbeat.sh"]) {
    await cp(join(sourceDir, name), join(scriptsDir, name));
  }
  await cp(configPath, join(scriptsDir, "outreach-client-config.json"));

  const installed = parseCronList(run(["cron", "list", "--all"]));
  for (const job of plan) {
    const matches = installed.filter((candidate) => candidate.name === job.name);
    if (matches.length > 1) throw new Error(`${job.name}: ambiguous duplicate jobs; resolve before installation`);
    const action = matches.length === 0 ? "create" : "edit";
    const ref = matches[0]?.id ?? job.name;
    const args = action === "create"
      ? ["cron", "create", job.schedule, ...(job.mode === "agentic" ? [job.prompt] : []), ...flags(job)]
      : ["cron", "edit", ref, "--schedule", job.schedule, ...(job.mode === "agentic" ? ["--prompt", job.prompt] : []), ...flags(job)];
    run(args);
  }
  process.stdout.write("Native Hermès cron jobs created or updated. In the authorized Hermès session, apply each plan toolset with cronjob.update, then validate the structured cronjob.list result with validate-crons.mjs before production traffic.\n");
}

main().catch((error) => { process.stderr.write(`cron installation failed: ${error.message}\n`); process.exitCode = 1; });
