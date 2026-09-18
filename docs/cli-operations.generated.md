# Generated API operations

Generated from `platform/openapi/hermes-v1.json`. Do not edit manually. Read the verified live OpenAPI for complete schemas; the operation IDs, scopes, examples, bounds, versions and errors below are regenerated from the same authority.

Contract: `v1` · CLI: `1.2.0` · OpenAPI: `sha256:f65a47c0d45522bc4c52322499487d06a6eaa137569ae9ceee6e402767313a04`

| Operation | Method | Path | Scope | Max body bytes |
|---|---|---|---|---:|
| `agentHandshake` | `POST` | `/api/v1/agent/handshake` | `authenticated` | — |
| `appendCaseScore` | `POST` | `/api/v1/scores` | `scores` | 262144 |
| `appendCaseScoreChunk` | `POST` | `/api/v1/scores/chunks` | `scores` | 262144 |
| `appendEvidence` | `POST` | `/api/v1/evidence` | `signals` | 262144 |
| `appendEvidenceChunk` | `POST` | `/api/v1/evidence/chunks` | `signals` | 262144 |
| `appendGoal` | `POST` | `/api/v1/goals` | `reports` | 262144 |
| `appendScoreObservations` | `POST` | `/api/v1/scoring/observations` | `prospects` | — |
| `appendSignal` | `POST` | `/api/v1/signals` | `signals` | 262144 |
| `appendSignalChunk` | `POST` | `/api/v1/signals/chunks` | `signals` | 262144 |
| `appendSourcingRun` | `POST` | `/api/v1/sourcing-runs` | `import` | 262144 |
| `archiveBatch` | `POST` | `/api/v1/batches/{publicId}/archive` | `import` | — |
| `archiveCampaign` | `POST` | `/api/v1/campaigns/{externalId}/archive` | `prospects` | — |
| `archiveCase` | `POST` | `/api/v1/cases/{publicId}/archive` | `cases` | 262144 |
| `archiveProspect` | `POST` | `/api/v1/prospects/{externalId}/archive` | `prospects` | — |
| `checkEvents` | `POST` | `/api/v1/events/check` | `events` | — |
| `checkpointSourcingRun` | `POST` | `/api/v1/sourcing-runs/{publicId}/checkpoint` | `import` | 262144 |
| `claimSyncRequest` | `POST` | `/api/v1/sync/requests/{publicId}/claim` | `reconcile` | — |
| `coldIqCompanySearch` | `POST` | `/api/v1/providers/coldiq/companies/search` | `providers` | — |
| `coldIqEmailVerify` | `POST` | `/api/v1/providers/coldiq/emails/verify` | `providers` | — |
| `coldIqPersonEnrich` | `POST` | `/api/v1/providers/coldiq/people/enrich` | `providers` | — |
| `coldIqSignalSearch` | `POST` | `/api/v1/providers/coldiq/signals/search` | `providers` | — |
| `commentDocument` | `POST` | `/api/v1/documents/{publicId}/comments` | `documents` | — |
| `completeSyncRequest` | `POST` | `/api/v1/sync/requests/{publicId}/complete` | `reconcile` | — |
| `confirmPrivacyErasure` | `POST` | `/api/v1/privacy/erasures/{requestId}/confirm` | `privacy` | 16384 |
| `createBatch` | `POST` | `/api/v1/batches` | `import` | — |
| `failSyncRequest` | `POST` | `/api/v1/sync/requests/{publicId}/fail` | `reconcile` | — |
| `finalizeBatch` | `POST` | `/api/v1/batches/{publicId}/finalize` | `import` | — |
| `getBatch` | `GET` | `/api/v1/batches/{publicId}` | `read` | — |
| `getCampaign` | `GET` | `/api/v1/campaigns/{externalId}` | `read` | — |
| `getCase` | `GET` | `/api/v1/cases/{publicId}` | `cases` | — |
| `getCaseScore` | `GET` | `/api/v1/scores/{publicId}` | `scores` | — |
| `getCurrentCaseScore` | `GET` | `/api/v1/scores/current` | `scores` | — |
| `getDocument` | `GET` | `/api/v1/documents/{publicId}` | `read` | — |
| `getEvidence` | `GET` | `/api/v1/evidence/{publicId}` | `signals` | — |
| `getGoal` | `GET` | `/api/v1/goals/{publicId}` | `reports` | — |
| `getOpenApi` | `GET` | `/api/v1/openapi.json` | `public` | — |
| `getPrivacyErasureStatus` | `GET` | `/api/v1/privacy/erasures/jobs/{jobId}` | `privacy` | — |
| `getProspect` | `GET` | `/api/v1/prospects/{externalId}` | `read` | — |
| `getProspectScore` | `GET` | `/api/v1/prospects/{externalId}/score` | `read` | — |
| `getSignal` | `GET` | `/api/v1/signals/{publicId}` | `signals` | — |
| `getSourcingRun` | `GET` | `/api/v1/sourcing-runs/{publicId}` | `import` | — |
| `getSummary` | `GET` | `/api/v1/reports/summaries/{publicId}` | `reports` | — |
| `getSyncStatus` | `GET` | `/api/v1/sync/status` | `reconcile` | — |
| `importBatchLeads` | `POST` | `/api/v1/batches/{publicId}/leads` | `import` | — |
| `linkCaseContact` | `POST` | `/api/v1/cases/{publicId}/contacts` | `cases` | 262144 |
| `listBatches` | `GET` | `/api/v1/batches` | `read` | — |
| `listBatchValidationItems` | `GET` | `/api/v1/batches/{publicId}/validation-items` | `read` | — |
| `listCampaigns` | `GET` | `/api/v1/campaigns` | `read` | — |
| `listCaseContacts` | `GET` | `/api/v1/cases/{publicId}/contacts` | `cases` | — |
| `listCases` | `GET` | `/api/v1/cases` | `cases` | — |
| `listCaseScore` | `GET` | `/api/v1/scores` | `scores` | — |
| `listDocuments` | `GET` | `/api/v1/documents` | `read` | — |
| `listDocumentVersions` | `GET` | `/api/v1/documents/{publicId}/versions` | `read` | — |
| `listEvidence` | `GET` | `/api/v1/evidence` | `signals` | — |
| `listGoal` | `GET` | `/api/v1/goals` | `reports` | — |
| `listProspectEvents` | `GET` | `/api/v1/prospects/{externalId}/events` | `read` | — |
| `listProspects` | `GET` | `/api/v1/prospects` | `read` | — |
| `listSegments` | `GET` | `/api/v1/dimensions/segments` | `read` | — |
| `listSignal` | `GET` | `/api/v1/signals` | `signals` | — |
| `listSources` | `GET` | `/api/v1/dimensions/sources` | `read` | — |
| `listSourcingRun` | `GET` | `/api/v1/sourcing-runs` | `import` | — |
| `listSummaries` | `GET` | `/api/v1/reports/summaries` | `reports` | — |
| `nextSyncRequest` | `GET` | `/api/v1/sync/requests/next` | `reconcile` | — |
| `progressSyncRequest` | `POST` | `/api/v1/sync/requests/{publicId}/progress` | `reconcile` | — |
| `publishBatch` | `POST` | `/api/v1/batches/{publicId}/publish` | `import` | — |
| `recordEvents` | `POST` | `/api/v1/events` | `events` | — |
| `recordSummaryReceipt` | `POST` | `/api/v1/reports/summaries/{publicId}/receipts` | `reports` | 65536 |
| `replaceCampaign` | `PUT` | `/api/v1/campaigns/{externalId}` | `prospects` | — |
| `replaceProspect` | `PUT` | `/api/v1/prospects/{externalId}` | `prospects` | — |
| `requestPrivacyErasure` | `POST` | `/api/v1/privacy/erasures` | `privacy` | 16384 |
| `requestSummary` | `POST` | `/api/v1/reports/summaries` | `reports` | 65536 |
| `resolveCaseIdentity` | `GET` | `/api/v1/cases/resolve` | `cases` | — |
| `restoreBatch` | `POST` | `/api/v1/batches/{publicId}/restore` | `import` | — |
| `restoreCampaign` | `POST` | `/api/v1/campaigns/{externalId}/restore` | `prospects` | — |
| `restoreCase` | `POST` | `/api/v1/cases/{publicId}/restore` | `cases` | 262144 |
| `restoreProspect` | `POST` | `/api/v1/prospects/{externalId}/restore` | `prospects` | — |
| `retrySummary` | `POST` | `/api/v1/reports/summaries/{publicId}/retry` | `reports` | 65536 |
| `reviewCaseDuplicate` | `POST` | `/api/v1/cases/{publicId}/duplicate-candidates` | `cases` | 262144 |
| `saveDocument` | `PUT` | `/api/v1/documents/{publicId}` | `documents` | — |
| `submitDocument` | `POST` | `/api/v1/documents/{publicId}/submit` | `documents` | — |
| `transitionCase` | `POST` | `/api/v1/cases/{publicId}/transition` | `cases` | 262144 |
| `transitionSourcingRun` | `POST` | `/api/v1/sourcing-runs/{publicId}/transition` | `import` | 262144 |
| `updateCampaign` | `PATCH` | `/api/v1/campaigns/{externalId}` | `prospects` | — |
| `updateCase` | `PUT` | `/api/v1/cases/{publicId}` | `cases` | 262144 |
| `updateProspect` | `PATCH` | `/api/v1/prospects/{externalId}` | `prospects` | — |
| `upsertCase` | `POST` | `/api/v1/cases` | `cases` | 262144 |
| `upsertCasesChunk` | `POST` | `/api/v1/cases/chunks` | `cases` | 262144 |

