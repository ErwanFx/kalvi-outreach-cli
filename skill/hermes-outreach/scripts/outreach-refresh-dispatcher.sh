#!/usr/bin/env bash
set -euo pipefail
CFG="${HERMES_OUTREACH_CONFIG:-${HERMES_HOME:-$HOME/.hermes}/scripts/outreach-client-config.json}"
API_URL="$(jq -er '.platform.apiUrl' "$CFG")"
KEY_ENV="$(jq -er '.platform.apiKeyEnv' "$CFG")"
API_KEY="${!KEY_ENV:-}"
WORKDIR="$(jq -er '.cron.workdir' "$CFG")"
PROVIDER="$(jq -er '.cron.provider' "$CFG")"
MODEL="$(jq -er '.cron.model' "$CFG")"
TOOLSETS="$(jq -er '.cron.toolsets.sync | join(",")' "$CFG")"
test -n "$API_KEY"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
STATUS="$(curl --silent --show-error --max-time 20 -o "$TMP" -w '%{http_code}' \
  -H "Authorization: Bearer $API_KEY" "$API_URL/api/v1/sync/requests/next")"
if [ "$STATUS" = "204" ]; then exit 0; fi
if [ "$STATUS" != "200" ]; then echo "refresh dispatcher failed with HTTP $STATUS" >&2; exit 1; fi
REQUEST_ID="$(jq -er '.publicId' "$TMP")"
exec hermes -z "Use hermes-outreach sync mode. Claim and process refresh request $REQUEST_ID from the configured platform. Preserve checkpoints and provider-neutral canonical facts." \
  --in "$WORKDIR" --skills hermes-outreach --provider "$PROVIDER" --model "$MODEL" --toolsets "$TOOLSETS"
