# PDF Viewer

Visualiseur de PDF local avec système de bookmarks, développé avec Electron, React et PDF.js.

## Installation

```bash
npm install
```

Les bibliothèques nécessaires (React, ReactDOM, PDF.js) seront automatiquement copiées dans `src/renderer/libs/` après l'installation (via le hook `postinstall`).

## Développement

```bash
npm start
```

Cette commande copie les bibliothèques en mode développement puis lance Electron.

## Build pour production

```bash
# Linux
npm run build:linux

# Windows
npm run build:win

# Les deux
npm run build
```

Les builds utilisent automatiquement les versions minifiées de React/ReactDOM pour optimiser la taille.

## Gestion des bibliothèques

Les bibliothèques React et PDF.js sont copiées depuis `node_modules/` vers `src/renderer/libs/` pour assurer la compatibilité avec l'empaquetage Electron (archive asar).

### Copie manuelle (si nécessaire)

```bash
# Mode développement
npm run copy-libs:dev

# Mode production
npm run copy-libs:prod

# Ou avec le script bash directement
bash scripts/copy-libs.sh dev
bash scripts/copy-libs.sh prod

# Ou avec Node.js (Windows-friendly)
node scripts/switch-libs-mode.js dev
node scripts/switch-libs-mode.js prod
```

## Structure du projet

```
pdf-viewer/
├── src/
│   ├── main/           # Processus principal Electron
│   ├── renderer/       # Interface utilisateur (React)
│   │   ├── libs/       # Bibliothèques copiées (générées)
│   │   └── components/
│   └── shared/         # Code partagé
├── docs/               # Documentation
├── scripts/            # Scripts de build
└── package.json
```

## Architecture

Voir `docs/plan/ARCHITECTURE.md` pour plus de détails sur l'architecture technique.

## Licence

MIT