## Canonical workflow examples

### `agentHandshake`

`POST /api/v1/agent/handshake` · scope `authenticated`

```json
{
  "agentName": "Hermès",
  "agentVersion": "2.0.0",
  "originProvider": "instantly",
  "contractVersion": "v1",
  "correlationId": "startup-1"
}
```

### `upsertCasesChunk`

`POST /api/v1/cases/chunks` · scope `cases`

```json
{
  "schemaVersion": "1.0",
  "correlationId": "corr-1",
  "idempotencyKey": "write-1",
  "offset": 0,
  "items": [
    {
      "provider": "registry",
      "externalId": "case-1",
      "title": "Building project",
      "atUtc": 100
    }
  ]
}
```

### `linkCaseContact`

`POST /api/v1/cases/{publicId}/contacts` · scope `cases`

```json
{
  "schemaVersion": "1.0",
  "correlationId": "corr-1",
  "idempotencyKey": "write-1",
  "leadId": "lead-1",
  "role": "owner",
  "active": true,
  "atUtc": 101
}
```

### `appendSignal`

`POST /api/v1/signals` · scope `signals`

```json
{
  "schemaVersion": "1.0",
  "correlationId": "corr-1",
  "idempotencyKey": "write-1",
  "caseId": "case-1",
  "provider": "registry",
  "type": "permit",
  "category": "project",
  "label": "Permit granted",
  "observedAtUtc": 100,
  "confidence": 0.9,
  "evidenceIds": [],
  "atUtc": 100
}
```

