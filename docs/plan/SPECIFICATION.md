# Spécification du Projet PDF Viewer

## Vue d'ensemble du projet

Le projet "PDF Viewer" est un visualiseur de PDF local intégré avec un système de gestion de bookmarks. Développé avec Electron, il offre une compatibilité multiplateforme (Linux et Windows). Le frontend utilise React pour une interface utilisateur moderne, tandis que PDF.js gère le rendu des documents PDF. L'application adopte un thème sombre par défaut pour une expérience utilisateur confortable. Les données sont persistées dans un fichier JSON unique situé dans `~/.config/pdf-viewer/config.json`.

## Objectifs et périmètre MVP

### Objectifs
- Fournir un outil léger et performant pour la visualisation de PDFs locaux.
- Faciliter la navigation dans les PDFs via un système de bookmarks avec prévisualisations.
- Assurer une persistance fiable des données utilisateur sans base de données externe.

### Périmètre MVP
- Écran d'accueil listant les PDFs récemment ouverts avec possibilité de suppression.
- Visualisation d'un seul PDF à la fois avec navigation page par page (boutons précédent/suivant, input de numéro de page).
- Gestion des bookmarks : création sur page courante, affichage avec miniature, titre éditable, réorganisation par drag & drop, suppression.
- Pop-up de preview pour aperçu rapide sans perdre la navigation.
- Persistance automatique des bookmarks et historique.
- Optimisation pour PDFs volumineux (100+ pages) avec génération asynchrone des miniatures et cache intelligent.

## User stories détaillées

- **US1** : En tant qu'utilisateur, je veux accéder à un écran d'accueil affichant la liste des PDFs récemment ouverts, afin de reprendre rapidement une session précédente.
- **US2** : En tant qu'utilisateur, je veux pouvoir ouvrir un nouveau PDF depuis l'écran d'accueil, afin d'explorer de nouveaux documents.
- **US3** : En tant qu'utilisateur, je veux naviguer dans un PDF ouvert avec des contrôles intuitifs (boutons précédent/suivant, affichage "Page X/Y", input pour sauter à une page), afin de me déplacer efficacement.
- **US4** : En tant qu'utilisateur, je veux pouvoir bookmarker la page courante avec un titre auto-généré ("Page X") et éditable immédiatement, afin de marquer des points d'intérêt.
- **US5** : En tant qu'utilisateur, je veux voir une liste des bookmarks en bas de l'écran avec miniatures, titres, et boutons pour preview ou navigation, afin de gérer mes marques-pages.
- **US6** : En tant qu'utilisateur, je veux pouvoir réorganiser les bookmarks par drag & drop et les supprimer, afin de personnaliser mon organisation.
- **US7** : En tant qu'utilisateur, je veux que mes bookmarks soient sauvegardés automatiquement et récupérés à la réouverture du PDF, afin de ne pas perdre mon travail.
- **US8** : En tant qu'utilisateur, je veux basculer entre mode "Bookmarks" et mode "Recherche" dans la sidebar, afin de changer de fonctionnalité.
- **US9** : En tant qu'utilisateur, je veux saisir un terme de recherche et lancer la recherche, afin de trouver du texte dans le PDF.
- **US10** : En tant qu'utilisateur, je veux voir les résultats de recherche avec contexte de 5 mots avant/après, afin de comprendre les occurrences.
- **US11** : En tant qu'utilisateur, je veux cliquer sur un résultat pour naviguer vers la page et voir le surlignage, afin de localiser rapidement.
- **US12** : En tant qu'utilisateur, je veux que la recherche soit insensible à la casse avec correspondances partielles, limitée à 100 résultats, sans historique.

## Fonctionnalité de Recherche

### Description

Ajout d'une fonctionnalité de recherche textuelle dans les PDFs ouverts. Permet de rechercher du texte insensible à la casse avec correspondances partielles. Affiche jusqu'à 100 résultats avec contexte de 5 mots avant et après le match. Surligne les occurrences dans le PDF (obligatoire). Basculement exclusif entre mode "Bookmarks" et "Recherche" via un bouton dans la sidebar. Recherche déclenchée au submit (Enter ou bouton), avec indicateur de progression. Pas d'historique des recherches.

### Flux fonctionnels

