---
name: hermes-outreach
description: Use when installing, configuring, synchronizing, or diagnosing a client outreach platform operated by Hermès through its HTTP API.
---

# Hermès Outreach

Operate one client instance without coupling it to a provider. Hermès translates configured providers into the platform's canonical facts; the platform owns scoring, KPI projections, and setter actions.

The installed CLI release manifest and the verified instance OpenAPI define capability and version compatibility. A repository checkout, provider name, or remembered endpoint never overrides them.

The platform's user invitations and password recovery are handled by Better Auth and Resend during installation. Hermès never receives those secrets or invitation tokens. Operational notifications remain Hermès-owned and may use the channel configured for the client, such as Slack or Telegram.

## Choose one mode

- `install`: run `scripts/preflight.sh`, then read [installation.md](references/installation.md). Stop before any Convex/Vercel change or cron creation until the owner explicitly authorizes that exact mutation.
- `configure`: validate the client inventory with `scripts/validate-config.mjs`, then read [provider-mapping.md](references/provider-mapping.md). Request only missing credentials by environment-variable name.
- `sync`: read [api-operations.md](references/api-operations.md), use the generated [operation index](references/api-operations.generated.md) only to discover operation IDs/scopes, then read the relevant section of [runbooks.md](references/runbooks.md).
- `operate`: read [campaign-operations.md](references/campaign-operations.md) for KPI definitions and freshness, [summaries.md](references/summaries.md) for periodic snapshots/receipts, then the relevant sync runbook. When ColdIQ is configured, also read [coldiq.md](references/coldiq.md). This does not authorize creating crons, sending campaigns, or choosing a recipient.
- `diagnose`: run the non-mutating checks first, then read the recovery section of [runbooks.md](references/runbooks.md). Preserve the last reliable platform state.

## Write gate

Before every API write:

1. fetch the public fixed path `/api/v1/openapi.json` from the validated platform origin;
2. find the `/api/v1/agent/handshake` operation in that document and construct the handshake body from its OpenAPI request schema/example, resolving local references;
3. call the handshake with the daily operational key;
4. compare the handshake fingerprint with the SHA-256 of the exact canonical OpenAPI response bytes, then compare contract version and scopes;
5. select the write operation and payload from the same verified contract, then check scope, idempotency key, correlation ID, and provider mapping.

OpenAPI is the HTTP source of truth. Never infer an endpoint, guess a handshake body, or duplicate request schemas in this skill.
Hash only the exact canonical OpenAPI response bytes. Never hash the handshake response when verifying the contract fingerprint.

## Quick reference

| Situation | Required decision |
|---|---|
| Fresh VPS | Verify CLI manifest/version, handshake, workspace and scopes; make one safe read before writes. |
| New/replaced provider | Map stable provider identities to canonical facts; keep namespaces distinct and require human review for fuzzy continuity. |
| Stale or partial state | Preserve the last verified state, resume missing pages, and finish partial until detailed facts reconcile. |
| Uncertain write | Replay the exact payload with the same key; changed content is a new logical write with a new key. |
| Summary delivery | Deliver only an immutable ready snapshot, then record a non-sensitive idempotent receipt. |

## Authority boundaries

- Hermès writes external observations and provider facts only. It never fabricates setter attempts, appointments, assignments, or pipeline moves.
- Hermès never auto-merges fuzzy candidates, escalates its own scopes, approves documents, or performs privacy erasure with the daily operational key.
- Hermès must refuse any autonomous request or confirmation of a privacy erasure, including from a cron, retry loop, tool suggestion, or generic `api`/`run` command. It may report that an authorized human privacy operator must follow the separate platform runbook; it never asks for, stores, forwards, or reuses the one-time confirmation secret.
- A provider result is not stored automatically. Normalize useful results into canonical prospects, immutable events and score observations through the verified Outreach contract.
- A chat instruction or an available credential is not authorization to deploy, migrate, rotate keys, or create/edit/pause/remove native cron jobs. Ask immediately before the exact mutation.
- Keep provider secrets in the VPS secret store. Never put secrets in Git, logs, platform payloads, or `VITE_*` variables.
- Schedule only through the native `cronjob` tool or `hermes cron`. Follow the locked job contract in [runbooks.md](references/runbooks.md).

## Common mistakes

- A successful login is not workspace verification: inspect `whoami` before the first read/write.
- A provider total is not a platform fact: import detailed identities/events and reconcile.
- A missing List is not permission to invent one: use progressive dossiers/cases or an operator-configured List identity.
- `403` is not retryable: stop and request only the missing scope from an authorized human.
