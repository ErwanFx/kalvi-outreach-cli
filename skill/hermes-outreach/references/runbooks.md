# Runbooks

Read the relevant section in `sync` or `diagnose` mode. Native Hermès scheduled tasks run in fresh isolated sessions; every agentic job therefore needs the repository `workdir` and the `hermes-outreach` skill.

## Native cron contract

Use only the native `cronjob` tool or `hermes cron`. Ne jamais utiliser crontab ou cron Linux, systemd timers, launchd, or a parallel scheduler. Ne jamais modifier `~/.hermes/cron/jobs.json` directly.

Before creation or any edit/pause/resume/remove action:

1. obtain an autorisation explicite for that exact cron mutation;
2. verify the gateway and scheduler with `hermes cron status`;
3. verify the absolute client repository `workdir` exists;
4. verify configured credentials, delivery targets, least-privilege toolsets, and the `hermes-outreach` skill;
5. have the operator explicitly pin the modèle and provider through supported Hermès configuration or per-job CLI flags.

The top-level Hermès `timezone` must be explicitly configured to the client's `client.timezone`. Daily jobs use native five-field expressions (`0 8 * * *` for sourcing and `30 2 * * *` for reconciliation by default), so the Hermès scheduler evaluates 08:00 and 02:30 in that configured zone.

Keep `cron.allow_agent_scheduling` disabled. Cron sessions must not create or mutate other jobs.

## Required jobs

| Name | Schedule | Mode | Contract |
|---|---|---|---|
| `outreach-refresh-dispatcher` | every 1m | `no-agent` | Poll one refresh request; remain silent and exit successfully when empty; dispatch the approved sync runner when present. |
| `outreach-heartbeat` | every 5m | `no-agent` | Verify API/gateway/key health without LLM use or provider payloads. |
| `outreach-incremental-sync` | every 15m by default | agentic | Attach `hermes-outreach`, set `workdir`, use only configured provider and HTTP toolsets, resume checkpoints. |
| `outreach-daily-sourcing` | once daily, only when enabled | agentic | Create only when at least one provider declares the `sourcing` role. Attach `hermes-outreach`, set `workdir`, and respect client timezone/window and provider limits. With no `sourcing` provider, do not create this job. |
| `outreach-nightly-reconciliation` | nightly | agentic | Attach `hermes-outreach`, set `workdir`, compare event identities and control totals, repair with facts rather than overwriting KPI totals. |

The repository-owned installer is repeatable and uses only the native CLI:

```bash
node skills/hermes-outreach/scripts/install-crons.mjs path/to/client-config.json --authorized
```

Before any create/edit, it sends every planned schedule through the installed Hermès `cron.jobs.parse_schedule` parser and verifies `hermes config get timezone --json` equals `client.timezone`. One invalid schedule or a missing/mismatched timezone stops with zero cron mutations. It then checks `hermes cron status`, copies the two audited shell scripts into `$HERMES_HOME/scripts`, and creates missing jobs or edits the exact existing name. It refuses ambiguous duplicate names. It never reads or writes `jobs.json`. The config pins the absolute `workdir`, native delivery target (`local` by default), provider, model, skill, and least-privilege toolsets. Because the native CLI does not expose per-job toolsets, immediately apply the plan's `toolsets` to each agentic job from the same authorized interactive session with `cronjob(action="update", job_id="...", enabled_toolsets=[...])`. This is a required installation step, not an optional recommendation.

Alternatively, create/update the whole plan with `cronjob(action="create"|"update", ...)` in that authorized session. Provider/model pins remain operator-owned and must still be applied with `hermes cron edit <job> --provider ... --model ...`. Deterministic jobs use `no_agent=true` and the repository-owned scripts `outreach-refresh-dispatcher.sh` and `outreach-heartbeat.sh`; agentic jobs attach `hermes-outreach` and the configured `workdir`.

Post-install, capture the structured result of `cronjob(action="list")` without secrets as JSON and validate it:

```bash
node skills/hermes-outreach/scripts/validate-crons.mjs path/to/client-config.json /tmp/hermes-cron-list.json
```

The validator rejects a missing/duplicate job, wrong schedule or workdir, missing skill, provider/model drift, excess or missing toolsets, wrong delivery, wrong no-agent mode, or wrong script. Do not enable production traffic until it passes.

After validation, trigger each job with `hermes cron run <name>`, wait for the next gateway tick, then inspect `hermes cron runs <name> --limit 20` and `hermes cron list --all`. Confirm next run, terminal status, output delivery, model/provider pin, workdir, skills, and that empty polling is silent.

## Sync request

1. fetch canonical OpenAPI, construct and call its documented handshake, then verify the response fingerprint against the fetched bytes;
2. read and atomically claim the next request;
3. take a lock per organization/provider/scope and restore its checkpoint;
4. pull only configured providers, normalize, and write bounded idempotent pages;
5. publish progress without secrets;
6. complete with control totals, or fail while preserving the last reliable data.

Never allow two live executions for the same organization/provider/scope. Resume an expired lock from its checkpoint.

If a provider changes, freeze its historical ownership interval, start the replacement in a distinct source namespace, and resume only from a reviewed cutover checkpoint. Exact identities may link; fuzzy continuity enters human review. A replacement provider never backfills or relabels the former provider's interval unless an operator supplies an explicit bounded migration decision.

## Nightly reconciliation

Upsert current Lists, campaigns, and prospects; check external event keys in bounded pages; send missing/correction facts; compare daily controls by campaign, Liste, source, and segment; repeat until concordant or mark partial/stale with explicit divergences. Never replace a KPI with an external total.

## Diagnosis and recovery

Start read-only: validate config, run preflight, inspect handshake/OpenAPI fingerprint, `hermes cron status`, job list/history, sync status, scopes, provider health, checkpoint, and public error codes. Redact secrets and personal payloads.

- Contract mismatch: stop writes, update the project adapter/skill, revalidate, then resume from checkpoint.
- `401`/`403`: stop retries; request key/scope verification or authorized rotation.
- `409`: compare idempotency identity and payload; never create a new key to conceal a conflicting replay.
- `429`/transient `5xx`: honor `Retry-After`, back off with jitter, preserve checkpoint.
- Provider partial failure: finish as partial, preserve accepted facts, retry only the missing provider/page.
- Repeated cron failure: pause only after explicit authorization, fix configuration, test with `hermes cron run`, verify with `hermes cron runs`, then request authorization to resume.
