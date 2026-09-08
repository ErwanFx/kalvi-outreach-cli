# Outreach CLI

CLI autonome pour connecter un agent à un espace Outreach. Ce dépôt ne contient ni backend, ni interface, ni données client.

Le CLI 1.0.1 appelle l’API HTTP v1. Il ne se connecte ni à Convex en administrateur, ni aux outils fournisseurs. Node.js 22 ou supérieur est requis. Aucun paquet tiers n’est nécessaire.

## Installation et mise à jour

Depuis n’importe quel VPS avec Node.js 22+ et npm, sans compte GitHub ni accès au dépôt privé :

```bash
npm install -g https://github.com/ErwanFx/kalvi-outreach-cli/archive/refs/tags/v1.0.1.tar.gz
outreach --help
```

Le dépôt public est https://github.com/ErwanFx/kalvi-outreach-cli. Pour une mise à jour, choisir un nouveau tag publié et relancer l’installation. Le paquet n’est pas publié sur le registre npm : npm télécharge l’archive GitHub. Le code de la plateforme et son historique restent privés. Une clé API de l’espace reste nécessaire pour accéder aux données.

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

