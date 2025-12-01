# Spécifications UI/UX

## Layout écran d'accueil

- **Header** : Titre "PDF Viewer" centré, thème sombre.
- **Liste PDFs récents** : Liste verticale avec icône PDF, nom fichier, chemin tronqué, date dernière ouverture. Bouton "Supprimer" par item.
- **Bouton ouvrir** : En bas, "Ouvrir un PDF" avec dialogue système.
- **Responsive** : Min largeur 600px, centrage.

## Layout visualisation PDF

- **Barre supérieure** : Boutons Prev/Next, affichage "Page X / Y", input numéro page, bouton "Bookmark".
- **Zone centrale** : Canvas PDF.js pour rendu, scrollable si nécessaire.
- **Zone inférieure** : Liste horizontale scrollable des bookmarks (miniature 150x200, titre dessous, boutons Preview/Naviguer/Supprimer).
- **Thème sombre** : Fond #1e1e1e, texte #ffffff, accents #007acc.

## Wireframes textuels

### Écran d'accueil
```
+-----------------------------+
|        PDF Viewer           |
+-----------------------------+
| [Icon] file1.pdf            |
|       /path/...  2023-10-01 |
|       [Supprimer]           |
|                             |
| [Icon] file2.pdf            |
|       /path/...  2023-09-15 |
|       [Supprimer]           |
+-----------------------------+
|      [Ouvrir un PDF]        |
+-----------------------------+
```

### Visualisation PDF
```
+---------------------------------+
| < Prev  Page 5 / 100  Next > [Bookmark] |
+---------------------------------+
|                                 |
|         [PDF Canvas]            |
|                                 |
+---------------------------------+
| [Thumb1] [Thumb2] [Thumb3] ...  |
|  Title1   Title2   Title3       |
| [P][N][D] [P][N][D] [P][N][D]   |
+---------------------------------+
```

(P: Preview, N: Naviguer, D: Supprimer)

## Interactions

- **Drag & drop** : Réorganiser bookmarks en glissant les miniatures.
- **Édition titre** : Double-clic ou clic sur titre pour input inline.
- **Pop-up preview** : Overlay centré avec miniature agrandie (400x533), titre, bouton fermer.
- **Navigation** : Clic bouton ou Enter dans input pour changer page.
- **Confirmation suppression** : Pop-up "Confirmer suppression ?".

## Interface de Recherche

### Layout du SearchPanel

- **Formulaire** : Input texte pour le terme de recherche, bouton "Rechercher" (ou submit via Enter), indicateur de progression (spinner) pendant la recherche.
- **Liste résultats** : Liste verticale scrollable, chaque résultat affiche : numéro de page, contexte (5 mots avant + match en gras + 5 mots après). Limite à 100 résultats, message si plus.
- **Intégration sidebar** : Même zone que bookmarks, toggle bouton en haut pour basculer modes.

### Wireframe textuel du mode recherche dans la sidebar

```
+-----------------------------+
| [Toggle: Bookmarks|Recherche] |
+-----------------------------+
| Terme: [_________________]   |
|         [Rechercher]         |
|         [Spinner si loading] |
+-----------------------------+
| Résultats:                   |
| Page 5: ... mot1 mot2 <match> mot3 mot4 ...
| Page 10: ... motA <match> motB motC ...
| ... (scrollable)             |
+-----------------------------+
```

### Styles CSS pour le surlignage

```css
.search-highlight {
  background-color: #ffff00; /* Jaune */
  color: #000000; /* Texte noir pour contraste */
}
```

### Interactions

- **Toggle** : Bouton en haut de sidebar pour alterner entre Bookmarks et Recherche (modes exclusifs).
- **Clic sur résultat** : Navigation vers la page, surlignage du match dans le PDF.
- **Indicateur de progression** : Spinner visible pendant extraction et recherche.
- **Submit recherche** : Enter dans input ou clic bouton, validation terme non-vide.

## Thème sombre (palette de couleurs suggérée)

- Fond principal : #1e1e1e
- Texte : #ffffff
- Texte secondaire : #cccccc
- Accents (boutons) : #007acc
- Hover : #005a9e
- Erreurs : #ff6b6b
- Fond pop-up : #2d2d2d

## Responsive / tailles fenêtre

- Min largeur : 800px (PDF + sidebar bookmarks).
- Hauteur adaptable, scroll vertical pour bookmarks si trop.
- Redimensionnement : PDF scale automatiquement, miniatures fixes.

## Feedback utilisateur

- **Loading** : Spinner lors chargement PDF ou génération miniature.
- **Erreurs** : Toast/message en bas pour "Fichier introuvable", "Page invalide".
- **Confirmations** : Toast vert pour "Bookmark ajouté".
- **États** : Boutons disabled pendant opérations asynchrones.

## Layout écran d'accueil v2 (3 colonnes)

- **Colonne gauche (Arborescence)** : FolderTree avec nœuds expandables/collapsables, icônes dossier, boutons "+" pour créer sous-dossier, menu contextuel pour renommer/déplacer/supprimer.
- **Colonne centre (Orphelins)** : OrphanPdfList listant les PDFs non assignés à aucun dossier, avec icône PDF, nom, drag handle.
- **Colonne droite (Récents)** : RecentPdfList listant les PDFs récemment ouverts, même format que orphelins.
- **Drag & drop zones** : Survol des nœuds dans FolderTree highlight en bleu (#007acc).
- **Responsive** : Colonnes flexibles, min largeur 1000px, centrage.

### Wireframe textuel
```
+-------------------------------------+
|        PDF Viewer                   |
+-------------------------------------+
| Folder Tree    | Orphan PDFs   | Recent PDFs   |
| + Root         | [pdf1.pdf]    | [recent1.pdf] |
|   - Sub        | [pdf2.pdf]    | [recent2.pdf] |
|     - SubSub   |               |               |
|                |               |               |
| [Créer Dossier]|               |               |
+-------------------------------------+
```

### Styles CSS pour drag-over et expansion/collapse
```css
.folder-node {
  padding: 5px;
  cursor: pointer;
}

.folder-node.drag-over {
  background-color: #007acc;
  color: #ffffff;
}

.expand-icon {
  margin-right: 5px;
}

.expand-icon.expanded::before {
  content: "▼";
}

.expand-icon.collapsed::before {
  content: "▶";
}
```

### Interactions drag-n-drop
- **Initiation** : Drag depuis OrphanPdfList ou RecentPdfList (handle visible au hover).
- **Feedback** : Pendant drag, élément semi-transparent, drop zones highlightées.
- **Drop** : Sur nœud FolderTree, assigner PDF au dossier ; si drop sur vide, pas d'action.
- **Annulation** : Relâcher hors zone, retour à position initiale.