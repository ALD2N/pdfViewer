# Règles Métier

## Règles métier (R1 à R6)

- **R1** : La navigation dans le PDF se fait uniquement page par page (pas de zoom ou scroll continu).
- **R2** : Chaque bookmark est associé à une page unique, avec titre éditable et miniature obligatoire.
- **R3** : La persistance des bookmarks est automatique à chaque modification, sans bouton "Sauvegarder".
- **R4** : En cas de fichier PDF introuvable, afficher un message d'erreur et permettre de supprimer de l'historique.
- **R5** : Plusieurs bookmarks peuvent exister sur la même page, chacun avec un titre distinct.
- **R6** : L'ordre initial des bookmarks est chronologique (par date de création), mais réorganisable par l'utilisateur.

## Invariants métier (INV-01 à INV-06)

- **INV-01** : Un seul PDF peut être ouvert à la fois dans l'application.
- **INV-02** : Les titres de bookmarks sont toujours non-vides (défaut "Page X" si non édité).
- **INV-03** : Les miniatures sont générées uniquement pour les pages bookmarkées.
- **INV-04** : Le hash du PDF est vérifié à chaque ouverture pour détecter les modifications.
- **INV-05** : Les chemins de fichiers sont validés avant toute opération.
- **INV-06** : L'application ne permet pas l'édition du PDF lui-même (lecture seule).

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

## Validation des actions utilisateur

- Ouverture PDF : Vérifier extension .pdf, existence fichier.
- Navigation : Numéro page entre 1 et total.
- Bookmark : Toujours possible, titre validé non-vide.
- Suppression : Confirmation pour éviter accident.