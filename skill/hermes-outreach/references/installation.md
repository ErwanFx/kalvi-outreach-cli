# Installation

Read this reference only in `install` mode.

## Non-mutating preflight

From the repository root, run:

```bash
skills/hermes-outreach/scripts/preflight.sh path/to/client-config.json
```

It checks Git, Node.js 22, pnpm 10, Convex CLI, Vercel CLI, Hermès, the native scheduler, the config, and the public OpenAPI endpoint. It reports missing prerequisites; it does not install, deploy, edit configuration, or create jobs.

## Access inventory

Daily operation needs only:

- the public Convex HTTP API URL;
- `OUTREACH_API_KEY` (or the configured `platform.apiKeyEnv`) with minimal operational scopes;
- provider credentials named by each `credentialEnv`, stored in the VPS secret store (coffre).

Convex deployment access is separate and requested only to create, migrate, back up, or diagnose the backend. Require an autorisation explicite immediately before the Convex mutation.

Vercel deployment access is separate and requested only to create or update the frontend. Require an autorisation explicite immediately before the Vercel mutation.

Do not request Convex or Vercel credentials for a daily sync. Missing privileged access is a stop condition: state the exact access and intended operation, then wait.

## Secret rules

Ne jamais enregistrer un vrai secret dans Git. Never echo it, copy it into a provider payload, or expose it to the browser. `VITE_*` variables are public build-time values and must never contain API keys, deploy keys, tokens, or provider credentials.

Use environment-variable names in the JSON config, not values. Put their values in the VPS secret store with least privilege. If a secret appeared in chat, Git, or logs, stop and request rotation before use.

The client config also carries the native scheduler contract, never secret values:

```json
{
  "cron": {
    "workdir": "/srv/outreach/client-slug",
    "provider": "operator-approved-provider",
    "model": "operator-approved-model",
    "toolsets": {
      "sync": ["web", "terminal"],
      "sourcing": ["web", "terminal"],
      "reconciliation": ["web", "terminal"]
    },
    "delivery": "local",
    "schedules": {
      "refresh": "every 1m",
      "heartbeat": "every 5m",
      "incremental": "every 15m",
      "sourcing": "0 8 * * *",
      "reconciliation": "30 2 * * *"
    }
  }
}
```

## Authorized installation sequence

After preflight passes and the owner authorizes each privileged phase:

1. obtain or clone the approved repository revision;
2. install project-local dependencies at locked versions;
3. provision or migrate Convex, if authorized;
4. deploy Vercel, if authorized;
5. issue the operational Hermès API key with minimal scopes;
6. validate the provider inventory and module flags;
7. copy or link `skills/hermes-outreach` into the Hermès project;
8. set the native Hermès `timezone` explicitly to the same IANA value as `client.timezone`, add the required `cron` config (absolute workdir, provider/model pins, toolsets, native delivery target and schedules), request separate authorization, then run the repository installer and post-install validator from the cron runbook;
9. execute a test handshake, import, refresh, and score readback without production bulk data.

Record deployment identifiers and versions, never credential values.

## Authentification de l’instance

Avant le bootstrap, l’opérateur configure côté Convex (jamais dans `VITE_*`) les variables `BETTER_AUTH_SECRET`, `SITE_URL`, `RESEND_API_KEY` et `AUTH_EMAIL_FROM`. Le domaine expéditeur doit être vérifié dans Resend et son quota gratuit contrôlé au moment de l’installation. Les invitations et les liens de récupération sont envoyés par l’interface via Better Auth ; Hermès ne reçoit ni ces secrets ni les jetons de lien.
