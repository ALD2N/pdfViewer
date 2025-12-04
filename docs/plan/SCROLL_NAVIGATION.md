# Scroll Navigation

## Vue d'ensemble de la feature

La fonctionnalité "Scroll Navigation" permet de naviguer rapidement entre les pages d'un PDF en utilisant la molette de la souris sur l'aperçu PDF principal (.viewer-content). Cette méthode de navigation est plus fluide que les clics sur les boutons précédent/suivant, et permet de parcourir plusieurs pages d'un coup via le paramètre `pagesPerWheel`.

## User stories associées

- **US18** : En tant qu'utilisateur, je veux pouvoir naviguer entre les pages en utilisant la molette de la souris sur l'aperçu PDF principal, afin de parcourir rapidement un document sans clics répétés.
- **US19** : En tant qu'utilisateur, je veux configurer le nombre de pages à sauter par cran de molette (pagesPerWheel), afin d'adapter la vitesse de navigation à mes besoins.
- **US20** : En tant qu'utilisateur, je veux pouvoir désactiver la navigation par molette si je préfère les boutons traditionnels.

## Règles métier

- **R21** : La navigation par molette est active uniquement sur l'élément `.viewer-content` (aperçu PDF principal).
- **R22** : Scroll vers le bas (deltaY > 0) = page suivante (+N pages).
- **R23** : Scroll vers le haut (deltaY < 0) = page précédente (-N pages).
- **R24** : Le nombre de pages sautées par cran est configurable via `pagesPerWheel` (défaut: 1, min: 1, max: 10).
- **R25** : La navigation est limitée aux bornes [1, numPages] (clamp).
- **R26** : Un throttle de 100ms est appliqué pour éviter les navigations trop rapides.
- **R27** : La fonctionnalité est activable/désactivable via `enableScrollNavigation` (défaut: true).

## Configuration

### scrollSettings dans config.json
```json
{
  "scrollSettings": {
    "pagesPerWheel": 1,
    "enableScrollNavigation": true
  }
}
```

### Validation
- `pagesPerWheel`: Entier entre 1 et 10 (défaut: 1).
- `enableScrollNavigation`: Booléen (défaut: true).
- Les configurations invalides sont automatiquement corrigées vers les valeurs par défaut.

## Invariants

- **INV-11** : La navigation par molette ne modifie pas le contenu du PDF (lecture seule).
- **INV-12** : La page courante reste toujours dans les bornes [1, numPages].
- **INV-13** : Les configurations existantes sans scrollSettings continuent de fonctionner (backward-compatible).

## Cas d'usage détaillés

### Cas d'usage 1 : Navigation rapide
**Avant :** L'utilisateur clique plusieurs fois sur le bouton "suivant" pour parcourir 10 pages.
**Après :** L'utilisateur positionne la souris sur l'aperçu PDF et utilise la molette ; avec pagesPerWheel=2, 5 crans suffisent pour avancer de 10 pages.

### Cas d'usage 2 : Navigation précise
**Configuration :** pagesPerWheel=1 (défaut).
**Usage :** L'utilisateur scrolle cran par cran pour naviguer page par page, comme avec les boutons mais plus fluide.

### Cas d'usage 3 : Parcours rapide de gros documents
**Configuration :** pagesPerWheel=5.
**Usage :** L'utilisateur scrolle pour sauter 5 pages à chaque cran, idéal pour trouver rapidement une section dans un document de 100+ pages.

### Cas d'usage 4 : Désactivation
**Configuration :** enableScrollNavigation=false.
**Usage :** L'utilisateur préfère utiliser uniquement les boutons ou le clavier ; la molette n'a pas d'effet sur .viewer-content.

## Implémentation technique

### PdfViewer.js
- Événement `wheel` écouté sur `.viewer-content` avec `{ passive: false }`.
- Utilisation de `navigationStateRef` pour accéder aux valeurs actuelles (currentPage, numPages) sans problèmes de closure stale.
- Throttle via `lastWheelTimeRef` (100ms minimum entre navigations).
- `preventDefault()` appelé uniquement si la page change.

### App.js
- Charge `scrollSettings` depuis la config via `getRecentPdfs()`.
- Passe `scrollConfig` prop à `PdfViewer`.

### persistence.js
- Nouvelle méthode `validateScrollSettings()` pour valider et normaliser les paramètres.
- Integration dans `validateAndMigrate()` pour backward-compatibility.

### constants.js
- `DEFAULT_CONFIG.scrollSettings` avec valeurs par défaut.
