# Protection des données et effacement

Ce runbook est réservé à l’opérateur privacy. Hermès et ses crons quotidiens n’exécutent aucune de ces commandes. L’objectif est de chiffrer les données directement identifiantes, d’effacer un sujet dans tous les stores couverts et d’empêcher une ancienne sauvegarde de le ressusciter.

## Préparer et sauvegarder les clés

Créer trois secrets indépendants de 32 octets encodés en base64url : `PII_ENCRYPTION_KEY`, `PII_INDEX_KEY` et `PRIVACY_LEDGER_SIGNING_KEY`. Les stocker dans Convex et dans le coffre de reprise hors ligne. Configurer aussi `PRIVACY_LEDGER_URL` et `PRIVACY_LEDGER_AUTH_SECRET` vers un service d’append/lecture exploité indépendamment de la base Convex.

Contraintes :

- ne jamais réutiliser une clé provider, Better Auth ou API Outreach ;
- ne jamais placer ces secrets dans Vercel, `VITE_*`, Git, un payload, un ticket ou un log ;
- sauvegarder et tester la récupération des clés avant toute migration ;
- une rotation de clé de chiffrement exige un re-chiffrement versionné et vérifié avant retrait de l’ancienne clé ; ce runbook ne réalise pas automatiquement cette rotation ;
- une perte de `PII_ENCRYPTION_KEY` rend les données privées illisibles ; une perte de `PII_INDEX_KEY` empêche la recherche exacte et le rejeu privacy.

Le registre externe ne reçoit que des marqueurs pseudonymes signés : espace, identifiants de demande/job, blind token, révision et heure. Il ne reçoit jamais le nom, l’e-mail, le téléphone ou le texte source.

## Frontière de lecture applicative

Les champs privés d’un prospect sont déchiffrés uniquement dans des actions Node authentifiées et bornées. Les requêtes réactives Convex ne transportent que des états opérationnels, agrégats, identifiants internes ou libellés pseudonymisés. Les vues Prospect, Pipeline, dossier et contrôle qualité hydratent leur snapshot privé à la demande et proposent un rafraîchissement explicite ; elles ne conservent aucun cache durable déchiffré. Cette frontière retire volontairement la réactivité temps réel native aux champs PII. Une page reste limitée à 50 prospects, une comparaison qualité à une anomalie et deux dossiers, et les historiques dossier à une page de 40 faits maximum.

La recherche floue sur nom, e-mail ou téléphone est désactivée. Les seules recherches exactes autorisées passent par des blind indexes HMAC séparés par espace et par domaine. Ne réintroduire ni index de recherche plaintext, ni requête Convex publique renvoyant une valeur libre classée PII.

## Migrer le plaintext

**À faire immédiatement après le déploiement, espace par espace.** Tant qu’un prospect historique n’est pas migré, il n’apparaît plus dans les listes et ses lectures API échouent : la plateforme ne lit le plaintext que pour un état explicitement marqué, et les prospects antérieurs n’en portent aucun. Prévoir le déploiement en fenêtre de maintenance et lancer la migration par lots dans la foulée :

```sh
pnpm exec convex run privacyMigration:migrateWorkspace \
  '{"workspaceId":"WORKSPACE_ID","cursor":null,"limit":50}' --prod \
  --identity '{"subject":"migration-operator","issuer":"outreach-privacy-cli"}'
```

Relancer la commande avec le `cursor` renvoyé jusqu’à `"isDone": true`. Chaque appel traite une page bornée (100 au plus). Un prospect en échec est compté dans `failed`, listé dans `failedLeadIds` et n’arrête pas le lot ; le reprendre ensuite à l’unité. Rejouer depuis `cursor: null` est sans danger : un prospect déjà chiffré est ignoré.

Pour un seul prospect, depuis une identité Convex dédiée, jamais avec une clé API quotidienne :

```sh
pnpm exec convex run privacyMigration:migrateLead \
  '{"workspaceId":"WORKSPACE_ID","leadId":"LEAD_ID"}' --prod \
  --identity '{"subject":"migration-operator","issuer":"outreach-privacy-cli"}'
```

Le traitement est idempotent : chiffrement AES-256-GCM avec AAD espace + lead + versions, relecture et vérification, création des blind indexes/flags, puis scrub du row historique. Un arrêt après l’écriture chiffrée reprend sans régénérer un second enregistrement. Une erreur de déchiffrement marque le checkpoint en échec et interdit le scrub. Traiter une page bornée de leads à la fois et contrôler uniquement les comptes sûrs des checkpoints. Ne pas restaurer le plaintext pour revenir à une version précédente ; conserver le store chiffré et les clés.

## Émettre une clé privacy courte

Une clé privacy est limitée à un espace, ne contient que `privacy`, expire entre 60 et 3 600 secondes et n’est jamais proposée dans l’interface standard :

