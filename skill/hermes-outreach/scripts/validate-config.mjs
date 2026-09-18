#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const ENV_NAME = /^[A-Z_][A-Z0-9_]*$/;
const ALLOWED_ROLES = new Set(["sourcing", "email", "enrichment", "linkedin", "postal_mail"]);
const MODULE_ROLE = { email: "email", linkedin: "linkedin", postal_mail: "postal_mail" };
const DELIVERY_TARGET = /^(?:origin|local|all|bot-chat(?::[a-zA-Z0-9._-]+)?|(?:telegram|discord|slack|signal|whatsapp|matrix|mattermost|email|sms|homeassistant|dingtalk|feishu|wecom|weixin|bluebubbles)(?::[^\s]+)?)$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function exactKeys(value, allowed, path) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${path} must be an object`);
  for (const key of Object.keys(value)) assert(allowed.includes(key), `${path}.${key} is not allowed`);
}

function envName(value, path) {
  assert(typeof value === "string" && ENV_NAME.test(value), `${path} must name an environment variable`);
  assert(!value.startsWith("VITE_"), `${path} must not use a public VITE_* variable`);
}

export function validateConfig(config) {
  exactKeys(config, ["client", "platform", "providers", "modules", "cron"], "config");
  exactKeys(config.client, ["slug", "timezone"], "client");
  assert(typeof config.client.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(config.client.slug), "client.slug must be a lowercase slug");
  assert(typeof config.client.timezone === "string" && config.client.timezone.length > 0, "client.timezone is required");
  try { new Intl.DateTimeFormat("en", { timeZone: config.client.timezone }).format(); }
  catch { throw new Error("client.timezone must be a valid IANA timezone"); }

  exactKeys(config.platform, ["apiUrl", "apiKeyEnv"], "platform");
  assert(typeof config.platform.apiUrl === "string", "platform.apiUrl must be an HTTPS URL");
  let apiUrl;
  try { apiUrl = new URL(config.platform.apiUrl); }
  catch { throw new Error("platform.apiUrl must be an HTTPS URL"); }
  assert(apiUrl.protocol === "https:" && apiUrl.hostname.length > 0, "platform.apiUrl must be an HTTPS URL");
  assert(apiUrl.username === "" && apiUrl.password === "", "platform.apiUrl must not contain inline credentials");
  assert(apiUrl.pathname === "/" && apiUrl.search === "" && apiUrl.hash === "", "platform.apiUrl must be an HTTPS origin root without path, query, or fragment");
  envName(config.platform.apiKeyEnv, "platform.apiKeyEnv");

  assert(Array.isArray(config.providers) && config.providers.length > 0, "providers must be a non-empty array");
  const roles = new Set();
  for (const [index, provider] of config.providers.entries()) {
    const path = `providers[${index}]`;
    exactKeys(provider, ["name", "roles", "credentialEnv"], path);
    assert(typeof provider.name === "string" && provider.name.trim().length > 0, `${path}.name is required`);
    assert(Array.isArray(provider.roles) && provider.roles.length > 0, `${path}.roles must be non-empty`);
    for (const role of provider.roles) {
      assert(ALLOWED_ROLES.has(role), `${path}.roles contains unknown role: ${String(role)}`);
      roles.add(role);
    }
    envName(provider.credentialEnv, `${path}.credentialEnv`);
  }

  exactKeys(config.modules, Object.keys(MODULE_ROLE), "modules");
  for (const [moduleName, role] of Object.entries(MODULE_ROLE)) {
    assert(typeof config.modules[moduleName] === "boolean", `modules.${moduleName} must be boolean`);
    assert(!config.modules[moduleName] || roles.has(role), `enabled module ${moduleName} has no provider with role ${role}`);
  }
  exactKeys(config.cron, ["workdir", "provider", "model", "toolsets", "delivery", "schedules"], "cron");
  assert(typeof config.cron.workdir === "string" && config.cron.workdir.startsWith("/"), "cron.workdir must be an absolute path");
  assert(typeof config.cron.provider === "string" && config.cron.provider.trim().length > 0, "cron.provider is required");
  assert(typeof config.cron.model === "string" && config.cron.model.trim().length > 0, "cron.model is required");
  exactKeys(config.cron.toolsets, ["sync", "sourcing", "reconciliation"], "cron.toolsets");
  for (const [name, toolsets] of Object.entries(config.cron.toolsets)) {
    assert(Array.isArray(toolsets) && toolsets.length > 0 && toolsets.every((item) => typeof item === "string" && item.length > 0), `cron.toolsets.${name} must be a non-empty string array`);
  }
  assert(typeof config.cron.delivery === "string" && DELIVERY_TARGET.test(config.cron.delivery), "cron.delivery must use native Hermes target syntax");
  exactKeys(config.cron.schedules, ["refresh", "heartbeat", "incremental", "sourcing", "reconciliation"], "cron.schedules");
  for (const [name, schedule] of Object.entries(config.cron.schedules)) {
    assert(typeof schedule === "string" && schedule.trim().length > 0, `cron.schedules.${name} is required`);
  }
  return config;
}

async function main() {
  const file = process.argv[2];
  assert(file, "usage: validate-config.mjs <config.json>");
  const config = JSON.parse(await readFile(file, "utf8"));
  validateConfig(config);
  process.stdout.write(`valid: ${file}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    process.stderr.write(`invalid config: ${error.message}\n`);
    process.exitCode = 1;
  });
}
