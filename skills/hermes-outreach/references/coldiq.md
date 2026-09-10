# ColdIQ via Outreach

La connexion se configure dans `Paramètres > Connexions`. L'agent reçoit une clé Outreach avec la portée `providers`; il ne reçoit jamais la clé ColdIQ.

Opérations autorisées :

- `POST /api/v1/providers/coldiq/companies/search`
- `POST /api/v1/providers/coldiq/people/enrich`
- `POST /api/v1/providers/coldiq/emails/verify`
- `POST /api/v1/providers/coldiq/signals/search`

Construire chaque corps depuis l'OpenAPI courant. Après une recherche d'intents, enregistrer chaque fait via `POST /api/v1/events` avec `eventType: intent.detected`, un `eventKey` fournisseur stable et les métadonnées `intentType`, `evidence`, `detectedAtUtc`; `sourceUrl` est optionnel. `occurredAtUtc` est la date du fait métier, pas la date de découverte.

Utiliser `sourcingMode: intent` pour un prospect découvert par le workflow harponnage. Garder `mass` pour un prospect de sourcing de masse qui reçoit ensuite un signal. Émettre séparément une observation `signal_verified` seulement si la preuve respecte les règles de scoring.