```sh
pnpm exec convex run apiKeyProvisioning:issuePrivacy \
  '{"workspaceId":"WORKSPACE_ID","label":"Effacement humain 2026-09-16","ttlSeconds":900}' --prod \
  --identity '{"subject":"privacy-operator","issuer":"outreach-privacy-cli"}'
```

Copier la valeur affichée une seule fois dans l’environnement privé d’un profil CLI temporaire. Ne jamais ajouter `privacy` à une ancienne clé ou à « tout autoriser ». La clé demandeuse doit aussi être celle qui confirme.

## Demander puis confirmer

1. Créer un JSON de demande contenant `schemaVersion`, un `correlationId`, un `idempotencyKey`, `requestedAtUtc` et le sujet exact (`email` ou `external-id`).
2. Exécuter `outreach privacy request --file request.json`. Vérifier le compte sûr affecté, l’espace, l’expiration et la révision. Aucune donnée n’est effacée à cette étape.
3. Conserver le secret de confirmation uniquement le temps de la cérémonie. Il n’est stocké côté serveur que sous forme de hash fort et ne sera pas réaffiché lors d’un replay.
4. Après validation humaine, créer un nouveau JSON de confirmation avec une nouvelle corrélation/idempotence, la révision attendue, `confirmed: true` et une heure fraîche. Le JSON ne contient pas le secret.
5. Saisir le secret masqué, ou l’injecter pour un seul processus via `OUTREACH_PRIVACY_CONFIRMATION_SECRET`, puis exécuter `outreach privacy confirm REQUEST_ID --file confirm.json`.
6. Suivre uniquement l’état sûr avec `outreach privacy status JOB_ID`.

Une demande absente, étrangère ou expirée produit volontairement la même erreur. Un replay strictement identique d’une confirmation réussie retourne le même job ; un payload modifié est refusé.

## Reprise et panne du registre

La confirmation planifie automatiquement le worker interne. Le job prend un lease clôturé et progresse par checkpoints bornés : stores techniques, stores primaires/chiffrés, scan négatif complet, accusé du registre, puis `COMPLETE`. Les faits non identifiants et agrégats vérifiés restent stables. Après interruption, le worker reprend le même job ; ne pas recréer une demande. Un replay strict de la confirmation ne planifie pas un deuxième worker.

Si le registre externe est indisponible, le job reste `PARTIAL` en phase `LEDGER` et le worker retente après un délai borné. Réparer le service puis suivre le même job. Il est interdit de forcer `COMPLETE`, d’écrire un marqueur dans Convex comme substitut ou de désactiver le scan négatif. Les logs ne doivent contenir que l’espace, les identifiants publics, la phase, la corrélation et des comptes sûrs.

Un job resté `PENDING`, `PARTIAL` ou `RUNNING` avec un lease expiré (worker interrompu par une exception) est relancé automatiquement toutes les 10 minutes par la tâche planifiée `resume stalled privacy erasures`. Aucune clé privacy n’est nécessaire pour cette reprise.

### Périmètre de la recherche d’effacement

L’effacement supprime toujours l’enregistrement chiffré complet du prospect. La recherche dans le reste de l’espace (documents, commentaires, journaux techniques) porte uniquement sur les valeurs qui identifient la personne à elles seules : e-mail, téléphone, URL LinkedIn, identifiant externe, adresse postale, références de source et nom complet. Un prénom seul, une fonction ou une ville écrits à la main dans un commentaire ne sont pas réécrits : ce sont des mots ordinaires, partagés avec du contenu sans rapport.

## Restaurer une ancienne sauvegarde

Avant de rouvrir le trafic, laisser l’espace en maintenance et exécuter :

```sh
pnpm exec convex run privacyRestore:replay \
  '{"workspaceId":"WORKSPACE_ID","restoredCheckpointUtc":1700000000000}' --prod \
  --identity '{"subject":"restore-operator","issuer":"outreach-privacy-cli"}'
```

Le gate passe à `REPLAYING`, lit les marqueurs externes postérieurs au checkpoint, vérifie leur signature, réapplique localement l’anonymisation puis passe à `READY`. Toute panne le place à `BLOCKED`; les routes protégées répondent `PRIVACY_RESTORE_NOT_READY`/503. Ne rétablir le trafic qu’après `READY`, un scan négatif et la vérification que les agrégats sont inchangés.

### Limites connues du rejeu de restauration

- Pour un prospect encore au format historique (non migré) au moment de la sauvegarde restaurée, le rejeu anonymise ses événements mais ne repurge pas les stores techniques (documents, lettres mortes, clés d’idempotence…). Migrer l’espace restauré avec `migrateWorkspace` **avant** de lancer `privacyRestore:replay`.
- Si la personne effacée a été créée après le checkpoint restauré, elle est absente de la sauvegarde : le rejeu échoue avec `PRIVACY_RESTORE_SUBJECT_NOT_FOUND` et laisse le gate à `BLOCKED`. Vérifier manuellement l’absence du sujet, puis débloquer le gate depuis le tableau de bord Convex.
