#!/usr/bin/env node
/**
 * Script Node.js pour copier les bibliothèques UMD
 * Alternative au script bash pour compatibilité Windows
 * Usage: node scripts/switch-libs-mode.js [dev|prod]
 */

const fs = require('fs-extra');
const path = require('path');

// Configuration
const MODE = process.argv[2] || 'dev';
const LIBS_DIR = path.join(__dirname, '..', 'src', 'renderer', 'libs');
const NODE_MODULES = path.join(__dirname, '..', 'node_modules');

// Validation du mode
if (MODE !== 'dev' && MODE !== 'prod') {
  console.error(`❌ Mode invalide: ${MODE}. Utilisez 'dev' ou 'prod'.`);
  process.exit(1);
}

console.log(`📦 Mode: ${MODE}`);
console.log(`📦 Création du répertoire libs...`);

// Créer le répertoire
fs.ensureDirSync(LIBS_DIR);

// Fonction de copie avec vérification
function copyFile(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`❌ ERREUR: Fichier source introuvable: ${src}`);
    process.exit(1);
  }
  
  fs.copySync(src, dest);
  console.log(`   ✓ Copié: ${path.basename(dest)}`);
}

// Copie React selon le mode
if (MODE === 'prod') {
  console.log('📋 Copie de React (production)...');
  copyFile(
    path.join(NODE_MODULES, 'react', 'umd', 'react.production.min.js'),
    path.join(LIBS_DIR, 'react.production.min.js')
  );
  console.log('📋 Copie de ReactDOM (production)...');
  copyFile(
    path.join(NODE_MODULES, 'react-dom', 'umd', 'react-dom.production.min.js'),
    path.join(LIBS_DIR, 'react-dom.production.min.js')
  );
} else {
  console.log('📋 Copie de React (development)...');
  copyFile(
    path.join(NODE_MODULES, 'react', 'umd', 'react.development.js'),
    path.join(LIBS_DIR, 'react.development.js')
  );
  console.log('📋 Copie de ReactDOM (development)...');
  copyFile(
    path.join(NODE_MODULES, 'react-dom', 'umd', 'react-dom.development.js'),
    path.join(LIBS_DIR, 'react-dom.development.js')
  );
}

// Copie PDF.js
console.log('📋 Copie de PDF.js...');
copyFile(
  path.join(NODE_MODULES, 'pdfjs-dist', 'build', 'pdf.mjs'),
  path.join(LIBS_DIR, 'pdf.mjs')
);
copyFile(
  path.join(NODE_MODULES, 'pdfjs-dist', 'build', 'pdf.worker.mjs'),
  path.join(LIBS_DIR, 'pdf.worker.mjs')
);

// Copie sourcemaps en dev
if (MODE === 'dev') {
  const sourcemaps = [
    'pdf.mjs.map',
    'pdf.worker.mjs.map'
  ];
  
  sourcemaps.forEach(map => {
    const src = path.join(NODE_MODULES, 'pdfjs-dist', 'build', map);
    if (fs.existsSync(src)) {
      copyFile(src, path.join(LIBS_DIR, map));
    }
  });
}

console.log('');
console.log(`✅ Bibliothèques copiées avec succès dans ${LIBS_DIR}`);
console.log('');

// Lister les fichiers
const files = fs.readdirSync(LIBS_DIR);
files.forEach(file => {
  const stats = fs.statSync(path.join(LIBS_DIR, file));
  const size = (stats.size / 1024).toFixed(2);
  console.log(`   ${file} (${size} KB)`);
});