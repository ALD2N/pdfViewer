# Spécification Fonctionnalité de Recherche

## Contexte

Le projet "PDF Viewer" nécessite l'ajout d'une fonctionnalité de recherche de texte dans les PDFs pour améliorer la navigation et l'utilisabilité. Cette fonctionnalité est prévue en Phase 2 du développement, avec une estimation de 4 jours. Elle s'intègre dans l'architecture existante Electron + React + PDF.js, en ajoutant des composants UI et services logiques sans modifier le code source existant au-delà de l'intégration.

## Besoins Utilisateur Validés

- Bouton de basculement dans la barre latérale pour alterner entre mode "Bookmarks" et mode "Recherche" (modes exclusifs).
- Recherche insensible à la casse avec correspondances partielles.
- Surlignage des résultats dans le PDF (requis strict).
- Affichage des résultats : contexte de 5 mots avant/après, limite de 100 occurrences, texte seulement.
- Clic sur un résultat pour naviguer vers la page.
- Recherche déclenchée au submit (Enter ou bouton), avec indicateur de progression.
- Pas d'historique des recherches.

## Règles Métier

- **R7** : Les résultats de recherche sont validés pour exactitude (match insensible à la casse, correspondances partielles).
- **R8** : Clic sur un résultat de recherche navigue vers la page et surligne le match.
- **R9** : Le bouton toggle dans la sidebar alterne exclusivement entre les modes "Bookmarks" et "Recherche".
- **R10** : La recherche est performante (< 3 secondes pour 100 pages, < 10 secondes pour 500 pages), limitée à 100 résultats affichés.
- **R11** : Pas d'historique des recherches précédentes (chaque recherche est indépendante).

## Invariants Métier

- **INV-07** : La sidebar affiche exclusivement soit la liste des bookmarks, soit l'interface de recherche (modes exclusifs).
- **INV-08** : La navigation via un résultat de recherche maintient l'intégrité de la page courante et du PDF ouvert.
- **INV-09** : La fonctionnalité de recherche ne modifie pas le contenu du PDF (lecture seule).
- **INV-10** : Le TextLayer de PDF.js est synchronisé pour permettre le surlignage précis des résultats de recherche.

## Cas Limites Identifiés

- Recherche vide : Pas de recherche, message "Terme requis".
- Aucun résultat : Afficher "Aucun résultat trouvé".
- PDF sans texte : Message "PDF sans contenu textuel extractible".
- Caractères spéciaux : Recherche supporte Unicode et scripts non-latins par défaut via PDF.js.
- Basculement rapide : Annuler recherche en cours si toggle, effacer surlignages.

## Architecture

### Modules Ajoutés

- **SearchPanel.js** : Composant React pour l'interface utilisateur. Gère le formulaire (input + bouton), indicateur de progression, liste des résultats. Reçoit les résultats du SearchService et gère les clics pour navigation.
- **SearchService.js** : Service logique pour la recherche. Utilise PDF.js pour extraire le texte des pages, effectue la recherche, formate les résultats en SearchResult. Gère le surlignage via TextLayer.

### Modifications dans PdfViewer.js

- Ajout du bouton toggle pour basculer modes sidebar.
- Gestion de l'affichage exclusif (Bookmarks ou Recherche).
- Intégration de la navigation et du surlignage lors de clic sur résultat de recherche.
- Effacement des surlignages lors de retour en mode Bookmarks.

### Format des Données

SearchResult : { pageNum: number, textIndex: number, match: string, contextBefore: string, contextAfter: string, fullContext: string }

- pageNum : Numéro de page (1-based).
- textIndex : Position du match dans le texte de la page.
- match : Le terme trouvé.
- contextBefore : 5 mots avant le match.
- contextAfter : 5 mots après le match (mots coupés comptent comme un seul mot, ponctuation ne compte pas).
- fullContext : Contexte complet pour affichage.

## Flux d'Interaction Détaillé

1. **Input** : Utilisateur saisit terme dans SearchPanel, submit.
2. **SearchService** : Extraction texte via getPage().getTextContent() pour chaque page.
3. **Recherche** : Recherche partielle, insensible casse, collecte jusqu'à 100 résultats.
4. **Résultats** : Formatage en SearchResult, envoi à SearchPanel pour affichage.
5. **Navigation** : Clic résultat → PdfViewer navigue à page, SearchService surligne via TextLayer.
6. **Surlignage** : Manipulation du TextLayer pour ajouter classe CSS .search-highlight.

## API PDF.js Utilisée

- **getPage(pageNum)** : Obtenir l'objet page pour extraction.
- **getTextContent()** : Extraire le texte structuré de la page.
- **TextLayer** : Manipulation pour surlignage (ajout de spans avec classe).

## Contraintes de Performance

- < 3 secondes pour recherche sur 100 pages.
- < 10 secondes pour 500 pages.
- Limite de 100 résultats pour éviter surcharge UI.
- Indicateur de progression pour feedback utilisateur.

## Risques Identifiés

- Texte mal extrait : PDFs scannés ou avec OCR peuvent avoir du texte inexact.
- Performance sur vieux PC : Extraction texte peut être lente sur gros PDFs.
- Limite de 100 frustante : Utilisateur peut manquer des occurrences, mais nécessaire pour performance.

## Questions Résolues

- Surlignage : REQUIS strict (seulement le match).
- Définition "5 mots" : Les mots coupés comptent comme un seul mot, la ponctuation ne compte pas.
- Groupement par page : Un résultat par occurrence, la limite de 100 s'applique aux occurrences (pas de groupement par page).
- Effacement surlignages : Oui, effacer les surlignages en basculant vers Bookmarks.
- Scripts non-latins : Suivre la recommandation (PDF.js gère déjà l'extraction multilingue, donc supporté par défaut).