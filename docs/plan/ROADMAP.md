# Roadmap et Planning

## MVP (version 1.0) - Fonctionnalités de base

- Écran d'accueil avec liste PDFs récents et ouverture.
- Visualisation PDF avec navigation page par page.
- Gestion bookmarks : création, affichage miniatures, édition titre, navigation, suppression.
- Persistance JSON automatique.
- Optimisation performance pour gros PDFs.
- Thème sombre, responsive basique.

## Phase 2 (version 1.1) - Évolutions mineures

- Recherche textuelle dans le PDF (4 jours : implémentation SearchService.js pour logique extraction/recherche, SearchPanel.js pour UI, intégration dans PdfViewer.js pour toggle/surlignage/navigation, tests et optimisation performance).
- Export des bookmarks en JSON/CSV.
- Améliorations UX : raccourcis clavier (Ctrl+B pour bookmark).
- Support thèmes clair/sombre switchable.

## Phase 3 (version 2.0) - Fonctionnalités avancées

- Onglets multi-PDF.
- Annotations sur PDF (notes, surlignage).
- Synchronisation cloud des bookmarks.
- Mode présentation (plein écran, navigation auto).

## Estimation de charge (14 jours total)

- **Total** : 14 jours développeur (1 personne).
- **MVP** : 7 jours (50% effort).
- **Phase 2** : 5 jours (recherche 4j + autres 1j).
- **Phase 3** : 2 jours.
- Répartition par tâche : Voir SPECIFICATION.md.

## Jalons et livrables

- **Jalon 1 (Fin jour 2)** : Setup projet, écran d'accueil fonctionnel.
- **Jalon 2 (Fin jour 4)** : Visualisation PDF et navigation.
- **Jalon 3 (Fin jour 7)** : Bookmarks complets, persistance.
- **Jalon 4 (Fin jour 10)** : Tests, optimisations, release MVP.
- Livrables : Code source, binaires (.deb/.exe), docs utilisateur.