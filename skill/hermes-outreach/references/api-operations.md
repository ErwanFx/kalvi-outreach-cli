# API operations

Read this reference in `sync` mode and when API failures are being diagnosed.

## Discover the contract

Validate that the configured base URL is an HTTPS origin root. Fetch the unauthenticated fixed path `GET /api/v1/openapi.json` first. Locate `POST /api/v1/agent/handshake` in that document, resolve its local references, and construct the handshake body from its request schema and example. Never send `{}` or guessed fields.

Call the documented handshake with the operational key. The OpenAPI response is already the canonical representation: compute SHA-256 over the exact OpenAPI response bytes and compare `sha256:<hex>` with the fingerprint returned by the handshake. Never hash the handshake response. Also compare the contract version and granted scopes. Stop on any mismatch. Only then select write paths, request bodies, pagination, limits, examples, and stable errors from that same verified document.

Do not copy schemas from OpenAPI into code or this skill. Generate or validate requests against the live document so an additive contract update remains discoverable.

The generated [operation index](api-operations.generated.md) is a searchable release artifact, not a request-schema authority. `outreach operations` lists the operations supported by the verified instance; `outreach run OPERATION_ID` and the raw `api` command refuse an absent method/path, invalid parameters/body, or missing scope before transmission.

## Operation selection

- Create a Liste when a newly sourced set needs provenance and lifecycle tracking. The v1 HTTP path still says `batches`; user-facing copy says Liste.
- Upsert a prospect for current external identity, organization, sourcing, campaign, email, reply, and enrichment state.
- Append events for immutable provider facts. Correct a fact with the documented correction/cancellation event; never rewrite history.
- Append scoring observations, not a final score. Include short evidence, confidence, source, occurrence time, and stable external event identity.
- Claim a sync request before collecting providers; publish bounded progress and complete or fail it with a public, secret-free summary.
- Reconcile from detailed facts and event identities. Totals are controls, not replacements for platform KPI projections.
- Request/read periodic summaries and record delivery receipts only with explicit `reports` scope; follow [summaries.md](summaries.md).
- With `read`, list/read workspace documents. With an explicitly granted `documents` scope, create a new draft revision using the current `expectedRevision`, submit it for review, or comment on a precise revision. Preserve document, variant, and step identifiers. ICP and Persona are one category: create with `kind: "icp"`; keep `persona` when editing legacy documents. Use `kind: "other"` for free-form Markdown documents and keep `variants` empty. No parent is required. A sequence may link several same-workspace ICP / Persona documents. Use Markdown for every document body and each email step body, plain text for subjects. Headings are optional. Raw HTML and external images are not rendered. Confirm the fields and limits in live OpenAPI before sending.

Document approval is always a director's human action and has no agent endpoint. Setter attempts, assignments, pipeline transitions, and manual appointments are outside Hermès authority even if an API path appears discoverable.

## Request discipline

- Use the minimum scope declared by the chosen OpenAPI operation.
- Reuse an idempotency key only for the identical logical request.
- Carry a correlation ID through provider fetch, normalization, platform writes, and completion.
- Follow cursor pagination until the cursor is absent; persist a checkpoint after each accepted page.
- Serialize writes for the same prospect when order matters. Eligibility must still converge whether phone or positive reply arrives first.
- Honor `Retry-After`. Retry only transient failures with exponential backoff and jitter; stop on validation, authorization, scope, or permanent provider errors.
- Never log bearer tokens, provider payload secrets, unbounded metadata, or personal data beyond the runbook's diagnostic need.

Document writes require the standard schemaVersion/correlationId/idempotencyKey envelope. Retry identical requests unchanged; changed content needs a new idempotency key. Submission does not increment the content revision. GET /api/v1/documents/{publicId}/versions provides paginated history; GET with ?revision=N selects that revision and its comments only.