### `appendCaseScore`

`POST /api/v1/scores` · scope `scores`

```json
{
  "schemaVersion": "1.0",
  "correlationId": "corr-1",
  "idempotencyKey": "write-1",
  "caseId": "case-1",
  "model": "intent",
  "modelVersion": "v1",
  "value": 0.8,
  "reasons": [
    "Permit granted"
  ],
  "evidenceIds": [],
  "observedAtUtc": 100,
  "atUtc": 100
}
```

### `claimSyncRequest`

`POST /api/v1/sync/requests/{publicId}/claim` · scope `reconcile`

```json
{
  "correlationId": "sync-claim-1"
}
```

### `completeSyncRequest`

`POST /api/v1/sync/requests/{publicId}/complete` · scope `reconcile`

```json
{
  "executionId": "claim_abc",
  "correlationId": "sync-1",
  "result": "completed",
  "totals": {
    "prospects": 120
  }
}
```

### `requestSummary`

`POST /api/v1/reports/summaries` · scope `reports`

```json
{
  "schemaVersion": "1.0",
  "correlationId": "corr-report-1",
  "idempotencyKey": "report-1",
  "externalRunId": "weekly-2026-09-16",
  "templateVersion": "executive-v1",
  "freshnessPolicy": "skip_stale",
  "period": "7d"
}
```

### `recordSummaryReceipt`

`POST /api/v1/reports/summaries/{publicId}/receipts` · scope `reports`

```json
{
  "schemaVersion": "1.0",
  "correlationId": "corr-report-1",
  "idempotencyKey": "delivery-report-1",
  "channel": "telegram",
  "deliveredAtUtc": 1789555200000,
  "externalDeliveryId": "message-123",
  "status": "delivered"
}
```

Quality review remains an authenticated director/agency UI read in this contract; no agent operation or merge authority is generated.

