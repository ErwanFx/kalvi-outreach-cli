# Outreach CLI

CLI autonome pour connecter un agent à un espace Outreach. Ce dépôt ne contient ni backend, ni interface, ni données client.

Le CLI 1.1.0 appelle l’API HTTP v1. Il ne se connecte ni à Convex en administrateur, ni aux outils fournisseurs. Node.js 22 ou supérieur est requis. Aucun paquet tiers n’est nécessaire.

## Installation et mise à jour

Depuis n’importe quel VPS avec Node.js 22+ et npm, sans compte GitHub ni accès au dépôt privé :

```bash
npm install -g https://github.com/ErwanFx/kalvi-outreach-cli/archive/refs/tags/v1.1.0.tar.gz
outreach --help
```

Le dépôt public est https://github.com/ErwanFx/kalvi-outreach-cli. Pour une mise à jour, choisir un nouveau tag publié et relancer l’installation. Le paquet n’est pas publié sur le registre npm : npm télécharge l’archive GitHub. Le code de la plateforme et son historique restent privés. Une clé API de l’espace reste nécessaire pour accéder aux données.

## Mise à jour automatique

Les versions 1.0.x ne disposent pas de ce mécanisme. Installer manuellement le tag 1.1.0 une seule fois sur chaque VPS pour l’activer.

À partir de 1.1.0, chaque utilisation lance une maintenance silencieuse **après la commande métier**. Le contrôle GitHub est limité à une fois toutes les six heures, y compris après un échec. Aucun cron n’est ajouté. La commande suivante utilise la version installée si sa préparation est terminée.

Seules les releases stables du dépôt officiel `ErwanFx/kalvi-outreach-cli`, plus récentes et du même numéro majeur, sont admissibles. Une version 2.x nécessite une migration manuelle. Le canal consulté est la dernière release GitHub : si elle appartient à un autre numéro majeur, aucune mise à jour automatique n’est appliquée.

Le paquet est installé sans scripts npm dans un dossier séparé, avec vérification de la compatibilité Node, de son nom, de sa version et du démarrage `--help`. Le pointeur actif est remplacé atomiquement seulement après succès. Ce contrôle de démarrage ne garantit pas l’absence de toute régression métier. Le dépôt GitHub officiel reste une source de code de confiance ; ce mécanisme n’ajoute pas de signature indépendante.

- Les profils et clés restent dans leur emplacement habituel et ne sont pas transmis à la maintenance.
- Les mises à jour sont propres à l’utilisateur système, dans `~/.cache/kalvi-outreach/updates`, sans `sudo` et sans modifier l’installation globale.
- Les commandes conservent leurs sorties et codes de retour. Une panne réseau ou d’installation n’empêche pas leur exécution.
- Les anciennes versions sont conservées. `npm list -g` indique la version du lanceur global ; `outreach --help` indique celle réellement exécutée.

```bash
# Suspendre les téléchargements automatiques (garde la version active).
export OUTREACH_AUTO_UPDATE=0

# Fixer une version déjà installée, par exemple le lanceur 1.1.0.
export OUTREACH_CLI_VERSION=1.1.0

# Revenir aux mises à jour automatiques.
unset OUTREACH_CLI_VERSION OUTREACH_AUTO_UPDATE
```

Une version fixée mais absente renvoie `PINNED_VERSION_NOT_INSTALLED`, sans télécharger de code ni exécuter une autre version silencieusement. Pour rendre ces choix persistants, définir les variables dans l’environnement du service de l’agent.

Le fichier `~/.cache/kalvi-outreach/updates/check.json` indique le dernier contrôle (`updated`, `current-or-incompatible`, `failed-kept-current`). Un verrou empêche les installations concurrentes. Après une interruption brutale du processus, un verrou peut rester : vérifier qu’aucun processus `update.mjs` n’est actif avant de retirer le répertoire vide `lock` avec `rmdir`. Les dossiers `stage-*` d’une installation échouée peuvent être supprimés manuellement après le même contrôle. Ne pas supprimer une version utilisée par une commande en cours.

## Documents Markdown

Les documents passent par la commande générique `outreach api`. La clé doit avoir `read` pour les lectures et `documents` pour les écritures. Les anciennes clés ne gagnent pas automatiquement cette portée.

```bash
outreach api GET /api/v1/documents --query 'kind=icp&limit=20' --profile client
outreach api PUT /api/v1/documents/new --file examples/document-icp.json --profile client
outreach api PUT /api/v1/documents/new --file examples/document-sequence.json --profile client
outreach api GET /api/v1/documents/DOCUMENT_ID --profile client
outreach api GET /api/v1/documents/DOCUMENT_ID/versions --profile client
```

Ces exemples sont fictifs. Téléchargez-les depuis le dossier [examples](./examples) et adaptez-les avant envoi. Remplacez `DOCUMENT_ID` par le `publicId` retourné par l’API. Les listes utilisent un curseur ; transmettez le curseur retourné pour obtenir la suite.

