#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { buildCronPlan } from "./cron-plan.mjs";

function assert(condition, message) { if (!condition) throw new Error(message); }

export function validateInstalledCrons(expected, installed) {
  assert(Array.isArray(installed), "installed cron list must be an array");
  for (const wanted of expected) {
    const matches = installed.filter((job) => job.name === wanted.name);
    assert(matches.length === 1, `${wanted.name}: expected exactly one installed job`);
    const actual = matches[0];
    for (const field of ["schedule", "workdir"]) {
      assert(actual[field] === wanted[field], `${wanted.name}: ${field} mismatch`);
    }
    assert((actual.delivery?.target ?? actual.deliver) === wanted.delivery.target, `${wanted.name}: delivery target mismatch`);
    if (wanted.mode === "no-agent") {
      assert(actual.noAgent === true || actual.no_agent === true || actual.mode === "no-agent", `${wanted.name}: no-agent mode missing`);
      assert(actual.script === wanted.script, `${wanted.name}: script mismatch`);
    } else {
      const skills = actual.skills ?? (actual.skill ? [actual.skill] : []);
      assert(skills.includes(wanted.skill), `${wanted.name}: attached skill mismatch`);
      assert(actual.provider === wanted.provider, `${wanted.name}: provider pin mismatch`);
      assert(actual.model === wanted.model, `${wanted.name}: model pin mismatch`);
      const toolsets = actual.enabled_toolsets ?? actual.toolsets ?? [];
      assert(JSON.stringify([...toolsets].sort()) === JSON.stringify([...wanted.toolsets].sort()), `${wanted.name}: toolsets mismatch`);
    }
  }
  return true;
}

async function main() {
  const [configPath, jobsPath] = process.argv.slice(2);
  if (!configPath || !jobsPath) throw new Error("usage: validate-crons.mjs <config.json> <hermes-cron-list.json>");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const installedPayload = JSON.parse(await readFile(jobsPath, "utf8"));
  validateInstalledCrons(buildCronPlan(config), installedPayload.jobs ?? installedPayload);
  process.stdout.write("valid cron installation\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => { process.stderr.write(`invalid cron installation: ${error.message}\n`); process.exitCode = 1; });
}
