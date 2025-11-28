# Architecture Technique

## Diagramme d'architecture Electron (main/renderer)

```
+-------------------+       IPC       +-------------------+
|   Main Process    | <-------------> |  Renderer Process |
|                   |                 |                   |
| - Gestion fichiers|                 | - UI React        |
| - Persistance     |                 | - Rendu PDF       |
| - Cache           |                 | - Gestion events  |
| - Sécurité        |                 |                   |
+-------------------+                 +-------------------+
         |                                     |
         v                                     v
+-------------------+                 +-------------------+
|   Persistence     |                 |   PDFManager      |
|   Service         |                 |                   |
+-------------------+                 +-------------------+
         |                                     |
         v                                     v
+-------------------+                 +-------------------+
|   JSON Config     |                 |   PDF.js          |
|   (~/.config/...)  |                 |   Library         |
+-------------------+                 +-------------------+
```

## Modules et interfaces

- **PDFManager** : Interface pour chargement et rendu PDF.
  - Méthodes : loadPdf(path), renderPage(pageNum), getPageCount().
- **BookmarkService** : Gestion des bookmarks.
  - Méthodes : addBookmark(page, title), updateBookmark(id, title), deleteBookmark(id), reorderBookmarks(order).
- **ThumbnailGenerator** : Génération miniatures.
  - Méthodes : generateThumbnail(pdf, pageNum) -> Promise<string> (path).
- **PersistenceService** : Accès données.
  - Méthodes : loadConfig(), saveConfig(data), validateHash(path, hash).

## Dépendances

- `electron` : Framework desktop.
- `react` : Bibliothèque UI.
- `pdfjs-dist` : Rendu PDF.
- `electron-builder` : Packaging.
- Autres : `uuid` pour IDs, `fs-extra` pour fichiers.

## Structure du projet (dossiers, fichiers)

```
/home/ald2n/Kod/pdfViewer/
├── src/
│   ├── main/
│   │   ├── main.js (entry point Electron)
│   │   ├── persistence.js
│   │   └── thumbnail.js
│   ├── renderer/
│   │   ├── index.html
│   │   ├── App.js (React root)
│   │   ├── components/
│   │   │   ├── HomeScreen.js
│   │   │   ├── PdfViewer.js
│   │   │   └── BookmarkList.js
│   │   └── styles.css
│   └── shared/
│       └── constants.js
├── docs/
│   └── plan/
├── package.json
├── electron-builder.json
└── README.md
```

## Patterns utilisés

- **Hexagonal Architecture** : Séparation logique (core) et infrastructure (persistence, UI).
- **Observer Pattern** : Notifications entre modules pour mises à jour UI.
- **Repository Pattern** : Abstraction de la persistance (PersistenceService).

## Gestion du cache miniatures

- Dossier : `~/.config/pdf-viewer/thumbnails/`
- Format : `{pdf_hash}_page{num}.jpg` (150x200px, qualité 80%).
- Génération : Asynchrone, avec cache vérification (si existe, pas regénérer).
- Nettoyage : Pas automatique, manuel si espace disque.

## Format de persistance JSON détaillé

Voir `docs/plan/SPECIFICATION.md` pour la structure complète.

- Versioning : Champ "version" pour migrations futures.
- Hash : MD5 du fichier PDF pour invalider bookmarks si PDF modifié.
- Timestamps : `createdAt` pour ordre chronologique.

## CI/CD et packaging

- **Build** : `electron-builder` pour créer installateurs (.deb, .exe).
- **CI** : GitHub Actions pour tests automatisés (Jest pour React, tests manuels pour Electron).
- **Distribution** : Releases GitHub avec assets binaires.