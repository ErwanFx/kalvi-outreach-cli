# Référence du CLI Outreach

## Présentation des documents

Les choix humains par e-mail sont disponibles avec `outreach api GET /api/v1/documents/DOCUMENT_ID --profile client` dans `current.stepSelections` (index d'étape, variante, identifiant du mail, auteur et date) et `current.selectionVersion`. Ils sont en lecture seule pour l'agent. Ne pas les recopier dans un PUT ni compléter une sélection partielle sans décision du client. Le CLI existant suffit pour cette lecture.

Suivre le [contrat de rédaction](document-authoring.md) pour toutes les catégories. Le CLI transmet du Markdown et des étapes structurées ; la plateforme applique automatiquement le même design aux imports et aux documents créés dans l'interface. Pour une séquence, ne pas dupliquer les emails dans `body` : utiliser `variants[].steps[]`. Le contrat est également exposé dans l'OpenAPI sous `x-document-authoring`.

Le CLI 1.2.0 appelle l’API HTTP v1. Il ne se connecte ni à Convex en administrateur, ni aux outils fournisseurs. Node.js 22 ou supérieur est requis. Aucun paquet tiers d’exécution n’est nécessaire. `outreach --version`, le paquet, l’agent de handshake, le manifeste et la documentation partagent exactement cette version.

## Installation et mise à jour

Depuis tout VPS avec Node.js 22+ et npm, sans accès au dépôt privé :

```bash
npm install -g https://github.com/ErwanFx/kalvi-outreach-cli/archive/refs/tags/v1.2.0.tar.gz
outreach --version
outreach --help
```

Le dépôt public est https://github.com/ErwanFx/kalvi-outreach-cli. Pour une mise à jour, choisir un nouveau tag publié et relancer l’installation. Le paquet est téléchargé depuis GitHub, pas depuis le registre npm. Une clé API de l’espace reste nécessaire.

## Connexion et profils

### Mises à jour automatiques

Installer 1.2.0 une première fois. Ensuite, le CLI vérifie les releases stables officielles au maximum toutes les six heures, après la commande métier. Aucun cron supplémentaire. Une version compatible du même numéro majeur est préparée dans le cache privé de l’utilisateur, puis activée pour une prochaine commande seulement après vérification SHA-256, contrôle des chemins de l’archive, identité/version du paquet et autotest. L’installation globale, les clés et les profils ne sont pas modifiés. Une archive tronquée, substituée, interrompue ou invalide laisse la version active utilisable.

`OUTREACH_AUTO_UPDATE=0` suspend les contrôles. `OUTREACH_CLI_VERSION=1.2.0` fixe exactement la version active et interdit toute activation différente. Définir ces variables dans l’environnement du service de l’agent pour les conserver. Les changements de version majeure nécessitent une migration manuelle.

Le cache est `~/.cache/kalvi-outreach/updates`. `check.json` donne l’état du dernier contrôle. Après une interruption brutale, un verrou peut rester : vérifier qu’aucun processus `update.mjs` n’est actif avant de retirer le répertoire vide `lock` avec `rmdir`. Les anciennes versions sont conservées. `outreach --help` indique la version exécutée ; `npm list -g` indique celle du lanceur global. Consulter le [guide public complet](https://github.com/ErwanFx/kalvi-outreach-cli#mise-à-jour-automatique) pour les détails.

### Authentification

```bash
outreach login --url https://votre-instance.convex.site --profile client
outreach whoami --profile client
outreach profiles
outreach logout --profile client
```

login demande la clé sans afficher la saisie. Il vérifie le contrat OpenAPI, la clé et son espace avant de sauvegarder le profil. whoami retourne en JSON le nom de l’organisation, instance.id, les scopes et les capacités. profiles ne retourne jamais les clés. logout retire uniquement le profil local ; il ne révoque pas la clé côté serveur.

Les profils sont dans ~/.config/kalvi-outreach/profiles.json, avec des permissions 0600 et un répertoire 0700 sur macOS/Linux. Les secrets y sont en clair, protégés par les permissions du système, pas chiffrés. Ne sauvegardez pas ce fichier dans Git ou un dossier partagé. Évitez plusieurs commandes login/logout simultanées. Le profil par défaut s’appelle default ; --profile accepte 1 à 64 lettres ASCII, chiffres, tirets ou underscores.

## Commandes métier

```bash
outreach prospects list --profile client --query 'limit=25'
outreach prospects get prospect-123 --profile client
outreach prospects upsert prospect-123 --file prospect.json --profile client
outreach events send --file events.json --profile client
outreach sync status --profile client
outreach docs --profile client
outreach operations cases --profile client
outreach run listCases --query 'limit=25' --profile client
outreach run getCase --param publicId=CAS-2026-0001 --profile client
```

`operations` retourne en JSON les identifiants, méthodes, chemins et scopes du contrat vérifié, filtrables par première ressource de chemin. `run` sélectionne un `operationId`, exige chaque paramètre de chemin via `--param nom=valeur`, et applique le schéma OpenAPI avant transmission. `upsert` appelle PUT /api/v1/prospects/{externalId}. Le fichier doit contenir le corps complet attendu par ce contrat, y compris l’enveloppe d’idempotence. `email` est optionnel : l’omettre crée un prospect « À enrichir » ; l’ajouter plus tard avec `outreach api PATCH` et `emailStatus: "verified"` après vérification. `events send` appelle POST /api/v1/events. `docs` retourne la spécification OpenAPI complète et ses exemples.

## Accéder à tous les endpoints

```bash
outreach api GET /api/v1/campaigns --profile client
outreach api GET /api/v1/prospects --query 'limit=25&cursor=CURSEUR_RETOURNE' --profile client
outreach api PATCH /api/v1/prospects/prospect-123 --file modification.json --profile client
outreach api POST /api/v1/batches --file liste.json --profile client
```

`api` accepte une méthode GET, POST, PUT, PATCH ou DELETE et un chemin commençant par /api/v1/. La méthode et le chemin concret doivent correspondre à une opération du document OpenAPI dont les octets viennent d’être vérifiés. Le corps, la query, les paramètres de chemin et le scope sont validés localement avant transmission. DELETE n’est pas un archivage générique. L’archivage v1 utilise POST sur les endpoints /archive. Une URL absolue, une traversée de chemin ou une redirection est refusée.

--file lit un fichier JSON UTF-8. Il est obligatoire pour POST, PUT et PATCH et interdit pour GET. Utilisez un fichier contenant {} si le contrat attend un corps vide. --query ajoute les paramètres URL ; les dates, filtres et limites doivent respecter le schéma de chaque endpoint. Les listes retournent une page : réutilisez continueCursor jusqu’à isDone, sans inventer un curseur.

## Automatisation sans session interactive

Configurez les secrets dans l’environnement privé du processus Hermès : OUTREACH_API_URL et OUTREACH_API_KEY doivent être fournis ensemble. OUTREACH_WORKSPACE_ID est recommandé pour verrouiller l’espace attendu. Aucun secret n’est nécessaire dans la ligne de commande ou dans la définition du cron.

```bash
outreach whoami
outreach sync status
```

Quand les deux variables sont présentes, elles remplacent le profil choisi ; elles ne sont jamais combinées avec un autre profil. Pour utiliser à nouveau un profil local, retirez les deux variables de l’environnement. --url est accepté uniquement lors du login. Un login avec OUTREACH_API_KEY sauvegarde cette clé dans le profil local : pour un cron sans fichier de secret, utilisez directement les commandes avec les deux variables.

Le CLI n’installe aucun cron. L’agent programme son travail via le mécanisme natif d’Hermès, avec les accès fournisseurs séparés. Un changement de fournisseur ne nécessite pas de modifier le CLI.

## Effacement privacy réservé à l’opérateur

La clé quotidienne de l’agent ne porte jamais `privacy`. Un opérateur humain obtient une clé séparée, limitée à un espace et valable au maximum une heure, après la cérémonie décrite dans [le runbook privacy](privacy-operations.md). Les commandes dédiées sont :

```sh
outreach privacy request --file erasure-request.json --profile privacy-client
OUTREACH_PRIVACY_CONFIRMATION_SECRET='secret-affiché-une-fois' \
  outreach privacy confirm per_request_id --file erasure-confirm.json --profile privacy-client
outreach privacy status pej_job_id --profile privacy-client
```

Le fichier de confirmation ne contient jamais `confirmationSecret`. En session interactive, omettez la variable pour obtenir une saisie masquée. Le secret n’est accepté ni dans les arguments, ni par `outreach api`, ni par `outreach run`. La demande est l’unique commande qui l’affiche, une seule fois. Ne la lancez pas depuis un journal de CI. Une confirmation exige une décision humaine explicite, un `correlationId` et un `idempotencyKey` nouveaux.

## Contrat, erreurs et retries

Avant chaque commande distante, le CLI télécharge OpenAPI, effectue un handshake v1, compare son empreinte SHA-256 et vérifie l’espace mémorisé. HTTPS est obligatoire. Chaque requête a un délai maximal de 30 secondes. Les écritures ne sont jamais rejouées automatiquement.

stdout contient le résultat JSON, stderr une erreur JSON sûre ; `--help` produit du texte. Codes stables : 0 succès, 1 erreur interne, 2 usage/requête invalide ou état métier refusé (`HTTP_400`, `HTTP_404`, `HTTP_409`, `HTTP_413`), 3 authentification ou scope, 4 contrat ou workspace, 5 réseau/limite/serveur (`HTTP_429`, `HTTP_5xx`). Les corps d’erreur distants ne sont pas réimprimés pour éviter de divulguer une clé, une donnée personnelle ou un secret reflété par un serveur.

Les écritures ne sont jamais retentées automatiquement. Après un résultat incertain, rejouer exactement le même payload avec la même clé d’idempotence. Une modification du payload est une nouvelle opération logique et exige une nouvelle clé après lecture/réconciliation de l’état.

## Responsabilités

- La plateforme authentifie, conserve les faits, calcule les projections/KPI et crée les snapshots.
- Hermès adapte les fournisseurs, planifie les jobs autorisés, transmet les faits et distribue les snapshots prêts.
- Le fournisseur reste responsable de ses identités, curseurs, statuts et transport. Aucun connecteur fournisseur direct ni cron de livraison n’est créé par la plateforme.

La table exhaustive des identifiants d’opérations et scopes est générée dans [cli-operations.generated.md](cli-operations.generated.md). Les schémas et exemples exacts restent ceux du live OpenAPI vérifié.

- HTTP_400 : corriger le JSON ou les paramètres à partir d’OpenAPI.
- HTTP_401 : clé incorrecte ou révoquée ; reconnecter avec une clé valide.
- HTTP_403 : droits insuffisants ; demander uniquement les permissions nécessaires.

- HTTP_404 : vérifier le chemin et l’identifiant dans cet espace.
- HTTP_409 : conflit ; comparer l’état et la requête initiale avant de rejouer.
- HTTP_413 : découper le volume transmis.
- HTTP_429 ou HTTP_5xx : attendre puis réessayer avec un backoff borné. Le CLI ne restitue pas Retry-After ; un client HTTP direct doit le respecter lorsqu’il est fourni.
- CONTRACT_MISMATCH : arrêter et vérifier les versions de la plateforme et du CLI.
- WORKSPACE_MISMATCH : ne pas écrire ; vérifier le profil et la clé.
- ENV_URL_AND_KEY_REQUIRED_TOGETHER : fournir les deux variables ou aucune.
- INSECURE_CONFIG_PERMISSIONS : restreindre profiles.json à 0600.
- NETWORK_ERROR_OR_REDIRECT : vérifier le réseau et l’URL HTTPS, ne pas contourner TLS.
- COMMAND_FAILED_CHECK_INPUT : vérifier les arguments, l’accès au fichier et la syntaxe JSON.

### Exemples documents génériques

Après émission d'une clé avec `read` pour lire et la portée dédiée `documents` pour écrire, les appels restent de simples requêtes HTTP authentifiées :

```sh
curl -H "Authorization: Bearer $OUTREACH_API_KEY" \
  "$OUTREACH_API_URL/api/v1/documents?kind=icp&limit=20"

curl -X PUT -H "Authorization: Bearer $OUTREACH_API_KEY" -H "Content-Type: application/json" \
  "$OUTREACH_API_URL/api/v1/documents/new" \
  --data '{"schemaVersion":"1.0","correlationId":"docs-demo","idempotencyKey":"docs-create-1","kind":"icp","title":"PME rénovation","body":"## Cible prioritaire\n\n**PME** de la rénovation.","icpIds":[],"variants":[],"expectedRevision":0}'
```

Conserver le `publicId` retourné et renvoyer la dernière `revision` comme `expectedRevision`. En cas de `409`, relire avant toute nouvelle écriture. Le CLI/agent peut créer, modifier, soumettre et commenter ; il ne peut pas approuver.

En cas de timeout après une écriture, son résultat est incertain : rejouer exactement le même corps avec la même idempotencyKey, jamais avec une nouvelle clé. L’agent conserve ses checkpoints après chaque page confirmée.

Voir aussi le guide d’utilisation et la référence API accessibles depuis Documentation dans chaque espace.
