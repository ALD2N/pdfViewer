# Analyse des Risques

## Risques critiques (RC1-RC2)

- **RC1 : Perte de données bookmarks** (Impact élevé, Probabilité moyenne)
  - Cause : Crash app, corruption JSON.
  - Mitigation : Sauvegarde backup automatique, validation JSON à la lecture.

- **RC2 : Performance dégradée sur gros PDFs** (Impact élevé, Probabilité moyenne)
  - Cause : Rendu lent, génération miniatures bloquante.
  - Mitigation : Asynchrone, cache, optimisation PDF.js.

## Risques élevés (RE1-RE2)

- **RE1 : Chemins de fichiers obsolètes** (Impact moyen, Probabilité élevée)
  - Cause : PDFs déplacés/supprimés.
  - Mitigation : Validation à l'ouverture, nettoyage automatique de l'historique.

- **RE2 : Corruption du fichier JSON** (Impact moyen, Probabilité moyenne)
  - Cause : Écriture interrompue.
  - Mitigation : Écriture atomique, try/catch, reset à défaut.

## Risques moyens (RM1-RM2)

- **RM1 : Interface non responsive** (Impact moyen, Probabilité faible)
  - Cause : Tailles fenêtre variables.
  - Mitigation : Tests sur différentes résolutions, CSS flexible.

- **RM2 : Vulnérabilités sécurité** (Impact moyen, Probabilité faible)
  - Cause : Exposition fichiers locaux.
  - Mitigation : Sandboxing Electron, validation inputs.

## Risques faibles (RF1-RF2)

- **RF1 : Incompatibilité plateformes** (Impact faible, Probabilité faible)
  - Cause : Différences Linux/Windows.
  - Mitigation : Tests sur les deux OS, electron-builder.

- **RF2 : UX confuse** (Impact faible, Probabilité moyenne)
  - Cause : Interactions non intuitives.
  - Mitigation : Tests utilisateurs, itérations UI.

## Matrice impact/probabilité

| Risque | Impact | Probabilité | Niveau |
|--------|--------|-------------|--------|
| RC1    | Élevé  | Moyenne     | Critique |
| RC2    | Élevé  | Moyenne     | Critique |
| RE1    | Moyen  | Élevée      | Élevé   |
| RE2    | Moyen  | Moyenne     | Élevé   |
| RM1    | Moyen  | Faible      | Moyen   |
| RM2    | Moyen  | Faible      | Moyen   |
| RF1    | Faible | Faible      | Faible  |
| RF2    | Faible | Moyenne     | Faible  |

## Plans de mitigation

- **Général** : Revue de code, tests unitaires/intégration.
- **Monitoring** : Logs pour erreurs, métriques performance.
- **Contingence** : Version de rollback, backups manuels.