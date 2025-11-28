#!/bin/bash
# Script pour copier les bibliothèques UMD vers src/renderer/libs/
# Usage: ./scripts/copy-libs.sh [dev|prod]
# Par défaut: dev

set -e

# Déterminer le mode (dev ou prod)
MODE="${1:-dev}"

if [[ "$MODE" != "dev" && "$MODE" != "prod" ]]; then
  echo "❌ Mode invalide: $MODE. Utilisez 'dev' ou 'prod'."
  exit 1
fi

LIBS_DIR="src/renderer/libs"
NODE_MODULES="node_modules"

echo "📦 Mode: $MODE"
echo "📦 Création du répertoire libs..."
mkdir -p "$LIBS_DIR"

# Fonction de copie avec vérification
copy_file() {
  local src="$1"
  local dest="$2"
  
  if [[ ! -f "$src" ]]; then
    echo "❌ ERREUR: Fichier source introuvable: $src"
    exit 1
  fi
  
  cp "$src" "$dest"
  echo "   ✓ Copié: $(basename "$dest")"
}

# Copie React selon le mode
if [[ "$MODE" == "prod" ]]; then
  echo "📋 Copie de React (production)..."
  copy_file "$NODE_MODULES/react/umd/react.production.min.js" "$LIBS_DIR/react.production.min.js"
  echo "📋 Copie de ReactDOM (production)..."
  copy_file "$NODE_MODULES/react-dom/umd/react-dom.production.min.js" "$LIBS_DIR/react-dom.production.min.js"
else
  echo "📋 Copie de React (development)..."
  copy_file "$NODE_MODULES/react/umd/react.development.js" "$LIBS_DIR/react.development.js"
  echo "📋 Copie de ReactDOM (development)..."
  copy_file "$NODE_MODULES/react-dom/umd/react-dom.development.js" "$LIBS_DIR/react-dom.development.js"
fi

# Copie PDF.js (toujours les mêmes fichiers)
echo "📋 Copie de PDF.js..."
copy_file "$NODE_MODULES/pdfjs-dist/build/pdf.mjs" "$LIBS_DIR/pdf.mjs"
copy_file "$NODE_MODULES/pdfjs-dist/build/pdf.worker.mjs" "$LIBS_DIR/pdf.worker.mjs"

# Optionnel: Copier les sourcemaps pour debugging
if [[ "$MODE" == "dev" ]]; then
  if [[ -f "$NODE_MODULES/pdfjs-dist/build/pdf.mjs.map" ]]; then
    copy_file "$NODE_MODULES/pdfjs-dist/build/pdf.mjs.map" "$LIBS_DIR/pdf.mjs.map"
  fi
  if [[ -f "$NODE_MODULES/pdfjs-dist/build/pdf.worker.mjs.map" ]]; then
    copy_file "$NODE_MODULES/pdfjs-dist/build/pdf.worker.mjs.map" "$LIBS_DIR/pdf.worker.mjs.map"
  fi
fi

echo ""
echo "✅ Bibliothèques copiées avec succès dans $LIBS_DIR"
echo ""
ls -lh "$LIBS_DIR"