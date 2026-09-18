#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { validateConfig } from "./validate-config.mjs";

export function buildCronPlan(config) {
  validateConfig(config);
  const common = { workdir: config.cron.workdir, delivery: { target: config.cron.delivery } };
  const agentic = (name, schedule, prompt, toolsets) => ({
    name, schedule, mode: "agentic", prompt, ...common,
    skill: "hermes-outreach", provider: config.cron.provider, model: config.cron.model, toolsets,
  });
  const plan = [
    {
      name: "outreach-refresh-dispatcher", schedule: config.cron.schedules.refresh, mode: "no-agent",
      script: "outreach-refresh-dispatcher.sh", ...common,
    },
    {
      name: "outreach-heartbeat", schedule: config.cron.schedules.heartbeat, mode: "no-agent",
      script: "outreach-heartbeat.sh", ...common,
    },
    agentic("outreach-incremental-sync", config.cron.schedules.incremental,
      "Use the hermes-outreach sync runbook. Synchronize provider changes incrementally, resume checkpoints, and write only canonical facts.",
      config.cron.toolsets.sync),
  ];
  if (config.providers.some((provider) => provider.roles.includes("sourcing"))) {
    plan.push(agentic("outreach-daily-sourcing", config.cron.schedules.sourcing,
      `Use the hermes-outreach sync runbook to source the configured daily volume in ${config.client.timezone}.`,
      config.cron.toolsets.sourcing));
  }
  plan.push(agentic("outreach-nightly-reconciliation", config.cron.schedules.reconciliation,
    "Use the hermes-outreach reconciliation runbook. Compare immutable facts and control totals; repair only with explicit facts or correction events.",
    config.cron.toolsets.reconciliation));
  return plan;
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("usage: cron-plan.mjs <config.json>");
  const config = JSON.parse(await readFile(file, "utf8"));
  process.stdout.write(`${JSON.stringify(buildCronPlan(config), null, 2)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => { process.stderr.write(`invalid cron plan: ${error.message}\n`); process.exitCode = 1; });
}
