# Règles Métier

## Règles métier (R1 à R11)

- **R1** : La navigation dans le PDF se fait uniquement page par page (pas de zoom ou scroll continu).
- **R2** : Chaque bookmark est associé à une page unique, avec titre éditable et miniature obligatoire.
- **R3** : La persistance des bookmarks est automatique à chaque modification, sans bouton "Sauvegarder".
- **R4** : En cas de fichier PDF introuvable, afficher un message d'erreur et permettre de supprimer de l'historique.
- **R5** : Plusieurs bookmarks peuvent exister sur la même page, chacun avec un titre distinct.
- **R6** : L'ordre initial des bookmarks est chronologique (par date de création), mais réorganisable par l'utilisateur.
- **R7** : Les résultats de recherche sont validés pour exactitude (match insensible à la casse, correspondances partielles).
- **R7.1** : Définition du contexte de recherche : 5 mots avant/après le match, où les mots coupés comptent comme un seul mot et la ponctuation ne compte pas.
- **R8** : Clic sur un résultat de recherche navigue vers la page et surligne le match.
- **R8.1** : Les surlignages sont effacés automatiquement lors du basculement vers le mode Bookmarks.
- **R9** : Le bouton toggle dans la sidebar alterne exclusivement entre les modes "Bookmarks" et "Recherche".
- **R10** : La recherche est performante (< 3 secondes pour 100 pages, < 10 secondes pour 500 pages), limitée à 100 occurrences affichées (pas de groupement par page).
- **R11** : Pas d'historique des recherches précédentes (chaque recherche est indépendante).
- **R12** : Les dossiers sont virtuels et hiérarchiques, avec profondeur illimitée et noms uniques par parent.
- **R13** : Relation M:N entre dossiers et PDFs : un PDF peut être assigné à plusieurs dossiers sans duplication physique.
- **R14** : Suppression d'un dossier supprime récursivement les sous-dossiers et dissocie les PDFs assignés (sans supprimer les fichiers PDF).
- **R15** : Renommage d'un dossier est immédiat, persistant, et validé pour non-vide et unique par parent.
- **R16** : Déplacement d'un dossier change son parentId, préservant la hiérarchie et les assignations.
- **R17** : Drag-drop d'un PDF vers un dossier l'assigne, avec feedback visuel et prévention des doublons.
- **R18** : Persistance automatique des dossiers dans JSON à chaque modification.
- **R19** : Ouverture d'un PDF depuis un dossier navigue vers la visualisation, vérifiant l'existence du fichier.
- **R20** : Les PDFs orphelins sont ceux non présents dans `pdfPaths` d'aucun dossier, affichés dans la colonne centre.

## Invariants métier (INV-01 à INV-10)

- **INV-01** : Un seul PDF peut être ouvert à la fois dans l'application.
- **INV-02** : Les titres de bookmarks sont toujours non-vides (défaut "Page X" si non édité).
- **INV-03** : Les miniatures sont générées uniquement pour les pages bookmarkées.
- **INV-04** : Le hash du PDF est vérifié à chaque ouverture pour détecter les modifications.
- **INV-05** : Les chemins de fichiers sont validés avant toute opération.
- **INV-06** : L'application ne permet pas l'édition du PDF lui-même (lecture seule).
- **INV-07** : La sidebar affiche exclusivement soit la liste des bookmarks, soit l'interface de recherche (modes exclusifs).
- **INV-08** : La navigation via un résultat de recherche maintient l'intégrité de la page courante et du PDF ouvert.
- **INV-09** : La fonctionnalité de recherche ne modifie pas le contenu du PDF (lecture seule).
- **INV-10** : Le TextLayer de PDF.js est synchronisé pour permettre le surlignage précis des résultats de recherche.

## Scénarios d'usage détaillés

### Scénario 1 : Ouverture d'un PDF récent
1. Utilisateur lance l'app.
2. Écran d'accueil affiche liste PDFs récents.
3. Clic sur un PDF : vérification existence, chargement, affichage page 1 avec bookmarks récupérés.

### Scénario 2 : Création et gestion bookmarks
1. PDF ouvert, navigation à page 10.
2. Clic "Bookmark" : miniature générée, bookmark ajouté en bas avec titre "Page 10".
3. Édition titre en "Introduction".
4. Drag & drop pour réorganiser.
5. Clic "Supprimer" pour retirer.

### Scénario 3 : Gestion d'erreurs
1. Tentative ouverture PDF supprimé : message "Fichier introuvable", option supprimer de l'historique.
2. JSON corrompu : reset à config vide, avertissement utilisateur.

## Cas limites et gestion d'erreurs

- **PDF vide** : Afficher message, pas de navigation.
- **Page inexistante** : Input limité à 1-max.
- **Espace disque insuffisant** : Erreur génération miniature, bookmark sans miniature.
- **PDF modifié** : Hash différent, avertir et proposer reset bookmarks.
- **Fermeture app** : Sauvegarde automatique.
- **Recherche vide** : Pas de recherche, message "Terme requis".
- **Aucun résultat** : Afficher "Aucun résultat trouvé".
- **PDF sans texte** : Message "PDF sans contenu textuel extractible".
- **Caractères spéciaux** : Recherche supporte Unicode, mais extraction dépend de PDF.js.
- **Basculement rapide** : Annuler recherche en cours si toggle, effacer surlignages.

## Validation des actions utilisateur

- Ouverture PDF : Vérifier extension .pdf, existence fichier.
- Navigation : Numéro page entre 1 et total.
- Bookmark : Toujours possible, titre validé non-vide.
- Suppression : Confirmation pour éviter accident.