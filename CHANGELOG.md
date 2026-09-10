# Changelog

## 1.1.1 (2026-09-10)

- Contrat de présentation des documents : Markdown pour toutes les catégories, emails structurés sans duplication, rendu unifié dans la plateforme.
- Exemple stratégie ajouté. Aucun changement des clés, profils ou permissions.

## 1.1.0 (2026-09-09)

- Lanceur avec mises à jour automatiques des releases stables compatibles, contrôle toutes les six heures après les commandes.
- Installation isolée, vérification du paquet et démarrage avant activation atomique ; pas de modification des profils ou clés.
- Verrou anti-concurrence, suspension par `OUTREACH_AUTO_UPDATE=0`, version fixée par `OUTREACH_CLI_VERSION`.
- Guide d’exploitation et de récupération. Une installation initiale de cette version est nécessaire sur les VPS.

## 1.0.2 (2026-09-09)

- Documentation des documents Markdown : ICP/Persona, stratégies et séquences à variantes.
- Exemples JSON installables pour créer un ICP et une séquence via `outreach api`.
- Précisions sur les portées, révisions, soumission et idempotence.
- Version du CLI annoncée dans le handshake : 1.0.2.

Aucune migration des profils ou des clés. Aucun nouvel accès accordé automatiquement. Distribution publique par tag GitHub, sans publication sur le registre npm.
