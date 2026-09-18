#!/usr/bin/env bash
set -u

skill_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
config_file="${1:-}"
failures=0

check_command() {
  local command_name="$1"
  local label="$2"
  if command -v "$command_name" >/dev/null 2>&1; then
    local version
    version="$($command_name --version 2>/dev/null | head -n 1 || true)"
    printf 'ok: %s%s\n' "$label" "${version:+ ($version)}"
  else
    printf 'missing: %s (%s)\n' "$label" "$command_name"
    failures=$((failures + 1))
  fi
}

check_command git "Git"
check_command node "Node.js 22"
check_command pnpm "pnpm 10"
check_command convex "Convex CLI"
check_command vercel "Vercel CLI"
check_command hermes "Hermès CLI"
check_command curl "curl"
check_command jq "jq"

if command -v node >/dev/null 2>&1; then
  node_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || printf 0)"
  if [[ "$node_major" != "22" ]]; then
    printf 'wrong-version: Node.js 22 required (found %s)\n' "$node_major"
    failures=$((failures + 1))
  fi
fi

if command -v pnpm >/dev/null 2>&1; then
  pnpm_major="$(pnpm --version 2>/dev/null | cut -d. -f1)"
  if [[ "$pnpm_major" != "10" ]]; then
    printf 'wrong-version: pnpm 10 required (found %s)\n' "$pnpm_major"
    failures=$((failures + 1))
  fi
fi

if command -v hermes >/dev/null 2>&1; then
  if hermes cron status >/dev/null 2>&1; then
    printf 'ok: Hermès gateway and native scheduler reachable\n'
  else
    printf 'unavailable: Hermès native scheduler (hermes cron status)\n'
    failures=$((failures + 1))
  fi
fi

if [[ -n "$config_file" ]]; then
  if node "$skill_dir/scripts/validate-config.mjs" "$config_file"; then
    api_url="$(node -e 'const c=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(c.platform.apiUrl.replace(/\/$/,""))' "$config_file")"
    if command -v curl >/dev/null 2>&1 && curl --fail --silent --show-error --max-time 10 "$api_url/api/v1/openapi.json" >/dev/null; then
      printf 'ok: public OpenAPI endpoint reachable\n'
    else
      printf 'unavailable: public OpenAPI endpoint\n'
      failures=$((failures + 1))
    fi
  else
    failures=$((failures + 1))
  fi
else
  printf 'not-checked: config and API connectivity (pass a config path)\n'
fi

printf 'required-server-vars: BETTER_AUTH_SECRET SITE_URL RESEND_API_KEY AUTH_EMAIL_FROM\n'
printf 'not-checked: server variable values (read-only preflight never reads secrets)\n'

printf 'preflight: read-only; no install, deployment, configuration, or cron mutation performed\n'
exit "$failures"
