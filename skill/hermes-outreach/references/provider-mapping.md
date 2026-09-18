# Provider mapping

Read this reference in `configure` mode or when adding/replacing a provider.

## Inventory contract

The client config declares:

- client slug and IANA timezone;
- platform API URL and operational key environment-variable name;
- providers with arbitrary names, canonical roles, and credential environment-variable names;
- enabled modules: email, LinkedIn, and postal mail.

Validate it before use:

```bash
node skills/hermes-outreach/scripts/validate-config.mjs path/to/client-config.json
```

Supported roles are `sourcing`, `email`, `enrichment`, `linkedin`, and `postal_mail`. A provider may implement multiple roles. An enabled module requires at least one provider with the matching role. Disabled modules produce no provider job and no synthetic zero events.

Daily sourcing has no separate flag: at least one provider with the `sourcing` role enables creation of `outreach-daily-sourcing`. If no provider declares `sourcing`, daily sourcing is disabled and the job must not be created.

## Canonicalization boundary

For each provider, create a project-local adapter that maps provider fields and webhooks to canonical OpenAPI operations. Keep provider-specific data in bounded diagnostic metadata only. Scoring, KPI logic, pipeline eligibility, and reconciliation must consume canonical fields/events, never provider metadata.

`sourceSystem` identifies the actual origin (for example `instantly`, `cold-iq`, `apollo`, `fullenrich`, `unipile`, or `manuscry`). Do not hard-code this list: a future provider name is valid if its adapter emits the canonical contract.

A provider replacement starts a distinct source namespace. Join it to history only through an exact deterministic identity already accepted by the contract. A fuzzy similarity creates a review candidate; it never authorizes an automatic merge. Record which provider owns each current feed and historical interval, and never relabel earlier facts.

## Mapping checklist

For every declared role, record locally:

1. provider object/event identity and stable idempotency key;
2. incremental cursor or modified-since strategy;
3. timestamp semantics and timezone conversion to UTC;
4. canonical prospect fields and event types emitted;
5. deletion, correction, retry, and rate-limit behavior;
6. reconciliation identifiers and totals;
7. credential environment-variable name and least-privilege access.

Hermès may submit evidence-bearing scoring observations. It never submits an opaque final score. It may observe LinkedIn requests and accepts or postal status events only when those modules are enabled and mapped.

For a newly detected intent without a contact, create or resolve the progressive dossier/case first and append the signal against that identity. Link a contact later. Use the legacy prospect/List path only when the workspace supplies the authoritative List identity; never manufacture a batch/List identifier to satisfy validation.