`--file` attend toujours du **JSON**, pas un fichier `.md` brut. Placez le texte Markdown dans `body` et, pour les séquences, dans `variants[].steps[].body`. Les objets des e-mails (`subject`) restent du texte simple. HTML brut et images externes ne sont pas rendus dans la plateforme.

- ICP et Persona sont une seule catégorie : créez avec `kind: "icp"`. Conservez `persona` lors d’une modification d’un ancien document de ce type.
- `strategy` utilise aussi un corps Markdown, avec `variants: []`.
- Une séquence contient 1 à 6 variantes, chacune avec 1 à 5 étapes. `icpIds` peut relier plusieurs ICP du même espace ; aucun parent n’est obligatoire.
- `expectedRevision: 0` crée un document. Pour modifier, utilisez son identifiant et sa révision actuelle. Chaque sauvegarde crée une nouvelle révision brouillon ; un conflit de révision retourne HTTP 409.
- Chaque nouvelle opération reçoit sa propre `idempotencyKey` et un `correlationId`. Pour rejouer la même opération après une interruption, conservez exactement sa clé et son corps.

Pour soumettre un document, envoyez `POST /api/v1/documents/DOCUMENT_ID/submit` avec un fichier JSON contenant `expectedRevision`, `schemaVersion: "1.0"`, `correlationId` et `idempotencyKey`. L’agent peut soumettre, mais pas approuver à la place du client. Le contrat complet de l’instance, incluant commentaires et limites, est disponible via `outreach docs --profile client`.

## Connexion et profils

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
```

upsert appelle PUT /api/v1/prospects/{externalId}. Le fichier doit contenir le corps complet attendu par ce contrat, y compris l’enveloppe d’idempotence. events send appelle POST /api/v1/events. docs retourne la spécification OpenAPI complète et ses exemples.

## Accéder à tous les endpoints

```bash
outreach api GET /api/v1/campaigns --profile client
outreach api GET /api/v1/prospects --query 'limit=25&cursor=CURSEUR_RETOURNE' --profile client
outreach api PATCH /api/v1/prospects/prospect-123 --file modification.json --profile client
outreach api POST /api/v1/batches --file liste.json --profile client
```

api accepte une méthode GET, POST, PUT, PATCH ou DELETE et un chemin commençant par /api/v1/. Seules les opérations réellement présentes dans OpenAPI sont disponibles ; DELETE n’est pas un archivage générique. L’archivage v1 utilise POST sur les endpoints /archive. Une URL absolue, une traversée de chemin ou une redirection est refusée.

--file lit un fichier JSON UTF-8. Il est obligatoire pour POST, PUT et PATCH et interdit pour GET. Utilisez un fichier contenant {} si le contrat attend un corps vide. --query ajoute les paramètres URL ; les dates, filtres et limites doivent respecter le schéma de chaque endpoint. Les listes retournent une page : réutilisez continueCursor jusqu’à isDone, sans inventer un curseur.

## Automatisation sans session interactive

Configurez les secrets dans l’environnement privé du processus Hermès : OUTREACH_API_URL et OUTREACH_API_KEY doivent être fournis ensemble. OUTREACH_WORKSPACE_ID est recommandé pour verrouiller l’espace attendu. Aucun secret n’est nécessaire dans la ligne de commande ou dans la définition du cron.

```bash
outreach whoami
outreach sync status
```

Quand les deux variables sont présentes, elles remplacent le profil choisi ; elles ne sont jamais combinées avec un autre profil. Pour utiliser à nouveau un profil local, retirez les deux variables de l’environnement. --url est accepté uniquement lors du login. Un login avec OUTREACH_API_KEY sauvegarde cette clé dans le profil local : pour un cron sans fichier de secret, utilisez directement les commandes avec les deux variables.

Le CLI n’installe aucun cron. L’agent programme son travail via le mécanisme natif d’Hermès, avec les accès fournisseurs séparés. Un changement de fournisseur ne nécessite pas de modifier le CLI.

## Contrat, erreurs et retries

Avant chaque commande distante, le CLI télécharge OpenAPI, effectue un handshake v1, compare son empreinte SHA-256 et vérifie l’espace mémorisé. HTTPS est obligatoire. Chaque requête a un délai maximal de 30 secondes. Les écritures ne sont jamais rejouées automatiquement.

stdout contient le résultat JSON, stderr une erreur JSON ; code de sortie 0 en cas de succès, 1 en cas d’échec. --help produit du texte. Les corps d’erreur distants ne sont pas réimprimés pour éviter de divulguer une clé reflétée par un serveur.

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

En cas de timeout après une écriture, son résultat est incertain : rejouer exactement le même corps avec la même idempotencyKey, jamais avec une nouvelle clé. L’agent conserve ses checkpoints après chaque page confirmée.

Voir aussi le guide d’utilisation et la référence API accessibles depuis Documentation dans chaque espace.
