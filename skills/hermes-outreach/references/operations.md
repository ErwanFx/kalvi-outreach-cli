# Routine Outreach

## KPI

- Prospects contactés: prospects dont le premier envoi est enregistré.
- Emails envoyés: premier email et relances distinctes.
- Taux de réponse: prospects ayant répondu / prospects contactés.
- Réponses positives: prospects avec une classification positive.
- Signaux d'intention: faits `intent.detected` distincts. `prospects concernés` déduplique les prospects.
- LinkedIn et courrier: affichés uniquement si le module est actif; ne jamais écrire un zéro fictif.

Le scoring est explicable et séparé des signaux. L'agent émet des observations sourcées; les règles de l'espace calculent le score.

## Cadence

- Incrémental: importer les nouveaux prospects et événements depuis le dernier checkpoint.
- Veille quotidienne: rechercher les intents sur l'ICP avec une petite fenêtre recouvrante, puis dédupliquer.
- Réconciliation nocturne: vérifier les identifiants via `/api/v1/events/check`, réparer les faits manquants et confirmer les totaux.
- Refresh demandé: lire `/api/v1/sync/requests/next`, réclamer, exécuter puis terminer ou signaler l'échec.

Toujours conserver les checkpoints après une écriture confirmée. Ne jamais remplacer arbitrairement un KPI par un total fournisseur.