## Stable error semantics

| Code | HTTP | Safe message |
|---|---:|---|
| `UNAUTHORIZED` | 401 | Clé API invalide ou révoquée |
| `FORBIDDEN_SCOPE` | 403 | Cette clé API n'a pas la portée requise |
| `PAYLOAD_TOO_LARGE` | 413 | Le corps de la requête dépasse 8 Mio |
| `CASES_PAYLOAD_TOO_LARGE` | 413 | Le corps de la requête dépasse 256 Kio |
| `INVALID_PAYLOAD` | 400 | La requête est invalide |
| `NOT_FOUND` | 404 | La route demandée est introuvable |
| `BATCH_NOT_FOUND` | 404 | Le batch demandé est introuvable |
| `PROSPECT_NOT_FOUND` | 404 | Le prospect demandé est introuvable |
| `CAMPAIGN_NOT_FOUND` | 404 | La campagne demandée est introuvable |
| `RESOURCE_NOT_FOUND` | 404 | La ressource demandée est introuvable |
| `IDEMPOTENCY_CONFLICT` | 409 | La clé d'idempotence est déjà utilisée |
| `EXTERNAL_VERSION_CONFLICT` | 409 | Cette version externe existe déjà avec un autre contenu |
| `EXTERNAL_ID_CONFLICT` | 409 | Cet identifiant externe existe plusieurs fois dans l'organisation |
| `SCORE_EVENT_KEY_CONFLICT` | 409 | Cette clé d'événement de scoring existe déjà avec un autre contenu |
| `IMPORT_IN_PROGRESS` | 409 | Un import est déjà en cours pour ce batch |
| `IMPORT_RUN_ABANDONED` | 409 | Cet import a été abandonné et ne peut pas être repris |
| `INVALID_BATCH_STATE` | 409 | L'état du batch interdit cette opération |
| `CAMPAIGN_MEMBERSHIP_LIMIT` | 409 | La campagne dépasse la limite de membres modifiables par appel |
| `SYNC_REQUEST_NOT_FOUND` | 404 | La demande de synchronisation est introuvable |
| `SYNC_REQUEST_NOT_OWNED` | 403 | Cette demande appartient à une autre clé |
| `SYNC_CLAIM_EXPIRED` | 409 | Le bail de cette synchronisation a expiré |
| `INVALID_SYNC_REQUEST_STATE` | 409 | L'état de la synchronisation interdit cette opération |
| `UNSUPPORTED_CONTRACT_VERSION` | 400 | Cette version du contrat agent n'est pas prise en charge |
| `INVALID_DOCUMENT` | 400 | Le document est invalide |
| `INVALID_ICP_LINKS` | 400 | Les liens ICP sont invalides |
| `REVISION_CONFLICT` | 409 | La révision attendue n'est plus courante |
| `IDENTITY_CONFLICT` | 409 | Cette identité appartient déjà à un autre dossier ou contact |
| `GOAL_CONFLICT` | 409 | La période ou la révision de l'objectif est en conflit |
| `ATTRIBUTE_SCHEMA_INVALID` | 422 | Les attributs ne correspondent pas à la version du schéma |
| `KIND_IMMUTABLE` | 409 | Le type d'un document ne peut pas changer |
| `INVALID_STATUS` | 409 | Le statut du document interdit cette opération |
| `PROVIDER_NOT_CONNECTED` | 409 | ColdIQ n’est pas connecté à cet espace |
| `PROVIDER_UNAVAILABLE` | 502 | ColdIQ est momentanément indisponible |
| `PROVIDER_RESPONSE_TOO_LARGE` | 502 | La réponse ColdIQ dépasse la limite autorisée |
| `PROVIDER_PAYLOAD_TOO_LARGE` | 413 | La requête fournisseur dépasse la limite autorisée |
| `SUMMARY_GENERATION_FAILED` | 500 | La génération du résumé a échoué |
| `PRIVACY_ERASURE_REJECTED` | 403 | La demande d’effacement est refusée ou n’est plus valide |
| `PRIVACY_ERASURE_FAILED` | 409 | L’effacement n’a pas pu être finalisé et peut être repris |
| `PRIVACY_RESTORE_NOT_READY` | 503 | La restauration est en maintenance jusqu’à la reprise des effacements |
| `INTERNAL_ERROR` | 500 | Une erreur interne est survenue |
