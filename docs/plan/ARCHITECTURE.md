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

## Module de Recherche

Le surlignage des résultats de recherche est un requis obligatoire.

- **SearchPanel.js** : Nouveau composant React pour l'interface utilisateur de recherche. Gère le formulaire de saisie, le bouton submit, l'indicateur de progression, et la liste des résultats de recherche. Intègre avec PdfViewer.js pour le toggle de mode.
- **SearchService.js** : Nouveau service logique pour la recherche. Responsable de l'extraction du texte des pages via PDF.js, de l'exécution de la recherche (insensible casse, partielle), du formatage des résultats, et de la gestion des surlignages dans le TextLayer.
- **Intégration dans PdfViewer.js** : Modifications pour ajouter le bouton toggle sidebar (Bookmarks/Recherche), gérer l'affichage exclusif des modes, intégrer la navigation et le surlignage lors de clic sur résultat. La fonction toggleSidebarMode() inclut la logique pour effacer les surlignages lors du basculement vers Bookmarks.

Format des données SearchResult : Objet { pageNum: number, textIndex: number, match: string, contextBefore: string, contextAfter: string, fullContext: string } où fullContext est le contexte complet avec match en évidence.

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

## Gestion des dossiers

### Description
Extension de l'architecture pour supporter les dossiers virtuels hiérarchiques. Ajout de FolderService dans main process, refactor de HomeScreen en 3 colonnes, nouveaux composants React pour l'UI.

### FolderService (main)
- **Méthodes** : createFolder(name, parentId), updateFolder(id, updates), deleteFolder(id), assignPdfToFolder(folderId, pdfPath), unassignPdfFromFolder(folderId, pdfPath), loadFolders(), saveFolders().
- **Responsabilités** : Gestion CRUD dossiers, validation (pas de cycles, noms uniques), persistance via extension PersistenceService.

### Refactor HomeScreen
- Passage de liste simple à layout 3 colonnes (flexbox).
- Intégration FolderTree, OrphanPdfList, RecentPdfList.
- Gestion drag & drop via react-dnd ou native HTML5.

### Composants React
- **FolderTree.js** : Arbre récursif avec expansion/collapse, menu contextuel, drop zones.
- **OrphanPdfList.js** : Liste PDFs non assignés, draggable.
- **RecentPdfList.js** : Liste PDFs récents, draggable.

### Schéma JSON v1.1 avec migration
Migration depuis v1.0 : Ajouter `"version": "1.1"` et `"folders": {}` vide. Pas de migration automatique des données existantes (folders vides au départ).

Structure détaillée dans `docs/plan/SPECIFICATION.md`.

### Diagramme IPC (8 channels)
```
Renderer -> Main:
- FOLDER_CREATE: { name, parentId } -> { id, ... }
- FOLDER_UPDATE: { id, updates } -> success/error
- FOLDER_DELETE: { id } -> success/error
- FOLDER_ASSIGN_PDF: { folderId, pdfPath } -> success/error
- FOLDER_UNASSIGN_PDF: { folderId, pdfPath } -> success/error
- FOLDER_LOAD: {} -> { folders }
- FOLDER_MOVE: { id, newParentId } -> success/error
- FOLDER_RENAME: { id, newName } -> success/error
```

### Flux de données
#### Chargement initial
1. Renderer HomeScreen mount -> IPC FOLDER_LOAD.
2. Main loadFolders() depuis JSON -> return folders.
3. Renderer build FolderTree, OrphanPdfList (PDFs not in any folder.pdfPaths), RecentPdfList.

#### CRUD dossier
1. User action (e.g., create) -> IPC FOLDER_CREATE.
2. Main createFolder() -> update folders object -> saveConfig().
3. IPC reply success -> Renderer update state, refresh UI.

#### Drag-drop assignation
1. Drop event -> IPC FOLDER_ASSIGN_PDF.
2. Main assignPdfToFolder() -> add to pdfPaths if not present -> save.
3. Reply success -> Renderer move PDF from orphan/recent to assigned (update lists).