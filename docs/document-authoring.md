# Documents : contrat de rédaction et présentation

Le même rendu est appliqué à tous les documents, qu'ils soient créés dans l'interface, par API ou par CLI. L'agent fournit le contenu, jamais du HTML, du CSS ou une mise en page spécifique au client. Les versions existantes ne sont pas réécrites.

## Toutes les catégories

- `title` : texte simple, court et descriptif.
- `body` : Markdown GFM. Paragraphes séparés par une ligne vide, titres `##`, listes, tableaux simples, citations pour les points importants.
- Recommander `## En bref` puis des sections explicites. Le lecteur génère un sommaire pour les documents ayant au moins trois titres de niveau 1 à 3.
- Ne pas mettre le titre du document une deuxième fois dans le corps. Pas de HTML, CSS, images distantes ou tableaux utilisés pour mettre une page en colonnes.
- Les titres recommandés ci-dessous sont une convention de rédaction, pas une restriction bloquant les anciens documents.

## ICP / Persona (`kind: icp`)

Un document par ICP. Sections recommandées : En bref, Entreprises ciblées, Interlocuteurs, Critères de qualification, Signaux d'intention, Scoring, Exclusions, Points à confirmer. Présenter le scoring dans un tableau Critère / Points / Preuve attendue. Ne pas inventer de critères, de preuves ou de seuils manquants.

## Stratégie (`kind: strategy`)

Sections recommandées : En bref, Objectif, Cibles, Proposition de valeur, Canaux et étapes, Mesure des résultats, Points à confirmer. Lier les ICP concernés avec `icpIds`.

## Autre (`kind: other`)

Document libre pour les comptes rendus, procédures, notes de cadrage ou toute pièce qui ne correspond pas aux autres catégories. Utiliser le même Markdown GFM, sans variante d’e-mail. Choisir un titre explicite et des sections adaptées au contenu ; ne pas forcer la structure d’un ICP ou d’une stratégie.

## Séquence (`kind: sequence`)

`body` contient uniquement le contexte et les consignes, affichés dans un bloc repliable. Ne pas y dupliquer les emails ni les variantes sous forme de tableau.

Les emails sont obligatoirement dans `variants[].steps[]`. Chaque variante a un `id` stable et un `name`. Chaque étape a un `id`, un `subject` en texte simple, un `body` Markdown et `delayDays`. Le lecteur compare automatiquement les variantes d'une même étape. Les délais sont relatifs à l'étape précédente (première étape : délai initial) ; 0, 3, 14, 7 affichent J0, J+3, J+17, J+24. Une variante absente à une étape est signalée, jamais inventée.

## API et CLI

### Variantes retenues par e-mail

Le lecteur permet à l'agence et au dirigeant de retenir une variante différente pour chaque étape (A puis C puis B, par exemple). Le choix reste distinct de la validation et n'envoie rien. Les anciennes versions sont en lecture seule ; une version validée fige ses choix. Une nouvelle révision remet les choix à zéro pour permettre une nouvelle relecture.

`GET /api/v1/documents/{publicId}` retourne `current.stepSelections` (tableau vide si aucun choix) et `current.selectionVersion`. Chaque choix contient `stepIndex` (base zéro), `variantId`, `stepId`, `selectedAt` (millisecondes Unix), `selectedBy`. Ces champs sont en lecture seule pour l'agent : ne jamais les envoyer dans le PUT.

Pour assembler la séquence retenue, trier par `stepIndex`, trouver la variante avec son `variantId`, puis vérifier que `variants[].steps[stepIndex].id` correspond à `stepId`. Le corps, l'objet et `delayDays` viennent de cette étape. Additionner les délais des mails **retenus**, pas ceux d'une seule variante. Une sélection incomplète n'autorise pas l'agent à inventer les choix manquants. Vérifier également le statut de validation et les consignes d'envoi hors plateforme.

Lecture via CLI : `outreach api GET /api/v1/documents/DOCUMENT_ID --profile client`. Le JSON retourné est identique à celui de l'API ; aucune commande spéciale ni mise à jour du CLI n'est nécessaire.

Utiliser `PUT /api/v1/documents/{publicId}` avec la portée `documents`. Conserver `schemaVersion`, `correlationId`, `idempotencyKey` et `expectedRevision`. Avant une modification, lire la dernière révision ; ne jamais écraser une révision en conflit. L'API valide les champs et le Markdown autorisé, la plateforme applique le design.

Le CLI transmet le même JSON, sans conversion en HTML. Consulter `outreach --help` et le guide CLI pour la commande d'upsert. Les exemples publics du CLI utilisent ce contrat. La création d'un document ne déclenche aucun envoi de campagne. La validation client reste une action explicite dans l'interface.
