#!/usr/bin/env bash
set -euo pipefail
CFG="${HERMES_OUTREACH_CONFIG:-${HERMES_HOME:-$HOME/.hermes}/scripts/outreach-client-config.json}"
API_URL="$(jq -er '.platform.apiUrl' "$CFG")"
KEY_ENV="$(jq -er '.platform.apiKeyEnv' "$CFG")"
API_KEY="${!KEY_ENV:-}"
test -n "$API_KEY"
curl --fail --silent --show-error --max-time 20 \
  -H "Authorization: Bearer $API_KEY" "$API_URL/api/v1/sync/status" >/dev/null
# Empty stdout is a silent successful native Hermès no-agent tick.