#### Recherche simple
1. Utilisateur bascule en mode "Recherche" via le bouton toggle dans la sidebar.
2. Saisie du terme de recherche dans le formulaire.
3. Submit de la recherche (Enter ou clic bouton).
4. Extraction asynchrone du texte de toutes les pages via PDF.js.
5. Recherche des correspondances partielles, insensible casse.
6. Affichage des résultats (jusqu'à 100) avec contexte, triés par page.
7. Indicateur de progression pendant la recherche.

#### Navigation vers résultat
1. Clic sur un résultat dans la liste.
2. Navigation automatique vers la page correspondante.
3. Surlignage du match dans le PDF via TextLayer.

#### Retour aux bookmarks
1. Basculement en mode "Bookmarks" via le toggle.
2. Effacement des surlignages de recherche.
3. Affichage de la liste des bookmarks.

### Référence aux règles métier

Voir R7 à R11 dans `docs/plan/REGLES_METIER.md`.

## Architecture technique (Electron + React + PDF.js)

- **Framework principal** : Electron pour l'application desktop multiplateforme.
- **Processus Main** : Gestion des opérations système (fichiers, persistance, cache).
- **Processus Renderer** : Interface utilisateur en React, rendu PDF via PDF.js.
- **Persistance** : Fichier JSON unique pour configuration et données.
- **Cache** : Miniatures stockées sur disque pour performance.

## Structure des modules et responsabilités

- **PDFManager** : Chargement, rendu et navigation dans les PDFs via PDF.js.
- **BookmarkService** : Gestion CRUD des bookmarks (création, mise à jour, suppression, réorganisation).
- **ThumbnailGenerator** : Génération asynchrone des miniatures de pages (150x200px, compression JPEG).
- **PersistenceService** : Lecture/écriture du fichier JSON, gestion des erreurs de corruption.

## Format de données (JSON config, structure bookmark)

Le fichier `~/.config/pdf-viewer/config.json` suit cette structure :

```json
{
  "version": "1.0",
  "recentPdfs": [
    "/path/to/file1.pdf",
    "/path/to/file2.pdf"
  ],
  "bookmarks": {
    "/path/to/file.pdf": {
      "hash": "md5_hash_of_pdf",
      "lastOpened": "2023-10-01T12:00:00Z",
      "bookmarks": [
        {
          "id": "unique_id",
          "page": 5,
          "title": "Chapitre 1",
          "thumbnailPath": "~/.config/pdf-viewer/thumbnails/file_hash_page5.jpg",
          "createdAt": "2023-10-01T12:05:00Z"
        }
      ]
    }
  }
}
```

- `hash` : MD5 du PDF pour détecter les modifications externes.
- `thumbnailPath` : Chemin absolu vers la miniature cachée.

## Règles métier et invariants

Voir le document dédié `docs/plan/REGLES_METIER.md` pour les détails (R1-R6, INV-01 à INV-06).

## Flux fonctionnels

### Ouverture d'un PDF
1. Depuis l'écran d'accueil, sélectionner un PDF récent ou ouvrir un nouveau.
2. Vérifier l'existence du fichier et calculer le hash.
3. Charger le PDF avec PDF.js.
4. Récupérer les bookmarks associés depuis le JSON.
5. Afficher la première page.

### Création d'un bookmark
1. Sur la page courante, cliquer le bouton "Bookmark".
2. Générer une miniature asynchrone.
3. Ajouter à la liste avec titre "Page X" (éditable).
4. Sauvegarder automatiquement dans le JSON.

### Navigation via bookmark
1. Clic sur le bouton "Naviguer" d'un bookmark.
2. Aller à la page correspondante dans la vue principale.

### Preview d'un bookmark
1. Clic sur le bouton "Preview".
2. Afficher un pop-up avec la miniature agrandie et titre.

## Contraintes de performance et sécurité

- **Performance** : Chargement initial du PDF < 2 secondes ; rendu d'une page < 300 ms ; génération miniature < 500 ms.
- **Sécurité** : Validation des chemins de fichiers ; sandboxing Electron ; pas d'exécution de code externe.

## Risques identifiés et mitigations

Voir le document dédié `docs/plan/RISQUES.md` pour l'analyse complète.

## Estimation : 14 jours de développement

Répartition estimée :
- Jour 1-2 : Setup projet Electron + React + PDF.js.
- Jour 3-4 : Écran d'accueil et ouverture PDF.
- Jour 5-6 : Navigation et visualisation.
- Jour 7-8 : Gestion bookmarks (CRUD, miniatures).
- Jour 9 : Persistance et cache.
- Jour 10-13 : Fonctionnalité de recherche (SearchService, SearchPanel, intégration).
- Jour 14 : Tests, optimisation, packaging.